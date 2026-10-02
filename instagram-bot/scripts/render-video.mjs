import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { VIDEO, SITE } from "./config.mjs";

const TEMPLATES_DIR = fileURLToPath(new URL("../templates/", import.meta.url));
// Optional override for machines where Playwright's own browser download isn't available.
const LAUNCH_OPTS = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(cmd + " exited " + code))));
  });
}

// Renders the self-contained whale-data.html template with the given data injected,
// records it with Playwright's built-in video recorder, then muxes to a clean mp4
// (with the narration track, if one was synthesized — see scripts/tts.mjs).
// bgPath (optional) is a marketradarwhale.com path to screenshot and use as the video's
// blurred, slowly-zooming backdrop, so the product itself is visibly on screen instead
// of a flat gradient.
export async function renderDataVideo({ data, narrationPath, narrationDurationMs, bgPath, outPath }) {
  // The template reveals stat rows on its own fixed schedule (see whale-data.html); this
  // is a floor so the recording never cuts off before the last row has appeared, and the
  // narration (when present) otherwise decides the real length.
  const designFloorMs = 4500 + data.stats.length * 700 + 2500;
  const durationMs = Math.max(designFloorMs, (narrationDurationMs || 0) + 1500);

  const workDir = fileURLToPath(new URL("../.tmp-" + Date.now() + "/", import.meta.url));
  await mkdir(workDir, { recursive: true });

  const browser = await chromium.launch(LAUNCH_OPTS);

  let bgImagePath = null;
  if (bgPath) {
    try {
      const shotPage = await browser.newPage({ viewport: { width: VIDEO.width, height: VIDEO.height } });
      await shotPage.goto(SITE + bgPath, { waitUntil: "load", timeout: 30000 });
      await shotPage.waitForTimeout(1500);
      bgImagePath = workDir + "bg.png";
      await shotPage.screenshot({ path: bgImagePath });
      await shotPage.close();
    } catch (e) {
      console.log("BG_SHOT_ERR", e && e.message); // falls back to the plain gradient background
    }
  }

  const context = await browser.newContext({
    viewport: { width: VIDEO.width, height: VIDEO.height },
    recordVideo: { dir: workDir, size: { width: VIDEO.width, height: VIDEO.height } },
  });
  const page = await context.newPage();
  const pageCreatedAt = Date.now();
  // Injected before any page script runs, so the template's inline script sees real data on load.
  await page.addInitScript((d) => { window.__DATA__ = d; }, { ...data, bgImagePath: bgImagePath ? "file://" + bgImagePath : null });
  await page.goto("file://" + TEMPLATES_DIR + "whale-data.html");
  await page.waitForFunction(() => window.__READY__ === true);
  // The recording starts when the page is created, but the template's animation clock (and so the
  // whale's mouth and the subtitles) starts when its script runs. Trim that lead-in off the video so
  // the narration audio, which starts at 0, is in step with what's on screen.
  const startedAt = await page.evaluate(() => window.__START__);
  const trimMs = Math.max(0, startedAt - pageCreatedAt);
  await page.waitForTimeout(durationMs);
  await context.close();
  await browser.close();

  const files = (await import("node:fs")).readdirSync(workDir).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error("no video recorded");
  await muxToMp4(workDir + files[0], outPath, narrationPath, trimMs);
  await rm(workDir, { recursive: true, force: true });
}

async function muxToMp4(webmPath, outPath, narrationPath, trimMs = 0) {
  const trim = trimMs > 0 ? ["-ss", (trimMs / 1000).toFixed(3)] : [];
  await mkdir((await import("node:path")).dirname(outPath), { recursive: true });
  if (narrationPath) {
    await run("ffmpeg", [
      "-y", ...trim, "-i", webmPath, "-i", narrationPath,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-crf", "20", "-preset", "veryfast",
      "-c:a", "aac", "-b:a", "128k",
      "-map", "0:v:0", "-map", "1:a:0",
      "-movflags", "+faststart",
      outPath,
    ]);
  } else {
    await run("ffmpeg", [
      "-y", ...trim, "-i", webmPath,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-crf", "20", "-preset", "veryfast",
      "-movflags", "+faststart",
      "-an",
      outPath,
    ]);
  }
}

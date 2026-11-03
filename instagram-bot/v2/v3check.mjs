// v3 done-gate for one rendered sample (T50-08): node v2/v3check.mjs <dir> <kind-day>
// Writes <name>-strip.png (one frame from the middle of every spoken sentence + that sentence, so sync is visible) and, for Shorts,
// <name>-safemask.png (frame with the YouTube UI zones painted red). Prints ffprobe numbers + PASS/FAIL lines.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { SAFE } from "./v3.mjs";

import { resolve } from "node:path";
const [dir0, name] = process.argv.slice(2), dir = resolve(dir0);
const meta = JSON.parse(readFileSync(`${dir}/${name}.meta.json`, "utf8")), mp4 = `${dir}/${name}.mp4`;
const ff = (a) => execFileSync("ffmpeg", ["-y", "-v", "error", ...a]);
const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate,sample_rate", "-of", "json", mp4]).toString());
const v = probe.streams.find((s) => s.width), a = probe.streams.find((s) => s.sample_rate), dur = +probe.format.duration;
const res = [];
const ok = (c, t) => { res.push((c ? "PASS " : "FAIL ") + t); return c; };
const steps = meta.steps || [];
const last = steps.at(-1);
ok(Math.abs(last.end - dur) < 0.5, `timeline: last sentence ends ${last.end}s, video ${dur.toFixed(2)}s`);
ok(steps.every((s, i) => i === 0 || Math.abs(s.start - steps[i - 1].end) < 0.02), `sync by construction: ${steps.length} sentences back to back, each picture = its own audio length`);
const short = meta.kind === "short";
if (short) {
  ok(v.width === 1080 && v.height === 1920, `size ${v.width}x${v.height}`);
  ok((meta.safeViolations || []).length === 0, `safe zone: ${(meta.safeViolations || []).length} page elements in right 15% / bottom 20%` + ((meta.safeViolations || []).length ? " e.g. " + meta.safeViolations[0] : ""));
  const m = meta.mascot; ok(m && m.x + m.w <= SAFE.short.right && m.y + m.h <= SAFE.short.bottom, `mascot box ${m && `${m.x},${m.y} ${m.w}x${m.h}`} inside safe zone`);
  ok(dur <= 60, `Short length ${dur.toFixed(1)} s <= 60`);
} else {
  ok(v.width === 1920 && v.height === 1080, `size ${v.width}x${v.height}`);
  ok((meta.chapters || "").split("\n").filter(Boolean).length >= 3 && /^0:00 /.test(meta.chapters || ""), `chapters: ${(meta.chapters || "").split("\n").length} (first 0:00)`);
  ok(last.end - last.start >= 5 && /WATCH NEXT/.test(last.kicker || ""), `end screen ${(last.end - last.start).toFixed(1)} s`);
}
ok(/Your next|first|This whale|replay|Do you know|whale|percent/i.test(steps[0].say) && steps[0].end >= 1, `hook (0-${steps[0].end}s): "${steps[0].say.slice(0, 70)}" shown on "${steps[0].headline}"`);
// frames: middle of every sentence
const tmp = `${dir}/.chk-${name}`; mkdirSync(tmp, { recursive: true });
const shots = steps.map((s, i) => { const f = `${tmp}/f${i}.jpg`; ff(["-ss", ((s.start + s.end) / 2).toFixed(2), "-i", mp4, "-frames:v", "1", "-vf", short ? "scale=270:-1" : "scale=384:-1", f]); return f; });
const cols = short ? 6 : 5, cw = short ? 270 : 384;
const html = `<html><body style="margin:0;background:#111;color:#eee;font:14px Arial;width:${cols * (cw + 8)}px;display:flex;flex-wrap:wrap">` + steps.map((s, i) =>
  `<div style="width:${cw}px;margin:4px"><img src="file:///${shots[i].replace(/\\/g, "/")}" width="${cw}"><div><b>${s.start.toFixed(1)}-${s.end.toFixed(1)}s</b> ${s.say}</div></div>`).join("") + "</body></html>";
writeFileSync(`${tmp}/strip.html`, html);
const b = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const p = await b.newPage({ viewport: { width: cols * (cw + 8), height: 400 } });
await p.goto("file:///" + `${tmp}/strip.html`.replace(/\\/g, "/")); await p.screenshot({ path: `${dir}/${name}-strip.png`, fullPage: true }); await b.close();
if (short) { // red = YouTube UI zones; nothing important may sit there
  const t = steps.find((s) => /leverage|entry|got in/i.test(s.say)) || steps[1];
  ff(["-ss", ((t.start + t.end) / 2).toFixed(2), "-i", mp4, "-frames:v", "1", "-vf", `drawbox=x=${SAFE.short.right}:y=0:w=${1080 - SAFE.short.right}:h=1920:color=red@0.35:t=fill,drawbox=x=0:y=${SAFE.short.bottom}:w=1080:h=${1920 - SAFE.short.bottom}:color=red@0.35:t=fill,scale=540:-1`, `${dir}/${name}-safemask.png`]);
}
const line = `${name}: ${v.width}x${v.height} ${v.codec_name} ${v.r_frame_rate} | audio ${a.codec_name} ${a.sample_rate} Hz | ${dur.toFixed(1)} s | ${(probe.format.size / 1e6).toFixed(1)} MB | ${steps.length} sentences`;
console.log(line + "\n" + res.join("\n"));
writeFileSync(`${dir}/${name}-gate.txt`, line + "\n" + res.join("\n") + "\n");
process.exit(res.some((r) => r.startsWith("FAIL")) ? 3 : 0);

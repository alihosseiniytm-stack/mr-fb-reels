// LIVE site tour (screen recording of real clicks): starts on the home page, opens menus, clicks into each section, highlights what is being said.
// Usage: node scripts/tour-live.mjs [en|fa]   -> out/tourlive-<lang>-<ts>.mp4 ; TOUR_UPLOAD=true uploads (long video, not a Short).
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync, renameSync } from "node:fs";
import { synthesizeNarration } from "./tts.mjs";
import { publishYouTube } from "./publish-youtube.mjs";

const LANG = process.argv[2] === "fa" ? "fa" : "en";
const SITE = "https://marketradarwhale.com";
const OUT = "out"; mkdirSync(OUT, { recursive: true });
const P = (p) => (LANG === "en" && p === "/" ? SITE + "/" : SITE + "/" + LANG + p); // English home is "/" (the /en/ path is a 404 with an empty body = white video)

// ---- helpers -------------------------------------------------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function installCursor(ctx) {
  await ctx.addInitScript(() => {
    const mk = () => {
      if (document.getElementById("__cur")) return;
      const c = document.createElement("div");
      c.id = "__cur";
      c.style.cssText = "position:fixed;z-index:2147483647;left:0;top:0;width:26px;height:26px;margin:-4px 0 0 -4px;pointer-events:none;transition:transform .08s linear;background:no-repeat url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><path d='M3 2 L3 20 L8 15 L12 24 L15 22.5 L11 14 L18 14 Z' fill='white' stroke='black' stroke-width='1.5'/></svg>\")";
      document.documentElement.appendChild(c);
      addEventListener("mousemove", (e) => { c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
      addEventListener("mousedown", (e) => {
        const r = document.createElement("div");
        r.style.cssText = `position:fixed;z-index:2147483646;left:${e.clientX - 20}px;top:${e.clientY - 20}px;width:40px;height:40px;border-radius:50%;border:3px solid #35e6b8;pointer-events:none;transition:all .5s;opacity:1`;
        document.documentElement.appendChild(r);
        requestAnimationFrame(() => { r.style.transform = "scale(2.2)"; r.style.opacity = "0"; });
        setTimeout(() => r.remove(), 700);
      }, true);
    };
    if (document.readyState !== "loading") mk(); else addEventListener("DOMContentLoaded", mk);
  });
}
async function glide(page, locator, opts = {}) {
  const box = await locator.first().boundingBox({ timeout: 4000 }).catch(() => null);
  if (!box) return false;
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 24), { steps: 25 });
  return true;
}
async function click(page, locator) {
  await locator.first().scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
  if (await glide(page, locator)) { await sleep(350); await page.mouse.down(); await page.mouse.up(); }
  else await locator.first().click({ timeout: 4000 }).catch(() => {});
}
async function highlight(page, locator, ms = 1800) {
  const el = locator.first();
  if (!(await el.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false))) return;
  await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
  await page.evaluate(() => { const o = document.getElementById("__hl"); if (o) o.remove(); });
  const h = await el.elementHandle({ timeout: 4000 }).catch(() => null);
  if (!h) return;
  await page.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const o = document.createElement("div");
    o.id = "__hl";
    o.style.cssText = `position:fixed;z-index:2147483645;left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;border:3px solid #35e6b8;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.35);pointer-events:none`;
    document.documentElement.appendChild(o);
  }, h);
  await sleep(ms);
}
async function clearHl(page) { await page.evaluate(() => { const o = document.getElementById("__hl"); if (o) o.remove(); }).catch(() => {}); }

// ---- script (owner's flow, 2026-10-15): home intro ~10 s -> mouse to the header Whales menu -> "what did whales buy today" -> whale rank 1 -> profile -> chart ----
const T = {
  en: {
    open: "Hi! Today I will show you Market Radar Whale, a free site that follows the biggest crypto wallets, the whales, live. This is the home page. Let's see what is inside.",
    menu: "At the top you have the menu. Let's open Whales, and choose, what did whales buy today.",
    buys: "Here are today's biggest whale trades, coin by coin, with longs and shorts. These are real wallets, with real money. Let's open the whale that is ranked number one.",
    prof: "This is the whale profile. You see the rank, the thirty day profit, the seven day profit, the account value and the return on investment.",
    pos: "Below, the open positions right now: the coin, long or short, the size, the entry price and the liquidation price.",
    chart: "And this chart is the best part. It shows the price, the line where this whale entered, the liquidation line, and where the price is right now. So you can see where this whale bought this coin, and where it stands today.",
    end: "That is it. Open market radar whale dot com, and try it yourself. This is education, not financial advice.",
  },
  fa: {
    open: "سلام! امروز می‌خواهم مارکت رادار وال را نشانتان بدهم؛ سایتی رایگان که بزرگ‌ترین کیف‌پول‌های بازار، یعنی نهنگ‌ها را زنده دنبال می‌کند. این صفحه‌ی اول است. ببینیم داخلش چیست.",
    menu: "بالا منو را داریم. بخش نهنگ‌ها را باز می‌کنیم و نهنگ‌ها امروز چه خریدند را انتخاب می‌کنیم.",
    buys: "اینجا بزرگ‌ترین معامله‌های نهنگ‌ها در امروز است، ارز به ارز، با لانگ و شورت. این کیف‌پول‌ها واقعی‌اند و پول واقعی دارند. نهنگ رتبه‌ی یک را باز می‌کنیم.",
    prof: "این پروفایل نهنگ است. رتبه، سود سی روزه، سود هفت روزه، ارزش حساب و بازده را می‌بینید.",
    pos: "پایین‌تر پوزیشن‌های باز همین الان است: ارز، لانگ یا شورت، اندازه، قیمت ورود و قیمت لیکوئید.",
    chart: "و این نمودار بهترین بخش است. قیمت را نشان می‌دهد، خطی که این نهنگ وارد شده، خط لیکوئید و جایی که قیمت همین الان است. پس می‌بینید این نهنگ این ارز را کجا خرید و الان کجاست.",
    end: "همین بود. به مارکت رادار وال دات کام سر بزنید و خودتان امتحان کنید. این آموزش است، توصیه‌ی مالی نیست.",
  },
}[LANG];

// ---- run ----
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: LANG === "fa" ? "fa-IR" : "en-US", recordVideo: { dir: OUT + "/rec", size: { width: 1600, height: 900 } } });
await installCursor(ctx);
const page = await ctx.newPage();
const t0 = Date.now();
await page.goto(P("/"), { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log("GOTO_WARN", String(e.message).slice(0, 80)));
await page.addStyleTag({ content: "#mrwAiBtn,#mrwAiPanel{display:none!important}" }).catch(() => {});
await page.getByText(/OK, got it|Dismiss|متوجه|باشه/).first().click({ timeout: 2500 }).catch(() => {}); // cookie banner
await page.waitForTimeout(1200);
{ const len = await page.evaluate(() => (document.body ? document.body.innerText.length : 0)).catch(() => 0); console.log("HOME_TEXT_LEN", len); if (len < 200) { await page.goto(SITE + "/", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {}); await page.waitForTimeout(1500); console.log("HOME_RETRY"); } }
const startOffset = (Date.now() - t0) / 1000; // blank/loading time before this is trimmed
const steps = [];
async function step(text, action) {
  const a = await synthesizeNarration(text, LANG, OUT + "/step" + steps.length + ".mp3");
  const want = a ? a.durationMs / 1000 + 0.6 : 8;
  const s0 = Date.now();
  try { await action(); } catch (e) { console.log("STEP_WARN", steps.length, String(e.message).slice(0, 100)); }
  try { await page.screenshot({ path: OUT + "/shot_" + steps.length + ".png" }); const len = await page.evaluate(() => (document.body ? document.body.innerText.length : 0)); console.log("STEP_TEXT_LEN", steps.length, len, page.url()); } catch (e) {}
  await clearHl(page);
  const spent = (Date.now() - s0) / 1000;
  if (spent < want) await sleep((want - spent) * 1000);
  steps.push({ audio: a ? a.path : null, dur: Math.max(spent, want) });
  console.log("STEP_DONE", steps.length, "dur", Math.max(spent, want).toFixed(1), "audio", !!a);
}

// 1) ~10 s intro on the home page, the cursor just rests
await step(T.open, async () => { await page.mouse.move(800, 450, { steps: 10 }); await sleep(800); });
// 2) mouse goes to the header, opens Whales, shows "what did whales buy today"
await step(T.menu, async () => {
  const btn = page.locator('nav .mrw-menu > button').first();
  await click(page, btn); await btn.hover({ timeout: 3000 }).catch(() => {}); await sleep(700);
  const link = page.locator('nav .mrw-menu a[href$="/whale-buys-today/"]').first();
  await highlight(page, link, 1500);
  if (await link.isVisible().catch(() => false)) await click(page, link); else await page.goto(P("/whale-buys-today/"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded"); await sleep(1500);
});
// 3) the page of whale trades by coin; point at the first whale and open it (rank 1)
await step(T.buys, async () => {
  await highlight(page, page.locator("table").first(), 2500);
  const w = page.locator('a[href*="/whale/0x"]').first();
  if (await w.count()) { await click(page, w); } else { await page.goto(P("/whales/"), { waitUntil: "domcontentloaded" }); }
  await page.waitForLoadState("domcontentloaded"); await sleep(2000);
});
// 4) profile overview
await step(T.prof, async () => { await highlight(page, page.locator(".pf-tiles"), 3500); });
// 5) positions
await step(T.pos, async () => { await highlight(page, page.locator(".pf-bar, .pf-pos").first(), 3000); await highlight(page, page.locator(".pf-pc").first(), 3000); });
// 6) entry chart: where the whale bought and where the price is now
await step(T.chart, async () => {
  const svg = page.locator('svg[role="img"]').first();
  await svg.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
  await highlight(page, svg, 6000);
});
await step(T.end, async () => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await sleep(2000); });

await ctx.close(); await browser.close();

// ---- assemble: trim the blank start, build the narration track aligned to the step timings, mux -------------------------------------
const recDir = OUT + "/rec";
const vid = readdirSync(recDir).filter((f) => f.endsWith(".webm")).map((f) => recDir + "/" + f).sort().pop();
const args = ["-y", "-v", "error"];
const parts = [];
steps.forEach((s, i) => {
  if (s.audio) { args.push("-i", s.audio); parts.push(`[${i}:a]apad=whole_dur=${s.dur.toFixed(2)}[a${i}]`); }
  else { args.push("-f", "lavfi", "-t", s.dur.toFixed(2), "-i", "anullsrc=r=24000:cl=mono"); parts.push(`[${i}:a]anull[a${i}]`); }
});
const filt = parts.join(";") + ";" + steps.map((_, i) => `[a${i}]`).join("") + `concat=n=${steps.length}:v=0:a=1[aout]`;
const track = OUT + "/narration.m4a";
execFileSync("ffmpeg", [...args, "-filter_complex", filt, "-map", "[aout]", "-c:a", "aac", "-b:a", "128k", track], { stdio: "inherit" });
const final = `${OUT}/tourlive-${LANG}-${Date.now()}.mp4`;
execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", startOffset.toFixed(2), "-i", vid, "-i", track, "-map", "0:v", "-map", "1:a", "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b0f,fps=25", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", final], { stdio: "inherit" });
console.log("FINAL", final, "startOffset", startOffset.toFixed(1));
try { execFileSync("ffmpeg", ["-y", "-v", "error", "-i", final, "-vf", "fps=1/10,scale=480:-1,tile=4x3", "-frames:v", "1", OUT + "/sheet.jpg"], { stdio: "inherit" }); } catch (e) { console.log("SHEET_ERR", String(e.message).slice(0, 80)); }
if (process.env.TOUR_UPLOAD === "true") {
  const caption = (LANG === "fa" ? "تور زنده‌ی مارکت رادار وال: نهنگ‌ها، پروفایل، سیگنال و آموزش" : "Market Radar Whale live tour: whales, profiles, signals and guides") + "\n\n" + SITE + "/" + LANG + "/";
  const r = await publishYouTube({ filePath: final, caption, lang: LANG, short: false, link: SITE + "/" + LANG + "/?utm_source=youtube&utm_medium=tour" });
  console.log("UPLOADED", r.url, r.privacy);
}

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

// ---- script: each step = narration + what to do on screen -------------------------------------------------------------------------
const T = {
  en: {
    open: "Welcome. Today we will look together at Market Radar Whale, a free site that follows the biggest crypto wallets, the whales, in real time. We start here, on the home page.",
    menu: "Everything starts from this menu. Let's open the Whales section.",
    rank: "This is the whale ranking. These are the most profitable Hyperliquid traders of the month. Let's open the first one.",
    prof: "This is the whale profile. Here you see the rank, the thirty day profit, the seven day profit, the account value and the return on investment.",
    pos: "Below that are the open positions right now: the coin, long or short, the size, the entry price and the liquidation price. This is live data.",
    sig: "Now let's see the signals. When several profitable whales open the same coin together, we record a cluster.",
    live: "And this page shows the recent clusters and the real track record of past signals, including the weak ones. We never delete the losses.",
    guides: "If you are a beginner, open the Guides menu. Every topic is explained in simple language.",
    end: "That was Market Radar Whale. Visit market radar whale dot com. This is education, not financial advice.",
  },
  fa: {
    open: "سلام. امروز با هم سایت مارکت رادار وال را نگاه می‌کنیم؛ سایتی رایگان که بزرگ‌ترین کیف‌پول‌های بازار، یعنی نهنگ‌ها را زنده دنبال می‌کند. از همین صفحه‌ی اول شروع می‌کنیم.",
    menu: "همه چیز از این منو شروع می‌شود. بخش نهنگ‌ها را باز می‌کنیم.",
    rank: "این رتبه‌بندی نهنگ‌هاست؛ سودده‌ترین معامله‌گران هایپرلیکوید در این ماه. اولی را باز می‌کنیم.",
    prof: "این پروفایل نهنگ است. رتبه، سود سی روزه، سود هفت روزه، ارزش حساب و بازده را اینجا می‌بینید.",
    pos: "پایین‌تر پوزیشن‌های باز همین الان است: ارز، لانگ یا شورت، اندازه، قیمت ورود و قیمت لیکوئید. این داده زنده است.",
    sig: "حالا سیگنال‌ها. وقتی چند نهنگ سودده هم‌زمان یک ارز را باز می‌کنند، یک خوشه ثبت می‌کنیم.",
    live: "و این صفحه خوشه‌های اخیر و نتیجه‌ی واقعی سیگنال‌های گذشته را نشان می‌دهد، حتی ضعیف‌ها را. ما ضررها را پاک نمی‌کنیم.",
    guides: "اگر تازه‌کار هستید، منوی آموزش را باز کنید. هر موضوع به زبان ساده توضیح داده شده است.",
    end: "این بود مارکت رادار وال. به مارکت رادار وال دات کام سر بزنید. این آموزش است، توصیه‌ی مالی نیست.",
  },
}[LANG];

// ---- run -----------------------------------------------------------------------------------------------------------------------
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: LANG === "fa" ? "fa-IR" : "en-US", recordVideo: { dir: OUT + "/rec", size: { width: 1600, height: 900 } } });
await installCursor(ctx);
const page = await ctx.newPage();
const t0 = Date.now();
await page.goto(P("/"), { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log("GOTO_WARN", String(e.message).slice(0, 80)));
await page.addStyleTag({ content: "#mrwAiBtn,#mrwAiPanel{display:none!important}" }).catch(() => {});
await page.waitForTimeout(1500);
{ const len = await page.evaluate(() => (document.body ? document.body.innerText.length : 0)).catch(() => 0); console.log("HOME_TEXT_LEN", len); if (len < 200) { await page.goto(SITE + "/", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {}); await page.waitForTimeout(1500); console.log("HOME_RETRY"); } }
const startOffset = (Date.now() - t0) / 1000; // everything before this is blank/loading and is trimmed
const steps = []; // {audio, dur}
async function step(text, action) {
  const a = await synthesizeNarration(text, LANG, `${OUT}/step${steps.length}.mp3`);
  const want = a ? a.durationMs / 1000 + 0.5 : 8;
  const s0 = Date.now();
  try { await action(); } catch (e) { console.log("STEP_WARN", steps.length, String(e.message).slice(0, 100)); }
  try { await page.screenshot({ path: OUT + "/shot_" + steps.length + ".png" }); const len = await page.evaluate(() => (document.body ? document.body.innerText.length : 0)); console.log("STEP_TEXT_LEN", steps.length, len, page.url()); } catch (e) {}
  await clearHl(page);
  const spent = (Date.now() - s0) / 1000;
  if (spent < want) await sleep((want - spent) * 1000);
  steps.push({ audio: a ? a.path : null, dur: Math.max(spent, want) });
  console.log("STEP_DONE", steps.length, "dur", Math.max(spent, want).toFixed(1), "audio", !!a);
}

await step(T.open, async () => { await page.mouse.move(800, 300, { steps: 20 }); await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" })); await sleep(2500); await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); });
await step(T.menu, async () => {
  const btn = page.locator('nav .mrw-menu > button').first();
  await click(page, btn); await btn.hover({ timeout: 3000 }).catch(() => {}); await sleep(900);
  await highlight(page, page.locator('nav .mrw-menu a[href$="/whales/"]'), 1200);
});
await step(T.rank, async () => {
  const link = page.locator('nav .mrw-menu a[href$="/whales/"]').first();
  if (await link.isVisible().catch(() => false)) await click(page, link); else await page.goto(P("/whales/"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded");
  await sleep(1500);
  await highlight(page, page.locator("table tr").nth(1), 2200);
});
await step(T.prof, async () => {
  const first = page.locator('table a[href*="/whale/0x"]').first();
  await click(page, first);
  await page.waitForLoadState("domcontentloaded"); await sleep(2000);
  await highlight(page, page.locator(".pf-tiles"), 3000);
});
await step(T.pos, async () => {
  const pos = page.locator(".pf-pos, .pf-bar").first();
  await highlight(page, pos, 3500);
  await highlight(page, page.locator(".pf-pc").first(), 3000);
});
await step(T.sig, async () => {
  await page.goto(P("/signals/"), { waitUntil: "domcontentloaded" }); await sleep(2500);
  await highlight(page, page.locator("h1").first(), 2200);
});
await step(T.live, async () => {
  const live = page.locator('a[href$="/signals/live/"]').first();
  if (await live.count()) await click(page, live); else await page.goto(P("/signals/live/"), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded"); await sleep(2500);
  await highlight(page, page.locator("table").first(), 3500);
  await highlight(page, page.locator("table").nth(1), 3500);
});
await step(T.guides, async () => {
  await page.goto(P("/"), { waitUntil: "domcontentloaded" }); await sleep(1500);
  const g = page.locator('.mrw-menu[data-mrw="guides"] > button');
  await click(page, g); await sleep(1500);
  await g.hover({ timeout: 3000 }).catch(() => {}); await sleep(600);
  await highlight(page, page.locator('.mrw-menu[data-mrw="guides"] .mrw-cols'), 3000);
});
await step(T.end, async () => { await page.keyboard.press("Escape"); await sleep(1500); });

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
if (process.env.TOUR_UPLOAD === "true") {
  const caption = (LANG === "fa" ? "تور زنده‌ی مارکت رادار وال: نهنگ‌ها، پروفایل، سیگنال و آموزش" : "Market Radar Whale live tour: whales, profiles, signals and guides") + "\n\n" + SITE + "/" + LANG + "/";
  const r = await publishYouTube({ filePath: final, caption, lang: LANG, short: false, link: SITE + "/" + LANG + "/?utm_source=youtube&utm_medium=tour" });
  console.log("UPLOADED", r.url, r.privacy);
}

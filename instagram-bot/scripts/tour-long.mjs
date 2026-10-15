// Long "site tour" video (16:9, ~3-8 min): one section per page of marketradarwhale.com, narrated, with captions of the page itself.
// Usage: node scripts/tour-long.mjs [en|fa]   -> writes out/tour-<lang>-<ts>.mp4 ; DRY_RUN=false + YT_UPLOAD=true uploads to YouTube.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { synthesizeNarration } from "./tts.mjs";
import { publishYouTube } from "./publish-youtube.mjs";

const LANG = process.argv[2] === "fa" ? "fa" : "en";
const SITE = "https://marketradarwhale.com";
const OUT = "out"; mkdirSync(OUT, { recursive: true });
const W = 1920, H = 1080;

const SECTIONS = {
  en: [
    { path: "/", say: "Welcome to Market Radar Whale. This site follows the biggest crypto wallets, called whales, in real time. Everything you see is free, and the numbers come from public blockchain data. In the next minutes I will show you each section, one by one." },
    { path: "/en/whales/", say: "This is the Whales page. It ranks the most profitable Hyperliquid traders of the month. For every wallet you can see its profit, its account value and its return on investment. Click any row to open the full profile." },
    { path: "/en/whales/top/", say: "Here are the top one thousand futures whales. You can switch between today, this week and this month. A whale that is profitable in all three periods is usually more interesting than one that had a single lucky day." },
    { path: "/en/whales/all/", say: "And this list shows ten thousand active traders sorted by monthly volume. Use it to discover wallets that are not in the top ranking yet, and open any profile to see their open positions right now." },
    { path: "/en/whales/today/", say: "The today page shows what whales bought on spot markets in the last twenty four hours, on Solana, Ethereum, BNB Chain and Robinhood Chain. It is a sample of public on-chain trades, so treat it as a clue, not as advice." },
    { path: "/en/signals/live/", say: "The live signals page records a cluster when several profitable whales open the same coin at the same time. Below it you can see the real track record of past signals, including the weak ones. We never delete the losses." },
    { path: "/en/guides/", say: "If you are new, start with the guides. They explain what a wallet is, how to avoid scams, how leverage works and how to read whale activity, in simple language, in seven languages." },
    { path: "/en/demo-account/", say: "And you can practice for free in the demo mode, with real prices and simulated money, before you ever risk your own funds. That was Market Radar Whale. Visit market radar whale dot com, and remember, this is education, not financial advice." },
  ],
  fa: [
    { path: "/fa/", say: "به مارکت رادار وال خوش آمدید. این سایت بزرگ‌ترین کیف‌پول‌های بازار ارز دیجیتال، یعنی نهنگ‌ها را زنده دنبال می‌کند. همه چیز رایگان است و اعداد از داده‌ی عمومی بلاکچین می‌آیند." },
    { path: "/fa/whales/", say: "این صفحه‌ی نهنگ‌هاست. نهنگ‌های سودده هایپرلیکوید را در این ماه رتبه‌بندی می‌کند. برای هر کیف‌پول سود، ارزش حساب و بازده را می‌بینید و با کلیک روی هر ردیف پروفایل کامل باز می‌شود." },
    { path: "/fa/whales/top/", say: "این هزار نهنگ برتر فیوچرز است. می‌توانید بین امروز، این هفته و این ماه جابه‌جا شوید." },
    { path: "/fa/signals/live/", say: "صفحه‌ی سیگنال زنده وقتی چند نهنگ سودده هم‌زمان یک ارز را باز کنند یک خوشه ثبت می‌کند، و نتیجه‌ی واقعی سیگنال‌های گذشته را، حتی ضعیف‌ها را، نشان می‌دهد." },
    { path: "/fa/guides/", say: "اگر تازه‌کار هستید از آموزش‌ها شروع کنید. همه چیز به زبان ساده توضیح داده شده است. این بود مارکت رادار وال. توصیه‌ی مالی نیست." },
  ],
};

const sections = SECTIONS[LANG];
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2, locale: LANG === "fa" ? "fa-IR" : "en-US" });
const parts = [];
let n = 0;
for (const sec of sections) {
  n++;
  const page = await ctx.newPage();
  try { await page.goto(SITE + sec.path, { waitUntil: "networkidle", timeout: 45000 }); } catch (e) { console.log("GOTO_WARN", sec.path, String(e.message).slice(0, 80)); }
  await page.waitForTimeout(1500);
  // hide the AI-assistant bubble / cookie-ish overlays so the shot is clean
  await page.addStyleTag({ content: "#mrwAiBtn,#mrwAiPanel{display:none!important}" }).catch(() => {});
  const shots = [];
  for (let i = 0; i < 3; i++) {
    const f = `${OUT}/s${n}_${i}.png`;
    await page.screenshot({ path: f });
    shots.push(f);
    await page.evaluate(() => window.scrollBy(0, 640));
    await page.waitForTimeout(600);
  }
  await page.close();
  const audio = await synthesizeNarration(sec.say, LANG, `${OUT}/n${n}.mp3`);
  const dur = audio ? Math.max(8, audio.durationMs / 1000 + 0.6) : 14;
  const per = (dur / shots.length).toFixed(2);
  // slideshow for this section, with a slow zoom on each shot, scaled to 1920x1080
  const seg = `${OUT}/seg${n}.mp4`;
  const inputs = shots.flatMap((s) => ["-loop", "1", "-t", per, "-i", s]);
  const filter = shots.map((_, i) => `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x070b0f,zoompan=z='min(zoom+0.0006,1.06)':d=${Math.round(Number(per) * 25)}:s=${W}x${H}:fps=25[v${i}]`).join(";") + ";" + shots.map((_, i) => `[v${i}]`).join("") + `concat=n=${shots.length}:v=1:a=0[v]`;
  const args = ["-y", "-v", "error", ...inputs];
  if (audio) args.push("-i", audio.path);
  args.push("-filter_complex", filter, "-map", "[v]");
  if (audio) args.push("-map", `${shots.length}:a`, "-c:a", "aac", "-b:a", "128k", "-shortest");
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "25", seg);
  execFileSync("ffmpeg", args, { stdio: "inherit" });
  parts.push(seg);
  console.log("SECTION_DONE", n, sec.path, "audio:", !!audio, "dur:", dur.toFixed(1));
}
await browser.close();
const list = `${OUT}/list.txt`;
writeFileSync(list, parts.map((p) => `file '${p.replace(/^out\//, "")}'`).join("\n"));
const final = `${OUT}/tour-${LANG}-${Date.now()}.mp4`;
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", final], { stdio: "inherit" });
console.log("FINAL", final);
if (process.env.TOUR_UPLOAD === "true") {
  const caption = (LANG === "fa" ? "تور کامل مارکت رادار وال: نهنگ‌ها، سیگنال و آموزش" : "Market Radar Whale full tour: whales, live signals and guides") + "\n\n" + sections.map((s, i) => `${i + 1}. ${SITE}${s.path}`).join("\n");
  const r = await publishYouTube({ filePath: final, caption, lang: LANG, short: false, link: SITE + "/" + LANG + "/?utm_source=youtube&utm_medium=tour" });
  console.log("UPLOADED", r.url, r.privacy);
}

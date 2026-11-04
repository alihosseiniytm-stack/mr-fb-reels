// v3 thumbnails (T50-08): 3 big words + the teacher-whale mascot + an X-style chart with a big arrow. One layout per weekday so a week of
// thumbnails never looks alike (gate: 64-bit dHash distance >= schedule.thresholds.thumbMinHashDistance for every pair).
//   node v2/thumbs3.mjs --out=<dir>   -> renders the 7 weekday samples from live candles + prints the pair distance matrix
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { getCandles, imageHash, hashDist } from "./lib.mjs";
import { xChartSvg } from "./xchart.mjs";
import { mascotSprites } from "./v3.mjs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const LAUNCH = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};
export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const UP = "#35e6b8", DN = "#ff5470";

const arrowSvg = (up, col, w = 220) => `<svg width="${w}" height="${w}" viewBox="0 0 100 100"><path d="${up ? "M50 4 L94 52 L66 52 L66 96 L34 96 L34 52 L6 52 Z" : "M50 96 L94 48 L66 48 L66 4 L34 4 L34 48 L6 48 Z"}" fill="${col}" stroke="#05080c" stroke-width="5" stroke-linejoin="round"/></svg>`;

// d = { day, words:[w1,w2,w3], candles, entry, now, side, lev, up }
function html(d, mascotUri) {
  const col = d.up ? UP : DN, [w1, w2, w3] = d.words;
  const chart = (W, H, fs = 1.3) => xChartSvg({ candles: d.candles, entry: d.entry, now: d.now, side: d.side, lev: d.lev, W, H, fs, show: 3 });
  const m = (h, style) => !mascotUri ? "" : `<img src="${mascotUri}" style="position:absolute;height:${h}px;${style}">`;
  const A = (w, style) => `<div style="position:absolute;${style}">${arrowSvg(d.up, col, w)}</div>`;
  const W = (t, size, color, extra = "") => `<div style="font-size:${size}px;line-height:.95;font-weight:900;color:${color};-webkit-text-stroke:3px #05080c;text-shadow:0 6px 0 #05080c;${extra}">${t}</div>`;
  const L = {
    // sun: words stacked left on violet, chart right, mascot bottom-right
    sun: `<body style="background:#2a1250">${`<div style="position:absolute;left:40px;top:60px">${W(w1, 150, "#fff")}${W(w2, 150, "#fbbf24")}${W(w3, 150, "#fff")}</div>`}<div style="position:absolute;right:30px;top:40px;background:#070b0f;border-radius:20px;padding:10px">${chart(560, 380)}</div>${A(170, "left:560px;top:420px")}${m(330, "right:30px;bottom:-20px")}</body>`,
    // mon: big mascot left on deep blue, words right, small chart bottom-right
    mon: `<body style="background:linear-gradient(90deg,#0b3a8c,#071a3d)">${m(640, "left:-10px;bottom:-60px")}<div style="position:absolute;left:430px;top:40px;text-align:right;right:40px">${W(w1, 130, "#fff")}${W(w2, 130, "#7dd3fc")}${W(w3, 130, "#fff")}</div><div style="position:absolute;right:30px;bottom:24px;background:#070b0f;border-radius:16px;padding:8px">${chart(520, 230, 1)}</div>${A(150, "left:400px;bottom:40px")}</body>`,
    // tue: chart as full background, yellow word box centred top, mascot right
    tue: `<body style="background:#070b0f"><div style="position:absolute;left:0;top:150px;opacity:.95">${chart(1280, 560, 1.6)}</div><div style="position:absolute;left:40px;top:24px;background:#fbbf24;padding:10px 26px;border-radius:18px;display:flex;gap:26px">${W(w1, 110, "#111", "-webkit-text-stroke:0;text-shadow:none")}${W(w2, 110, "#111", "-webkit-text-stroke:0;text-shadow:none")}${W(w3, 110, "#b91c1c", "-webkit-text-stroke:0;text-shadow:none")}</div>${m(420, "right:10px;bottom:-30px")}${A(200, "left:60px;bottom:40px")}</body>`,
    // wed: split diagonal - colour panel with words left, chart right, arrow on the seam
    wed: `<body style="background:#0d151b"><div style="position:absolute;left:520px;top:120px;background:#070b0f;border-radius:16px;padding:8px">${chart(720, 470)}</div><div style="position:absolute;left:0;top:0;width:640px;height:720px;background:${col};clip-path:polygon(0 0,100% 0,72% 100%,0 100%)"></div><div style="position:absolute;left:36px;top:40px">${W(w1, 140, "#fff")}${W(w2, 140, "#05080c", "-webkit-text-stroke:0;text-shadow:none")}${W(w3, 140, "#fff")}</div>${A(210, "left:440px;top:480px")}${m(300, "left:40px;bottom:-30px")}</body>`,
    // thu: one-line word banner top, chart bottom, mascot left over the chart
    thu: `<body style="background:#3b0a0a"><div style="position:absolute;left:0;right:0;top:0;height:200px;background:#ef4444;display:flex;gap:28px;justify-content:center;align-items:center">${W(w1, 120, "#fff")}${W(w2, 120, "#fde047")}${W(w3, 120, "#fff")}</div><div style="position:absolute;right:30px;bottom:24px;background:#070b0f;border-radius:16px;padding:8px">${chart(860, 460)}</div>${m(500, "left:10px;bottom:-40px")}${A(160, "left:330px;top:230px")}</body>`,
    // fri: three coloured word blocks stacked left, mascot centre, chart right
    fri: `<body style="background:#04261d"><div style="position:absolute;left:30px;top:40px;display:flex;flex-direction:column;gap:18px">${[[w1, "#16a34a"], [w2, "#0ea5e9"], [w3, "#f97316"]].map(([t, c]) => `<div style="background:${c};padding:6px 22px;border-radius:14px">${W(t, 118, "#fff")}</div>`).join("")}</div>${m(470, "left:470px;bottom:-30px")}<div style="position:absolute;right:24px;top:60px;background:#070b0f;border-radius:16px;padding:8px">${chart(470, 560, 1)}</div>${A(170, "right:120px;bottom:20px")}</body>`,
    // sat: one huge word + two small, chart bottom-left, mascot top-right, light background
    sat: `<body style="background:linear-gradient(135deg,#fef3c7,#fde68a)">${W(w1, 210, "#111", "position:absolute;left:36px;top:6px;-webkit-text-stroke:0;text-shadow:none")}${W(w2 + " " + w3, 96, "#b45309", "position:absolute;left:44px;top:210px;-webkit-text-stroke:0;text-shadow:none")}<div style="position:absolute;left:30px;bottom:24px;background:#070b0f;border-radius:16px;padding:8px">${chart(820, 360)}</div>${m(560, "right:10px;top:40px")}${A(180, "right:330px;top:330px")}</body>`,
  };
  return `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:V;src:url("${here("../templates/fonts/Vazirmatn-Bold.ttf").replace(/\\/g, "/")}")}*{margin:0;box-sizing:border-box}body{width:1280px;height:720px;overflow:hidden;position:relative;font-family:V,"Segoe UI",Arial,sans-serif;text-transform:uppercase}</style></head>${L[d.day]}</html>`;
}

let cache = null;
async function mascotUri(browser, work) {
  if (cache) return cache;
  await mkdir(work, { recursive: true });
  const files = await mascotSprites(browser, 300, work);
  cache = "data:image/png;base64," + readFileSync(files[4]).toString("base64"); // mouth open = talking
  return cache;
}
export async function renderThumb3(d, outPath, work) {
  const browser = await chromium.launch(LAUNCH);
  const uri = d.noMascot ? null : await mascotUri(browser, work || outPath + ".work"); // v5 doc style: no mascot
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent(html(d, uri), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outPath });
  await browser.close();
  return imageHash(outPath);
}

// 3 words per weekday lesson type (schedule.longByWeekday) - the video's own words can override via d.words
export const WORDS = { sat: ["Spot", "this", "candle"], sun: ["RSI", "made", "easy"], mon: ["Biggest", "whale", "bet"], tue: ["Meet", "this", "coin"], wed: ["Whale", "trade", "replay"], thu: ["Avoid", "this", "mistake"], fri: ["Whales", "this", "week"] };

if (process.argv[1] && process.argv[1].endsWith("thumbs3.mjs")) {
  const out = (process.argv.find((a) => a.startsWith("--out=")) || "--out=" + here("../out/thumbs")).slice(6);
  await mkdir(out, { recursive: true });
  const coins = { sun: "ETH", mon: "BTC", tue: "SOL", wed: "BTC", thu: "HYPE", fri: "ETH", sat: "BTC" };
  const hashes = {};
  for (const day of DAYS) {
    const c = await getCandles(coins[day], "1h", 40), entry = c[14][4], now = c.at(-1)[4], up = now >= entry;
    hashes[day] = await renderThumb3({ day, words: WORDS[day], candles: c, entry, now, side: up ? "LONG" : "SHORT", lev: 10, up }, `${out}/thumb-${day}.png`, out + "/.work");
  }
  const T = JSON.parse(readFileSync(here("./schedule.json"), "utf8")).thresholds.thumbMinHashDistance;
  let min = 64, fails = 0; const rows = [];
  for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) { const dd = hashDist(hashes[DAYS[i]], hashes[DAYS[j]]); min = Math.min(min, dd); if (dd < T) fails++; rows.push(`${DAYS[i]}-${DAYS[j]} ${dd}/64${dd < T ? " FAIL" : ""}`); }
  console.log(rows.join("\n"));
  console.log(`THUMB GATE: 21 pairs, min ${min}/64, threshold ${T}, fails ${fails} -> ${fails ? "FAIL" : "PASS"}`);
  process.exit(fails ? 3 : 0);
}

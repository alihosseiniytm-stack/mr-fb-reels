// v6 entry (T50-08, D178): node v2/v6-make.mjs --kind=short|long [--topic=hammer] [--out=dir] [--frames-only]
// Writes <out>/<kind>-<topic>.mp4 + .meta.json + -shotlist.md + -strip.png (+ thumbA/B for long). --frames-only = pictures + plan only
// (no voice/video; laptop preview of the drawings). Renders run on GitHub Actions (yt-v2.yml), never on mr-hub.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { SITE, BOT, dateLabel, imageHash, frameAt, cleanup } from "./lib.mjs";
import { renderV6, drawFrames, svgToPng } from "./v6.mjs";
import { hammerData, hammerLesson } from "./v6-hammer.mjs";
import { C, T, candle } from "./v6-draw.mjs";
import { checkShots } from "./shotlist-gate.mjs";
import { readFileSync } from "node:fs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith("--" + n + "=")); return h ? h.split("=")[1] : d; };
const kind = arg("kind", "short"), topic = arg("topic", "hammer"), out = resolve(arg("out", here("../out"))), framesOnly = process.argv.includes("--frames-only");
const TOPICS = { hammer: { data: hammerData, lesson: hammerLesson, label: "CANDLE SCHOOL" } };
const tp = TOPICS[topic];
if (!tp) throw new Error("unknown v6 topic " + topic);
await mkdir(out, { recursive: true });
const name = `${kind}-${topic}`, work = `${out}/.work-${name}`;
const data = await tp.data();
const L = tp.lesson(kind, data);
const pre = checkShots({ style: "v6", steps: L.steps, data: { hammer: data.hammer } }, { timed: false });
if (!pre.pass) { console.log("shot plan FAIL\n" + pre.fails.join("\n")); process.exit(3); }

if (framesOnly) {
  await drawFrames({ kind, steps: L.steps, data, lesson: tp.label, dir: `${out}/${name}-frames` });
  await writeFile(`${out}/${name}-plan.json`, JSON.stringify({ title: L.title, data: { ...data, candles: undefined }, steps: L.steps.map((s) => ({ ...s, png: s.png.replace(/.*[\\/]/, "") })) }, null, 1));
  console.log("FRAMES", L.steps.length, `${out}/${name}-frames`, JSON.stringify({ iv: data.iv, day: data.month + " " + data.day, low: data.low, close: data.close, pct: data.pct }));
  process.exit(0);
}

const mp4 = `${out}/${name}.mp4`;
const r = await renderV6({ kind, steps: L.steps, data, lesson: tp.label, outPath: mp4, work });
const text = L.steps.map((s) => s.say).join(" ");
const description = `${L.title}\n\nSee live whale moves (free): ${SITE}/en/whales/\nTelegram whale alerts bot: ${BOT}\n\n` +
  `Data: real Bitcoin ${({ "1d": "daily", "4h": "4-hour", "1h": "1-hour" })[data.iv]} candles from a public market data feed (${data.month} ${data.day}: low $${data.low.toLocaleString("en-US")}, close $${data.close.toLocaleString("en-US")}), ${dateLabel()}. ` +
  `Education only, not financial advice. Every picture is drawn by our own code (no stock photos, no AI images); the narrator is a synthetic voice.` + (r.chapters ? "\n\nChapters:\n" + r.chapters : "");
// thumbnails A/B (long): own drawing, 1280x720
let thumbHashA = null;
if (kind === "long") {
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}), page = await browser.newPage();
  const font = "data:font/ttf;base64," + readFileSync(here("../templates/fonts/Vazirmatn-Bold.ttf")).toString("base64");
  const y = (p) => 640 - p * 5.4;
  for (const [ab, l1, l2, acc] of [["A", "HAMMER", "CANDLE", C.yellow], ["B", "WICK ≥ 2×", "BODY", C.green]]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="${C.navy}"/><rect x="40" y="40" width="460" height="640" rx="30" fill="${C.cream}" stroke="${C.ink}" stroke-width="8"/>` +
      candle(270, 76, 86, 18, 84, y, 150) + T(560, 300, l1, 150, acc, "start") + T(560, 450, l2, 150, C.white, "start") + T(560, 560, "Real Bitcoin example", 52, C.cream, "start") + `</svg>`;
    await svgToPng(page, svg, 1280, 720, `${out}/${name}-thumb${ab}.png`, font);
  }
  await browser.close();
  thumbHashA = imageHash(`${out}/${name}-thumbA.png`);
}
frameAt(mp4, 2, `${out}/.f.png`);
const meta = { kind, day: topic, topic, title: L.title, text, description, durationS: Math.round(r.durationMs / 100) / 10, style: "v6", steps: r.steps, chapters: r.chapters,
  data: { iv: data.iv, date: `${data.month} ${data.day}`, low: data.low, close: data.close, pct: data.pct, after: data.after, hammer: data.hammer }, thumbHashA, frameHash: imageHash(`${out}/.f.png`), created: new Date().toISOString() };
await writeFile(`${out}/${name}.meta.json`, JSON.stringify(meta, null, 1));
// shot-list table (sentence -> keyword -> picture) for the owner/vizier review
const md = [`# ${L.title} (${kind}, v6) - shot list`, "", "| # | time | sentence | on screen | picture (type: drawing) | tags |", "|---|---|---|---|---|---|",
  ...r.steps.map((s, i) => `| ${i + 1} | ${s.start.toFixed(1)}-${s.end.toFixed(1)}s (${(s.end - s.start).toFixed(1)}s) | ${s.say} | ${s.kw} | ${s.visual.type}: ${s.visual.draw}${Object.keys(s.visual.args).length ? " " + JSON.stringify(s.visual.args).replace(/\|/g, "/") : ""} | ${s.tags.join(", ")} |`)].join("\n");
await writeFile(`${out}/${name}-shotlist.md`, md + "\n");
// frame strip: 8 frames at the middle of evenly spread steps, 4x2 grid
const pick = [...Array(8)].map((_, k) => r.steps[Math.round((k * (r.steps.length - 1)) / 7)]);
const sc = kind === "short" ? "270:480" : "480:270";
pick.forEach((s, k) => frameAt(mp4, ((s.start + s.end) / 2).toFixed(2), `${work}/strip${k}.png`));
execFileSync("ffmpeg", ["-y", "-v", "error", ...pick.flatMap((_, k) => ["-i", `${work}/strip${k}.png`]), "-filter_complex",
  pick.map((_, k) => `[${k}:v]scale=${sc}[s${k}]`).join(";") + ";[s0][s1][s2][s3]hstack=4[a];[s4][s5][s6][s7]hstack=4[b];[a][b]vstack=2", `${out}/${name}-strip.png`]);
await writeFile(`${out}/${name}-strip.txt`, pick.map((s, k) => `${k + 1}. ${((s.start + s.end) / 2).toFixed(1)}s | ${s.visual.type}:${s.visual.draw} | ${s.kw} | "${s.say}"`).join("\n") + "\n");
await cleanup(work);
console.log("DONE", name, meta.durationS + "s", r.steps.length, "steps", meta.title);

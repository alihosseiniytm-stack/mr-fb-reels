// v2 video toolkit (T50-08/T50-01): live data -> scene screenshots -> narration -> mp4. English first.
// Everything real: whale feed from marketradarwhale.com, candles/prices from the public Hyperliquid info API.
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { synthesizeNarration, probeDurationMs } from "../scripts/tts.mjs";

export const SITE = "https://marketradarwhale.com";
export const BOT = "https://t.me/MarketRadarWhaleBot";
const HL = "https://api.hyperliquid.xyz/info";
const SCENE = fileURLToPath(new URL("./scene.html", import.meta.url));
export const SIZES = { short: { w: 1080, h: 1920 }, long: { w: 1920, h: 1080 }, thumb: { w: 1280, h: 720 } };

async function getJson(url, init) {
  let err;
  for (let a = 0; a < 4; a++) {
    try { return await getJson1(url, init); } catch (e) { err = e; await new Promise((r) => setTimeout(r, 1500 * (a + 1))); }
  }
  throw err;
}
async function getJson1(url, init) {
  const r = await fetch(url, { ...init, headers: { "user-agent": "marketradar-video/2.0", ...(init && init.headers) }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(url + " -> HTTP " + r.status);
  return r.json();
}
const hl = (body) => getJson(HL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export const getFeed = () => getJson(SITE + "/whale-feed");
export const getWhaleOfDay = () => getJson(SITE + "/whale-of-day");
export const getMids = () => hl({ type: "allMids" });
export async function getCandles(coin, interval, bars) {
  const ms = { "15m": 9e5, "1h": 36e5, "4h": 144e5, "1d": 864e5 }[interval];
  const end = Date.now();
  const rows = await hl({ type: "candleSnapshot", req: { coin, interval, startTime: end - ms * (bars + 2), endTime: end } });
  return rows.map((r) => [r.t, +r.o, +r.h, +r.l, +r.c, +r.v]).slice(-bars);
}
export function rsi(closes, n = 14) {
  const out = closes.map(() => null);
  let g = 0, l = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (i <= n) { g += Math.max(d, 0); l += Math.max(-d, 0); if (i === n) { g /= n; l /= n; out[i] = 100 - 100 / (1 + g / (l || 1e-9)); } }
    else { g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; out[i] = 100 - 100 / (1 + g / (l || 1e-9)); }
  }
  return out;
}
export function sma(closes, n) { return closes.map((_, i) => (i < n - 1 ? null : closes.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n)); }

export const money = (n) => { const a = Math.abs(n); return a >= 1e9 ? "$" + (a / 1e9).toFixed(1) + "B" : a >= 1e6 ? "$" + (a / 1e6).toFixed(1) + "M" : a >= 1e3 ? "$" + (a / 1e3).toFixed(0) + "K" : "$" + a.toFixed(0); };
export const moneySay = (n) => { const a = Math.abs(n); return a >= 1e9 ? (a / 1e9).toFixed(1) + " billion dollars" : a >= 1e6 ? (a / 1e6).toFixed(1) + " million dollars" : a >= 1e3 ? (a / 1e3).toFixed(0) + " thousand dollars" : a.toFixed(0) + " dollars"; };
export const px = (p) => ((p = +p) >= 1000 ? p.toFixed(0) : p >= 10 ? p.toFixed(2) : p >= 1 ? p.toFixed(3) : p.toPrecision(3));
export const dateLabel = () => new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date());

function run(cmd, args) { return execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }); }
const LAUNCH = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

export async function shoot(browser, scene, size, path) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h } });
  await page.addInitScript((s) => { window.__SCENE__ = s; }, { ...scene, w: size.w, h: size.h });
  await page.goto("file:///" + SCENE.replace(/\\/g, "/"));
  await page.waitForFunction(() => window.__READY__ === true);
  await page.screenshot({ path });
  await page.close();
}

// scenes: [{ scene:{layout,...}, say:"narration text", beats:N }]. Each scene is narrated once; its screenshots (one per beat,
// elements revealed progressively) share the scene's audio time in proportion to the words they cover.
export async function renderVideo({ kind, scenes, outPath, work }) {
  const size = SIZES[kind];
  await mkdir(work, { recursive: true });
  const browser = await chromium.launch(LAUNCH);
  const listLines = [], audioLines = [];
  let totalMs = 0, tts = "none";
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const mp3 = `${work}/a${i}.mp3`;
    const nar = await synthesizeNarration(sc.say, "en", mp3);
    if (!nar) throw new Error("no narration for scene " + i + " (all TTS providers failed)");
    const dur = nar.durationMs / 1000 + 0.35;
    const padded = `${work}/a${i}.m4a`;
    run("ffmpeg", ["-y", "-v", "error", "-i", mp3, "-af", "apad=pad_dur=0.35,aresample=44100", "-ac", "1", "-c:a", "aac", "-b:a", "128k", padded]);
    audioLines.push(`file '${padded}'`);
    const beats = sc.beats || 1;
    const words = sc.say.split(/\s+/);
    for (let b = 1; b <= beats; b++) {
      const png = `${work}/s${i}_${b}.png`;
      await shoot(browser, { ...sc.scene, beat: sc.scene.beat != null && beats === 1 ? sc.scene.beat : b }, size, png);
      const share = (b === 1 ? Math.ceil(words.length / beats) : Math.floor(words.length / beats)) / words.length;
      listLines.push(`file '${png}'`, `duration ${(dur * (share || 1 / beats)).toFixed(3)}`);
    }
    totalMs += dur * 1000;
  }
  await browser.close();
  listLines.push(listLines[listLines.length - 2]); // concat demuxer needs the last file repeated
  await writeFile(`${work}/v.txt`, listLines.join("\n"));
  await writeFile(`${work}/a.txt`, audioLines.join("\n"));
  await mkdir(outPath.replace(/[\\/][^\\/]+$/, ""), { recursive: true });
  run("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", `${work}/v.txt`, "-f", "concat", "-safe", "0", "-i", `${work}/a.txt`,
    "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", outPath]);
  return { durationMs: probeDurationMs(outPath), scenes: scenes.length };
}

export async function renderThumb(scene, outPath) {
  const browser = await chromium.launch(LAUNCH);
  await shoot(browser, scene, SIZES.thumb, outPath);
  await browser.close();
}

// 64-bit difference hash of an image (via ffmpeg 9x8 gray) -> 16 hex chars
export function imageHash(path) {
  const raw = run("ffmpeg", ["-v", "error", "-i", path, "-vf", "scale=9:8:flags=area,format=gray", "-f", "rawvideo", "-"]);
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += raw[y * 9 + x] > raw[y * 9 + x + 1] ? "1" : "0";
  return BigInt("0b" + bits).toString(16).padStart(16, "0");
}
export const hashDist = (a, b) => { let x = BigInt("0x" + a) ^ BigInt("0x" + b), n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; };
export function frameAt(video, sec, out) { run("ffmpeg", ["-y", "-v", "error", "-ss", String(sec), "-i", video, "-frames:v", "1", out]); }
export async function cleanup(dir) { await rm(dir, { recursive: true, force: true }); }

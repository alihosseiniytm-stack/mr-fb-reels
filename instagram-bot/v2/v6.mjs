// v6 renderer (T50-08, owner D178 2026-11-12): still pictures + slides in ONE own flat style, every picture = what the voice says.
// Input = an explicit shot list (one step per sentence: say, kw, tags, visual{type,draw,args}); no AI animation, no stock photos.
// Sync by construction (each sentence = own TTS file, picture lasts exactly its audio + 0.3 s), motion = slow zoom/drift only
// (v3 motionClip), burned word captions (v3 assFile), -14 LUFS master + H.264 High 8 Mbps (same as v5, YOUTUBE_STANDARDS e/f).
import { mkdir, writeFile, copyFile, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { synthesizeNarration, probeDurationMs, computeMouthEnvelope } from "../scripts/tts.mjs";
import { SIZES } from "./lib.mjs";
import { assFile, motionClip, SAFE } from "./v3.mjs";
import { C, T, drawPicture, cardSvg, whale } from "./v6-draw.mjs";
import { mascotSvg, mouthFrames, blinkFrames, MASCOT_BOX } from "./v6-mascot.mjs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const LAUNCH = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};
const run = (cmd, args, cwd) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28, cwd });
export const BRAND = "MARKETRADAR WHALE";
export const SITE_SHORT = "marketradarwhale.com";
const fontUri = () => "data:font/ttf;base64," + readFileSync(here("../templates/fonts/Vazirmatn-Bold.ttf")).toString("base64");

// split a label into lines of <= max chars (never breaks a word; the URL is never wrapped)
export function wrap(s, max) {
  const out = []; let cur = "";
  for (const w of String(s).split(/\s+/)) { if (cur && (cur + " " + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }
  if (cur) out.push(cur);
  return out;
}
const fit = (s, width, max, k = 0.6) => Math.min(max, Math.floor(width / Math.max(1, String(s).length * k)));

// ---------- one frame (full SVG) ----------
export function frameSvg(kind, st, data, lesson) {
  const { w: W, h: H } = SIZES[kind], short = kind === "short", v = st.visual;
  let s = `<rect width="${W}" height="${H}" fill="${C.navy}"/>`;
  s += T(short ? 44 : 70, short ? 120 : 62, BRAND + " · " + lesson, short ? 34 : 30, C.grey, "start", `letter-spacing="3"`);
  if (v.type === "card") {
    s += cardSvg(W, H, { ...(v.args || {}), big: st.kw, small: st.sub || "", cx: short ? SAFE.short.right / 2 + 10 : 820, cy: short ? 820 : 600 });
  } else if (v.type === "end") {
    const cx = short ? 459 : W / 2, top = short ? 300 : 140;
    s += whale(cx, top + 220, short ? 1.2 : 1.0);
    s += T(cx, top + 520, "LIVE WHALE MOVES, FREE", fit("LIVE WHALE MOVES, FREE", short ? 820 : 1400, 70), C.yellow);
    // URL on ONE line (v5 review: no word wrap), font sized to fit the safe width
    s += `<rect x="${cx - (short ? 415 : 560)}" y="${top + 580}" width="${short ? 830 : 1120}" height="${short ? 130 : 140}" rx="26" fill="${C.cream}" stroke="${C.ink}" stroke-width="7"/>`;
    s += T(cx, top + (short ? 668 : 676), SITE_SHORT, fit(SITE_SHORT, short ? 780 : 1040, 84, 0.58), C.ink, "middle", `white-space="nowrap"`);
    s += T(cx, top + (short ? 800 : 800), "Telegram alerts: @MarketRadarWhaleBot", fit("Telegram alerts: @MarketRadarWhaleBot", short ? 820 : 1200, 48, 0.55), C.white);
  } else {
    // picture panel (square) + keyword label; long = picture left, label column right (v5 review: no empty right column)
    const P = short ? { x: 44, y: 250, s: 830 } : { x: 70, y: 100, s: 800 };
    s += `<rect x="${P.x}" y="${P.y}" width="${P.s}" height="${P.s}" rx="34" fill="${C.cream}" stroke="${C.ink}" stroke-width="8"/>`;
    s += `<g transform="translate(${P.x} ${P.y}) scale(${P.s / 1000})">${drawPicture(v, data)}</g>`;
    if (short) {
      const lines = wrap(st.kw, 12), sz = Math.min(...lines.map((l) => fit(l, 580, 96, 0.58)));
      lines.forEach((l, i) => { s += T(615, 1180 + i * (sz + 12), l, sz, C.yellow); });
      if (st.sub) wrap(st.sub, 22).forEach((l, i) => { s += T(615, 1180 + lines.length * (sz + 12) + 10 + i * 52, l, 44, C.cream); });
    } else {
      const X = 940, lines = wrap(st.kw, 15), sz = Math.min(...lines.map((l) => fit(l, 880, 124, 0.68))); // v6f: 0.6 let wide caps run off the edge (replay 43395660247 "BORROWED MONEY")
      s += `<rect x="${X}" y="140" width="12" height="${lines.length * (sz + 14) + 70}" fill="${C.yellow}"/>`;
      s += T(X + 44, 200, String(st.chapter || "").toUpperCase(), 36, C.grey, "start", `letter-spacing="2"`);
      lines.forEach((l, i) => { s += T(X + 44, 220 + (i + 1) * (sz + 14), l, sz, C.white, "start"); });
      if (st.sub) wrap(st.sub, 24).forEach((l, i) => { s += T(X + 44, 300 + lines.length * (sz + 14) + i * 60, l, 46, C.cream, "start"); });
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

export async function svgToPng(page, svg, W, H, path, font) {
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:V;src:url(${font})}*{margin:0}html,body{width:${W}px;height:${H}px;overflow:hidden;background:${C.navy}}text{font-family:V}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path });
}
export const sha = (buf) => createHash("sha1").update(buf).digest("hex").slice(0, 16);

// MASCOT TRACK (D189/D190): per video frame the puppet of that sentence, mouth 0/1/2 from the voice loudness, blink every 3-6 s.
// Rendered as transparent PNGs (one per used pose/mouth/blink state) + an ffmpeg concat list (m.txt) overlaid in front of the picture.
export async function mascotTrack(kind, steps, work, total, fps = 30) {
  const B = MASCOT_BOX[kind], w = Math.round(360 * B.scale), h = Math.round(440 * B.scale), N = Math.round(total * fps);
  const blink = blinkFrames(N, steps.length * 13 + 5), seq = [];
  steps.forEach((st, i) => {
    const f0 = Math.round(st.start * fps), f1 = i === steps.length - 1 ? N : Math.round((st.start + st.dur) * fps);
    const vals = st.env || [...Array(Math.ceil((st.dur * 1000) / 20))].map((_, j) => (j * 20) / 1000 + st.start >= st.speech[0] && (j * 20) / 1000 + st.start <= st.speech[1] ? (j % 8 < 5 ? 1 : 0.3) : 0);
    const mouth = mouthFrames(vals, f1 - f0, 20, fps);
    for (let f = f0; f < f1; f++) seq.push(`${i}_${mouth[f - f0]}${blink[f] ? "b" : ""}`);
  });
  const browser = await chromium.launch(LAUNCH), page = await browser.newPage(), font = fontUri(), done = new Set();
  await page.setViewportSize({ width: w, height: h });
  for (const k of new Set(seq)) {
    const [i, m] = k.split("_"), st = steps[+i];
    await page.setContent(`<!doctype html><html><head><style>@font-face{font-family:V;src:url(${font})}*{margin:0}html,body{background:transparent}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 360 440">${mascotSvg(st.mascot, +m[0], m.endsWith("b"))}</svg></body></html>`);
    await page.screenshot({ path: `${work}/m${k}.png`, omitBackground: true });
    done.add(k);
  }
  await browser.close();
  const runs = [];
  for (const k of seq) { if (runs.length && runs.at(-1).k === k) runs.at(-1).n++; else runs.push({ k, n: 1 }); }
  const wd = work.split("\\").join("/");
  const lines = runs.flatMap((r) => [`file '${wd}/m${r.k}.png'`, `duration ${(r.n / fps).toFixed(4)}`]);
  lines.push(`file '${wd}/m${runs.at(-1).k}.png'`);
  await writeFile(`${work}/m.txt`, lines.join(String.fromCharCode(10)));
  return { x: B.x, y: B.y, states: done.size, frames: N, mouthOpen: seq.filter((k) => !/_0/.test(k)).length };
}

// draw every frame only (no audio/video): used by the local preview and by renderV6
export async function drawFrames({ kind, steps, data, lesson, dir }) {
  await mkdir(dir, { recursive: true });
  const { w: W, h: H } = SIZES[kind], font = fontUri(), browser = await chromium.launch(LAUNCH), page = await browser.newPage();
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    st.png = `${dir}/f${String(i).padStart(2, "0")}.png`;
    await svgToPng(page, frameSvg(kind, st, data, lesson), W, H, st.png, font);
    st.key = sha(await readFile(st.png));
  }
  await browser.close();
  return steps;
}

export async function renderV6({ kind, steps, data, lesson, outPath, work }) {
  const size = SIZES[kind];
  await mkdir(work + "/fonts", { recursive: true });
  for (const f of ["Vazirmatn-Bold.ttf", "Vazirmatn-Regular.ttf"]) await copyFile(here("../templates/fonts/" + f), `${work}/fonts/${f}`);
  await drawFrames({ kind, steps, data, lesson, dir: work });
  let t = 0;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i], mp3 = `${work}/a${i}.mp3`;
    const nar = await synthesizeNarration(st.say, "en", mp3);
    if (!nar) throw new Error("no narration for step " + i);
    const wav = `${work}/a${i}.wav`;
    run("ffmpeg", ["-y", "-v", "error", "-i", mp3, "-af", `apad=pad_dur=${(0.3 + (st.hold || 0)).toFixed(2)}`, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
    const dur = probeDurationMs(wav) / 1000, env = computeMouthEnvelope(mp3, 20);
    let s0 = 0, s1 = nar.durationMs / 1000;
    if (env) { const v = env.values, f = v.findIndex((x) => x > 0.05), l = v.length - 1 - [...v].reverse().findIndex((x) => x > 0.05); if (f >= 0) { s0 = (f * 20) / 1000; s1 = ((l + 1) * 20) / 1000; } }
    Object.assign(st, { start: t, dur, speech: [t + s0, t + s1], wav, env: env ? env.values : null });
    t += dur;
  }
  const total = t;
  const mOv = await mascotTrack(kind, steps, work, total);
  const vl = steps.map((st, i) => `file '${motionClip(i, st, size, work, Math.round(st.start * 30), Math.round((st.start + st.dur) * 30)).replace(/\\/g, "/")}'`);
  await writeFile(`${work}/v.txt`, vl.join("\n"));
  await writeFile(`${work}/a.txt`, steps.map((s) => `file '${s.wav.replace(/\\/g, "/")}'`).join("\n"));
  run("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", `${work}/a.txt`, "-c:a", "pcm_s16le", `${work}/narration.wav`]);
  const cap = kind === "short" ? { size: 84, marginV: 1920 - 1536 + 16, marginL: 310, marginR: 1080 - 918 + 10 } : { size: 60, marginV: 40, marginL: 48, marginR: 360 };
  await writeFile(`${work}/subs.ass`, assFile(steps, size, cap, kind, true));
  const pad = "0.02*(sin(2*PI*110*t)+0.7*sin(2*PI*164.81*t)+0.5*sin(2*PI*220*t)+0.35*sin(2*PI*277.18*t)+0.25*sin(2*PI*329.63*t+2*sin(2*PI*0.1*t)))*(0.75+0.25*sin(2*PI*0.2*t))";
  await mkdir(outPath.replace(/[\\/][^\\/]+$/, ""), { recursive: true });
  run("ffmpeg", ["-y", "-v", "error", "-i", "narration.wav", "-f", "lavfi", "-i", `aevalsrc=${pad}:s=48000:d=${total.toFixed(2)}`,
    "-filter_complex", `[1:a]lowpass=f=1500,afade=t=in:d=2,afade=t=out:st=${Math.max(0, total - 3).toFixed(2)}:d=3[mu];[0:a]aresample=48000[n];[n][mu]amix=inputs=2:duration=first:normalize=0[a]`,
    "-map", "[a]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", "mix.wav"], work);
  const LN = "I=-14:TP=-1.5:LRA=11";
  const meas = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", "mix.wav", "-af", `loudnorm=${LN}:print_format=json`, "-f", "null", "-"], { cwd: work, encoding: "utf8", maxBuffer: 1 << 26 }).stderr || "";
  const lj = JSON.parse(meas.slice(meas.lastIndexOf("{"), meas.lastIndexOf("}") + 1));
  const lnf = `loudnorm=${LN}:measured_I=${lj.input_i}:measured_TP=${lj.input_tp}:measured_LRA=${lj.input_lra}:measured_thresh=${lj.input_thresh}:offset=${lj.target_offset}:linear=true,aresample=48000`;
  run("ffmpeg", ["-y", "-v", "error", "-threads", "2", "-f", "concat", "-safe", "0", "-i", "v.txt", "-i", "mix.wav", "-f", "concat", "-safe", "0", "-i", "m.txt",
    "-filter_complex", `[0:v]fps=30,scale=out_range=tv,format=yuv420p[bg];[2:v]fps=30,format=rgba[mm];[bg][mm]overlay=${mOv.x}:${mOv.y}:format=auto,ass=subs.ass:fontsdir=fonts,format=yuv420p[v];[1:a]${lnf}[a]`,
    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-color_range", "tv", "-preset", "veryfast", "-b:v", "8M", "-maxrate", "10M", "-bufsize", "16M",
    "-r", "30", "-fps_mode", "cfr", "-g", "15", "-keyint_min", "15", "-sc_threshold", "0", "-bf", "2", "-flags", "+cgop",
    "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", total.toFixed(3), "-movflags", "+faststart", outPath.replace(/\\/g, "/")], work);
  // chapters (long): first step of each chapter, merged when < 10 s apart; YouTube needs >= 3 starting at 0:00
  const ch = [];
  for (const st of steps) if (st.chapter && (!ch.length || ch.at(-1).title !== st.chapter) && (!ch.length || st.start - ch.at(-1).start >= 10)) ch.push({ start: st.start, title: st.chapter });
  if (ch.length && total - ch.at(-1).start < 10) ch.pop();
  const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  const chapters = ch.length >= 3 ? ch.map((c, i) => `${i ? mmss(c.start) : "0:00"} ${c.title}`).join("\n") : "";
  const stepLog = steps.map((s) => ({ mascot: s.mascot, start: +s.start.toFixed(2), end: +(s.start + s.dur).toFixed(2), say: s.say, kw: s.kw, sub: s.sub || "", tags: s.tags, chapter: s.chapter || "",
    visual: { type: s.visual.type, draw: s.visual.draw, args: s.visual.args || {} }, key: s.key }));
  return { durationMs: probeDurationMs(outPath), steps: stepLog, chapters, style: "v6", mascot: mOv };
}

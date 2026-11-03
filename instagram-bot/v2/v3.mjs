// v3 video renderer (T50-08, owner review 2026-10-30 11:25Z). Differences from lib.renderVideo (v2):
//  - SYNC BY CONSTRUCTION: every sentence is its own step = own TTS file; the step's picture stays exactly as long as its audio (+0.3 s).
//  - Shorts SAFE ZONE: page content never enters the right 15% / bottom 20% (scene.html .v3s); every shot is measured (safeViolations).
//  - Charts = X card v3 style (xchart.mjs), drawn into the page's chart box at its real size.
//  - Mascot = the old cartoon teacher whale (templates/whale.js) as sprites; mouth opens with the narration loudness (15 fps), blinks.
//  - Burned word-by-word captions (ASS, Vazirmatn Bold, current word yellow), inside the safe zone.
//  - Low synthetic music bed (generated, no licence), chapters per scene, optional end-screen step for long videos.
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { synthesizeNarration, probeDurationMs, computeMouthEnvelope } from "../scripts/tts.mjs";
import { SIZES } from "./lib.mjs";
import { xChartSvg } from "./xchart.mjs";
import { visualAct } from "./visual.mjs";
import { createHash } from "node:crypto";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const SCENE = here("./scene.html");
const LAUNCH = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};
const run = (cmd, args, cwd) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28, cwd });
export const SAFE = { short: { right: 1080 * 0.85, bottom: 1920 * 0.8 } }; // YouTube Shorts UI: buttons on the right, title/description at the bottom
const GEO = {
  short: { mascotW: 220, cap: { size: 84, marginV: 1920 - 1536 + 16, marginL: 44, marginR: 1080 - 918 + 10 }, fs: 1.5 },
  long: { mascotW: 270, mascotXY: [1920 - 300, 1080 - 452], cap: { size: 58, marginV: 46, marginL: 48, marginR: 330 }, fs: 1.25 },
};
const MOUTH_FPS = 15;

// ---------- sentences + reveal steps ----------
export function sentences(t) {
  const raw = String(t).split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const s of raw) { if (out.length && out[out.length - 1].split(/\s+/).length < 4) out[out.length - 1] += " " + s; else out.push(s); }
  return out;
}
const STOP = new Set("the and that this with from what your you are for its was has have not but".split(" "));
const toks = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => (w.length >= 3 || /\d/.test(w)) && !STOP.has(w));
// long-video scenes with beats: each sentence reveals up to the item it talks about (word overlap), and at least its proportional share
export function expandScene(sc, si) {
  const ss = sentences(sc.say), n = ss.length, beats = sc.beats || 1;
  const items = [...(sc.scene.bullets || []).map((b, i) => ({ t: b.t || b, beat: b.beat == null ? i + 1 : b.beat })), ...(sc.scene.cards || []).map((c) => ({ t: c.k + " " + c.v, beat: c.beat == null ? 1 : c.beat }))];
  let prev = 1;
  return ss.map((say, j) => {
    const words = new Set(toks(say));
    let match = 0;
    for (const it of items) { const hit = toks(it.t).filter((w) => words.has(w)).length; if (hit >= 1 && it.beat > match) match = it.beat; }
    const b = Math.min(beats, Math.max(prev, match, Math.floor((beats * j) / n) + 1));
    prev = b;
    return { say, scene: { ...sc.scene, beat: beats === 1 && sc.scene.beat != null ? sc.scene.beat : b }, si, chapter: sc.chapter || sc.scene.kicker };
  });
}

// chart object of v2 scenes -> X-style chart params
function toXc(c) {
  if (!c || c.rsi) return null;
  const e = (c.hlines || []).find((l) => /^entry/i.test(l.label || "")), liq = (c.hlines || []).find((l) => /^liq/i.test(l.label || ""));
  const nowM = (c.marks || []).find((m) => /^now/i.test(m.label || ""));
  return { candles: c.candles, entry: e ? e.price : null, now: nowM ? nowM.price : null, liq: liq ? liq.price : null, side: c.side, lev: c.lev, title: c.title, hi: c.hi || [], show: c.show || (nowM && c.side ? 9 : e ? 2 : 1) };
}

// ---------- page shots ----------
async function shoot3(browser, scene, size, path, fs) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h } });
  const xc = scene.xc || toXc(scene.chart);
  await page.addInitScript((s) => { window.__SCENE__ = s; }, { ...scene, xc: !!xc, v3: true, w: size.w, h: size.h });
  await page.goto("file:///" + SCENE.replace(/\\/g, "/"));
  await page.waitForFunction(() => window.__READY__ === true);
  if (xc) {
    const r = await page.evaluate(() => { const b = document.getElementById("cb"); if (!b) return null; const q = b.getBoundingClientRect(); return { w: Math.round(q.width), h: Math.round(q.height) }; });
    if (r && r.h > 120) {
      const f = scene.focus, show = Math.max(xc.show || 1, f === "liq" ? 4 : f === "roe" ? 3 : f === "entry" ? 2 : 1);
      const svg = xChartSvg({ ...xc, show, focus: f, W: r.w - 34, H: r.h - 34, fs });
      await page.evaluate((svg) => { const b = document.getElementById("cb"); b.style.cssText += ";padding:14px;background:#070b0f"; b.innerHTML = svg; }, svg);
    }
  }
  const info = await page.evaluate(([sr, sb]) => {
    const bad = [];
    if (sr) for (const e of document.querySelectorAll("#root *")) {
      const q = e.getBoundingClientRect(); if (!q.width || !q.height) continue;
      if (q.right > sr + 1 || q.bottom > sb + 1) bad.push(e.tagName + "." + e.className + " " + Math.round(q.right) + "x" + Math.round(q.bottom));
    }
    const s = document.querySelector(".slot"); const q = s && s.getBoundingClientRect();
    return { bad, slot: q ? { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) } : null };
  }, size.h > size.w ? [SAFE.short.right, SAFE.short.bottom] : [0, 0]);
  await page.screenshot({ path });
  await page.close();
  return info;
}

// ---------- mascot sprites (old teacher whale) ----------
export async function mascotSprites(browser, w, dir) {
  const css = readFileSync(here("../templates/whale.css"), "utf8"), js = readFileSync(here("../templates/whale.js"), "utf8");
  const page = await browser.newPage({ viewport: { width: w + 80, height: Math.round(w * 1.75) + 80 } });
  await page.setContent(`<!doctype html><html><head><style>${css} *{animation:none!important;transition:none!important}html,body{background:transparent;margin:0;padding:20px}</style></head><body><div id="m"></div><script>window.setTimeout=function(){return 0};</script><script>${js}</script></body></html>`);
  const files = [];
  for (let k = 0; k <= 6; k++) { // 0..5 = mouth closed..wide open, 6 = blink (mouth closed, lids shut)
    await page.evaluate(([w, k]) => {
      const m = document.getElementById("m"); m.innerHTML = "";
      const t = window.MRWhale.buildTeacher(m, { width: w });
      document.querySelectorAll(".mrw-lid").forEach((l) => l.setAttribute("ry", k === 6 ? "23" : "0"));
      document.querySelectorAll(".mrw-drop").forEach((d) => d.setAttribute("opacity", "0"));
      window.MRWhale.setMouth(t, k === 6 ? 0 : k / 5);
    }, [w, k]);
    const f = `${dir}/m${k}.png`;
    await page.locator(".mrw-teacher").screenshot({ path: f, omitBackground: true });
    files.push(f);
  }
  await page.close();
  return files;
}

// ---------- captions ----------
const assTime = (t) => { t = Math.max(0, t); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`; };
function assFile(steps, size, cap, kind) {
  const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${size.w}\nPlayResY: ${size.h}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Cap,Vazirmatn,${cap.size},&H00FFFFFF,&H000000FF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,${kind === "short" ? 7 : 5},3,2,${cap.marginL},${cap.marginR},${cap.marginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const lines = [], maxChars = kind === "short" ? 18 : 34;
  for (const st of steps) {
    const words = st.say.replace(/[{}\\]/g, "").split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const [a, b] = st.speech, wt = words.map((w) => w.length + 2), sum = wt.reduce((x, y) => x + y, 0);
    let acc = a; const times = words.map((w, i) => { const s = acc; acc += ((b - a) * wt[i]) / sum; return s; });
    const chunks = []; let cur = [];
    for (let i = 0; i < words.length; i++) { const len = cur.map((j) => words[j]).join(" ").length; if (cur.length && (len + words[i].length > maxChars || cur.length >= 4)) { chunks.push(cur); cur = []; } cur.push(i); if (/[.!?,:]$/.test(words[i]) && cur.length >= 2) { chunks.push(cur); cur = []; } }
    if (cur.length) chunks.push(cur);
    chunks.forEach((ch, ci) => ch.forEach((wi, k) => {
      const s = times[wi], e = k < ch.length - 1 ? times[ch[k + 1]] : ci < chunks.length - 1 ? times[chunks[ci + 1][0]] : Math.min(b + 0.25, st.start + st.dur);
      const txt = ch.map((j) => (j === wi ? `{\\c&H00D7FF&}${words[j]}{\\c&HFFFFFF&}` : words[j])).join(" ");
      lines.push(`Dialogue: 0,${assTime(s)},${assTime(e)},Cap,,0,0,0,,${txt}`);
    }));
  }
  return head + lines.join("\n") + "\n";
}

// ---------- main ----------
// scenes: v2 format [{scene, say, beats, chapter?}] (long) or pre-split steps [{scene, say, si, chapter}] when opts.presplit (Shorts v3)
export async function renderVideo3({ kind, scenes, outPath, work, presplit = false, endScreen = null }) {
  const size = SIZES[kind], geo = GEO[kind];
  await mkdir(work + "/fonts", { recursive: true });
  for (const f of ["Vazirmatn-Bold.ttf", "Vazirmatn-Regular.ttf"]) await copyFile(here("../templates/fonts/" + f), `${work}/fonts/${f}`);
  const steps = presplit ? scenes.map((s, i) => ({ si: s.si ?? i, chapter: s.chapter, ...s })) : scenes.flatMap((sc, si) => expandScene(sc, si));
  if (endScreen) steps.push({ ...endScreen, si: scenes.length, chapter: "End" });
  // ONE SENTENCE = ONE VISUAL (owner 10-30): every step gets its own on-screen callout + chart focus taken from its sentence
  let prevKw = null;
  for (const st of steps) {
    const hasChart = !!(st.scene.xc || (st.scene.chart && !st.scene.chart.rsi));
    const act = st.act || visualAct(st.say, { hasChart, prevKw });
    st.scene = { ...st.scene, kw: act.kw, focus: act.focus || null };
    prevKw = act.kw;
  }
  const browser = await chromium.launch(LAUNCH);
  const shots = new Map(), safeBad = [];
  let t = 0, slot = null;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const mp3 = `${work}/a${i}.mp3`;
    const nar = await synthesizeNarration(st.say, "en", mp3);
    if (!nar) throw new Error("no narration for step " + i);
    const wav = `${work}/a${i}.wav`;
    run("ffmpeg", ["-y", "-v", "error", "-i", mp3, "-af", `apad=pad_dur=${(0.3 + (st.hold || 0)).toFixed(2)}`, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
    const dur = probeDurationMs(wav) / 1000;
    const env = computeMouthEnvelope(mp3, 20);
    let s0 = 0, s1 = nar.durationMs / 1000;
    if (env) { const v = env.values, f = v.findIndex((x) => x > 0.05), l = v.length - 1 - [...v].reverse().findIndex((x) => x > 0.05); if (f >= 0) { s0 = (f * 20) / 1000; s1 = ((l + 1) * 20) / 1000; } }
    Object.assign(st, { start: t, dur, speech: [t + s0, t + s1], wav });
    const key = JSON.stringify(st.scene);
    if (!shots.has(key)) {
      const png = `${work}/s${shots.size}.png`;
      const info = await shoot3(browser, st.scene, size, png, geo.fs);
      if (info.bad.length) safeBad.push(...info.bad.map((b) => `step ${i}: ${b}`));
      if (info.slot) slot = info.slot;
      shots.set(key, png);
    }
    st.png = shots.get(key);
    t += dur;
  }
  const total = t;
  // mascot sprites + position
  const mw = kind === "short" && slot ? Math.min(slot.w, Math.round(slot.h * 300 / 480)) : geo.mascotW;
  const sprites = await mascotSprites(browser, mw, work);
  await browser.close();
  const sh = Math.round(mw * 480 / 300); // (sprite png includes the drop shadow; overlay position uses the svg box)
  const mxy = kind === "short" && slot ? [slot.x + Math.round((slot.w - mw) / 2), slot.y + Math.max(0, Math.round((slot.h - sh) / 2))] : geo.mascotXY;
  // video list
  const vl = [];
  for (const st of steps) vl.push(`file '${st.png.replace(/\\/g, "/")}'`, `duration ${st.dur.toFixed(3)}`);
  vl.push(vl[vl.length - 2]);
  await writeFile(`${work}/v.txt`, vl.join("\n"));
  await writeFile(`${work}/a.txt`, steps.map((s) => `file '${s.wav.replace(/\\/g, "/")}'`).join("\n"));
  run("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", `${work}/a.txt`, "-c:a", "pcm_s16le", `${work}/narration.wav`]);
  // mouth track from the real narration loudness
  const env = computeMouthEnvelope(`${work}/narration.wav`, 1000 / MOUTH_FPS);
  const ml = []; let last = -1, run1 = 0;
  const frames = Math.ceil(total * MOUTH_FPS);
  for (let f = 0; f < frames; f++) {
    const v = env ? env.values[f] || 0 : 0;
    let k = Math.min(5, Math.round(v * 5));
    if (k === 0 && f % 64 < 2) k = 6; // blink about every 4 s when the mouth is shut
    if (k === last) run1++; else { if (last >= 0) ml.push(`file '${sprites[last].replace(/\\/g, "/")}'`, `duration ${(run1 / MOUTH_FPS).toFixed(4)}`); last = k; run1 = 1; }
  }
  ml.push(`file '${sprites[last].replace(/\\/g, "/")}'`, `duration ${(run1 / MOUTH_FPS).toFixed(4)}`, `file '${sprites[last].replace(/\\/g, "/")}'`);
  await writeFile(`${work}/m.txt`, ml.join("\n"));
  await writeFile(`${work}/subs.ass`, assFile(steps, size, geo.cap, kind));
  // low music bed: soft A-major pad with slow movement, about -25 dBFS under the voice
  const pad = "0.02*(sin(2*PI*110*t)+0.7*sin(2*PI*164.81*t)+0.5*sin(2*PI*220*t)+0.35*sin(2*PI*277.18*t)+0.25*sin(2*PI*329.63*t+2*sin(2*PI*0.1*t)))*(0.75+0.25*sin(2*PI*0.2*t))";
  await mkdir(outPath.replace(/[\\/][^\\/]+$/, ""), { recursive: true });
  // audio (YOUTUBE_STANDARDS.md e/f): voice + music bed mixed at 48 kHz, then 2-pass linear loudnorm to -14 LUFS, true peak <= -1.5 dBTP
  run("ffmpeg", ["-y", "-v", "error", "-i", "narration.wav", "-f", "lavfi", "-i", `aevalsrc=${pad}:s=48000:d=${total.toFixed(2)}`,
    "-filter_complex", `[1:a]lowpass=f=1500,afade=t=in:d=2,afade=t=out:st=${Math.max(0, total - 3).toFixed(2)}:d=3[mu];[0:a]aresample=48000[n];[n][mu]amix=inputs=2:duration=first:normalize=0[a]`,
    "-map", "[a]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", "mix.wav"], work);
  const LN = "I=-14:TP=-1.5:LRA=11";
  const meas = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", "mix.wav", "-af", `loudnorm=${LN}:print_format=json`, "-f", "null", "-"], { cwd: work, encoding: "utf8", maxBuffer: 1 << 26 }).stderr || "";
  const lj = JSON.parse(meas.slice(meas.lastIndexOf("{"), meas.lastIndexOf("}") + 1));
  const lnf = `loudnorm=${LN}:measured_I=${lj.input_i}:measured_TP=${lj.input_tp}:measured_LRA=${lj.input_lra}:measured_thresh=${lj.input_thresh}:offset=${lj.target_offset}:linear=true,aresample=48000`;
  // video: H.264 High, yuv420p, constant 30 fps, closed GOP of half the frame rate, 8 Mbps (YouTube 1080p SDR recommendation), moov atom first
  run("ffmpeg", ["-y", "-v", "error", "-threads", "2",
    "-f", "concat", "-safe", "0", "-i", "v.txt", "-f", "concat", "-safe", "0", "-i", "m.txt", "-i", "mix.wav",
    "-filter_complex", `[0:v]fps=30,format=yuv420p[b];[1:v]fps=30,format=rgba[m];[b][m]overlay=${mxy[0]}:${mxy[1]}:eof_action=repeat[o];[o]ass=subs.ass:fontsdir=fonts,format=yuv420p[v];[2:a]${lnf}[a]`,
    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-b:v", "8M", "-maxrate", "10M", "-bufsize", "16M",
    "-r", "30", "-fps_mode", "cfr", "-g", "15", "-keyint_min", "15", "-sc_threshold", "0", "-bf", "2", "-flags", "+cgop",
    "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", outPath.replace(/\\/g, "/")], work);
  // chapters: one per source scene (merged when shorter than 10 s; YouTube needs >= 3, first at 0:00)
  const chapters = [];
  for (const st of steps) { if (!chapters.length || chapters[chapters.length - 1].si !== st.si) chapters.push({ si: st.si, start: st.start, title: String(st.chapter || "Part").replace(/\s+/g, " ") }); }
  const ch2 = [];
  for (const c of chapters) { if (ch2.length && c.start - ch2[ch2.length - 1].start < 10) continue; ch2.push(c); }
  if (ch2.length && total - ch2[ch2.length - 1].start < 10) ch2.pop();
  const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  const chapterText = ch2.length >= 3 ? ch2.map((c, i) => `${i ? mmss(c.start) : "0:00"} ${c.title.charAt(0) + c.title.slice(1).toLowerCase()}`).join("\n") : "";
  const stepLog = steps.map((s) => ({ start: +s.start.toFixed(2), end: +(s.start + s.dur).toFixed(2), say: s.say, kicker: s.scene.kicker, headline: s.scene.headline, beat: s.scene.beat, kw: s.scene.kw, focus: s.scene.focus, key: createHash("sha1").update(JSON.stringify(s.scene)).digest("hex").slice(0, 10), png: s.png.split(/[\\/]/).pop() }));
  return { durationMs: probeDurationMs(outPath), steps: stepLog, chapters: chapterText, safeViolations: safeBad, mascot: { x: mxy[0], y: mxy[1], w: mw, h: sh } };
}

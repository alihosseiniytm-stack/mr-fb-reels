import { Communicate } from "edge-tts-universal";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

// Free neural text-to-speech (Microsoft's public Edge TTS service — no API key, no cost).
// One voice per language; swap these if you want a different narrator.
const VOICES = {
  en: "en-US-GuyNeural",
  fa: "fa-IR-FaridNeural",
};

// Returns null on any failure so callers can fall back to a silent, caption-only video
// instead of breaking the whole run over a flaky third-party TTS call.
async function edgeTts(text, lang, outPath) {
  try {
    const communicate = new Communicate(text, { voice: VOICES[lang] || VOICES.en });
    const chunks = [];
    // 2026-10-14: the stream sometimes never ends (run.mjs died with "unsettled top-level await", exit 13, every scheduled run). 30 s cap, then null = no narration.
    let timer;
    await Promise.race([
      (async () => { for await (const chunk of communicate.stream()) { if (chunk.type === "audio" && chunk.data) chunks.push(Buffer.from(chunk.data)); } })(),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("TTS timeout 20s")), 20000); }),
    ]).finally(() => clearTimeout(timer));
    if (!chunks.length) return null;
    await writeFile(outPath, Buffer.concat(chunks));
    return { path: outPath, durationMs: probeDurationMs(outPath) };
  } catch (e) {
    console.log("TTS_ERR", e && e.message);
    return null;
  }
}

// Loudness envelope of the narration (0..1 per stepMs window) used to drive the whale's jaw.
// Returns null on any failure — the whale then falls back to a generic chatter animation.
export function computeMouthEnvelope(path, stepMs = 50) {
  try {
    const rate = 8000;
    const pcm = execFileSync(
      "ffmpeg",
      ["-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", String(rate), "-"],
      { maxBuffer: 64 * 1024 * 1024 }
    );
    const samplesPerStep = Math.round((rate * stepMs) / 1000);
    const total = Math.floor(pcm.length / 2 / samplesPerStep);
    const rms = [];
    for (let s = 0; s < total; s++) {
      let sum = 0;
      for (let i = 0; i < samplesPerStep; i++) {
        const v = pcm.readInt16LE((s * samplesPerStep + i) * 2);
        sum += v * v;
      }
      rms.push(Math.sqrt(sum / samplesPerStep));
    }
    if (!rms.length) return null;
    // Normalise against the loud-but-not-peak level so ordinary speech reaches a wide-open mouth.
    const sorted = [...rms].sort((a, b) => a - b);
    const ref = sorted[Math.floor(sorted.length * 0.9)] || sorted[sorted.length - 1] || 1;
    const gate = ref * 0.08; // below this it's silence: mouth shut
    const raw = rms.map((v) => (v < gate ? 0 : Math.min(1, v / ref)));
    // Light smoothing so the jaw doesn't jitter frame to frame.
    const values = raw.map((v, i) => {
      const prev = raw[i - 1] ?? v;
      const next = raw[i + 1] ?? v;
      return Math.round(((prev + v * 2 + next) / 4) * 100) / 100;
    });
    return { stepMs, values };
  } catch (e) {
    console.log("ENVELOPE_ERR", e && e.message);
    return null;
  }
}

export function probeDurationMs(path) {
  const out = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    path,
  ]).toString().trim();
  return Math.round(parseFloat(out) * 1000);
}

// 2026-10-15 (owner: "videos have no sound"): Edge TTS times out on GitHub's datacenter IPs, which made every video silent.
// Chain: Edge TTS (2 tries) -> Google Translate TTS (free, chunks of <= 190 chars) -> espeak-ng (offline, installed by the workflow). null only if all fail.
async function googleTts(text, lang, outPath) {
  try {
    const tl = lang === "fa" ? "fa" : "en";
    const sentences = String(text).replace(/\s+/g, " ").match(/[^.!?\u061F]+[.!?\u061F]?/g) || [String(text)];
    const chunks = [];
    for (const s of sentences) { let cur = s.trim(); while (cur.length > 190) { const cut = cur.lastIndexOf(" ", 190); chunks.push(cur.slice(0, cut > 40 ? cut : 190)); cur = cur.slice(cut > 40 ? cut : 190).trim(); } if (cur) chunks.push(cur); }
    const bufs = [];
    for (const c of chunks) {
      const url = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" + tl + "&q=" + encodeURIComponent(c);
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", referer: "https://translate.google.com/" }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error("google tts " + res.status);
      bufs.push(Buffer.from(await res.arrayBuffer()));
    }
    if (!bufs.length) return null;
    await writeFile(outPath, Buffer.concat(bufs));
    return { path: outPath, durationMs: probeDurationMs(outPath) };
  } catch (e) { console.log("GOOGLE_TTS_ERR", e && e.message); return null; }
}
function espeakTts(text, lang, outPath) {
  try {
    const wav = outPath + ".wav";
    execFileSync("espeak-ng", ["-v", lang === "fa" ? "fa" : "en-us", "-s", "150", "-w", wav, String(text)], { timeout: 60000 });
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", wav, "-ar", "24000", "-ac", "1", "-b:a", "96k", outPath], { timeout: 60000 });
    return { path: outPath, durationMs: probeDurationMs(outPath) };
  } catch (e) { console.log("ESPEAK_ERR", e && e.message); return null; }
}
export async function synthesizeNarration(text, lang, outPath) {
  for (let i = 0; i < 2; i++) { const r = await edgeTts(text, lang, outPath); if (r) { console.log("TTS_PROVIDER edge"); return r; } }
  let r = await googleTts(text, lang, outPath); if (r) { console.log("TTS_PROVIDER google"); return r; }
  r = espeakTts(text, lang, outPath); if (r) { console.log("TTS_PROVIDER espeak"); return r; }
  console.log("TTS_PROVIDER none");
  return null;
}

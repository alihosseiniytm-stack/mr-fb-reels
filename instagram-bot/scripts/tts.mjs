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
export async function synthesizeNarration(text, lang, outPath) {
  try {
    const communicate = new Communicate(text, { voice: VOICES[lang] || VOICES.en });
    const chunks = [];
    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) chunks.push(Buffer.from(chunk.data));
    }
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

// Splits the spoken narration into short phrases and spreads them over the voiceover's real
// duration in proportion to their length, so the on-screen text advances with the voice instead
// of showing the whole script as one wall of text. Returns [{ startMs, endMs, text }].
export function buildSubtitleChunks(text, totalMs, maxChars = 40) {
  const phrases = text
    .split(/(?<=[.!?؟،,;؛:—…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pieces = [];
  for (const phrase of phrases) {
    if (phrase.length <= maxChars) {
      pieces.push(phrase);
      continue;
    }
    // Break long phrases into roughly equal parts at word boundaries.
    const parts = Math.ceil(phrase.length / maxChars);
    const target = Math.ceil(phrase.length / parts);
    let cur = "";
    for (const word of phrase.split(/\s+/)) {
      if (cur && (cur + " " + word).length > target) {
        pieces.push(cur);
        cur = word;
      } else {
        cur = cur ? cur + " " + word : word;
      }
    }
    if (cur) pieces.push(cur);
  }

  // A tiny fragment on its own flashes by too fast to read; fold it into its neighbour.
  const merged = [];
  let carry = "";
  for (const p of pieces) {
    if (!merged.length && p.length < 10) {
      carry = carry ? carry + " " + p : p; // leading fragment: fold into the next piece
    } else if (merged.length && p.length < 10) {
      merged[merged.length - 1] += " " + p;
    } else {
      merged.push(carry ? carry + " " + p : p);
      carry = "";
    }
  }
  if (carry) merged.push(carry);

  const totalChars = merged.reduce((n, p) => n + p.length, 0) || 1;
  let t = 0;
  return merged.map((p) => {
    const d = (totalMs * p.length) / totalChars;
    const chunk = { startMs: Math.round(t), endMs: Math.round(t + d), text: p };
    t += d;
    return chunk;
  });
}

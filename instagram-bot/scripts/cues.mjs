// Works out WHEN the narration talks about each stat card, so the teacher whale's pointer can swing to
// that card as the voice says it. The position of the stat's value inside the spoken text, as a fraction
// of the whole script, is mapped onto the voiceover's real duration (same proportional timing the
// subtitles use, so pointer and subtitle move together). Stats the script never mentions get no cue —
// the teacher simply doesn't point at them. Returns [{ stat, atMs }] sorted by time.

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function tokensFor(stat) {
  const tokens = [];
  if (stat.hint) tokens.push(String(stat.hint));
  const value = String(stat.value || "");
  if (/^0x/i.test(value)) return tokens; // wallet addresses are never read aloud
  for (const m of value.matchAll(/\d+(?:\.\d+)?/g)) {
    const whole = m[0];
    const intPart = whole.split(".")[0];
    if (whole.length >= 2) tokens.push(whole);
    if (intPart.length >= 2 && intPart !== whole) tokens.push(intPart);
  }
  for (const m of value.matchAll(/[A-Za-z]{2,}/g)) {
    if (!/^(SOL|USD|M|K|B)$/i.test(m[0])) tokens.push(m[0]);
  }
  return tokens;
}

function findFrom(text, token, from) {
  const isWord = /^[\p{L}]/u.test(token);
  const re = isWord
    ? new RegExp(`(?<![\\p{L}\\d])${escapeRe(token)}(?![\\p{L}\\d])`, "u")
    : new RegExp(`(?<![\\d.])${escapeRe(token)}(?!\\d)`);
  const m = re.exec(text.slice(from));
  return m ? from + m.index : -1;
}

export function buildPointCues(stats, mainLine, ctaLine, durationMs, leadMs = 300) {
  const full = `${mainLine} ${ctaLine}`;
  // Skip the "Breaking today, <date>:" intro so a date's digits can't be mistaken for a stat.
  const colon = mainLine.indexOf(": ");
  const from = colon >= 0 ? colon + 2 : 0;
  const cues = [];
  stats.forEach((stat, i) => {
    let best = -1;
    for (const tok of tokensFor(stat)) {
      const pos = findFrom(full, tok, from);
      if (pos >= 0 && (best < 0 || pos < best)) best = pos;
    }
    if (best >= 0) cues.push({ stat: i, pos: best });
  });
  cues.sort((a, b) => a.pos - b.pos);
  return cues.map((c) => ({ stat: c.stat, atMs: Math.max(0, Math.round((durationMs * c.pos) / full.length) - leadMs) }));
}

// Plans the board so cards appear ONE BY ONE, in the order the narration explains them: each card shows
// up just before the teacher points at it, and the next one only appears once the voice moves on. The
// stats are reordered into narration order (so the board fills top to bottom as the story is told);
// any stat the script never mentions is added afterwards, one at a time, before the call to action.
// Returns { stats, cues: [{ stat, atMs, revealMs }] } where `stat` indexes the REORDERED stats.
export function planBoard(stats, mainLine, ctaLine, durationMs, outroMs) {
  const mentioned = buildPointCues(stats, mainLine, ctaLine, durationMs);
  const seen = new Set(mentioned.map((c) => c.stat));
  const order = [...mentioned.map((c) => c.stat), ...stats.map((_, i) => i).filter((i) => !seen.has(i))];

  const cues = mentioned.map((c, k) => ({ stat: k, atMs: c.atMs }));
  const rest = order.length - cues.length;
  if (rest > 0) {
    const from = cues.length ? cues[cues.length - 1].atMs : 800;
    const room = Math.max(0, (outroMs || from + 6000) - 400 - from);
    const step = Math.min(1300, Math.max(600, room / rest));
    for (let j = 0; j < rest; j++) cues.push({ stat: cues.length, atMs: Math.round(from + step * (j + 1)) });
  }
  cues.forEach((c, k) => {
    // The first card must not leave the board empty for long; later ones appear as the voice moves on.
    c.revealMs = k === 0 ? Math.max(400, Math.min(1800, c.atMs - 500)) : Math.max(0, c.atMs - 450);
  });
  return { stats: order.map((i) => stats[i]), cues };
}

// Board timing for a site-tour lesson (see tourScript in config.mjs): card k appears and is pointed at
// exactly when the voice reaches point k's sentence (position in the script -> time in the voiceover, the
// same proportional mapping the subtitles use). Returns [{ stat, atMs, revealMs }].
export function planLesson(script, durationMs, leadMs = 200) {
  const fullLen = script.main.length + 1 + script.cta.length;
  return script.pointStarts.map((start, k) => {
    const atMs = Math.max(0, Math.round((durationMs * start) / fullLen) - leadMs);
    return { stat: k, atMs, revealMs: k === 0 ? Math.max(300, atMs - 400) : Math.max(0, atMs - 350) };
  });
}

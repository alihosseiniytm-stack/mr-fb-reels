// v6 candle pattern rules (T50-08, D186 fix 2026-11-12): the real-chart shot circles a candle ONLY when the code proves it IS that pattern.
// Pure functions (no imports): used by the lesson makers (pick the candle from REAL candles) AND by the shot-list gate (re-check the proof).
// k = [t, o, h, l, c]; ks = candles oldest -> newest; i = index of the LAST candle of the pattern (the one circled).
const P = (k) => { const [, o, h, l, c] = k, body = Math.abs(c - o), range = h - l; return { o, h, l, c, body, range, lower: Math.min(o, c) - l, upper: h - Math.max(o, c), up: c > o, down: c < o }; };
// trend before candle i: 5 candles before fell (or rose) >= 1.5% and candle i made the lowest low (or highest high) of them
export const afterDown = (ks, i) => i >= 6 && ks[i - 1][4] <= ks[i - 6][4] * 0.985 && ks[i][3] <= Math.min(...ks.slice(i - 5, i).map((x) => x[3]));
export const afterUp = (ks, i) => i >= 6 && ks[i - 1][4] >= ks[i - 6][4] * 1.015 && ks[i][2] >= Math.max(...ks.slice(i - 5, i).map((x) => x[2]));
const hammerShape = (k) => { const p = P(k); return p.range > 0 && p.body >= 0.03 * p.range && p.lower >= 2 * p.body && p.lower >= 0.6 * p.range && p.upper <= 0.1 * p.range && p.upper <= p.lower / 4; };
const starShape = (k) => { const p = P(k); return p.range > 0 && p.body >= 0.03 * p.range && p.upper >= 2 * p.body && p.upper >= 0.6 * p.range && p.lower <= 0.1 * p.range && p.lower <= p.upper / 4; };
const big = (k, ks, i) => P(k).range >= 0.9 * (ks.slice(Math.max(0, i - 8), i).reduce((x, q) => x + q[2] - q[3], 0) / Math.min(8, i || 1));

// rule text = what the voice says on screen; test(ks, i) = true only for a real pattern
export const PATTERNS = {
  hammer: { n: 1, rule: "lower wick >= 2x body, small upper wick, after a fall", test: (ks, i) => hammerShape(ks[i]) && afterDown(ks, i) },
  shooting_star: { n: 1, rule: "upper wick >= 2x body, small lower wick, after a rise", test: (ks, i) => starShape(ks[i]) && afterUp(ks, i) },
  doji: { n: 1, rule: "open and close almost equal (body <= 10% of range)", test: (ks, i) => { const p = P(ks[i]); return p.range > 0 && p.body <= 0.1 * p.range && p.lower >= 0.2 * p.range && p.upper >= 0.2 * p.range && big(ks[i], ks, i); } },
  bull_engulfing: { n: 2, rule: "green body fully covers the red body before it, after a fall", test: (ks, i) => { const a = P(ks[i - 1]), b = P(ks[i]); return a.down && b.up && b.o <= a.c && b.c >= a.o && b.body >= 1.2 * a.body && afterDown(ks, i - 1); } },
  bear_engulfing: { n: 2, rule: "red body fully covers the green body before it, after a rise", test: (ks, i) => { const a = P(ks[i - 1]), b = P(ks[i]); return a.up && b.down && b.o >= a.c && b.c <= a.o && b.body >= 1.2 * a.body && afterUp(ks, i - 1); } },
  harami: { n: 2, rule: "small body inside the big body before it", test: (ks, i) => { const a = P(ks[i - 1]), b = P(ks[i]); return a.body >= 0.6 * a.range && b.body <= 0.5 * a.body && Math.max(b.o, b.c) <= Math.max(a.o, a.c) && Math.min(b.o, b.c) >= Math.min(a.o, a.c) && (afterDown(ks, i - 1) || afterUp(ks, i - 1)); } },
  tweezer_bottom: { n: 2, rule: "two candles with the same low (within 0.15%), red then green, after a fall", test: (ks, i) => { const a = P(ks[i - 1]), b = P(ks[i]); return a.down && b.up && Math.abs(a.l - b.l) <= 0.0015 * a.l && afterDown(ks, i - 1); } },
  morning_star: { n: 3, rule: "big red, small middle candle, big green closing above the red middle, after a fall", test: (ks, i) => { const a = P(ks[i - 2]), m = P(ks[i - 1]), c = P(ks[i]); return a.down && a.body >= 0.5 * a.range && m.body <= 0.4 * a.body && c.up && c.c >= (a.o + a.c) / 2 && afterDown(ks, i - 2); } },
  evening_star: { n: 3, rule: "big green, small middle candle, big red closing below the green middle, after a rise", test: (ks, i) => { const a = P(ks[i - 2]), m = P(ks[i - 1]), c = P(ks[i]); return a.up && a.body >= 0.5 * a.range && m.body <= 0.4 * a.body && c.down && c.c <= (a.o + a.c) / 2 && afterUp(ks, i - 2); } },
  three_white_soldiers: { n: 3, rule: "three green candles, each closing higher, small upper wicks", test: (ks, i) => [0, 1, 2].every((j) => { const p = P(ks[i - j]); return p.up && p.body >= 0.55 * p.range; }) && ks[i][4] > ks[i - 1][4] && ks[i - 1][4] > ks[i - 2][4] && ks[i - 3][4] < ks[i - 2][1] * 1.01 },
};
export const isHammer = (k) => hammerShape(k);

// newest clear example first; after = candles that must exist after it (to show what happened next); confirm = next candle agrees
export function findPattern(key, ks, after = 5, { minIdx = 8 } = {}) {
  const R = PATTERNS[key];
  if (!R) throw new Error("unknown pattern " + key);
  for (let i = ks.length - 1 - after; i >= minIdx; i--) if (R.test(ks, i) && big(ks[i], ks, i)) return i;
  for (let i = ks.length - 1 - after; i >= minIdx; i--) if (R.test(ks, i)) return i;
  return -1;
}
// what the gate re-checks: the circled candle + the 8 before it (O/H/L/C only)
export const patternProof = (key, ks, i) => ({ key, candles: ks.slice(i - 8, i + 1).map((k) => k.slice(1, 5)) });
export function checkProof(p) {
  if (!p || !PATTERNS[p.key] || !Array.isArray(p.candles) || p.candles.length < 9) return "no pattern proof (OHLC of the circled candle + 8 before) in the data";
  const ks = p.candles.map((x) => [0, ...x]), i = ks.length - 1;
  if (!PATTERNS[p.key].test(ks, i)) return `circled candle O/H/L/C ${p.candles[i].map(Math.round).join("/")} is NOT a ${p.key.replace(/_/g, " ")} (${PATTERNS[p.key].rule})`;
  return "";
}

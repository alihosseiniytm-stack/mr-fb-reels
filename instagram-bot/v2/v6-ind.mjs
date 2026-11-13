// v6 indicator math (T50-08 v6d): plain, testable formulas on candles [[t,o,h,l,c,v]]. Used by the indicator lessons
// (v6-types.mjs) and the indicator pictures (v6-draw.mjs chart "ind" / diagram "ind"). Same formulas everywhere = the
// picture shows exactly the numbers the voice says.
export const closes = (ks) => ks.map((k) => +k[4]);
export function sma(v, n) { return v.map((_, i) => (i < n - 1 ? null : v.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n)); }
export function ema(v, n) { const a = 2 / (n + 1), o = []; let e = null; v.forEach((x, i) => { e = e === null ? x : x * a + e * (1 - a); o.push(i < n - 1 ? null : e); }); return o; }
// Wilder RSI(14)
export function rsi(v, n = 14) {
  const o = v.map(() => null); let g = 0, l = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i] - v[i - 1], up = Math.max(0, d), dn = Math.max(0, -d);
    if (i <= n) { g += up / n; l += dn / n; if (i === n) o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); continue; }
    g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return o;
}
export function macd(v, f = 12, s = 26, sig = 9) {
  const ef = ema(v, f), es = ema(v, s), m = v.map((_, i) => (ef[i] === null || es[i] === null ? null : ef[i] - es[i]));
  const start = m.findIndex((x) => x !== null), sg = m.map(() => null);
  if (start >= 0) ema(m.slice(start), sig).forEach((x, j) => (sg[start + j] = x));
  return { macd: m, signal: sg, hist: m.map((x, i) => (x === null || sg[i] === null ? null : x - sg[i])) };
}
export function bollinger(v, n = 20, k = 2) {
  const mid = sma(v, n), sd = v.map((_, i) => (i < n - 1 ? null : Math.sqrt(v.slice(i - n + 1, i + 1).reduce((a, x) => a + (x - mid[i]) ** 2, 0) / n)));
  return { mid, up: mid.map((m, i) => (m === null ? null : m + k * sd[i])), lo: mid.map((m, i) => (m === null ? null : m - k * sd[i])) };
}
export const volAvg = (ks, n = 20) => sma(ks.map((k) => +k[5] || 0), n);

// latest signal event per indicator, with >= after candles after it. Returns { i, dir: "up"|"down", value }
export function findEvent(key, ks, after = 5) {
  const v = closes(ks), last = ks.length - 1 - after;
  for (let i = last; i > 60; i--) {
    if (key === "rsi") { const r = rsi(v); if (r[i] !== null && r[i - 1] !== null) { if (r[i] < 30 && r[i - 1] >= 30) return { i, dir: "up", value: +r[i].toFixed(0) }; if (r[i] > 70 && r[i - 1] <= 70) return { i, dir: "down", value: +r[i].toFixed(0) }; } }
    if (key === "moving_average") { const a = sma(v, 20), b = sma(v, 50); if (a[i - 1] !== null && b[i - 1] !== null) { if (a[i] > b[i] && a[i - 1] <= b[i - 1]) return { i, dir: "up", value: Math.round(a[i]) }; if (a[i] < b[i] && a[i - 1] >= b[i - 1]) return { i, dir: "down", value: Math.round(a[i]) }; } }
    if (key === "macd") { const m = macd(v); if (m.hist[i] !== null && m.hist[i - 1] !== null) { if (m.hist[i] > 0 && m.hist[i - 1] <= 0) return { i, dir: "up", value: 0 }; if (m.hist[i] < 0 && m.hist[i - 1] >= 0) return { i, dir: "down", value: 0 }; } }
    if (key === "bollinger") { const b = bollinger(v); if (b.lo[i] !== null) { if (v[i] < b.lo[i] && v[i - 1] >= b.lo[i - 1]) return { i, dir: "up", value: Math.round(b.lo[i]) }; if (v[i] > b.up[i] && v[i - 1] <= b.up[i - 1]) return { i, dir: "down", value: Math.round(b.up[i]) }; } }
    if (key === "volume") { const a = volAvg(ks); if (a[i - 1] && +ks[i][5] >= 2.5 * a[i - 1]) return { i, dir: ks[i][4] >= ks[i][1] ? "up" : "down", value: +(ks[i][5] / a[i - 1]).toFixed(1) }; }
  }
  return null;
}
export const IND_KEYS = ["rsi", "moving_average", "macd", "bollinger", "volume"];

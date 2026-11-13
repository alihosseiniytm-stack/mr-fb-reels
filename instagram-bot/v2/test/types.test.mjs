// v6d: every READY non-candle topic builds a Short + long plan that passes the shot-list gate (offline fixtures, no network)
// and every picture draws. Also: a hammer-free check that the new chart/scene drawings exist in KNOWN.
import { test } from "node:test";
import assert from "node:assert/strict";
import { indicatorLesson, whaleWeekLesson, replayLesson, coinLesson, recapLesson, safetyLesson, SAFETY_KEYS, COIN_KEYS } from "../v6-types.mjs";
import { IND_KEYS, findEvent } from "../v6-ind.mjs";
import { checkShots } from "../shotlist-gate.mjs";
import { tagMascot } from "../v6-mascot.mjs";
import { drawPicture, KNOWN } from "../v6-draw.mjs";
import { READY } from "../v6-pick.mjs";

const ks = (n, f) => [...Array(n)].map((_, i) => { const o = f(i), c = f(i + 1); return [i * 864e5, o, Math.max(o, c) * 1.01, Math.min(o, c) * 0.99, c, 100 + (i === n - 8 ? 900 : 30 * Math.sin(i))]; });
const wave = (i) => 50000 + 4000 * Math.sin(i / 7) + (i > 200 && i < 215 ? -(i - 200) * 600 : 0) + (i >= 215 ? -9000 + (i - 215) * 300 : 0);
const rows = [["BTC", -150, 74962, 25, 82901, 11e6], ["ETH", 300, 2011, 20, null, 6e6], ["SOL", 2000, 150, 10, 120, 3e6], ["HYPE", -5000, 30, 5, 40, 1.5e6], ["XRP", 9e5, 2.1, 3, null, 1e6]]
  .map(([coin, szi, entryPx, leverage, liqPx, value]) => ({ address: "0x7717a7a245d9", coin, szi, entryPx, leverage, liqPx, value }));
const crowd = { n: 50, nL: 20, nS: 30, longV: 4e7, shortV: 9e7 };
const price = (k) => ({ ks: k, lines: { entry: { p: k[3][4], text: "ENTRY", col: "#5aa9ff" }, now: { p: k[k.length - 1][4], text: "NOW", col: "#121826" }, liq: { p: k[0][4] * 1.1, text: "LIQ", col: "#ef5b5b" }, hi: { p: k[5][2], text: "HI", col: "#2fbf86" }, lo: { p: k[9][3], text: "LO", col: "#ef5b5b" } } });
const k42 = ks(42, (i) => 70000 + 900 * Math.sin(i / 3));
const FIX = {
  whale_week: [whaleWeekLesson, { top: rows, crowd, now: 70375, move: 6.1, price: price(k42), whales: rows.map((r) => ({ coin: r.coin, side: r.szi < 0 ? "short" : "long", value: r.value, lev: r.leverage })) }],
  replay: [replayLesson, { t: rows[2], now: 156.2, move: 4.1, hoursAgo: 31, price: price(k42) }],
  recap: [recapLesson, { movers: ["BTC", "ETH", "SOL", "XRP", "DOGE", "HYPE"].map((coin, j) => ({ coin, pct: [-7.1, 3.2, 5.5, -1.4, 9.9, -12.3][j] })), best: { coin: "DOGE", pct: 9.9 }, worst: { coin: "HYPE", pct: -12.3 }, btc: { coin: "BTC", pct: -7.1 }, hi: 76377, lo: 69001, now: 70375, crowd, price: price(k42) }],
};
function gate(name, L, D) {
  tagMascot(L.steps, name);
  const r = checkShots({ style: "v6", steps: L.steps, data: {} }, { timed: false });
  assert.ok(r.pass, name + ": " + r.fails.join(" | "));
  for (const s of L.steps) if (!["card", "end"].includes(s.visual.type)) assert.ok(drawPicture(s.visual, D).length > 100, name + " draws " + s.visual.draw);
  return r.n;
}
test("new types: Short 12-16 and long 19-26 sentences, gate PASS, every picture draws", () => {
  for (const [name, [lesson, D]] of Object.entries(FIX)) for (const kind of ["short", "long"]) { const n = gate(name + " " + kind, lesson(kind, D), D); assert.ok(kind === "short" ? n >= 12 && n <= 16 : n >= 19 && n <= 26, name + " " + kind + " n=" + n); }
  for (const key of SAFETY_KEYS) for (const kind of ["short", "long"]) gate(key + " " + kind, safetyLesson(kind, { key }), {});
  for (const id of COIN_KEYS) { const coin = id.slice(5).toUpperCase(), D = { coin, coinName: coin, now: 101.5, hi: 120.25, lo: 90.5, m30: -4.2, gap: 32.9, mine: 3, mv: 2.5e6, crowd: { n: 3, nL: 2, nS: 1, longV: 2e6, shortV: 5e5 }, price: price(ks(30, (i) => 100 + 10 * Math.sin(i / 4))) };
    for (const kind of ["short", "long"]) gate(id + " " + kind, coinLesson(kind, D), D); }
  const full = ks(260, wave);
  for (const key of IND_KEYS) { const e = findEvent(key, full, 5) || { i: 230, dir: "up", value: 25 };
    const D = { key, e, coinName: "Bitcoin", iv: "1d", after: 5, month: "November", day: 3, close: full[e.i][4], pct: 2.4, ind: { full, key, i: e.i, after: 5, w0: e.i - 34 } };
    for (const kind of ["short", "long"]) gate(key + " " + kind, indicatorLesson(kind, D), D); }
});
test("READY holds every new topic id and the new pictures are known drawings", () => {
  for (const id of [...IND_KEYS, ...COIN_KEYS, ...SAFETY_KEYS, "whale_week", "replay", "recap"]) assert.ok(READY.has(id), id);
  assert.ok(!READY.has("coin_ton"), "TON has no Hyperliquid candles -> not ready");
  for (const d of ["ind", "price", "whales", "split", "movers"]) assert.ok(KNOWN.chart.includes(d));
  assert.ok(KNOWN.scene.includes("obj") && KNOWN.diagram.includes("ind"));
});

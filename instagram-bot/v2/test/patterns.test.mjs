// node --test v2/test/  (T50-08 D186): the real-chart circle must be a TRUE pattern; a non-pattern candle FAILS the shot-list gate.
import test from "node:test";
import assert from "node:assert/strict";
import { PATTERNS, findPattern, patternProof, checkProof } from "../v6-patterns.mjs";
import { checkShots } from "../shotlist-gate.mjs";
import { hammerLesson } from "../v6-hammer.mjs";

// 8 falling red candles (100 -> 86), 8 rising green candles (86 -> 100)
const k = (o, h, l, c) => [0, o, h, l, c];
export const fall = () => [...Array(8)].map((_, j) => { const c = 100 - 2 * j, o = c + 1.6; return k(o, o + 0.4, c - 0.4, c); });
export const rise = () => [...Array(8)].map((_, j) => { const c = 86 + 2 * j, o = c - 1.6; return k(o, c + 0.4, o - 0.4, c); });
const CASES = {
  hammer: [[...fall(), k(85, 85.7, 81, 85.6)], [...fall(), k(85, 88, 84, 85.6)]],
  shooting_star: [[...rise(), k(101, 105.6, 100.9, 101.6)], [...rise(), k(101, 102, 98, 101.6)]],
  doji: [[...fall(), k(85, 87, 83, 85.1)], [...fall(), k(85, 87, 83, 86.6)]],
  bull_engulfing: [[...fall(), k(86.5, 86.7, 85.4, 85.6), k(85.4, 88.4, 85.2, 88.2)], [...fall(), k(86.5, 86.7, 85.4, 85.6), k(85.8, 86.6, 85.7, 86.3)]],
  bear_engulfing: [[...rise(), k(99.5, 100.7, 99.3, 100.5), k(100.7, 100.8, 97.6, 97.8)], [...rise(), k(99.5, 100.7, 99.3, 100.5), k(100.4, 100.6, 99.9, 100.0)]],
  harami: [[...fall(), k(87, 87.2, 82.8, 83), k(84, 85.3, 83.8, 85)], [...fall(), k(87, 87.2, 82.8, 83), k(82, 88, 81.5, 87.5)]],
  tweezer_bottom: [[...fall(), k(86.5, 86.7, 84.0, 84.6), k(84.6, 86.8, 84.05, 86.5)], [...fall(), k(86.5, 86.7, 84.0, 84.6), k(85.6, 86.8, 85.5, 86.5)]],
  morning_star: [[...fall(), k(86.5, 86.8, 82.8, 83), k(82.8, 83.2, 82.2, 82.6), k(82.8, 86.2, 82.6, 86)], [...fall(), k(86.5, 86.8, 82.8, 83), k(82.8, 83.2, 82.2, 82.6), k(82.8, 83.9, 82.6, 83.5)]],
  evening_star: [[...rise(), k(99.5, 103.2, 99.3, 103), k(103.2, 103.8, 102.9, 103.4), k(103.2, 103.4, 99.8, 100)], [...rise(), k(99.5, 103.2, 99.3, 103), k(103.2, 103.8, 102.9, 103.4), k(103.2, 103.4, 102.4, 102.6)]],
  three_white_soldiers: [[...fall(), k(86, 88.2, 85.8, 88), k(88, 90.3, 87.8, 90), k(90, 92.2, 89.8, 92)], [...fall(), k(86, 88.2, 85.8, 88), k(88, 90.3, 87.8, 87.9), k(90, 92.2, 89.8, 92)]],
};
for (const [key, [good, badKs]] of Object.entries(CASES)) {
  test(`${key}: true pattern passes, look-alike FAILS`, () => {
    assert.equal(PATTERNS[key].test(good, good.length - 1), true, key + " good");
    assert.equal(checkProof(patternProof(key, good, good.length - 1)), "");
    assert.equal(PATTERNS[key].test(badKs, badKs.length - 1), false, key + " bad");
    assert.match(checkProof(patternProof(key, badKs, badKs.length - 1)), /is NOT a/);
  });
}
test("findPattern finds the hammer index in real-like data", () => { const ks = [...CASES.hammer[0], ...rise().slice(0, 5)]; assert.equal(findPattern("hammer", ks, 5), 8); });

const D = { iv: "1d", month: "October", day: 11, low: 81, close: 86, pct: 6.2, after: 5 };
import { tagMascot } from "../v6-mascot.mjs";
const timed = (steps) => tagMascot(steps, "hammer").map((s, i) => ({ ...s, start: i * 4, end: (i + 1) * 4, key: "k" + i }));
test("hammer video with a TRUE hammer circled passes the gate", () => {
  const r = checkShots({ style: "v6", steps: timed(hammerLesson("short", D).steps), data: { hammer: patternProof("hammer", CASES.hammer[0], 8) } });
  assert.ok(!r.fails.some((f) => /pattern proof/.test(f)), r.fails.join("\n"));
});
test("hammer video circling a NON-hammer candle FAILS the gate", () => {
  const r = checkShots({ style: "v6", steps: timed(hammerLesson("short", D).steps), data: { hammer: patternProof("hammer", CASES.hammer[1], 8) } });
  assert.equal(r.pass, false); assert.ok(r.fails.some((f) => /pattern proof: circled candle .* is NOT a hammer/.test(f)), r.fails.join("\n"));
});
test("hammer video without proof FAILS the gate", () => {
  const r = checkShots({ style: "v6", steps: timed(hammerLesson("short", D).steps) });
  assert.equal(r.pass, false); assert.ok(r.fails.some((f) => /no pattern proof/.test(f)));
});

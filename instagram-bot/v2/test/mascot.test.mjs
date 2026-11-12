// node --test v2/test/*.test.mjs (T50-08 D189/D190): every sentence carries mascot pose + emotion + outfit; missing/unknown tags FAIL the gate.
import test from "node:test";
import assert from "node:assert/strict";
import { POSES, OUTFITS, PROPS, EMOTIONS, mascotSvg, pickMascot, tagMascot, checkMascot, mouthFrames, blinkFrames } from "../v6-mascot.mjs";
import { checkShots } from "../shotlist-gate.mjs";
import { hammerLesson } from "../v6-hammer.mjs";

test("rig size: >= 12 poses, >= 4 outfits, >= 4 props, 8 emotions", () => {
  assert.ok(Object.keys(POSES).length >= 12); assert.ok(Object.keys(OUTFITS).length >= 4);
  assert.ok(Object.keys(PROPS).filter((p) => p !== "none").length >= 4); assert.equal(EMOTIONS.length, 8);
});
test("the face is fixed: head + glasses identical in every pose/outfit", () => {
  const head = (svg) => svg.match(/<circle cx="180" cy="215" r="62"[^>]*\/><path d="M116 215[^>]*\/>/)[0];
  const ref = head(mascotSvg({ pose: "talk", outfit: "jacket", emotion: "neutral" }));
  for (const p of Object.keys(POSES)) for (const o of Object.keys(OUTFITS)) assert.equal(head(mascotSvg({ pose: p, outfit: o, emotion: POSES[p].emo })), ref);
});
test("poses follow the meaning of the sentence", () => {
  const p = (say, type = "scene") => pickMascot({ say, visual: { type } }, 0).pose;
  assert.equal(p("Bitcoin fell to 81,000 dollars."), "point_down");
  assert.equal(p("Then buyers pushed it higher."), "point_up");
  assert.equal(p("Never share your seed phrase."), "warning");
  assert.equal(p("Why does this happen?"), "think");
  assert.equal(p("Watch live whale moves on MarketRadar Whale.", "end"), "wave_bye");
});
test("mouth: 3 steps, follows loudness, no 1-frame flicker", () => {
  const vals = [...Array(100)].map((_, j) => (j < 20 ? 0 : j < 60 ? 1 : 0.3));
  const m = mouthFrames(vals, 60);
  assert.ok(m.every((x) => [0, 1, 2].includes(x))); assert.equal(m[0], 0); assert.ok(m.includes(2));
  for (let f = 1; f < m.length - 1; f++) assert.ok(!(m[f] !== m[f - 1] && m[f] !== m[f + 1]), "1-frame flicker at " + f);
});
test("blink every 3-6 s", () => {
  const b = blinkFrames(30 * 30), starts = b.map((x, i) => x && !b[i - 1] ? i : -1).filter((i) => i >= 0);
  assert.ok(starts.length >= 5); for (let k = 1; k < starts.length; k++) assert.ok(starts[k] - starts[k - 1] >= 90 && starts[k] - starts[k - 1] <= 181);
});
const D = { iv: "1d", month: "October", day: 11, low: 104712, close: 112300, pct: 6.2, after: 5 };
const timed = (steps) => steps.map((s, i) => ({ ...s, start: i * 4, end: (i + 1) * 4, key: "k" + i }));
test("a sentence without mascot tags FAILS the gate", () => {
  const s = timed(tagMascot(hammerLesson("short", D).steps, "hammer")); delete s[3].mascot;
  const r = checkShots({ style: "v6", steps: s }); assert.equal(r.pass, false); assert.ok(r.fails.some((f) => /step 4 .*no mascot tags/.test(f)), r.fails.join("\n"));
});
test("unknown pose / emotion / outfit FAILS", () => {
  assert.match(checkMascot({ pose: "dance", emotion: "happy", outfit: "suit" }), /pose/);
  assert.match(checkMascot({ pose: "talk", emotion: "angry2", outfit: "suit" }), /emotion/);
  assert.match(checkMascot({ pose: "talk", emotion: "happy" }), /outfit/);
  assert.equal(checkMascot({ pose: "talk", emotion: "happy", outfit: "suit", prop: "coffee" }), "");
});

// T50-15: similarity gate must pass different topics in the same v6 style and still block real repeats.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compare } from "../similarity-gate.mjs";

const { metas } = JSON.parse(readFileSync(new URL("./fixtures/similarity-real.json", import.meta.url), "utf8"));
const M = Object.fromEntries(metas.map((m) => [m.topic, m]));

test("real false blocks of 2026-11-14 now pass: shooting_star and doji vs hammer", () => {
  for (const t of ["shooting_star", "doji"]) { const r = compare(M[t], M.hammer); assert.equal(r.bad, false, t + " " + JSON.stringify(r)); assert.ok(r.title < 0.3, "title topic words only"); }
});
test("shooting_star vs doji (both new, same style) pass", () => { assert.equal(compare(M.shooting_star, M.doji).bad, false); });
test("old hook-frame hashes alone are ignored (5-8/64 apart, yet not used)", () => {
  const a = { ...M.shooting_star, contentHashes: undefined }, b = { ...M.hammer, contentHashes: undefined };
  const r = compare(a, b); assert.equal(r.dist, null); assert.equal(r.bad, false);
});
test("PLANTED REPEAT: same topic + same script re-upload is BLOCKED", () => {
  const r = compare({ ...M.hammer }, M.hammer); assert.equal(r.bad, true); assert.ok(r.title >= 0.6 && r.script >= 0.45);
});
test("PLANTED REPEAT: same topic, new title wording + new script, same pictures is BLOCKED", () => {
  const a = { ...M.hammer, title: "The Hammer Candle: Spot It on a Real Bitcoin Chart", text: M.doji.text, contentHashes: M.hammer.contentHashes.map((h) => h.slice(0, 15) + ((parseInt(h[15], 16) ^ 7).toString(16))) };
  const r = compare(a, M.hammer); assert.equal(r.bad, true, JSON.stringify(r));
});
test("PLANTED REPEAT: near-copy video with a new title and script is BLOCKED by picture alone", () => {
  const r = compare({ ...M.doji, contentHashes: M.hammer.contentHashes }, M.hammer); assert.equal(r.near, true); assert.equal(r.bad, true);
});
test("PLANTED REPEAT: same script, different title is BLOCKED", () => {
  assert.equal(compare({ ...M.doji, text: M.hammer.text }, M.hammer).bad, true);
});

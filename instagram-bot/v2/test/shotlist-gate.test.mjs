// node --test v2/test/   (T50-08 v6, R43/R44): the shot-list gate must PASS the real lesson and FAIL every bad shot list.
import test from "node:test";
import assert from "node:assert/strict";
import { checkShots } from "../shotlist-gate.mjs";
import { hammerLesson } from "../v6-hammer.mjs";

const D = { iv: "1d", month: "October", day: 11, low: 104712, close: 112300, pct: 6.2, after: 5 };
import { tagMascot } from "../v6-mascot.mjs";
const timed = (steps, len = 4) => tagMascot(steps.map((s) => ({ ...s })), "hammer").map((s, i) => ({ ...s, start: i * len, end: (i + 1) * len, key: "k" + i }));
import { patternProof } from "../v6-patterns.mjs";
import { fall } from "./patterns.test.mjs";
const PROOF = patternProof("hammer", [...fall(), [0, 85, 85.7, 81, 85.6]], 8);
const meta = (steps) => ({ style: "v6", steps: timed(steps), data: { hammer: PROOF } });

for (const kind of ["short", "long"]) {
  test(`real ${kind} hammer lesson passes`, () => {
    const r = checkShots(meta(hammerLesson(kind, D).steps));
    assert.equal(r.pass, true, r.fails.join("\n"));
  });
  test(`real ${kind} lesson passes with a falling result too`, () => {
    assert.equal(checkShots(meta(hammerLesson(kind, { ...D, pct: -1.4 }).steps)).pass, true);
  });
}
const base = () => hammerLesson("short", D).steps.map((s) => ({ ...s, visual: { ...s.visual } }));
const fails = (m, re) => { const r = checkShots(m); assert.equal(r.pass, false); assert.ok(r.fails.some((f) => re.test(f)), r.fails.join("\n")); };

test("picture that does not match the voice FAILS (tags)", () => { const s = base(); s[2].tags = ["whale"]; fails(meta(s), /tags .* not in the sentence/); });
test("keyword that does not match the voice FAILS", () => { const s = base(); s[3].kw = "RANDOM PHOTO"; fails(meta(s), /shares no word/); });
test("spoken number not on screen FAILS", () => { const s = base(); s[3].kw = "WICK LONGER THAN BODY"; fails(meta(s), /number/); });
test("repeated picture FAILS", () => { const s = base(); s[5] = { ...s[5], visual: s[4].visual, kw: s[4].kw, tags: ["sellers", "buyers"], say: "Sellers pushed down, buyers pushed back." }; fails(meta(s), /same picture/); });
test("same picture file FAILS", () => { const m = meta(base()); m.steps[7].key = m.steps[6].key; fails(m, /same picture file/); });
test("shot longer than 6 s FAILS", () => { const m = meta(base()); m.steps[1].end = m.steps[1].start + 7.5; fails(m, /> 6s/); });
test("stock photo / AI frame FAILS", () => { const s = base(); s[2].visual = { type: "photo", draw: "x" }; fails(meta(s), /not a v6 type/); });
test("unknown drawing FAILS", () => { const s = base(); s[2].visual = { type: "diagram", draw: "random" }; fails(meta(s), /unknown diagram/); });
test("non-v6 style FAILS", () => { const m = meta(base()); m.style = "doc"; fails(m, /style/); });
test("plan: a sentence too long to say in 6 s FAILS before render", () => {
  const s = base(); s[8] = { ...s[8], say: "Real example: on November 8, Bitcoin fell to 75,640 dollars.", kw: "NOV 8: LOW $75,640", tags: ["bitcoin"] };
  const r = checkShots({ style: "v6", steps: tagMascot(s, "hammer") }, { timed: false }); assert.equal(r.pass, false); assert.ok(r.fails.some((f) => /too long to say/.test(f)), r.fails.join("\n"));
});
test("plan: real lessons fit 6 s per sentence", () => { for (const k of ["short", "long"]) { const r = checkShots({ style: "v6", steps: tagMascot(hammerLesson(k, D).steps, "hammer"), data: { hammer: PROOF } }, { timed: false }); assert.equal(r.pass, true, r.fails.join("\n")); } });

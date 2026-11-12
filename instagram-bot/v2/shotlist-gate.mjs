// v6 SHOT-LIST GATE (T50-08, owner 2026-11-04T14:55Z + D178): every sentence has a tagged picture that matches what the voice says.
// Usage: node v2/shotlist-gate.mjs <meta.json>        (after render: also checks shot length + unique picture files)
//        node v2/shotlist-gate.mjs --plan=<plan.json> (before render: {steps:[...]} without times)
// Checks: (1) one visual per sentence, of a v6 type (diagram|chart|card|scene|end) with a known drawing; no photos, no AI frames
//         (2) TAG MATCH: >= 1 tag word appears in the sentence AND the on-screen keyword shares a word/number with the sentence
//         (3) every spoken number is on screen  (4) no shot longer than 6.0 s, none shorter than 1.0 s
//         (5) no repeated picture (unique drawing spec + unique PNG hash)  (6) style "v6"
//         (7) PATTERN PROOF (D186): a real-chart shot that circles a pattern (mark "shape") needs data.proof (or data.hammer) whose
//             circled candle passes the strict v6-patterns.mjs rule (e.g. hammer: lower wick >= 2x body, small upper wick, after a fall)
//         (8) MASCOT TAGS (D189/D190): every sentence has mascot {pose, emotion, outfit} from the v6-mascot.mjs lists
// Exit 0 = PASS, 3 = FAIL (the workflow then does not upload).
import { readFileSync, writeFileSync } from "node:fs";
import { KNOWN } from "./v6-draw.mjs";
import { spokenNumbers } from "./visual.mjs";
import { checkProof } from "./v6-patterns.mjs";
import { checkMascot } from "./v6-mascot.mjs";

export const MAX_SHOT_S = 6.0, MIN_SHOT_S = 1.0;
// speech time estimate used BEFORE render (calibrated on the runner TTS 2026-11-12, run 43258602718: "Real example: on November 8,
// Bitcoin fell to 75,640 dollars." = 7.15 s): 0.40 s per plain word, 0.45 s per read-out number word, 0.35 s per pause (, : . inside)
const n999 = (n) => (n >= 100 ? 2 : 0) + (n % 100 === 0 ? 0 : n % 100 < 20 || n % 10 === 0 ? 1 : 2);
export function speechParts(say) {
  let plain = 0, num = 0;
  for (const w of String(say).split(/\s+/).filter(Boolean)) {
    const m = w.replace(/[^0-9.,]/g, "");
    if (!/\d/.test(m)) { plain++; continue; }
    const [ip, dp] = m.replace(/,/g, "").replace(/\.$/, "").split("."), v = +ip || 0;
    num += (v === 0 ? 1 : (v >= 1e6 ? n999(Math.floor(v / 1e6) % 1000) + 1 : 0) + (v >= 1000 ? n999(Math.floor(v / 1000) % 1000) + 1 : 0) + (v % 1000 ? n999(v % 1000) : 0)) + (dp ? 1 + dp.length : 0);
  }
  const pauses = (String(say).trim().replace(/[.!?]+$/, "").match(/[,:;](\s|$)|[.!?]\s/g) || []).length;
  return { plain, num, pauses };
}
export const estSeconds = (say) => { const p = speechParts(say); return +(0.4 * p.plain + 0.45 * p.num + 0.35 * p.pauses + 0.3).toFixed(2); };
const stem = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(ing|ed|s)$/, "").replace(/e$/, "");
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean).map(stem);
const STOP = new Set(["a", "an", "the", "of", "on", "in", "to", "and", "or", "is", "it", "not", "no", "for", "at", "by"].map(stem));

export function checkShots(meta, { timed = true } = {}) {
  const steps = meta.steps || [], fails = [];
  const failed = new Set();
  const bad = (i, why) => failed.add(i) && fails.push(`step ${i + 1} "${String(steps[i] && steps[i].say).slice(0, 50)}": ${why}`);
  if (meta.style !== "v6") fails.push(`style is "${meta.style}", must be "v6"`);
  if (steps.length < 5) fails.push(`only ${steps.length} steps`);
  const specs = new Map(), keys = new Map();
  let maxLen = 0;
  const proofErr = steps.some((s) => s.visual && s.visual.type === "chart" && (s.visual.args || {}).mark === "shape") ? checkProof((meta.data || {}).proof || (meta.data || {}).hammer) : "";
  steps.forEach((s, i) => {
    const v = s.visual || {};
    const mErr = checkMascot(s.mascot);
    if (mErr) bad(i, mErr);
    if (proofErr && v.type === "chart" && (v.args || {}).mark === "shape") bad(i, "pattern proof: " + proofErr);
    if (!s.say || !String(s.say).trim()) bad(i, "no sentence");
    if (!KNOWN[v.type]) bad(i, `visual type "${v.type}" is not a v6 type`);
    else if (!KNOWN[v.type].includes(v.draw) && !(v.type === "card" && KNOWN.card.includes((v.args || {}).icon))) bad(i, `unknown ${v.type} drawing "${v.draw}"`);
    const sw = new Set(words(s.say));
    const tags = (s.tags || []).filter((t) => sw.has(stem(t)));
    if (!(s.tags || []).length) bad(i, "no tags");
    else if (!tags.length) bad(i, `tags [${s.tags}] not in the sentence (picture does not match the voice)`);
    const kwHit = words(s.kw || "").filter((w) => !STOP.has(w) && (sw.has(w) || /\d/.test(w) && String(s.say).replace(/,/g, "").includes(w)));
    if (!s.kw) bad(i, "no on-screen keyword");
    else if (!kwHit.length && v.type !== "end") bad(i, `keyword "${s.kw}" shares no word with the sentence`);
    if (v.type === "end" && !/marketradar/i.test(s.say)) bad(i, "end card sentence does not name MarketRadar");
    const kwN = String(s.kw || "").replace(/,/g, "");
    const miss = spokenNumbers(s.say).filter((x) => !kwN.includes(x.replace(/,/g, "")));
    if (miss.length) bad(i, `spoken number(s) ${miss.join(",")} not on screen`);
    const spec = JSON.stringify([v.type, v.draw, v.args || {}, s.kw]);
    if (specs.has(spec)) bad(i, `same picture as step ${specs.get(spec) + 1}`); else specs.set(spec, i);
    if (!timed && estSeconds(s.say) > MAX_SHOT_S) bad(i, `too long to say: ~${estSeconds(s.say)}s estimated > ${MAX_SHOT_S}s (split the sentence)`);
    if (timed) {
      const len = +(s.end - s.start).toFixed(2);
      maxLen = Math.max(maxLen, len);
      if (!(len <= MAX_SHOT_S)) bad(i, `shot ${len}s > ${MAX_SHOT_S}s`);
      if (!(len >= MIN_SHOT_S)) bad(i, `shot ${len}s < ${MIN_SHOT_S}s`);
      if (!s.key) bad(i, "no picture hash");
      else if (keys.has(s.key)) bad(i, `same picture file as step ${keys.get(s.key) + 1}`); else keys.set(s.key, i);
    }
  });
  return { pass: fails.length === 0, fails, n: steps.length, ok: steps.length - failed.size, maxLen };
}

if (process.argv[1] && process.argv[1].endsWith("shotlist-gate.mjs")) {
  const planArg = process.argv.find((a) => a.startsWith("--plan=")), f = planArg ? planArg.slice(7) : process.argv[2];
  const meta = JSON.parse(readFileSync(f, "utf8"));
  if (planArg && !meta.style) meta.style = "v6";
  const r = checkShots(meta, { timed: !planArg });
  const line = `${r.pass ? "PASS" : "FAIL"} shot-list ${f}: ${r.ok}/${r.n} sentences OK` + (planArg ? "" : ` | max shot ${r.maxLen}s (limit ${MAX_SHOT_S})`) + ` | repeats ${r.fails.filter((x) => /same picture/.test(x)).length}`;
  const out = [line, ...r.fails.map((x) => "  FAIL " + x)].join("\n");
  console.log(out);
  if (!planArg) writeFileSync(f.replace(/\.meta\.json$/, "-shotgate.txt"), out + "\n");
  process.exit(r.pass ? 0 : 3);
}

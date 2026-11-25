// v6 AUTO RENDER (T10-02 #ci-reds 2026-11-25): pick -> render -> similarity check, and on a "no real example" or "too similar"
// result move on to the NEXT ready topic instead of failing the whole run (runs 45542918543, 45513213479, 45552084352 went red
// and e-mailed the owner because ONE topic had no strict confirmed candle example today, or a replay Short was too close to a
// recent upload). No gate is weakened: the shot-list gate inside v6-make, the similarity gate and the standards gate still decide;
// a blocked render is moved to out/blocked/ (never uploaded, never deleted). Any OTHER error still fails the run.
// node v2/v6-auto.mjs --slot=main|extra --kinds="short long" [--topic=one-off] [--out=out] [--tries=5]
//   prints "topic=<key>" (also to $GITHUB_OUTPUT when set); exit 0 = out/ holds gate-passing renders, exit 1 = real failure,
//   exit 0 with "topic=none" = every tried topic was blocked (nothing to upload today; run stays green, warning annotation).
import { spawnSync } from "node:child_process";
import { readdirSync, renameSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith("--" + n + "=")); return h ? h.slice(n.length + 3) : d; };
const slot = arg("slot", "main"), kinds = arg("kinds", "short").split(/[ ,]+/).filter(Boolean), oneOff = arg("topic", "");
const out = resolve(arg("out", "out")), tries = Number(arg("tries", 5));
const node = (args, env = {}) => spawnSync(process.execPath, args, { encoding: "utf8", env: { ...process.env, ...env } });
const say = (r) => { if (r.stdout) process.stdout.write(r.stdout); if (r.stderr) process.stderr.write(r.stderr); };
const emit = (t) => { console.log("topic=" + t); if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "topic=" + t + "\n"); };
const NO_DATA = /no strict confirmed /; // v6-candles.mjs: today's BTC/ETH candles hold no strict confirmed example of this pattern

function park(topic) { // move every file of this topic's renders to out/blocked/ (kept as evidence, not uploaded)
  mkdirSync(`${out}/blocked`, { recursive: true });
  for (const f of existsSync(out) ? readdirSync(out) : []) if (kinds.some((k) => f.startsWith(`${k}-${topic}`) || f.startsWith(`.work-${k}-${topic}`))) renameSync(`${out}/${f}`, `${out}/blocked/${f}`);
}

const tried = [];
for (let n = 0; n < (oneOff ? 1 : tries); n++) {
  let topic = oneOff;
  if (!topic) {
    const p = node([here("./v6-pick.mjs"), "--slot=" + slot, "--skip=" + tried.join(",")]);
    console.log((p.stdout || "").split("\n")[0]);
    topic = ((p.stdout || "").match(/^topic=(.*)$/m) || [])[1];
    if (p.status !== 0 || !topic) { say(p); console.error("v6-auto: picker failed"); process.exit(1); }
    if (topic === "null") break;
  }
  tried.push(topic);
  let blocked = "";
  for (const k of kinds) {
    const r = node([here("./v6-make.mjs"), "--kind=" + k, "--topic=" + topic, "--out=" + out]);
    say(r);
    if (r.status !== 0) {
      if (!oneOff && NO_DATA.test((r.stderr || "") + (r.stdout || ""))) { blocked = `no real example in today's candles (${k})`; break; }
      console.error(`v6-auto: v6-make ${k} ${topic} failed (exit ${r.status}) - real failure, run stays red`); process.exit(1);
    }
    const g = node([here("./similarity-gate.mjs"), `--check=${out}/${k}-${topic}.meta.json`]);
    say(g);
    if (g.status === 3 && !oneOff) { blocked = `too similar to a recent upload (${k})`; break; }
    if (g.status !== 0) { console.error(`v6-auto: similarity gate ${k} ${topic} exit ${g.status}`); process.exit(1); }
  }
  if (!blocked) { emit(topic); process.exit(0); }
  console.log(`::notice::v6-auto: ${topic} skipped - ${blocked}; trying the next ready topic`);
  park(topic);
}
console.log(`::warning::v6-auto: every tried topic was blocked (${tried.join(", ")}) - nothing uploaded this run`);
emit("none");

// Similarity gate (T50-08): a video that looks/sounds too much like a recent one is NOT uploaded; the reason is logged.
// Compares title (word Jaccard), script text (3-word shingle Jaccard) and picture (64-bit hash of thumbnail / hook frame)
// against the last N uploads of the SAME kind (Shorts and long videos separately).
//   node v2/similarity-gate.mjs --check=<meta.json>      exit 0 = ok, exit 3 = too similar (do not upload)
//   node v2/similarity-gate.mjs --dir=<samples dir>      score matrix of all samples against each other and against the log
import { readFileSync, readdirSync, appendFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { hashDist } from "./lib.mjs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const arg = (n) => { const h = process.argv.find((a) => a.startsWith("--" + n + "=")); return h ? h.slice(n.length + 3) : null; };
const T = JSON.parse(readFileSync(here("./schedule.json"), "utf8")).thresholds;
const LOG = existsSync(here("./uploads-log.json")) ? JSON.parse(readFileSync(here("./uploads-log.json"), "utf8")) : [];

const STOP = new Set("the a an of on in to and is are for with this that it at by from as".split(" "));
const words = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9% ]+/g, " ").split(/\s+/).filter(Boolean);
const jac = (A, B) => { const a = new Set(A), b = new Set(B); if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
const shingles = (s) => { const w = words(s), o = []; for (let i = 0; i + 3 <= w.length; i++) o.push(w.slice(i, i + 3).join(" ")); return o; };
const titleWords = (s) => words(s).filter((w) => !STOP.has(w) && !/^[0-9.%]+$/.test(w));

export function compare(a, b) {
  const title = jac(titleWords(a.title), titleWords(b.title)), script = jac(shingles(a.text), shingles(b.text));
  const ha = a.kind === "long" ? a.thumbHashA : a.frameHash, hb = b.kind === "long" ? b.thumbHashA : b.frameHash;
  const dist = ha && hb ? hashDist(ha, hb) : null;
  const bad = title >= T.titleJaccard || script >= T.scriptJaccard || (dist !== null && dist < T.thumbMinHashDistance);
  return { title, script, dist, bad };
}
const fmt = (r) => `title ${r.title.toFixed(2)} | script ${r.script.toFixed(2)} | picture dist ${r.dist === null ? "n/a" : r.dist + "/64"}${r.bad ? "  <-- TOO SIMILAR" : ""}`;
const lastOf = (kind) => LOG.filter((u) => (u.kind || "short") === kind).slice(0, T.compareLastUploads);

function against(meta, others) {
  let worst = null;
  for (const o of others) { const r = compare(meta, o); r.with = o.url || o.title; if (!worst || r.bad && !worst.bad || (r.bad === worst.bad && r.title + r.script > worst.title + worst.script)) worst = r; }
  return worst;
}

const check = arg("check"), dir = arg("dir");
if (check) {
  const meta = JSON.parse(readFileSync(check, "utf8")), w = against(meta, lastOf(meta.kind));
  const line = { at: new Date().toISOString(), title: meta.title, kind: meta.kind, result: w && w.bad ? "BLOCKED" : "OK", worst: w && { ...w } };
  appendFileSync(here("./gate-log.jsonl"), JSON.stringify(line) + "\n");
  console.log(line.result, w ? fmt(w) + " vs " + w.with : "no previous uploads");
  process.exit(w && w.bad ? 3 : 0);
}
if (dir) {
  const metas = readdirSync(dir).filter((f) => f.endsWith(".meta.json")).map((f) => JSON.parse(readFileSync(dir + "/" + f, "utf8")));
  const out = [`SIMILARITY REPORT  thresholds: title < ${T.titleJaccard}, script < ${T.scriptJaccard}, picture distance >= ${T.thumbMinHashDistance}/64  (last ${T.compareLastUploads} uploads, per kind)`, ""];
  let bad = 0;
  for (const kind of ["short", "long"]) {
    const ms = metas.filter((m) => m.kind === kind);
    out.push(`== ${kind.toUpperCase()} samples (${ms.length}) vs each other: worst pair =============`);
    let worst = null;
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) { const r = compare(ms[i], ms[j]); r.pair = ms[i].day + " vs " + ms[j].day; if (r.bad) bad++; if (!worst || r.title + r.script > worst.title + worst.script) worst = r; }
    if (worst) out.push(`worst: ${worst.pair}: ${fmt(worst)}`);
    out.push(`== ${kind.toUpperCase()} samples vs last ${T.compareLastUploads} real ${kind} uploads (${lastOf(kind).length} in log) ==`);
    for (const m of ms) { const w = against(m, lastOf(kind)); if (w && w.bad) bad++; out.push(`${m.day} "${m.title.slice(0, 50)}": ${w ? fmt(w) : "no uploads of this kind in log yet"}`); }
    out.push("");
  }
  out.push(bad ? `RESULT: ${bad} pair(s) too similar` : "RESULT: all below threshold");
  writeFileSync(dir + "/similarity-report.txt", out.join("\n"));
  console.log(out.join("\n"));
  process.exit(bad ? 3 : 0);
}
console.log("usage: --check=<meta.json> | --dir=<dir>");

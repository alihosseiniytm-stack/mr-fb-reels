// R65 VIDEO STYLE GATE (T50-08, owner D195 2026-11-12: "wherever it is posted the video is always like this" = v6).
// node v2/video-style-gate.mjs [workflowsDir]  -> FAIL (exit 3) if any active .github/workflows/*.yml that POSTS a video
// (YouTube/Facebook/TikTok/Instagram/Buffer publisher) does not run the v6 shot-list gate (v2/shotlist-gate.mjs) BEFORE its first post line.
// *.yml.disabled files are ignored (plan-B copies). Comment lines are ignored.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
export const POST = /scripts\/run\.mjs|v2\/upload\.mjs|ig-post|buffer-post|graph\.facebook\.com|open\.tiktokapis\.com|api\.buffer\.com|googleapis\.com\/upload\/youtube/;
export const GATE = /v2\/shotlist-gate\.mjs/;
export function checkWorkflow(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.replace(/^\s*#.*$/, "").replace(/\s#\s.*$/, ""));
  const post = lines.findIndex((l) => POST.test(l));
  if (post < 0) return { posts: false, ok: true };
  const gate = lines.findIndex((l) => GATE.test(l));
  if (gate < 0) return { posts: true, ok: false, why: `posts a video (line ${post + 1}) but never runs the v6 shot-list gate` };
  if (gate > post) return { posts: true, ok: false, why: `v6 shot-list gate (line ${gate + 1}) runs AFTER the first post line ${post + 1}` };
  return { posts: true, ok: true };
}
if (process.argv[1] && process.argv[1].endsWith("video-style-gate.mjs")) {
  const dir = process.argv[2] || new URL("../../.github/workflows/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  let bad = 0, posting = 0;
  for (const f of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
    const r = checkWorkflow(readFileSync(join(dir, f), "utf8"));
    if (r.posts) posting++;
    if (!r.ok) bad++;
    console.log(`${r.ok ? "PASS" : "FAIL"} ${f}${r.posts ? "" : " (posts no video)"}${r.why ? ": " + r.why : ""}`);
  }
  console.log(`${bad ? "FAIL" : "PASS"} R65 video-style gate: ${posting - bad}/${posting} posting workflows run the v6 gate first`);
  process.exit(bad ? 3 : 0);
}

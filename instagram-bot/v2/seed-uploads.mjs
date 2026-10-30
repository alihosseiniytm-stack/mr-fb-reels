// Builds v2/uploads-log.json seed from the last 14 successful youtube-en workflow runs (the real uploads: caption + video URL in the run log).
// Usage: node v2/seed-uploads.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const gh = (a) => execFileSync("gh", a, { maxBuffer: 1 << 27, timeout: 90000 }).toString();
const runs = JSON.parse(gh(["run", "list", "--workflow", "youtube-en.yml", "--limit", "60", "--json", "databaseId,conclusion,createdAt"])).filter((r) => r.conclusion === "success");
const out = [];
for (const r of runs) {
  if (out.length >= 14) break;
  let log = "";
  try { log = gh(["run", "view", String(r.databaseId), "--log"]); } catch { continue; }
  const y = log.match(/YouTube: (https:\/\/youtube\.com\/\S+)/);
  if (!y) continue; // dry run or skipped: not a real upload
  const lines = log.split("\n").map((l) => l.replace(/^.*?Z /, ""));
  const i = lines.findIndex((l) => l.startsWith("- Caption:"));
  let cap = [], inside = false;
  if (i >= 0) for (let j = i + 1; j < lines.length && cap.length < 20; j++) { if (lines[j].startsWith("```")) { if (inside) break; inside = true; continue; } if (inside) cap.push(lines[j]); }
  const text = cap.join("\n").trim();
  out.push({ kind: "short", id: r.databaseId, date: r.createdAt, url: y[1], title: (text.split("\n")[0] || "").replace(/#\S+/g, "").trim(), text });
}
writeFileSync(fileURLToPath(new URL("./uploads-log.json", import.meta.url)), JSON.stringify(out, null, 1));
console.log("seeded", out.length, "uploads;", out.filter((o) => o.title).length, "with captions");

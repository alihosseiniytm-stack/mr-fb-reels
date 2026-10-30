// Weekly automated check (R43/R44): did the schedule produce 7 long videos + shortsPerDay*7 Shorts in the last 7 days?
// Exit 1 = alert (the workflow fails and GitHub emails the owner).
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const sch = JSON.parse(readFileSync(here("./schedule.json"), "utf8"));
if (!sch.enabled) { console.log("schedule.enabled=false: new formats are OFF, nothing to check"); process.exit(0); }
const log = existsSync(here("./uploads-log.json")) ? JSON.parse(readFileSync(here("./uploads-log.json"), "utf8")) : [];
const since = Date.now() - 7 * 864e5, mine = log.filter((u) => u.v2 && Date.parse(u.date) >= since && u.privacy === "public");
const longs = mine.filter((u) => u.kind === "long").length, shorts = mine.filter((u) => u.kind === "short").length;
const needL = sch.longPerWeek, needS = sch.shortsPerDay * 7;
console.log(`last 7 days: ${longs}/${needL} long, ${shorts}/${needS} Shorts`);
if (longs < needL || shorts < needS) { console.log("ALERT: schedule produced fewer videos than planned"); process.exit(1); }

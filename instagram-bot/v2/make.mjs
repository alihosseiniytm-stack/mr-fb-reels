// Usage: node v2/make.mjs --kind=short|long --day=sun|mon|... [--out=dir] [--idx=n]
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderVideo, renderThumb, imageHash, frameAt, cleanup, dateLabel, SITE, BOT } from "./lib.mjs";
import { LONG_BY_DAY, saturday, sunday, monday, tuesday, wednesday, thursday, friday } from "./lessons.mjs";
import { pickStories, buildShort } from "./shorts.mjs";

const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith("--" + n + "=")); return h ? h.split("=")[1] : d; };
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const BUILD = { candle: saturday, indicator: sunday, whale_week: monday, coin: tuesday, replay: wednesday, safety: thursday, recap: friday };
const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const kind = arg("kind", "long"), day = arg("day", DAYS[new Date().getUTCDay()]), out = resolve(arg("out", here("../out"))), idx = +arg("idx", DAYS.indexOf(day));
const schedule = JSON.parse(await readFile(here("./schedule.json"), "utf8"));
const plan = JSON.parse(await readFile(here("./topic-plan.json"), "utf8"));
const week = +arg("week", Math.max(0, Math.floor((Date.now() - Date.parse(plan.startMonday)) / 6048e5)) % plan.weeks.length);
await mkdir(out, { recursive: true });
const work = out + `/.work-${kind}-${day}`;

let v, videoPath = `${out}/${kind}-${day}.mp4`, meta;
if (kind === "long") {
  const type = schedule.longByWeekday[day], topic = plan.weeks[week][type] || {};
  v = await BUILD[type](topic);
  v.longType = type;
} else {
  // sample runs: --stories=<file> keeps one story list for all 7 days (live data moves between runs and would repeat a coin)
  const sf = arg("stories", null);
  let stories;
  try { stories = sf ? JSON.parse(await readFile(sf, "utf8")) : null; } catch { stories = null; }
  if (!stories) { stories = await pickStories(7); if (sf) await writeFile(sf, JSON.stringify(stories)); }
  v = await buildShort(stories[idx % stories.length], idx);
  v.kind = "short";
}
const r = await renderVideo({ kind: v.kind, scenes: v.scenes, outPath: videoPath, work });
const description = `${v.title}\n\nSee it live (free): ${v.page || SITE + "/en/whales/"}\nTelegram whale alerts bot: ${BOT}\nAll live whales: ${SITE}/en/whales/\n\nData: real live positions from public on-chain/exchange feeds, ${dateLabel()}. Education only, not financial advice. Charts are rendered from real data; the narrator is a synthetic voice and the whale is an animated mascot.`;
// thumbnails A/B (long and short both get two variants)
const t = v.thumb || { headline: v.title.slice(0, 40), sub: "real whale data", big: v.story ? (v.story.up ? "+" : "-") + v.story.pnlAbs + "%" : "" };
const tA = { layout: "thumb", kicker: "MARKETRADAR WHALE", headline: t.headline, bigText: t.big, sub: t.sub };
const tB = { layout: "thumb", kicker: "REAL DATA · " + dateLabel().toUpperCase(), headline: t.big || t.headline, bigText: "", sub: t.headline + " · " + t.sub, accent: "#fbbf24" };
await renderThumb(tA, `${out}/${kind}-${day}-thumbA.png`);
await renderThumb(tB, `${out}/${kind}-${day}-thumbB.png`);
frameAt(videoPath, 2, `${out}/.f.png`);
meta = { kind, day, week, title: v.title, text: v.text, page: v.page, topic: v.topic || (v.story && v.story.key), longType: v.longType, layout: v.layout, description,
  durationS: Math.round(r.durationMs / 100) / 10, scenes: r.scenes, thumbHashA: imageHash(`${out}/${kind}-${day}-thumbA.png`), frameHash: imageHash(`${out}/.f.png`), created: new Date().toISOString() };
await writeFile(`${out}/${kind}-${day}.meta.json`, JSON.stringify(meta, null, 1));
await cleanup(work);
console.log("DONE", kind, day, meta.durationS + "s", meta.title);

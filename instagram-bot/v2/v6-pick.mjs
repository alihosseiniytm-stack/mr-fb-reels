// v6 TOPIC PICKER (T50-08 v6c, owner D199 + D195): which v6 lesson goes out today, by the weekday plan in schedule.json +
// topic-plan.json. A weekday TYPE whose v6 lesson is not built yet is NEVER rendered in the old style: the picker falls back to a
// ready v6 candle topic (not used in the last 8 weeks of PUBLIC uploads). Test (private/unlisted) uploads do not count.
// node v2/v6-pick.mjs [--date=YYYY-MM-DD] [--slot=main|extra]  -> prints JSON + "topic=<key>" line (for $GITHUB_OUTPUT)
//   main  = the day's lesson (yt-v2 long + Short, TikTok, Facebook, Instagram)
//   extra = a second, different ready topic (youtube-en daily Short slot, so YouTube never gets the same Short twice a day)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CANDLE_KEYS } from "./v6-candles.mjs";
import { IND_KEYS } from "./v6-ind.mjs";
import { COIN_KEYS, SAFETY_KEYS } from "./v6-types.mjs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
// v6 lessons that exist (make.mjs TOPICS). Add a type's keys here only when its v6 lesson + gate test exist.
// v6d 2026-11-13: + indicator (5), coin (9), safety (10), whale_week, replay, recap (gate test test/types.test.mjs)
export const DATA_TYPES = new Set(["whale_week", "replay", "recap"]); // live data: new content each week, never "used"
// NOT_YET = ids whose last Actions render FAILED (t50-08-v6e): out of READY until a green re-render. whale_week: run 43365855092 Short shot 6.06 s > 6 s (fixed wording, re-render pending)
// coin_*: run 43368862405 long FAILED (fact sentence "Bitcoin launched in 2009, made by someone called Satoshi Nakamoto." 6.56 s); no coin has a green render -> all coins out
// replay: run 43372133433 Short step "Step three: danger line at 2,176 dollars." 6.11 s -> shorter wording, out until green
// v6f 2026-11-13: whale_week GREEN run 43381625664 (25/25 + 15/15, max 5.67 s, standards 34/34 + 31/31, strips read); coin_btc GREEN run 43384501037 (23/23 + 15/15, max 5.48 s, 34/34 + 31/31, strips read) -> coins back (one shared lesson; all 8 coin plans fit 6 s with a +17% name/year margin)
// v6f: replay GREEN run 43395660247 (22/22 + 15/15, max 5.77 s, 34/34 + 31/31, strips read)
export const NOT_YET = new Set([]);
// v6f: safety GREEN run 43400257723 phishing_links (21/21 + 15/15, max 5.01 s, standards 34/34 + 31/31 incl. rule a sourced numbers + rule c title, strips read) -> SAFETY_KEYS ready (one shared lesson builder)
export const READY = new Set(["hammer", ...CANDLE_KEYS, ...IND_KEYS, ...COIN_KEYS, ...SAFETY_KEYS, ...DATA_TYPES].filter((x) => !NOT_YET.has(x)));
export const CANDLE_ORDER = ["hammer", ...CANDLE_KEYS];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function pickTopic({ date = new Date(), slot = "main", schedule, plan, log = [] } = {}) {
  const d = new Date(typeof date === "string" ? date + "T12:00:00Z" : date);
  const wd = DAYS[d.getUTCDay()], type = schedule.longByWeekday[wd];
  const wi = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.parse(plan.startMonday + "T00:00:00Z")) / 6048e5);
  const week = plan.weeks[((wi % plan.weeks.length) + plan.weeks.length) % plan.weeks.length];
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), since = dayStart - 56 * 864e5; // same-day uploads ignored: long + Short of one day share the topic
  const used = new Set(log.filter((u) => !u.test && u.privacy !== "private" && u.privacy !== "unlisted" && u.topic && Date.parse(u.date) >= since && Date.parse(u.date) < dayStart).map((u) => u.topic));
  const w = week[type] || {}, want = type === "candle" ? week.candle.key : type === "coin" && w.coin ? "coin_" + w.coin.toLowerCase() : w.key ? w.key : type; // v6d topic ids = v6-make TOPICS keys
  const dayN = Math.floor(d.getTime() / 864e5);
  const rot = (skip) => { // deterministic rotation over ready candle topics, skipping used + this week's Saturday topic
    for (let k = 0; k < CANDLE_ORDER.length; k++) { const t = CANDLE_ORDER[(dayN + k) % CANDLE_ORDER.length]; if (!used.has(t) && !skip.includes(t)) return t; }
    return CANDLE_ORDER[dayN % CANDLE_ORDER.length]; // all used: oldest rule relaxed, similarity gate still guards
  };
  let topic, reason;
  if (READY.has(want) && (DATA_TYPES.has(want) || !used.has(want))) { topic = want; reason = `weekday ${wd} = ${type}`; }
  else { topic = rot(type === "candle" ? [] : [week.candle.key]); reason = READY.has(want) ? `${want} used in last 8 weeks -> ready candle topic` : `${wd} type ${type} (${want}) has no v6 lesson yet -> ready candle topic`; }
  if (slot === "extra") { const t2 = rot([topic, week.candle.key]); reason = `extra slot: second ready topic (main = ${topic})`; topic = t2; }
  return { date: d.toISOString().slice(0, 10), weekday: wd, type, want, topic, slot, reason };
}

if (process.argv[1] && process.argv[1].endsWith("v6-pick.mjs")) {
  const arg = (n, def) => { const h = process.argv.find((a) => a.startsWith("--" + n + "=")); return h ? h.split("=")[1] : def; };
  const schedule = JSON.parse(readFileSync(here("./schedule.json"), "utf8")), plan = JSON.parse(readFileSync(here("./topic-plan.json"), "utf8"));
  const log = existsSync(here("./uploads-log.json")) ? JSON.parse(readFileSync(here("./uploads-log.json"), "utf8")) : [];
  const r = pickTopic({ date: arg("date", new Date()), slot: arg("slot", "main"), schedule, plan, log });
  console.log(JSON.stringify(r));
  console.log("topic=" + r.topic);
}

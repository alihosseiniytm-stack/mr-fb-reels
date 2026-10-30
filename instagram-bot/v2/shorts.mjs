// One real whale story per Short: who (short address), coin, size, entry, leverage, result right now.
// 6 layouts (A..F) rotate; the first 5 seconds are always the RESULT hook (big live P&L number); hook wording is picked from a pool.
import { getFeed, getMids, getCandles, money, moneySay, px, dateLabel } from "./lib.mjs";

const LAYOUTS = ["A", "B", "C", "D", "E", "F"];
const HOOKS_UP = [
  (s) => `This whale is up ${s.pnlAbs} percent right now. Here is the trade.`,
  (s) => `Look at that: a ${s.sizeSay} ${s.sideWord} on ${s.coin} is winning big, up ${s.pnlAbs} percent.`,
  (s) => `Plus ${s.pnlAbs} percent and still open. This is what a smart ${s.coin} ${s.sideWord} looks like.`,
];
const HOOKS_DN = [
  (s) => `This whale is down ${s.pnlAbs} percent right now. Let us see what went wrong.`,
  (s) => `Ouch: a ${s.sizeSay} ${s.sideWord} on ${s.coin} is losing, down ${s.pnlAbs} percent.`,
  (s) => `Minus ${s.pnlAbs} percent and still open. Even whales get it wrong.`,
];

export async function pickStories(n, skipKeys = []) {
  const [feed, mids] = await Promise.all([getFeed(), getMids()]);
  const seen = new Set(), out = [];
  for (const r of [...feed].sort((a, b) => b.value - a.value)) {
    const key = r.address + ":" + r.coin;
    if (seen.has(r.coin) || skipKeys.includes(key) || !mids[r.coin]) continue;
    const chk = (((+mids[r.coin] - r.entryPx) / r.entryPx) * (r.szi < 0 ? -1 : 1)) * r.leverage * 100;
    if (chk < -90 || chk > 400) continue; // stale/cross-margin looking data: never show a loss past liquidation // different coin each time = different story
    seen.add(r.coin);
    const now = +mids[r.coin], side = r.szi < 0 ? "SHORT" : "LONG";
    const move = ((now - r.entryPx) / r.entryPx) * (side === "SHORT" ? -1 : 1);
    out.push({ key, coin: r.coin, side, sideWord: side.toLowerCase(), who: r.address.slice(0, 6) + "..." + r.address.slice(-4), size: r.value, sizeCard: money(r.value), sizeSay: moneySay(r.value),
      entry: r.entryPx, now, lev: r.leverage, liq: r.liqPx, pnl: move * r.leverage * 100, pnlAbs: Math.abs(move * r.leverage * 100).toFixed(1), up: move >= 0, openedMs: r.time });
    if (out.length >= n) break;
  }
  return out;
}

// idx: which layout/hook variant to use (use the day-of-year or weekday number so neighbours differ)
export async function buildShort(story, idx) {
  const s = story, lay = LAYOUTS[(idx + (idx >= 6 ? 3 : 0)) % 6], k3 = Math.floor(idx / 3); // 7 days vs 6 layouts: the 7th day shifts so Sat and Sun never match
  const candles = await getCandles(s.coin, "15m", 56);
  const tone = s.up ? "up" : "dn", sign = s.up ? "+" : "-";
  const hook = (s.up ? HOOKS_UP : HOOKS_DN)[idx % 3](s);
  const lastIdx = candles.length - 1;
  const hlines = [{ price: s.entry, label: "entry " + px(s.entry), color: "#fbbf24", fit: true }];
  if (s.liq && Math.abs(s.liq - s.now) / s.now < 0.35) hlines.push({ price: s.liq, label: "liq " + px(s.liq), color: "#ef4444", fit: true });
  const chart = { candles, hlines, marks: [{ i: lastIdx, price: s.now, label: "now " + px(s.now), color: s.up ? "#22c55e" : "#ef4444" }], title: s.coin + " · 15 min candles · live data" };
  const cards = [
    { k: "Coin / side", v: s.coin + " " + s.side, tone, beat: 2 }, { k: "Position size", v: s.sizeCard, beat: 2 },
    { k: "Entry price", v: "$" + px(s.entry), beat: 3 }, { k: "Leverage", v: s.lev + "x", beat: 3 },
  ];
  const base = { layout: lay, kicker: "REAL WHALE · " + dateLabel(), headline: s.coin + " " + s.side + " · " + s.sizeCard, big: { value: sign + s.pnlAbs + "%", label: s.up ? "this whale is winning right now" : "this whale is losing right now", tone },
    chart, cards, mood: s.up ? "wow" : "sad", say: hook, date: dateLabel(),
    bullets: [{ t: "Wallet " + s.who, beat: 2 }, { t: s.sizeCard + " " + s.side + " at " + s.lev + "x leverage", beat: 2 }, { t: "Entry $" + px(s.entry) + ", now $" + px(s.now), beat: 3 }] };
  const liqSay = s.liq ? ` Its liquidation price is ${px(s.liq)} dollars: if the price touches it, the position is closed automatically.` : "";
  const MID = [
    `The wallet starts with ${s.who}. It holds a ${s.sizeSay} ${s.sideWord} on ${s.coin}, with leverage ${s.lev} times, which means the bet is ${s.lev} times bigger than the money put in.`,
    `Who is it? Wallet ${s.who}. It put ${s.sizeSay} on a ${s.coin} ${s.sideWord}, using ${s.lev} times leverage. So every one percent price move changes its money by ${s.lev} percent.`,
    `Meet wallet ${s.who}. Its ${s.coin} ${s.sideWord} is worth ${s.sizeSay}. Leverage is ${s.lev} times, so even small price moves hit this trader very hard.`,
  ];
  const END = [
    `It got in at ${px(s.entry)} dollars and the price now is ${px(s.now)}.${liqSay} Follow whales live, free, on market radar whale dot com, and tap the link for our Telegram bot.`,
    `Entry was ${px(s.entry)}, price now ${px(s.now)}.${liqSay} Want to track whales like this for free? Search market radar whale dot com.`,
    `The line to watch is the entry, ${px(s.entry)} dollars, with the price at ${px(s.now)}.${liqSay} Live whale alerts are free in our Telegram bot, link below.`,
  ];
  const narration = [
    { text: hook, beats: 1 },
    { text: MID[(idx + k3) % 3], beats: 2 },
    { text: END[(idx + 2 * k3 + 1) % 3], beats: 1 },
  ];
  const text = narration.map((x) => x.text).join(" ");
  // three scenes of the same layout, revealing more each time
  const scenes = [
    { scene: { ...base, say: undefined, bullets: [] , cards: [] }, say: narration[0].text, beats: 1 },
    { scene: { ...base, say: undefined }, say: narration[1].text, beats: 3 },
    { scene: { ...base, say: undefined, beat: 99 }, say: narration[2].text, beats: 1 },
  ];
  scenes[1].scene.beat = undefined; // renderVideo sets beat per screenshot
  const title = `${s.up ? "+" : "-"}${s.pnlAbs}% ${s.coin} ${s.side}: whale ${s.up ? "winning" : "losing"} ${s.sizeCard}`;
  return { scenes, text, title, layout: lay, story: s };
}

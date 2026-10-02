import { SITE } from "./config.mjs";
import { hasUsed, markUsed } from "./state.mjs";

async function getJson(path) {
  const res = await fetch(SITE + path, { headers: { "user-agent": "marketradar-ig-bot/1.0" } });
  if (!res.ok) throw new Error(path + " -> HTTP " + res.status);
  return res.json();
}

// ---- number formatting: short, rounded, and easy to listen to (never a long tail of decimals) ----
const clean = (x, d) => String(parseFloat(Number(x).toFixed(d)));

// Money amount -> { card: "$39.9K", en: "39.9 thousand dollars", fa: "39.9 هزار دلار" }
function fmtMoney(n) {
  const a = Math.abs(Number(n) || 0);
  if (a >= 1e9) return { card: "$" + clean(a / 1e9, 1) + "B", en: clean(a / 1e9, 1) + " billion dollars", fa: clean(a / 1e9, 1) + " میلیارد دلار" };
  if (a >= 1e6) return { card: "$" + clean(a / 1e6, 1) + "M", en: clean(a / 1e6, 1) + " million dollars", fa: clean(a / 1e6, 1) + " میلیون دلار" };
  if (a >= 1e3) return { card: "$" + clean(a / 1e3, 1) + "K", en: clean(a / 1e3, 1) + " thousand dollars", fa: clean(a / 1e3, 1) + " هزار دلار" };
  return { card: "$" + clean(a, 0), en: clean(a, 0) + " dollars", fa: clean(a, 0) + " دلار" };
}

// Coin price -> short card text + spoken text. Tiny prices (SHIB, PEPE, ...) are quoted per MILLION coins
// so nobody has to listen to "zero point zero zero zero zero zero seven".
function fmtPrice(p) {
  const n = Number(p);
  let num;
  if (n >= 1000) num = clean(n, 0);
  else if (n >= 100) num = clean(n, 1);
  else if (n >= 1) num = clean(n, 2);
  else if (n >= 0.001) num = String(parseFloat(n.toPrecision(2)));
  else {
    const m = n * 1e6;
    num = m >= 100 ? clean(m, 0) : m >= 1 ? clean(m, 1) : String(parseFloat(m.toPrecision(2)));
    return { card: "$" + num + "/M", en: num + " dollars per million coins", fa: num + " دلار برای هر یک میلیون کوین" };
  }
  return { card: "$" + num, en: num + " dollars", fa: num + " دلار" };
}

// Common tickers spoken as their real Persian name instead of raw Latin letters
// (the TTS voice reads unknown ones fine as-is, so this only needs the common ones).
const COIN_NAME_FA = {
  BTC: "بیت‌کوین", ETH: "اتریوم", SOL: "سولانا", HYPE: "هایپ", XRP: "ریپل",
  DOGE: "دوج‌کوین", ADA: "کاردانو", AVAX: "اوالانچ", LINK: "چین‌لینک",
  ARB: "آربیتروم", OP: "اپتیمیزم", SUI: "سویی", APT: "اپتوس", NEAR: "نیر",
  ONDO: "اوندو", ZEC: "زی‌کش", MATIC: "پالیگان", POL: "پالیگان", BNB: "بی‌ان‌بی",
  TRX: "ترون", LTC: "لایت‌کوین", DOT: "پولکادات", ATOM: "کازماس", FIL: "فایل‌کوین",
  INJ: "اینجکتیو", TIA: "سلستیا", PEPE: "پپه", WIF: "داگ‌ویف‌هت", BONK: "بانک",
};
function coinNameFa(ticker) {
  return COIN_NAME_FA[ticker] || ticker;
}

// Picks one fresh Hyperliquid (futures) whale position from /whale-feed, largest value first,
// skipping anything already posted (address+coin+time).
// Board = exactly the 5 things the voice says, in the order it says them.
async function pickHyperliquid(used) {
  const feed = await getJson("/whale-feed");
  if (!Array.isArray(feed)) return null;
  const sorted = [...feed].sort((a, b) => Number(b.value) - Number(a.value));
  for (const row of sorted) {
    const key = "hl:" + row.address + ":" + row.coin + ":" + row.time;
    if (hasUsed(used, key)) continue;
    const szi = Number(row.szi);
    const side = szi < 0 ? "SHORT" : "LONG";
    const size = fmtMoney(row.value);
    const entry = fmtPrice(row.entryPx);
    const liq = row.liqPx ? fmtPrice(row.liqPx) : null;
    const lev = row.leverage;
    return {
      source: "hl",
      key,
      title: { en: "\u{1F40B} Whale " + side, fa: "\u{1F40B} نهنگ " + (side === "SHORT" ? "فروش" : "خرید") },
      stats: [
        { label: { en: "Coin", fa: "کوین" }, value: row.coin + " · " + side, hint: { en: row.coin, fa: coinNameFa(row.coin) } },
        // hint = the exact phrase the voice says for this card (this is how the pointer finds it in the script)
        { label: { en: "Position size", fa: "حجم پوزیشن" }, value: size.card, hint: { en: size.en, fa: size.fa } },
        { label: { en: "Entry price", fa: "قیمت ورود" }, value: entry.card, hint: { en: entry.en, fa: entry.fa } },
        { label: { en: "Leverage", fa: "اهرم" }, value: lev + "x", hint: { en: "leverage " + lev + "x", fa: "اهرم " + lev + " برابر" } },
        liq ? { label: { en: "Liquidation price", fa: "قیمت لیکوئید" }, value: liq.card, hint: { en: "liquidation price is " + liq.en, fa: "قیمت لیکوئید " + liq.fa } } : null,
      ].filter(Boolean),
      cta: { en: "Search marketradarwhale.com", fa: "جست‌وجو: marketradarwhale.com" },
      narration: {
        main: {
          en:
            `A whale just opened a ${size.en} ${side.toLowerCase()} on ${row.coin}. ` +
            `The entry price is ${entry.en}. ` +
            `It uses leverage ${lev}x, which means the position is ${lev} times bigger than the money put in. ` +
            (liq ? `And the liquidation price is ${liq.en}. If the price reaches it, the position is closed automatically.` : ""),
          fa:
            `یک نهنگ روی ${coinNameFa(row.coin)} پوزیشن ${side === "SHORT" ? "شورت" : "لانگ"} ${size.fa} باز کرده. ` +
            `قیمت ورودش ${entry.fa} هست. ` +
            `اهرم ${lev} برابر داره، یعنی حجم پوزیشن ${lev} برابر پولیه که گذاشته. ` +
            (liq ? `و قیمت لیکوئید ${liq.fa} هست. اگه قیمت به اون برسه، پوزیشن خودکار بسته می‌شه.` : ""),
        },
        cta: {
          en: "We track these whales live, every day, for free. Search marketradarwhale.com on Google.",
          fa: "ما این نهنگ‌ها رو هر روز زنده و رایگان دنبال می‌کنیم. توی گوگل سرچ کن marketradarwhale.com.",
        },
      },
      hashKind: "hl",
    };
  }
  return null;
}

// Picks one fresh Solana token from /sol-whales, highest peak market cap first,
// skipping anything already posted (mint address).
async function pickSolana(used) {
  const data = await getJson("/sol-whales");
  const toks = Array.isArray(data.tokens) ? data.tokens : [];
  const sorted = [...toks].sort((a, b) => Number(b.peak_mcap_sol) - Number(a.peak_mcap_sol));
  for (const t of sorted) {
    const key = "sol:" + t.mint;
    if (hasUsed(used, key)) continue;
    const sym = t.symbol || "?";
    const pk = Number(t.peak_mcap_sol);
    const pkCard = pk >= 1e9 ? clean(pk / 1e9, 1) + "B SOL" : pk >= 1e6 ? clean(pk / 1e6, 1) + "M SOL" : pk >= 1e3 ? clean(pk / 1e3, 1) + "K SOL" : clean(pk, 0) + " SOL";
    const pkEn = pk >= 1e9 ? clean(pk / 1e9, 1) + " billion SOL" : pk >= 1e6 ? clean(pk / 1e6, 1) + " million SOL" : pk >= 1e3 ? clean(pk / 1e3, 1) + " thousand SOL" : clean(pk, 0) + " SOL";
    const pkFa = pkEn.replace("billion", "میلیارد").replace("million", "میلیون").replace("thousand", "هزار");
    const wallets = t.wallets_seen || 0;
    const pct = t.top10_pct != null ? clean(t.top10_pct, 1) : null;
    return {
      source: "sol",
      key,
      title: { en: "\u{1F40B} Solana Whale Watch", fa: "\u{1F40B} نهنگ سولانا" },
      stats: [
        { label: { en: "Token", fa: "توکن" }, value: "$" + sym, hint: { en: sym, fa: sym } },
        { label: { en: "Peak market cap", fa: "اوج ارزش بازار" }, value: pkCard, hint: { en: pkEn, fa: pkFa } },
        { label: { en: "Whale wallets seen", fa: "کیف‌پول‌های نهنگ" }, value: String(wallets), hint: { en: wallets + " whale wallets", fa: wallets + " کیف‌پول نهنگ" } },
        t.risk_score != null ? { label: { en: "Risk score", fa: "امتیاز ریسک" }, value: String(t.risk_score), hint: { en: "risk score " + t.risk_score, fa: "امتیاز ریسک " + t.risk_score } } : null,
        pct != null ? { label: { en: "Top 10 holders", fa: "۱۰ هولدر برتر" }, value: pct + "%", hint: { en: pct + " percent", fa: pct + " درصد" } } : null,
      ].filter(Boolean),
      cta: { en: "Search marketradarwhale.com", fa: "جست‌وجو: marketradarwhale.com" },
      narration: {
        main: {
          en:
            `A Solana token called ${sym} just hit a peak market cap of ${pkEn}. ` +
            `${wallets} whale wallets are holding it. ` +
            (t.risk_score != null ? `Its risk score is ${t.risk_score} out of 100. ` : "") +
            (pct != null ? `And its top 10 holders control ${pct} percent of the supply.` : ""),
          fa:
            `یک توکن سولانا به اسم ${sym} به اوج ارزش بازار ${pkFa} رسیده. ` +
            `${wallets} کیف‌پول نهنگ اون رو نگه می‌دارن. ` +
            (t.risk_score != null ? `امتیاز ریسکش ${t.risk_score} از صد هست. ` : "") +
            (pct != null ? `و ده هولدر بزرگش ${pct} درصد از کل توکن رو دارن.` : ""),
        },
        cta: {
          en: "We track whales like this live, for free. Search marketradarwhale.com on Google.",
          fa: "ما نهنگ‌هایی مثل این رو زنده و رایگان دنبال می‌کنیم. توی گوگل سرچ کن marketradarwhale.com.",
        },
      },
      hashKind: "sol",
    };
  }
  return null;
}

// Futures whales get 2 days out of every 3, Solana 1. Falls back to the other source
// if the preferred one has nothing fresh.
export async function pickWhaleContent(used, dayOfYear) {
  const preferHl = dayOfYear % 3 !== 0;
  const first = preferHl ? pickHyperliquid : pickSolana;
  const second = preferHl ? pickSolana : pickHyperliquid;
  let pick = await first(used).catch(() => null);
  if (!pick) pick = await second(used).catch(() => null);
  if (pick) markUsed(used, pick.key);
  return pick;
}

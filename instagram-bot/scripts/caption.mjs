// Comment word must match the trigger the webhook worker listens for
// (instagram-bot/webhook-worker/src/worker.mjs TRIGGERS) — keep these in sync.
const CHALLENGE = {
  en: `Comment "WHALE" and I'll DM you today's top wallet \u{1F40B}`,
  fa: `کامنت بذار "نهنگ" تا برترین کیف‌پول امروز رو براتون دایرکت کنم \u{1F40B}`,
};

export function dataCaption(lang, pick) {
  const tags = (pick.hashKind === "sol" ? ["#solana"] : ["#hyperliquid"]);
  const base =
    lang === "fa"
      ? pick.source === "hl"
        ? `یک نهنگ روی ${pick.stats[0].hint ? pick.stats[0].hint.fa : pick.stats[0].value} پوزیشن ${pick.title.fa.includes("خرید") ? "خرید" : "فروش"} باز کرده. اعداد واقعی، از دیتای خودمون.`
        : `یک توکن سولانا با فعالیت نهنگ‌های زیاد. اعداد واقعی، به‌روز.`
      : pick.source === "hl"
      ? `A whale just opened a real ${pick.title.en.includes("SHORT") ? "short" : "long"} on ${pick.stats[0].hint ? pick.stats[0].hint.en : pick.stats[0].value}. Real numbers, from our own data.`
      : `A Solana token with heavy whale activity right now. Real numbers, live.`;
  const hashtags = lang === "fa" ? ["#کریپتو", "#نهنگ", "#ارز_دیجیتال", ...tags.map(fa)] : ["#crypto", "#whalealert", "#defi", ...tags];
  // Facebook has no "comment WHALE -> DM" bot, so there the call to action is the site name (people search it on Google).
  const site = lang === "fa" ? "\u{1F50E} توی گوگل سرچ کن: marketradarwhale.com" : "\u{1F50E} Search on Google: marketradarwhale.com";
  const cta = (process.env.PLATFORM === "fb" || process.env.PLATFORM === "yt") ? site : CHALLENGE[lang];
  return base + "\n\n" + cta + "\n\n" + hashtags.slice(0, 5).join(" ");
}

function fa(tag) {
  return tag === "#solana" ? "#سولانا" : tag === "#hyperliquid" ? "#هایپرلیکوئید" : tag;
}

export function tourCaption(lang, section) {
  const base =
    lang === "fa"
      ? `یک نگاه سریع به ${section.label.fa} در مارکت رادار. ${section.blurb.fa}`
      : `A quick look at ${section.label.en} on MarketRadar. ${section.blurb.en}`;
  const hashtags = lang === "fa" ? ["#کریپتو", "#ارز_دیجیتال", "#مارکت_رادار"] : ["#crypto", "#defi", "#marketradar"];
  return base + "\n\n" + hashtags.join(" ");
}

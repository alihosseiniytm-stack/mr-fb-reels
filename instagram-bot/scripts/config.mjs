// Shared config for both language pipelines. Nothing secret lives here —
// tokens and IDs come from environment variables set as GitHub secrets.
export const SITE = "https://marketradarwhale.com";

export const LANGS = {
  en: {
    code: "en",
    dir: "ltr",
    name: "MarketRadar EN",
    brand: "MarketRadar",
    site: SITE,
    hashtags: ["#crypto", "#whalealert", "#hyperliquid"],
    hashtagsSol: ["#crypto", "#solana", "#whalewatch"],
  },
  fa: {
    code: "fa",
    dir: "rtl",
    name: "MarketRadar FA",
    brand: "مارکت‌ رادار",
    site: SITE,
    hashtags: ["#کریپتو", "#ارز_دیجیتال", "#نهنگ"],
    hashtagsSol: ["#کریپتو", "#سولانا", "#ارز_دیجیتال"],
  },
};

// Site-tour sections, rotated in order. Each one is a short lesson: the teacher whale introduces the
// section, then walks through `points` one by one — a card appears on the blackboard, the whale points at
// it and explains it (`say` is the exact spoken sentence; `title` is the short text on the card) — and
// finishes with the call to action. The narration is built from these parts, so the spoken words, the
// cards and the subtitles can never drift apart. Target ~45-60s spoken: this format has real explaining
// to do, and 2026 Reels data shows longer explainer videos win here as long as people watch them through.
const CTA = { en: "Try it free — link in bio.", fa: "رایگان امتحانش کن، لینک توی بایو هست." };

export const SECTIONS = [
  {
    key: "whales",
    path: "/whales-solana/",
    label: { en: "Live Whale Tracker", fa: "ردیاب زندهٔ نهنگ‌ها" },
    blurb: {
      en: "Every big wallet move, tracked live.",
      fa: "هر حرکت کیف‌پول‌های بزرگ، به‌صورت زنده.",
    },
    intro: {
      en: "Here's the live whale tracker on MarketRadar.",
      fa: "این ردیاب زندهٔ نهنگ‌هاست توی مارکت رادار.",
    },
    points: [
      {
        title: { en: "Live, not delayed", fa: "لحظه‌ای، نه با تاخیر" },
        say: {
          en: "Every big wallet move, on Solana and on Hyperliquid, gets tracked live as it happens — not delayed, not a summary someone wrote an hour later.",
          fa: "هر حرکت کیف‌پول‌های بزرگ، هم روی سولانا هم روی هایپرلیکوئید، همون لحظه‌ای که اتفاق می‌افته دیده می‌شه، نه با تاخیر و نه یه خلاصهٔ دست‌کاری‌شده.",
        },
      },
      {
        title: { en: "Where whales invest", fa: "نهنگ‌ها کجا سرمایه می‌ذارن" },
        say: {
          en: "You can see which tokens whale wallets are actually buying into, how many wallets are holding,",
          fa: "می‌تونی ببینی نهنگ‌ها دقیقاً روی کدوم توکن‌ها دارن سرمایه می‌ذارن، چند تا کیف‌پول نگهش داشتن،",
        },
      },
      {
        title: { en: "Real contract risk", fa: "ریسک واقعی قرارداد" },
        say: {
          en: "and whether the contract itself has any real risk flags, before you ever put money in.",
          fa: "و قبل از اینکه پولی وارد کنی، ریسک واقعی قرارداد چیه.",
        },
      },
      {
        title: { en: "Who moves the price", fa: "کی قیمت رو حرکت می‌ده" },
        say: {
          en: "Most tools only show you price. This shows you who's actually moving that price, in real time, using nothing but public on-chain data — no guessing, no paid signals, just what the whales themselves are doing right now.",
          fa: "خیلی از ابزارها فقط قیمت رو نشون می‌دن. این یکی نشون می‌ده کی داره واقعاً این قیمت رو حرکت می‌ده، همون لحظه، فقط با داده‌ی عمومی آنچین — نه حدس، نه سیگنال پولی، فقط کاری که خود نهنگ‌ها الان دارن انجام می‌دن.",
        },
      },
    ],
  },
  {
    key: "swap",
    path: "/convert",
    label: { en: "Swap & Bridge", fa: "سواپ و بریج" },
    blurb: {
      en: "Swap and bridge across chains in one place.",
      fa: "سواپ و انتقال بین چندین شبکه، در یک صفحه.",
    },
    intro: {
      en: "This is swap and bridge on MarketRadar.",
      fa: "این بخش سواپ و بریج مارکت راداره.",
    },
    points: [
      {
        title: { en: "Five apps, one page", fa: "پنج تا اپ، یک صفحه" },
        say: {
          en: "Instead of jumping between five different apps to move a token from one chain to another, you do it right here, in one place, with live rates so you know exactly what you're getting before you confirm anything.",
          fa: "به‌جای اینکه بین پنج تا اپ مختلف بپری تا یه توکن رو از یه شبکه به شبکهٔ دیگه ببری، همینجا و توی یک صفحه انجامش می‌دی، با نرخ لحظه‌ای، تا دقیقاً بدونی قبل از تایید نهایی چی گیرت میاد.",
        },
      },
      {
        title: { en: "One wallet connection", fa: "بدون اتصال جدا برای هر شبکه" },
        say: {
          en: "No separate wallet-connect flow for every single chain,",
          fa: "نیازی نیست برای هر شبکه جدا کیف‌پولت رو وصل کنی،",
        },
      },
      {
        title: { en: "No copy-pasted addresses", fa: "بدون کپی‌پیست آدرس" },
        say: {
          en: "no copy-pasting addresses between tabs and hoping you didn't typo one.",
          fa: "نیازی نیست آدرس رو بین تب‌های مختلف کپی‌پیست کنی و نگران تایپوی احتمالی باشی.",
        },
      },
      {
        title: { en: "See the real rate", fa: "نرخ واقعی رو ببین" },
        say: {
          en: "Pick what you have, pick what you want, and see the real rate before you commit to anything.",
          fa: "انتخاب کن چی داری، انتخاب کن چی می‌خوای، و قبل از هر تعهدی نرخ واقعی رو ببین.",
        },
      },
    ],
  },
  {
    key: "trade",
    path: "/trade/hyperliquid",
    label: { en: "Live Trading", fa: "معاملهٔ زنده" },
    blurb: {
      en: "Real-time charts and on-chain trading tools.",
      fa: "چارت لحظه‌ای و ابزار معاملهٔ آنچین.",
    },
    intro: {
      en: "This is live trading on MarketRadar.",
      fa: "این بخش معاملهٔ زندهٔ مارکت راداره.",
    },
    points: [
      {
        title: { en: "Real-time charts", fa: "چارت لحظه‌ای" },
        say: {
          en: "Real-time charts, on-chain order flow, and the same kind of tools you'd expect from a real exchange —",
          fa: "چارت لحظه‌ای، جریان سفارش‌های آنچین، و همون ابزارهایی که از یه صرافی واقعی انتظار داری —",
        },
      },
      {
        title: { en: "Everything on-chain", fa: "همه‌چیز روی زنجیره" },
        say: {
          en: "except everything you're looking at is happening on-chain, in the open, right now, not hidden behind some other platform's black box.",
          fa: "با این فرق که هر چی می‌بینی داره روی زنجیره و به‌صورت باز اتفاق می‌افته، نه پشت جعبهٔ سیاهِ یه پلتفرم دیگه.",
        },
      },
      {
        title: { en: "Whale positions by the chart", fa: "پوزیشن نهنگ‌ها کنار چارت" },
        say: {
          en: "You can see the same whale positions we track elsewhere on the site, right next to the chart you're trading on,",
          fa: "همون پوزیشن‌های نهنگی که جای دیگهٔ سایت دنبال می‌کنیم رو، درست کنار چارتی که داری باهاش معامله می‌کنی می‌بینی،",
        },
      },
      {
        title: { en: "No tab switching", fa: "بدون عوض کردن تب" },
        say: {
          en: "instead of switching tabs to check what the big wallets are doing.",
          fa: "بدون اینکه لازم باشه تب عوض کنی.",
        },
      },
    ],
  },
  {
    key: "leaderboard",
    path: "/leaderboard/",
    label: { en: "Whale Leaderboard", fa: "جدول برترین نهنگ‌ها" },
    blurb: {
      en: "See which tracked whales are actually winning.",
      fa: "ببین کدام نهنگ‌های ردیابی‌شده واقعاً برنده‌اند.",
    },
    intro: {
      en: "This is the whale leaderboard on MarketRadar.",
      fa: "این جدول برترین نهنگ‌های مارکت راداره.",
    },
    points: [
      {
        title: { en: "Does it actually work?", fa: "واقعاً جواب می‌ده؟" },
        say: {
          en: "We don't just track what whales are doing, we track whether it's actually working —",
          fa: "ما فقط کار نهنگ‌ها رو دنبال نمی‌کنیم، دنبال می‌کنیم که واقعاً جواب می‌ده یا نه —",
        },
      },
      {
        title: { en: "Real win rate and profit", fa: "نرخ برد و سود واقعی" },
        say: {
          en: "real win rate, real realized profit, ranked from our own stored trade history,",
          fa: "نرخ برد واقعی، سود واقعی، رتبه‌بندی‌شده از روی تاریخچهٔ معاملات ذخیره‌شدهٔ خودمون،",
        },
      },
      {
        title: { en: "Consistent winners", fa: "برنده‌های پیوسته" },
        say: {
          en: "so you can see which tracked wallets are consistently winning, not just loud on social media.",
          fa: "تا ببینی کدوم کیف‌پول‌ها واقعاً و پیوسته دارن برنده می‌شن، نه فقط توی شبکهٔ اجتماعی پرسروصدان.",
        },
      },
      {
        title: { en: "Every trade, win or lose", fa: "همهٔ معاملات، برد و باخت" },
        say: {
          en: "Anyone can screenshot one good trade. This is every trade we've recorded for that wallet, win or lose, so the ranking can't be cherry-picked.",
          fa: "هرکسی می‌تونه از یه معاملهٔ خوب اسکرین‌شات بگیره. این یعنی همهٔ معاملاتی که از اون کیف‌پول ثبت کردیم، چه برد چه باخت، تا رتبه‌بندی قابل دستکاری نباشه.",
        },
      },
    ],
  },
];

// The narration of a tour reel: the intro, then every point's sentence in order, then the call to action.
// `segments` lists the character range of each spoken part so the board can be timed to the voice.
export function tourScript(section, lang) {
  const parts = [section.intro[lang], ...section.points.map((p) => p.say[lang])];
  const main = parts.join(" ");
  const starts = [];
  let at = 0;
  for (const part of parts) {
    starts.push(at);
    at += part.length + 1;
  }
  return { main, cta: CTA[lang], introLen: parts[0].length + 1, pointStarts: starts.slice(1) };
}

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
};

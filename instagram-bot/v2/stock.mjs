// Licensed stock pictures for documentary-style videos (T50-08, owner 2026-11-03 21:42Z "real images, not animation").
// Provider order: Pexels (secret PEXELS_API_KEY) -> Pixabay (secret PIXABAY_API_KEY) -> Openverse (no key, CC0 / public domain only)
// -> Wikimedia Commons (no key, CC0 / public domain / CC BY*, attribution goes into the description).
// Every picture used is written to credits (provider, license, author, source page) = <video>-credits.json; standards-check
// fails a video whose picture has no allowed license or no source URL. No news photos, no other creators' clips.
// Runs on GitHub Actions (these hosts are not reachable from the owner's PC network).
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// CC BY-SA is NOT allowed (share-alike would bind the whole video); CC BY only with attribution in the description
export const ALLOWED = /^(pexels|pixabay|cc0|pdm|public domain|cc by [0-9.]+|cc-by-[0-9.]+)$/i;
const UA = { "user-agent": "MarketRadarWhale-video-bot/1.0 (https://marketradarwhale.com)" };
const j = async (url, headers = {}) => { const r = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(r.status + " " + url.slice(0, 80)); return r.json(); };

async function pexels(q, wide) {
  const k = process.env.PEXELS_API_KEY; if (!k) return [];
  const d = await j(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=30&orientation=${wide ? "landscape" : "portrait"}&size=large`, { authorization: k });
  return (d.photos || []).map((p) => ({ provider: "pexels", id: "px" + p.id, url: p.src.large2x || p.src.original, w: p.width, h: p.height, author: p.photographer, license: "Pexels", page: p.url }));
}
async function pixabay(q, wide) {
  const k = process.env.PIXABAY_API_KEY; if (!k) return [];
  const d = await j(`https://pixabay.com/api/?key=${k}&q=${encodeURIComponent(q)}&image_type=photo&orientation=${wide ? "horizontal" : "vertical"}&min_width=1600&safesearch=true&per_page=30`);
  return (d.hits || []).map((p) => ({ provider: "pixabay", id: "pb" + p.id, url: p.largeImageURL, w: p.imageWidth, h: p.imageHeight, author: p.user, license: "Pixabay", page: p.pageURL }));
}
async function openverse(q, wide) {
  const d = await j(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&mature=false&size=large&aspect_ratio=${wide ? "wide" : "tall,square"}&page_size=20`);
  return (d.results || []).filter((p) => p.url && p.foreign_landing_url).map((p) => ({ provider: "openverse", id: "ov" + p.id, url: p.url, w: p.width, h: p.height, author: p.creator || "unknown", license: p.license, page: p.foreign_landing_url }));
}
async function commons(q) {
  const d = await j(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=25&gsrsearch=${encodeURIComponent("filetype:bitmap " + q)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2400`);
  return Object.values((d.query && d.query.pages) || {}).map((p) => { const i = (p.imageinfo || [])[0] || {}, m = i.extmetadata || {};
    const lic = String((m.LicenseShortName || {}).value || "").replace(/<[^>]+>/g, "").trim(), au = String((m.Artist || {}).value || "unknown").replace(/<[^>]+>/g, "").trim().slice(0, 80);
    return { provider: "commons", id: "wc" + p.pageid, url: i.thumburl || i.url, w: i.thumbwidth || i.width, h: i.thumbheight || i.height, author: au, license: lic, page: i.descriptionurl };
  }).filter((p) => p.url && ALLOWED.test(p.license));
}

// sentence -> search words: fixed topic map first (finance/crypto scenes without faces or logos), else the sentence's own nouns
const TOPICS = [
  [/whale/i, "ocean whale"], [/liquidat/i, "red warning light"], [/leverage|multipl/i, "balance scale weights"], [/wallet/i, "leather wallet coins"],
  [/blockchain|ledger|network/i, "server room data"], [/risk|danger|careful|never/i, "warning sign road"], [/profit|winning|wins|gain/i, "gold coins stack"],
  [/loss|losing|lose|fell|falls?/i, "storm clouds sea"], [/candle|chart|price|trend/i, "stock market screen"], [/learn|lesson|rule|remember/i, "notebook desk study"],
  [/time|hours|days|ago|later/i, "clock vintage"], [/bitcoin|btc|coin|crypto|token/i, "bitcoin coin"], [/money|dollars|million|billion/i, "us dollar banknotes"],
  [/scam|trick|phrase|password|hack/i, "padlock security"], [/buy|sell|trade|trader/i, "trading desk monitors"],
];
export function stockQuery(say) { for (const [re, q] of TOPICS) if (re.test(say)) return q; return "city lights night"; }

// one picker per video: caches searches, never reuses a picture inside the video, seed varies the pick between videos
export function stockPicker({ wide, seed = "" }) {
  const cache = new Map(), used = new Set(), credits = [];
  const minW = wide ? 1600 : 900, minH = wide ? 900 : 1200;
  async function search(q) {
    if (cache.has(q)) return cache.get(q);
    let list = [];
    for (const f of [pexels, pixabay, openverse, commons]) {
      try { list = (await f(q, wide)).filter((p) => (p.w || 0) >= minW && (p.h || 0) >= minH * 0.75); } catch (e) { console.log("STOCK", f.name, "failed:", String(e.message).slice(0, 60)); list = []; }
      if (list.length >= 3) break;
    }
    cache.set(q, list); return list;
  }
  return {
    credits,
    async pick(say, file) {
      const q = stockQuery(say), list = (await search(q)).filter((p) => !used.has(p.id));
      if (!list.length) return null;
      const h = parseInt(createHash("sha1").update(seed + "|" + say).digest("hex").slice(0, 8), 16);
      for (let k = 0; k < Math.min(4, list.length); k++) {
        const p = list[(h + k) % list.length];
        try {
          const r = await fetch(p.url, { headers: UA, signal: AbortSignal.timeout(30000) });
          const ct = r.headers.get("content-type") || "";
          if (!r.ok || !/image\/(jpeg|png|webp)/.test(ct)) continue;
          const path = file + (/png/.test(ct) ? ".png" : /webp/.test(ct) ? ".webp" : ".jpg");
          await writeFile(path, Buffer.from(await r.arrayBuffer()));
          used.add(p.id);
          const c = { provider: p.provider, license: p.license, author: p.author, page: p.page, file: path.split(/[\\/]/).pop(), path, query: q };
          credits.push(c); return c;
        } catch { /* next candidate */ }
      }
      return null;
    },
  };
}

export function creditsText(credits) {
  if (!credits.length) return "";
  const by = credits.filter((c) => /by/i.test(c.license));
  return "\n\nPictures: free licensed stock (" + [...new Set(credits.map((c) => c.provider))].join(", ") + ")" + (by.length ? ": " + by.map((c) => `${c.author} (${c.license}, ${c.page})`).join("; ") : "") + ".";
}

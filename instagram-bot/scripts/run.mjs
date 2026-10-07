import { fileURLToPath } from "node:url";
import { mkdir, appendFile, rm } from "node:fs/promises";
import { LANGS, SECTIONS, tourScript } from "./config.mjs";
import { loadState, saveState, logPost } from "./state.mjs";
import { pickWhaleContent } from "./pick-content.mjs";
import { renderDataVideo } from "./render-video.mjs";
import { synthesizeNarration, computeMouthEnvelope, probeDurationMs } from "./tts.mjs";
import { buildSubtitleChunks } from "./subtitles.mjs";
import { planBoard, planLesson } from "./cues.mjs";
import { uploadVideo } from "./upload-video.mjs";
import { publishReel, envForLang } from "./publish-instagram.mjs";
import { dataCaption, tourCaption } from "./caption.mjs";
import { publishYouTube } from "./publish-youtube.mjs";

// Target lengths per format — see instagram-bot/SETUP.md for why these differ: pure-numbers
// reels lose to shorter videos on completion rate, explainer reels with real content to say
// gain from the extra length. scripts/analyze-performance.mjs revisits these from real
// Insights data after enough posts have run; TARGET_OVERRIDES below is what it writes.
const DEFAULT_TARGETS = { data: [20, 30], tour: [45, 60] };

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
}

const lang = arg("lang");
const mode = arg("mode"); // "data" | "tour"
const dryRun = String(process.env.DRY_RUN ?? "true").toLowerCase() !== "false";

if (!lang || !LANGS[lang]) throw new Error("Pass --lang=en or --lang=fa");
if (!["data", "tour"].includes(mode)) throw new Error("Pass --mode=data or --mode=tour");

const L = LANGS[lang];
const outDir = fileURLToPath(new URL("../out/", import.meta.url));
const narrationPath = fileURLToPath(new URL(`../.tmp-narration-${Date.now()}.mp3`, import.meta.url));
await mkdir(outDir, { recursive: true });

async function summarize(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text + "\n");
}

const state = await loadState(lang);

const BADGE = { en: "\u{1F6A8} BREAKING — TODAY", fa: "\u{1F6A8} خبر مهم — امروز" };
function todayLabel(lang) {
  return lang === "fa"
    ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long", year: "numeric" }).format(new Date())
    : new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
}
function breakingIntro(lang, dateLabel) {
  return lang === "fa"
    ? `خبر مهم، امروز ${dateLabel}: `
    : `Breaking today, ${dateLabel}: `;
}
// Real page to screenshot as the video's live, moving backdrop — matched to the data source
// so the background is actually relevant to what's being narrated.
const BG_PATH_BY_SOURCE = { hl: "/trade/hyperliquid", sol: "/whales-solana/" };

let videoPath, caption, key, narration;

if (mode === "data") {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const pick = await pickWhaleContent(state.used, dayOfYear);
  if (!pick) {
    await summarize(`No fresh whale data available for **${lang}** today — skipping without posting.`);
    process.exit(0);
  }

  const dateLabel = todayLabel(lang);
  const mainLine = breakingIntro(lang, dateLabel) + pick.narration.main[lang];
  const ctaLine = pick.narration.cta[lang];
  narration = await synthesizeNarration(`${mainLine} ${ctaLine}`, lang, narrationPath);
  const ratio = mainLine.length / (mainLine.length + ctaLine.length);
  const outroDelayMs = narration ? Math.round(narration.durationMs * ratio) : null;

  // Board cards appear one by one, in the order the narration explains them, each pointed at with the
  // teacher's stick as the voice reaches it (see scripts/cues.mjs).
  const statList = pick.stats.map((s) => ({ label: s.label[lang], value: s.value, hint: s.hint ? s.hint[lang] : null }));
  const plan = narration ? planBoard(statList, mainLine, ctaLine, narration.durationMs, outroDelayMs) : null;

  const data = {
    dir: L.dir,
    brand: L.brand,
    badge: BADGE[lang],
    date: dateLabel,
    title: pick.title[lang],
    platform: process.env.PLATFORM || "ig",
    stats: plan ? plan.stats : statList,
    cta: pick.cta[lang],
    url: "marketradarwhale.com",
    note: lang === "fa" ? "داده‌ی واقعی، از منبع خودمان" : "Real data, from our own feed",
    // The whale speaks the whole script (intro + numbers + call to action); the bubble shows it one
    // short phrase at a time, timed to the voice, and the jaw follows the audio loudness.
    subtitleChunks: narration ? buildSubtitleChunks(`${mainLine} ${ctaLine}`, narration.durationMs, 40) : [],
    pointCues: plan ? plan.cues : [],
    narrationMs: narration ? narration.durationMs : 0,
    mouthEnv: narration ? computeMouthEnvelope(narrationPath) : null,
    outroDelayMs,
  };
  videoPath = outDir + `${lang}-data-${Date.now()}.mp4`;
  await renderDataVideo({
    data,
    narrationPath: narration ? narrationPath : null,
    narrationDurationMs: narration ? narration.durationMs : null,
    bgPath: BG_PATH_BY_SOURCE[pick.source],
    outPath: videoPath,
  });
  caption = dataCaption(lang, pick);
  key = `${lang}/data-${Date.now()}.mp4`;
  state.history.lastSource = pick.source;
} else {
  // Site-tour lesson: the same teacher-whale-and-blackboard format as the data reels, but the cards are
  // the section's talking points, appearing one by one as the whale explains each (see config.mjs).
  const section = SECTIONS[state.history.tourIndex % SECTIONS.length];
  const script = tourScript(section, lang);
  const mainLine = script.main;
  const ctaLine = script.cta;
  narration = await synthesizeNarration(`${mainLine} ${ctaLine}`, lang, narrationPath);
  const ratio = mainLine.length / (mainLine.length + ctaLine.length);
  const outroDelayMs = narration ? Math.round(narration.durationMs * ratio) : null;
  const fmtNum = (n) => (lang === "fa" ? n.toLocaleString("fa-IR") : String(n));

  const data = {
    dir: L.dir,
    brand: L.brand,
    badge: lang === "fa" ? "\u{1F393} آموزش سایت" : "\u{1F393} SITE TOUR",
    badgeStyle: "info",
    date: todayLabel(lang),
    title: section.label[lang],
    stats: section.points.map((pt, i) => ({ label: `${fmtNum(i + 1)} / ${fmtNum(section.points.length)}`, value: pt.title[lang] })),
    cta: lang === "fa" ? "رایگان امتحانش کن" : "Try it free",
    url: "marketradarwhale.com" + section.path,
    note: section.blurb[lang],
    subtitleChunks: narration ? buildSubtitleChunks(`${mainLine} ${ctaLine}`, narration.durationMs, 40) : [],
    pointCues: narration ? planLesson(script, narration.durationMs) : [],
    narrationMs: narration ? narration.durationMs : 0,
    mouthEnv: narration ? computeMouthEnvelope(narrationPath) : null,
    outroDelayMs,
  };
  videoPath = outDir + `${lang}-tour-${Date.now()}.mp4`;
  await renderDataVideo({
    data,
    narrationPath: narration ? narrationPath : null,
    narrationDurationMs: narration ? narration.durationMs : null,
    bgPath: section.path, // the real page, blurred, as the backdrop
    outPath: videoPath,
  });
  caption = tourCaption(lang, section);
  key = `${lang}/tour-${Date.now()}.mp4`;
  state.history.tourIndex = (state.history.tourIndex + 1) % SECTIONS.length;
}

await rm(narrationPath, { force: true });

state.history.lastPostDate = new Date().toISOString().slice(0, 10);
state.history.lastMode = mode;
await saveState(state);

await summarize(
  `### ${L.name} — ${mode} video rendered\n\n- File: \`${videoPath}\`\n- Voiceover: ${narration ? `yes (${(narration.durationMs / 1000).toFixed(1)}s)` : "no (TTS failed, silent video with captions only)"}\n- Caption:\n\n\`\`\`\n${caption}\n\`\`\``
);

if (dryRun) {
  await summarize(
    `\n**DRY_RUN is on — nothing was uploaded or published.** Download the video artifact from this workflow run to review it.`
  );
  process.exit(0);
}

// YouTube (YT_UPLOAD=true): upload the rendered file straight to the channel through the YouTube Data API.
if (process.env.YT_UPLOAD === "true") {
  const yt = await publishYouTube({ filePath: videoPath, caption, lang });
  await summarize(`- YouTube: ${yt.url} (${yt.privacy})`);
  process.exit(0);
}

const videoUrl = await uploadVideo({ filePath: videoPath, key });
await summarize(`- Uploaded to: ${videoUrl}`);

// Facebook (PLATFORM=fb): hand the hosted video + caption to the Make scenario "MarketRadar Reels to Facebook",
// which downloads it and uploads it to the Facebook Page. The webhook URL is a GitHub secret.
if (process.env.PLATFORM === "fb") {
  const hook = process.env.MAKE_FB_WEBHOOK_URL;
  if (!hook) throw new Error("PLATFORM=fb needs the MAKE_FB_WEBHOOK_URL secret");
  // GitHub Pages takes a minute or two to publish a freshly pushed file; Make downloads the video the moment it is
  // told about it, so wait until the URL really serves the file (up to ~6 minutes) before calling the webhook.
  let live = false;
  for (let i = 0; i < 36 && !live; i++) {
    const head = await fetch(videoUrl, { method: "HEAD" }).catch(() => null);
    live = !!head && head.ok;
    if (!live) await new Promise((r) => setTimeout(r, 10000));
  }
  await summarize(`- Video URL live: ${live}`);
  if (!live) throw new Error("hosted video never became reachable: " + videoUrl);
  const res = await fetch(hook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ video_url: videoUrl, caption, lang, key }),
  });
  await summarize(`- Facebook (via Make): HTTP ${res.status} ${(await res.text()).slice(0, 80)}`);
  if (!res.ok) throw new Error("Make webhook rejected the post: HTTP " + res.status);
  process.exit(0);
}

const { igUserId, accessToken } = envForLang(lang);
const result = await publishReel({ igUserId, accessToken, videoUrl, caption, dryRun: false });
await summarize(`- Instagram: ${result.published ? "published, media id " + result.mediaId : result.reason}`);

if (result.published) {
  logPost(state.postLog, {
    mediaId: result.mediaId,
    mode,
    durationS: Math.round(probeDurationMs(videoPath) / 1000),
    targetRangeS: DEFAULT_TARGETS[mode],
    publishedAt: new Date().toISOString(),
    insights: null, // filled in later by scripts/analyze-performance.mjs, once Insights have time to populate
  });
  await saveState(state);
}

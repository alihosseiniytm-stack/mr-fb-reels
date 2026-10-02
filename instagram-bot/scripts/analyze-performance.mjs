// Runs on a schedule (see .github/workflows/instagram-analyze.yml) roughly every 2 weeks.
// For every published post we haven't checked yet, pulls real Instagram Insights and
// records a completion-rate proxy (average watch time / video length). Then, per mode
// (data vs tour), compares posts on the shorter vs longer half of that mode's target
// range and prints a recommendation — which half of the range is actually winning on
// completion, per the owner's own rule: a 60s video people drop out of loses to a 25s
// one people watch through, so raw view/like counts alone don't decide this.
//
// This does NOT silently rewrite scripts/run.mjs or config.mjs — it reports a
// recommendation in the job summary (and leaves it in state/<lang>/post-log.json) for a
// human (or a future edit) to act on. Auto-editing narration length from a cron job with
// no review is a good way to quietly wreck the content; a clear "here's what the data
// says" beats that.
import { LANGS } from "./config.mjs";
import { loadState, saveState } from "./state.mjs";
import { envForLang } from "./publish-instagram.mjs";

const GRAPH = "https://graph.facebook.com/v26.0";
const MIN_AGE_MS = 48 * 3600 * 1000; // Insights need time to settle after publish
const MIN_SAMPLE = 4; // don't draw conclusions from a handful of posts

async function fetchInsights(mediaId, accessToken) {
  const url = new URL(`${GRAPH}/${mediaId}/insights`);
  url.searchParams.set("metric", "plays,reach,ig_reels_avg_watch_time,ig_reels_video_view_total_time");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(JSON.stringify(json.error || json));
  const byName = {};
  for (const row of json.data || []) {
    byName[row.name] = row.values?.[0]?.value ?? null;
  }
  return byName;
}

async function analyzeLang(lang) {
  const L = LANGS[lang];
  const { igUserId, accessToken } = envForLang(lang);
  const state = await loadState(lang);
  const now = Date.now();
  let checked = 0;

  for (const post of state.postLog.posts) {
    if (post.insights) continue;
    if (now - new Date(post.publishedAt).getTime() < MIN_AGE_MS) continue;
    try {
      const raw = await fetchInsights(post.mediaId, accessToken);
      const avgWatchMs = raw.ig_reels_avg_watch_time ?? null;
      post.insights = {
        plays: raw.plays ?? null,
        reach: raw.reach ?? null,
        avgWatchMs,
        // A proxy for completion rate: average watch time as a fraction of the video's
        // own length. Meta doesn't expose a direct "completion rate" metric over the API.
        completionProxy: avgWatchMs != null ? Math.min(1, avgWatchMs / 1000 / post.durationS) : null,
        checkedAt: new Date().toISOString(),
      };
      checked++;
    } catch (e) {
      console.log(`INSIGHTS_ERR ${lang} ${post.mediaId}`, e.message);
    }
  }
  if (checked) await saveState(state);

  const lines = [`### ${L.name} — performance recommendation`];
  for (const mode of ["data", "tour"]) {
    const scored = state.postLog.posts.filter((p) => p.mode === mode && p.insights?.completionProxy != null);
    if (scored.length < MIN_SAMPLE) {
      lines.push(`- **${mode}**: only ${scored.length} scored post(s) so far — need at least ${MIN_SAMPLE} to compare. Keep the current target range.`);
      continue;
    }
    const [lo, hi] = scored[0].targetRangeS;
    const mid = (lo + hi) / 2;
    const shorter = scored.filter((p) => p.durationS <= mid);
    const longer = scored.filter((p) => p.durationS > mid);
    const avg = (arr) => arr.reduce((s, p) => s + p.insights.completionProxy, 0) / arr.length;
    if (!shorter.length || !longer.length) {
      lines.push(`- **${mode}**: all ${scored.length} scored posts landed on one side of the range — need more spread to compare. Keep the current target range (${lo}-${hi}s).`);
      continue;
    }
    const shorterAvg = avg(shorter);
    const longerAvg = avg(longer);
    const winner = shorterAvg >= longerAvg ? "shorter" : "longer";
    const suggestion =
      winner === "shorter"
        ? `lean toward ${lo}-${Math.round(mid)}s`
        : `lean toward ${Math.round(mid)}-${hi}s`;
    lines.push(
      `- **${mode}**: ${shorter.length} shorter posts avg ${(shorterAvg * 100).toFixed(0)}% watched vs ${longer.length} longer posts avg ${(longerAvg * 100).toFixed(0)}% watched → **${winner} is winning**, ${suggestion} within the ${lo}-${hi}s range.`
    );
  }
  return lines.join("\n");
}

async function summarize(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, text + "\n\n");
  }
}

for (const lang of Object.keys(LANGS)) {
  try {
    await summarize(await analyzeLang(lang));
  } catch (e) {
    await summarize(`### ${LANGS[lang].name} — analysis failed\n\n\`${e.message}\``);
  }
}

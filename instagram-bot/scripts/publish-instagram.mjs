// Instagram Graph API "Content Publishing" flow for Reels:
//   1. POST /{ig-user-id}/media          -> create a container from a public video_url
//   2. Poll GET /{container-id}          -> wait for status_code === "FINISHED"
//   3. POST /{ig-user-id}/media_publish  -> publish the container
// Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing
const GRAPH = "https://graph.facebook.com/v26.0";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function gfetch(path, params, method = "GET") {
  const url = new URL(GRAPH + path);
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    method,
    ...(method === "POST"
      ? { headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) }
      : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error("Graph API error: " + JSON.stringify(json.error || json));
  }
  return json;
}

export async function publishReel({ igUserId, accessToken, videoUrl, caption, dryRun }) {
  if (dryRun) {
    return { published: false, dryRun: true, reason: "DRY_RUN enabled — skipped Instagram publish." };
  }
  const create = await gfetch(
    `/${igUserId}/media`,
    {
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      // Every reel has a synthetic TTS voiceover (see scripts/tts.mjs) — self-disclosed
      // per Instagram's AI-content policy rather than left to their own detection. If a
      // future API version drops/renames this param, Instagram treats it as a non-fatal
      // warning and still publishes, so this is safe to always send.
      is_ai_generated: "true",
      access_token: accessToken,
    },
    "POST"
  );
  const containerId = create.id;

  const deadline = Date.now() + 5 * 60 * 1000;
  let status = "IN_PROGRESS";
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 8000));
    const check = await gfetch(`/${containerId}`, { fields: "status_code", access_token: accessToken });
    status = check.status_code;
    if (status === "FINISHED") break;
    if (status === "ERROR") throw new Error("Instagram failed to process the video container.");
  }
  if (status !== "FINISHED") throw new Error("Timed out waiting for Instagram to process the video.");

  const publish = await gfetch(`/${igUserId}/media_publish`, { creation_id: containerId, access_token: accessToken }, "POST");
  return { published: true, mediaId: publish.id };
}

export function envForLang(lang) {
  const upper = lang.toUpperCase();
  return {
    igUserId: requireEnv(`IG_${upper}_ACCOUNT_ID`),
    accessToken: requireEnv(`IG_${upper}_ACCESS_TOKEN`),
  };
}

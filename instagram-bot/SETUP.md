# MarketRadar Instagram Bot — Owner Setup Guide

No coding needed for any of this. Follow the steps in order. Total cost: **$0** (GitHub Actions free tier + Cloudflare R2 free tier + Instagram's own API).

---

## What this bot does

Every day it automatically:
1. Pulls **real, live whale data** from marketradarwhale.com's own public endpoints (no fake numbers, ever).
2. Writes a short narration script from that same real data, and generates a spoken voiceover for it — free neural text-to-speech (Microsoft's public Edge voices), one narrator for English, one for Persian. No API key, no cost.
3. Builds a 10–20 second vertical video: the voice plays, and the same sentence it's speaking appears on screen as a subtitle, synced to when it's said — so the video works both with sound on and muted.
4. Every other day, instead it records a short real tour of one section of the site (whales / swap / trading / leaderboard) with the same voice+subtitle treatment, ending on a "visit the site" call to action.
5. Uploads the video and posts it as an Instagram Reel — **once this is turned on** (see "Going live" below).

Two completely separate pipelines: one posts to your English account, one to your Persian account. They never mix languages. If the TTS service is briefly unavailable, the bot falls back to a silent, caption-only video rather than skipping the post.

Video length is not fixed — each video's length matches how long the voiceover actually takes to say its line (roughly 12–17 seconds in testing), plus a couple of seconds of buffer.

**Nothing gets posted automatically until you flip one switch after reviewing test videos.** Until then, the bot only generates videos and lets you download them for review.

---

## Part 1 — Instagram + Facebook setup (do this first)

You need this **twice** — once for the English account, once for the Persian account.

1. Make sure each Instagram account is a **Professional account** (Business or Creator):
   Instagram app → Settings → Account type and tools → Switch to professional account.
2. Each Instagram account must be linked to its own **Facebook Page** (a Page, not a personal profile):
   Instagram app → Settings → Account Center → Linked accounts → Page → create or link one Facebook Page per Instagram account.
3. Note down, for each account: the **Facebook Page name**. You'll need it in Part 2.

---

## Part 2 — Meta Developer App (one app covers both accounts)

1. Go to https://developers.facebook.com/apps and log in with the Facebook account that manages both Pages.
2. Click **Create App** → choose type **"Other"** → **"Business"**.
3. Give it any name, e.g. "MarketRadar Bot".
4. In the app dashboard, click **Add Product**, find **Instagram Graph API**, click **Set Up**.
5. In the left sidebar, go to **App roles → Roles**, and add yourself (and the Instagram accounts, under **Instagram Testers**) so the app is allowed to act on your accounts. Accept the tester invite from inside the Instagram app: Settings → Apps and Websites → Tester Invites.
6. Go to **Tools → Graph API Explorer** (top right of the developers site, or https://developers.facebook.com/tools/explorer/).
   - Select your app from the dropdown.
   - Click **Generate Access Token**, log in, and grant permissions when asked: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`, `pages_read_engagement`. (The last two are for the "comment WHALE for a DM" feature in Part 8 — skip them if you don't want that feature.)
   - This gives you a **short-lived token** — we'll extend it in step 8.
7. Still in Graph API Explorer, in the query bar type `me/accounts` and click **Submit**. Find the Facebook Page linked to your English Instagram account in the results and copy its **Page ID** and **access token** shown there.
8. Exchange that Page token for a **long-lived token** (lasts ~60 days) by visiting this URL in your browser, replacing the placeholders:
   ```
   https://graph.facebook.com/v26.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_PAGE_TOKEN
   ```
   (App ID and App Secret are on your app's **Settings → Basic** page.) Copy the `access_token` from the response — this is your **long-lived Page access token**.
9. Find your **Instagram Business Account ID**: in Graph API Explorer, query `{page-id}?fields=instagram_business_account` using the Page ID from step 7. Copy the ID number returned.
10. Repeat steps 7–9 for the **Persian** account's Page.

You should now have 4 values:
- English: Instagram Business Account ID, long-lived Page access token
- Persian: Instagram Business Account ID, long-lived Page access token

**These tokens expire after ~60 days.** Put a reminder on your calendar to redo steps 6–9 roughly every 50 days and update the GitHub secrets (Part 4). This is the one recurring manual chore.

---

## Part 3 — Video hosting (GitHub Pages — free, no card required)

Instagram needs a public URL to fetch each video from before it can publish it. Cloudflare R2 would have worked but asks for a payment card even on its free tier, so instead the bot hosts videos on this same GitHub repository, using **GitHub Pages** — completely free, no card, ever, for a public repo like this one.

I already created and pushed the branch it needs (`gh-pages`). You just need to flip one switch to turn Pages on:

1. In your GitHub repository: **Settings → Pages** (left sidebar, under "Code and automation").
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Under **Branch**, choose `gh-pages` and folder `/ (root)`. Click **Save**.
4. Wait a minute, then refresh the page — it will show your site is live at a URL like `https://YOUR-USERNAME.github.io/whale-alert-worker/`. That's it, nothing else to configure.

The bot pushes each generated video to that branch automatically at publish time, and deletes videos older than 14 days on every run so the branch never grows unbounded (Instagram only needs a video reachable for a few minutes while it processes it).

No secrets are needed for this part — the workflow already has write access to this repo.

---

## Part 4 — Add everything as GitHub Secrets

In your GitHub repository: **Settings → Secrets and variables → Actions → Secrets → New repository secret.** Add each of these one at a time:

| Secret name | Value |
|---|---|
| `IG_EN_ACCOUNT_ID` | English Instagram Business Account ID (Part 2 step 9) |
| `IG_EN_ACCESS_TOKEN` | English long-lived Page access token (Part 2 step 8) |
| `IG_FA_ACCOUNT_ID` | Persian Instagram Business Account ID |
| `IG_FA_ACCESS_TOKEN` | Persian long-lived Page access token |

The rows below are only needed if you want the "comment WHALE for a DM" feature — see Part 8. Skip them for now if you'd rather turn that on later.

| Secret name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | A Cloudflare API token with "Edit Workers" permission — create one at **My Profile → API Tokens → Create Token → Edit Cloudflare Workers** template |
| `CF_ACCOUNT_ID` | Your Cloudflare Account ID — shown on the right side of any page in the Cloudflare dashboard, e.g. dash.cloudflare.com → any domain → "Account ID" in the sidebar |
| `IG_VERIFY_TOKEN` | Any random string you make up yourself, e.g. `mrw-9f3a-verify` — just has to match what you type into Meta in Part 8 |

This one is Cloudflare **Workers**, a different free product from R2 — it does not require a card. If Cloudflare asks for one anyway when you create the API token, skip Part 8 entirely; the core bot (Parts 1–7) works completely without it.

That's it for the core bot — no other setup needed. The workflows (`.github/workflows/instagram-en.yml` and `instagram-fa.yml`) are already in the repo and will pick these up automatically.

---

## Part 5 — Test a video (nothing gets posted yet)

By default the bot runs in **dry-run mode**: it generates a video and shows you the caption, but never uploads or publishes anything.

1. In GitHub, go to **Actions** tab → **Instagram Bot — English** (or Persian) → **Run workflow** (top right).
2. Leave "Dry run" checked. Choose "data" as the content type. Click **Run workflow**.
3. Wait ~2–3 minutes for it to finish (green checkmark).
4. Click into the finished run → scroll down to **Artifacts** → download the `.mp4` file.
5. Watch it. Repeat with "tour" as the content type to see the other format.

If something looks off (colors, text, timing), tell me and I'll adjust the template — nothing has been posted publicly at this point.

---

## Part 6 — Warm-up week (do this before turning the bot on)

Both accounts are brand new, so **don't let the bot make the first posts**. New accounts that post automatically from day one look bot-like to Instagram and to your future audience. Instead:

1. Run the workflow in dry-run mode (Part 5) 2–3 times over the course of a week to generate videos.
2. **Manually** post 2–3 of the best ones yourself, spaced out over that week (e.g. day 1, day 4, day 7) — download the `.mp4` from the workflow artifact, upload it as a Reel in the Instagram app like you normally would, using the caption the workflow printed in its summary (or your own).
3. This lets each account build a small bit of normal-looking history and lets real followers/engagement start before automation takes over.

Do this for **both** accounts in parallel — they're independent.

---

## Part 7 — Going live (after the warm-up week)

Once you're happy with the warm-up posts and roughly a week has passed:

1. In GitHub: **Settings → Secrets and variables → Actions → Variables tab → New repository variable**.
2. Name: `DRY_RUN`, value: `false`.
3. That's it. From the next scheduled run onward, both pipelines will publish for real:
   - Daily whale-data reel at 15:00 UTC — ~11am US Eastern (English) / 16:00 UTC — ~7:30pm Iran (Persian). Both chosen to land in the finance-audience 11am–1pm or 6–9pm local engagement windows.
   - Site-tour reel roughly every other day at 23:00 UTC — evening US (English) / 14:00 UTC — ~5:30pm Iran (Persian).

**After about 2 weeks**, open Instagram Insights (Professional dashboard → each Reel → "See insights") for each account, check which of your posts got the most reach/plays, and note what time those went out at *for that account's real audience*. If it's noticeably different from the defaults above, tell me the new time and I'll update the cron schedule — it's a one-line change.

To pause again at any time, set `DRY_RUN` back to `true` (or delete the variable) — the bot will keep generating videos for review but stop publishing, no code changes needed.

You can always trigger a one-off manual post/test via **Actions → Run workflow**, with its own dry-run checkbox independent of the `DRY_RUN` variable.

---

## Part 8 — "Comment WHALE for a DM" (optional growth feature)

Every whale-data caption now ends with a challenge: *"Comment 'WHALE' and I'll DM you today's top wallet"* (Persian: *"کامنت بذار 'نهنگ' تا برترین کیف‌پول امروز رو براتون دایرکت کنم"*). To make that automatic you need a tiny second piece: a webhook that Meta calls whenever someone comments, which then sends the real-data DM. This is a **separate, tiny Cloudflare Worker** (`instagram-bot/webhook-worker/`) — it never touches the main site's database, it only reads the same public whale data everything else uses.

1. Add the three extra secrets from the table above (`CLOUDFLARE_API_TOKEN`, `CF_ACCOUNT_ID`, `IG_VERIFY_TOKEN`), plus make sure the four `IG_*` secrets (Part 4) are already set — this worker reuses all of them.
2. In GitHub: **Actions → Deploy Instagram comment-webhook worker → Run workflow**. Wait for it to finish (green check). This deploys the worker and gives it its secrets automatically.
3. In the Cloudflare dashboard → **Workers & Pages**, open `mrw-ig-webhook` and copy its URL (looks like `https://mrw-ig-webhook.<your-subdomain>.workers.dev`).
4. Back in your Meta app (developers.facebook.com/apps → your app): **Add Product → Webhooks → Set up → Instagram**.
   - Callback URL: the worker URL from step 3.
   - Verify token: the exact same string you put in `IG_VERIFY_TOKEN`.
   - Click **Verify and Save**.
   - Under **Subscription fields**, tick **comments**.
5. For **each** Instagram account, subscribe it to your app so it actually sends the webhook events: in **Graph API Explorer**, select your app, pick that account's Page access token (from Part 2), and run this as a POST request: `{ig-user-id}/subscribed_apps` with parameter `subscribed_fields=comments`. Do this once for the English account and once for the Persian account.
6. Test it: comment "WHALE" (or "نهنگ") on any post from that account (from a *different* Instagram account, e.g. your personal one) and check you receive a DM within a few seconds.

**Note:** `instagram_manage_comments` / `instagram_manage_messages` work without extra review while your accounts are added as testers on your own app (same as the rest of this bot). If Meta ever asks you to submit the app for **App Review** before this keeps working at scale, that's a Meta policy checkpoint, not something in our code — tell me if you see that prompt and I'll help you fill out the review form.

---

## Growth notes (what's automated vs. what's on you)

- **Hook in the first 2 seconds**: done — every reel opens on the whale emoji + headline immediately, no slow intro.
- **Voiceover + synced on-screen subtitles**: done — free neural TTS narrates the real numbers, and the exact same sentence is captioned on screen in sync, so it plays well with sound on or muted.
- **Comment challenge + auto-DM**: done, see Part 8.
- **Best posting times**: set from general finance/Reels benchmarks (Part 7); plan to re-check after 2 weeks using your real Insights.
- **3–5 relevant hashtags**: done, per post.
- **Trending audio**: **not automatable.** Instagram's trending-audio library is only reachable from inside the Instagram app's own editor, not through the Graph API — there's no way for a script to attach it. Since reels now carry a real voiceover, this matters less than it would for a silent video; if you still want a trending track layered in, the only option is manually swapping/adding audio on a published Reel afterward (Reel → ⋯ → Edit → change audio).
- **AI-generated-content label**: **reconsider this one now that voice is in the mix.** With text-only videos, off was clearly right (no synthetic face or voice at all). Now that every reel includes a synthetic narrator voice, Instagram's disclosure policy may expect the "AI-generated content" toggle on — it's not impersonating a real person, but it is synthetic audio, which some of Meta's transparency rules cover on their own. I'd rather flag this honestly than guess: when you're in Part 5 testing a video, check Instagram's current in-app guidance on the label (it sometimes prompts automatically for AI voice) and tell me what it says — I can add a flag to the publish step to set the label automatically if you'd rather not do it by hand each time.

---

## How it avoids repeating itself

Each pipeline keeps a small memory file (`instagram-bot/state/en/` and `state/fa/` in this repo) of exactly which whale trades and tokens it has already posted, and which site section it showed last. It never reuses the same whale event twice, and it rotates through the four site sections in order. You don't need to manage this — the workflow updates it automatically after every run.

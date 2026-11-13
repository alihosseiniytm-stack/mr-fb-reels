# Reference style: "Why Did Humans Start Wearing Clothes?" (Relic Explains) - owner pick 2026-11-04
Source: https://youtu.be/H_j0YTL_hwM (channel Relic Explains, 19.5K subs, 5.5M views in 4 weeks, 494 s = 8:14).
Studied by vizier 11 on 2026-11-04T15:00Z from the YouTube storyboard (99 frames, 1 per 5 s; no audio, captions blocked).
PURPOSE: workers read THIS file instead of opening YouTube again (saves tokens). We copy the METHOD, never their art, characters or text (own style + own character, R60).

## Owner rule (2026-11-04T14:55Z)
EVERY picture must match what the voice says at that moment. Talk about a hammer candle -> show a hammer candle. A random or loosely related photo = fail.

## What the video does (measured from the frames)
1. **A new picture about every 5 s.** In 99 storyboard frames almost every frame is a different picture; the same picture rarely stays longer than ~10 s.
2. **Each picture = the exact noun or idea of the sentence.** Seen: "needle" -> one big needle with the word NEEDLE under it; "lice" -> a big louse + the word LICE; "Morocco" -> a map with Morocco marked; "skin" -> a skin texture band with the word SKIN; "no wardrobe" -> bear, bird, snake, crab + the words NO WARDROBE; "3 clues" -> 3 magnifying glasses, each with one clue inside; "DNA" -> a DNA helix; "sun vs cold" -> a balance scale with sun (check) and snowflake (X).
3. **Four picture types, mixed:**
   - a) **Keyword / number card:** big white words or a number on a plain navy (#1f2a4a-ish) or orange background + one tiny icon. E.g. "WHY?", "~107,000 YEARS", "170,000?", "1.2 MILLION YEARS AGO", "90,000-120,000 YEARS", "5,300 YEARS AGO". Used for every number, date and question.
   - b) **Object close-up on a flat colour:** one object, centred, sometimes with a label (needle, louse, coat, shoe, beanie). Used when the sentence names a thing.
   - c) **Simple diagram:** arrows, X marks, check marks, Y-shaped family tree, before -> after arrow, timeline bracket, scale, magnifying glass, X over an item = "not this".
   - d) **Scene with characters:** flat cartoon people (round heads, dot eyes, thin lines) in a simple background (savanna, cave, snow, village, lab). The SAME few characters return (a scientist woman with a magnifier; a bearded cave man), so the viewer follows a "story".
4. **One fixed style for the whole video:** flat 2D cartoon, thick dark outlines, no gradients, soft flat colours, white or plain backgrounds, no photos, no stock footage. Consistency is what makes it look "pro".
5. **Hook first:** the first ~25 s = everyday scene (person at door, street of people) -> "animals have no wardrobe" -> "WHY?" card -> "3 clues" card -> "at the end..." (a door) = promise of a payoff at the end.
6. **Payoff at the end:** returns to modern people (puffer jacket, boots, beanie in a speech bubble) and an emotion close-up (blushing face) = ties the history to the viewer's life.
7. Motion (from frames, E): mostly still pictures with small moves (zoom/pan, items popping in); X marks and arrows appear as the voice says them.

## How we apply it to MarketRadar (v6 plan, vizier 11; build waits its lane, see THE BOOK owner line 2026-11-04T14:55Z)
Per sentence of the script, one tagged visual, changed every 3-6 s:
- (1) **Code-drawn exact diagram** for every trading term: hammer candle (small body top, long lower wick, label + arrows), doji, engulfing, RSI line with 30/70 zones, MACD cross, support/resistance lines, liquidation cascade arrows. Drawn by our renderer = always exact, free.
- (2) **Our real chart** with the pattern highlighted (circle + label) when the voice says "here BTC made a hammer".
- (3) **Keyword / number card** for every number, price, %, date, question (type a above).
- (4) **Scene** in ONE own cartoon style with OUR own recurring character (e.g. a small trader + a whale), from a free image model (test live first: Cloudflare Workers AI flux, Gemini image, HF Spaces; R61), fixed style prompt + seed.
Gate idea (for v2/standards-check.mjs): every sentence has a visual whose tag matches its keyword; no visual longer than 6 s; one style per video; no unrelated photos.

## Video kinds this style fits
Education (candles, indicators, risk), whale stories (whale = recurring character), and FUN Shorts (owner YES 2026-11-04T15:20Z: funny but true, real data, own characters, CTA, 1-2 per week).

## v6 METHOD (built 2026-11-12 by worker t50-08-v6, owner D178; this is the binding recipe for ALL educational videos)
1. **Script = short sentences** (<= ~13 words, so one shot lasts 3-6 s). One sentence = one step = one picture. The picture shows the exact noun/idea of that sentence (hammer -> a drawn hammer candle; "sellers pushed down" -> red arrow down the wick; "buyers won" -> tug of war won by the green team).
2. **Four picture types only** (v2/v6-draw.mjs): (a) code-drawn exact DIAGRAM for every trading term (hammer parts, 2x wick ratio, push arrows, downtrend, confirmation, stop loss, candle anatomy, look-alikes with check/X); (b) our REAL CHART (real BTC candles at render time, the pattern circled, low/close price pill, "N candles later" arrow); (c) KEYWORD/NUMBER CARD on navy with one big icon (every number/term/question); (d) simple SCENE with our own recurring trader (round head, dot eyes, teal shirt) and our own whale.
3. **One fixed style**: navy #1d2748 frame, cream #f6efe2 panel, thick #121826 outlines, flat green/red/yellow, Vazirmatn Bold; no gradients, no photos, no AI frames. Every frame carries the on-screen keyword (yellow, under the panel on Shorts; right column on long videos = no empty column).
4. **Motion** = slow zoom/drift per shot (v3 motionClip), burned word captions, -14 LUFS. No AI animation (D178: free AI animation failed).
5. **Gate before upload**: v2/shotlist-gate.mjs (tags in sentence, keyword shares a word/number, every spoken number on screen, shot 1-6 s, no repeated picture) + standards-check rule i + similarity gate.
6. **Honest data**: the real example is searched in live candles (daily first, then 4h) with the same rule we teach (lower wick >= 2x body, tiny upper wick, after a fall, next candle closes higher); the result N candles later is said as it is, up OR down ("a clue, never a promise").

## Research log (t50-08-v6, 2026-11-12)
- [V] 16:15Z: reopening youtu.be/H_j0YTL_hwM in the built-in browser -> YouTube "Sign in to confirm you're not a bot" on play; stopped (no bypass, R11). The 11-04 storyboard study above stays the source; no new frames were taken.
- [V official] developers.cloudflare.com/workers-ai/platform/pricing (16:20Z): free 10,000 neurons/day; flux-1-schnell = 4.80 neurons per 512x512 tile + 9.60 per step (~58 neurons for a 1024x1024 4-step image = ~170 free images/day). NOT tested: this task's budget is 0 Cloudflare requests and the brief puts code-drawn SVG first; plan B (100% code-drawn) is what v6 uses. HF/Gemini image APIs not tested (need keys) [U].
- [V measured] live BTC candles 2026-11-12: 8 daily hammers in 400 days, none both after a fall AND confirmed by the next close -> the lesson falls back to 4h candles (Nov 8 hammer, low $75,640, close $75,907, 5 candles later -1.4%). Kept as is (honest), the voice says "lower".
- [E] Why code-drawn beats an image model here: exact shapes (a model draws wrong candles/wicks), same style every time, 0 cost, no keys, renders on the GitHub runner.

## v6b additions (t50-08-v6b, 2026-11-12, owner D186-D190, D195/D196)
- Recurring character = our own woman analyst (option B, design/mascot/mascot_options_v1.svg), code-drawn layered puppet; sheet samples/v6/mascot_sheet.png (12 poses x 4 outfits, mouth 0/1/2, blink, 4 props). [V] built + tested 2026-11-12.
- Pose by meaning of the sentence (rule list in v6-mascot.mjs RULES; lesson can override with step.mascot). Outfit fixed per video, rotates by topic.
- Real chart: the circled candle must pass the strict pattern rule (v6-patterns.mjs); same rule is on screen in words. [V] tests 73/73.
- Applies to EVERY posted video (D195): YouTube long + Shorts, data Shorts, TikTok, Facebook, Instagram Reels; R65 gate enforces it in CI.

## v6c additions (t50-08-v6c, 2026-11-12)
- Strip review of run 43315493450: hook/clue scenes showed a hammer in a shooting-star lesson (picture did not match the voice). Rule: a scene showing "this pattern" draws the lesson's own pattern (scene args.key, v6-draw.mjs miniPattern).
- Non-candle types (indicator, whale_week, coin, replay, safety, recap) still need v6 lessons, same pattern as v6-candles.mjs; then add their keys to READY in v6-pick.mjs.
## v6d/v6e additions (t50-08-v6d + t50-08-v6e, 2026-11-13)
- v6d built the other weekday lessons in v2/v6-types.mjs + indicator maths in v2/v6-ind.mjs (pictures: chart ind/price/whales/split/movers, scene obj with ~30 own objects). Venue names never in voice/description (recap run 43351781506 failed standards rule c).
- v6e strip review of recap run 43355811587: the NOW price pill was hidden under the WEEK LOW pill (price near the low) and mover % labels ran together -> fixed in v6-draw.mjs (label collision avoidance, font fits slot). Live-data plan check found 2 sentences that broke the 6 s limit only for some numbers (recap + whale_week long/short counts) -> shorter wording.
- Safety lessons failed standards rule a (no real numbers, run 43351814952) -> each now says 2-3 public, sourced numbers (FBI IC3 2024 report, Scam Sniffer 2024, Chainalysis 2025, CoinGlass 2025-10-10 liquidations, Microsoft Research 2023 MFA study).
- Actions lesson: yt-v2 has concurrency group yt-v2 (cancel-in-progress false) = 1 running + 1 pending; a NEW dispatch replaces (cancels) the pending one. Dispatch the next render only when nothing is pending, and never near the 15:00Z/21:00Z crons (a dispatch then would cancel the pending cron run).
- v6f (2026-11-13) strip review: labels must never clip (narrow bar -> label outside), generic icons carry no fixed numbers (seesaw 'x10' vs voice '5x'), long keyword font sized for wide caps (fit 0.68). Green re-renders: whale_week 43381625664, coin_btc 43384501037, replay 43395660247.

# Site speed review and plan, 24 September 2026

This replaces the 23 September plan, which stays in git history. Gzip is left out, as asked.

## Status

### Live since 24 September (PR #24)

Self-hosted fonts, right-sized WebP images, versioned CSS and JS with a year-long cache, and longer stale serving on the offer page and chat status.

Measured on the live site: Lighthouse mobile, median of three runs, same setup as the review below (Google Tag Manager and Maps blocked by the test environment in both).

| Page | Score | First paint | Main content (LCP) |
|---|---|---|---|
| Home | 81 to 91 → 95 | 2.6 s → 1.3 s | 3.7 s → 2.5 s (runs: 2.39, 2.46, 2.50) |
| Book | 87 to 99 → 95 to 100 | 2.8 s → 1.6 s | 3.1 s → 2.2 s |
| Contact | 89 to 99 → 99 to 100 | 2.7 s → 1.2 s | 3.0 s → 1.6 s |
| Knee pain | 89 to 98 → 96 to 99 | 1.8 s → 1.3 s | 1.9 s → 2.0 s |

Homepage download: 431 KB → 253 KB. Every page now loads from one server before Tag Manager, down from three.

The homepage sits right on the 2.5 s line with no margin, and real visitors also load Tag Manager. The largest remaining delay is style.css (about 0.3 s). The next lever is the Tag Manager check in `docs/owner-actions.md`.

### Second round (this branch)

- **Homepage map loads on request.** A "Show the map" tile replaces the embed. The embed loads in the same box when tapped, tracked as `map_open`. The contact page keeps its map loaded as normal, because people go there to find the clinic. Without JavaScript the tile opens Google Maps.
- **Unused files removed:** `logo-cream.svg`, `hero-rehabilitation-richmond-640.webp`.
- **Lockfile resynced** with package.json.
- **`docs/owner-actions.md`** covers the Google Analytics setup, the Tag Manager check, the offer launch checks, Search Console and directory listings.

### Looked at and left alone

- **Ask button shift.** The phone bar's Book button narrows when the chat check returns. It scores 0.012, a tenth of Google's limit, on the first page of a visit only. Fixing it needs either a blank slot whenever the chat is off or a build step tied to the API key.
- **Overlapping phone CSS at 820 and 900px.** Rendered every width from 820 to 901px: the layout switches cleanly at 901px with no overlap or sideways scroll. Merging the rules risks tablet regressions for no visible gain.
- **Logo SVG.** Optimising it saves 0.4 KB after compression and changes the rendering slightly at large sizes.
- **Content Security Policy.** Needs the inline click handlers rewritten first. Security headers are already in place.

---

*The review below was written before items 1 to 4 were built. Its figures describe the live site as it stands today.*

## What changed since 23 September

Main now has the left slide-out menu, the chat assistant, six body-area pages and body-area links on the homepage.

| File | 23 Sept | Now | Over the wire now (Brotli) |
|---|---|---|---|
| style.css | 72 KB | 86 KB | 22 KB |
| script.js | 12 KB | 17 KB | 6.5 KB |
| site-config.js | 11 KB | 11 KB | 4.5 KB |
| chat.js | none | 18 KB, on 22 pages | 6.6 KB |
| Homepage HTML | 33 KB | 37 KB | 10 KB |

- The chat adds a third script to every page except the ad landing pages, and one status request to `/api/chat` per visit (cached in the tab for 10 minutes).
- **None of the speed items from the 23 September plan are in yet.** Fonts still come from Google, CSS and JS still revalidate on every view, images are unchanged.
- **Net effect on Pingdom:** one more script on every page and one more file failing the Expires rule. Expect those two grades to hold or slip, not improve.

## How this was checked

- Headless Chromium request log for the homepage and the knee pain page, scrolled to the bottom.
- Lighthouse 12, mobile, three runs each on the homepage, knee pain and book pages, two on contact. Medians below.
- CSS coverage per page: how much of style.css each page uses.
- Test conversions of the heavy images with `sharp`, so the savings below are measured, not guessed. I checked the converted hero by eye.
- **Limits.** The sandbox blocked Google Tag Manager and Google Maps, so every number here excludes them and real scores will run a little worse. Tests ran from a data centre through a proxy, not from Melbourne. Lighthouse also flagged "requests not served over HTTP/2": that is my proxy, not the site. Vercel serves HTTP/2. Run PageSpeed Insights yourself for the official figures.

## Where the site stands (Lighthouse mobile, median)

| Page | Score (3 runs) | First paint | Main content (LCP) | Layout shift |
|---|---|---|---|---|
| Home | 81 to 91 | 2.6 s | **3.7 s** | 0 |
| Knee pain | 89 to 98 | 1.8 s | 1.9 s | 0.044 |
| Book | 87 to 99 | 2.8 s | **3.1 s** | 0 |
| Contact (2 runs, slower shown) | 89 to 99 | 2.7 s | **3.0 s** | 0.014 |

Google counts LCP under 2.5 s and layout shift under 0.1 as good. Home, book and contact miss the LCP target. Lighthouse's breakdown gives two causes:

1. **Render-blocking CSS.** Nothing paints until two stylesheets arrive. The Google Fonts one costs the most (Lighthouse estimates 0.8 s) because it needs a connection to a second server, and it sends the browser to a third for the font files. style.css adds 0.4 to 0.6 s.
2. **The homepage hero image.** It's the LCP element. Most phones have a pixel density high enough to skip the 640px file and download the 1000px one, which is 138 KB.

The body-area pages are fine. No hero photo, so they paint as soon as the CSS lands.

---

## Pingdom grades

### Add Expires headers (F)

**Failing on every page:** style.css, script.js, site-config.js, chat.js (new), the Google Fonts CSS and gtm.js. book.html adds campaign.js.

**Why they're set to zero.** The filenames never change. A long cache on an unchanging filename leaves returning visitors on old CSS after a deploy. Zero is the safe setting until files carry a version.

**Fix: stamp versions at deploy.**

1. Add `tools/stamp-assets.js`, no dependencies. It hashes style.css, script.js, site-config.js, chat.js and campaign.js, then rewrites every reference in the HTML to `style.css?v=3f9a1c2e`. That includes `new-patient-offer-source.html`, which the offer function reads.
2. `package.json` now exists, which makes this simpler than it was yesterday. Add `"build": "node tools/stamp-assets.js"`. Vercel runs a build script when one is present on a project with no framework. Confirm that on the first preview.
3. In `vercel.json`, CSS and JS requests carrying `?v=` get `public, max-age=31536000, immutable`. Requests without it keep `max-age=0`. A missed reference means a slower page, never a stale one.
4. Self-hosting the fonts (below) removes the Google Fonts CSS from the list.
5. gtm.js stays flagged. Google sets that header.

**Test on a Vercel preview first:** pages render with stamped URLs, `/new-patient-offer` still renders, the chat still reads pages (`api/chat.js` reads `*.html`; query strings in script tags won't matter, but check), headers correct for both stamped and unstamped requests.

**Expected:** F to B or C. What remains is Google's. Real visitors skip four or five round trips on every page after the first. Lighthouse puts it at 58 KB of avoidable downloads on a repeat visit to the homepage.

### Make fewer HTTP requests (C)

**Scripts per page:** site-config.js, script.js and chat.js is three of our own. YSlow allows three before it starts deducting, so the chat took us to the limit before GTM adds anything.

**Fix, in order of value:**

1. **Audit the GTM container.** Still the biggest unknown. List every tag and trigger, delete what's unused. Needs your login.
2. **Self-host the fonts.** One stylesheet fewer (details under DNS).
3. **Join site-config.js and script.js into one file at build.** The build step from the Expires fix does it. Keep site-config.js as the file you edit. Keep chat.js separate, because the ad landing pages (landing.html, physio-richmond, new-patient-offer) leave the chat out, and they should stay that way. One request fewer per page. Low value yesterday, worth it now that chat.js pushed the count up.
4. **Put the Google Map behind a click** on the homepage and contact page. It's lazy-loaded, so Pingdom likely never sees it. Visitors who scroll pay for it: a Maps embed typically pulls 30 or more requests from four or five Google servers (typical, not measured; the sandbox blocked it). Show a static image with "Show map" and "Get directions" buttons. On a phone the directions link opens the Maps app, which is what most people want anyway.

**Expected:** C to A or B, depending on the GTM audit.

### Reduce DNS lookups (B)

**Unchanged since yesterday.** Four servers before GTM: www.bridgeroad.physio, fonts.googleapis.com, fonts.gstatic.com, www.googletagmanager.com. GTM's tags add more.

**Fix: self-host the fonts.**

- Serve the two woff2 files (DM Sans and Playfair Display, latin subset) from `/fonts/`.
- Put the `@font-face` rules at the top of style.css. Preload both files.
- Delete the two `preconnect` tags for Google Fonts.
- Both fonts are under the SIL Open Font Licence, which allows self-hosting.

This fix does four jobs at once: two servers fewer (DNS), one stylesheet fewer (requests), one less file failing Expires, and the largest render-blocking delay gone (about 0.8 s by Lighthouse's estimate). It also trims the small layout shift on the body-area pages, where headings reflow when the web font arrives late.

**Expected:** B to A.

---

## Beyond Pingdom: what moves real load time

Pingdom's rules ignore file size. Phones on 4G don't.

### Images (measured on test conversions)

| Image | Now | Converted | Where it matters |
|---|---|---|---|
| Hero, uplift-gym-rehabilitation-richmond.webp | 138 KB | 71 KB at 1000px, 46 KB at 800px | **Homepage LCP on phones** |
| Hero, 640px version | 48 KB | 39 KB | Small phones, desktop |
| Thihan portrait, JPEG, 895×1124 | 153 KB | 63 KB at 900px, 31 KB at 600px | Homepage, shown at about 376px wide on a phone |
| Entrance photo, JPEG, 1200×900 | 198 KB | 116 KB at 1200px, 59 KB at 800px | Homepage and contact |
| 8 cricket logos, PNG | 200 KB total | 59 KB as WebP | Homepage trust strip, about page |

- Add the 800px hero to both the `srcset` and the preload's `imagesrcset`.
- Give the portrait and the entrance photo a `srcset` with both sizes.
- Keep the portrait JPEG on the server: the schema markup and a redirect point at it.
- Logos: lossy WebP at quality 85 is 70% smaller. Check the edges on the white tiles before shipping. Lossless WebP only saves 29%.

**Total:** about 380 KB less on a modern phone that scrolls the homepage, assuming the phone picks the larger size of each image.

### Ad landing page: keep it served from cache

`/new-patient-offer` is rendered by a function and cached at the edge for 5 minutes, plus 60 seconds of stale serving. With ad traffic at clinic scale, most clicks arrive after that window closes and wait for the function. One uncached request measured 0.85 s to first byte, against 0.28 s for a static page.

- **Fix:** keep `s-maxage=300`, raise `stale-while-revalidate` from 60 to 86400. The edge serves the cached page instantly and refreshes it in the background.
- **Trade-off:** after the offer ends at midnight on 1 December, the first visitor after a quiet spell sees the offer page once more. The offer terms already require attendance by 30 November, so the reasoning in the function's own comment still holds.
- Apply the same change to the `GET /api/chat` status check. The Ask button appears sooner and the function runs less often.

### Ask button nudges the phone bar

The Ask button appears after the status check and pushes the Book button across. Measured layout shift: 0.012. Total shift stays well under Google's 0.1 limit. Reserving the button's space in CSS fixes it. Low priority.

### What not to do

- **Split style.css per page.** Each page uses 17 to 31% of it, and Lighthouse flags 15 to 18 KB unused. Once the file caches for a year, it costs one download per visitor. Hand-splitting styles across 25 pages isn't worth the upkeep.
- **Minify CSS and JS.** Lighthouse estimates 13 KB before compression, a few KB after Brotli. It would add a dependency to the build. Skip for now.
- **The forced reflow in script.js.** The header setup reads the scroll position at load: 41 to 74 ms under throttling. Total Blocking Time is 0 ms. Leave it.
- **Logo sprites.** Saves requests, tangles the per-logo links. WebP fixes the real problem, which is weight.

---

## Order of work

| # | Change | Fixes | Effort | Risk |
|---|---|---|---|---|
| 0 | Expand the Pingdom rows and note the page tested | Confirms the diagnosis | 2 min | None |
| 1 | Self-host fonts, preload them, drop Google Fonts preconnects | First paint, DNS, requests, Expires | 1 hour | Low. Check headings and body text look the same |
| 2 | Right-sized WebP for hero, portrait, entrance photo and logos | Homepage LCP, about 380 KB | 1 to 2 hours | Low. Visual check of each image |
| 3 | Build step: version stamps, 1-year cache, join site-config.js and script.js | Expires, requests | 2 to 3 hours with preview testing | Medium. First build step on the project |
| 4 | Longer stale-while-revalidate on the offer page and chat status | Ad click load time | 15 min | Low |
| 5 | GTM container audit | Requests, DNS | 30 min | Low. Needs your login |
| 6 | Map behind a click on home and contact | Requests for visitors who scroll | 1 to 2 hours | Low. Homepage map is a content call |
| 7 | Reserve space for the Ask button | Layout shift | 15 min | Low |

Items 1 to 4 need no decisions from you. Items 5 and 6 do.

**What to expect.** Lighthouse's own estimates suggest items 1 and 2 bring the homepage close to the 2.5 s LCP target. I'll verify that on a preview rather than promise a number, because the test variance here is large (the homepage scored anywhere from 81 to 91 on identical runs).

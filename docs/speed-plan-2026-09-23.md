# Site speed plan, 23 September 2026

Plan only. Nothing on the site changed. This file is the only addition.

The four grades and their wording come from YSlow, Yahoo's 2007 ruleset. Pingdom's speed test still grades with it. (Assumption: the "Improve page performance / GRADE / SUGGESTION" layout is Pingdom's.) The rules predate HTTP/2 and Brotli, so some grades measure the wrong thing. The plan below separates real problems from false alarms.

## How this was checked

- Loaded the live homepage in headless Chromium at 1366px wide, scrolled to the bottom, and logged every request with its encoding and cache header.
- Fetched each first-party file with `curl`, once accepting Brotli and once accepting gzip only.
- Read `vercel.json`, the page heads, `style.css` and the Vercel project settings (framework "Other", no build step).
- **Gap:** the sandbox blocked `googletagmanager.com` and `google.com`. GTM and the Maps embed are not in the numbers below. What this plan says about them comes from Google's usual behaviour and from YSlow's scoring, not from a measurement.

## What the homepage loads today (measured)

23 requests before GTM. 3 hosts before GTM.

| File | Size | Encoding | Cache |
|---|---|---|---|
| HTML | 33 KB | br | `max-age=0` (correct for HTML) |
| style.css | 72 KB | br | `max-age=0` |
| script.js | 12 KB | br | `max-age=0` |
| site-config.js | 11 KB | br | `max-age=0` |
| Google Fonts CSS | 10 KB | gzip | 1 day, from fonts.googleapis.com |
| 2 font files | 75 KB | none needed (woff2) | 1 year, from fonts.gstatic.com |
| 15 images + favicon | 812 KB | none needed (webp/jpeg/png) | 7 days |

Of the 812 KB of images, 564 KB is three groups: the entrance photo (202 KB JPEG), Thihan's portrait (157 KB JPEG) and the eight cricket logos (205 KB of PNG).

## Why the grades come out as they do (inference)

YSlow's open-source rules take points off per failing file: 11 per file for gzip and for Expires, 4 per script over three, 5 per host over four. Below 50 is F. Pingdom does not publish its exact version, so treat the arithmetic as a guide.

- **Gzip, F.** YSlow looks for `gzip` or `deflate` in the response header. Our files say `br` (Brotli). HTML, style.css, script.js, site-config.js and gtm.js makes five "uncompressed" files, 55 points off, F. The numbers fit.
- **Expires, F.** style.css, script.js, site-config.js, the Google Fonts CSS (1 day is under YSlow's 2-day bar) and gtm.js. Five files, F. Also fits.
- **Requests, C and DNS, B.** Our own files put us at three scripts and four hosts, which would score A on both. A C and a B mean GTM loads several more scripts from two to four more hosts. The GTM container holds more than we think.

**First step, two minutes:** expand each row in the Pingdom report. It lists the offending files. That confirms or kills each inference above before any work starts. Also note which page you tested; this plan assumes the homepage.

---

## 1. Compress components with gzip (F): false alarm

**Fact.** Every text file on the site is compressed. Vercel sends Brotli to browsers that accept it and gzip to those that accept only gzip. Both tested. Brotli usually produces smaller files than gzip on text.

**Action.** None. Do not force gzip. It would slow real visitors to satisfy a rule written before Brotli existed. As far as I know Vercel offers no switch for this on static files anyway (unverified).

**Expected grade.** Stays F on Pingdom. PageSpeed Insights (Lighthouse) checks the same thing under "Enable text compression" and understands Brotli. Use it as the reference.

## 2. Add Expires headers (F): real, fix it

**Fact.** CSS and JS go out with `max-age=0, must-revalidate`. Every page view asks the server whether the file changed before using the cached copy. That costs a round trip per file on every page after the first.

**Why it's set to zero.** The filenames never change. A long cache on an unchanging filename leaves returning visitors on old CSS after a deploy, with a broken layout. Zero is the safe setting until files carry a version.

**Fix.**

1. **Stamp versions at deploy.** Add `tools/stamp-assets.js`, no dependencies, same style as the tests. Vercel runs it as the build command. It hashes style.css, script.js, site-config.js and campaign.js, then rewrites every reference in the HTML to `style.css?v=3f9a1c2e`. Files in git stay as they are. Nobody has to remember to bump a version.
2. **Cache stamped files for a year.** In `vercel.json`, CSS and JS requests that carry `?v=` get `public, max-age=31536000, immutable`. Requests without `?v=` keep `max-age=0`. If the script misses a reference, that page is slower, never stale. It fails safe.
3. **Self-host the fonts** (section 3). Removes the 1-day Google Fonts CSS.
4. **Leave images at 7 days.** They already pass YSlow's 2-day bar. They are not versioned, so a photo replaced under the same filename sticks for up to a week. Keep the habit of a new filename for a new photo.
5. **GTM stays flagged.** Google sets that header. Nothing to do.

**Risk.** This adds the first build step to a site that has none. Test on a Vercel preview before production:

- every page renders with stamped URLs
- `/new-patient-offer` still works (its function reads `new-patient-offer-source.html` through `includeFiles`, and that file needs stamping too)
- response headers are right for stamped and unstamped requests

**Rejected alternative.** Stamping in git with a script and a test. One forgotten run leaves returning visitors on old CSS for up to a year, and there is no CI to catch it.

**Expected grade.** F to B or C. What remains is Google's files.

## 3. Make fewer HTTP requests (C): mostly GTM

**Fact.** YSlow counts scripts, stylesheets and CSS background images. Regular images don't count. We have two stylesheets, no CSS background images and two scripts of our own. The rest comes through GTM.

**Fix, in order of value.**

1. **Audit the GTM container.** Open Tag Manager, list every tag and its trigger, delete anything unused. Each tag is another script and often another host. `CAMPAIGN.md` still lists the GA4 tag as a to-do, so whatever is loading today deserves a look. Needs your login.
2. **Self-host the two fonts.** Put the `@font-face` rules at the top of style.css, serve the woff2 files from `/fonts/`, and preload the two used above the fold. This removes the Google Fonts CSS request. The bigger win for real visitors: it removes a render-blocking chain across two other hosts (HTML, then fonts.googleapis.com CSS, then fonts.gstatic.com font). Text appears sooner on a first visit. Playfair Display and DM Sans are both under the SIL Open Font Licence, which allows self-hosting.
3. **Put the Google Map behind a click.** The homepage and contact page embed a live map. It's lazy-loaded, so the test at the top of the page likely never loaded it. Visitors who scroll pay for it: a Maps embed typically pulls 30 or more requests from four or five Google hosts (typical, not measured here). Replace it with a static image and two buttons, "Show map" and "Get directions". The iframe loads on click. On the homepage, consider dropping the map and linking to `contact.html#getting-here`, which already has one. That's a content decision for you.
   - Trade-off: one extra tap for anyone who wants the live map. Most visitors want directions, and on a phone a Google Maps link opens the app, which does that job better than an embed.
4. **Optional: serve site-config.js and script.js as one file.** The build step from section 2 joins them. Keep site-config.js as the file you edit. Saves one request per page. Under HTTP/2 the real gain is small. Worth doing only because the build step already exists.

**Skip:** combining the eight logos into one sprite. It saves seven requests but tangles the per-logo links in the marquee and makes adding a logo harder. Under HTTP/2 the requests are cheap. Their weight is the issue (section 5).

**Expected grade.** C to A or B, depending on what the GTM audit removes.

## 4. Reduce DNS lookups (B): fonts plus GTM

**Fact.** Our pages use four hosts before GTM: www.bridgeroad.physio, fonts.googleapis.com, fonts.gstatic.com and www.googletagmanager.com. GTM's tags add more (inferred from the grade).

**Fix.** Self-hosting the fonts removes two hosts. Delete the two `preconnect` tags for Google Fonts at the same time. The GTM audit and the map click-to-load keep the rest down.

**Expected grade.** B to A.

## 5. Not graded, biggest real-world win: image weight

YSlow ignores file size. Real visitors on phones don't.

| Image | Now | Fix |
|---|---|---|
| img/entrance-uplift-gym-bridge-rd.jpg | 202 KB JPEG, 1200×900 | WebP |
| thihan-chandramohan-physiotherapist-richmond.jpeg | 157 KB JPEG, 900×1124 | WebP for the page. Keep the JPEG: the schema markup and a redirect point at it |
| 8 logos in logos/ | 15 to 38 KB PNG each, 205 KB total | WebP with transparency, same 160px height |

The rest of the site already uses WebP. Expect roughly half to two thirds off these files (estimate, confirm after conversion). The hero is already WebP and preloaded, so this won't move Largest Contentful Paint much. It cuts data use and frees bandwidth for the files that matter during load.

## 6. Measure before and after

- Pingdom: same page, same test location, before and after. Keep screenshots of the expanded rows.
- PageSpeed Insights, mobile, for the homepage, services.html and book.html. It measures Core Web Vitals, which Google uses in ranking. Record Largest Contentful Paint for each.
- book.html needs its own run. The Halaxy widget adds another host and its own scripts, and campaign.js loads there.

---

## Order of work

| # | Change | Fixes | Effort | Risk |
|---|---|---|---|---|
| 0 | Expand the Pingdom rows, confirm the page tested | Confirms the diagnosis | 2 min | None |
| 1 | Self-host fonts, drop Google Fonts preconnects | DNS, requests, Expires | 1 hour | Low. Check headings and body text look the same |
| 2 | Deploy-time version stamp and 1-year cache for CSS and JS | Expires | 2 to 3 hours with preview testing | Medium. First build step on the project |
| 3 | GTM container audit | Requests, DNS | 30 min in Tag Manager | Low. Needs your login |
| 4 | Map behind a click on home and contact | Requests and hosts for visitors who scroll | 1 to 2 hours | Low. Homepage map is a content call |
| 5 | Two JPEGs and eight logos to WebP | Page weight | 1 hour | Low |
| 6 | Join site-config.js and script.js at build | One request per page | 30 min | Low. Low value |
| - | Gzip | Nothing to fix | - | - |

**What not to chase.** Gzip over Brotli. Logo sprites. An A on every row. GTM will keep Expires and requests off A, and the tracking is worth more than the letter.

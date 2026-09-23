# Bridge Road Physiotherapy site audit, 23 September 2026

Phase 1. Read only. Nothing on the site changed. This file is the only addition.

## How this was checked

- Read every HTML page, `style.css`, `script.js`, `site-config.js`, `vercel.json`, `robots.txt`, `sitemap.xml` and `PHOTO-GUIDE.txt`.
- Parsed every JSON-LD block (all 10 parse cleanly).
- Probed the live site with `curl` for redirects, URL variants and response headers.
- Rendered the homepage, services and contact pages in headless Chromium at 375px and 414px.
- There is no `CLAUDE.md` in the repo.

## Page map

| Page | Indexable | Purpose |
|---|---|---|
| `/` (index.html) | Yes | Home |
| services.html | Yes | All services on one page, five anchored sections |
| cricket.html | Yes | Cricket physiotherapy |
| about.html | Yes | Thihan |
| fees.html | Yes | Fees, rebates, appointment types |
| faq.html | Yes | 13 questions, FAQPage schema |
| contact.html | Yes | Map, arrival, transport, enquiry form |
| book.html | Yes | Halaxy widget |
| blog/ | Yes | Index, one article |
| blog/lumbar-stress-fast-bowlers/ | Yes | Article |
| terms, privacy, disclaimer, accessibility, cancellation | Yes | Policies |
| landing.html | noindex | Ad landing page |
| sessions.html | noindex | Old URL, 308 to fees.html via vercel.json |
| 404.html | noindex | Error page |

## Headline findings

1. **The brand-search problem is mostly not on the page.** Title, NAP, schema, canonical, sitemap and GBP link are already in decent shape. The likely causes sit off-site. See "Where the reviewer is wrong".
2. **The mobile "scrolling feel" has a clear cause.** 31 blocks on the homepage start invisible and slide in as you scroll. The hero headline takes about a second to appear. The header hides and reappears with scroll direction. Fixable in CSS and a few lines of JS.
3. **Mobile trust indicators are thin and partly hidden.** At 375px the fold shows an empty hero (still animating) and one and a half trust chips. The third chip sits off-screen in a sideways scroller. AHPRA registration and "inside Uplift Gym" are not above the fold.
4. **Four good photos sit in the repo unused.** Running assessment, Uplift Gym rehab, Thihan cricket assessment and a fast bowler image. The service page needs exactly these.
5. **GTM is not installed.** The brief says GTM-MZ36ZHQQ. No page loads it. Formspree is also no longer used: forms post to `/api/enquiry` (Resend). The brief is out of date on both.

---

## 1. Findability for brand searches

| # | Finding | Impact | Proposed fix |
|---|---|---|---|
| 1.1 | Homepage title is `Physio Richmond \| Bridge Road Physiotherapy`. Contains both required terms. The brand sits second. | Low | Change to `Bridge Road Physiotherapy \| Physio in Richmond, VIC`. Brand first helps brand queries and the snippet reads cleaner. |
| 1.2 | Homepage H1 "Get back to what matters to you." carries no brand or place. | Medium | Keep the line as a visual headline if you like it, but make the H1 carry "Bridge Road Physiotherapy, Richmond". Option: eyebrow becomes the H1 text, slogan becomes the sub. |
| 1.3 | NAP is consistent. Phone appears only as `0458 007 583` / `+61458007583`. Address only as `507 Bridge Road, Richmond VIC 3121`. Matches the GBP string you gave, bar "Road" vs "Rd" in Maps URLs, which is fine. | None | No change. Confirm the GBP itself says "Road" not "Rd". |
| 1.4 | Mobile topbar hides ", inside Uplift Gym". Mobile visitors see the street address without the landmark that tells them where to go. | Medium | Show "Inside Uplift Gym" on mobile. Shorten elsewhere. |
| 1.5 | `Physiotherapy` schema on the homepage is valid JSON and has name, address, geo, phone, URL, email. **Missing: opening hours.** Site copy says only "By appointment, with early and evening times". | High | Add `openingHoursSpecification` once real hours exist. `TODO(Thihan)`. Without hours, Google shows nothing or guesses. |
| 1.6 | `sameAs` has Instagram, LinkedIn (personal) and a Maps *search* URL. No Halaxy page. The Maps search URL is weaker than the listing's permanent CID URL. | Medium | Replace the Maps search URL with `https://maps.google.com/?cid=1065459174822192104` (decoded from the Place ID's hex form already in site-config.js; confirm it opens the listing). Add the Halaxy location page. Move Thihan's LinkedIn to the Person only. |
| 1.7 | Schema `image` is `logo-badge.jpg`. | Low | Use a real clinic or Thihan photo. Keep `logo` as the logo. |
| 1.8 | **No `Person` schema on about.html.** The homepage Person node has an `@id` pointing at `about.html#thihan`, but about.html defines nothing at that ID. | High | Add a Person block on about.html: name, jobTitle, image, `worksFor` → `#clinic`, `sameAs` LinkedIn, `identifier` AHPRA number PHY0001614815, `memberOf` APA only if confirmed. |
| 1.9 | Article schema author is a bare Person with no `@id`. Publisher is a separate `Organization` with og-image.jpg as its logo. None of it connects to the clinic node. | Medium | Point author at `about.html#thihan` and publisher at `/#clinic`. Use `logo.svg` or a PNG logo. |
| 1.10 | `robots.txt` and `sitemap.xml` exist and are correct. All 15 indexable pages listed. noindex pages correctly left out. | None | Minor: update lastmod dates when pages change. Article lastmod says 2026-07-14, article says reviewed 2026-09-15. |
| 1.11 | Canonicals present on every page, all `https://www.` absolute. Non-www 308s to www. | None | Good. |
| 1.12 | Duplicate URL variants return 200: `/index.html`, `/about.html/`, `/blog` and `/blog/index.html`. Every nav "Home" link points to `index.html`, not `/`. | Low | Canonicals already consolidate these. Still: change nav links to `/`, and add a 308 from `/index.html` to `/` in vercel.json. |
| 1.13 | `google-site-verification` meta exists on the homepage. Search Console is set up, or was. | Info | Check Search Console: is the homepage indexed? What queries show impressions? This is the fastest way to answer the reviewer's complaint with data. |

## 2. Duplicate content

Titles, meta descriptions and H1s are all unique across indexable pages. The only duplicate H1 is index.html and landing.html, and landing is noindex. That is correct.

The repetition that exists is short factual blocks repeated across pages:

| # | Block | Where | Impact | Proposed fix |
|---|---|---|---|---|
| 2.1 | Cancellation wording ("24 hours' notice... up to the full appointment cost... Genuine emergencies...") | book, fees, faq, cancellation, terms | Low | Keep the full text on cancellation.html. Elsewhere use one line and a link. |
| 2.2 | Parking and transport (trams 48 and 75, West/East Richmond stations, metered parking) | contact, faq | Low | FAQ answer becomes one sentence plus a link to contact.html#getting-here. |
| 2.3 | Appointment lengths | fees, faq | Low | FAQ answer points to fees. |
| 2.4 | "20+ years... 15+ years in elite sport" | index (twice), about, cricket, blog author box, meta descriptions | Low | Keep the fact. Vary the sentence around it. It reads as boilerplate when a visitor meets it four times. |
| 2.5 | Cricket section on services.html overlaps cricket.html (common injuries list, workload paragraph) | services, cricket | Medium | Cut the services.html cricket section to a two-line summary and a link. Let cricket.html own the topic. |
| 2.6 | Header, footer, topbar, mobile bar: identical on every page | all | None | Normal site chrome. Search engines discount it. Not a problem. |

## 3. Service pages

There is one services page (services.html) with five anchored sections, plus cricket.html. No standalone page per service.

**Checklist against services.html**

| Item | Present? |
|---|---|
| One H1 | Yes |
| Logical H2/H3 | Yes, one H2 per service |
| 2 to 3 sentence summary at top | Page intro yes. Per service, no. |
| Who this is for | Yes ("Who it suits") |
| What an appointment involves | Generic line per section. No detail. |
| FAQ | No |
| Booking CTA | Yes |
| Author byline | No |
| Last reviewed date | No |
| Images | **None** |
| Internal links to related services and articles | Only cricket → cricket.html. No article links. |

**Checklist against cricket.html:** H1, H2s, CTA and fees link present. No byline, no date, no FAQ, no image of Thihan working, and **no link to the fast bowler article**, which is the best supporting content on the site.

| # | Finding | Impact | Proposed fix |
|---|---|---|---|
| 3.1 | No images on services.html. Four relevant photos already in the repo, unused. | High | Place `running-assessment-uplift-gym-richmond.webp` (running), `uplift-gym-rehabilitation-richmond.webp` (gym), `thihan-chandramohan-cricket-sports-assessment.webp` (cricket.html hero or return-to-sport). Width, height, alt and lazy loading on each. |
| 3.2 | No byline or review date. | Medium | Add "Written by Thihan Chandramohan, Physiotherapist. Last reviewed 23 September 2026." under each H1. Link the name to about.html. |
| 3.3 | No per-service summary or FAQ. | Medium | Per section: a two-sentence summary, then "What the first appointment involves", then two or three questions real patients ask. Examples: "Do I have to stop lifting?", "Should I stop running?", "Do I need a scan first?". FAQPage schema only for questions visible on the page. |
| 3.4 | cricket.html does not link to the lumbar stress article. | Medium | Add a "Further reading" link from cricket.html and the services cricket section. |
| 3.5 | Split into separate pages per service? | Decision | My view: not now. You have one article and five services. Five thin pages would dilute the site. Build out the sections on services.html first. Split a service out only once it has its own article or two behind it. cricket.html is the model. |

## 4. Trust indicators (AHPRA-safe)

**What a 375px visitor sees before scrolling today:** topbar with street address, logo, a dark green hero with the eyebrow visible and the headline still sliding in at 200ms, the first trust chip ("20+ years in physiotherapy"), half of the second, and the Call/Book bar. The third chip is off-screen in a sideways scroller (content width 701px in a 375px viewport).

| # | Finding | Impact | Proposed fix |
|---|---|---|---|
| 4.1 | AHPRA registration appears only in the footer and on about.html. | High | Add "AHPRA registered physiotherapist" to the trust strip. |
| 4.2 | Trust strip scrolls sideways on mobile. Most visitors never swipe it. | High | Wrap into a 2 x 2 grid on mobile. Four items max. |
| 4.3 | Elite sport roles appear only as a logo marquee, below the fold. | Medium | One factual chip, e.g. "Physio roles with Cricket Victoria, Cricket Australia and BBL clubs". Wording to be confirmed. |
| 4.4 | "Inside Uplift Gym" missing from the mobile fold. | Medium | Put it in the hero eyebrow: "Physiotherapy in Richmond, inside Uplift Gym". |
| 4.5 | Rebates. The site says rebates are processed on the spot through Tyro Health. Not HICAPS. | Medium | Chip: "Health fund rebates on the spot". Confirm Tyro Health is still current. |
| 4.6 | APA membership not mentioned anywhere. | Decision | Add only if you are a current member. `TODO(Thihan)`. |
| 4.7 | AFL work mentioned once ("along with AFL environments") without detail. | Low | State it factually or drop it. `TODO(Thihan)`. |
| 4.8 | Reviews block is already the conservative option: heading, one line, "Read our Google reviews" button. | **Decision for you** | Keep as is. My recommendation: shorten the heading to "Google reviews" and move the link beside the trust strip so it is findable on mobile. No stars, no counts, no excerpts. |
| 4.9 | The dormant review renderer in site-config.js outputs star ratings and verbatim review cards if someone fills in the config. | Medium | Delete the renderer. Keeping it one edit away from an AHPRA breach is poor risk management. The decision note already says you chose not to use it. |

**AHPRA copy check.** No testimonials, no review text, no Review or AggregateRating schema, no "specialist" or "expert" titles, no "best" claims. Items to look at:

- **Team logos (Medium).** Club and governing body logos next to clinic advertising risk implying endorsement, and most sports bodies restrict logo use. The about page caption ("past and present professional engagements") helps. Safer: plain text list of roles with years. Confirm you hold permission for each logo. `TODO(Thihan)`.
- **"Experienced care, without the production line" (Low).** Implies other clinics run production lines. Mildly comparative. Suggest "Experienced care, one physio from start to finish."
- **Blog article outcome statements (Medium).** "Most of these injuries heal well when caught early", "the outlook is genuinely good", incidence and recovery figures attributed to "Australian Cricket research" and "Cricket Australia's own figures". These are fair summaries of the literature, but AHPRA expects claims about effectiveness to be supported by acceptable evidence. There are no citations. Add a short reference list. Mark for your clinical review.

## 5. Location and access

| Item | Homepage | Contact |
|---|---|---|
| Embedded map | Yes (official GBP embed) | Yes |
| "Get directions" button | **No**. `directionsUrl` exists in site-config.js but no page uses it. | **No** |
| "Open in Google Maps" link | Text link | Text link |
| Entrance photo | No | No |
| How to get in via Uplift Gym | One line | Yes, plus "no reception, take a seat" |
| Parking | Link only | Generic "metered and time-limited street parking" |
| Public transport | Link only | Trams 48 and 75, West/East Richmond stations |
| Hours | "By appointment" | "By appointment" |
| What happens on arrival | No | Yes |
| Step-free access | No | "Contact me before" |

| # | Finding | Impact | Proposed fix |
|---|---|---|---|
| 5.1 | No directions button. | High | Primary button "Get directions" using `directionsUrl`, on homepage and contact. Keep the map below it. |
| 5.2 | No entrance photo. First-time patients with no reception need it most. | High | Placeholder `img/entrance-uplift-gym-bridge-rd.jpg` with alt text. Photo needed. |
| 5.3 | "If the door is locked" appears on contact and FAQ. Implies the gym entrance is sometimes locked, with no explanation. | Medium | Say when and why. `TODO(Thihan)`: gym staffed hours, swipe access, what to do early morning or evening. |
| 5.4 | Transport details. Trams 48 and 75 run along Bridge Road, which I believe is correct. Nearest stop number and station walk times are not given. | Low | `TODO(Thihan)`: confirm stop number and whether West Richmond or East Richmond is the better walk. |
| 5.5 | Parking is generic. | Medium | `TODO(Thihan)`: does Uplift have any parking? Which side streets are unrestricted? Any time limits? |
| 5.6 | Arrival section sits under the fold on contact, below the form card. | Medium | Move "When you arrive" up, next to the map. Anchor it (`#getting-here`) so FAQ and homepage link straight to it. |

## 6. Mobile UX

Rendered at 375 x 812 and 414 x 812.

| # | Finding | Impact | Proposed fix |
|---|---|---|---|
| 6.1 | **Scroll reveal hides content.** Every `.r` element starts at `opacity:0; translateY(30px)` and animates in over 0.7s when 12% of it enters view. 31 such blocks on the homepage, 8 on services, 10 on contact. A full-page screenshot shows most of the homepage blank. Scrolling means watching text slide up as you arrive. This is the most likely thing the reviewer disliked. | High | Remove the reveal on mobile, or cut it to a 0.25s opacity-only fade with no movement. Make it progressive: hide only when JS has added a class to `<html>`, so content is never invisible if the script fails. |
| 6.2 | **Hero headline animates in word by word**, finishing about 1.2s after load. At 200ms the hero is an empty green box. This delays Largest Contentful Paint. | High | Render the H1 and sub static. Keep a subtle fade on the eyebrow at most. |
| 6.3 | **Header hides on scroll down, reappears on scroll up**, combined with `scroll-behavior: smooth`. On a phone this adds movement to every flick. | Medium | Keep the header fixed or static on mobile. The Call/Book bar already covers the action. |
| 6.4 | Two infinite animations (hero background drift, logo marquee) run on mobile. | Low | Stop the drift on mobile. Marquee: static wrapped grid on mobile. |
| 6.5 | `prefers-reduced-motion` is respected across animations, reveals and back-to-top. | None | Good. Keep. |
| 6.6 | Sticky Call/Book bar exists on mobile. 52px tall. | None | Good. |
| 6.7 | Tap targets. Buttons are 48px on mobile. A few inline text links on contact are under 44px (Privacy Policy 15px, Read common questions 18px). Inline links in sentences are exempt under WCAG 2.5.8. | Low | Give the standalone "Read common questions" link button padding. |
| 6.8 | No horizontal page scroll at either width. | None | Good. |
| 6.9 | Homepage is about 10 screens long at 375px. | Low | Fixing 6.1 and dropping the marquee on mobile shortens it. No need to cut content. |
| 6.10 | style.css has overlapping mobile rules for `.mobile-actions`, `.btn` and `.to-top` at both 820px and 900px breakpoints. Behaviour between 821px and 900px is hard to predict. | Low | Consolidate into one breakpoint. |
| 6.11 | Fonts: Playfair (4 styles) and DM Sans (4 weights) from Google Fonts, render-blocking stylesheet, `display=swap`. | Low | Drop unused weights (check for 300 and italic use). Preconnect is already in place. |
| 6.12 | All content images have width and height. Map iframe is lazy. No layout shift sources found in markup. | None | Good. |

## 7. Technical baseline

| # | Finding | Impact | Proposed fix |
|---|---|---|---|
| 7.1 | **Security headers**: live site sends only HSTS. No `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` or CSP. | Medium | Add a `headers` block to vercel.json. Start with the four simple headers. A CSP needs care: Halaxy iframe, Google Maps, Google Fonts, inline `onclick` handlers and GTM if added. Ship CSP in report-only mode first. |
| 7.2 | Static assets served with `max-age=0`. Every repeat visit re-validates images and CSS. | Low | Cache headers for images and fonts (long max-age). Leave HTML, CSS and JS as is unless filenames get versioned. |
| 7.3 | `PHOTO-GUIDE.txt` and `README.md` are publicly served. robots.txt `Disallow` stops crawling but also advertises the file. Contents are harmless maintenance notes. | Low | Add a `.vercelignore` for README.md, PHOTO-GUIDE.txt and docs/. Remove the robots line. |
| 7.4 | Internal links and asset paths: all resolve. No 404 assets found. | None | Recheck in Phase 3. |
| 7.5 | Open Graph and Twitter tags on main pages. **Missing on** terms, privacy, disclaimer, accessibility, cancellation. | Low | Add the standard set. |
| 7.6 | Favicon set: ico, 16, 32, apple-touch. No web manifest. | Low | Optional `site.webmanifest`. |
| 7.7 | 404.html has a canonical to `/404.html` alongside noindex. | Low | Remove the canonical. |
| 7.8 | Heading order is logical on every page. | None | Good. |
| 7.9 | **Done 23 Sep: GTM installed on all served pages, privacy policy updated.** Was: **GTM not installed.** The brief lists GTM-MZ36ZHQQ. site-config.js already pushes named events to `dataLayer`, so GTM would pick them up with no markup changes. | Decision | Confirm you want GTM live. If yes: add the snippet to every page head plus the noscript iframe, and update privacy.html to mention analytics. |
| 7.10 | Formspree not used. Forms post to `/api/enquiry`, which sends via Resend. | Info | No change. Brief is out of date. |
| 7.11 | Unused files: `logo-cream.svg`, `fast-bowler-delivery-stride.webp`, plus the three photos in 3.1. | Low | Use or delete. |

## 8. Blog and articles

| # | Finding | Impact | Proposed fix |
|---|---|---|---|
| 8.1 | Article schema present with author, datePublished, dateModified. Visible byline, published date and "Last reviewed" date present. | None | Good. This is the template the service pages should follow. |
| 8.2 | Schema `image` is og-image.jpg, while the page's OG image and hero are the fast bowler image. | Low | Use `fast-bowler-lumbar-spine-stress.webp` (or the OG JPG) in schema. |
| 8.3 | Author and publisher not linked to the Person and clinic nodes. | Medium | See 1.9. |
| 8.4 | No citations for the research figures. | Medium | See the AHPRA note in section 4. |
| 8.5 | Article links to cricket.html. Cricket.html does not link back. | Medium | See 3.4. |
| 8.6 | Blog index promises "running injuries, gym and lifting rehab" articles. There is one cricket article. | Low | Reword the intro to match what exists. |
| 8.7 | No BreadcrumbList on the article or blog index, unlike other pages. | Low | Add for consistency. |

---

## Where the reviewer is wrong, or half right

**1. "The clinic did not appear for Bridge Road Physiotherapy plus location."** Half right on the symptom, wrong on the cause if the implication is that the page is broken. The homepage title contains the exact name and suburb. NAP is consistent. Schema is valid. The domain redirects correctly. Likely causes, in order:

- *Site and domain age.* A new `.physio` domain with few links pointing to it ranks slowly for anything, including its own name.
- *Name collision.* "Bridge Road" is a street name. Many Richmond businesses carry it, and "Bridge Road Physio" style names exist elsewhere in Australia. Google has to learn which entity you mean.
- *GBP and personalisation.* A brand search from outside Richmond, or from a browser with other location signals, returns different results. Did he look at the Maps pack, or only organic results?
- *Citations.* Few directory listings (Healthengine, APA Find a Physio, Uplift Gym's own site, Halaxy public profile) point back to the domain with the same NAP.

The on-page fixes in section 1 help. Search Console data and off-site citations will move this more. An Uplift Gym website link to bridgeroad.physio is likely the single most useful thing to get.

**2. "Duplicate content across pages."** Mostly wrong. Titles, descriptions and H1s are unique. What repeats is site chrome and short factual blocks (cancellation, parking), which Google handles without penalty. The one real overlap is services.html and cricket.html on cricket. Worth tidying for readers, not for a penalty.

**3. "Service pages are thin."** Right on structure, wrong if it turns into word count. The sections lack images, per-service FAQs, a byline and a review date. Adding those is worth doing. Padding to 2,000 words is not.

**4. "Mobile homepage lacks trust indicators."** Right. The indicators exist but are hidden off-screen or below the fold.

**5. "How to find us is weak."** Right. The data (directions URL, arrival steps) exists but the homepage buries it and there is no entrance photo.

**6. "Scrolling feel on mobile."** Right, and the cause is specific: scroll-reveal animations, an animated hero headline and a header that moves with scroll direction.

---

## TODO(Thihan): facts needed

1. Opening hours, or the rule you want published (e.g. "Mon to Fri 6am to 8pm, by appointment"). Needed for schema and Google.
2. Confirm the Google Business Profile address spelling ("Road" vs "Rd") and category.
3. Confirm `https://maps.google.com/?cid=1065459174822192104` opens your listing.
4. Halaxy public profile URL to use in `sameAs`.
5. APA membership: current or not, and membership type.
6. AFL roles: club, role and years, or drop the mention.
7. Wording and years for each elite sport role, for a text list replacing or backing up the logos.
8. Permission status for each team logo.
9. Uplift Gym staffed hours, and what a patient does if the door is locked (swipe, call, buzzer).
10. Step-free access: yes or no? Lift or stairs? Accessible toilet?
11. Parking: any on-site? Nearest unrestricted streets? Time limits?
12. Nearest tram stop number, and the better train station to walk from.
13. Confirm Tyro Health is still the rebate system and which funds it covers.
14. Confirm the trams 48/75 and West/East Richmond details already on the site.
15. Citations for the research figures in the fast bowler article.
16. Whether you want GTM live (and privacy policy wording to match).

## Photos needed

1. `img/entrance-uplift-gym-bridge-rd.jpg`: the Uplift Gym street entrance, taken from the footpath, daylight, landscape orientation.
2. `img/arrival-waiting-area-uplift-gym.jpg`: where a patient sits on arrival.
3. `img/clinic-treatment-room-bridge-road-physio.jpg`: the treatment space.
4. Optional: `img/bridge-road-streetscape-507.jpg` showing the building from across the road, for people arriving by tram.

The three unused service photos already in the repo cover running, gym and cricket.

## Decisions for you before Phase 2

1. **Reviews:** keep the plain "Read our Google reviews" link (my recommendation) and delete the dormant star/excerpt renderer?
2. **Team logos:** keep the marquee, replace with a text list, or both?
3. **Service pages:** build out services.html in place (my recommendation) or split into one page per service?
4. **Scroll animations:** remove on mobile entirely (my recommendation), or keep a short fade?
5. **GTM:** install now or leave out?
6. **Branch:** the brief says `seo-review-fixes`. This session is set to push to `claude/new-session-aau2am`. Tell me which one to use.

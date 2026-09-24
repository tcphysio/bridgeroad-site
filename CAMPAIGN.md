# Spring new patient offer

Everything about the paid campaign that does not live in the code. Written for
whoever runs the ads and the Halaxy calendar, not for a developer.

**Offer:** 20% off one standard initial physiotherapy consultation, new
patients only. Standard fee $180. Offer fee $144. Saving $36.
**Code:** `SPRING20`, typed by the patient in the Halaxy booking notes.
**Ends:** 11:59 pm Monday 30 November 2026, Melbourne time.
**Landing page:** `https://www.bridgeroad.physio/new-patient-offer`

---

## 1. What is live

| URL | What it is | Indexed |
|---|---|---|
| `/new-patient-offer` | The campaign landing page. Switches itself to an ended state on 1 December. | No. `noindex,follow` |
| `/physio-richmond` | The evergreen landing page. Where the ads point after 30 November. | No. `noindex,follow` |
| `/book.html?offer=spring` | The booking page, showing the offer banner and the code when a visitor arrives from the offer page. | Yes, as before |

`/` (the homepage) is still the page that ranks for "physio Richmond". See
section 9 for why the evergreen page is not indexed.

---

## 2. Before you start the ads

1. **Make sure the code gets seen at invoicing.** The discount is not applied
   by Halaxy automatically. Whoever invoices an Initial Consultation has to
   check the booking notes for `SPRING20` and apply the $144 fee. If Halaxy
   takes payment at booking, the $36 has to go back as a part refund, so
   decide which way you handle it before the first ad runs.
2. **Set up the GA4 tag in Google Tag Manager.** GTM is installed on every
   page, including both campaign pages. The events in section 4 reach the
   data layer; GTM still needs a GA4 tag triggered on `brp_event` to send
   them anywhere.
3. **`/new-patient-offer` works on Vercel.** Checked on a preview build. Re-check
   after any change to `vercel.json` or to the template filename: a redirect to
   `/book.html` means the function failed to read it.

---

## 3. Halaxy setup

No new appointment type. Patients book the standard **Initial Consultation**
and type `SPRING20` in the booking notes. Every promotional button goes to
`/book.html?offer=spring`, where a banner above the calendar tells them
exactly that and repeats the terms.

At invoicing:

- Code present, new patient, attended by 30 November 2026: charge $144.
- Code present but not eligible (returning patient, extended consultation,
  attended after 30 November): charge the standard fee and say why.
- No code: standard fee. Apply it anyway if the patient mentions the offer at
  the appointment; the page promises the price, not a typing test.

Worth doing in Halaxy if the notes field is optional or easy to miss: add a
line to the Initial Consultation description, "Spring offer: type SPRING20 in
the notes", and remove it on 1 December.

---

## 4. Tracking

Events go through the same `BRP.track` function as the rest of the site, so
they arrive in the data layer as `event: 'brp_event'` with the name in
`brp_action` and the detail object in `brp_detail`. In GTM, trigger on the
custom event `brp_event`.

| `brp_action` | Fires on | `brp_detail` |
|---|---|---|
| `campaign_landing_view` | Campaign page loads | `campaign_name`, `page_path`, `offer_state` |
| `book_click` | Any booking button | `campaign_name`, `cta_location`, `offer_state`, `destination_host` |
| `phone_click` | A phone link | `page_path`, `link_location` |
| `email_click` | An email link | `page_path`, `link_location` |
| `maps_click` | The Google Business Profile link | `page_path`, `link_location` |

These are the same names the main site uses, so a report on `book_click` covers
both. Filter on `brp_detail.campaign_name` to see campaign clicks alone.
`campaign_name` is `spring_2026`. `cta_location` is one of `header`, `hero`,
`final`, `sticky` or `footer`.

For Meta, a booking click fires the custom event `BookingClick` when `fbq`
exists. `Lead` and `Schedule` are deliberately not used: they should mean a
confirmed appointment, and nothing on the website knows that yet.

**A booking click is not a booking.** It is someone leaving for the calendar.
Do not report clicks as patients.

No name, email address, phone number, symptom or appointment note is sent to
any analytics or advertising tool. Do not add one.

### Confirming actual bookings

Halaxy has no verified success redirect back to this site, so there is no
automatic confirmed-booking event. Pick one of these:

1. Search Halaxy booking notes for `SPRING20` over the campaign period.
   Simplest, and the code doubles as the tag.
2. Reconcile by hand each week.
3. Import offline conversions into Meta after a privacy review.

If Halaxy does add a success redirect, send it to `/booking-confirmed` and fire
the confirmed event there, with a guard against page refreshes.

### Campaign values reaching the booking screen

`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`
and `fbclid` are captured on landing and kept in session storage for the visit.
They are appended to any outbound Halaxy link.

The Halaxy calendar on `/book.html` is an iframe, and query values cannot be
read back out of it. So attribution is reliable up to the booking click and no
further. That is the limitation behind the reconciliation options above.

---

## 5. Reporting

Track these every week. The first four come from Meta and the site. The rest
come from Halaxy.

| Metric | Definition |
|---|---|
| Ad spend | Platform spend for the period |
| Landing page sessions | Sessions on `/new-patient-offer` |
| Booking CTA clicks | `book_click` events where `campaign_name` is `spring_2026` |
| Booked initial consultations | Initial Consultations with `SPRING20` in the notes |
| Cost per booked patient | Ad spend divided by confirmed bookings |
| Attended initial consultations | Offer bookings marked attended |
| Attendance rate | Attended divided by confirmed bookings |
| Initial consultation revenue | Fees collected for those appointments |
| Follow-up booking rate | Offer patients with a clinically appropriate follow-up booked |
| 30-day patient revenue | Collected within 30 days of the first attended visit |
| Source | Meta, Google, organic, referral or other verified source |

Clicks are not bookings. Bookings are not attended patients. Keep the three
columns apart or the campaign will look better than it is.

---

## 6. Ad set-up

### Landing URLs

```
https://bridgeroad.physio/new-patient-offer?utm_source=meta&utm_medium=paid_social&utm_campaign=spring_2026&utm_content=local
```

Change only `utm_content`: `local`, `sport`, `everyday`.

### Budget

| Campaign | Daily |
|---|---:|
| New patient prospecting | $35 |
| Retargeting | $5 |
| **Total** | **$40** |

23 September to 30 November 2026 is 69 days, so about **$2,760** at full
spend. Starting later means $40 times the number of days running. Recalculate
before launch rather than reusing that figure, and review after two weeks
rather than letting it run unwatched for ten.

### Structure

- One prospecting campaign, one ad set to start
- Three creatives: local, sport, everyday
- One small retargeting ad set
- Radius covering Richmond, Cremorne, Burnley, Abbotsford, Hawthorn and nearby
  inner suburbs
- Exclude recent bookers where a privacy-safe audience exists
- Never upload patient health information or treatment lists as an audience

Do not split the first $35 a day across several narrow injury audiences. There
is not enough budget for the algorithm to learn anything from each one.

### Ad copy

The three prospecting ads and the two retargeting ads are in the brief and are
unchanged apart from the season. Every ad must carry the same figures as the
page: new patients only, one standard initial consultation per person, $180
standard, $144 offer, code SPRING20, attended by 30 November 2026, subject to availability, not valid with another
offer. An ad that states the terms differently from the page is the problem,
not the page.

After 30 November, point both retargeting ads at `/physio-richmond` and drop the
audience exclusions tied to the offer.

---

## 7. What happens on 1 December

The page changes itself. Nobody needs to deploy anything.

From midnight in Melbourne on 1 December 2026, `/new-patient-offer`:

- leads with "This offer has ended" and "Need help with an injury?"
- drops the prices, the saving, the code, the promotional terms and the offer schema
- drops the sticky booking bar
- sends every button to the standard booking page
- links to `/physio-richmond`
- keeps working, so old ads and shared links do not hit a 404

The decision is made on the server using the Melbourne clock, so a visitor in
another timezone, or with JavaScript off, sees the same thing. The page is
cached at the edge and refreshed in the background, so ad clicks rarely wait on
the server. The cost: if the page sat quiet before midnight, the first visitor
after it still sees the offer once. Everyone after them sees the ended state.

The offer banner on `/book.html` disappears at the same moment. That one check
runs in the browser, and it fails closed: no JavaScript means no banner.

---

## 8. Launch checklist

Tick these off with evidence, not from memory.

- [ ] Decided how the $36 comes off: at invoicing, or as a part refund
- [ ] Confirmed the Halaxy booking notes field is visible to new patients
- [ ] Bookable availability exists before 30 November 2026
- [ ] `/book.html?offer=spring` opened in a private browser window, banner shows
- [ ] Standard booking URL checked
- [ ] Google Business Profile link checked
- [x] `/new-patient-offer` loads on a Vercel preview and shows the offer
- [ ] GA4 tag in GTM firing on `brp_event`; Meta pixel added through GTM if wanted
- [ ] Test booking made end to end, with SPRING20 in the notes
- [ ] Test booking cancelled, or clearly marked as a test in Halaxy
- [ ] Page opened on a real iPhone and a real Android handset
- [ ] Ad copy matches the page on price, eligibility and expiry
- [ ] Start date confirmed and the budget recalculated
- [ ] Reporting sheet ready before the first dollar is spent

---

## 9. Two decisions worth knowing about

**The evergreen page is not indexed.** The homepage is already the "physio
Richmond" page: that is its title, its description, its structured data and its
top entry in the sitemap. A second indexable page on the same search intent
would compete with it and split the signals. So `/physio-richmond` carries
`noindex,follow`, no business structured data and no sitemap entry. It exists
to give ad traffic a page with no navigation to wander into.

To reverse that: switch the robots tag to `index,follow`, copy the
`Physiotherapy` schema block from `index.html`, add the URL to `sitemap.xml`,
and then decide which of the two pages is the canonical one. Leaving both
indexed is the outcome to avoid.

**The landing page is served by a function, not as a static file.** That is what
makes the expiry work without JavaScript and without a flash of offer content.
The cost is one function call per uncached request. If it ever misbehaves, it
redirects to `/book.html` rather than failing, so an ad click still lands
somewhere useful.

---

## 10. Not built yet

These were in the brief and are deliberately left alone. Each one needs
decisions nobody has made.

**Local education event**, working title "Summer Training: Pain, Load and
Staying Active". A 45-minute session on what soreness deserves attention, why
sudden training increases cause problems, when to keep going or stop, returning
to running or the gym after injury, and questions. Needs a date, a venue and its
capacity, a format, a registration system, privacy wording, confirmation and
reminder emails, a cancellation process, accessibility arrangements, and a
decision on whether Uplift Gym co-hosts.

**Cricket event**, working title "Cricket Season Injury and Fast Bowling Q&A".
Keep it a separate niche campaign. Do not turn the main site into a cricket-only
clinic.

**Always-on local content.** Topics worth writing: when pain should stop a run,
what gets assessed before blaming the knee, why a scan does not always explain
symptoms, why rest is not the full answer, what a graded return to sport looks
like, bowling workload early in the season, returning to overhead sport after a
shoulder injury, what should happen at a good first appointment.

Use engagement for retargeting. Never send unsolicited direct messages based on
someone engaging with health content.

---

## 11. Changing the numbers

Four files hold the offer figures and they have to agree:

- `api/_offer.js`: the `OFFER` block. This one decides whether the offer runs.
- `site-config.js`: `window.BRP.campaign`. What the browser reads.
- `new-patient-offer-source.html`: the page copy and the required terms.
- `book.html`: the offer banner above the calendar.

The share image, `og-new-patient-offer.jpg`, carries the code and end date
too. Edit `tools/og-new-patient-offer.html` and run `node tools/og-render.js`.

Change one, change them all, then run `node --test tests/offer.test.js`. A test
checks the figures agree and that the terms appear in full below the final
button. It also checks the standard initial consultation is still $180 on the
fees list, because the whole offer is built on that number.

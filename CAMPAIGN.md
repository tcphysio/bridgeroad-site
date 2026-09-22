# School holiday new patient offer

Everything about the paid campaign that does not live in the code. Written for
whoever runs the ads and the Halaxy calendar, not for a developer.

**Offer:** 20% off one standard initial physiotherapy consultation, new
patients only. Standard fee $180. Offer fee $144. Saving $36.
**Ends:** 11:59 pm Sunday 4 October 2026, Melbourne time.
**Landing page:** `https://www.bridgeroad.physio/new-patient-offer`

---

## 1. What is live

| URL | What it is | Indexed |
|---|---|---|
| `/new-patient-offer` | The campaign landing page. Switches itself to an ended state on 5 October. | No. `noindex,follow` |
| `/physio-richmond` | The evergreen landing page. Where the ads point after 4 October. | No. `noindex,follow` |
| `/book.html?offer=school-holiday` | The booking page, showing an offer banner when a visitor arrives from an ad. | Yes, as before |

`/` (the homepage) is still the page that ranks for "physio Richmond". See
section 9 for why the evergreen page is not indexed.

---

## 2. Blockers. Do not start the ads until these are done

1. **The Halaxy offer appointment type does not exist yet.** Until it does,
   every promotional button goes to `/book.html`, the normal booking page.
   A patient who clicks a $144 ad reaches a calendar showing $180. Section 3
   says how to fix it.
2. **Neither GA4 nor the Meta pixel is installed on this site.** The events in
   section 4 are being written to a first-party queue and nothing is reading
   them. Until a tracker is added, the only numbers available are what Meta
   Ads Manager reports and what the Halaxy calendar shows.
3. **`/new-patient-offer` has not run on Vercel yet.** It is served by a
   function rather than as a static file. Open a preview deployment, load the
   URL, and check the page renders the offer rather than redirecting to
   `/book.html`. A redirect means the function failed to read its template.

---

## 3. Halaxy setup

Create one appointment type:

- **Name:** `New Patient School Holiday Offer`
- **Fee:** `$144`
- **Duration:** 45 minutes, the same as a standard initial consultation
- **Description:** Standard initial physiotherapy consultation for new
  patients. Offer fee $144. Appointment must be attended by 4 October 2026.
  One offer per person. Subject to availability.
- **Availability:** confirm there are bookable times before 4 October 2026

Then copy its direct booking link and paste it into `site-config.js`:

```js
campaign: {
  ...
  halaxyOfferUrl: 'https://www.halaxy.com/…'   // currently null
}
```

Every promotional button on the landing page picks it up. Nothing else needs
changing. Test the link in a private browser window first: a Halaxy link that
works while you are signed in does not always work for a stranger.

When the offer ends, set `halaxyOfferUrl` back to `null` and archive the
appointment type in Halaxy.

---

## 4. Tracking

Events are pushed to `window.dataLayer` under these names. Add GA4 through
Google Tag Manager and they arrive with no markup changes.

| Event | Fires on | Parameters |
|---|---|---|
| `campaign_landing_view` | Campaign page loads | `campaign_name`, `page_path`, `offer_state` |
| `book_appointment_click` | Any booking button | `campaign_name`, `cta_location`, `offer_state`, `destination_host` |
| `contact_phone_click` | A phone link | `page_path`, `link_location` |
| `contact_email_click` | An email link | `page_path`, `link_location` |
| `map_click` | The Google Business Profile link | `page_path`, `link_location` |

`campaign_name` is `school_holiday_2026`. `cta_location` is one of `header`,
`hero`, `final`, `sticky` or `footer`.

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

1. Read Halaxy by appointment type for the campaign period. Simplest, and good
   enough for a 13-day campaign.
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
| Booking CTA clicks | `book_appointment_click` events |
| Booked initial consultations | Confirmed bookings on the offer appointment type |
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
https://bridgeroad.physio/new-patient-offer?utm_source=meta&utm_medium=paid_social&utm_campaign=school_holiday_2026&utm_content=local
```

Change only `utm_content`: `local`, `sport`, `everyday`.

### Budget

| Campaign | Daily |
|---|---:|
| New patient prospecting | $35 |
| Retargeting | $5 |
| **Total** | **$40** |

22 September to 4 October 2026 is 13 days, so about **$520** at full spend.
Starting later means $40 times the number of days running. Recalculate
before launch rather than reusing that figure.

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
unchanged. Every ad must carry the same figures as the page: new patients only,
one standard initial consultation per person, $180 standard, $144 offer,
attended by 4 October 2026, subject to availability, not valid with another
offer. An ad that states the terms differently from the page is the problem,
not the page.

After 4 October, point both retargeting ads at `/physio-richmond` and drop the
audience exclusions tied to the offer.

---

## 7. What happens on 5 October

The page changes itself. Nobody needs to deploy anything.

From midnight in Melbourne on 5 October 2026, `/new-patient-offer`:

- leads with "This offer has ended" and "Need help with an injury?"
- drops the prices, the saving, the promotional terms and the offer schema
- drops the sticky booking bar
- sends every button to the standard booking page
- links to `/physio-richmond`
- keeps working, so old ads and shared links do not hit a 404

The decision is made on the server using the Melbourne clock, so a visitor in
another timezone, or with JavaScript off, sees the same thing. The page is
cached at the edge for five minutes, so the switch lands within five minutes of
midnight.

The offer banner on `/book.html` disappears at the same moment. That one check
runs in the browser, and it fails closed: no JavaScript means no banner.

---

## 8. Launch checklist

Tick these off with evidence, not from memory.

- [ ] Halaxy appointment type `New Patient School Holiday Offer` created
- [ ] Halaxy fee set to $144
- [ ] Eligibility and expiry wording added to the Halaxy description
- [ ] Bookable availability exists before 4 October 2026
- [ ] `halaxyOfferUrl` filled in and deployed
- [ ] Promotional booking URL opened in a private browser window
- [ ] Standard booking URL checked
- [ ] Google Business Profile link checked
- [ ] `/new-patient-offer` loads on a Vercel preview and shows the offer
- [ ] GA4 and the Meta pixel installed, with the consent behaviour checked
- [ ] Test booking made end to end
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

Three files hold the offer figures and they have to agree:

- `api/_offer.js`: the `OFFER` block. This one decides whether the offer runs.
- `site-config.js`: `window.BRP.campaign`. What the browser reads.
- `new-patient-offer-source.html`: the page copy and the required terms.

Change one, change all three, then run `node --test "tests/*.test.js"`. A test
checks the figures agree and that the terms appear in full below the final
button. It also checks the standard initial consultation is still $180 on the
fees list, because the whole offer is built on that number.

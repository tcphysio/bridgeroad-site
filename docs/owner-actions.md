# Owner actions

Things the website does not do by itself. Each one needs your login or your decision. Highest value first.

| # | Action | Where | Time |
|---|---|---|---|
| 1 | Send site events to Google Analytics | Google Analytics, Tag Manager | 45 min |
| 2 | Check every tag in Tag Manager (same sitting as 1) | Tag Manager | 15 min |
| 3 | Finish the spring offer launch checks | Halaxy, Google Ads | See `CAMPAIGN.md` section 8 |
| 4 | Confirm Google has the site indexed | Search Console | 15 min |
| 5 | Ask Uplift Gym to link to the site | Email | 5 min |
| 6 | Matching directory listings | Several sites | 1 to 2 hours |
| 7 | Re-run the Pingdom test | tools.pingdom.com | 2 min |

---

## 1. Send site events to Google Analytics

The site already records every booking click, phone click, email click, enquiry, map tap and chat use. Each one goes to the data layer as:

```
{ event: 'brp_event', brp_action: 'book_click', brp_detail: ... }
```

The full list of `brp_action` names is in `site-config.js`. Tag Manager (GTM-MZ36ZHQQ) is on every page, but nothing forwards these events to Google Analytics yet. Until it does, the spring ads run blind.

The privacy policy already says the site uses Google Analytics and Google Ads through Tag Manager, so this setup needs no policy change. A Meta pixel would.

### Part A: Google Analytics property (skip if one exists)

1. analytics.google.com, Admin, Create, Property. Name: Bridge Road Physiotherapy. Time zone: Australia, Melbourne. Currency: Australian dollar.
2. Data collection, Data streams, Web. URL: `https://www.bridgeroad.physio`.
3. Copy the Measurement ID. It starts with `G-`.

### Part B: Tag Manager (tagmanager.google.com, container GTM-MZ36ZHQQ)

1. **Variables**, User-Defined Variables, New, Data Layer Variable. Make four:

   | Variable name | Data Layer Variable Name |
   |---|---|
   | `DLV - brp_action` | `brp_action` |
   | `DLV - campaign_name` | `brp_detail.campaign_name` |
   | `DLV - cta_location` | `brp_detail.cta_location` |
   | `DLV - offer_state` | `brp_detail.offer_state` |

   The last three only have values on the two campaign pages. Elsewhere they stay empty, which is fine.

2. **Triggers**, New, Custom Event. Event name: `brp_event`. Fires on: All Custom Events. Name it `CE - brp_event`.

3. **Tags**, New, Google Tag. Tag ID: your `G-` Measurement ID. Trigger: Initialization - All Pages. Name it `Google tag - GA4`.

4. **Tags**, New, Google Analytics: GA4 Event.
   - Measurement ID: the same `G-` ID.
   - Event Name: `{{DLV - brp_action}}`
   - Event Parameters: `campaign_name` = `{{DLV - campaign_name}}`, `cta_location` = `{{DLV - cta_location}}`, `offer_state` = `{{DLV - offer_state}}`
   - Trigger: `CE - brp_event`
   - Name it `GA4 - site events`.

5. **Preview.** Enter `https://www.bridgeroad.physio`. In the site window, tap Book, tap the phone number, and tap Show the map at the bottom of the homepage. In Tag Assistant, each tap shows a `brp_event` with `GA4 - site events` under Tags Fired. Also open `/new-patient-offer` and tap a booking button: the event carries `campaign_name` `spring_2026`.

6. **Submit**, Publish. Version name: `GA4 site events`.

### Part C: Google Analytics, the next day

Events take up to 24 hours to show in Admin.

1. Admin, Events. Mark `book_click`, `phone_click` and `enquiry_submit` as key events.
2. Admin, Custom definitions, Create custom dimension, event scope, three times: `campaign_name`, `cta_location`, `offer_state`. Without these, the campaign detail never shows in reports.

### Part D: Google Ads

1. In Google Analytics: Admin, Product links, Google Ads links. Link the ads account.
2. In Google Ads: Goals, Conversions, New conversion action, Import, Google Analytics 4 properties, Web. Choose `book_click`, `phone_click` and `enquiry_submit`.

Importing from Analytics means no separate Ads tags and no Conversion Linker on the site. That's fewer scripts on every page, which keeps the speed work intact.

**A booking click is not a booking.** It means someone left for the calendar. `CAMPAIGN.md` section 4 explains how to count real bookings: search Halaxy notes for `SPRING20`.

## 2. Check every tag in Tag Manager

Do this in the same sitting. My tests had to block Tag Manager, so the only way to see what it loads is to look.

After section 1, the workspace needs exactly two tags: `Google tag - GA4` and `GA4 - site events`. A Meta pixel would be the third, if you add one. For any other tag:

1. Open it. Note what it loads and which trigger fires it.
2. If you don't know why it's there, **pause** it rather than deleting it. Publish.
3. Two weeks later, if nothing missed it, delete it.

Tags of type Custom HTML deserve the closest look. They load outside scripts, often on every page.

## 3. Spring offer launch checks

The checklist is `CAMPAIGN.md` section 8. Still open as of 24 September:

- How the $36 comes off: at invoicing, or as a part refund
- The Halaxy booking notes field shows for new patients
- Bookable times before 30 November
- `/book.html?offer=spring` shows the banner (private browser window)
- A test booking end to end with `SPRING20`, then cancelled or marked as a test
- The offer page on a real iPhone and a real Android phone
- Ad copy matches the page on price, eligibility and end date
- Start date, budget and a reporting sheet ready before the first dollar

## 4. Search Console

The site's verification tag is on the homepage, so the property likely exists.

1. search.google.com/search-console, choose the `bridgeroad.physio` property.
2. URL Inspection: `https://www.bridgeroad.physio/`. It should say "URL is on Google".
3. Sitemaps: submit `https://www.bridgeroad.physio/sitemap.xml` if it isn't listed.
4. Inspect each of the six new body-area pages (`/knee-pain.html` and so on) and choose Request indexing.
5. Performance, Search results, filter Query containing `bridge road`. That's the direct answer to "does the clinic show up for its own name".

## 5. Link from Uplift Gym

A link from Uplift Gym's website to `https://www.bridgeroad.physio` is the most useful single link available to the site. Google already associates Uplift with 507 Bridge Road. A line for them to paste:

> Physiotherapy at Uplift: Bridge Road Physiotherapy offers one-to-one physio inside the gym. Book at bridgeroad.physio.

## 6. Matching directory listings

Every listing must match the website character for character. Mismatches, such as Rd against Road, or a different phone format, dilute the signal.

```
Name:     Bridge Road Physiotherapy
Address:  507 Bridge Road, Richmond VIC 3121
          (second line or description: Inside Uplift Gym)
Phone:    0458 007 583
Website:  https://www.bridgeroad.physio
Email:    thihan@bridgeroad.physio
Hours:    Monday to Friday, 8am to 8pm. Weekends by prior appointment.
```

Where to list, most useful first:

1. **Google Business Profile.** Check that the website field reads exactly `https://www.bridgeroad.physio` and the hours match.
2. **Apple Business Connect** (businessconnect.apple.com). This controls Apple Maps, which is the default map on iPhones.
3. **Bing Places** (bingplaces.com). It imports from Google Business Profile in a few clicks.
4. **APA Find a Physio.** Through your APA member account.
5. **Healthengine.**
6. **Halaxy public profile.** Check that its website field points to the site.

## 7. Re-run Pingdom

Same page and test location as the first run. Expected:

- **DNS lookups:** A. The fonts no longer come from Google's servers.
- **Expires headers:** better. What's left is Google Tag Manager's own files, which Google controls.
- **HTTP requests:** better, and better again after the tag check in section 2.
- **Gzip:** still F. The site serves Brotli, a newer and smaller format, and Pingdom's rule predates it. Nothing to fix.

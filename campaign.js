/* ============================================================================
   Bridge Road Physiotherapy — campaign landing page behaviour
   ----------------------------------------------------------------------------
   Loaded by /new-patient-offer and /physio-richmond only. Three jobs:

     1. Conversion events, named the way the GA4 property expects them.
     2. The sticky mobile booking bar on the offer page.
     3. Pointing the promotional CTAs at the Halaxy offer appointment type,
        once that appointment type exists.

   NO SECOND ANALYTICS LIBRARY. Events go into window.dataLayer, which is the
   same queue site-config.js already writes to, plus gtag and fbq if the site
   has loaded them. Nothing here loads a tracker, so nothing here needs its own
   consent gate; the gate belongs on whatever loads GA4 and the Meta pixel.
   See CAMPAIGN.md, which records that neither is installed yet.

   NOTHING PERSONAL OR CLINICAL GOES INTO AN EVENT. Parameters are limited to
   the page path, where on the page the link sat, the campaign name, the offer
   state and the host the click left for. No symptoms, no free text, no name,
   no email address, no phone number.

   A click to Halaxy is a booking CLICK. It is not a booking, not an attended
   appointment and not revenue. The event is named accordingly.
   ========================================================================== */

(function () {
  'use strict';

  var doc = document.documentElement;
  var offerState = doc.getAttribute('data-offer-state') || 'none';
  var campaign = doc.getAttribute('data-campaign') || null;
  var path = location.pathname;

  /* --- event plumbing --------------------------------------------------- */
  function send(name, params) {
    var payload = params || {};
    try {
      window.dataLayer = window.dataLayer || [];
      var forLayer = { event: name };
      for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) forLayer[k] = payload[k];
      window.dataLayer.push(forLayer);
      if (typeof window.gtag === 'function') window.gtag('event', name, payload);
      document.dispatchEvent(new CustomEvent('brp:track', { detail: { action: name, detail: payload } }));
    } catch (e) { /* tracking must never block a booking */ }
  }

  function meta(name, params) {
    try {
      if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params || {});
    } catch (e) { /* as above */ }
  }

  /* --- the Halaxy offer appointment type -------------------------------- *
     Set campaign.halaxyOfferUrl in site-config.js once the "New Patient School
     Holiday Offer" appointment type exists in Halaxy. Until then the CTAs in
     the markup point at /book.html, which is a real, working booking page, so
     no ad ever lands on a dead link. */
  function promoBookingUrl() {
    var c = window.BRP && window.BRP.campaign;
    return (c && c.halaxyOfferUrl) || null;
  }

  var promoUrl = offerState === 'active' ? promoBookingUrl() : null;
  if (promoUrl) {
    var promoLinks = document.querySelectorAll('a[data-cta="book"][data-cta-promo]');
    for (var i = 0; i < promoLinks.length; i++) promoLinks[i].href = promoUrl;
    /* script.js decorates outbound Halaxy links with the stored campaign
       parameters on load. These links only just became Halaxy links, so ask
       for that again. */
    if (window.BRP && window.BRP.attribution) window.BRP.attribution.decorate();
  }

  /* --- page view --------------------------------------------------------- */
  if (campaign) {
    send('campaign_landing_view', {
      campaign_name: campaign,
      page_path: path,
      offer_state: offerState
    });
  }

  /* --- clicks ------------------------------------------------------------ */
  function hostOf(href) {
    try { return new URL(href, location.href).host; } catch (e) { return ''; }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-cta]') : null;
    if (!el) return;

    var kind = el.getAttribute('data-cta');
    var where = el.getAttribute('data-cta-location') || 'unknown';

    if (kind === 'book') {
      send('book_appointment_click', {
        campaign_name: campaign,
        cta_location: where,
        offer_state: offerState,
        destination_host: hostOf(el.getAttribute('href') || '')
      });
      meta('BookingClick', { cta_location: where, offer_state: offerState });
      return;
    }

    if (kind === 'phone') { send('contact_phone_click', { page_path: path, link_location: where }); return; }
    if (kind === 'email') { send('contact_email_click', { page_path: path, link_location: where }); return; }
    if (kind === 'map')   { send('map_click',           { page_path: path, link_location: where }); }
  });

  /* --- sticky mobile booking bar ----------------------------------------- *
     Appears once the hero CTA has scrolled away, and gets out of the way again
     when the final booking block or the footer arrives, so it never sits on
     top of the full terms. It is a normal link in normal document order at the
     end of <main>, so it takes focus in sequence and cannot trap it. */
  var bar = document.querySelector('.offer-sticky');
  if (!bar || !('IntersectionObserver' in window)) return;

  document.body.classList.add('has-offer-bar');

  var heroCta = document.querySelector('[data-sticky-after]');
  var endZones = document.querySelectorAll('[data-sticky-stop]');
  var pastHero = false;
  var showing = [];   /* the stop zones currently on screen */

  function apply() {
    bar.classList.toggle('is-shown', pastHero && showing.length === 0);
  }

  if (heroCta) {
    new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting;
      apply();
    }, { threshold: 0 }).observe(heroCta);
  } else {
    pastHero = true;
  }

  /* The final booking block and the footer both carry data-sticky-stop. While
     either is on screen the bar gets out of the way, so it never sits over the
     full terms or the policy links. */
  if (endZones.length) {
    var stops = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        var at = showing.indexOf(entries[j].target);
        if (entries[j].isIntersecting && at === -1) showing.push(entries[j].target);
        if (!entries[j].isIntersecting && at > -1) showing.splice(at, 1);
      }
      apply();
    }, { threshold: 0 });
    for (var k = 0; k < endZones.length; k++) stops.observe(endZones[k]);
  }

  apply();
})();

/* ============================================================================
   Offer banner on /book.html
   ----------------------------------------------------------------------------
   The promotional calls to action land on /book.html?offer=school-holiday. The
   banner there tells the patient which appointment type to choose and repeats
   the terms, so the price they were shown in the ad and the price at the
   checkout are the same number.

   /book.html is a static file, so this one check happens in the browser. It
   fails closed: no JavaScript, no query parameter, or an expired offer all
   mean no banner. A visitor never sees an offer that has ended, which is the
   direction that matters.
   ========================================================================== */
(function () {
  'use strict';

  var banner = document.getElementById('offer-banner');
  if (!banner) return;
  if (new URLSearchParams(location.search).get('offer') !== 'school-holiday') return;

  var c = window.BRP && window.BRP.campaign;
  if (!c || !c.endsAt) return;

  try {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var p = {};
    for (var i = 0; i < parts.length; i++) p[parts[i].type] = parts[i].value;
    var hour = p.hour === '24' ? '00' : p.hour;
    var now = p.year + '-' + p.month + '-' + p.day + 'T' + hour + ':' + p.minute + ':' + p.second;
    if (now > c.endsAt) return;
  } catch (e) {
    return;   // cannot tell the time in Melbourne, so say nothing about the offer
  }

  banner.hidden = false;
})();

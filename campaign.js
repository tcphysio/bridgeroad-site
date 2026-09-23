/* ============================================================================
   Bridge Road Physiotherapy — campaign landing page behaviour
   ----------------------------------------------------------------------------
   Loaded by /new-patient-offer and /physio-richmond only. Three jobs:

     1. Conversion events, sent through the same BRP.track function and with
        the same names as the rest of the site, so Google Tag Manager sees
        one scheme: book_click, phone_click, email_click, maps_click, plus
        campaign_landing_view for the page itself.
     2. The sticky mobile booking bar on the offer page.
     3. The offer banner on /book.html.

   NO SECOND ANALYTICS LIBRARY. Events go into window.dataLayer as brp_event,
   which Google Tag Manager (loaded in the page head) reads, plus fbq if a
   Meta pixel is ever added through GTM. Nothing here loads a tracker.

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
    try {
      if (window.BRP && typeof window.BRP.track === 'function') window.BRP.track(name, params || null);
    } catch (e) { /* tracking must never block a booking */ }
  }

  function meta(name, params) {
    try {
      if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params || {});
    } catch (e) { /* as above */ }
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
      send('book_click', {
        campaign_name: campaign,
        cta_location: where,
        offer_state: offerState,
        destination_host: hostOf(el.getAttribute('href') || '')
      });
      meta('BookingClick', { cta_location: where, offer_state: offerState });
      return;
    }

    if (kind === 'phone') { send('phone_click', { page_path: path, link_location: where }); return; }
    if (kind === 'email') { send('email_click', { page_path: path, link_location: where }); return; }
    if (kind === 'map')   { send('maps_click',{ page_path: path, link_location: where }); }
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
   The promotional calls to action land on /book.html?offer=spring. The
   banner there tells the patient to choose Initial Consultation, gives the
   code to type in the booking notes and repeats the terms, so the price they were shown in the ad and the price at the
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
  if (new URLSearchParams(location.search).get('offer') !== 'spring') return;

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

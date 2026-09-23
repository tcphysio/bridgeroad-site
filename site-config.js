/* ============================================================================
   Bridge Road Physiotherapy — central site configuration
   ----------------------------------------------------------------------------
   ONE place to change the business details that appear in links and in the
   Google reviews block. Update this file, commit, and the site follows.

   The address, phone and email are ALSO written into the HTML of every page
   (search engines need them in the markup, not injected by JavaScript). If you
   change NAP details here, change them in the page markup too — search this
   repo for the old value.
   ========================================================================== */

window.BRP = (function () {
  var PLACE_ID = 'ChIJdVQ-b55D1moR6CP1dXlFyQ4'; // Bridge Road Physiotherapy, Google Business Profile

  var cfg = {
    /* --- Name, address, phone (NAP) — must match the Google Business Profile */
    name: 'Bridge Road Physiotherapy',
    street: '507 Bridge Road',
    suburb: 'Richmond',
    state: 'VIC',
    postcode: '3121',
    phoneDisplay: '0458 007 583',
    phoneLink: 'tel:+61458007583',
    email: 'thihan@bridgeroad.physio',

    /* --- Booking ------------------------------------------------------- */
    bookingPage: '/book.html',
    bookingWidget: 'https://www.halaxy.com/book/widget/physiotherapist/mr-thihan-chandramohan/576911/1330449',
    bookingDirect: 'https://www.halaxy.com/book/bridge-road-physiotherapy/location/1330449',

    /* --- Google Business Profile --------------------------------------- */
    placeId: PLACE_ID,

    /* Opens the BUSINESS in Google Maps (not just the street address).
       Works on desktop Maps and deep-links into the app on iOS and Android. */
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bridge%20Road%20Physiotherapy%2C%20507%20Bridge%20Rd%2C%20Richmond%20VIC%203121&query_place_id=' + PLACE_ID,

    /* Driving/walking directions to the business. */
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Bridge%20Road%20Physiotherapy%2C%20507%20Bridge%20Rd%2C%20Richmond%20VIC%203121&destination_place_id=' + PLACE_ID,

    /* Embedded map iframe: the official embed Google generates for this exact
       listing (Maps -> Share -> Embed a map). The "pb=" string resolves to the
       business itself, so the pin and info card are always Bridge Road
       Physiotherapy rather than whatever a search happens to return.

       The ftid inside it, 0x6ad6439e6f3e5475:0xec9457975f523e8, is the hex
       form of the Place ID above, so the two agree.

       If the listing ever moves, regenerate this from Maps -> Share -> Embed
       a map and paste the new src here AND into the <iframe src> values in
       index.html and contact.html. */
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3151.758146355999!2d145.00493397614895!3d-37.81913357197426!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad6439e6f3e5475%3A0xec9457975f523e8!2sBridge%20Road%20Physiotherapy!5e0!3m2!1sen!2sau!4v1789648300888!5m2!1sen!2sau',

    /* Verified coordinates for the listing, taken from the embed above.
       Mirrored in the LocalBusiness schema on index.html. */
    lat: -37.8191336,
    lng: 145.004934,

    /* PROSPECTIVE patients: read the reviews. */
    reviewsUrl: 'https://search.google.com/local/reviews?placeid=' + PLACE_ID,

    /* EXISTING patients: write a review. Use this in follow-up emails/SMS.
       Do not make it a primary homepage call to action. */
    writeReviewUrl: 'https://search.google.com/local/writereview?placeid=' + PLACE_ID,

    /* --- Google star rating shown on the homepage --------------------- *
       DECISION (2026-09-23): Thihan chose to show the Google star rating and
       review count with a link to the reviews. Review excerpts are never
       shown on this site, and there is no Review or AggregateRating schema.

       Nothing renders while rating or reviewCount is null, so the site never
       shows a figure it cannot stand behind. To switch it on, copy the
       current figures from the Google Business Profile and today's date.
       Re-check at least monthly: an out-of-date rating is misleading.

       AHPRA caution: AHPRA treats reproducing patient reviews, including
       ratings, in your own advertising as a possible testimonial. Read the
       AHPRA testimonial guidance before filling these in.               */
    google: {
      rating: null,        // e.g. 5.0, exactly as shown on Google
      reviewCount: null,   // e.g. 27
      lastChecked: null    // e.g. '2026-09-23'
    },

    /* --- Fees (source of truth for humans: /fees.html) ------------------ *
       Names match what a patient sees when booking. A "review" consultation
       is the follow-up appointment.

       The ORDER matters and is not alphabetical or cheapest-first. It is the
       order Halaxy lists its appointment types in: the four in-person types,
       then the two online ones. A patient reading the fees table and then
       opening the calendar sees the same list twice, which is the whole
       point. Reorder Halaxy and this list follows, not the other way round.

       Confirmed against the calendar on 2026-09-19: names, order, durations
       and prices all agree. Change a price and three things move together —
       this list, the table on /fees.html, and the Halaxy appointment types.
       Miss one and a patient sees a different figure on the site than at
       the checkout.                                                       */
    fees: [
      { label: 'Initial consultation',             minutes: 45, price: 180, online: false },
      { label: 'Review consultation',              minutes: 30, price: 140, online: false },
      { label: 'Extended consultation',            minutes: 45, price: 180, online: false },
      { label: 'Return to Performance Assessment', minutes: 60, price: 250, online: false },
      { label: 'Initial consultation, online',     minutes: 45, price: 150, online: true  },
      { label: 'Review consultation, online',      minutes: 30, price: 120, online: true  }
    ],

    /* --- Spring new patient offer ------------------------------------- *
       The campaign behind /new-patient-offer. These figures also appear in
       the page copy, in the required terms and in api/_offer.js, which is
       what actually decides whether the offer is running. Change a figure
       and all of them move together, plus the ad copy.

       There is no separate Halaxy appointment type. Patients book a standard
       Initial Consultation and type the code in the booking notes; the
       discount is applied when the appointment is invoiced. See CAMPAIGN.md. */
    campaign: {
      name: 'spring_2026',
      code: 'SPRING20',
      standardFee: 180,
      offerFee: 144,
      saving: 36,
      percent: 20,
      endsAt: '2026-11-30T23:59:59',   // Melbourne wall clock, inclusive
      endsLabel: '30 November 2026'
    }
  };

  /* --------------------------------------------------------------------- */
  /* Conversion tracking                                                    */
  /* --------------------------------------------------------------------- */
  /* Google Tag Manager (GTM-MZ36ZHQQ) is loaded in the <head> of every page.
     Any element carrying a data-track attribute fires a named event on click,
     which is pushed to window.dataLayer as event 'brp_event' and dispatched
     as a DOM event. In GTM, trigger on the custom event brp_event and read
     the Data Layer Variables brp_action and brp_detail.
     If tags are added in GTM beyond Analytics and Google Ads, update the
     "Website analytics and advertising" section of privacy.html to match.

     Event names in use:
       book_click                 Book now / Book an appointment
       campaign_landing_view      /new-patient-offer or /physio-richmond loaded;
                                  detail carries campaign and offer state
       booking_widget_view        Halaxy booking widget rendered on /book.html
       phone_click                Any tel: link
       email_click                Any mailto: link
       maps_click                 Open in Google Maps
       directions_click           Get directions (Google Maps route)
       google_reviews_click       Read our Google reviews
       google_review_write_click  Leave a Google review
       enquiry_submit             Contact / landing enquiry sent successfully
       enquiry_error              Enquiry failed to send; patient shown the
                                  phone number instead
       enquiry_invalid            Submission blocked by inline validation;
                                  detail is the offending field name
       menu_open                  Menu drawer opened (phones and tablets)
       chat_open                  Chat assistant opened
       chat_message               A question was sent to the assistant. Never
                                  carries the text of the question
       chat_suggestion            A suggested question was tapped; detail is
                                  its position, 1 to 4
       chat_error                 The assistant could not answer; the patient
                                  was shown the phone number and email
       chat_link_click            A page link inside a chat reply. Links to
                                  Book, phone and email use the events above */

  cfg.track = function (action, detail) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'brp_event', brp_action: action, brp_detail: detail || null });
      document.dispatchEvent(new CustomEvent('brp:track', { detail: { action: action, detail: detail || null } }));
    } catch (e) { /* tracking must never block a booking or a phone call */ }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-track]') : null;
    if (el) cfg.track(el.getAttribute('data-track'), el.getAttribute('href'));
  });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.matches && f.matches('form[data-track]')) cfg.track(f.getAttribute('data-track'));
  });

  /* --------------------------------------------------------------------- */
  /* Google star rating (homepage)                                          */
  /* --------------------------------------------------------------------- */
  function stars(n) {
    var full = Math.round(n || 0), out = '';
    for (var i = 0; i < 5; i++) out += i < full ? '\u2605' : '\u2606';
    return out;
  }

  function renderRating() {
    var g = cfg.google;
    if (!g || !g.rating || !g.reviewCount) return;
    var html =
      '<span class="review-rating"><span class="stars" aria-hidden="true">' + stars(g.rating) + '</span>' +
      '<span>' + g.rating.toFixed(1) + ' on Google from ' + g.reviewCount + ' reviews</span></span>';
    [].forEach.call(document.querySelectorAll('[data-google-rating]'), function (el) {
      el.innerHTML = html;
      el.hidden = false;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderRating);
  } else {
    renderRating();
  }

  return cfg;
})();

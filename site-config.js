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

    /* --- Google review proof shown on the homepage ---------------------- *
       DORMANT BY DECISION (2026-09-17). Thihan chose not to copy review
       excerpts or a star rating onto the site. The homepage section stays as
       a heading, one line of text and the "Read our Google reviews" button,
       which sends people to the profile itself. Nothing here needs doing.

       Left in place because the wiring costs nothing and the decision is
       reversible. Fill these in and the rating chip and review cards render;
       leave them null and neither appears, so the site never shows a rating
       it cannot stand behind.

       If they are ever filled in: use only genuine Google reviews for Bridge
       Road Physiotherapy, copy the text verbatim (trim with an ellipsis if
       long), use the reviewer's Google display name, and never write one
       yourself. There is no free Google API that returns a live rating
       without a billable Places API key, so this is a manual job.        */
    google: {
      rating: null,        // e.g. 5.0
      reviewCount: null,   // e.g. 27
      lastChecked: null,   // e.g. '2026-09-16'
      reviews: [
        // { text: 'Verbatim review text…', author: 'First name L.', stars: 5 }
      ]
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
    ]
  };

  /* --------------------------------------------------------------------- */
  /* Conversion tracking                                                    */
  /* --------------------------------------------------------------------- */
  /* No third-party tracker is loaded by this site. Any element carrying a
     data-track attribute fires a named event on click, which is pushed to
     window.dataLayer and dispatched as a DOM event. If Google Analytics,
     GTM or similar is added later, it picks these up with no markup changes.

     Event names in use:
       book_click                 Book now / Book an appointment
       booking_widget_view        Halaxy booking widget rendered on /book.html
       phone_click                Any tel: link
       email_click                Any mailto: link
       maps_click                 Open in Google Maps
       google_reviews_click       Read our Google reviews
       google_review_write_click  Leave a Google review
       enquiry_submit             Contact / landing enquiry sent successfully
       enquiry_error              Enquiry failed to send; patient shown the
                                  phone number instead
       enquiry_invalid            Submission blocked by inline validation;
                                  detail is the offending field name          */

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
  /* Google review block (homepage)                                         */
  /* --------------------------------------------------------------------- */
  function stars(n) {
    var full = Math.round(n || 0), out = '';
    for (var i = 0; i < 5; i++) out += i < full ? '★' : '☆';
    return out;
  }

  function renderReviews() {
    var g = cfg.google;

    var head = document.getElementById('google-rating');
    if (head && g.rating && g.reviewCount) {
      head.innerHTML =
        '<span class="review-rating"><span class="stars" aria-hidden="true">' + stars(g.rating) + '</span>' +
        '<span>' + g.rating.toFixed(1) + ' from ' + g.reviewCount + ' Google reviews</span></span>';
      head.hidden = false;
    }

    var list = document.getElementById('google-reviews');
    if (list && g.reviews && g.reviews.length) {
      list.innerHTML = g.reviews.map(function (r) {
        return '<figure class="review">' +
          '<span class="review__stars" aria-label="' + (r.stars || 5) + ' out of 5 stars">' + stars(r.stars || 5) + '</span>' +
          '<blockquote class="review__text">' + r.text + '</blockquote>' +
          '<figcaption class="review__who">' + r.author + ' &middot; Google review</figcaption>' +
          '</figure>';
      }).join('');
      list.hidden = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderReviews);
  } else {
    renderReviews();
  }

  return cfg;
})();

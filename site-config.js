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

    /* Embedded map iframe, keyless.
       NOTE: the keyless embed endpoint does not reliably honour a
       "place_id:" query, so this searches by business name + address, which
       does pin the clinic. For a guaranteed business pin with the info card,
       open Google Maps -> Share -> Embed a map, copy the src from the iframe
       Google gives you (it contains a long "pb=" string), and paste it here
       AND into the two <iframe src> values in index.html and contact.html. */
    mapEmbedUrl: 'https://www.google.com/maps?q=Bridge+Road+Physiotherapy,+507+Bridge+Rd,+Richmond+VIC+3121&output=embed',

    /* PROSPECTIVE patients: read the reviews. */
    reviewsUrl: 'https://search.google.com/local/reviews?placeid=' + PLACE_ID,

    /* EXISTING patients: write a review. Use this in follow-up emails/SMS.
       Do not make it a primary homepage call to action. */
    writeReviewUrl: 'https://search.google.com/local/writereview?placeid=' + PLACE_ID,

    /* --- Google review proof shown on the homepage ---------------------- *
       There is no free Google API that returns a live rating without a
       billable Places API key, so these are maintained by hand.

       TO UPDATE: open the Google Business Profile, copy the current rating
       and review count, and paste them below. Leave them null and the rating
       chip simply does not render — nothing misleading is ever shown.

       reviews[]: only genuine Google reviews for Bridge Road Physiotherapy.
       Copy the text verbatim (trim with an ellipsis if long) and use the
       reviewer's Google display name. Never write these yourself.        */
    google: {
      rating: null,        // e.g. 5.0            <-- TODO: confirm from the profile
      reviewCount: null,   // e.g. 27             <-- TODO: confirm from the profile
      lastChecked: null,   // e.g. '2026-09-16'
      reviews: [
        // { text: 'Verbatim review text…', author: 'First name L.', stars: 5 }
      ]
    },

    /* --- Fees (source of truth for humans: /fees.html) ------------------ *
       Kept here so there is one list to check against the booking system.
       The fees page renders these as static HTML; update both together.  */
    fees: {
      initial: { label: 'Initial consultation', minutes: 45, price: 180 },
      followUp: { label: 'Follow-up consultation', minutes: 30, price: 140 },
      telehealth: { label: 'Telehealth consultation', minutes: 30, price: 125 }
      // TODO: confirm current prices for extended appointments, Sports Injury
      // Screening and Return to Performance Assessment before listing them.
    }
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
       enquiry_submit             Contact / landing enquiry form submitted   */

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

/* ============================================================================
   Bridge Road Physiotherapy — /new-patient-offer
   ----------------------------------------------------------------------------
   Serves the campaign landing page in whichever state the offer is in. The
   route is wired up in vercel.json:

     /new-patient-offer                rewritten here
     /new-patient-offer-source.html    301 to the clean URL, so the template,
                                       which still holds both states, is never
                                       the page a visitor or a crawler sees

   The template is named *-source.html rather than new-patient-offer.html on
   purpose. A file called new-patient-offer.html at the repository root would
   be matched by Vercel's static filesystem step before this rewrite ever ran,
   and the unrendered template would be served instead of the function output.

   A Vercel Function only ships the files it is traced to, so the template is
   read through a literal path off __dirname, which the tracer follows, and is
   also named in the "functions" block of vercel.json as a second guarantee.

   The response is cached at the edge for five minutes, so the page is served
   from cache rather than a cold function on nearly every hit, and the switch
   to the ended state lands within five minutes of midnight in Melbourne on
   5 October 2026. That window is deliberate: it trades an exact-to-the-second
   cutover for a page that loads like a static file during the campaign, which
   is what the ads are paying for. The offer terms say the appointment must be
   attended by 4 October, so nothing turns on those five minutes.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const { offerState, renderOfferPage } = require('./_offer.js');

const SOURCE = path.join(__dirname, '..', 'new-patient-offer-source.html');

let cached = null;
function source() {
  if (cached === null) cached = fs.readFileSync(SOURCE, 'utf8');
  return cached;
}

module.exports = (req, res) => {
  let html;
  try {
    html = renderOfferPage(source(), offerState(new Date()));
  } catch (err) {
    /* A broken template must not take the ad destination offline. Fall back to
       the booking page rather than serving a half-rendered offer. */
    console.error('new-patient-offer: could not render the page', err && err.message);
    res.setHeader('Location', '/book.html');
    return res.status(302).end();
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=60');
  return res.status(200).send(html);
};

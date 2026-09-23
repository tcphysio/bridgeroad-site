/* ============================================================================
   Bridge Road Physiotherapy — spring offer state
   ----------------------------------------------------------------------------
   One place that decides whether the new patient offer is running, and one
   place that turns the source page into its active or ended form.

   WHY THIS RUNS ON THE SERVER
   The offer has a legal expiry. A page that decides its own state in the
   browser shows the offer for a moment before the script runs, and shows it
   permanently to anyone with JavaScript off. Both of those advertise an
   expired discount. So /new-patient-offer is served by a Vercel Function that
   picks the state before the HTML leaves the server, and the browser is never
   asked to make the decision.

   TIMEZONE
   Melbourne, always. Never the visitor's clock and never the server's, which
   on Vercel is UTC. The comparison is done on the Melbourne wall clock through
   Intl, so daylight saving changes are handled by the timezone database
   rather than by a hardcoded +10 or +11 offset.

   CHANGING THE OFFER
   Change OFFER below. The page copy, the terms, the tests and the ended state
   all read from it.
   ========================================================================== */

'use strict';

const TZ = 'Australia/Melbourne';

const OFFER = {
  campaign: 'spring_2026',
  code: 'SPRING20',
  standardFee: 180,
  offerFee: 144,
  saving: 36,
  percent: 20,
  /* Last moment the offer runs, as a Melbourne wall clock time, inclusive.
     11:59:59 pm on 30 November 2026. One second later the page is in its
     ended state. */
  endsAt: '2026-11-30T23:59:59',
  endsLabel: '30 November 2026',
  endsShort: '30 Nov'
};

/* The visitor's instant, expressed as a Melbourne wall clock string in the
   same shape as OFFER.endsAt, so the two compare as plain strings. */
function melbourneWallClock(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const p = {};
  for (const part of parts) p[part.type] = part.value;

  /* Some ICU builds still report midnight as hour 24 of the previous day. */
  const hour = p.hour === '24' ? '00' : p.hour;

  return p.year + '-' + p.month + '-' + p.day + 'T' + hour + ':' + p.minute + ':' + p.second;
}

/* 'active' while the offer runs, 'ended' from midnight on 1 December 2026. */
function offerState(now) {
  return melbourneWallClock(now || new Date()) <= OFFER.endsAt ? 'active' : 'ended';
}

/* ---------------------------------------------------------------------------
   Rendering
   ---------------------------------------------------------------------------
   new-patient-offer.html carries both states. Each one is wrapped in a marked
   block, and this strips the block that does not apply. The markers are ours
   and are written by hand in that one file, so a plain string scan is enough;
   nothing here parses arbitrary HTML.

     <!--OFFER:ACTIVE-->  ... shown while the offer runs ...  <!--/OFFER:ACTIVE-->
     <!--OFFER:ENDED-->   ... shown once it has ended ...     <!--/OFFER:ENDED-->

   The state also lands on <html> as data-offer-state, which the stylesheet and
   the tracking script read, so neither has to work it out again.
   ------------------------------------------------------------------------- */
function stripBlocks(html, name) {
  const open = '<!--OFFER:' + name + '-->';
  const close = '<!--/OFFER:' + name + '-->';
  let out = '';
  let from = 0;

  for (;;) {
    const start = html.indexOf(open, from);
    if (start === -1) break;
    const end = html.indexOf(close, start);
    if (end === -1) throw new Error('Unclosed OFFER:' + name + ' block in the offer page');
    out += html.slice(from, start);
    from = end + close.length;
  }

  return out + html.slice(from);
}

function renderOfferPage(html, state) {
  if (state !== 'active' && state !== 'ended') throw new Error('Unknown offer state: ' + state);

  /* Drop the other state, then drop the markers around the one that stays, so
     the served page carries no trace of the branch it did not take. */
  const withoutOther = stripBlocks(html, state === 'active' ? 'ENDED' : 'ACTIVE')
    .replace(/[ \t]*<!--\/?OFFER:(?:ACTIVE|ENDED)-->\n?/g, '')
    /* The maintainer's note at the top of the source file describes a file
       that is never served. Serving it would be confusing, so it goes. */
    .replace(/<!DOCTYPE html>\n<!--[\s\S]*?-->\n/, '<!DOCTYPE html>\n');

  if (!/data-offer-state="[a-z]+"/.test(withoutOther)) {
    throw new Error('The offer page is missing its data-offer-state attribute');
  }

  return withoutOther.replace(/data-offer-state="[a-z]+"/, 'data-offer-state="' + state + '"');
}

module.exports = { OFFER, TZ, melbourneWallClock, offerState, renderOfferPage, stripBlocks };

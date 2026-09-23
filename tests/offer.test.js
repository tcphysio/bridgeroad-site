/* ============================================================================
   Tests for the school holiday offer
   ----------------------------------------------------------------------------
   Run:  node --test tests/

   No test framework and no dependencies, because the site has no build step
   and no package.json, and adding one for two landing pages is not worth it.
   node --test has been in Node since 18.
   ========================================================================== */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { OFFER, offerState, melbourneWallClock, renderOfferPage } = require('../api/_offer.js');

const ROOT = path.join(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'new-patient-offer-source.html'), 'utf8');
const ACTIVE = renderOfferPage(SOURCE, 'active');
const ENDED = renderOfferPage(SOURCE, 'ended');
const EVERGREEN = fs.readFileSync(path.join(ROOT, 'physio-richmond.html'), 'utf8');

/* Melbourne is on daylight saving (UTC+11) by the end of 4 October 2026: the
   change happens at 2 am that morning. So the last second of the offer is
   2026-10-04T23:59:59+11:00, which is 12:59:59 UTC, and the offer ends one
   second later at 13:00:00 UTC. Every instant below is written in UTC so the
   test states the conversion rather than assuming it. */
const LAST_SECOND_UTC = '2026-10-04T12:59:59Z';
const FIRST_SECOND_AFTER_UTC = '2026-10-04T13:00:00Z';

test('the offer is active at 11:59:59 pm on 4 October 2026 in Melbourne', () => {
  const at = new Date(LAST_SECOND_UTC);
  assert.strictEqual(melbourneWallClock(at), '2026-10-04T23:59:59');
  assert.strictEqual(offerState(at), 'active');
});

test('the offer has ended at 12:00:00 am on 5 October 2026 in Melbourne', () => {
  const at = new Date(FIRST_SECOND_AFTER_UTC);
  assert.strictEqual(melbourneWallClock(at), '2026-10-05T00:00:00');
  assert.strictEqual(offerState(at), 'ended');
});

test('the boundary is the Melbourne clock, not UTC', () => {
  /* Midnight UTC on 5 October is 11 am on the 5th in Melbourne: well past the
     end. Midday UTC on the 4th is 11 pm on the 4th in Melbourne: still on. */
  assert.strictEqual(offerState(new Date('2026-10-05T00:00:00Z')), 'ended');
  assert.strictEqual(offerState(new Date('2026-10-04T12:00:00Z')), 'active');
});

test('daylight saving is read from the timezone database, not a fixed offset', () => {
  /* Before the change Melbourne is UTC+10, after it UTC+11. The same wall
     clock time therefore sits at two different UTC instants, and both have to
     resolve correctly. */
  assert.strictEqual(melbourneWallClock(new Date('2026-10-01T13:59:59Z')), '2026-10-01T23:59:59'); // AEST, +10
  assert.strictEqual(melbourneWallClock(new Date('2026-10-04T12:59:59Z')), '2026-10-04T23:59:59'); // AEDT, +11
  assert.strictEqual(offerState(new Date('2026-10-01T13:59:59Z')), 'active');

  /* 2 am to 3 am on 4 October does not exist in Melbourne. The hour before the
     jump and the hour after it must both still land on the right side. */
  assert.strictEqual(melbourneWallClock(new Date('2026-10-03T15:30:00Z')), '2026-10-04T01:30:00');
  assert.strictEqual(melbourneWallClock(new Date('2026-10-03T16:30:00Z')), '2026-10-04T03:30:00');
});

test('the answer does not depend on the server timezone', () => {
  /* Vercel runs functions in UTC, but the result has to hold anywhere. */
  const probe = [
    'const {offerState}=require(process.argv[1]);',
    'process.stdout.write(offerState(new Date(process.argv[2]))+" "+offerState(new Date(process.argv[3])));'
  ].join('');

  for (const tz of ['UTC', 'America/New_York', 'Australia/Perth', 'Pacific/Kiritimati']) {
    const out = execFileSync(process.execPath,
      ['-e', probe, path.join(ROOT, 'api', '_offer.js'), LAST_SECOND_UTC, FIRST_SECOND_AFTER_UTC],
      { env: Object.assign({}, process.env, { TZ: tz }), encoding: 'utf8' });
    assert.strictEqual(out, 'active ended', 'wrong result with TZ=' + tz);
  }
});

test('the campaign figures agree with each other', () => {
  assert.strictEqual(OFFER.standardFee - OFFER.offerFee, OFFER.saving);
  assert.strictEqual(Math.round(OFFER.standardFee * (1 - OFFER.percent / 100)), OFFER.offerFee);

  /* site-config.js is a browser file, so read it rather than requiring it. */
  const cfg = fs.readFileSync(path.join(ROOT, 'site-config.js'), 'utf8');
  for (const line of [
    "name: 'school_holiday_2026'", 'standardFee: 180', 'offerFee: 144',
    'saving: 36', 'percent: 20', "endsLabel: '4 October 2026'"
  ]) {
    assert.ok(cfg.includes(line), 'site-config.js is missing ' + line);
  }

  /* The initial consultation the offer discounts is still $180 on the fees
     list. If that ever moves, the offer maths is wrong everywhere. */
  assert.ok(cfg.includes("{ label: 'Initial consultation',             minutes: 45, price: 180"),
    'the standard initial consultation is no longer $180 in site-config.js');
});

test('rendering leaves no trace of the state that was not taken', () => {
  for (const [name, html] of [['active', ACTIVE], ['ended', ENDED]]) {
    assert.ok(!/<!--\/?OFFER:/.test(html), name + ' still carries block markers');
    assert.strictEqual((html.match(/<title>/g) || []).length, 1, name + ' has the wrong number of titles');
    assert.strictEqual((html.match(/<h1[ >]/g) || []).length, 1, name + ' has the wrong number of h1s');
    assert.ok(html.includes('data-offer-state="' + name + '"'));
    assert.ok(html.includes('<meta name="robots" content="noindex,follow">'), name + ' is not noindex');
  }
  assert.throws(() => renderOfferPage(SOURCE, 'something-else'));
});

test('the active page states the price, the saving and the expiry', () => {
  assert.ok(ACTIVE.includes('School holiday new patient offer'));
  assert.ok(ACTIVE.includes('Get back to doing what you enjoy.'));
  assert.ok(ACTIVE.includes('<s>$180</s>'));
  assert.ok(ACTIVE.includes('<span class="sr-only">Standard fee </span>'));
  assert.ok(ACTIVE.includes('<span class="sr-only">Offer fee </span>$144'));
  assert.ok(ACTIVE.includes('Save $36'));
  assert.ok(ACTIVE.includes('Ends 4 October 2026'));
});

test('the full terms sit next to the final call to action, unabbreviated', () => {
  const TERMS = 'New patients only. 20% off one standard initial physiotherapy ' +
    'consultation. Standard fee $180. Offer fee $144. Appointment must be attended ' +
    'by 4 October 2026. Subject to availability. Not valid with another offer. ' +
    'Extended consultations and other appointment types are excluded.';
  assert.ok(ACTIVE.includes(TERMS), 'the required terms are missing or altered');
  assert.ok(!/T&Cs? apply/i.test(ACTIVE), 'the terms have been shortened');

  /* The terms must follow the final booking button, not sit somewhere above it. */
  const cta = ACTIVE.indexOf('data-cta-location="final"');
  assert.ok(cta > -1 && ACTIVE.indexOf(TERMS) > cta, 'the terms are not below the final CTA');
});

test('the ended page drops every promotional claim', () => {
  for (const gone of ['$144', '$180', 'Save $36', '20% off', 'School holiday new patient offer',
                      'schema.org', 'offer-sticky', 'data-cta-promo']) {
    assert.ok(!ENDED.includes(gone), 'the ended page still contains "' + gone + '"');
  }
  assert.ok(ENDED.includes('This offer has ended'));
  assert.ok(ENDED.includes('Need help with an injury?'));
  assert.ok(ENDED.includes('You can still book a physiotherapy appointment with Bridge Road Physiotherapy in Richmond.'));
  assert.ok(ENDED.includes('href="/physio-richmond"'), 'the ended page does not point at the evergreen page');

  /* Every call to action goes to the standard booking path. */
  const hrefs = [...ENDED.matchAll(/<a [^>]*data-cta="book"[^>]*>/g)].map(m => m[0]);
  assert.ok(hrefs.length >= 3, 'the ended page has too few booking links');
  for (const a of hrefs) {
    assert.ok(/href="\/book\.html"/.test(a), 'an ended CTA does not point at /book.html: ' + a);
  }
});

test('every active booking CTA carries the promotional link and its tracking', () => {
  const links = [...ACTIVE.matchAll(/<a [^>]*data-cta="book"[^>]*>/g)].map(m => m[0]);
  assert.strictEqual(links.length, 4, 'expected header, hero, final and sticky booking CTAs');
  for (const a of links) {
    assert.ok(/data-cta-promo/.test(a), 'a promotional CTA is not marked as one: ' + a);
    assert.ok(/href="\/book\.html\?offer=school-holiday"/.test(a), 'unexpected booking href: ' + a);
    assert.ok(/data-cta-location="(header|hero|final|sticky)"/.test(a), 'a CTA has no location: ' + a);
  }
});

test('no page makes a claim it cannot support', () => {
  /* AHPRA: no testimonials, no guarantees, no superiority claims. */
  const banned = [
    /\bbest\b/i, /\bleading\b/i, /\bspecialist\b/i, /\bexpert\b/i,
    /\bguarantee/i, /\bcure\b/i, /pain[- ]free\b/i, /\bfastest\b/i,
    /<blockquote/i, /testimonial/i, /aggregateRating/i, /\bReview\b(?!\s+consultation)/
  ];
  for (const [name, html] of [['active', ACTIVE], ['ended', ENDED], ['evergreen', EVERGREEN]]) {
    const body = html.replace(/<!--[\s\S]*?-->/g, '');
    for (const re of banned) {
      assert.ok(!re.test(body), name + ' matches a banned claim pattern: ' + re);
    }
  }
});

test('the required local details are present and consistent', () => {
  for (const [name, html] of [['active', ACTIVE], ['ended', ENDED], ['evergreen', EVERGREEN]]) {
    assert.ok(html.includes('Bridge Road Physiotherapy'), name);
    assert.ok(html.includes('Inside Uplift Gym'), name);
    assert.ok(html.includes('Richmond'), name);
    assert.ok(html.includes('507 Bridge Road'), name);
    assert.ok(html.includes('href="tel:+61458007583"'), name + ' has no phone link');
    assert.ok(html.includes('href="mailto:thihan@bridgeroad.physio"'), name + ' has no email link');
    /* The map link must resolve to the Google Business Profile, not a bare
       street-address search. */
    assert.ok(html.includes('query_place_id=ChIJdVQ-b55D1moR6CP1dXlFyQ4'), name + ' has no Business Profile map link');
    assert.ok(html.includes('href="/privacy.html"') && html.includes('href="/terms.html"'), name + ' is missing a policy link');
  }
});

test('the evergreen page does not compete with the homepage for the same query', () => {
  assert.ok(EVERGREEN.includes('<meta name="robots" content="noindex,follow">'));
  assert.ok(!/"@type":\s*"(Physiotherapy|LocalBusiness|MedicalBusiness)"/.test(EVERGREEN),
    'the evergreen page carries business structured data while noindex');
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  assert.ok(!sitemap.includes('physio-richmond'), 'a noindex page is listed in the sitemap');
  assert.ok(!sitemap.includes('new-patient-offer'), 'a noindex page is listed in the sitemap');
  assert.strictEqual((EVERGREEN.match(/<h1[ >]/g) || []).length, 1);
});

test('the routes the ads point at are wired up', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const rewrite = vercel.rewrites.find(r => r.source === '/new-patient-offer');
  assert.ok(rewrite && rewrite.destination === '/api/new-patient-offer');
  assert.ok(vercel.rewrites.some(r => r.source === '/physio-richmond'));
  /* The template must not be reachable in its unrendered form. */
  assert.ok(vercel.redirects.some(r => r.source === '/new-patient-offer-source.html'));
  assert.ok(!fs.existsSync(path.join(ROOT, 'new-patient-offer.html')),
    'a file at new-patient-offer.html would be served instead of the function');
  assert.strictEqual(vercel.functions['api/new-patient-offer.js'].includeFiles, 'new-patient-offer-source.html');
});

/* ============================================================================
   Tests for the website blueprint gaps
   ----------------------------------------------------------------------------
   Run:  npm test   (or node --test tests/blueprint.test.js)

   The FAQ answers owners are most often asked for, the booking steps beside
   the calendar, the services column in the footer and the suburbs in the
   business listing data.
   ========================================================================== */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const STANDARD = ['404.html', 'about.html', 'accessibility.html', 'book.html', 'cancellation.html', 'contact.html',
  'cricket.html', 'disclaimer.html', 'faq.html', 'fees.html', 'index.html', 'privacy.html', 'services.html',
  'terms.html', 'blog/index.html', 'blog/lumbar-stress-fast-bowlers/index.html',
  'lower-back-pain.html', 'hip-pain.html', 'shoulder-pain.html', 'neck-pain.html', 'knee-pain.html', 'ankle-pain.html'];
const AREAS = ['lower-back-pain', 'hip-pain', 'shoulder-pain', 'neck-pain', 'knee-pain', 'ankle-pain'];

function faqSchema(s) {
  return [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1])).find((j) => j['@type'] === 'FAQPage');
}

test('the FAQ answers public holidays, suburbs, number of appointments and home exercises', () => {
  const s = read('faq.html');
  const shown = [...s.matchAll(/onclick="faq\(this\)">(.*?)<span/g)].map((m) => m[1]);
  for (const q of ['Are you open on public holidays?', 'Which suburbs do patients come from?',
    'How many appointments will I need?', 'Will I get exercises to do at home?']) {
    assert.ok(shown.includes(q), 'missing: ' + q);
  }
  assert.match(s, /opens by request on selected public holidays/);
  assert.match(s, /Hawthorn, Abbotsford, East Melbourne, South Yarra, Malvern, Toorak and Kew/);
  assert.deepStrictEqual(faqSchema(s).mainEntity.map((q) => q.name), shown, 'FAQ schema out of step with the page');
});

test('no FAQ answer promises a number of sessions or a result', () => {
  const text = read('faq.html').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(text, /\b(guarantee[sd]?|cure[sd]?|pain[- ]free|only need \d)\b/i);
});

test('the booking page walks through the three steps beside the calendar', () => {
  const s = read('book.html');
  const steps = s.match(/<ol class="book-steps">([\s\S]*?)<\/ol>/);
  assert.ok(steps, 'no booking steps');
  assert.strictEqual((steps[1].match(/<li>/g) || []).length, 3);
  assert.match(steps[1], /Initial Consultation[\s\S]*Review Consultation/);
  assert.match(steps[1], /tel:\+61458007583/);
  assert.ok(s.indexOf('class="book-steps"') < s.indexOf('class="booking-embed"'), 'steps should sit before the calendar');
});

for (const page of STANDARD) {
  test(page + ' footer lists the body-area pages and the public holiday hours', () => {
    const s = read(page);
    const foot = s.slice(s.indexOf('<footer'), s.indexOf('</footer>'));
    const prefix = page.startsWith('blog/') ? '/' : '';
    assert.ok(foot.includes('class="foot__grid foot__grid--5"'));
    const col = foot.match(/<div class="foot__areas">([\s\S]*?)<\/div>/);
    assert.ok(col, 'no Pain and injuries column');
    for (const a of AREAS) assert.ok(col[1].includes('href="' + prefix + a + '.html"'), 'footer missing ' + a);
    assert.match(foot, /selected public holidays by request/);
  });
}

test('the business listing data names the suburbs patients come from', () => {
  const s = read('index.html');
  const biz = [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1])).map((j) => (j['@graph'] || [j])).flat().find((j) => j.areaServed);
  const names = biz.areaServed.map((a) => a.name);
  for (const x of ['Richmond', 'Hawthorn', 'Abbotsford', 'East Melbourne', 'South Yarra', 'Malvern', 'Toorak', 'Kew']) {
    assert.ok(names.includes(x + ', Victoria'), 'areaServed missing ' + x);
  }
});

test('the five-column footer layout only applies on wide screens', () => {
  /* Unscoped, it outranked the two-column phone footer and split it into
     five squeezed columns wider than a 320px screen. */
  const css = read('style.css');
  const bare = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  assert.doesNotMatch(bare, /\.foot__grid--5\s*\{[^}]*grid-template-columns/, 'foot__grid--5 columns set outside a media query');
});

test('the phone header centres the logo with the Menu button on the left', () => {
  const css = read('style.css');
  assert.match(css, /@media\(max-width:900px\)\{\s*\.nav\{display:grid;grid-template-columns:1fr auto 1fr/);
  for (const page of STANDARD) {
    assert.ok(read(page).includes('<div class="container nav"><button class="burger"'), page + ': Menu button is not first in the header');
  }
});

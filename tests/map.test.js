/* ============================================================================
   Tests for the embedded map
   ----------------------------------------------------------------------------
   Run:  npm test   (or node --test tests/map.test.js)

   The map's embed address lives in three places: the contact page iframe, the
   homepage's "Show the map" link and mapEmbedUrl in site-config.js.
   PHOTO-GUIDE.txt says how to replace it. These tests catch a partial update.
   ========================================================================== */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('the homepage map loads only on request, and works as a plain link without JavaScript', () => {
  const home = read('index.html');
  assert.ok(!/<iframe[^>]*google\.com\/maps\/embed/.test(home), 'homepage embeds the map on load');
  const link = home.match(/<a class="map__load" href="([^"]+)"[^>]*data-map-embed="([^"]+)"[^>]*>/);
  assert.ok(link, 'no Show the map link');
  assert.ok(link[1].startsWith('https://www.google.com/maps/'), 'the link does not go to Google Maps');
  assert.ok(/data-track="map_open"/.test(link[0]), 'the link is not tracked');
  assert.ok(read('script.js').includes('[data-map-embed]'), 'script.js does not load the embed');
});

test('the contact page, the homepage and site-config.js use the same map', () => {
  const contact = read('contact.html').match(/<iframe src="(https:\/\/www\.google\.com\/maps\/embed\?[^"]+)"/)[1];
  const home = read('index.html').match(/data-map-embed="([^"]+)"/)[1];
  const cfg = read('site-config.js').match(/mapEmbedUrl:\s*'([^']+)'/)[1];
  assert.strictEqual(home, contact);
  assert.strictEqual(cfg, contact);
});

/* Renders tools/og-new-patient-offer.html to /og-new-patient-offer.jpg at
   1200 x 630, the size Facebook, LinkedIn and X all read.

   Needs Playwright and a Chromium build, which are not project dependencies:
   this is a one-off authoring step, not part of serving the site. Run it only
   when the card itself changes.

     npx playwright@1.56 install chromium   # if Chromium is not already there
     node tools/og-render.js
*/
'use strict';

const path = require('path');
const { chromium } = require('playwright');

const SOURCE = 'file://' + path.join(__dirname, 'og-new-patient-offer.html');
const OUT = path.join(__dirname, '..', 'og-new-patient-offer.jpg');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(SOURCE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT, type: 'jpeg', quality: 90 });
  await browser.close();
  console.log('wrote', OUT);
})().catch((err) => { console.error(err); process.exit(1); });

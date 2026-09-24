/* ============================================================================
   Tests for the deploy-time version stamps and the files pages point at
   ----------------------------------------------------------------------------
   Run:  npm test   (or node --test tests/stamp-assets.test.js)
   ========================================================================== */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const { hash, joinSiteJs, stampHtml, run, NOT_PUBLIC } = require('../tools/stamp-assets.js');

const ROOT = path.join(__dirname, '..');
const V = { 'style.css': 'aaaaaaaaaa', 'site.js': 'bbbbbbbbbb', 'chat.js': 'cccccccccc', 'campaign.js': 'dddddddddd' };

function pages() {
  const found = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!['.git', '.vercel', 'node_modules', 'docs', 'tests', 'tools'].includes(e.name)) walk(path.join(dir, e.name));
      } else if (e.name.endsWith('.html')) found.push(path.join(dir, e.name));
    }
  })(ROOT);
  return found;
}

test('joins the two script tags and stamps every asset, keeping each page\'s path style', () => {
  const root = '<link rel="stylesheet" href="style.css"><script src="site-config.js"></script><script src="script.js"></script><script src="chat.js" defer></script>';
  const blog = '<link rel="stylesheet" href="/style.css"><script src="/site-config.js"></script><script src="/script.js"></script><script src="/campaign.js"></script>';
  assert.strictEqual(stampHtml(root, V).html,
    '<link rel="stylesheet" href="style.css?v=aaaaaaaaaa"><script src="site.js?v=bbbbbbbbbb"></script><script src="chat.js?v=cccccccccc" defer></script>');
  assert.strictEqual(stampHtml(blog, V).html,
    '<link rel="stylesheet" href="/style.css?v=aaaaaaaaaa"><script src="/site.js?v=bbbbbbbbbb"></script><script src="/campaign.js?v=dddddddddd"></script>');
});

test('stamping twice changes nothing, and a new version replaces the old one', () => {
  const once = stampHtml('<link href="style.css"><script src="site-config.js"></script><script src="script.js"></script>', V).html;
  assert.strictEqual(stampHtml(once, V).html, once);
  const next = stampHtml(once, Object.assign({}, V, { 'style.css': 'eeeeeeeeee' })).html;
  assert.ok(next.includes('style.css?v=eeeeeeeeee') && !next.includes('aaaaaaaaaa'));
});

test('leaves lookalike filenames alone', () => {
  const html = '<script src="new-script.js"></script><link href="print-style.css"><img src="chat.jsx">';
  assert.strictEqual(stampHtml(html, V).html, html);
});

test('site.js compiles and defines window.BRP before script.js runs', () => {
  const siteJs = joinSiteJs(fs.readFileSync(path.join(ROOT, 'site-config.js'), 'utf8'), fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8'));
  assert.doesNotThrow(() => new vm.Script(siteJs));
  assert.ok(siteJs.indexOf('window.BRP') < siteJs.indexOf('const hdr'), 'site-config.js must come first');
});

test('once stamped, no deployed page still loads an unversioned CSS or JS file', () => {
  for (const file of pages()) {
    const { html } = stampHtml(fs.readFileSync(file, 'utf8'), V);
    const plain = html.match(/(?:src|href)="\/?(?:style\.css|site-config\.js|script\.js|chat\.js|campaign\.js)"/g);
    assert.strictEqual(plain, null, path.relative(ROOT, file) + ' still loads ' + (plain || []).join(', '));
  }
});

test('a dry run writes nothing; a real run stamps in place and publishes only the site', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  for (const f of ['site-config.js', 'script.js', 'chat.js', 'campaign.js', 'style.css', 'package.json']) fs.writeFileSync(path.join(dir, f), '/* ' + f + ' */');
  fs.mkdirSync(path.join(dir, 'api'));
  fs.writeFileSync(path.join(dir, 'api', 'chat.js'), '/* function source */');
  fs.mkdirSync(path.join(dir, 'blog'));
  const page = '<link href="style.css"><script src="site-config.js"></script><script src="script.js"></script>';
  fs.writeFileSync(path.join(dir, 'index.html'), page);
  fs.writeFileSync(path.join(dir, 'blog', 'index.html'), page.replace(/"(?=\w)/g, '"/'));

  const dry = run(dir, false);
  assert.strictEqual(dry.pages, 2);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), page);
  assert.ok(!fs.existsSync(path.join(dir, 'site.js')) && !fs.existsSync(path.join(dir, 'public')));

  run(dir, true);
  const v = hash(fs.readFileSync(path.join(dir, 'site.js'), 'utf8'));
  assert.ok(fs.readFileSync(path.join(dir, 'index.html'), 'utf8').includes('site.js?v=' + v), 'root copy stamped for the functions');
  assert.ok(fs.readFileSync(path.join(dir, 'public', 'index.html'), 'utf8').includes('site.js?v=' + v));
  assert.ok(fs.readFileSync(path.join(dir, 'public', 'blog', 'index.html'), 'utf8').includes('/site.js?v=' + v));
  for (const f of ['site.js', 'site-config.js', 'script.js', 'style.css']) assert.ok(fs.existsSync(path.join(dir, 'public', f)), f + ' not published');
  for (const f of ['api', 'package.json', 'public']) assert.ok(!fs.existsSync(path.join(dir, 'public', f)), f + ' published');

  run(dir, true); // runs twice cleanly, and never nests public/public
  assert.ok(!fs.existsSync(path.join(dir, 'public', 'public')));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Vercel ships the build script, and runs it', () => {
  const ignored = fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  for (const rule of ['tools', 'tools/', 'tools/*', 'tools/stamp-assets.js']) assert.ok(!ignored.includes(rule), '.vercelignore drops the build script: ' + rule);
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  assert.strictEqual(cfg.buildCommand, 'node tools/stamp-assets.js');
  assert.strictEqual(cfg.outputDirectory, 'public');
});

test('every local image, font and preload a page points at exists and gets published', () => {
  const missing = [];
  for (const file of pages()) {
    const html = fs.readFileSync(file, 'utf8');
    const refs = [];
    for (const m of html.matchAll(/<(?:img|source|link)\b[^>]*>/g)) {
      const tag = m[0];
      if (/<link/.test(tag) && !/rel="(?:preload|icon|apple-touch-icon)"/.test(tag)) continue;
      for (const a of tag.matchAll(/\b(?:src|href)="([^"]+)"/g)) refs.push(a[1]);
      for (const a of tag.matchAll(/\b(?:srcset|imagesrcset)="([^"]+)"/g)) a[1].split(',').forEach((c) => refs.push(c.trim().split(/\s+/)[0]));
    }
    for (const ref of refs) {
      if (/^(?:https?:|data:|mailto:|tel:|#)/.test(ref)) continue;
      const target = ref.startsWith('/') ? path.join(ROOT, ref) : path.join(path.dirname(file), ref);
      if (!fs.existsSync(target.split('?')[0])) missing.push(path.relative(ROOT, file) + ' -> ' + ref);
      else if (NOT_PUBLIC.has(path.relative(ROOT, target).split(path.sep)[0])) missing.push(path.relative(ROOT, file) + ' -> ' + ref + ' (never published)');
    }
  }
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  for (const m of css.matchAll(/url\((\/[^)'"]+)\)/g)) if (!fs.existsSync(path.join(ROOT, m[1]))) missing.push('style.css -> ' + m[1]);
  assert.deepStrictEqual(missing, []);
});

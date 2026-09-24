/* ============================================================================
   Bridge Road Physiotherapy: version stamps for CSS and JS, run at deploy
   ----------------------------------------------------------------------------
   Vercel runs this on every deployment (vercel.json, "buildCommand"). It:

     1. writes site.js, which is site-config.js and script.js joined, so each
        page makes one request for them instead of two
     2. rewrites every style.css, site.js, chat.js and campaign.js reference
        in the HTML to carry ?v=<first 10 characters of the file's hash>
     3. copies the site into public/, which Vercel serves once a project has
        a build step. api/, node_modules, tests, tools and the package files
        stay out, so the function source and dependencies are never public.
        The HTML is also stamped where it sits, because the offer and chat
        functions read the root copies.

   vercel.json caches any .css or .js request that carries ?v= for a year.
   A changed file gets a new hash, so the next deployment's pages ask for a
   new URL and browsers fetch it fresh. A reference this script misses keeps
   the old max-age=0 rule: slower, never stale.

   The files in git are never stamped. Pages keep their plain site-config.js
   and script.js tags, so the folder still works served as it is. To stop a
   local run leaving stamped HTML behind to commit, the script only writes on
   Vercel (VERCEL is set) or with --write. Otherwise it reports what it would
   change and exits.

   No dependencies, like the tests. Tests: tests/stamp-assets.test.js
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const STAMPED = ['style.css', 'site.js', 'chat.js', 'campaign.js'];
const SKIP_DIRS = new Set(['.git', '.vercel', 'node_modules', 'docs', 'tests', 'tools', 'public']);
/* Never copied into public/. .vercelignore already drops the notes files on
   Vercel; this list covers what has to be in the build but not on the web. */
const NOT_PUBLIC = new Set(['.git', '.vercel', '.gitignore', '.vercelignore', 'node_modules', 'api', 'docs', 'tests', 'tools', 'public',
  'package.json', 'package-lock.json', 'vercel.json', 'README.md', 'CAMPAIGN.md', 'PHOTO-GUIDE.txt']);

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);
}

/* site-config.js has to run first: script.js and chat.js read window.BRP.
   Neither file has a top-level 'use strict', so joining them changes nothing
   about how either runs. */
function joinSiteJs(siteConfig, script) {
  return '/* Built at deploy by tools/stamp-assets.js from site-config.js and script.js. Edit those, not this. */\n' +
    siteConfig.replace(/\s*$/, '\n') + ';\n' + script;
}

/* The two tags always sit together at the end of <body>, with or without a
   leading slash. The backreference keeps a page's own style of path. */
const PAIR = /<script src="(\/?)site-config\.js"><\/script>\s*<script src="\1script\.js"><\/script>/g;
const ASSET = new RegExp('(src|href)="(/?)(' + STAMPED.map((f) => f.replace('.', '\\.')).join('|') + ')(?:\\?v=[0-9a-f]+)?"', 'g');

function stampHtml(html, versions) {
  let joined = 0;
  let stamped = 0;
  let out = html.replace(PAIR, (m, slash) => { joined++; return '<script src="' + slash + 'site.js"></script>'; });
  out = out.replace(ASSET, (m, attr, slash, file) => { stamped++; return attr + '="' + slash + file + '?v=' + versions[file] + '"'; });
  return { html: out, joined, stamped };
}

function htmlFiles(dir) {
  let found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) found = found.concat(htmlFiles(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.html')) {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

function run(root, write) {
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const siteJs = joinSiteJs(read('site-config.js'), read('script.js'));
  const versions = { 'site.js': hash(siteJs) };
  for (const f of STAMPED) if (f !== 'site.js') versions[f] = hash(read(f));

  const report = [];
  let pages = 0;
  for (const file of htmlFiles(root)) {
    const before = fs.readFileSync(file, 'utf8');
    const { html, joined, stamped } = stampHtml(before, versions);
    if (html === before) continue;
    pages++;
    report.push(path.relative(root, file) + ': ' + stamped + ' stamped' + (joined ? ', scripts joined' : ''));
    if (write) fs.writeFileSync(file, html);
  }
  if (write) {
    fs.writeFileSync(path.join(root, 'site.js'), siteJs);
    publish(root);
  }
  return { versions, pages, report };
}

function publish(root) {
  const out = path.join(root, 'public');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out);
  for (const name of fs.readdirSync(root)) {
    if (NOT_PUBLIC.has(name)) continue;
    fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
  }
}

if (require.main === module) {
  const write = Boolean(process.env.VERCEL) || process.argv.includes('--write');
  const { versions, pages, report } = run(ROOT, write);
  console.log(report.join('\n'));
  console.log('versions: ' + JSON.stringify(versions));
  /* Zero pages means the patterns stopped matching the markup. Fail the
     build, so Vercel keeps the last good deployment live. */
  if (pages === 0) {
    console.error('stamp-assets: no page references a stamped file. Check the patterns against the HTML.');
    process.exit(1);
  }
  console.log(write ? pages + ' pages stamped, site.js written, site copied to public/.' : 'Dry run, nothing written. ' + pages + ' pages would change. Pass --write to apply.');
}

module.exports = { hash, joinSiteJs, stampHtml, run, NOT_PUBLIC };

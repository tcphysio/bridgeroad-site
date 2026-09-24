# bridgeroad-site
Bridge Road Physiotherapy website

Static pages served by Vercel, plus three Vercel Functions in `api/`. One small
deploy step, described under Speed and caching.

## Owner to-do

`docs/owner-actions.md`: the jobs that need a login or a decision, such as
Google Analytics, the Tag Manager check and directory listings.

## Tests

```
npm install
npm test
```

## Chat assistant

The "Ask a question" chat answers practical questions (fees, rebates, which
appointment, parking) from the site's own pages. It stays hidden until it is
switched on.

To switch it on, in the Vercel dashboard under Settings, Environment Variables:

- `ANTHROPIC_API_KEY`: an API key from console.anthropic.com.
- Set a monthly spend limit on that Anthropic account. It is the only hard cap
  on cost.

Optional:

- `CHAT_ENABLED=false` hides the chat again without removing the key.
- `CHAT_MODEL` defaults to `claude-opus-5`. `claude-sonnet-5` is cheaper per
  message.

Redeploy after changing a variable. The buttons appear within five minutes.

The assistant's rules are in `api/_chat.js`. Its knowledge is read from the
pages listed there, so updating a page updates the assistant on the next
deployment. `privacy.html#chat` describes the chat to patients: change it if
the provider or the data handling changes.

## Speed and caching

- **CSS and JS.** On every deployment Vercel runs `tools/stamp-assets.js`. It
  joins `site-config.js` and `script.js` into `site.js`, then adds
  `?v=<hash>` to `style.css`, `site.js`, `chat.js` and `campaign.js` in every
  page. Those URLs are cached for a year, and a changed file gets a new hash.
  Edit the files as normal: the copies in git are never stamped.
  `npm run build` shows what it would change without writing anything.
- **New pages** need nothing extra, as long as they load the styles and
  scripts the same way the other pages do. `npm test` checks that.
- **Fonts** live in `fonts/` and are cached for a year. A changed font needs a
  new filename.
- **Photos.** Give each size its own file (`...-600.webp`, `...-900.webp`) and
  list them in `srcset`. Never replace an image under the same name: browsers
  keep images for a week. The originals stay in the repo as masters.

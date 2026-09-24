# bridgeroad-site
Bridge Road Physiotherapy website

Static pages served by Vercel, plus three Vercel Functions in `api/`. No build step.

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

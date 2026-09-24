/* ============================================================================
   Bridge Road Physiotherapy — chat assistant endpoint
   ----------------------------------------------------------------------------
   GET  /api/chat   {"enabled": true|false}. chat.js asks this once per visit
                    and shows the chat buttons only when it is true, so the
                    site never offers a chat that cannot answer.
   POST /api/chat   {"messages":[{"role":"user","content":"..."}, ...]}
                    Streams the reply back as newline-delimited JSON:
                      {"type":"text","text":"..."}   a piece of the reply
                      {"type":"refusal"}             Claude declined; the
                                                     browser shows the phone
                                                     number instead
                      {"type":"done"}                finished
                      {"type":"error","message":"..."}

   REQUIRED environment variable, set in the Vercel dashboard:
     ANTHROPIC_API_KEY   from console.anthropic.com. Set a monthly spend
                         limit on that account as well: it is the only hard
                         cap on what the assistant can cost.

   OPTIONAL:
     CHAT_ENABLED        set to "false" to switch the assistant off without
                         removing the key. The buttons disappear within five
                         minutes (the GET is cached at the edge).
     CHAT_MODEL          default claude-opus-5. claude-sonnet-5 costs less
                         per message and suits this job well too.

   PRIVACY
   Nothing a visitor types is stored or logged here. The conversation lives in
   the visitor's own browser tab and is sent to Anthropic to generate each
   reply. Logs record only failures, never message text. privacy.html
   describes this to patients; change the two together.
   ========================================================================== */

'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { systemStable, systemVolatile, cleanMessages, makeLimiter } = require('./_chat.js');

const MODEL = (process.env.CHAT_MODEL || 'claude-opus-5').trim();

/* Fallbacks re-run a request on another model if the first one's safety
   classifier declines it, which a clinic FAQ should almost never trip. Only
   sent to models that take the parameter, so switching CHAT_MODEL to Sonnet
   or Haiku does not start failing every request. */
const TAKES_FALLBACKS = /^claude-(opus-5|fable-5)/.test(MODEL);
/* Low effort keeps replies quick and cheap; these are short factual
   answers. Haiku 4.5 rejects the effort setting, so it is left off there. */
const TAKES_EFFORT = !/^claude-haiku/.test(MODEL);

const ALLOWED_HOSTS = ['bridgeroad.physio', 'www.bridgeroad.physio', 'localhost'];

const allow = makeLimiter();
let client = null;

function enabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY) && String(process.env.CHAT_ENABLED || '').toLowerCase() !== 'false';
}

/* Same rule as api/enquiry.js: a post must come from this site. Preview
   deployments are covered by comparing against the request's own host. */
function sameOrigin(req) {
  const raw = req.headers.origin || req.headers.referer;
  if (!raw) return false; // the chat is always posted by chat.js, which sends one
  let from;
  try { from = new URL(raw).hostname.toLowerCase(); } catch (e) { return false; }
  const self = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
  return (self && from === self) || ALLOWED_HOSTS.includes(from);
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || String(req.headers['x-real-ip'] || '') || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function readBody(req) {
  let b = req.body;
  if (!b) return {};
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch (e) { return {}; }
  }
  return b;
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    /* Fresh at the edge for five minutes, then served stale for up to a day
       while the edge refreshes it in the background, so a visitor after a
       quiet spell does not wait on a cold function. The answer only changes
       with an environment variable, and that needs a redeploy, which clears
       the edge cache anyway. */
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).json({ enabled: enabled() });
  }

  const fail = (status, message) => {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json({ ok: false, error: message });
  };

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return fail(405, 'Method not allowed');
  }
  if (!sameOrigin(req)) return fail(403, 'Forbidden');
  if (!enabled()) return fail(503, 'The assistant is not available right now.');
  if (!allow(clientIp(req))) {
    return fail(429, 'You have sent a lot of questions in a short time. Please wait a few minutes, or call 0458 007 583.');
  }

  const checked = cleanMessages(readBody(req).messages);
  if (checked.error) return fail(400, checked.error);

  if (!client) client = new Anthropic({ maxRetries: 2, timeout: 45 * 1000 });

  const params = {
    model: MODEL,
    /* A hard ceiling on one reply, thinking included. Replies are meant to
       be under 90 words, so this only bites if something has gone wrong,
       and it caps what a single abusive request can cost. */
    max_tokens: 4096,
    system: [
      { type: 'text', text: systemStable(), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: systemVolatile(new Date()) }
    ],
    messages: checked.messages
  };
  if (TAKES_EFFORT) params.output_config = { effort: 'low' };
  if (TAKES_FALLBACKS) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Accel-Buffering', 'no');
  const send = (obj) => { if (!res.writableEnded) res.write(JSON.stringify(obj) + '\n'); };

  const stream = client.beta.messages.stream(params);
  /* The visitor closed the chat or the tab: stop generating. */
  res.on('close', () => { if (!res.writableEnded) stream.abort(); });
  stream.on('text', (delta) => send({ type: 'text', text: delta }));

  try {
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      console.warn('chat: refusal', final.stop_details ? final.stop_details.category : null);
      send({ type: 'refusal' });
    } else if (final.stop_reason === 'max_tokens') {
      console.warn('chat: reply hit max_tokens');
    }
    send({ type: 'done' });
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError) return res.end();
    /* Status and type only. Never the conversation. */
    if (err instanceof Anthropic.RateLimitError) {
      console.error('chat: Anthropic rate limit');
    } else if (err instanceof Anthropic.AuthenticationError) {
      console.error('chat: ANTHROPIC_API_KEY was rejected');
    } else if (err instanceof Anthropic.APIError) {
      console.error('chat: API error', err.status, err.error && err.error.error ? err.error.error.type : '');
    } else {
      console.error('chat: failed', err && err.name);
    }
    send({ type: 'error', message: 'Sorry, the assistant could not answer just now.' });
  }
  return res.end();
};

/* ============================================================================
   Bridge Road Physiotherapy — enquiry handler
   ----------------------------------------------------------------------------
   Receives the contact form and emails it through Resend. Runs as a Vercel
   Function on bridgeroad.physio, so patient enquiries are never stored by a
   third-party form service. Nothing is written to disk or to a database: the
   submission becomes an email and is then gone from here.

   REQUIRED environment variable, set in the Vercel dashboard:
     RESEND_API_KEY     from resend.com, starts with "re_"

   OPTIONAL, with the defaults below:
     ENQUIRY_TO         where enquiries land       (thihan@bridgeroad.physio)
     ENQUIRY_FROM       the verified sending address
                        (Bridge Road Physiotherapy <enquiries@bridgeroad.physio>)

   ENQUIRY_FROM must be on a domain verified in Resend, otherwise Resend
   rejects the send. The patient's own address goes in Reply-To, so replying
   from the inbox goes straight back to them.

   No npm dependencies on purpose: this uses the global fetch built into the
   Node runtime, so the project needs no package.json and no build step.
   ========================================================================== */

const TO = process.env.ENQUIRY_TO || 'thihan@bridgeroad.physio';
const FROM = process.env.ENQUIRY_FROM || 'Bridge Road Physiotherapy <enquiries@bridgeroad.physio>';

/* Hosts the form is allowed to post from, on top of the request's own host.
   The own-host check below is what covers Vercel preview URLs, which change
   with every deployment and cannot be listed here. */
const ALLOWED_HOSTS = [
  'bridgeroad.physio',
  'www.bridgeroad.physio',
  'localhost'
];

/* Field name -> label in the email, and the longest value we will accept. */
const FIELDS = [
  ['name',               'Name',                   120],
  ['email',              'Email',                  200],
  ['phone',              'Phone',                   40],
  ['message',            'Enquiry',               4000],
  ['contact_preference', 'Prefers contact by',      40],
  ['how_heard',          'Heard about the clinic',  80],
  ['marketing_consent',  'Marketing consent',       80],
  ['clinic',             'Form',                    80]
];

/* Campaign attribution, useful but never shown to the patient. */
const ATTRIBUTION = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'landing_page', 'referrer'
];

function escapeHtml(v) {
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function clean(value, max) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

/* Deliberately permissive. Rejecting an unusual but valid address costs a
   patient; a malformed one simply bounces when Thihan replies. */
function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(v) && v.length <= 200;
}

/* Rejects a post initiated from another site, which is the point of the
   check, while accepting any genuine same-origin post. Comparing the Origin
   against the host the request was actually sent to covers the production
   domains, bridgeroad-site.vercel.app and every per-deployment preview URL,
   without enumerating any of them. */
function sameOrigin(req) {
  const raw = req.headers.origin || req.headers.referer;
  if (!raw) return true; // a plain form post need not send one

  let from;
  try {
    from = new URL(raw).hostname.toLowerCase();
  } catch (e) {
    return false;
  }

  const self = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(':')[0].toLowerCase();

  if (self && from === self) return true;
  if (ALLOWED_HOSTS.includes(from)) return true;

  console.warn('enquiry: rejected a post from', from, 'to', self || '(no host)');
  return false;
}

function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch (e) { /* fall through */ }
    return Object.fromEntries(new URLSearchParams(b));
  }
  return b;
}

module.exports = async function handler(req, res) {
  const wantsJson = String(req.headers.accept || '').includes('application/json');

  const fail = (status, message) => {
    if (wantsJson) return res.status(status).json({ ok: false, error: message });
    res.setHeader('Location', '/contact.html?sent=error');
    return res.status(303).end();
  };

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(405, 'Method not allowed');
  }
  if (!sameOrigin(req)) return fail(403, 'Forbidden');

  const body = readBody(req);

  /* Honeypot. A person never sees this field, so anything in it is a bot.
     Answer as though it worked, so the bot has nothing to learn from. */
  if (clean(body._gotcha, 10)) {
    if (wantsJson) return res.status(200).json({ ok: true });
    res.setHeader('Location', '/contact.html?sent=1');
    return res.status(303).end();
  }

  const data = {};
  for (const [key, , max] of FIELDS) data[key] = clean(body[key], max);

  if (!data.name) return fail(422, 'Please add your name.');
  if (!looksLikeEmail(data.email)) return fail(422, 'Please check your email address.');
  if (!data.message) return fail(422, 'Please tell me what you need help with.');

  if (!process.env.RESEND_API_KEY) {
    console.error('enquiry: RESEND_API_KEY is not set, enquiry not sent');
    return fail(500, 'The form is not available right now.');
  }

  const rows = FIELDS
    .filter(([key]) => data[key])
    .map(([key, label]) => [label, data[key]]);

  const attribution = ATTRIBUTION
    .filter((key) => clean(body[key], 200))
    .map((key) => [key, clean(body[key], 200)]);

  const textBody =
    rows.map(([l, v]) => `${l}: ${v}`).join('\n') +
    (attribution.length ? '\n\n--- how they arrived ---\n' +
      attribution.map(([l, v]) => `${l}: ${v}`).join('\n') : '');

  const htmlRow = ([l, v]) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#6b6b63;vertical-align:top;white-space:nowrap">${escapeHtml(l)}</td>` +
    `<td style="padding:6px 0;color:#1c1c1a">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`;

  const htmlBody =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55">` +
    `<p style="margin:0 0 14px"><strong>New website enquiry</strong></p>` +
    `<table style="border-collapse:collapse">${rows.map(htmlRow).join('')}</table>` +
    (attribution.length
      ? `<p style="margin:20px 0 6px;color:#6b6b63;font-size:13px">How they arrived</p>` +
        `<table style="border-collapse:collapse;font-size:13px">${attribution.map(htmlRow).join('')}</table>`
      : '') +
    `<p style="margin:20px 0 0;color:#6b6b63;font-size:13px">Reply to this email and it goes straight back to ` +
    `${escapeHtml(data.name)}.</p></div>`;

  try {
    const resend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: data.email,
        subject: `Website enquiry from ${data.name}`,
        text: textBody,
        html: htmlBody
      })
    });

    if (!resend.ok) {
      const detail = await resend.text();
      console.error('enquiry: resend rejected the send', resend.status, detail.slice(0, 500));
      return fail(502, 'The message could not be sent.');
    }
  } catch (err) {
    console.error('enquiry: could not reach resend', err && err.message);
    return fail(502, 'The message could not be sent.');
  }

  if (wantsJson) return res.status(200).json({ ok: true });
  res.setHeader('Location', '/contact.html?sent=1');
  return res.status(303).end();
};

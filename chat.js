/* ============================================================================
   Bridge Road Physiotherapy — chat assistant, in the browser
   ----------------------------------------------------------------------------
   Adds the "Ask a question" chat. It answers practical questions (fees,
   rebates, which appointment, parking) from the site's own pages, through
   /api/chat. It does not give clinical advice; api/_chat.js holds its rules.

   Nothing shows until /api/chat says the assistant is switched on, so a
   deployment without an API key simply has no chat buttons. The answer is
   remembered for the visit so the check runs once, not on every page.

   Where it opens from:
     - the Ask button in the phone Call/Book bar
     - "Ask a question" in the menu drawer
     - a floating button bottom right on larger screens
   Any element with data-chat-open opens it.

   The conversation is kept in sessionStorage so it survives moving between
   pages, and is gone when the tab closes. Nothing is stored on the server.
   Tracking events carry no message text: chat_open, chat_message,
   chat_suggestion (which canned question), chat_error.
   ========================================================================== */

(function () {
  'use strict';

  var ENDPOINT = '/api/chat';
  var STORE = 'brp_chat';
  var STATUS = 'brp_chat_on';
  var MAX_SEND = 20;
  var PHONE = '0458 007 583';
  var TEL = 'tel:+61458007583';
  var EMAIL = 'thihan@bridgeroad.physio';

  var SUGGESTIONS = [
    'Which appointment should I book?',
    'How much is an appointment?',
    'Can I claim on my health fund?',
    'Where do I park?'
  ];

  function track(action, detail) {
    try { if (window.BRP && window.BRP.track) window.BRP.track(action, detail || null); } catch (e) { /* never block */ }
  }
  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(sessionStorage.getItem(key) || 'null');
      if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }

  /* ---- Is the assistant switched on? -------------------------------- */
  function checkEnabled(cb) {
    var cached = store(STATUS);
    if (cached && Date.now() - cached.t < 10 * 60 * 1000) return cb(cached.on);
    if (!window.fetch) return cb(false);
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(false); } }, 6000);
    fetch(ENDPOINT, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
      .catch(function () { return { enabled: false }; })
      .then(function (d) {
        if (done) return;
        done = true; clearTimeout(timer);
        var on = !!(d && d.enabled);
        store(STATUS, { on: on, t: Date.now() });
        cb(on);
      });
  }

  /* ---- Safe rendering of replies --------------------------------------
     Replies are escaped first, then a small set of formatting is allowed
     back in: [text](link) for site pages, the phone, the email and the
     offer page; **bold**; "- " lists; paragraphs. Nothing else from the
     model can become markup. */
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeHref(url) {
    url = url.trim();
    if (/^tel:(000|\+?[0-9]{6,15})$/.test(url)) return url;
    if (/^mailto:[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(url)) return url;
    if (/^\/(?!\/)[A-Za-z0-9\-._~\/#?=&%]*$/.test(url)) return url;
    var m = url.match(/^https:\/\/(www\.)?bridgeroad\.physio(\/[A-Za-z0-9\-._~\/#?=&%]*)?$/);
    if (m) return m[2] || '/';
    return null;
  }
  function trackFor(href) {
    if (/^tel:/.test(href)) return 'phone_click';
    if (/^mailto:/.test(href)) return 'email_click';
    if (/^\/book\.html/.test(href) || /^\/new-patient-offer/.test(href)) return 'book_click';
    return 'chat_link_click';
  }
  function inline(text) {
    var out = esc(text);
    out = out.replace(/\[([^\]\n]{1,120})\]\(([^)\s]{1,300})\)/g, function (m, label, url) {
      var href = safeHref(url.replace(/&amp;/g, '&'));
      if (!href) return label;
      return '<a href="' + esc(href) + '" data-track="' + trackFor(href) + '">' + label + '</a>';
    });
    out = out.replace(/\*\*([^*\n]{1,200})\*\*/g, '<strong>$1</strong>');
    return out;
  }
  /* The site is written without em dashes. The assistant is told the same,
     and this catches any that slip through: a dash between clauses becomes
     a comma, and a time or number range becomes "to". */
  function plain(text) {
    return text
      .replace(/^[ \t]*[—–][ \t]*/gm, '')
      .replace(/(\d(?:am|pm)?)[ \t]*[–—][ \t]*(?=\d)/gi, '$1 to ')
      .replace(/\b((?:Mon|Tues?|Wed(?:nes)?|Thu(?:rs)?|Fri|Sat(?:ur)?|Sun)(?:day)?)[ \t]*[–—][ \t]*(?=(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun))/g, '$1 to ')
      .replace(/[ \t]*—[ \t]*|[ \t]+–[ \t]+/g, ', ')
      .replace(/,[ \t]*([,.;:!?])/g, '$1');
  }
  function render(text) {
    var blocks = plain(text.replace(/\r/g, '')).trim().split(/\n{2,}/);
    return blocks.map(function (block) {
      var lines = block.split('\n');
      if (lines.every(function (l) { return /^\s*[-*•] /.test(l); })) {
        return '<ul>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*[-*•] /, '')) + '</li>'; }).join('') + '</ul>';
      }
      return '<p>' + lines.map(inline).join('<br>') + '</p>';
    }).join('');
  }

  /* ---- Panel ---------------------------------------------------------- */
  var panel, log, form, input, sendBtn, suggest, opener = null, busy = false, controller = null;
  var history = store(STORE) || [];

  var ICON_CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function build() {
    panel = document.createElement('div');
    panel.className = 'chat';
    panel.id = 'chat';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'chat-title');
    panel.innerHTML =
      '<div class="chat__head">' +
        '<div><p class="chat__title" id="chat-title" tabindex="-1">Ask a question</p>' +
        '<p class="chat__sub">Automated assistant</p></div>' +
        '<div class="chat__tools">' +
          '<button type="button" class="chat__new" data-chat-reset>New chat</button>' +
          '<button type="button" class="chat__close" data-chat-close>' + ICON_CLOSE + '<span>Close</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="chat__scroll">' +
        '<p class="chat__notice">I can help with appointments, fees, rebates and getting here. I am not a physiotherapist and cannot give health advice. ' +
        'Please do not share personal health details. In an emergency, call <a href="tel:000">000</a>. ' +
        '<a href="/privacy.html#chat">How chat messages are handled</a></p>' +
        '<div class="chat__log"></div>' +
        '<div class="visually-hidden" aria-live="polite" data-chat-announce></div>' +
        '<div class="chat__suggest" aria-label="Suggested questions"></div>' +
      '</div>' +
      '<form class="chat__form" novalidate>' +
        '<label class="visually-hidden" for="chat-input">Your question</label>' +
        '<textarea id="chat-input" rows="1" maxlength="1000" placeholder="Type your question" enterkeyhint="send" autocomplete="off"></textarea>' +
        '<button type="submit" class="chat__send" aria-label="Send">' + ICON_SEND + '</button>' +
      '</form>' +
      '<p class="chat__foot">Prefer a person? Call <a href="' + TEL + '" data-track="phone_click">' + PHONE + '</a></p>';
    document.body.appendChild(panel);

    log = panel.querySelector('.chat__log');
    form = panel.querySelector('.chat__form');
    input = panel.querySelector('textarea');
    sendBtn = panel.querySelector('.chat__send');
    suggest = panel.querySelector('.chat__suggest');

    SUGGESTIONS.forEach(function (q, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = q;
      b.addEventListener('click', function () { track('chat_suggestion', String(i + 1)); ask(q); });
      suggest.appendChild(b);
    });

    form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
    });
    input.addEventListener('input', grow);
    panel.querySelector('[data-chat-close]').addEventListener('click', close);
    panel.querySelector('[data-chat-reset]').addEventListener('click', reset);
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } });

    drawHistory();
  }

  function grow() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 132) + 'px';
  }

  function bubble(role, html) {
    var el = document.createElement('div');
    el.className = 'chat__msg chat__msg--' + role;
    if (html !== undefined) el.innerHTML = html;
    log.appendChild(el);
    return el;
  }

  /* The reply streams in piece by piece. A live region on the log would read
     every fragment aloud, so screen readers are told once, when it is done. */
  function announce(text) {
    var el = panel.querySelector('[data-chat-announce]');
    el.textContent = '';
    setTimeout(function () { el.textContent = text; }, 50);
  }

  function scrollDown() {
    var sc = panel.querySelector('.chat__scroll');
    sc.scrollTop = sc.scrollHeight;
  }

  function drawHistory() {
    log.innerHTML = '';
    bubble('assistant', render('Hi, I can answer questions about Bridge Road Physiotherapy. What would you like to know?'));
    history.forEach(function (m) {
      bubble(m.role, m.role === 'user' ? '<p>' + esc(m.content).replace(/\n/g, '<br>') + '</p>' : render(m.content));
    });
    suggest.hidden = history.length > 0;
  }

  function reset() {
    if (controller) controller.abort();
    history = [];
    store(STORE, null);
    busy = false;
    setBusy(false);
    drawHistory();
    input.value = '';
    grow();
    input.focus();
  }

  function setBusy(v) {
    busy = v;
    sendBtn.disabled = v;
    panel.classList.toggle('is-busy', v);
  }

  function failText(msg) {
    return (msg || 'Sorry, I could not answer just now.') +
      ' You can call [' + PHONE + '](' + TEL + ') or email [' + EMAIL + '](mailto:' + EMAIL + ').';
  }

  function ask(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (text.length > 1000) text = text.slice(0, 1000);

    history.push({ role: 'user', content: text });
    store(STORE, history);
    bubble('user', '<p>' + esc(text).replace(/\n/g, '<br>') + '</p>');
    suggest.hidden = true;
    input.value = '';
    grow();
    setBusy(true);
    track('chat_message');

    var reply = bubble('assistant');
    reply.classList.add('is-typing');
    reply.innerHTML = '<span class="chat__dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    announce('Thinking');
    scrollDown();

    var answer = '', refused = false, errored = null, queued = false;
    function paint() {
      queued = false;
      if (answer) { reply.classList.remove('is-typing'); reply.innerHTML = render(answer); scrollDown(); }
    }
    function handle(line) {
      if (!line) return;
      var ev;
      try { ev = JSON.parse(line); } catch (e) { return; }
      if (ev.type === 'text') { answer += ev.text; if (!queued) { queued = true; requestAnimationFrame(paint); } }
      else if (ev.type === 'refusal') refused = true;
      else if (ev.type === 'error') errored = ev.message || '';
    }

    controller = window.AbortController ? new AbortController() : null;
    var sent = history.slice(-MAX_SEND);
    while (sent.length && sent[0].role !== 'user') sent.shift();

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      body: JSON.stringify({ messages: sent }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          errored = (d && d.error) || '';
          throw new Error('http ' + res.status);
        });
      }
      /* Read the stream as it arrives where the browser allows; otherwise
         take the whole body at once. Both carry the same lines. */
      if (res.body && res.body.getReader && window.TextDecoder) {
        var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
        return (function pump() {
          return reader.read().then(function (r) {
            if (r.done) { handle(buf.trim()); return; }
            buf += dec.decode(r.value, { stream: true });
            var lines = buf.split('\n');
            buf = lines.pop();
            lines.forEach(handle);
            return pump();
          });
        })();
      }
      return res.text().then(function (t) { t.split('\n').forEach(handle); });
    }).then(function () {
      if (refused) {
        answer = 'That is not something I can help with here. For anything about your own situation, Thihan is the right person. ' +
          'Call [' + PHONE + '](' + TEL + ') or [book an appointment](/book.html).';
      }
      if (errored !== null && !answer) throw new Error('stream error');
      if (!answer) throw new Error('empty');
      if (errored !== null) answer += '\n\n' + failText('That answer was cut short.');
      paint();
      announce(reply.textContent);
      history.push({ role: 'assistant', content: answer });
      store(STORE, history);
    }).catch(function (err) {
      if (err && err.name === 'AbortError') { reply.remove(); return; }
      /* The question stays in the box so it can be sent again, and is taken
         out of the history so a retry does not send it twice. */
      history.pop();
      store(STORE, history);
      reply.classList.remove('is-typing');
      reply.classList.add('chat__msg--error');
      reply.innerHTML = render(failText(errored));
      announce(reply.textContent);
      input.value = text;
      grow();
      track('chat_error');
    }).then(function () {
      controller = null;
      setBusy(false);
      scrollDown();
    });
  }

  /* On phones the panel fills the screen. iOS does not shrink fixed
     elements when the keyboard opens, so follow the visual viewport and the
     typing box stays above the keyboard. */
  var PHONE_MQ = matchMedia('(max-width: 900px)');
  function fitViewport() {
    if (!panel || !panel.classList.contains('is-open')) return;
    var vv = window.visualViewport;
    if (PHONE_MQ.matches && vv) {
      panel.style.height = vv.height + 'px';
      panel.style.top = vv.offsetTop + 'px';
    } else {
      panel.style.height = '';
      panel.style.top = '';
    }
  }
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', fitViewport);
    visualViewport.addEventListener('scroll', fitViewport);
  }

  function open(trigger) {
    if (!panel) build();
    if (typeof window.closeMenu === 'function') window.closeMenu({ leaving: true });
    opener = trigger || document.activeElement;
    /* Opened from inside the menu, which has just closed: come back to the
       Menu button rather than to a button that is no longer visible. */
    if (opener && opener.closest && opener.closest('#m')) opener = document.querySelector('.burger');
    panel.classList.add('is-open');
    document.documentElement.classList.add('chat-open');
    document.querySelectorAll('[data-chat-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    fitViewport();
    scrollDown();
    /* A mouse or trackpad goes straight to the typing box. On a touch screen
       that would throw the keyboard up over the suggestions, so focus lands
       on the title instead. */
    if (matchMedia('(pointer: fine)').matches) input.focus(); else panel.querySelector('#chat-title').focus({ preventScroll: true });
    track('chat_open');
  }

  function close() {
    if (!panel || !panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open');
    document.documentElement.classList.remove('chat-open');
    document.querySelectorAll('[data-chat-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }

  function start() {
    checkEnabled(function (on) {
      if (!on) return;
      var launch = document.createElement('button');
      launch.type = 'button';
      launch.className = 'chat-launch';
      launch.setAttribute('data-chat-open', '');
      launch.innerHTML = ICON_CHAT + '<span>Ask a question</span>';
      document.body.appendChild(launch);

      document.querySelectorAll('[data-chat-open]').forEach(function (b) {
        b.hidden = false;
        b.setAttribute('aria-controls', 'chat');
        b.setAttribute('aria-expanded', 'false');
      });
      document.documentElement.classList.add('has-chat');

      document.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('[data-chat-open]');
        if (!t) return;
        e.preventDefault();
        if (panel && panel.classList.contains('is-open')) close(); else open(t);
      });
      addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && panel && panel.classList.contains('is-open')) close();
      });

      window.BRP = window.BRP || {};
      window.BRP.chat = { open: open, close: close };
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

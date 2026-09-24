/* Menu drawer. Slides in from the left below 1181px. Closes on the Close
   button, a tap on the backdrop, a swipe to the left, Escape, or a link.
   While it is open the page behind is locked and inert, so a screen reader
   or the Tab key stays inside the menu, and focus goes back to the Menu
   button afterwards. toggleMenu and closeMenu stay global because the chat
   assistant and any older inline handlers call them. */
(function(){
  var drawer = document.getElementById('m');
  var scrim = document.querySelector('.drawer-scrim');
  var root = document.documentElement;
  var opener = null, inerted = [];

  function isOpen(){ return root.classList.contains('menu-open'); }
  function setExpanded(v){
    document.querySelectorAll('[data-menu-open]').forEach(function(b){ b.setAttribute('aria-expanded', v ? 'true' : 'false'); });
  }

  function open(trigger){
    if (!drawer || isOpen()) return;
    opener = trigger || document.activeElement;
    root.classList.add('menu-open');
    [].forEach.call(document.body.children, function(el){
      if (el === drawer || el === scrim || el.tagName === 'SCRIPT' || el.hasAttribute('inert')) return;
      el.setAttribute('inert', '');
      inerted.push(el);
    });
    setExpanded(true);
    var first = drawer.querySelector('.drawer__close');
    if (first) first.focus({ preventScroll: true });
    if (window.BRP) window.BRP.track('menu_open');
  }

  function close(opts){
    if (!drawer || !isOpen()) return;
    root.classList.remove('menu-open');
    inerted.forEach(function(el){ el.removeAttribute('inert'); });
    inerted = [];
    drawer.style.transform = '';
    if (scrim) scrim.style.opacity = '';
    setExpanded(false);
    if (!(opts && opts.leaving) && opener && opener.focus) opener.focus({ preventScroll: true });
    opener = null;
  }

  window.toggleMenu = function(btn){ isOpen() ? close() : open(btn); };
  window.closeMenu = close;
  if (!drawer) return;

  document.addEventListener('click', function(e){
    var t = e.target.closest ? e.target : null;
    if (!t) return;
    var btn = t.closest('[data-menu-open]');
    if (btn) { e.preventDefault(); window.toggleMenu(btn); return; }
    if (t.closest('[data-menu-close]')) { close(); return; }
    var sub = t.closest('[data-menu-sub]');
    if (sub) {
      var panel = document.getElementById(sub.getAttribute('aria-controls'));
      var expanded = sub.getAttribute('aria-expanded') === 'true';
      sub.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      if (panel) panel.hidden = expanded;
      return;
    }
    /* Choosing a page closes the drawer straight away, so a same-page
       anchor scrolls the unlocked page rather than the locked one. */
    if (t.closest('#m a[href]')) close({ leaving: true });
  });

  addEventListener('keydown', function(e){ if (e.key === 'Escape' && isOpen()) close(); });

  /* Browsers without inert: pull stray focus back into the drawer. */
  document.addEventListener('focusin', function(e){
    if (isOpen() && !drawer.contains(e.target)) {
      var c = drawer.querySelector('.drawer__close');
      if (c) c.focus({ preventScroll: true });
    }
  });

  /* Wider than the drawer breakpoint the full nav is showing, so a drawer
     left open from a rotated tablet has nothing to sit beside. */
  var WIDE = matchMedia('(min-width: 1181px)');
  var onWide = function(e){ if (e.matches) close({ leaving: true }); };
  if (WIDE.addEventListener) WIDE.addEventListener('change', onWide); else if (WIDE.addListener) WIDE.addListener(onWide);
  addEventListener('pageshow', function(e){ if (e.persisted) close({ leaving: true }); });

  /* Swipe left to close. The drawer follows the finger, and closes if it is
     dragged a third of the way or flicked. touch-action:pan-y in the CSS
     leaves vertical scrolling of the menu to the browser. */
  var x0 = 0, y0 = 0, t0 = 0, dx = 0, decided = false, dragging = false;
  function start(e){
    if (!isOpen() || e.touches.length !== 1) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
    dx = 0; decided = false; dragging = false;
  }
  function move(e){
    if (!isOpen() || e.touches.length !== 1) return;
    var x = e.touches[0].clientX - x0, y = e.touches[0].clientY - y0;
    if (!decided) {
      if (Math.abs(x) < 8 && Math.abs(y) < 8) return;
      decided = true;
      dragging = x < 0 && Math.abs(x) > Math.abs(y);
      if (dragging) drawer.classList.add('is-dragging');
    }
    if (!dragging) return;
    dx = Math.min(0, x);
    drawer.style.transform = 'translateX(' + dx + 'px)';
    if (scrim) scrim.style.opacity = String(Math.max(0, 1 + dx / drawer.offsetWidth));
  }
  function end(){
    if (!dragging) return;
    dragging = false;
    drawer.classList.remove('is-dragging');
    var flick = dx < -40 && Date.now() - t0 < 250;
    if (dx < -drawer.offsetWidth / 3 || flick) close();
    drawer.style.transform = '';
    if (scrim) scrim.style.opacity = '';
  }
  [drawer, scrim].forEach(function(el){
    if (!el) return;
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
  });
})();
/* Header on scroll. Two independent things: the background turns opaque
   once you leave the top, and the address strip tucks away when you scroll
   down and comes back when you scroll up, the way a phone browser hides its
   own chrome. Near the top the strip is always shown. On phones it never
   tucks: the page already moves enough under a thumb. */
const hdr=document.getElementById('hdr');
if(hdr){
  var lastY = scrollY, queued = false;
  var KEEP_OPEN_ABOVE = 140;  // never tuck while still near the top
  var JITTER = 6;             // ignore trackpad noise and rubber-banding
  var PHONE = matchMedia('(max-width: 820px)'); // on phones the strip stays put: less movement while scrolling

  function onHeaderScroll(){
    var y = scrollY < 0 ? 0 : scrollY;   // iOS overscrolls past the top
    hdr.classList.toggle('scrolled', y > 20);

    if (y <= KEEP_OPEN_ABOVE || PHONE.matches) {
      hdr.classList.remove('hdr--tucked');
    } else if (Math.abs(y - lastY) > JITTER) {
      hdr.classList.toggle('hdr--tucked', y > lastY);
    }

    if (Math.abs(y - lastY) > JITTER) lastY = y;
    queued = false;
  }

  addEventListener('scroll', function(){
    if (!queued) { queued = true; requestAnimationFrame(onHeaderScroll); }
  }, { passive: true });
  onHeaderScroll();
}
/* Scroll fade. The .io class is what hides not-yet-seen blocks, so it is only
   added once the observer exists. No script, no observer: everything shows. */
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.05,rootMargin:'0px 0px 10% 0px'});
  document.querySelectorAll('.r').forEach(el=>io.observe(el));
  document.documentElement.classList.add('io');
}
function faq(b){var item=b.parentElement;item.classList.toggle('open');b.setAttribute('aria-expanded',item.classList.contains('open'));}

/* Source tracking: capture UTM/ad-click params on landing, persist for the visit,
   forward into enquiry forms as hidden fields, and tag the Halaxy booking link
   so paid traffic can be told apart from organic/referral in the numbers. */
(function(){
  try{
    var KEYS=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'];
    var qs=new URLSearchParams(location.search);
    var stored=JSON.parse(sessionStorage.getItem('brp_attr')||'{}');
    var changed=false;
    KEYS.forEach(function(k){var v=qs.get(k);if(v){stored[k]=v;changed=true;}});
    if(!stored.landing_page){stored.landing_page=location.pathname;changed=true;}
    if(!stored.referrer&&document.referrer){try{stored.referrer=new URL(document.referrer).hostname;}catch(e){stored.referrer='';}if(stored.referrer)changed=true;}
    if(changed)sessionStorage.setItem('brp_attr',JSON.stringify(stored));

    var ALL=KEYS.concat(['landing_page','referrer']);
    document.querySelectorAll('form[data-attr]').forEach(function(form){
      ALL.forEach(function(k){
        if(!stored[k])return;
        var input=form.querySelector('input[name="'+k+'"]');
        if(!input){input=document.createElement('input');input.type='hidden';input.name=k;form.appendChild(input);}
        input.value=stored[k];
      });
    });

    /* Tag outbound Halaxy links with whatever campaign values this visit
       arrived with. Exposed rather than run once, because a campaign page can
       swap a booking link for a Halaxy one after this has already run, and it
       then needs asking again. Links already tagged are left alone, so calling
       it twice does not append the parameters twice. */
    function decorate(){
      if(!(stored.utm_source||stored.gclid||stored.fbclid))return;
      var params=new URLSearchParams();
      KEYS.forEach(function(k){if(stored[k])params.set(k,stored[k]);});
      var qs=params.toString();
      if(!qs)return;
      document.querySelectorAll('a[href*="halaxy.com"]:not([data-attr-tagged])').forEach(function(a){
        a.href+=(a.href.indexOf('?')>-1?'&':'?')+qs;
        a.setAttribute('data-attr-tagged','1');
      });
    }
    decorate();
    if(window.BRP)window.BRP.attribution={values:stored,decorate:decorate};
  }catch(e){/* tracking must never block booking */}
})();

/* Back to top. Desktop only via CSS — on mobile the Call/Book bar owns that
   corner and a third floating control would just compete with booking. */
function toTop(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({top:0, behavior: reduce ? 'auto' : 'smooth'});
}
(function(){
  var btn = document.querySelector('.to-top');
  if(!btn) return;
  var show = function(){ btn.hidden = scrollY < 800; };
  show();
  addEventListener('scroll', show, {passive:true});
})();

/* Enquiry form: posts to /api/enquiry, which emails the clinic via Resend.
   The result is shown on the page rather than bouncing the patient to a
   third-party screen. If the send fails the patient is told so and given the
   phone number, because silently swallowing an enquiry is the worst outcome
   here. Without JavaScript the form posts normally and the endpoint redirects
   back with ?sent=1. */
(function(){
  var form = document.getElementById('enquiry-form');

  function panel(kind, html){
    var el = document.createElement('div');
    el.className = 'form-done' + (kind === 'error' ? ' form-done--error' : '');
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.setAttribute('tabindex', '-1');
    el.innerHTML = html;
    return el;
  }

  var SENT = '<h3>Thanks, your enquiry is on its way.</h3>' +
    '<p>Thihan will get back to you, usually within one business day. ' +
    'If it is urgent, call <a href="tel:+61458007583" data-track="phone_click">0458 007 583</a>.</p>' +
    '<p><a class="btn btn--primary" href="book.html" data-track="book_click">Book an appointment</a></p>';

  function errorHtml(msg){
    return '<h3>That did not send.</h3>' +
      '<p>' + (msg || 'Something went wrong at our end.') + ' ' +
      'Please call <a href="tel:+61458007583" data-track="phone_click">0458 007 583</a> or email ' +
      '<a href="mailto:thihan@bridgeroad.physio" data-track="email_click">thihan@bridgeroad.physio</a> ' +
      'and I will pick it up from there.</p>';
  }

  /* Came back from a no-JavaScript submission */
  var flag = new URLSearchParams(location.search).get('sent');
  if (flag && form) {
    var back = panel(flag === '1' ? 'ok' : 'error', flag === '1' ? SENT : errorHtml());
    form.replaceWith(back);
    back.focus();
    if (flag === '1' && window.BRP) window.BRP.track('enquiry_submit');
    return;
  }

  if (!form) return;

  /* ---- Inline validation -------------------------------------------------
     The browser's own bubbles are inconsistent between browsers, vanish on
     the next click and are not announced reliably, so we do our own and tie
     each message to its field. type="email" is also more lenient than the
     endpoint: it accepts "jane@example" with no dot, which the server then
     rejects after a round trip. The rule below is the server's rule, so a
     patient learns about a typo while they are still looking at the field.

     novalidate is set from JavaScript only. Without JavaScript the native
     validation still runs, and the endpoint validates regardless. */
  var EMAIL = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

  var MISSING = {
    name:    'Please add your name.',
    email:   'Please add your email address.',
    phone:   'Please add a phone number.',
    message: 'Please tell me what you need help with.'
  };

  function problemWith(input) {
    var v = (input.value || '').trim();
    if (input.hasAttribute('required') && !v) {
      return MISSING[input.name] || 'This one is needed.';
    }
    if (input.type === 'email' && v && !EMAIL.test(v)) {
      return 'That does not look like an email address. Check it reads something like name@example.com.';
    }
    return '';
  }

  function showProblem(input, msg) {
    var group = input.closest('.fg') || input.parentNode;
    var note = group.querySelector('.fg__err');

    if (!msg) {
      if (note) note.remove();
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      return;
    }

    if (!note) {
      note = document.createElement('p');
      note.className = 'fg__err';
      note.id = 'err-' + (input.id || input.name);
      group.appendChild(note);
    }
    note.textContent = msg;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', note.id);
  }

  var fields = [].slice.call(form.querySelectorAll('input[name], textarea[name], select[name]'))
    .filter(function(el){ return el.type !== 'hidden' && el.name !== '_gotcha'; });

  form.setAttribute('novalidate', 'novalidate');

  fields.forEach(function(el){
    /* Complain on leaving a field, but forgive as soon as it is corrected,
       rather than nagging on every keystroke. */
    el.addEventListener('blur', function(){ showProblem(el, problemWith(el)); });
    el.addEventListener('input', function(){
      if (el.getAttribute('aria-invalid') === 'true' && !problemWith(el)) showProblem(el, '');
    });
  });

  function firstProblem() {
    var bad = null;
    fields.forEach(function(el){
      var msg = problemWith(el);
      showProblem(el, msg);
      if (msg && !bad) bad = el;
    });
    return bad;
  }

  if (!window.fetch) return;


  form.addEventListener('submit', function(e){
    e.preventDefault();

    var bad = firstProblem();
    if (bad) {
      bad.focus();
      if (window.BRP) window.BRP.track('enquiry_invalid', bad.name);
      return;
    }

    var btn = form.querySelector('[type="submit"]');
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }

    var payload = {};
    new FormData(form).forEach(function(v, k){ payload[k] = v; });

    var status = 0;
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){
      status = res.status;
      return res.json().catch(function(){ return { ok: res.ok }; });
    }).then(function(out){
      if (!out || !out.ok) {
        var e = new Error((out && out.error) || '');
        e.status = status;
        throw e;
      }
      var done = panel('ok', SENT);
      form.replaceWith(done);
      done.focus();
      if (window.BRP) window.BRP.track('enquiry_submit');
    }).catch(function(err){
      if (btn) { btn.disabled = false; btn.textContent = label; }
      var existing = form.querySelector('.form-error');
      if (existing) existing.remove();

      /* A 4xx is about what was typed. Say exactly that and leave the form
         alone, rather than implying the clinic is broken. Anything else is
         our problem, so give the patient another way to reach us. */
      var note;
      if (err && err.status >= 400 && err.status < 500 && err.message) {
        note = panel('error', '<h3>Check the form</h3><p>' + err.message + '</p>');
      } else {
        note = panel('error', errorHtml(err && err.message));
      }
      note.classList.add('form-error');
      note.style.marginTop = '1rem';
      form.appendChild(note);
      note.focus();
      if (window.BRP) window.BRP.track('enquiry_error', err && err.status);
    });
  });
})();

/* Homepage map. The box is a Google Maps link until someone taps "Show the
   map"; only then does the embed load, in the same box. The embed pulls in
   dozens of files from several Google servers, and most visitors use Get
   directions instead. Without JavaScript the link opens Google Maps. The
   contact page keeps its map loaded as normal. */
document.querySelectorAll('[data-map-embed]').forEach(function(link){
  link.addEventListener('click', function(e){
    e.preventDefault();
    var frame = document.createElement('iframe');
    frame.src = link.getAttribute('data-map-embed');
    frame.title = link.getAttribute('data-map-title') || 'Map';
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    link.replaceWith(frame);
    frame.focus();
  });
});

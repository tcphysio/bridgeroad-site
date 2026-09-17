function toggleMenu(btn){const m=document.getElementById('m');m.classList.toggle('open');const open=m.classList.contains('open');if(btn)btn.setAttribute('aria-expanded',open);}
function closeMenu(){const m=document.getElementById('m');if(m)m.classList.remove('open');const b=document.querySelector('.burger');if(b)b.setAttribute('aria-expanded','false');}
const hdr=document.getElementById('hdr');if(hdr){addEventListener('scroll',()=>hdr.classList.toggle('scrolled',scrollY>20));}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.r').forEach(el=>io.observe(el));
function faq(b){var item=b.parentElement;item.classList.toggle('open');b.setAttribute('aria-expanded',item.classList.contains('open'));}
addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.querySelectorAll('#m a').forEach(a=>a.addEventListener('click',closeMenu));

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

    if(stored.utm_source||stored.gclid||stored.fbclid){
      var params=new URLSearchParams();
      KEYS.forEach(function(k){if(stored[k])params.set(k,stored[k]);});
      document.querySelectorAll('a[href*="halaxy.com"]').forEach(function(a){
        a.href+=(a.href.indexOf('?')>-1?'&':'?')+params.toString();
      });
    }
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

  if (!form || !window.fetch) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var btn = form.querySelector('[type="submit"]');
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }

    var payload = {};
    new FormData(form).forEach(function(v, k){ payload[k] = v; });

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res){
      return res.json().catch(function(){ return { ok: res.ok }; });
    }).then(function(out){
      if (!out || !out.ok) throw new Error((out && out.error) || 'send failed');
      var done = panel('ok', SENT);
      form.replaceWith(done);
      done.focus();
      if (window.BRP) window.BRP.track('enquiry_submit');
    }).catch(function(err){
      if (btn) { btn.disabled = false; btn.textContent = label; }
      var existing = form.querySelector('.form-error');
      if (existing) existing.remove();
      var note = panel('error', errorHtml(err && err.message !== 'send failed' ? '' : ''));
      note.classList.add('form-error');
      note.style.marginTop = '1rem';
      form.appendChild(note);
      note.focus();
      if (window.BRP) window.BRP.track('enquiry_error');
    });
  });
})();

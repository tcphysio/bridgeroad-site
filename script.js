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
    if(!stored.referrer&&document.referrer){stored.referrer=document.referrer;changed=true;}
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

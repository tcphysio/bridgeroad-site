function toggleMenu(btn){const m=document.getElementById('m');m.classList.toggle('open');if(btn)btn.setAttribute('aria-expanded',m.classList.contains('open'));}
const hdr=document.getElementById('hdr');if(hdr){addEventListener('scroll',()=>hdr.classList.toggle('scrolled',scrollY>20));}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.r').forEach(el=>io.observe(el));
function faq(b){b.parentElement.classList.toggle('open')}

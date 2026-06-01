function toggleMenu(btn){const m=document.getElementById('m');m.classList.toggle('open');const open=m.classList.contains('open');if(btn)btn.setAttribute('aria-expanded',open);}
function closeMenu(){const m=document.getElementById('m');if(m)m.classList.remove('open');const b=document.querySelector('.burger');if(b)b.setAttribute('aria-expanded','false');}
const hdr=document.getElementById('hdr');if(hdr){addEventListener('scroll',()=>hdr.classList.toggle('scrolled',scrollY>20));}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.r').forEach(el=>io.observe(el));
function faq(b){b.parentElement.classList.toggle('open')}
addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.querySelectorAll('#m a').forEach(a=>a.addEventListener('click',closeMenu));

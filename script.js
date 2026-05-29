const hdr = document.getElementById('hdr');
if (hdr) {
  addEventListener('scroll', () => hdr.classList.toggle('scrolled', scrollY > 20));
}
const io = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    entry.target.classList.add('in');
    io.unobserve(entry.target);
  }
}), { threshold: .12 });
document.querySelectorAll('.r').forEach(el => io.observe(el));
function faq(button) {
  button.parentElement.classList.toggle('open');
}

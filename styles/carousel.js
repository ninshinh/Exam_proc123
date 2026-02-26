// I.T PROCTOOL — Shared Carousel Rotation Logic
// Include this script at the bottom of every page's <body>
(function() {
  var slides = document.querySelectorAll('.carousel-slide');
  if (!slides.length) return;
  var current = 0;
  setInterval(function() {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 5000);
})();

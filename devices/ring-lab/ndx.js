/* devices/ring-lab · ndx.js · the NAD+ story (moved from supplements/nad)
   Three jobs, each guarded on its own element: the essentials photograph
   drifts with the scroll, the compare rows rise once in view, and the two
   plan rows in the kit card behave as one radio pair. The timeline is
   shared.js's. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.querySelector('.ndx');
  if (!root) return;
  var still = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function $(s, r) { return (r || root).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || root).querySelectorAll(s)); }

  var jobs = [];
  var queued = false;
  function onFrame(fn) { jobs.push(fn); }
  function tick() {
    queued = false;
    for (var i = 0; i < jobs.length; i++) jobs[i]();
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(tick); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);

  function onceInView(el, cls, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { el.classList.add(cls); return; }
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      el.classList.add(cls);
      io.disconnect();
    }, { rootMargin: margin || '0px 0px -15% 0px' });
    io.observe(el);
  }

  /* ---- 2 · essentials: photo drift --------------------------------------- */
  function essentials() {
    var bg = $('[data-drift]');
    if (!bg || still.matches) return;
    var box = bg.parentNode;
    onFrame(function () {
      var r = box.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      var p = (vh - r.top) / (vh + r.height); /* 0 entering, 1 leaving */
      bg.style.translate = '0 ' + ((p - 0.5) * -7).toFixed(2) + '%';
    });
  }

  /* ---- 6 · plan rows: one radio pair ------------------------------------ */
  function plans() {
    var btns = $$('[data-plan]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) {
          var on = x === b;
          x.classList.toggle('on', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });
  }

  essentials();
  onceInView($('.nd-table'), 'is-in', '0px 0px -10% 0px');
  plans();
  request();
})();

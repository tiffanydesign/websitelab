/* ==========================================================================
   uhx.js · behaviour for the home opener (styles and the map in uhx.css).
   One scroll loop drives the two scrubbed sections (the science cards and the
   battery screen); everything else is set off by an IntersectionObserver so
   nothing runs while it is off screen.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-uhx]');
  if (!root) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ramp(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function $$(sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); }

  /* run fn(on) whenever el enters or leaves the viewport */
  function watch(el, fn, margin) {
    if (!el) return;
    if (!hasIO) { fn(true); return; }
    new IntersectionObserver(function (es) { fn(es[0].isIntersecting); },
      { rootMargin: margin || '0px', threshold: 0 }).observe(el);
  }
  /* add .is-in once, the first time el is well inside the viewport */
  function revealOnce(el, margin) {
    if (!hasIO || reduce) { el.classList.add('is-in'); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
    }, { rootMargin: margin || '0px 0px -12% 0px', threshold: 0 });
    io.observe(el);
  }
  /* muted films play only while they can be seen */
  function autoFilm(v, onState) {
    if (!v) return;
    v.muted = true;
    watch(v, function (on) {
      if (on && !v.dataset.userPaused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
      if (onState) onState(on && !v.dataset.userPaused);
    }, '120px');
  }

  /* ---- 1 · hero ------------------------------------------------------- */
  var hero = root.querySelector('.uhx-hero');
  if (hero) {
    requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('is-in'); }); });
    autoFilm(hero.querySelector('video'));
  }

  /* ---- 2 · science cards: out of the centre, scrubbed ----------------- */
  var sci = root.querySelector('.uhx-sci');
  var sciCards = sci ? $$('.uhx-sci-card', sci) : [];
  var sciDelta = [];
  function measureSci() {
    if (!sci) return;
    var w = sci.clientWidth, h = sci.clientHeight;
    sciDelta = sciCards.map(function (c) {
      return { x: w / 2 - (c.offsetLeft + c.offsetWidth / 2), y: h / 2 - (c.offsetTop + c.offsetHeight / 2),
               d: parseFloat(c.getAttribute('data-d') || '0') };
    });
  }
  function paintSci(vh) {
    var r = sci.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    var p = clamp((vh - r.top) / vh, 0, 1);
    sciCards.forEach(function (c, i) {
      var m = sciDelta[i]; if (!m) return;
      var t = easeOut(ramp(p, m.d, 1));
      var k = 1 - t;
      c.style.transform = 'translate3d(' + (m.x * k).toFixed(1) + 'px,' + (m.y * k).toFixed(1) + 'px,0) scale(' + Math.max(t, 0.002).toFixed(4) + ')';
    });
  }

  /* ---- 3 · battery: title out, counter in, arc wipes on --------------- */
  var bat = root.querySelector('.uhx-bat');
  var batTitle, batClaim, batNum, batArcs, batRing, batMax = 7, batLast = -1;
  if (bat) {
    batTitle = bat.querySelector('.uhx-bat-title');
    batClaim = bat.querySelector('.uhx-bat-claim');
    batNum = bat.querySelector('.uhx-bat-num');
    batArcs = $$('.uhx-arc-wipe', bat);
    batRing = bat.querySelector('.uhx-bat-ring');
    batMax = parseInt(bat.getAttribute('data-days') || '7', 10);
  }
  function paintBat(vh) {
    var r = bat.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    var p = reduce ? 1 : clamp((vh - r.top) / vh, 0, 1.2);
    var tOut = ramp(p, 0.5, 0.64), tIn = ramp(p, 0.6, 0.76);
    batTitle.style.opacity = (1 - tOut).toFixed(3);
    batTitle.style.transform = 'translateY(' + (-24 * tOut).toFixed(1) + 'px)';
    batClaim.style.opacity = tIn.toFixed(3);
    batClaim.style.transform = 'translateY(' + (24 * (1 - tIn)).toFixed(1) + 'px)';
    var n = Math.round(batMax * easeOut(ramp(p, 0.62, 0.98)));
    if (n !== batLast) { batNum.textContent = n; batLast = n; }
    var w = easeOut(ramp(p, 0.52, 1));
    batArcs.forEach(function (a) { a.style.strokeDashoffset = (1 - w).toFixed(4); });
    var rise = easeOut(ramp(p, 0, 0.95));
    batRing.style.transform = 'translate3d(-50%,' + (90 * (1 - rise)).toFixed(1) + 'px,0) scaleY(.56)';
  }

  /* ---- the one scroll loop ------------------------------------------- */
  var queued = false;
  function frame() {
    queued = false;
    var vh = window.innerHeight;
    if (sci && !reduce) paintSci(vh);
    if (bat) paintBat(vh);
  }
  function tick() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', function () { measureSci(); sizeSticky(); tick(); });
  if (sci && reduce) sciCards.forEach(function (c) { c.style.transform = 'none'; });

  /* ---- 4 · measures carousel ---------------------------------------- */
  var meas = root.querySelector('.uhx-meas');
  if (meas) (function () {
    var slides = $$('.uhx-slide', meas), tabs = $$('.uhx-tab', meas), dots = $$('.uhx-dot', meas);
    var hl = meas.querySelector('.uhx-tab-hl'), car = meas.querySelector('.uhx-car');
    var n = slides.length, active = 0, prevO = slides.map(function () { return 0; });

    function offset(i) { var o = ((i - active) % n + n) % n; return o > n / 2 ? o - n : o; }
    function moveHL() {
      var t = tabs[active]; if (!t || !hl) return;
      hl.style.width = t.offsetWidth + 'px';
      hl.style.transform = 'translateX(' + t.offsetLeft + 'px)';
    }
    function go(i, fromUser) {
      active = (i + n) % n;
      slides.forEach(function (s, k) {
        var o = offset(k);
        if (Math.abs(o - prevO[k]) > 1) { s.classList.add('no-tr'); }
        s.style.setProperty('--o', o);
        s.classList.toggle('is-on', o === 0);
        s.setAttribute('aria-hidden', o === 0 ? 'false' : 'true');
        prevO[k] = o;
      });
      requestAnimationFrame(function () { slides.forEach(function (s) { s.classList.remove('no-tr'); }); });
      tabs.forEach(function (t, k) {
        t.setAttribute('aria-selected', k === active ? 'true' : 'false');
        t.setAttribute('tabindex', k === active ? '0' : '-1');
      });
      if (fromUser && tabs[active].scrollIntoView && meas.querySelector('.uhx-tabs').scrollWidth > meas.querySelector('.uhx-tabs').clientWidth) {
        tabs[active].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
      dots.forEach(function (d, k) {
        d.classList.remove('is-on');
        d.setAttribute('aria-current', k === active ? 'true' : 'false');
      });
      void meas.offsetWidth; /* restart the fill on the new dot */
      if (dots[active]) dots[active].classList.add('is-on');
      moveHL();
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { go(k, true); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault(); go(active + (e.key === 'ArrowRight' ? 1 : -1), true); tabs[active].focus();
        }
      });
    });
    dots.forEach(function (d, k) {
      d.addEventListener('click', function () { go(k, true); });
      d.addEventListener('animationend', function () { if (k === active && !reduce) go(active + 1); });
    });
    slides.forEach(function (s, k) {
      s.addEventListener('click', function () { if (offset(k) !== 0 && !dragged) go(k, true); });
    });
    /* swipe */
    var x0 = null, dragged = false;
    car.addEventListener('pointerdown', function (e) { x0 = e.clientX; dragged = false; });
    car.addEventListener('pointermove', function (e) { if (x0 !== null && Math.abs(e.clientX - x0) > 8) dragged = true; });
    car.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1), true);
      setTimeout(function () { dragged = false; }, 0);
    });
    car.addEventListener('pointercancel', function () { x0 = null; });
    car.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') meas.classList.add('is-hover'); sync(); });
    car.addEventListener('pointerleave', function () { meas.classList.remove('is-hover'); sync(); });
    var seen = false;
    function sync() { meas.classList.toggle('is-paused', reduce || !seen || meas.classList.contains('is-hover')); }
    watch(car, function (on) { seen = on; sync(); });
    window.addEventListener('resize', moveHL);
    go(0);
    sync();
  })();

  /* ---- 5 · product blocks ------------------------------------------- */
  var darkBlock = root.querySelector('.uhx-ff.is-dark');
  function sizeSticky() {
    if (!darkBlock) return;
    /* it holds when its foot meets the foot of the window, so the light
       block that follows rides up over a finished picture */
    darkBlock.style.top = Math.min(0, window.innerHeight - darkBlock.offsetHeight) + 'px';
  }
  $$('.uhx-ff').forEach(function (b) {
    var head = b.querySelector('.uhx-ff-head'), rail = b.querySelector('.uhx-rail');
    if (head && rail) watch(head, function (on) {
      rail.classList.toggle('is-named', !on && head.getBoundingClientRect().top < 0);
    });
    autoFilm(b.querySelector('.uhx-rail video'));
  });
  $$('.uhx-panel').forEach(function (p) { revealOnce(p, '0px 0px -8% 0px'); });

  /* ripples for the water claim */
  $$('canvas[data-ripple]').forEach(function (cv) {
    var ctx = cv.getContext('2d'), on = false, t0 = performance.now(), raf = 0;
    function size() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(now) {
      var w = cv.clientWidth, h = cv.clientHeight, cx = w / 2, cy = h / 2;
      var maxR = Math.hypot(w, h) * 0.55, period = 5200, count = 6;
      ctx.clearRect(0, 0, w, h);
      var base = ((now - t0) % period) / period;
      for (var i = 0; i < count; i++) {
        var f = (base + i / count) % 1, rr = 30 + f * maxR;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rr, rr * 0.62, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(48,176,205,' + (0.55 * Math.pow(1 - f, 1.6)).toFixed(3) + ')';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      if (on && !reduce) raf = requestAnimationFrame(draw);
    }
    size(); window.addEventListener('resize', function () { size(); draw(performance.now()); });
    watch(cv, function (v) { on = v; cancelAnimationFrame(raf); if (v) raf = requestAnimationFrame(draw); });
    draw(performance.now());
  });

  /* ---- 6 · app film ---------------------------------------------------- */
  var film = root.querySelector('.uhx-film');
  if (film) {
    revealOnce(film);
    var fv = film.querySelector('video'), fb = film.querySelector('.uhx-film-btn');
    autoFilm(fv, function (playing) { film.classList.toggle('is-playing', playing); });
    if (fb && fv) fb.addEventListener('click', function () {
      if (fv.paused) { delete fv.dataset.userPaused; fv.play(); film.classList.add('is-playing'); fb.setAttribute('aria-label', 'Pause the film'); }
      else { fv.dataset.userPaused = '1'; fv.pause(); film.classList.remove('is-playing'); fb.setAttribute('aria-label', 'Play the film'); }
    });
  }

  /* ---- 7 · counters ---------------------------------------------------- */
  $$('[data-count]').forEach(function (el) {
    var to = parseFloat(el.getAttribute('data-count')), dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var suf = el.getAttribute('data-suffix') || '';
    function fmt(v) { return v.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; }
    if (reduce || !hasIO) { el.textContent = fmt(to); return; }
    el.textContent = fmt(0);
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now(), dur = 2200;
      (function step(now) {
        var t = clamp((now - t0) / dur, 0, 1);
        el.textContent = fmt(to * easeOut(t));
        if (t < 1) requestAnimationFrame(step);
      })(t0);
    }, { threshold: 0.6 });
    io.observe(el);
  });

  /* ---- 7 · the globe --------------------------------------------------- */
  var gcv = root.querySelector('canvas[data-globe]');
  if (gcv) (function () {
    var ctx = gcv.getContext('2d'), on = false, raf = 0, rot = 0.6, last = 0;
    var N = 7000, pts = [];
    /* land, loosely: a few overlapping blobs on the sphere */
    var blobs = [[0.2, 0.35, 0.9, 0.62], [-0.55, 0.55, 0.6, 0.5], [0.75, -0.25, 0.6, 0.48],
                 [-0.35, -0.6, 0.7, 0.5], [0.1, -0.15, -0.98, 0.42], [-0.9, 0.1, -0.4, 0.45], [0.55, 0.7, -0.45, 0.4]];
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963;
      var x = Math.cos(th) * rad, z = Math.sin(th) * rad, land = 0;
      for (var b = 0; b < blobs.length; b++) {
        var bl = blobs[b], L = Math.hypot(bl[0], bl[1], bl[2]);
        var d = (x * bl[0] + y * bl[1] + z * bl[2]) / L;
        if (d > Math.cos(bl[3])) land = Math.max(land, (d - Math.cos(bl[3])) / (1 - Math.cos(bl[3])));
      }
      var jitter = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      pts.push([x, y, z, land, Math.abs(jitter)]);
    }
    function size() {
      var r = gcv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      gcv.width = Math.round(r.width * dpr); gcv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(now) {
      if (last) rot += Math.min(now - last, 50) * 0.00005;
      last = now;
      var s = gcv.clientWidth, R = s * 0.49, cx = s / 2, cy = s / 2;
      ctx.clearRect(0, 0, s, s);
      var g = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
      g.addColorStop(0, '#1b2f6b'); g.addColorStop(.6, '#0b1640'); g.addColorStop(1, '#050a22');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      var cr = Math.cos(rot), sr = Math.sin(rot), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var x = p[0] * cr + p[2] * sr, z = -p[0] * sr + p[2] * cr;
        var y = p[1] * ct - z * st; z = p[1] * st + z * ct;
        if (z < 0.02) continue;
        var light = clamp(0.35 + 0.65 * (-x * 0.45 - y * 0.35 + z * 0.8), 0, 1);
        var px = cx + x * R, py = cy - y * R;
        if (p[3] > 0) {
          var a = clamp((0.55 + 0.45 * p[3]) * (0.35 + 0.65 * z) * (0.55 + 0.6 * light), 0, 1);
          var bright = p[4] > 0.9;
          ctx.fillStyle = bright ? 'rgba(255,232,178,' + a.toFixed(3) + ')' : 'rgba(92,208,230,' + (a * 0.9).toFixed(3) + ')';
          var rr = (bright ? 1.5 : 1.05) * (0.55 + 0.45 * z) * (s / 600);
          ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
        } else if (p[4] > 0.82) {
          ctx.fillStyle = 'rgba(110,140,220,' + (0.12 * z).toFixed(3) + ')';
          ctx.fillRect(px - .5, py - .5, 1, 1);
        }
      }
      /* rim light, then the fade into the page at the lower right */
      var rim = ctx.createRadialGradient(cx, cy, R * .82, cx, cy, R * 1.02);
      rim.addColorStop(0, 'rgba(120,170,255,0)'); rim.addColorStop(1, 'rgba(150,190,255,.35)');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = rim; ctx.fill();
      var fade = ctx.createLinearGradient(cx - R * .2, cy - R * .2, cx + R * .75, cy + R * .95);
      fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(.62, 'rgba(255,255,255,.12)'); fade.addColorStop(1, 'rgba(255,255,255,.96)');
      ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, Math.PI * 2); ctx.fillStyle = fade; ctx.fill();
      if (on && !reduce) raf = requestAnimationFrame(draw);
    }
    size(); window.addEventListener('resize', function () { size(); draw(performance.now()); });
    watch(gcv, function (v) { on = v; last = 0; cancelAnimationFrame(raf); if (v) raf = requestAnimationFrame(draw); });
    draw(performance.now());
  })();

  /* ---- start ----------------------------------------------------------- */
  function start() { measureSci(); sizeSticky(); frame(); }
  start();
  window.addEventListener('load', start);
})();

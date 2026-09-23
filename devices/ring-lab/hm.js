/* ==========================================================================
   hm.js · THE BRAND HOME behaviour: hero entrance, switchers and their
   galleries, the marquee loop, the growing film, the pinned reading list,
   the drifting wall, the rolling counter and the four chapters. Every block
   guards on its own element, so deleting a section never throws.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-hm]');
  if (!root) return;

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var navH = function () {
    var v = parseFloat(getComputedStyle(root).getPropertyValue('--hm-nav'));
    return isNaN(v) ? 44 : v;
  };
  /* progress of a tall section through its sticky travel, 0 at pin, 1 at release */
  var travel = function (el) {
    var r = el.getBoundingClientRect();
    var span = r.height - (innerHeight - navH());
    return span > 0 ? clamp((navH() - r.top) / span, 0, 1) : 0;
  };

  /* ---- hero entrance -------------------------------------------------- */
  var top = root.querySelector('.hm-top');
  if (top) requestAnimationFrame(function () { top.classList.add('is-in'); });

  /* ---- galleries ------------------------------------------------------ */
  function gallery(g) {
    var track = g.querySelector('.hm-gal-track');
    var n = track.children.length, i = 0;
    var btns = g.querySelectorAll('.hm-gal-nav button');
    function go(k) {
      i = clamp(k, 0, n - 1);
      track.style.transform = 'translateX(' + (-100 * i) + '%)';
      btns[0].disabled = i === 0;
      btns[1].disabled = i === n - 1;
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { go(i + (+b.dataset.dir)); }); });
    var x0 = null;
    track.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    track.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
    });
    go(0);
    return { reset: function () { go(0); } };
  }

  /* ---- switchers ------------------------------------------------------ */
  root.querySelectorAll('[data-hm-pick]').forEach(function (sec) {
    var tabs = sec.querySelectorAll('[role="tab"]');
    var panels = {};
    sec.querySelectorAll('.hm-pick-panel').forEach(function (p) {
      panels[p.dataset.panel] = { el: p, gal: gallery(p.querySelector('[data-hm-gal]')) };
    });
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (o) { o.setAttribute('aria-selected', o === t ? 'true' : 'false'); });
        Object.keys(panels).forEach(function (k) {
          var p = panels[k];
          var on = k === t.dataset.k;
          p.el.hidden = !on;
          p.el.classList.toggle('is-swap', on);
          if (on) p.gal.reset();
        });
      });
    });
  });

  /* ---- marquee: double the row so the loop has no seam ----------------- */
  var row = root.querySelector('[data-hm-marq]');
  if (row) {
    Array.prototype.slice.call(row.children).forEach(function (c) {
      var d = c.cloneNode(true);
      d.setAttribute('aria-hidden', 'true');
      d.tabIndex = -1;
      row.appendChild(d);
    });
  }

  /* ---- scroll driven blocks -------------------------------------------- */
  var flow = root.querySelector('[data-hm-flow] .hm-flow-track');
  var frame = flow && flow.querySelector('.hm-flow-frame');

  var list = root.querySelector('[data-hm-list]');
  var names = list ? list.querySelectorAll('.hm-list-names li') : [];
  var figs = list ? list.querySelectorAll('.hm-list-media figure') : [];
  var listOl = list && list.querySelector('.hm-list-names');
  var listI = -1;
  if (list) list.style.setProperty('--n', names.length);

  var wall = root.querySelector('[data-hm-wall]');
  var cols = wall ? wall.querySelectorAll('.hm-wall-col') : [];

  var story = root.querySelector('[data-hm-story]');
  var sImgs = story ? story.querySelectorAll('.hm-story-img') : [];
  var sArts = story ? story.querySelectorAll('.hm-story-copy article') : [];
  var sTabs = story ? story.querySelectorAll('.hm-story-tabs button') : [];
  var storyI = 0;

  function setOn(nodes, k) {
    for (var j = 0; j < nodes.length; j++) nodes[j].classList.toggle('is-on', j === k);
  }

  function frameTick() {
    if (frame) {
      var r = flow.getBoundingClientRect();
      /* grows while the track's first screen passes, then holds full */
      var p = clamp((innerHeight - r.top) / (innerHeight * 1.6), 0, 1);
      frame.style.setProperty('--p', p.toFixed(4));
    }
    if (list) {
      var k = Math.min(names.length - 1, Math.floor(travel(list) * names.length));
      if (k !== listI) {
        listI = k;
        setOn(names, k);
        setOn(figs, k);
        var win = listOl.parentNode;
        var li = names[k];
        var y = win.clientHeight * 0.34 - li.offsetTop - li.offsetHeight / 2;
        listOl.style.setProperty('--y', Math.round(y) + 'px');
      }
    }
    if (wall) {
      var w = wall.getBoundingClientRect();
      var c = (innerHeight / 2 - (w.top + w.height / 2));
      for (var j = 0; j < cols.length; j++) {
        cols[j].style.transform = 'translate3d(0,' + (c * +cols[j].dataset.speed).toFixed(1) + 'px,0)';
      }
    }
    if (story) {
      var sp = travel(story) * sImgs.length;
      var si = Math.min(sImgs.length - 1, Math.floor(sp));
      if (si !== storyI) { storyI = si; setOn(sImgs, si); setOn(sArts, si); setOn(sTabs, si); }
      for (var t = 0; t < sTabs.length; t++) sTabs[t].style.setProperty('--f', clamp(sp - t, 0, 1).toFixed(3));
    }
  }
  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; frameTick(); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () { listI = -1; onScroll(); });
  frameTick();

  /* chapter tabs jump to their chapter */
  sTabs.forEach(function (b, k) {
    b.addEventListener('click', function () {
      var r = story.getBoundingClientRect();
      var span = r.height - (innerHeight - navH());
      scrollTo({ top: scrollY + r.top - navH() + span * (k + .5) / sTabs.length, behavior: 'smooth' });
    });
  });

  /* ---- rolling counter -------------------------------------------------- */
  var count = root.querySelector('[data-hm-count]');
  if (count) {
    var box = count.querySelector('.hm-count-digits');
    var num = count.dataset.hmCount;
    var html = '';
    for (var d = 0; d < num.length; d++) {
      if (d && (num.length - d) % 3 === 0) html += '<span class="sep"></span>';
      html += '<span class="hm-dg"><span>' + '0123456789'.split('').map(function (x) { return '<i>' + x + '</i>'; }).join('') + '</span></span>';
    }
    box.innerHTML = html;
    var strips = box.querySelectorAll('.hm-dg > span');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        strips.forEach(function (s, k) {
          s.style.transitionDelay = (k * 0.08) + 's';
          s.style.setProperty('--d', num[k]);
        });
        io.disconnect();
      });
    }, { threshold: .6 });
    io.observe(count);
  }

  /* ---- reveal for plain blocks ------------------------------------------ */
  var rv = root.querySelectorAll('.hm-marq > .hm-solid, .hm-wall-head, .hm-cta-card, .hm-which-h, .hm-journal-grid > *, .hm-more-grid > *');
  var rio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  rv.forEach(function (el, k) {
    el.setAttribute('data-hm-rv', '');
    el.style.transitionDelay = ((k % 3) * 0.08) + 's';
    rio.observe(el);
  });
})();

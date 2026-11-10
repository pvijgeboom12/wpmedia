/* Waterproofmedia — scroll motion (GSAP + ScrollTrigger, self-hosted in /assets/js/vendor/).
   Rules: all text stays in the HTML; nothing is hidden without JS; nothing that is
   already on screen at load is hidden; reduced motion gets no animation at all.
   1. Reveal: blocks rise in when their top reaches 85% of the viewport (see START).
   2. Parallax: a few images drift slower than the page.
   3. Count-up: key figures count to their real value (ends on the exact HTML text).
   4. Flow steps: any element with [data-flow-steps] gets an animated dotted line that
      connects its 1–4 columns (horizontal on desktop, vertical when stacked). */
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  var START = 'top 85%';   // trigger line; 'top 70%' = 30% into view, but leaves an empty band on screen

  var css = document.createElement('style');
  css.textContent =
    '[data-flow-steps]{position:relative}' +
    '.fs-svg{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:2}' +
    '.fs-base{stroke:rgba(169,188,198,.22);stroke-width:1.5;stroke-dasharray:2 7;stroke-linecap:round;fill:none}' +
    '.fs-live{stroke-width:2;stroke-dasharray:2 7;stroke-linecap:round;fill:none;animation:fsMarch 1.1s linear infinite}' +
    '@keyframes fsMarch{to{stroke-dashoffset:-18}}' +
    '.fs-node{fill:#07111d;stroke:rgba(169,188,198,.35);stroke-width:1.5}' +
    '.fs-node.on{fill:#5cf2d6;stroke:#5cf2d6}' +
    '.fs-ring{fill:none;stroke:#5cf2d6;stroke-width:1.5;opacity:0}' +
    '.fs-head{fill:#fff;filter:drop-shadow(0 0 6px #5cf2d6) drop-shadow(0 0 14px rgba(92,242,214,.7))}' +
    '@media(prefers-reduced-motion:reduce){.fs-live{animation:none}}';
  document.head.appendChild(css);

  var mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    reveal();
    parallax();
    countUp();
  });
  /* The flow line is also drawn for reduced motion, just without movement */
  flowSteps(matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- 1. Reveal ----------
     [items, group]: items inside one group enter together as a cascade, triggered by the group. */
  function reveal() {
    var groups = [
      ['.logos-band .logos > *', '.logos'],
      ['main section:not(.hero) .sec-head > div > *, main section:not(.hero) .sec-head > p', '.sec-head'],
      ['.index > li', null],
      ['.method .step', '.steps'], ['.pull', null], ['.practice', null],
      ['.tier', '.stairs'], ['.flex-note', null],
      ['.case-feature > div:first-child > *', '.case-feature'], ['.figure', '.figures'], ['.case-sm', '.case-pair'], ['.quote', null],
      ['.team-grid > div > *', '.team-grid'], ['.network-head', null], ['.member', '.network'], ['.core', null],
      ['.product', '.lab-grid'],
      ['.final .wrap > *', '.final .wrap'],
      ['.page-hero ~ section .wrap > *', null]
    ];
    var seen = new Set(), sets = new Map(), all = [];
    groups.forEach(function (g) {
      document.querySelectorAll(g[0]).forEach(function (el) {
        if (seen.has(el) || el.closest('.hero') || el.closest('[data-flow-steps]')) return;
        seen.add(el);
        var trig = (g[1] && el.closest(g[1])) || el;
        if (trig.getBoundingClientRect().top < innerHeight * .9) return;   // already in view: leave it
        if (!sets.has(trig)) sets.set(trig, []);
        sets.get(trig).push(el); all.push(el);
      });
    });
    if (!all.length) return;
    gsap.set(all, { autoAlpha: 0, y: 42 });
    sets.forEach(function (items, trig) {
      ScrollTrigger.create({
        trigger: trig, start: START, once: true,
        onEnter: function () { gsap.to(items, { autoAlpha: 1, y: 0, duration: 1.05, ease: 'power3.out', stagger: .08, overwrite: true }); }
      });
    });
    /* Safety net: whatever sits too low to ever reach the line shows at the page bottom */
    ScrollTrigger.create({
      trigger: document.documentElement, start: 'bottom bottom+=2', once: true,
      onEnter: function () { gsap.to(all.filter(function (e) { return +gsap.getProperty(e, 'opacity') < 1; }), { autoAlpha: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .06 }); }
    });
  }

  /* ---------- 2. Parallax ---------- */
  function parallax() {
    var heroImg = document.querySelector('.hero .sea img');
    if (heroImg) gsap.to(heroImg, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    document.querySelectorAll('.team-photo img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -7, scale: 1.14 }, { yPercent: 7, scale: 1.14, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    /* Sunrise: the sun climbs out of the sea as the closing block scrolls into view */
    document.querySelectorAll('.final').forEach(function (fin) {
      if (!fin.querySelector('.sea-bg')) return;
      gsap.fromTo(fin, { '--rise': 0 }, { '--rise': 1, ease: 'none', scrollTrigger: { trigger: fin, start: 'top 85%', end: 'bottom bottom', scrub: .6 } });
    });
    var sea = document.querySelector('.final .sea-bg img');
    if (sea) gsap.fromTo(sea, { yPercent: 10 }, { yPercent: -4, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  /* ---------- 3. Count-up: "159,132", "159.132", "€7.83", "€7,83", "54", "2×" ---------- */
  function countUp() {
    document.querySelectorAll('.figure b, .practice .display, .case-sm .big').forEach(function (el) {
      var txt = el.textContent, m = txt.match(/^(\D*?)(\d{1,3}(?:[.,]\d{3})+|\d+)(?:([.,])(\d{1,2}))?(\D*)$/);
      if (!m || el.getBoundingClientRect().top < innerHeight * .9) return;
      var pre = m[1], intPart = m[2], dsep = m[3] || '', dec = m[4] || '', post = m[5];
      var tsep = (intPart.match(/[.,]/) || [''])[0];
      var target = parseFloat(intPart.replace(/[.,]/g, '') + (dec ? '.' + dec : ''));
      if (!(target > 0)) return;
      function fmt(v) {
        var s = v.toFixed(dec.length), parts = s.split('.'), i = parts[0];
        if (tsep) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, tsep);
        return pre + i + (dec ? dsep + parts[1] : '') + post;
      }
      var o = { v: 0 };
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: START, once: true,
        onEnter: function () {
          gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = fmt(o.v); }, onComplete: function () { el.textContent = txt; } });
        }
      });
      ScrollTrigger.create({ trigger: document.documentElement, start: 'bottom bottom+=2', once: true, onEnter: function () { if (o.v === 0) el.textContent = txt; } });
    });
  }

  /* ---------- 4. Flow steps ---------- */
  function flowSteps(reduced) {
    var NS = 'http://www.w3.org/2000/svg';
    document.querySelectorAll('[data-flow-steps]').forEach(function (box, bi) {
      var gid = 'fsGrad' + bi, cid = 'fsClip' + bi;
      var cards = Array.prototype.slice.call(box.children).filter(function (c) { return c.nodeType === 1; });
      if (cards.length < 2) return;
      var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'fs-svg'); svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = '<defs><linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4d8dff"/><stop offset="1" stop-color="#5cf2d6"/></linearGradient>' +
        '<clipPath id="' + cid + '"><rect x="0" y="0" width="0" height="0"/></clipPath></defs>' +
        '<path class="fs-base"/><path class="fs-live" stroke="url(#' + gid + ')" clip-path="url(#' + cid + ')"/>';
      box.appendChild(svg);
      var base = svg.querySelector('.fs-base'), live = svg.querySelector('.fs-live'), clip = svg.querySelector('clipPath rect'), grad = svg.querySelector('linearGradient');
      var nodes = cards.map(function () {
        var r = document.createElementNS(NS, 'circle'); r.setAttribute('class', 'fs-ring'); r.setAttribute('r', 6); svg.appendChild(r);
        var c = document.createElementNS(NS, 'circle'); c.setAttribute('class', 'fs-node'); c.setAttribute('r', 6); svg.appendChild(c);
        return { c: c, r: r };
      });
      var head = document.createElementNS(NS, 'circle'); head.setAttribute('class', 'fs-head'); head.setAttribute('r', 3.5); head.style.opacity = 0; svg.appendChild(head);
      var pts = [], vertical = false, tl = null, done = reduced;

      /* Geometry: horizontal line in the gap above the cards, or a vertical rail left of them */
      function layout() {
        var b = box.getBoundingClientRect(), r0 = cards[0].getBoundingClientRect(), r1 = cards[1].getBoundingClientRect();
        vertical = Math.abs(r1.top - r0.top) > 4;
        box.style.paddingTop = vertical ? '' : '34px';
        box.style.paddingLeft = vertical ? '30px' : '';
        b = box.getBoundingClientRect();
        pts = cards.map(function (c) {
          var r = c.getBoundingClientRect();
          return vertical ? { x: 9, y: r.top - b.top + 30 } : { x: r.left - b.left + 26, y: 10 };
        });
        var d = 'M' + pts.map(function (p) { return p.x + ' ' + p.y; }).join(' L');
        base.setAttribute('d', d); live.setAttribute('d', d);
        var first = pts[0], last = pts[pts.length - 1];
        grad.setAttribute('x1', first.x); grad.setAttribute('y1', first.y); grad.setAttribute('x2', last.x); grad.setAttribute('y2', last.y);
        nodes.forEach(function (n, i) { ['c', 'r'].forEach(function (k) { n[k].setAttribute('cx', pts[i].x); n[k].setAttribute('cy', pts[i].y); }); });
        clip.setAttribute('x', -10); clip.setAttribute('y', -10);
        setProgress(done ? 1 : (tl ? tl.progress() : 0));
      }
      var prog = { p: 0 };
      function setProgress(p) {
        prog.p = p;
        var first = pts[0], last = pts[pts.length - 1];
        var len = vertical ? last.y - first.y : last.x - first.x;
        var at = (vertical ? first.y : first.x) + len * p;
        clip.setAttribute(vertical ? 'height' : 'width', at + 10);
        clip.setAttribute(vertical ? 'width' : 'height', 100000);
        head.setAttribute('cx', vertical ? first.x : at); head.setAttribute('cy', vertical ? at : first.y);
        nodes.forEach(function (n, i) { n.c.classList.toggle('on', p >= i / (pts.length - 1) - .001); });
      }

      layout();
      addEventListener('resize', layout, { passive: true });
      ScrollTrigger.addEventListener('refresh', layout);
      if (reduced) return;

      /* Hide only what is below the fold; the line draws, each node pops, its card rises */
      var below = box.getBoundingClientRect().top > innerHeight * .9;
      if (below) gsap.set(cards, { autoAlpha: 0, y: 34 });
      var seg = .55, N = cards.length;
      tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: function () { done = true; gsap.to(head, { opacity: 0, duration: .4 }); } });
      tl.set(head, { opacity: 1 });
      cards.forEach(function (card, i) {
        var t = i * seg;
        if (i > 0) tl.to(prog, { p: i / (N - 1), duration: seg, ease: 'power1.inOut', onUpdate: function () { setProgress(prog.p); } }, t - seg);
        tl.fromTo(nodes[i].c, { attr: { r: 0 } }, { attr: { r: 6 }, duration: .5, ease: 'back.out(3)' }, t);
        tl.fromTo(nodes[i].r, { attr: { r: 6 }, opacity: .9 }, { attr: { r: 22 }, opacity: 0, duration: .9, ease: 'power2.out' }, t);
        if (below) tl.to(card, { autoAlpha: 1, y: 0, duration: .8 }, t);
      });
      if (!below) { setProgress(0); }
      ScrollTrigger.create({ trigger: box, start: START, once: true, onEnter: function () { tl.play(0); } });
    });
  }
})();

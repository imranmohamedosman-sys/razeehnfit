/* Visual-first previews: shared behaviour (~1 KB gz).
   - The giant WhatsApp button switches its prefilled message to match the section on screen.
   - Clips are muted, start only when ≥60% in view and only after the page has loaded; paused when out of view.
   - No autoplay at all with reduced motion, Save-Data or 2G/3G: poster + big play button instead. */
(function () {
  var d = document.documentElement, c = navigator.connection || {};
  var auto = !matchMedia('(prefers-reduced-motion: reduce)').matches && !c.saveData && !/(^|-)(2g|3g)$/.test(c.effectiveType || '');
  d.classList.toggle('noauto', !auto);
  var wa = document.getElementById('wa');
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { wa.href = e.target.getAttribute('data-wa'); wa.setAttribute('data-sec', e.target.id || ''); } });
    }, { threshold: 0.55 });
    [].forEach.call(document.querySelectorAll('[data-wa]'), function (s) { sio.observe(s); });
  }
  var vids = [].slice.call(document.querySelectorAll('video[data-src]'));
  function load(v) { if (!v.getAttribute('src')) { v.muted = true; v.src = v.getAttribute('data-src'); } }
  function play(v) { load(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  vids.forEach(function (v) {
    v.muted = true;
    var box = v.parentNode, btn = box.querySelector('.playbtn');
    v.addEventListener('playing', function () { box.classList.add('playing'); });
    v.addEventListener('pause', function () { box.classList.remove('playing'); });
    if (btn) btn.addEventListener('click', function () { v.paused ? play(v) : v.pause(); });
  });
  function start() {
    if (!auto || !('IntersectionObserver' in window)) return;
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.intersectionRatio >= 0.6) play(e.target); else e.target.pause(); });
    }, { threshold: [0, 0.6] });
    vids.forEach(function (v) { vio.observe(v); });
  }
  document.readyState === 'complete' ? start() : addEventListener('load', start, { once: true });
  // switching language keeps you on the same section
  [].forEach.call(document.querySelectorAll('.lang a'), function (a) {
    a.addEventListener('click', function () { var id = wa.getAttribute('data-sec'); if (id) a.href = a.getAttribute('href').split('#')[0] + '#' + id; });
  });
})();

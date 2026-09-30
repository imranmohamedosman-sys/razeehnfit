/* Shared loader gate (inline this in production: ~0.6 KB).
   1) HTML + CSS + poster paint first (LCP = headline / poster, no JS needed).
   2) Only after window 'load' + idle time do we fetch the 3D module.
   3) Lite mode (no 3D at all, poster stays) for: prefers-reduced-motion, Save-Data,
      2G/3G, <4 GB RAM, <4 CPU cores, no WebGL, or ?lite in the URL. */
(function () {
  var d = document.documentElement, qs = new URLSearchParams(location.search);
  var c = navigator.connection || {};
  var lite = !qs.has('force3d') && (qs.has('lite') ||
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '') ||
    (navigator.deviceMemory || 8) < 4 || (navigator.hardwareConcurrency || 8) < 4);
  d.dataset.mode = lite ? 'lite' : 'full';
  if (lite) return;
  function go() {
    import(d.dataset.scene).then(function (m) { return m.start(); })
      .catch(function (e) { console.warn('3D skipped', e); d.dataset.mode = 'lite'; });
  }
  function idle() { 'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2000 }) : setTimeout(go, 300); }
  document.readyState === 'complete' ? idle() : addEventListener('load', idle, { once: true });
})();

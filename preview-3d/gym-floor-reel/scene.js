// Direction C — Gym Floor Reel. A drum of Razeehn's own vertical clips; the centre clip plays muted (desktop only).
// 3D cost: three.js (~170 KB gz) + posters already on the site (~35 KB each) + optional 1 MB clip on desktop.
import * as THREE from 'three';
const qs = new URLSearchParams(location.search);

export async function start() {
  const reel = document.querySelector('.stagebox');
  const items = [...document.querySelectorAll('.clips li')];
  const canvas = document.createElement('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (e) { document.documentElement.dataset.mode = 'lite'; return; }
  const phone = innerWidth < 900, RTL = document.documentElement.dir === 'rtl';
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2));
  reel.prepend(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xEFEBE4, 4.7, 9.5);
  const cam = new THREE.PerspectiveCamera(phone ? 31 : 30, 1, 0.1, 50);
  const R = 3.1, D = R + 4.6, W = 1.3, H = W * 16 / 9, step = (W + 0.16) / R;
  const drum = new THREE.Group(); drum.position.z = -D; scene.add(drum);

  // rounded-corner alpha mask shared by all panels
  const m = document.createElement('canvas'); m.width = 90; m.height = 160;
  const g = m.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 90, 160); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(0, 0, 90, 160, 9); g.fill();
  const alpha = new THREE.CanvasTexture(m);

  const loader = new THREE.TextureLoader();
  const panels = items.map((li, i) => {
    const geo = new THREE.PlaneGeometry(W, H, 24, 1), pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) { const a = pos.getX(k) / R; pos.setXYZ(k, R * Math.sin(a), pos.getY(k), R * Math.cos(a)); }
    geo.computeVertexNormals();
    const tex = loader.load(li.dataset.poster); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaMap: alpha, transparent: true });
    const mesh = new THREE.Mesh(geo, mat); drum.add(mesh);
    return mesh;
  });
  // Desktop, full mode only: the centre panel becomes the real (muted, looping) clip.
  if (!phone && items[0].dataset.video && !(navigator.connection || {}).saveData) {
    const v = Object.assign(document.createElement('video'), { src: items[0].dataset.video, muted: true, loop: true, playsInline: true, preload: 'auto' });
    v.play().then(() => { const vt = new THREE.VideoTexture(v); vt.colorSpace = THREE.SRGBColorSpace; panels[0].material.map = vt; panels[0].material.needsUpdate = true; }).catch(() => {});
  }

  const n = panels.length, dir = RTL ? -1 : 1; // RTL: the reel advances right-to-left
  let active = 0, rot = 0, visible = true, inView = true;
  const tag = document.querySelector('.cap .tag'), cap = document.querySelector('.cap p'), dur = document.querySelector('.cap .dur'), dots = [...document.querySelectorAll('.dots i')];
  function setActive(i) {
    active = (i + n) % n; const li = items[active];
    tag.textContent = li.dataset.tag; cap.textContent = li.dataset.cap; dur.textContent = li.dataset.dur;
    dots.forEach((d, k) => d.classList.toggle('on', k === active));
  }
  function layout() {
    panels.forEach((p, i) => { const off = ((i - active + n + Math.floor(n / 2)) % n) - Math.floor(n / 2); p.userData.slot = off; });
  }
  let x0 = null;
  reel.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 30) { setActive(active + (dx < 0 ? 1 : -1) * dir); layout(); } });
  let auto = setTimeout(function tick() { setActive(active + 1); layout(); auto = setTimeout(tick, 4500); }, 7000);

  function size() { const r = reel.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); cam.position.set(0, 0, phone ? 1.1 : 0); }
  size(); addEventListener('resize', size);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) requestAnimationFrame(loop); }).observe(reel);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) requestAnimationFrame(loop); });
  layout(); setActive(0);

  function frame(t) {
    panels.forEach((p) => {
      const tgt = -p.userData.slot * step * dir; // angle of this panel on the drum
      p.rotation.y += (tgt - p.rotation.y) * 0.09;
      const s = p.userData.slot === 0 ? 1 : 0.94; p.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
    });
    drum.rotation.x = Math.sin(t / 2400) * 0.02; // barely-there breathing
    renderer.render(scene, cam);
  }
  function loop(t) { if (!visible || !inView) return; frame(t); requestAnimationFrame(loop); }
  // wait until the posters are decoded before revealing the canvas over the CSS fallback
  await new Promise((res) => { THREE.DefaultLoadingManager.onLoad = res; setTimeout(res, 4000); });
  panels.forEach((p) => { p.rotation.y = -p.userData.slot * step * dir; });
  frame(performance.now());
  requestAnimationFrame(() => { document.documentElement.classList.add('is3d'); document.documentElement.dataset.ready = '1'; requestAnimationFrame(loop); });
}

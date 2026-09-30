// Direction A — Forged Plate. One procedural object (no model file): an Olympic plate
// with a gold engraved ring. Total 3D cost = three.js (~170 KB gz) + this file (~3 KB gz).
import * as THREE from 'three';
import { RoomEnvironment } from '../shared/vendor/RoomEnvironment.js';

const qs = new URLSearchParams(location.search);
const RTL = document.documentElement.dir === 'rtl';
const GOLD = '#C9A26B';

function engraving() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), R = 0.79, px = (r) => (S / 2) * r / R;
  g.translate(S / 2, S / 2);
  g.strokeStyle = GOLD; g.lineWidth = 3;
  [0.47, 0.745].forEach((r) => { g.beginPath(); g.arc(0, 0, px(r), 0, Math.PI * 2); g.stroke(); });
  // Words around the ring. Latin is laid per letter; Arabic is drawn as one shaped word
  // (never split Arabic letters, it breaks the joins).
  const words = ['RAZEEHN', '✦', 'رزين', '✦', '20+ YEARS OF IRON', '✦', 'TRAIN', '✦', 'RECOVER', '✦', 'REPEAT', '✦'];
  const rad = px(0.61), size = 58;
  g.fillStyle = GOLD; g.textAlign = 'center'; g.textBaseline = 'middle';
  const font = (w) => /[\u0600-\u06ff]/.test(w) ? `800 ${size + 6}px Cairo, sans-serif` : `${size}px Anton, Impact, sans-serif`;
  const units = [];
  words.forEach((w) => {
    if (/[\u0600-\u06ff]/.test(w)) { g.font = font(w); units.push({ t: w, w: g.measureText(w).width, f: font(w) }); }
    else [...w].forEach((ch) => { g.font = font(w); units.push({ t: ch, w: g.measureText(ch).width + 6, f: font(w) }); });
  });
  const total = units.reduce((a, u) => a + u.w, 0), gap = (2 * Math.PI * rad - total) / units.length;
  let a = -Math.PI / 2;
  units.forEach((u) => {
    const span = (u.w + gap) / rad, mid = a + span / 2;
    g.save(); g.rotate(mid); g.translate(0, -rad); g.font = u.f; g.fillText(u.t, 0, 0); g.restore();
    a += span;
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export async function start() {
  await Promise.all([document.fonts.load('58px Anton'), document.fonts.load('800 64px Cairo', 'رزين')]).catch(() => {});
  const stage = document.getElementById('stage');
  const canvas = document.createElement('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: qs.has('poster') });
  } catch (e) { document.documentElement.dataset.mode = 'lite'; return; }
  const phone = innerWidth < 900;
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0, 6);

  const P = [[0.13,-0.10],[0.13,0.10],[0.29,0.10],[0.31,0.085],[0.33,0.055],[0.80,0.055],[0.83,0.10],[0.85,0.13],[0.96,0.13],[0.99,0.115],[1.0,0.09],[1.0,-0.09],[0.99,-0.115],[0.96,-0.13],[0.85,-0.13],[0.83,-0.10],[0.80,-0.055],[0.33,-0.055],[0.31,-0.085],[0.29,-0.10],[0.13,-0.10]]
    .reverse().map(([x, y]) => new THREE.Vector2(x, y));
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.85, roughness: 0.34 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xC9A26B, metalness: 1, roughness: 0.28 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.14 });

  const plate = new THREE.Group();
  const body = new THREE.Mesh(new THREE.LatheGeometry(P, phone ? 96 : 160), iron);
  body.rotation.x = Math.PI / 2; plate.add(body);
  const tex = engraving();
  const ringMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, metalness: 1, roughness: 0.3 });
  const ringF = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.79, 128), ringMat); ringF.position.z = 0.057; plate.add(ringF);
  const ringB = ringF.clone(); ringB.rotation.y = Math.PI; ringB.position.z = -0.057; plate.add(ringB);
  [0.132, -0.132].forEach((z) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.905, 0.009, 8, 160), gold); t.position.z = z; plate.add(t); });
  // steel insert around the bore, like a real bumper plate
  [0.075, -0.075].forEach((z) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 16, 64), chrome); t.position.z = z; plate.add(t); });
  scene.add(plate);

  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(-3, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xE3C592, 3.2); rim.position.set(4, 1.5, -2); scene.add(rim);

  const heroEl = document.getElementById('anchor-hero'), svcEl = document.getElementById('anchor-svc'), svcSec = document.getElementById('services');
  const mouse = { x: 0, y: 0 };
  if (!phone) addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  function size() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); canvas.style.width = '100%'; canvas.style.height = '100%';
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);

  // Place the plate on a DOM anchor: layout (and RTL mirroring) drives the 3D, not magic numbers.
  const unit = () => innerHeight / (2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
  function pose(el) {
    const r = el.getBoundingClientRect(), u = unit();
    return { x: (r.left + r.width / 2 - innerWidth / 2) / u, y: -(r.top + r.height / 2 - innerHeight / 2) / u, s: (r.width * 0.92) / (2 * u) };
  }
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const dirSign = RTL ? -1 : 1;
  let visible = true, t0 = performance.now(), cur = null;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) loop(); });

  function frame(now) {
    const t = (now - t0) / 1000;
    const p = ease(THREE.MathUtils.clamp(scrollY / Math.max(1, svcSec.offsetTop - 80), 0, 1));
    const a = pose(heroEl), b = pose(svcEl);
    const tgt = { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: a.s + (b.s - a.s) * p };
    cur = cur ? { x: cur.x + (tgt.x - cur.x) * 0.2, y: cur.y + (tgt.y - cur.y) * 0.2, s: cur.s + (tgt.s - cur.s) * 0.2 } : tgt;
    plate.position.set(cur.x, cur.y, 0); plate.scale.setScalar(cur.s);
    // Hero: 3/4 view, slow breathing tilt. Scrolling: the plate rolls toward the services column.
    plate.rotation.y = dirSign * (-0.55 + p * 1.05) + mouse.x * 0.35 + Math.sin(t * 0.6) * 0.04;
    plate.rotation.x = 0.12 + mouse.y * 0.25 + p * 0.25;
    plate.rotation.z = -dirSign * p * Math.PI * 0.9;
    ringF.rotation.z = ringB.rotation.z = t * 0.06 * dirSign;
    renderer.render(scene, cam);
  }
  function loop() { if (!visible) return; frame(performance.now()); requestAnimationFrame(loop); }

  if (qs.has('poster')) { // build-time: render the static fallback poster from the real scene
    renderer.setSize(900, 900, false); cam.aspect = 1; cam.updateProjectionMatrix();
    plate.position.set(0, 0, 0); plate.scale.setScalar(1.45); plate.rotation.set(0.12, dirSign * -0.55, 0);
    renderer.render(scene, cam);
    window.__poster = canvas.toDataURL('image/webp', 0.86);
    return;
  }
  frame(performance.now());
  requestAnimationFrame(() => { document.documentElement.classList.add('is3d'); document.documentElement.dataset.ready = '1'; loop(); });
}

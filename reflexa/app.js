/* Reflexa by NextXI — reaction and agility training.
   Plain JavaScript, no build step. Data lives in this browser's localStorage. */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Cue library
     ------------------------------------------------------------------ */
  const COLORS = {
    red:    { hex: '#E5322D', name: 'Red' },
    blue:   { hex: '#2563EB', name: 'Blue' },
    green:  { hex: '#16A34A', name: 'Green' },
    yellow: { hex: '#FACC15', name: 'Yellow' },
    orange: { hex: '#F97316', name: 'Orange' },
    purple: { hex: '#9333EA', name: 'Purple' },
    pink:   { hex: '#EC4899', name: 'Pink' },
    white:  { hex: '#F5F5F2', name: 'White' },
  };
  const ARROWS = {
    up:        { deg: 0,   name: 'Up' },
    upright:   { deg: 45,  name: 'Up right' },
    right:     { deg: 90,  name: 'Right' },
    downright: { deg: 135, name: 'Down right' },
    down:      { deg: 180, name: 'Down' },
    downleft:  { deg: 225, name: 'Down left' },
    left:      { deg: 270, name: 'Left' },
    upleft:    { deg: 315, name: 'Up left' },
  };
  const starPts = (() => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 19 : 46, a = Math.PI / 5 * i - Math.PI / 2;
      p.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (53 + r * Math.sin(a)).toFixed(1));
    }
    return p.join(' ');
  })();
  const SHAPES = {
    circle:   { name: 'Circle',   svg: '<circle cx="50" cy="50" r="42"/>' },
    square:   { name: 'Square',   svg: '<rect x="10" y="10" width="80" height="80" rx="6"/>' },
    triangle: { name: 'Triangle', svg: '<path d="M50 8 94 88H6z"/>' },
    star:     { name: 'Star',     svg: `<polygon points="${starPts}"/>` },
    cross:    { name: 'Cross',    svg: '<path d="M38 8h24v30h30v24H62v30H38V62H8V38h30z"/>' },
    diamond:  { name: 'Diamond',  svg: '<path d="M50 4 94 50 50 96 6 50z"/>' },
  };
  const SIDES = { left: { name: 'Left' }, right: { name: 'Right' } };

  const arrowSvg = (deg, fill = '#fff') =>
    `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="${fill}" transform="rotate(${deg} 50 50)" d="M50 6 88 46H64v48H36V46H12z"/></svg>`;
  const shapeSvg = (key, fill = '#fff') =>
    `<svg viewBox="0 0 100 100" aria-hidden="true" fill="${fill}">${SHAPES[key].svg}</svg>`;

  const TYPE_HINTS = {
    color:  'The whole screen turns a colour. Pair each colour with a cone, e.g. red = front-left cone.',
    arrow:  'An arrow shows the direction to move: shuffle, sprint or backpedal.',
    number: 'Number your cones and go to the one shown.',
    shape:  'Match each shape to a cone or a movement.',
    side:   'One half of the screen lights up. Go that way.',
    mixed:  'Colours and arrows in one drill, for a harder decision.',
  };

  /* ------------------------------------------------------------------
     Built-in drills (copied into the user's list on first open)
     ------------------------------------------------------------------ */
  const BASE = {
    type: 'color', colors: ['red', 'blue', 'green', 'yellow'], arrows: ['up', 'down', 'left', 'right'],
    shapes: ['circle', 'square', 'triangle', 'star'], numMin: 1, numMax: 4,
    nogo: false, nogoColor: 'red', nogoPct: 25,
    gapMin: 1, gapMax: 2.5, show: 1, reps: 20, sets: 3, rest: 45,
    sound: 'beep', noRepeat: true, vibrate: false,
  };
  const PRESETS = [
    { name: 'Colour call', type: 'color' },
    { name: 'Four-way arrows', type: 'arrow', gapMin: 1.2, gapMax: 3, reps: 16 },
    { name: 'Hold or go', type: 'color', colors: ['green', 'red'], nogo: true, nogoColor: 'red', nogoPct: 30, gapMax: 3, rest: 40 },
    { name: 'Cone numbers', type: 'number', numMin: 1, numMax: 5, gapMin: 1.5, gapMax: 3, show: 1.5, reps: 15, rest: 60, sound: 'voice' },
    { name: 'Side step', type: 'side', gapMin: 0.8, gapMax: 2, show: 0.8, sets: 4, rest: 30 },
    { name: 'Mixed read', type: 'mixed', colors: ['red', 'blue', 'yellow'], arrows: ['left', 'right', 'up'] },
    { name: 'Eight-way keeper', type: 'arrow', arrows: Object.keys(ARROWS), gapMin: 1.5, gapMax: 3, reps: 12, sets: 4 },
  ];

  /* ------------------------------------------------------------------
     Storage
     ------------------------------------------------------------------ */
  const KEY = 'nextxi-reflexa-v1';
  const uid = () => Math.random().toString(36).slice(2, 10);
  let db = load();

  function load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (_) { /* storage blocked */ }
    if (!d || !Array.isArray(d.drills)) {
      d = { drills: PRESETS.map(p => ({ ...BASE, ...p, id: uid() })), history: [] };
    }
    if (!Array.isArray(d.history)) d.history = [];
    return d;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (_) { /* private mode: keep in memory */ }
  }

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtS = n => (Math.round(n * 10) / 10).toString();
  const fmtDur = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const fmtDate = t => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ---------- sound, voice, vibration, screen ---------- */
  let actx;
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function beep(freq = 880, dur = 0.12, vol = 0.35) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function say(text) {
    if (!('speechSynthesis' in window)) return beep();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.25; u.lang = 'en-GB';
    speechSynthesis.speak(u);
  }
  const buzz = ms => { if (navigator.vibrate) navigator.vibrate(ms); };

  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (_) { /* not supported or not allowed */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (run || test)) keepAwake(true);
    if (document.visibilityState === 'hidden' && run && !run.paused && ['countdown', 'gap', 'cue'].includes(run.phase)) pauseRun();
  });
  function fullscreen(on) {
    const d = document;
    try {
      if (on && !d.fullscreenElement && d.documentElement.requestFullscreen) d.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      else if (!on && d.fullscreenElement) d.exitFullscreen().catch(() => {});
    } catch (_) { /* iPhone Safari has no element fullscreen */ }
  }

  /* ------------------------------------------------------------------
     Navigation
     ------------------------------------------------------------------ */
  const screens = ['home', 'editor', 'history'];
  function show(id) {
    screens.forEach(s => { $('#' + s).hidden = s !== id; });
    if (id === 'home') renderHome();
    if (id === 'history') renderHistory();
    window.scrollTo(0, 0);
  }
  function go(id) { history.pushState({ screen: id }, ''); show(id); }
  window.addEventListener('popstate', e => {
    if (run) stopRun();
    if (test) stopTest();
    show((e.state && e.state.screen) || 'home');
  });
  $$('[data-back]').forEach(b => b.addEventListener('click', () => history.back()));

  /* ------------------------------------------------------------------
     Home
     ------------------------------------------------------------------ */
  function drillSummary(d) {
    const parts = [];
    if (d.type === 'color') parts.push(d.colors.length + ' colours' + (d.nogo ? ' + hold' : ''));
    if (d.type === 'arrow') parts.push(d.arrows.length + ' directions');
    if (d.type === 'number') parts.push('Numbers ' + d.numMin + '–' + d.numMax);
    if (d.type === 'shape') parts.push(d.shapes.length + ' shapes');
    if (d.type === 'side') parts.push('Left / right');
    if (d.type === 'mixed') parts.push('Colours + arrows');
    parts.push(d.sets + '×' + d.reps);
    parts.push(fmtS(d.gapMin) + '–' + fmtS(d.gapMax) + 's');
    return parts.join(' · ');
  }
  function swatch(el, d) {
    el.innerHTML = ''; el.style.background = '#000';
    if (d.type === 'color' || d.type === 'mixed') {
      const c = d.colors.map(k => COLORS[k].hex);
      const step = 360 / c.length;
      el.style.background = 'conic-gradient(' + c.map((h, i) => `${h} ${i * step}deg ${(i + 1) * step}deg`).join(',') + ')';
      if (d.type === 'mixed') el.innerHTML = arrowSvg(90);
    } else if (d.type === 'arrow') el.innerHTML = arrowSvg(ARROWS[d.arrows[0]].deg, '#C6F432');
    else if (d.type === 'number') el.textContent = d.numMax;
    else if (d.type === 'shape') el.innerHTML = shapeSvg(d.shapes[0], '#C6F432');
    else if (d.type === 'side') el.style.background = 'linear-gradient(90deg,#F5F5F2 50%,#000 50%)';
  }
  function renderHome() {
    const list = $('#drillList'), tpl = $('#drillItem');
    list.innerHTML = '';
    db.drills.forEach(d => {
      const li = tpl.content.firstElementChild.cloneNode(true);
      $('strong', li).textContent = d.name;
      $('small', li).textContent = drillSummary(d);
      swatch($('.drill-swatch', li), d);
      $('.drill-main', li).addEventListener('click', () => startRun(d));
      $('[data-tool=edit]', li).addEventListener('click', () => openEditor(d));
      $('[data-tool=share]', li).addEventListener('click', () => shareDrill(d));
      list.appendChild(li);
    });
    if (!db.drills.length) list.innerHTML = '<li class="empty">No drills yet. Tap “+ New drill”.</li>';

    const simple = db.history.filter(h => h.kind === 'test' && h.test === 'simple');
    const best = simple.length ? Math.min(...simple.map(h => h.best)) : null;
    const lastAvg = simple.length ? simple[simple.length - 1].avg : null;
    const week = Date.now() - 7 * 864e5;
    const sessions = db.history.filter(h => h.kind === 'drill' && h.date > week).length;
    $('#homeStats').innerHTML = db.history.length ? `
      <div class="stat"><b>${best ?? '—'}${best ? '<small style="font-size:14px"> ms</small>' : ''}</b><span>Best reaction</span></div>
      <div class="stat"><b>${lastAvg ?? '—'}${lastAvg ? '<small style="font-size:14px"> ms</small>' : ''}</b><span>Last test average</span></div>
      <div class="stat"><b>${sessions}</b><span>Drills this week</span></div>` :
      '<p class="empty">Nothing yet. Take a reaction test to get your starting number.</p>';
  }
  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.go;
    if (t === 'test-simple') startTest('simple');
    else if (t === 'test-choice') startTest('choice');
    else go(t);
  }));

  /* ------------------------------------------------------------------
     Drill editor
     ------------------------------------------------------------------ */
  const form = $('#drillForm');
  let editing = null;

  function chipHtml(name, key, label, icon) {
    return `<label><input type="checkbox" name="${name}" value="${key}"><span><i>${icon}</i>${esc(label)}</span></label>`;
  }
  $('#colorChips').innerHTML = Object.entries(COLORS).map(([k, c]) => chipHtml('colors', k, c.name, `<b style="display:block;width:24px;height:24px;border-radius:7px;background:${c.hex}"></b>`)).join('');
  $('#arrowChips').innerHTML = Object.entries(ARROWS).map(([k, a]) => chipHtml('arrows', k, a.name, arrowSvg(a.deg, '#F1F4EE'))).join('');
  $('#shapeChips').innerHTML = Object.entries(SHAPES).map(([k, s]) => chipHtml('shapes', k, s.name, shapeSvg(k, '#F1F4EE'))).join('');

  function syncEditor() {
    const type = form.type.value;
    $$('[data-for]', form).forEach(el => { el.hidden = !el.dataset.for.split(' ').includes(type); });
    $('#typeHint').textContent = TYPE_HINTS[type] || '';
    $('[data-nogo]', form).hidden = !form.nogo.checked;
    const sel = $('#nogoSelect'), cur = sel.value;
    const picked = $$('input[name=colors]:checked', form).map(i => i.value);
    sel.innerHTML = picked.map(k => `<option value="${k}">${COLORS[k].name}</option>`).join('');
    if (picked.includes(cur)) sel.value = cur;
  }
  form.addEventListener('change', syncEditor);

  function openEditor(d) {
    editing = d ? d.id : null;
    const v = d || { ...BASE, name: 'My drill' };
    $('#editorTitle').textContent = d ? 'Edit drill' : 'New drill';
    form.name.value = v.name;
    form.querySelector(`input[name=type][value=${v.type}]`).checked = true;
    form.querySelector(`input[name=sound][value=${v.sound}]`).checked = true;
    $$('input[name=colors]', form).forEach(i => { i.checked = v.colors.includes(i.value); });
    $$('input[name=arrows]', form).forEach(i => { i.checked = v.arrows.includes(i.value); });
    $$('input[name=shapes]', form).forEach(i => { i.checked = v.shapes.includes(i.value); });
    ['numMin', 'numMax', 'nogoPct', 'gapMin', 'gapMax', 'show', 'reps', 'sets', 'rest'].forEach(k => { form[k].value = v[k]; });
    form.nogo.checked = !!v.nogo; form.noRepeat.checked = !!v.noRepeat; form.vibrate.checked = !!v.vibrate;
    syncEditor();
    form.nogoColor.value = v.nogoColor;
    $('[data-action=delete-drill]').hidden = !d;
    go('editor');
  }

  function readForm() {
    const num = (k, a, b) => clamp(parseFloat(form[k].value) || 0, a, b);
    const d = {
      name: form.name.value.trim() || 'My drill',
      type: form.type.value,
      colors: $$('input[name=colors]:checked', form).map(i => i.value),
      arrows: $$('input[name=arrows]:checked', form).map(i => i.value),
      shapes: $$('input[name=shapes]:checked', form).map(i => i.value),
      numMin: Math.round(num('numMin', 0, 99)), numMax: Math.round(num('numMax', 0, 99)),
      nogo: form.nogo.checked, nogoColor: form.nogoColor.value || 'red', nogoPct: num('nogoPct', 5, 60),
      gapMin: num('gapMin', 0.3, 30), gapMax: num('gapMax', 0.3, 30), show: num('show', 0, 30),
      reps: Math.round(num('reps', 1, 200)), sets: Math.round(num('sets', 1, 20)), rest: Math.round(num('rest', 0, 600)),
      sound: form.sound.value, noRepeat: form.noRepeat.checked, vibrate: form.vibrate.checked,
    };
    if (d.gapMax < d.gapMin) [d.gapMin, d.gapMax] = [d.gapMax, d.gapMin];
    if (d.numMax < d.numMin) [d.numMin, d.numMax] = [d.numMax, d.numMin];
    const need = { color: 'colors', arrow: 'arrows', shape: 'shapes' }[d.type];
    if (need && !d[need].length) return toast('Pick at least one ' + need.slice(0, -1) + '.');
    if (d.type === 'mixed' && (!d.colors.length || !d.arrows.length)) return toast('Mixed needs at least one colour and one direction.');
    if (d.type === 'color' && d.nogo && d.colors.filter(c => c !== d.nogoColor).length < 1) return toast('Add a go colour besides the hold colour.');
    if (d.type !== 'color') d.nogo = false;
    return d;
  }
  function saveDrill() {
    const d = readForm(); if (!d) return null;
    if (editing) {
      const i = db.drills.findIndex(x => x.id === editing);
      d.id = editing; db.drills[i] = d;
    } else { d.id = uid(); db.drills.push(d); }
    save();
    return d;
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (saveDrill()) { toast('Drill saved'); history.back(); }
  });
  $('[data-action=save-run]').addEventListener('click', () => {
    const d = saveDrill(); if (!d) return;
    history.replaceState({ screen: 'home' }, ''); show('home');
    startRun(d);
  });
  $('[data-action=delete-drill]').addEventListener('click', () => {
    if (!confirm('Delete this drill?')) return;
    db.drills = db.drills.filter(x => x.id !== editing); save();
    history.back();
  });
  $('[data-action=new-drill]').addEventListener('click', () => openEditor(null));

  /* ---------- share a drill as a link (e.g. a coach sends it on WhatsApp) ---------- */
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  async function shareDrill(d) {
    const { id, ...data } = d;
    const url = location.origin + location.pathname + '#drill=' + b64(JSON.stringify(data));
    const text = `Reflexa drill: ${d.name}`;
    try {
      if (navigator.share) { await navigator.share({ title: d.name, text, url }); return; }
      await navigator.clipboard.writeText(url);
      toast('Link copied. Send it to your athlete.');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      prompt('Copy this link:', url);
    }
  }
  function importFromHash() {
    const m = location.hash.match(/^#drill=([\w-]+)$/);
    if (!m) return;
    history.replaceState(null, '', location.pathname);
    try {
      const raw = JSON.parse(unb64(m[1]));
      const d = { ...BASE };
      for (const k of Object.keys(BASE)) if (k in raw && typeof raw[k] === typeof BASE[k]) d[k] = raw[k];
      d.name = String(raw.name || 'Shared drill').slice(0, 40);
      const ok = (arr, lib) => arr.filter(k => k in lib);
      d.colors = ok(d.colors, COLORS); d.arrows = ok(d.arrows, ARROWS); d.shapes = ok(d.shapes, SHAPES);
      if (!['color', 'arrow', 'number', 'shape', 'side', 'mixed'].includes(d.type)) throw new Error('type');
      if (!['beep', 'voice', 'off'].includes(d.sound)) d.sound = 'beep';
      d.id = uid();
      db.drills.unshift(d); save();
      toast(`Added “${d.name}” to your drills`);
    } catch (_) { toast('That drill link could not be read.'); }
  }

  /* ------------------------------------------------------------------
     Drill runner
     ------------------------------------------------------------------ */
  const stage = $('#run'), cueEl = $('#cue'), overlay = $('#overlay');
  let run = null;

  function buildPool(d) {
    if (d.type === 'color') return d.colors.map(k => ({ kind: 'color', key: k }));
    if (d.type === 'arrow') return d.arrows.map(k => ({ kind: 'arrow', key: k }));
    if (d.type === 'shape') return d.shapes.map(k => ({ kind: 'shape', key: k }));
    if (d.type === 'side') return ['left', 'right'].map(k => ({ kind: 'side', key: k }));
    if (d.type === 'number') { const p = []; for (let n = d.numMin; n <= d.numMax; n++) p.push({ kind: 'number', key: String(n) }); return p; }
    return [...d.colors.map(k => ({ kind: 'color', key: k })), ...d.arrows.map(k => ({ kind: 'arrow', key: k }))];
  }
  function pickCue() {
    const d = run.drill;
    if (d.nogo && Math.random() * 100 < d.nogoPct) return { kind: 'color', key: d.nogoColor, hold: true };
    let pool = d.nogo ? run.pool.filter(c => c.key !== d.nogoColor) : run.pool;
    if (d.noRepeat && pool.length > 1 && run.last) pool = pool.filter(c => !(c.kind === run.last.kind && c.key === run.last.key));
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function cueName(c) {
    if (c.kind === 'color') return COLORS[c.key].name;
    if (c.kind === 'arrow') return ARROWS[c.key].name;
    if (c.kind === 'shape') return SHAPES[c.key].name;
    if (c.kind === 'side') return SIDES[c.key].name;
    return c.key;
  }
  function paintCue(c) {
    cueEl.className = 'stage-cue';
    cueEl.style.background = '#000';
    cueEl.innerHTML = '';
    if (!c) { cueEl.classList.add('ready'); return; }
    if (c.kind === 'color') cueEl.style.background = COLORS[c.key].hex;
    else if (c.kind === 'arrow') cueEl.innerHTML = arrowSvg(ARROWS[c.key].deg);
    else if (c.kind === 'shape') cueEl.innerHTML = shapeSvg(c.key);
    else if (c.kind === 'number') cueEl.innerHTML = `<span class="num">${esc(c.key)}</span>`;
    else if (c.kind === 'side') {
      cueEl.classList.add('side');
      cueEl.innerHTML = c.key === 'left' ? '<b style="background:#F5F5F2"></b><b></b>' : '<b></b><b style="background:#F5F5F2"></b>';
    }
  }
  function announce(c) {
    const d = run.drill;
    if (d.sound === 'beep') beep(c.hold ? 330 : 880);
    else if (d.sound === 'voice') say(cueName(c));
    if (d.vibrate) buzz(c.hold ? [40, 40, 40] : 60);
  }

  function setOverlay(kicker, big, sub, actions) {
    overlay.hidden = false;
    $('#ovKicker').textContent = kicker;
    $('#ovBig').textContent = big;
    $('#ovSub').textContent = sub || '';
    const box = $('#ovActions'); box.innerHTML = '';
    (actions || []).forEach(([label, fn, ghost]) => {
      const b = document.createElement('button');
      b.className = 'btn btn-block' + (ghost ? ' btn-ghost' : '');
      b.textContent = label;
      b.addEventListener('click', e => { e.stopPropagation(); fn(); });
      box.appendChild(b);
    });
  }
  function hud() {
    const d = run.drill;
    $('#hudSet').textContent = `Set ${run.set}/${d.sets}`;
    $('#hudRep').textContent = `${run.rep}/${d.reps}`;
    $('#hudBar').style.width = (100 * run.total / (d.sets * d.reps)) + '%';
  }

  function startRun(drill, fresh = true) {
    audio();
    if (run) cancelAnimationFrame(run.raf);
    run = { drill, pool: buildPool(drill), set: 1, rep: 0, total: 0, holds: 0, last: null,
            phase: '', end: 0, paused: false, pausedAt: 0, startedAt: Date.now(), lastBeep: 0, raf: 0 };
    if (fresh) history.pushState({ screen: 'home', run: true }, '');
    stage.hidden = false; document.body.style.overflow = 'hidden';
    fullscreen(true); keepAwake(true);
    paintCue(null); hud();
    countdown();
    run.raf = requestAnimationFrame(tick);
  }
  function enter(phase, ms) { run.phase = phase; run.end = performance.now() + ms; }

  function countdown() {
    enter('countdown', 3000); run.lastBeep = 4;
    setOverlay(`Set ${run.set} of ${run.drill.sets}`, '3', 'Get ready. Tap the screen to pause.');
  }
  function gap() {
    if (run.drill.show > 0) paintCue(null);
    enter('gap', rand(run.drill.gapMin, run.drill.gapMax) * 1000);
  }
  function cue() {
    const c = pickCue();
    run.last = c; run.rep++; run.total++; if (c.hold) run.holds++;
    paintCue(c); announce(c); hud();
    const d = run.drill;
    if (run.rep >= d.reps) enter('cue', (d.show > 0 ? d.show : d.gapMax) * 1000);
    else if (d.show > 0) enter('cue', d.show * 1000);
    else gap();
  }
  function endSet() {
    const d = run.drill;
    paintCue(null);
    if (run.set >= d.sets) return finish(true);
    if (d.rest <= 0) { run.set++; run.rep = 0; hud(); return countdown(); }
    enter('rest', d.rest * 1000); run.lastBeep = 4;
    setOverlay('Rest', String(d.rest), `Next: set ${run.set + 1} of ${d.sets}`, [['Skip rest', () => { run.end = 0; }, true]]);
  }

  function tick(now) {
    if (!run) return;
    run.raf = requestAnimationFrame(tick);
    if (run.paused) return;
    const left = run.end - now;
    if (run.phase === 'countdown' || run.phase === 'rest') {
      const s = Math.max(0, Math.ceil(left / 1000));
      if (run.phase === 'countdown' || s <= 3) {
        if (s < run.lastBeep && s > 0) { run.lastBeep = s; beep(run.phase === 'rest' ? 520 : 440, 0.08, 0.25); }
      }
      $('#ovBig').textContent = s;
    }
    if (left > 0) return;
    switch (run.phase) {
      case 'countdown': overlay.hidden = true; gap(); break;
      case 'gap': cue(); break;
      case 'cue': run.rep >= run.drill.reps ? endSet() : gap(); break;
      case 'rest': run.set++; run.rep = 0; hud(); countdown(); break;
    }
  }

  function pauseRun() {
    if (!run || run.paused) return;
    run.paused = true; run.pausedAt = performance.now();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setOverlay('Paused', 'II', `Set ${run.set} of ${run.drill.sets} · cue ${run.rep} of ${run.drill.reps}`, [
      ['Resume', resumeRun],
      ['Restart set', () => { run.paused = false; run.total -= run.rep; run.rep = 0; hud(); paintCue(null); countdown(); }, true],
      ['End drill', () => finish(false), true],
    ]);
  }
  function resumeRun() {
    if (!run || !run.paused) return;
    run.end += performance.now() - run.pausedAt;
    run.paused = false;
    if (run.phase === 'countdown') setOverlay(`Set ${run.set} of ${run.drill.sets}`, '', 'Get ready. Tap the screen to pause.');
    else overlay.hidden = true;
  }
  stage.addEventListener('pointerdown', e => {
    if (!run || e.target.closest('button')) return;
    if (run.paused) return;
    if (['countdown', 'gap', 'cue'].includes(run.phase)) pauseRun();
  });

  function finish(complete) {
    const d = run.drill, ms = Date.now() - run.startedAt;
    run.phase = 'done'; run.paused = false;
    paintCue(null);
    if (run.total > 0) {
      db.history.push({ kind: 'drill', name: d.name, date: Date.now(), cues: run.total, holds: run.holds, ms, complete });
      db.history = db.history.slice(-300); save();
    }
    if (complete) beep(660, 0.1); if (complete) setTimeout(() => beep(990, 0.18), 140);
    const holdTxt = run.holds ? ` (${run.holds} hold)` : '';
    setOverlay(complete ? 'Drill complete' : 'Drill ended', fmtDur(ms),
      `${run.total} cue${run.total === 1 ? "" : "s"}${holdTxt} · ${run.set} of ${d.sets} sets`, [
        ['Go again', () => startRun(run.drill, false)],
        ['Done', () => history.back(), true],
      ]);
  }
  function stopRun() {
    if (!run) return;
    cancelAnimationFrame(run.raf);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    run = null;
    stage.hidden = true; overlay.hidden = true; document.body.style.overflow = '';
    keepAwake(false);
    fullscreen(false);
  }

  /* ------------------------------------------------------------------
     Reaction tests
     simple: tap as soon as the screen turns green (5 tries)
     choice: an arrow points left or right; tap that half (8 tries)
     ------------------------------------------------------------------ */
  const testEl = $('#test'), pad = $('#testPad');
  let test = null;
  const TRIALS = { simple: 5, choice: 8 };
  const MIN_MS = 100; // faster than this is a guess, not a reaction

  function setPad(cls, big, sub) {
    pad.className = 'test-pad' + (cls ? ' ' + cls : '');
    $('#tpBig').innerHTML = big;
    $('#tpSub').innerHTML = sub || '';
  }
  function testHud() { $('#tpCount').textContent = `${Math.min(test.times.length + 1, test.n)} / ${test.n}`; }

  function startTest(mode, fresh = true) {
    audio();
    if (test) clearTimeout(test.timer);
    test = { mode, n: TRIALS[mode], times: [], errors: 0, early: 0, state: 'intro', timer: 0, goAt: 0, side: '' };
    if (fresh) history.pushState({ screen: 'home', test: true }, '');
    testEl.hidden = false; document.body.style.overflow = 'hidden';
    keepAwake(true);
    testHud();
    if (mode === 'simple') setPad('', 'Reaction<br>time', `The screen turns red, then green after a random wait. Tap the moment it turns green.<br><br>Tap anywhere to start.`);
    else setPad('', 'Left or<br>right', `An arrow will point left or right. Tap that half of the screen as fast as you can.<br><br>Tap anywhere to start.`);
  }
  function arm() {
    test.state = 'wait';
    testHud();
    setPad('wait', test.mode === 'simple' ? 'Wait…' : '', test.mode === 'simple' ? 'Tap when it turns green' : '');
    const delay = rand(1500, 4000);
    test.timer = setTimeout(() => {
      requestAnimationFrame(t => {
        if (!test || test.state !== 'wait') return;
        if (test.mode === 'simple') setPad('go', 'Tap!', '');
        else { test.side = Math.random() < 0.5 ? 'left' : 'right'; setPad('', arrowSvg(ARROWS[test.side].deg), ''); }
        test.goAt = t; test.state = 'go';
      });
    }, delay);
  }
  function respond(timeStamp, side) {
    if (!test) return;
    if (test.state === 'intro' || test.state === 'between') return arm();
    if (test.state === 'done') return;
    if (test.state === 'wait') {
      clearTimeout(test.timer); test.early++; test.state = 'between';
      buzz(120);
      return setPad('early', 'Too soon', 'Wait for the cue. Tap to try again.');
    }
    if (test.state !== 'go') return;
    const ms = Math.round(timeStamp - test.goAt);
    if (ms < MIN_MS) { test.early++; test.state = 'between'; return setPad('early', 'Too soon', 'That was a guess. Tap to try again.'); }
    if (test.mode === 'choice' && side !== test.side) {
      test.errors++; test.state = 'between'; buzz(120);
      return setPad('early', 'Wrong side', `${ms} ms, but it pointed ${test.side}. Tap to try again.`);
    }
    test.times.push(ms);
    if (test.times.length >= test.n) return testDone();
    test.state = 'between';
    setPad('', `${ms}<small style="font-size:.4em"> ms</small>`, 'Tap for the next one');
  }
  function testDone() {
    test.state = 'done';
    const t = test.times, avg = Math.round(t.reduce((a, b) => a + b, 0) / t.length), best = Math.min(...t);
    const prev = db.history.filter(h => h.kind === 'test' && h.test === test.mode);
    const pb = prev.length ? Math.min(...prev.map(h => h.best)) : Infinity;
    db.history.push({ kind: 'test', test: test.mode, name: test.mode === 'simple' ? 'Reaction time' : 'Left or right',
      date: Date.now(), avg, best, times: t, errors: test.errors, early: test.early });
    db.history = db.history.slice(-300); save();
    const extra = [test.early && `${test.early} too soon`, test.errors && `${test.errors} wrong side`].filter(Boolean).join(' · ');
    setPad('', `${avg}<small style="font-size:.4em"> ms</small>`,
      `Average · best ${best} ms${prev.length && best < pb ? ' <b style="color:#DBFF6B">new personal best</b>' : ''}<br>${t.join(' · ')} ms${extra ? '<br>' + extra : ''}` +
      `<br><span style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" data-t="again">Test again</button><button class="btn btn-ghost" style="color:#fff" data-t="home">Done</button></span>`);
    $('#tpCount').textContent = 'Result';
  }
  pad.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-t]');
    if (b) { e.preventDefault(); return; }
    if (e.button > 0) return;
    respond(e.timeStamp, e.clientX < window.innerWidth / 2 ? 'left' : 'right');
  });
  pad.addEventListener('click', e => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === 'again') startTest(test.mode, false);
    else history.back();
  });
  // pointerdown already handled the tap; stop keyboard "click" on the big button from double-firing
  pad.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); });
  $('#testExit').addEventListener('click', () => history.back());

  function stopTest() {
    if (!test) return;
    clearTimeout(test.timer); test = null;
    testEl.hidden = true; document.body.style.overflow = '';
    keepAwake(false);
  }

  /* ---------- keyboard (desktop / Bluetooth clicker) ---------- */
  document.addEventListener('keydown', e => {
    if (test && !e.repeat) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); respond(e.timeStamp, ''); }
      else if (e.key === 'ArrowLeft') respond(e.timeStamp, 'left');
      else if (e.key === 'ArrowRight') respond(e.timeStamp, 'right');
      else if (e.key === 'Escape') history.back();
    } else if (run) {
      if (e.key === ' ') { e.preventDefault(); run.paused ? resumeRun() : pauseRun(); }
      else if (e.key === 'Escape' && !run.paused && run.phase !== 'done') pauseRun();
    }
  });

  /* ------------------------------------------------------------------
     History
     ------------------------------------------------------------------ */
  function sparkline(rows, label) {
    if (rows.length < 2) return '';
    const vals = rows.map(r => r.avg), lo = Math.min(...vals) * 0.95, hi = Math.max(...vals) * 1.05;
    const W = 300, H = 100, x = i => (i / (vals.length - 1)) * (W - 20) + 10, y = v => H - 10 - ((v - lo) / (hi - lo || 1)) * (H - 20);
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<div class="chart"><h3>${label}: last ${vals.length} tests (lower is better)</h3>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${label} averages from ${vals[0]} to ${vals[vals.length - 1]} ms">
      <polyline points="${pts}" fill="none" stroke="#C6F432" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      ${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#DBFF6B"/>`).join('')}
      </svg><p class="hint" style="margin:6px 0 0">First ${vals[0]} ms → latest ${vals[vals.length - 1]} ms</p></div>`;
  }
  function renderHistory() {
    const tests = mode => db.history.filter(h => h.kind === 'test' && h.test === mode).slice(-20);
    $('#historyChart').innerHTML = sparkline(tests('simple'), 'Reaction time') + sparkline(tests('choice'), 'Left or right');
    const list = $('#historyList');
    if (!db.history.length) { list.innerHTML = '<li class="empty">No sessions yet.</li>'; return; }
    list.innerHTML = db.history.slice().reverse().map(h => h.kind === 'test'
      ? `<li><span><span class="h-name">${esc(h.name)}</span><span class="h-date">${fmtDate(h.date)}</span></span>
          <span class="h-val">${h.avg} ms<small>best ${h.best} ms${h.errors ? ' · ' + h.errors + ' wrong' : ''}</small></span></li>`
      : `<li><span><span class="h-name">${esc(h.name)}</span><span class="h-date">${fmtDate(h.date)}${h.complete ? '' : ' · ended early'}</span></span>
          <span class="h-val">${fmtDur(h.ms)}<small>${h.cues} cue${h.cues === 1 ? "" : "s"}</small></span></li>`).join('');
  }
  $('[data-action=clear-history]').addEventListener('click', () => {
    if (!confirm('Delete all history on this device?')) return;
    db.history = []; save(); renderHistory();
  });

  /* ------------------------------------------------------------------
     Start
     ------------------------------------------------------------------ */
  importFromHash();
  window.addEventListener('hashchange', () => {
    if (!/^#drill=/.test(location.hash)) return;
    if (run) stopRun();
    if (test) stopTest();
    importFromHash();
    history.replaceState({ screen: 'home' }, '');
    show('home');
  });
  history.replaceState({ screen: 'home' }, '');
  show('home');
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();

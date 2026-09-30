// Direction B — Train ↔ Recover Pulse. No library: one full-screen fragment shader (~2 KB gz).
// u_mode 0 = TRAIN (tight contour lines, red, fast heartbeat) → 1 = RECOVER (wide, calm, sand, slow breath).
const qs = new URLSearchParams(location.search);
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `#extension GL_OES_standard_derivatives : enable
precision mediump float;
uniform vec2 r; uniform float t, m; uniform vec2 f;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),u=fract(p);u=u*u*(3.-2.*u);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<4;k++){v+=a*n(p);p=p*2.03+17.;a*=.5;}return v;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
  // pseudo-3D: project the screen onto a ground plane seen at an angle (a night dune field)
  float hz=.72, z=.9/(hz-uv.y);
  vec2 w=vec2(uv.x,1.)*z, fw=vec2(f.x,1.)*(.9/(hz-f.y));
  float d=length(w-fw);
  float speed=mix(1.1,.25,m);                       // heartbeat vs breathing
  float beat=pow(max(0.,sin(d*mix(5.,1.8,m)-t*speed*6.2832)),mix(10.,3.,m))*exp(-d*mix(.55,.3,m));
  float field=fbm(w*mix(1.7,.95,m)+vec2(t*.02,-t*.03))+beat*mix(.09,.12,m);
  float v=field*mix(26.,13.,m);
  float line=1.-min(abs(fract(v-.5)-.5)/fwidth(v)/mix(1.1,1.5,m),1.);
  float fog=exp(-z*.16);
  vec3 c=mix(vec3(.878,.192,.184),vec3(.847,.725,.541),m);
  vec3 col=vec3(.039)+c*line*mix(.75,.6,m)*fog+c*beat*mix(.5,.3,m)*fog;
  col+=c*.05*smoothstep(.2,.72,uv.y)*(1.-m*.5);
  gl_FragColor=vec4(col,1.);
}`;

export function start() {
  const stage = document.getElementById('stage');
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: qs.has('poster') });
  if (!gl || !gl.getExtension('OES_standard_derivatives')) { document.documentElement.dataset.mode = 'lite'; return; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = (k) => gl.getUniformLocation(pr, k), ur = U('r'), ut = U('t'), um = U('m'), uf = U('f');
  stage.appendChild(c);

  // Fill-rate is the cost of a full-screen shader, so render below device resolution.
  const phone = innerWidth < 900, scale = phone ? 0.6 : 0.75;
  function size() { c.width = Math.round(innerWidth * scale); c.height = Math.round(innerHeight * scale); gl.viewport(0, 0, c.width, c.height); }
  size(); addEventListener('resize', size);

  const RTL = document.documentElement.dir === 'rtl';
  const focus = [phone ? 0 : (RTL ? -0.42 : 0.42), phone ? -0.25 : -0.12];
  const how = document.getElementById('how');
  let mode = 0, manual = null, visible = true, last = 0;
  const fpsCap = phone ? 1000 / 30 : 0; // 30 fps on phones is plenty for a slow field
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) requestAnimationFrame(loop); });
  document.querySelectorAll('[data-mode-btn]').forEach((b) => b.addEventListener('click', () => {
    manual = b.dataset.modeBtn === 'recover' ? 1 : 0;
    document.querySelectorAll('[data-mode-btn]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  addEventListener('scroll', () => { manual = null; }, { passive: true });

  function draw(now) {
    const p = Math.min(1, Math.max(0, scrollY / Math.max(1, how.offsetTop - innerHeight * 0.25)));
    const target = manual ?? p;
    mode += (target - mode) * 0.06;
    document.documentElement.style.setProperty('--mode', mode.toFixed(3));
    gl.uniform2f(ur, c.width, c.height); gl.uniform1f(ut, now / 1000); gl.uniform1f(um, mode); gl.uniform2f(uf, focus[0], focus[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) { if (!visible) return; if (now - last >= fpsCap) { draw(now); last = now; } requestAnimationFrame(loop); }

  if (qs.has('poster')) { c.width = 1200; c.height = 1200; gl.viewport(0, 0, 1200, 1200); mode = +(qs.get('m') || 0); gl.uniform2f(ur, 1200, 1200); gl.uniform1f(ut, 2.2); gl.uniform1f(um, mode); gl.uniform2f(uf, 0.0, -0.15); gl.drawArrays(gl.TRIANGLES, 0, 3); window.__poster = c.toDataURL('image/webp', 0.7); return; }
  draw(performance.now());
  requestAnimationFrame(() => { document.documentElement.classList.add('is3d'); document.documentElement.dataset.ready = '1'; requestAnimationFrame(loop); });
}

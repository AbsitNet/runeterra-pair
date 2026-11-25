/* ================= Эффекты стадий и звук =================
   Уровень 1 — четвертьфинал: золотые искры.
   Уровень 2 — полуфинал и финалы сеток: искры гуще, бегущая золотая рамка, вступление с лучом света.
   Уровень 3 — гранд-финал: полноэкранное вступление, сердцебиение, лепестки и взрыв сердечек при выборе. */
const FX = (() => {
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let cv, cx, W = 0, H = 0, dpr = 1, level = 0, parts = [], raf = 0, last = 0;

  function ensure(){
    if (cv) return;
    cv = document.getElementById('fx'); cx = cv.getContext('2d');
    const size = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function spawn(kind, x, y){
    const gold = css('--gold') || '#C8AA6E', rose = css('--rose') || '#E8668A', hi = css('--gold-hi') || '#F0E6D2';
    if (kind === 'ember') return {k:kind, x: x ?? rnd(0, W), y: y ?? H + 10, vx: rnd(-.2, .2), vy: rnd(-1.1, -.4), r: rnd(1, 2.6), life: rnd(4, 9), t:0, c: Math.random() < .2 ? hi : gold};
    if (kind === 'spark') return {k:kind, x: x ?? rnd(0, W), y: y ?? rnd(H * .3, H), vx: rnd(-1.5, 1.5), vy: rnd(-2.5, -.6), r: rnd(.8, 1.8), life: rnd(1, 2.2), t:0, c: hi};
    if (kind === 'petal') return {k:kind, x: x ?? rnd(-40, W + 40), y: y ?? -20, vx: rnd(-.4, .6), vy: rnd(.5, 1.3), r: rnd(5, 9), rot: rnd(0, 6.28), vr: rnd(-.04, .04), sway: rnd(0, 6.28), life: 14, t:0, c: Math.random() < .25 ? hi : rose};
    if (kind === 'heart') { const a = rnd(0, 6.28), s = rnd(3, 11); return {k:kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, r: rnd(6, 13), rot: rnd(-.5, .5), life: rnd(1.4, 2.4), t:0, c: Math.random() < .3 ? gold : rose, g: .18}; }
    if (kind === 'glint') { const a = rnd(0, 6.28), s = rnd(1.5, 6); return {k:kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(1, 2.4), life: rnd(.6, 1.2), t:0, c: gold, g: .06}; }
  }
  function heartPath(r){
    cx.beginPath(); cx.moveTo(0, r * .35);
    cx.bezierCurveTo(-r, -r * .3, -r * .45, -r * 1.05, 0, -r * .45);
    cx.bezierCurveTo(r * .45, -r * 1.05, r, -r * .3, 0, r * .35); cx.closePath();
  }
  function tick(ts){
    raf = 0;
    const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
    cx.clearRect(0, 0, W, H);
    const rate = [0, 6, 14, 18][level] || 0;
    if (!reduced && level && !document.hidden){
      if (Math.random() < rate * dt) parts.push(spawn('ember'));
      if (level >= 2 && Math.random() < 6 * dt) parts.push(spawn('spark'));
      if (level >= 3 && Math.random() < 5 * dt) parts.push(spawn('petal'));
    }
    parts = parts.filter(p => (p.t += dt) < p.life && p.y < H + 40 && p.y > -60);
    for (const p of parts){
      if (p.g) p.vy += p.g;
      if (p.k === 'petal'){ p.sway += dt * 2; p.x += p.vx + Math.sin(p.sway) * .6; p.y += p.vy; p.rot += p.vr; }
      else { p.x += p.vx; p.y += p.vy; if (p.k === 'heart' || p.k === 'glint'){ p.vx *= .985; } }
      const fade = Math.min(1, (p.life - p.t) / .8) * Math.min(1, p.t / .25);
      cx.globalAlpha = Math.max(0, fade) * (p.k === 'ember' ? .85 : 1);
      cx.fillStyle = p.c;
      if (p.k === 'petal'){ cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.beginPath(); cx.ellipse(0, 0, p.r, p.r * .55, 0, 0, 6.28); cx.fill(); cx.restore(); }
      else if (p.k === 'heart'){ cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); heartPath(p.r); cx.fill(); cx.restore(); }
      else { cx.shadowColor = p.c; cx.shadowBlur = 8; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); cx.shadowBlur = 0; }
    }
    cx.globalAlpha = 1;
    if (level || parts.length) raf = requestAnimationFrame(tick); else last = 0;
  }
  function run(){ ensure(); if (!raf) raf = requestAnimationFrame(tick); }

  function setLevel(l){
    level = reduced ? 0 : (l || 0);
    document.documentElement.dataset.fx = String(l || 0);
    if (level) run();
  }
  function burst(x, y, l){
    if (reduced) return; ensure();
    const n = l >= 3 ? 70 : l === 2 ? 26 : l === 1 ? 14 : 0;
    for (let i = 0; i < n; i++) parts.push(spawn(l >= 3 ? 'heart' : 'glint', x, y));
    if (l >= 3) for (let i = 0; i < 40; i++) parts.push(spawn('glint', x, y));
    run();
  }
  function celebrate(){
    if (reduced) return; ensure();
    for (let i = 0; i < 6; i++) setTimeout(() => burst(rnd(W * .15, W * .85), rnd(H * .2, H * .5), 3), i * 260);
  }

  /* вступление стадии: возвращает промис, по тапу пропускается */
  function intro(l, title, sub){
    return new Promise(res => {
      const el = document.getElementById('intro');
      el.className = 'intro lv' + l; el.hidden = false;
      el.querySelector('.intro-title').textContent = title;
      el.querySelector('.intro-sub').textContent = sub || '';
      const dur = reduced ? 700 : [0, 1500, 2100, 3200][l];
      let done = false;
      const end = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => { el.hidden = true; el.className = 'intro'; res(); }, reduced ? 0 : 380); };
      el.onclick = end; setTimeout(end, dur);
      Sound.intro(l);
    });
  }
  return {setLevel, burst, celebrate, intro};
})();

/* Звук: всё синтезируется WebAudio, без файлов. По умолчанию включён, переключатель запоминается. */
const Sound = (() => {
  let ac = null, on = true;
  try { on = localStorage.getItem('rp-sound') !== 'off'; } catch(e){}
  const ctx = () => { if (!ac){ const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); } if (ac.state === 'suspended') ac.resume(); return ac; };
  function tone(f, t0, d, type = 'sine', vol = .08, slide = 0){
    const c = ctx(); if (!c || !on) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .05);
  }
  const N = s => 440 * Math.pow(2, s / 12);
  return {
    get on(){ return on; },
    toggle(){ on = !on; try { localStorage.setItem('rp-sound', on ? 'on' : 'off'); } catch(e){} if (on) tone(N(7), 0, .15, 'triangle', .06); return on; },
    pick(l = 0){ if (!on) return; tone(N(3 + (l || 0) * 2), 0, .12, 'triangle', .07); tone(N(10 + (l || 0) * 2), .05, .16, 'sine', .04); },
    intro(l){
      if (!on) return;
      if (l === 1){ [0, 4, 7].forEach((s, i) => tone(N(s), i * .11, .5, 'triangle', .06)); }
      if (l === 2){ [0, 4, 7, 12, 16].forEach((s, i) => tone(N(s - 2), i * .09, .7, 'triangle', .06)); tone(N(-14), 0, 1.2, 'sine', .05); }
      if (l === 3){
        [0, .62].forEach(t => { tone(55, t, .18, 'sine', .22, .6); tone(52, t + .2, .22, 'sine', .16, .6); });
        [0, 4, 7, 11, 14, 19].forEach((s, i) => tone(N(s - 5), 1.3 + i * .12, 1.1, 'triangle', .05));
      }
    },
    fanfare(){ if (!on) return; [[0,0],[4,.12],[7,.24],[12,.36],[7,.6],[12,.72]].forEach(([s,t]) => tone(N(s), t, .55, 'square', .035)); [0,4,7].forEach(s => tone(N(s - 12), .72, 1.4, 'triangle', .06)); }
  };
})();

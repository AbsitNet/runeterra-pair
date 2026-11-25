/* ================= Картинка тир-листа и сертификат ================= */
const Share = (() => {
  const cache = {};
  const loadImg = id => cache[id] || (cache[id] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = img(id); }));
  const C = {
    night:'#090E15', deep:'#0E1621', panel:'#131D2A', line:'#263445', gold:'#C8AA6E', hi:'#F0E6D2', lo:'#6E5530', text:'#E7E0D0', muted:'#8C9AA9', rose:'#E8668A',
    tiers:{S:'#E6C47A', A:'#E8668A', B:'#A28DE4', C:'#47B8AD', D:'#6E7D8C'}
  };
  const FD = '"Forum", Georgia, serif', FU = '"Golos Text", system-ui, sans-serif';
  async function fontsReady(){ try { await document.fonts.ready; await Promise.all([document.fonts.load(`40px ${FD}`), document.fonts.load(`600 20px ${FU}`)]); } catch(e){} }

  function cover(cx, im, x, y, w, h, focusY = .16){
    if (!im){ cx.fillStyle = C.panel; cx.fillRect(x, y, w, h); return; }
    const s = Math.max(w / im.width, h / im.height), sw = w / s, sh = h / s;
    const sx = (im.width - sw) / 2, sy = Math.max(0, Math.min(im.height - sh, im.height * focusY - sh * focusY));
    cx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
  }
  function fitText(cx, text, max, size, font, weight = ''){
    let s = size; cx.font = `${weight} ${s}px ${font}`;
    while (cx.measureText(text).width > max && s > 9){ s--; cx.font = `${weight} ${s}px ${font}`; }
    return s;
  }
  function wrapWords(cx, text, max){
    const out = []; let line = '';
    for (const w of text.split(' ')){
      const t = line ? line + ' ' + w : w;
      if (line && cx.measureText(t).width > max){ out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }
  /* цитата победителя: самый крупный кегль, при котором она влезает в отведённую высоту */
  function quoteBlock(cx, q, max, room){
    let best;
    for (const s of [28, 26, 24, 22, 20, 18]){
      cx.font = `${s}px ${FD}`;
      const lines = q.lines.flatMap(l => wrapWords(cx, `«${l}»`, max));
      best = { lines, s, lh: Math.round(s * 1.3), by: q.by };
      best.h = lines.length * best.lh + (q.by ? 30 : 0);
      if (best.h <= room) break;
    }
    return best;
  }
  function bg(cx, w, h){
    cx.fillStyle = C.night; cx.fillRect(0, 0, w, h);
    const g = cx.createRadialGradient(w / 2, -h * .05, 10, w / 2, -h * .05, h * .7);
    g.addColorStop(0, 'rgba(200,170,110,.18)'); g.addColorStop(1, 'rgba(200,170,110,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, w, h);
  }

  async function tierList(m, removed, who){
    await fontsReady();
    const W = 1080, pad = 48, lab = 150, th = 92, tw = 74, gap = 10, nameH = 20;
    const sizes = tierSizesOf(m), rows = [];
    let pos = 0;
    TIERS.forEach(([L, label], i) => { rows.push({L, label:label.replace(/­/g,''), ids:m.order.slice(pos, pos + sizes[i]), start:pos}); pos += sizes[i]; });
    if (removed && removed.length) rows.push({L:'—', label:'Сразу мимо', ids:removed, start:-1});
    const perRow = Math.floor((W - pad * 2 - lab - 20 + gap) / (tw + gap));
    const rowH = r => Math.max(1, Math.ceil(r.ids.length / perRow)) * (th + nameH + gap) + 20;
    const H = 210 + rows.reduce((s, r) => s + rowH(r) + 10, 0) + 70;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'); bg(cx, W, H);
    cx.fillStyle = C.gold; cx.font = `600 18px ${FU}`; cx.fillText('ПАРА ИЗ РУНТЕРРЫ · ТИР-ЛИСТ', pad, 70);
    cx.fillStyle = C.hi; fitText(cx, who ? `Тир-лист: ${who}` : 'Мой тир-лист', W - pad * 2, 64, FD); cx.fillText(who ? `Тир-лист: ${who}` : 'Мой тир-лист', pad, 140);
    cx.fillStyle = C.muted; cx.font = `20px ${FU}`; cx.fillText(`Идеальная пара: ${BY[m.champ].name} · ${m.order.length} участников · ${m.total} дуэлей`, pad, 178);
    let y = 210;
    for (const r of rows){
      const h = rowH(r), col = C.tiers[r.L] || C.muted;
      cx.fillStyle = C.deep; cx.fillRect(pad, y, W - pad * 2, h);
      cx.fillStyle = col; cx.globalAlpha = .18; cx.fillRect(pad, y, lab, h); cx.globalAlpha = 1;
      cx.fillRect(pad + lab - 3, y, 3, h);
      cx.fillStyle = col; cx.font = `${r.L === '—' ? 40 : 64}px ${FD}`; cx.fillText(r.L, pad + 18, y + 70);
      cx.fillStyle = C.text; fitText(cx, r.label, lab - 30, 18, FU, '500'); cx.fillText(r.label, pad + 18, y + 100);
      const ims = await Promise.all(r.ids.map(loadImg));
      r.ids.forEach((id, i) => {
        const x = pad + lab + 14 + (i % perRow) * (tw + gap), yy = y + 12 + Math.floor(i / perRow) * (th + nameH + gap);
        if (r.start < 0) cx.globalAlpha = .55;
        cover(cx, ims[i], x, yy, tw, th);
        cx.strokeStyle = C.line; cx.strokeRect(x + .5, yy + .5, tw - 1, th - 1);
        if (r.start >= 0){ cx.fillStyle = 'rgba(9,14,21,.85)'; cx.fillRect(x, yy, 26, 18); cx.fillStyle = C.hi; cx.font = `600 12px ${FU}`; cx.fillText(String(r.start + i + 1), x + 4, yy + 13); }
        cx.fillStyle = C.text; fitText(cx, BY[id].name, tw, 13, FU); cx.fillText(BY[id].name, x, yy + th + 15);
        cx.globalAlpha = 1;
      });
      y += h + 10;
    }
    cx.fillStyle = C.muted; cx.font = `16px ${FU}`; cx.fillText('Фан-тест по League of Legends. Не одобрен Riot Games.', pad, H - 32);
    return cv;
  }

  /* печати краёв: цвет чернил и регистраторы (второй — на случай, если победил сам первый) */
  const SEAL = {
    ion:{ink:'#EE6F95', reg:['Karma','Shen']},        nox:{ink:'#E8474F', reg:['Swain','Darius']},
    dem:{ink:'#86B3EC', reg:['JarvanIV','Garen']},    frl:{ink:'#82D6F4', reg:['Ashe','Sejuani']},
    pil:{ink:'#DDB574', reg:['Caitlyn','Jayce']},     zau:{ink:'#A3DB4F', reg:['Renata','Singed']},
    bil:{ink:'#F08560', reg:['MissFortune','Illaoi']}, shu:{ink:'#F2C450', reg:['Nasus','Azir']},
    tar:{ink:'#A493F7', reg:['Soraka','Taric']},      ixt:{ink:'#44C990', reg:['Qiyana','Nidalee']},
    sha:{ink:'#3ED3BA', reg:['Thresh','Yorick']},     void:{ink:'#C773F0', reg:['Belveth','Malzahar']},
    rt:{ink:'#DDA772', reg:['Zilean','Ryze']}
  };
  const emblems = {};
  const loadEmblem = k => emblems[k] || (emblems[k] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `img/regions/${k}.png`; }));
  const hashStr = s => { let h = 2166136261; for (const ch of s){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  /* текст по кругу, по центру сверху; возвращает занятый угол */
  function arcText(cx, text, r, size, track){
    cx.font = `700 ${size}px ${FU}`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    const chars = [...text], ws = chars.map(ch => cx.measureText(ch).width);
    const total = ws.reduce((s, w) => s + w, 0) + track * (chars.length - 1);
    let a = -Math.PI / 2 - total / r / 2;
    chars.forEach((ch, i) => {
      a += ws[i] / 2 / r;
      cx.save(); cx.rotate(a + Math.PI / 2); cx.fillText(ch, 0, -r); cx.restore();
      a += (ws[i] / 2 + track) / r;
    });
    return total / r;
  }

  async function drawSeal(region, champ){
    const seal = SEAL[region] || SEAL.rt, R = 104, D = 2 * R + 16;
    const cv = document.createElement('canvas'); cv.width = D; cv.height = D;
    const cx = cv.getContext('2d'); cx.translate(D / 2, D / 2);
    cx.strokeStyle = cx.fillStyle = seal.ink;
    const ring = (r, w) => { cx.lineWidth = w; cx.beginPath(); cx.arc(0, 0, r, 0, Math.PI * 2); cx.stroke(); };
    ring(R - 2.5, 5); ring(R - 10, 1.6); ring(R - 37, 1.6); ring(R - 42, 1);
    /* «Заверено официальным представительством …» — шрифт подбирается под длину названия края */
    const text = `ЗАВЕРЕНО ОФИЦИАЛЬНЫМ ПРЕДСТАВИТЕЛЬСТВОМ ${REGIONS[region][1].toUpperCase()}`, rText = R - 23.5;
    let size = 16;
    for (; size > 9; size -= .5){
      cx.font = `700 ${size}px ${FU}`;
      const total = [...text].reduce((s, ch) => s + cx.measureText(ch).width, 0) + size * .14 * (text.length - 1);
      if (total / rText <= Math.PI * 2 * .87) break;
    }
    arcText(cx, text, rText, size, size * .14);
    cx.save(); cx.rotate(Math.PI); cx.font = `${size + 2}px ${FU}`; cx.fillText('★', 0, -rText); cx.restore();
    /* герб края в центре, в цвет чернил */
    const em = await loadEmblem(region);
    if (em){
      const s = 2 * (R - 42) - 22, t = document.createElement('canvas'); t.width = t.height = Math.ceil(s);
      const tx = t.getContext('2d'); tx.drawImage(em, 0, 0, s, s);
      tx.globalCompositeOperation = 'source-in'; tx.fillStyle = seal.ink; tx.fillRect(0, 0, s, s);
      cx.drawImage(t, -s / 2, -s / 2);
    }
    /* потёртость оттиска: случайные проплешины, одинаковые для одного и того же победителя */
    const rnd = mulberry32(hashStr(champ + region));
    cx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 520; i++){
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (R + 4);
      cx.globalAlpha = .25 + rnd() * .75;
      cx.beginPath(); cx.arc(Math.cos(a) * r, Math.sin(a) * r, .4 + rnd() * 1.6, 0, Math.PI * 2); cx.fill();
    }
    for (let i = 0; i < 3; i++){
      const a = rnd() * Math.PI * 2, r = R * (.35 + rnd() * .6);
      cx.globalAlpha = .18 + rnd() * .2;
      cx.beginPath(); cx.arc(Math.cos(a) * r, Math.sin(a) * r, 10 + rnd() * 18, 0, Math.PI * 2); cx.fill();
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    return cv;
  }

  async function certificate(m, person){
    await fontsReady();
    const W = 1080, H = 1350, champ = BY[m.champ], im = await loadImg(m.champ);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'); bg(cx, W, H);
    /* рамка */
    cx.strokeStyle = C.gold; cx.lineWidth = 3; cx.strokeRect(36, 36, W - 72, H - 72);
    cx.strokeStyle = C.lo; cx.lineWidth = 1; cx.strokeRect(52, 52, W - 104, H - 104);
    [[52,52],[W-52,52],[52,H-52],[W-52,H-52]].forEach(([x,y]) => { cx.save(); cx.translate(x, y); cx.rotate(Math.PI / 4); cx.fillStyle = C.night; cx.fillRect(-12, -12, 24, 24); cx.strokeStyle = C.gold; cx.lineWidth = 2; cx.strokeRect(-12, -12, 24, 24); cx.restore(); });
    cx.textAlign = 'center';
    cx.fillStyle = C.gold; cx.font = `600 20px ${FU}`; cx.fillText('ПАРА ИЗ РУНТЕРРЫ', W / 2, 112);
    cx.fillStyle = C.hi; cx.font = `72px ${FD}`; cx.fillText('Сертификат', W / 2, 192);
    cx.font = `40px ${FD}`; cx.fillStyle = C.gold; cx.fillText('о совместимости сердец', W / 2, 240);
    cx.fillStyle = C.text; cx.font = `24px ${FU}`;
    const who = (person || '').trim() || 'предъявителя сего';
    fitText(cx, `Настоящим удостоверяется, что сердце ${who}`, W - 200, 24, FU);
    cx.fillText(`Настоящим удостоверяется, что сердце ${who}`, W / 2, 300);
    cx.font = `24px ${FU}`; cx.fillText('по итогам честного турнира отдано', W / 2, 334);
    /* портрет */
    const pw = 300, ph = 430, px = W / 2 - pw / 2, py = 366;
    cx.save(); cx.shadowColor = 'rgba(232,102,138,.5)'; cx.shadowBlur = 50; cx.fillStyle = C.deep; cx.fillRect(px, py, pw, ph); cx.restore();
    cover(cx, im, px, py, pw, ph, .3);
    cx.strokeStyle = C.gold; cx.lineWidth = 3; cx.strokeRect(px, py, pw, ph);
    const gr = cx.createLinearGradient(0, py + ph - 140, 0, py + ph); gr.addColorStop(0, 'rgba(9,14,21,0)'); gr.addColorStop(1, 'rgba(9,14,21,.92)');
    cx.fillStyle = gr; cx.fillRect(px, py + ph - 140, pw, 140);
    cx.fillStyle = C.hi; fitText(cx, champ.name.toUpperCase(), W - 160, 92, FD); cx.fillText(champ.name.toUpperCase(), W / 2, py + ph + 84);
    cx.fillStyle = C.gold; cx.font = `30px ${FD}`; cx.fillText(champ.title, W / 2, py + ph + 126);
    /* цитата победителя — между титулом и строкой совместимости, не заходя на печать */
    const q = quoteOf(m.champ);
    if (q){
      const top = py + ph + 152, room = 104, b = quoteBlock(cx, q, 760, room);
      let y = top + (room - b.h) / 2 + b.s;
      cx.fillStyle = C.text; cx.font = `${b.s}px ${FD}`;
      b.lines.forEach(l => { cx.fillText(l, W / 2, y); y += b.lh; });
      if (b.by){ cx.fillStyle = C.muted; cx.font = `19px ${FU}`; cx.fillText(`— ${b.by}`, W / 2, y - b.lh + 30); }
    }
    /* «совместимость» — по доле побед победителя */
    const st = m.st[m.champ], wins = st.beat.length, losses = st.lost.length;
    const pct = Math.min(100, Math.round(90 + 10 * wins / Math.max(1, wins + losses)));
    cx.fillStyle = C.text; cx.font = `24px ${FU}`;
    cx.fillText(`Совместимость: ${pct}% · побед в дуэлях: ${wins}`, W / 2, 1104);
    const wit = [m.order[1], m.order[2]].filter(Boolean).map(id => BY[id].name).join(' и ');
    cx.fillStyle = C.muted; cx.font = `22px ${FU}`;
    cx.fillText(`Свидетели: ${wit}`, W / 2, 1142);
    /* печать и регистратор — того края, откуда родом победитель */
    const region = (PROFILE[m.champ] || ['rt'])[0], seal = SEAL[region] || SEAL.rt;
    const stamp = await drawSeal(region, m.champ);
    cx.save(); cx.translate(W - 190, H - 188); cx.rotate(-.17);
    cx.globalAlpha = .92; cx.shadowColor = seal.ink + '55'; cx.shadowBlur = 14;
    cx.drawImage(stamp, -stamp.width / 2, -stamp.height / 2);
    cx.restore();
    const reg = seal.reg.find(id => id !== m.champ && BY[id]) || seal.reg[0];
    cx.textAlign = 'left'; cx.fillStyle = C.muted; cx.font = `20px ${FU}`;
    const d = new Date();
    cx.fillText(`Дата: ${d.toLocaleDateString('ru-RU', {day:'numeric', month:'long', year:'numeric'})}`, 100, H - 150);
    fitText(cx, `Регистратор: ${BY[reg].name}, ${BY[reg].title}`, 640, 20, FU);
    cx.fillText(`Регистратор: ${BY[reg].name}, ${BY[reg].title}`, 100, H - 118);
    cx.font = `15px ${FU}`; cx.fillText('Фан-тест по League of Legends. Не одобрен Riot Games.', 100, H - 78);
    return cv;
  }

  /* общий сертификат пары: два портрета, процент совпадения вкусов, общие любимцы — свидетели.
     Печать — того края, если обе пары оттуда, иначе общая печать Рунтерры */
  const heartPath = new Path2D('M12 21.4 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.4Z');
  async function pairCertificate(d){
    await fontsReady();
    const W = 1080, H = 1350, [ia, ib] = await Promise.all([loadImg(d.a.champ), loadImg(d.b.champ)]);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'); bg(cx, W, H);
    cx.strokeStyle = C.gold; cx.lineWidth = 3; cx.strokeRect(36, 36, W - 72, H - 72);
    cx.strokeStyle = C.lo; cx.lineWidth = 1; cx.strokeRect(52, 52, W - 104, H - 104);
    [[52,52],[W-52,52],[52,H-52],[W-52,H-52]].forEach(([x,y]) => { cx.save(); cx.translate(x, y); cx.rotate(Math.PI / 4); cx.fillStyle = C.night; cx.fillRect(-12, -12, 24, 24); cx.strokeStyle = C.gold; cx.lineWidth = 2; cx.strokeRect(-12, -12, 24, 24); cx.restore(); });
    cx.textAlign = 'center';
    cx.fillStyle = C.gold; cx.font = `600 20px ${FU}`; cx.fillText('ПАРА ИЗ РУНТЕРРЫ', W / 2, 120);
    cx.fillStyle = C.hi; cx.font = `72px ${FD}`; cx.fillText('Сертификат', W / 2, 205);
    cx.font = `40px ${FD}`; cx.fillStyle = C.gold; cx.fillText('о совместимости двух сердец', W / 2, 255);
    cx.fillStyle = C.text;
    const line1 = `Настоящим удостоверяется, что ${d.a.name} и ${d.b.name}`;
    fitText(cx, line1, W - 200, 24, FU); cx.fillText(line1, W / 2, 320);
    cx.font = `24px ${FU}`; cx.fillText('прошли честный турнир сердец, и вот их пары:', W / 2, 356);
    /* портреты */
    const pw = 290, ph = 474, py = 430, xs = [110, W - 110 - pw];
    [[d.a, ia, xs[0]], [d.b, ib, xs[1]]].forEach(([p, im, x]) => {
      const c = BY[p.champ], mid = x + pw / 2;
      cx.fillStyle = C.muted; fitText(cx, p.name, pw, 24, FU, '500'); cx.fillText(p.name, mid, py - 18);
      cx.save(); cx.shadowColor = 'rgba(232,102,138,.45)'; cx.shadowBlur = 40; cx.fillStyle = C.deep; cx.fillRect(x, py, pw, ph); cx.restore();
      cover(cx, im, x, py, pw, ph, .28);
      cx.strokeStyle = C.gold; cx.lineWidth = 3; cx.strokeRect(x, py, pw, ph);
      const gr = cx.createLinearGradient(0, py + ph - 130, 0, py + ph); gr.addColorStop(0, 'rgba(9,14,21,0)'); gr.addColorStop(1, 'rgba(9,14,21,.9)');
      cx.fillStyle = gr; cx.fillRect(x, py + ph - 130, pw, 130);
      cx.fillStyle = C.hi; fitText(cx, c.name.toUpperCase(), pw + 30, 50, FD); cx.fillText(c.name.toUpperCase(), mid, py + ph + 60);
      cx.fillStyle = C.gold; fitText(cx, c.title, pw + 40, 24, FD); cx.fillText(c.title, mid, py + ph + 98);
    });
    /* середина: сердце и процент */
    const mx = W / 2, my = py + ph / 2;
    cx.save(); cx.translate(mx - 30, my - 150); cx.scale(2.5, 2.5);
    cx.shadowColor = 'rgba(232,102,138,.6)'; cx.shadowBlur = 16; cx.fillStyle = C.rose; cx.fill(heartPath); cx.restore();
    cx.fillStyle = C.hi; cx.font = `112px ${FD}`; cx.fillText(`${d.percent}%`, mx, my + 20);
    cx.fillStyle = C.text; cx.font = `22px ${FU}`; cx.fillText('совпадение вкусов', mx, my + 60);
    if (d.same){ cx.fillStyle = C.rose; cx.font = `22px ${FU}`; cx.fillText('одна пара на двоих', mx, my + 94); }
    if (d.witnesses.length){
      cx.fillStyle = C.muted; cx.font = `22px ${FU}`;
      cx.fillText(`Свидетели: ${d.witnesses.map(id => BY[id].name).join(' и ')}`, W / 2, py + ph + 150);
    }
    /* печать и регистратор */
    const ra = (PROFILE[d.a.champ] || ['rt'])[0], rb = (PROFILE[d.b.champ] || ['rt'])[0];
    const region = ra === rb ? ra : 'rt', seal = SEAL[region] || SEAL.rt;
    const stamp = await drawSeal(region, d.a.champ + d.b.champ);
    cx.save(); cx.translate(W - 190, H - 188); cx.rotate(-.17);
    cx.globalAlpha = .92; cx.shadowColor = seal.ink + '55'; cx.shadowBlur = 14;
    cx.drawImage(stamp, -stamp.width / 2, -stamp.height / 2); cx.restore();
    const reg = seal.reg.find(id => id !== d.a.champ && id !== d.b.champ && BY[id]) || seal.reg[0];
    cx.textAlign = 'left'; cx.fillStyle = C.muted; cx.font = `20px ${FU}`;
    const dt = new Date();
    cx.fillText(`Дата: ${dt.toLocaleDateString('ru-RU', {day:'numeric', month:'long', year:'numeric'})}`, 100, H - 150);
    fitText(cx, `Регистратор: ${BY[reg].name}, ${BY[reg].title}`, 640, 20, FU);
    cx.fillText(`Регистратор: ${BY[reg].name}, ${BY[reg].title}`, 100, H - 118);
    cx.font = `15px ${FU}`; cx.fillText('Фан-тест по League of Legends. Не одобрен Riot Games.', 100, H - 78);
    return cv;
  }

  async function save(cv, name){
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const file = new File([blob], name, {type:'image/png'});
    if (navigator.canShare && navigator.canShare({files:[file]}) && matchMedia('(hover: none)').matches){
      try { await navigator.share({files:[file], title:'Пара из Рунтерры'}); return 'shared'; } catch(e){ if (e && e.name === 'AbortError') return 'cancel'; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'saved';
  }
  return {tierList, certificate, pairCertificate, save};
})();

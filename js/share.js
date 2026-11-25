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
    cx.fillStyle = C.gold; cx.font = `600 20px ${FU}`; cx.fillText('ПАРА ИЗ РУНТЕРРЫ', W / 2, 120);
    cx.fillStyle = C.hi; cx.font = `72px ${FD}`; cx.fillText('Сертификат', W / 2, 205);
    cx.font = `40px ${FD}`; cx.fillStyle = C.gold; cx.fillText('о совместимости сердец', W / 2, 255);
    cx.fillStyle = C.text; cx.font = `24px ${FU}`;
    const who = (person || '').trim() || 'предъявителя сего';
    fitText(cx, `Настоящим удостоверяется, что сердце ${who}`, W - 200, 24, FU);
    cx.fillText(`Настоящим удостоверяется, что сердце ${who}`, W / 2, 320);
    cx.font = `24px ${FU}`; cx.fillText('по итогам честного турнира отдано', W / 2, 356);
    /* портрет */
    const pw = 330, ph = 540, px = W / 2 - pw / 2, py = 392;
    cx.save(); cx.shadowColor = 'rgba(232,102,138,.5)'; cx.shadowBlur = 50; cx.fillStyle = C.deep; cx.fillRect(px, py, pw, ph); cx.restore();
    cover(cx, im, px, py, pw, ph, .3);
    cx.strokeStyle = C.gold; cx.lineWidth = 3; cx.strokeRect(px, py, pw, ph);
    const gr = cx.createLinearGradient(0, py + ph - 160, 0, py + ph); gr.addColorStop(0, 'rgba(9,14,21,0)'); gr.addColorStop(1, 'rgba(9,14,21,.92)');
    cx.fillStyle = gr; cx.fillRect(px, py + ph - 160, pw, 160);
    cx.fillStyle = C.hi; fitText(cx, champ.name.toUpperCase(), W - 160, 92, FD); cx.fillText(champ.name.toUpperCase(), W / 2, py + ph + 96);
    cx.fillStyle = C.gold; cx.font = `30px ${FD}`; cx.fillText(champ.title, W / 2, py + ph + 140);
    /* «совместимость» — по доле побед победителя */
    const st = m.st[m.champ], wins = st.beat.length, losses = st.lost.length;
    const pct = Math.min(100, Math.round(90 + 10 * wins / Math.max(1, wins + losses)));
    cx.fillStyle = C.text; cx.font = `24px ${FU}`;
    cx.fillText(`Совместимость: ${pct}% · побед в дуэлях: ${wins}`, W / 2, py + ph + 192);
    const wit = [m.order[1], m.order[2]].filter(Boolean).map(id => BY[id].name).join(' и ');
    cx.fillStyle = C.muted; cx.font = `22px ${FU}`;
    cx.fillText(`Свидетели: ${wit}`, W / 2, py + ph + 230);
    /* печать */
    const sx = W - 190, sy = H - 190;
    cx.save(); cx.translate(sx, sy); cx.rotate(-.18);
    cx.strokeStyle = C.rose; cx.lineWidth = 4; cx.beginPath(); cx.arc(0, 0, 78, 0, 6.28); cx.stroke();
    cx.lineWidth = 1.5; cx.beginPath(); cx.arc(0, 0, 66, 0, 6.28); cx.stroke();
    cx.fillStyle = C.rose; cx.font = `600 15px ${FU}`; cx.fillText('ЗАВЕРЕНО', 0, -18); cx.fillText('ПЕЧАТЬЮ', 0, 2); cx.fillText('ТАРГОНА', 0, 22);
    cx.restore();
    cx.textAlign = 'left'; cx.fillStyle = C.muted; cx.font = `20px ${FU}`;
    const d = new Date();
    cx.fillText(`Дата: ${d.toLocaleDateString('ru-RU', {day:'numeric', month:'long', year:'numeric'})}`, 100, H - 150);
    cx.fillText('Регистратор: Сорака, Звёздное дитя', 100, H - 118);
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
  return {tierList, certificate, save};
})();

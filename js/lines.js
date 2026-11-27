/* Пара из Рунтерры: турниры по линейкам образов.
   Образы одной линейки (K/DA, Духи цветения, Ковен…) сходятся в турнире по правилам «Подробно»:
   отбор, битвы за место, спорные места и плей-офф с двойным выбыванием. Арты берутся из Data Dragon. */

const LN_KEY = 'rp-lines';
const LN_OUR = {Kindred:['KindredWolf', 'KindredLamb']};   // у Волка и Овечки образы общие — это образы Киндред
const lnOur = dd => LN_OUR[dd] || [dd];
const LN_SKIN = {};
LINES.forEach(([, , , list]) => list.forEach(([dd, n, nm]) => { LN_SKIN[dd + '_' + n] = {dd, n, name:nm}; }));
const lnLine = k => LINES.find(l => l[0] === k);
const lnArt = id => `${DD}/cdn/img/champion/loading/${id}.jpg`;
const lnName = id => LN_SKIN[id] ? LN_SKIN[id].name : id;
const lnChamp = id => { const dd = LN_SKIN[id] ? LN_SKIN[id].dd : ''; return dd === 'Kindred' ? 'Киндред' : BY[dd] ? BY[dd].name : dd; };
const lnFace = (id, cls = '') => `<img class="${cls}" loading="lazy" alt="" src="${lnArt(id)}">`;
const LN_F = {face:lnFace, name:lnName};
const LN_TIERS = [['S','Любимые','--tS'], ['A','Очень нравятся','--tA'], ['B','Нравятся','--tB'], ['C','Так себе','--tC'], ['D','Не моё','--tD']];
const LN_PROMPTS = ['Какой образ тебе ближе?', 'Какой образ красивее?', 'В каком образе — на свидание?', 'Какой образ взять в игру?', 'Какой арт сильнее?', 'Какой образ лучше?'];
/* сколько дуэлей в среднем уходит на линейку такого размера в режиме «Подробно» (по прогонам движка) */
const LN_EST = [[8, 32], [10, 44], [13, 68], [15, 86], [20, 128], [25, 166], [31, 213], [37, 255], [45, 314], [55, 376], [66, 456], [75, 520]];
function lnEstimate(n){
  let i = 1; while (i < LN_EST.length - 1 && LN_EST[i][0] < n) i++;
  const [a, x] = LN_EST[i - 1], [b, y] = LN_EST[i];
  return Math.max(n - 1, Math.round(x + (y - x) * (n - a) / (b - a)));
}

/* ---------- хранилище: по одному турниру на линейку ---------- */
function lnLoad(){ const v = store.get(LN_KEY); return v && v.runs && typeof v.runs === 'object' ? v : {runs:{}}; }
function lnStore(st){ if (!TOOLS && !VIEW) store.set(LN_KEY, st); }
const lnValid = r => !!(r && r.cfg && r.cfg.v === ENGINE_VERSION && r.cfg.mode === 'deep' && Array.isArray(r.cfg.roster) && r.cfg.roster.length >= MIN_N &&
  r.cfg.roster.every(id => LN_SKIN[id]) && Array.isArray(r.dec) && r.dec.every(d => d === 0 || d === 1));
function lnRun(k){ const r = lnLoad().runs[k]; return lnValid(r) ? r : null; }
let LN = null;   // текущий турнир линейки: {k, cfg, dec}
function lnSave(){
  if (!LN) return;
  const st = lnLoad(); st.runs[LN.k] = {cfg:LN.cfg, dec:LN.dec, fin:LN.fin || null, statId:LN.statId || null}; st.last = LN.k;
  lnStore(st);
}
/* чьи образы участвуют: переключатель на экране линеек, запоминается */
const lnWhoSel = () => { const w = lnLoad().who; return w === 'm' || w === 'f' ? w : 'all'; };
function lnPool(k, who = lnWhoSel()){
  const L = lnLine(k); if (!L) return [];
  const ok = new Set(CH.filter(c => who === 'all' || c[3] === who).map(c => c[0]));
  return L[3].filter(([dd]) => lnOur(dd).some(id => ok.has(id))).map(([dd, n]) => dd + '_' + n);
}
const lnAll = k => lnLine(k)[3].map(([dd, n]) => dd + '_' + n);
function lnWho(ids){
  const names = [...new Set(ids.map(lnChamp))];
  return names.length > 6 ? names.slice(0, 5).join(', ') + ` и ещё ${names.length - 5}` : names.slice(0, -1).join(', ') + (names.length > 1 ? ' и ' : '') + names[names.length - 1];
}
function lnStatus(k){
  const r = lnRun(k); if (!r) return null;
  const m = simulate(r.cfg, r.dec);
  return m.kind === 'done' ? {done:true, fav:m.champ, m} : {done:false, played:m.played, est:lnShownEst(m, r.cfg.roster.length)};
}
const lnShownEst = (m, n) => ['ub', 'lb', 'final'].includes(m.stage) ? m.est : Math.max(m.played + 1, Math.min(m.est, lnEstimate(n)));

/* ---------- главный экран ---------- */
function lnRenderCta(){
  const box = $('#lnCta'); if (!box) return;
  const pick = [], seen = new Set();
  ['kda', 'sb', 'hn'].forEach(k => { const L = lnLine(k); const s = L && L[3].find(([dd]) => !seen.has(dd)); if (s){ seen.add(s[0]); pick.push(s[0] + '_' + s[1]); } });
  const art = $('#lnCtaArt');
  if (!art.childElementCount) art.innerHTML = pick.map(id => lnFace(id)).join('');
  const st = lnLoad(), last = st.last && lnLine(st.last) ? lnStatus(st.last) : null, el = $('#lnLast');
  el.hidden = !last;
  if (last){
    const t = esc(lnLine(st.last)[1]);
    el.innerHTML = last.done ? `Последняя линейка — «${t}»: любимый образ <b>${esc(lnName(last.fav))}</b>.` : `Не закончена линейка «${t}»: позади ${last.played} из ≈${last.est} ${duelsOf(last.est)}.`;
  }
  $('#lnGo').textContent = last && !last.done ? 'Продолжить' : 'Выбрать линейку';
}
function lnCtaGo(){
  const st = lnLoad(), last = st.last && lnLine(st.last) ? lnStatus(st.last) : null;
  if (last && !last.done) return startLine(st.last);
  openLines();
}

/* ---------- экран выбора линейки ---------- */
function openLines(){
  const who = lnWhoSel();
  document.querySelectorAll('input[name=lnWho]').forEach(x => { x.checked = x.value === who; });
  ['all', 'm', 'f'].forEach(w => { const n = LINES.filter(([k]) => lnPool(k, w).length >= MIN_N).length; $('#lnc-' + w).textContent = `${n} ${plural(n, 'линейка', 'линейки', 'линеек')}`; });
  renderLines();
  show('scr-lines');
}
function lnSetWho(w){ const st = lnLoad(); st.who = w; lnStore(st); renderLines(); }
function renderLines(){
  $('#lnList').innerHTML = LINE_GROUPS.map(([g, gt]) => {
    const cards = LINES.filter(l => l[2] === g).map(([k, t]) => {
      const st = lnStatus(k), r = st && lnRun(k), ids = r ? r.cfg.roster : lnPool(k), n = ids.length, ok = !!r || n >= MIN_N, base = n ? ids : lnAll(k);
      /* на обложку — образы из начала, середины и конца линейки: так в общей линейке видны разные группы */
      const L3 = base.length, spread = [L3 / 6, L3 / 2, L3 * 5 / 6].map(i => base[Math.floor(i)]);
      const show = (st && st.done ? [st.fav] : []).concat(spread, base), faces = [], used = new Set();
      for (const id of show){ const dd = LN_SKIN[id].dd; if (!used.has(dd)){ used.add(dd); faces.push(id); } if (faces.length === 3) break; }
      const est = Math.min(estimate(n, 'deep'), lnEstimate(n));
      const meta = !ok ? (n ? `Только ${n} ${plural(n, 'образ', 'образа', 'образов')} — мало для турнира` : 'Здесь таких образов нет') : `${n} ${plural(n, 'образ', 'образа', 'образов')} · ≈${est} ${duelsWord(est)} · ~${minutes(est)} мин`;
      const state = !st ? '' : st.done ? `<span class="ln-st done">Любимый: ${esc(lnName(st.fav))}</span>` : `<span class="ln-st">Позади ${st.played} из ≈${st.est} ${duelsOf(st.est)}</span>`;
      return `<button type="button" class="ln-card${st && st.done ? ' is-done' : ''}" data-k="${k}" ${ok ? '' : 'disabled'}>
        <span class="ln-art" aria-hidden="true">${faces.map(id => lnFace(id)).join('')}</span>
        <span class="ln-txt"><b>${esc(t)}</b><small class="ln-who">${esc(lnWho(base))}</small>
        <small class="ln-n">${meta}</small>${state}</span></button>`;
    }).join('');
    return `<section class="ln-group" aria-label="${esc(gt)}"><h3>${esc(gt)}</h3><div class="ln-grid">${cards}</div></section>`;
  }).join('');
}

/* ---------- турнир ---------- */
async function startLine(k, fresh){
  if (ui.lnBusy) return;
  const L = lnLine(k); if (!L) return;
  const r = lnRun(k);
  if (r && !fresh){
    LN = {k, cfg:r.cfg, dec:r.dec.slice(), fin:r.fin || null, statId:r.statId || null};
    const m = simulate(LN.cfg, LN.dec);
    if (m.kind === 'done') return lnResult(m);
    return lnEnter();
  }
  const ids = lnPool(k);
  if (ids.length < MIN_N) return toast('В этой линейке мало таких образов для турнира');
  ui.lnBusy = true;
  toast(`Загружаем образы: ${ids.length}…`, 15000);
  const ok = await Promise.all(ids.map(id => new Promise(res => {
    const im = new Image(), t = setTimeout(() => res(false), 12000);
    im.onload = () => { clearTimeout(t); res(true); }; im.onerror = () => { clearTimeout(t); res(false); };
    im.src = lnArt(id);
  })));
  ui.lnBusy = false;
  $('#toast').classList.remove('on');
  const good = ids.filter((id, i) => ok[i]);
  if (!good.length) return toast('Арты образов не загрузились — нужен интернет');
  if (good.length < MIN_N) return toast(`Загрузилось только ${good.length} ${plural(good.length, 'образ', 'образа', 'образов')} — для турнира нужно хотя бы ${MIN_N}. Проверь интернет`);
  LN = {k, cfg:{v:ENGINE_VERSION, mode:'deep', seed:(Math.random() * 4294967296) >>> 0, roster:good, who:lnWhoSel()}, dec:[], fin:null, statId:null};
  lnSave();
  lnEnter();
}
function lnEnter(){
  lnSave();   // запоминаем, какая линейка открыта последней
  ui.mode = 'line'; ui.lock = false; ui.introKey = ''; ui.toastKey = '';
  show('scr-duel'); lnGo();
}
function lnGo(){
  if (!LN){ ui.mode = 'play'; return openLines(); }
  const m = simulate(LN.cfg, LN.dec);
  ui.cur = m;
  if (m.kind === 'done') return lnResult(m);
  const key = m.label + ':' + m.k;
  if (m.level && m.k === 0 && ui.introKey !== key){
    ui.introKey = key;
    const title = m.stage === 'final' ? 'Гранд-финал' : m.stage === 'lb' ? 'Финал сетки второго шанса' : m.label.includes('Финал') ? 'Финал сетки победителей' : m.label.includes('четвертьфинал') ? 'Четвертьфинал' : 'Полуфинал';
    const sub = m.stage === 'final' ? `${lnName(m.a)} или ${lnName(m.b)}` : m.of > 1 ? `${m.of} ${duelsWord(m.of)} · ${m.stage === 'ub' ? 'сетка победителей' : 'сетка второго шанса'}` : 'Одна дуэль решит, кто пройдёт дальше';
    lnDuel(m, true);
    FX.setLevel(m.level);
    FX.intro(m.level, title, sub, `Линейка «${lnLine(LN.k)[1]}»`);
    return;
  }
  lnDuel(m);
}
function lnCard(i, id){
  const im = $('#img' + i), nm = lnName(id);
  im.classList.remove('broken'); im.src = lnArt(id); im.alt = nm;
  $('#nm' + i).textContent = nm;
  $('#tt' + i).textContent = lnChamp(id);
  $('#ds' + i).textContent = '';
  const card = $('#card' + i); card.className = 'pick skin'; card.style.transform = '';
  card.setAttribute('aria-label', `Выбрать образ: ${nm}`);
  fitName($('#nm' + i));
}
function lnDuel(m, silent){
  if (ui.screen !== 'scr-duel') show('scr-duel');
  const n = LN.cfg.roster.length, est = lnShownEst(m, n);
  $('#stage').textContent = `${lnLine(LN.k)[1]} · ${stageLabel(m)}`;
  $('#counter').textContent = (m.of > 1 ? `Дуэль ${m.k + 1} из ${m.of}` : 'Решающая дуэль') + ` · всего ${m.played} из ≈${est}`;
  $('#barFill').style.width = Math.min(99.5, 100 * m.played / est).toFixed(2) + '%';
  /* в турнирах по музыкальным группам у пар образов свои фразы */
  const p = $('#prompt'), sp = $('#subprompt'), egg = lnEgg(m.a, m.b), final = m.stage === 'final';
  p.className = 'prompt' + (final ? ' final' : egg ? ' egg' : '');
  if (final){ p.textContent = 'Гранд-финал. Какой образ лучший?'; sp.hidden = !egg; sp.textContent = egg; }
  else { p.textContent = egg || ((m.stage === 'lb' && m.last) ? 'Какой образ выйдет в гранд-финал?' : LN_PROMPTS[m.played % LN_PROMPTS.length]); sp.hidden = true; }
  lnCard(0, m.a); lnCard(1, m.b);
  const ar = $('#arena'); ar.className = 'arena' + (m.level ? ' lv' + m.level : ''); void ar.offsetWidth; ar.classList.add('enter');
  FX.setLevel(m.level || 0);
  $('#undoBtn').hidden = false; $('#undoBtn').disabled = !LN.dec.length;
  $('#watchBar').hidden = true; $('#partnerChip').hidden = true;
  $('#bracketBtn').hidden = !['ub', 'lb', 'final'].includes(m.stage);
  $('#reveal').textContent = ''; $('#reveal').className = 'reveal';
  if (!silent){
    const tk = 'ln:' + m.stage + ':' + (m.round || m.label);
    if (m.k === 0 && ui.toastKey !== tk){
      ui.toastKey = tk;
      if (m.stage === 'swiss' && m.round > 1) toast(`Круг ${m.round}: теперь встречаются образы с похожим счётом`);
      else if (m.stage === 'battle' && m.round === 1) toast('Битвы за место: дальше дерутся только образы, чьё место ещё не ясно');
      else if (m.stage === 'dispute' && m.round === 1) toast('Спорные места: решаем, кто окажется выше границы тира');
      else if (m.stage === 'ub' && m.first) toast(`Плей-офф: ${m.P} ${plural(m.P, 'лучший образ', 'лучших образа', 'лучших образов')}, вылетают после второго поражения`, 4200);
      else if (m.stage === 'lb' && /раунд 1$/.test(m.label)) toast('Сетка второго шанса: проигравшие продолжают борьбу');
    }
  }
  /* следующие арты — заранее */
  [0, 1].forEach(d => { const x = simulate(LN.cfg, LN.dec.concat(d)); if (x.kind === 'duel'){ new Image().src = lnArt(x.a); new Image().src = lnArt(x.b); } });
}
function linePick(side){
  ui.lock = true; hideSwipeHint();
  const m = ui.cur, cards = [$('#card0'), $('#card1')];
  cards.forEach(c => c.style.transform = '');
  cards[side].classList.add('chosen'); cards[1 - side].classList.add('lost');
  Sound.pick(m.level);
  if (m.level) FX.burst(...cardCenter(side), m.level);
  const final = m.stage === 'final';
  if (final){ Sound.fanfare(); FX.celebrate(); }
  $('#undoBtn').disabled = false;
  ui.pickT = setTimeout(() => { ui.pickT = 0; LN.dec.push(side); lnSave(); ui.lock = false; if (ui.mode === 'line' && ui.screen === 'scr-duel') lnGo(); }, reduced ? 80 : final ? 1100 : m.level ? 520 : 340);
}
function lineUndo(){
  if (ui.pickT){ clearTimeout(ui.pickT); ui.pickT = 0; ui.lock = false; lnGo(); return; }
  if (ui.lock || !LN || !LN.dec.length) return;
  LN.dec.pop(); LN.fin = null; lnSave(); ui.introKey = '';
  lnGo();
}
function lnLeave(){
  clearTimeout(ui.pickT); ui.pickT = 0; ui.lock = false; ui.mode = 'play';
  openLines();
}

/* ---------- итог ---------- */
function lnTierRow(L, label, tok, ids, start){
  const row = document.createElement('div');
  row.className = 'tier';
  row.style.setProperty('--tc', `var(${tok})`);
  row.innerHTML = `<div class="tlab"><b>${L}</b><span>${label}</span></div><div class="tlist"></div>`;
  const list = row.querySelector('.tlist');
  ids.forEach((id, i) => {
    const d = document.createElement('button'); d.type = 'button'; d.className = 'th'; d.title = lnName(id);
    d.style.cssText = 'padding:0;border:0;background:none;text-align:left;color:inherit;font:inherit';
    d.innerHTML = `${lnFace(id)}<i>${start + i + 1}</i><span>${esc(lnChamp(id))}</span>`;
    d.addEventListener('click', () => openModal(`<div class="prof">${lnFace(id)}<div><p class="eyebrow">${start + i + 1}-е место</p><h3>${esc(lnName(id))}</h3><p class="muted">${esc(lnChamp(id))}</p></div></div>`));
    list.appendChild(d);
  });
  return row;
}
function lnResult(m){
  ui.mode = 'play'; ui.cur = m; FX.setLevel(0);
  const L = lnLine(LN.k), first = !LN.fin;
  if (first){ LN.fin = {fav:m.champ, at:Date.now()}; lnSave(); collDuels('ln:' + LN.cfg.seed, LN.dec.length); collLineDone(LN.k); }
  show('scr-lnres');
  if (first && !reduced){ const wn = $('#scr-lnres .winner'); wn.classList.remove('unveil'); void wn.offsetWidth; wn.classList.add('unveil'); }
  const n = m.order.length;
  $('#lnwEyebrow').textContent = `Любимый образ · линейка «${L[1]}»`;
  const im = $('#lnwImg'); im.src = lnArt(m.champ); im.alt = lnName(m.champ);
  $('#lnwName').textContent = lnName(m.champ);
  $('#lnwChamp').textContent = lnChamp(m.champ);
  const lost = [...new Set(m.st[m.champ].lost)];
  $('#lnwPath').textContent = `Лучший из ${n} ${plural(n, 'образа', 'образов', 'образов')}. ` +
    (lost.length ? `Уступал только ${lost.length === 1 ? 'одному образу' : 'этим образам'}: ${lost.slice(0, 3).map(lnName).join(', ')}${lost.length > 3 ? ' и другим' : ''}. ` : 'Не проиграл ни одной дуэли. ') +
    `Последний соперник в гранд-финале — ${lnName(m.runner)}.`;
  $('#lnPodium').innerHTML = [[1, '2-е место'], [2, '3-е место']].filter(([i]) => m.order[i]).map(([i, lab]) => `<div class="pod">${lnFace(m.order[i])}<div><small>${lab}</small><b>${esc(lnName(m.order[i]))}</b></div></div>`).join('');
  const t = $('#lnTiers'); t.innerHTML = '<h2>Тир-лист линейки</h2>';
  const sizes = tierSizesOf(m); let pos = 0;
  LN_TIERS.forEach(([T, label, tok], ti) => { t.appendChild(lnTierRow(T, label, tok, m.order.slice(pos, pos + sizes[ti]), pos)); pos += sizes[ti]; });
  lnRenderStats(m);
  $('#lnMethod').textContent = `Турнир по правилам «Подробно», ${m.total} ${duelsWord(m.total)}: ${m.R} ${plural(m.R, 'круг', 'круга', 'кругов')} отбора, битвы за место, спорные места и плей-офф с двойным выбыванием на ${m.P}. Первые ${m.P} места решены плей-офф, остальные стоят по рейтингу всех дуэлей с учётом силы соперников.`;
}

/* ---------- статистика линейки: у каждой своя, с основным турниром не смешивается ---------- */
async function lnRenderStats(m){
  const sec = $('#lnStatSec'), box = $('#lnStats'), run = LN;
  if (!Room.configured() || TOOLS || VIEW || !run){ sec.hidden = true; return; }
  sec.hidden = false; box.innerHTML = '<p class="muted">Считаем…</p>';
  const scope = 'line:' + run.k;
  try {
    if (!run.statId){ run.statId = newStatId(); lnSave(); }
    await Room.stats.submit({id:run.statId, scope, champ:m.champ, top:m.order.slice(0, 10), who:run.cfg.who || 'all', n:run.cfg.roster.length});
    const g = await Room.stats.get(m.champ, scope);
    if (ui.cur !== m) return;
    box.innerHTML = lnStatsHTML(m.champ, g);
  } catch(e){
    if (ui.cur === m) box.innerHTML = '<p class="muted">Статистика сейчас недоступна. Загляни позже.</p>';
  }
}
function lnStatsHTML(id, g){
  const total = +g.total || 0, mine = +g.mine || 0;
  const pc = n => { const v = total ? 100 * n / total : 0; return v > 0 && v < 1 ? '<1' : v.toLocaleString('ru-RU', {maximumFractionDigits: v < 10 ? 1 : 0}); };
  const note = '<p class="muted">Анонимно: только любимый образ и десятка лучших, без имён. У каждой линейки своя статистика, с основным турниром она не смешивается.</p>';
  if (!total) return `<div class="g-verdict"><h3>Пока пусто</h3><p>Эту линейку в статистике ещё никто не проходил.</p>${note}</div>`;
  const share = 100 * mine / total;
  const h = mine === 1 && total >= 5 ? 'Особый вкус' : share >= 25 ? 'Любимец публики' : share >= 10 ? 'Частый выбор' : 'Редкий выбор';
  const t = mine === 1 && total >= 5 ? `Этот образ любимый только у тебя из ${total} ${plural(total, 'игрока', 'игроков', 'игроков')}.` : `Любимый образ у ${pc(mine)}% прошедших линейку (${mine} из ${total}), ${g.rank}-е место.`;
  const list = (g.top || []).filter(r => LN_SKIN[r.id]).map(r => ({id:r.id, n:+r.n}));
  const max = Math.max(1, ...list.map(r => r.n));
  const row = (r, place) => `<div class="g-row ${r.id === id ? 'me' : ''}"><i>${place}</i>${lnFace(r.id)}<b>${esc(lnName(r.id))}</b><small>${pc(r.n)}%</small><div class="g-bar"><span style="width:${(100 * r.n / max).toFixed(1)}%"></span></div></div>`;
  let rows = list.map(r => row(r, 1 + list.filter(x => x.n > r.n).length)).join('');
  if (mine && !list.some(r => r.id === id)) rows += row({id, n:mine}, +g.rank);
  return `<div class="g-verdict"><h3>${h}</h3><p>${esc(t)}</p>${note}</div>
    <div class="g-board"><p class="muted" style="font-size:13px">Чаще всего любимые</p>${rows}</div>`;
}

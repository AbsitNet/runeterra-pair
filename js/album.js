/* Пара из Рунтерры: альбом пары.
   Комната помнит все законченные турниры обоих: лента пар, как меняются вкусы,
   общий топ за всё время и совпадение вкусов по месяцам.
   Каждый хранит свою половину альбома в своём состоянии комнаты; места турнира лежат
   компактной строкой номеров из состава CH (он дополняется только в конец, так что номера не меняются). */

const AL_MAX = 40, AL_Q = 20;
let AL = null;   // моя половина: {list:[{s:зерно, at, c:пара, o:места строкой, k:любимый образ}], q:[{id, at, p1, p2}]}
const alKey = () => 'rp-album-' + (sess ? sess.code + '-' + sess.slot : '');
const AL_MON = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const AL_MON_G = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

const alEnc = order => order.map(id => IDX[id].toString(36).padStart(2, '0')).join('');
function alDec(s){
  if (typeof s !== 'string' || s.length % 2 || s.length > 2 * CH.length || s.length < 2 * MIN_N) return null;
  const out = [], seen = new Set();
  for (let i = 0; i < s.length; i += 2){
    const c = CH[parseInt(s.slice(i, i + 2), 36)];
    if (!c || seen.has(c[0])) return null;
    seen.add(c[0]); out.push(c[0]);
  }
  return out;
}
function alLoad(){
  const a = store.get(alKey());
  AL = a && Array.isArray(a.list) && Array.isArray(a.q) ? a : {list:[], q:[]};
}
function alSave(){ if (AL && sess) store.set(alKey(), AL); }

/* турнир комнаты закончен (или переигран заново) — запись в альбоме следует за ним */
function alSync(T){
  if (!AL || !sess || TOOLS || VIEW || !T || !T.cfg) return false;
  const m = simulate(T.cfg, T.dec), i = AL.list.findIndex(e => e.s === T.cfg.seed);
  if (m.kind !== 'done'){
    if (i < 0) return false;
    AL.list.splice(i, 1); alSave(); return true;
  }
  const k = T.skins && T.skins.c === m.champ && Number.isInteger(T.skins.fav) ? T.skins.fav : null, o = alEnc(m.order), old = AL.list[i];
  if (old && old.c === m.champ && old.o === o && (old.k == null ? null : old.k) === k) return false;
  const e = {s:T.cfg.seed, at:old ? old.at : Date.now(), c:m.champ, o};
  if (k != null) e.k = k;
  if (i < 0) AL.list.push(e); else AL.list[i] = e;
  AL.list.sort((a, b) => a.at - b.at); AL.list = AL.list.slice(-AL_MAX);
  alSave(); return true;
}
/* записи альбома: свои и партнёра, проверенные и разобранные */
function alRead(list){
  return (Array.isArray(list) ? list.slice(-AL_MAX) : []).map(e => {
    const order = e && Number.isFinite(+e.at) && alDec(e.o);
    if (!order) return null;
    const k = Number.isInteger(e.k) && e.k > 0 && e.k < 1000 ? e.k : null;
    return {s:e.s >>> 0, at:+e.at, c:order[0], order, k};
  }).filter(Boolean).sort((a, b) => a.at - b.at);
}
const alMine = () => alRead(AL && AL.list);
function alTheirs(){ const pp = partner(), a = pp && pp.state && pp.state.album; return alRead(a && a.list); }
/* итоги викторин: каждая записана у обоих, повторы убираем по id */
function alQuizzes(){
  const pp = partner(), th = pp && pp.state && pp.state.album, out = {};
  [].concat(AL ? AL.q : [], th && Array.isArray(th.q) ? th.q.slice(-AL_Q) : []).forEach(q => {
    if (!q || typeof q.id !== 'string' || q.id.length > 16 || !Number.isFinite(+q.at)) return;
    out[q.id] = {id:q.id, at:+q.at, p1:num(q.p1), p2:num(q.p2)};
  });
  return Object.values(out).sort((a, b) => a.at - b.at);
}
function alQuizDone(id, p1, p2){
  if (!AL || AL.q.some(q => q.id === id)) return;
  AL.q.push({id, at:Date.now(), p1, p2}); AL.q = AL.q.slice(-AL_Q);
  alSave(); pushState(true);
}
const alCount = () => alMine().length + alTheirs().length;

/* ---------- расчёты ---------- */
const alPct = order => { const n = order.length, p = {}; order.forEach((id, i) => p[id] = n > 1 ? i / (n - 1) : 0); return p; };
const alMonth = at => { const d = new Date(at); return d.getFullYear() * 12 + d.getMonth(); };
const alMonthName = k => { const t = AL_MON[k % 12]; return t[0].toUpperCase() + t.slice(1) + ' ' + Math.floor(k / 12); };
function alDay(at){
  const d = new Date(at), y = d.getFullYear();
  return `${d.getDate()} ${AL_MON_G[d.getMonth()]}${y !== new Date().getFullYear() ? ' ' + y : ''}`;
}
/* как сдвинулся вкус от первого турнира к последнему */
function alShift(list){
  const a = list[0].order, b = list[list.length - 1].order, pa = alPct(a), pb = alPct(b);
  const common = a.filter(id => pb[id] != null), moves = common.map(id => ({id, d:pa[id] - pb[id], from:a.indexOf(id) + 1, to:b.indexOf(id) + 1}));
  return {
    same:compareOrders(a, b).percent,
    up:moves.filter(x => x.d >= .15).sort((x, y) => y.d - x.d).slice(0, 3),
    down:moves.filter(x => x.d <= -.15).sort((x, y) => x.d - y.d).slice(0, 3)
  };
}
/* средние места за всё время: у кого из чемпионов они высоко у обоих */
function alAverage(list){
  const s = {}, pl = {}, c = {};
  list.forEach(e => e.order.forEach((id, i, o) => { s[id] = (s[id] || 0) + (o.length > 1 ? i / (o.length - 1) : 0); pl[id] = (pl[id] || 0) + i + 1; c[id] = (c[id] || 0) + 1; }));
  const out = {}; Object.keys(c).forEach(id => out[id] = {p:s[id] / c[id], place:Math.round(pl[id] / c[id])});
  return out;
}
function alShared(mine, theirs){
  const A = alAverage(mine), B = alAverage(theirs), ids = Object.keys(A).filter(id => B[id]);
  const score = id => (A[id].p + B[id].p) / 2;
  const sorted = ids.sort((x, y) => score(x) - score(y) || IDX[x] - IDX[y]);
  return {A, B, top:sorted.slice(0, 10), low:sorted.length >= 20 ? sorted.slice(-5).reverse() : []};
}
/* совпадение по месяцам: каждый турнир одного с каждым турниром другого за тот же месяц */
function alMonths(mine, theirs){
  const by = list => { const g = {}; list.forEach(e => (g[alMonth(e.at)] = g[alMonth(e.at)] || []).push(e)); return g; };
  const A = by(mine), B = by(theirs), out = [];
  Object.keys(A).filter(k => B[k]).map(Number).sort((x, y) => y - x).forEach(k => {
    const vals = [];
    A[k].forEach(a => B[k].forEach(b => { const c = compareOrders(a.order, b.order); if (c.n >= 3) vals.push(c.percent); }));
    if (vals.length) out.push({k, pct:Math.round(vals.reduce((t, v) => t + v, 0) / vals.length), n:vals.length});
  });
  return out;
}

/* ---------- экран ---------- */
const alImg = e => e.k ? `<img loading="lazy" alt="" src="${skinArt(e.c, e.k)}" onerror="this.onerror=null;this.src='${img(e.c)}'">` : face(e.c);
function openAlbum(){ show('scr-album'); renderAlbum(); }
function renderAlbum(){
  if (!sess) return;
  const pp = partner(), mine = alMine(), theirs = pp ? alTheirs() : [], qs = alQuizzes();
  const me = sess.name, th = pp ? pp.name : 'партнёр';
  const all = mine.length + theirs.length;
  const first = [].concat(mine, theirs).sort((a, b) => a.at - b.at)[0];
  $('#alSum').innerHTML = all
    ? `<b>${all}</b> ${plural(all, 'турнир', 'турнира', 'турниров')} в альбоме, первый — ${esc(alDay(first.at))}. Твоих: ${mine.length}${pp ? `, ${esc(th)}: ${theirs.length}` : ', партнёр ещё не пришёл'}${qs.length ? `. Викторин «Знаю тебя»: ${qs.length}` : ''}.`
    : 'Альбом пока пуст. Он заполняется сам: каждый законченный турнир в комнате — твой и партнёра — попадает сюда.';

  /* лента: свои слева, партнёра справа, от новых к старым */
  const ev = [];
  const tag = (list, i, other, otherName) => {
    const e = list[i];
    if (!i) return 'Первый турнир в альбоме';
    const times = list.slice(0, i + 1).filter(x => x.c === e.c).length;
    if (list[i - 1].c === e.c) return `Снова ${name(e.c)}: уже ${times}-й раз`;
    const near = other.filter(x => x.at <= e.at).pop();
    if (near && near.c === e.c) return otherName;
    return `Вместо: ${name(list[i - 1].c)}`;
  };
  mine.forEach((e, i) => ev.push({at:e.at, side:'me', e, t:tag(mine, i, theirs, 'Та же пара, что у партнёра')}));
  theirs.forEach((e, i) => ev.push({at:e.at, side:'th', e, t:tag(theirs, i, mine, 'Та же пара, что у тебя')}));
  qs.forEach(q => ev.push({at:q.at, side:'q', q}));
  ev.sort((a, b) => b.at - a.at);
  let h = '', mon = null;
  const mySlot = sess.slot;
  ev.forEach(x => {
    const k = alMonth(x.at);
    if (k !== mon){ mon = k; h += `<p class="al-mon"><span>${alMonthName(k)}</span></p>`; }
    if (x.side === 'q'){
      const my = mySlot === 1 ? x.q.p1 : x.q.p2, their = mySlot === 1 ? x.q.p2 : x.q.p1;
      h += `<div class="al-q"><small>${esc(alDay(x.at))} · викторина «Знаю тебя»</small><b>${esc(me)} ${my} — ${their} ${esc(th)}</b></div>`;
      return;
    }
    const who = x.side === 'me' ? me : th;
    h += `<div class="al-ev al-${x.side}"><i class="al-dot" aria-hidden="true"></i><div class="al-card">${alImg(x.e)}<div><small>${esc(alDay(x.at))} · ${esc(who)}</small><b>${esc(name(x.e.c))}</b><span>${esc(x.t)}</span></div></div></div>`;
  });
  $('#alTime').innerHTML = h || `<p class="muted">Здесь появится лента пар. Закончи турнир в комнате — он станет первой записью.</p>`;
  $('#alTimeSec').querySelector('.sec-sub').hidden = !ev.length;

  /* совпадение по месяцам */
  const months = pp ? alMonths(mine, theirs) : [];
  $('#alMatchSec').hidden = !months.length;
  if (months.length){
    const avg = Math.round(months.reduce((t, m) => t + m.pct * m.n, 0) / months.reduce((t, m) => t + m.n, 0));
    $('#alMonths').innerHTML = months.map(m => `<div class="al-m"><span>${alMonthName(m.k)}</span><div class="al-bar"><i style="width:${m.pct}%"></i></div><b>${m.pct}%</b><small>${m.n} ${plural(m.n, 'пара', 'пары', 'пар')} турниров</small></div>`).join('')
      + (months.length > 1 ? `<p class="muted">За всё время в среднем — ${avg}%.</p>` : '');
  }

  /* общий топ */
  const sh = pp && mine.length && theirs.length ? alShared(mine, theirs) : null;
  $('#alTopSec').hidden = !(sh && sh.top.length);
  if (sh && sh.top.length){
    const row = id => `<div class="lrow al-r">${face(id)}<b>${esc(name(id))}</b><small>${esc(me)}: в среднем #${sh.A[id].place}<br>${esc(th)}: #${sh.B[id].place}</small></div>`;
    $('#alTop').innerHTML = sh.top.map(row).join('');
    $('#alLowWrap').hidden = !sh.low.length;
    $('#alLow').innerHTML = sh.low.map(row).join('');
  }

  /* как меняются вкусы */
  const shiftCard = (list, who) => {
    if (list.length < 2) return `<div class="dr-card al-sh"><h3>${esc(who)}</h3><p class="muted">${list.length ? 'Пока один турнир. Сыграй ещё — и станет видно, куда движется вкус.' : 'Ещё нет законченных турниров в комнате.'}</p></div>`;
    const s = alShift(list), chain = list.slice(-10);
    const mv = (x, up) => `<li>${face(x.id)}<span><b>${esc(name(x.id))}</b><small>${up ? '↑' : '↓'} #${x.from} → #${x.to}</small></span></li>`;
    return `<div class="dr-card al-sh"><h3>${esc(who)}</h3>
      <div class="al-chain" aria-label="Пары по порядку">${list.length > chain.length ? `<em>+${list.length - chain.length}</em>` : ''}${chain.map(e => `<span title="${esc(alDay(e.at))}: ${esc(name(e.c))}">${face(e.c)}</span>`).join('')}</div>
      <p>От первого турнира (${esc(alDay(list[0].at))}) к последнему (${esc(alDay(list[list.length - 1].at))}) вкус совпадает с собой на <b>${s.same}%</b>.</p>
      ${s.up.length ? `<p class="muted">Поднялись выше всех</p><ol class="dr-res">${s.up.map(x => mv(x, true)).join('')}</ol>` : ''}
      ${s.down.length ? `<p class="muted">Опустились ниже всех</p><ol class="dr-res">${s.down.map(x => mv(x, false)).join('')}</ol>` : ''}
      ${!s.up.length && !s.down.length ? '<p class="muted">Заметных перестановок нет: вкус держится.</p>' : ''}</div>`;
  };
  $('#alShiftSec').hidden = !all;
  $('#alShift').innerHTML = shiftCard(mine, 'Ты') + (pp ? shiftCard(theirs, th) : '');
}

/* Пара из Рунтерры: викторина «Знаю тебя».
   Вопросы друг о друге по итогам турниров: кого партнёр поставил выше, кто у него в антитопе, какой у него типаж.
   Оба отвечают одновременно, на вопрос — 20 секунд. Три раунда по пять вопросов, в финальном очки удваиваются.
   Вопросы о каждом считаются одинаково на обоих устройствах: из id викторины и рейтинга,
   который игрок вложил в своё состояние, когда позвал или присоединился. */

const QZ_T = 20, QZ_PER = 5, QZ_N = 15, QZ_NEXT = 10;
const QZ_ROUNDS = [{t:'Разминка', x:1}, {t:'Поглубже', x:1}, {t:'Финальный раунд', x:2}];
const QZ_PLAN = [['vs', 'top', 'arch', 'vs', 'anti'], ['second', 'vs', 'place', 'region', 'hist'], ['vs', 'anti', 'place', 'top', 'third']];
let QZ = null;   // моя викторина: {id, host, at, o:мой рейтинг строкой, h:[прошлые пары], a:[номер ответа или -1]}
const qzKey = () => 'rp-quiz-' + (sess ? sess.code + '-' + sess.slot : '');
const qzOf = p => {
  const q = p && p.state && p.state.quiz;
  return q && typeof q.id === 'string' && q.id.length <= 16 && (q.host === 1 || q.host === 2) && Array.isArray(q.a) && alDec(q.o) ? q : null;
};
const qzAns = a => a.slice(0, QZ_N).map(v => Number.isInteger(v) && v >= -1 && v < 4 ? v : -1);
function qzSave(){ store.set(qzKey(), QZ); pushState(true); }
function qzHash(s){ let h = 2166136261; for (const ch of s){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function qzShuffle(a, r){ for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function quizStatus(){
  const pp = partner(), th = qzOf(pp);
  if (!pp) return {state:'none'};
  if (QZ && th && th.id === QZ.id) return {state:'on', pp, th};
  if (th && th.host === pp.slot && (!QZ || QZ.id !== th.id) && store.get('rp-quiz-no') !== th.id && !th.a.length) return {state:'invited', pp, th};
  if (QZ && QZ.host === sess.slot && !(th && th.id === QZ.id)) return {state:'waiting', pp};
  return {state:'none', pp};
}
/* для викторины у обоих должен быть хотя бы один законченный турнир в комнате */
const quizReady = () => alMine().length > 0 && alTheirs().length > 0;

/* ---------- вопросы ---------- */
const qzWho = (lo, hi) => lo === hi ? `${lo}-е место` : `места ${lo}–${hi}`;
function qzQuestions(id, slot, who, q){
  const O = alDec(q.o), n = O.length, r = mulberry32(qzHash(id + ':' + slot)), W = who;
  const hist = (Array.isArray(q.h) ? q.h : []).filter(x => BY[x]).slice(0, 6);
  const pos = {}; O.forEach((x, i) => pos[x] = i);
  const used = new Set([O[0]]), vsUsed = new Set();
  const plan = qzShuffle(QZ_PLAN[0].slice(), mulberry32(qzHash(id + ':p0')))
    .concat(qzShuffle(QZ_PLAN[1].slice(), mulberry32(qzHash(id + ':p1'))), qzShuffle(QZ_PLAN[2].slice(), mulberry32(qzHash(id + ':p2'))));
  /* правильный ответ — не тот, что уже был верным в вопросе того же вида, и по возможности тот, кого ещё не было среди вариантов */
  const right = {};
  const pickOne = (arr, type) => {
    const ok = arr.filter(x => !(right[type] && right[type].has(x))), fresh = ok.filter(x => !used.has(x)), from = fresh.length ? fresh : ok;
    return from.length ? from[Math.floor(r() * from.length)] : null;
  };
  const four = (right, wrong) => {
    const d = qzShuffle([...new Set(wrong.filter(x => x !== right))], r).slice(0, 3);
    if (!right || d.length < 3) return null;
    const opts = qzShuffle([right, ...d], r);
    return {opts, ans:opts.indexOf(right)};
  };
  const champs = (o, text, sub) => o && {kind:'c', text, sub, opts:o.opts.map(c => ({c})), ans:o.ans};
  const gen = {
    vs(d, loose){
      const gap = loose ? 1 : Math.max(1, Math.round(n * [.35, .2, .08][d]));
      for (let t = 0; t < 60; t++){
        const a = loose ? O[1 + Math.floor(r() * (n - 1))] : pickOne(O.slice(1), 'vs'), b = O[1 + Math.floor(r() * (n - 1))];
        if (!a || a === b || Math.abs(pos[a] - pos[b]) < gap || (!loose && vsUsed.has([a, b].sort().join('|')))) continue;
        vsUsed.add([a, b].sort().join('|'));
        const opts = r() < .5 ? [a, b] : [b, a];
        return {kind:'c', text:`Кого ${W} поставил(а) выше?`, sub:'По последнему турниру', opts:opts.map(c => ({c})), ans:pos[opts[0]] < pos[opts[1]] ? 0 : 1, two:true};
      }
      return null;
    },
    top(){
      const K = n >= 30 ? 5 : 3;
      return champs(four(pickOne(O.slice(1, K), 'top'), O.slice(Math.ceil(n / 2))), `${W}: кто из них в топ-${K}?`, 'Саму пару в варианты не берём — её ты и так знаешь');
    },
    anti(){
      const K = n >= 30 ? 5 : 2;
      return champs(four(pickOne(O.slice(-K), 'anti'), O.slice(1, Math.ceil(n / 2))), `${W}: кто из них в антитопе?`, `Один из ${K === 5 ? 'пяти' : 'двух'} последних в списке`);
    },
    second(){
      return champs(four(O[1], O.slice(2, Math.max(6, Math.round(n * .25)))), `${W}: кто на втором месте?`, `Сразу после пары — серебро турнира`);
    },
    third(){
      return champs(four(O[2], O.slice(3, Math.max(7, Math.round(n * .25)))), `${W}: кто на третьем месте?`, 'Бронза турнира');
    },
    place(){
      const x = pickOne(O.slice(1), 'place'); if (!x) return null;
      const cuts = n >= 24 ? [.15, .4, .7] : [1 / 3, 2 / 3], b = [2];
      cuts.forEach(f => b.push(Math.max(b[b.length - 1] + 1, Math.round(n * f) + 1)));
      b.push(n + 1);
      if (b.some((v, i) => i && v <= b[i - 1]) || b[b.length - 2] > n) return null;
      const ranges = b.slice(0, -1).map((lo, i) => [lo, b[i + 1] - 1]), p = pos[x] + 1;
      return {kind:'t', text:`${W}: на каком месте ${name(x)}?`, sub:`По последнему турниру, всего мест: ${n}`, face:x,
        opts:ranges.map(([lo, hi]) => ({t:qzWho(lo, hi)})), ans:ranges.findIndex(([lo, hi]) => p >= lo && p <= hi)};
    },
    hist(){
      if (!hist.length) return null;
      const right = hist[0], wrong = [O[0]].concat(O.slice(1, 20)).filter(x => !hist.includes(x));
      return champs(four(right, wrong), `${W}: кто был парой в прошлом турнире?`, 'Тем, что был до последнего');
    },
    region(){
      const cnt = {}; O.slice(0, 10).forEach(x => { const k = PROFILE[x][0]; if (k !== 'rt') cnt[k] = (cnt[k] || 0) + 1; });
      const ks = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
      if (!ks.length || cnt[ks[0]] < 3 || cnt[ks[1]] === cnt[ks[0]]) return null;
      const o = four(ks[0], Object.keys(REGIONS).filter(k => k !== 'rt' && (cnt[k] || 0) < cnt[ks[0]]));
      return o && {kind:'t', text:`${W}: откуда родом больше всего любимцев?`, sub:'Среди первых десяти мест', opts:o.opts.map(k => ({t:REGIONS[k][0]})), ans:o.ans};
    },
    arch(){
      let pf; try { pf = profileOf(O); } catch(e){ return null; }
      if (!pf || !ARCH[pf.arch]) return null;
      const o = four(pf.arch, Object.keys(ARCH).filter(k => k !== pf.archSecond));
      return o && {kind:'t', text:`${W}: какой типаж?`, sub:'Тот, что показали итоги последнего турнира', opts:o.opts.map(k => ({t:ARCH[k][0]})), ans:o.ans};
    }
  };
  const out = [];
  plan.forEach((type, k) => {
    const d = Math.floor(k / QZ_PER);
    const make = (g, loose) => { const q = gen[g](d, loose); if (q) q.type = g; return q; };
    const q = make(type) || make('vs') || make('place') || make('vs', true);
    q.opts.forEach(o => { if (o.c) used.add(o.c); });
    if (q.face) used.add(q.face);
    (right[q.type] = right[q.type] || new Set()).add(q.face || q.opts[q.ans].c || q.opts[q.ans].t);
    q.x = QZ_ROUNDS[d].x;
    out.push(q);
  });
  return out;
}
/* ответ текстом: для итогов и разбора */
const qzOptText = o => o.c ? name(o.c) : o.t;
/* вопрос целиком, с вариантами, если их всего два: для разбора и итогов */
const qzAsk = q => q.two ? `${q.text.slice(0, -1)}: ${q.opts.map(qzOptText).join(' или ')}?` : q.text;
const qzScore = (qs, a) => a.reduce((t, v, k) => t + (qs[k] && v === qs[k].ans ? qs[k].x : 0), 0);
const qzMemo = {key:'', val:null};
function quizCalc(){
  const st = quizStatus(); if (st.state !== 'on') return null;
  const pp = st.pp, th = st.th, key = [QZ.id, th.o, QZ.o, (th.h || []).join(), (QZ.h || []).join(), pp.name, sess.name].join(':');
  if (qzMemo.key !== key){
    qzMemo.key = key;
    qzMemo.val = {mineQ:qzQuestions(QZ.id, pp.slot, pp.name, th), theirQ:qzQuestions(QZ.id, sess.slot, sess.name, QZ)};
  }
  const my = qzAns(QZ.a), their = qzAns(th.a), {mineQ, theirQ} = qzMemo.val;
  return {pp, th, mineQ, theirQ, my, their, myPts:qzScore(mineQ, my), thPts:qzScore(theirQ, their), done:my.length >= QZ_N && their.length >= QZ_N};
}

/* ---------- приглашение ---------- */
function qzMine(){
  const list = alMine(); if (!list.length) return null;
  return {o:alEnc(list[list.length - 1].order), h:list.slice(0, -1).reverse().map(e => e.c).slice(0, 6)};
}
function quizSetup(){
  const pp = partner(); if (!pp) return toast('Сначала дождись партнёра в комнате');
  if (!quizReady()) return toast('Викторина откроется, когда у обоих будет законченный турнир в комнате');
  openModal(`<p class="eyebrow">Вдвоём</p><h2>Викторина «Знаю тебя»</h2>
    <p style="margin-top:12px">Вопросы друг о друге по вашим турнирам: кого ${esc(pp.name)} поставил(а) выше, кто в антитопе, какой у него (неё) типаж. А ${esc(pp.name)} в это же время отвечает на вопросы о тебе.</p>
    <p style="margin-top:8px">Три раунда по ${QZ_PER} вопросов, на каждый — ${QZ_T} секунд. В финальном раунде очки удваиваются. Отвечаете одновременно, после каждого вопроса видно, что ответил партнёр о тебе.</p>
    <div class="res-actions" style="margin-top:16px"><button class="btn primary" type="button" id="qzCreate">Позвать: ${esc(pp.name)}</button></div>`);
  $('#qzCreate').addEventListener('click', quizCreate);
}
function quizCreate(){
  const me = qzMine(); if (!me) return;
  const id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 12);
  QZ = {id, host:sess.slot, at:Date.now(), o:me.o, h:me.h, a:[]};
  store.del('rp-quiz-no'); qzSave(); closeModal();
  show('scr-room'); renderRoom();
  toast('Приглашение отправлено. Викторина начнётся, когда партнёр присоединится');
}
function quizJoin(){
  const st = quizStatus(), me = qzMine(); if (st.state !== 'invited') return;
  if (!me) return toast('Сначала закончи свой турнир в комнате: вопросы о тебе берутся из него');
  QZ = {id:st.th.id, host:st.th.host, at:Date.now(), o:me.o, h:me.h, a:[]};
  qzSave(); openQuiz();
}
function quizDecline(){
  const st = quizStatus(); if (st.state !== 'invited') return;
  store.set('rp-quiz-no', st.th.id); renderRoom();
}
function quizCancel(){
  if (QZ && QZ.host !== sess.slot) store.set('rp-quiz-no', QZ.id);
  QZ = null; store.del(qzKey()); pushState(true);
  clearInterval(ui.qzTick); clearTimeout(ui.qzPoll);
  if (ui.screen === 'scr-quiz') show('scr-room');
  renderRoom();
}

/* ---------- экран викторины ---------- */
function openQuiz(){
  if (quizStatus().state !== 'on'){ show('scr-room'); return renderRoom(); }
  if (ui.qzId !== QZ.id){ ui.qzId = QZ.id; ui.qzAck = QZ.a.length - 2; ui.qzRound = -1; ui.qzQ = ''; }
  show('scr-quiz'); renderQuiz();
}
const qzPts = n => `${n} ${plural(n, 'очко', 'очка', 'очков')}`;
function qzOpts(q, pick, reveal, mine){
  return `<div class="qz-opts ${q.two ? 'two' : ''} ${q.kind === 't' ? 'txt' : ''}">${q.opts.map((o, i) => {
    const cls = [reveal && i === q.ans ? 'ok' : '', reveal && i === pick && i !== q.ans ? 'bad' : '', i === pick ? 'chose' : ''].join(' ');
    const inner = o.c ? `${face(o.c)}<b>${esc(name(o.c))}</b>` : `<b>${esc(o.t)}</b>`;
    return mine && !reveal && pick == null ? `<button type="button" class="qz-o ${cls}" data-i="${i}"><kbd>${i + 1}</kbd>${inner}</button>`
      : `<div class="qz-o ${cls}">${inner}${reveal && i === q.ans ? '<em>верно</em>' : reveal && i === pick ? '<em>ответ</em>' : ''}</div>`;
  }).join('')}</div>`;
}
/* что сейчас на экране: вопрос, ожидание партнёра, разбор ответа, заставка раунда или итоги */
function qzView(x){
  const n = x.my.length, tn = x.their.length;
  if (n > 0 && tn >= n && ui.qzAck < n - 1) return {v:'r', k:n - 1, shown:n};
  if (n > tn) return {v:'w', k:n - 1, shown:n - 1};
  if (n >= QZ_N) return {v:'f', k:QZ_N, shown:QZ_N};
  if (n % QZ_PER === 0 && ui.qzRound !== n) return {v:'i', k:n, shown:n};
  return {v:'q', k:n, shown:n};
}
const qzUpTo = (qs, a, m) => qzScore(qs.slice(0, m), a.slice(0, m));
function renderQuiz(){
  if (ui.screen !== 'scr-quiz') return;
  clearInterval(ui.qzTick); clearTimeout(ui.qzPoll); clearInterval(ui.qzCount);
  const x = quizCalc(), body = $('#qzBody'), timer = $('#qzTimer');
  timer.hidden = true;
  if (!x){
    ui.qzViewKey = 'x';
    $('#qzStage').textContent = 'Викторина «Знаю тебя»';
    $('#qzScore').innerHTML = '';
    body.innerHTML = `<h1 class="qz-q">Викторина прервана</h1><p class="muted">Партнёр вышел из неё. Позвать заново можно из комнаты.</p>
      <div class="res-actions"><button class="btn primary" type="button" id="qzOut">В комнату</button></div>`;
    $('#qzOut').addEventListener('click', quizCancel);
    return;
  }
  const vw = qzView(x), pp = x.pp;
  ui.qzViewKey = vw.v + vw.k;
  /* счёт — только по уже разобранным вопросам, чтобы не выдать ответ партнёра раньше времени */
  $('#qzScore').innerHTML = `<span>Ты <b>${qzUpTo(x.mineQ, x.my, vw.shown)}</b></span><span>${esc(pp.name)} <b>${qzUpTo(x.theirQ, x.their, vw.shown)}</b></span>`;
  if (vw.v === 'r') return qzReveal(x, vw.k);
  if (vw.v === 'w'){
    const q = x.mineQ[vw.k];
    $('#qzStage').textContent = qzStage(vw.k);
    body.innerHTML = `<h1 class="qz-q">${esc(q.text)}</h1>${q.face ? `<div class="qz-face">${face(q.face)}</div>` : ''}${qzOpts(q, x.my[vw.k], false, true)}
      <p class="qz-wait">${x.my[vw.k] < 0 ? 'Время вышло. ' : 'Ответ принят. '}Ждём ответа: ${esc(pp.name)}…</p>`;
    ui.qzPoll = setTimeout(() => { if (ui.screen === 'scr-quiz') fetchRoom(); }, 2500);
    return;
  }
  if (vw.v === 'f') return qzFinal(x);
  if (vw.v === 'i') return qzRoundIntro(x, vw.k);
  qzQuestion(x, vw.k);
}
const qzStage = k => { const d = Math.floor(k / QZ_PER), R = QZ_ROUNDS[d]; return `Раунд ${d + 1} из ${QZ_ROUNDS.length} · ${R.t}${R.x > 1 ? ' · очки ×' + R.x : ''} · вопрос ${k + 1} из ${QZ_N}`; };
function qzRoundIntro(x, n){
  const d = n / QZ_PER, R = QZ_ROUNDS[d], pp = x.pp;
  $('#qzStage').textContent = `Викторина «Знаю тебя» · раунд ${d + 1} из ${QZ_ROUNDS.length}`;
  let lead = '';
  if (!d) lead = `<p>Ты отвечаешь на вопросы о том, что выбирал(а) ${esc(pp.name)}, а ${esc(pp.name)} в это же время — о тебе. На каждый вопрос ${QZ_T} секунд; следующий откроется, когда ответите оба.</p>`;
  else {
    const mine = qzUpTo(x.mineQ, x.my, n) - qzUpTo(x.mineQ, x.my, n - QZ_PER), their = qzUpTo(x.theirQ, x.their, n) - qzUpTo(x.theirQ, x.their, n - QZ_PER);
    const a = qzUpTo(x.mineQ, x.my, n), b = qzUpTo(x.theirQ, x.their, n);
    lead = `<p>Раунд ${d} позади: у тебя ${qzPts(mine)}, ${esc(pp.name)}: ${qzPts(their)}. ${a > b ? 'Ты впереди.' : a < b ? `Впереди ${esc(pp.name)}.` : 'Пока ровно.'}</p>`;
  }
  $('#qzBody').innerHTML = `<h1 class="qz-q">${esc(R.t)}</h1>${lead}${R.x > 1 ? `<p class="qz-x">Каждый верный ответ — ${R.x} очка.</p>` : ''}
    <div class="res-actions"><button class="btn primary" type="button" id="qzGo">${d ? 'Следующий раунд' : 'Начать'}</button></div>`;
  $('#qzGo').addEventListener('click', () => { ui.qzRound = n; renderQuiz(); });
}
function qzQuestion(x, n){
  const q = x.mineQ[n], key = QZ.id + ':' + n;
  if (ui.qzQ !== key){ ui.qzQ = key; ui.qzSeen = Date.now(); Sound.pick(0); }
  $('#qzStage').textContent = qzStage(n);
  $('#qzBody').innerHTML = `<h1 class="qz-q">${esc(q.text)}</h1>${q.sub ? `<p class="muted qz-sub">${esc(q.sub)}</p>` : ''}
    ${q.face ? `<div class="qz-face">${face(q.face)}</div>` : ''}${qzOpts(q, null, false, true)}`;
  $('#qzBody').querySelectorAll('.qz-o[data-i]').forEach(b => b.addEventListener('click', () => quizAnswer(n, +b.dataset.i)));
  const t = $('#qzTimer'); t.hidden = false; t.classList.add('mine');
  qzTick(n); ui.qzTick = setInterval(() => qzTick(n), 250);
}
function qzTick(n){
  if (ui.screen !== 'scr-quiz' || !QZ || QZ.a.length !== n){ clearInterval(ui.qzTick); return; }
  const left = Math.max(0, QZ_T - (Date.now() - ui.qzSeen) / 1000), t = $('#qzTimer');
  t.querySelector('b').textContent = `0:${String(Math.ceil(left)).padStart(2, '0')}`;
  t.querySelector('i').style.width = (100 * left / QZ_T).toFixed(1) + '%';
  t.classList.toggle('low', left <= 5);
  if (left <= 0) quizAnswer(n, -1);
}
function quizAnswer(n, i){
  if (!QZ || QZ.a.length !== n || quizStatus().state !== 'on') return;
  clearInterval(ui.qzTick);
  QZ.a.push(i);
  if (i >= 0) Sound.pick(1);
  qzSave(); renderQuiz();
}
function qzReveal(x, k){
  const q = x.mineQ[k], my = x.my[k], tq = x.theirQ[k], tv = x.their[k], pp = x.pp;
  const ok = my === q.ans, tok = tv === tq.ans;
  $('#qzStage').textContent = qzStage(k);
  const last = k === QZ_N - 1;
  $('#qzBody').innerHTML = `<h1 class="qz-q">${esc(q.text)}</h1>
    <p class="qz-v ${ok ? 'ok' : 'bad'}">${ok ? `Верно: +${qzPts(q.x)}` : my < 0 ? 'Время вышло' : 'Мимо'}</p>
    ${qzOpts(q, my, true, true)}
    <div class="qz-them ${tok ? 'ok' : 'bad'}"><p class="eyebrow">${esc(pp.name)} — о тебе</p>
      <p><b>${esc(qzAsk(tq))}</b></p>
      <p>${tv < 0 ? 'Не успел(а) ответить.' : `Ответ: ${esc(qzOptText(tq.opts[tv]))} — ${tok ? 'угадано' : 'мимо'}.`}${tok ? '' : ` Верно: ${esc(qzOptText(tq.opts[tq.ans]))}.`}</p></div>
    <div class="res-actions"><button class="btn primary" type="button" id="qzNext">${last ? 'Итоги' : 'Дальше'}</button></div>`;
  if (ok) Sound.pick(2);
  const go = () => { clearInterval(ui.qzCount); ui.qzAck = k; renderQuiz(); };
  $('#qzNext').addEventListener('click', go);
  /* следующий вопрос открывается сам, чтобы держать темп вдвоём */
  let left = QZ_NEXT;
  const btn = $('#qzNext'), label = btn.textContent;
  ui.qzCount = setInterval(() => { left--; if (ui.screen !== 'scr-quiz' || !btn.isConnected){ clearInterval(ui.qzCount); return; } btn.textContent = `${label} · ${left}`; if (left <= 0) go(); }, 1000);
}
function qzVerdict(x){
  const a = x.myPts, b = x.thPts, pp = x.pp;
  if (a === b) return 'Ничья: вы знаете друг друга одинаково хорошо';
  return a > b ? 'Ты знаешь партнёра лучше' : `${esc(pp.name)} знает тебя лучше`;
}
function qzFinal(x){
  clearInterval(ui.qzCount);
  const pp = x.pp, max = QZ_ROUNDS.reduce((t, R) => t + R.x * QZ_PER, 0);
  const p1 = sess.slot === 1 ? x.myPts : x.thPts, p2 = sess.slot === 1 ? x.thPts : x.myPts;
  if (ui.qzFin !== QZ.id){
    ui.qzFin = QZ.id;
    alQuizDone(QZ.id, p1, p2);
    qzCards(x);
    Sound.fanfare(); FX.celebrate();
  }
  $('#qzStage').textContent = 'Викторина «Знаю тебя» · итоги';
  const miss = x.mineQ.map((q, k) => ({q, k})).filter(({q, k}) => x.my[k] !== q.ans);
  const rightMy = x.mineQ.filter((q, k) => x.my[k] === q.ans).length, rightTh = x.theirQ.filter((q, k) => x.their[k] === q.ans).length;
  $('#qzBody').innerHTML = `<h1 class="qz-q">${qzVerdict(x)}</h1>
    <div class="qz-final"><div><small>Твои очки</small><b>${x.myPts}</b><span>из ${max} · верно ${rightMy} из ${QZ_N}</span></div>
      <div><small>Очки: ${esc(pp.name)}</small><b>${x.thPts}</b><span>из ${max} · верно ${rightTh} из ${QZ_N}</span></div></div>
    ${miss.length ? `<div class="sec"><h2>Что ты узнал(а) о партнёре</h2><div class="list">${miss.map(({q}) => {
      const o = q.opts[q.ans];
      const ask = qzAsk(q);
      return `<div class="lrow qz-l">${o.c ? face(o.c) : q.face ? face(q.face) : '<span class="qz-l-i" aria-hidden="true">?</span>'}<div><small>${esc(ask)}</small><b>${esc(qzOptText(o))}</b></div></div>`;
    }).join('')}</div></div>` : `<p>Ни одной ошибки: ты знаешь вкус партнёра наизусть.</p>`}
    <div class="res-actions"><button class="btn primary" type="button" id="qzAgain">Новая викторина</button><button class="btn" type="button" id="qzAlbum">Альбом пары</button></div>`;
  $('#qzAgain').addEventListener('click', quizSetup);
  $('#qzAlbum').addEventListener('click', openAlbum);
}
/* карты в колоду пары: чемпионы из вопросов, на которые ты ответил(а) верно */
function qzCards(x){
  if (typeof dkGive !== 'function' || !dkOn()) return;
  const ids = [];
  x.mineQ.forEach((q, k) => { if (x.my[k] !== q.ans) return; const o = q.opts[q.ans]; const id = o.c || q.face; if (id && !ids.includes(id)) ids.push(id); });
  if (ids.length) dkGive('qz:' + QZ.id, 'Карты за викторину «Знаю тебя»', ids.slice(0, 5).map(id => ({id})));
}

/* ---------- комната ---------- */
function renderQuizBox(){
  const box = $('#rQuiz'); if (!box) return;
  const st = quizStatus(); let h = '';
  if (st.state === 'invited') h = `<h3>${esc(st.pp.name)} зовёт на викторину «Знаю тебя»</h3>
      <p>Вопросы друг о друге по вашим турнирам. Отвечаете одновременно, три раунда, в финальном очки удваиваются.</p>
      ${alMine().length ? '' : '<p class="muted">Чтобы присоединиться, сначала закончи свой турнир в комнате: вопросы о тебе берутся из него.</p>'}
      <div class="res-actions"><button class="btn primary" type="button" data-act="quiz-join" ${alMine().length ? '' : 'disabled'}>Присоединиться</button><button class="btn ghost" type="button" data-act="quiz-no">Не сейчас</button></div>`;
  if (st.state === 'waiting') h = `<h3>Викторина «Знаю тебя»</h3><p>Приглашение отправлено. Викторина начнётся, когда ${esc(st.pp.name)} присоединится.</p>
      <div class="res-actions"><button class="btn ghost" type="button" data-act="quiz-cancel">Отменить</button></div>`;
  if (st.state === 'on'){
    const x = quizCalc();
    const m = Math.min(x.my.length, x.their.length);   // счёт — только по вопросам, на которые ответили оба
    if (!x.done) h = `<h3>Идёт викторина «Знаю тебя»</h3><p>Вопрос ${Math.min(QZ_N, x.my.length + 1)} из ${QZ_N} · ты ${qzUpTo(x.mineQ, x.my, m)}, ${esc(st.pp.name)} ${qzUpTo(x.theirQ, x.their, m)}.</p>
      <div class="res-actions"><button class="btn primary" type="button" data-act="quiz-open">Открыть викторину</button><button class="btn ghost" type="button" data-act="quiz-cancel">Бросить</button></div>`;
    else h = `<h3>Викторина «Знаю тебя»</h3><p>Ты ${x.myPts} — ${x.thPts} ${esc(st.pp.name)}. ${qzVerdict(x)}.</p>
      <div class="res-actions"><button class="btn" type="button" data-act="quiz-open">Итоги</button><button class="btn" type="button" data-act="quiz-new">Новая викторина</button></div>`;
  }
  box.hidden = !h; box.innerHTML = h;
  box.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => roomAction(b.dataset.act)));
}
function quizOnFetch(){
  const st = quizStatus();
  if (st.state === 'invited' && ui.qzInvite !== st.th.id){
    ui.qzInvite = st.th.id;
    if (ui.screen !== 'scr-room') toast(`${st.pp.name} зовёт на викторину «Знаю тебя» — загляни в комнату`, 5000);
  }
  if (st.state !== 'on'){ if (ui.screen === 'scr-quiz') renderQuiz(); return; }
  /* партнёр принял приглашение: если ждём в комнате, открываем викторину */
  if (QZ.host === sess.slot && !QZ.a.length && ui.qzStarted !== QZ.id){
    ui.qzStarted = QZ.id;
    if (ui.screen === 'scr-room'){ toast(`${st.pp.name} в игре — начинаем викторину!`); openQuiz(); return; }
  }
  if (ui.screen === 'scr-quiz'){
    /* вопрос, разбор и заставку не перерисовываем, пока они те же: таймер и обратный отсчёт идут дальше */
    const x = quizCalc(), vw = x && qzView(x);
    if (vw && vw.v !== 'w' && ui.qzViewKey === vw.v + vw.k) return;
    renderQuiz();
  }
}
document.addEventListener('keydown', e => {
  if (ui.screen !== 'scr-quiz' || e.ctrlKey || e.metaKey || e.altKey || !$('#modal').hidden) return;
  const b = $('#qzBody').querySelector(`.qz-o[data-i="${+e.key - 1}"]`);
  if (b){ e.preventDefault(); b.click(); }
});

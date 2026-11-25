/* Пара из Рунтерры: драфт пары.
   Как выбор чемпионов в LoL: сначала баны по очереди, потом каждый «отдаёт» партнёру чемпионов
   в порядке 1-2-2-2-2-1, пока у обоих не наберётся пятёрка. Потом каждый проходит круговой
   мини-турнир среди своей пятёрки и узнаёт, какой подарок партнёра понравился больше всех. */

const DR_BANS = 3, DR_GIVES = 5, DR_TURN = 30;   // секунд на ход
/* h — кто позвал, g — кто присоединился */
const DR_PLAN = ['h','g','h','g','h','g'].map(w => ({w, t:'ban'}))
  .concat(['h','g','g','h','h','g','g','h','h','g'].map(w => ({w, t:'give'})));
let DR = null;   // мой драфт: {id, host, at, who, acts:[{c, at}], res:{d:[…], order:[…]}}
const drKey = () => 'rp-draft-' + (sess ? sess.code + '-' + sess.slot : '');
const DR_WHO = {all:['Все', 'кого угодно'], m:['Мужчины', 'только мужчин'], f:['Женщины', 'только женщин']};
const drOf = p => {
  const d = p && p.state && p.state.draft;
  return d && typeof d.id === 'string' && (d.host === 1 || d.host === 2) && Array.isArray(d.acts) && DR_WHO[d.who] ? d : null;
};
function drSave(){ store.set(drKey(), DR); pushState(true); }

function draftStatus(){
  const pp = partner(), th = drOf(pp);
  if (!pp) return {state:'none'};
  if (DR && th && th.id === DR.id) return {state:'on', pp, th};
  if (th && th.host === pp.slot && (!DR || DR.id !== th.id) && store.get('rp-draft-no') !== th.id) return {state:'invited', pp, th};
  if (DR && DR.host === sess.slot && !(th && th.id === DR.id)) return {state:'waiting', pp};
  return {state:'none', pp};
}

/* общая картина драфта: одинаково считается у обоих, ходы каждого лежат в его собственном состоянии */
function draftCalc(){
  const st = draftStatus(); if (st.state !== 'on') return null;
  const meHost = DR.host === sess.slot, myW = meHost ? 'h' : 'g', thW = meHost ? 'g' : 'h';
  const acts = {[myW]:DR.acts, [thW]:st.th.acts}, cnt = {h:0, g:0}, bans = [], gives = {h:[], g:[]}, used = new Set();
  let cur = null, last = DR.at;
  for (let i = 0; i < DR_PLAN.length; i++){
    const P = DR_PLAN[i], a = acts[P.w][cnt[P.w]];
    if (!a || !BY[a.c] || used.has(a.c)){ cur = {i, t:P.t, w:P.w, me:P.w === myW}; break; }
    cnt[P.w]++; used.add(a.c); last = a.at || last;
    if (P.t === 'ban') bans.push({c:a.c, w:P.w}); else gives[P.w].push(a.c);
  }
  return {pp:st.pp, th:st.th, cur, bans, used, myW, thW, last, toMe:gives[thW], toThem:gives[myW], done:!cur};
}
/* кого можно выбрать на этом ходу: баны — из всех, подарки — с учётом того, кого хочет получить партнёр */
function draftPool(x){
  if (!x || !x.cur) return [];
  const who = x.cur.t === 'ban' ? 'all' : x.cur.me ? x.th.who : DR.who;
  return CH.filter(c => !x.used.has(c[0]) && (who === 'all' || c[3] === who)).map(c => c[0]);
}

/* ---------- приглашение ---------- */
function draftSetup(){
  const pp = partner(); if (!pp) return toast('Сначала дождись партнёра в комнате');
  openModal(`<p class="eyebrow">Вдвоём</p><h2>Драфт пары</h2>
    <p style="margin-top:12px">Как выбор чемпионов в League of Legends, только для свиданий. Сначала каждый банит троих: их не получит никто. Потом вы по очереди отдаёте друг другу чемпионов, пока у каждого не наберётся пятёрка. На ход — ${DR_TURN} секунд, не успел — выбор случайный.</p>
    <p style="margin-top:8px">В конце каждый проходит короткий турнир среди своей пятёрки и выбирает, чей подарок лучший.</p>
    ${drWhoSeg('drWhoNew')}
    <div class="res-actions" style="margin-top:16px"><button class="btn primary" type="button" id="drCreate">Позвать: ${esc(pp.name)}</button></div>`);
  $('#drCreate').addEventListener('click', () => draftCreate(drWhoVal('drWhoNew')));
}
const drWhoSeg = nm => `<fieldset class="sy-len"><legend>Кого отдавать тебе</legend><div class="seg">
  ${Object.entries(DR_WHO).map(([k, [t, d]], i) => `<label><input type="radio" name="${nm}" value="${k}" ${i ? '' : 'checked'}><span><b>${t}</b><small>${d}</small></span></label>`).join('')}
  </div></fieldset>`;
const drWhoVal = nm => (document.querySelector(`input[name=${nm}]:checked`) || {}).value || 'all';
function draftCreate(who){
  const id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).slice(0, 12);
  DR = {id, host:sess.slot, at:Date.now(), who:DR_WHO[who] ? who : 'all', acts:[]};
  store.del('rp-draft-no'); drSave(); closeModal();
  show('scr-room'); renderRoom();
  toast('Приглашение отправлено. Драфт начнётся, когда партнёр присоединится');
}
function draftJoin(){
  const st = draftStatus(); if (st.state !== 'invited') return;
  DR = {id:st.th.id, host:st.th.host, at:Date.now(), who:drWhoVal('drWhoJoin'), acts:[]};
  drSave(); openDraft();
}
function draftDecline(){
  const st = draftStatus(); if (st.state !== 'invited') return;
  store.set('rp-draft-no', st.th.id); renderRoom();
}
function draftCancel(){
  DR = null; store.del(drKey()); pushState(true);
  if (ui.screen === 'scr-draft') show('scr-room');
  renderRoom();
}

/* ---------- экран драфта ---------- */
function openDraft(){
  if (draftStatus().state !== 'on') return renderRoom();
  ui.drSel = null; ui.drTurnKey = ''; $('#drSearch').value = '';
  show('scr-draft'); drBuildGrid(); renderDraft();
}
function drBuildGrid(){
  const g = $('#drGrid'); if (g.childElementCount) return;
  g.innerHTML = CH.slice().sort((a, b) => a[1].localeCompare(b[1], 'ru')).map(c =>
    `<button type="button" class="dr-c" data-id="${c[0]}" data-q="${esc((c[1] + ' ' + c[0]).toLowerCase().replace(/ё/g, 'е'))}">${face(c[0])}<span class="${c[1].replace(/ .*/, '').length > 9 ? 'sm' : ''}">${esc(c[1])}</span></button>`).join('');
  g.addEventListener('click', e => {
    const b = e.target.closest('.dr-c'); if (!b || b.disabled) return;
    ui.drSel = b.dataset.id; renderDraft();
  });
}
const drSlot = (id, k) => id ? `<span class="dr-s on">${face(id)}<b>${esc(name(id))}</b></span>` : `<span class="dr-s"><i>${k}</i></span>`;
function renderDraft(){
  if (ui.screen !== 'scr-draft') return;
  const x = draftCalc();
  if (!x){ clearInterval(ui.drTick); show('scr-room'); renderRoom(); return; }
  const pp = x.pp, cur = x.cur;
  /* доска: что досталось каждому и кого забанили */
  $('#drMine').innerHTML = `<h3>Твоя пятёрка <small>собирает: ${esc(pp.name)}</small></h3><div class="dr-row">${[...Array(DR_GIVES)].map((_, i) => drSlot(x.toMe[i], i + 1)).join('')}</div>`;
  $('#drTheirs').innerHTML = `<h3>Пятёрка: ${esc(pp.name)} <small>собираешь ты</small></h3><div class="dr-row">${[...Array(DR_GIVES)].map((_, i) => drSlot(x.toThem[i], i + 1)).join('')}</div>`;
  const myBans = x.bans.filter(b => b.w === x.myW).map(b => b.c), thBans = x.bans.filter(b => b.w === x.thW).map(b => b.c);
  const banSlot = id => id ? `<span class="dr-b on" title="${esc(name(id))}">${face(id)}</span>` : '<span class="dr-b"></span>';
  $('#drBans').innerHTML = `<small>Баны</small><div>${[...Array(DR_BANS)].map((_, i) => banSlot(myBans[i])).join('')}<em>·</em>${[...Array(DR_BANS)].map((_, i) => banSlot(thBans[i])).join('')}</div>`;
  if (x.done){
    clearInterval(ui.drTick);
    $('#drTitle').textContent = 'Драфт завершён';
    $('#drSub').textContent = `Пятёрки готовы. Каждый выбирает лучшего из того, что ему отдали.`;
    $('#drTimer').hidden = true; $('#drPick').hidden = true; $('#drAfter').hidden = false;
    renderDraftAfter(x);
    return;
  }
  $('#drAfter').hidden = true; $('#drPick').hidden = false; $('#drTimer').hidden = false;
  const verbT = cur.t === 'ban' ? 'бан' : 'подарок';
  const left = cur.t === 'ban' ? DR_BANS - (cur.me ? myBans : thBans).length : DR_GIVES - (cur.me ? x.toThem : x.toMe).length;
  $('#drTitle').textContent = cur.me ? (cur.t === 'ban' ? 'Твой ход: забань одного' : 'Твой ход: отдай чемпиона партнёру') : `Ход: ${pp.name}`;
  $('#drSub').textContent = cur.t === 'ban'
    ? `Баны: забаненных не получит никто. ${cur.me ? `У тебя осталось ${left} ${plural(left, 'бан', 'бана', 'банов')}.` : `${pp.name} выбирает, кого убрать.`}`
    : cur.me ? `Осталось отдать: ${left}. ${x.th.who === 'all' ? '' : `${pp.name} просит ${DR_WHO[x.th.who][1]}.`}` : `${pp.name} выбирает тебе ${verbT}. Пока можно присмотреться к сетке.`;
  /* сетка: кого ещё можно взять */
  const pool = new Set(cur.me ? draftPool(x) : []);
  if (ui.drSel && x.used.has(ui.drSel)) ui.drSel = null;
  if (ui.drSel && cur.me && !pool.has(ui.drSel)) ui.drSel = null;
  $('#drGrid').querySelectorAll('.dr-c').forEach(b => {
    const id = b.dataset.id, used = x.used.has(id);
    b.disabled = used || (cur.me && !pool.has(id));
    b.classList.toggle('used', used); b.classList.toggle('sel', ui.drSel === id);
    b.classList.toggle('ban', x.bans.some(z => z.c === id));
  });
  const go = $('#drGo');
  go.disabled = !(cur.me && ui.drSel);
  go.textContent = !cur.me ? `Ждём: ${pp.name}` : !ui.drSel ? (cur.t === 'ban' ? 'Выбери, кого забанить' : 'Выбери подарок') : cur.t === 'ban' ? `Забанить: ${name(ui.drSel)}` : `Отдать: ${name(ui.drSel)}`;
  go.classList.toggle('ban', cur.t === 'ban');
  /* таймер хода: считаем от момента, когда ход увидели на этом устройстве */
  const key = DR.id + ':' + cur.i;
  if (ui.drTurnKey !== key){
    ui.drTurnKey = key; ui.drSeen = Date.now(); ui.drAuto = false;
    if (cur.me){ Sound.pick(1); }
  }
  clearInterval(ui.drTick); drTick(); ui.drTick = setInterval(drTick, 250);
  clearTimeout(ui.drPoll);
  if (!cur.me) ui.drPoll = setTimeout(() => { if (ui.screen === 'scr-draft') fetchRoom(); }, 3000);
}
function drTick(){
  if (ui.screen !== 'scr-draft'){ clearInterval(ui.drTick); return; }
  const x = draftCalc(); if (!x || x.done){ clearInterval(ui.drTick); return; }
  const left = Math.max(0, DR_TURN - (Date.now() - ui.drSeen) / 1000), t = $('#drTimer');
  t.querySelector('b').textContent = left > 0 ? `0:${String(Math.ceil(left)).padStart(2, '0')}` : x.cur.me ? '0:00' : 'ждём';
  t.querySelector('i').style.width = (100 * left / DR_TURN).toFixed(1) + '%';
  t.classList.toggle('low', left <= 8); t.classList.toggle('mine', x.cur.me);
  if (x.cur.me && left <= 0 && !ui.drAuto){
    ui.drAuto = true;
    const pool = draftPool(x), pick = ui.drSel && pool.includes(ui.drSel) ? ui.drSel : pool[Math.floor(Math.random() * pool.length)];
    toast(ui.drSel ? 'Время вышло — взяли того, кого ты отметил(а)' : 'Время вышло — выбор случайный');
    draftAct(pick);
  }
}
function draftAct(id){
  const x = draftCalc(); if (!x || !x.cur || !x.cur.me || !id) return;
  if (!draftPool(x).includes(id)) return;
  DR.acts.push({c:id, at:Date.now()}); ui.drSel = null;
  Sound.pick(x.cur.t === 'ban' ? 0 : 2);
  drSave(); renderDraft();
}

/* ---------- после драфта: круговой мини-турнир среди своей пятёрки ---------- */
function drSeed(){ let h = 2166136261; for (const ch of DR.id + ':' + sess.slot){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function drPairs(ids, seed){
  const r = mulberry32(seed), out = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) out.push(r() < .5 ? [ids[i], ids[j]] : [ids[j], ids[i]]);
  for (let i = out.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  /* подряд один и тот же чемпион — скучно: разводим, если можно */
  for (let i = 1; i < out.length; i++){
    const prev = out[i - 1];
    if (out[i].some(c => prev.includes(c))){
      const k = out.findIndex((p, j) => j > i && !p.some(c => prev.includes(c)));
      if (k > 0) [out[i], out[k]] = [out[k], out[i]];
    }
  }
  return out;
}
/* место по числу побед; при равенстве — личная встреча, потом сила побеждённых */
function drRank(ids, pairs, d){
  const w = {}, beat = {}; ids.forEach(id => { w[id] = 0; beat[id] = []; });
  pairs.forEach((p, i) => { if (d[i] == null) return; const win = p[d[i]], lose = p[1 - d[i]]; w[win]++; beat[win].push(lose); });
  const sb = id => beat[id].reduce((t, o) => t + w[o], 0);
  return ids.slice().sort((a, b) => w[b] - w[a] || (beat[a].includes(b) ? -1 : beat[b].includes(a) ? 1 : 0) || sb(b) - sb(a) || ids.indexOf(a) - ids.indexOf(b));
}
function startDraftDuels(){
  const x = draftCalc(); if (!x || !x.done) return;
  DR.res = DR.res && Array.isArray(DR.res.d) ? DR.res : {d:[]};
  ui.mode = 'draft'; ui.lock = false;
  preloadAll(x.toMe);
  show('scr-duel'); renderDraftDuel();
}
function renderDraftDuel(){
  const x = draftCalc();
  if (!x || !x.done){ ui.mode = 'play'; show('scr-room'); renderRoom(); return; }
  const pairs = drPairs(x.toMe, drSeed()), i = DR.res.d.length;
  if (i >= pairs.length){
    DR.res.order = drRank(x.toMe, pairs, DR.res.d); drSave();
    dkDraft(DR.res.order[0]);
    ui.mode = 'play'; show('scr-draft'); renderDraft();
    Sound.fanfare(); FX.celebrate();
    return;
  }
  const [a, b] = pairs[i], last = i === pairs.length - 1;
  ui.cur = {kind:'duel', a, b, level:last ? 1 : 0, stage:'draft'};
  $('#stage').textContent = 'Драфт пары · твоя пятёрка';
  $('#counter').textContent = `Дуэль ${i + 1} из ${pairs.length}`;
  $('#barFill').style.width = (100 * i / pairs.length).toFixed(1) + '%';
  const p = $('#prompt'); p.className = 'prompt'; p.textContent = last ? 'Последняя дуэль. Чей подарок лучше?' : PROMPTS[i % PROMPTS.length];
  $('#subprompt').hidden = true;
  setCard(0, a); setCard(1, b);
  const ar = $('#arena'); ar.className = 'arena' + (last ? ' lv1' : ''); void ar.offsetWidth; ar.classList.add('enter');
  FX.setLevel(last ? 1 : 0);
  $('#undoBtn').hidden = true; $('#bracketBtn').hidden = true; $('#partnerChip').hidden = true; $('#watchBar').hidden = true;
  $('#reveal').textContent = ''; $('#reveal').className = 'reveal';
}
function draftPick(side){
  ui.lock = true;
  const cards = [$('#card0'), $('#card1')];
  cards[side].classList.add('chosen'); cards[1 - side].classList.add('lost');
  Sound.pick(ui.cur.level || 0);
  DR.res.d.push(side); store.set(drKey(), DR); queueSync();
  setTimeout(() => { ui.lock = false; renderDraftDuel(); }, 620);
}
const drPlace = n => `${n}-е место`;
function renderDraftAfter(x){
  const pp = x.pp, my = DR.res && DR.res.order, th = x.th.res && Array.isArray(x.th.res.order) && x.th.res.order.every(id => x.toThem.includes(id)) ? x.th.res.order : null;
  const list = (ids, cls, ranked) => `<ol class="dr-res ${cls || ''} ${ranked ? 'ranked' : ''}">${ids.map((id, i) => `<li>${face(id)}<span><b>${esc(name(id))}</b><small>${ranked ? (i ? drPlace(i + 1) : 'лучший подарок') : esc(BY[id].title)}</small></span></li>`).join('')}</ol>`;
  let h = '';
  if (my) h += `<div class="dr-card"><h3>Твой выбор</h3><p class="muted">Из пятёрки, которую собрал(а): ${esc(pp.name)}</p>${list(my, 'mine', true)}</div>`;
  else {
    const got = DR.res && DR.res.d ? DR.res.d.length : 0;
    h += `<div class="dr-card"><h3>Твоя пятёрка</h3><p class="muted">Собрал(а): ${esc(pp.name)}</p>${list(x.toMe)}
      <p class="muted">Десять дуэлей, каждый с каждым — и станет ясно, какой подарок лучший.</p>
      <div class="res-actions"><button class="btn primary" type="button" id="drPlay">${got ? `Продолжить (${got} из 10)` : 'Выбрать лучшего'}</button></div></div>`;
  }
  if (th){
    let guess = '';
    const ps = playerState(pp);
    if (ps.status === 'done'){
      const n = ps.m.order.length, places = x.toThem.map(id => ps.m.order.indexOf(id)).filter(k => k > -1);
      if (places.length){
        const avg = places.reduce((t, k) => t + k, 0) / places.length, pct = Math.round(100 * (1 - avg / Math.max(1, n - 1)));
        guess = `<p class="muted">В большом турнире партнёра твои подарки стоят на местах ${places.map(k => '#' + (k + 1)).join(', ')}. В среднем выше, чем ${pct}% остальных — ${pct >= 80 ? 'ты отлично знаешь вкус партнёра' : pct >= 60 ? 'неплохо угадано' : 'есть что обсудить'}.</p>`;
      }
    }
    h += `<div class="dr-card"><h3>Выбор: ${esc(pp.name)}</h3><p class="muted">Из пятёрки, которую собрал(а) ты</p>${list(th, 'theirs', true)}${guess}</div>`;
  } else h += `<div class="dr-card"><h3>Пятёрка: ${esc(pp.name)}</h3><p class="muted">Собрал(а) ты. ${esc(pp.name)} ещё выбирает лучшего — результат появится здесь.</p>${list(x.toThem)}</div>`;
  h += `<div class="res-actions"><button class="btn" type="button" id="drAgain">Новый драфт</button></div>`;
  $('#drAfter').innerHTML = h;
  const pl = $('#drPlay'); if (pl) pl.addEventListener('click', startDraftDuels);
  $('#drAgain').addEventListener('click', draftSetup);
}

/* ---------- комната ---------- */
function renderDraftBox(){
  const box = $('#rDraft'); if (!box) return;
  const st = draftStatus(); let h = '';
  if (st.state === 'invited') h = `<h3>${esc(st.pp.name)} зовёт на драфт пары</h3>
      <p>Баны и подарки по очереди, как выбор чемпионов в LoL. В конце у каждого пятёрка от партнёра и короткий турнир среди неё.</p>
      ${drWhoSeg('drWhoJoin')}
      <div class="res-actions"><button class="btn primary" type="button" data-act="draft-join">Присоединиться</button><button class="btn ghost" type="button" data-act="draft-no">Не сейчас</button></div>`;
  if (st.state === 'waiting') h = `<h3>Драфт пары</h3><p>Приглашение отправлено. Драфт начнётся, когда ${esc(st.pp.name)} присоединится.</p>
      <div class="res-actions"><button class="btn ghost" type="button" data-act="draft-cancel">Отменить</button></div>`;
  if (st.state === 'on'){
    const x = draftCalc();
    if (!x.done) h = `<h3>Идёт драфт пары</h3><p>${x.cur.me ? 'Сейчас твой ход.' : `Сейчас ход: ${esc(st.pp.name)}.`} Позади ${x.bans.length + x.toMe.length + x.toThem.length} из ${DR_PLAN.length} ходов.</p>
      <div class="res-actions"><button class="btn primary" type="button" data-act="draft-open">Открыть драфт</button><button class="btn ghost" type="button" data-act="draft-cancel">Бросить</button></div>`;
    else {
      const my = DR.res && DR.res.order, th = x.th.res && x.th.res.order;
      h = `<h3>Драфт пары</h3><p>${my ? `Лучший в твоей пятёрке: <b>${esc(name(my[0]))}</b>.` : 'Пятёрка готова: выбери из неё лучшего.'}${th && BY[th[0]] ? ` ${esc(st.pp.name)} выбирает: <b>${esc(name(th[0]))}</b>.` : ''}</p>
      <div class="res-actions"><button class="btn ${my ? '' : 'primary'}" type="button" data-act="draft-open">${my ? 'Итоги драфта' : 'Выбрать лучшего'}</button></div>`;
    }
  }
  box.hidden = !h; box.innerHTML = h;
  box.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => roomAction(b.dataset.act)));
}
function draftOnFetch(){
  const st = draftStatus();
  if (st.state === 'invited' && ui.drInvite !== st.th.id){
    ui.drInvite = st.th.id;
    if (ui.screen !== 'scr-room') toast(`${st.pp.name} зовёт на драфт пары — загляни в комнату`, 5000);
  }
  if (st.state !== 'on') { if (ui.screen === 'scr-draft') renderDraft(); return; }
  /* партнёр принял приглашение: если ждём в комнате, открываем драфт */
  if (DR.host === sess.slot && !DR.acts.length && ui.drStarted !== DR.id){
    ui.drStarted = DR.id;
    if (ui.screen === 'scr-room'){ toast(`${st.pp.name} в игре — начинаем драфт!`); openDraft(); return; }
  }
  if (ui.screen === 'scr-draft') return renderDraft();
  const x = draftCalc();
  if (x && x.cur && x.cur.me && ui.drNudge !== DR.id + ':' + x.cur.i && ui.mode !== 'draft'){
    ui.drNudge = DR.id + ':' + x.cur.i;
    toast('Твой ход в драфте пары', 4000);
  }
}

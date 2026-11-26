/* Пара из Рунтерры: коллекция значков.
   Значки турниров копятся с каждым пройденным турниром, редкие — за особые случаи.
   Хранится в браузере; если устройства связаны кодом, коллекции с них складываются. */

const COLL_KEY = 'rp-collection';
const COLL_REGIONS = Object.keys(REGIONS).filter(k => k !== 'rt');

/* порядок — как в витрине; ключи не менять: по ним хранится собранное */
const COLL = [
  /* значки турниров: те же, что на экране итогов */
  {k:'region',      g:'t', icon:'♥', t:'Сердце края',              h:'Трое из топ-10 родом из одного края', of:() => COLL_REGIONS.length, at:c => (c.regions || []).length},
  {k:'dark',        g:'t', icon:'☾', t:'Тянет на тёмную сторону',  h:'Трое опасных соблазнителей в топ-10'},
  {k:'knight',      g:'t', icon:'⛨', t:'Под надёжной защитой',     h:'Трое благородных защитников в топ-10'},
  {k:'magic',       g:'t', icon:'✦', t:'Магия в крови',            h:'Пять магов в топ-10'},
  {k:'joy',         g:'t', icon:'☀', t:'Смех продлевает любовь',   h:'Трое весельчаков в топ-10'},
  {k:'tragic',      g:'t', icon:'❦', t:'Спасатель израненных душ', h:'Трое героев с тяжёлым прошлым в топ-10'},
  {k:'monster',     g:'t', icon:'♞', t:'Монстры тоже люди',        h:'Пара — не совсем человек, или трое нелюдей в топ-10'},
  {k:'taken',       g:'t', icon:'⚭', t:'Занято!',                  h:'Пара, чьё сердце по лору уже отдано'},
  {k:'sib-kayn',    g:'t', icon:'⚯', t:'Одно тело, две души',      h:'Каин и Рааст вместе в топ-10'},
  {k:'sib-kindred', g:'t', icon:'⚯', t:'Вечные охотники',          h:'Волк и Овечка вместе в топ-10'},
  {k:'sib-family',  g:'t', icon:'⚯', t:'Любовь — семейное дело',   h:'Родные вместе в топ-10: братья, сёстры или мама с сыном'},
  {k:'bet-win',     g:'t', icon:'◎', t:'Интуиция',                 h:'Угадать пару ставкой перед турниром'},
  {k:'bet-near',    g:'t', icon:'◔', t:'Почти в точку',            h:'Ставка перед турниром заняла 2-е или 3-е место'},
  {k:'bet-miss',    g:'t', icon:'✧', t:'Сердце удивило',           h:'Ставка перед турниром не попала даже в топ-10'},
  {k:'lower',       g:'t', icon:'↻', t:'Второй шанс',              h:'Пара пришла к победе через сетку второго шанса'},
  {k:'clean',       g:'t', icon:'★', t:'Без единой осечки',        h:'Пара не проиграла ни одной дуэли'},
  {k:'world',       g:'t', icon:'✈', t:'Роман без границ',         h:'Топ-10 из семи разных краёв'},
  {k:'fresh',       g:'t', icon:'✺', t:'Свежая кровь',             h:'Пара — один из новейших чемпионов'},
  /* редкие */
  {k:'same3',   g:'r', icon:'∞', t:'Верность',               h:'Одна и та же пара три основных турнира подряд'},
  {k:'minis',   g:'r', icon:'❖', t:'Знаток Рунтерры',        h:'Пройти все мини-турниры', of:() => THEMES.length, at:c => (c.themes || []).length},
  {k:'deep',    g:'r', icon:'◈', t:'Без компромиссов',       h:'Пройти основной турнир в режиме «Подробно»'},
  {k:'svaha',   g:'r', icon:'✶', t:'Звёзды не лгут',         h:'Пара из основного турнира — в тройке у Звёздной свахи'},
  {k:'mutual',  g:'r', icon:'♡', t:'Половинки',              h:'Взаимность с парой — 90% и выше'},
  {k:'date',    g:'r', icon:'❀', t:'Идеальное свидание',     h:'Первое свидание, где каждая сцена — в точку'},
  {k:'room',    g:'r', icon:'☍', t:'Вдвоём веселее',         h:'Закончить свой турнир в комнате для двоих'},
  {k:'sync',    g:'r', icon:'⚇', t:'В четыре руки',          h:'Пройти вдвоём «Общий турнир» в комнате до самых итогов'},
  {k:'mind',    g:'r', icon:'◉', t:'Читаю мысли',            h:'Угадать 80% выборов партнёра'},
  {k:'hearts',  g:'r', icon:'♦', t:'Азарт',                  h:'Выиграть пять ставок в прямом эфире', of:() => 5, at:c => Math.min(5, c.hearts || 0)},
  {k:'daily7',  g:'r', icon:'☼', t:'Каждый день — свидание', h:'Голосовать в дуэли дня семь дней подряд', of:() => 7, at:() => Math.min(7, collDailyRun())},
  {k:'night',   g:'r', icon:'☽', t:'Полуночное свидание',    h:'Закончить турнир между полуночью и пятью утра'},
  {k:'duels',   g:'r', icon:'⚔', t:'Три тысячи свиданий',    h:'Три тысячи дуэлей в пройденных турнирах', of:() => 3000, at:c => Math.min(3000, c.duels || 0)},
  {k:'collector', g:'r', icon:'✪', t:'Коллекционер',         h:'Собрать десять разных значков турниров', of:() => 10, at:c => Math.min(10, COLL.filter(x => x.g === 't' && c.got[x.k]).length)},
  /* легендарные: когда сходится всё сразу */
  {k:'destiny', g:'l', icon:'☄', t:'Предначертано',          h:'Пара основного турнира — первая у Звёздной свахи, и взаимность с ней 90% или выше'},
  {k:'soul',    g:'l', icon:'❣', t:'Одно сердце на двоих',   h:'Пройти вдвоём «Общий турнир» и совпасть с первого раза хотя бы в 90% дуэлей'},
  {k:'legend',  g:'l', icon:'♛', t:'Легенда Рунтерры',       h:'Собрать все обычные и редкие значки', of:() => COLL.filter(x => x.g !== 'l').length, at:c => COLL.filter(x => x.g !== 'l' && c.got[x.k]).length}
];
const COLL_BY = Object.fromEntries(COLL.map(x => [x.k, x]));

function collLoad(){
  const c = store.get(COLL_KEY);
  return c && c.got ? c : {got:{}, regions:[], themes:[], hist:[], duels:0, hearts:0};
}
function collSave(c){ store.set(COLL_KEY, c); }
const collCount = c => COLL.filter(x => c.got[x.k]).length;

/* сколько дней подряд (по сегодня или по вчера) был голос в дуэли дня */
function collDailyRun(){
  const mine = dailyMine(), d = new Date(dailyDay() + 'T00:00:00Z'), key = x => x.toISOString().slice(0, 10);
  if (!mine[key(d)]) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (mine[key(d)]){ n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

/* открыть значок; новые сразу показываем всплывающим окошком */
function collUnlock(c, k, quiet){
  if (!COLL_BY[k]) return false;
  const was = c.got[k];
  c.got[k] = {at: was ? was.at : Date.now(), n: (was ? was.n : 0) + 1};
  if (!was && !quiet) collQueue.push(k);
  return !was;
}
function collMeta(c){
  if (!c.got.collector && COLL.filter(x => x.g === 't' && c.got[x.k]).length >= 10) collUnlock(c, 'collector');
  if (!c.got.duels && (c.duels || 0) >= 3000) collUnlock(c, 'duels');
  if (!c.got.minis && THEMES.every(t => (c.themes || []).includes(t[0]))) collUnlock(c, 'minis');
  if (!c.got.destiny && collDestiny(c)) collUnlock(c, 'destiny');
  /* последней — «Легенда»: она ждёт все остальные */
  if (!c.got.legend && COLL.filter(x => x.g !== 'l').every(x => c.got[x.k])) collUnlock(c, 'legend');
}
/* «Предначертано»: пара последнего основного турнира — №1 у свахи, а взаимность с ней хоть раз была 90%+ */
function collDestiny(c){
  const last = c.hist.filter(x => !x.theme && !x.side).pop();
  return !!last && collSvahaTop3()[0] === last.c && ((c.mu || {})[last.c] || 0) >= 90;
}
/* взаимность: запоминаем лучший процент с каждым чемпионом */
function collMutual(id, pct){
  if (VIEW || TOOLS) return;
  const c = collLoad(); c.mu = c.mu || {};
  if (pct <= (c.mu[id] || 0)) return;
  c.mu[id] = pct; collMeta(c); collSave(c); collFlush();
}

/* пройденный турнир: один раз на турнир, переигровка финала не считается новым */
function collTournament(m){
  if (VIEW || TOOLS || !S.cfg || m.kind !== 'done') return;
  const c = collLoad(), seed = S.cfg.seed, old = c.hist.find(h => h.s === seed);
  if (old){ if (old.c !== m.champ){ old.c = m.champ; collSave(c); } return; }
  c.hist.push({s:seed, at:Date.now(), c:m.champ, mode:S.cfg.mode, theme:S.cfg.theme || null, side:S.cfg.side || null, room:ctx === 'room' && !!sess});
  c.hist = c.hist.slice(-30);
  c.duels = (c.duels || 0) + S.dec.length;
  if (S.cfg.theme && !c.themes.includes(S.cfg.theme)) c.themes.push(S.cfg.theme);
  const fresh = [];
  achievements(m, S.cfg).forEach(b => {
    if (!b.k) return;
    const newRegion = b.k === 'region' && b.r && !c.regions.includes(b.r);
    if (newRegion) c.regions.push(b.r);
    if (collUnlock(c, b.k, true) || newRegion) fresh.push(b.k);
  });
  /* «Верность», «Без компромиссов» и совпадение со свахой — только за основные турниры, побочные результаты здесь не считаются */
  const main = !S.cfg.theme && !S.cfg.side, last3 = c.hist.filter(x => !x.theme && !x.side).slice(-3);
  if (main && last3.length === 3 && last3.every(x => x.c === m.champ)) collUnlock(c, 'same3');
  if (main && S.cfg.mode === 'deep') collUnlock(c, 'deep');
  if (ctx === 'room' && sess) collUnlock(c, 'room');
  const hr = new Date().getHours(); if (hr < 5) collUnlock(c, 'night');
  if (main && collSvahaTop3().includes(m.champ)) collUnlock(c, 'svaha');
  collMeta(c);
  collSave(c);
  ui.collFresh = {seed, keys:fresh};
  if (fresh.length) collQueue.unshift({fresh:fresh.length});
  collFlush();
}
/* тройка Звёздной свахи по последним ответам */
function collSvahaTop3(){
  const last = store.get(SV_KEY);
  if (!last || !Array.isArray(last.ans)) return [];
  try { return svMatch(last.ans).list.slice(0, 3).map(r => r.id); } catch(e){ return []; }
}
/* разовые события из других режимов */
function collEvent(k){
  if (VIEW || TOOLS) return;
  const c = collLoad();
  if (k === 'svaha-done'){
    const last = c.hist.filter(x => !x.theme && !x.side).pop();
    k = last && collSvahaTop3().includes(last.c) ? 'svaha' : null;
  }
  /* даже если значок уже есть, проверяем легендарные: свахе могли ответить заново */
  if (k && !c.got[k]) collUnlock(c, k);
  collMeta(c); collSave(c); collFlush();
}
function collHearts(won){
  if (!won || VIEW || TOOLS) return;
  const c = collLoad(); c.hearts = (c.hearts || 0) + won;
  if (c.hearts >= 5) collUnlock(c, 'hearts');
  collSave(c); collFlush();
}
function collDaily(){
  if (collDailyRun() >= 7) collEvent('daily7');
}

/* всплывающие окошки о новых значках — по одному */
const collQueue = [];
let collT = 0;
function collFlush(){
  if (collT || !collQueue.length) return;
  const x = collQueue.shift(), el = $('#achFx');
  if (x.fresh){
    el.innerHTML = `<span class="hex" aria-hidden="true">+${x.fresh}</span><span><small>Коллекция</small><b>${x.fresh === 1 ? 'Новый значок турнира' : `Новые значки турниров: ${x.fresh}`}</b></span>`;
  } else {
    const a = COLL_BY[x], leg = a.g === 'l';
    el.classList.toggle('leg', leg);
    el.innerHTML = `<span class="hex ${leg ? 'leg' : 'rare'}" aria-hidden="true">${a.icon}</span><span><small>${leg ? 'Легендарный значок' : 'Редкий значок'}</small><b>${esc(a.t)}</b></span>`;
    Sound.fanfare && Sound.fanfare();
    if (leg) FX.celebrate();
  }
  el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  collT = setTimeout(() => {
    el.classList.remove('on');
    collT = setTimeout(() => { el.hidden = true; collT = 0; collFlush(); }, 280);
  }, 3400);
}

/* ================= витрина ================= */
const collDate = t => new Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'long'}).format(new Date(t));
function collCard(x, c){
  const got = c.got[x.k], prog = x.of ? `<span class="cl-prog"><i style="width:${(100 * x.at(c) / x.of()).toFixed(1)}%"></i></span><small class="cl-n">${x.at(c)} из ${x.of()}</small>` : '';
  const meta = got ? (x.g === 't' && got.n > 1 ? `${got.n} ${plural(got.n, 'раз', 'раза', 'раз')} · впервые ${collDate(got.at)}` : collDate(got.at)) : '';
  return `<div class="cl ${got ? 'got' : ''} ${x.g === 'r' ? 'rare' : x.g === 'l' ? 'leg' : ''}">
    <span class="hex" aria-hidden="true">${got ? x.icon : '?'}</span>
    <div><b>${esc(x.t)}</b><small>${esc(x.h)}</small>${got ? `<small class="cl-meta">${meta}</small>` : ''}${x.of && !(got && x.k !== 'region') ? prog : ''}</div>
  </div>`;
}
function renderCollection(){
  const c = collLoad(), n = collCount(c);
  show('scr-collect');
  $('#clSum').innerHTML = `<b>${n}</b> из ${COLL.length}`;
  $('#clBar').style.width = (100 * n / COLL.length).toFixed(1) + '%';
  $('#clTour').innerHTML = COLL.filter(x => x.g === 't').map(x => collCard(x, c)).join('');
  $('#clRare').innerHTML = COLL.filter(x => x.g === 'r').map(x => collCard(x, c)).join('');
  $('#clLeg').innerHTML = COLL.filter(x => x.g === 'l').map(x => collCard(x, c)).join('');
  const done = c.hist.length;
  $('#clNote').textContent = done ? `Пройдено турниров на этом устройстве: ${done}${done >= 30 ? '+' : ''}. Дуэлей всего: ${c.duels || 0}.` : 'Значки появляются после каждого пройденного турнира. Первые — уже в конце твоего.';
}
/* полоска на главном экране */
function collRenderCta(){
  const box = $('#collCta'); if (!box) return;
  const c = collLoad(), n = collCount(c);
  const recent = COLL.filter(x => c.got[x.k]).sort((a, b) => c.got[b.k].at - c.got[a.k].at).slice(0, 6);
  $('#collHex').innerHTML = recent.length
    ? recent.map(x => `<span class="hex ${x.g === 'r' ? 'rare' : x.g === 'l' ? 'leg' : ''}" title="${esc(x.t)}">${x.icon}</span>`).join('')
    : '<span class="hex off">?</span><span class="hex off">?</span><span class="hex off">?</span>';
  $('#collTxt').innerHTML = n ? `Собрано <b>${n}</b> из ${COLL.length}` : `Всего ${COLL.length} ${plural(COLL.length, 'значок', 'значка', 'значков')}: за характер топа, ставки, турниры вдвоём и редкие случаи`;
}

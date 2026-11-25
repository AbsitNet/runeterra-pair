/* ================= Пара из Рунтерры: интерфейс ================= */
const BY = {};
CH.forEach(c => BY[c[0]] = {id:c[0], name:c[1], title:c[2], g:c[3], grp:c[4]});
const img = id => `img/${id}.webp`;
const MIN_N = 8;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const touch = !!(window.matchMedia && matchMedia('(hover: none)').matches);

const PROMPTS = [
  'С кем — на свидание?', 'С кем провести вечер вдвоём?', 'Кому доверишь своё сердце?', 'С кем — в долгое путешествие?',
  'С кем встречать рассветы?', 'Кто ближе тебе как партнёр?', 'С кем жить под одной крышей?', 'Чьё признание ты ждёшь?'
];
const TIERS = [['S','Судьба','--tS'], ['A','Влюб­лён­ность','--tA'], ['B','Симпатия','--tB'], ['C','Дружба','--tC'], ['D','Не мой тип','--tD']];
const EGG = {};
EASTER.forEach(([a,b,t]) => { EGG[a + '|' + b] = t; EGG[b + '|' + a] = t; });

/* ---------- хранилище ---------- */
const store = {
  get(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e){ return null; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
const SOLO_KEY = 'rp-solo-v3';
const roomKey = code => 'rp-room-' + code + '-' + (sess ? sess.slot : 0);
const guessKey = code => 'rp-guess-' + code + '-' + (sess ? sess.slot : 0);
const pbetKey = code => 'rp-pbet-' + code + '-' + (sess ? sess.slot : 0);
const battleKey = code => 'rp-battle-' + code + '-' + (sess ? sess.slot : 0);
const syKey = code => 'rp-sync-' + code + '-' + (sess ? sess.slot : 0);
/* сессия комнаты: в локальном режиме проверки — своя у каждой вкладки */
const sstore = Room.localMode ? {
  get(k){ try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch(e){ return null; } },
  set(k, v){ try { sessionStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { sessionStorage.removeItem(k); } catch(e){} }
} : store;

/* ---------- состояние ---------- */
let S = {cfg:null, dec:[]};          // текущий турнир (свой или для комнаты)
let ctx = 'solo';                     // 'solo' | 'room'
let sess = sstore.get('rp-session');   // {code, slot, token, name}
let roomData = null, online = new Set(), sub = null, pollT = 0, saveT = 0;
let G = null;                         // «Угадай мой выбор»: {target, list, picks:[], done}
let PB = null;                        // ставка на партнёра: {id, on: слот партнёра}
let BT = null;                        // голос в битве вкусов: {key: «пара1|пара2», pick}
let RX = null;                        // последняя отправленная реакция: {to:{seed, idx}, e, at}
let SY = null;                        // общий турнир: {id, host, cfg, v:[[первый голос, переголосовка], …]}
const ui = {screen:'scr-start', cur:null, lock:false, ack:false, toastKey:'', introKey:'', off:new Set(), bet:null, betRoster:null, betRemoved:null, mode:'play', swipeHinted:false};

function validTournament(v){
  return !!(v && v.cfg && v.cfg.v === ENGINE_VERSION && Array.isArray(v.cfg.roster) && v.cfg.roster.length >= MIN_N &&
    v.cfg.roster.every(id => BY[id]) && Array.isArray(v.dec) && v.dec.every(d => d === 0 || d === 1) && MODES[v.cfg.mode]);
}
/* служебный режим проверки, только для разработчика: открывается секретной ссылкой #dev=<ключ>.
   В коде лежит лишь SHA-256 ключа; устройство, где ключ однажды подошёл, запоминается — дальше хватает ?tools */
const DEV_HASH = '855de0401810a660ec22632e2ddd646216b9cab5d7ac543f7873588e09117341';
let TOOLS = false;   // в режиме проверки ничего не сохраняем
let VIEW = null;     // чужой результат по ссылке: {name} — тоже ничего не сохраняем
async function sha256hex(t){
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function devAccess(){
  const qs = new URLSearchParams(location.search), m = location.hash.match(/^#dev=([a-z0-9]{8,64})$/);
  /* убираем следы из адреса в любом случае */
  if (m || qs.has('tools')){ qs.delete('tools'); history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '')); }
  try {
    if (m){
      const ok = await sha256hex(m[1]) === DEV_HASH;
      if (ok) store.set('rp-dev', DEV_HASH);
      return ok;
    }
    return store.get('rp-dev') === DEV_HASH;
  } catch(e){ return false; }
}
function saveLocal(){ if (TOOLS || VIEW) return; store.set(ctx === 'room' && sess ? roomKey(sess.code) : SOLO_KEY, S); if (ctx === 'room') queueSync(); }
function loadFor(c){
  const v = store.get(c === 'room' && sess ? roomKey(sess.code) : SOLO_KEY);
  S = validTournament(v) ? v : {cfg:null, dec:[]};
}
function setCtx(c){ ctx = c; sstore.set('rp-ctx', c); loadFor(c); }

/* ---------- мелочи ---------- */
function show(id){
  const changed = ui.screen !== id;
  document.querySelectorAll('.screen').forEach(s => s.hidden = s.id !== id);
  if (changed && !reduced){ const el = document.getElementById(id); if (el){ el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); } }
  ui.screen = id; document.body.dataset.screen = id; window.scrollTo(0, 0);
  if (id !== 'scr-duel') hideSwipeHint();
  if (id !== 'scr-duel') FX.setLevel(0);
}
let toastT = 0;
function toast(msg, ms = 3200){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
const name = id => BY[id].name;
const verb = (id, f, m) => BY[id].g === 'f' ? f : m;
function plural(n, one, few, many){ const a = n % 10, b = n % 100; return (a === 1 && b !== 11) ? one : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? few : many; }
const duelsWord = n => plural(n, 'дуэль', 'дуэли', 'дуэлей');
const minutes = n => Math.max(1, Math.round(n * 2.5 / 60));
function listNames(ids){ const a = ids.map(name); return a.length > 1 ? a.slice(0, -1).join(', ') + ' и ' + a[a.length - 1] : a.join(''); }
const face = (id, cls = '') => `<img class="${cls}" loading="lazy" alt="" src="${img(id)}">`;

/* ================= главный экран: живое превью дуэли ================= */
/* лорные пары с их вопросами из EASTER; первыми всегда Каин и Рааст */
const HERO = [['Kayn','Rhaast'],['Xayah','Rakan'],['Leona','Diana'],['Caitlyn','Jinx'],['Garen','Katarina'],['Lucian','Senna'],
  ['Sylas','Lux'],['Jayce','Viktor'],['KindredWolf','KindredLamb'],['Sett','Yasuo'],['Leblanc','Swain'],['Kayle','Morgana'],
  ['Aatrox','Rhaast'],['Ashe','Tryndamere'],['Graves','TwistedFate']];
const hero = {pairs:[], k:0, t:0, busy:false};
const heroStill = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function heroInit(){
  const q = (a, b) => (EASTER.find(e => e[0] === a && e[1] === b) || [])[2];
  const list = HERO.filter(([a, b]) => BY[a] && BY[b] && q(a, b)).map(([a, b]) => [a, b, q(a, b)]);
  const rest = list.slice(1);
  for (let i = rest.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  hero.pairs = [list[0], ...rest];
  heroPut(0);
  if (!heroStill()) heroLoop();
}
function heroPut(k){
  const [a, b, q] = hero.pairs[k];
  [[$('#hcA'), a], [$('#hcB'), b]].forEach(([card, id]) => {
    const imgs = card.querySelectorAll('img'), on = card.querySelector('img.on'), next = on === imgs[0] ? imgs[1] : imgs[0];
    next.src = img(id); next.classList.add('on'); if (on) on.classList.remove('on');
    card.querySelector('b').textContent = BY[id].name;
    card.querySelector('small').textContent = BY[id].title;
  });
  $('#heroQ span').textContent = q;
  hero.k = k;
}
function heroLoop(){
  clearTimeout(hero.t);
  hero.t = setTimeout(async () => {
    if (document.hidden || ui.screen !== 'scr-start'){ heroLoop(); return; }
    const k = (hero.k + 1) % hero.pairs.length, [a, b] = hero.pairs[k];
    /* сначала догружаем оба портрета, чтобы смена была без пустых кадров */
    await Promise.all([a, b].map(id => new Promise(res => { const im = new Image(); im.onload = im.onerror = res; im.src = img(id); })));
    const h = $('.hero'); h.classList.add('swap');
    setTimeout(() => { heroPut(k); h.classList.remove('swap'); heroLoop(); }, 360);
  }, 4600);
}

/* ================= установка как приложение ================= */
let installEvt = null;
const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function refreshInstall(){
  const box = $('#installBox'), btn = $('#installBtn'), t = $('#installText');
  if (standalone() || TOOLS || VIEW){ box.hidden = true; return; }
  if (installEvt){
    box.hidden = false; btn.hidden = false;
    t.textContent = 'Тест можно поставить как приложение: своя иконка, открывается на весь экран, а турнир в одиночку работает без интернета.';
  } else if (isIOS()){
    box.hidden = false; btn.hidden = true;
    t.textContent = 'На iPhone тест можно поставить как приложение: в Safari нажми «Поделиться» и выбери «На экран „Домой“». Он будет открываться на весь экран, а турнир в одиночку заработает без интернета.';
  } else box.hidden = true;
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; refreshInstall(); });
window.addEventListener('appinstalled', () => { installEvt = null; refreshInstall(); toast('Готово: иконка появилась на главном экране'); });
function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  const go = () => navigator.serviceWorker.register('sw.js').catch(() => {});
  document.readyState === 'complete' ? go() : window.addEventListener('load', go);
}

/* ================= мини-турниры по темам ================= */
const NEW_SINCE_2019 = ['Qiyana','Senna','Aphelios','Sett','Yone','Samira','Seraphine','Rell','Viego','Gwen','Akshan','Zeri','Renata','Belveth','Nilah','KSante','Naafiri','Briar','Hwei','Aurora','Ambessa','Mel','Yunara','Zaahen','Locke'];
/* порядок не менять: номер темы хранится в ссылке на результат; новые темы — только в конец */
const THEMES = [
  ['ion',  'Иония',           'Чемпионы из Ионии',                      id => PROFILE[id][0] === 'ion',  ['Ahri','Yasuo','Irelia']],
  ['nox',  'Ноксус',          'Чемпионы из Ноксуса',                    id => PROFILE[id][0] === 'nox',  ['Katarina','Darius','Swain']],
  ['dem',  'Демасия',         'Чемпионы из Демасии',                    id => PROFILE[id][0] === 'dem',  ['Lux','Garen','Fiora']],
  ['pz',   'Пилтовер и Заун', 'Город прогресса и его нижний город',     id => ['pil','zau'].includes(PROFILE[id][0]), ['Jinx','Jayce','Caitlyn']],
  ['dark', 'Злодеи',          'Опасные, порочные и загадочные',         id => PROFILE[id][2] === 'dark', ['Evelynn','Thresh','Leblanc']],
  ['mg',   'Маги',            'Все, кто колдует',                       id => PROFILE[id][1] === 'mg',   ['Syndra','Xerath','Seraphine']],
  ['as',   'Убийцы',          'Быстрые, тихие и смертельно обаятельные', id => PROFILE[id][1] === 'as', ['Akali','Zed','Qiyana']],
  ['new',  'Новые чемпионы',  'Вышли в 2019 году и позже',              id => NEW_SINCE_2019.includes(id), ['Aurora','Viego','Mel']]
];
const MINI_N = 16;
const themeOf = k => THEMES.find(t => t[0] === k);
function themePool(k){ const t = themeOf(k); return t ? pool(settings()).filter(t[3]) : []; }
function renderMinis(){
  const mode = settings().mode;
  $('#miniGrid').innerHTML = THEMES.map(([k, t, d, , pics]) => {
    const ids = themePool(k), n = Math.min(MINI_N, ids.length), ok = n >= MIN_N;
    const faces = pics.filter(id => ids.includes(id)).concat(ids.filter(id => !pics.includes(id))).slice(0, 3);
    return `<button type="button" class="mini" data-k="${k}" ${ok ? '' : 'disabled'}>
      <span class="mini-faces" aria-hidden="true">${faces.map(id => face(id)).join('')}</span>
      <b>${esc(t)}</b><small>${esc(d)}</small>
      <small class="mini-n">${ok ? `${n} ${plural(n,'участник','участника','участников')} · ~${minutes(estimate(n, mode))} мин` : 'Мало участников при этих настройках'}</small></button>`;
  }).join('');
}
function startMini(k){
  const ids = themePool(k); if (ids.length < MIN_N) return;
  for (let i = ids.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const roster = ids.slice(0, MINI_N).sort((a, b) => IDX[a] - IDX[b]);   // порядок как в составе — так его однозначно восстановит ссылка
  openBet(roster, [], false, k);
}

/* ================= старт ================= */
function settings(){
  return {
    who: document.querySelector('input[name=who]:checked').value,
    extra: $('#extra').checked,
    mode: document.querySelector('input[name=mode]:checked').value,
    pre: $('#prefilter').checked
  };
}
function pool(s){ return CH.filter(c => (s.extra || c[4] === 'core') && (s.who === 'all' || c[3] === s.who)).map(c => c[0]); }
function refreshStart(){
  const s = settings();
  ['all','m','f'].forEach(w => $('#cnt-' + w).textContent = pool({...s, who:w}).length);
  const n = pool(s).length;
  ['fast','normal','deep'].forEach(m => { const t = estimate(n, m); $('#est-' + m).innerHTML = `≈ ${t} ${duelsWord(t)}<br>~${minutes(t)} мин`; });
  $('#startNote').textContent = s.pre ? 'После чистки дуэлей станет меньше.' : (S.cfg ? 'Новый турнир заменит сохранённый.' : '');
  const banner = $('#roomBanner');
  if (ctx === 'room' && sess){
    banner.hidden = false;
    banner.innerHTML = `Турнир пойдёт в зачёт комнаты <b>${esc(sess.code)}</b>. <button class="btn ghost" type="button" id="soloBtn" style="margin-left:8px">Играть без комнаты</button>`;
    $('#soloBtn').onclick = () => { setCtx('solo'); refreshStart(); };
  } else banner.hidden = true;
  const r = $('#resume');
  if (S.cfg){
    const m = simulate(S.cfg, S.dec);
    r.hidden = false;
    if (m.kind === 'done'){ $('#resumeText').innerHTML = `Прошлый турнир завершён. Твоя пара: <b>${esc(name(m.champ))}</b>.`; $('#resumeBtn').textContent = 'Открыть результат'; }
    else { $('#resumeText').innerHTML = `Есть незаконченный турнир: позади <b>${m.played}</b> из примерно ${m.est} ${duelsWord(m.est)}.`; $('#resumeBtn').textContent = 'Продолжить'; }
  } else r.hidden = true;
  refreshRoomBox();
  refreshInstall();
  renderMinis();
  svRenderCta();
}
function startFlow(){
  ui.betTheme = null;
  const s = settings();
  if (s.pre) return openFilter();
  openBet(pool(s), []);
}

/* ================= чистка состава ================= */
function openFilter(){
  const ids = pool(settings());
  ui.off = new Set();
  const g = $('#fgrid'); g.innerHTML = '';
  ids.forEach(id => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gcard'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `${face(id)}<span>${esc(BY[id].name)}</span>`;
    b.title = `${BY[id].name} — ${BY[id].title}`;
    b.addEventListener('click', () => {
      ui.off.has(id) ? ui.off.delete(id) : ui.off.add(id);
      b.classList.toggle('off', ui.off.has(id)); b.setAttribute('aria-pressed', String(ui.off.has(id)));
      refreshFilter();
    });
    g.appendChild(b);
  });
  show('scr-filter'); refreshFilter();
}
function refreshFilter(){
  const ids = pool(settings()), left = ids.length - ui.off.size, t = estimate(Math.max(left, MIN_N), settings().mode);
  $('#fcnt').innerHTML = `В турнире: <b>${left}</b> · убрано: ${ui.off.size} · ≈ ${t} ${duelsWord(t)}`;
  $('#fstart').disabled = left < MIN_N;
  $('#fstart').textContent = left >= MIN_N ? `Дальше (${left})` : `Нужно минимум ${MIN_N}`;
}

/* ================= ставка ================= */
function betTexts(forPartner){
  ui.betFor = forPartner ? 'partner' : null;
  $('#betEyebrow').textContent = forPartner ? 'Ставка на партнёра' : 'Ставка на старте';
  $('#betTitle').innerHTML = forPartner ? 'Кто станет парой партнёра?' : 'Кто, <span class="nowrap">по-твоему,</span> победит?';
  $('#betText').textContent = forPartner ? 'Выбери, кто, по-твоему, окажется на первом месте у партнёра. Ставки принимаются, пока партнёр не вышел в плей-офф. Партнёр увидит ставку только после своего финала, а итог будет на экране сравнения.' : 'Выбери того, кого сердце называет заранее. В конце узнаешь, сработала ли интуиция.';
  $('#bskip').textContent = forPartner ? 'Отмена' : 'Без ставки';
  $('#bstart').textContent = forPartner ? 'Поставить' : 'Начать турнир';
}
function openBet(roster, removed, forPartner, theme){
  betTexts(forPartner);
  ui.betTheme = forPartner ? null : theme || null;
  if (ui.betTheme) $('#betEyebrow').textContent = `Мини-турнир «${themeOf(ui.betTheme)[1]}»`;
  ui.betRoster = roster; ui.betRemoved = removed; ui.bet = null;
  const g = $('#bgrid'); g.innerHTML = '';
  roster.forEach(id => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gcard'; b.dataset.id = id; b.dataset.q = BY[id].name.toLowerCase();
    b.innerHTML = `${face(id)}<span>${esc(BY[id].name)}</span>`;
    b.title = `${BY[id].name} — ${BY[id].title}`;
    b.addEventListener('click', () => {
      ui.bet = ui.bet === id ? null : id;
      g.querySelectorAll('.gcard').forEach(x => x.classList.toggle('sel', x.dataset.id === ui.bet));
      $('#bcnt').innerHTML = ui.bet ? `Ставка: <b>${esc(name(ui.bet))}</b>` : 'Ставка не выбрана';
      $('#bstart').disabled = !ui.bet;
    });
    g.appendChild(b);
  });
  $('#betSearch').value = ''; $('#bcnt').textContent = 'Ставка не выбрана'; $('#bstart').disabled = true;
  show('scr-bet');
  if (forPartner && PB && roster.includes(PB.id)) g.querySelector(`[data-id="${PB.id}"]`).click();
}
function newTournament(roster, removed, bet){
  const s = settings();
  S = {cfg:{v:ENGINE_VERSION, who:s.who, extra:s.extra, mode:s.mode, seed:(Math.random() * 4294967296) >>> 0, roster, removed, bet:bet || null}, dec:[]};
  if (ui.betTheme) S.cfg.theme = ui.betTheme;
  ui.ack = false; ui.toastKey = ''; ui.introKey = ''; ui.mode = 'play';
  saveLocal(); preloadAll(roster); go();
}

/* ================= ход турнира ================= */
function go(){
  ui.mode = 'play';
  const m = simulate(S.cfg, S.dec);
  ui.cur = m;
  if (m.kind === 'done') return renderResult(m);
  if (m.stage === 'ub' && m.first && !ui.ack) return renderInter(m);
  const key = m.label + ':' + m.k;
  if (m.level && m.k === 0 && ui.introKey !== key){
    ui.introKey = key;
    const title = m.stage === 'final' ? 'Гранд-финал' : m.stage === 'lb' ? 'Финал сетки второго шанса' : m.label.includes('Финал') ? 'Финал сетки победителей' : m.label.includes('четвертьфинал') ? 'Четвертьфинал' : 'Полуфинал';
    const sub = m.stage === 'final' ? `${name(m.a)} или ${name(m.b)}` : m.of > 1 ? `${m.of} ${duelsWord(m.of)} · ${m.stage === 'ub' ? 'сетка победителей' : 'сетка второго шанса'}` : 'Одна дуэль решит, кто пройдёт дальше';
    show('scr-duel'); renderDuel(m, true);
    FX.setLevel(m.level);
    FX.intro(m.level, title, sub).then(() => {});
    return;
  }
  renderDuel(m);
}
function stageLabel(m){
  if (m.stage === 'swiss') return `Отбор · круг ${m.round} из ${m.R}`;
  if (m.stage === 'battle') return `Битвы за место · раунд ${m.round}`;
  if (m.stage === 'dispute') return `Спорные места · ${m.line}`;
  return m.label;
}
function setCard(i, id){
  const c = BY[id], p = PROFILE[id], im = $('#img' + i);
  im.classList.remove('broken'); im.src = img(id); im.alt = c.name;
  $('#nm' + i).textContent = c.name;
  $('#tt' + i).textContent = c.title;
  $('#ds' + i).textContent = p[3];
  const card = $('#card' + i); card.className = 'pick'; card.style.transform = '';
  card.setAttribute('aria-label', `Выбрать: ${c.name}, ${c.title}. ${p[3]}`);
  fitName($('#nm' + i));
}
/* имя не рвём посреди слова: если самое длинное слово не влезает, уменьшаем шрифт */
function fitName(el){
  el.style.fontSize = '';
  if (!el.clientWidth) return;
  let fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
  while (el.scrollWidth > el.clientWidth + 1 && fs > 12 && n++ < 40){ fs -= 1; el.style.fontSize = fs + 'px'; }
}
let fitT = 0;
const refitNames = () => { if (ui.screen === 'scr-duel'){ fitName($('#nm0')); fitName($('#nm1')); } };
window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(refitNames, 120); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(refitNames);
function renderDuel(m, silent){
  if (ui.screen !== 'scr-duel') show('scr-duel');
  $('#stage').textContent = stageLabel(m);
  $('#counter').textContent = (m.of > 1 ? `Дуэль ${m.k + 1} из ${m.of}` : 'Решающая дуэль') + ` · всего ${m.played} из ≈${m.est}`;
  $('#barFill').style.width = Math.min(99.5, 100 * m.played / m.est).toFixed(2) + '%';
  const egg = EGG[m.a + '|' + m.b], p = $('#prompt'), sp = $('#subprompt');
  p.classList.toggle('final', m.stage === 'final');
  p.classList.toggle('egg', !!egg && m.stage !== 'final');
  if (m.stage === 'final'){ p.textContent = 'Гранд-финал. Кто твоя пара?'; sp.hidden = !egg; sp.textContent = egg || ''; }
  else { p.textContent = egg || ((m.stage === 'lb' && m.last) ? 'Кто выйдет в гранд-финал?' : PROMPTS[m.played % PROMPTS.length]); sp.hidden = true; }
  setCard(0, m.a); setCard(1, m.b);
  const ar = $('#arena');
  ar.className = 'arena' + (m.level ? ' lv' + m.level : '');
  void ar.offsetWidth; ar.classList.add('enter');
  FX.setLevel(m.level || 0);
  $('#undoBtn').hidden = false; $('#undoBtn').disabled = S.dec.length === 0;
  $('#bracketBtn').hidden = !['ub','lb','final'].includes(m.stage);
  $('#reveal').textContent = ''; $('#reveal').className = 'reveal';
  renderPartnerChip();
  if (!silent){
    const tk = m.stage + ':' + (m.round || m.label);
    if (m.k === 0 && ui.toastKey !== tk){
      ui.toastKey = tk;
      if (m.stage === 'swiss' && m.round > 1) toast(`Круг ${m.round}: теперь встречаются чемпионы с похожим счётом`);
      else if (m.stage === 'battle' && m.round === 1) toast('Битвы за место: дальше дерутся только те, чьё место ещё не ясно');
      else if (m.stage === 'dispute' && m.round === 1) toast('Спорные места: решаем, кто окажется выше границы тира');
      else if (m.stage === 'lb' && /раунд 1$/.test(m.label)) toast('Сетка второго шанса: проигравшие продолжают борьбу');
    }
    if (touch && !ui.swipeHinted && !store.get('rp-swipe-hint')){ ui.swipeHinted = true; store.set('rp-swipe-hint', 1); showSwipeHint(); }
  }
  preloadNext();
}
function preloadNext(){
  [0,1].forEach(d => { const n = simulate(S.cfg, S.dec.concat(d)); if (n.kind === 'duel'){ new Image().src = img(n.a); new Image().src = img(n.b); } });
}
function preloadAll(ids){ ids.forEach((id, i) => setTimeout(() => { new Image().src = img(id); }, 300 + i * 30)); }

function cardCenter(i){ const r = $('#card' + i).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * .42]; }
function pick(side){
  if (ui.lock || ui.screen !== 'scr-duel' || !ui.cur || ui.cur.kind !== 'duel') return;
  if (ui.mode === 'guess') return guessPick(side);
  if (ui.mode === 'battle') return battlePick(side);
  if (ui.mode === 'sync') return syncPick(side);
  ui.lock = true; hideSwipeHint();
  const m = ui.cur, cards = [$('#card0'), $('#card1')];
  cards.forEach(c => c.style.transform = '');
  cards[side].classList.add('chosen'); cards[1 - side].classList.add('lost');
  Sound.pick(m.level);
  if (m.level) FX.burst(...cardCenter(side), m.level);
  const final = m.stage === 'final';
  if (final){ Sound.fanfare(); FX.celebrate(); }
  $('#undoBtn').disabled = false;   // пока выбор не записан, его можно отменить
  ui.pickT = setTimeout(() => { ui.pickT = 0; S.dec.push(side); saveLocal(); ui.lock = false; if (ui.screen === 'scr-duel') go(); }, reduced ? 80 : final ? 1100 : m.level ? 520 : 340);
}
function undo(){
  if (ui.mode !== 'play') return;
  /* «Назад» сразу после нажатия: выбор ещё не записан — просто отменяем его и остаёмся на этой же паре */
  if (ui.pickT){ clearTimeout(ui.pickT); ui.pickT = 0; ui.lock = false; go(); return; }
  if (ui.lock || !S.dec.length) return;
  S.dec.pop(); saveLocal();
  const m = simulate(S.cfg, S.dec);
  if (m.kind === 'duel' && ['swiss','battle','dispute'].includes(m.stage)) ui.ack = false;
  ui.introKey = '';
  go();
}

/* свайпы на телефоне */
let hintT = 0;
function showSwipeHint(){ const h = $('#swipeHint'); h.hidden = false; h.classList.remove('out'); clearTimeout(hintT); hintT = setTimeout(hideSwipeHint, 6000); }
function hideSwipeHint(){
  const h = $('#swipeHint'); if (h.hidden) return;
  clearTimeout(hintT); h.classList.add('out'); hintT = setTimeout(() => { h.hidden = true; h.classList.remove('out'); }, 300);
}
/* карта дуэли чуть наклоняется за курсором мыши, по ней бежит блик */
function bindTilt(){
  if (reduced || !(window.matchMedia && matchMedia('(hover: hover)').matches)) return;
  [0, 1].forEach(i => {
    const c = $('#card' + i);
    c.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || c.classList.contains('chosen') || c.classList.contains('lost')) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.classList.add('tilting');
      c.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - y) * 5).toFixed(2) + 'deg');
      c.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    });
    c.addEventListener('pointerleave', () => { c.classList.remove('tilting'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });
}
function bindSwipe(){
  const ar = $('#arena'); let x0 = null, y0 = 0, dx = 0, moved = false;
  ar.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; x0 = e.clientX; y0 = e.clientY; dx = 0; moved = false; hideSwipeHint(); });
  ar.addEventListener('pointermove', e => {
    if (x0 === null) return;
    dx = e.clientX - x0; const dy = e.clientY - y0;
    if (!moved && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) { moved = true; ar.classList.add('swiping'); }
    if (!moved) return;
    const side = dx > 0 ? 1 : 0, k = Math.min(1, Math.abs(dx) / 90);
    [0,1].forEach(i => { const c = $('#card' + i); c.style.transform = i === side ? `translateY(${-6 * k}px) scale(${1 + .03 * k})` : `scale(${1 - .03 * k})`; c.classList.toggle('lean', i === side && k >= 1); });
  });
  const end = () => {
    if (x0 === null) return;
    const was = moved; x0 = null; ar.classList.remove('swiping');
    [0,1].forEach(i => { const c = $('#card' + i); c.classList.remove('lean'); });
    if (was && Math.abs(dx) >= 90){ ui.swallowClick = true; pick(dx > 0 ? 1 : 0); setTimeout(() => ui.swallowClick = false, 400); }
    else { [0,1].forEach(i => $('#card' + i).style.transform = ''); if (was){ ui.swallowClick = true; setTimeout(() => ui.swallowClick = false, 400); } }
  };
  ar.addEventListener('pointerup', end); ar.addEventListener('pointercancel', end);
}

/* ================= перед плей-офф ================= */
function renderInter(m){
  show('scr-inter');
  $('#interTitle').textContent = `В плей-офф выходят ${m.P}`;
  $('#interText').textContent = `Лучшие по рейтингу всех дуэлей. Плей-офф с двойным выбыванием: после первого поражения чемпион уходит в сетку второго шанса и продолжает бороться, вылетает только после второго. Впереди ${2 * m.P - 1} ${duelsWord(2 * m.P - 1)} вместе с гранд-финалом. Четвертьфинал, полуфинал и гранд-финал — с эффектами и звуком.`;
  $('#seedgrid').innerHTML = m.seeds.map((id, i) => `<div class="seed">${face(id)}<i>${i + 1}</i><span>${esc(BY[id].name)}</span></div>`).join('');
}

/* ================= сетка плей-офф ================= */
function bracketHTML(list, current){
  const by = side => { const r = {}; list.filter(x => x.side === side).forEach(x => (r[x.round] = r[x.round] || []).push(x)); return r; };
  const box = (x, extra = '') => `<div class="bm ${extra}">` + [x.a, x.b].map(id => `<div class="${x.w === id ? 'w' : ''}">${face(id)}<span>${esc(name(id))}</span></div>`).join('') + '</div>';
  const now = current && ['ub','lb','final'].includes(current.stage) ? `<div class="bm now">${[current.a, current.b].map(id => `<div>${face(id)}<span>${esc(name(id))}</span></div>`).join('')}</div>` : '';
  const side = (key, title) => {
    const rounds = by(key), keys = Object.keys(rounds).map(Number).sort((a,b) => a - b);
    const curHere = current && ((key === 'ub' && current.stage === 'ub') || (key === 'lb' && current.stage === 'lb') || (key === 'gf' && current.stage === 'final'));
    if (!keys.length && !curHere) return '';
    const cols = keys.map(k => `<div class="br-col"><small>${esc(rounds[k][0].name)}</small>${rounds[k].map(x => box(x, key === 'gf' ? 'gf' : '')).join('')}</div>`);
    if (curHere) cols.push(`<div class="br-col"><small>Сейчас</small>${now}</div>`);
    return `<div class="br-side"><h4>${title}</h4><div class="br-cols">${cols.join('')}</div></div>`;
  };
  const html = side('ub', 'Сетка победителей') + side('lb', 'Сетка второго шанса') + side('gf', 'Гранд-финал');
  return html ? `<div class="bracket">${html}</div>` : '<p class="muted">Плей-офф ещё не начался.</p>';
}
function openModal(html){ $('#modalBody').innerHTML = html; $('#modal').hidden = false; $('#modalClose').focus(); }
function closeModal(){ $('#modal').hidden = true; }
function openProfile(id){
  const c = BY[id], p = PROFILE[id], place = ui.cur && ui.cur.order ? ui.cur.order.indexOf(id) + 1 : 0;
  openModal(`<div class="prof">${face(id)}<div><p class="eyebrow">${place ? place + '-е место' : ''}</p><h3>${esc(c.name)}</h3><p class="muted">${esc(c.title)}</p>
    <div class="tags"><span>${esc(REGIONS[p[0]][0])}</span><span>${esc(CLASSES[p[1]][0])}</span><span>${esc(ARCH[p[2]][0])}</span></div>
    <p>${esc(p[4])}</p><p class="no">Почему может не сложиться: ${esc(p[5])}</p></div></div>`);
}

/* ================= итоги ================= */
function renderResult(m){
  show('scr-result'); FX.setLevel(0);
  const rk = S.cfg ? S.cfg.seed + ':' + m.champ : '';
  if (rk !== ui.revealKey && !reduced){ ui.revealKey = rk; const wn = $('#scr-result .winner'); wn.classList.remove('unveil'); void wn.offsetWidth; wn.classList.add('unveil'); }
  const w = BY[m.champ], pr = PROFILE[m.champ], V = !!VIEW;
  const th = S.cfg.theme && themeOf(S.cfg.theme);
  $('#wEyebrow').textContent = (V ? (VIEW.name ? `Выбор ${VIEW.name}` : 'Результат по ссылке') : th ? 'Твоя пара' : 'Твоя пара в Рунтерре') + (th ? ` · мини-турнир «${th[1]}»` : '');
  $('#typajH').textContent = V ? 'Типаж' : 'Твой типаж';
  if (V && VIEW.name) $('#certName').value = VIEW.name;
  $('#wImg').src = img(w.id); $('#wImg').alt = w.name;
  $('#wName').textContent = w.name; $('#wTitle').textContent = w.title;
  $('#wLong').textContent = pr[4];
  const q = quoteOf(m.champ), wq = $('#wQuote');
  wq.hidden = !q;
  if (q){
    wq.querySelector('p').innerHTML = q.lines.map(l => `<span>«${esc(l)}»</span>`).join('');
    wq.querySelector('cite').textContent = q.by ? `— ${q.by}` : '';
  }
  const beat = [...new Set(m.st[w.id].beat)].filter(id => id !== m.runner), lost = [...new Set(m.st[w.id].lost)], shown = beat.slice(-8);
  let path = '';
  if (shown.length) path += `По дороге к победе ${verb(w.id,'оказалась','оказался')} сильнее, чем ${listNames(shown)}${beat.length > shown.length ? ' и другие' : ''}. `;
  if (lost.length) path += `Сильнее ${lost.length > 1 ? 'были' : verb(lost[0],'была','был')} только ${listNames(lost)}, но второй шанс всё решил. `;
  path += `${verb(m.runner,'Последней соперницей','Последним соперником')} в гранд-финале ${verb(m.runner,'была','был')} ${name(m.runner)}.`;
  $('#wPath').textContent = path;
  const bl = $('#betLine');
  if (S.cfg.bet && BY[S.cfg.bet]){
    const place = m.order.indexOf(S.cfg.bet) + 1;
    bl.hidden = false;
    bl.innerHTML = `${face(S.cfg.bet)}<span>Ставка: <b>${esc(name(S.cfg.bet))}</b> — ${S.cfg.bet === m.champ ? 'интуиция сработала!' : place ? `${place}-е место` : 'убран(а) до турнира'}</span>`;
  } else bl.hidden = true;
  $('#podium').innerHTML = [[1,'2-е место'],[2,'3-е место']].filter(([i]) => m.order[i]).map(([i, lab]) => `<div class="pod">${face(m.order[i])}<div><small>${lab}</small><b>${esc(name(m.order[i]))}</b></div></div>`).join('');

  const badges = achievements(m, S.cfg);
  $('#badgesSec').hidden = !badges.length;
  $('#badges').innerHTML = badges.map(b => `<div class="badge"><span class="hex" aria-hidden="true">${b.icon}</span><div><b>${esc(b.t)}</b><small>${esc(b.d)}</small></div></div>`).join('');

  const pf = profileOf(m.order), A = ARCH[pf.arch];
  $('#typaj').innerHTML = `<div><p class="eyebrow">${V ? 'Типаж' : 'Твой типаж'}</p><h3>${esc(A[0])}</h3><p style="margin-top:12px">${esc(A[1])}</p>
      ${pf.archSecond ? `<p class="muted" style="margin-top:10px">${V ? 'Ещё близко' : 'Ещё тебе близко'}: ${esc(ARCH[pf.archSecond][0].toLowerCase())}.</p>` : ''}
      ${pf.archWorst ? `<p class="muted">${V ? 'Совсем не то' : 'Совсем не твоё'}: ${esc(ARCH[pf.archWorst][0].toLowerCase())}.</p>` : ''}</div>
    <div class="facts">
      <div class="fact"><small>Самые яркие примеры в ${V ? 'топе' : 'твоём топе'}</small><b>${pf.archTop.length ? esc(listNames(pf.archTop)) : '—'}</b>${pf.archTop.length ? `<div class="faces">${pf.archTop.map(id => face(id)).join('')}</div>` : ''}</div>
      <div class="fact"><small>Любимый край</small><b>${esc(REGIONS[pf.region][0])}: ${pf.regionTop.length} в топ-15</b><div class="faces">${pf.regionTop.map(id => face(id)).join('')}</div></div>
      <div class="fact"><small>Любимый класс</small><b>${V ? esc(CLASSES[pf.cls][0]) : 'Ты выбираешь ' + esc(CLASSES[pf.cls][1])}</b><div class="faces">${pf.clsTop.map(id => face(id)).join('')}</div></div>
    </div>`;

  const t = $('#tiers'); t.innerHTML = `<h2>${V ? 'Тир-лист' : 'Твой тир-лист'}</h2>`;
  const sizes = tierSizesOf(m); let pos = 0;
  TIERS.forEach(([L, label, tok], ti) => { t.appendChild(tierRow(L, label, tok, m.order.slice(pos, pos + sizes[ti]), pos)); pos += sizes[ti]; });
  const removed = (S.cfg.removed || []).filter(id => BY[id]);
  if (removed.length) t.appendChild(tierRow('—', 'Сразу мимо', '--tX', removed, -1, true));

  $('#anti').innerHTML = antiTop(m.order).map(id => `<div class="card">${face(id)}<span class="stamp">НИ ЗА ЧТО</span><div class="txt"><b>${esc(name(id))}</b><p>${esc(PROFILE[id][5])}</p></div></div>`).join('');
  $('#bracketRes').innerHTML = bracketHTML(m.bracket);
  $('#copyFallback').hidden = true;
  $('#toRoomBtn').hidden = V || !(ctx === 'room' && sess);
  $('#selfBtn').hidden = !V; $('#shareBtn').hidden = V; $('#newBtn').hidden = V; $('#refinalBtn').hidden = V;
  $('#method').textContent = `${th ? `Мини-турнир «${th[1]}» на ${m.order.length} ${plural(m.order.length,'участника','участников','участников')}. ` : ''}Режим «${MODES[S.cfg.mode].label}», ${m.total} ${duelsWord(m.total)}: ${m.R} ${plural(m.R,'круг','круга','кругов')} отбора, ${MODES[S.cfg.mode].L ? 'короткие битвы за выход в плей-офф' : 'битвы за место'}${MODES[S.cfg.mode].D ? ', спорные места' : ''} и плей-офф с двойным выбыванием на ${m.P}. Первые ${m.P} мест решены плей-офф, остальные стоят по рейтингу всех дуэлей с учётом силы соперников; если соседи по списку встречались, выше стоит победитель. ${V ? 'Результат открыт по ссылке и в этом браузере не сохраняется.' : 'Результат сохранён в этом браузере.'}`;
  drawCertPreview();
  renderMuCta(m);
  renderHeartMap(m);
  renderGlobalStats(m);
}
/* ================= взаимность: победитель задаёт вопросы, а ты отвечаешь ================= */
const MU_AX = ['brave','loyal','free','calm','fun','mind','dark','power'];
/* чего каждый типаж ждёт от пары */
const MU_PREF = {
  knight:{loyal:3, brave:2, calm:1}, dark:{dark:3, brave:2, free:1, power:1}, rebel:{free:3, brave:2, fun:2},
  sage:{calm:3, mind:2, loyal:1}, ruler:{power:3, loyal:2, mind:1}, joy:{fun:3, free:2, loyal:1},
  tragic:{loyal:3, calm:2, dark:1}, wild:{free:3, brave:2, dark:1}, mind:{mind:3, calm:1, power:2}
};
const MU_Q = [
  {q:() => 'Какое свидание тебе по душе?', o:[
    ['Ночная вылазка туда, куда нельзя', {brave:2, dark:1, free:1}], ['Тихий вечер и разговор до утра', {calm:2, loyal:1}],
    ['Шумный праздник и танцы до упаду', {fun:2, free:1}], ['Библиотека, музей или мастерская изобретателя', {mind:2, calm:1}]]},
  {q:id => `Я ${verb(id,'попала','попал')} в беду. Что ты сделаешь?`, o:[
    ['Брошусь на помощь, не раздумывая', {brave:2, loyal:1}], ['Составлю план и вытащу тебя с умом', {mind:2, power:1}],
    ['Буду рядом, что бы ни случилось', {loyal:2, calm:1}], ['Соберу друзей — вместе прорвёмся', {fun:2, loyal:1}]]},
  {q:() => 'Что для тебя важнее всего?', o:[
    ['Свобода', {free:2, brave:.5}], ['Верность', {loyal:2, calm:.5}], ['Сила и влияние', {power:2, brave:.5}], ['Знание', {mind:2, calm:.5}]]},
  {q:() => 'А если я покажу тебе свою тёмную сторону?', o:[
    ['Скажу, что она мне нравится', {dark:2, brave:1}], ['Приму тебя целиком, со всеми шрамами', {calm:2, loyal:1}],
    ['Помогу с ней справиться', {loyal:2, mind:1}], ['Покажу свою — у меня она не хуже', {fun:1, free:1, dark:1}]]},
  {q:() => 'Мы поспорили. Что дальше?', o:[
    ['Спорю до победы', {power:2, brave:1}], ['Ищу компромисс', {calm:1, loyal:1, mind:1}],
    ['Отшучусь — и мы уже смеёмся', {fun:2}], ['Уйду проветриться и вернусь, когда остыну', {free:2, calm:1}]]},
  {q:() => 'Где мы будем жить вместе?', o:[
    ['В шумном городе, где всё время что-то происходит', {mind:1, fun:1, power:1}, ['pil','zau','bil']],
    ['На краю света, только мы и дикая природа', {free:2, brave:1}, ['frl','ixt','void','sha']],
    ['Во дворце, поближе к власти', {power:2, dark:.5}, ['nox','dem','shu']],
    ['В тихом месте среди гор или у моря', {calm:2}, ['ion','tar']]]},
  {q:() => 'Какой подарок ты мне сделаешь?', o:[
    ['Оружие ручной работы', {brave:1, power:1}], ['Письмо, написанное от руки', {loyal:1, calm:1}],
    ['Билеты в неизвестность', {free:1, fun:1}], ['Редкую книгу или чертёж', {mind:2}]]}
];
const muVec = o => MU_AX.map(a => o[a] || 0);
function muCos(u, p){ let d = 0, a = 0, b = 0; for (let i = 0; i < u.length; i++){ d += u[i] * p[i]; a += u[i] * u[i]; b += p[i] * p[i]; } return a && b ? d / Math.sqrt(a * b) : 0; }
function muScore(id, ans){
  const pr = PROFILE[id] || [], p = muVec(MU_PREF[pr[2]] || MU_PREF.sage), u = MU_AX.map(() => 0), best = MU_AX.map(() => 0);
  MU_Q.forEach((q, i) => {
    muVec(q.o[ans[i]][1]).forEach((v, k) => u[k] += v);
    const sc = q.o.map(o => muCos(muVec(o[1]), p)); muVec(q.o[sc.indexOf(Math.max(...sc))][1]).forEach((v, k) => best[k] += v);
  });
  const r = Math.min(1, muCos(u, p) / (muCos(best, p) || 1));
  const home = MU_Q[5].o[ans[5]][2] || [], bonus = home.includes(pr[0]) ? 6 : 0;
  /* какой ответ понравился больше всего и какой меньше */
  const each = ans.map((a, i) => muCos(muVec(MU_Q[i].o[a][1]), p));
  const hi = each.indexOf(Math.max(...each)), lo = each.indexOf(Math.min(...each));
  return {pct:Math.min(99, Math.round(28 + 71 * Math.pow(r, 1.1)) + bonus), hi, lo, home:!!bonus};
}
function muVerdict(id, pct){
  const N = name(id);
  if (pct >= 90) return ['Взаимно!', `${N} ${verb(id,'выбрала','выбрал')} бы тебя в ответ — без единого сомнения.`];
  if (pct >= 75) return ['Почти взаимно', `${N} явно к тебе ${verb(id,'неравнодушна','неравнодушен')}. Ещё пара свиданий — и всё сложится.`];
  if (pct >= 55) return ['Есть искра', `${N} к тебе присматривается. Искра есть, но ${verb(id,'ей','ему')} нужно время.`];
  return ['Пока безответно', `${N} пока не ${verb(id,'уверена','уверен')}, что вы пара. Но сердце не всегда слушает ответы на вопросы.`];
}
const mu = {ans:[], champ:null, back:null};
function renderMuCta(m){
  const box = $('#muCta');
  if (VIEW){ box.hidden = true; return; }
  const r = S.mutual && S.mutual.champ === m.champ ? S.mutual : null, N = esc(name(m.champ));
  box.hidden = false;
  box.innerHTML = r
    ? `<p>Взаимность: <b>${r.pct}%</b> — ${esc(muVerdict(m.champ, r.pct)[0].toLowerCase().replace(/([^!?])$/, '$1.'))}</p><button class="btn ghost" type="button" id="muGo">Ответить заново</button>`
    : `<p><b>А это взаимно?</b> ${N} задаст тебе семь вопросов.</p><button class="btn" type="button" id="muGo">Узнать</button>`;
  $('#muGo').addEventListener('click', () => startMutual(m.champ));
}
function startMutual(id){
  mu.champ = id; mu.ans = [];
  show('scr-mutual'); FX.setLevel(0);
  const im = $('#muImg'); im.src = img(id); im.alt = name(id);
  renderMutual();
}
function renderMutual(){
  const id = mu.champ, i = mu.ans.length, body = $('#muBody');
  if (i >= MU_Q.length) return renderMutualResult();
  const q = MU_Q[i];
  body.innerHTML = `<p class="eyebrow">Взаимность · вопрос ${i + 1} из ${MU_Q.length}</p>
    <div class="bar" aria-hidden="true"><i style="width:${(100 * i / MU_Q.length).toFixed(1)}%"></i></div>
    <p class="mu-who">${face(id)}${esc(name(id))} спрашивает</p>
    <h2 class="mu-q">${esc(q.q(id))}</h2>
    <div class="mu-opts">${q.o.map((o, k) => `<button class="mu-opt" type="button" data-k="${k}"><i>${k + 1}</i><span>${esc(o[0])}</span></button>`).join('')}</div>
    <div class="res-actions"><button class="btn ghost" type="button" id="muBack">${i ? 'Назад' : 'К итогам'}</button></div>`;
  body.querySelectorAll('.mu-opt').forEach(b => b.addEventListener('click', () => muAnswer(+b.dataset.k)));
  $('#muBack').addEventListener('click', () => { if (mu.ans.length){ mu.ans.pop(); renderMutual(); } else go(); });
}
function muAnswer(k){
  if (mu.lock) return;
  const b = $(`#muBody .mu-opt[data-k="${k}"]`); if (!b) return;
  mu.lock = true; b.classList.add('on'); Sound.pick(0);
  setTimeout(() => { mu.lock = false; mu.ans.push(k); renderMutual(); }, reduced ? 60 : 260);
}
function renderMutualResult(){
  const id = mu.champ, r = muScore(id, mu.ans), [title, text] = muVerdict(id, r.pct), N = name(id);
  if (!VIEW && S.cfg){ S.mutual = {champ:id, a:mu.ans.slice(), pct:r.pct}; saveLocal(); }
  const hi = MU_Q[r.hi].o[mu.ans[r.hi]][0], lo = MU_Q[r.lo].o[mu.ans[r.lo]][0];
  const home = r.home ? ` А ещё ты угадываешь, где ${verb(id,'ей','ему')} хочется жить.` : '';
  const why = r.hi === r.lo ? (home ? `<p class="muted">${home.trim()}</p>` : '') : `<p class="muted">${esc(N)} особенно ${verb(id,'оценила','оценил')} ответ «${esc(hi)}», а вот «${esc(lo)}» ${verb(id,'её','его')} не впечатлил.${home}</p>`;
  $('#muBody').innerHTML = `<p class="eyebrow">Взаимность</p>
    <p class="mu-who">${face(id)}${esc(N)}</p>
    <p class="mu-pct">${r.pct}%</p>
    <h2>${esc(title)}</h2>
    <p>${esc(text)}</p>${why}
    <div class="res-actions"><button class="btn primary" type="button" id="muDone">К итогам</button><button class="btn ghost" type="button" id="muAgain">Ответить заново</button></div>`;
  if (r.pct >= 90){ Sound.fanfare(); FX.celebrate(); }
  $('#muDone').addEventListener('click', () => go());
  $('#muAgain').addEventListener('click', () => startMutual(id));
}

/* ================= карта сердца: откуда родом топ-20 ================= */
const REGION_TO = {ion:'в Ионию', nox:'в Ноксус', dem:'в Демасию', frl:'во Фрельйорд', pil:'в Пилтовер', zau:'в Заун', bil:'в Билджвотер',
  shu:'в Шуриму', tar:'на Таргон', ixt:'в Иштал', sha:'на Сумрачные острова', void:'в Бездну'};
let mapT = 0;
function renderHeartMap(m){
  const top = m.order.slice(0, 20), cnt = {};
  top.forEach(id => { const r = (PROFILE[id] || ['rt'])[0]; cnt[r] = (cnt[r] || 0) + 1; });
  const places = Object.keys(cnt).filter(k => k !== 'rt'), best = Math.max(0, ...places.map(k => cnt[k]));
  const lead = places.filter(k => cnt[k] === best), V = !!VIEW;
  $('#mapHead').textContent = best ? `Сердце тянется ${lead.map(k => REGION_TO[k]).join(' и ')}` : 'Сердце странствует';
  const parts = [];
  if (best) parts.push(lead.length > 1 ? `Оттуда по ${best} из ${top.length} ${V ? 'в топе' : 'в твоём топе'}.` : `${best} из ${top.length} ${V ? 'в топе' : 'в твоём топе'} — оттуда.`);
  parts.push(`Всего краёв: ${places.length}.`);
  if (cnt.rt) parts.push(cnt.rt === 1 ? 'Ещё один — странник без родного края.' : `Ещё ${cnt.rt} — странники без родного края.`);
  $('#mapText').textContent = parts.join(' ');
  clearTimeout(mapT);
  mapT = setTimeout(async () => {
    if (ui.cur !== m) return;
    const cv = await Share.heartMap(m, V && VIEW.name ? VIEW.name : ''), pv = $('#mapPreview');
    if (pv.width !== cv.width || pv.height !== cv.height){ pv.width = cv.width; pv.height = cv.height; }
    pv.getContext('2d').drawImage(cv, 0, 0);
  }, 260);
}
/* ================= статистика всех игроков: анонимно, только пара и топ-10 ================= */
const STATS_MIN_ROSTER = 40;   // мини-турниры и совсем короткие составы в общую статистику не идут
async function renderGlobalStats(m){
  const sec = $('#gSec'), box = $('#gStats');
  if (!Room.configured() || TOOLS){ sec.hidden = true; return; }
  const counted = !VIEW && !S.cfg.theme && S.cfg.roster.length >= STATS_MIN_ROSTER;
  sec.hidden = false; box.innerHTML = '<p class="muted">Считаем…</p>';
  try {
    if (counted){
      if (!S.statId){ S.statId = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)); saveLocal(); }
      await Room.stats.submit({id:S.statId, champ:m.champ, top:m.order.slice(0, 10), who:S.cfg.who, n:S.cfg.roster.length});
    }
    const g = await Room.stats.get(m.champ);
    if (ui.cur !== m) return;
    box.innerHTML = statsHTML(m.champ, g, counted);
  } catch(e){
    if (ui.cur === m) box.innerHTML = '<p class="muted">Статистика сейчас недоступна. Загляни позже.</p>';
  }
}
function statsHTML(id, g, counted){
  const total = +g.total || 0, mine = +g.mine || 0, nm = name(id);
  const pc = n => { const v = total ? 100 * n / total : 0; return v > 0 && v < 1 ? '<1' : v.toLocaleString('ru-RU', {maximumFractionDigits: v < 10 ? 1 : 0}); };
  const note = `<p class="muted">Анонимно: в статистику попадают только итоговая пара и топ-10, без имён.${counted ? '' : ' Мини-турниры и результаты по ссылке не считаются.'}</p>`;
  if (!total) return `<div class="g-verdict"><h3>Пока пусто</h3><p>Полных турниров в статистике ещё нет. Она появится, когда наберутся первые результаты.</p>${note}</div>`;
  const share = 100 * mine / total;
  let h, t;
  if (!mine){ h = 'Нетронутая пара'; t = `${nm} пока не ${verb(id,'стала','стал')} парой ни у кого из ${total} ${plural(total,'игрока','игроков','игроков')}.`; }
  else if (counted && mine === 1 && total >= 5){ h = 'Первооткрытие'; t = `${nm} — пара только у тебя из ${total} ${plural(total,'игрока','игроков','игроков')}.`; }
  else {
    h = share >= 15 ? 'Популярный выбор' : share >= 5 ? 'Частый выбор' : share >= 1.5 ? 'Редкий выбор' : 'Очень редкий выбор';
    t = `${nm} — пара у ${pc(mine)}% игроков (${mine} из ${total}), ${g.rank}-е место по популярности.`;
  }
  const top = +g.inTop > mine ? ` В топ-10 ${verb(id,'она попадает','он попадает')} у ${pc(+g.inTop)}% игроков.` : '';
  const early = total < 20 ? `<p class="muted">Статистика только начинает собираться: пока ${total} ${plural(total,'результат','результата','результатов')}.</p>` : '';
  const list = (g.top || []).filter(r => BY[r.id]).map(r => ({id:r.id, n:+r.n}));
  const max = Math.max(1, ...list.map(r => r.n));
  const row = (r, place) => `<div class="g-row ${r.id === id ? 'me' : ''}"><i>${place}</i>${face(r.id)}<b>${esc(name(r.id))}</b><small>${pc(r.n)}%</small><div class="g-bar"><span style="width:${(100 * r.n / max).toFixed(1)}%"></span></div></div>`;
  /* одинаковое число голосов — одно и то же место */
  let rows = list.map(r => row(r, 1 + list.filter(x => x.n > r.n).length)).join('');
  if (mine && !list.some(r => r.id === id)) rows += row({id, n:mine}, +g.rank);
  return `<div class="g-verdict"><h3>${h}</h3><p>${esc(t + top)}</p>${early}${note}</div>
    <div class="g-board"><p class="muted" style="font-size:13px">Чаще всего становятся парой</p>${rows}</div>`;
}
let certT = 0;
function drawCertPreview(){
  clearTimeout(certT);
  certT = setTimeout(async () => {
    const m = ui.cur; if (!m || m.kind !== 'done') return;
    const cv = await Share.certificate(m, $('#certName').value);
    const pv = $('#certPreview'), cx = pv.getContext('2d');
    cx.clearRect(0, 0, pv.width, pv.height); cx.drawImage(cv, 0, 0);
  }, 200);
}
function tierRow(L, label, tok, ids, start, x){
  const row = document.createElement('div');
  row.className = 'tier' + (x ? ' x' : '');
  row.style.setProperty('--tc', `var(${tok})`);
  row.innerHTML = `<div class="tlab"><b>${L}</b><span>${label}</span></div><div class="tlist"></div>`;
  const list = row.querySelector('.tlist');
  ids.forEach((id, i) => {
    const d = document.createElement('button'); d.type = 'button'; d.className = 'th'; d.title = `${BY[id].name} — ${BY[id].title}`;
    d.style.cssText = 'padding:0;border:0;background:none;text-align:left;color:inherit;font:inherit';
    d.innerHTML = `${face(id)}${start >= 0 ? `<i>${start + i + 1}</i>` : ''}<span>${esc(BY[id].name)}</span>`;
    d.addEventListener('click', () => openProfile(id));
    list.appendChild(d);
  });
  return row;
}
function resultText(){
  const m = ui.cur; if (!m || m.kind !== 'done') return '';
  const sizes = tierSizesOf(m); let pos = 0;
  const lines = [`Пара из Рунтерры: ${name(m.champ)}`, `Типаж: ${ARCH[profileOf(m.order).arch][0]}`, ''];
  TIERS.forEach(([L, label], ti) => { const ids = m.order.slice(pos, pos + sizes[ti]); lines.push(`${L} · ${label.replace(/­/g,'')}: ${ids.map((id, i) => `${pos + i + 1}. ${name(id)}`).join(', ')}`); pos += sizes[ti]; });
  const removed = (S.cfg.removed || []).filter(id => BY[id]);
  if (removed.length) lines.push(`Сразу мимо: ${removed.map(name).join(', ')}`);
  return lines.join('\n');
}
/* ================= ссылка на результат =================
   Турнир детерминирован, поэтому в ссылку достаточно положить настройки, состав, сид, ставку и все выборы.
   Состав и выборы — битовые маски, всё вместе — base64url, около 200 символов. */
const SHARE_FMT = 1, MODE_KEYS = ['quick','normal','deep','fast'], WHO_KEYS = ['all','m','f'];   // порядок не менять: индекс хранится в ссылке
const IDX = {}; CH.forEach((c, i) => IDX[c[0]] = i);
function rosterHash(n){ let h = 2166136261; for (let i = 0; i < n; i++) for (const ch of CH[i][0]){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h & 0xffff; }
const b64u = bytes => { let t = ''; bytes.forEach(b => t += String.fromCharCode(b)); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = t => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
function packResult(cfg, dec, who){
  const N = CH.length, L = Math.ceil(N / 8);
  const mask = ids => { const a = new Uint8Array(L); ids.forEach(id => { const i = IDX[id]; if (i != null) a[i >> 3] |= 1 << (i & 7); }); return a; };
  const d = new Uint8Array(Math.ceil(dec.length / 8)); dec.forEach((x, i) => { if (x) d[i >> 3] |= 1 << (i & 7); });
  const nm = who ? new TextEncoder().encode(who.slice(0, 40)) : new Uint8Array(0);
  const head = new Uint8Array(16), dv = new DataView(head.buffer);
  dv.setUint8(0, SHARE_FMT); dv.setUint8(1, cfg.v);
  dv.setUint8(2, Math.max(0, MODE_KEYS.indexOf(cfg.mode)) | (Math.max(0, WHO_KEYS.indexOf(cfg.who)) << 2) | ((cfg.extra ? 1 : 0) << 4));
  dv.setUint16(3, N); dv.setUint16(5, rosterHash(N)); dv.setUint32(7, cfg.seed >>> 0);
  dv.setUint16(11, cfg.bet && IDX[cfg.bet] != null ? IDX[cfg.bet] + 1 : 0); dv.setUint16(13, dec.length);
  dv.setUint8(15, cfg.theme ? THEMES.findIndex(t => t[0] === cfg.theme) + 1 : 0);   // тема мини-турнира
  const parts = [head, mask(cfg.roster), mask(cfg.removed || []), d, nm], out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
  let o = 0; parts.forEach(x => { out.set(x, o); o += x.length; });
  return b64u(out);
}
function unpackResult(t){
  const b = unb64u(t), dv = new DataView(b.buffer);
  if (b.length < 16 || dv.getUint8(0) !== SHARE_FMT) throw new Error('format');
  const v = dv.getUint8(1), fl = dv.getUint8(2), N = dv.getUint16(3);
  if (v !== ENGINE_VERSION || N > CH.length || rosterHash(N) !== dv.getUint16(5)) throw new Error('old');
  const L = Math.ceil(N / 8), nd = dv.getUint16(13), betI = dv.getUint16(11);
  const ids = a => { const r = []; for (let i = 0; i < N; i++) if (a[i >> 3] & (1 << (i & 7))) r.push(CH[i][0]); return r; };
  let o = 16;
  const roster = ids(b.subarray(o, o + L)); o += L;
  const removed = ids(b.subarray(o, o + L)); o += L;
  const db = b.subarray(o, o + Math.ceil(nd / 8)); o += Math.ceil(nd / 8);
  const dec = []; for (let i = 0; i < nd; i++) dec.push(db[i >> 3] & (1 << (i & 7)) ? 1 : 0);
  const who = o < b.length ? new TextDecoder().decode(b.subarray(o)).slice(0, 40) : '';
  const cfg = {v, who:WHO_KEYS[(fl >> 2) & 3] || 'all', extra:!!(fl & 16), mode:MODE_KEYS[fl & 3] || 'normal', seed:dv.getUint32(7), roster, removed, bet:betI && CH[betI - 1] ? CH[betI - 1][0] : null};
  const th = dv.getUint8(15); if (th && THEMES[th - 1]) cfg.theme = THEMES[th - 1][0];
  return {cfg, dec, who};
}
function resultLink(){
  const m = ui.cur; if (!m || m.kind !== 'done') return null;
  const code = packResult(S.cfg, S.dec, $('#certName').value.trim());
  /* самопроверка: ссылка должна воспроизводить ровно этот же результат */
  try { const r = unpackResult(code), mm = simulate(r.cfg, r.dec); if (mm.kind !== 'done' || mm.order.join() !== m.order.join()) return null; } catch(e){ return null; }
  return location.origin + location.pathname + '?r=' + code;
}
async function shareResult(){
  const url = resultLink(), m = ui.cur;
  if (!url) return toast('Не получилось собрать ссылку для этого турнира');
  if (navigator.share && touch){
    try { await navigator.share({title:'Пара из Рунтерры', text:`Моя пара в Рунтерре — ${name(m.champ)}. Весь тир-лист по ссылке:`, url}); return; }
    catch(e){ if (e && e.name === 'AbortError') return; }
  }
  const fallback = () => { const ta = $('#copyFallback'); ta.hidden = false; ta.value = url; ta.focus(); ta.select(); toast('Ссылка выделена, скопируй её вручную'); };
  try { navigator.clipboard.writeText(url).then(() => toast('Ссылка на результат скопирована'), fallback); } catch(e){ fallback(); }
}
function startView(code){
  let r = null;
  try { r = unpackResult(code); } catch(e){}
  if (!r || !validTournament(r) || simulate(r.cfg, r.dec).kind !== 'done'){ toast('Ссылка на результат повреждена или осталась от старой версии теста', 6000); return false; }
  VIEW = {name:r.who}; ctx = 'solo'; S = {cfg:r.cfg, dec:r.dec};
  go();
  return true;
}

function copyResult(){
  const text = resultText();
  const fallback = () => { const ta = $('#copyFallback'); ta.hidden = false; ta.value = text; ta.focus(); ta.select(); toast('Текст выделен, скопируй его вручную'); };
  try { navigator.clipboard.writeText(text).then(() => toast('Тир-лист скопирован'), fallback); } catch(e){ fallback(); }
}

/* ================= комната ================= */
function refreshRoomBox(){
  const box = $('#roomBox');
  if (!Room.configured()){
    box.hidden = false;
    $('#roomForms').hidden = true; $('#roomCurrent').hidden = true;
    $('#roomIntro').textContent = (window.RP_CONFIG && RP_CONFIG.roomNote) || 'Совместный режим ещё не подключён: в файле js/config.js нужно указать адрес и ключ Supabase.';
    return;
  }
  $('#roomIntro').textContent = 'Каждый проходит свой турнир на своём телефоне, а вы видите прогресс друг друга. В конце — сравнение вкусов и игра «Угадай мой выбор». А можно сыграть общий турнир: одна и та же пара у обоих одновременно.';
  const inRoom = !!sess;
  $('#roomForms').hidden = inRoom; $('#roomCurrent').hidden = !inRoom;
  if (inRoom) $('#roomCurrentText').innerHTML = `Ты в комнате <b>${esc(sess.code)}</b> как ${esc(sess.name)}.`;
}
async function roomCreate(){
  const nm = $('#roomName').value.trim(); $('#roomErr').textContent = '';
  if (!nm) return $('#roomErr').textContent = 'Напиши своё имя — его увидит партнёр.';
  try { const r = await Room.create(nm); sess = {code:r.code, slot:r.slot, token:r.token, name:nm}; sstore.set('rp-session', sess); enterRoom(true); }
  catch(e){ $('#roomErr').textContent = e.message; }
}
async function roomJoin(){
  const nm = $('#roomName').value.trim(), code = $('#roomCode').value.trim().toUpperCase(); $('#roomErr').textContent = '';
  if (!nm) return $('#roomErr').textContent = 'Напиши своё имя — его увидит партнёр.';
  if (!/^[A-Z2-9]{6}$/.test(code)) return $('#roomErr').textContent = 'Код комнаты — 6 букв и цифр, например K7MPQ2.';
  try { const r = await Room.join(code, nm); sess = {code:r.code, slot:r.slot, token:r.token, name:nm}; sstore.set('rp-session', sess); enterRoom(true); }
  catch(e){ $('#roomErr').textContent = e.message; }
}
function enterRoom(fresh){
  setCtx('room');
  G = store.get(guessKey(sess.code)); PB = store.get(pbetKey(sess.code)); BT = store.get(battleKey(sess.code)); SY = store.get(syKey(sess.code));
  if (sub) sub.close();
  sub = Room.subscribe(sess.code, sess, () => fetchRoom(), slots => { online = new Set(slots); if (ui.screen === 'scr-room') renderRoom(); renderPartnerChip(); });
  clearInterval(pollT); pollT = setInterval(() => { if (!document.hidden) fetchRoom(); }, 20000);
  show('scr-room'); renderRoom(); fetchRoom().then(() => { if (fresh) pushState(true); });
}
function leaveRoom(){
  if (sub) sub.close(); sub = null; clearInterval(pollT);
  sstore.del('rp-session'); sess = null; roomData = null; G = null; PB = null; BT = null; RX = null; SY = null;
  hideLive(); live.key = ''; live.shown = null;
  setCtx('solo'); show('scr-start'); refreshStart();
}
async function fetchRoom(){
  if (!sess) return;
  try { roomData = await Room.get(sess.code); $('#rErr').textContent = ''; }
  catch(e){ $('#rErr').textContent = e.message; return; }
  if (ui.screen === 'scr-room') renderRoom();
  if (ui.screen === 'scr-compare') renderCompare();
  renderPartnerChip();
  checkLive();
  syncOnFetch();
}
const partner = () => roomData && sess && roomData.players.find(p => p.slot !== sess.slot);
const meRemote = () => roomData && sess && roomData.players.find(p => p.slot === sess.slot);
function myState(){
  const st = {v:ENGINE_VERSION, at:Date.now()};
  if (S.cfg){
    const m = simulate(S.cfg, S.dec);
    Object.assign(st, {cfg:S.cfg, dec:S.dec, played:m.played != null ? m.played : m.total, est:m.est || m.total, done:m.kind === 'done', champ:m.kind === 'done' ? m.champ : null});
  }
  if (G) st.guess = {target:G.target, total:G.list.length, correct:G.picks.filter(p => p.ok).length, answered:G.picks.length, done:!!G.done};
  if (PB) st.pbet = PB.id;
  if (BT) st.battle = BT;
  if (RX) st.react = RX;
  if (SY) st.sync = SY;
  return st;
}
function queueSync(){ if (!sess) return; clearTimeout(saveT); saveT = setTimeout(() => pushState(), 1200); }
async function pushState(quiet){
  if (!sess) return; clearTimeout(saveT);
  try { await Room.save(sess.code, sess.token, myState()); if (sub) sub.ping(); if (!quiet) fetchRoom(); }
  catch(e){ if (/bad_token|другом устройстве/.test(e.message)) toast(e.message, 5000); }
}
function playerState(p){
  const s = p && p.state || {};
  if (!s.cfg || s.v !== ENGINE_VERSION || !validTournament({cfg:s.cfg, dec:s.dec || []})) return {status:'idle'};
  const m = simulate(s.cfg, s.dec || []);
  return m.kind === 'done' ? {status:'done', m, s} : {status:'play', m, s};
}
function renderRoom(){
  if (!sess) return;
  $('#rCode').textContent = sess.code;
  const players = roomData ? roomData.players : [{slot:sess.slot, name:sess.name, state:{}}];
  const pp = partner();
  $('#rHint').textContent = pp ? 'Вы оба в комнате. Каждый проходит свой турнир; прогресс обновляется сам.' : `Отправь партнёру приглашение со ссылкой или кодом ${sess.code}. Пока можно начинать свой турнир.`;
  const card = p => {
    const me = p.slot === sess.slot, ps = me ? (S.cfg ? {status: simulate(S.cfg, S.dec).kind === 'done' ? 'done' : 'play', m: simulate(S.cfg, S.dec)} : {status:'idle'}) : playerState(p);
    const on = me || online.has(p.slot);
    let body = '';
    if (ps.status === 'idle') body = '<p class="muted">Ещё не начал(а) турнир.</p>';
    if (ps.status === 'play') body = `<p>Позади ${ps.m.played} из ≈${ps.m.est} ${duelsWord(ps.m.est)}</p><div class="pbar"><i style="width:${Math.min(100, 100 * ps.m.played / ps.m.est).toFixed(1)}%"></i></div>`;
    if (ps.status === 'done') body = `<div class="champ">${face(ps.m.champ)}<div><small class="muted">Пара в Рунтерре</small><br><b>${esc(name(ps.m.champ))}</b></div></div>`;
    const gs = (me ? (G && {correct:G.picks.filter(x => x.ok).length, total:G.list.length, done:G.done}) : (p.state && p.state.guess));
    if (gs && gs.done) body += `<p class="muted">Угадал(а) выборы партнёра: ${gs.correct} из ${gs.total}</p>`;
    if (me && PB && BY[PB.id]){
      const pst = playerState(partner());
      body += `<p class="muted">Ставка на пару партнёра: <b>${esc(name(PB.id))}</b>${pst.status === 'done' ? ' — ' + (PB.id === pst.m.champ ? 'угадано!' : (pst.m.order.indexOf(PB.id) + 1 ? `${pst.m.order.indexOf(PB.id) + 1}-е место` : 'не участвовал(а)')) : ''}</p>`;
    }
    if (!me && p.state && p.state.pbet && BY[p.state.pbet]){
      const myDone = !!S.cfg && simulate(S.cfg, S.dec).kind === 'done';
      body += `<p class="muted">Сделал(а) ставку на твою пару${myDone ? `: <b>${esc(name(p.state.pbet))}</b>` : ' — узнаешь после своего финала'}</p>`;
    }
    return `<div class="pcard ${me ? 'me' : ''}"><div class="who"><span class="dot ${on ? 'on' : ''}"></span>${esc(p.name)} ${me ? '<small>это ты</small>' : on ? '<small>в сети</small>' : ''}</div>${body}</div>`;
  };
  renderSyncBox();
  $('#rPlayers').innerHTML = players.map(card).join('') + (pp ? '' : '<div class="pcard"><div class="who"><span class="dot"></span>Ждём партнёра…</div><p class="muted">Когда партнёр войдёт по коду, он появится здесь.</p></div>');
  const mine = S.cfg ? simulate(S.cfg, S.dec) : null, their = playerState(pp);
  const acts = [];
  if (!mine) acts.push(`<button class="btn primary" type="button" data-act="start">Начать свой турнир</button>`);
  else if (mine.kind === 'duel') acts.push(`<button class="btn primary" type="button" data-act="resume">Продолжить (${mine.played} из ≈${mine.est})</button>`);
  else acts.push(`<button class="btn primary" type="button" data-act="result">Мой результат</button>`);
  if (pp && their.status === 'done'){
    if (!G || !G.done) acts.push(`<button class="btn" type="button" data-act="guess">${G && G.picks.length ? 'Продолжить угадывать' : 'Угадать выборы: ' + esc(pp.name)}</button>`);
  }
  const bx = battleInfo();
  if (bx && !bx.same && !bx.my) acts.push(`<button class="btn" type="button" data-act="battle">Битва вкусов</button>`);
  if (pp && (their.status === 'idle' || (their.status === 'play' && !inPlayoff(their.m)))) acts.push(`<button class="btn" type="button" data-act="pbet">${PB ? 'Изменить ставку на пару партнёра' : 'Поставить на пару партнёра'}</button>`);
  if (pp && syncStatus().state === 'none') acts.push(`<button class="btn" type="button" data-act="sync-new">Общий турнир</button>`);
  if (mine && mine.kind === 'done' && their.status === 'done') acts.push(`<button class="btn" type="button" data-act="compare">Сравнить результаты</button>`);
  else if (pp) acts.push(`<button class="btn ghost" type="button" disabled>Сравнение откроется, когда оба закончат</button>`);
  $('#rActions').innerHTML = acts.join('');
  $('#rActions').querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => roomAction(b.dataset.act)));
}
/* ставка на партнёра: пока партнёр не закончил, можно поставить и передумать */
function openPartnerBet(){
  const pp = partner(), ps = playerState(pp);
  if (!pp) return toast('Сначала дождись партнёра в комнате');
  if (ps.status === 'done') return toast('Партнёр уже закончил — ставки закрыты');
  if (inPlayoff(ps.m)) return toast('Партнёр уже в плей-офф — ставки закрыты');
  const roster = ps.status === 'play' ? ps.s.cfg.roster.slice() : CH.map(c => c[0]);
  openBet(roster, [], true);
}
function savePartnerBet(id){
  const pp = partner(); if (!pp || !id) return;
  PB = {id, on:pp.slot}; store.set(pbetKey(sess.code), PB); pushState(true);
  show('scr-room'); renderRoom(); toast('Ставка принята');
}
function betRows(){
  const pp = partner(), mine = S.cfg ? simulate(S.cfg, S.dec) : null, their = playerState(pp), rows = [];
  const verdict = (id, m) => { const pl = m.order.indexOf(id) + 1; return id === m.champ ? 'угадано!' : pl ? `${pl}-е место` : 'не участвовал(а)'; };
  if (PB && their.status === 'done') rows.push({who:sess.name, id:PB.id, txt:verdict(PB.id, their.m), win:PB.id === their.m.champ});
  const tb = pp && pp.state && pp.state.pbet;
  if (tb && BY[tb] && mine && mine.kind === 'done') rows.push({who:pp.name, id:tb, txt:verdict(tb, mine), win:tb === mine.champ});
  return rows;
}

function roomAction(a){
  if (a === 'start'){ setCtx('room'); show('scr-start'); refreshStart(); }
  if (a === 'resume' || a === 'result'){ setCtx('room'); preloadAll(S.cfg.roster); go(); }
  if (a === 'guess') startGuess();
  if (a === 'pbet') openPartnerBet();
  if (a === 'battle') startBattle();
  if (a === 'compare'){ show('scr-compare'); renderCompare(); }
  if (a === 'sync-new') syncSetup();
  if (a === 'sync-join') syncJoin();
  if (a === 'sync-go') startSync();
  if (a === 'sync-res') renderSyncResult();
  if (a === 'sync-cancel'){ SY = null; store.del(syKey(sess.code)); pushState(true); renderRoom(); }
}
function renderPartnerChip(){
  const chip = $('#partnerChip');
  if (!(ctx === 'room' && sess && ui.screen === 'scr-duel' && ui.mode === 'play')){ chip.hidden = true; return; }
  const pp = partner();
  if (!pp){ chip.hidden = false; chip.innerHTML = '<span class="dot"></span>Ждём партнёра'; return; }
  const ps = playerState(pp), on = online.has(pp.slot);
  chip.hidden = false;
  chip.innerHTML = `<span class="dot ${on ? 'on' : ''}"></span><b>${esc(pp.name)}</b> ` + (ps.status === 'done' ? '· уже нашёл(ла) пару' : ps.status === 'play' ? `· ${ps.m.played}/≈${ps.m.est}` : '· ещё не начал(а)');
}

/* сравнение */
function renderCompare(){
  const pp = partner(), mine = S.cfg ? simulate(S.cfg, S.dec) : null, their = playerState(pp);
  if (!pp || !mine || mine.kind !== 'done' || their.status !== 'done'){ $('#cTitle').textContent = 'Сравнение пока недоступно'; return; }
  const c = compareOrders(mine.order, their.m.order);
  $('#cTitle').textContent = `${sess.name} и ${pp.name}`;
  $('#cHead').innerHTML = `<div class="cmp-p">${face(mine.champ)}<small>${esc(sess.name)} · пара в Рунтерре</small><b>${esc(name(mine.champ))}</b></div>
    <div class="cmp-pct">${c.percent}%<small>совпадение вкусов</small></div>
    <div class="cmp-p">${face(their.m.champ)}<small>${esc(pp.name)} · пара в Рунтерре</small><b>${esc(name(their.m.champ))}</b></div>`;
  $('#cNote').textContent = mine.champ === their.m.champ ? 'Невероятно: у вас одна и та же пара! Придётся делиться.' : `Сравнение по ${c.n} персонажам, которые были у обоих. 50% — вкусы никак не связаны, 100% — полностью одинаковые.`;
  const row = (id, txt) => `<div class="lrow">${face(id)}<b>${esc(name(id))}</b><small>${txt}</small></div>`;
  const pos = (o, id) => o.indexOf(id) + 1;
  $('#cBoth').innerHTML = c.both.slice(0, 8).map(id => row(id, `#${pos(mine.order,id)} и #${pos(their.m.order,id)}`)).join('') || '<p class="muted">Общих любимцев в верхней пятой части нет.</p>';
  $('#cFights').innerHTML = c.fights.map(f => row(f.id, `${esc(sess.name)}: #${pos(mine.order,f.id)} · ${esc(pp.name)}: #${pos(their.m.order,f.id)}`)).join('');
  $('#cHate').innerHTML = c.hate.slice(0, 6).map(id => row(id, `#${pos(mine.order,id)} и #${pos(their.m.order,id)}`)).join('') || '<p class="muted">Общих аутсайдеров нет.</p>';
  const myG = G && G.done ? `<p>${esc(sess.name)} угадывает выборы партнёра: <b>${G.picks.filter(x => x.ok).length} из ${G.list.length}</b>.</p>` : '';
  const thG = pp.state && pp.state.guess && pp.state.guess.done ? `<p>${esc(pp.name)} угадывает выборы партнёра: <b>${+pp.state.guess.correct || 0} из ${+pp.state.guess.total || 0}</b>.</p>` : '';
  $('#cGuess').innerHTML = (myG + thG) || '<p class="muted">Пока никто не сыграл. Кнопка «Угадать выборы» — в комнате.</p>';
  const bh = battleHTML();
  $('#cBattleSec').hidden = !bh; $('#cBattle').innerHTML = bh;
  const bgo = $('#cBattleGo'); if (bgo) bgo.addEventListener('click', startBattle);
  const br = betRows();
  $('#cBetSec').hidden = !br.length;
  $('#cBets').innerHTML = br.map(r => `<div class="lrow bet-row ${r.win ? 'win' : ''}">${face(r.id)}<div><small class="who">${esc(r.who)} ставит</small><b>${esc(name(r.id))}</b></div><small>${r.txt}</small></div>`).join('');
  drawPairPreview();
}
/* данные для общего сертификата */
function pairData(){
  const pp = partner(), mine = S.cfg ? simulate(S.cfg, S.dec) : null, their = playerState(pp);
  if (!pp || !mine || mine.kind !== 'done' || their.status !== 'done') return null;
  const c = compareOrders(mine.order, their.m.order), skip = new Set([mine.champ, their.m.champ]);
  const ra = {}, rb = {}; mine.order.forEach((id, i) => ra[id] = i); their.m.order.forEach((id, i) => rb[id] = i);
  let wit = c.both.filter(id => !skip.has(id));
  if (wit.length < 2) wit = wit.concat(mine.order.filter(id => rb[id] != null && !skip.has(id) && !wit.includes(id)).sort((x, y) => (ra[x] + rb[x]) - (ra[y] + rb[y])));
  const me = sess.slot === 1;   // слева всегда тот, кто создал комнату
  const A = {name:sess.name, champ:mine.champ}, B = {name:pp.name, champ:their.m.champ};
  return {a: me ? A : B, b: me ? B : A, percent:c.percent, witnesses:wit.slice(0, 2), same: mine.champ === their.m.champ};
}
let pairT = 0;
function drawPairPreview(){
  clearTimeout(pairT);
  pairT = setTimeout(async () => {
    const d = pairData(); if (!d) return;
    const cv = await Share.pairCertificate(d), pv = $('#pairPreview'), cx = pv.getContext('2d');
    cx.clearRect(0, 0, pv.width, pv.height); cx.drawImage(cv, 0, 0);
  }, 150);
}

/* ================= битва вкусов: победители встречаются в одной дуэли, голосуют оба ================= */
function battleInfo(){
  const pp = partner(), mine = S.cfg ? simulate(S.cfg, S.dec) : null, their = playerState(pp);
  if (!pp || !mine || mine.kind !== 'done' || their.status !== 'done') return null;
  const first = sess.slot === 1;
  const a = first ? mine.champ : their.m.champ, b = first ? their.m.champ : mine.champ, key = a + '|' + b;
  const tb = pp.state && pp.state.battle;
  return {a, b, key, same:a === b, A: first ? sess.name : pp.name, B: first ? pp.name : sess.name, pp,
    myChamp:mine.champ, theirChamp:their.m.champ,
    my: BT && BT.key === key ? BT.pick : null, their: tb && tb.key === key && (tb.pick === a || tb.pick === b) ? tb.pick : null};
}
function battleVerdict(x){
  if (!x.my || !x.their) return null;
  if (x.my === x.their) return {title:`Общая пара: ${name(x.my)}`, text: x.my === x.myChamp ? 'Партнёр проголосовал(а) за твою пару. Решено!' : 'Ты проголосовал(а) за пару партнёра. Решено!', win:x.my};
  if (x.my === x.myChamp) return {title:'Каждый остался при своём', text:'Никто не уступил. Похоже, вкусы у вас и правда разные — и это нормально.'};
  return {title:'Вы выбрали пары друг друга', text:'Каждый проголосовал за пару партнёра. Очень мило — или очень дипломатично.'};
}
function startBattle(){
  const x = battleInfo(); if (!x || x.same) return;
  ui.mode = 'battle'; show('scr-duel');
  ui.cur = {kind:'duel', a:x.a, b:x.b, level:3, stage:'tastes'};
  $('#stage').textContent = 'Битва вкусов';
  $('#counter').textContent = 'Одна дуэль · голоса откроются, когда проголосуют оба';
  $('#barFill').style.width = '100%';
  const p = $('#prompt'); p.className = 'prompt final'; p.textContent = 'Чья пара лучше?';
  const sp = $('#subprompt'); sp.hidden = false; sp.textContent = `${x.A} — слева, ${x.B} — справа`;
  setCard(0, x.a); setCard(1, x.b);
  const ar = $('#arena'); ar.className = 'arena lv3'; void ar.offsetWidth; ar.classList.add('enter');
  FX.setLevel(3);
  $('#undoBtn').hidden = true; $('#bracketBtn').hidden = true; $('#partnerChip').hidden = true;
  $('#reveal').textContent = ''; $('#reveal').className = 'reveal';
  FX.intro(3, 'Битва вкусов', `${name(x.a)} или ${name(x.b)}`, 'Вдвоём');
}
function battlePick(side){
  const x = battleInfo(); if (!x) return;
  ui.lock = true;
  const id = side ? x.b : x.a, cards = [$('#card0'), $('#card1')];
  cards[side].classList.add('chosen'); cards[1 - side].classList.add('lost');
  Sound.pick(3); FX.burst(...cardCenter(side), 3);
  BT = {key:x.key, pick:id}; store.set(battleKey(sess.code), BT); pushState(true);
  const r = $('#reveal'); r.className = 'reveal ok';
  r.textContent = x.their ? 'Голос принят — смотрим итог' : `Голос принят. Ждём, что выберет ${x.pp.name}`;
  setTimeout(() => {
    ui.lock = false; ui.mode = 'play'; show('scr-compare'); renderCompare();
    if (x.their){ Sound.fanfare(); FX.celebrate(); $('#cBattleSec').scrollIntoView({block:'center'}); }
  }, 1300);
}
function battleHTML(){
  const x = battleInfo(); if (!x) return '';
  if (x.same) return '<p class="muted">У вас одна и та же пара — сражаться не с кем.</p>';
  const faces = `<div class="bt-pair">${face(x.a)}<span>или</span>${face(x.b)}</div>`;
  if (!x.my) return `${faces}<p class="muted">Ваши пары встречаются в одной дуэли, голосуете оба. Голоса откроются, когда проголосуют оба.</p><div class="res-actions"><button class="btn primary" type="button" id="cBattleGo">Проголосовать</button></div>`;
  if (!x.their) return `${faces}<p class="muted">Твой голос принят: <b>${esc(name(x.my))}</b>. Ждём, что выберет ${esc(x.pp.name)}.</p>`;
  const v = battleVerdict(x), first = sess.slot === 1;
  const votes = [[first ? sess.name : x.pp.name, first ? x.my : x.their], [first ? x.pp.name : sess.name, first ? x.their : x.my]];
  return `<div class="bt-verdict"><h3>${esc(v.title)}</h3><p class="muted">${esc(v.text)}</p></div>
    <div class="list">${votes.map(([who, id]) => `<div class="lrow bet-row ${v.win === id ? 'win' : ''}">${face(id)}<div><small class="who">${esc(who)} голосует</small><b>${esc(name(id))}</b></div><small></small></div>`).join('')}</div>`;
}

/* ================= новости из плей-офф партнёра и реакции на них ================= */
const REACTS = ['❤️', '😍', '😱', '🙄'];
const live = {key:'', shown:null, t:0};
const liveOn = () => store.get('rp-live') !== false;
const inPlayoff = m => !!m && m.kind === 'duel' && ['ub','lb','final'].includes(m.stage);
const reactSeenKey = () => 'rp-react-seen-' + sess.code + '-' + sess.slot;
function liveWhere(m){
  if (m.stage === 'final') return 'в гранд-финале';
  if (m.stage === 'lb') return m.last ? 'в финале сетки второго шанса' : 'в сетке второго шанса';
  if (/1\/8/.test(m.label)) return 'в 1/8 финала';
  if (/четвертьфинал/.test(m.label)) return 'в четвертьфинале';
  if (/полуфинал/.test(m.label)) return 'в полуфинале';
  return 'в финале сетки победителей';
}
function checkLive(){
  if (!sess || ctx !== 'room' || TOOLS) return;
  const pp = partner(); if (!pp) return;
  checkReaction(pp);
  const ps = playerState(pp);
  if (ps.status === 'idle'){ live.key = ''; live.shown = null; return; }
  const dec = ps.s.dec || [], seed = ps.s.cfg.seed, key = seed + ':' + dec.length;
  if (key === live.key) return;
  const prev = live.shown; live.key = key;
  /* что партнёр выбрал в дуэли, которую мы только что показывали */
  const chose = prev && prev.seed === seed && dec.length === prev.idx + 1 ? (dec[prev.idx] ? prev.b : prev.a) : null;
  if (ps.status === 'done'){
    live.shown = null;
    if (chose && liveOn()) showLive({pp, done:true, champ:ps.m.champ, to:{seed, idx:dec.length}});
    return;
  }
  if (!inPlayoff(ps.m)){ live.shown = null; return; }
  live.shown = {seed, idx:dec.length, a:ps.m.a, b:ps.m.b};
  if (liveOn()) showLive({pp, m:ps.m, chose, to:{seed, idx:dec.length}});
}
function showLive(o){
  const el = $('#live');
  const faces = o.done ? face(o.champ) : face(o.m.a) + face(o.m.b);
  const top = o.done ? `${esc(o.pp.name)} нашёл(ла) пару` : `${esc(o.pp.name)} ${liveWhere(o.m)}`;
  const main = o.done ? esc(name(o.champ)) : `${esc(name(o.m.a))} или ${esc(name(o.m.b))}?`;
  const was = o.chose && !o.done ? `<small class="live-was">Выбор: ${esc(name(o.chose))}</small>` : '';
  el.innerHTML = `<div class="live-faces">${faces}</div>
    <div class="live-txt">${was}<small>${top}</small><b>${main}</b>
      <div class="live-re">${REACTS.map(r => `<button type="button" data-r="${r}" aria-label="Ответить реакцией ${r}">${r}</button>`).join('')}</div>
      <button class="live-off" type="button">Выключить эти новости</button>
    </div>
    <button class="live-x" type="button" aria-label="Скрыть">×</button>`;
  el.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => sendReaction(o, b.dataset.r)));
  el.querySelector('.live-x').addEventListener('click', hideLive);
  el.querySelector('.live-off').addEventListener('click', () => { setLive(false); toast('Новости из плей-офф выключены. Включить можно в комнате'); });
  el.hidden = false; void el.offsetWidth; el.classList.add('on');
  clearTimeout(live.t); live.t = setTimeout(hideLive, o.done ? 16000 : 14000);
}
function hideLive(){
  const el = $('#live'); clearTimeout(live.t);
  if (el.hidden) return;
  el.classList.remove('on'); live.t = setTimeout(() => { el.hidden = true; }, 260);
}
function setLive(on){
  store.set('rp-live', !!on); $('#liveToggle').checked = !!on;
  if (!on) hideLive(); else { live.key = ''; checkLive(); }
}
function sendReaction(o, e){
  RX = {to:o.to, e, at:Date.now()}; pushState(true);
  const re = $('#live .live-re'); if (re) re.innerHTML = `<span class="sent">${e} отправлено</span>`;
  clearTimeout(live.t); live.t = setTimeout(hideLive, 2200);
}
function checkReaction(pp){
  const r = pp.state && pp.state.react;
  if (!r || !r.at || !r.to || !S.cfg || r.to.seed !== S.cfg.seed || !REACTS.includes(r.e)) return;
  if (r.at <= (store.get(reactSeenKey()) || 0)) return;
  store.set(reactSeenKey(), r.at);
  if (Date.now() - r.at > 15 * 60 * 1000) return;      // старые реакции не показываем
  const m = simulate(S.cfg, S.dec.slice(0, Math.max(0, +r.to.idx || 0)));
  const about = m.kind === 'duel' ? `на «${name(m.a)} или ${name(m.b)}»` : `на твою пару: ${name(m.champ)}`;
  showReaction(pp.name, r.e, about);
}
let rxT = 0;
function showReaction(who, e, about){
  const el = $('#reactFx');
  el.innerHTML = `<span class="rx-e" aria-hidden="true">${e}</span><span class="rx-t"><b>${esc(who)}</b> отвечает ${esc(about)}</span>`;
  el.setAttribute('aria-label', `${who} отвечает ${about}: ${e}`);
  el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  Sound.pick(1);
  clearTimeout(rxT); rxT = setTimeout(() => { el.classList.remove('on'); rxT = setTimeout(() => { el.hidden = true; }, 260); }, 4600);
  if (reduced) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 5; i++){
    const f = document.createElement('span');
    f.className = 'rx-float'; f.textContent = e; f.setAttribute('aria-hidden', 'true');
    f.style.left = (r.left + 10 + Math.random() * Math.max(40, r.width - 40)) + 'px';
    f.style.top = (r.top + (r.top > innerHeight / 2 ? -10 : r.height + 140)) + 'px';
    f.style.animationDelay = (i * 120) + 'ms';
    document.body.appendChild(f); setTimeout(() => f.remove(), 2800 + i * 120);
  }
}

/* ================= общий турнир: одна и та же пара у обоих, выбор втайне, ответы открываются разом ================= */
const SYNC_N = 16;
const syncOf = p => { const y = p && p.state && p.state.sync; return y && y.id && y.cfg && Array.isArray(y.cfg.roster) && validTournament({cfg:y.cfg, dec:[]}) ? y : null; };
function syncStatus(){
  const pp = partner(), th = syncOf(pp);
  if (!pp) return {state:'none'};
  if (SY && th && th.id === SY.id) return {state:'on', pp, th};
  if (th && th.host === pp.slot && (!SY || SY.id !== th.id)) return {state:'invited', pp, th};
  if (SY && SY.host === sess.slot) return {state:'waiting', pp};
  return {state:'none', pp};
}
const syncTitle = cfg => cfg.theme && themeOf(cfg.theme) ? `«${themeOf(cfg.theme)[1]}»` : 'на 16 случайных чемпионов';
/* кто за что голосовал и чем решилась каждая дуэль; одинаково считается у обоих */
function syncCalc(){
  const st = syncStatus(); if (st.state !== 'on') return null;
  const first = sess.slot === 1, mine = SY.v || [], theirs = st.th.v || [];
  const va = first ? mine : theirs, vb = first ? theirs : mine, dec = [], log = [];
  const g = tournament(SY.cfg); let r = g.next();
  for (let i = 0; !r.done; i++){
    const a = va[i], b = vb[i]; let d, how;
    if (!a || !b) break;
    if (a[0] === b[0]){ d = a[0]; how = 'agree'; }
    else if (a[1] == null || b[1] == null) break;
    else if (a[1] === b[1]){ d = a[1]; how = 'revote'; }
    else { d = mulberry32((SY.cfg.seed ^ Math.imul(i + 1, 2654435761)) >>> 0)() < .5 ? 0 : 1; how = 'coin'; }   // жребий
    d = d ? 1 : 0; dec.push(d); log.push({how, a, b}); r = g.next(d);
  }
  const m = Object.assign({kind: r.done ? 'done' : 'duel'}, r.value), i = dec.length, my = mine[i] || null, th = theirs[i] || null;
  const phase = m.kind === 'done' ? 'done' : !my ? 'pick1' : !th ? 'wait1' : my[1] == null ? 'pick2' : 'wait2';
  return {pp:st.pp, m, dec, log, i, my, th, phase, first};
}
function syncSetup(){
  const pp = partner(); if (!pp) return toast('Сначала дождись партнёра в комнате');
  const all = CH.map(c => c[0]);
  openModal(`<p class="eyebrow">Вдвоём</p><h2>Общий турнир</h2>
    <p style="margin-top:12px">Одна и та же пара у вас обоих одновременно. Каждый выбирает втайне, ответы открываются разом. Если разошлись, можно один раз переголосовать, а дальше решает жребий. В конце — общий тир-лист пары и процент согласия.</p>
    <p class="muted" style="margin-top:8px">16 участников, около ${estimate(SYNC_N, 'fast')} ${duelsWord(estimate(SYNC_N, 'fast'))}, минуты на три. Играйте, когда оба в сети.</p>
    <div class="sy-pick">
      <button type="button" class="mini" data-k=""><span class="mini-faces" aria-hidden="true">${['Ahri','Garen','Jinx'].map(id => face(id)).join('')}</span><b>Случайные</b><small>16 чемпионов наугад</small></button>
      ${THEMES.map(([k, t, d, f, pics]) => `<button type="button" class="mini" data-k="${k}"><span class="mini-faces" aria-hidden="true">${pics.map(id => face(id)).join('')}</span><b>${esc(t)}</b><small>${esc(d)}</small></button>`).join('')}
    </div>`);
  $('#modalBody').querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => syncCreate(b.dataset.k || null)));
}
function syncCreate(k){
  const t = k && themeOf(k), ids = CH.map(c => c[0]).filter(id => !t || t[3](id));
  for (let i = ids.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const roster = ids.slice(0, SYNC_N).sort((a, b) => IDX[a] - IDX[b]);
  const id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).slice(0, 12);
  SY = {id, host:sess.slot, at:Date.now(), cfg:{v:ENGINE_VERSION, who:'all', extra:true, mode:'fast', seed:(Math.random() * 4294967296) >>> 0, roster, removed:[], bet:null}, v:[]};
  if (k) SY.cfg.theme = k;
  store.set(syKey(sess.code), SY); pushState(true); closeModal(); preloadAll(roster);
  show('scr-room'); renderRoom();
  toast('Приглашение отправлено. Турнир начнётся, когда партнёр присоединится');
}
function syncJoin(){
  const st = syncStatus(); if (st.state !== 'invited') return;
  SY = {id:st.th.id, host:st.th.host, at:Date.now(), cfg:st.th.cfg, v:[]};
  store.set(syKey(sess.code), SY); pushState(true); startSync();
}
function startSync(){
  if (syncStatus().state !== 'on') return;
  ui.mode = 'sync'; ui.sy = null; ui.syAnim = false; ui.lock = false;
  show('scr-duel'); preloadAll(SY.cfg.roster); renderSync();
}
function syncPick(side){
  const x = syncCalc(); if (!x || ui.syAnim) return;
  const v = SY.v || (SY.v = []);
  if (x.phase === 'pick1') v[x.i] = [side, null];
  else if (x.phase === 'pick2') v[x.i] = [v[x.i][0], side];
  else return;
  store.set(syKey(sess.code), SY); pushState(true);
  Sound.pick(x.m.level || 0);
  renderSync();
}
function syncOnFetch(){
  const st = syncStatus();
  if (st.state === 'invited' && ui.syInvite !== st.th.id){
    ui.syInvite = st.th.id;
    if (ui.screen !== 'scr-room') toast(`${st.pp.name} зовёт в общий турнир — загляни в комнату`, 5000);
  }
  /* партнёр принял приглашение: если ждём в комнате, начинаем сразу */
  if (st.state === 'on' && SY.host === sess.slot && !(SY.v || []).length && ui.syStarted !== SY.id){
    ui.syStarted = SY.id;
    if (ui.screen === 'scr-room'){ toast(`${st.pp.name} в игре — начинаем!`); startSync(); return; }
  }
  if (ui.mode === 'sync' && ui.screen === 'scr-duel') renderSync();
}
function clearVtags(){ $('#vt0').innerHTML = ''; $('#vt1').innerHTML = ''; }
/* ярлыки с именами на картах: кто за кого */
function putVtags(myS, thS, pp){
  const tag = (who, me) => `<b class="${me ? 'me' : ''}">${esc(who)}</b>`;
  [0, 1].forEach(sd => { $('#vt' + sd).innerHTML = (myS === sd ? tag('Ты', true) : '') + (thS === sd ? tag(pp.name) : ''); });
}
function renderSync(){
  if (ui.syAnim) return;
  const x = syncCalc();
  if (!x){ ui.mode = 'play'; clearVtags(); show('scr-room'); renderRoom(); return; }
  if (ui.sy && ui.sy.i === x.i - 1 && x.log[x.i - 1] && ui.screen === 'scr-duel') return syncReveal(x);
  if (x.phase === 'done'){ ui.mode = 'play'; clearVtags(); return renderSyncResult(); }
  const m = x.m, pp = x.pp, fresh = !ui.sy || ui.sy.i !== x.i;
  if (ui.screen !== 'scr-duel') show('scr-duel');
  ui.cur = {kind:'duel', a:m.a, b:m.b, level:m.level, stage:'sync'};
  if (fresh){
    setCard(0, m.a); setCard(1, m.b);
    const ar = $('#arena'); ar.className = 'arena' + (m.level ? ' lv' + m.level : ''); void ar.offsetWidth; ar.classList.add('enter');
    FX.setLevel(m.level || 0);
    if (x.i === 0) FX.intro(1, 'Общий турнир', syncTitle(SY.cfg), 'Вдвоём');
    else if (m.stage === 'final') FX.intro(3, 'Гранд-финал', `${name(m.a)} или ${name(m.b)}`, 'Вдвоём');
    [0, 1].forEach(i => { const n = simulate(SY.cfg, x.dec.concat(i)); if (n.kind === 'duel'){ new Image().src = img(n.a); new Image().src = img(n.b); } });
  }
  ui.sy = {i:x.i, a:m.a, b:m.b};
  const agree = x.log.filter(l => l.how === 'agree').length, on = online.has(pp.slot);
  $('#stage').textContent = 'Общий турнир · ' + stageLabel(m);
  $('#counter').textContent = `Дуэль ${x.i + 1} из ≈${m.est}` + (x.i ? ` · совпали ${agree} из ${x.i}` : '');
  $('#barFill').style.width = Math.min(99.5, 100 * x.i / m.est).toFixed(2) + '%';
  const p = $('#prompt'), sp = $('#subprompt'), egg = EGG[m.a + '|' + m.b];
  p.classList.toggle('final', m.stage === 'final'); p.classList.toggle('egg', !!egg && m.stage !== 'final');
  const cards = [$('#card0'), $('#card1')];
  cards.forEach(c => { c.classList.remove('chosen', 'lost'); c.style.transform = ''; });
  const r = $('#reveal'); r.className = 'reveal';
  if (x.phase === 'pick1' || x.phase === 'wait1'){
    p.textContent = m.stage === 'final' ? 'Гранд-финал. Какой будет ваша общая пара?' : egg || PROMPTS[x.i % PROMPTS.length];
    sp.hidden = true; clearVtags();
    if (x.phase === 'wait1'){ cards[x.my[0]].classList.add('chosen'); cards[1 - x.my[0]].classList.add('lost'); }
    r.textContent = x.phase === 'pick1' ? (x.th ? `${pp.name} уже выбрал(а) — твой ход` : '') : on ? `Ждём, что выберет ${pp.name}…` : `${pp.name} сейчас не в сети. Продолжите, когда оба будете здесь`;
  } else {
    p.textContent = 'Вы разошлись. Переголосуете?'; p.classList.remove('egg');
    sp.hidden = false; sp.textContent = 'Можно остаться при своём или уступить. Если снова разойдётесь, решит жребий.';
    putVtags(x.my[0], x.th[0], pp);
    if (x.phase === 'wait2'){ cards[x.my[1]].classList.add('chosen'); cards[1 - x.my[1]].classList.add('lost'); }
    r.textContent = x.phase === 'pick2' ? `${pp.name}: ${name(x.th[0] ? m.b : m.a)}, ты: ${name(x.my[0] ? m.b : m.a)}` : on ? `Ждём, что решит ${pp.name}…` : `${pp.name} сейчас не в сети`;
  }
  $('#undoBtn').hidden = true; $('#bracketBtn').hidden = true;
  /* пока ждём партнёра, подстрахуемся частым опросом на случай, если живое обновление потерялось */
  clearTimeout(ui.syPoll);
  if (x.phase === 'wait1' || x.phase === 'wait2') ui.syPoll = setTimeout(() => { if (ui.mode === 'sync') fetchRoom(); }, 3000);
  const chip = $('#partnerChip'); chip.hidden = false;
  const done = x.phase === 'wait1' || x.phase === 'pick1' ? !!x.th : x.th[1] != null;
  chip.innerHTML = `<span class="dot ${on ? 'on' : ''}"></span><b>${esc(pp.name)}</b> · ${done ? 'выбор сделан' : 'выбирает'}`;
}
/* предыдущая дуэль решилась — коротко показываем, как именно */
function syncReveal(x){
  const L = x.log[x.i - 1], d = x.dec[x.i - 1], prev = ui.sy, cards = [$('#card0'), $('#card1')];
  ui.syAnim = true; ui.lock = true; ui.sy = null;
  cards.forEach(c => c.classList.remove('chosen', 'lost'));
  cards[d].classList.add('chosen'); cards[1 - d].classList.add('lost');
  const mine = x.first ? L.a : L.b, theirs = x.first ? L.b : L.a, k = L.how === 'agree' ? 0 : 1;
  putVtags(mine[k], theirs[k], x.pp);
  const who = name(d ? prev.b : prev.a), r = $('#reveal');
  r.className = 'reveal ' + (L.how === 'coin' ? 'no' : 'ok');
  r.textContent = L.how === 'agree' ? 'Совпали!' : L.how === 'revote' ? `Договорились: ${who}` : `Не договорились. Жребий: ${who}`;
  $('#subprompt').hidden = true;
  Sound.pick(L.how === 'agree' ? 2 : 0);
  if (L.how === 'agree') FX.burst(...cardCenter(d), 1);
  const end = x.m.kind === 'done';
  if (end){ Sound.fanfare(); FX.celebrate(); }
  setTimeout(() => { ui.syAnim = false; ui.lock = false; clearVtags(); renderSync(); }, end ? 1900 : L.how === 'agree' ? 1100 : 1700);
}
function renderSyncBox(){
  const box = $('#rSync'), st = syncStatus(); let h = '';
  if (st.state === 'invited') h = `<h3>${esc(st.pp.name)} зовёт в общий турнир ${esc(syncTitle(st.th.cfg))}</h3>
      <p>Одна и та же пара у обоих, выбор втайне, ответы открываются разом. Около ${estimate(st.th.cfg.roster.length, st.th.cfg.mode)} ${duelsWord(estimate(st.th.cfg.roster.length, st.th.cfg.mode))}.</p>
      <div class="res-actions"><button class="btn primary" type="button" data-act="sync-join">Присоединиться</button></div>`;
  if (st.state === 'waiting') h = `<h3>Общий турнир ${esc(syncTitle(SY.cfg))}</h3>
      <p>Приглашение отправлено. Турнир начнётся, когда ${esc(st.pp.name)} присоединится.</p>
      <div class="res-actions"><button class="btn ghost" type="button" data-act="sync-cancel">Отменить</button></div>`;
  if (st.state === 'on'){
    const x = syncCalc();
    h = x.phase === 'done'
      ? `<h3>Общий турнир: ваша пара — ${esc(name(x.m.champ))}</h3><p>Совпали с первого раза в ${x.log.filter(l => l.how === 'agree').length} из ${x.log.length} дуэлей.</p>
         <div class="res-actions"><button class="btn primary" type="button" data-act="sync-res">Итог общего турнира</button><button class="btn" type="button" data-act="sync-new">Ещё один</button></div>`
      : `<h3>Общий турнир ${esc(syncTitle(SY.cfg))}</h3><p>Позади ${x.i} из ≈${x.m.est} дуэлей.</p>
         <div class="res-actions"><button class="btn primary" type="button" data-act="sync-go">${x.i ? 'Продолжить' : 'Начать'}</button></div>`;
  }
  box.hidden = !h; box.innerHTML = h;
  box.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => roomAction(b.dataset.act)));
}
function renderSyncResult(){
  const x = syncCalc(); if (!x || x.phase !== 'done') return;
  ui.cur = null; show('scr-sync'); FX.setLevel(0);
  const it = $('#intro'); if (!it.hidden && it.onclick) it.onclick();
  const m = x.m, w = BY[m.champ], pp = x.pp, n = x.log.length;
  const agree = x.log.filter(l => l.how === 'agree').length, re = x.log.filter(l => l.how === 'revote').length, coin = n - agree - re;
  $('#syHead').innerHTML = `<div class="wimg"><img src="${img(w.id)}" alt="${esc(w.name)}"></div>
    <div class="wtext"><p class="eyebrow">Общий турнир ${esc(syncTitle(SY.cfg))}</p><h1>${esc(w.name)}</h1><p class="ttl">${esc(w.title)}</p>
      <p class="path">Общая пара: ${esc(sess.name)} и ${esc(pp.name)}. ${PROFILE[m.champ] ? esc(PROFILE[m.champ][3]) : ''}</p></div>`;
  $('#syStats').innerHTML = [[Math.round(100 * agree / Math.max(1, n)) + '%', `согласие: совпали с первого раза в ${agree} из ${n} дуэлей`], [re, `${plural(re,'раз','раза','раз')} договорились после переголосовки`], [coin, `${plural(coin,'раз','раза','раз')} решал жребий`]]
    .map(([b, t]) => `<div class="sy-stat"><b>${b}</b><small>${t}</small></div>`).join('');
  const t = $('#syTiers'); t.innerHTML = '<h2>Общий тир-лист</h2>';
  const sizes = tierSizesOf(m); let pos = 0;
  TIERS.forEach(([L, label, tok], ti) => { t.appendChild(tierRow(L, label, tok, m.order.slice(pos, pos + sizes[ti]), pos)); pos += sizes[ti]; });
  const dl = duelLog(SY.cfg, x.dec), fights = [];
  x.log.forEach((l, i) => { if (l.how !== 'agree') fights.push({i, l, a:dl[i].a, b:dl[i].b, d:x.dec[i]}); });
  $('#syFightsSec').hidden = !fights.length;
  const nm = (v, f) => name(v ? f.b : f.a);
  $('#syFights').innerHTML = fights.slice(-8).reverse().map(f => {
    const mine = x.first ? f.l.a : f.l.b, theirs = x.first ? f.l.b : f.l.a;
    return `<div class="lrow sy-f">${face(f.d ? f.b : f.a)}<div><b>${esc(name(f.a))} или ${esc(name(f.b))}</b><small>${esc(sess.name)}: ${esc(nm(mine[0], f))}, ${esc(pp.name)}: ${esc(nm(theirs[0], f))}. ${f.l.how === 'coin' ? 'Решил жребий' : 'Договорились'}: ${esc(nm(f.d, f))}</small></div></div>`;
  }).join('');
}

/* «Угадай мой выбор» */
function startGuess(){
  const pp = partner(), ps = playerState(pp);
  if (ps.status !== 'done') return toast('Партнёр ещё не закончил турнир');
  if (!G || G.target !== pp.slot || G.seed !== ps.s.cfg.seed){
    G = {target:pp.slot, seed:ps.s.cfg.seed, list:guessSet(ps.s.cfg, ps.s.dec), picks:[], done:false};
    store.set(guessKey(sess.code), G);
  }
  ui.mode = 'guess'; show('scr-duel'); renderGuess();
}
function renderGuess(){
  const pp = partner(), i = G.picks.length;
  if (i >= G.list.length){
    G.done = true; store.set(guessKey(sess.code), G); pushState(true);
    const ok = G.picks.filter(p => p.ok).length;
    ui.mode = 'play'; show('scr-room'); renderRoom();
    toast(`Угадано ${ok} из ${G.list.length}. ${ok >= G.list.length * .8 ? 'Вы прекрасно друг друга знаете!' : ok >= G.list.length * .6 ? 'Неплохо!' : 'Есть куда расти — и о чём поговорить.'}`, 6000);
    return;
  }
  const x = G.list[i];
  ui.cur = {kind:'duel', a:x.a, b:x.b, level:x.level, stage:'guess'};
  $('#stage').textContent = `Угадай мой выбор · ${x.stage === 'final' ? 'гранд-финал' : x.label || 'дуэль турнира'}`;
  $('#counter').textContent = `Вопрос ${i + 1} из ${G.list.length} · угадано ${G.picks.filter(p => p.ok).length}`;
  $('#barFill').style.width = (100 * i / G.list.length).toFixed(1) + '%';
  $('#prompt').textContent = `Кого выберет ${pp ? pp.name : 'партнёр'}?`; $('#prompt').className = 'prompt';
  $('#subprompt').hidden = true;
  setCard(0, x.a); setCard(1, x.b);
  const ar = $('#arena'); ar.className = 'arena' + (x.level ? ' lv' + Math.min(2, x.level) : ''); void ar.offsetWidth; ar.classList.add('enter');
  FX.setLevel(0);
  $('#undoBtn').hidden = true; $('#bracketBtn').hidden = true; $('#partnerChip').hidden = true;
  $('#reveal').textContent = ''; $('#reveal').className = 'reveal';
}
function guessPick(side){
  ui.lock = true;
  const x = G.list[G.picks.length], ok = side === x.d, cards = [$('#card0'), $('#card1')];
  cards[side].classList.add(ok ? 'right' : 'lost'); if (!ok) cards[x.d].classList.add('chosen');
  const r = $('#reveal'); r.className = 'reveal ' + (ok ? 'ok' : 'no');
  r.textContent = ok ? 'Угадано!' : `Мимо! Правильный ответ: ${name(x.d === 0 ? x.a : x.b)}`;
  Sound.pick(ok ? 2 : 0); if (ok) FX.burst(...cardCenter(side), 1);
  G.picks.push({i:x.i, pick:side, ok}); store.set(guessKey(sess.code), G); queueSync();
  setTimeout(() => { ui.lock = false; renderGuess(); }, ok ? 900 : 1700);
}

/* ================= связывание ================= */
function bind(){
  $('#setup').addEventListener('change', refreshStart);
  $('#setup').addEventListener('submit', e => { e.preventDefault(); startFlow(); });
  $('#resumeBtn').addEventListener('click', () => { if (S.cfg){ preloadAll(S.cfg.roster); go(); } });
  $('#fback').addEventListener('click', () => { show('scr-start'); refreshStart(); });
  $('#freset').addEventListener('click', () => { ui.off.clear(); document.querySelectorAll('#fgrid .gcard').forEach(b => { b.classList.remove('off'); b.setAttribute('aria-pressed','false'); }); refreshFilter(); });
  $('#fstart').addEventListener('click', () => {
    const ids = pool(settings()), keep = ids.filter(id => !ui.off.has(id));
    if (keep.length >= MIN_N) openBet(keep, ids.filter(id => ui.off.has(id)));
  });
  $('#betSearch').addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); document.querySelectorAll('#bgrid .gcard').forEach(b => b.hidden = !!q && !b.dataset.q.includes(q)); });
  $('#bskip').addEventListener('click', () => { if (ui.betFor === 'partner'){ show('scr-room'); renderRoom(); } else newTournament(ui.betRoster, ui.betRemoved, null); });
  $('#bstart').addEventListener('click', () => { if (ui.betFor === 'partner') savePartnerBet(ui.bet); else newTournament(ui.betRoster, ui.betRemoved, ui.bet); });
  $('#card0').addEventListener('click', () => { if (!ui.swallowClick) pick(0); });
  $('#card1').addEventListener('click', () => { if (!ui.swallowClick) pick(1); });
  $('#undoBtn').addEventListener('click', undo);
  $('#menuBtn').addEventListener('click', () => { if (ui.mode === 'guess' || ui.mode === 'battle' || ui.mode === 'sync'){ ui.mode = 'play'; clearVtags(); show('scr-room'); renderRoom(); return; } if (ctx === 'room' && sess){ show('scr-room'); renderRoom(); } else { show('scr-start'); refreshStart(); } });
  $('#interGo').addEventListener('click', () => { ui.ack = true; go(); });
  $('#interBack').addEventListener('click', undo);
  $('#copyBtn').addEventListener('click', copyResult);
  $('#shareBtn').addEventListener('click', shareResult);
  $('#miniGrid').addEventListener('click', e => { const b = e.target.closest('.mini'); if (b && !b.disabled) startMini(b.dataset.k); });
  $('#installBtn').addEventListener('click', async () => { if (!installEvt) return; const e = installEvt; installEvt = null; e.prompt(); try { await e.userChoice; } catch(err){} refreshInstall(); });
  $('#selfBtn').addEventListener('click', () => { location.href = location.pathname; });
  $('#newBtn').addEventListener('click', () => { show('scr-start'); refreshStart(); });
  $('#toRoomBtn').addEventListener('click', () => { show('scr-room'); renderRoom(); fetchRoom(); });
  $('#refinalBtn').addEventListener('click', undo);
  $('#certName').addEventListener('input', drawCertPreview);
  const saveImage = async (cv, file, done) => {
    if (window.RP_CONFIG && RP_CONFIG.inlineSave){
      openModal(`<p class="eyebrow">Картинка готова</p><p class="muted" style="margin:6px 0 12px">Нажми и удерживай картинку (на компьютере — правая кнопка мыши), чтобы сохранить её.</p><img alt="Готовая картинка" src="${cv.toDataURL('image/png')}" style="width:100%;height:auto;border:1px solid var(--gold-lo)">`);
      return;
    }
    const r = await Share.save(cv, file); if (r === 'saved') toast(done);
  };
  $('#certBtn').addEventListener('click', async () => { const m = ui.cur; if (m && m.kind === 'done') saveImage(await Share.certificate(m, $('#certName').value), 'para-iz-runterry-sertifikat.png', 'Сертификат сохранён'); });
  $('#pairCertBtn').addEventListener('click', async () => { const d = pairData(); if (d) saveImage(await Share.pairCertificate(d), 'para-iz-runterry-na-dvoih.png', 'Сертификат на двоих сохранён'); });
  $('#tierImgBtn').addEventListener('click', async () => { const m = ui.cur; if (m && m.kind === 'done') saveImage(await Share.tierList(m, (S.cfg.removed || []).filter(id => BY[id]), $('#certName').value.trim()), 'para-iz-runterry-tir-list.png', 'Тир-лист сохранён'); });
  $('#soundBtn').addEventListener('click', () => { const on = Sound.toggle(); $('#soundBtn').setAttribute('aria-pressed', String(on)); $('#soundWaves').style.display = on ? '' : 'none'; });
  $('#soundBtn').setAttribute('aria-pressed', String(Sound.on)); $('#soundWaves').style.display = Sound.on ? '' : 'none';
  $('#bracketBtn').addEventListener('click', () => { const m = ui.cur; openModal(`<p class="eyebrow">Плей-офф</p><h2 style="font-size:32px;margin:4px 0 14px">Сетка</h2><div class="bracket-wrap">${bracketHTML(m.bracket || [], m)}</div>`); });
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  $('#roomCreate').addEventListener('click', roomCreate);
  $('#roomJoin').addEventListener('click', roomJoin);
  $('#roomOpen').addEventListener('click', () => enterRoom(false));
  $('#rLeave').addEventListener('click', leaveRoom);
  $('#liveToggle').checked = liveOn();
  $('#syImg').addEventListener('click', async () => { const x = syncCalc(); if (x && x.phase === 'done') saveImage(await Share.tierList(x.m, [], `${sess.name} и ${x.pp.name}`), 'para-iz-runterry-obshchiy-tir-list.png', 'Общий тир-лист сохранён'); });
  $('#syAgain').addEventListener('click', syncSetup);
  $('#svGo').addEventListener('click', startSvaha);
  $('#mapBtn').addEventListener('click', async () => { const m = ui.cur; if (m && m.kind === 'done') saveImage(await Share.heartMap(m, VIEW && VIEW.name ? VIEW.name : ''), 'para-iz-runterry-karta-serdca.png', 'Карта сердца сохранена'); });
  $('#syRoom').addEventListener('click', () => { show('scr-room'); renderRoom(); });
  $('#liveToggle').addEventListener('change', e => setLive(e.target.checked));
  $('#rCopy').addEventListener('click', () => {
    const link = location.origin + location.pathname + '?room=' + sess.code;
    const text = `Заходи в нашу комнату «Пара из Рунтерры»: ${link} (код ${sess.code})`;
    try { navigator.clipboard.writeText(text).then(() => toast('Приглашение скопировано'), () => toast(text, 8000)); } catch(e){ toast(text, 8000); }
  });
  $('#cBack').addEventListener('click', () => { show('scr-room'); renderRoom(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal').hidden) return closeModal();
    if (e.altKey || e.ctrlKey || e.metaKey || !$('#modal').hidden || !$('#intro').hidden) return;
    if (ui.screen === 'scr-mutual' && /^[1-4]$/.test(e.key)){ e.preventDefault(); muAnswer(+e.key - 1); }
    if (ui.screen === 'scr-svaha' && /^[1-4]$/.test(e.key) && !$('#svWrap').hidden){ e.preventDefault(); svAnswer(+e.key - 1); }
    if (ui.screen === 'scr-duel'){
      if (e.key === 'ArrowLeft' || e.key === '1'){ e.preventDefault(); pick(0); }
      else if (e.key === 'ArrowRight' || e.key === '2'){ e.preventDefault(); pick(1); }
      else if (e.key === 'Backspace'){ e.preventDefault(); undo(); }
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && saveT) pushState(true); else if (!document.hidden && sess) fetchRoom(); });
  document.querySelectorAll('.pick img').forEach(im => im.addEventListener('error', () => im.classList.add('broken')));
  bindSwipe();
  bindTilt();
}

function start(){
  document.body.dataset.screen = ui.screen;
  bind();
  registerSW();
  heroInit();
  const rCode = new URLSearchParams(location.search).get('r');
  if (rCode && startView(rCode)) return;
  const askDev = /^#dev=/.test(location.hash) || new URLSearchParams(location.search).has('tools');
  if (askDev && window.crypto && crypto.subtle){ devAccess().then(ok => ok ? startTools() : startNormal()); return; }
  startNormal();
}
function startTools(){
  TOOLS = true; ctx = 'solo'; S = {cfg:null, dec:[]};
  refreshStart(); show('scr-start');
  const s = document.createElement('script'); s.src = 'js/tools.js'; document.body.appendChild(s);
}
function startNormal(){
  const qs = new URLSearchParams(location.search), inv = (qs.get('room') || '').toUpperCase();
  if (inv) $('#roomCode').value = inv;
  if (sess && (!inv || inv === sess.code) && Room.configured()){ setCtx('room'); refreshStart(); enterRoom(false); return; }
  if (inv && sess && inv !== sess.code){ sstore.del('rp-session'); sess = null; }
  setCtx(sstore.get('rp-ctx') === 'room' && sess ? 'room' : 'solo');
  refreshStart(); show('scr-start');
  if (inv){ $('#roomBox').scrollIntoView({block:'center'}); $('#roomName').focus(); }
}
start();

/* Пара из Рунтерры: турнир образов.
   Когда пара найдена, её образы (скины) сходятся в дуэлях на выбывание, и выясняется любимый.
   Список образов с русскими названиями и арты берутся из Data Dragon, поэтому здесь нужен интернет. */

const DD = 'https://ddragon.leagueoflegends.com';
/* у Рааста своих образов нет — они общие с Каином; Волк и Овечка делят образы Киндред */
const DD_ID = {KindredWolf:'Kindred', KindredLamb:'Kindred', Rhaast:'Kayn'};
const ddId = id => DD_ID[id] || id;
/* Омика — не чемпион, своих образов у неё нет */
const DD_NONE = new Set(['Omika']);
const skinArt = (id, n) => `${DD}/cdn/img/champion/loading/${ddId(id)}_${n}.jpg`;
const SK_TTL = 3 * 864e5;
let ddVer = null;
const skMem = {};

async function ddVersion(){
  if (ddVer) return ddVer;
  const c = store.get('rp-ddv');
  if (c && c.v && Date.now() - c.at < SK_TTL) return ddVer = c.v;
  const r = await fetch(DD + '/api/versions.json');
  if (!r.ok) throw new Error('dd');
  const v = (await r.json())[0];
  if (!/^\d+\.\d+\.\d+$/.test(v)) throw new Error('dd');
  store.set('rp-ddv', {v, at:Date.now()});
  return ddVer = v;
}
/* образы чемпиона без цветовых вариаций: у вариаций нет своего арта */
async function skinsOf(id){
  if (DD_NONE.has(id)) return [];
  if (skMem[id]) return skMem[id];
  const all = store.get('rp-skins') || {}, c = all[id];
  if (c && Array.isArray(c.list) && Date.now() - c.at < SK_TTL) return skMem[id] = c.list;
  const v = await ddVersion(), dd = ddId(id);
  const r = await fetch(`${DD}/cdn/${v}/data/ru_RU/champion/${dd}.json`);
  if (!r.ok) throw new Error('dd');
  const j = await r.json(), raw = ((j.data || {})[dd] || {}).skins || [];
  const list = raw.filter(s => s && s.parentSkin == null && Number.isInteger(s.num) && s.num >= 0)
    .map(s => ({n:s.num, name: s.num === 0 || s.name === 'default' ? 'Классический образ' : String(s.name).replace(/''(.+?)''/g, '«$1»').slice(0, 80)}));
  const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 15);
  const next = Object.fromEntries(keep); next[id] = {at:Date.now(), list};
  store.set('rp-skins', next);
  return skMem[id] = list;
}

/* сетка на выбывание: пары по порядку, при нечётном числе один образ проходит без дуэли */
function skBracket(sk){
  const r = mulberry32(sk.seed >>> 0);
  let alive = sk.list.map(s => s.n);
  for (let i = alive.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [alive[i], alive[j]] = [alive[j], alive[i]]; }
  const d = sk.d || [], rounds = [];
  let k = 0, round = 0;
  while (alive.length > 1){
    round++;
    const pool = alive.slice(), next = [], out = [];
    if (pool.length % 2) next.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    for (let i = 0; i < pool.length; i += 2){
      const a = pool[i], b = pool[i + 1];
      if (d[k] == null) return {kind:'duel', a, b, k, total:sk.list.length - 1, round, left:alive.length};
      next.push(d[k] ? b : a); out.push(d[k] ? a : b); k++;
    }
    rounds.push(out); alive = next;
  }
  return {kind:'done', order:[alive[0]].concat(...rounds.reverse()), total:sk.list.length - 1};
}
const skLabel = left => left <= 2 ? 'Финал' : left <= 4 ? 'Полуфинал' : left <= 8 ? 'Четвертьфинал' : 'Отбор';
const skName = (sk, n) => (sk.list.find(s => s.n === n) || {name:''}).name;

/* кнопка и итог на экране результата */
function renderSkCta(m){
  const box = $('#skCta'); if (!box) return;
  if (VIEW || !S.cfg){ box.hidden = true; return; }
  const sk = S.skins && S.skins.c === m.champ ? S.skins : null, N = esc(name(m.champ));
  const share = DD_ID[m.champ] ? ` Образы у ${m.champ === 'Rhaast' ? 'Рааста общие с Каином' : 'Волка и Овечки общие — это образы Киндред'}.` : '';
  if (sk && sk.fav != null){
    box.hidden = false;
    box.innerHTML = `<img class="sk-thumb" src="${skinArt(m.champ, sk.fav)}" alt="" loading="lazy">
      <p>Любимый образ: <b>${esc(skName(sk, sk.fav))}</b><small class="sk-stat" id="skStat"></small></p><button class="btn ghost" type="button" id="skGo">Переиграть</button>`;
    $('#skGo').addEventListener('click', () => startSkins(m.champ, true));
    skStatLine(m.champ, sk);
    return;
  }
  if (sk && sk.d.length){
    box.hidden = false;
    box.innerHTML = `<p><b>Турнир образов</b> не закончен: позади ${sk.d.length} из ${sk.list.length - 1} ${duelsOf(sk.list.length - 1)}.</p><button class="btn" type="button" id="skGo">Продолжить</button>`;
    $('#skGo').addEventListener('click', () => startSkins(m.champ));
    return;
  }
  box.hidden = false;
  box.innerHTML = `<p class="muted">Ищем образы: ${N}…</p>`;
  skinsOf(m.champ).then(list => {
    if (ui.cur !== m) return;
    if (list.length < 2){ box.hidden = true; return; }
    box.innerHTML = `<p><b>Какой именно образ?</b> ${list.length} ${plural(list.length, 'образ', 'образа', 'образов')} на выбор — найди любимый.${share}</p><button class="btn" type="button" id="skGo">Турнир образов</button>`;
    $('#skGo').addEventListener('click', () => startSkins(m.champ));
  }).catch(() => {
    if (ui.cur !== m) return;
    box.innerHTML = '<p class="muted">Турнир образов берёт арты из Data Dragon, а он сейчас недоступен. Проверь интернет.</p><button class="btn ghost" type="button" id="skGo">Ещё раз</button>';
    $('#skGo').addEventListener('click', () => renderSkCta(m));
  });
}
/* картинка победителя: любимый образ, если он выбран; без сети — обычный портрет */
function skWinnerImg(m){
  const im = $('#wImg'), sk = S.skins && S.skins.c === m.champ && !VIEW ? S.skins : null;
  im.onerror = null;
  if (sk && sk.fav){ im.onerror = () => { im.onerror = null; im.src = img(m.champ); }; im.src = skinArt(m.champ, sk.fav); }
}

/* старт: загружаем все арты заранее и выбрасываем те, что не открылись */
async function startSkins(id, again){
  let list;
  try { list = await skinsOf(id); } catch(e){ return toast('Data Dragon сейчас недоступен — нужен интернет'); }
  const sk = S.skins && S.skins.c === id && !again && S.skins.fav == null ? S.skins : null;
  if (sk){ ui.mode = 'skins'; ui.lock = false; show('scr-duel'); return renderSkinDuel(); }
  toast(`Загружаем образы: ${list.length}…`, 6000);
  const ok = await Promise.all(list.map(s => new Promise(res => {
    const im = new Image(), t = setTimeout(() => res(false), 12000);
    im.onload = () => { clearTimeout(t); res(true); }; im.onerror = () => { clearTimeout(t); res(false); };
    im.src = skinArt(id, s.n);
  })));
  $('#toast').classList.remove('on');
  const good = list.filter((s, i) => ok[i]);
  if (good.length < 2) return toast(good.length ? 'У этого чемпиона пока один образ' : 'Арты образов не загрузились — проверь интернет');
  S.skins = {c:id, seed:(Math.random() * 4294967296) >>> 0, list:good, d:[], fav:null};
  saveLocal();
  ui.mode = 'skins'; ui.lock = false;
  show('scr-duel'); renderSkinDuel();
}
function setSkinCard(i, id, n){
  const sk = S.skins, im = $('#img' + i), nm = skName(sk, n);
  im.classList.remove('broken'); im.src = skinArt(id, n); im.alt = nm;
  $('#nm' + i).textContent = nm;
  $('#tt' + i).textContent = n === 0 ? `${name(id)} · как в игре по умолчанию` : name(id);
  $('#ds' + i).textContent = '';
  const card = $('#card' + i); card.className = 'pick skin'; card.style.transform = '';
  card.setAttribute('aria-label', `Выбрать образ: ${nm}`);
  fitName($('#nm' + i));
}
function renderSkinDuel(){
  const sk = S.skins; if (!sk){ ui.mode = 'play'; return go(); }
  const x = skBracket(sk);
  if (x.kind === 'done'){
    sk.fav = x.order[0]; sk.order = x.order; saveLocal();
    if (ctx === 'room' && sess) pushState(true);
    ui.mode = 'play';
    toast(`Любимый образ: ${skName(sk, sk.fav)}`, 4200);
    Sound.fanfare(); FX.celebrate();
    return go();
  }
  const lvl = x.left <= 2 ? 2 : x.left <= 4 ? 1 : 0;
  ui.cur = {kind:'duel', a:x.a, b:x.b, level:lvl, stage:'skins'};
  $('#stage').textContent = `Турнир образов · ${name(sk.c)} · ${skLabel(x.left)}`;
  $('#counter').textContent = `Дуэль ${x.k + 1} из ${x.total}`;
  $('#barFill').style.width = (100 * x.k / Math.max(1, x.total)).toFixed(1) + '%';
  const p = $('#prompt'); p.className = 'prompt' + (x.left <= 2 ? ' final' : '');
  p.textContent = x.left <= 2 ? 'Финал. Какой образ твой?' : x.k === 0 ? 'Какой образ тебе ближе?' : 'Какой образ лучше?';
  $('#subprompt').hidden = true;
  setSkinCard(0, sk.c, x.a); setSkinCard(1, sk.c, x.b);
  const ar = $('#arena'); ar.className = 'arena' + (lvl ? ' lv' + lvl : ''); void ar.offsetWidth; ar.classList.add('enter');
  FX.setLevel(lvl);
  $('#undoBtn').hidden = false; $('#undoBtn').disabled = !sk.d.length;
  $('#bracketBtn').hidden = true; $('#partnerChip').hidden = true; $('#watchBar').hidden = true;
  $('#reveal').textContent = ''; $('#reveal').className = 'reveal';
  /* следующие арты — заранее */
  [0, 1].forEach(v => { const y = skBracket({...sk, d:sk.d.concat(v)}); if (y.kind === 'duel'){ new Image().src = skinArt(sk.c, y.a); new Image().src = skinArt(sk.c, y.b); } });
}
function skinPick(side){
  ui.lock = true;
  const cards = [$('#card0'), $('#card1')];
  cards[side].classList.add('chosen'); cards[1 - side].classList.add('lost');
  Sound.pick(ui.cur.level || 0);
  if (ui.cur.level) FX.burst(...cardCenter(side), ui.cur.level);
  S.skins.d.push(side); saveLocal();
  ui.skT = setTimeout(() => { ui.lock = false; if (ui.mode === 'skins') renderSkinDuel(); }, ui.cur.level ? 900 : 560);
}
function skinUndo(){
  if (!S.skins || !S.skins.d.length) return;
  clearTimeout(ui.skT); ui.lock = false;
  S.skins.d.pop(); saveLocal(); renderSkinDuel();
}

/* статистика турнира образов: у каждого чемпиона своя, с основным турниром не смешивается */
async function skStatLine(champ, sk){
  if (!Room.configured() || TOOLS || VIEW) return;
  const scope = 'skins:' + champ, sid = n => ddId(champ) + '_' + n, id = sid(sk.fav);
  try {
    if (!sk.statId){ sk.statId = newStatId(); saveLocal(); }
    if (ui.skSent !== sk.statId + ':' + sk.fav){
      await Room.stats.submit({id:sk.statId, scope, champ:id, top:(sk.order || [sk.fav]).slice(0, 10).map(sid), who:'all', n:Math.max(2, sk.list.length)});
      ui.skSent = sk.statId + ':' + sk.fav;
    }
    const g = await Room.stats.get(id, scope), total = +g.total || 0, mine = +g.mine || 0, el = $('#skStat');
    if (!el) return;
    const p = total ? Math.round(100 * mine / total) : 0;
    el.textContent = total < 2 ? 'Турнир образов этого чемпиона пока прошли только здесь.' : `Этот образ любимый у ${p}% тех, кто проходил турнир образов этого чемпиона (${mine} из ${total}).`;
  } catch(e){}
}

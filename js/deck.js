/* Пара из Рунтерры: колода пары.
   Общая коллекция карт чемпионов на двоих: каждый приносит карты в свою половину,
   а колода — это обе половины вместе. Цель — собрать всех. Золотые карты — за совпадения. */

const DK_PACK = 5;
let DK = null;   // моя половина колоды: {c:{id:[сколько, из них золотых]}, e:{ключ события: время}, p:[неоткрытые пакеты]}
const dkKey = () => 'rp-deck-' + (sess ? sess.code + '-' + sess.slot : '');
const dkIds = () => CH.map(c => c[0]);
const dkTheirs = () => { const pp = partner(), d = pp && pp.state && pp.state.deck; return d && d.c && typeof d.c === 'object' ? d.c : {}; };
function dkLoad(){
  const d = store.get(dkKey());
  DK = d && d.c && d.e && Array.isArray(d.p) ? d : {c:{}, e:{}, p:[]};
}
/* колода целиком: моя половина плюс половина партнёра */
function dkUnion(){
  const out = {};
  const add = (c, who) => Object.entries(c || {}).forEach(([id, v]) => {
    if (!BY[id] || !Array.isArray(v)) return;
    const o = out[id] || (out[id] = {me:0, th:0, g:0});
    o[who] += Math.max(0, Math.min(999, +v[0] || 0)); o.g += Math.max(0, Math.min(999, +v[1] || 0));
  });
  add(DK && DK.c, 'me'); add(dkTheirs(), 'th');
  return out;
}
const dkStats = u => { const ids = Object.keys(u); return {have:ids.length, gold:ids.filter(id => u[id].g).length, all:CH.length}; };

/* выдать карты за событие; одно событие — один раз */
function dkGive(key, title, cards){
  if (!DK || !sess || DK.e[key]) return false;
  const u = dkUnion(), seen = new Set(), list = [];
  cards.forEach(x => { if (BY[x.id] && !seen.has(x.id)){ seen.add(x.id); list.push({id:x.id, g:!!x.g, fresh:!u[x.id] || (!!x.g && !u[x.id].g)}); } });
  if (!list.length) return false;
  DK.e[key] = Date.now();
  const keys = Object.keys(DK.e); if (keys.length > 400) keys.sort((a, b) => DK.e[a] - DK.e[b]).slice(0, keys.length - 400).forEach(k => delete DK.e[k]);
  list.forEach(x => { const v = DK.c[x.id] || (DK.c[x.id] = [0, 0]); v[0]++; if (x.g) v[1]++; });
  DK.p.push({t:title, cards:list, at:Date.now()}); DK.p = DK.p.slice(-8);
  store.set(dkKey(), DK); pushState(true);
  dkNotify();
  return true;
}
function dkPick(from, r, k, taken){
  const pool = from.filter(id => BY[id] && !taken.includes(id)), out = [];
  while (out.length < k && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
/* в пакете обязательно есть карты, которых в колоде ещё нет: иначе всех никогда не собрать */
function dkPack(core, top, r){
  const cards = core.slice();
  dkPick(top, r, 2, cards).forEach(id => cards.push(id));
  const u = dkUnion(), miss = dkIds().filter(id => !u[id]);
  dkPick(miss.length ? miss : dkIds(), r, DK_PACK - cards.length, cards).forEach(id => cards.push(id));
  if (cards.length < DK_PACK) dkPick(dkIds(), r, DK_PACK - cards.length, cards).forEach(id => cards.push(id));
  return cards;
}
const dkOn = () => !!(DK && sess && ctx === 'room' && !VIEW && !TOOLS);

/* свой турнир в комнате закончен */
function dkTournament(m){
  if (!dkOn() || !S.cfg || m.kind !== 'done' || DK.e['t:' + S.cfg.seed]) return;
  const r = mulberry32((S.cfg.seed ^ 0x9e3779b9) >>> 0);
  const cards = dkPack([m.champ], m.order.slice(1, 20), r);
  dkGive('t:' + S.cfg.seed, 'Пакет за турнир', cards.map((id, i) => ({id, g:false, core:!i})));
}
/* голос в дуэли дня */
function dkDaily(day, pick){
  if (!DK || !sess) return;
  dkGive('d:' + day, 'Карта дня', [{id:pick}]);
}
/* общий турнир: общая пара — сразу золотая */
function dkSync(x){
  if (!DK || !sess || !SY) return;
  const r = mulberry32((SY.cfg.seed ^ 0x51ed270b) >>> 0);
  const cards = dkPack([x.m.champ], x.m.order.slice(1, 10), r);
  dkGive('s:' + SY.id, 'Пакет за общий турнир', cards.map((id, i) => ({id, g:!i})));
}
/* драфт: лучший из своей пятёрки */
function dkDraft(best){
  if (!DK || !sess || !DR || !BY[best]) return;
  dkGive('dr:' + DR.id, 'Карта за драфт пары', [{id:best}]);
}
/* совпадения, которые видно только вдвоём: одинаковый голос в дуэли дня и общие любимцы */
function deckOnFetch(){
  if (!DK || !sess) return;
  const pp = partner(); if (!pp) return;
  const mine = dailyMine(), theirs = dailyTheirs();
  Object.keys(mine).sort().slice(-14).forEach(d => {
    if (mine[d] && mine[d] === theirs[d] && BY[mine[d]]) dkGive('dm:' + d, 'Золотая карта: вы совпали в дуэли дня', [{id:mine[d], g:true}]);
  });
  const my = S.cfg && ctx === 'room' ? simulate(S.cfg, S.dec) : null, th = playerState(pp);
  if (my && my.kind === 'done' && th.status === 'done'){
    const key = 'cf:' + S.cfg.seed + ':' + th.s.cfg.seed;
    if (!DK.e[key]){
      const a = my.order.slice(0, 10), b = th.m.order.slice(0, 10);
      const both = a.filter(id => b.includes(id)).sort((x, y) => (a.indexOf(x) + b.indexOf(x)) - (a.indexOf(y) + b.indexOf(y))).slice(0, 3);
      if (both.length) dkGive(key, my.champ === th.m.champ ? 'Золотые карты: у вас одна пара!' : 'Золотые карты: общие любимцы', both.map(id => ({id, g:true})));
      else DK.e[key] = Date.now();
    }
  }
}
function dkNotify(){
  if (ui.screen === 'scr-room') return renderDeckBox(true);
  clearTimeout(ui.dkT);
  /* не перебиваем окошки о новых значках: ждём, пока они покажутся */
  const say = () => { if (collT || collQueue.length){ ui.dkT = setTimeout(say, 700); return; } toast('Колода пары: новый пакет карт — открыть можно в комнате', 4200); };
  ui.dkT = setTimeout(say, ui.screen === 'scr-result' ? 1500 : 300);
}

/* ---------- комната ---------- */
function renderDeckBox(pulse){
  const box = $('#rDeck'); if (!box) return;
  if (!DK || !partner()){ box.hidden = true; return; }
  const u = dkUnion(), st = dkStats(u), n = DK.p.length;
  const recent = Object.keys(DK.c).length ? (DK.p.length ? DK.p[DK.p.length - 1].cards.map(x => x.id) : []) : [];
  box.hidden = false;
  box.innerHTML = `<div class="dk-top">
      <div><h2>Колода пары</h2><p class="muted">Собрано <b>${st.have}</b> из ${st.all}${st.gold ? ` · золотых: ${st.gold}` : ''}</p></div>
      <div class="dk-fan" aria-hidden="true">${(recent.length ? recent : ['Ahri', 'Garen', 'Jinx']).slice(0, 5).map((id, i) => `<span class="${recent.length ? '' : 'off'}" style="--i:${i}">${face(id)}</span>`).join('')}</div>
    </div>
    <div class="pbar"><i style="width:${(100 * st.have / st.all).toFixed(1)}%"></i></div>
    <p class="muted dk-how">Карты приходят за каждый свой турнир в комнате, дуэль дня, общий турнир и драфт. Золотые — за совпадения: одинаковый голос в дуэли дня, общие любимцы, общая пара.</p>
    <div class="res-actions">
      ${n ? `<button class="btn primary ${pulse ? 'dk-pulse' : ''}" type="button" id="dkOpen">Открыть пакет${n > 1 ? ` (${n})` : ''}</button>` : ''}
      <button class="btn" type="button" id="dkAll">Вся колода</button>
    </div>`;
  const o = $('#dkOpen'); if (o) o.addEventListener('click', openPack);
  $('#dkAll').addEventListener('click', () => { show('scr-deck'); renderDeck(); });
}
function openPack(){
  if (!DK || !DK.p.length) return;
  const pk = DK.p[0], u = dkUnion(), st = dkStats(u), more = DK.p.length - 1;
  openModal(`<p class="eyebrow">Колода пары</p><h2>${esc(pk.t)}</h2>
    <div class="pk">${pk.cards.map((c, i) => `<div class="pk-c ${c.g ? 'gold' : ''}" style="--i:${i}"><div class="pk-in"><div class="pk-back" aria-hidden="true"></div>
      <div class="pk-front">${face(c.id)}<b>${esc(name(c.id))}</b>${c.fresh ? `<em>${c.g ? 'Золотая' : 'Новая'}</em>` : c.g ? '<em>Золотая</em>' : '<small>уже была</small>'}</div></div></div>`).join('')}</div>
    <p class="muted" style="margin-top:14px">В колоде теперь ${st.have} из ${st.all}${st.gold ? `, золотых: ${st.gold}` : ''}.</p>
    <div class="res-actions" style="margin-top:14px"><button class="btn primary" type="button" id="pkOk">${more ? `Дальше · ещё ${more}` : 'Забрать'}</button></div>`);
  Sound.pick(1); if (pk.cards.some(c => c.g)) setTimeout(() => Sound.fanfare(), 500);
  $('#pkOk').addEventListener('click', () => {
    DK.p.shift(); store.set(dkKey(), DK);
    if (DK.p.length) openPack(); else { closeModal(); if (ui.screen === 'scr-room') renderDeckBox(); }
  });
}

/* ---------- вся колода ---------- */
const DK_FILTERS = [['all', 'Все'], ['have', 'Есть'], ['miss', 'Не хватает'], ['gold', 'Золотые']];
function renderDeck(){
  if (!DK || !sess){ show('scr-room'); return renderRoom(); }
  const u = dkUnion(), st = dkStats(u), pp = partner(), f = ui.dkF || 'all';
  $('#dkSum').innerHTML = `<b>${st.have}</b> из ${st.all}${st.gold ? ` · золотых: ${st.gold}` : ''}`;
  $('#dkBar').style.width = (100 * st.have / st.all).toFixed(1) + '%';
  $('#dkFilter').innerHTML = DK_FILTERS.map(([k, t]) => `<button type="button" data-f="${k}" class="${k === f ? 'on' : ''}" aria-pressed="${k === f}">${t}</button>`).join('');
  $('#dkFilter').querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { ui.dkF = b.dataset.f; renderDeck(); }));
  const ok = id => f === 'all' || (f === 'have' && u[id]) || (f === 'miss' && !u[id]) || (f === 'gold' && u[id] && u[id].g);
  const groups = {};
  CH.forEach(c => { const id = c[0], r = (PROFILE[id] || ['rt'])[0]; (groups[r] || (groups[r] = [])).push(id); });
  const order = Object.keys(REGIONS).filter(k => groups[k]);
  const card = id => {
    const x = u[id], who = x ? [x.me ? `у тебя ×${x.me}` : '', x.th && pp ? `у партнёра ×${x.th}` : ''].filter(Boolean).join(', ') : 'ещё нет';
    return `<div class="dk-card ${x ? 'got' : ''} ${x && x.g ? 'gold' : ''}" title="${esc(name(id))}: ${who}${x && x.g ? ', есть золотая' : ''}">
      ${face(id)}<b>${esc(name(id))}</b>${x && x.me + x.th > 1 ? `<small>×${x.me + x.th}</small>` : ''}</div>`;
  };
  const html = order.map(k => {
    const ids = groups[k].filter(ok); if (!ids.length) return '';
    const have = groups[k].filter(id => u[id]).length;
    return `<section class="dk-reg"><h3>${esc(REGIONS[k][0])} <small>${have} из ${groups[k].length}</small></h3><div class="dk-grid">${ids.map(card).join('')}</div></section>`;
  }).join('');
  $('#dkList').innerHTML = html || `<p class="muted">${f === 'gold' ? 'Золотых карт пока нет. Они выпадают за совпадения: проголосуйте одинаково в дуэли дня или закончите турниры с общими любимцами.' : f === 'have' ? 'Карт пока нет. Первый пакет — за любой свой турнир в комнате.' : 'Собрано всё!'}</p>`;
}

/* Пара из Рунтерры: одна игра на телефоне и компьютере.
   Устройства связываются кодом. Всё, что игра хранит в браузере (турниры, итоги, коллекция, комната, линейки…),
   уходит на сервер по ключам с меткой времени, и по каждому ключу побеждает более свежая запись.
   Подтягиваем при запуске и при возвращении во вкладку, отправляем через пару секунд после изменения.
   Для локальной проверки без сервера: ?room-backend=local — та же логика на localStorage. */

const LINK_KEY = 'rp-link';        // {code, since, at, off, dirty:[…], err}
const LINK_META = 'rp-link-meta';  // {ключ: когда менялся на этом устройстве}
/* что остаётся только на этом устройстве: служебное, кэши артов и звук */
const LINK_SKIP = new Set(['rp-dev', 'rp-ddv', 'rp-skins', 'rp-sound', 'rp-swipe-hint']);
const linkable = k => typeof k === 'string' && /^rp-[A-Za-z0-9_-]{1,80}$/.test(k) && !/^rp-(link|local-)/.test(k) && !LINK_SKIP.has(k);
/* без чего при разногласии нужно спросить, какой прогресс оставить */
const linkMatters = k => k === SOLO_KEY || k === MINI_KEY || k === 'rp-svaha' || k === 'rp-lines' || k === 'rp-session' || /^rp-room-/.test(k);
/* эти записи не спорят, а складываются */
const LINK_MERGE = {
  'rp-collection'(a, b){
    if (!a || !b || !a.got || !b.got) return b || a;
    const o = Object.assign({}, a, b), got = Object.assign({}, a.got, b.got);
    for (const k in a.got){ const x = a.got[k], y = b.got[k]; if (x && y && typeof x === 'object' && typeof y === 'object') got[k] = {at:Math.min(x.at || y.at, y.at || x.at), n:Math.max(x.n || 1, y.n || 1)}; }
    const uni = f => [...new Set([].concat(a[f] || [], b[f] || []))];
    const hist = new Map(); [].concat(a.hist || [], b.hist || []).forEach(h => { if (h && h.s != null && !hist.has(h.s)) hist.set(h.s, h); });
    return Object.assign(o, {got, regions:uni('regions'), themes:uni('themes'), hist:[...hist.values()].sort((x, y) => (x.at || 0) - (y.at || 0)).slice(-30),
      duels:Math.max(a.duels || 0, b.duels || 0), hearts:Math.max(a.hearts || 0, b.hearts || 0)});
  },
  'rp-daily'(a, b){ return a && b && typeof a === 'object' && typeof b === 'object' ? Object.assign({}, b, a) : b || a; }
};
const LINK_QUIET = /^rp-(chat-seen|react-seen|live$|voter$|ctx$)/;   // ради этих не перезагружаем страницу

const lk = {ofs:0, last:0, t:0, busy:false, again:false, booted:false, pending:null, hooked:false};
const raw = {
  get(k){ try { const s = localStorage.getItem(k); return s == null ? null : JSON.parse(s); } catch(e){ return null; } },
  put(k, v){ try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
const linkCfg = () => { const c = raw.get(LINK_KEY); return c && /^[A-Z2-9]{10}$/.test(c.code) ? c : null; };
const linkSaveCfg = c => raw.put(LINK_KEY, c);
const linkMeta = () => raw.get(LINK_META) || {};
/* метки — по часам сервера: расхождение часов на устройствах не путает, чья запись свежее */
function linkNow(){ const t = Math.max(Date.now() + lk.ofs, lk.last + 1); lk.last = t; return t; }
const linkFmt = c => c.slice(0, 5) + '-' + c.slice(5);
const linkNorm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/* ---------- сервер ---------- */
const LinkApi = (() => {
  const cfg = window.RP_CONFIG || {};
  const errText = m => /link_not_found/.test(m) ? 'Код не найден. Проверь его: 10 знаков, например ABCDE-23456.'
    : /link_too_large/.test(m) ? 'Слишком много данных для синхронизации.'
    : /Failed to fetch|NetworkError|network|Load failed/i.test(m) ? 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.' : 'Сервер ответил ошибкой: ' + m;
  async function rpc(fn, args, keepalive){
    let r;
    try {
      r = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${fn}`, {method:'POST', keepalive:!!keepalive,
        headers:{'Content-Type':'application/json', apikey:cfg.supabaseKey, Authorization:'Bearer ' + cfg.supabaseKey}, body:JSON.stringify(args)});
    } catch(e){ throw new Error(errText(String(e && e.message || e))); }
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch(e){}
    if (!r.ok) throw new Error(errText((j && (j.message || j.details)) || t || String(r.status)));
    return j;
  }
  /* локальная проверка: «сервер» в localStorage этого браузера */
  const LK = 'rp-local-link';
  const lget = () => raw.get(LK) || {}, lset = v => raw.put(LK, v);
  const local = {
    async create(){ const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', all = lget(); let c = ''; for (let i = 0; i < 10; i++) c += A[Math.floor(Math.random() * 32)]; all[c] = {data:{}, rev:0}; lset(all); return c; },
    async sync(code, items, since){
      const all = lget(), row = all[linkNorm(code)]; if (!row) throw new Error(errText('link_not_found'));
      const nw = row.rev + 1, back = []; let ch = false;
      for (const [k, v] of Object.entries(items || {})){
        if (!/^rp-/.test(k) || !v || typeof v.t !== 'number') continue;
        const o = row.data[k];
        if (!o || v.t > o.t){ row.data[k] = {t:v.t, v:v.v == null ? null : v.v, r:nw}; ch = true; } else if (v.t < o.t) back.push(k);
      }
      if (ch){ row.rev = nw; lset(all); }
      const out = {}; for (const [k, v] of Object.entries(row.data)) if (v.r > (since || 0) || back.includes(k)) out[k] = v;
      return {rev:row.rev, items:out, now:Date.now()};
    }
  };
  return {
    create: () => Room.localMode ? local.create() : rpc('link_create', {}),
    sync: (code, items, since, keepalive) => Room.localMode ? local.sync(code, items, since) : rpc('link_sync', {p_code:code, p_items:items, p_since:since || 0}, keepalive)
  };
})();

/* ---------- запись изменений ---------- */
function linkHook(){
  if (lk.hooked) return; lk.hooked = true;
  const set = store.set, del = store.del;
  store.set = (k, v) => { set.call(store, k, v); linkTouch(k); };
  store.del = k => { del.call(store, k); linkTouch(k); };
}
function linkTouch(k){
  if (!linkable(k) || lk.applying) return;
  const meta = linkMeta(); meta[k] = linkNow(); raw.put(LINK_META, meta);
  const c = linkCfg(); if (!c || TOOLS || VIEW) return;
  if (!(c.dirty || []).includes(k)){ c.dirty = (c.dirty || []).concat(k); linkSaveCfg(c); }
  clearTimeout(lk.t); lk.t = setTimeout(() => linkSync().catch(() => {}), 1200);
}
const linkVal = k => raw.get(k);
function linkItems(keys){ const meta = linkMeta(), o = {}; keys.forEach(k => { if (linkable(k)) o[k] = {t:meta[k] || linkNow(), v:linkVal(k)}; }); return o; }

/* одна синхронизация: отправляем своё, забираем чужое. Возвращает ключи, изменённые с другого устройства */
async function linkSync(keepalive){
  const c = linkCfg(); if (!c) return [];
  if (lk.busy){ lk.again = true; return []; }
  lk.busy = true; clearTimeout(lk.t);
  const sent = (c.dirty || []).slice();
  let items = linkItems(sent);
  /* keepalive не унесёт больше 64 КБ — тогда отправим обычным запросом */
  if (keepalive && JSON.stringify(items).length > 60000) keepalive = false;
  try {
    const r = await LinkApi.sync(c.code, items, c.since || 0, keepalive);
    if (typeof r.now === 'number') lk.ofs = r.now - Date.now();
    const cc = linkCfg() || c;
    cc.dirty = (cc.dirty || []).filter(k => !sent.includes(k) || (linkMeta()[k] || 0) > (items[k] ? items[k].t : 0));
    cc.since = r.rev; cc.at = Date.now(); cc.err = '';
    linkSaveCfg(cc);
    const changed = linkApply(r.items || {});
    if (changed.length && lk.booted && changed.some(k => !LINK_QUIET.test(k))) linkReload();
    return changed;
  } catch(e){
    const cc = linkCfg(); if (cc){ cc.err = e.message; linkSaveCfg(cc); }
    clearTimeout(lk.t); lk.t = setTimeout(() => linkSync().catch(() => {}), 30000);
    throw e;
  } finally {
    lk.busy = false;
    linkRender();
    if (lk.again){ lk.again = false; clearTimeout(lk.t); lk.t = setTimeout(() => linkSync().catch(() => {}), 300); }
  }
}
/* записываем то, что пришло, если оно свежее нашего; то, что складывается, складываем и отправляем обратно */
function linkApply(items, prefer){
  const meta = linkMeta(), changed = [], merged = [];
  lk.applying = true;
  try {
    for (const [k, e] of Object.entries(items)){
      if (!linkable(k) || !e || typeof e.t !== 'number') continue;
      const cur = linkVal(k), force = prefer === 'remote';
      if (!force && (meta[k] || 0) >= e.t) continue;
      let v = e.v == null ? null : e.v;
      if (LINK_MERGE[k] && cur != null && v != null){
        const mv = LINK_MERGE[k](cur, v);
        if (JSON.stringify(mv) !== JSON.stringify(v)) merged.push(k);
        v = mv;
      }
      meta[k] = force ? e.t : Math.max(e.t, meta[k] || 0);
      if (JSON.stringify(cur) === JSON.stringify(v)) continue;
      raw.put(k, v); changed.push(k);
    }
  } finally { lk.applying = false; }
  const t = linkNow(); merged.forEach(k => { meta[k] = t; });
  raw.put(LINK_META, meta);
  if (merged.length){ const c = linkCfg(); if (c){ c.dirty = [...new Set((c.dirty || []).concat(merged))]; linkSaveCfg(c); clearTimeout(lk.t); lk.t = setTimeout(() => linkSync().catch(() => {}), 600); } }
  return changed;
}
function linkReload(){
  try { sessionStorage.setItem('rp-link-pulled', '1'); } catch(e){}
  location.reload();
}

/* ---------- запуск: подтянуть свежее до того, как игра прочитает сохранённое ---------- */
async function linkBoot(){
  linkHook();
  const c = linkCfg();
  if (c && Room.configured()){
    try { await Promise.race([linkSync(), new Promise(r => setTimeout(r, 2500))]); } catch(e){}
    sess = sstore.get('rp-session');
  }
  lk.booted = true;
}
function linkAfterStart(){
  try { if (sessionStorage.getItem('rp-link-pulled')){ sessionStorage.removeItem('rp-link-pulled'); toast('Подтянули прогресс с другого устройства'); } } catch(e){}
  linkRender();
  const q = new URLSearchParams(location.search).get('link');
  if (q && !linkCfg() && $('#lkCode')){ $('#lkCode').value = linkFmt(linkNorm(q).slice(0, 10)); $('#lkBox').scrollIntoView({block:'center'}); }
  document.addEventListener('visibilitychange', () => {
    if (!linkCfg()) return;
    if (document.hidden){ if ((linkCfg().dirty || []).length) linkSync().catch(() => {}); }
    else linkSync().catch(() => {});
  });
  window.addEventListener('pagehide', () => { const c = linkCfg(); if (c && (c.dirty || []).length) linkSync(true).catch(() => {}); });
  /* пока вкладка открыта и на виду — заглядываем раз в минуту */
  setInterval(() => { if (!document.hidden && linkCfg() && !lk.busy) linkSync().catch(() => {}); }, 60000);
}

/* ---------- связать и отвязать ---------- */
async function linkCreate(){
  if (lk.busy) return;
  lk.busy = true; linkRender();
  try {
    const code = await LinkApi.create();
    /* всё, что уже есть на этом устройстве, — свежее пустого сервера */
    const keys = Object.keys(localStorage).filter(linkable), meta = linkMeta(), t = linkNow();
    keys.forEach(k => { if (!meta[k]) meta[k] = t; });
    raw.put(LINK_META, meta);
    linkSaveCfg({code, since:0, at:0, dirty:keys});
    lk.busy = false;
    await linkSync();
    toast('Код готов. Введи его на другом устройстве');
  } catch(e){ lk.busy = false; linkRender(e.message); }
}
async function linkJoin(choice){
  const p = lk.pending;
  const code = p ? p.code : linkNorm($('#lkCode').value);
  if (!p && code.length !== 10) return linkRender('Код — это 10 знаков, например ABCDE-23456.');
  if (lk.busy) return;
  lk.busy = true; linkRender();
  try {
    const r = p ? p.r : await LinkApi.sync(code, {}, 0);
    const remote = r.items || {};
    if (typeof r.now === 'number') lk.ofs = r.now - Date.now();
    const local = Object.keys(localStorage).filter(linkable);
    const clash = Object.keys(remote).filter(k => linkable(k) && linkMatters(k) && remote[k].v != null && linkVal(k) != null && JSON.stringify(linkVal(k)) !== JSON.stringify(remote[k].v));
    if (clash.length && !choice){ lk.pending = {code, r}; lk.busy = false; return linkRender(); }
    lk.pending = null;
    /* что оставляем своим: всё, чего нет на сервере, а при выборе «с этого» — ещё и спорное */
    const mine = local.filter(k => !remote[k] || remote[k].v == null && linkVal(k) != null || (choice === 'mine' && clash.includes(k)));
    const meta = linkMeta(), t = linkNow();
    mine.forEach(k => { meta[k] = t; });
    raw.put(LINK_META, meta);
    linkSaveCfg({code, since:r.rev, at:Date.now(), err:'', dirty:mine});
    const take = {}; Object.keys(remote).forEach(k => { if (!mine.includes(k)) take[k] = remote[k]; });
    linkApply(take, 'remote');   // сложенное (коллекция, дуэль дня) само добавится к отправке
    lk.busy = false;
    await linkSync();
    linkReload();
  } catch(e){ lk.busy = false; lk.pending = null; linkRender(e.message); }
}
function linkOff(){
  raw.put(LINK_KEY, null); lk.pending = null;
  linkRender();
  toast('Устройство отвязано. Всё сохранённое осталось здесь');
}

/* ---------- блок на главном экране ---------- */
function linkAgo(at){
  if (!at) return 'ещё нет';
  const s = (Date.now() - at) / 1000;
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  const d = new Date(at), today = new Date().toDateString() === d.toDateString();
  return (today ? 'сегодня в ' : d.toLocaleDateString('ru-RU', {day:'numeric', month:'long'}) + ' в ') + d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
}
function linkRender(err){
  const box = $('#lkBody'); if (!box) return;
  const c = linkCfg(), keep = $('#lkCode') ? $('#lkCode').value : '';
  if (!Room.configured()){ $('#lkBox').hidden = true; return; }
  $('#lkBox').hidden = false;
  if (lk.pending){
    box.innerHTML = `<p>На этом устройстве тоже есть свой прогресс, и он не совпадает с тем, что на другом. С каким продолжить?</p>
      <div class="lk-row"><button class="btn primary" type="button" id="lkTheirs">С другого устройства</button><button class="btn" type="button" id="lkMine">С этого</button><button class="btn ghost" type="button" id="lkCancel">Отмена</button></div>
      <p class="lk-note">Значки коллекции и голоса в дуэли дня сложатся в любом случае.</p>`;
    $('#lkTheirs').onclick = () => linkJoin('theirs');
    $('#lkMine').onclick = () => linkJoin('mine');
    $('#lkCancel').onclick = () => { lk.pending = null; linkRender(); };
    return;
  }
  if (c){
    box.innerHTML = `<p>Устройства связаны: прогресс общий. Чтобы подключить ещё одно, введи на нём этот код.</p>
      <div class="lk-code"><b>${linkFmt(c.code)}</b><button class="btn ghost" type="button" id="lkCopy">Скопировать</button></div>
      <p class="lk-note" id="lkAt">${c.err ? esc(c.err) + ' Повторим сами.' : 'Синхронизация: ' + linkAgo(c.at)}${lk.busy ? ' · сейчас…' : ''}</p>
      <div class="lk-row"><button class="btn" type="button" id="lkNow" ${lk.busy ? 'disabled' : ''}>Синхронизировать</button><button class="btn ghost" type="button" id="lkOff">Отвязать это устройство</button></div>`;
    $('#lkCopy').onclick = () => {
      const text = `Код для «Пары из Рунтерры»: ${linkFmt(c.code)}\n${location.origin + location.pathname}?link=${c.code}`;
      try { navigator.clipboard.writeText(text).then(() => toast('Код скопирован'), () => toast(text, 8000)); } catch(e){ toast(text, 8000); }
    };
    $('#lkNow').onclick = () => linkSync().then(ch => { if (!ch.length) toast('Всё и так совпадает'); }).catch(() => {});
    $('#lkOff').onclick = linkOff;
    return;
  }
  box.innerHTML = `<p>Свяжи устройства одним кодом — и турниры, итоги, коллекция, комната и линейки станут общими: начни на телефоне, продолжи на компьютере.</p>
    <div class="lk-row"><button class="btn primary" type="button" id="lkCreate" ${lk.busy ? 'disabled' : ''}>Получить код</button></div>
    <div class="lk-row lk-join"><input class="input" id="lkCode" maxlength="11" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Код с другого устройства" aria-label="Код с другого устройства"><button class="btn" type="button" id="lkJoin" ${lk.busy ? 'disabled' : ''}>Связать</button></div>
    <p class="err" role="alert">${err ? esc(err) : ''}</p>`;
  $('#lkCode').value = keep;
  $('#lkCreate').onclick = linkCreate;
  $('#lkJoin').onclick = () => linkJoin();
  $('#lkCode').addEventListener('keydown', e => { if (e.key === 'Enter') linkJoin(); });
}

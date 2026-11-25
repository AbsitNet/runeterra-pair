/* ================= Живая комната на двоих =================
   Данные хранятся в Supabase (таблицы закрыты, доступ только через функции pair_*),
   живые обновления идут по каналу Realtime «pair:<код>» (broadcast + presence).
   Для локальной проверки без сервера: ?room-backend=local — та же логика на localStorage и BroadcastChannel. */
const Room = (() => {
  const cfg = window.RP_CONFIG || {};
  const localMode = /[?&]room-backend=local/.test(location.search);
  let sb = null;
  const configured = () => localMode || !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  const client = () => (sb || (sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {auth:{persistSession:false}})));

  const errText = e => {
    const msg = (e && (e.message || e.details || e.hint)) || String(e);
    if (/room_full/.test(msg)) return 'В комнате уже двое.';
    if (/room_not_found/.test(msg)) return 'Комната с таким кодом не найдена. Проверь код.';
    if (/bad_token/.test(msg)) return 'Эта комната открыта на другом устройстве под тем же именем. Войди в неё заново.';
    if (/name/.test(msg)) return 'Нужно имя от 1 до 40 символов.';
    if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.';
    return 'Сервер ответил ошибкой: ' + msg;
  };

  /* ---------- Supabase ---------- */
  async function rpc(fn, args){
    const {data, error} = await client().rpc(fn, args);
    if (error) throw new Error(errText(error));
    return data;
  }
  const remote = {
    create: name => rpc('pair_create_room', {p_name:name}),
    join: (code, name) => rpc('pair_join_room', {p_code:code, p_name:name}),
    get: code => rpc('pair_get_room', {p_code:code}),
    save: (code, token, state) => rpc('pair_save_state', {p_code:code, p_token:token, p_state:state}),
    subscribe(code, me, onUpdate, onPresence){
      const ch = client().channel('pair:' + code, {config:{broadcast:{self:false}, presence:{key:'slot' + me.slot}}});
      ch.on('broadcast', {event:'update'}, () => onUpdate())
        .on('presence', {event:'sync'}, () => onPresence(Object.keys(ch.presenceState()).map(k => +k.replace('slot',''))))
        .subscribe(status => { if (status === 'SUBSCRIBED') ch.track({slot:me.slot, at:Date.now()}); });
      return {
        ping: () => ch.send({type:'broadcast', event:'update', payload:{slot:me.slot}}),
        close: () => { try { client().removeChannel(ch); } catch(e){} }
      };
    }
  };

  /* ---------- локальная проверка ---------- */
  const LK = 'rp-local-rooms';
  const lget = () => { try { return JSON.parse(localStorage.getItem(LK) || '{}'); } catch(e){ return {}; } };
  const lset = v => localStorage.setItem(LK, JSON.stringify(v));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  const genCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
  const local = {
    async create(name){ const all = lget(), code = genCode(), token = uid(); all[code] = {players:[{slot:1, name, token, state:{}, updated_at:new Date().toISOString()}]}; lset(all); return {code, slot:1, token}; },
    async join(code, name){
      const all = lget(), r = all[code]; if (!r) throw new Error(errText('room_not_found'));
      if (r.players.length >= 2) throw new Error(errText('room_full'));
      const token = uid(); r.players.push({slot:2, name, token, state:{}, updated_at:new Date().toISOString()}); lset(all); return {code, slot:2, token};
    },
    /* состояние каждого игрока лежит под своим ключом, чтобы две вкладки не затирали друг друга */
    async get(code){
      const r = lget()[code]; if (!r) throw new Error(errText('room_not_found'));
      return {code, players:r.players.map(({token, ...p}) => { let own = null; try { own = JSON.parse(localStorage.getItem(`${LK}:${code}:${p.slot}`) || 'null'); } catch(e){} return own ? Object.assign(p, own) : p; })};
    },
    async save(code, token, state){
      const r = lget()[code], p = r && r.players.find(x => x.token === token); if (!p) throw new Error(errText('bad_token'));
      const at = new Date().toISOString(); localStorage.setItem(`${LK}:${code}:${p.slot}`, JSON.stringify({state, updated_at:at})); return at;
    },
    subscribe(code, me, onUpdate, onPresence){
      const bc = new BroadcastChannel('pair:' + code), seen = {};
      seen[me.slot] = Date.now();
      bc.onmessage = e => { const m = e.data || {}; if (m.slot === me.slot) return; seen[m.slot] = Date.now(); if (m.type === 'update') setTimeout(onUpdate, 150);   /* localStorage между вкладками синхронизируется не мгновенно */ onPresence(Object.keys(seen).filter(k => Date.now() - seen[k] < 12000).map(Number)); if (m.type === 'hello') bc.postMessage({type:'here', slot:me.slot}); };
      bc.postMessage({type:'hello', slot:me.slot});
      const hb = setInterval(() => { bc.postMessage({type:'here', slot:me.slot}); seen[me.slot] = Date.now(); onPresence(Object.keys(seen).filter(k => Date.now() - seen[k] < 12000).map(Number)); }, 5000);
      return {ping: () => bc.postMessage({type:'update', slot:me.slot}), close: () => { clearInterval(hb); bc.close(); }};
    }
  };

  /* ---------- анонимная статистика всех игроков ---------- */
  const SK = 'rp-local-stats';
  const statsLocal = {
    async submit(r){ const a = JSON.parse(localStorage.getItem(SK) || '{}'); a[r.id] = r; localStorage.setItem(SK, JSON.stringify(a)); },
    async get(champ){
      const rows = Object.values(JSON.parse(localStorage.getItem(SK) || '{}')), w = {};
      rows.forEach(r => w[r.champ] = (w[r.champ] || 0) + 1);
      const mine = w[champ] || 0, ids = Object.keys(w).sort((a, b) => w[b] - w[a] || (a < b ? -1 : 1));
      return {total:rows.length, champs:ids.length, mine, rank:1 + ids.filter(id => w[id] > mine).length,
        inTop:rows.filter(r => r.top.includes(champ)).length, top:ids.slice(0, 8).map(id => ({id, n:w[id]}))};
    }
  };
  const statsRemote = {
    submit: r => rpc('stats_submit', {p_id:r.id, p_champ:r.champ, p_top:r.top, p_who:r.who, p_n:r.n}),
    get: champ => rpc('stats_get', {p_champ:champ})
  };

  /* ---------- дуэль дня ---------- */
  const DK = 'rp-local-daily';
  const dailyLocal = {
    async vote(day, voter, pick){ const a = JSON.parse(localStorage.getItem(DK) || '{}'); a[day] = a[day] || {}; if (!a[day][voter]) a[day][voter] = pick; localStorage.setItem(DK, JSON.stringify(a)); },
    async get(day){ const v = JSON.parse(localStorage.getItem(DK) || '{}')[day] || {}, picks = {}; Object.values(v).forEach(p => picks[p] = (picks[p] || 0) + 1); return {total:Object.keys(v).length, picks}; }
  };
  const dailyRemote = {
    vote: (day, voter, pick) => rpc('daily_vote', {p_day:day, p_voter:voter, p_pick:pick}),
    get: day => rpc('daily_get', {p_day:day})
  };

  const api = () => localMode ? local : remote;
  return {
    configured, localMode,
    create: name => api().create(name),
    join: (code, name) => api().join(code, name),
    get: code => api().get(code),
    save: (code, token, state) => api().save(code, token, state),
    subscribe: (code, me, a, b) => api().subscribe(code, me, a, b),
    stats: {submit: r => (localMode ? statsLocal : statsRemote).submit(r), get: id => (localMode ? statsLocal : statsRemote).get(id)},
    daily: {vote: (d, v, p) => (localMode ? dailyLocal : dailyRemote).vote(d, v, p), get: d => (localMode ? dailyLocal : dailyRemote).get(d)},
    errText
  };
})();

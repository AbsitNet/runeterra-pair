/* ================= Турнирный движок =================
   Генератор выдаёт дуэли по одной; страница воспроизводит его из сохранённого списка выборов (0 — левый, 1 — правый).
   Никто не вылетает после одного поражения: в отборе каждый играет каждый круг, в битвах за место дерутся те,
   чьё место ещё не ясно, а плей-офф идёт с двойным выбыванием. */
const ENGINE_VERSION = 3;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const MODES = {
  quick:  {R:3, B:5,  Z:.8,  D:0, label:'Быстро'},
  normal: {R:4, B:7,  Z:1,   D:0, label:'Обычно'},
  deep:   {R:5, B:10, Z:1.2, D:3, label:'Подробно'}
};
const BATTLE_SHARE = .38;   // доля состава, которая в среднем ещё дерётся в раунде битв (по замерам)
function playoffSize(n){ let P = 4; while (P * 2 <= Math.max(4, n * .16) && P < 16) P *= 2; return Math.min(P, n); }
function estimate(n, mode){
  const M = MODES[mode] || MODES.normal, P = playoffSize(n), R = Math.min(M.R, n - 1);
  return R * Math.floor(n / 2) + Math.round(M.B * BATTLE_SHARE * n) + (M.D ? 24 : 0) + (2 * P - 1);
}
function seedOrder(n){ let s=[0]; while (s.length < n){ const m = s.length * 2; s = s.flatMap(x => [x, m - 1 - x]); } return s; }

/* Сила Брэдли–Терри по всем дуэлям; виртуальные победа и поражение не дают ей уйти в бесконечность */
function ratings(players, games, prev){
  const N = players.length, idx = new Map(players.map((p,i) => [p,i]));
  const W = new Float64Array(N), cnt = new Map();
  for (const [w,l] of games){
    const a = idx.get(w), b = idx.get(l); W[a]++;
    const k = a < b ? a * N + b : b * N + a; cnt.set(k, (cnt.get(k) || 0) + 1);
  }
  const adj = Array.from({length:N}, () => []);
  for (const [k,c] of cnt){ const a = Math.floor(k / N), b = k % N; adj[a].push(b, c); adj[b].push(a, c); }
  let p = new Float64Array(N);
  for (let i = 0; i < N; i++) p[i] = prev && prev[players[i]] != null ? Math.exp(prev[players[i]]) : 1;
  for (let it = 0; it < 40; it++){
    const q = new Float64Array(N);
    for (let i = 0; i < N; i++){
      let den = 2 / (p[i] + 1); const a = adj[i];
      for (let t = 0; t < a.length; t += 2) den += a[t+1] / (p[i] + p[a[t]]);
      q[i] = (W[i] + 1) / den;
    }
    p = q;
  }
  const r = {}; players.forEach((x,i) => r[x] = Math.log(p[i])); return r;
}

/* Границы тиров: верхние совпадают с местами плей-офф, остальные идут по долям списка */
function tierBounds(n, ends, P){
  const out = []; let prev = 0;
  for (const f of [.06, .20, .45, .70]){
    const c = n * f; let b;
    if (c <= P + .5){
      const opts = ends.filter(e => e > prev);
      b = opts.length ? opts.reduce((x,y) => Math.abs(y - c) < Math.abs(x - c) ? y : x) : prev + 1;
    } else b = Math.round(c);
    b = Math.min(Math.max(b, prev + 1), n - (4 - out.length));
    out.push(b); prev = b;
  }
  return out;
}

function* tournament(cfg){
  const rng = mulberry32(cfg.seed >>> 0);
  const players = cfg.roster.slice(), n = players.length;
  const M = MODES[cfg.mode] || MODES.normal, P = playoffSize(n), R = Math.min(M.R, n - 1);
  const tb = {}, st = {}, h2h = new Map(), games = [], bracket = [];
  players.forEach(p => { tb[p] = rng(); st[p] = {w:0, opp:new Set(), beat:[], lost:[], bye:false}; });
  const hk = (a,b) => a + '>' + b, beat = (a,b) => h2h.get(hk(a,b)) || 0;
  let rt = {}, asked = 0, est = estimate(n, cfg.mode);

  function* duel(a, b, meta, br){
    if (rng() < .5) [a, b] = [b, a];
    const d = yield Object.assign({a, b, P, R, n, played:asked, est:Math.max(est, asked + 1), bracket}, meta);
    asked++;
    const w = d === 1 ? b : a, l = d === 1 ? a : b;
    st[w].w++; st[w].opp.add(l); st[l].opp.add(w); st[w].beat.push(l); st[l].lost.push(w);
    games.push([w,l]); h2h.set(hk(w,l), beat(w,l) + 1);
    if (br) bracket.push(Object.assign({a, b, w}, br));
    return [w, l];
  }
  /* таблица: сначала сила, затем соседи, встречавшиеся лично, ставятся в порядке своей дуэли */
  function standing(){
    rt = ratings(players, games, rt);
    const r = players.slice().sort((x,y) => rt[y] - rt[x] || st[y].w - st[x].w || tb[y] - tb[x]);
    for (let pass = 0; pass < n; pass++){
      let sw = false;
      for (let i = 0; i < n - 1; i++){
        const a = r[i], b = r[i+1];
        if (beat(b,a) > beat(a,b)){ r[i] = b; r[i+1] = a; sw = true; }
      }
      if (!sw) break;
    }
    return r;
  }
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  /* 1. Отбор: швейцарская система, каждый играет каждый круг против равных по счёту */
  for (let r = 1; r <= R; r++){
    rt = ratings(players, games, rt);
    const sorted = players.slice().sort((x,y) => st[y].w - st[x].w || rt[y] - rt[x] || tb[y] - tb[x]);
    if (sorted.length % 2){
      let i = sorted.length - 1; while (i > 0 && st[sorted[i]].bye) i--;
      st[sorted[i]].bye = true; sorted.splice(i, 1);
    }
    const pairs = [];
    while (sorted.length){
      const a = sorted.shift();
      let j = sorted.findIndex(b => !st[a].opp.has(b)); if (j < 0) j = 0;
      pairs.push([a, sorted.splice(j, 1)[0]]);
    }
    shuffle(pairs);
    for (let k = 0; k < pairs.length; k++) yield* duel(pairs[k][0], pairs[k][1], {stage:'swiss', round:r, k, of:pairs.length});
  }

  /* 2. Битвы за место: дерётся только тот, чья граница тира ещё не ясна, с ближайшим по рейтингу новым соперником */
  let order = standing();
  const tierLines = tierBounds(n, [], 0);
  const lines = [P, ...tierLines.filter(b => b > P)].filter(k => k < n);
  const sig = x => 1 / (1 + Math.exp(-x));
  for (let br = 1; br <= M.B; br++){
    const info = {};
    players.forEach(p => { const q = sig(rt[p]); info[p] = 2 * q * (1 - q); });
    for (const [w,l] of games){ const q = sig(rt[w] - rt[l]), v = q * (1 - q); info[w] += v; info[l] += v; }
    const lr = lines.map(k => (rt[order[k-1]] + rt[order[k]]) / 2);
    const open = new Set(players.filter(p => lr.some(L => Math.abs(rt[p] - L) < M.Z / Math.sqrt(info[p]))));
    const pairs = [], used = new Set();
    for (let i = Math.max(0, P - 1); i < n; i++){
      const a = order[i]; if (!open.has(a) || used.has(a)) continue;
      let best = null;
      for (let d = 1; d <= 8 && !best; d++) for (const j of [i + d, i - d]){
        if (j < Math.max(0, P - 1) || j >= n) continue;
        const b = order[j]; if (used.has(b) || st[a].opp.has(b)) continue;
        if (!best || (open.has(b) && !open.has(best))) best = b;
      }
      if (best){ pairs.push([a, best]); used.add(a); used.add(best); }
    }
    if (!pairs.length) break;
    shuffle(pairs);
    est = asked + pairs.length * (M.B - br + 1) + (M.D ? 24 : 0) + (2 * P - 1);
    for (let k = 0; k < pairs.length; k++) yield* duel(pairs[k][0], pairs[k][1], {stage:'battle', round:br, k, of:pairs.length});
    order = standing();
  }

  /* 2б. Спорные места (только «Подробно»): у каждой границы тиров дерутся те, кто стоит по разные стороны и ещё не встречался */
  if (M.D){
    const lineName = k => k === P ? 'граница плей-офф' : ['граница S и A','граница A и B','граница B и C','граница C и D'][tierLines.indexOf(k)] || 'граница тиров';
    for (let pass = 1; pass <= M.D; pass++){
      const pairs = [], used = new Set();
      for (const k of lines){
        for (let i = k - 1; i >= Math.max(0, k - 3); i--){
          const a = order[i]; if (used.has(a)) continue;
          for (let j = k; j <= Math.min(n - 1, k + 2); j++){
            const b = order[j]; if (used.has(b) || st[a].opp.has(b)) continue;
            pairs.push([a, b, lineName(k)]); used.add(a); used.add(b); break;
          }
        }
      }
      if (!pairs.length) break;
      est = asked + pairs.length * (M.D - pass + 1) + (2 * P - 1);
      for (let k = 0; k < pairs.length; k++) yield* duel(pairs[k][0], pairs[k][1], {stage:'dispute', round:pass, k, of:pairs.length, line:pairs[k][2]});
      order = standing();
    }
  }

  const pre = order.slice(), rpos = {}; pre.forEach((p,i) => rpos[p] = i);
  const seeds = pre.slice(0, P);
  est = asked + (2 * P - 1);

  /* 3. Плей-офф с двойным выбыванием: вылетает только тот, кто проиграл дважды */
  const groups = [];
  let ub = seedOrder(P).map(i => seeds[i]), lb = [], ur = 0, lr = 0;
  const ubName = size => size === 2 ? 'Финал сетки победителей' : 'Сетка победителей · ' + (({16:'1/8 финала', 8:'четвертьфинал', 4:'полуфинал'})[size] || 'раунд');
  const ubLevel = size => size === 8 ? 1 : size <= 4 ? 2 : 0;
  function* ubRound(first){
    ur++; const size = ub.length, win = [], lose = [];
    for (let k = 0; k < size / 2; k++){
      const [w,l] = yield* duel(ub[2*k], ub[2*k+1],
        {stage:'ub', label:ubName(size), level:ubLevel(size), k, of:size/2, seeds, first:first && k === 0},
        {side:'ub', round:ur, slot:k, name: size === 2 ? 'Финал' : ({16:'1/8', 8:'1/4', 4:'1/2'})[size]});
      win.push(w); lose.push(l);
    }
    ub = win; return lose;
  }
  function* lbRound(pairs, last){
    lr++; const win = [], lose = [];
    for (let k = 0; k < pairs.length; k++){
      const [w,l] = yield* duel(pairs[k][0], pairs[k][1],
        {stage:'lb', last, level: last ? 2 : 0, label: last ? 'Финал сетки второго шанса' : `Сетка второго шанса · раунд ${lr}`, k, of:pairs.length},
        {side:'lb', round:lr, slot:k, name: last ? 'Финал' : `Раунд ${lr}`});
      win.push(w); lose.push(l);
    }
    groups.push(lose); lb = win;
  }
  lb = yield* ubRound(true);
  while (ub.length > 1){
    if (lb.length > 1){ const pr = []; for (let k = 0; k < lb.length; k += 2) pr.push([lb[k], lb[k+1]]); yield* lbRound(pr, false); }
    const drop = yield* ubRound(false);
    yield* lbRound(lb.map((x,k) => [x, drop[drop.length - 1 - k]]), ub.length === 1);
  }
  const fromLower = lb[0];
  const [champ, runner] = yield* duel(ub[0], lb[0], {stage:'final', label:'Гранд-финал', level:3, k:0, of:1}, {side:'gf', round:1, slot:0, name:'Гранд-финал'});
  groups.push([runner], [champ]);

  const top = [], ends = [];
  for (let g = groups.length - 1; g >= 0; g--){ top.push(...groups[g].slice().sort((x,y) => rpos[x] - rpos[y])); ends.push(top.length); }
  return {order:top.concat(pre.slice(P)), champ, runner, st, ends, P, R, n, total:asked, bracket, seeds, viaLower: champ === fromLower};
}

function simulate(cfg, dec){
  const g = tournament(cfg);
  let r = g.next(), used = 0;
  while (!r.done && used < dec.length){ r = g.next(dec[used]); used++; }
  return r.done ? Object.assign({kind:'done'}, r.value) : Object.assign({kind:'duel'}, r.value);
}
/* все дуэли турнира с выбором игрока — для «Угадай мой выбор» */
function duelLog(cfg, dec){
  const g = tournament(cfg), log = [];
  let r = g.next(), i = 0;
  while (!r.done && i < dec.length){
    const v = r.value;
    log.push({i, a:v.a, b:v.b, d:dec[i], stage:v.stage, label:v.label || '', level:v.level || 0});
    r = g.next(dec[i]); i++;
  }
  return log;
}
function tierSizesOf(m){
  const b = tierBounds(m.order.length, m.ends, m.P);
  return [b[0], b[1] - b[0], b[2] - b[1], b[3] - b[2], m.order.length - b[3]];
}

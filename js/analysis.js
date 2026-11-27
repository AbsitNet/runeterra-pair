/* ================= Разбор результата: типаж, антитоп, ачивки, сравнение ================= */
const P_ = id => PROFILE[id];

/* вес места в рейтинге: верхние 30% списка, линейно затухая */
function placeWeights(order){
  const n = order.length, span = Math.max(6, Math.round(n * .3)), w = {};
  order.forEach((id, i) => w[id] = i < span ? 1 - i / span : 0);
  return w;
}
function profileOf(order){
  const w = placeWeights(order), n = order.length, totalW = order.reduce((s,id) => s + w[id], 0);
  const groupScore = idx => {
    const sum = {}, cnt = {};
    order.forEach(id => { const k = P_(id)[idx]; sum[k] = (sum[k] || 0) + w[id]; cnt[k] = (cnt[k] || 0) + 1; });
    return Object.keys(cnt).map(k => {
      const expected = totalW * cnt[k] / n;
      return {key:k, ratio: expected ? sum[k] / expected : 0, count:cnt[k], score:sum[k]};
    }).sort((a,b) => b.ratio - a.ratio || b.score - a.score);
  };
  const top10 = order.slice(0, 10);
  const arch = groupScore(2).filter(x => x.count >= 2);
  const region = groupScore(0).filter(x => x.count >= 2);
  const cls = groupScore(1);
  const main = arch[0], second = arch.find(x => x.key !== main.key);
  const bottomShare = {};
  const tail = order.slice(Math.floor(n * .7));
  tail.forEach(id => { const k = P_(id)[2]; bottomShare[k] = (bottomShare[k] || 0) + 1; });
  const worst = Object.keys(bottomShare).map(k => ({key:k, ratio: bottomShare[k] / Math.max(1, order.filter(id => P_(id)[2] === k).length)}))
    .filter(x => x.key !== main.key).sort((a,b) => b.ratio - a.ratio)[0];
  return {
    arch: main.key, archSecond: second && second.key, archWorst: worst && worst.key,
    archTop: order.slice(0, Math.max(15, Math.round(n * .2))).filter(id => P_(id)[2] === main.key).slice(0, 6),
    region: region[0].key, regionTop: order.slice(0, 15).filter(id => P_(id)[0] === region[0].key),
    cls: cls[0].key, clsTop: top10.filter(id => P_(id)[1] === cls[0].key)
  };
}

function antiTop(order, k = 3){ return order.slice(-k).reverse(); }

/* ачивки — шуточные значки по итогам */
function achievements(m, cfg){
  const order = m.order, top10 = order.slice(0, 10), champ = m.champ, out = [];
  const inTop = (id, k = 10) => order.indexOf(id) > -1 && order.indexOf(id) < k;
  const regionCount = {};
  top10.forEach(id => { const r = P_(id)[0]; regionCount[r] = (regionCount[r] || 0) + 1; });
  const favRegion = Object.keys(regionCount).sort((a,b) => regionCount[b] - regionCount[a])[0];
  if (favRegion && favRegion !== 'rt' && regionCount[favRegion] >= 3)
    out.push({k:'region', r:favRegion, icon:'♥', t:`Сердце ${REGIONS[favRegion][1]}`, d:`${regionCount[favRegion]} из десяти любимцев родом отсюда`});
  const count = (idx, val) => top10.filter(id => P_(id)[idx] === val).length;
  const pl = (n, a, b, c) => { const x = n % 10, y = n % 100; return x === 1 && y !== 11 ? a : x >= 2 && x <= 4 && (y < 12 || y > 14) ? b : c; };
  if (count(2,'dark') >= 3) out.push({k:'dark', icon:'☾', t:'Тянет на тёмную сторону', d:`${count(2,'dark')} ${pl(count(2,'dark'),'опасный соблазнитель','опасных соблазнителя','опасных соблазнителей')} в топ-10`});
  if (count(2,'knight') >= 3) out.push({k:'knight', icon:'⛨', t:'Под надёжной защитой', d:'Благородные защитники — твоя слабость'});
  if (count(1,'mg') >= 5) out.push({k:'magic', icon:'✦', t:'Магия в крови', d:`${count(1,'mg')} магов в топ-10`});
  if (count(2,'joy') >= 3) out.push({k:'joy', icon:'☀', t:'Смех продлевает любовь', d:'В топе сплошь весельчаки'});
  if (count(2,'tragic') >= 3) out.push({k:'tragic', icon:'❦', t:'Спасатель израненных душ', d:'Тебя трогают герои с тяжёлым прошлым'});
  const extras = top10.filter(id => BY[id].grp === 'extra').length;
  if (BY[champ].grp === 'extra' || extras >= 3) out.push({k:'monster', icon:'♞', t:'Монстры тоже люди', d: BY[champ].grp === 'extra' ? 'Твоя пара — не совсем человек' : `${extras} ${pl(extras,'нелюдь','нелюдя','нелюдей')} в топ-10`});
  if (CANON[champ]) out.push({k:'taken', icon:'⚭', t:'Занято!', d:`По лору сердце этого персонажа отдано: ${CANON[champ]}`});
  SIBLINGS.forEach(([a,b]) => {
    if (inTop(a) && inTop(b)) out.push({k: a === 'Kayn' ? 'sib-kayn' : a === 'KindredWolf' ? 'sib-kindred' : 'sib-family', icon:'⚯', t: (a === 'Kayn' ? 'Одно тело, две души' : a === 'KindredWolf' ? 'Вечные охотники' : 'Любовь — семейное дело'),
      d:`${BY[a].name} и ${BY[b].name} ${BY[a].g === 'f' && BY[b].g === 'f' ? 'обе' : 'оба'} в топ-10`});
  });
  if (cfg.bet){
    const place = order.indexOf(cfg.bet) + 1;
    if (cfg.bet === champ) out.push({k:'bet-win', icon:'◎', t:'Интуиция', d:'Ставка сыграла: победитель угадан заранее'});
    else if (place > 0 && place <= 3) out.push({k:'bet-near', icon:'◔', t:'Почти в точку', d:`Ставка заняла ${place}-е место`});
    else if (place > 10 || place === 0) out.push({k:'bet-miss', icon:'✧', t:'Сердце удивило', d: place ? `Ставка оказалась лишь на ${place}-м месте` : 'Ставку убрали ещё до турнира'});
  }
  if (m.viaLower) out.push({k:'lower', icon:'↻', t:'Второй шанс', d:'Победитель прошёл через сетку второго шанса'});
  if (!m.st[champ].lost.length) out.push({k:'clean', icon:'★', t:'Без единой осечки', d:'Победитель не проиграл ни одной дуэли'});
  if (Object.keys(regionCount).length >= 7) out.push({k:'world', icon:'✈', t:'Роман без границ', d:`Топ-10 из ${Object.keys(regionCount).length} разных краёв`});
  if (NEWEST.includes(champ)) out.push({k:'fresh', icon:'✺', t:'Свежая кровь', d:'Твоя пара — один из новейших чемпионов'});
  /* остальные типажи */
  if (count(2,'rebel') >= 3) out.push({k:'rebel', icon:'↯', t:'Против правил', d:'Тебе по душе те, кто живёт не по правилам'});
  if (count(2,'sage') >= 3) out.push({k:'sage', icon:'☯', t:'Тихая гавань', d:'Рядом с тобой — спокойные и мудрые'});
  if (count(2,'ruler') >= 3) out.push({k:'ruler', icon:'♚', t:'Корона к лицу', d:'В топе сплошь лидеры и правители'});
  if (count(2,'wild') >= 3) out.push({k:'wild', icon:'❂', t:'Зов природы', d:'Тебя тянет к первобытной силе и инстинктам'});
  if (count(2,'mind') >= 2) out.push({k:'brains', icon:'⚛', t:'Ум — это красиво', d:'Для тебя нет ничего притягательнее острого ума'});
  if (Object.keys(CLASSES).every(c => count(1, c))) out.push({k:'allclass', icon:'⚖', t:'Все в сборе', d:'В топ-10 есть все шесть классов'});
  /* гранд-финал: связанные лором или земляки; через тернии; пьедестал одного края */
  const ru = m.runner;
  if (ru && EASTER.some(([a, b]) => (a === champ && b === ru) || (a === ru && b === champ)))
    out.push({k:'lorefinal', icon:'❧', t:'Сюжет из лора', d:`В финале сошлись ${BY[champ].name} и ${BY[ru].name} — у них общая история`});
  /* в мини-турнире по одному краю все и так земляки — там эти два значка не даются */
  const oneLand = ['ion','nox','dem','pz'].includes(cfg.theme);
  const land = id => P_(id)[0];
  if (!oneLand && ru && land(champ) === land(ru) && land(champ) !== 'rt')
    out.push({k:'neighbors', icon:'⌂', t:'Земляки', d:`Оба финалиста родом из ${REGIONS[land(champ)][1]}`});
  const lostN = m.st[champ].lost.length;
  if (lostN >= 3) out.push({k:'thorns', icon:'⚘', t:'Через тернии', d:`${lostN} ${pl(lostN,'поражение','поражения','поражений')} по пути — и всё равно победа`});
  const top3 = order.slice(0, 3);
  if (!oneLand && top3.length === 3 && top3.every(id => land(id) === land(champ)) && land(champ) !== 'rt')
    out.push({k:'podium', icon:'♜', t:'Свои люди', d:`Вся тройка призёров — из ${REGIONS[land(champ)][1]}`});
  return out;
}

/* сравнение двух рейтингов по общим персонажам */
function compareOrders(a, b){
  const setB = new Set(b), common = a.filter(id => setB.has(id));
  const ra = {}, rb = {};
  common.forEach((id,i) => ra[id] = i);
  b.filter(id => ra[id] != null).forEach((id,i) => rb[id] = i);
  const n = common.length;
  if (n < 3) return {n, percent:0, both:[], fights:[], hate:[]};
  let sd = 0; common.forEach(id => sd += (ra[id] - rb[id]) ** 2);
  const rho = 1 - 6 * sd / (n * (n * n - 1));
  const topCut = Math.max(5, Math.round(n * .2)), lowCut = Math.round(n * .8);
  const both = common.filter(id => ra[id] < topCut && rb[id] < topCut).sort((x,y) => (ra[x] + rb[x]) - (ra[y] + rb[y]));
  const hate = common.filter(id => ra[id] >= lowCut && rb[id] >= lowCut).sort((x,y) => (ra[y] + rb[y]) - (ra[x] + rb[x]));
  const fights = common.filter(id => ra[id] < topCut || rb[id] < topCut)
    .sort((x,y) => Math.abs(ra[y] - rb[y]) - Math.abs(ra[x] - rb[x])).slice(0, 5)
    .map(id => ({id, a: ra[id] + 1, b: rb[id] + 1}));
  return {n, rho, percent: Math.round((rho + 1) / 2 * 100), both, hate, fights};
}

/* набор дуэлей для «Угадай мой выбор»: весь плей-офф с четвертьфинала и выборка из остального, всего до 25 */
function guessSet(cfg, dec){
  const log = duelLog(cfg, dec);
  const late = log.filter(x => (x.stage === 'ub' || x.stage === 'lb' || x.stage === 'final') && (x.level >= 1 || x.stage === 'lb'));
  const lateIdx = new Set(late.map(x => x.i));
  const rng = mulberry32((cfg.seed ^ 0x5bd1e995) >>> 0);
  const rest = log.filter(x => !lateIdx.has(x.i));
  for (let i = rest.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const keepLate = late.slice(-14);
  const picked = rest.slice(0, Math.max(0, 25 - keepLate.length)).concat(keepLate);
  return picked.sort((x,y) => x.i - y.i);
}

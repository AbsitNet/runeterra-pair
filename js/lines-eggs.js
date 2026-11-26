/* Пара из Рунтерры: особые фразы для турниров по музыкальным группам.
   Работают только между образами K/DA, Pentakill, True Damage и HEARTSTEEL. В обычном турнире чемпионов их нет:
   по лору Кай'Са и Акали никак не связаны, а в K/DA выступают вместе. */

const BAND_NAME = {kda:'K/DA', penta:'Pentakill', td:'True Damage', hs:'HEARTSTEEL'};
const BAND_GENRE = {kda:'поп', penta:'метал', td:'хип-хоп', hs:'бойз-бэнд'};
/* как назвать эпоху образа: «Какая Ари из K/DA: POP/STARS или ALL OUT?» */
const BAND_ERA = {
  kda:{base:'POP/STARS', p:'престиж', p22:'престиж-2022', ao:'ALL OUT', aop:'престижный ALL OUT', fs:'FIRESTARTER', hit:'Мастер хитов', indie:'инди', rising:'восходящая звезда', super:'суперзвезда'},
  penta:{base:'классика', lc:'Lost Chapter', dis:'Диссонанс'},
  td:{base:'GIANTS', p:'престиж', p22:'престиж-2022', kmn:'Know My Name', kmnp:'престижный Know My Name', brk:'суперзвезда'},
  hs:{base:'PARANOIA', p:'престиж', lml:'Live My Life', lmlp:'престижный Live My Life'}
};
/* пары «группа:чемпион»; * — любая группа или любой участник.
   Подстановки: {a} и {b} — группы левой и правой карточки, {na} и {nb} — имена. Четвёртое поле — фраза для обратного порядка */
const BAND_EGG = [
  /* K/DA */
  ['kda:Ahri', 'kda:Evelynn', 'Две дивы K/DA. Кому сегодня софиты?'],
  ['kda:Ahri', 'kda:Akali', 'K/DA: голос Ари или рэп Акали?', 'K/DA: рэп Акали или голос Ари?'],
  ['kda:Ahri', 'kda:Kaisa', 'K/DA: голос Ари или танец Кай\'Сы?', 'K/DA: танец Кай\'Сы или голос Ари?'],
  ['kda:Ahri', 'kda:Seraphine', 'Кумир или фанатка, которая сама попала в K/DA?', 'Фанатка, которая попала в K/DA, или её кумир?'],
  ['kda:Akali', 'kda:Evelynn', 'K/DA: дерзкий рэп или бархатный голос?', 'K/DA: бархатный голос или дерзкий рэп?'],
  ['kda:Akali', 'kda:Kaisa', 'Кто зажжёт зал K/DA: рэп Акали или танец Кай\'Сы?', 'Кто зажжёт зал K/DA: танец Кай\'Сы или рэп Акали?'],
  ['kda:Akali', 'kda:Seraphine', 'Бунтарка K/DA или новенькая, которая всем улыбается?', 'Новенькая, которая всем улыбается, или бунтарка K/DA?'],
  ['kda:Evelynn', 'kda:Kaisa', 'Дива K/DA или её лучшая танцовщица?', 'Лучшая танцовщица K/DA или её дива?'],
  ['kda:Evelynn', 'kda:Seraphine', 'Дива, которая видела всё, или новенькая, которая всё снимает на телефон?', 'Новенькая, которая всё снимает на телефон, или дива, которая видела всё?'],
  ['kda:Kaisa', 'kda:Seraphine', 'Танцовщица K/DA или новенькая из интернета?', 'Новенькая из интернета или танцовщица K/DA?'],
  /* True Damage */
  ['td:Qiyana', 'td:Akali', 'True Damage: королева сцены или рэп Акали?', 'True Damage: рэп Акали или королева сцены?'],
  ['td:Qiyana', 'td:Ekko', 'True Damage: королева сцены или рэп Экко?', 'True Damage: рэп Экко или королева сцены?'],
  ['td:Qiyana', 'td:Senna', 'Две примы True Damage: огонь или душа?', 'Две примы True Damage: душа или огонь?'],
  ['td:Qiyana', 'td:Yasuo', 'True Damage: королева сцены или продюсер за пультом?', 'True Damage: продюсер за пультом или королева сцены?'],
  ['td:Akali', 'td:Ekko', 'Рэп-дуэль True Damage: Акали или Экко?', 'Рэп-дуэль True Damage: Экко или Акали?'],
  ['td:Akali', 'td:Senna', 'True Damage: рэп Акали или голос Сенны?', 'True Damage: голос Сенны или рэп Акали?'],
  ['td:Akali', 'td:Yasuo', 'Двое ионийцев в True Damage: рэпер или продюсер?', 'Двое ионийцев в True Damage: продюсер или рэпер?'],
  ['td:Ekko', 'td:Senna', 'True Damage: рэп Экко или голос Сенны?', 'True Damage: голос Сенны или рэп Экко?'],
  ['td:Ekko', 'td:Yasuo', 'Рэпер на сцене или продюсер за пультом: на ком держится True Damage?', 'Продюсер за пультом или рэпер на сцене: на ком держится True Damage?'],
  ['td:Senna', 'td:Yasuo', 'Голос True Damage или продюсер, который его сводит?', 'Продюсер True Damage или голос, который он сводит?'],
  /* Pentakill */
  ['penta:Karthus', 'penta:Kayle', 'Два голоса Pentakill: рык смерти или крылья гнева?', 'Два голоса Pentakill: крылья гнева или рык смерти?'],
  ['penta:Karthus', 'penta:Mordekaiser', 'Pentakill: вокал Картуса или гитара Мордекайзера?', 'Pentakill: гитара Мордекайзера или вокал Картуса?'],
  ['penta:Karthus', 'penta:Yorick', 'Pentakill: вокал Картуса или бас Йорика?', 'Pentakill: бас Йорика или вокал Картуса?'],
  ['penta:Mordekaiser', 'penta:Yorick', 'Гитара или бас: кто держит Pentakill?', 'Бас или гитара: кто держит Pentakill?'],
  ['penta:Olaf', 'penta:Mordekaiser', 'Барабаны или гитара: кто в Pentakill громче?', 'Гитара или барабаны: кто в Pentakill громче?'],
  ['penta:Olaf', 'penta:Sona', 'Олаф бьёт громче, Сона играет тоньше. Кого слушаешь?'],
  ['penta:Sona', 'penta:Yorick', 'Pentakill: клавиши Соны или бас Йорика?', 'Pentakill: бас Йорика или клавиши Соны?'],
  ['penta:Kayle', 'penta:Sona', 'Две дамы Pentakill: голос или клавиши?', 'Две дамы Pentakill: клавиши или голос?'],
  ['penta:Viego', 'penta:Mordekaiser', 'Злодей Lost Chapter или гитарист, который уложил его одним ударом?', 'Гитарист, уложивший злодея одним ударом, или сам злодей Lost Chapter?'],
  ['penta:Viego', 'penta:*', 'Диссонанс против Pentakill: злодей в белом или {nb}?', '{na} или злодей в белом? Pentakill против Диссонанса'],
  /* HEARTSTEEL */
  ['hs:Ezreal', 'hs:Kayn', 'HEARTSTEEL: сладкий вокал или дерзкий рэп?', 'HEARTSTEEL: дерзкий рэп или сладкий вокал?'],
  ['hs:Ezreal', 'hs:Yone', 'Голос HEARTSTEEL или продюсер, который его записывает?', 'Продюсер HEARTSTEEL или голос, который он записывает?'],
  ['hs:Kayn', 'hs:Yone', 'Рэпер, который троллит фанатов, или продюсер на холодном кофе?', 'Продюсер на холодном кофе или рэпер, который троллит фанатов?'],
  ['hs:Sett', 'hs:KSante', 'Два качка HEARTSTEEL: плюшевые мишки или высокая мода?', 'Два качка HEARTSTEEL: высокая мода или плюшевые мишки?'],
  ['hs:Aphelios', 'hs:Sett', 'Молчун с десятком инструментов или качок, которому мама вяжет шапки?', 'Качок, которому мама вяжет шапки, или молчун с десятком инструментов?'],
  ['hs:Aphelios', 'hs:Ezreal', 'HEARTSTEEL: тот, кто играет, или тот, кто поёт?', 'HEARTSTEEL: тот, кто поёт, или тот, кто играет?'],
  ['hs:Aphelios', 'hs:Kayn', 'Молчун HEARTSTEEL или тот, кто отвечает фанатам за двоих?', 'Тот, кто отвечает фанатам за двоих, или молчун HEARTSTEEL?'],
  ['hs:Aphelios', 'hs:Yone', 'Кто делает звук HEARTSTEEL: мультиинструменталист или продюсер?', 'Кто делает звук HEARTSTEEL: продюсер или мультиинструменталист?'],
  ['hs:KSante', 'hs:Ezreal', 'HEARTSTEEL: икона стиля или любимец фанатов?', 'HEARTSTEEL: любимец фанатов или икона стиля?'],
  ['hs:KSante', 'hs:Kayn', 'Советчик по любви или главный тролль HEARTSTEEL?', 'Главный тролль HEARTSTEEL или советчик по любви?'],
  ['hs:KSante', 'hs:Yone', 'Икона стиля или единственный здравомыслящий в HEARTSTEEL?', 'Единственный здравомыслящий в HEARTSTEEL или икона стиля?'],
  ['hs:Sett', 'hs:Ezreal', 'Качок с плюшевыми мишками или голос, от которого визжат фанатки?', 'Голос, от которого визжат фанатки, или качок с плюшевыми мишками?'],
  /* между группами */
  ['*:Akali', 'hs:Kayn', 'Рэп-баттл: Акали из {a} или Каин из {b}?', 'Рэп-баттл: Каин из {a} или Акали из {b}?'],
  ['td:Yasuo', 'hs:Yone', 'Братья — и оба продюсеры: Ясуо из {a} или Ёнэ из {b}?', 'Братья — и оба продюсеры: Ёнэ из {a} или Ясуо из {b}?'],
  ['kda:Ahri', 'hs:Ezreal', 'Ари или Эзреаль: чьи песни поёшь в душе?', 'Эзреаль или Ари: чьи песни поёшь в душе?'],
  ['td:Qiyana', 'kda:Ahri', 'Королева True Damage или лицо K/DA?', 'Лицо K/DA или королева True Damage?'],
  ['penta:Sona', 'kda:Seraphine', 'Молчаливая виртуозка Pentakill или певица, которая начинала в интернете?', 'Певица, которая начинала в интернете, или молчаливая виртуозка Pentakill?'],
  ['penta:Olaf', 'hs:Aphelios', 'Барабанщик Pentakill или мультиинструменталист HEARTSTEEL?', 'Мультиинструменталист HEARTSTEEL или барабанщик Pentakill?'],
  ['penta:Karthus', 'hs:Ezreal', 'Голос метала или голос бойз-бэнда?', 'Голос бойз-бэнда или голос метала?'],
  ['td:Ekko', 'hs:Kayn', 'Рэп-баттл: Экко из {a} или Каин из {b}?', 'Рэп-баттл: Каин из {a} или Экко из {b}?'],
  ['penta:Kayle', 'kda:Evelynn', 'Крылья гнева из Pentakill или бархатная дива K/DA?', 'Бархатная дива K/DA или крылья гнева из Pentakill?'],
  ['penta:Mordekaiser', 'hs:Sett', 'Железный гитарист или качок с гантелями: кто дотащит аппаратуру?', 'Качок с гантелями или железный гитарист: кто дотащит аппаратуру?'],
  ['penta:Viego', 'hs:*', 'Злодей Lost Chapter или {nb} из HEARTSTEEL? Мрак против глянца', '{na} из HEARTSTEEL или злодей Lost Chapter? Глянец против мрака']
];
/* кто есть кто в группе — для пар без особой фразы */
const BAND_ROLE = {
  kda:{Ahri:'голос', Akali:'рэпер', Evelynn:'дива', Kaisa:'танцовщица', Seraphine:'новенькая'},
  penta:{Karthus:'вокалист', Kayle:'вокалистка', Mordekaiser:'гитарист', Olaf:'барабанщик', Sona:'клавишница', Yorick:'басист', Viego:'злодей'},
  td:{Qiyana:'королева', Akali:'рэпер', Ekko:'рэпер', Senna:'вокалистка', Yasuo:'продюсер'},
  hs:{Ezreal:'вокалист', Kayn:'рэпер', Yone:'продюсер', Sett:'силач', KSante:'модник', Aphelios:'мультиинструменталист'}
};
/* без особой пары: внутри группы — роли или общие фразы, между группами — роли, жанры или имена */
const BAND_SAME = {
  kda:['K/DA: кто сегодня в центре сцены?', 'Кто твой биас в K/DA?'],
  penta:['Pentakill: чьё соло ждёшь?', 'Pentakill выходит на сцену. Кто сыграет громче?', 'Кто в Pentakill главный по тяжести?'],
  td:['True Damage: чей куплет лучше?', 'Кто задаёт ритм в True Damage?'],
  hs:['HEARTSTEEL. Кто твой биас?', 'Оба из HEARTSTEEL. Чей фанклуб ты?', 'HEARTSTEEL выходит на сцену. Кого ждёшь первым?']
};
const BAND_SAME_T = ['{a}: {ra} или {rb}?', '{a}: {na} или {nb}?'];
const BAND_CROSS = ['{Ra} {a} или {rb} {b}?', '{Ga} или {gb}: {na} или {nb}?', 'Чей концерт выберешь: {na} из {a} или {nb} из {b}?', '{Ra} {a} или {rb} {b}?'];

const BEGG = {};
BAND_EGG.forEach(([x, y, t, rev]) => { BEGG[x + '|' + y] = t; BEGG[y + '|' + x] = rev || t; });
const bandHash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

function lnEgg(a, b){
  const x = BAND_SKINS[a], y = BAND_SKINS[b];
  if (!x || !y || !LN_SKIN[a] || !LN_SKIN[b]) return '';
  const [ba, ea] = x, [bb, eb] = y, da = LN_SKIN[a].dd, db = LN_SKIN[b].dd;
  const which = dd => BY[dd] && BY[dd].g === 'f' ? 'Какая' : 'Какой';
  const up = s => s.charAt(0).toUpperCase() + s.slice(1);
  const ra = (BAND_ROLE[ba] || {})[da] || 'участник', rb = (BAND_ROLE[bb] || {})[db] || 'участник';
  const fill = t => t.replace(/\{a\}/g, BAND_NAME[ba]).replace(/\{b\}/g, BAND_NAME[bb]).replace(/\{na\}/g, lnChamp(a)).replace(/\{nb\}/g, lnChamp(b))
    .replace(/\{Ga\}/g, up(BAND_GENRE[ba])).replace(/\{gb\}/g, BAND_GENRE[bb]).replace(/\{Ra\}/g, up(ra)).replace(/\{ra\}/g, ra).replace(/\{rb\}/g, rb);
  if (da === db){
    if (ba !== bb) return `${which(da)} ${lnChamp(a)}: из ${BAND_NAME[ba]} или из ${BAND_NAME[bb]}?`;
    return ea !== eb ? `${which(da)} ${lnChamp(a)} из ${BAND_NAME[ba]}: ${BAND_ERA[ba][ea]} или ${BAND_ERA[ba][eb]}?` : '';
  }
  for (const ka of [ba + ':' + da, '*:' + da, ba + ':*'])
    for (const kb of [bb + ':' + db, '*:' + db, bb + ':*']){ const t = BEGG[ka + '|' + kb]; if (t) return fill(t); }
  const h = bandHash([da, db].sort().join('|'));
  if (ba === bb){ const all = BAND_SAME_T.concat(BAND_SAME[ba]); return fill(all[h % all.length]); }
  /* одинаковые роли («рэпер или рэпер») звучат глупо — тогда по именам */
  return fill(ra === rb ? BAND_CROSS[2] : BAND_CROSS[h % BAND_CROSS.length]);
}

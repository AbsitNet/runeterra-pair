/* ================= Звёздная сваха =================
   Вместо дуэлей — около тридцати вопросов о себе. Ответы складываются в профиль по девяти чертам,
   у каждого чемпиона такой же профиль (типаж + край + класс + личные черты), и сваха ищет самый близкий. */

/* черты: знак «+» — правый полюс */
const SV_AX = ['E','F','H','D','S','A','R','P','T'];
const SV_POLE = {
  E:['спокойствие','энергия'], F:['верность правилам','свободолюбие'], H:['холодный ум','горячее сердце'],
  D:['доброта','тяга к тьме'], S:['любовь к уединению','общительность'], A:['скромность','амбиции'],
  R:['осторожность','жажда риска'], P:['любовь к традициям','любопытство к новому'], T:['независимость','заботливость']
};

/* профиль чемпиона: основа по типажу, поправки по классу и краю, сверху — личные черты */
const SV_ARCH = {
  knight:{F:-1, H:.5, D:-2, R:.5, P:-1, T:1.5},
  dark:  {D:2, F:.5, H:.5, R:1, T:-1, A:.5},
  rebel: {F:2, E:1, R:1.5, P:.5, S:.5},
  sage:  {E:-2, D:-1, S:-.5, A:-1, R:-1, P:-.5, T:1},
  ruler: {A:2, F:-1.5, H:-1, S:.5, E:.5, T:-.5},
  joy:   {E:2, S:2, H:1, D:-1, T:.5, R:.5, F:1},
  tragic:{H:1, D:.5, S:-1, E:-1, T:.5},
  wild:  {F:2, P:-1.5, E:1, R:1.5, S:-1, H:.5, D:.5},
  mind:  {H:-2, P:2, E:-.5, S:-.5, A:.5}
};
const SV_CLASS = {as:{R:.5, S:-.5, D:.5}, fi:{E:.5}, mg:{H:-.3, P:.3}, mk:{R:.3}, sp:{T:1, H:.5, D:-.5}, tk:{T:.5, R:-.3}};
const SV_REGION = {
  ion:{P:-.5, E:-.3}, nox:{A:1, F:-.5, D:.3}, dem:{F:-1, P:-1, D:-.5}, frl:{P:-1, E:.3, T:-.3}, pil:{P:1.5, F:-.3, A:.3},
  zau:{P:1, F:.7, D:.5}, bil:{F:1, R:1, S:.5}, shu:{P:-1, A:.5}, tar:{E:-.3, D:-.5}, ixt:{F:-.3, P:-.5, S:-.5},
  sha:{D:1.5, H:.5}, void:{D:1.5, S:-1, T:-1}, rt:{}
};
/* личные черты: «+» и «-» — на единицу, «++» и «--» — на две */
const SV_TAGS = {
  Aurora:'H+ T+ S-', Akali:'E+ R+ F+ S+', Ambessa:'T+ D+ R+', Ahri:'H+ S+ D- T+', Briar:'E++ R+ H+ S+', Vi:'H+ T+ D- R+',
  Vayne:'D+ S- H- R+ T-', Gwen:'T++ D-- H+', Jinx:'E++ R++ D+ F+ T-', Diana:'S- D+ H+', Janna:'T++ F+', Zyra:'D+ T- S-',
  Zeri:'E+ T+ P+ R+', Illaoi:'E++ S+ R+ H+', Irelia:'T+ P-', Kaisa:'R+ S- T+ D-', Kalista:'F-- D+ H-', Camille:'D+ T- A+ F-',
  Karma:'T+ S+', Cassiopeia:'A+ H- T-', Katarina:'A+ D+ T-', Quinn:'F+ R+ T+', Kayle:'H- T- A+ F--', Caitlyn:'F- D- R- T+',
  Qiyana:'A++ T- S+', Leblanc:'H- S+ D+', Leona:'T+ E+ S+', Lissandra:'H-- S- A+ P-', Lux:'T+ D- P+ F+', MissFortune:'A+ D+ S+ H-',
  Morgana:'T++ F+ D+', Mel:'S++ H- D- P+', Nami:'T+ R+ P-', Nidalee:'S- F+ T+', Neeko:'H+ T+ P+ R+', Nilah:'R++ E+ D-',
  Orianna:'H+ T+ E- S-', Rell:'R+ H+', Renata:'D+ S+ H-', Riven:'T+ E- A--', Samira:'E++ R++ S+ A+', Sejuani:'T-- H- R+',
  Senna:'T+ D- H+', Seraphine:'T+ S+ H+ P+', Sivir:'A+ T- H- F+', Syndra:'A+ F+ S- H+', Sona:'H+ T+ S-', Soraka:'T++ D-',
  Taliyah:'F+ T+ P+ E+', Fiora:'A+ R+ T- S+', Xayah:'H+ D+ T+', Shyvana:'H+ S- E+', Evelynn:'H+ S+ D+ T-', Elise:'A+ S+ T-',
  Ashe:'T+ A+ P+', Yunara:'F- P- D-',
  Yone:'D- T+ S-', Akshan:'S+ H+ E+ D-', Aatrox:'A+ H+ E+ T-', Aphelios:'S-- T+ D+', Braum:'T++ S+ E+ H+', Varus:'H+ R+',
  Viego:'H++ D+', Viktor:'P+ T+ H- S-', Vladimir:'S+ A+ H- T-', Gangplank:'A+ R+ H-', Garen:'H- S+ P-', Gragas:'S+ E+ F+',
  Graves:'R+ S+ T+ F+', Darius:'H- T- F- R+', Jax:'R+ F+ S-', JarvanIV:'F- P- R+ S+', Jayce:'P+ A+ S+ H+', Jhin:'H+ D++ T- S-',
  Draven:'A+ S++ E+', Zaahen:'D+ F- H- A+ E-', Zed:'S- A+ P+ H-', Zilean:'T+ H+', Yorick:'S-- T+ E-', KSante:'S+ A+ H+',
  Kayn:'A++ S+ D+', Kassadin:'T+ S- R+', XinZhao:'F-- T+', LeeSin:'E+ R+ D- T+', Locke:'D+ S- F- H-', Lucian:'H+ T+ R+ D-',
  Malzahar:'D++ S- H-', MasterYi:'E- R+ S-', Olaf:'R++ E+ S+ H+', Pyke:'D++ S- T-', Pantheon:'H+ F+ A-', Rhaast:'A+ D+ E+ T-',
  Ryze:'R+ F- A-', Rakan:'H++ S++ T+', Sylas:'F++ A+ D+ H+', Swain:'H-- D+ S-', Sett:'T+ A+ S+', Singed:'D+ H- T- S-',
  Talon:'F- T+ S-', Taric:'H+ T+ S+ D-', TwistedFate:'R+ F+ H- D+', Tryndamere:'H+ T+ E+', Udyr:'S- E- P-', Hwei:'H++ S- P+',
  Shen:'H-- F- T+', Ezreal:'R++ P+ F+ S+', Yasuo:'S- H+', Azir:'A+ P- T+', Alistar:'T++ F+', AurelionSol:'A++ S+ T-',
  Belveth:'D++ P+ H-', Brand:'D++ H+ E++', Warwick:'D+ H+ T+', Volibear:'P-- A+ E+', KindredWolf:'E+ R+ D+', MonkeyKing:'R+ S+ E+',
  Hecarim:'E+ A+ T-', DrMundo:'E++ H- S+', Xerath:'A++ T-- D+', Ivern:'T++ S+ E+ P-', Khazix:'A+ P+ S-', Karthus:'H+ S+ D+',
  Mordekaiser:'D++ A+ T-', Naafiri:'S++ T+ E+', Nasus:'P- A- T+', Nocturne:'D++ S-- H-', KindredLamb:'T+ D+ E-', Ornn:'S-- P- T+',
  Rengar:'R+ A+ S-', Renekton:'E++ H+ D+', Sion:'E+ D+ H-', TahmKench:'S+ A+ H-', Twitch:'D+ S- T-', Trundle:'A+ D+ S+',
  Thresh:'D++ S+ H-', Urgot:'D+ A+ H-', Fiddlesticks:'D++ S-- H-', Shaco:'D+ S+ E+ H-'
};

/* вопросы: ответ — текст и вклад в черты («E+1 R+.5»), ключ края даёт тяготение к нему */
const SV_Q = [
  {b:'Для начала', q:'Кого ищем?', setup:'who', o:[['Мужчину', 'm'], ['Женщину', 'f'], ['Неважно, главное — чувства', 'all']]},
  {b:'Для начала', q:'Чудища и нелюди — тоже вариант?', setup:'extra', o:[['Почему нет, любовь зла', true], ['Нет, только люди и человекоподобные', false]]},

  {b:'Характер', q:'Выходной. Первая мысль, когда просыпаешься?', o:[
    ['«Куда бы сорваться?»', 'E+1 R+1'], ['«Ещё пять минут…»', 'E-1.5'], ['«Что у меня по плану?»', 'F-1 A+.5'], ['«Кому бы написать?»', 'S+1.5']]},
  {b:'Характер', q:'Как ты принимаешь решения?', o:[
    ['Слушаю сердце', 'H+1.5'], ['Взвешиваю всё до мелочей', 'H-1.5 R-.5'], ['Решаю быстро и не жалею', 'R+1 E+.5'], ['Советуюсь с близкими', 'S+.5 T+1']]},
  {b:'Характер', q:'Друзья описали бы тебя одним словом. Каким?', o:[
    ['Надёжность', 'F-.5 T+1 D-.5'], ['Огонь', 'E+1.5 H+.5'], ['Загадка', 'D+1 S-1'], ['Голова', 'H-1 P+.5']]},
  {b:'Характер', q:'В компании незнакомцев ты…', o:[
    ['Через пять минут в центре внимания', 'S+1.5 E+1'], ['Наблюдаешь и запоминаешь', 'S-1 H-.5'],
    ['Находишь одного собеседника на весь вечер', 'S-.5 H+.5 T+.5'], ['Ищешь, где тут самое интересное', 'R+.5 F+.5 P+.5']]},
  {b:'Характер', q:'Правила существуют, чтобы…', o:[
    ['Их соблюдать', 'F-1.5 P-.5'], ['Их нарушать', 'F+1.5 R+.5'], ['Их переписывать под себя', 'A+1 F+.5 D+.5'], ['Защищать слабых', 'T+1 D-1']]},
  {b:'Характер', q:'Что скорее выведет тебя из себя?', o:[
    ['Скука', 'E+1 F+.5'], ['Хаос и беспорядок', 'F-1 E-.5'], ['Несправедливость', 'D-1 H+.5'], ['Глупость', 'H-1 P+.5']]},
  {b:'Характер', q:'Твоя тайная сила?', o:[
    ['Упрямство', 'A+.5 R+.5 F-.5'], ['Обаяние', 'S+1 H+.5'], ['Терпение', 'E-1 R-.5'], ['Хитрость', 'D+1 H-.5']]},
  {b:'Характер', q:'Как ты относишься к риску?', o:[
    ['Без риска жизнь пресна', 'R+2'], ['Рискую, только когда всё просчитано', 'R-.5 H-1'], ['Не люблю рисковать', 'R-1.5 E-.5'], ['Рискую ради близких, не ради себя', 'T+1 R+.5']]},

  {b:'Что ты ценишь', q:'Что важнее всего в отношениях?', o:[
    ['Страсть', 'H+1 D+.5 E+.5'], ['Верность', 'F-1 T+1'], ['Свобода', 'F+1.5 T-1'], ['Понимание без слов', 'H+.5 E-1 T+.5']]},
  {b:'Что ты ценишь', q:'Какой подарок хочется получить?', o:[
    ['Оружие или доспех ручной работы', 'R+.5 A+.5 P-.5'], ['Редкую книгу или чертёж', 'H-1 P+1'],
    ['Украшение, от которого все ахнут', 'A+1 S+.5'], ['Билет туда, о чём только мечтаешь', 'F+1 R+1']]},
  {b:'Что ты ценишь', q:'Власть — это…', o:[
    ['Ответственность', 'A+.5 D-1 T+.5'], ['Цель', 'A+2'], ['Ловушка', 'A-1.5 F+.5'], ['Инструмент', 'A+1 H-1 D+.5']]},
  {b:'Что ты ценишь', q:'Что ты вынесешь из горящего дома?', o:[
    ['Семейную реликвию', 'P-1.5 T+.5'], ['Свои записи и изобретения', 'P+1.5 H-.5'], ['Кошку. Конечно, кошку', 'T+1.5 H+.5'], ['Ничего, главное — все живы', 'A-1 T+1']]},
  {b:'Что ты ценишь', q:'Магия или технологии?', o:[
    ['Магия', 'P-1 H+.5'], ['Технологии', 'P+2'], ['И то и другое', 'P+.5 F+.5'], ['Ни то ни другое — только сила рук', 'P-1 E+.5 R+.5']]},
  {b:'Что ты ценишь', q:'Тебе ближе…', o:[
    ['Дом, где тебя ждут', 'T+1 F-.5 E-.5'], ['Дорога, которая не кончается', 'F+1.5 R+1'], ['Дворец, где решаются судьбы', 'A+1.5 S+.5'], ['Храм, где тихо', 'E-1.5 D-.5']]},
  {b:'Что ты ценишь', q:'Что простить труднее всего?', o:[
    ['Ложь', 'D-1 H-.5'], ['Предательство', 'F-1 T+.5'], ['Равнодушие', 'H+1 T+1'], ['Слабость', 'A+1 D+.5 T-1']]},
  {b:'Что ты ценишь', q:'Какой останется твоя легенда через сто лет?', o:[
    ['Подвиг, о котором поют', 'R+1 A+.5 D-.5'], ['Открытие, изменившее мир', 'P+1.5 H-1'], ['Империя с моим именем', 'A+2 D+.5'], ['Тихая история любви', 'H+1.5 A-1 T+1']]},

  {b:'Идеальный вечер', q:'Идеальное свидание?', o:[
    ['Ночная вылазка туда, куда нельзя', 'R+1.5 D+.5 F+.5'], ['Ужин при свечах', 'H+1 E-1'], ['Шумный праздник и танцы до утра', 'E+1.5 S+1.5'], ['Прогулка и разговор обо всём', 'S-.5 H+.5 E-.5']]},
  {b:'Идеальный вечер', q:'Где проходит этот вечер?', o:[
    ['Под северным сиянием в снегах', 'frl P-.5 S-.5'], ['В портовой таверне у моря', 'bil S+1 F+.5'],
    ['В саду у древнего храма', 'ion E-1 P-.5'], ['На краю мира, где небо трескается от чужих звёзд', 'void D+1.5 R+1']]},
  {b:'Идеальный вечер', q:'Тебя зовут в путешествие. Куда?', o:[
    ['В пустыню, к древним гробницам', 'shu R+.5 P-.5'], ['В джунгли, где прячется затерянный город', 'ixt R+1 S-.5'],
    ['На вершину священной горы', 'tar E-.5 D-1'], ['На туманные острова, откуда возвращаются не все', 'sha D+1.5 R+1']]},
  {b:'Идеальный вечер', q:'В каком городе хочется жить?', o:[
    ['В столице империи, где всё решает сила', 'nox A+1 D+.5'], ['В белокаменной крепости за высокими стенами', 'dem F-1 P-.5'],
    ['В городе изобретателей', 'pil P+1.5'], ['В его подземном двойнике, где воздух гуще, а люди честнее', 'zau D+.5 F+1']]},
  {b:'Идеальный вечер', q:'Что звучит на фоне?', o:[
    ['Тишина и треск костра', 'E-1.5 S-.5'], ['Громкая музыка', 'E+1.5 S+1'], ['Звуки леса', 'P-1 F+.5'], ['Звон бокалов и чужие разговоры', 'S+1 A+.5']]},
  {b:'Идеальный вечер', q:'Что на ужин?', o:[
    ['Острое, чтобы горело', 'R+1 E+.5'], ['Изысканное, из лучшего ресторана', 'A+1 S+.5'], ['Приготовленное своими руками', 'T+1.5'], ['Что угодно, лишь бы на ходу', 'E+1 F+.5']]},
  {b:'Идеальный вечер', q:'Вечер подходит к концу. Что дальше?', o:[
    ['Встретить рассвет вдвоём на крыше', 'H+1 R+.5'], ['Ещё одна вечеринка', 'S+1.5 E+1'], ['Домой, под плед', 'E-1.5 T+.5'], ['Ночная прогулка туда, где опасно', 'D+1 R+1']]},

  {b:'Если поссорились', q:'Вы поссорились. Первый порыв?', o:[
    ['Высказать всё сразу', 'E+1 H+1'], ['Замолчать и уйти в себя', 'S-1.5 E-.5'], ['Разложить всё по полочкам', 'H-1.5'], ['Отшутиться', 'S+1 E+.5 H-.5']]},
  {b:'Если поссорились', q:'Кто первым идёт мириться?', o:[
    ['Обычно я', 'T+1.5 A-.5'], ['Тот, кто неправ', 'F-1 H-.5'], ['Никто, само пройдёт', 'H-.5 F+.5 T-.5'], ['Тот, кто первым соскучится', 'H+1 T+.5']]},
  {b:'Если поссорились', q:'В споре тебе важнее…', o:[
    ['Победить', 'A+1.5 R+.5'], ['Понять', 'H+.5 T+.5 A-.5'], ['Чтобы всё скорее кончилось', 'E-1 A-1'], ['Докопаться до истины', 'H-1 P+.5']]},
  {b:'Если поссорились', q:'Тебя ждут уже два часа, а пары всё нет. Ты…', o:[
    ['Устраиваешь бурю, когда появится', 'E+1.5 H+1'], ['Молча ждёшь и всё запоминаешь', 'D+1 S-1'],
    ['Волнуешься, не случилось ли чего', 'T+1.5'], ['Уходишь развлекаться без неё', 'F+1.5 S+.5']]},
  {b:'Если поссорились', q:'Ревность — это…', o:[
    ['Признак любви', 'H+1.5 D+.5'], ['Недоверие', 'H-1 F+.5'], ['Повод для красивой мести', 'D+1.5 A+.5'], ['Повод поговорить', 'T+.5 E-.5 D-.5']]},
  {b:'Если поссорились', q:'Тебя обидели. Что дальше?', o:[
    ['Прощу, но не забуду', 'D+.5 H-.5'], ['Прощу и забуду', 'D-1.5 T+1'], ['Отвечу так, что запомнят', 'D+1 A+1 R+.5'], ['Просто уйду', 'F+1 S-1']]},
  {b:'Если поссорились', q:'Как ты миришься?', o:[
    ['Говорю «прости»', 'T+1 A-1'], ['Предлагаю начать с чистого листа', 'H+1 F+.5'], ['Молча обнимаю', 'T+1.5 H+.5 S-.5'], ['Готовлю что-нибудь вкусное', 'T+1 E-.5']]}
];

const svParse = s => { const v = {}, reg = []; String(s).split(/\s+/).filter(Boolean).forEach(t => { const m = t.match(/^([A-Z])([+-][\d.]+)$/); if (m) v[m[1]] = (v[m[1]] || 0) + parseFloat(m[2]); else reg.push(t); }); return {v, reg}; };
const svTagVec = s => { const v = {}; String(s || '').split(/\s+/).filter(Boolean).forEach(t => { const m = t.match(/^([A-Z])(\+\+|--|\+|-)$/); if (m) v[m[1]] = (v[m[1]] || 0) + ({'++':2, '+':1, '-':-1, '--':-2})[m[2]]; }); return v; };

let SV_CH = null;   // профили чемпионов, считаются один раз
function svChampVec(id){
  if (!SV_CH){
    SV_CH = {};
    CH.forEach(c => {
      const p = PROFILE[c[0]] || ['rt','fi','sage'], v = {};
      [SV_ARCH[p[2]] || {}, SV_CLASS[p[1]] || {}, SV_REGION[p[0]] || {}, svTagVec(SV_TAGS[c[0]])].forEach(o => { for (const k in o) v[k] = (v[k] || 0) + o[k]; });
      SV_CH[c[0]] = SV_AX.map(k => Math.max(-2.5, Math.min(2.5, v[k] || 0)));
    });
    /* центрируем: сравниваем не с нулём, а со «средним чемпионом», иначе выигрывают самые усреднённые */
    const ids = Object.keys(SV_CH), mean = SV_AX.map((_, i) => ids.reduce((s, id) => s + SV_CH[id][i], 0) / ids.length);
    ids.forEach(id => { SV_CH[id] = SV_CH[id].map((x, i) => x - mean[i]); });
  }
  return SV_CH[id];
}
/* профиль игрока по ответам: каждая черта приводится к шкале от −2.5 до 2.5 */
function svUser(ans){
  const sum = {}, max = {}, avg = {}, regions = {};
  let who = 'all', extra = true;
  SV_Q.forEach((q, i) => {
    const a = ans[i]; if (a == null) return;
    if (q.setup === 'who'){ who = q.o[a][1]; return; }
    if (q.setup === 'extra'){ extra = q.o[a][1]; return; }
    const opts = q.o.map(o => svParse(o[1]));
    SV_AX.forEach(k => {
      max[k] = (max[k] || 0) + Math.max(...opts.map(o => Math.abs(o.v[k] || 0)));
      avg[k] = (avg[k] || 0) + opts.reduce((t, o) => t + (o.v[k] || 0), 0) / opts.length;   // чего ждать от случайных ответов
    });
    const p = opts[a];
    for (const k in p.v) sum[k] = (sum[k] || 0) + p.v[k];
    p.reg.forEach(r => regions[r] = (regions[r] || 0) + 1);
  });
  const vec = SV_AX.map(k => max[k] ? Math.max(-2.5, Math.min(2.5, 5 * ((sum[k] || 0) - (avg[k] || 0)) / max[k])) : 0);
  return {vec, regions, who, extra};
}
function svCos(a, b){ let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++){ d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; }
/* все кандидаты по убыванию совместимости */
function svMatch(ans){
  const u = svUser(ans);
  const pool = CH.filter(c => (u.extra || c[4] === 'core') && (u.who === 'all' || c[3] === u.who)).map(c => c[0]);
  const list = pool.map(id => {
    const cs = svCos(u.vec, svChampVec(id)), home = u.regions[(PROFILE[id] || ['rt'])[0]] || 0;
    return {id, cos:cs, home, pct:Math.max(5, Math.min(99, Math.round(52 + 46 * cs + 4 * home)))};
  }).sort((a, b) => b.pct - a.pct || b.cos - a.cos || (IDX[a.id] - IDX[b.id]));
  return {u, list};
}
/* почему именно эта пара: общие черты, одна черта, которой вы друг друга дополните, и край */
const SV_SAME = {
  'E+':'Вы оба не умеете сидеть на месте — с вами не соскучишься.', 'E-':'Вам обоим хорошо в тишине и друг с другом.',
  'F+':'Вы оба не выносите клеток и чужих правил.', 'F-':'Вы оба держите слово и цените порядок.',
  'H+':'Вы оба живёте сердцем и не стесняетесь чувств.', 'H-':'Вы оба сначала думаете, а уже потом чувствуете.',
  'D+':'Вас обоих тянет к тёмной стороне — и вы этого не боитесь.', 'D-':'Вы оба на стороне света и верите в лучшее в людях.',
  'S+':'Вы оба душа компании: на вашей свадьбе будет вся Рунтерра.', 'S-':'Вам обоим не нужна толпа — хватит друг друга.',
  'A+':'Вы оба метите высоко и не согласны на меньшее.', 'A-':'Вам обоим не нужны короны и титулы.',
  'R+':'Вы оба бросаетесь в приключения не раздумывая.', 'R-':'Вы оба семь раз отмерите, прежде чем отрезать.',
  'P+':'Вам обоим интересно новое: изобретения, открытия, будущее.', 'P-':'Вы оба чтите корни, традиции и старую мудрость.',
  'T+':'Вы оба умеете заботиться — и не стесняетесь этого.', 'T-':'Вы оба цените свободу друг друга и не лезете в душу без спроса.'
};
function svDiff(k, champMore, id){
  const N = name(id), them = verb(id, 'ней', 'ним'), f = (a, b) => verb(id, a, b);
  const t = {
    'E+':`${N} энергичнее тебя — с ${them} ты наконец выйдешь из дома.`, 'E-':`${N} спокойнее тебя — будет кому вовремя тебя остановить.`,
    'F+':`${N} свободнее тебя — и научит иногда нарушать правила.`, 'F-':`${N} надёжнее и строже — с ${them} твоя свобода не превратится в хаос.`,
    'H+':`${N} эмоциональнее тебя — растопит любой лёд.`, 'H-':`${N} рассудительнее — ${f('она','он')} удержит голову холодной, когда у тебя зашкалят чувства.`,
    'D+':`В ${f('ней','нём')} больше тьмы, чем в тебе, — и это притягивает.`, 'D-':`${N} светлее тебя — рядом с ${them} даже тьма становится мягче.`,
    'S+':`${N} общительнее — вытащит тебя туда, где весело.`, 'S-':`${N} тише тебя — с ${them} можно отдохнуть от шума.`,
    'A+':`${N} амбициознее — с ${them} ты замахнёшься на большее.`, 'A-':`${N} не гонится за властью — соревноваться не придётся.`,
    'R+':`${N} рискованнее тебя — скучно точно не будет.`, 'R-':`${N} осторожнее — кто-то же должен думать, куда вы лезете.`,
    'P+':`${N} смотрит в будущее — покажет тебе новое.`, 'P-':`${N} крепче держится корней — с ${them} будет на что опереться.`,
    'T+':`${N} заботливее тебя — окружит теплом, даже если не просишь.`, 'T-':`${N} независимее — не будет душить тебя заботой.`
  };
  return t[k + (champMore ? '+' : '-')];
}
function svReasons(u, id, home){
  const c = svChampVec(id), out = [];
  /* общие черты: оба далеко от нуля и с одним знаком */
  const same = SV_AX.map((k, i) => ({k, i, s:Math.sign(u.vec[i]), w:Math.min(Math.abs(u.vec[i]), Math.abs(c[i])) * (Math.sign(u.vec[i]) === Math.sign(c[i]) ? 1 : 0)}))
    .filter(x => x.w >= .3).sort((a, b) => b.w - a.w).slice(0, 2);
  same.forEach(x => out.push(SV_SAME[x.k + (x.s > 0 ? '+' : '-')]));
  /* самое заметное различие — как то, чем вы дополните друг друга */
  const diff = SV_AX.map((k, i) => ({k, d:c[i] - u.vec[i]})).filter(x => !same.some(s => s.k === x.k)).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  if (diff && Math.abs(diff.d) >= 1.2) out.push(svDiff(diff.k, diff.d > 0, id));
  const reg = (PROFILE[id] || ['rt'])[0];
  if (home && typeof REGION_TO !== 'undefined' && REGION_TO[reg]) out.push(`И тебя не случайно тянет ${REGION_TO[reg]}: ${name(id)} оттуда родом.`);
  return out;
}
/* три самые яркие черты игрока */
function svTraits(u){
  return SV_AX.map((k, i) => ({k, v:u.vec[i]})).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3).map(x => SV_POLE[x.k][x.v > 0 ? 1 : 0]);
}

/* ================= экраны свахи ================= */
const SV_KEY = 'rp-svaha';
const sv = {ans:[], lock:false, lit:0};
const svStars = () => SV_Q.filter(q => !q.setup).length;

/* созвездие-сердце: каждый ответ зажигает одну звезду */
let SV_PTS = null;
function svPoints(){
  if (SV_PTS) return SV_PTS;
  const n = svStars(), rnd = mulberry32(7331), pts = [];
  for (let i = 0; i < n; i++){
    const t = Math.PI + 2 * Math.PI * i / n;
    const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push([150 + 8 * x + (rnd() - .5) * 9, 148 - 8 * y + (rnd() - .5) * 9]);
  }
  const dust = [];
  for (let i = 0; i < 46; i++) dust.push([rnd() * 300, rnd() * 300, .4 + rnd() * .9]);
  return SV_PTS = {pts, dust};
}
function svSky(lit, fresh){
  const {pts, dust} = svPoints();
  let h = dust.map(([x, y, r]) => `<circle class="dust" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`).join('');
  for (let i = 1; i < Math.min(lit, pts.length); i++) h += `<line x1="${pts[i - 1][0].toFixed(1)}" y1="${pts[i - 1][1].toFixed(1)}" x2="${pts[i][0].toFixed(1)}" y2="${pts[i][1].toFixed(1)}"/>`;
  if (lit >= pts.length) h += `<line x1="${pts[pts.length - 1][0].toFixed(1)}" y1="${pts[pts.length - 1][1].toFixed(1)}" x2="${pts[0][0].toFixed(1)}" y2="${pts[0][1].toFixed(1)}"/>`;
  h += pts.map(([x, y], i) => `<circle class="st${i < lit ? ' on' : ''}${fresh && i === lit - 1 ? ' new' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i < lit ? 3.2 : 1.7}"/>`).join('');
  return h;
}
function svRenderCta(){
  const last = store.get(SV_KEY), el = $('#svLast');
  if (!el) return;
  if (!$('#svCtaSky').childElementCount) $('#svCtaSky').innerHTML = svSky(svStars());
  if (!last || !Array.isArray(last.ans) || last.ans.length !== SV_Q.length){ el.hidden = true; return; }
  const m = svMatch(last.ans), top = m.list[0];
  if (!top){ el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `Твоя звёздная пара: <b>${esc(name(top.id))}</b>, ${top.pct}%. <button type="button" class="linkish" id="svOpen">Открыть</button>`;
  $('#svOpen').onclick = () => { sv.ans = last.ans.slice(); svResult(); };
}
function startSvaha(){
  sv.ans = []; sv.lock = false;
  show('scr-svaha'); FX.setLevel(0);
  $('#svWrap').hidden = false; $('#svRes').hidden = true;
  svRender();
}
function svRender(fresh){
  const i = sv.ans.length;
  if (i >= SV_Q.length) return svResult();
  const q = SV_Q[i], lit = sv.ans.filter((a, k) => !SV_Q[k].setup).length;
  $('#svSky').innerHTML = svSky(lit, fresh);
  $('#svBody').innerHTML = `<p class="eyebrow">Звёздная сваха · ${esc(q.b)}</p>
    <div class="sv-count"><span>Вопрос ${i + 1} из ${SV_Q.length}</span><div class="bar" aria-hidden="true"><i style="width:${(100 * i / SV_Q.length).toFixed(1)}%"></i></div></div>
    <h2 class="mu-q">${esc(q.q)}</h2>
    <div class="mu-opts">${q.o.map((o, k) => `<button class="mu-opt" type="button" data-k="${k}"><i>${k + 1}</i><span>${esc(o[0])}</span></button>`).join('')}</div>
    <div class="res-actions"><button class="btn ghost" type="button" id="svBack">${i ? 'Назад' : 'На главную'}</button></div>`;
  $('#svBody').querySelectorAll('.mu-opt').forEach(b => b.addEventListener('click', () => svAnswer(+b.dataset.k)));
  $('#svBack').addEventListener('click', () => {
    if (sv.ans.length){ sv.ans.pop(); svRender(); }
    else { show('scr-start'); refreshStart(); }
  });
}
function svAnswer(k){
  const q = SV_Q[sv.ans.length]; if (sv.lock || !q || !q.o[k]) return;
  const b = $(`#svBody .mu-opt[data-k="${k}"]`); if (!b) return;
  sv.lock = true; b.classList.add('on'); Sound.pick(0);
  setTimeout(() => {
    sv.lock = false; sv.ans.push(k);
    if (sv.ans.length >= SV_Q.length){ store.set(SV_KEY, {ans:sv.ans.slice(), at:Date.now()}); return svFinale(); }
    svRender(!q.setup);
  }, reduced ? 60 : 240);
}
/* последний ответ: сердце замыкается, и только потом открывается итог */
function svFinale(){
  $('#svSky').innerHTML = svSky(svStars(), true);
  $('#svSky').classList.add('done');
  $('#svBody').innerHTML = '<p class="eyebrow">Звёздная сваха</p><h2 class="mu-q">Звёзды сошлись…</h2>';
  Sound.intro(1);
  setTimeout(() => { $('#svSky').classList.remove('done'); svResult(); }, reduced ? 200 : 1400);
}
function svResult(){
  const m = svMatch(sv.ans), best = m.list[0];
  show('scr-svaha'); $('#svWrap').hidden = true; const box = $('#svRes'); box.hidden = false;
  if (!best){ box.innerHTML = '<p>Под такие условия никто не подошёл. Попробуй пройти ещё раз.</p>'; return; }
  const id = best.id, c = BY[id], pr = PROFILE[id], q = quoteOf(id), she = verb(id, 'она', 'он');
  const why = svReasons(m.u, id, best.home), alt = m.list.slice(1, 4), anti = m.list[m.list.length - 1];
  const card = (r, txt) => `<button type="button" class="sv-card" data-id="${r.id}">${face(r.id)}<span><b>${esc(name(r.id))}</b><small>${r.pct}% · ${esc(txt)}</small></span></button>`;
  box.innerHTML = `<div class="winner">
      <div class="wimg"><img src="${img(id)}" alt="${esc(c.name)}"></div>
      <div class="wtext">
        <p class="eyebrow">Звёздная сваха нашла пару</p>
        <h1>${esc(c.name)}</h1>
        <p class="ttl">${esc(c.title)}</p>
        <p class="sv-pct"><b>${best.pct}%</b> совместимости по характеру</p>
        ${q ? `<blockquote class="wquote"><p>${q.lines.map(l => `<span>«${esc(l)}»</span>`).join('')}</p>${q.by ? `<cite>— ${esc(q.by)}</cite>` : ''}</blockquote>` : ''}
        <p class="path">${esc(pr[4])}</p>
      </div>
    </div>
    <div class="sec"><h2>Почему именно ${she}</h2><ul class="sv-why">${why.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    <div class="sec"><h2>Твоя звезда</h2><p class="sec-sub">Три черты, которые сваха разглядела в твоих ответах.</p>
      <div class="sv-traits">${svTraits(m.u).map(t => `<span>${esc(t)}</span>`).join('')}</div></div>
    <div class="sec"><h2>Ещё подойдут</h2><div class="sv-cards">${alt.map(r => card(r, PROFILE[r.id][3])).join('')}</div></div>
    ${anti && anti.id !== id ? `<div class="sec"><h2>Совсем не твой человек</h2><div class="sv-cards one">${card(anti, PROFILE[anti.id][5])}</div></div>` : ''}
    <div class="res-actions">
      <button class="btn primary" type="button" id="svTour">Турнир из 16 лучших совпадений</button>
      <button class="btn" type="button" id="svAgain">Пройти заново</button>
      <button class="btn ghost" type="button" id="svHome">На главную</button>
    </div>
    <p class="method">Сваха сравнивает твои ответы с характером каждого из ${m.list.length} ${plural(m.list.length,'подходящего чемпиона','подходящих чемпионов','подходящих чемпионов')} по девяти чертам: энергия, свобода, чувства, тьма, общительность, амбиции, риск, любовь к новому и заботливость. Немного добавляет то, в какие края тебя тянет.</p>`;
  box.querySelectorAll('.sv-card').forEach(b => b.addEventListener('click', () => openProfile(b.dataset.id)));
  $('#svTour').addEventListener('click', () => {
    const roster = m.list.slice(0, 16).map(r => r.id).sort((a, b) => IDX[a] - IDX[b]);
    if (roster.length < MIN_N) return toast('Для турнира нужно хотя бы восемь участников');
    openBet(roster, [], false, null);
    $('#betEyebrow').textContent = 'Турнир звёздной свахи';
  });
  $('#svAgain').addEventListener('click', startSvaha);
  $('#svHome').addEventListener('click', () => { show('scr-start'); refreshStart(); });
  if (best.pct >= 90 && !reduced){ Sound.fanfare(); FX.celebrate(); }
  window.scrollTo(0, 0);
}

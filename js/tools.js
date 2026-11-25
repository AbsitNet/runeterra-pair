/* ================= Служебные инструменты проверки =================
   Быстрый доступ к любому экрану и эффекту, чтобы посмотреть их глазами.
   Прогресс не сохраняется, живая комната отключена. Файл загружается только после проверки ключа разработчика. */
(function(){
  document.head.insertAdjacentHTML('beforeend', `<style>
    body.tl #roomBox{display:none}
    body.tl .start-panel{grid-template-columns:minmax(0,1fr)}
    .tl-tab{position:fixed;z-index:40;left:0;top:38%;width:28px;padding:14px 0;border:1px solid var(--gold-lo);border-left:0;background:var(--panel);color:var(--gold-hi);font:600 12px/1 var(--f-ui);letter-spacing:.08em;writing-mode:vertical-rl;transform:rotate(180deg);cursor:pointer;box-shadow:0 8px 24px -10px #000}
    .tl-tab:hover{border-color:var(--gold)}
    .tl-shade{position:fixed;inset:0;z-index:41;background:color-mix(in srgb,var(--night) 55%,transparent)}
    .tl-panel{position:fixed;z-index:42;left:0;top:0;bottom:0;width:min(330px,88vw);overflow:auto;overscroll-behavior:contain;display:grid;align-content:start;gap:14px;
      padding:calc(18px + env(safe-area-inset-top,0px)) 18px calc(18px + env(safe-area-inset-bottom,0px)) max(18px,env(safe-area-inset-left,0px));
      border-right:1px solid var(--gold-lo);background:var(--deep);box-shadow:20px 0 60px -30px #000}
    .tl-panel h2{font-size:26px}
    .tl-panel p{font-size:13.5px;color:var(--muted)}
    .tl-group{display:grid;gap:6px}
    .tl-group h3{font:600 13.5px/1.3 var(--f-ui);color:var(--gold-hi)}
    .tl-go{display:block;width:100%;min-height:40px;padding:9px 12px;text-align:left;border:1px solid var(--line);background:var(--panel);color:var(--text);font:500 14px/1.3 var(--f-ui);cursor:pointer}
    .tl-go:hover{border-color:var(--gold-lo);color:var(--gold-hi)}
    .tl-go small{display:block;color:var(--muted);font-size:12px;font-weight:400}
    .tl-exit{color:var(--muted);font-size:13.5px}
  </style>`);
  document.body.classList.add('tl');

  const SC = [
    ['Экраны', [
      ['start', 'Главный экран', 'Превью дуэли с лорными парами'],
      ['bet', 'Ставка перед турниром', ''],
      ['duel', 'Обычная дуэль', 'Свайпы на телефоне, отмена выбора'],
      ['egg', 'Лорная пара', 'Каин и Рааст с особым вопросом'],
      ['inter', 'Переход к плей-офф', 'Посев и сетка'],
      ['done', 'Итоги', 'Тир-лист, типаж, ачивки, сертификат']
    ]],
    ['Плей-офф и эффекты', [
      ['qf', 'Четвертьфинал', 'Заставка первого уровня'],
      ['sf', 'Полуфинал', 'Заставка второго уровня'],
      ['ubf', 'Финал сетки победителей', ''],
      ['lbf', 'Финал сетки второго шанса', ''],
      ['gf', 'Гранд-финал', 'Лучи, сердцебиение, салют после выбора']
    ]]
  ];
  const T = {
    duel: () => true, egg: () => true,
    inter: m => m.stage === 'ub' && m.first,
    qf: m => m.stage === 'ub' && m.level === 1 && m.k === 0,
    sf: m => m.stage === 'ub' && m.level === 2 && m.k === 0 && !/Финал/.test(m.label),
    ubf: m => m.stage === 'ub' && /Финал/.test(m.label),
    lbf: m => m.stage === 'lb' && m.level === 2,
    gf: m => m.stage === 'final',
    done: () => false
  };

  /* новый турнир по текущим настройкам формы и быстрый прогон до нужной точки случайными выборами */
  function fresh(){
    const s = settings(), roster = pool(s);
    S = {cfg:{v:ENGINE_VERSION, who:s.who, extra:s.extra, mode:s.mode, seed:(Math.random() * 4294967296) >>> 0, roster, removed:[], bet:roster[Math.floor(Math.random() * roster.length)]}, dec:[]};
    ui.ack = false; ui.toastKey = ''; ui.introKey = ''; ui.mode = 'play';
  }
  function advance(test){
    const g = tournament(S.cfg); let r = g.next();
    for (const d of S.dec) r = g.next(d);
    while (!r.done && !test(r.value)){ const d = Math.random() < .5 ? 0 : 1; S.dec.push(d); r = g.next(d); }
  }
  function jump(k){
    close();
    const intro = document.getElementById('intro'); intro.hidden = true; intro.className = 'intro';
    FX.setLevel(0);
    if (k === 'start'){ show('scr-start'); refreshStart(); return; }
    if (k === 'bet'){ openBet(pool(settings()), []); return; }
    fresh(); advance(T[k]);
    ui.ack = k !== 'inter';
    preloadAll(S.cfg.roster);
    go();
    if (k === 'egg' && ui.cur && ui.cur.kind === 'duel'){ ui.cur = Object.assign({}, ui.cur, {a:'Kayn', b:'Rhaast'}); renderDuel(ui.cur, true); }
  }

  /* автовыбор: сам жмёт на случайную карточку, пропускает экран перед плей-офф и останавливается на итогах */
  let auto = false, autoT = 0;
  function tick(){
    clearTimeout(autoT); if (!auto) return;
    let wait = 900;
    if (!document.getElementById('intro').hidden) wait = 400;
    else if (ui.screen === 'scr-inter'){ wait = 2600; setTimeout(() => auto && ui.screen === 'scr-inter' && $('#interGo').click(), 2200); }
    else if (ui.screen === 'scr-result'){ setAuto(false); return; }
    else if (ui.screen === 'scr-duel' && !ui.lock && ui.cur && ui.cur.kind === 'duel'){
      const lvl = ui.cur.level || 0, final = ui.cur.stage === 'final';
      pick(Math.random() < .5 ? 0 : 1);
      wait = final ? 3400 : lvl ? 1700 : 900;
    }
    autoT = setTimeout(tick, wait);
  }
  function setAuto(on){
    auto = on; const cb = document.getElementById('tlAuto'); if (cb) cb.checked = on;
    if (on){ toast('Автовыбор включён'); autoT = setTimeout(tick, 1200); } else clearTimeout(autoT);
  }

  /* панель */
  const tab = document.createElement('button');
  tab.type = 'button'; tab.className = 'tl-tab'; tab.textContent = 'Проверка'; tab.setAttribute('aria-controls', 'tlPanel'); tab.setAttribute('aria-expanded', 'false');
  const shade = document.createElement('div'); shade.className = 'tl-shade'; shade.hidden = true;
  const panel = document.createElement('aside'); panel.className = 'tl-panel'; panel.id = 'tlPanel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Проверка экранов');
  panel.innerHTML = `<h2>Проверка экранов</h2>
    <p>Прыгай к любому экрану или эффекту. Турниры здесь случайные, прогресс не сохраняется, комната на двоих отключена. Настройки на главном экране (кто участвует, длина) учитываются.</p>
    <label class="check" for="tlAuto"><input type="checkbox" id="tlAuto"><b>Автовыбор</b><small>Выборы делаются сами, можно просто смотреть. Остановится на итогах.</small></label>
    ${SC.map(([h, list]) => `<div class="tl-group"><h3>${h}</h3>${list.map(([k, t, d]) => `<button type="button" class="tl-go" data-k="${k}">${t}${d ? `<small>${d}</small>` : ''}</button>`).join('')}</div>`).join('')}
    <a class="tl-exit" href="./">Выйти из режима проверки</a>
    <button type="button" class="tl-go" id="tlForget">Забыть это устройство<small>Режим проверки снова откроется только по секретной ссылке</small></button>`;
  document.body.append(tab, shade, panel);
  function open(){ panel.hidden = false; shade.hidden = false; tab.setAttribute('aria-expanded', 'true'); panel.querySelector('.tl-go').focus(); }
  function close(){ panel.hidden = true; shade.hidden = true; tab.setAttribute('aria-expanded', 'false'); }
  tab.addEventListener('click', () => panel.hidden ? open() : close());
  shade.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden){ e.stopPropagation(); close(); tab.focus(); } }, true);
  panel.addEventListener('click', e => { const b = e.target.closest('.tl-go'); if (b && b.dataset.k) jump(b.dataset.k); });
  panel.querySelector('#tlAuto').addEventListener('change', e => setAuto(e.target.checked));
  panel.querySelector('#tlForget').addEventListener('click', e => { e.stopPropagation(); store.del('rp-dev'); location.href = './'; });

  window.Tools = {jump, setAuto, open, close};
  toast('Режим проверки: прогресс не сохраняется. Панель — слева');
})();

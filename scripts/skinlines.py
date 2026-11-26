"""Собирает js/lines-data.js — линейки образов для турниров по линейкам.

Берёт championFull.json (en_US и ru_RU) из Data Dragon: английские названия нужны, чтобы узнать линейку,
русские — для показа. Остаются только образы чемпионов из теста (js/roster.js) и Киндред, без цветовых вариаций.

Запуск:  python3 scripts/skinlines.py            — скачает свежий Data Dragon
         python3 scripts/skinlines.py <папка>    — возьмёт champ_en_US.json и champ_ru_RU.json из папки
"""
import json, re, sys, urllib.request, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# ключ (не менять: по нему хранится прогресс), название, группа, как узнать образ по английскому названию
# или список линеек, которые нужно объединить в одну
LINES = [
  ('bands',  'Все музыкальные группы',      'music', ['kda', 'penta', 'td', 'hs']),
  ('kda',    'K/DA',                        'music', r'K/DA'),
  ('penta',  'Pentakill',                   'music', r'Pentakill'),
  ('td',     'True Damage',                 'music', r'True Damage'),
  ('hs',     'HEARTSTEEL',                  'music', r'HEARTSTEEL'),
  ('sb',     'Духи цветения',               'au',    r'Spirit Blossom'),
  ('cov',    'Ковен и Старые боги',         'au',    r'^(Prestige )?Coven |Old God'),
  ('emp',    'Эмпирейцы',                   'au',    r'Empyrean'),
  ('hn',     'Ковбои',                      'au',    r'High Noon'),
  ('sg',     'Звёздные защитники',          'au',    r'Star Guardian|Pajama Guardian'),
  ('proj',   'ПРОЕКТ',                      'au',    r'PROJECT'),
  ('cos',    'Тёмная Звезда и Космос',      'au',    r'Cosmic|Dark Star'),
  ('nd',     'Предвестники ночи и зари',    'au',    r'Nightbringer|Dawnbringer'),
  ('bm',     'Кровавая Луна',               'au',    r'Blood Moon'),
  ('ba',     'Боевая академия',             'au',    r'Battle Academia|Battle Professor'),
  ('arc',    'Аркада и мини-боссы',         'au',    r'Arcade|Battle Boss'),
  ('pp',     'Вечеринка у бассейна',        'au',    r'Pool Party'),
  ('anima',  'Боевые звери',                'au',    r'Battle (Bunny|Cat|Lion|Bear|Dove|Wolf|Bat)'),
  ('wb',     'Избранники зимы',             'au',    r'Winterblessed'),
  ('bew',    'Ведьмы',                      'au',    r'Bewitching'),
  ('por',    'Фарфор',                      'au',    r'Porcelain'),
  ('inf',    'Инфернальные',                'au',    r'Infernal'),
  ('arcana', 'Аркана',                      'au',    r'Arcana'),
  ('pf',     'Импульсный Огонь',            'au',    r'Pulsefire'),
  ('sent',   'Стражи света и Падшие',       'au',    r'Sentinel|Ruined'),
  ('ink',    'Чернильная Тень',             'au',    r'Inkshadow'),
  ('psy',    'Пси-отряд',                   'au',    r'PsyOps'),
  ('sf',     'Боевые души',                 'au',    r'Soul Fighter'),
  ('ew',     'Духи леса',                   'au',    r'Elderwood'),
  ('bc',     'Расколотый орден',            'au',    r'Broken Covenant'),
  ('sgv',    'Галактика грува',             'au',    r'Space Groove'),
  ('myth',   'Прядильщики историй',         'au',    r'Mythmaker'),
  ('fc',     'Королевство фей',             'au',    r'Faerie Court'),
  ('ccity',  'Преступный город',            'au',    r'Crime City'),
  ('bq',     'Воинственные королевы',       'au',    r'Battle Queen'),
  ('ody',    'Одиссея',                     'au',    r'Odyssey'),
  ('mk',     'Механические царства',        'au',    r'Mecha Kingdoms'),
  ('fn',     'Мир ужасов',                  'au',    r'Fright Night'),
  ('hvs',    'Небесные змеи',               'au',    r'Heavenscale'),
  ('ij',     'Бессмертный путь',            'au',    r'Immortal Journey'),
  ('rose',   'Увядшая и Хрустальная роза',  'au',    r'Withered Rose|Crystal Rose'),
]
MIN_SKINS = 8

def load(src):
  if src:
    d = pathlib.Path(src)
    return [json.load(open(d / f'champ_{l}.json', encoding='utf-8')) for l in ('en_US', 'ru_RU')]
  v = json.load(urllib.request.urlopen('https://ddragon.leagueoflegends.com/api/versions.json'))[0]
  return [json.load(urllib.request.urlopen(f'https://ddragon.leagueoflegends.com/cdn/{v}/data/{l}/championFull.json')) for l in ('en_US', 'ru_RU')]

def ru_name(s):
  s = s.replace('\xa0', ' ').replace('К/DA', 'K/DA').replace('(престижн.)', '(престижный)')
  s = re.sub(r"''(.+?)''", r'«\1»', s)
  return re.sub(r'\s+', ' ', s).strip()

def main():
  en, ru = load(sys.argv[1] if len(sys.argv) > 1 else None)
  roster = set(re.findall(r'^\s*\["([A-Za-z]+)"', (ROOT / 'js/roster.js').read_text(encoding='utf-8'), re.M))
  ok = lambda cid: cid in roster or cid == 'Kindred'
  out, used, built = [], set(), {}
  for key, title, group, pat in LINES:
    if isinstance(pat, list): continue
    rx, rows = re.compile(pat), []
    for cid in sorted(en['data']):
      if not ok(cid): continue
      names = {s['num']: s['name'] for s in ru['data'][cid]['skins']}
      for s in en['data'][cid]['skins']:
        if s['num'] == 0 or s.get('parentSkin') is not None or not rx.search(s['name']): continue
        rows.append([cid, s['num'], ru_name(names.get(s['num'], s['name']))])
    if len(rows) < MIN_SKINS:
      print('мало образов, пропускаю:', key, len(rows)); continue
    dup = [r for r in rows if (r[0], r[1]) in used]
    if dup: print('образ сразу в двух линейках:', key, dup)
    used.update((r[0], r[1]) for r in rows)
    built[key] = rows
  for key, title, group, pat in LINES:
    rows = [r for k in pat for r in built.get(k, [])] if isinstance(pat, list) else built.get(key)
    if not rows: continue
    out.append([key, title, group, rows])
    print(f'{key:7} {len(rows):3}  {title}')
  body = ',\n'.join('  ' + json.dumps(l, ensure_ascii=False, separators=(',', ':')) for l in out)
  (ROOT / 'js/lines-data.js').write_text(
    '/* Пара из Рунтерры: линейки образов для турниров по линейкам.\n'
    f'   Собрано скриптом scripts/skinlines.py из Data Dragon {en["version"]}: только образы чемпионов из теста, без цветовых вариаций.\n'
    '   Линейка: ключ (по нему хранится прогресс), название, группа, образы [чемпион в Data Dragon, номер образа, название]. */\n'
    "const LINE_GROUPS = [['music', 'Музыкальные группы'], ['au', 'Вселенные']];\n"
    f'const LINES = [\n{body}\n];\n', encoding='utf-8')

main()

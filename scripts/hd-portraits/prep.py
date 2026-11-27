# Готовит исходники портретов в родном разрешении: арт загрузки Data Dragon или вырезка из сплэша
import cv2, os, re
SP = '/tmp/claude-0/-home-claude/f7e0d12e-0535-5ec7-86db-ac1d64e5d271/scratchpad'
ids = re.findall(r'\["([A-Za-z]+)",', open('/home/claude/runeterra-pair/js/roster.js').read())
CROP = {'KindredWolf': ('ld/S_Kindred_0.jpg', (872, 0, 308, 560)),
        'KindredLamb': ('ld/S_Kindred_0.jpg', (442, 45, 370, 672)),
        'Rhaast':      (SP + '/kayn/splash_0.jpg', (682, 0, 394, 716)),
        'Omika':       ('ld/S_Sett_66.jpg', (288, 200, 284, 517))}
FILE = {'Mel': SP + '/raw/Mel.jpg', 'Ekko': 'ld/L_Ekko_57.jpg'}
for id in ids:
  if id in CROP:
    f, (x, y, w, h) = CROP[id]; im = cv2.imread(f)[y:y + h, x:x + w]
  else:
    im = cv2.imread(FILE.get(id, f'ld/{id}_0.jpg'))
  assert im is not None, id
  cv2.imwrite(f'srcs/{id}.png', im)
print(len(ids))

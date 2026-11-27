# Из апскейла EDSR делает портреты сайта: img/hd/{id}.webp 616×1120 и img/{id}.webp 308×560
import os, sys
from PIL import Image
OUT = '/home/claude/runeterra-pair/img'
os.makedirs(OUT + '/hd', exist_ok=True)
QH, QS = int(os.environ.get('QH', 86)), int(os.environ.get('QS', 90))
ids = sys.argv[1:] or sorted(f[:-4] for f in os.listdir('edsr') if f.endswith('.png') and '.tmp' not in f)
for id in ids:
  im = Image.open(f'edsr/{id}.png').convert('RGB')
  hd = im.resize((616, 1120), Image.LANCZOS if im.width < 616 else Image.BOX)
  hd.save(f'{OUT}/hd/{id}.webp', 'WEBP', quality=QH, method=6)
  hd.resize((308, 560), Image.BOX).save(f'{OUT}/{id}.webp', 'WEBP', quality=QS, method=6)
  print(id, os.path.getsize(f'{OUT}/hd/{id}.webp') // 1024, 'KB /', os.path.getsize(f'{OUT}/{id}.webp') // 1024, 'KB')

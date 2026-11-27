# EDSR ×2 по плиткам: на маленьких плитках модель в 2,5 раза быстрее (кэш процессора), края плиток перекрываются
import cv2, os, sys, time, numpy as np
sr = cv2.dnn_superres.DnnSuperResImpl_create(); sr.readModel('sr/EDSR_x2.pb'); sr.setModel('edsr', 2)
T, P = 112, 8
def up(im):
  H, W = im.shape[:2]; out = np.zeros((H * 2, W * 2, 3), np.uint8)
  for y in range(0, H, T):
    for x in range(0, W, T):
      y0, x0, y1, x1 = max(0, y - P), max(0, x - P), min(H, y + T + P), min(W, x + T + P)
      t = sr.upsample(im[y0:y1, x0:x1])
      cy, cx = (y - y0) * 2, (x - x0) * 2
      h, w = min(T, H - y) * 2, min(T, W - x) * 2
      out[y * 2:y * 2 + h, x * 2:x * 2 + w] = t[cy:cy + h, cx:cx + w]
  return out
if __name__ == '__main__':
  first = ['Omika', 'Rhaast', 'KindredWolf', 'KindredLamb', 'Ekko', 'Mel']
  ids = sys.argv[1:] or first + sorted(f[:-4] for f in os.listdir('srcs') if f[:-4] not in first)
  for id in ids:
    out = f'edsr/{id}.png'
    if os.path.exists(out) and len(sys.argv) == 1: continue
    t = time.time(); u = up(cv2.imread(f'srcs/{id}.png'))
    cv2.imwrite(out + '.tmp.png', u); os.replace(out + '.tmp.png', out if len(sys.argv) == 1 else f'edsr_test_{id}.png')
    print(id, u.shape, '%.0fs' % (time.time() - t), flush=True)
  print('DONE', flush=True)

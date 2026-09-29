"""Style-frames board: one hero frame per section, labelled like a production board."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
stills, dst = sys.argv[1], sys.argv[2]
FRAMES = [(8, '01', 'NOISE'), (104, '01', 'NOISE → SIGNAL'), (112, '02', 'MATCH CUT'), (160, '02', 'SIGNAL'),
          (189, '03', 'MODEL'), (230, '04', 'INFINITE'), (258, '04', 'INFINITE'), (300, '05', 'WEAR'),
          (362, '06', 'PLAY'), (386, '06', 'PLAY'), (396, '07', 'A-OK'), (449, '07', 'A-OK')]
cols, tw, th, pad, head = 3, 800, 450, 28, 170
rows = (len(FRAMES) + cols - 1) // cols
W = cols * tw + (cols + 1) * pad; H = head + rows * (th + 64) + pad
board = Image.new('RGB', (W, H), (241, 232, 214)); d = ImageDraw.Draw(board)
def font(path, size):
    try: return ImageFont.truetype(path, size)
    except OSError: return ImageFont.load_default()
F = str(Path(__file__).resolve().parent / 'engine/assets/fonts') + '/'
big, mono, monob = font(F + 'DINCondensedBold.ttf', 84), font(F + 'SF-Mono-Medium.otf', 17), font(F + 'SF-Mono-Bold.otf', 17)
d.text((pad, 34), 'A-OK — INFINITE APES', font=big, fill=(11, 11, 12))
d.text((pad, 128), '15.0 S  ·  1920×1080  ·  30 FPS  ·  128.57 BPM (1 BEAT = 14 FRAMES)  ·  STYLE FRAMES', font=mono, fill=(120, 110, 95))
d.rectangle([W - pad - 220, 46, W - pad, 60], fill=(200, 22, 29))
for i, (f, idx, name) in enumerate(FRAMES):
    x = pad + (i % cols) * (tw + pad); y = head + (i // cols) * (th + 64)
    im = Image.open(f'{stills}/f{f:03d}.png').convert('RGB').resize((tw, th), Image.LANCZOS)
    board.paste(im, (x, y))
    d.text((x, y + th + 14), f'{idx} — {name}', font=monob, fill=(11, 11, 12))
    tc = f'{f // 30:02d}:{f % 30:02d}  F{f:03d}'
    d.text((x + tw - d.textlength(tc, font=mono), y + th + 14), tc, font=mono, fill=(120, 110, 95))
board.save(dst, optimize=True)
print(dst, board.size)

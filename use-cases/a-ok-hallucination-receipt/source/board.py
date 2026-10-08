"""Style-frames board: twenty hero frames, labelled like line items on a receipt."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

stills, dst = sys.argv[1], sys.argv[2]
FRAMES = [
    (0, '01', 'THE THEOREM', 'APES ∞ · KEYS ∞ · COMPUTE ∞'), (96, '01', 'THE THEOREM', 'THE OUTPUT RUNS AWAY'),
    (150, '01', 'THE THEOREM', 'ONE RECEIPT PER APE'), (188, '01', 'THE THEOREM', 'THE SIGNAL'),
    (192, '02', 'GOOD TASTE', 'THE DROP'), (250, '02', 'GOOD TASTE', 'THE HOMEPAGE, ASSEMBLED'),
    (268, '03', 'THE CLUB', 'A SUGGESTED EDIT'), (280, '03', 'THE CLUB', 'LITERALLY MISALIGNED'),
    (326, '04', 'NEW MODELS', 'THE LAUNCH'), (370, '04', 'NEW MODELS', 'OFF THE CHARTS'),
    (420, '05', 'CHECKOUT', 'EVERY BEEP PRINTS A LINE'), (505, '05', 'CHECKOUT', 'SUBTOTAL, TAX: VIBES'),
    (566, '06', 'TOUCH GRASS', '10/10 UBI CREDITS'), (636, '07', 'AGENTS WELCOME', '402 → PAID'),
    (678, '08', 'THE MODELS', 'ONE FLASH PER BEAT'), (702, '08', 'THE MODELS', 'SELECT'),
    (724, '09', 'THE BEST MODELS', 'THE SECOND DROP'), (746, '09', 'THE BEST MODELS', 'THE LINEUP'),
    (831, '10', 'THE TOTAL', 'STILL HALLUCINATING'), (900, '11', 'KEEP THE RECEIPT', 'END CARD'),
]
PAPER, INK, RED, GREY = (247, 243, 223), (34, 34, 30), (197, 34, 36), (110, 106, 92)
cols, tw, th, pad, head = 4, 760, 428, 36, 250
rows = (len(FRAMES) + cols - 1) // cols
W = cols * tw + (cols + 1) * pad
H = head + rows * (th + 70) + pad + 60
board = Image.new('RGB', (W, H), PAPER)
d = ImageDraw.Draw(board)
FONTS = Path(__file__).resolve().parent / 'engine/assets/fonts'


def font(name, size, weight=None):
    f = ImageFont.truetype(str(FONTS / name), size)
    if weight:
        try:
            f.set_variation_by_axes([weight])
        except (OSError, ValueError):
            pass
    return f


big = font('BarlowCondensed-Black.ttf', 120)
mono = font('JetBrainsMono.ttf', 20, 500)
monob = font('JetBrainsMono.ttf', 20, 800)
d.text((pad, 40), 'A–OK — HALLUCINATION RECEIPT', font=big, fill=INK)
d.text((pad, 178), '32.0 S  ·  1920×1080  ·  30 FPS  ·  112.5 BPM (1 BEAT = 16 FRAMES)  ·  STYLE FRAMES  ·  ORDER #∞', font=mono, fill=GREY)
d.rectangle([W - pad - 260, 70, W - pad, 86], fill=RED)
d.line([(pad, head - 30), (W - pad, head - 30)], fill=INK, width=3)
for i, (f, idx, name, note) in enumerate(FRAMES):
    x = pad + (i % cols) * (tw + pad)
    y = head + (i // cols) * (th + 70)
    im = Image.open(f'{stills}/f{f:03d}.png').convert('RGB').resize((tw, th), Image.LANCZOS)
    d.rectangle([x + 8, y + 8, x + tw + 8, y + th + 8], fill=INK)
    board.paste(im, (x, y))
    d.rectangle([x, y, x + tw, y + th], outline=INK, width=3)
    d.text((x, y + th + 18), f'ITEM {idx} — {name}', font=monob, fill=INK)
    tc = f'{f // 30:02d}:{f % 30:02d}  F{f:03d}'
    d.text((x + tw - d.textlength(tc, font=mono), y + th + 18), tc, font=mono, fill=GREY)
    d.text((x, y + th + 44), note, font=mono, fill=RED)
d.text((pad, H - 50), '*** KEEP THIS RECEIPT. ***', font=monob, fill=INK)
board.save(dst, optimize=True)
print(dst, board.size)

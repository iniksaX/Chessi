#!/usr/bin/env python3
"""Generate the Chessi launcher icon (Neo geometric pawn on chess-green)."""
from PIL import Image, ImageDraw

SIZES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
GREEN = (129, 182, 76, 255)
GREEN_DEEP = (93, 153, 72, 255)
CREAM = (238, 238, 210, 255)

def draw_pawn(draw: ImageDraw.ImageDraw, s: int):
    u = s / 96.0  # logical unit
    def R(box, r=2):
        draw.rounded_rectangle([v * u for v in box], radius=r * u, fill=CREAM)
    def poly(points):
        draw.polygon([(x * u, y * u) for x, y in points], fill=CREAM)
    # crown-less pawn: circle head, trapezoid body, collar, base
    draw.ellipse([34*u, 10*u, 62*u, 38*u], fill=CREAM)
    poly([(36.5, 38), (59.5, 38), (64.5, 62), (31.5, 62)])          # body
    R((29, 62, 67, 70), 2.2)                                        # collar
    R((24, 70, 72, 80), 2.6)                                        # plinth

def make(size: int) -> Image.Image:
    S = 8  # supersample
    img = Image.new('RGBA', (size * S, size * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * S * 0.22)
    # vertical gradient-ish: two rounded rects
    d.rounded_rectangle([0, 0, size*S - 1, size*S - 1], radius=r, fill=GREEN)
    d.rounded_rectangle([0, int(size*S*0.45), size*S - 1, size*S - 1], radius=r, fill=GREEN_DEEP)
    d.rounded_rectangle([0, 0, size*S - 1, size*S - 1], radius=r, outline=None)
    inner = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d2 = ImageDraw.Draw(inner)
    draw_pawn(d2, size * S)
    img = Image.alpha_composite(img, inner)
    return img.resize((size, size), Image.LANCZOS)

for name, px in SIZES.items():
    out = f'/home/user/Chessi/android/res/mipmap-{name}/ic_launcher.png'
    make(px).save(out)
    print('wrote', out)

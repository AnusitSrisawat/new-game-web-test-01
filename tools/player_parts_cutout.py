#!/usr/bin/env python3
"""Cut the player parts (hats, outfits, wings, shields) out of assets/player/player_parts_sheet.jpg and the
mounts out of assets/mounts/mounts_riding_sheet.jpg into transparent PNGs.

Output: assets/sprites/player/parts/<id>.png, assets/sprites/mounts/<id>.png
Then tools/player_costumes.py builds the full costume pictures from these parts.

Usage (repo root):  python3 tools/player_parts_cutout.py
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import border_connected, ROOT

BG_TOL = 34

# id -> (x, y, w, h) on the 1024x1024 parts sheet (rectangles skip the printed captions)
PARTS = {
  'hat_helm':     (300, 225, 165, 135), 'hat_wizard':   (470, 235, 190, 125),
  'hat_cat':      (670, 245, 150, 115), 'hat_crown':    (845, 240, 135, 120),
  'outfit_knight':   (75, 435, 140, 170), 'outfit_ranger':  (330, 425, 140, 180),
  'outfit_sorcerer': (575, 440, 145, 160), 'outfit_assassin': (815, 435, 150, 170),
  'wings_angel':  (45, 660, 210, 140), 'wings_dragon': (275, 665, 275, 135),
  'wings_fairy':  (570, 665, 190, 150), 'cape_red':     (810, 660, 180, 135),
  'shield_lion':  (95, 865, 110, 120), 'shield_rune':   (330, 865, 120, 120),
}
# id -> (x, y, w, h) on the 1024x1024 mounts sheet
MOUNTS = {
  'mount_runner': (80, 30, 360, 400), 'mount_wolf': (470, 70, 520, 370),
  'mount_unicorn': (30, 500, 470, 440), 'mount_drake': (530, 560, 320, 340),
}


def cut(img, rect, tol=BG_TOL, minfrac=0.04):
    x, y, w, h = rect
    rgb = np.asarray(img.crop((x, y, x + w, y + h)).convert('RGB')).astype(np.int32)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    fg = ~border_connected(dist < tol)
    # keep only the big connected pieces (drops stray caption bits)
    h2, w2 = fg.shape
    seen = np.zeros_like(fg); comps = []
    for y0, x0 in zip(*np.nonzero(fg)):
        if seen[y0, x0]: continue
        st, pts = [(y0, x0)], []; seen[y0, x0] = True
        while st:
            yy, xx = st.pop(); pts.append((yy, xx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = yy + dy, xx + dx
                if 0 <= ny < h2 and 0 <= nx < w2 and fg[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; st.append((ny, nx))
        comps.append(pts)
    big = max(len(c) for c in comps)
    keep = np.zeros_like(fg)
    for c in comps:
        if len(c) > minfrac * big:
            ys, xs = zip(*c); keep[ys, xs] = True
    m = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
    out = Image.fromarray(np.dstack([rgb.astype(np.uint8), np.asarray(m)]), 'RGBA')
    bbox = out.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    return out.crop(bbox) if bbox else out


def main():
    sheet = Image.open(os.path.join(ROOT, 'assets/player/player_parts_sheet.jpg'))
    d = os.path.join(ROOT, 'assets/sprites/player/parts'); os.makedirs(d, exist_ok=True)
    for k, r in PARTS.items():
        im = cut(sheet, r); im.save(os.path.join(d, k + '.png')); print(k, im.size)
    ms = Image.open(os.path.join(ROOT, 'assets/mounts/mounts_riding_sheet.jpg'))
    d = os.path.join(ROOT, 'assets/sprites/mounts'); os.makedirs(d, exist_ok=True)
    for k, r in MOUNTS.items():
        im = cut(ms, r, minfrac=0.2); im.save(os.path.join(d, k + '.png')); print(k, im.size)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Cut every relic picture out of assets/relics/relics_<sheet>.jpg and remove the neutral background.

Output: assets/sprites/relics/<sheet>_<cell>.png (160x160), transparent PNGs.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG_TOL = 42
HOLE_TOL = 16

def relic_rect(cell):
    col, row = cell % 2, cell >> 1
    # 2x2 grid in 1024x1024
    # Each quadrant is 512x512. Center padding ~20px so we stay safely inside the quadrant.
    return (col * 512 + 20, row * 512 + 20, 472, 472)

def border_connected(candidate):
    h, w = candidate.shape
    reach = np.zeros_like(candidate)
    reach[0, :] = candidate[0, :]; reach[-1, :] = candidate[-1, :]
    reach[:, 0] |= candidate[:, 0]; reach[:, -1] |= candidate[:, -1]
    while True:
        grown = reach.copy()
        grown[1:, :] |= reach[:-1, :]; grown[:-1, :] |= reach[1:, :]
        grown[:, 1:] |= reach[:, :-1]; grown[:, :-1] |= reach[:, 1:]
        grown &= candidate
        if (grown == reach).all():
            return reach
        reach = grown

def cutout(img, out_size=(160, 160)):
    rgb = np.asarray(img.convert('RGB')).astype(np.int32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    bgmask = border_connected(dist < BG_TOL) | (dist < HOLE_TOL)
    fg = ~bgmask
    fg_img = Image.fromarray((fg * 255).astype(np.uint8))
    fg_img = fg_img.filter(ImageFilter.MinFilter(3))
    fg_img = fg_img.filter(ImageFilter.GaussianBlur(0.7))
    alpha = np.asarray(fg_img)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    res = Image.fromarray(out, 'RGBA')
    return res.resize(out_size, Image.LANCZOS)

def main():
    sheets = ['starter', 'beasts', 'bandits', 'fantasy', 'others', 'skeleton']
    out_dir = os.path.join(ROOT, 'assets', 'sprites', 'relics')
    os.makedirs(out_dir, exist_ok=True)
    count = 0
    for s in sheets:
        src = os.path.join(ROOT, 'assets', 'relics', f'relics_{s}.jpg')
        if not os.path.exists(src):
            print(f'Missing {src}')
            continue
        im = Image.open(src).convert('RGB')
        for cell in range(4):
            x, y, w, h = relic_rect(cell)
            crop = im.crop((x, y, x + w, y + h))
            res = cutout(crop, (160, 160))
            dest = os.path.join(out_dir, f'{s}_{cell}.png')
            res.save(dest, optimize=True)
            count += 1
            print(f'Saved {dest}')
    print(f'Done! Successfully generated {count} relic sprites.')

if __name__ == '__main__':
    main()

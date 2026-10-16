#!/usr/bin/env python3
"""Cut every Gold and EXP drop picture out of assets/drops/drops_gold_exp.jpg and remove the neutral background.

Output: assets/sprites/drops/<id>.png (140x140), transparent PNGs.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG_TOL = 38
HOLE_TOL = 14

DROPS = [
    ('gold_s', 40, 290, 110, 365),
    ('gold_m', 350, 650, 100, 365),
    ('gold_l', 660, 1010, 80, 365),
    ('exp_s', 50, 290, 620, 865),
    ('exp_m', 340, 680, 580, 875),
    ('exp_l', 660, 1015, 540, 875)
]

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

def cutout_crop(crop_img):
    rgb = np.asarray(crop_img.convert('RGB')).astype(np.int32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    bgmask = border_connected(dist < BG_TOL) | (dist < HOLE_TOL)
    fg = ~bgmask
    fg_img = Image.fromarray((fg * 255).astype(np.uint8))
    fg_img = fg_img.filter(ImageFilter.MinFilter(3))
    fg_img = fg_img.filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(fg_img)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    return Image.fromarray(out, 'RGBA')

def main():
    src_path = os.path.join(ROOT, 'assets', 'drops', 'drops_gold_exp.jpg')
    out_dir = os.path.join(ROOT, 'assets', 'sprites', 'drops')
    os.makedirs(out_dir, exist_ok=True)

    sheet = Image.open(src_path).convert('RGB')

    for item_id, x1, x2, y1, y2 in DROPS:
        cell_crop = sheet.crop((x1, y1, x2, y2))
        rgba = cutout_crop(cell_crop)

        # Crop to non-transparent bounding box
        bbox = rgba.getbbox()
        if bbox:
            item_crop = rgba.crop(bbox)
        else:
            item_crop = rgba

        # Place onto 140x140 transparent canvas
        out_canvas = Image.new('RGBA', (140, 140), (0, 0, 0, 0))
        iw, ih = item_crop.size
        scale = min(120.0 / iw, 120.0 / ih)
        target_w = int(iw * scale)
        target_h = int(ih * scale)
        resized = item_crop.resize((target_w, target_h), Image.LANCZOS)
        paste_x = (140 - target_w) // 2
        paste_y = (140 - target_h) // 2
        out_canvas.paste(resized, (paste_x, paste_y), resized)

        dest = os.path.join(out_dir, f'{item_id}.png')
        out_canvas.save(dest, optimize=True)
        print(f'Saved {dest}')

    print('All Gold and EXP drop sprites processed successfully!')

if __name__ == '__main__':
    main()

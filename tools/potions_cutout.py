#!/usr/bin/env python3
"""Cut every potion bottle picture out of assets/potions/potions_sheet.jpg and remove the neutral background.

Output: assets/sprites/potions/<id>.png (140x140), transparent PNGs.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG_TOL = 38
HOLE_TOL = 14

POTIONS = [
    ('hp_potion_s', 0, 0),
    ('hp_potion_m', 1, 0),
    ('hp_potion_l', 2, 0),
    ('sp_potion_s', 0, 1),
    ('sp_potion_m', 1, 1),
    ('sp_potion_l', 2, 1),
    ('exp_potion_s', 0, 2),
    ('exp_potion_m', 1, 2),
    ('exp_potion_l', 2, 2)
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
    src_path = os.path.join(ROOT, 'assets', 'potions', 'potions_sheet.jpg')
    out_dir = os.path.join(ROOT, 'assets', 'sprites', 'potions')
    os.makedirs(out_dir, exist_ok=True)

    sheet = Image.open(src_path).convert('RGB')
    sw, sh = sheet.size
    cell_w = sw // 3
    cell_h = sh // 3

    for item_id, col, row in POTIONS:
        # Crop with 8px margin from cell boundaries
        x1 = col * cell_w + 6
        y1 = row * cell_h + 6
        x2 = (col + 1) * cell_w - 6
        y2 = (row + 1) * cell_h - 6
        cell_crop = sheet.crop((x1, y1, x2, y2))

        rgba = cutout_crop(cell_crop)
        # Find exact bounding box of the non-transparent pixels
        bbox = rgba.getbbox()
        if bbox:
            item_crop = rgba.crop(bbox)
        else:
            item_crop = rgba

        # Place onto a 140x140 transparent square canvas, centered
        out_canvas = Image.new('RGBA', (140, 140), (0, 0, 0, 0))
        iw, ih = item_crop.size
        scale = min(120.0 / iw, 128.0 / ih)
        target_w = int(iw * scale)
        target_h = int(ih * scale)
        resized = item_crop.resize((target_w, target_h), Image.LANCZOS)
        paste_x = (140 - target_w) // 2
        paste_y = (140 - target_h) // 2
        out_canvas.paste(resized, (paste_x, paste_y), resized)

        dest = os.path.join(out_dir, f'{item_id}.png')
        out_canvas.save(dest, optimize=True)
        print(f'Saved {dest}')

    print('All 9 potion sprites processed successfully!')

if __name__ == '__main__':
    main()

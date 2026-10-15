#!/usr/bin/env python3
"""Cut every monster / item picture out of its sheet and remove the grey background.

Usage (from the repo root):
    node tools/export-manifest.mjs > /tmp/manifest.json && python3 tools/cutout.py /tmp/manifest.json

Output: assets/sprites/monsters/<sheet>_<cell>.png (230x210) and assets/sprites/items/<sheet>_<cell>.png (100x95),
transparent PNGs. This script owns the crop rectangles; src/sprites.js only needs the output sizes.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG_TOL = 44      # colour distance from the background that still counts as background
HOLE_TOL = 14    # tighter tolerance for enclosed background pixels (gaps between legs etc.)


def monster_rect(cell):
    col, row = cell % 2, cell >> 1
    return (col * 512 + 26, row * 512 + 8, 460, 420)


def item_rect(cell):
    col, row = cell % 3, cell // 3
    return (105 + 308 * col, 25 + 241 * row, 200, 190)  # 190 high: leaves the printed caption out


def border_connected(candidate):
    """Pixels of `candidate` (bool array) that are connected to the image border."""
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


def cutout(img, out_size):
    rgb = np.asarray(img.convert('RGB')).astype(np.int32)
    h, w, _ = rgb.shape
    # background colour = median of the border pixels
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    bgmask = border_connected(dist < BG_TOL) | (dist < HOLE_TOL)
    fg = ~bgmask
    # drop specks (printed captions' leftovers, noise): keep the large connected parts only
    fg_img = Image.fromarray((fg * 255).astype(np.uint8))
    fg_img = fg_img.filter(ImageFilter.MinFilter(3))   # shave the 1px grey halo
    fg_img = fg_img.filter(ImageFilter.GaussianBlur(0.7))
    alpha = np.asarray(fg_img)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    res = Image.fromarray(out, 'RGBA')
    return res.resize(out_size, Image.LANCZOS)


def main(manifest_path):
    m = json.load(open(manifest_path))
    cache = {}
    def sheet(path):
        if path not in cache:
            cache[path] = Image.open(os.path.join(ROOT, path)).convert('RGB')
        return cache[path]

    jobs = {}  # (kind, sheet, cell) once, even when several monsters share a picture
    for sheet_name, cell in m['MONSTER_SPRITES'].values():
        jobs[('monsters', sheet_name, cell)] = None
    for sheet_name, ids in m['ITEM_SHEET_IDS'].items():
        for cell in range(len(ids)):
            jobs[('items', sheet_name, cell)] = None

    for kind, sheet_name, cell in sorted(jobs):
        src = m['SHEETS'][sheet_name][kind]
        x, y, w, h = (monster_rect if kind == 'monsters' else item_rect)(cell)
        crop = sheet(src).crop((x, y, x + w, y + h))
        out_size = (w // 2, h // 2)
        res = cutout(crop, out_size)
        d = os.path.join(ROOT, 'assets', 'sprites', kind)
        os.makedirs(d, exist_ok=True)
        res.save(os.path.join(d, f'{sheet_name}_{cell}.png'), optimize=True)
    print(f'wrote {len(jobs)} sprites')


if __name__ == '__main__':
    main(sys.argv[1])

#!/usr/bin/env python3
"""Batch cut all clothes and wings sheets into transparent player sprites and register them.

Usage: python tools/batch_cut_clothes_and_wings.py
"""
import glob
import itertools
import json
import os
import sys
import cv2
import numpy as np
import scipy.ndimage as ndi
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOTHES_DIR = os.path.join(ROOT, 'assets/player/clothes')
WINGS_DIR = os.path.join(ROOT, 'assets/player/wings')
PARTS_DIR = os.path.join(ROOT, 'assets/sprites/player/parts')
os.makedirs(PARTS_DIR, exist_ok=True)

# 22 Clothes Sheets Theme Info
CLOTHES_THEMES = [
    ("Beast & Hunter Outfits", "ชุดนักล่าและสัตว์ป่าแฟนตาซี"),
    ("Noble Knight Armor", "ชุดเกราะอัศวินหลวง"),
    ("Cozy Civilian & Merchant", "ชุดชาวบ้านและพ่อค้าผู้มั่งคั่ง"),
    ("Shadow Assassin & Rogue", "ชุดนักฆ่าเงามืดและโจรเร้นกาย"),
    ("Arch-Mage & Mystic Robes", "ชุดคลุมมหาจอมเวทรูนโบราณ"),
    ("Stone Golem & Nature Ward", "ชุดศิลาโกเลมและพฤกษาพิทักษ์"),
    ("Royal Guard & Paladin", "ชุดอัศวินพาลาดินศักดิ์สิทธิ์"),
    ("Steampunk & Alchemist", "ชุดนักเล่นแร่แปรธาตุสตีมพังก์"),
    ("Forest Druid & Shaman", "ชุดดรูอิดพิทักษ์ไพรและชาแมน"),
    ("Dragon Slayer & Heavy Plate", "ชุดเกราะผู้พิชิตมังกร"),
    ("Flame Sorcerer & Pyro Vestments", "ชุดคลุมเพลิงอัคคีพิโรธ"),
    ("Frost Mage & Ice Walker", "ชุดนักเวทมนตราเหมันต์"),
    ("Sky Traveler & Wind Scout", "ชุดนักสำรวจเวหาและพรานสายลม"),
    ("Dark Warlock & Necromancer", "ชุดวอร์ล็อกมนตรามืด"),
    ("Golden Sun Champion", "ชุดนักรบสุริยันสีทอง"),
    ("Abyssal Deep-Sea Mariner", "ชุดกัปตันสมุทรลึกและนักดำน้ำ"),
    ("Desert Nomad & Dune Raider", "ชุดพรานทะเลทรายและคาราวาน"),
    ("Cherry Blossom Samurai & Ronin", "ชุดซามูไรซากุระและโรนิน"),
    ("Vampire Aristocrat & Gothic Coat", "ชุดขุนนางแวมไพร์กอธิค"),
    ("Fairy Tale Prince & Princess", "ชุดเจ้าชายและเจ้าหญิงนิทาน"),
    ("Celestial Starry Robes", "ชุดดวงดาวจักรวาลแห่งปวงเทพ"),
    ("Ancient Pharaoh & Divine Monarch", "ชุดฟาโรห์โบราณและกษัตริย์เทพ"),
]

# 21 Wings Sheets Theme Info
WINGS_THEMES = [
    ("Sakura & Floral Petal Wings", "ปีกซากุระและกลีบดอกไม้พฤกษา"),
    ("Golden Seraph Angel Wings", "ปีกเทวทูตเซราฟิมสีทอง"),
    ("Amethyst Crystal & Gem Wings", "ปีกผลึกอัญมณีอเมทิสต์"),
    ("Autumn Foliage & Woodland Wings", "ปีกใบไม้ร่วงและพิทักษ์พงไพร"),
    ("Shadow Void & Dark Raven Wings", "ปีกอีกาเงามืดแห่งความว่างเปล่า"),
    ("Crimson Phoenix & Fire Wings", "ปีกฟีนิกซ์เปลวเพลิงสุริยา"),
    ("Glacial Frost & Ice Wings", "ปีกน้ำแข็งประกายเหมันต์"),
    ("Monarch Butterfly & Insect Wings", "ปีกผีเสื้อราชาและภูตน้อย"),
    ("Lightning Storm & Thunder Wings", "ปีกอสุนีบาตสายฟ้าคำราม"),
    ("Dragon Bone & Demonic Wings", "ปีกกระดูกมังกรและปีศาจ"),
    ("Starry Galaxy & Cosmic Wings", "ปีกกาแล็กซีห้วงอวกาศ"),
    ("Steampunk Brass Gear Wings", "ปีกจักรกลเฟืองทองเหลืองสตีมพังก์"),
    ("Holy Sacred Dove Wings", "ปีกพิราบขาวบริสุทธิ์ศักดิ์สิทธิ์"),
    ("Sea Pearl & Aquatic Fin Wings", "ปีกครีบสมุทรไข่มุกวารี"),
    ("Emerald Wood & Vine Wings", "ปีกเถาวัลย์มรกตพงไพร"),
    ("Runic Arcane Magic Wings", "ปีกวงเวทมนตราอักษรรูน"),
    ("Gothic Bat & Vampire Wings", "ปีกค้างคาวรัตติกาลกอธิค"),
    ("Prismatic Rainbow Aurora Wings", "ปีกแสงออโรร่าสีรุ้ง"),
    ("Iron Mecha Cyber Wings", "ปีกเมกะเหล็กไหลไฮเทค"),
    ("Ethereal Spirit & Phantom Wings", "ปีกวิญญาณภูตเรืองแสง"),
    ("Golden Sun Deity Wings", "ปีกสุริยเทพทองคำสง่างาม"),
]

def render_item_rgba(arr, bg_col, mask_bool, h, w):
    dist_to_bg = ndi.distance_transform_edt(mask_bool)

    # Interior is fully solid alpha = 1.0 (prevents white gloves/teeth from being transparent)
    alpha = np.zeros((h, w), dtype=np.float32)
    alpha[dist_to_bg >= 2.0] = 1.0
    # Clean anti-aliasing along outer contour (no white halo)
    edge_band = (dist_to_bg >= 0.8) & (dist_to_bg < 2.0)
    alpha[edge_band] = (dist_to_bg[edge_band] - 0.8) / (2.0 - 0.8)
    alpha[edge_band] = alpha[edge_band] * alpha[edge_band] * (3.0 - 2.0 * alpha[edge_band])

    # Decontaminate background color from edge pixels (eliminates white fringe)
    edge_mask = (alpha > 0.01) & (alpha < 0.99)
    arr_corr = arr.copy()
    for ch in range(3):
        ch_data = arr_corr[:, :, ch]
        corrected = (ch_data - (1.0 - alpha) * bg_col[ch]) / np.maximum(alpha, 0.05)
        ch_data[edge_mask] = np.clip(corrected[edge_mask], 0, 255)
        arr_corr[:, :, ch] = ch_data

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.clip(arr_corr, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)

    out_im = Image.fromarray(rgba, mode='RGBA')
    bbox = out_im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    if bbox:
        out_im = out_im.crop(bbox)

    target_w = max(1, round(out_im.width * 0.5))
    target_h = max(1, round(out_im.height * 0.5))
    out_im = out_im.resize((target_w, target_h), Image.Resampling.LANCZOS)
    return out_im

def extract_clothes_from_sheet(sheet_img):
    arr = np.array(sheet_img.convert('RGB'), dtype=np.float32)
    h, w, _ = arr.shape
    borders = np.concatenate([arr[0, :, :], arr[-1, :, :], arr[:, 0, :], arr[:, -1, :]])
    bg_col = np.median(borders, axis=0)
    dist = np.linalg.norm(arr - bg_col, axis=2)
    is_bg = (dist < 12.0).astype(np.uint8)
    mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
    for x in range(w):
        if is_bg[0, x] == 1: cv2.floodFill(is_bg, mask, (x, 0), 2)
        if is_bg[h - 1, x] == 1: cv2.floodFill(is_bg, mask, (x, h - 1), 2)
    for y in range(h):
        if is_bg[y, 0] == 1: cv2.floodFill(is_bg, mask, (0, y), 2)
        if is_bg[y, w - 1] == 1: cv2.floodFill(is_bg, mask, (w - 1, y), 2)
    outer_bg = (is_bg == 2)
    fg = ~outer_bg
    fg_solid = ndi.binary_fill_holes(fg)
    lbl, n = ndi.label(fg_solid)
    objs = ndi.find_objects(lbl)

    outfit_comps = []
    for i, o in enumerate(objs):
        if o[0].stop > 1000 and (o[0].stop - o[0].start) > 400:
            cx = (o[1].start + o[1].stop) / 2.0
            outfit_comps.append((i + 1, cx))
    outfit_comps.sort(key=lambda x: x[1])

    if len(outfit_comps) != 4:
        sizes = [(np.count_nonzero(lbl == (i + 1)), i + 1, (o[1].start + o[1].stop) / 2.0)
                 for i, o in enumerate(objs) if o[0].stop > 800]
        sizes.sort(key=lambda x: -x[0])
        outfit_comps = [(x[1], x[2]) for x in sizes[:4]]
        outfit_comps.sort(key=lambda x: x[1])

    out_images = []
    for comp_id, _ in outfit_comps:
        comp_mask = (lbl == comp_id)
        out_im = render_item_rgba(arr, bg_col, comp_mask, h, w)
        out_images.append(out_im)
    return out_images

def extract_wings_from_sheet(sheet_img):
    arr = np.array(sheet_img.convert('RGB'), dtype=np.float32)
    h, w, _ = arr.shape
    borders = np.concatenate([arr[0, :, :], arr[-1, :, :], arr[:, 0, :], arr[:, -1, :]])
    bg_col = np.median(borders, axis=0)
    dist = np.linalg.norm(arr - bg_col, axis=2)
    is_bg = (dist < 15.0).astype(np.uint8)
    mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
    for x in range(w):
        if is_bg[0, x] == 1: cv2.floodFill(is_bg, mask, (x, 0), 2)
        if is_bg[h - 1, x] == 1: cv2.floodFill(is_bg, mask, (x, h - 1), 2)
    for y in range(h):
        if is_bg[y, 0] == 1: cv2.floodFill(is_bg, mask, (0, y), 2)
        if is_bg[y, w - 1] == 1: cv2.floodFill(is_bg, mask, (w - 1, y), 2)
    outer_bg = (is_bg == 2)
    fg = ~outer_bg
    fg_solid = ndi.binary_fill_holes(fg)
    lbl, n = ndi.label(fg_solid)
    objs = ndi.find_objects(lbl)

    main_comps = []
    for i, o in enumerate(objs):
        sz = np.count_nonzero(lbl == (i + 1))
        if sz > 15000 and o[0].stop > 200 and o[0].start < 1350:
            center_x = (o[1].start + o[1].stop) / 2.0
            main_comps.append({
                'id': i + 1,
                'sz': sz,
                'x1': o[1].start,
                'x2': o[1].stop,
                'y1': o[0].start,
                'y2': o[0].stop,
                'cx': center_x
            })
    main_comps.sort(key=lambda c: c['cx'])
    M = len(main_comps)

    best_partition = None
    best_score = float('inf')
    for p in itertools.product([1, 2], repeat=4):
        if sum(p) != M: continue
        score = 0.0
        cur_idx = 0
        valid = True
        for group_size in p:
            if group_size == 1:
                cur_idx += 1
            else:
                c1 = main_comps[cur_idx]
                c2 = main_comps[cur_idx + 1]
                ratio = max(c1['sz'], c2['sz']) / min(c1['sz'], c2['sz'])
                y_diff = abs(c1['y1'] - c2['y1']) + abs(c1['y2'] - c2['y2'])
                if ratio > 2.5:
                    valid = False
                    break
                score += (ratio - 1.0) * 100.0 + y_diff * 0.1
                cur_idx += 2
        if valid and score < best_score:
            best_score = score
            best_partition = p

    if best_partition is None:
        slot_centers = [(c + 0.5) * w / 4.0 for c in range(4)]
        items_labels = [[] for _ in range(4)]
        for mc in main_comps:
            slot = int(np.argmin([abs(mc['cx'] - sc) for sc in slot_centers]))
            items_labels[slot].append(mc['id'])
    else:
        items_labels = [[] for _ in range(4)]
        cur_idx = 0
        for slot, group_size in enumerate(best_partition):
            for _ in range(group_size):
                items_labels[slot].append(main_comps[cur_idx]['id'])
                cur_idx += 1

    # Wing bounding boxes of main components
    slot_bounds = []
    for slot in range(4):
        if items_labels[slot]:
            slot_mask = np.isin(lbl, items_labels[slot])
            ys, xs = np.where(slot_mask)
            slot_bounds.append({
                'min_x': xs.min(), 'max_x': xs.max(), 'center_x': float(np.mean(xs)),
                'min_y': ys.min(), 'max_y': ys.max()
            })
        else:
            cx = (slot + 0.5) * w / 4.0
            slot_bounds.append({'min_x': cx - 200, 'max_x': cx + 200, 'center_x': cx, 'min_y': 200, 'max_y': 1200})

    # Assign extra components (particles, runes) ONLY if vertically within the wing area
    # Rejects bottom text labels (e.g. on sheets 3, 7, 15, 19)
    for i, o in enumerate(objs):
        comp_id = i + 1
        if any(comp_id in items_labels[s] for s in range(4)):
            continue
        sz = np.count_nonzero(lbl == comp_id)
        if sz < 15:
            continue
        comp_mask = (lbl == comp_id)
        ys, xs = np.where(comp_mask)
        cx = float(np.mean(xs))
        cy = float(np.mean(ys))
        closest_slot = int(np.argmin([abs(cx - slot_bounds[s]['center_x']) for s in range(4)]))
        sb = slot_bounds[closest_slot]
        if o[0].start > sb['max_y'] - 5 or cy < sb['min_y'] - 60:
            continue
        items_labels[closest_slot].append(comp_id)

    out_images = []
    for slot in range(4):
        slot_mask = np.isin(lbl, items_labels[slot])
        out_im = render_item_rgba(arr, bg_col, slot_mask, h, w)
        out_images.append(out_im)
    return out_images

def process_all():
    clothes_files = sorted(glob.glob(os.path.join(CLOTHES_DIR, '*.jpg')))
    wings_files = sorted(glob.glob(os.path.join(WINGS_DIR, '*.jpg')))

    print(f"Processing {len(clothes_files)} clothes sheets (88 outfits)...")
    clothes_items = []
    for s_idx, f in enumerate(clothes_files):
        theme_en, theme_th = CLOTHES_THEMES[s_idx] if s_idx < len(CLOTHES_THEMES) else (f"Outfit Set {s_idx+1}", f"ชุดเซ็ตที่ {s_idx+1}")
        sheet_img = Image.open(f)
        print(f"  Clothes Sheet #{s_idx+1:02d}: {os.path.basename(f)} ({theme_en})")
        cut_images = extract_clothes_from_sheet(sheet_img)
        for c, cut in enumerate(cut_images):
            part_id = f"outfit_c{s_idx+1:02d}_{c+1}"
            out_path = os.path.join(PARTS_DIR, f"{part_id}.png")
            cut.save(out_path, optimize=True)

            tier = (s_idx // 4) + 1
            def_bonus = 6 + tier * 2 + c
            hp_bonus = 25 + tier * 15 + c * 5
            price = 350 + tier * 150 + c * 25
            item_name = f"{theme_en} V{c+1}"
            item_desc = f"{theme_th} รูปแบบที่ {c+1} (DEF +{def_bonus}, Max HP +{hp_bonus})"

            clothes_items.append({
                'id': part_id,
                'part': part_id,
                'name': item_name,
                'type': 'outfit',
                'icon': '🥋',
                'partW': 135,
                'partY': 303,
                'def': def_bonus,
                'hp': hp_bonus,
                'price': price,
                'desc': item_desc,
                'img': cut
            })

    print(f"\nProcessing {len(wings_files)} wings sheets (84 wings)...")
    wings_items = []
    for s_idx, f in enumerate(wings_files):
        theme_en, theme_th = WINGS_THEMES[s_idx] if s_idx < len(WINGS_THEMES) else (f"Wings Set {s_idx+1}", f"ปีกเซ็ตที่ {s_idx+1}")
        sheet_img = Image.open(f)
        print(f"  Wings Sheet #{s_idx+1:02d}: {os.path.basename(f)} ({theme_en})")
        cut_images = extract_wings_from_sheet(sheet_img)
        for c, cut in enumerate(cut_images):
            part_id = f"back_w{s_idx+1:02d}_{c+1}"
            out_path = os.path.join(PARTS_DIR, f"{part_id}.png")
            cut.save(out_path, optimize=True)

            tier = (s_idx // 4) + 1
            atk_bonus = 2 + tier + (1 if c % 2 == 1 else 0)
            def_bonus = 2 + tier + (1 if c % 2 == 0 else 0)
            hp_bonus = 20 + tier * 10
            price = 600 + tier * 250 + c * 50
            item_name = f"{theme_en} V{c+1}"
            item_desc = f"{theme_th} แบบที่ {c+1} (ATK +{atk_bonus}, DEF +{def_bonus}, Max HP +{hp_bonus})"

            wings_items.append({
                'id': part_id,
                'part': part_id,
                'name': item_name,
                'type': 'back',
                'icon': '🪽',
                'partW': 225,
                'partY': 165,
                'atk': atk_bonus,
                'def': def_bonus,
                'hp': hp_bonus,
                'price': price,
                'desc': item_desc,
                'img': cut
            })

    # Update player_manifest.py
    print("\nUpdating src/player_sprites.js via player_manifest...")
    out_sprites = {'parts': {}, 'mounts': {}}
    for f in sorted(glob.glob(os.path.join(ROOT, 'assets/sprites/player/parts/*.png'))):
        im = Image.open(f)
        out_sprites['parts'][os.path.basename(f)[:-4]] = {'w': im.width, 'h': im.height}
    for f in sorted(glob.glob(os.path.join(ROOT, 'assets/sprites/mounts/*.png'))):
        im = Image.open(f)
        out_sprites['mounts'][os.path.basename(f)[:-4]] = {'w': im.width, 'h': im.height}

    with open(os.path.join(ROOT, 'src/player_sprites.js'), 'w') as fh:
        fh.write('// Generated by tools/player_manifest.py - picture sizes of the player parts / mounts\n')
        fh.write('export const PLAYER_SPRITES = ' + json.dumps(out_sprites, indent=1) + ';\n')
    print(f"Total parts in player_sprites.js: {len(out_sprites['parts'])}")

    return clothes_items, wings_items

if __name__ == '__main__':
    c_items, w_items = process_all()
    print(f"\nSUCCESS: Extracted {len(c_items)} outfits and {len(w_items)} wings!")

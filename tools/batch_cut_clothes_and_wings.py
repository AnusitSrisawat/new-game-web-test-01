#!/usr/bin/env python3
"""Batch cut all clothes and wings sheets into transparent player sprites and register them.

Usage: python tools/batch_cut_clothes_and_wings.py
"""
import glob
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

def cut_asset(crop_pil, is_wing=False):
    arr = np.array(crop_pil.convert('RGB'), dtype=np.float32)
    h, w, _ = arr.shape

    borders = np.concatenate([arr[0, :, :], arr[-1, :, :], arr[:, 0, :], arr[:, -1, :]])
    bg_col = np.median(borders, axis=0)
    dist = np.linalg.norm(arr - bg_col, axis=2)

    tol = 15.0 if is_wing else 12.0
    is_bg = (dist < tol).astype(np.uint8)
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
    if n > 0:
        objs = ndi.find_objects(lbl)
        if not is_wing:
            # Clothes: select the full outfit (must have y_stop > 1050 and height > 400)
            valid_idx = []
            for i, o in enumerate(objs):
                if o[0].stop > 1050 and (o[0].stop - o[0].start) > 400:
                    valid_idx.append(i + 1)
            if valid_idx:
                keep_mask = np.isin(lbl, valid_idx)
            else:
                sizes = [np.count_nonzero(lbl == (i + 1)) for i in range(n)]
                keep_mask = (lbl == (np.argmax(sizes) + 1))
            fg_solid = keep_mask
        else:
            # Wings: keep components > 1.5% of max size within y: 150..1380
            sizes = [np.count_nonzero(lbl == (i + 1)) for i in range(n)]
            max_size = max(sizes) if sizes else 1
            keep_mask = np.zeros_like(fg_solid)
            for i, o in enumerate(objs):
                sz = sizes[i]
                if sz > max_size * 0.015 and o[0].stop > 150 and o[0].start < 1380:
                    keep_mask |= (lbl == (i + 1))
            fg_solid = keep_mask

    # Anti-aliasing alpha matting
    d_low = 5.0
    d_high = 18.0
    alpha = np.zeros((h, w), dtype=np.float32)
    alpha[fg_solid] = np.clip((dist[fg_solid] - d_low) / (d_high - d_low), 0.0, 1.0)
    alpha[fg_solid & (dist >= d_high)] = 1.0
    alpha = alpha * alpha * (3.0 - 2.0 * alpha)

    # Decontaminate background color from borders
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

    # Scale by 0.5 to keep file size compact and crisp
    target_w = max(1, round(out_im.width * 0.5))
    target_h = max(1, round(out_im.height * 0.5))
    out_im = out_im.resize((target_w, target_h), Image.Resampling.LANCZOS)
    return out_im

def process_all():
    import cv2
    clothes_files = sorted(glob.glob(os.path.join(CLOTHES_DIR, '*.jpg')))
    wings_files = sorted(glob.glob(os.path.join(WINGS_DIR, '*.jpg')))

    print(f"Processing {len(clothes_files)} clothes sheets (88 outfits)...")
    clothes_items = []
    for s_idx, f in enumerate(clothes_files):
        theme_en, theme_th = CLOTHES_THEMES[s_idx] if s_idx < len(CLOTHES_THEMES) else (f"Outfit Set {s_idx+1}", f"ชุดเซ็ตที่ {s_idx+1}")
        sheet_img = Image.open(f)
        w, h = sheet_img.size
        print(f"  Clothes Sheet #{s_idx+1:02d}: {os.path.basename(f)} ({theme_en})")
        for c in range(4):
            x1, x2 = int(c * w / 4), int((c + 1) * w / 4)
            crop = sheet_img.crop((x1, 0, x2, h))
            cut = cut_asset(crop, is_wing=False)

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
        w, h = sheet_img.size
        print(f"  Wings Sheet #{s_idx+1:02d}: {os.path.basename(f)} ({theme_en})")
        for c in range(4):
            x1, x2 = int(c * w / 4), int((c + 1) * w / 4)
            crop = sheet_img.crop((x1, 0, x2, h))
            cut = cut_asset(crop, is_wing=True)

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

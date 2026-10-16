import os
import cv2
import shutil
import numpy as np
import scipy.ndimage as ndi
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HAIR_DIR = os.path.join(ROOT, 'assets/player/hair')
PARTS_DIR = os.path.join(ROOT, 'assets/sprites/player/parts')
os.makedirs(PARTS_DIR, exist_ok=True)

SHEETS = [
    {
        "file": "Gemini_Generated_Image_homwuwhomwuwhomw.jpg",
        "sheet_name": "Set 1: Classic Adventurer (1-8)",
        "heads": [
            ("head_01_blonde",   "01. Spiky Golden Blonde"),
            ("head_02_brown",    "02. Chocolate Brown"),
            ("head_03_pink",     "03. Bubblegum Pink"),
            ("head_04_samurai",  "04. Jet Black Samurai"),
            ("head_05_lavender", "05. Lavender Purple"),
            ("head_06_crimson",  "06. Crimson Red"),
            ("head_07_silver",   "07. Silver Ash"),
            ("head_08_navy",     "08. Navy Blue"),
        ]
    },
    {
        "file": "Gemini_Generated_Image_18hkzc18hkzc18hk.jpg",
        "sheet_name": "Set 2: Fantasy & Princess (9-16)",
        "heads": [
            ("head_09_mint_pixie",       "09. Mint Green Pixie"),
            ("head_10_wheat_braid",      "10. Golden Wheat Drill Braid"),
            ("head_11_sakura_asym",      "11. Sakura Pink Asymmetric"),
            ("head_12_royal_ponytail",   "12. Royal Blue Ponytail"),
            ("head_13_caramel_updo",     "13. Caramel Brunette Messy Updo"),
            ("head_14_lilac_twintails",  "14. Lilac Princess Twintails"),
            ("head_15_ruby_punk",        "15. Ruby Red Punk Spikes"),
            ("head_16_midnight_braid",   "16. Midnight Grey Low Braid"),
        ]
    },
    {
        "file": "Gemini_Generated_Image_yz786hyz786hyz78.jpg",
        "sheet_name": "Set 3: Modern & Warrior (17-24)",
        "heads": [
            ("head_17_yellow_wolf",      "17. Pale Yellow Wolf Cut"),
            ("head_18_auburn_braids",    "18. Auburn Double Braids"),
            ("head_19_blue_mohawk",      "19. Electric Blue Mohawk"),
            ("head_20_cream_bob",        "20. Cream Blonde Straight Bob"),
            ("head_21_green_ponytail",   "21. Emerald Green High Ponytail"),
            ("head_22_plum_shag",        "22. Dark Plum Messy Shag"),
            ("head_23_silver_buns",      "23. Pure Silver Twin Buns"),
            ("head_24_brown_quiff",      "24. Chocolate Brown Spiky Quiff"),
        ]
    },
    {
        "file": "Gemini_Generated_Image_tfi0eltfi0eltfi0.jpg",
        "sheet_name": "Set 4: Nature & Drills (25-32)",
        "heads": [
            ("head_25_emerald_messy",    "25. Emerald Green Messy"),
            ("head_26_ginger_buns",      "26. Ginger Double Buns"),
            ("head_27_snow_braids",      "27. Snow White Long Braids"),
            ("head_28_chestnut_bowl",    "28. Chestnut Bowl Cut"),
            ("head_29_sunset_ponytail",  "29. Sunset Orange Ponytail"),
            ("head_30_midnight_shag",    "30. Midnight Blue Shag"),
            ("head_31_golden_drills",    "31. Golden Drills"),
            ("head_32_violet_undercut",  "32. Violet Undercut"),
        ]
    }
]

def cut_head_flawless(crop):
    h, w, _ = crop.shape

    # 1. Background color estimation from the 4 outer 1px edges
    borders = np.concatenate([crop[0, :, :], crop[-1, :, :], crop[:, 0, :], crop[:, -1, :]])
    bg_col = np.median(borders, axis=0)
    dist = np.linalg.norm(crop - bg_col, axis=2)

    # 2. Outer background flood fill strictly from borders
    is_bg = (dist < 8.0).astype(np.uint8)
    mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
    for x in range(w):
        if is_bg[0, x] == 1: cv2.floodFill(is_bg, mask, (x, 0), 2)
        if is_bg[h - 1, x] == 1: cv2.floodFill(is_bg, mask, (x, h - 1), 2)
    for y in range(h):
        if is_bg[y, 0] == 1: cv2.floodFill(is_bg, mask, (0, y), 2)
        if is_bg[y, w - 1] == 1: cv2.floodFill(is_bg, mask, (w - 1, y), 2)

    outer_bg = (is_bg == 2)
    
    # 3. Head foreground is everything NOT reached by the outer flood fill
    head_fg = ~outer_bg
    head_solid = ndi.binary_fill_holes(head_fg)

    # Keep strictly the largest connected component (the head itself, drops stray text letters)
    lbl, n = ndi.label(head_solid)
    if n > 1:
        sizes = [np.count_nonzero(lbl == i) for i in range(1, n + 1)]
        big_idx = np.argmax(sizes) + 1
        head_solid = (lbl == big_idx)

    # 4. Anti-aliasing alpha matting around the outer edge
    alpha = np.zeros((h, w), dtype=np.float32)
    alpha[head_solid] = np.clip((dist[head_solid] - 2.0) / 10.0, 0.0, 1.0)
    alpha[head_solid & (dist >= 12.0)] = 1.0
    alpha = alpha * alpha * (3.0 - 2.0 * alpha)

    # 5. Background color decontamination
    edge_mask = (alpha > 0.01) & (alpha < 0.99)
    for ch in range(3):
        ch_data = crop[:, :, ch]
        corrected = (ch_data - (1.0 - alpha) * bg_col[ch]) / np.maximum(alpha, 0.05)
        ch_data[edge_mask] = np.clip(corrected[edge_mask], 0, 255)
        crop[:, :, ch] = ch_data

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.clip(crop, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)

    out_im = Image.fromarray(rgba, mode='RGBA')
    bbox = out_im.getchannel('A').point(lambda v: 255 if v > 15 else 0).getbbox()
    if bbox:
        out_im = out_im.crop(bbox)

    return out_im

def process_sheet(sheet_info):
    file_path = os.path.join(HAIR_DIR, sheet_info['file'])
    img = Image.open(file_path).convert('RGB')
    arr = np.array(img, dtype=np.float32)
    h_total, w_total, _ = arr.shape

    corners = np.concatenate([arr[0:10, 0:10], arr[0:10, -10:], arr[-10:, 0:10], arr[-10:, -10:]], axis=0)
    bg = np.median(corners.reshape(-1, 3), axis=0)
    dist = np.linalg.norm(arr - bg, axis=2)

    # Row 1 mask (exclude captions at bottom of row 1, caption ~ y=670)
    m1 = (dist > 12)
    m1[665:, :] = False
    lbl1, n1 = ndi.label(m1)
    objs1 = [o for o in ndi.find_objects(lbl1) if (o[0].stop - o[0].start) > 200 and (o[1].stop - o[1].start) > 200]
    objs1 = sorted(objs1, key=lambda o: o[1].start)

    # Row 2 mask (exclude captions below 1470 and row 1 above 730)
    m2 = (dist > 12)
    m2[:730, :] = False
    m2[1470:, :] = False
    lbl2, n2 = ndi.label(m2)
    objs2 = [o for o in ndi.find_objects(lbl2) if (o[0].stop - o[0].start) > 200 and (o[1].stop - o[1].start) > 200]
    objs2 = sorted(objs2, key=lambda o: o[1].start)

    all_objs = objs1 + objs2
    assert len(all_objs) == 8, f"Expected 8 heads in {sheet_info['file']}, got {len(all_objs)}"

    pad = 15
    results = []
    for idx, (head_id, title) in enumerate(sheet_info['heads']):
        o = all_objs[idx]
        is_row1 = (idx < 4)
        y_min = 20 if is_row1 else 730
        y_max = 665 if is_row1 else 1470

        y1 = max(y_min, o[0].start - pad)
        y2 = min(y_max, o[0].stop + pad)
        x1 = max(0, o[1].start - pad)
        x2 = min(w_total, o[1].stop + pad)

        crop = arr[y1:y2, x1:x2].copy()
        head_orig = cut_head_flawless(crop)
        head_flip = head_orig.transpose(Image.FLIP_LEFT_RIGHT)

        # Save flipped & original
        head_flip.save(os.path.join(PARTS_DIR, f"{head_id}.png"))
        head_orig.save(os.path.join(PARTS_DIR, f"{head_id}_orig.png"))

        results.append((head_id, title, head_flip, head_orig))
        print(f"  [{head_id}] {title} -> {head_flip.size}")

    return results

all_sheet_results = []
for s in SHEETS:
    print(f"Processing {s['sheet_name']} ({s['file']})...")
    res = process_sheet(s)
    all_sheet_results.append((s['sheet_name'], res))

# Now create a giant unified 32-hairstyle visual catalog sheet!
# 4 rows of 8 columns, or 8 rows of 4 columns
# Let's do 4 sections of 8 heads (each section is 2 rows x 4 columns)
card_w, card_h = 240, 240
sheet_w = card_w * 8
sheet_h = card_h * 4 + 180
catalog_im = Image.new('RGBA', (sheet_w, sheet_h), (242, 245, 250, 255))
cdraw = ImageDraw.Draw(catalog_im)

font_path = r'C:\Windows\Fonts\tahoma.ttf'
font_title = ImageFont.truetype(font_path, 28) if os.path.exists(font_path) else ImageFont.load_default()
font_sec = ImageFont.truetype(font_path, 18) if os.path.exists(font_path) else ImageFont.load_default()
font_card = ImageFont.truetype(font_path, 13) if os.path.exists(font_path) else ImageFont.load_default()
font_dim = ImageFont.truetype(font_path, 11) if os.path.exists(font_path) else ImageFont.load_default()

# Header
cdraw.rectangle([0, 0, sheet_w, 75], fill=(24, 34, 48))
cdraw.text((30, 20), "32 MODULAR CHIBI FULL HEADS CATALOG (คลังหัวและทรงผม 32 แบบ ไดคัทโปร่งใส 100%)", fill=(255, 255, 255), font=font_title)

# Plot all 32 heads: 4 rows x 8 cols
global_idx = 0
for sec_name, heads in all_sheet_results:
    for hid, title, h_flip, h_orig in heads:
        row = global_idx // 8
        col = global_idx % 8
        ox = col * card_w
        oy = 90 + row * card_h

        # Card box
        cdraw.rectangle([ox + 4, oy + 4, ox + card_w - 4, oy + card_h - 4], fill=(255, 255, 255), outline=(215, 222, 235), width=1)
        cdraw.text((ox + 10, oy + 10), title, fill=(25, 35, 50), font=font_card)
        cdraw.text((ox + 10, oy + 28), f"{h_flip.width}x{h_flip.height} px", fill=(120, 130, 145), font=font_dim)

        # Thumbnail
        hw = 125
        hh = int(h_flip.height * hw / h_flip.width)
        if hh > 175:
            hh = 175
            hw = int(h_flip.width * hh / h_flip.height)
        thumb = h_flip.resize((hw, hh), Image.Resampling.LANCZOS)
        catalog_im.alpha_composite(thumb, (ox + (card_w - hw) // 2, oy + 50))

        global_idx += 1

cat_path = os.path.join(ROOT, 'assets/player/all_32_heads_catalog.png')
catalog_im.save(cat_path)
print(f"\nSaved 32-heads catalog: {cat_path} (size: {catalog_im.size})")

artifact_copy = r'C:\Users\User\.gemini\antigravity-ide\brain\6df76e3a-9d8c-4ef2-ad74-6ee1de7cfc77\all_32_heads_catalog.png'
shutil.copyfile(cat_path, artifact_copy)
print(f"Copied catalog to {artifact_copy}")

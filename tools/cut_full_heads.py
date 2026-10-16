import os
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for cand in [
    os.path.join(ROOT, 'assets/player/hair/Gemini_Generated_Image_homwuwhomwuwhomw.jpg'),
    os.path.join(ROOT, 'assets/player/Gemini_Generated_Image_homwuwhomwuwhomw.jpg')
]:
    if os.path.exists(cand):
        img_path = cand
        break
img = Image.open(img_path).convert('RGB')
arr = np.array(img)

BOXES = [
    {"id": "fullhead_01_blonde",   "title": "1. Spiky Golden Blonde", "rect": (50, 20, 600, 650)},
    {"id": "fullhead_02_brown",    "title": "2. Chocolate Brown",    "rect": (760, 50, 550, 620)},
    {"id": "fullhead_03_pink",     "title": "3. Bubblegum Pink",     "rect": (1370, 70, 700, 600)},
    {"id": "fullhead_04_samurai",  "title": "4. Jet Black Samurai",  "rect": (2090, 20, 620, 650)},
    {"id": "fullhead_05_lavender", "title": "5. Lavender Purple",    "rect": (90, 710, 570, 710)},
    {"id": "fullhead_06_crimson",  "title": "6. Crimson Red",        "rect": (720, 710, 620, 710)},
    {"id": "fullhead_07_silver",   "title": "7. Silver Ash",         "rect": (1420, 730, 590, 690)},
    {"id": "fullhead_08_navy",     "title": "8. Navy Blue",          "rect": (2140, 730, 520, 690)},
]

os.makedirs('assets/sprites/player/parts', exist_ok=True)
os.makedirs('scratch', exist_ok=True)

def cut_full_head(crop, flip_horizontal=True):
    """Cut the entire head (hair + face + ears + chin) and remove ONLY the outer background."""
    h, w, _ = crop.shape
    rgb = crop.astype(np.float32)

    # Outer background detection
    borders = np.concatenate([crop[0:5, :, :].reshape(-1, 3),
                             crop[-5:, :, :].reshape(-1, 3),
                             crop[:, 0:5, :].reshape(-1, 3),
                             crop[:, -5:, :].reshape(-1, 3)])
    bg_col = np.median(borders, axis=0)
    bg_dist = np.linalg.norm(rgb - bg_col, axis=2)

    # Flood fill outer background from edges
    cv_bg = (bg_dist < 26).astype(np.uint8)
    mask = np.zeros((h+2, w+2), dtype=np.uint8)
    for cy, cx in [(0, 0), (0, w-1), (h-1, 0), (h-1, w-1), (0, w//2), (h-1, w//2), (h//2, 0), (h//2, w-1)]:
        if cv_bg[cy, cx]:
            cv2.floodFill(cv_bg, mask, (cx, cy), 2)
    outer_bg = (cv_bg == 2)

    # Keep only foreground (NOT outer_bg)
    fg = ~outer_bg

    # Clean any tiny stray noise outside the head
    import scipy.ndimage as ndi
    lbl, n = ndi.label(fg)
    if n > 0:
        sizes = [np.count_nonzero(lbl == i) for i in range(1, n+1)]
        max_sz = max(sizes)
        fg_cleaned = np.zeros_like(fg)
        for i, sz in enumerate(sizes, 1):
            if sz > max_sz * 0.05:
                fg_cleaned |= (lbl == i)
        fg = fg_cleaned

    # Fill small enclosed holes inside the head if any (to make sure skin & hair are 100% solid)
    fg = ndi.binary_fill_holes(fg)

    # Soft alpha feathering
    alpha = np.zeros((h, w), dtype=np.uint8)
    alpha[fg] = 255
    alpha_pil = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.7))

    rgba = np.dstack([crop, np.array(alpha_pil)])
    out_im = Image.fromarray(rgba, mode='RGBA')

    bbox = out_im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    if bbox:
        out_im = out_im.crop(bbox)

    if flip_horizontal:
        out_im = out_im.transpose(Image.FLIP_LEFT_RIGHT)

    return out_im

# Cut and save all 8 full heads
heads = []
for b in BOXES:
    x, y, w, h = b['rect']
    crop = arr[y:y+h, x:x+w].copy()
    head_im = cut_full_head(crop, flip_horizontal=True)
    save_path = f"assets/sprites/player/parts/{b['id']}.png"
    head_im.save(save_path)
    heads.append((b['id'], b['title'], head_im))
    print(f"Saved full head: {save_path} (size: {head_im.size})")

# Also save unflipped versions just in case user wants original facing direction
for b in BOXES:
    x, y, w, h = b['rect']
    crop = arr[y:y+h, x:x+w].copy()
    orig_head = cut_full_head(crop, flip_horizontal=False)
    orig_head.save(f"assets/sprites/player/parts/{b['id']}_orig.png")

# Now build a full showcase sheet
# Row 1: Full Head with transparent background (checkerboard/clean card)
# Row 2: Full Head mounted on body_nohead + outfit_knight
body_nohead = Image.open('assets/sprites/player/parts/body_nohead.png').convert('RGBA')
outfit = Image.open('assets/sprites/player/parts/outfit_knight.png').convert('RGBA')

card_w, card_h = 240, 420
sheet_w = card_w * 4
sheet_h = card_h * 2 + 70
sheet = Image.new('RGBA', (sheet_w, sheet_h), (245, 246, 250, 255))
sdraw = ImageDraw.Draw(sheet)

font_path = r'C:\Windows\Fonts\tahoma.ttf'
font_title = ImageFont.truetype(font_path, 20) if os.path.exists(font_path) else ImageFont.load_default()
font_sub = ImageFont.truetype(font_path, 12) if os.path.exists(font_path) else ImageFont.load_default()

sdraw.rectangle([0, 0, sheet_w, 55], fill=(35, 45, 60))
sdraw.text((20, 15), "FULL HEAD ASSETS - ทั้งหัวตัดพื้นหลังออก (Hair + Face + Chin)", fill=(255, 255, 255), font=font_title)

for idx, (hid, title, h_orig) in enumerate(heads):
    row = idx // 4
    col = idx % 4
    ox = col * card_w
    oy = 65 + row * card_h

    # Card background
    sdraw.rectangle([ox + 5, oy + 5, ox + card_w - 5, oy + card_h - 5], fill=(255, 255, 255), outline=(220, 225, 235), width=1)
    sdraw.text((ox + 12, oy + 12), title, fill=(30, 40, 55), font=font_sub)

    # 1. Full head alone
    hw = 115
    hh = int(h_orig.height * hw / h_orig.width)
    h_thumb = h_orig.resize((hw, hh), Image.Resampling.LANCZOS)
    sdraw.text((ox + 12, oy + 32), "[1. ทั้งหัว โปร่งใส (Full Head)]", fill=(120, 125, 140), font=font_sub)
    sheet.alpha_composite(h_thumb, (ox + (card_w - hw)//2, oy + 50))

    # 2. Mounted on game body + outfit
    sdraw.text((ox + 12, oy + 185), "[2. สวมบนตัวละครจริง + ชุดเกราะ]", fill=(120, 125, 140), font=font_sub)
    
    char_canvas = Image.new('RGBA', (180, 320), (0, 0, 0, 0))
    # Body nohead
    char_canvas.alpha_composite(body_nohead, (22, 142))
    # Outfit
    char_canvas.alpha_composite(outfit, (30, 142))
    
    # Scale head to fit body (base head is ~135 wide, chin at y=134)
    target_hw = 145
    target_hh = int(h_orig.height * target_hw / h_orig.width)
    h_scaled = h_orig.resize((target_hw, target_hh), Image.Resampling.LANCZOS)
    
    # Head position: place head so chin connects to neck (neck is around y=142)
    # The chin is near the bottom of the crop (around 80-90% height)
    head_y = 142 - int(target_hh * 0.88)
    char_canvas.alpha_composite(h_scaled, (18, max(0, head_y)))

    scaled_char = char_canvas.resize((int(180 * 0.65), int(320 * 0.65)), Image.Resampling.LANCZOS)
    sheet.alpha_composite(scaled_char, (ox + (card_w - scaled_char.width)//2, oy + 205))

preview_path = 'assets/player/full_heads_preview.png'
sheet.save(preview_path)
print(f"Saved full heads preview: {preview_path} (size: {sheet.size})")

import shutil
artifact_copy = r'C:\Users\User\.gemini\antigravity-ide\brain\6df76e3a-9d8c-4ef2-ad74-6ee1de7cfc77\full_heads_preview.png'
shutil.copyfile(preview_path, artifact_copy)
print(f"Copied to {artifact_copy}")

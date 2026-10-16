import os
import cv2
import shutil
import numpy as np
import scipy.ndimage as ndi
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for cand in [
    os.path.join(ROOT, 'assets/player/hair/Gemini_Generated_Image_homwuwhomwuwhomw.jpg'),
    os.path.join(ROOT, 'assets/player/Gemini_Generated_Image_homwuwhomwuwhomw.jpg')
]:
    if os.path.exists(cand):
        img_path = cand
        break

img = Image.open(img_path).convert('RGB')
arr = np.array(img, dtype=np.float32)

# Precise coordinates with 15px clean background buffer on all 4 sides:
HEADS_INFO = [
    {"id": "fullhead_01_blonde",   "title": "1. Spiky Golden Blonde", "box": (35, 621, 42, 664)},
    {"id": "fullhead_02_brown",    "title": "2. Chocolate Brown",    "box": (94, 622, 751, 1315)},
    {"id": "fullhead_03_pink",     "title": "3. Bubblegum Pink",     "box": (106, 632, 1367, 2074)},
    {"id": "fullhead_04_samurai",  "title": "4. Jet Black Samurai",  "box": (29, 663, 2092, 2721)},
    {"id": "fullhead_05_lavender", "title": "5. Lavender Purple",    "box": (800, 1470, 83, 667)},
    {"id": "fullhead_06_crimson",  "title": "6. Crimson Red",        "box": (781, 1412, 713, 1346)},
    {"id": "fullhead_07_silver",   "title": "7. Silver Ash",         "box": (823, 1407, 1408, 2025)},
    {"id": "fullhead_08_navy",     "title": "8. Navy Blue",          "box": (830, 1462, 2142, 2661)},
]

os.makedirs('assets/sprites/player/parts', exist_ok=True)

def cut_head_flawless(y1, y2, x1, x2):
    crop = arr[y1:y2, x1:x2].copy()
    h, w, _ = crop.shape

    # 1. Background color estimation from the 4 outer 1px edges
    borders = np.concatenate([crop[0, :, :], crop[-1, :, :], crop[:, 0, :], crop[:, -1, :]])
    bg_col = np.median(borders, axis=0)
    dist = np.linalg.norm(crop - bg_col, axis=2)

    # 2. Outer background flood fill starting strictly from borders
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
    # Fill any internal holes (preserves all highlights 100%)
    head_solid = ndi.binary_fill_holes(head_fg)

    # 4. Anti-aliasing alpha matting around the outer edge
    # Distance from background determines alpha ramp on outer boundary
    alpha = np.zeros((h, w), dtype=np.float32)
    # Inside solid head:
    alpha[head_solid] = np.clip((dist[head_solid] - 2.0) / 10.0, 0.0, 1.0)
    # Core head pixels (dist > 12) are 100% opaque
    alpha[head_solid & (dist >= 12.0)] = 1.0
    
    # Smooth step
    alpha = alpha * alpha * (3.0 - 2.0 * alpha)

    # 5. Background color decontamination for edge pixels (removes grey halos)
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

processed = []
for h_info in HEADS_INFO:
    y1, y2, x1, x2 = h_info['box']
    head_orig = cut_head_flawless(y1, y2, x1, x2)
    head_flipped = head_orig.transpose(Image.FLIP_LEFT_RIGHT)

    # Save flipped (game standard)
    save_flip = f"assets/sprites/player/parts/{h_info['id']}.png"
    head_flipped.save(save_flip)

    # Save original facing
    save_orig = f"assets/sprites/player/parts/{h_info['id']}_orig.png"
    head_orig.save(save_orig)

    processed.append((h_info['id'], h_info['title'], head_flipped, head_orig))
    print(f"Processed {h_info['id']}: final size {head_flipped.size}")

# Now build high-res inspection sheet
card_w, card_h = 240, 430
sheet_w = card_w * 4
sheet_h = card_h * 2 + 70
sheet = Image.new('RGBA', (sheet_w, sheet_h), (242, 244, 248, 255))
sdraw = ImageDraw.Draw(sheet)

font_path = r'C:\Windows\Fonts\tahoma.ttf'
font_title = ImageFont.truetype(font_path, 20) if os.path.exists(font_path) else ImageFont.load_default()
font_sub = ImageFont.truetype(font_path, 12) if os.path.exists(font_path) else ImageFont.load_default()

sdraw.rectangle([0, 0, sheet_w, 55], fill=(28, 38, 54))
sdraw.text((20, 15), "FULL HEAD ASSETS (ตรวจสอบความสมบูรณ์ 100% - ไม่มีเส้นผมขาดหาย)", fill=(255, 255, 255), font=font_title)

body_nohead = Image.open('assets/sprites/player/parts/body_nohead.png').convert('RGBA')
outfit = Image.open('assets/sprites/player/parts/outfit_knight.png').convert('RGBA')

for idx, (hid, title, h_flip, h_orig) in enumerate(processed):
    row = idx // 4
    col = idx % 4
    ox = col * card_w
    oy = 65 + row * card_h

    # Card background
    sdraw.rectangle([ox + 5, oy + 5, ox + card_w - 5, oy + card_h - 5], fill=(255, 255, 255), outline=(215, 222, 235), width=1)
    sdraw.text((ox + 12, oy + 12), title, fill=(25, 35, 50), font=font_sub)

    # 1. Full head alone
    hw = 120
    hh = int(h_flip.height * hw / h_flip.width)
    h_thumb = h_flip.resize((hw, hh), Image.Resampling.LANCZOS)
    sdraw.text((ox + 12, oy + 32), f"[ขนาดเต็ม {h_flip.width}x{h_flip.height} px]", fill=(115, 125, 140), font=font_sub)
    sheet.alpha_composite(h_thumb, (ox + (card_w - hw)//2, oy + 50))

    # 2. Mounted on character
    sdraw.text((ox + 12, oy + 185), "[สวมบนตัวละครจริง + ชุดเกราะ]", fill=(115, 125, 140), font=font_sub)
    char_canvas = Image.new('RGBA', (180, 320), (0, 0, 0, 0))
    char_canvas.alpha_composite(body_nohead, (22, 142))
    char_canvas.alpha_composite(outfit, (30, 142))
    
    target_hw = 145
    target_hh = int(h_flip.height * target_hw / h_flip.width)
    h_scaled = h_flip.resize((target_hw, target_hh), Image.Resampling.LANCZOS)
    head_y = 142 - int(target_hh * 0.88)
    char_canvas.alpha_composite(h_scaled, (18, max(0, head_y)))

    scaled_char = char_canvas.resize((int(180 * 0.65), int(320 * 0.65)), Image.Resampling.LANCZOS)
    sheet.alpha_composite(scaled_char, (ox + (card_w - scaled_char.width)//2, oy + 205))

preview_path = 'assets/player/full_heads_perfect_preview.png'
sheet.save(preview_path)
print(f"Saved flawless preview: {preview_path}")

artifact_copy = r'C:\Users\User\.gemini\antigravity-ide\brain\6df76e3a-9d8c-4ef2-ad74-6ee1de7cfc77\full_heads_perfect_preview.png'
shutil.copyfile(preview_path, artifact_copy)
print(f"Copied to {artifact_copy}")

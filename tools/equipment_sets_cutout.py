from PIL import Image
import numpy as np
import os

img = Image.open('assets/player/equipment_sets_knight_mage.jpg').convert('RGB')
arr = np.array(img, dtype=np.float32)

bg = np.array([218.0, 218.0, 217.5], dtype=np.float32)
dist = np.linalg.norm(arr - bg, axis=2)

out_dir = 'assets/sprites/equipment'
os.makedirs(out_dir, exist_ok=True)

# 2 rows (y ranges excluding labels)
# Row 0: Knight Set y: 60..425
# Row 1: Mage Set y: 590..865
rows_y = [
    (60, 425),
    (590, 865)
]

cols_x = [
    (15, 240),
    (245, 415),
    (420, 610),
    (625, 820),
    (825, 1010)
]

item_names = [
    ['helm_knight', 'armor_knight', 'wings_angel', 'shield_lion', 'pet_griffon'],
    ['hat_wizard', 'robe_sorcerer', 'wings_fairy', 'ward_spellbook', 'pet_star_owl']
]

TARGET_SIZE = 180

for r in range(2):
    y_min, y_max = rows_y[r]
    for c in range(5):
        x_min, x_max = cols_x[c]
        name = item_names[r][c]
        
        sub_dist = dist[y_min:y_max, x_min:x_max]
        mask = sub_dist > 20.0
        if not np.any(mask):
            print(f"Warning: No pixels for {name}")
            continue
            
        ys, xs = np.where(mask)
        ymin_t = y_min + ys.min()
        ymax_t = y_min + ys.max() + 1
        xmin_t = x_min + xs.min()
        xmax_t = x_min + xs.max() + 1
        
        pad = 4
        ymin_c = max(0, ymin_t - pad)
        ymax_c = min(1024, ymax_t + pad)
        xmin_c = max(0, xmin_t - pad)
        xmax_c = min(1024, xmax_t + pad)
        
        crop_arr = arr[ymin_c:ymax_c, xmin_c:xmax_c].copy()
        crop_dist = dist[ymin_c:ymax_c, xmin_c:xmax_c]
        
        d_low = 12.0
        d_high = 24.0
        alpha = np.clip((crop_dist - d_low) / (d_high - d_low), 0.0, 1.0)
        alpha = alpha * alpha * (3.0 - 2.0 * alpha)
        
        # Fringe correction
        mask_mid = (alpha > 0.02) & (alpha < 0.98)
        for ch in range(3):
            ch_data = crop_arr[:, :, ch]
            ch_bg = bg[ch]
            corrected = (ch_data - (1.0 - alpha) * ch_bg) / np.maximum(alpha, 0.05)
            ch_data[mask_mid] = np.clip(corrected[mask_mid], 0, 255)
            crop_arr[:, :, ch] = ch_data
            
        rgba = np.zeros((crop_arr.shape[0], crop_arr.shape[1], 4), dtype=np.uint8)
        rgba[:, :, :3] = np.clip(crop_arr, 0, 255).astype(np.uint8)
        rgba[:, :, 3] = (alpha * 255).astype(np.uint8)
        
        cropped_img = Image.fromarray(rgba, mode='RGBA')
        out_path = os.path.join(out_dir, f"{name}.png")
        cropped_img.save(out_path)
        print(f"Saved: {out_path} (size: {cropped_img.size})")

print("All equipment pieces extracted successfully!")

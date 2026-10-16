from PIL import Image
import numpy as np
import os

img = Image.open('assets/particles/particles_vfx_sheet.jpg').convert('RGB')
arr = np.array(img, dtype=np.float32)

# Background color [217, 217, 217]
bg = np.array([217.0, 217.0, 217.0], dtype=np.float32)
dist = np.linalg.norm(arr - bg, axis=2)

output_dir = 'assets/sprites/particles'
os.makedirs(output_dir, exist_ok=True)

# Grid definitions: 3 rows, 4 columns
# Y ranges excluding headers:
row_y_ranges = [
    (90, 280),   # Row 0: Gold & EXP
    (430, 620),  # Row 1: Blood & Damage Taken
    (750, 980)   # Row 2: Combat Hit & Impact
]

# Column ranges:
col_x_ranges = [
    (30, 250),
    (280, 510),
    (530, 740),
    (770, 980)
]

item_names = [
    ['sparkle_gold', 'coin_particle', 'exp_bubble', 'sparkle_exp'],
    ['blood_splat', 'blood_spray', 'blood_drop', 'blood_scratch'],
    ['hit_spark', 'hit_slash', 'crit_burst', 'hit_deflect']
]

TARGET_SIZE = 128

for r, (y_min, y_max) in enumerate(row_y_ranges):
    for c, (x_min, x_max) in enumerate(col_x_ranges):
        name = item_names[r][c]
        
        # Sub-mask in this region
        sub_dist = dist[y_min:y_max, x_min:x_max]
        mask = sub_dist > 20.0
        
        if not np.any(mask):
            print(f"Warning: No pixels found for {name}")
            continue
            
        ys, xs = np.where(mask)
        ymin_t = y_min + ys.min()
        ymax_t = y_min + ys.max() + 1
        xmin_t = x_min + xs.min()
        xmax_t = x_min + xs.max() + 1
        
        # Add 6px margin
        pad = 6
        ymin_c = max(y_min, ymin_t - pad)
        ymax_c = min(y_max, ymax_t + pad)
        xmin_c = max(x_min, xmin_t - pad)
        xmax_c = min(x_max, xmax_t + pad)
        
        # Crop region
        crop_arr = arr[ymin_c:ymax_c, xmin_c:xmax_c].copy()
        crop_dist = dist[ymin_c:ymax_c, xmin_c:xmax_c]
        
        # Alpha computation with anti-aliasing
        # 12 is transparent, 24 is opaque
        d_low = 12.0
        d_high = 24.0
        alpha = np.clip((crop_dist - d_low) / (d_high - d_low), 0.0, 1.0)
        # Smoothstep
        alpha = alpha * alpha * (3.0 - 2.0 * alpha)
        
        # Fringe color correction for semi-transparent edge pixels
        # For semi-transparent pixels, remove background contamination:
        # C_orig = alpha * C_fg + (1 - alpha) * C_bg
        # => C_fg = (C_orig - (1 - alpha) * C_bg) / alpha
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
        
        # Fit into TARGET_SIZE x TARGET_SIZE while maintaining aspect ratio
        cw, ch_size = cropped_img.size
        scale = min((TARGET_SIZE - 8) / cw, (TARGET_SIZE - 8) / ch_size)
        nw = max(1, int(round(cw * scale)))
        nh = max(1, int(round(ch_size * scale)))
        resized = cropped_img.resize((nw, nh), Image.Resampling.LANCZOS)
        
        final_img = Image.new('RGBA', (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
        offset_x = (TARGET_SIZE - nw) // 2
        offset_y = (TARGET_SIZE - nh) // 2
        final_img.paste(resized, (offset_x, offset_y), resized)
        
        out_path = os.path.join(output_dir, f"{name}.png")
        final_img.save(out_path)
        print(f"Saved: {out_path} ({TARGET_SIZE}x{TARGET_SIZE}, tight box: {xmax_t-xmin_t}x{ymax_t-ymin_t})")

print("All particle sprites extracted successfully!")

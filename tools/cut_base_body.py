from PIL import Image
import numpy as np
import os

img = Image.open('assets/player/player_parts_sheet.jpg').convert('RGB')
arr = np.array(img, dtype=np.float32)
bg = arr[10:30, 10:30].mean(axis=(0, 1))
dist = np.linalg.norm(arr - bg, axis=2)

x1, y1, x2, y2 = 92, 79, 227, 380
crop_arr = arr[y1:y2, x1:x2].copy()
crop_dist = dist[y1:y2, x1:x2]

alpha = np.clip((crop_dist - 12.0) / 12.0, 0.0, 1.0)
alpha = alpha * alpha * (3.0 - 2.0 * alpha)

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

body_img = Image.fromarray(rgba, mode='RGBA')
os.makedirs('assets/sprites/player', exist_ok=True)
body_img.save('assets/sprites/player/base_body.png')
print(f"Saved assets/sprites/player/base_body.png (size: {body_img.size})")

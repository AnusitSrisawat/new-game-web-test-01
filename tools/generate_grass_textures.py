"""
Comprehensive Grass Texture Suite for Cozy MMORPG (ECO / Ragnarok Style)
Generates:
1. assets/grass_meadow_texture.png (512x512 Seamless Stylized Meadow with Tufts & Wildflowers)
2. assets/grass_lush_painterly.png (512x512 Rich Painterly Anime Grass Texture)
3. assets/grass_pixel_retro_64.png (64x64 Classic 16-bit RPG Pixel Art Grass Tile)
4. assets/grass_texture_showcase.png (Combined preview displaying all variants side-by-side)
"""

import math
import random
from PIL import Image, ImageDraw, ImageFilter

def wrap_coords(x, y, w, h):
    return [(x + ox, y + oy) for ox in (-w, 0, w) for oy in (-h, 0, h)]

# -------------------------------------------------------------
# 1. Stylized Meadow Texture (Anime Cozy Style)
# -------------------------------------------------------------
def generate_stylized_meadow(size=512, seed=777):
    random.seed(seed)
    layers = [(random.randint(1, 4), random.randint(1, 4), random.uniform(0, math.tau), random.uniform(0, math.tau)) for _ in range(6)]
    base = Image.new("RGBA", (size, size))
    pix = base.load()
    
    for y in range(size):
        ny = (y / size) * math.tau
        for x in range(size):
            nx = (x / size) * math.tau
            val = sum(math.sin(nx * kx + px) * math.cos(ny * ky + py) for kx, ky, px, py in layers)
            norm = (val / len(layers) + 1.0) * 0.5
            norm = norm * norm * (3 - 2 * norm)
            
            if norm < 0.5:
                t = norm / 0.5
                r, g, b = int(95 + 32 * t), int(155 + 42 * t), int(85 + 28 * t)
            else:
                t = (norm - 0.5) / 0.5
                r, g, b = int(127 + 34 * t), int(197 + 28 * t), int(113 + 26 * t)
            pix[x, y] = (r, g, b, 255)
            
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    detail = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d_draw = ImageDraw.Draw(detail)
    
    # Grass tufts
    for _ in range(int(size * size / 1600)):
        cx, cy = random.uniform(0, size), random.uniform(0, size)
        scale = random.uniform(0.8, 1.3)
        for bx, by in wrap_coords(cx, cy, size, size):
            if -30 < bx < size + 30 and -30 < by < size + 30:
                s_draw.ellipse([bx - 9*scale, by - 3*scale, bx + 9*scale, by + 3*scale], fill=(35, 70, 32, 65))
                for ang, l, col in [(-22, 15*scale, (105, 172, 95)), (0, 21*scale, (150, 222, 135)), (22, 16*scale, (125, 195, 110)), (-8, 12*scale, (170, 235, 150)), (10, 11*scale, (170, 235, 150))]:
                    rad = math.radians(ang)
                    tx, ty = bx + l * math.sin(rad), by - l * math.cos(rad)
                    d_draw.line([bx, by, tx, ty], fill=(*col, 255), width=int(2.5 * scale))
                    d_draw.point([tx, ty], fill=(225, 252, 195, 240))
                    
    # Clovers
    for _ in range(int(size * size / 3000)):
        cx, cy = random.uniform(0, size), random.uniform(0, size)
        for bx, by in wrap_coords(cx, cy, size, size):
            if -20 < bx < size + 20 and -20 < by < size + 20:
                s_draw.ellipse([bx - 6, by - 4, bx + 6, by + 4], fill=(30, 60, 25, 75))
                for ang in [0, 120, 240]:
                    rad = math.radians(ang)
                    lx, ly = bx + 5 * math.cos(rad), by + 5 * math.sin(rad)
                    d_draw.ellipse([lx - 4, ly - 4, lx + 4, ly + 4], fill=(115, 190, 100, 240))
                    d_draw.ellipse([lx - 2, ly - 2, lx + 2, ly + 2], fill=(175, 232, 155, 220))
                    
    # Wildflowers
    for _ in range(int(size * size / 4000)):
        cx, cy = random.uniform(0, size), random.uniform(0, size)
        f_type = random.choice(['daisy', 'yellow', 'violet'])
        for bx, by in wrap_coords(cx, cy, size, size):
            if -20 < bx < size + 20 and -20 < by < size + 20:
                s_draw.ellipse([bx - 5, by - 2, bx + 5, by + 3], fill=(25, 50, 22, 85))
                if f_type == 'daisy':
                    for ang in range(0, 360, 60):
                        rad = math.radians(ang)
                        px, py = bx + 4.0 * math.cos(rad), by + 4.0 * math.sin(rad)
                        d_draw.ellipse([px - 2.5, py - 2.5, px + 2.5, py + 2.5], fill=(255, 255, 255, 245))
                    d_draw.ellipse([bx - 2, by - 2, bx + 2, by + 2], fill=(250, 204, 21, 255))
                elif f_type == 'yellow':
                    d_draw.ellipse([bx - 3.5, by - 3.5, bx + 3.5, by + 3.5], fill=(251, 191, 36, 245))
                    d_draw.ellipse([bx - 1.5, by - 1.5, bx + 1.5, by + 1.5], fill=(245, 158, 11, 255))
                else:
                    d_draw.ellipse([bx - 3, by - 3, bx + 3, by + 3], fill=(167, 139, 250, 245))
                    d_draw.ellipse([bx - 1, by - 1, bx + 1, by + 1], fill=(245, 243, 255, 255))

    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=1.5))
    final = Image.alpha_composite(base, shadow)
    final = Image.alpha_composite(final, detail)
    return final

# -------------------------------------------------------------
# 2. Rich Painterly Anime Grass (Dense & Lush)
# -------------------------------------------------------------
def generate_lush_painterly_grass(size=512, seed=888):
    random.seed(seed)
    img = Image.new("RGBA", (size, size), (85, 150, 75, 255))
    draw = ImageDraw.Draw(img)
    
    # Base brush strokes in multi directions
    blade_colors = [
        (65, 128, 55, 220),
        (88, 160, 75, 220),
        (110, 185, 95, 220),
        (135, 208, 115, 220),
        (165, 228, 140, 220),
        (190, 242, 165, 180),
    ]
    
    # Dense short brush strokes wrapping around edges
    num_strokes = 4500
    for _ in range(num_strokes):
        cx = random.uniform(0, size)
        cy = random.uniform(0, size)
        length = random.uniform(6, 16)
        angle = random.uniform(-40, 40)
        col = random.choice(blade_colors)
        rad = math.radians(angle)
        
        for bx, by in wrap_coords(cx, cy, size, size):
            if -25 < bx < size + 25 and -25 < by < size + 25:
                tx = bx + length * math.sin(rad)
                ty = by - length * math.cos(rad)
                draw.line([bx, by, tx, ty], fill=col, width=random.choice([1, 2, 2, 3]))
                
    # Soft overall filter to look painted
    img = img.filter(ImageFilter.SMOOTH_MORE)
    return img

# -------------------------------------------------------------
# 3. Classic 16-bit RPG Pixel Art Grass Tile (64x64)
# -------------------------------------------------------------
def generate_pixel_art_grass(size=64, seed=999):
    random.seed(seed)
    tile = Image.new("RGBA", (size, size))
    pix = tile.load()
    
    # 16-bit RPG Palette (like Chrono Trigger / Secret of Mana / Classic RO)
    c_dark   = (76, 138, 70, 255)
    c_mid    = (108, 178, 92, 255)
    c_light  = (148, 212, 122, 255)
    c_bright = (188, 238, 154, 255)
    
    # Base fill with subtle dithering
    for y in range(size):
        for x in range(size):
            noise = (math.sin(x * 0.4) + math.cos(y * 0.4) + random.uniform(-0.5, 0.5))
            if noise > 0.4:
                pix[x, y] = c_light
            elif noise < -0.4:
                pix[x, y] = c_dark
            else:
                pix[x, y] = c_mid
                
    draw = ImageDraw.Draw(tile)
    # Add pixel-art grass tufts
    tuft_positions = [(12, 16), (44, 18), (28, 38), (52, 50), (8, 54), (36, 8)]
    for tx, ty in tuft_positions:
        # Blade 1
        draw.line([tx, ty, tx - 1, ty - 3], fill=c_bright, width=1)
        draw.point([tx, ty + 1], fill=c_dark)
        # Blade 2
        draw.line([tx + 2, ty, tx + 2, ty - 4], fill=c_bright, width=1)
        draw.point([tx + 2, ty + 1], fill=c_dark)
        # Blade 3
        draw.line([tx + 4, ty, tx + 5, ty - 3], fill=c_bright, width=1)
        draw.point([tx + 4, ty + 1], fill=c_dark)
        
    # Tiny pixel flower
    draw.point([20, 24], fill=(255, 255, 255, 255))
    draw.point([21, 24], fill=(250, 204, 21, 255))
    draw.point([48, 42], fill=(251, 191, 36, 255))
    
    return tile

def main():
    print("Generating Cozy RPG Grass Textures...")
    # 1. Stylized Meadow
    meadow = generate_stylized_meadow(512, seed=777)
    meadow.save("assets/grass_meadow_texture.png", "PNG")
    meadow.resize((256, 256), Image.Resampling.LANCZOS).save("assets/grass_meadow_texture_256.png", "PNG")
    
    # 2. Lush Painterly
    painterly = generate_lush_painterly_grass(512, seed=888)
    painterly.save("assets/grass_lush_painterly.png", "PNG")
    
    # 3. Pixel Art 64x64 & 128x128
    pixel = generate_pixel_art_grass(64, seed=999)
    pixel.save("assets/grass_pixel_retro_64.png", "PNG")
    pixel_big = pixel.resize((256, 256), Image.Resampling.NEAREST)
    pixel_big.save("assets/grass_pixel_retro_256.png", "PNG")
    
    # 4. Showcase Comparison Image
    showcase = Image.new("RGBA", (1024, 512), (24, 24, 27, 255))
    showcase.paste(meadow, (0, 0))
    showcase.paste(painterly, (512, 0))
    showcase.save("assets/grass_texture_showcase.png", "PNG")
    
    print("All grass textures successfully generated in assets/")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Cut weapon pictures out of assets/weapons/ into upright transparent PNGs
in assets/sprites/weapons/<name>.png and write src/weapon_sprites.js.

Supports both standard 1024x1024 sheets, 1254x1254 new charts, and HD 2752x1536 sheets.

Usage (repo root):  python3 tools/weapons_cutout.py
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import label

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import ROOT

BG_TOL = 40

# (image_path, (x, y, w, h), scale, rotate_upright)
WEAPONS = {
    # === SWORDS (ดาบ 1024x1024) ===
    'wooden_sword':        ('assets/weapons/sword/weapons_tier1.jpg', (90, 30, 230, 185), 0.5, True),
    'iron_broadsword':     ('assets/weapons/sword/weapons_tier1.jpg', (420, 30, 250, 185), 0.5, True),
    'steel_blade':         ('assets/weapons/sword/weapons_tier1.jpg', (720, 30, 260, 185), 0.5, True),
    'wolf_fang_saber':     ('assets/weapons/sword/weapons_tier1.jpg', (100, 270, 260, 170), 0.5, True),
    'bandit_cutlass':      ('assets/weapons/sword/weapons_tier1.jpg', (420, 270, 230, 170), 0.5, True),
    'knight_longsword':    ('assets/weapons/sword/weapons_tier1.jpg', (90, 510, 240, 185), 0.5, True),
    'bone_cleaver':        ('assets/weapons/sword/weapons_tier1.jpg', (400, 505, 250, 190), 0.5, True),
    'rune_claymore':       ('assets/weapons/sword/weapons_tier1.jpg', (700, 550, 300, 390), 0.5, True),
    'shadow_dagger':       ('assets/weapons/sword/weapons_tier1.jpg', (100, 745, 230, 185), 0.5, True),
    'crimson_falchion':    ('assets/weapons/sword/weapons_tier1.jpg', (400, 745, 250, 185), 0.5, True),
    'glacial_frostbrand':  ('assets/weapons/sword/weapons_tier2.jpg', (90, 30, 250, 190), 0.5, True),
    'titan_earthbreaker':  ('assets/weapons/sword/weapons_tier2.jpg', (740, 30, 270, 190), 0.5, True),
    'holy_excalibur':      ('assets/weapons/sword/weapons_tier2.jpg', (740, 270, 270, 190), 0.5, True),
    'dragon_scale_blade':  ('assets/weapons/sword/weapons_tier2.jpg', (90, 510, 260, 190), 0.5, True),
    'astral_cosmic_saber': ('assets/weapons/sword/weapons_tier2.jpg', (420, 510, 250, 190), 0.5, True),
    'genesis_godslayer':   ('assets/weapons/sword/weapons_tier2.jpg', (730, 750, 280, 190), 0.5, True),

    # === STAVES TIER 1 (คฑา Lv 1-50: assets/weapons/staff/weapons_tier1.jpg) ===
    'wooden_wand':              ('assets/weapons/staff/weapons_tier1.jpg', (90, 30, 230, 185), 0.5, True),
    'oak_apprentice_rod':       ('assets/weapons/staff/weapons_tier1.jpg', (410, 30, 230, 185), 0.5, True),
    'crystal_gem_wand':         ('assets/weapons/staff/weapons_tier1.jpg', (730, 30, 230, 185), 0.5, True),
    'nature_sprout_staff':      ('assets/weapons/staff/weapons_tier1.jpg', (80, 260, 250, 185), 0.5, True),
    'dark_bone_wand':           ('assets/weapons/staff/weapons_tier1.jpg', (410, 260, 230, 185), 0.5, True),
    'silver_cleric_scepter':    ('assets/weapons/staff/weapons_tier1.jpg', (720, 260, 240, 185), 0.5, True),
    'ruby_fire_staff':          ('assets/weapons/staff/weapons_tier1.jpg', (380, 500, 250, 180), 0.5, True),
    'shadow_sorcery_staff':     ('assets/weapons/staff/weapons_tier1.jpg', (80, 740, 250, 180), 0.5, True),
    'thunder_archmage_staff':   ('assets/weapons/staff/weapons_tier1.jpg', (400, 740, 250, 180), 0.5, True),
    'ancient_elder_staff':      ('assets/weapons/staff/weapons_tier1.jpg', (730, 740, 240, 180), 0.5, True),

    # === STAVES TIER 2 HD (คฑา Lv 55-100: assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg 2752x1536) ===
    'glacial_frost_staff':      ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (150, 40, 450, 385), 0.25, True),
    'tempest_storm_rod':        ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (820, 40, 450, 385), 0.25, True),
    'terra_gaia_scepter':       ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (1490, 40, 460, 385), 0.25, True),
    'nether_abyss_staff':       ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (2140, 40, 470, 385), 0.25, True),
    'archangel_holy_scepter':   ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (825, 520, 460, 395), 0.25, True),
    'dragon_heart_dragonstaff': ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (1500, 525, 475, 390), 0.25, True),
    'astral_starfall_rod':      ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (2180, 535, 450, 380), 0.25, True),
    'phoenix_rebirth_scepter':  ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (80, 1000, 500, 400), 0.25, True),
    'chronos_time_staff':       ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (1430, 1000, 510, 400), 0.25, True),
    'genesis_divine_staff':     ('assets/weapons/staff/Gemini_Generated_Image_mz3zuzmz3zuzmz3z.jpg', (2110, 1000, 520, 400), 0.25, True),

    # === FIREARMS / GUNS TIER 1 (ปืน Lv 1-50: Fantasy Firearms Level Chart.png 1254x1254) ===
    'flintlock_pistol':         ('assets/weapons/gun/weapons_tier1.png', (110, 40, 260, 225), 0.45, True),
    'hunting_musket':           ('assets/weapons/gun/weapons_tier1.png', (470, 35, 290, 230), 0.45, True),
    'iron_revolver':            ('assets/weapons/gun/weapons_tier1.png', (905, 35, 250, 230), 0.45, True),
    'pirate_dual_pistols':      ('assets/weapons/gun/weapons_tier1.png', (75, 330, 320, 230), 0.45, True),
    'trench_blunderbuss':       ('assets/weapons/gun/weapons_tier1.png', (460, 330, 305, 230), 0.45, True),
    'silver_knight_rifle':      ('assets/weapons/gun/weapons_tier1.png', (865, 330, 315, 235), 0.45, True),
    'bone_carbine':             ('assets/weapons/gun/weapons_tier1.png', (700, 615, 330, 240), 0.45, True),
    'shadow_silencer_gun':      ('assets/weapons/gun/weapons_tier1.png', (85, 910, 315, 220), 0.45, True),
    'crimson_fire_blaster':     ('assets/weapons/gun/weapons_tier1.png', (470, 915, 320, 220), 0.45, True),
    'rune_steam_cannon':        ('assets/weapons/gun/weapons_tier1.png', (870, 910, 310, 220), 0.45, True),

    # === GUNS TIER 2 (ปืน Lv 55-100: assets/weapons/gun/weapons_tier2.jpg) ===
    'cryo_frost_cannon':        ('assets/weapons/gun/weapons_tier2.jpg', (80, 25, 250, 190), 0.5, True),
    'voltaic_storm_blaster':    ('assets/weapons/gun/weapons_tier2.jpg', (390, 25, 270, 190), 0.5, True),
    'titan_siege_railgun':      ('assets/weapons/gun/weapons_tier2.jpg', (690, 25, 280, 190), 0.5, True),
    'abyssal_demon_revolver':   ('assets/weapons/gun/weapons_tier2.jpg', (80, 260, 250, 185), 0.5, True),
    'judgment_holy_handgun':    ('assets/weapons/gun/weapons_tier2.jpg', (400, 260, 250, 185), 0.5, True),
    'dragonfire_hand_cannon':   ('assets/weapons/gun/weapons_tier2.jpg', (720, 260, 250, 185), 0.5, True),
    'astral_photon_laser':      ('assets/weapons/gun/weapons_tier2.jpg', (80, 500, 270, 180), 0.5, True),
    'phoenix_flame_blaster':    ('assets/weapons/gun/weapons_tier2.jpg', (390, 500, 250, 180), 0.5, True),
    'chrono_clockwork_gun':     ('assets/weapons/gun/weapons_tier2.jpg', (720, 500, 250, 180), 0.5, True),
    'genesis_celestial_cannon': ('assets/weapons/gun/weapons_tier2.jpg', (380, 740, 270, 180), 0.5, True),

    # === POLEARMS / SPEARS TIER 1 (หอก Lv 1-50: Fantasy Polearm Catalog Lineup-1.png 1254x1254) ===
    'wooden_pike':              ('assets/weapons/spear/weapons_tier1.png', (70, 25, 330, 240), 0.45, True),
    'iron_hunting_spear':       ('assets/weapons/spear/weapons_tier1.png', (465, 25, 330, 240), 0.45, True),
    'steel_halberd':            ('assets/weapons/spear/weapons_tier1.png', (890, 30, 305, 240), 0.45, True),
    'wild_boar_lance':          ('assets/weapons/spear/weapons_tier1.png', (70, 320, 340, 240), 0.45, True),
    'bandit_partisan':          ('assets/weapons/spear/weapons_tier1.png', (480, 330, 320, 235), 0.45, True),
    'silver_knight_lance':      ('assets/weapons/spear/weapons_tier1.png', (880, 325, 310, 235), 0.45, True),
    'bone_glaive':              ('assets/weapons/spear/weapons_tier1.png', (680, 615, 350, 200), 0.45, True),
    'shadow_piercer_spear':     ('assets/weapons/spear/weapons_tier1.png', (80, 910, 330, 220), 0.45, True),
    'crimson_dragonpike':       ('assets/weapons/spear/weapons_tier1.png', (435, 910, 365, 220), 0.45, True),
    'valkyrie_war_spear':       ('assets/weapons/spear/weapons_tier1.png', (825, 910, 365, 220), 0.45, True),

    # === SPEARS TIER 2 (หอก Lv 55-100: assets/weapons/spear/weapons_tier2.jpg) ===
    'frostfang_glacier_spear':  ('assets/weapons/spear/weapons_tier2.jpg', (80, 25, 250, 190), 0.5, True),
    'thunderstorm_trident':     ('assets/weapons/spear/weapons_tier2.jpg', (400, 25, 250, 190), 0.5, True),
    'titan_stone_halberd':      ('assets/weapons/spear/weapons_tier2.jpg', (720, 25, 250, 190), 0.5, True),
    'chaos_demon_lance':        ('assets/weapons/spear/weapons_tier2.jpg', (80, 260, 250, 185), 0.5, True),
    'holy_aegis_spear':         ('assets/weapons/spear/weapons_tier2.jpg', (400, 260, 250, 185), 0.5, True),
    'dragon_horn_warpike':      ('assets/weapons/spear/weapons_tier2.jpg', (720, 260, 250, 185), 0.5, True),
    'astral_void_glaive':       ('assets/weapons/spear/weapons_tier2.jpg', (80, 500, 250, 180), 0.5, True),
    'phoenix_radiant_spear':    ('assets/weapons/spear/weapons_tier2.jpg', (400, 500, 250, 180), 0.5, True),
    'chronos_pendulum_lance':   ('assets/weapons/spear/weapons_tier2.jpg', (720, 500, 250, 180), 0.5, True),
    'genesis_divine_spear':     ('assets/weapons/spear/weapons_tier2.jpg', (400, 740, 250, 180), 0.5, True),

    # === BOWS (ธนู 1024x1024) ===
    'wooden_shortbow':          ('assets/weapons/bow/weapons_tier1.jpg', (80, 25, 250, 190), 0.5, True),
    'hunting_recurve_bow':      ('assets/weapons/bow/weapons_tier1.jpg', (400, 25, 250, 190), 0.5, True),
    'iron_longbow':             ('assets/weapons/bow/weapons_tier1.jpg', (720, 25, 250, 190), 0.5, True),
    'elven_yew_bow':            ('assets/weapons/bow/weapons_tier1.jpg', (80, 260, 250, 185), 0.5, True),
    'bandit_crossbow':          ('assets/weapons/bow/weapons_tier1.jpg', (400, 260, 250, 185), 0.5, True),
    'silver_ranger_bow':        ('assets/weapons/bow/weapons_tier1.jpg', (720, 260, 250, 185), 0.5, True),
    'bone_piercer_bow':         ('assets/weapons/bow/weapons_tier1.jpg', (80, 500, 250, 180), 0.5, True),
    'nightshade_assassin_bow':  ('assets/weapons/bow/weapons_tier1.jpg', (400, 500, 250, 180), 0.5, True),
    'crimson_flame_bow':        ('assets/weapons/bow/weapons_tier1.jpg', (80, 740, 250, 180), 0.5, True),
    'gale_windforce_bow':       ('assets/weapons/bow/weapons_tier1.jpg', (720, 740, 250, 180), 0.5, True),
    'glacial_ice_bow':          ('assets/weapons/bow/weapons_tier2.jpg', (80, 25, 250, 190), 0.5, True),
    'thunder_strike_bow':       ('assets/weapons/bow/weapons_tier2.jpg', (400, 25, 250, 190), 0.5, True),
    'titan_heavy_crossbow':     ('assets/weapons/bow/weapons_tier2.jpg', (720, 25, 250, 190), 0.5, True),
    'abyssal_shadowstring':     ('assets/weapons/bow/weapons_tier2.jpg', (80, 260, 250, 185), 0.5, True),
    'seraphim_holy_bow':        ('assets/weapons/bow/weapons_tier2.jpg', (400, 260, 250, 185), 0.5, True),
    'dragon_breath_longbow':    ('assets/weapons/bow/weapons_tier2.jpg', (720, 260, 250, 185), 0.5, True),
    'astral_starlight_bow':     ('assets/weapons/bow/weapons_tier2.jpg', (80, 500, 250, 180), 0.5, True),
    'phoenix_firefeather_bow':  ('assets/weapons/bow/weapons_tier2.jpg', (400, 500, 250, 180), 0.5, True),
    'chrono_gear_crossbow':     ('assets/weapons/bow/weapons_tier2.jpg', (720, 500, 250, 180), 0.5, True),
    'genesis_celestial_bow':    ('assets/weapons/bow/weapons_tier2.jpg', (400, 740, 250, 180), 0.5, True),

    # === BOOKS (คัมภีร์เวท - คงรูปไอคอนสมุด ไม่หมุนเอียง) ===
    'apprentice_book':          ('assets/weapons/book/weapons_tier1.jpg', (80, 25, 250, 190), 0.5, False),
    'leather_grimoire':         ('assets/weapons/book/weapons_tier1.jpg', (400, 25, 250, 190), 0.5, False),
    'magic_theory_tome':        ('assets/weapons/book/weapons_tier1.jpg', (720, 25, 250, 190), 0.5, False),
    'herbalist_codex':          ('assets/weapons/book/weapons_tier1.jpg', (80, 260, 250, 185), 0.5, False),
    'dark_pact_scripture':      ('assets/weapons/book/weapons_tier1.jpg', (400, 260, 250, 185), 0.5, False),
    'holy_scripture_book':      ('assets/weapons/book/weapons_tier1.jpg', (720, 260, 250, 185), 0.5, False),
    'forbidden_necronomicon':   ('assets/weapons/book/weapons_tier1.jpg', (80, 500, 250, 180), 0.5, False),
    'shadow_whisper_tome':      ('assets/weapons/book/weapons_tier1.jpg', (400, 500, 250, 180), 0.5, False),
    'crimson_element_grimoire': ('assets/weapons/book/weapons_tier1.jpg', (80, 740, 250, 180), 0.5, False),
    'ancient_rune_archive':     ('assets/weapons/book/weapons_tier1.jpg', (400, 740, 250, 180), 0.5, False),
    'blizzard_glacial_tome':    ('assets/weapons/book/weapons_tier2.jpg', (80, 25, 250, 190), 0.5, False),
    'thunder_wrath_scripture':  ('assets/weapons/book/weapons_tier2.jpg', (400, 25, 250, 190), 0.5, False),
    'titan_earth_grimoire':     ('assets/weapons/book/weapons_tier2.jpg', (720, 25, 250, 190), 0.5, False),
    'chaos_demonic_codex':      ('assets/weapons/book/weapons_tier2.jpg', (80, 260, 250, 185), 0.5, False),
    'book_of_heavenly_light':   ('assets/weapons/book/weapons_tier2.jpg', (400, 260, 250, 185), 0.5, False),
    'dragon_secret_tome':       ('assets/weapons/book/weapons_tier2.jpg', (720, 260, 250, 185), 0.5, False),
    'astral_cosmos_scripture':  ('assets/weapons/book/weapons_tier2.jpg', (80, 500, 250, 180), 0.5, False),
    'book_of_immortal_phoenix': ('assets/weapons/book/weapons_tier2.jpg', (400, 500, 250, 180), 0.5, False),
    'chronos_time_archive':     ('assets/weapons/book/weapons_tier2.jpg', (720, 500, 250, 180), 0.5, False),
    'genesis_divine_grimoire':  ('assets/weapons/book/weapons_tier2.jpg', (400, 740, 250, 180), 0.5, False),
}


def clean_cutout(crop, out_size):
    """Cut out object, remove grey background and drop disconnected small caption specks."""
    rgb = np.asarray(crop.convert('RGB')).astype(np.int32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    fg = dist > BG_TOL

    # Keep only the largest connected component to eliminate caption text fragments
    lbl, n = label(fg)
    if n > 1:
        sizes = [np.sum(lbl == i) for i in range(1, n + 1)]
        largest = np.argmax(sizes) + 1
        fg = (lbl == largest)

    fg_img = Image.fromarray((fg * 255).astype(np.uint8))
    fg_img = fg_img.filter(ImageFilter.MinFilter(3))  # shave 1px grey halo
    fg_img = fg_img.filter(ImageFilter.GaussianBlur(0.7))
    alpha = np.asarray(fg_img)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    res = Image.fromarray(out, 'RGBA')
    return res.resize(out_size, Image.LANCZOS)


def upright(img):
    """Rotate weapon so its principal longitudinal axis points upwards (tip up, hilt down)."""
    a = np.asarray(img)[:, :, 3] > 100
    ys, xs = np.nonzero(a)
    if len(xs) == 0:
        return img
    pts = np.stack([xs, ys], 1).astype(float)
    c = pts.mean(0)
    u, s, vt = np.linalg.svd(pts - c, full_matrices=False)
    ax = vt[0]
    if ax[1] > 0:
        ax = -ax  # point the axis up (tip side) on screen
    ang = np.degrees(np.arctan2(ax[0], -ax[1]))  # clockwise degrees from straight up
    img = img.rotate(ang, resample=Image.BICUBIC, expand=True)
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def main():
    loaded_sheets = {}
    out_dir = os.path.join(ROOT, 'assets/sprites/weapons')
    os.makedirs(out_dir, exist_ok=True)
    meta = {}

    for name, (rel_path, (x, y, w, h), scale, should_rotate) in WEAPONS.items():
        full_path = os.path.join(ROOT, rel_path)
        if not os.path.exists(full_path):
            print(f'Warning: {full_path} not found for {name}')
            continue
        if full_path not in loaded_sheets:
            loaded_sheets[full_path] = Image.open(full_path).convert('RGB')
        
        crop = loaded_sheets[full_path].crop((x, y, x + w, y + h))
        cut = clean_cutout(crop, (w, h))
        res = upright(cut) if should_rotate else cut.crop(cut.getbbox() or (0, 0, w, h))
        res = res.resize((max(1, round(res.width * scale)), max(1, round(res.height * scale))), Image.LANCZOS)
        res.save(os.path.join(out_dir, name + '.png'), optimize=True)
        meta[name] = [res.width, res.height]

    js = ('// Generated by tools/weapons_cutout.py - upright weapon pictures [width, height] (tip up, hilt at the bottom)\n'
          'export const WEAPON_SPRITES = ' + json.dumps(meta, indent=2) + ';\n')
    open(os.path.join(ROOT, 'src/weapon_sprites.js'), 'w').write(js)
    print(f'Successfully cut {len(meta)} weapon sprites into {out_dir}')


if __name__ == '__main__':
    main()

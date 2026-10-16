// Sprite manifest: which picture each monster / item uses. Shared by the game, the server and Studio.
import { WEAPON_SPRITES } from './weapon_sprites.js';

// Source sheets are 1024x1024 pictures; monster sheets hold 4 monsters (2x2), item sheets hold 12 items (3x4).
// The game itself uses the transparent cut-outs generated from them (see below).
// Monster cell k drops the items in cells 3k..3k+2 of the matching item sheet.

export const SHEETS = {
  starter:  { monsters: 'assets/monsters/monsters_sheet.jpg', items: 'assets/items/items_sheet.jpg', relics: 'assets/relics/relics_starter.jpg' },
  beasts:   { monsters: 'assets/monsters/monsters_beasts.jpg',   items: 'assets/items/items_beasts.jpg', relics: 'assets/relics/relics_beasts.jpg' },
  bandits:  { monsters: 'assets/monsters/monsters_bandits.jpg',  items: 'assets/items/items_bandits.jpg', relics: 'assets/relics/relics_bandits.jpg' },
  fantasy:  { monsters: 'assets/monsters/monsters_fantasy.jpg',  items: 'assets/items/items_fantasy.jpg', relics: 'assets/relics/relics_fantasy.jpg' },
  others:   { monsters: 'assets/monsters/monsters_others.jpg',   items: 'assets/items/items_others.jpg', relics: 'assets/relics/relics_others.jpg' },
  skeleton: { monsters: 'assets/monsters/monsters_skeleton.jpg', items: 'assets/items/items_skeleton.jpg', relics: 'assets/relics/relics_skeleton.jpg' }
};

// monsterId -> [sheet, cell 0..3]
export const MONSTER_SPRITES = {
  slime: ['starter', 0], forest_hornet: ['starter', 1], horned_rabbit: ['starter', 2],
  mossy_golem: ['starter', 3],
  forest_wolf: ['beasts', 0], wild_boar: ['beasts', 1], jungle_viper: ['beasts', 2], claw_bear: ['beasts', 3],
  bandit_rogue: ['bandits', 0], bandit_archer: ['bandits', 1], bandit_brute: ['bandits', 2], bandit_leader: ['bandits', 3],
  goblin_scout: ['fantasy', 0], fire_imp: ['fantasy', 1], treant: ['fantasy', 2], chest_mimic: ['fantasy', 3],
  floating_eye: ['others', 0], spectral_armor: ['others', 1], mushroom_sporeling: ['others', 2], baby_fire_wyrm: ['others', 3],
  skeleton_warrior: ['skeleton', 0], skeleton_archer: ['skeleton', 1], skeleton_mage: ['skeleton', 2], skeleton_knight: ['skeleton', 3]
};

// Item ids in sheet order (cell 0..11), 3 per monster
export const ITEM_SHEET_IDS = {
  starter: ['sticky_mucus', 'bouncy_core', 'relic_slime_core', 'poison_stinger', 'gossamer_wing', 'royal_honeycomb',
    'rabbit_fluff', 'small_horn', 'relic_golden_carrot', 'stone_plate', 'golem_core_gem', 'relic_golem_core'],
  beasts: ['wolf_fur', 'sharp_fang', 'alpha_eye_gem', 'boar_meat', 'hard_tusk', 'boar_leather_harness',
    'venom_vial', 'emerald_snake_scale', 'viper_fang_dagger', 'sharp_bear_claw', 'heavy_fur_coat', 'wild_honey_pot'],
  bandits: ['rogue_face_mask', 'serrated_dagger', 'lockpick_set', 'poacher_bandana', 'hunting_arrow_quiver', 'composite_shortbow',
    'spiked_pauldron', 'heavy_iron_nails', 'spiked_wood_club', 'feathered_tricorne', 'ornate_cutlass', 'secret_treasure_map'],
  fantasy: ['curved_shiv', 'stolen_coin_bag', 'goblin_ear', 'crimson_imp_horn', 'flame_essence', 'mini_pitchfork',
    'living_branch', 'amber_sap_droplet', 'ancient_acorn', 'sharp_mimic_tooth', 'skeleton_key', 'mimic_tongue'],
  others: ['ominous_eyeball', 'bat_wing_membrane', 'void_gazer_lens', 'ethereal_soul_flame', 'haunted_visor', 'spectral_steel_ingot',
    'spore_mushroom_cap', 'luminescent_powder', 'spore_elixir', 'crimson_dragon_scale', 'smoking_wyrm_horn', 'tiny_dragon_heart'],
  skeleton: ['cracked_skull', 'rusty_shortsword', 'wooden_buckler', 'bone_arrowhead', 'hunter_hood', 'bone_recurve_bow',
    'soul_essence_orb', 'necrotic_scroll', 'bone_magic_wand', 'corroded_plate', 'greatsword_hilt', 'horned_helm_crest']
};

// The 3 items a monster of this sheet cell drops
export function dropItemIds(sheet, cell) {
  return (ITEM_SHEET_IDS[sheet] || []).slice(cell * 3, cell * 3 + 3);
}

// Every picture is cut out of its sheet by tools/cutout.py (grey background removed) into one
// transparent PNG per monster/item/relic: assets/sprites/{monsters,items,relics}/<sheet>_<cell>.png
const MONSTER_PX = { w: 230, h: 210 };
const ITEM_PX = { w: 100, h: 95 };
const RELIC_PX = { w: 160, h: 160 };
const spriteOf = (kind, sheet, cell, px) => ({
  src: `assets/sprites/${kind}/${sheet}_${cell}.png`, sx: 0, sy: 0, sw: px.w, sh: px.h, iw: px.w, ih: px.h
});

// Relic sprite mapping: relicId, monsterId, or legacy id -> [sheet, cell 0..3]
export const RELIC_SPRITES = {
  // starter
  relic_slime_heart: ['starter', 0], slime: ['starter', 0], relic_slime: ['starter', 0],
  relic_amber_queen_brooch: ['starter', 1], forest_hornet: ['starter', 1], relic_forest_hornet: ['starter', 1],
  relic_carrot_charm: ['starter', 2], horned_rabbit: ['starter', 2], relic_horned_rabbit: ['starter', 2],
  relic_golem_heart: ['starter', 3], mossy_golem: ['starter', 3], relic_mossy_golem: ['starter', 3],
  // beasts
  relic_alpha_eye: ['beasts', 0], forest_wolf: ['beasts', 0], relic_forest_wolf: ['beasts', 0],
  relic_boar_crest: ['beasts', 1], wild_boar: ['beasts', 1], relic_wild_boar: ['beasts', 1],
  relic_ouroboros_viper: ['beasts', 2], jungle_viper: ['beasts', 2], relic_jungle_viper: ['beasts', 2],
  relic_ursa_totem: ['beasts', 3], claw_bear: ['beasts', 3], relic_claw_bear: ['beasts', 3],
  // bandits
  relic_shadow_cameo: ['bandits', 0], bandit_rogue: ['bandits', 0], relic_bandit_rogue: ['bandits', 0],
  relic_falcon_astrolabe: ['bandits', 1], bandit_archer: ['bandits', 1], relic_bandit_archer: ['bandits', 1],
  relic_titan_knuckle_seal: ['bandits', 2], bandit_brute: ['bandits', 2], relic_bandit_brute: ['bandits', 2],
  relic_pirate_sovereign_brooch: ['bandits', 3], bandit_leader: ['bandits', 3], relic_bandit_leader: ['bandits', 3],
  // fantasy
  relic_goblin_badge: ['fantasy', 0], goblin_scout: ['fantasy', 0], relic_goblin_scout: ['fantasy', 0],
  relic_brimstone_censer: ['fantasy', 1], fire_imp: ['fantasy', 1], relic_fire_imp: ['fantasy', 1],
  relic_heart_of_forest: ['fantasy', 2], treant: ['fantasy', 2], relic_treant: ['fantasy', 2],
  relic_pandora_mimic_lock: ['fantasy', 3], chest_mimic: ['fantasy', 3], relic_chest_mimic: ['fantasy', 3],
  // others
  relic_void_gazer_sphere: ['others', 0], floating_eye: ['others', 0], relic_floating_eye: ['others', 0],
  relic_phantom_aegis: ['others', 1], spectral_armor: ['others', 1], relic_spectral_armor: ['others', 1],
  relic_mycelium_chalice: ['others', 2], mushroom_sporeling: ['others', 2], relic_mushroom_sporeling: ['others', 2],
  relic_solar_dragon_egg: ['others', 3], baby_fire_wyrm: ['others', 3], relic_baby_fire_wyrm: ['others', 3],
  // skeleton
  relic_vanguard_crest: ['skeleton', 0], skeleton_warrior: ['skeleton', 0], relic_skeleton_warrior: ['skeleton', 0],
  relic_banshee_harp: ['skeleton', 1], skeleton_archer: ['skeleton', 1], relic_skeleton_archer: ['skeleton', 1],
  relic_lich_archon_orb: ['skeleton', 2], skeleton_mage: ['skeleton', 2], relic_skeleton_mage: ['skeleton', 2],
  relic_death_knight_crown: ['skeleton', 3], skeleton_knight: ['skeleton', 3], relic_skeleton_knight: ['skeleton', 3]
};

let itemIndex = null;
function itemLookup() {
  if (itemIndex) return itemIndex;
  itemIndex = {};
  for (const [sheet, ids] of Object.entries(ITEM_SHEET_IDS)) ids.forEach((id, i) => { itemIndex[id] = [sheet, i]; });
  return itemIndex;
}

const POTION_SPRITES = new Set([
  'hp_potion_s', 'hp_potion_m', 'hp_potion_l',
  'sp_potion_s', 'sp_potion_m', 'sp_potion_l',
  'exp_potion_s', 'exp_potion_m', 'exp_potion_l'
]);
export function potionSprite(id) {
  if (!POTION_SPRITES.has(id)) return null;
  return { src: `assets/sprites/potions/${id}.png`, sx: 0, sy: 0, sw: 140, sh: 140, iw: 140, ih: 140 };
}

const DROP_SPRITES = new Set([
  'gold_s', 'gold_m', 'gold_l',
  'exp_s', 'exp_m', 'exp_l'
]);
export function dropSprite(kind, amountOrSize = 0) {
  let size = 's';
  if (typeof amountOrSize === 'string') {
    size = amountOrSize.toLowerCase();
  } else if (kind === 'gold') {
    if (amountOrSize >= 500) size = 'l';
    else if (amountOrSize >= 80) size = 'm';
    else size = 's';
  } else if (kind === 'exp') {
    if (amountOrSize >= 1000) size = 'l';
    else if (amountOrSize >= 150) size = 'm';
    else size = 's';
  }
  if (size === 'xl') size = 'l'; // XL reuses the L picture (game.js draws it 1.2x bigger)
  const id = `${kind}_${size}`;
  if (!DROP_SPRITES.has(id)) return null;
  return { src: `assets/sprites/drops/${id}.png`, sx: 0, sy: 0, sw: 140, sh: 140, iw: 140, ih: 140 };
}

// Display-only split of a gold / EXP reward into S (50) / M (100) / L (500) / XL (1000) pieces, biggest first.
// 620 -> L, M, S.  Anything under 50 still shows one S.  The pieces' amounts always add up to `total`.
export const DROP_PIECE_MAX = 12;
export function splitDropPieces(total) {
  total = Math.floor(total || 0);
  if (total <= 0) return [];
  const sizes = [];
  let rest = total;
  const xl = Math.floor(rest / 1000); rest -= xl * 1000;
  const l = Math.floor(rest / 500); rest -= l * 500;
  const m = Math.floor(rest / 100); rest -= m * 100;
  const sn = Math.ceil(rest / 50);
  for (let i = 0; i < xl; i++) sizes.push('xl');
  for (let i = 0; i < l; i++) sizes.push('l');
  for (let i = 0; i < m; i++) sizes.push('m');
  for (let i = 0; i < sn; i++) sizes.push('s');
  const capped = sizes.length > DROP_PIECE_MAX;
  if (capped) { // huge reward: keep 1 M + 1 S and fill the rest with XL
    sizes.length = 0;
    for (let i = 0; i < DROP_PIECE_MAX - 2; i++) sizes.push('xl');
    sizes.push('m', 's');
  }
  // nominal values for the small pieces, the XL pieces share the remainder so the sum is exact
  const nominal = { s: 50, m: 100, l: 500, xl: 1000 };
  const pieces = sizes.map(size => ({ size, amount: nominal[size] }));
  if (sizes.length <= DROP_PIECE_MAX && !capped) { // normal case: the last S carries the leftover
    pieces[pieces.length - 1].amount += total - pieces.reduce((a, p) => a + p.amount, 0);
    return pieces;
  }
  let diff = total - pieces.reduce((a, p) => a + p.amount, 0);
  if (diff !== 0) {
    const big = pieces.filter(p => p.size === 'xl');
    const adj = big.length ? big : [pieces[pieces.length - 1]];
    const each = Math.trunc(diff / adj.length);
    adj.forEach(p => { p.amount += each; });
    adj[adj.length - 1].amount += diff - each * adj.length;
  }
  return pieces;
}

// -> { src, sx, sy, sw, sh } or null when the monster/item/relic has no picture yet
export function monsterSprite(id) {
  const e = MONSTER_SPRITES[id];
  return e ? spriteOf('monsters', e[0], e[1], MONSTER_PX) : null;
}
export function itemSprite(id) {
  const p = potionSprite(id);
  if (p) return p;
  const r = relicSprite(id); // relic pictures win over the old item-sheet icons
  if (r) return r;
  const e = itemLookup()[id];
  return e ? spriteOf('items', e[0], e[1], ITEM_PX) : null;
}
export function relicSprite(id) {
  const e = RELIC_SPRITES[id];
  return e ? spriteOf('relics', e[0], e[1], RELIC_PX) : null;
}

// CSS for a `px`-wide box showing the sprite (DOM use: inventory, Studio)
export function spriteStyle(sp, px) {
  const k = px / sp.sw;
  return `display:inline-block;width:${px}px;height:${Math.round(sp.sh * k)}px;flex:none;vertical-align:middle;` +
    `background:url(/${sp.src}) no-repeat;background-size:${Math.round(sp.iw * k)}px ${Math.round(sp.ih * k)}px;` +
    `background-position:-${Math.round(sp.sx * k)}px -${Math.round(sp.sy * k)}px;`;
}

// HTML for a relic icon: picture if available, fallback to emoji
export function relicIconHtml(id, emoji, px = 28) {
  const sp = relicSprite(id);
  return sp ? `<span style="${spriteStyle(sp, px)}"></span>` : (emoji || '💎');
}

// HTML for an item's icon: its picture when it has one, otherwise the emoji
export function itemIconHtml(id, emoji, px = 28) {
  // player gear pictures: whole-look outfits, shields, mounts
  const PART_OF = { back_angel: 'wings_angel', back_dragon: 'wings_dragon', back_fairy: 'wings_fairy', back_cape: 'cape_red' };
  const gearImg = id && (/^(hat|head|outfit|shield|back)_/.test(id) ? `assets/sprites/player/parts/${PART_OF[id] || id}.png`
    : id.startsWith('mount_') ? `assets/sprites/mounts/${id}.png` : null);
  if (gearImg) return `<img src="/${gearImg}" alt="" style="max-width:${px}px;max-height:${px}px;object-fit:contain;vertical-align:middle;">`;
  if (id && id.startsWith('pet_')) {
    const ms = monsterSprite(id.slice(4));
    if (ms) return `<span style="${spriteStyle(ms, px)}"></span>`;
  }
  const ps = potionSprite(id);
  if (ps) return `<span style="${spriteStyle(ps, px)}"></span>`;
  const rs = relicSprite(id);
  if (rs) return `<span style="${spriteStyle(rs, px)}"></span>`;
  const ws = weaponSprite(id);
  if (ws) {
    const k = Math.min(px / ws.w, px / ws.h);
    return `<img src="/${ws.src}" alt="" style="width:${Math.round(ws.w * k)}px;height:${Math.round(ws.h * k)}px;vertical-align:middle;">`;
  }
  const sp = itemSprite(id);
  return sp ? `<span style="${spriteStyle(sp, px)}"></span>` : (emoji || '📦');
}

// Weapon pictures (cut-outs from assets/weapons/<category>/*.jpg, see tools/weapons_cutout.py): item id -> picture name
export const WEAPON_SPRITE_OF = {
  // Swords
  novice_sword: 'wooden_sword', iron_blade: 'iron_broadsword', wolf_fang_saber: 'wolf_fang_saber',
  goblin_cleaver: 'bone_cleaver', rune_claymore: 'rune_claymore', titan_slayer: 'titan_earthbreaker',
  dragon_scale_blade: 'dragon_scale_blade',
  // Staves
  wooden_stick: 'wooden_wand', apprentice_staff: 'oak_apprentice_rod', sage_staff: 'ruby_fire_staff',
  // Bows
  wooden_bow: 'wooden_shortbow', hunter_bow: 'hunting_recurve_bow', gale_wind_bow: 'gale_windforce_bow',
  dragon_bone_bow: 'dragon_breath_longbow'
};

// -> { src, w, h } (tip up, hilt at the bottom) or null
export function weaponSprite(id) {
  const name = WEAPON_SPRITE_OF[id] || (WEAPON_SPRITES[id] ? id : null);
  const wh = name && WEAPON_SPRITES[name];
  return wh ? { src: `assets/sprites/weapons/${name}.png`, w: wh[0], h: wh[1] } : null;
}

// Particle & Combat VFX Sprites (Gold, EXP, Blood, Damage Hit Impacts)
export const PARTICLE_SPRITES = new Set([
  'sparkle_gold', 'coin_particle', 'exp_bubble', 'sparkle_exp',
  'blood_splat', 'blood_spray', 'blood_drop', 'blood_scratch',
  'hit_spark', 'hit_slash', 'crit_burst', 'hit_deflect'
]);

export function particleSprite(id) {
  if (!id || !PARTICLE_SPRITES.has(id)) return null;
  return { src: `assets/sprites/particles/${id}.png`, sx: 0, sy: 0, sw: 128, sh: 128, iw: 128, ih: 128 };
}

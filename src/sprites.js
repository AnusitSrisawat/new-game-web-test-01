// Sprite manifest: which picture each monster / item uses. Shared by the game, the server and Studio.
// Every sheet is a 1024x1024 picture; monster sheets hold 4 monsters (2x2), item sheets hold 12 items (3x4).
// Monster cell k drops the items in cells 3k..3k+2 of the matching item sheet.

export const SHEETS = {
  starter:  { monsters: 'assets/monsters_sheet.jpg' },
  beasts:   { monsters: 'assets/monsters_beasts.jpg',   items: 'assets/items/items_beasts.jpg' },
  bandits:  { monsters: 'assets/monsters_bandits.jpg',  items: 'assets/items/items_bandits.jpg' },
  fantasy:  { monsters: 'assets/monsters_fantasy.jpg',  items: 'assets/items/items_fantasy.jpg' },
  others:   { monsters: 'assets/monsters_others.jpg',   items: 'assets/items/items_others.jpg' },
  skeleton: { monsters: 'assets/monsters_skeleton.jpg', items: 'assets/items/items_skeleton.jpg' }
};

// monsterId -> [sheet, cell 0..3]
export const MONSTER_SPRITES = {
  slime: ['starter', 0], forest_hornet: ['starter', 1], horned_rabbit: ['starter', 2],
  mossy_golem: ['starter', 3], stone_golem: ['starter', 3], ancient_golem: ['starter', 3],
  forest_wolf: ['beasts', 0], wild_boar: ['beasts', 1], jungle_viper: ['beasts', 2], claw_bear: ['beasts', 3],
  bandit_rogue: ['bandits', 0], bandit_archer: ['bandits', 1], bandit_brute: ['bandits', 2], bandit_leader: ['bandits', 3],
  goblin_scout: ['fantasy', 0], fire_imp: ['fantasy', 1], treant: ['fantasy', 2], chest_mimic: ['fantasy', 3],
  floating_eye: ['others', 0], spectral_armor: ['others', 1], mushroom_sporeling: ['others', 2], baby_fire_wyrm: ['others', 3],
  skeleton_warrior: ['skeleton', 0], skeleton_archer: ['skeleton', 1], skeleton_mage: ['skeleton', 2], skeleton_knight: ['skeleton', 3]
};

// Item ids in sheet order (cell 0..11), 3 per monster
export const ITEM_SHEET_IDS = {
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

// Crop rectangles inside the 1024px sheets (leave the printed captions out)
function monsterRect(cell) {
  const col = cell % 2, row = cell >> 1;
  return { sx: col * 512 + 26, sy: row * 512 + 8, sw: 460, sh: 420 };
}
function itemRect(cell) {
  const col = cell % 3, row = Math.floor(cell / 3);
  return { sx: 105 + 308 * col, sy: 25 + 241 * row, sw: 200, sh: 200 };
}

let itemIndex = null;
function itemLookup() {
  if (itemIndex) return itemIndex;
  itemIndex = {};
  for (const [sheet, ids] of Object.entries(ITEM_SHEET_IDS)) ids.forEach((id, i) => { itemIndex[id] = [sheet, i]; });
  return itemIndex;
}

// -> { src, sx, sy, sw, sh } or null when the monster/item has no picture yet
export function monsterSprite(id) {
  const e = MONSTER_SPRITES[id];
  return e ? { src: SHEETS[e[0]].monsters, ...monsterRect(e[1]) } : null;
}
export function itemSprite(id) {
  const e = itemLookup()[id];
  return e ? { src: SHEETS[e[0]].items, ...itemRect(e[1]) } : null;
}

// CSS for a `px`-wide square showing the sprite (DOM use: inventory, Studio)
export function spriteStyle(sp, px) {
  const k = px / sp.sw;
  return `display:inline-block;width:${px}px;height:${Math.round(sp.sh * k)}px;flex:none;vertical-align:middle;` +
    `background:url(/${sp.src}) no-repeat;background-size:${Math.round(1024 * k)}px ${Math.round(1024 * k)}px;` +
    `background-position:-${Math.round(sp.sx * k)}px -${Math.round(sp.sy * k)}px;`;
}

// HTML for an item's icon: its picture when it has one, otherwise the emoji
export function itemIconHtml(id, emoji, px = 28) {
  const sp = itemSprite(id);
  return sp ? `<span style="${spriteStyle(sp, px)}"></span>` : (emoji || '📦');
}

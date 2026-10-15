// Content added on top of data.js: monsters + the 3 items each one drops (pictures come from sprites.js).
import { ITEM_SHEET_IDS, MONSTER_SPRITES, dropItemIds } from './sprites.js';

const title = (id) => id.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
const SHEET_EMOJI = { starter: '🌱', beasts: '🐾', bandits: '🗡️', fantasy: '✨', others: '🔮', skeleton: '💀' };
// Names of the starter-sheet items as printed on assets/items/items_sheet.jpg
const ITEM_NAMES = {
  sticky_mucus: 'Sticky Mucus', bouncy_core: 'Bouncy Core', relic_slime_core: 'Slime Crown',
  poison_stinger: 'Poison Stinger', gossamer_wing: 'Gossamer Wing', royal_honeycomb: 'Royal Honeycomb',
  rabbit_fluff: 'Rabbit Fluff', small_horn: 'Sharp Little Horn', relic_golden_carrot: 'Golden Carrot',
  stone_plate: 'Mossy Stone Plate', golem_core_gem: 'Golem Core Gem', relic_golem_core: 'Ancient Earth Relic'
};
const CHANCES = [0.7, 0.4, 0.1]; // common / uncommon / rare

// Stats follow a smooth curve of the level (same ballpark as the original monsters)
const stats = (lv) => ({
  hp: Math.round(0.135 * Math.pow(lv, 2.5) + 10 * lv + 20),
  atk: Math.round(3 + lv * 1.6 + lv * lv * 0.012),
  def: Math.round(lv * 0.9 + lv * lv * 0.003),
  exp: Math.max(12, Math.round(0.2 * Math.pow(lv, 2.2)))
});

// New monsters. `items` is only needed for a monster that has neither an item sheet nor a starter-sheet picture.
const NEW_MONSTERS = [
  { id: 'forest_hornet', name: 'Forest Hornet', emoji: '🐝', level: 3, ai: { speed: 120, aggro: 250, attackRange: 55 } },
  { id: 'mushroom_sporeling', name: 'Mushroom Sporeling', emoji: '🍄', level: 6, ai: { speed: 40, aggro: 160 } },
  { id: 'mossy_golem', name: 'Mossy Golem', emoji: '🗿', level: 12, ai: { speed: 45, aggro: 180, attackRange: 80 } },
  { id: 'jungle_viper', name: 'Jungle Viper', emoji: '🐍', level: 21, ai: { speed: 100, aggro: 260, attackRange: 70 } },
  { id: 'claw_bear', name: 'Claw Bear', emoji: '🐻', level: 29, ai: { speed: 80, aggro: 240, attackRange: 85 } },
  { id: 'bandit_rogue', name: 'Bandit Rogue', emoji: '🥷', level: 34, ai: { speed: 125, aggro: 300, attackCooldown: 1.2 } },
  { id: 'bandit_archer', name: 'Bandit Archer', emoji: '🏹', level: 37, ai: { speed: 70, aggro: 380, attackRange: 260, attackCooldown: 1.8 } },
  { id: 'chest_mimic', name: 'Chest Mimic', emoji: '🧰', level: 44, ai: { speed: 30, aggro: 120, attackRange: 70, wanderRadius: 0 } },
  { id: 'bandit_brute', name: 'Bandit Brute', emoji: '💪', level: 42, ai: { speed: 65, aggro: 240, attackRange: 85, attackCooldown: 2.0 } },
  { id: 'bandit_leader', name: 'Bandit Leader', emoji: '🏴‍☠️', level: 48, ai: { speed: 85, aggro: 300, attackRange: 90, attackCooldown: 1.4 }, mult: { hp: 2.2, atk: 1.3, exp: 2.5 } },
  { id: 'fire_imp', name: 'Fire Imp', emoji: '😈', level: 52, ai: { speed: 115, aggro: 290, attackRange: 190, attackCooldown: 1.8 } },
  { id: 'skeleton_warrior', name: 'Skeleton Warrior', emoji: '💀', level: 55, ai: { speed: 75, aggro: 250, attackRange: 75 } },
  { id: 'floating_eye', name: 'Floating Eye', emoji: '👁️', level: 56, ai: { speed: 90, aggro: 330, attackRange: 200, attackCooldown: 2.0 } },
  { id: 'baby_fire_wyrm', name: 'Baby Fire Wyrm', emoji: '🐲', level: 58, ai: { speed: 80, aggro: 280, attackRange: 160, attackCooldown: 2.0 } },
  { id: 'skeleton_archer', name: 'Skeleton Archer', emoji: '🏹', level: 58, ai: { speed: 70, aggro: 380, attackRange: 260, attackCooldown: 1.8 } },
  { id: 'skeleton_mage', name: 'Skeleton Mage', emoji: '🧙', level: 61, ai: { speed: 65, aggro: 350, attackRange: 230, attackCooldown: 2.2 } },
  { id: 'spectral_armor', name: 'Spectral Armor', emoji: '🛡️', level: 62, ai: { speed: 60, aggro: 240, attackRange: 80 } },
  { id: 'skeleton_knight', name: 'Skeleton Knight', emoji: '⚔️', level: 66, ai: { speed: 60, aggro: 260, attackRange: 90, attackCooldown: 1.8 } }
];

// Existing monsters that finally got their own picture: their drops become the 3 items on the sheet
// (their legendary relic drop stays).
const REDO_DROPS = ['forest_wolf', 'wild_boar', 'goblin_scout', 'treant'];

export function installCatalog({ MONSTERS, ITEMS, MONSTER_AI }) {
  const addItem = (id, name, icon, price, extra = {}) => {
    if (ITEMS[id]) return;
    ITEMS[id] = { id, name, price, icon, type: 'material', desc: extra.desc || `วัตถุดิบดรอปจากมอนสเตอร์ ขายหรือเก็บไว้คราฟต์ได้`, ...extra };
  };

  // a relic that is also on the sheet keeps its own (rarer) chance instead of appearing twice
  const dropsFor = (m, itemIds) => {
    const relics = (m.drops || []).filter(d => d.isRelic);
    return itemIds.filter(id => !relics.some(r => r.itemId === id)).map(id => ({ itemId: id, chance: CHANCES[itemIds.indexOf(id)] }))
      .concat(relics);
  };

  for (const nm of NEW_MONSTERS) {
    const s = stats(nm.level);
    const mult = nm.mult || {};
    MONSTERS[nm.id] = {
      id: nm.id, name: nm.name, emoji: nm.emoji, level: nm.level,
      hp: Math.round(s.hp * (mult.hp || 1)), atk: Math.round(s.atk * (mult.atk || 1)),
      def: s.def, exp: Math.round(s.exp * (mult.exp || 1)), drops: []
    };
    MONSTER_AI[nm.id] = nm.ai;
  }

  // drops: 3 items per monster
  for (const [mid, [sheet, cell]] of Object.entries(MONSTER_SPRITES)) {
    const m = MONSTERS[mid];
    if (!m) continue;
    const nm = NEW_MONSTERS.find(n => n.id === mid);
    let ids;
    if (nm && nm.items) {
      nm.items.forEach(([id, name, icon, price]) => addItem(id, name, icon, price));
      ids = nm.items.map(it => it[0]);
    } else if (ITEM_SHEET_IDS[sheet] && (nm || REDO_DROPS.includes(mid) || sheet === 'starter')) {
      ids = dropItemIds(sheet, cell);
      ids.forEach((id, i) => {
        if (ITEM_NAMES[id] && ITEMS[id]) ITEMS[id].name = ITEM_NAMES[id];
        addItem(id, ITEM_NAMES[id] || title(id), SHEET_EMOJI[sheet], Math.round(m.level * [1.5, 3, 8][i]) + [5, 10, 30][i]);
      });
    } else {
      continue; // keeps its original drops
    }
    m.drops = dropsFor(m, ids);
  }
}

// For now the game only has: the starter weapon, the HP potions, and the items monsters drop (3 each).
// Everything else (old weapons/armor/materials, relic drops, recipes that need them) is switched off here;
// the definitions stay in data.js so they can be brought back one by one later.
const BASE_ITEMS = ['wooden_stick', 'hp_potion_s', 'hp_potion_m', 'hp_potion_l', 'apple',
  // swords with a picture in assets/weapons (see WEAPON_SPRITE_OF in sprites.js); made at the crafting table
  'novice_sword', 'iron_blade', 'wolf_fang_saber', 'goblin_cleaver', 'rune_claymore', 'titan_slayer', 'dragon_scale_blade'];

export function pruneItems({ MONSTERS, ITEMS, CRAFTING_RECIPES }) {
  const keep = new Set(BASE_ITEMS);
  Object.values(ITEM_SHEET_IDS).forEach(ids => ids.forEach(id => keep.add(id)));
  NEW_MONSTERS.forEach(nm => (nm.items || []).forEach(it => keep.add(it[0])));
  for (const id of Object.keys(ITEMS)) if (!keep.has(id)) delete ITEMS[id];
  // monsters only drop items that still exist (this also drops the old relic drops)
  for (const m of Object.values(MONSTERS)) m.drops = (m.drops || []).filter(d => ITEMS[d.itemId]);
  const usable = CRAFTING_RECIPES.filter(r => ITEMS[r.resultItemId] && r.materials.every(mt => ITEMS[mt.itemId]));
  CRAFTING_RECIPES.splice(0, CRAFTING_RECIPES.length, ...usable);
}

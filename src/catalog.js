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
const CHANCES = [0.5, 0.3, 0.1]; // common / uncommon / rare — one roll per kill, so the sum is ≤ 100% (the rest = nothing drops)

// Stats follow a smooth curve of the level (same ballpark as the original monsters)
const stats = (lv) => ({
  hp: Math.round(0.135 * Math.pow(lv, 2.5) + 10 * lv + 20),
  atk: Math.round(3 + lv * 1.6 + lv * lv * 0.012),
  def: Math.round(lv * 0.9 + lv * lv * 0.003),
  exp: Math.round(14 + 0.2 * Math.pow(lv, 2.2))
});

// Level plan: every map's monsters are stronger than the previous map's (rows = maps in play order, 4 monsters each; each map spans a 15-level band: 1-15, 16-30, 31-45, ...).
// Stats come from the curve above, so a higher level always means higher HP/ATK/DEF/EXP.
const LEVEL_PLAN = {
  meadows:        { slime: 1, forest_hornet: 5, horned_rabbit: 10, mossy_golem: 15 },
  misty_forest:   { wild_boar: 16, forest_wolf: 21, jungle_viper: 26, claw_bear: 30 },
  bandit_hideout: { bandit_rogue: 31, bandit_archer: 36, bandit_brute: 41, bandit_leader: 45 },
  goblin_caverns: { goblin_scout: 46, fire_imp: 51, treant: 56, chest_mimic: 60 },
  volcano:        { floating_eye: 61, spectral_armor: 66, mushroom_sporeling: 71, baby_fire_wyrm: 75 },
  bone_crypt:     { skeleton_warrior: 76, skeleton_archer: 81, skeleton_mage: 86, skeleton_knight: 90 }
};
const BOSS_MULT = { bandit_leader: { hp: 2.2, atk: 1.3, exp: 2.5 } };
const KEEP_STATS = ['slime']; // the very first monster keeps its hand-tuned numbers

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

  // exactly 3 normal drops per monster (the 3 pictures on the item sheet)
  const dropsFor = (m, itemIds) => itemIds.map((id, i) => ({ itemId: id, chance: CHANCES[i] }));

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

  // apply the level plan to every monster (old and new)
  for (const ids of Object.values(LEVEL_PLAN)) {
    for (const [id, lv] of Object.entries(ids)) {
      const m = MONSTERS[id];
      if (!m) continue;
      m.level = lv;
      if (KEEP_STATS.includes(id)) continue;
      const st = stats(lv), mu = BOSS_MULT[id] || {};
      m.hp = Math.round(st.hp * (mu.hp || 1)); m.atk = Math.round(st.atk * (mu.atk || 1));
      m.def = st.def; m.exp = Math.round(st.exp * (mu.exp || 1));
    }
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
const BASE_ITEMS = ['wooden_stick', 'hp_potion_s', 'hp_potion_m', 'hp_potion_l', 'sp_potion_s', 'sp_potion_m', 'sp_potion_l', 'exp_potion_s', 'exp_potion_m', 'exp_potion_l',
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

// Which way each monster's picture looks (default 'left'). The game flips it to match the walking direction.
// 'right' = the art looks right, 'none' = never flip. Editable per monster in Studio.
const FACING = { skeleton_archer: 'right' };
export function applyFacing(MONSTERS) {
  for (const [id, f] of Object.entries(FACING)) if (MONSTERS[id]) MONSTERS[id].facing = f;
}

// Final drop setup (after pruneItems):
//  - every monster gets a pet chance + a relic chance (rolled SEPARATELY from the normal drop table; default 0.1% each)
//  - every monster gets a relic of its own (generated when data.js has none for it)
//  - the normal table is one roll, so its chances may not add up to more than 100%
// Pet loot speed (x): 1 = no pet. Level 1 monster = x1.06, level 10 = x1.6, level 40 = x3.4  (formula: 1 + 0.06 × level)
export const petLootSpeed = (level) => Math.round((1 + 0.06 * level) * 100) / 100;
export const DEFAULT_PET_CHANCE = 0.001;
export const DEFAULT_RELIC_CHANCE = 0.001;
export function finishDrops({ MONSTERS, RELICS, ITEMS }) {
  const STAT_CYCLE = ['atk', 'def', 'hp'];
  let n = 0;
  for (const [mid, m] of Object.entries(MONSTERS)) {
    if (m.petChance === undefined) m.petChance = DEFAULT_PET_CHANCE;
    if (m.relicChance === undefined) m.relicChance = DEFAULT_RELIC_CHANCE;
    // a pet is an item (type 'pet', looks like the monster) that is worn in the pet slot
    ITEMS[`pet_${mid}`] = { id: `pet_${mid}`, name: `Pet: ${m.name}`, type: 'pet', monsterId: mid, price: 200 + m.level * 40, icon: m.emoji || '🐾',
      lootSpeed: petLootSpeed(m.level), // loot-collecting speed: higher level monster = faster pet
      desc: `สัตว์เลี้ยงหน้าตาเหมือน ${m.name} — สวมใส่ที่ช่อง Pet แล้วจะเดินตามผู้เล่นและช่วยเก็บของ (ยิ่งมอนสเตอร์เลเวลสูง ยิ่งเก็บเร็ว)` };
    if (!Object.values(RELICS).some(r => r.monsterId === mid)) {
      const stat = STAT_CYCLE[n++ % 3];
      const amount = stat === 'hp' ? m.level * 12 : Math.max(1, Math.ceil(m.level * (stat === 'atk' ? 0.8 : 0.6)));
      const id = `relic_${mid}`;
      RELICS[id] = { id, monsterId: mid, name: `${m.name} Relic`, desc: `สมบัติพิเศษประจำ ${m.name}`, icon: '💠',
        statBonus: { [stat]: amount }, bonusText: `+${amount} ${stat === 'hp' ? 'Max HP' : stat.toUpperCase()} ถาวร` };
    }
    // normal table: trim so the total never goes above 100%
    let sum = 0;
    m.drops = (m.drops || []).filter(d => {
      if (d.isRelic || RELICS[d.itemId]) return false; // relics have their own roll now
      sum += d.chance;
      return sum <= 1.0001;
    });
  }
}

// Player look + gear from assets/player/player_parts_sheet.jpg and assets/mounts/mounts_riding_sheet.jpg:
//  - outfit (slot "ชุด"): a whole look = body + clothes + hat + wings baked together (tools/player_costumes.py)
//  - shield (left hand) and mount (riding animal, + move speed). Pictures: see sprites.js
export function installPlayerGear(ITEMS) {
  const SEAT = { mount_runner: [0.5, 0.4], mount_wolf: [0.52, 0.3], mount_unicorn: [0.43, 0.3], mount_drake: [0.58, 0.5] };
  // scale / offX / offY / seatX / seatY: how the picture sits on the player (tune them in Studio -> items)
  const add = (it) => {
    const look = it.partW ? {} : it.type === 'mount' ? { scale: 1, offX: 0, offY: 0, seatX: SEAT[it.id][0], seatY: SEAT[it.id][1], seatDrop: 6, seatClip: 0 }
      : it.type === 'shield' ? { scale: 0.8, offX: 0, offY: 3 } : { scale: 1, offX: 0, offY: 0 };
    // flip: 'yes' mirrors the picture (the original looks the other way) · layer: 'front' / 'behind' the model
    const layer = it.type === 'back' || it.type === 'mount' ? 'behind' : 'front';
    ITEMS[it.id] = { reqLevel: 1, price: 0, ...look, flip: 'no', layer, ...it };
  };
  // The pieces of the player (paper-doll, src/player_look.js). Each hangs on the base model (135 x 301 px) by
  //   partW (width) / partX (shift from centre) / partY (hat: bottom edge, head: chin, outfit: bottom, back: centre height)
  // Tune them per item in Studio -> items (live preview with a ruler).
  const piece = (type, id, part, name, icon, partW, partY, extra = {}) => add({ id, name, type, part, icon, partW, partX: 0, partY, ...extra });
  piece('hat', 'hat_helm', 'hat_helm', 'Knight Winged Visor Helm', '🪖', 150, 128, { def: 5, hp: 20, price: 250, desc: 'หมวกเกราะอัศวินติดปีกเงิน (ปิดหน้า)' });
  piece('hat', 'hat_wizard', 'hat_wizard', 'Wizard Pointed Wide-Brim Hat', '🧙', 200, 70, { def: 2, hp: 15, price: 250, desc: 'หมวกพ่อมดปีกกว้างประดับดาวและขนนก' });
  piece('hat', 'hat_cat', 'hat_cat', 'Cozy Cat Ears Headband', '🐱', 135, 52, { def: 1, hp: 10, price: 250, desc: 'ที่คาดผมหูแมวผูกโบว์ชมพู' });
  piece('hat', 'hat_crown', 'hat_crown', 'Royal Crown', '👑', 105, 36, { def: 3, hp: 40, price: 600, desc: 'มงกุฎทองประดับอัญมณี' });
  piece('head', 'head_0', 'head_0', 'Round Head (หัวกลม)', '🙂', 131, 134, { price: 0, desc: 'ทรงหัวเริ่มต้น' });
  piece('head', 'head_1', 'head_1', 'Cheerful Head (หัวร่าเริง)', '😊', 131, 134, { price: 100, desc: 'ทรงหัวและหน้าแบบที่ 2' });
  piece('head', 'head_2', 'head_2', 'Calm Head (หัวนิ่งสงบ)', '😌', 131, 134, { price: 100, desc: 'ทรงหัวและหน้าแบบที่ 3' });
  piece('head', 'head_3', 'head_3', 'Sweet Head (หัวใจดี)', '🥰', 131, 134, { price: 100, desc: 'ทรงหัวและหน้าแบบที่ 4' });
  piece('outfit', 'outfit_knight', 'outfit_knight', 'Knight Plate (ชุดอัศวิน)', '🛡️', 128, 303, { def: 8, hp: 40, price: 400, desc: 'เกราะอัศวินน้ำเงินเงิน' });
  piece('outfit', 'outfit_ranger', 'outfit_ranger', 'Emerald Ranger Tunic (ชุดนายพราน)', '🏹', 134, 303, { def: 5, hp: 30, price: 400, desc: 'เสื้อหนังเขียวมรกต' });
  piece('outfit', 'outfit_sorcerer', 'outfit_sorcerer', 'Crimson Sorcerer Robe (ชุดจอมเวท)', '🔮', 133, 303, { def: 4, hp: 25, price: 400, desc: 'ชุดคลุมเวทสีแดงเข้ม' });
  piece('outfit', 'outfit_assassin', 'outfit_assassin', 'Black Shadow Assassin Coat (ชุดนักฆ่าเงา)', '🗡️', 135, 303, { def: 6, hp: 30, price: 400, desc: 'เสื้อคลุมดำของนักฆ่าเงา' });
  piece('back', 'back_angel', 'wings_angel', 'Radiant White Angel Wings', '🪽', 225, 165, { def: 2, hp: 30, price: 700, desc: 'ปีกนางฟ้าขนนกสีขาว' });
  piece('back', 'back_dragon', 'wings_dragon', 'Purple Dragon Bat Wings', '🦇', 270, 150, { atk: 3, price: 700, desc: 'ปีกมังกรค้างคาวสีม่วง' });
  piece('back', 'back_fairy', 'wings_fairy', 'Green Butterfly Fairy Wings', '🦋', 200, 160, { def: 1, hp: 20, price: 700, desc: 'ปีกผีเสื้อภูตสีเขียว' });
  piece('back', 'back_cape', 'cape_red', 'Flowing Red Knight Cape', '🧣', 150, 215, { def: 3, price: 500, desc: 'ผ้าคลุมอัศวินสีแดง' });
  add({ id: 'shield_lion', name: 'Golden Lion Crest Shield', type: 'shield', icon: '🛡️', def: 6, hp: 20, price: 300, desc: 'โล่ตราสิงโตทอง (มือซ้าย)' });
  add({ id: 'shield_rune', name: 'Magic Rune Buckler', type: 'shield', icon: '🔵', def: 4, hp: 35, price: 300, desc: 'โล่กลมอักษรรูนเรืองแสง (มือซ้าย)' });
  add({ id: 'mount_runner', name: 'Yellow Feathered Runner', type: 'mount', icon: '🐤', speedPct: 40, price: 1200, desc: 'นกวิ่งขนฟูสีทอง สัตว์ขี่ — ความเร็วเดิน +40% (กด R ขึ้นขี่/ลง)' });
  add({ id: 'mount_wolf', name: 'Armored Dire Wolf', type: 'mount', icon: '🐺', speedPct: 50, price: 1800, desc: 'หมาป่าเทาหุ้มเกราะ — ความเร็วเดิน +50% (กด R ขึ้นขี่/ลง)' });
  add({ id: 'mount_unicorn', name: 'Royal White Unicorn', type: 'mount', icon: '🦄', speedPct: 55, price: 2400, desc: 'ยูนิคอร์นขาวแห่งราชวงศ์ — ความเร็วเดิน +55% (กด R ขึ้นขี่/ลง)' });
  add({ id: 'mount_drake', flip: 'yes', name: 'Baby Red Drake', type: 'mount', icon: '🐉', speedPct: 60, price: 3000, desc: 'มังกรแดงตัวน้อย — ความเร็วเดิน +60% (กด R ขึ้นขี่/ลง)' });
}

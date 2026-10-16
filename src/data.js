import { installCatalog, pruneItems, applyFacing, finishDrops } from './catalog.js';
import { SKILL_DEFAULTS } from './skills.js';
import { installWeapons } from './weapons_catalog.js';

// Game Master Data & Configurations

// Weapon types decide how the basic attack works (range, projectile, damage scaling).
// There are no classes: playstyle comes from stats, skills and the weapon you hold.
export const WEAPON_TYPES = {
  fist:  { id: 'fist',  name: 'มือเปล่า', range: 55,  projectile: null,    scalesWith: 'str' },
  stick: { id: 'stick', name: 'กิ่งไม้/ไม้',  range: 75,  projectile: null,    scalesWith: 'str' },
  sword: { id: 'sword', name: 'ดาบ',     range: 80,  projectile: null,    scalesWith: 'str' },
  bow:   { id: 'bow',   name: 'ธนู',     range: 260, projectile: 'arrow', scalesWith: 'dex' },
  staff: { id: 'staff', name: 'คฑา',     range: 230, projectile: 'bolt',  scalesWith: 'int' },
  spear: { id: 'spear', name: 'หอก',     range: 135, projectile: null,    scalesWith: 'str' }, // melee, reaches further than a sword
  gun:   { id: 'gun',   name: 'ปืน',     range: 190, projectile: 'bullet', scalesWith: 'dex' }, // mid range
  book:  { id: 'book',  name: 'คัมภีร์',   range: 170, projectile: 'bolt',  scalesWith: 'int' }  // mid-range magic
};

// Base values every character starts from (replaces the old per-class numbers)
export const BASE_STATS = { hp: 150, atk: 12, def: 5, aspd: 1.0 };
export const STAT_KEYS = ['str', 'agi', 'vit', 'dex', 'int', 'luk'];

export const ZONES = [
  {
    id: 'town',
    name: '🏰 Central Town (เมืองหลวง Prontera)',
    desc: 'ลานกลางเมืองหลวง ปลอดภัย มีน้ำพุศักดิ์สิทธิ์ ร้านค้า และผู้คนสัญจร',
    reqLevel: 1,
    isPeaceful: true,
    bgColor: '#cbd5e1',
    floorColor: '#94a3b8',
    monsterIds: []
  },
  {
    id: 'meadows',
    name: '🌱 Green Meadows (ทุ่งหญ้าเริ่มต้น)',
    desc: 'ทุ่งหญ้าเขียวขจี อากาศแจ่มใส เหมาะสำหรับผู้เริ่มต้นฝึกฝน',
    reqLevel: 1,
    bgColor: '#a7f3d0',
    floorColor: '#34d399',
    monsterIds: ['slime', 'forest_hornet', 'horned_rabbit', 'mossy_golem']
  },
  {
    id: 'misty_forest',
    name: '🌲 Misty Forest (ป่าหมอกลึกลับ)',
    desc: 'ป่าทึบที่มีหมอกลงหนาทึบและสัตว์ป่าดุร้าย',
    reqLevel: 16,
    bgColor: '#94a3b8',
    floorColor: '#475569',
    monsterIds: ['wild_boar', 'forest_wolf', 'jungle_viper', 'claw_bear']
  },
  {
    id: 'bandit_hideout',
    name: '🏴‍☠️ Bandit Hideout (ซ่องโจรป่าเขา)',
    desc: 'ค่ายซ่องโจรกลางหุบเขา เหล่าโจร นักธนู และหัวหน้าโจรคอยซุ่มดักผู้มาเยือน',
    reqLevel: 31,
    bgColor: '#fde68a',
    floorColor: '#92400e',
    monsterIds: ['bandit_rogue', 'bandit_archer', 'bandit_brute', 'bandit_leader']
  },
  {
    id: 'goblin_caverns',
    name: '⛏️ Goblin Caverns (ถ้ำก๊อบลินโบราณ)',
    desc: 'ถ้ำลึกใต้ดิน เต็มไปด้วยนักรบก็อบลิน หมอผี และออร์คยักษ์',
    reqLevel: 46,
    bgColor: '#fed7aa',
    floorColor: '#b45309',
    monsterIds: ['goblin_scout', 'fire_imp', 'treant', 'chest_mimic']
  },
  {
    id: 'volcano',
    name: '🌋 Lava Volcano (ภูเขาไฟลาวาเดือด)',
    desc: 'ดินแดนภูเขาไฟ หินบะซอลต์ และธารลาวาร้อนระอุ โกเลมหินยักษ์',
    reqLevel: 61,
    bgColor: '#fecaca',
    floorColor: '#dc2626',
    monsterIds: ['floating_eye', 'spectral_armor', 'mushroom_sporeling', 'baby_fire_wyrm']
  },
  {
    id: 'bone_crypt',
    name: '💀 Bone Crypt (สุสานโครงกระดูก)',
    desc: 'สุสานเก่าแก่ที่เหล่าโครงกระดูกและชุดเกราะวิญญาณเดินตรวจตราอยู่ตลอดเวลา',
    reqLevel: 76,
    bgColor: '#d6d3d1',
    floorColor: '#57534e',
    monsterIds: ['skeleton_warrior', 'skeleton_archer', 'skeleton_mage', 'skeleton_knight']
  },
  {
    id: 'haunted_ruins',
    name: '🏛️ Haunted Ruins (ซากปรักหักพังต้องสาป)',
    desc: 'ซากวิหารโบราณที่เกราะวิญญาณและโกเลมไททันเฝ้าสมบัติมานับพันปี',
    reqLevel: 91,
    bgColor: '#c7d2fe',
    floorColor: '#4338ca',
    monsterIds: []
  }
];

export const MONSTERS = {
  slime: {
    id: 'slime',
    name: 'Poring Slime',
    emoji: '💧',
    level: 1,
    hp: 40,
    atk: 6,
    def: 2,
    exp: 15,
    drops: [
      { itemId: 'sticky_mucus', chance: 0.8 },
      { itemId: 'apple', chance: 0.4 },
      { itemId: 'relic_slime_heart', chance: 0.05, isRelic: true } // 5% chance in demo
    ]
  },
  horned_rabbit: {
    id: 'horned_rabbit',
    name: 'Horned Rabbit',
    emoji: '🐰',
    level: 10,
    hp: 140,
    atk: 18,
    def: 6,
    exp: 55,
    drops: [
      { itemId: 'rabbit_fluff', chance: 0.7 },
      { itemId: 'small_horn', chance: 0.4 },
      { itemId: 'relic_carrot_charm', chance: 0.04, isRelic: true }
    ]
  },
  wild_boar: {
    id: 'wild_boar',
    name: 'Wild Boar',
    emoji: '🐗',
    level: 18,
    hp: 260,
    atk: 32,
    def: 12,
    exp: 110,
    drops: [
      { itemId: 'boar_meat', chance: 0.8 },
      { itemId: 'hard_tusk', chance: 0.35 },
      { itemId: 'relic_boar_crest', chance: 0.04, isRelic: true }
    ]
  },
  forest_wolf: {
    id: 'forest_wolf',
    name: 'Shadow Wolf',
    emoji: '🐺',
    level: 25,
    hp: 420,
    atk: 48,
    def: 18,
    exp: 210,
    drops: [
      { itemId: 'wolf_fur', chance: 0.75 },
      { itemId: 'sharp_fang', chance: 0.4 },
      { itemId: 'relic_alpha_eye', chance: 0.03, isRelic: true }
    ]
  },
  treant: {
    id: 'treant',
    name: 'Elder Treant',
    emoji: '🌲',
    level: 32,
    hp: 750,
    atk: 60,
    def: 30,
    exp: 360,
    drops: [
      { itemId: 'ancient_bark', chance: 0.7 },
      { itemId: 'spirit_amber', chance: 0.3 },
      { itemId: 'relic_heart_of_forest', chance: 0.03, isRelic: true }
    ]
  },
  goblin_scout: {
    id: 'goblin_scout',
    name: 'Goblin Scout',
    emoji: '👺',
    level: 38,
    hp: 950,
    atk: 78,
    def: 35,
    exp: 520,
    drops: [
      { itemId: 'rusty_dagger', chance: 0.65 },
      { itemId: 'cloth_scrap', chance: 0.5 },
      { itemId: 'relic_goblin_badge', chance: 0.025, isRelic: true }
    ]
  },
};

export const ITEMS = {
  // Common / Trash & Materials
  sticky_mucus: { id: 'sticky_mucus', name: 'Sticky Mucus', price: 5, icon: '🧪', type: 'material', desc: 'เมือกเหนียวจากสไลม์ นำไปขายหรือทำน้ำยาได้' },
  apple: { id: 'apple', name: 'Fresh Apple', price: 8, icon: '🍎', type: 'consumable', heal: 30, desc: 'แอปเปิ้ลสด ฟื้นฟู HP 30 หน่วย' },
  green_leaf: { id: 'green_leaf', name: 'Green Leaf', price: 10, icon: '🍃', type: 'material', desc: 'ใบไม้สมุนไพรสด' },
  plant_stem: { id: 'plant_stem', name: 'Plant Stem', price: 15, icon: '🌾', type: 'material', desc: 'ก้านพืชเหนียวทนทาน ใช้คราฟต์เชือกและด้ามดาบ' },
  rabbit_fluff: { id: 'rabbit_fluff', name: 'Rabbit Fluff', price: 20, icon: '🧶', type: 'material', desc: 'ขนกระต่ายนุ่มฟู' },
  small_horn: { id: 'small_horn', name: 'Small Horn', price: 28, icon: '📯', type: 'material', desc: 'เขาเล็กแหลมคม ใช้เป็นส่วนประกอบอาวุธ' },
  boar_meat: { id: 'boar_meat', name: 'Wild Boar Meat', price: 35, icon: '🥩', type: 'consumable', heal: 90, desc: 'เนื้อหมูป่าชุ่มฉ่ำ ฟื้นฟู HP 90 หน่วย' },
  hard_tusk: { id: 'hard_tusk', name: 'Hard Tusk', price: 45, icon: '🦴', type: 'material', desc: 'เขี้ยวหมูป่าแข็งแกร่ง' },
  wolf_fur: { id: 'wolf_fur', name: 'Wolf Fur', price: 60, icon: '🐺', type: 'material', desc: 'ขนหมาป่าสีดำเงา' },
  sharp_fang: { id: 'sharp_fang', name: 'Sharp Fang', price: 80, icon: '🦷', type: 'material', desc: 'เขี้ยวคมกริบของหมาป่าเงามืด' },
  ancient_bark: { id: 'ancient_bark', name: 'Ancient Bark', price: 110, icon: '🪵', type: 'material', desc: 'เปลือกไม้โบราณแข็งดั่งเหล็กกล้า' },
  spirit_amber: { id: 'spirit_amber', name: 'Spirit Amber', price: 150, icon: '🔶', type: 'material', desc: 'อำพันวิญญาณป่า มีพลังธาตุธรรมชาติ' },
  rusty_dagger: { id: 'rusty_dagger', name: 'Rusty Dagger', price: 130, icon: '🗡️', type: 'material', desc: 'มีดขึ้นสนิมของก็อบลิน หลอมเป็นเศษเหล็กได้' },
  cloth_scrap: { id: 'cloth_scrap', name: 'Cloth Scrap', price: 90, icon: '🧣', type: 'material', desc: 'เศษผ้าหยาบ' },
  totem_feather: { id: 'totem_feather', name: 'Totem Feather', price: 180, icon: '🪶', type: 'material', desc: 'ขนนกโทเท็มของหมอผีก็อบลิน' },
  magic_powder: { id: 'magic_powder', name: 'Magic Powder', price: 220, icon: '✨', type: 'material', desc: 'ผงเวทมนตร์เรืองแสง' },
  iron_club_fragment: { id: 'iron_club_fragment', name: 'Iron Club Fragment', price: 260, icon: '🔨', type: 'material', desc: 'ชิ้นส่วนกระบองเหล็กยักษ์' },
  ogre_blood: { id: 'ogre_blood', name: 'Ogre Blood', price: 320, icon: '🩸', type: 'material', desc: 'เลือดออร์คเข้มข้น พลังชีวิตมหาศาล' },
  crystal_shard: { id: 'crystal_shard', name: 'Crystal Shard', price: 400, icon: '💠', type: 'material', desc: 'เศษคริสตัลระยิบระยับ' },
  bat_wing: { id: 'bat_wing', name: 'Bat Wing', price: 300, icon: '🦇', type: 'material', desc: 'ปีกค้างคาวคริสตัล' },
  stone_plate: { id: 'stone_plate', name: 'Stone Plate', price: 500, icon: '🪨', type: 'material', desc: 'แผ่นหินเสริมเวทมนตร์' },
  rune_dust: { id: 'rune_dust', name: 'Rune Dust', price: 650, icon: '🔮', type: 'material', desc: 'ละอองรูนโบราณ' },
  titan_heart: { id: 'titan_heart', name: 'Titan Heart Core', price: 1200, icon: '❤️‍🔥', type: 'material', desc: 'แก่นหัวใจไททันโกเลม แหล่งพลังงานอันทรงพลัง' },
  ancient_alloy: { id: 'ancient_alloy', name: 'Ancient Alloy', price: 950, icon: '🪙', type: 'material', desc: 'โลหะผสมโบราณไร้สนิม' },
  dragon_heart_core: { id: 'dragon_heart_core', name: 'Dragon Heart Core', price: 5000, icon: '🔥', type: 'material', desc: 'หัวใจมังกรบรรพกาล แหล่งพลังงานเพลิงไร้ที่สิ้นสุด' },

  // Potions
  hp_potion_s: { id: 'hp_potion_s', name: 'Red Potion (S)', price: 20, icon: '🧪', type: 'consumable', heal: 60, desc: 'ยาเพิ่มพลังขนาดเล็ก ฟื้นฟู 60 HP' },
  hp_potion_m: { id: 'hp_potion_m', name: 'Red Potion (M)', price: 60, icon: '🧪', type: 'consumable', heal: 200, desc: 'ยาเพิ่มพลังขนาดกลาง ฟื้นฟู 200 HP' },
  hp_potion_l: { id: 'hp_potion_l', name: 'Red Potion (L)', price: 180, icon: '🧪', type: 'consumable', heal: 600, desc: 'ยาเพิ่มพลังขนาดใหญ่ ฟื้นฟู 600 HP' },

  sp_potion_s: { id: 'sp_potion_s', name: 'Blue Potion (S)', price: 30, icon: '💧', type: 'consumable', sp: 40, desc: 'ยาฟื้นฟู SP ขนาดเล็ก ฟื้นฟู 40 SP' },
  sp_potion_m: { id: 'sp_potion_m', name: 'Blue Potion (M)', price: 90, icon: '💧', type: 'consumable', sp: 120, desc: 'ยาฟื้นฟู SP ขนาดกลาง ฟื้นฟู 120 SP' },

  // Starter & staves
  wooden_stick: { id: 'wooden_stick', name: 'Wooden Stick (กิ่งไม้)', type: 'weapon', weaponType: 'stick', atk: 3, def: 0, reqLevel: 1, icon: '🌿', desc: 'กิ่งไม้ที่เก็บได้ข้างทาง อาวุธเริ่มต้นของนักผจญภัย' },
  apprentice_staff: { id: 'apprentice_staff', name: 'Apprentice Staff', type: 'weapon', weaponType: 'staff', atk: 14, def: 0, reqLevel: 8, icon: '🪄', desc: 'คฑาฝึกหัด ยิงลูกพลังเวทได้ไกล (ดาเมจตาม INT)' },
  sage_staff: { id: 'sage_staff', name: 'Sage Staff', type: 'weapon', weaponType: 'staff', atk: 85, def: 6, reqLevel: 30, icon: '🔮', desc: 'คฑานักปราชญ์ ผลึกเวทขยายพลัง INT' },

  // Swords (ดาบ)
  novice_sword: { id: 'novice_sword', name: 'Novice Wooden Sword', type: 'weapon', weaponType: 'sword', atk: 8, def: 0, reqLevel: 1, icon: '🗡️', desc: 'ดาบไม้เริ่มต้น' },
  iron_blade: { id: 'iron_blade', name: 'Iron Broadsword', type: 'weapon', weaponType: 'sword', atk: 25, def: 5, reqLevel: 5, icon: '⚔️', desc: 'ดาบเหล็กมาตรฐาน คมกริบและมั่นคง' },
  wolf_fang_saber: { id: 'wolf_fang_saber', name: 'Fang Saber', type: 'weapon', weaponType: 'sword', atk: 55, def: 8, reqLevel: 15, icon: '🗡️', desc: 'ดาบสลักเขี้ยวหมาป่า ความเร็วโจมตีสูง' },
  goblin_cleaver: { id: 'goblin_cleaver', name: 'Goblin Cleaver', type: 'weapon', weaponType: 'sword', atk: 95, def: 15, reqLevel: 30, icon: '🪓', desc: 'ดาบฟันขนาดใหญ่ของหัวหน้าก็อบลิน' },
  rune_claymore: { id: 'rune_claymore', name: 'Rune Greatsword', type: 'weapon', weaponType: 'sword', atk: 180, def: 30, reqLevel: 45, icon: '✨', desc: 'ดาบยักษ์สลักรูนโบราณ พลังทำลายร้ายกาจ' },
  titan_slayer: { id: 'titan_slayer', name: 'Titan Slayer Edge', type: 'weapon', weaponType: 'sword', atk: 350, def: 60, reqLevel: 60, icon: '⚡', desc: 'สุดยอดดาบปราบไททัน แฝงพลังแห่งปฐพี' },
  dragon_scale_blade: { id: 'dragon_scale_blade', name: 'Dragon Scale Blade (MVP)', type: 'weapon', weaponType: 'sword', atk: 480, def: 80, reqLevel: 75, icon: '🔥⚔️', desc: 'ดาบมังกรในตำนาน หลอมจากเกล็ดมังกรโบราณ ฟันเปลวเพลิงเผาผลาญ' },

  // Bows (ธนู)
  wooden_bow: { id: 'wooden_bow', name: 'Novice Wooden Bow', type: 'weapon', weaponType: 'bow', atk: 12, def: 0, reqLevel: 1, icon: '🏹', desc: 'คันธนูไม้ฝึกหัด สำหรับนักธนูเริ่มต้น' },
  hunter_bow: { id: 'hunter_bow', name: 'Great Hunter Bow', type: 'weapon', weaponType: 'bow', atk: 60, def: 4, reqLevel: 10, icon: '🏹', desc: 'คันธนูพรานป่า ยิงไกลและแม่นยำ' },
  gale_wind_bow: { id: 'gale_wind_bow', name: 'Gale Wing Bow', type: 'weapon', weaponType: 'bow', atk: 175, def: 15, reqLevel: 40, icon: '🍃🏹', desc: 'คันธนูปีกวายุ ยิงศรดั่งสายลมกรรโชก (+10% ASPD)' },
  dragon_bone_bow: { id: 'dragon_bone_bow', name: 'Dragonbone Longbow (MVP)', type: 'weapon', weaponType: 'bow', atk: 460, def: 40, reqLevel: 75, icon: '🐉🏹', desc: 'สุดยอดคันธนูกระดูกมังกร ยิงศรเพลิงทะลวงเป้าหมายอย่างไร้ความปราณี' },

  // Armors
  leather_armor: { id: 'leather_armor', name: 'Leather Tunic', type: 'armor', atk: 0, def: 12, hp: 50, reqLevel: 1, icon: '🥋', desc: 'ชุดหนังฟอกทนทาน ป้องกันพื้นฐาน' },
  wolf_plate: { id: 'wolf_plate', name: 'Wolfguard Armor', type: 'armor', atk: 5, def: 32, hp: 160, reqLevel: 15, icon: '🛡️', desc: 'เกราะเสริมหนังหมาป่า น้ำหนักเบาแต่เหนียวแน่น' },
  knight_cuirass: { id: 'knight_cuirass', name: 'Knight Cuirass', type: 'armor', atk: 12, def: 68, hp: 400, reqLevel: 35, icon: '🦺', desc: 'เกราะอกอัศวินหล่อเหล็กกล้า ป้องกันสูง' },
  titan_aegis_suit: { id: 'titan_aegis_suit', name: 'Titan Aegis Armor', type: 'armor', atk: 25, def: 130, hp: 1000, reqLevel: 60, icon: '🦾', desc: 'เกราะโลหะโบราณ สร้างจากแก่นหัวใจไททัน' }
};

// Rare Unique Relics (1 from each monster) - Collected in the Treasure Compendium for Permanent Stat Buffs
export const RELICS = {
  relic_slime_heart: {
    id: 'relic_slime_heart',
    monsterId: 'slime',
    name: '🫧 Pure Slime Core',
    desc: 'แก่นหัวใจสไลม์บริสุทธิ์ ให้ความยืดหยุ่นแก่ร่างกาย',
    icon: '🔮',
    statBonus: { hp: 80 },
    bonusText: '+80 Max HP ถาวร'
  },
  relic_carrot_charm: {
    id: 'relic_carrot_charm',
    monsterId: 'horned_rabbit',
    name: '🥕 Horned Rabbit Lucky Charm',
    desc: 'เครื่องรางกระต่ายมีเขา เพิ่มความคล่องตัวและโชคชะตา',
    icon: '🐇',
    statBonus: { atk: 8, aspd: 0.05 },
    bonusText: '+8 ATK, +5% ASPD ถาวร'
  },
  relic_boar_crest: {
    id: 'relic_boar_crest',
    monsterId: 'wild_boar',
    name: '🐗 Savage Boar Crest',
    desc: 'ตราแห่งหมูป่าดุร้าย พลังการพุ่งชนไร้สิ่งกีดขวาง',
    icon: '🛡️',
    statBonus: { atk: 12, hp: 150 },
    bonusText: '+12 ATK, +150 HP ถาวร'
  },
  relic_alpha_eye: {
    id: 'relic_alpha_eye',
    monsterId: 'forest_wolf',
    name: '🐺 Eye of the Alpha Wolf',
    desc: 'ดวงตาสีเงินของจ่าฝูงหมาป่า มองทะลุจุดอ่อนของศัตรู',
    icon: '👁️',
    statBonus: { atk: 22, critRate: 0.05 },
    bonusText: '+22 ATK, +5% Crit Rate ถาวร'
  },
  relic_heart_of_forest: {
    id: 'relic_heart_of_forest',
    monsterId: 'treant',
    name: '🌲 Heart of the Ancient Forest',
    desc: 'หัวใจพฤกษาพันปี มอบพลังฟื้นฟูและความทนทาน',
    icon: '💚',
    statBonus: { def: 18, hp: 300 },
    bonusText: '+18 DEF, +300 HP ถาวร'
  },
  relic_goblin_badge: {
    id: 'relic_goblin_badge',
    monsterId: 'goblin_scout',
    name: '🪙 Cunning Goblin Badge',
    desc: 'เหรียญตราก็อบลิน เพิ่มการหาเงินและการเอาตัวรอด',
    icon: '🎖️',
    statBonus: { goldBonus: 0.1, atk: 15 },
    bonusText: '+15 ATK, +10% Gold Drop ถาวร'
  },
  relic_golem_heart: {
    id: 'relic_golem_heart',
    monsterId: 'mossy_golem',
    name: '🪨 Unbreakable Rune Core',
    desc: 'แกนกลางหินรูน ไร้ความเสียหายจากอาวุธทั่วไป',
    icon: '🗿',
    statBonus: { def: 45, hp: 800 },
    bonusText: '+45 DEF, +800 HP ถาวร'
  },
};

// Crafting Recipes
export const CRAFTING_RECIPES = [
  {
    resultItemId: 'apprentice_staff',
    goldCost: 200,
    materials: [
      { itemId: 'green_leaf', count: 5 },
      { itemId: 'plant_stem', count: 3 }
    ]
  },
  {
    resultItemId: 'sage_staff',
    goldCost: 2500,
    materials: [
      { itemId: 'ancient_bark', count: 6 },
      { itemId: 'magic_powder', count: 5 },
      { itemId: 'spirit_amber', count: 4 }
    ]
  },
  {
    resultItemId: 'wooden_bow',
    goldCost: 150,
    materials: [
      { itemId: 'plant_stem', count: 4 },
      { itemId: 'small_horn', count: 2 }
    ]
  },
  {
    resultItemId: 'hunter_bow',
    goldCost: 800,
    materials: [
      { itemId: 'hard_tusk', count: 5 },
      { itemId: 'wolf_fur', count: 6 }
    ]
  },
  {
    resultItemId: 'iron_blade',
    goldCost: 200,
    materials: [
      { itemId: 'stone_plate', count: 3 },
      { itemId: 'small_horn', count: 3 }
    ]
  },
  {
    resultItemId: 'leather_armor',
    goldCost: 250,
    materials: [
      { itemId: 'rabbit_fluff', count: 6 },
      { itemId: 'sticky_mucus', count: 8 }
    ]
  },
  {
    resultItemId: 'wolf_fang_saber',
    goldCost: 800,
    materials: [
      { itemId: 'sharp_fang', count: 5 },
      { itemId: 'hard_tusk', count: 4 },
      { itemId: 'wolf_fur', count: 3 }
    ]
  },
  {
    resultItemId: 'wolf_plate',
    goldCost: 1000,
    materials: [
      { itemId: 'wolf_fur', count: 8 },
      { itemId: 'ancient_bark', count: 3 }
    ]
  },
  {
    resultItemId: 'goblin_cleaver',
    goldCost: 2500,
    materials: [
      { itemId: 'goblin_ear', count: 6 },
      { itemId: 'curved_shiv', count: 3 },
      { itemId: 'crimson_imp_horn', count: 2 }
    ]
  },
  {
    resultItemId: 'knight_cuirass',
    goldCost: 3200,
    materials: [
      { itemId: 'iron_club_fragment', count: 5 },
      { itemId: 'magic_powder', count: 6 }
    ]
  },
  {
    resultItemId: 'rune_claymore',
    goldCost: 7000,
    materials: [
      { itemId: 'stone_plate', count: 6 },
      { itemId: 'luminescent_powder', count: 4 },
      { itemId: 'spectral_steel_ingot', count: 2 }
    ]
  },
  {
    resultItemId: 'titan_slayer',
    goldCost: 15000,
    materials: [
      { itemId: 'golem_core_gem', count: 4 },
      { itemId: 'spectral_steel_ingot', count: 4 },
      { itemId: 'stone_plate', count: 10 }
    ]
  },
  {
    resultItemId: 'titan_aegis_suit',
    goldCost: 20000,
    materials: [
      { itemId: 'titan_heart', count: 4 },
      { itemId: 'stone_plate', count: 12 },
      { itemId: 'ogre_blood', count: 8 }
    ]
  },
  {
    resultItemId: 'novice_sword',
    goldCost: 100,
    materials: [
      { itemId: 'small_horn', count: 2 },
      { itemId: 'sticky_mucus', count: 4 }
    ]
  },
  {
    resultItemId: 'dragon_scale_blade',
    goldCost: 30000,
    materials: [
      { itemId: 'crimson_dragon_scale', count: 6 },
      { itemId: 'smoking_wyrm_horn', count: 2 },
      { itemId: 'tiny_dragon_heart', count: 1 }
    ]
  }
];

// Costume / Fashion Gacha Pool (Can be pulled with Gold earned from farming)
export const GACHA_COSTUMES = [
  {
    id: 'costume_cat_ears',
    name: '🐾 Cozy Cat Ears (หูแมวอบอุ่น)',
    slot: 'head',
    rarity: 'Rare',
    rate: 0.25,
    icon: '🐱',
    visualColor: '#f472b6',
    desc: 'หูแมวสุดน่ารัก ดุ๊กดิ๊กไปตามก้าวเดิน (+3% Move Speed)'
  },
  {
    id: 'costume_straw_hat',
    name: '👒 Farmer Straw Hat (หมวกฟางชิลๆ)',
    slot: 'head',
    rarity: 'Common',
    rate: 0.35,
    icon: '👒',
    visualColor: '#facc15',
    desc: 'หมวกฟางกันแดด เหมาะแก่การปล่อยบอทใต้ร่มไม้ (+2% EXP)'
  },
  {
    id: 'costume_sakura_kimono',
    name: '🌸 Blossom Haori (ฮาโอริซากุระ)',
    slot: 'body',
    rarity: 'Epic',
    rate: 0.18,
    icon: '👘',
    visualColor: '#fb7185',
    desc: 'ชุดคลุมลายซากุระปลิวไสว สวยสง่างาม (+5% Gold)'
  },
  {
    id: 'costume_angel_wings',
    name: '🪽 Seraph Wings (ปีกเทวทูตเรืองรอง)',
    slot: 'back',
    rarity: 'Epic',
    rate: 0.14,
    icon: '🪽',
    visualColor: '#38bdf8',
    desc: 'ปีกสีขาวบริสุทธิ์ เปล่งประกายแสงสว่างยามก้าวเดิน (+5% ATK)'
  },
  {
    id: 'costume_celestial_blade',
    name: '🌌 Starlight Katana (คาตานะละอองดาว)',
    slot: 'weapon_skin',
    rarity: 'Legendary',
    rate: 0.08,
    icon: '✨🗡️',
    visualColor: '#a855f7',
    desc: 'อาวุธแฟชั่นในตำนาน ตวัดดาบพร้อมประกายดาวตกหลากสี (+8% ASPD)'
  }
];

// Quests System
export const QUESTS = [
  {
    id: 'q1',
    title: '🌿 การเริ่มต้นของผู้กล้า',
    desc: 'ปราบ Poring Slime 5 ตัว ในทุ่งหญ้าเริ่มต้น',
    targetMonster: 'slime',
    requiredCount: 5,
    rewardGold: 100,
    rewardExp: 80,
    rewardTokens: 1
  },
  {
    id: 'q2',
    title: '🐝 กำจัดแตนป่วนทุ่ง',
    desc: 'ปราบ Forest Hornet 8 ตัว',
    targetMonster: 'forest_hornet',
    requiredCount: 8,
    rewardGold: 250,
    rewardExp: 200,
    rewardTokens: 1
  },
  {
    id: 'q3',
    title: '🐰 กระต่ายเขาแหลม',
    desc: 'ปราบ Horned Rabbit 10 ตัว',
    targetMonster: 'horned_rabbit',
    requiredCount: 10,
    rewardGold: 600,
    rewardExp: 550,
    rewardTokens: 2
  },
  {
    id: 'q4',
    title: '🌲 ภัยคุกคามในป่าหมอก',
    desc: 'ปราบ Shadow Wolf 12 ตัว ในป่า Misty Forest',
    targetMonster: 'forest_wolf',
    requiredCount: 12,
    rewardGold: 1500,
    rewardExp: 2400,
    rewardTokens: 3
  },
  {
    id: 'q5',
    title: '👺 ขับไล่ฝูงก็อบลิน',
    desc: 'ปราบ Goblin Scout 15 ตัว ใน Goblin Ruins',
    targetMonster: 'goblin_scout',
    requiredCount: 15,
    rewardGold: 4000,
    rewardExp: 7500,
    rewardTokens: 5
  }
];

// ==========================================
// 4. REFINEMENT & ENCHANTING SYSTEM SPECIFICATION (+1 to +10)
// Documented Specification for Future Implementation
// ==========================================
export const REFINEMENT_SPEC = {
  maxLevel: 10,
  safeLevels: {
    weapon: 4, // Weapons are 100% safe up to +4
    armor: 4   // Armors are 100% safe up to +4
  },
  materials: {
    weapon: {
      tier1: { id: 'phracon', name: 'Phracon (สำหรับอาวุธขั้นต่ำ)' },
      tier2: { id: 'oridecon', name: 'Oridecon (โอริเดคอน สำหรับอาวุธขั้นสูง)' }
    },
    armor: {
      tier1: { id: 'emveretarcon', name: 'Emveretarcon' },
      tier2: { id: 'elunium', name: 'Elunium (อีลูเนียม สำหรับชุดเกราะ)' }
    }
  },
  rates: [
    { level: 1, successRate: 1.00, weaponAtkBonus: 5, armorDefBonus: 3, breakOnFail: false },
    { level: 2, successRate: 1.00, weaponAtkBonus: 10, armorDefBonus: 6, breakOnFail: false },
    { level: 3, successRate: 1.00, weaponAtkBonus: 15, armorDefBonus: 9, breakOnFail: false },
    { level: 4, successRate: 1.00, weaponAtkBonus: 20, armorDefBonus: 12, breakOnFail: false },
    { level: 5, successRate: 0.80, weaponAtkBonus: 30, armorDefBonus: 18, breakOnFail: true },
    { level: 6, successRate: 0.60, weaponAtkBonus: 45, armorDefBonus: 26, breakOnFail: true },
    { level: 7, successRate: 0.45, weaponAtkBonus: 65, armorDefBonus: 36, breakOnFail: true },
    { level: 8, successRate: 0.30, weaponAtkBonus: 95, armorDefBonus: 50, breakOnFail: true },
    { level: 9, successRate: 0.20, weaponAtkBonus: 135, armorDefBonus: 70, breakOnFail: true },
    { level: 10, successRate: 0.10, weaponAtkBonus: 200, armorDefBonus: 100, breakOnFail: true }
  ]
};

// ==========================================
// 5. PET & MONSTER TAMING SYSTEM SPECIFICATION
// Documented Specification for Future Implementation
// ==========================================
export const PET_TAMING_SPEC = {
  description: 'ระบบจับสัตว์เลี้ยงจากมอนสเตอร์ในแผนที่ด้วยไอเทมเหยื่อล่อ (Taming Items)',
  tamingMechanic: 'Slot Machine Roulette / Click Timing เมื่อโยนไอเทมเหยื่อใส่เป้าหมาย',
  hungerStages: ['Starving (หิวโหย)', 'Hungry (หิว)', 'Neutral (ปกติ)', 'Satisfied (อิ่ม)', 'Stuffed (อิ่มแปล้)'],
  loyaltyStages: ['Awkward (เขินอาย)', 'Shy (ขี้อาย)', 'Neutral (เป็นมิตร)', 'Cordial (สนิทสนม)', 'Loyal (จงรักภักดีสูงสุด)'],
  tameableMonsters: [
    {
      monsterId: 'slime',
      petName: 'Baby Poring',
      tamingItem: { id: 'unripe_apple', name: 'Unripe Apple (แอปเปิ้ลดิบ)', icon: '🍏' },
      foodItem: { id: 'apple_juice', name: 'Apple Juice (น้ำแอปเปิ้ล)' },
      tameChance: 0.30,
      passiveBonus: { luk: 5, critRate: 0.03 },
      bonusDesc: '+5 LUK, +3% Critical Rate เมื่อจงรักภักดี'
    },
    {
      monsterId: 'horned_rabbit',
      petName: 'Fluffy Lunatic',
      tamingItem: { id: 'rainbow_carrot', name: 'Rainbow Carrot (แครอทสายรุ้ง)', icon: '🥕' },
      foodItem: { id: 'carrot_juice', name: 'Carrot Juice (น้ำแครอท)' },
      tameChance: 0.25,
      passiveBonus: { aspd: 0.08, flee: 10 },
      bonusDesc: '+8% ASPD, +10 Flee หลบหลีก'
    },
    {
      monsterId: 'forest_wolf',
      petName: 'Baby Wolf Pup',
      tamingItem: { id: 'wolf_meat_bone', name: 'Meaty Bone (กระดูกติดเนื้อ)', icon: '🍖' },
      foodItem: { id: 'pet_meat', name: 'Pet Food Meat' },
      tameChance: 0.15,
      passiveBonus: { atk: 35, critDmg: 0.12 },
      bonusDesc: '+35 ATK, +12% Critical Damage'
    }
  ]
};


// Monster behaviour, run by the server (px/second, px). Anything missing falls back to MONSTER_AI_DEFAULT.
// speed 0 = never moves (still attacks anyone within attackRange).
export const MONSTER_AI_DEFAULT = {
  speed: 60,         // walking/chasing speed
  aggro: 200,        // sees players within this range and attacks them
  attackRange: 60,   // distance at which it can hit
  attackCooldown: 1.6,
  leash: 650,        // gives up and walks home if it is this far from its spawn
  wanderRadius: 140  // random strolling around its spawn when idle
};
export const MONSTER_AI = {
  slime:          { speed: 45,  aggro: 150 },
  horned_rabbit:  { speed: 95,  aggro: 220 },
  wild_boar:      { speed: 110, aggro: 260 },
  forest_wolf:    { speed: 130, aggro: 300, attackCooldown: 1.3 },
  treant:         { speed: 50,  aggro: 200, attackRange: 80 },
  goblin_scout:   { speed: 105, aggro: 260 },
};

installCatalog({ MONSTERS, ITEMS, MONSTER_AI });
pruneItems({ MONSTERS, ITEMS, CRAFTING_RECIPES });
installWeapons(ITEMS); // all weapon types (sword/staff/bow/spear/gun/book); not sold or crafted yet
applyFacing(MONSTERS);
finishDrops({ MONSTERS, RELICS, ITEMS });

// Skill data (draft; the game does not run skills yet). Edited in Studio, see docs/SKILLS.md
export const SKILLS = JSON.parse(JSON.stringify(SKILL_DEFAULTS));

// Sound effects (synth recipes). Edited in Studio, played by audio.js
export { SOUNDS, SOUND_META } from './sounds.js';

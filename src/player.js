// Player State & Logic Handler (classless: power comes from stats, weapon and (later) skills)
import { ITEMS, RELICS, WEAPON_TYPES, BASE_STATS, STAT_KEYS, SKILLS } from './data.js';

export const HP_POTION_IDS = ['hp_potion_s', 'hp_potion_m', 'hp_potion_l']; // weakest first
export const SP_POTION_IDS = ['sp_potion_s', 'sp_potion_m', 'sp_potion_l'];
export const SKILL_SLOTS = 4;     // skills usable at once (passives take a slot too)
export const GACHA_SINGLE = 500;   // gold per skill-book pull
export const GACHA_PACK = 4500;    // gold for 10 pulls

// Does the held weapon satisfy a skill's weapon requirement?
export function weaponMatches(req, weaponType) {
  if (!req || req === 'any') return true;
  if (req === 'melee') return weaponType === 'fist' || weaponType === 'stick' || weaponType === 'sword' || weaponType === 'spear';
  return req === weaponType;
}

const SAVE_KEY = 'cozy_rpg_save_v2';
const OLD_SAVE_KEY = 'cozy_rpg_save_v1';
const HOTBAR_SIZE = 4;

// No login yet: every new character gets a random name (kept in the save)
const NAME_ADJ = ['Brave', 'Swift', 'Lucky', 'Calm', 'Wild', 'Merry', 'Bold', 'Tiny', 'Sunny', 'Misty'];
const NAME_NOUN = ['Fox', 'Owl', 'Wolf', 'Bear', 'Hare', 'Crow', 'Deer', 'Lynx', 'Wren', 'Otter'];
export function randomName() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  return `${pick(NAME_ADJ)}${pick(NAME_NOUN)}${Math.floor(10 + Math.random() * 90)}`;
}

// TESTING: put every sword in the bag and let it be equipped at any level.
// Set to false to go back to normal (level-gated, drops/crafting only).
export const TEST_ALL_SWORDS = true;
// TESTING: also put every outfit / shield / mount in the bag. Set to false for normal play.
export const TEST_ALL_GEAR = true;

// Equipment slots: weapon = right hand, offhand = left hand (shield), outfit = whole look, pet, mount
export const EQUIP_SLOTS = ['hat', 'hair', 'face', 'mouth', 'head', 'outfit', 'back', 'weapon', 'offhand', 'pet', 'mount'];
const SLOT_OF = { weapon: 'weapon', shield: 'offhand', hat: 'hat', hair: 'hair', face: 'face', mouth: 'mouth', head: 'head', outfit: 'outfit', back: 'back', armor: 'outfit', pet: 'pet', mount: 'mount' };

export class Player {
  constructor() {
    this.name = randomName();
    this.baseLevel = 1;
    this.baseExp = 0;

    // Stat points
    this.stats = {
      str: 5, // melee ATK (stick/sword/fist)
      agi: 5, // attack speed & flee
      vit: 5, // max HP & DEF
      dex: 5, // bow ATK & accuracy
      int: 5, // staff (magic) ATK
      luk: 5  // crit rate & drop luck
    };
    this.statPoints = 0;

    // Current HP
    this.currentHp = 150;

    // Currencies
    this.gold = 500;
    this.gachaTokens = 5;

    // Inventory: { [itemId]: count }
    this.inventory = {
      hp_potion_s: 10
    };

    // Equipment: item id or null
    this.equipment = {
      hat: null,
      hair: null,
      face: null,
      mouth: null,
      head: 'head_0',
      outfit: 'outfit_knight',
      back: null,               // wings / cape
      weapon: 'wooden_stick',   // right hand
      offhand: null,            // left hand (shield)
      pet: null,
      mount: null
    };
    this.isMounted = false;     // riding the equipped mount (toggle with R)

    // Item Enhancements (+1 to +25 and unlocked option slots): itemId -> { level: 0, options: [] }
    this.itemEnhancements = {};

    // Hotbar slots 1-9: skill/item ids the player assigns (empty for now)
    this.hotbar = new Array(HOTBAR_SIZE).fill(null);

    // Costumes: cosmetic ids
    this.costumes = {
      head: null,
      body: null,
      back: null,
      weapon_skin: null
    };
    this.unlockedCostumes = [];

    // Treasure Relics unlocked: array of relicIds
    this.collectedRelics = [];

    // Quest Tracking: { [questId]: { progress: 0, completed: false, claimed: false } }
    this.questProgress = {};

    // Settings
    this.autoBattle = true;
    // Auto-hunt settings (range is in tiles / "ช่อง")
    this.auto = {
      range: 12,               // search radius in tiles
      disabledMonsters: {},    // templateId -> true means "don't attack"
      pickup: false,           // Auto walks over to dropped items (not needed with a worn pet: it fetches them)
      hpPotion: { enabled: true, percent: 45, itemId: null }, // itemId null = cheapest usable potion
      spPotion: { enabled: true, percent: 25, itemId: null }
    };
    // Quick potion slot for HP (SP slot arrives together with skills)
    this.hpPotionSlot = null;
    this.spPotionSlot = null;

    // Skills: learned ids, skill books in the bag { skillId: count }, 4-slot loadout, SP, timed buffs
    this.learnedSkills = {};
    this.skillBooks = {};
    this.skillLoadout = new Array(SKILL_SLOTS).fill(null);
    this.skillCd = {};          // skillId -> seconds left (not saved)
    this.activeBuffs = {};      // skillId -> seconds left (not saved)
    this.currentSp = 0;

    // Load saved data if exists
    this.currentSp = this.maxSp;
    this.loadFromStorage();
  }

  // What the equipped weapon lets you do (range, projectile, which stat it scales with)
  get weaponInfo() {
    const item = ITEMS[this.equipment.weapon];
    const type = (item && item.weaponType) || 'fist';
    const def = WEAPON_TYPES[type] || WEAPON_TYPES.fist;
    return {
      type: def.id,
      range: item && item.range ? item.range : def.range,
      projectile: def.projectile,
      scalesWith: def.scalesWith
    };
  }

  get attackRange() {
    return this.weaponInfo.range;
  }

  // Calculate Base EXP needed for next level
  get maxBaseExp() {
    return Math.floor(60 * Math.pow(this.baseLevel, 1.8) + this.baseLevel * 25);
  }

  // Sum of a bonus key (e.g. 'bonusAtkPct') from equipped passives (weapon must match) and running buffs
  skillBonus(key) {
    let sum = 0;
    const wt = this.weaponInfo.type;
    for (const id of this.skillLoadout) {
      const s = id && this.learnedSkills[id] && SKILLS[id];
      if (s && s.kind === 'passive' && s[key] && weaponMatches(s.weapon, wt)) sum += s[key];
    }
    for (const id of Object.keys(this.activeBuffs)) {
      const s = SKILLS[id];
      if (s && this.activeBuffs[id] > 0 && s[key]) sum += s[key];
    }
    return sum;
  }

  // Option stat bonus from all worn equipment
  gearOptionBonus(statKey) {
    let sum = 0;
    const slots = ['weapon', 'offhand', 'outfit', 'back', 'hat', 'hair', 'face', 'mouth', 'head', 'pet', 'mount'];
    for (const slot of slots) {
      const itId = this.equipment[slot];
      if (!itId) continue;
      const enh = this.getItemEnhance(itId);
      if (enh && Array.isArray(enh.options)) {
        for (const opt of enh.options) {
          if (opt && opt.stat === statKey) {
            sum += (opt.value || 0);
          }
        }
      }
    }
    return sum;
  }

  // Base stat + bonus from equipment options
  totalStat(statKey) {
    return (this.stats[statKey] || 0) + this.gearOptionBonus(statKey);
  }

  // Item Enhancement System (+1 to +25)
  getItemEnhance(itemId) {
    if (!itemId) return { level: 0, options: [] };
    if (!this.itemEnhancements) this.itemEnhancements = {};
    const d = this.itemEnhancements[itemId];
    if (!d) return { level: 0, options: [] };
    return {
      level: Math.max(0, Math.min(25, d.level || 0)),
      options: Array.isArray(d.options) ? d.options : []
    };
  }

  getUnlockedOptionSlots(level) {
    return Math.min(5, Math.floor((level || 0) / 5));
  }

  getEnhanceRate(level) {
    if (level < 5) return 100;
    if (level < 10) return 85;
    if (level < 15) return 70;
    if (level < 20) return 50;
    return 30;
  }

  getEnhanceCost(level) {
    const tier = Math.floor(level / 5) + 1;
    return 150 * (level + 1) * tier;
  }

  _rollOptionValue() {
    const r = Math.random() * 100;
    if (r < 35) return 1;
    if (r < 65) return 2;
    if (r < 85) return 3;
    if (r < 95) return 4;
    return 5;
  }

  enhanceItem(itemId) {
    if (!itemId || !ITEMS[itemId]) return { ok: false, reason: 'ไม่พบข้อมูลไอเท็ม' };
    if (!this.itemEnhancements) this.itemEnhancements = {};
    if (!this.itemEnhancements[itemId]) {
      this.itemEnhancements[itemId] = { level: 0, options: [] };
    }
    const enh = this.itemEnhancements[itemId];
    if (enh.level >= 25) return { ok: false, reason: 'ไอเท็มชิ้นนี้ถึงระดับสูงสุด (+25) แล้ว' };
    const cost = this.getEnhanceCost(enh.level);
    if (this.gold < cost) return { ok: false, reason: `ทองไม่พอ (ต้องการ 🪙 ${cost.toLocaleString()} Gold)` };

    this.gold -= cost;
    const rate = this.getEnhanceRate(enh.level);
    const roll = Math.random() * 100;
    const prevSlots = this.getUnlockedOptionSlots(enh.level);

    if (roll < rate) {
      enh.level++;
      const newSlots = this.getUnlockedOptionSlots(enh.level);
      let unlockedNewSlot = false;
      if (newSlots > prevSlots) {
        unlockedNewSlot = true;
        const statPool = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
        const stat = statPool[Math.floor(Math.random() * statPool.length)];
        const value = this._rollOptionValue();
        if (!enh.options) enh.options = [];
        enh.options.push({ stat, value });
      }
      this.saveToStorage();
      return { ok: true, success: true, newLevel: enh.level, unlockedNewSlot, cost };
    } else {
      this.saveToStorage();
      return { ok: true, success: false, level: enh.level, reason: 'ตีบวกล้มเหลว ระดับไม่ลดลง', cost };
    }
  }

  getOptionRerollCost(slotIndex = null) {
    return slotIndex !== null ? 400 : 1200;
  }

  rerollItemOptionSlot(itemId, slotIndex) {
    if (!itemId || !ITEMS[itemId]) return { ok: false, reason: 'ไม่พบไอเท็ม' };
    const enh = this.getItemEnhance(itemId);
    const unlocked = this.getUnlockedOptionSlots(enh.level);
    if (slotIndex >= unlocked) return { ok: false, reason: `ช่องที่ ${slotIndex + 1} ยังไม่ปลดล็อก (ต้องตีบวกถึง +${(slotIndex + 1) * 5})` };
    const cost = this.getOptionRerollCost(slotIndex);
    if (this.gold < cost) return { ok: false, reason: `ทองไม่พอ (ต้องการ 🪙 ${cost.toLocaleString()} Gold)` };

    this.gold -= cost;
    if (!this.itemEnhancements[itemId]) this.itemEnhancements[itemId] = { level: enh.level, options: [] };
    const curEnh = this.itemEnhancements[itemId];
    if (!curEnh.options) curEnh.options = [];
    while (curEnh.options.length < unlocked) {
      curEnh.options.push({ stat: 'str', value: 1 });
    }

    const statPool = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
    const stat = statPool[Math.floor(Math.random() * statPool.length)];
    const value = this._rollOptionValue();
    curEnh.options[slotIndex] = { stat, value };

    this.saveToStorage();
    return { ok: true, option: { stat, value }, cost };
  }

  rerollAllItemOptions(itemId) {
    if (!itemId || !ITEMS[itemId]) return { ok: false, reason: 'ไม่พบไอเท็ม' };
    const enh = this.getItemEnhance(itemId);
    const unlocked = this.getUnlockedOptionSlots(enh.level);
    if (unlocked === 0) return { ok: false, reason: 'ไอเท็มนี้ยังไม่มีช่อง Option ที่ปลดล็อก (ต้องตีบวกอย่างน้อย +5)' };
    const cost = this.getOptionRerollCost(null);
    if (this.gold < cost) return { ok: false, reason: `ทองไม่พอ (ต้องการ 🪙 ${cost.toLocaleString()} Gold)` };

    this.gold -= cost;
    if (!this.itemEnhancements[itemId]) this.itemEnhancements[itemId] = { level: enh.level, options: [] };
    const curEnh = this.itemEnhancements[itemId];
    curEnh.options = [];

    const statPool = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
    for (let i = 0; i < unlocked; i++) {
      const stat = statPool[Math.floor(Math.random() * statPool.length)];
      const value = this._rollOptionValue();
      curEnh.options.push({ stat, value });
    }

    this.saveToStorage();
    return { ok: true, options: curEnh.options, cost };
  }

  // SP: 30 + level×2 + INT×4 (+ Max SP% skills)
  get maxSp() {
    return Math.floor((30 + this.baseLevel * 2 + this.totalStat('int') * 4) * (1 + this.skillBonus('bonusSpPct') / 100));
  }

  get spRegen() { return parseFloat((1 + this.totalStat('int') * 0.1).toFixed(2)); }       // SP per second

  // Sum of a stat over the worn outfit + gear items (+1% effectiveness per refine level)
  gearSum(key) {
    let s = 0;
    for (const slot of ['hat', 'outfit', 'back', 'offhand', 'hair', 'face', 'mouth', 'head']) {
      const itId = this.equipment[slot];
      const it = itId && ITEMS[itId];
      if (it && it[key]) {
        const enh = this.getItemEnhance(itId);
        const mult = 1 + (enh.level * 0.01);
        s += Math.round((it[key] || 0) * mult);
      }
    }
    return s;
  }

  get mountItem() { return this.equipment.mount ? ITEMS[this.equipment.mount] || null : null; }
  get riding() { return !!(this.isMounted && this.mountItem); }

  // Mount up / get off (needs a mount in the mount slot)
  toggleMount() {
    if (!this.mountItem) return false;
    this.isMounted = !this.isMounted;
    this.saveToStorage();
    return true;
  }

  // Move speed: +0.3% per AGI (cap +40%) plus skill bonuses. AGI 5 => +1.5%, AGI 100 => +30%.
  get moveMul() {
    const agiBonus = Math.min(0.4, this.totalStat('agi') * 0.003);
    let mountSpeed = 0;
    if (this.riding && this.mountItem) {
      const enh = this.getItemEnhance(this.equipment.mount);
      const mult = 1 + (enh.level * 0.01);
      mountSpeed = ((this.mountItem.speedPct || 0) * mult) / 100;
    }
    const speed = 1 + agiBonus + this.skillBonus('bonusMovePct') / 100 + mountSpeed;
    return parseFloat(speed.toFixed(4));
  }

  // Calculate Total Combined Stats
  get maxHp() {
    let hp = BASE_STATS.hp + (this.baseLevel * 25) + (this.totalStat('vit') * 18);
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.hp) hp += relic.statBonus.hp;
    });
    hp += this.gearSum('hp');
    return Math.floor(hp * (1 + this.skillBonus('bonusHpPct') / 100));
  }

  get attack() { return this._atkFor(this.weaponInfo.scalesWith, true); }

  // Display-only: physical ATK (str/dex) and magic MATK (int); the equipped weapon's ATK counts toward the one it scales with
  get displayAtk() {
    const m = this.weaponInfo.scalesWith;
    return this._atkFor(m === 'int' ? 'str' : m, m !== 'int');
  }
  get displayMatk() { return this._atkFor('int', this.weaponInfo.scalesWith === 'int'); }

  // Crit damage multiplier (fixed for now)
  get critDamage() { return 1.6; }

  _atkFor(main, withWeapon) {
    const sub = main === 'dex' ? 'str' : 'dex';
    let atk = BASE_STATS.atk + (this.totalStat(main) * 3) + this.totalStat(sub) + Math.floor(this.baseLevel * 1.5);
    if (withWeapon && this.equipment.weapon && ITEMS[this.equipment.weapon]) {
      const enh = this.getItemEnhance(this.equipment.weapon);
      const mult = 1 + (enh.level * 0.01);
      atk += Math.round((ITEMS[this.equipment.weapon].atk || 0) * mult);
    }
    atk += this.gearSum('atk');
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.atk) atk += relic.statBonus.atk;
    });
    if (this.costumes.back === 'costume_angel_wings') atk = Math.floor(atk * 1.05);
    return Math.floor(atk * (1 + this.skillBonus('bonusAtkPct') / 100));
  }

  get defense() {
    let def = BASE_STATS.def + (this.totalStat('vit') * 1.5);
    if (this.equipment.weapon && ITEMS[this.equipment.weapon]) {
      const enh = this.getItemEnhance(this.equipment.weapon);
      const mult = 1 + (enh.level * 0.01);
      def += Math.round((ITEMS[this.equipment.weapon].def || 0) * mult);
    }
    def += this.gearSum('def');
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.def) def += relic.statBonus.def;
    });
    return Math.floor(def * (1 + this.skillBonus('bonusDefPct') / 100));
  }

  get aspd() {
    let speed = BASE_STATS.aspd + (this.totalStat('agi') * 0.015);
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.aspd) speed += relic.statBonus.aspd;
    });
    if (this.costumes.weapon_skin === 'costume_celestial_blade') speed += 0.08;
    speed *= 1 + this.skillBonus('bonusAspdPct') / 100;
    return parseFloat(speed.toFixed(2));
  }

  get critRate() {
    let rate = 0.05 + (this.totalStat('luk') * 0.005);
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.critRate) rate += relic.statBonus.critRate;
    });
    rate += this.skillBonus('bonusCritPct') / 100;
    return parseFloat(Math.min(0.75, rate).toFixed(4));
  }

  // Gain EXP (levels gate rare gear; each level gives stat points)
  gainExp(baseExp) {
    let leveledUp = false;

    if (this.costumes.head === 'costume_straw_hat') {
      baseExp = Math.floor(baseExp * 1.02);
    }

    this.baseExp += baseExp;
    while (this.baseExp >= this.maxBaseExp) {
      this.baseExp -= this.maxBaseExp;
      this.baseLevel++;
      this.statPoints += 4;
      this.currentHp = this.maxHp;
      this.currentSp = this.maxSp;
      leveledUp = true;
    }

    this.saveToStorage();
    return { base: leveledUp };
  }

  // Allocate Stat
  allocateStat(statKey) {
    if (this.statPoints > 0 && this.stats[statKey] !== undefined) {
      this.stats[statKey]++;
      this.statPoints--;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Reset all allocated stats back to base and refund the points (free for now)
  resetStats() {
    let refund = 0;
    STAT_KEYS.forEach(k => { refund += Math.max(0, this.stats[k] - 5); this.stats[k] = 5; });
    this.statPoints += refund;
    this.currentHp = Math.min(this.currentHp, this.maxHp);
    this.saveToStorage();
    return refund;
  }

  // Inventory Management
  addItem(itemId, count = 1) {
    if (RELICS[itemId]) {
      // It's a rare relic!
      if (!this.collectedRelics.includes(itemId)) {
        this.collectedRelics.push(itemId);
        this.saveToStorage();
        return { isRelic: true, relic: RELICS[itemId] };
      }
      return { isRelic: true, duplicate: true };
    }

    if (!this.inventory[itemId]) {
      this.inventory[itemId] = 0;
    }
    this.inventory[itemId] += count;
    this.saveToStorage();
    return { isRelic: false };
  }

  removeItem(itemId, count = 1) {
    if (this.inventory[itemId] && this.inventory[itemId] >= count) {
      this.inventory[itemId] -= count;
      if (this.inventory[itemId] <= 0) {
        delete this.inventory[itemId];
      }
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Returns { ok, reason }. Rare gear needs a minimum character level.
  equipItem(itemId) {
    const item = ITEMS[itemId];
    if (!item || !SLOT_OF[item.type]) return { ok: false, reason: 'ไม่ใช่อุปกรณ์' };
    if (!TEST_ALL_SWORDS && item.reqLevel && this.baseLevel < item.reqLevel) {
      return { ok: false, reason: `ต้องการเลเวล ${item.reqLevel} ขึ้นไป (ตอนนี้ Lv.${this.baseLevel})` };
    }
    const slot = SLOT_OF[item.type];
    const prevId = this.equipment[slot];

    // Return previously equipped item to bag if different
    if (prevId && prevId !== itemId) {
      this.inventory[prevId] = (this.inventory[prevId] || 0) + 1;
    }

    // Assign new equipment
    this.equipment[slot] = itemId;

    // Deduct newly equipped item from bag/inventory so it moves to equipped slot
    if (this.inventory[itemId]) {
      this.inventory[itemId]--;
      if (this.inventory[itemId] <= 0) delete this.inventory[itemId];
    }

    // Automatically enable riding when a mount is equipped
    if (slot === 'mount') {
      this.isMounted = true;
    }

    this.saveToStorage();
    return { ok: true };
  }

  // HP potions currently in the bag (weakest first)
  ownedHpPotions() {
    return HP_POTION_IDS.filter(id => this.inventory[id] > 0 && ITEMS[id] && ITEMS[id].heal > 0);
  }

  // Drink a specific potion, or the weakest one owned when itemId is not given/owned
  usePotion(itemId = null) {
    const id = (itemId && this.inventory[itemId] > 0) ? itemId : this.ownedHpPotions()[0];
    if (!id) return null;
    const item = ITEMS[id];
    this.removeItem(id, 1);
    const healAmt = item.heal || 50;
    this.currentHp = Math.min(this.maxHp, this.currentHp + healAmt);
    return { healed: healAmt, itemName: item.name, itemId: id };
  }

  // Use any item that has a use-effect (heal HP / restore SP / gain EXP). Effects come from the item data, editable in Studio.
  useItem(itemId) {
    const item = ITEMS[itemId];
    if (!item || item.type === 'material' || !this.inventory[itemId] || this.inventory[itemId] <= 0) return null;
    if (!(item.heal > 0 || item.sp > 0 || item.exp > 0)) return null;
    this.removeItem(itemId, 1);
    const res = { itemName: item.name, itemId, healed: 0, restored: 0, exp: 0 };
    if (item.heal > 0) { const b = this.currentHp; this.currentHp = Math.min(this.maxHp, b + item.heal); res.healed = this.currentHp - b; }
    if (item.sp > 0) { const b = this.currentSp; this.currentSp = Math.min(this.maxSp, b + item.sp); res.restored = this.currentSp - b; }
    if (item.exp > 0) { this.gainExp(item.exp); res.exp = item.exp; }
    return res;
  }

  ownedSpPotions() {
    return SP_POTION_IDS.filter(id => this.inventory[id] > 0 && ITEMS[id] && ITEMS[id].sp > 0);
  }

  useSpPotion(itemId = null) {
    const id = (itemId && this.inventory[itemId] > 0 && ITEMS[itemId]?.sp) ? itemId : this.ownedSpPotions()[0];
    if (!id) return null;
    const item = ITEMS[id];
    this.removeItem(id, 1);
    this.currentSp = Math.min(this.maxSp, this.currentSp + item.sp);
    return { restored: item.sp, itemName: item.name, itemId: id };
  }

  useExpPotion(itemId) {
    if (!itemId || !this.inventory[itemId] || this.inventory[itemId] <= 0) return null;
    const item = ITEMS[itemId];
    if (!item || !item.exp) return null;
    this.removeItem(itemId, 1);
    this.gainExp(item.exp);
    return { exp: item.exp, itemName: item.name, itemId };
  }

  // ---- skills ----
  tickSkills(dt) {
    this.currentSp = Math.min(this.maxSp, this.currentSp + this.spRegen * dt);
    for (const id of Object.keys(this.skillCd)) if (this.skillCd[id] > 0) this.skillCd[id] = Math.max(0, this.skillCd[id] - dt);
    for (const id of Object.keys(this.activeBuffs)) {
      this.activeBuffs[id] -= dt;
      if (this.activeBuffs[id] <= 0) delete this.activeBuffs[id];
    }
    if (this.currentHp > this.maxHp) this.currentHp = this.maxHp;
  }

  addBook(skillId, n = 1) {
    this.skillBooks[skillId] = (this.skillBooks[skillId] || 0) + n;
    this.saveToStorage();
  }

  // Read a book: only when the skill is not learned yet (the book is consumed)
  learnSkill(skillId) {
    if (!SKILLS[skillId]) return { ok: false, reason: 'ไม่มีสกิลนี้' };
    if (this.learnedSkills[skillId]) return { ok: false, reason: 'เรียนสกิลนี้แล้ว' };
    if (!(this.skillBooks[skillId] > 0)) return { ok: false, reason: 'ไม่มีสมุดสกิลนี้' };
    this.skillBooks[skillId]--;
    if (this.skillBooks[skillId] <= 0) delete this.skillBooks[skillId];
    this.learnedSkills[skillId] = true;
    const free = this.skillLoadout.indexOf(null);
    if (free >= 0) this.skillLoadout[free] = skillId;
    this.saveToStorage();
    return { ok: true };
  }

  sellBook(skillId) {
    if (!(this.skillBooks[skillId] > 0) || !SKILLS[skillId]) return 0;
    const price = SKILLS[skillId].bookSellPrice || 0;
    this.skillBooks[skillId]--;
    if (this.skillBooks[skillId] <= 0) delete this.skillBooks[skillId];
    this.gold += price;
    this.saveToStorage();
    return price;
  }

  // Put a learned skill in loadout slot (0-3); null clears. A skill sits in one slot only.
  setLoadout(slot, skillId) {
    if (slot < 0 || slot >= SKILL_SLOTS) return false;
    if (skillId && !this.learnedSkills[skillId]) return false;
    if (skillId) this.skillLoadout = this.skillLoadout.map(s => (s === skillId ? null : s));
    this.skillLoadout[slot] = skillId || null;
    this.saveToStorage();
    return true;
  }

  // Weighted random skill id from the gacha pool (gachaWeight)
  rollSkillBook() {
    const entries = Object.entries(SKILLS).filter(([, s]) => (s.gachaWeight || 0) > 0);
    const total = entries.reduce((a, [, s]) => a + s.gachaWeight, 0);
    let r = Math.random() * total;
    for (const [id, s] of entries) { r -= s.gachaWeight; if (r < 0) return id; }
    return entries[0]?.[0];
  }

  // The monster the worn pet looks like (null = no pet)
  get activePet() {
    const it = this.equipment.pet && ITEMS[this.equipment.pet];
    return it ? it.monsterId : null;
  }

  // Pet loot speed multiplier (1 = no pet): loot flies to you sooner and faster (+1% per refine level)
  get petLootSpeed() {
    const it = this.equipment.pet && ITEMS[this.equipment.pet];
    if (!it || !it.lootSpeed || it.lootSpeed <= 1) return 1;
    const enh = this.getItemEnhance(this.equipment.pet);
    const mult = 1 + (enh.level * 0.01);
    const speed = 1 + (it.lootSpeed - 1) * mult;
    return parseFloat(speed.toFixed(2));
  }

  unequip(slot) {
    if (slot === 'head' || !(slot in this.equipment)) return false; // always keep a head
    const itId = this.equipment[slot];
    if (itId) {
      this.inventory[itId] = (this.inventory[itId] || 0) + 1;
    }
    this.equipment[slot] = null;
    if (slot === 'mount') this.isMounted = false;
    this.saveToStorage();
    return true;
  }

  // Save / Load
  saveToStorage() {
    if (this.resetting) return; // /reset in progress: don't rewrite the wiped save
    const data = {
      name: this.name,
      baseLevel: this.baseLevel,
      baseExp: this.baseExp,
      stats: this.stats,
      statPoints: this.statPoints,
      gold: this.gold,
      gachaTokens: this.gachaTokens,
      inventory: this.inventory,
      equipment: this.equipment,
      itemEnhancements: this.itemEnhancements,
      isMounted: this.isMounted,
      hotbar: this.hotbar,
      auto: this.auto,
      hpPotionSlot: this.hpPotionSlot,
      spPotionSlot: this.spPotionSlot,
      learnedSkills: this.learnedSkills,
      skillBooks: this.skillBooks,
      skillLoadout: this.skillLoadout,
      currentSp: Math.floor(this.currentSp),
      autoBattle: this.autoBattle,
      costumes: this.costumes,
      unlockedCostumes: this.unlockedCostumes,
      collectedRelics: this.collectedRelics,
      questProgress: this.questProgress
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  loadFromStorage() {
    try {
      // v1 saves (class based) are migrated: stats/gear/items are kept, class + job data dropped
      const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const keep = ['name', 'baseLevel', 'baseExp', 'statPoints', 'gold', 'gachaTokens', 'inventory',
          'costumes', 'unlockedCostumes', 'collectedRelics', 'questProgress', 'hpPotionSlot', 'spPotionSlot', 'learnedSkills', 'skillBooks', 'autoBattle', 'itemEnhancements'];
        keep.forEach(k => { if (d[k] !== undefined) this[k] = d[k]; });
        // relic ids that used to clash with item-sheet ids or legacy generic names
        const RELIC_RENAME = {
          relic_slime_core: 'relic_slime_heart', relic_golden_carrot: 'relic_carrot_charm', relic_golem_core: 'relic_golem_heart',
          relic_forest_hornet: 'relic_amber_queen_brooch', relic_jungle_viper: 'relic_ouroboros_viper', relic_claw_bear: 'relic_ursa_totem',
          relic_bandit_rogue: 'relic_shadow_cameo', relic_bandit_archer: 'relic_falcon_astrolabe', relic_bandit_brute: 'relic_titan_knuckle_seal',
          relic_bandit_leader: 'relic_pirate_sovereign_brooch', relic_fire_imp: 'relic_brimstone_censer', relic_chest_mimic: 'relic_pandora_mimic_lock',
          relic_floating_eye: 'relic_void_gazer_sphere', relic_spectral_armor: 'relic_phantom_aegis', relic_mushroom_sporeling: 'relic_mycelium_chalice',
          relic_baby_fire_wyrm: 'relic_solar_dragon_egg', relic_skeleton_warrior: 'relic_vanguard_crest', relic_skeleton_archer: 'relic_banshee_harp',
          relic_skeleton_mage: 'relic_lich_archon_orb', relic_skeleton_knight: 'relic_death_knight_crown'
        };
        if (Array.isArray(this.collectedRelics)) this.collectedRelics = this.collectedRelics.map(id => RELIC_RENAME[id] || id);
        if (d.stats) STAT_KEYS.forEach(k => { if (typeof d.stats[k] === 'number') this.stats[k] = d.stats[k]; });
        if (d.auto) {
          const a = d.auto;
          if (typeof a.range === 'number') this.auto.range = Math.min(400, Math.max(1, a.range));
          if (typeof a.pickup === 'boolean') this.auto.pickup = a.pickup;
          if (a.disabledMonsters && typeof a.disabledMonsters === 'object') this.auto.disabledMonsters = a.disabledMonsters;
          if (a.hpPotion) Object.assign(this.auto.hpPotion, a.hpPotion);
          if (a.spPotion) Object.assign(this.auto.spPotion, a.spPotion);
        }
        if (d.equipment) {
          // old saves had weapon / armor / pet only: armor goes back to the bag, the knight outfit is worn
          this.equipment = { weapon: d.equipment.weapon ?? null, offhand: d.equipment.offhand ?? null,
            hat: d.equipment.hat ?? null, hair: d.equipment.hair ?? null, face: d.equipment.face ?? null, mouth: d.equipment.mouth ?? null,
            head: d.equipment.head ?? 'head_0', back: d.equipment.back ?? null,
            outfit: d.equipment.outfit ?? (('outfit' in d.equipment) ? null : 'outfit_knight'), pet: d.equipment.pet ?? null, mount: d.equipment.mount ?? null };
          if (d.equipment.armor && ITEMS[d.equipment.armor]) this.inventory[d.equipment.armor] = (this.inventory[d.equipment.armor] || 0) + 1;
        }
        this.isMounted = !!d.isMounted;
        // old pet system: owned pets become items, the active one is worn
        if (Array.isArray(d.pets)) d.pets.forEach(mid => { if (ITEMS[`pet_${mid}`] && !this.inventory[`pet_${mid}`]) this.inventory[`pet_${mid}`] = 1; });
        if (d.activePet && ITEMS[`pet_${d.activePet}`] && !this.equipment.pet) this.equipment.pet = `pet_${d.activePet}`;
        if (Array.isArray(d.hotbar)) this.hotbar = d.hotbar.slice(0, HOTBAR_SIZE).concat(new Array(Math.max(0, HOTBAR_SIZE - d.hotbar.length)).fill(null));
        // Gear that no longer exists, or is above the player's level, goes back to the bag
        EQUIP_SLOTS.forEach(slot => {
          const id = this.equipment[slot];
          const item = id && ITEMS[id];
          if (id && (!item || (!TEST_ALL_SWORDS && item.reqLevel && item.reqLevel > this.baseLevel))) {
            if (item) this.inventory[id] = (this.inventory[id] || 0) + 1;
            this.equipment[slot] = null;
          }
        });
        // items that no longer exist (e.g. the removed apple) leave the bag / hotbar
        for (const id of Object.keys(this.inventory)) if (!ITEMS[id]) delete this.inventory[id];
        // Ensure equipped items are not duplicated in inventory
        for (const [slot, id] of Object.entries(this.equipment)) {
          if (id && this.inventory[id]) {
            this.inventory[id]--;
            if (this.inventory[id] <= 0) delete this.inventory[id];
          }
        }
        this.hotbar = this.hotbar.map(h => (typeof h === 'string' && !ITEMS[h] ? null : h));
        if (!this.equipment.weapon && !this.inventory.wooden_stick) this.inventory.wooden_stick = 1;
        if (!this.mountItem) this.isMounted = false;
        if (Array.isArray(d.skillLoadout)) this.skillLoadout = Array.from({ length: SKILL_SLOTS }, (_, i) => d.skillLoadout[i] || null);
        // skills that no longer exist (or were never learned) leave the loadout / bag
        this.skillLoadout = this.skillLoadout.map(id => (id && SKILLS[id] && this.learnedSkills[id] ? id : null));
        for (const id of Object.keys(this.learnedSkills)) if (!SKILLS[id]) delete this.learnedSkills[id];
        for (const id of Object.keys(this.skillBooks)) if (!SKILLS[id]) delete this.skillBooks[id];
        this.currentHp = this.maxHp;
        this.currentSp = typeof d.currentSp === 'number' ? Math.min(d.currentSp, this.maxSp) : this.maxSp;
      }
      // Old saves carried the placeholder name; give those a random one too
      if (!this.name || this.name === 'Novice Adventurer') this.name = randomName();
      if (TEST_ALL_GEAR) {
        for (const it of Object.values(ITEMS)) {
          if (['outfit', 'hat', 'hair', 'face', 'mouth', 'head', 'back', 'shield', 'mount'].includes(it.type) && !this.inventory[it.id] && this.equipment[SLOT_OF[it.type]] !== it.id) this.inventory[it.id] = 1;
        }
      }
      if (TEST_ALL_SWORDS) {
        for (const it of Object.values(ITEMS)) {
          if (it.type === 'weapon' && !this.inventory[it.id] && this.equipment.weapon !== it.id) {
            this.inventory[it.id] = 1;
          }
        }
      }
      this.saveToStorage();
    } catch (e) {
      console.warn('Storage load error:', e);
    }
  }

  resetProgress() {
    this.resetting = true;
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(OLD_SAVE_KEY);
    window.location.reload();
  }
}

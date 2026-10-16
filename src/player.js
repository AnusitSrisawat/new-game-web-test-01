// Player State & Logic Handler (classless: power comes from stats, weapon and (later) skills)
import { ITEMS, RELICS, WEAPON_TYPES, BASE_STATS, STAT_KEYS, SKILLS } from './data.js';

export const HP_POTION_IDS = ['hp_potion_s', 'apple', 'hp_potion_m', 'boar_meat', 'hp_potion_l']; // weakest first
export const SP_POTION_IDS = ['sp_potion_s', 'sp_potion_m'];
export const SKILL_SLOTS = 4;     // skills usable at once (passives take a slot too)
export const GACHA_SINGLE = 500;   // gold per skill-book pull
export const GACHA_PACK = 4500;    // gold for 10 pulls

// Does the held weapon satisfy a skill's weapon requirement?
export function weaponMatches(req, weaponType) {
  if (!req || req === 'any') return true;
  if (req === 'melee') return weaponType === 'fist' || weaponType === 'stick' || weaponType === 'sword';
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
      hp_potion_s: 10,
      apple: 5
    };

    // Equipment: item id or null
    this.equipment = {
      weapon: 'wooden_stick',
      armor: null
    };

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
    // Pets: monster ids you own (a pet looks like that monster) + the one walking with you
    this.pets = [];
    this.activePet = null;

    // Quest Tracking: { [questId]: { progress: 0, completed: false, claimed: false } }
    this.questProgress = {};

    // Settings
    this.autoBattle = true;
    // Auto-hunt settings (range is in tiles / "ช่อง")
    this.auto = {
      range: 12,               // search radius in tiles
      disabledMonsters: {},    // templateId -> true means "don't attack"
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
    return Math.floor(60 * Math.pow(this.baseLevel, 1.5) + this.baseLevel * 25);
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

  // SP: 30 + level×2 + INT×4 (+ Max SP% skills)
  get maxSp() {
    return Math.floor((30 + this.baseLevel * 2 + this.stats.int * 4) * (1 + this.skillBonus('bonusSpPct') / 100));
  }

  get spRegen() { return 1 + this.stats.int * 0.1; }       // SP per second

  // Move speed: +0.3% per AGI (cap +40%) plus skill bonuses. AGI 5 => +1.5%, AGI 100 => +30%.
  get moveMul() {
    const agiBonus = Math.min(0.4, this.stats.agi * 0.003);
    return 1 + agiBonus + this.skillBonus('bonusMovePct') / 100;
  }

  // Calculate Total Combined Stats
  get maxHp() {
    let hp = BASE_STATS.hp + (this.baseLevel * 25) + (this.stats.vit * 18);
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.hp) hp += relic.statBonus.hp;
    });
    if (this.equipment.armor && ITEMS[this.equipment.armor]) {
      hp += (ITEMS[this.equipment.armor].hp || 0);
    }
    return Math.floor(hp * (1 + this.skillBonus('bonusHpPct') / 100));
  }

  get attack() {
    const main = this.weaponInfo.scalesWith;
    const sub = main === 'dex' ? 'str' : 'dex';
    let atk = BASE_STATS.atk + (this.stats[main] * 3) + this.stats[sub] + Math.floor(this.baseLevel * 1.5);
    if (this.equipment.weapon && ITEMS[this.equipment.weapon]) {
      atk += (ITEMS[this.equipment.weapon].atk || 0);
    }
    if (this.equipment.armor && ITEMS[this.equipment.armor]) {
      atk += (ITEMS[this.equipment.armor].atk || 0);
    }
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.atk) atk += relic.statBonus.atk;
    });
    if (this.costumes.back === 'costume_angel_wings') atk = Math.floor(atk * 1.05);
    return Math.floor(atk * (1 + this.skillBonus('bonusAtkPct') / 100));
  }

  get defense() {
    let def = BASE_STATS.def + (this.stats.vit * 1.5);
    if (this.equipment.weapon && ITEMS[this.equipment.weapon]) {
      def += (ITEMS[this.equipment.weapon].def || 0);
    }
    if (this.equipment.armor && ITEMS[this.equipment.armor]) {
      def += (ITEMS[this.equipment.armor].def || 0);
    }
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.def) def += relic.statBonus.def;
    });
    return Math.floor(def * (1 + this.skillBonus('bonusDefPct') / 100));
  }

  get aspd() {
    let speed = BASE_STATS.aspd + (this.stats.agi * 0.015);
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.aspd) speed += relic.statBonus.aspd;
    });
    if (this.costumes.weapon_skin === 'costume_celestial_blade') speed += 0.08;
    speed *= 1 + this.skillBonus('bonusAspdPct') / 100;
    return parseFloat(speed.toFixed(2));
  }

  get critRate() {
    let rate = 0.05 + (this.stats.luk * 0.005);
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.critRate) rate += relic.statBonus.critRate;
    });
    rate += this.skillBonus('bonusCritPct') / 100;
    return Math.min(0.75, rate);
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
    if (!item || (item.type !== 'weapon' && item.type !== 'armor')) return { ok: false, reason: 'ไม่ใช่อุปกรณ์' };
    if (!TEST_ALL_SWORDS && item.reqLevel && this.baseLevel < item.reqLevel) {
      return { ok: false, reason: `ต้องการเลเวล ${item.reqLevel} ขึ้นไป (ตอนนี้ Lv.${this.baseLevel})` };
    }
    if (item.type === 'weapon') {
      this.equipment.weapon = itemId;
    } else {
      this.equipment.armor = itemId;
    }
    this.saveToStorage();
    return { ok: true };
  }

  // HP potions currently in the bag (weakest first)
  ownedHpPotions() {
    return HP_POTION_IDS.filter(id => this.inventory[id] > 0 && ITEMS[id]);
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

  ownedSpPotions() {
    return SP_POTION_IDS.filter(id => this.inventory[id] > 0 && ITEMS[id]);
  }

  useSpPotion(itemId = null) {
    const id = (itemId && this.inventory[itemId] > 0 && ITEMS[itemId]?.sp) ? itemId : this.ownedSpPotions()[0];
    if (!id) return null;
    const item = ITEMS[id];
    this.removeItem(id, 1);
    this.currentSp = Math.min(this.maxSp, this.currentSp + item.sp);
    return { restored: item.sp, itemName: item.name, itemId: id };
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

  addPet(monsterId) {
    if (this.pets.includes(monsterId)) return false;
    this.pets.push(monsterId);
    if (!this.activePet) this.activePet = monsterId;
    this.saveToStorage();
    return true;
  }

  // Save / Load
  saveToStorage() {
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
      pets: this.pets,
      activePet: this.activePet,
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
          'costumes', 'unlockedCostumes', 'collectedRelics', 'pets', 'activePet', 'questProgress', 'hpPotionSlot', 'spPotionSlot', 'learnedSkills', 'skillBooks', 'autoBattle'];
        keep.forEach(k => { if (d[k] !== undefined) this[k] = d[k]; });
        if (d.stats) STAT_KEYS.forEach(k => { if (typeof d.stats[k] === 'number') this.stats[k] = d.stats[k]; });
        if (d.auto) {
          const a = d.auto;
          if (typeof a.range === 'number') this.auto.range = Math.min(400, Math.max(1, a.range));
          if (a.disabledMonsters && typeof a.disabledMonsters === 'object') this.auto.disabledMonsters = a.disabledMonsters;
          if (a.hpPotion) Object.assign(this.auto.hpPotion, a.hpPotion);
          if (a.spPotion) Object.assign(this.auto.spPotion, a.spPotion);
        }
        if (d.equipment) this.equipment = { weapon: d.equipment.weapon ?? null, armor: d.equipment.armor ?? null };
        if (Array.isArray(d.hotbar)) this.hotbar = d.hotbar.slice(0, HOTBAR_SIZE).concat(new Array(Math.max(0, HOTBAR_SIZE - d.hotbar.length)).fill(null));
        // Gear that no longer exists, or is above the player's level, goes back to the bag
        ['weapon', 'armor'].forEach(slot => {
          const id = this.equipment[slot];
          const item = id && ITEMS[id];
          if (id && (!item || (!TEST_ALL_SWORDS && item.reqLevel && item.reqLevel > this.baseLevel))) {
            if (item) this.inventory[id] = (this.inventory[id] || 0) + 1;
            this.equipment[slot] = null;
          }
        });
        if (!this.equipment.weapon && !this.inventory.wooden_stick) this.inventory.wooden_stick = 1;
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
      if (TEST_ALL_SWORDS) {
        for (const it of Object.values(ITEMS)) {
          if (it.type === 'weapon' && it.weaponType === 'sword' && !this.inventory[it.id] && this.equipment.weapon !== it.id) {
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
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(OLD_SAVE_KEY);
    window.location.reload();
  }
}

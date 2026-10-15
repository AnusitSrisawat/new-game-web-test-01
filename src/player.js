// Player State & Logic Handler
import { CLASSES, ITEMS, RELICS } from './data.js';

export class Player {
  constructor() {
    this.name = 'Novice Adventurer';
    this.classId = 'swordsman';
    this.baseLevel = 1;
    this.baseExp = 0;
    this.jobLevel = 1;
    this.jobExp = 0;

    // Stat points
    this.stats = {
      str: 5, // Increases ATK
      agi: 5, // Increases ASPD & Flee
      vit: 5, // Increases HP & DEF
      dex: 5, // Increases Accuracy & Min Damage
      luk: 5  // Increases Crit Rate & Drop chance
    };
    this.statPoints = 0;

    // Rebirth counts & bonuses
    this.rebirthCount = 0;
    this.rebirthBonusStats = 0;

    // Current HP
    this.currentHp = 200;

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
      weapon: 'novice_sword',
      armor: null
    };

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
    this.autoPotion = true;
    this.autoPotionThreshold = 0.45; // 45% hp
    this.autoBattle = true;

    // Load saved data if exists
    this.loadFromStorage();
  }

  get currentClass() {
    return CLASSES[this.classId.toUpperCase()] || CLASSES.SWORDSMAN;
  }

  // Calculate Base EXP needed for next level
  get maxBaseExp() {
    return Math.floor(60 * Math.pow(this.baseLevel, 1.5) + this.baseLevel * 25);
  }

  // Calculate Job EXP needed for next level (Max job is 50)
  get maxJobExp() {
    if (this.jobLevel >= 50) return Infinity;
    return Math.floor(40 * Math.pow(this.jobLevel, 1.45) + this.jobLevel * 20);
  }

  // Calculate Total Combined Stats
  get maxHp() {
    let hp = this.currentClass.baseHp + (this.baseLevel * 25) + (this.stats.vit * 18);
    // Relic Bonuses
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.hp) hp += relic.statBonus.hp;
    });
    // Armor bonus
    if (this.equipment.armor && ITEMS[this.equipment.armor]) {
      hp += (ITEMS[this.equipment.armor].hp || 0);
    }
    // Rebirth bonus
    if (this.rebirthCount > 0) {
      hp = Math.floor(hp * (1 + this.rebirthCount * 0.15));
    }
    return Math.floor(hp);
  }

  get attack() {
    const isArcher = this.currentClass.category === 'archer';
    const mainStat = isArcher ? (this.stats.dex * 3 + this.stats.str * 1) : (this.stats.str * 3 + this.stats.dex * 1);
    let atk = this.currentClass.baseAtk + mainStat + Math.floor(this.baseLevel * 1.5);
    // Weapon bonus
    if (this.equipment.weapon && ITEMS[this.equipment.weapon]) {
      atk += (ITEMS[this.equipment.weapon].atk || 0);
    }
    if (this.equipment.armor && ITEMS[this.equipment.armor]) {
      atk += (ITEMS[this.equipment.armor].atk || 0);
    }
    // Relic bonus
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.atk) atk += relic.statBonus.atk;
    });
    // Costume bonus
    if (this.costumes.back === 'costume_angel_wings') atk = Math.floor(atk * 1.05);
    // Rebirth bonus
    if (this.rebirthCount > 0) {
      atk = Math.floor(atk * (1 + this.rebirthCount * 0.15));
    }
    return Math.floor(atk);
  }

  get defense() {
    let def = this.currentClass.baseDef + (this.stats.vit * 1.5);
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
    return Math.floor(def);
  }

  get aspd() {
    let speed = this.currentClass.aspd + (this.stats.agi * 0.015);
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.aspd) speed += relic.statBonus.aspd;
    });
    if (this.costumes.weapon_skin === 'costume_celestial_blade') speed += 0.08;
    return parseFloat(speed.toFixed(2));
  }

  get critRate() {
    let rate = 0.05 + (this.stats.luk * 0.005);
    this.collectedRelics.forEach(id => {
      const relic = RELICS[id];
      if (relic && relic.statBonus.critRate) rate += relic.statBonus.critRate;
    });
    return Math.min(0.75, rate);
  }

  // Gain EXP
  gainExp(baseExp, jobExp) {
    let levelUps = { base: false, job: false };

    // Costume Exp bonus
    if (this.costumes.head === 'costume_straw_hat') {
      baseExp = Math.floor(baseExp * 1.02);
      jobExp = Math.floor(jobExp * 1.02);
    }

    this.baseExp += baseExp;
    while (this.baseExp >= this.maxBaseExp) {
      this.baseExp -= this.maxBaseExp;
      this.baseLevel++;
      this.statPoints += 4;
      this.currentHp = this.maxHp;
      levelUps.base = true;
    }

    if (this.jobLevel < 50) {
      this.jobExp += jobExp;
      while (this.jobLevel < 50 && this.jobExp >= this.maxJobExp) {
        this.jobExp -= this.maxJobExp;
        this.jobLevel++;
        levelUps.job = true;
        if (this.jobLevel === 50) {
          this.jobExp = 0; // Maxed
          break;
        }
      }
    }

    this.saveToStorage();
    return levelUps;
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

  // Advance Class (Supports both Swordsman and Archer branches)
  canAdvanceClass() {
    if (this.jobLevel < 50) return false;
    // Swordsman tree
    if (this.classId === 'swordsman') return 'knight';
    if (this.classId === 'high_swordsman') return 'high_knight';
    if (this.classId === 'high_knight') return 'rune_knight';
    // Archer tree
    if (this.classId === 'archer') return 'hunter';
    if (this.classId === 'high_archer') return 'sniper';
    if (this.classId === 'sniper') return 'ranger';
    return null;
  }

  advanceClass() {
    const nextClassId = this.canAdvanceClass();
    if (nextClassId) {
      this.classId = nextClassId;
      this.jobLevel = 1;
      this.jobExp = 0;
      this.currentHp = this.maxHp;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Can Rebirth
  canRebirth() {
    if (this.jobLevel < 50) return false;
    return this.classId === 'knight' || this.classId === 'hunter';
  }

  rebirth() {
    if (!this.canRebirth()) return false;
    this.rebirthCount++;
    const isArcher = this.classId === 'hunter';
    this.classId = isArcher ? 'high_archer' : 'high_swordsman';
    this.baseLevel = 1;
    this.baseExp = 0;
    this.jobLevel = 1;
    this.jobExp = 0;
    this.stats = { str: 10, agi: 10, vit: 10, dex: 10, luk: 10 };
    this.statPoints = 25; // Bonus stat points on rebirth
    this.currentHp = this.maxHp;
    this.saveToStorage();
    return true;
  }

  // Switch between Swordsman and Archer branch
  switchClassBranch(category) {
    if (category === 'archer') {
      this.classId = 'archer';
      if (!this.inventory.wooden_bow && this.equipment.weapon !== 'wooden_bow') {
        this.addItem('wooden_bow', 1);
      }
      this.equipment.weapon = 'wooden_bow';
    } else {
      this.classId = 'swordsman';
      if (!this.inventory.novice_sword && this.equipment.weapon !== 'novice_sword') {
        this.addItem('novice_sword', 1);
      }
      this.equipment.weapon = 'novice_sword';
    }
    this.jobLevel = 1;
    this.jobExp = 0;
    this.currentHp = this.maxHp;
    this.saveToStorage();
    return true;
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

  equipItem(itemId) {
    const item = ITEMS[itemId];
    if (!item) return false;
    if (item.type === 'weapon') {
      this.equipment.weapon = itemId;
    } else if (item.type === 'armor') {
      this.equipment.armor = itemId;
    }
    this.saveToStorage();
    return true;
  }

  usePotion() {
    const potions = ['hp_potion_l', 'hp_potion_m', 'hp_potion_s', 'apple', 'boar_meat'];
    for (const potId of potions) {
      if (this.inventory[potId] && this.inventory[potId] > 0) {
        const item = ITEMS[potId];
        this.removeItem(potId, 1);
        const healAmt = item.heal || 50;
        this.currentHp = Math.min(this.maxHp, this.currentHp + healAmt);
        return { healed: healAmt, itemName: item.name };
      }
    }
    return null;
  }

  // Save / Load
  saveToStorage() {
    const data = {
      name: this.name,
      classId: this.classId,
      baseLevel: this.baseLevel,
      baseExp: this.baseExp,
      jobLevel: this.jobLevel,
      jobExp: this.jobExp,
      stats: this.stats,
      statPoints: this.statPoints,
      rebirthCount: this.rebirthCount,
      gold: this.gold,
      gachaTokens: this.gachaTokens,
      inventory: this.inventory,
      equipment: this.equipment,
      costumes: this.costumes,
      unlockedCostumes: this.unlockedCostumes,
      collectedRelics: this.collectedRelics,
      questProgress: this.questProgress
    };
    try {
      localStorage.setItem('cozy_rpg_save_v1', JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem('cozy_rpg_save_v1');
      if (raw) {
        const data = JSON.parse(raw);
        Object.assign(this, data);
        this.currentHp = this.maxHp;
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
  }

  resetProgress() {
    localStorage.removeItem('cozy_rpg_save_v1');
    window.location.reload();
  }
}

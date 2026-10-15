// Skill DATA (draft starter set). The game does not run skills yet — this is the data model the
// future skill system will read, and what Studio edits. Full rules: docs/SKILLS.md
//
// Every skill:
//   kind:     'active' (press to use) | 'passive' (always on once learned)
//   rarity:   common | uncommon | rare | epic   (controls gacha odds & book sell price)
//   target:   enemy | enemy_area | self_area | self
//   weapon:   any | melee | bow | staff         (weapon you must hold to use / benefit)
//   effect:   damage | heal | buff | debuff | dash        (active skills)
//   power:    % of ATK per hit (damage)  /  % of Max HP (heal)
//   hits, radius (px), range (px, 0 = weapon range), spCost, cooldown (s), duration (s, buff/debuff)
//   scalesWith + statCoef: adds  stat × statCoef  on top of power (e.g. INT × 2)
//   slowPct, stunSec: extra effect on enemies hit
//   bonusAtkPct / bonusDefPct / bonusHpPct / bonusAspdPct / bonusCritPct / bonusSpPct / bonusMovePct:
//        passive: permanent while learned · buff: only during `duration`
//   bookSellPrice: gold when the skill book is sold · gachaWeight: relative chance in the gacha pool
export const SKILL_DEFAULTS = {
  // ---- active ----
  power_strike: { name: 'Power Strike (ฟันหนัก)', desc: 'ฟันเป้าหมายด้วยแรงเต็มที่ ดาเมจ 250%', kind: 'active', rarity: 'common',
    target: 'enemy', weapon: 'melee', effect: 'damage', power: 250, hits: 1, radius: 0, range: 0, spCost: 10, cooldown: 5, duration: 0,
    scalesWith: 'none', statCoef: 0, slowPct: 0, stunSec: 0, bookSellPrice: 100, gachaWeight: 30 },
  whirlwind: { name: 'Whirlwind (กวาดรอบตัว)', desc: 'หมุนตัวฟันศัตรูทุกตัวรอบตัว', kind: 'active', rarity: 'uncommon',
    target: 'self_area', weapon: 'melee', effect: 'damage', power: 150, hits: 1, radius: 140, range: 0, spCost: 18, cooldown: 9, duration: 0,
    scalesWith: 'none', statCoef: 0, slowPct: 0, stunSec: 0, bookSellPrice: 300, gachaWeight: 15 },
  double_shot: { name: 'Double Shot (ยิงคู่)', desc: 'ยิงธนูสองนัดซ้อน', kind: 'active', rarity: 'common',
    target: 'enemy', weapon: 'bow', effect: 'damage', power: 140, hits: 2, radius: 0, range: 0, spCost: 12, cooldown: 4, duration: 0,
    scalesWith: 'none', statCoef: 0, slowPct: 0, stunSec: 0, bookSellPrice: 100, gachaWeight: 30 },
  arrow_rain: { name: 'Arrow Rain (ห่าฝนลูกศร)', desc: 'ระดมยิงลูกศรลงบริเวณรอบเป้าหมาย', kind: 'active', rarity: 'rare',
    target: 'enemy_area', weapon: 'bow', effect: 'damage', power: 120, hits: 3, radius: 220, range: 0, spCost: 25, cooldown: 12, duration: 0,
    scalesWith: 'none', statCoef: 0, slowPct: 0, stunSec: 0, bookSellPrice: 900, gachaWeight: 6 },
  fire_bolt: { name: 'Fire Bolt (ลูกไฟ)', desc: 'ยิงลูกไฟใส่เป้าหมาย ดาเมจเพิ่มตาม INT', kind: 'active', rarity: 'common',
    target: 'enemy', weapon: 'staff', effect: 'damage', power: 180, hits: 1, radius: 0, range: 0, spCost: 14, cooldown: 3, duration: 0,
    scalesWith: 'int', statCoef: 2, slowPct: 0, stunSec: 0, bookSellPrice: 100, gachaWeight: 30 },
  frost_nova: { name: 'Frost Nova (ระเบิดน้ำแข็ง)', desc: 'ปล่อยคลื่นน้ำแข็งรอบตัว ทำให้ศัตรูช้าลง', kind: 'active', rarity: 'rare',
    target: 'self_area', weapon: 'staff', effect: 'damage', power: 160, hits: 1, radius: 180, range: 0, spCost: 30, cooldown: 14, duration: 0,
    scalesWith: 'int', statCoef: 1.5, slowPct: 40, stunSec: 0, bookSellPrice: 900, gachaWeight: 6 },
  meteor_fall: { name: 'Meteor Fall (อุกกาบาต)', desc: 'เรียกอุกกาบาตตกใส่พื้นที่เป้าหมาย ดาเมจมหาศาล', kind: 'active', rarity: 'epic',
    target: 'enemy_area', weapon: 'staff', effect: 'damage', power: 450, hits: 1, radius: 260, range: 0, spCost: 60, cooldown: 45, duration: 0,
    scalesWith: 'int', statCoef: 4, slowPct: 0, stunSec: 1.5, bookSellPrice: 3000, gachaWeight: 1 },
  heal_light: { name: 'Healing Light (แสงฟื้นฟู)', desc: 'ฟื้น HP ตัวเอง 15% ของ Max HP + INT × 2', kind: 'active', rarity: 'uncommon',
    target: 'self', weapon: 'any', effect: 'heal', power: 15, hits: 1, radius: 0, range: 0, spCost: 20, cooldown: 15, duration: 0,
    scalesWith: 'int', statCoef: 2, slowPct: 0, stunSec: 0, bookSellPrice: 300, gachaWeight: 15 },
  iron_guard: { name: 'Iron Guard (เกราะเหล็ก)', desc: 'เพิ่ม DEF 40% ชั่วคราว', kind: 'active', rarity: 'uncommon',
    target: 'self', weapon: 'any', effect: 'buff', power: 0, hits: 1, radius: 0, range: 0, spCost: 15, cooldown: 40, duration: 20,
    scalesWith: 'none', statCoef: 0, slowPct: 0, stunSec: 0, bonusDefPct: 40, bookSellPrice: 300, gachaWeight: 15 },
  berserk: { name: 'Berserk (คลั่ง)', desc: 'ATK +30% ความเร็วโจมตี +25% แต่ DEF −15% ชั่วคราว', kind: 'active', rarity: 'rare',
    target: 'self', weapon: 'any', effect: 'buff', power: 0, hits: 1, radius: 0, range: 0, spCost: 25, cooldown: 60, duration: 15,
    scalesWith: 'none', statCoef: 0, slowPct: 0, stunSec: 0, bonusAtkPct: 30, bonusAspdPct: 25, bonusDefPct: -15, bookSellPrice: 900, gachaWeight: 6 },
  dash: { name: 'Dash (พุ่ง)', desc: 'พุ่งไปข้างหน้าอย่างรวดเร็ว', kind: 'active', rarity: 'common',
    target: 'self', weapon: 'any', effect: 'dash', power: 0, hits: 1, radius: 0, range: 220, spCost: 8, cooldown: 8, duration: 0,
    scalesWith: 'none', statCoef: 0, slowPct: 0, stunSec: 0, bookSellPrice: 100, gachaWeight: 30 },

  // ---- passive ----
  sword_mastery: { name: 'Sword Mastery (ชำนาญดาบ)', desc: 'ATK +8% เมื่อถือดาบ', kind: 'passive', rarity: 'common',
    weapon: 'melee', bonusAtkPct: 8, bookSellPrice: 100, gachaWeight: 30 },
  tough_body: { name: 'Tough Body (ร่างกายแกร่ง)', desc: 'Max HP +10% และ DEF +5%', kind: 'passive', rarity: 'common',
    weapon: 'any', bonusHpPct: 10, bonusDefPct: 5, bookSellPrice: 100, gachaWeight: 30 },
  swift_feet: { name: 'Swift Feet (ฝีเท้าลม)', desc: 'ความเร็วเดิน +10%', kind: 'passive', rarity: 'uncommon',
    weapon: 'any', bonusMovePct: 10, bookSellPrice: 300, gachaWeight: 15 },
  mana_well: { name: 'Mana Well (บ่อมานา)', desc: 'Max SP +20%', kind: 'passive', rarity: 'uncommon',
    weapon: 'any', bonusSpPct: 20, bookSellPrice: 300, gachaWeight: 15 },
  eagle_eye: { name: 'Eagle Eye (ตาเหยี่ยว)', desc: 'โอกาสคริติคอล +6% เมื่อถือธนู', kind: 'passive', rarity: 'rare',
    weapon: 'bow', bonusCritPct: 6, bookSellPrice: 900, gachaWeight: 6 }
};

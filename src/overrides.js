// Studio overrides: editable game data layered on top of the defaults in data.js / maps.js.
// Shared by the server (validation + apply) and the client (apply on load) so both always agree.
//
// overrides = {
//   zones:    { [zoneId]:    { name, desc, reqLevel } },
//   maps:     { [zoneId]:    { size, texture, floorImage, floor, wall } },   // floorImage: path under assets/, e.g. ground/map1/x.png ('' = none)
//   monsters: { [monsterId]: { name, level, hp, atk, def, exp, size, facing } },   // facing: which way the picture looks: left | right | none (never flip)
//   ai:       { [monsterId]: { speed, aggro, attackRange, attackCooldown, leash, wanderRadius } },
//   items:    { [itemId]:    { name, price, atk, def, hp, heal, reqLevel, desc } },
//   relics:   { [relicId]:   { name, icon, desc, hp, atk, def, aspd, critRate } },   // permanent bonuses of each monster's relic
//   quests:   { [questId]:   { title, desc, requiredCount, rewardGold, rewardExp, rewardTokens } },
//   sounds:   { [soundId]:   { wave, freq, freqEnd, dur, vol, tone, noise, noiseFreq, noiseFreqEnd, arp, pitchVar } }   // see sounds.js
//   skills:   { [skillId]:   { name, desc } }   // free-form list, not wired into the game yet
//   objects:  { [zoneId]: [ { type, x, y, scale, solid } ] }  // replaces that map's object list
//   ui:       { main: { hudBg, hudOpacity, ... show* } }          // HUD theme + show/hide panels
//   drops:    { [monsterId]: [ { itemId, chance } ] }  // replaces that monster's drop list (chance 0.001..1)
// }

import { TEXTURES, OBJECT_TYPES, MAX_OBJECTS_PER_MAP } from './maps.js';
import { SOUND_DEFAULTS, SOUND_META } from './sounds.js';

const text = (label, max) => ({ type: 'text', label, max });
const num = (label, min, max, step = 1) => ({ type: 'number', label, min, max, step });
const color = (label) => ({ type: 'color', label });
const select = (label, options) => ({ type: 'select', label, options });

const SHOW_OPTIONS = [{ value: 'show', label: 'แสดง' }, { value: 'hide', label: 'ซ่อน' }];

// Default HUD theme (matches :root in style.css) and the CSS variable each field drives
export const UI_DEFAULTS = {
  hudBg: '#0f172a', hudOpacity: 92, hudBorder: '#d4af37',
  goldAccent: '#f59e0b', goldBorder: '#d97706',
  hpRed: '#ef4444', spBlue: '#3b82f6', expYellow: '#eab308',
  textMain: '#f8fafc', textDim: '#94a3b8',
  playerScale: 3.4, petScale: 0.84,
  showMinimap: 'show', showChat: 'show', showSidePanel: 'show', showZoom: 'show'
};

// Which fields can be edited per collection. Studio builds its forms from this.
export const SCHEMA = {
  zones: {
    label: 'แมพ',
    fields: {
      name: text('ชื่อแมพ', 80),
      desc: text('คำอธิบาย', 200)
    }
  },
  maps: {
    label: 'ขนาด/สีแมพ',
    fields: {
      size: num('ขนาด (px, จัตุรัส)', 1600, 9600, 32),
      texture: select('พื้นผิวพื้น (texture)', Object.entries(TEXTURES).map(([value, label]) => ({ value, label }))),
      floorImage: select('รูปพื้น (ปูซ้ำทั้งแมพ — ใส่ไฟล์ใน assets/ground/ หรือ assets/floors/)', [{ value: '', label: '(ไม่ใช้รูป — ใช้ texture ด้านบน)' }]), // options filled in by the server
      floor: color('สีพื้น (สีหลักของ texture)'),
      wall: color('สีกำแพง')
    }
  },
  monsters: {
    label: 'มอนสเตอร์',
    fields: {
      name: text('ชื่อ', 80),
      level: num('เลเวล', 1, 999),
      hp: num('HP', 1, 10000000),
      atk: num('ATK', 0, 100000),
      def: num('DEF', 0, 100000),
      exp: num('EXP ที่ได้', 0, 100000000),
      size: num('ขนาดรูป (px กว้าง, ปกติ 92)', 30, 400),
      petChance: num('โอกาสดรอป Pet (สุ่มแยก, 0.001 = 0.1%)', 0, 1, 0.001),
      relicChance: num('โอกาสดรอป Relic (สุ่มแยก, 0.001 = 0.1%)', 0, 1, 0.001),
      facing: select('รูปต้นฉบับหันไปทาง', [
        { value: 'left', label: 'ซ้าย (กลับด้านตอนเดินไปขวา)' },
        { value: 'right', label: 'ขวา (กลับด้านตอนเดินไปซ้าย)' },
        { value: 'none', label: 'ไม่กลับด้าน' }
      ])
    }
  },
  ai: {
    label: 'พฤติกรรมมอนสเตอร์',
    fields: {
      speed: num('ความเร็ว (px/วิ, 0 = อยู่นิ่ง)', 0, 1000),
      aggro: num('ระยะเห็นผู้เล่น (px, 0 = ไม่ไล่)', 0, 3000),
      attackRange: num('ระยะโจมตี (px)', 10, 1000),
      attackCooldown: num('คูลดาวน์โจมตี (วิ)', 0.2, 30, 0.1),
      leash: num('ไล่ไกลสุดจากจุดเกิด (px)', 100, 5000),
      wanderRadius: num('รัศมีเดินเล่น (px)', 0, 2000)
    }
  },
  items: {
    label: 'ไอเทม',
    fields: {
      name: text('ชื่อ', 80),
      price: num('ราคา', 0, 100000000),
      atk: num('ATK', 0, 100000),
      def: num('DEF', 0, 100000),
      hp: num('HP', 0, 1000000),
      heal: num('ฟื้น HP', 0, 1000000),
      reqLevel: num('เลเวลที่ต้องการ', 1, 999),
      lootSpeed: num('ความเร็วเก็บของของ Pet (x, 1 = ปกติ)', 1, 50, 0.01),
      speedPct: num('สัตว์ขี่: ความเร็วเดิน +%', 0, 300),
      scale: num('ปรับขนาดรูปบนตัวละคร (1 = ปกติ) — โล่/สัตว์ขี่', 0.3, 3, 0.05),
      offX: num('เลื่อนรูปซ้าย-ขวา (หน่วยโลก) — โล่/สัตว์ขี่', -60, 60, 0.5),
      offY: num('เลื่อนรูปขึ้น-ลง (หน่วยโลก) — โล่/สัตว์ขี่', -60, 60, 0.5),
      seatX: num('สัตว์ขี่: จุดนั่งแนวนอน (0-1 ของรูป)', 0, 1, 0.01),
      seatY: num('สัตว์ขี่: จุดนั่งแนวตั้ง (0-1 ของรูป)', 0, 1, 0.01),
      desc: text('คำอธิบาย', 200)
    }
  },
  quests: {
    label: 'เควสต์',
    fields: {
      title: text('ชื่อเควสต์', 80),
      desc: text('คำอธิบาย', 200),
      requiredCount: num('จำนวนที่ต้องกำจัด', 1, 100000),
      rewardGold: num('รางวัล Gold', 0, 100000000),
      rewardExp: num('รางวัล EXP', 0, 100000000),
      rewardTokens: num('รางวัล Token', 0, 100000)
    }
  },
  relics: {
    label: 'Relic',
    fields: {
      name: text('ชื่อ Relic', 60),
      icon: text('ไอคอน (emoji)', 8),
      desc: text('คำอธิบาย', 200),
      hp: num('Max HP +', 0, 1000000),
      atk: num('ATK +', 0, 100000),
      def: num('DEF +', 0, 100000),
      aspd: num('ความเร็วโจมตี + (0.05 = 5%)', 0, 2, 0.01),
      critRate: num('คริติคอล + (0.05 = 5%)', 0, 0.5, 0.01)
    }
  },
  ui: {
    label: 'หน้าจอ UI',
    fields: {
      hudBg: color('สีพื้นหลังแผง HUD'),
      hudOpacity: num('ความทึบแผง HUD (%)', 30, 100),
      hudBorder: color('สีขอบแผง'),
      goldAccent: color('สีเน้น (ปุ่ม/หัวข้อ)'),
      goldBorder: color('สีกรอบหน้าต่าง'),
      hpRed: color('สีแถบ HP'),
      spBlue: color('สีแถบ SP'),
      expYellow: color('สีแถบ EXP'),
      textMain: color('สีตัวอักษรหลัก'),
      textDim: color('สีตัวอักษรรอง'),
      playerScale: num('ขนาดตัวผู้เล่น (x, ตัวคูณ — ปกติ 3.4)', 0.5, 10, 0.1),
      petScale: num('ขนาด Pet (x ของขนาดมอนสเตอร์ — ปกติ 0.84)', 0.1, 4, 0.01),
      showMinimap: select('มินิแมพ', SHOW_OPTIONS),
      showChat: select('แชท', SHOW_OPTIONS),
      showSidePanel: select('แผงปาร์ตี้/เควสต์ (ซ้ายบน)', SHOW_OPTIONS),
      showZoom: select('ปุ่มซูม', SHOW_OPTIONS)
    }
  },
  sounds: {
    label: 'เสียง',
    fixedIds: Object.keys(SOUND_DEFAULTS),
    fields: {
      wave: select('รูปคลื่นเสียง (โทน)', [
        { value: 'sine', label: 'Sine (นุ่ม)' }, { value: 'triangle', label: 'Triangle (กลมๆ)' },
        { value: 'square', label: 'Square (แข็ง/8-bit)' }, { value: 'sawtooth', label: 'Sawtooth (แหลม/หยาบ)' }
      ]),
      freq: num('ความถี่เริ่มต้น (Hz — สูง = แหลม)', 40, 4000),
      freqEnd: num('ความถี่ตอนจบ (Hz — ต่ำกว่าเริ่ม = เสียงตก)', 20, 4000),
      dur: num('ความยาว (วินาที)', 0.03, 2, 0.01),
      vol: num('ความดัง (%)', 0, 100),
      tone: num('ส่วนโทน (%)', 0, 100),
      noise: num('ส่วนเสียงซ่า/ลม (%) — ใส่เยอะ = เสียงฟัน/กระแทก', 0, 100),
      noiseFreq: num('ย่านเสียงซ่า เริ่ม (Hz)', 100, 8000),
      noiseFreqEnd: num('ย่านเสียงซ่า จบ (Hz)', 50, 8000),
      arp: select('โน้ต', [
        { value: 'none', label: 'โน้ตเดียว' }, { value: 'chord', label: 'คอร์ดไล่ขึ้น (เมเจอร์)' }, { value: 'minor', label: 'คอร์ดไล่ขึ้น (ไมเนอร์)' }
      ]),
      pitchVar: num('สุ่มระดับเสียง ± (%) — ไม่ให้ซ้ำเป๊ะทุกครั้ง', 0, 30)
    }
  },
  skills: {
    label: 'สกิล',
    freeForm: true, // new skills can be created in Studio (defaults live in src/skills.js). Not run by the game yet.
    fields: {
      name: text('ชื่อสกิล', 60),
      desc: text('คำอธิบาย', 200),
      kind: select('ประเภท', [
        { value: 'active', label: 'Active (กดใช้)' },
        { value: 'passive', label: 'Passive (ติดตัวถาวร)' }
      ]),
      rarity: select('ความหายาก (กาชา/ราคาสมุด)', [
        { value: 'common', label: 'Common' }, { value: 'uncommon', label: 'Uncommon' },
        { value: 'rare', label: 'Rare' }, { value: 'epic', label: 'Epic' }
      ]),
      weapon: select('อาวุธที่ต้องถือ', [
        { value: 'any', label: 'ไม่จำกัด' }, { value: 'melee', label: 'ประชิด (มือเปล่า/กิ่งไม้/ดาบ)' },
        { value: 'bow', label: 'ธนู' }, { value: 'staff', label: 'คฑา' }
      ]),
      target: select('เป้าหมาย', [
        { value: 'enemy', label: 'ศัตรู 1 ตัว' }, { value: 'enemy_area', label: 'พื้นที่รอบเป้าหมาย' },
        { value: 'self_area', label: 'พื้นที่รอบตัวเอง' }, { value: 'self', label: 'ตัวเอง' }
      ]),
      effect: select('ผลลัพธ์', [
        { value: 'damage', label: 'ทำดาเมจ' }, { value: 'heal', label: 'ฟื้น HP' }, { value: 'buff', label: 'บัฟตัวเอง' },
        { value: 'debuff', label: 'ดีบัฟศัตรู' }, { value: 'dash', label: 'พุ่งตัว' }
      ]),
      power: num('พลัง (% ของ ATK ต่อฮิต / % ของ Max HP ถ้าฟื้น HP)', 0, 5000),
      hits: num('จำนวนฮิต', 1, 20),
      scalesWith: select('เพิ่มดาเมจ/ฟื้นตามสเตตัส', [
        { value: 'none', label: 'ไม่เพิ่ม' }, { value: 'str', label: 'STR' }, { value: 'dex', label: 'DEX' },
        { value: 'int', label: 'INT' }, { value: 'vit', label: 'VIT' }, { value: 'agi', label: 'AGI' }, { value: 'luk', label: 'LUK' }
      ]),
      statCoef: num('ตัวคูณสเตตัส (สเตตัส × ค่านี้ ถูกบวกเพิ่ม)', 0, 50, 0.1),
      radius: num('รัศมีพื้นที่ (px)', 0, 1000),
      range: num('ระยะใช้ (px, 0 = ตามระยะอาวุธ/พุ่ง)', 0, 1500),
      spCost: num('SP ที่ใช้', 0, 1000),
      cooldown: num('คูลดาวน์ (วินาที)', 0, 600, 0.5),
      duration: num('ระยะเวลาบัฟ/ดีบัฟ (วินาที)', 0, 600),
      slowPct: num('ทำให้ศัตรูช้าลง (%)', 0, 100),
      stunSec: num('สตัน (วินาที)', 0, 10, 0.1),
      bonusAtkPct: num('ATK (%)', -100, 300),
      bonusDefPct: num('DEF (%)', -100, 300),
      bonusHpPct: num('Max HP (%)', -100, 300),
      bonusAspdPct: num('ความเร็วโจมตี (%)', -100, 300),
      bonusCritPct: num('โอกาสคริ (จุด %)', -100, 100),
      bonusSpPct: num('Max SP (%)', -100, 300),
      bonusMovePct: num('ความเร็วเดิน (%)', -100, 300),
      sound: select('เสียงตอนใช้สกิล (ปรับเสียงได้ที่แท็บ "เสียง")', [{ value: '', label: '(ตามประเภทผลลัพธ์)' }, ...Object.entries(SOUND_META).map(([value, m]) => ({ value, label: m.label }))]),
      bookSellPrice: num('ราคาขายสมุดสกิล (Gold)', 0, 100000000),
      gachaWeight: num('น้ำหนักในตู้กาชา (ยิ่งมากยิ่งออกง่าย, 0 = ไม่ออก)', 0, 1000, 0.5)
    }
  }
};

export const MAX_DROPS = 12;
export const SPAWN_LIMITS = { count: [0, 60], respawn: [1, 3600] };

function cleanValue(def, v) {
  if (def.type === 'number') {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    const clamped = Math.min(def.max, Math.max(def.min, v));
    if (def.step && def.step < 1) { const k = Math.pow(10, Math.ceil(-Math.log10(def.step))); return Math.round(clamped * k) / k; }
    return Math.round(clamped);
  }
  if (def.type === 'select') {
    return def.options.some(o => o.value === v) ? v : undefined;
  }
  if (def.type === 'color') {
    return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : undefined;
  }
  if (typeof v !== 'string') return undefined;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, def.max);
  return t || undefined;
}

// Returns a clean copy of `raw` containing only known collections/ids/fields with valid values.
// `known` = { zones: Set, maps: Set, monsters: Set, ai: Set, items: Set, quests: Set }
export function sanitizeOverrides(raw, known) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [col, spec] of Object.entries(SCHEMA)) {
    const src = raw[col];
    if (!src || typeof src !== 'object') continue;
    const dst = {};
    for (const [id, patch] of Object.entries(src)) {
      if (!patch || typeof patch !== 'object') continue;
      if (spec.fixedIds) {
        if (!spec.fixedIds.includes(id)) continue;
      } else if (spec.freeForm) {
        if (!/^[a-z0-9_]{1,40}$/.test(id)) continue;
      } else if (!known[col] || !known[col].has(id)) {
        continue;
      }
      const clean = {};
      for (const [key, def] of Object.entries(spec.fields)) {
        if (patch[key] === undefined) continue;
        const v = cleanValue(def, patch[key]);
        if (v !== undefined) clean[key] = v;
      }
      if (Object.keys(clean).length) dst[id] = clean;
    }
    if (Object.keys(dst).length) out[col] = dst;
  }
  // Map objects: whole list per map
  if (raw.objects && typeof raw.objects === 'object' && known.maps) {
    const objects = {};
    for (const [mapId, list] of Object.entries(raw.objects)) {
      if (!known.maps.has(mapId) || !Array.isArray(list)) continue;
      const clean = [];
      for (const o of list.slice(0, MAX_OBJECTS_PER_MAP)) {
        if (!o || !OBJECT_TYPES[o.type]) continue;
        const x = Number(o.x), y = Number(o.y), scale = Number(o.scale ?? 1);
        if (![x, y, scale].every(Number.isFinite)) continue;
        clean.push({
          type: o.type,
          x: Math.round(Math.min(9600, Math.max(0, x))),
          y: Math.round(Math.min(9600, Math.max(0, y))),
          scale: Math.round(Math.min(3, Math.max(0.3, scale)) * 100) / 100,
          solid: !!o.solid
        });
      }
      objects[mapId] = clean;
    }
    if (Object.keys(objects).length) out.objects = objects;
  }
  // Drop tables: whole list per monster (an empty list means "drops nothing")
  if (raw.drops && typeof raw.drops === 'object' && known.monsters && known.items) {
    const drops = {};
    for (const [mid, list] of Object.entries(raw.drops)) {
      if (!known.monsters.has(mid) || !Array.isArray(list)) continue;
      const seen = new Set();
      const clean = [];
      let sum = 0; // one roll per kill: the table can't add up to more than 100%
      for (const d of list.slice(0, MAX_DROPS)) {
        if (!d || !known.items.has(d.itemId) || seen.has(d.itemId)) continue;
        const chance = Number(d.chance);
        if (!Number.isFinite(chance)) continue;
        const c = Math.round(Math.min(1, Math.max(0.001, chance)) * 1000) / 1000;
        if (sum + c > 1.0001) continue;
        sum += c;
        seen.add(d.itemId);
        clean.push({ itemId: d.itemId, chance: c });
      }
      drops[mid] = clean;
    }
    if (Object.keys(drops).length) out.drops = drops;
  }
  return out;
}

// Copy the editable fields of the current data so they can be restored / shown as "default".
export function snapshotEditable(data) {
  const snap = { zones: {}, maps: {}, monsters: {}, ai: {}, items: {}, quests: {}, relics: {}, drops: {}, ui: { main: { ...UI_DEFAULTS } }, objects: {}, skills: {}, sounds: {} };
  const pick = (obj, fields) => {
    const o = {};
    for (const k of Object.keys(fields)) if (obj && obj[k] !== undefined) o[k] = obj[k];
    return o;
  };
  data.ZONES.forEach(z => { snap.zones[z.id] = pick(z, SCHEMA.zones.fields); });
  for (const [id, def] of Object.entries(data.MAP_DEFS)) {
    snap.maps[id] = { size: def.width, texture: def.texture || 'plain', floorImage: def.floorImage || '', floor: def.floor, wall: def.wall };
    snap.objects[id] = (def.objects || []).map(o => ({ ...o }));
  }
  for (const [id, m] of Object.entries(data.MONSTERS)) {
    snap.monsters[id] = { size: 92, facing: 'left', ...pick(m, SCHEMA.monsters.fields) };
    snap.ai[id] = { ...data.MONSTER_AI_DEFAULT, ...(data.MONSTER_AI[id] || {}) };
    snap.drops[id] = (m.drops || []).map(d => ({ itemId: d.itemId, chance: d.chance }));
  }
  for (const [id, it] of Object.entries(data.ITEMS)) snap.items[id] = pick(it, SCHEMA.items.fields);
  for (const [id, r] of Object.entries(data.RELICS || {})) {
    snap.relics[id] = { name: r.name, icon: r.icon, desc: r.desc, hp: 0, atk: 0, def: 0, aspd: 0, critRate: 0, ...pick(r.statBonus || {}, { hp: 1, atk: 1, def: 1, aspd: 1, critRate: 1 }) };
  }
  data.QUESTS.forEach(q => { snap.quests[q.id] = pick(q, SCHEMA.quests.fields); });
  for (const [id, sk] of Object.entries(data.SKILLS || {})) snap.skills[id] = pick(sk, SCHEMA.skills.fields);
  for (const [id, sd] of Object.entries(SOUND_DEFAULTS)) snap.sounds[id] = { ...sd };
  return snap;
}

// Write a snapshot (defaults) or an override set onto the live data objects.
export function applyOverrides(data, o) {
  if (!o) return;
  for (const [id, p] of Object.entries(o.zones || {})) {
    const z = data.ZONES.find(zz => zz.id === id);
    if (z) Object.assign(z, p);
  }
  for (const [id, p] of Object.entries(o.maps || {})) {
    const def = data.MAP_DEFS[id];
    if (!def) continue;
    if (p.size) {
      def.width = def.height = p.size;
      def.spawn = { x: p.size / 2, y: p.size / 2 };
    }
    if (p.texture) def.texture = p.texture;
    if (p.floorImage !== undefined) def.floorImage = p.floorImage;
    if (p.floor) def.floor = p.floor;
    if (p.wall) def.wall = p.wall;
  }
  for (const [id, list] of Object.entries(o.objects || {})) {
    if (data.MAP_DEFS[id]) data.MAP_DEFS[id].objects = list.map(ob => ({ ...ob }));
  }
  for (const [id, p] of Object.entries(o.monsters || {})) {
    if (data.MONSTERS[id]) Object.assign(data.MONSTERS[id], p);
  }
  for (const [id, p] of Object.entries(o.ai || {})) {
    data.MONSTER_AI[id] = { ...(data.MONSTER_AI[id] || {}), ...p };
  }
  for (const [id, p] of Object.entries(o.items || {})) {
    if (data.ITEMS[id]) Object.assign(data.ITEMS[id], p);
  }
  const STAT_LABEL = { hp: 'Max HP', atk: 'ATK', def: 'DEF', aspd: 'ASPD', critRate: 'Crit' };
  for (const [id, p] of Object.entries(o.relics || {})) {
    const r = data.RELICS && data.RELICS[id];
    if (!r) continue;
    for (const k of ['name', 'icon', 'desc']) if (p[k] !== undefined) r[k] = p[k];
    r.statBonus = r.statBonus || {};
    for (const k of Object.keys(STAT_LABEL)) if (p[k] !== undefined) { if (p[k] > 0) r.statBonus[k] = p[k]; else delete r.statBonus[k]; }
    r.bonusText = Object.entries(r.statBonus).filter(([, v]) => v > 0).map(([k, v]) =>
      STAT_LABEL[k] ? `+${k === 'aspd' || k === 'critRate' ? Math.round(v * 100) + '%' : v} ${STAT_LABEL[k]}` : null).filter(Boolean).join(', ') + ' ถาวร';
  }
  for (const [id, p] of Object.entries(o.quests || {})) {
    const q = data.QUESTS.find(qq => qq.id === id);
    if (q) Object.assign(q, p);
  }
  for (const [id, list] of Object.entries(o.drops || {})) {
    if (data.MONSTERS[id]) data.MONSTERS[id].drops = list.map(d => ({ itemId: d.itemId, chance: d.chance }));
  }
  if (o.ui && o.ui.main) data.UI = { ...UI_DEFAULTS, ...o.ui.main };
  // skills: merge field by field, so editing one value of a default skill keeps the rest
  data.SKILLS = data.SKILLS || {};
  for (const [id, p] of Object.entries(o.skills || {})) data.SKILLS[id] = { ...(data.SKILLS[id] || {}), ...p };
  if (data.SOUNDS) for (const [id, p] of Object.entries(o.sounds || {})) data.SOUNDS[id] = { ...(data.SOUNDS[id] || {}), ...p };
}

export function validateSpawns(raw, mapIds, monsterIds) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const s of raw.slice(0, 200)) {
    if (!s || typeof s !== 'object') continue;
    if (!mapIds.has(s.map) || !monsterIds.has(s.templateId)) continue;
    const count = Math.min(SPAWN_LIMITS.count[1], Math.max(SPAWN_LIMITS.count[0], Math.round(Number(s.count))));
    const respawn = Math.min(SPAWN_LIMITS.respawn[1], Math.max(SPAWN_LIMITS.respawn[0], Math.round(Number(s.respawn))));
    if (!Number.isFinite(count) || !Number.isFinite(respawn)) continue;
    out.push({ map: s.map, templateId: s.templateId, count, respawn });
  }
  return out;
}

// Put the live data back to the untouched defaults (also removes skills that were only added through Studio).
export function restoreDefaults(data, defaults) {
  applyOverrides(data, defaults);
  if (data.SKILLS) for (const id of Object.keys(data.SKILLS)) if (!defaults.skills || !defaults.skills[id]) delete data.SKILLS[id];
}

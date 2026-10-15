// Studio overrides: editable game data layered on top of the defaults in data.js / maps.js.
// Shared by the server (validation + apply) and the client (apply on load) so both always agree.
//
// overrides = {
//   zones:    { [zoneId]:    { name, desc, reqLevel } },
//   maps:     { [zoneId]:    { size, floor, wall } },
//   monsters: { [monsterId]: { name, level, hp, atk, def, exp, size } },
//   ai:       { [monsterId]: { speed, aggro, attackRange, attackCooldown, leash, wanderRadius } },
//   items:    { [itemId]:    { name, price, atk, def, hp, heal, reqLevel, desc } },
//   quests:   { [questId]:   { title, desc, requiredCount, rewardGold, rewardExp, rewardTokens } },
//   skills:   { [skillId]:   { name, desc } }   // free-form list, not wired into the game yet
//   drops:    { [monsterId]: [ { itemId, chance } ] }  // replaces that monster's drop list (chance 0.001..1)
// }

const text = (label, max) => ({ type: 'text', label, max });
const num = (label, min, max, step = 1) => ({ type: 'number', label, min, max, step });
const color = (label) => ({ type: 'color', label });

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
      floor: color('สีพื้น'),
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
      size: num('ขนาดรูป (px กว้าง, ปกติ 92)', 30, 400)
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
  skills: {
    label: 'สกิล',
    freeForm: true, // ids are created in Studio; the game does not use them yet
    fields: {
      name: text('ชื่อสกิล', 60),
      desc: text('คำอธิบาย', 200)
    }
  }
};

export const MAX_DROPS = 12;
export const SPAWN_LIMITS = { count: [0, 60], respawn: [1, 3600] };

function cleanValue(def, v) {
  if (def.type === 'number') {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    const clamped = Math.min(def.max, Math.max(def.min, v));
    return def.step && def.step < 1 ? Math.round(clamped * 10) / 10 : Math.round(clamped);
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
      if (spec.freeForm) {
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
  // Drop tables: whole list per monster (an empty list means "drops nothing")
  if (raw.drops && typeof raw.drops === 'object' && known.monsters && known.items) {
    const drops = {};
    for (const [mid, list] of Object.entries(raw.drops)) {
      if (!known.monsters.has(mid) || !Array.isArray(list)) continue;
      const seen = new Set();
      const clean = [];
      for (const d of list.slice(0, MAX_DROPS)) {
        if (!d || !known.items.has(d.itemId) || seen.has(d.itemId)) continue;
        const chance = Number(d.chance);
        if (!Number.isFinite(chance)) continue;
        seen.add(d.itemId);
        clean.push({ itemId: d.itemId, chance: Math.round(Math.min(1, Math.max(0.001, chance)) * 1000) / 1000 });
      }
      drops[mid] = clean;
    }
    if (Object.keys(drops).length) out.drops = drops;
  }
  return out;
}

// Copy the editable fields of the current data so they can be restored / shown as "default".
export function snapshotEditable(data) {
  const snap = { zones: {}, maps: {}, monsters: {}, ai: {}, items: {}, quests: {}, drops: {} };
  const pick = (obj, fields) => {
    const o = {};
    for (const k of Object.keys(fields)) if (obj && obj[k] !== undefined) o[k] = obj[k];
    return o;
  };
  data.ZONES.forEach(z => { snap.zones[z.id] = pick(z, SCHEMA.zones.fields); });
  for (const [id, def] of Object.entries(data.MAP_DEFS)) {
    snap.maps[id] = { size: def.width, floor: def.floor, wall: def.wall };
  }
  for (const [id, m] of Object.entries(data.MONSTERS)) {
    snap.monsters[id] = { size: 92, ...pick(m, SCHEMA.monsters.fields) };
    snap.ai[id] = { ...data.MONSTER_AI_DEFAULT, ...(data.MONSTER_AI[id] || {}) };
    snap.drops[id] = (m.drops || []).map(d => ({ itemId: d.itemId, chance: d.chance }));
  }
  for (const [id, it] of Object.entries(data.ITEMS)) snap.items[id] = pick(it, SCHEMA.items.fields);
  data.QUESTS.forEach(q => { snap.quests[q.id] = pick(q, SCHEMA.quests.fields); });
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
    if (p.floor) def.floor = p.floor;
    if (p.wall) def.wall = p.wall;
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
  for (const [id, p] of Object.entries(o.quests || {})) {
    const q = data.QUESTS.find(qq => qq.id === id);
    if (q) Object.assign(q, p);
  }
  for (const [id, list] of Object.entries(o.drops || {})) {
    if (data.MONSTERS[id]) data.MONSTERS[id].drops = list.map(d => ({ itemId: d.itemId, chance: d.chance }));
  }
  data.SKILLS = { ...(data.SKILLS || {}), ...(o.skills || {}) };
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

// Map definitions shared by the client and the server.
// Maps are plain open fields for now (flat floor + wall around the edge).
// Objects (trees, buildings, NPCs, portals...) can be added later via `objects`.

export const TILE_SIZE = 32; // 1 "ช่อง" = 32 px (used by Auto range, grid and future collision)

// Floor textures drawn by src/textures.js (tiled, tinted by the map's floor colour). 'plain' = flat colour.
export const TEXTURES = {
  plain: 'เรียบ (สีเดียว)',
  grass: 'หญ้า',
  dirt: 'ดิน',
  stone: 'หิน',
  sand: 'ทราย',
  cobble: 'ปูหินก้อน',
  tiles: 'กระเบื้อง',
  lava: 'ลาวา',
  snow: 'หิมะ'
};

// Objects that can be placed on a map from Studio. `r` = collision radius (px) when the object is solid.
export const OBJECT_TYPES = {
  tree:    { label: '🌳 ต้นไม้',   size: 96, r: 18 },
  pine:    { label: '🌲 ต้นสน',    size: 96, r: 16 },
  bush:    { label: '🌿 พุ่มไม้',   size: 48, r: 18 },
  rock:    { label: '🪨 ก้อนหิน',  size: 56, r: 24 },
  crate:   { label: '📦 ลังไม้',    size: 40, r: 18 },
  house:   { label: '🏠 บ้าน',     size: 160, r: 64 },
  sign:    { label: '🪧 ป้าย',     size: 48, r: 10 },
  flower:  { label: '🌸 ดอกไม้',   size: 32, r: 0 },
  torch:   { label: '🔥 ตะเกียง',  size: 48, r: 8 }
};
export const MAX_OBJECTS_PER_MAP = 500;

// Every map is a square. Width/height are in pixels (multiples of TILE_SIZE); players spawn in the centre.
export const MAP_DEFS = {
  town: {
    width: 3200, height: 3200,
    floor: '#94a3b8', grid: 'rgba(255,255,255,0.07)', wall: '#334155', texture: 'plain',
    spawn: { x: 1600, y: 1600 },
    objects: []
  },
  meadows: {
    width: 4800, height: 4800,
    floor: '#86c98b', grid: 'rgba(0,0,0,0.07)', wall: '#14532d', texture: 'plain',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  misty_forest: {
    width: 4800, height: 4800,
    floor: '#64748b', grid: 'rgba(0,0,0,0.10)', wall: '#1e293b', texture: 'plain',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  bandit_hideout: {
    width: 4800, height: 4800,
    floor: '#a8895a', grid: 'rgba(0,0,0,0.10)', wall: '#422006', texture: 'plain',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  goblin_caverns: {
    width: 4800, height: 4800,
    floor: '#a16207', grid: 'rgba(0,0,0,0.10)', wall: '#451a03', texture: 'plain',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  volcano: {
    width: 4800, height: 4800,
    floor: '#b91c1c', grid: 'rgba(0,0,0,0.12)', wall: '#450a0a', texture: 'plain',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  bone_crypt: {
    width: 4800, height: 4800,
    floor: '#57534e', grid: 'rgba(0,0,0,0.12)', wall: '#1c1917', texture: 'plain',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  haunted_ruins: {
    width: 4800, height: 4800,
    floor: '#6366a8', grid: 'rgba(0,0,0,0.12)', wall: '#1e1b4b', texture: 'plain',
    spawn: { x: 2400, y: 2400 },
    objects: []
  }
};

export function getMapDef(zoneId) {
  return MAP_DEFS[zoneId] || MAP_DEFS.meadows;
}

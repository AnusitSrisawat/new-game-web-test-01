// Map definitions shared by the client and the server.
// Maps are plain open fields for now (flat floor + wall around the edge).
// Objects (trees, buildings, NPCs, portals...) can be added later via `objects`.

export const TILE_SIZE = 32; // 1 "ช่อง" = 32 px (used by Auto range, grid and future collision)

// Every map is a square. Width/height are in pixels (multiples of TILE_SIZE); players spawn in the centre.
export const MAP_DEFS = {
  town: {
    width: 3200, height: 3200,
    floor: '#94a3b8', grid: 'rgba(255,255,255,0.07)', wall: '#334155',
    spawn: { x: 1600, y: 1600 },
    objects: []
  },
  meadows: {
    width: 4800, height: 4800,
    floor: '#86c98b', grid: 'rgba(0,0,0,0.07)', wall: '#14532d',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  misty_forest: {
    width: 4800, height: 4800,
    floor: '#64748b', grid: 'rgba(0,0,0,0.10)', wall: '#1e293b',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  bandit_hideout: {
    width: 4800, height: 4800,
    floor: '#a8895a', grid: 'rgba(0,0,0,0.10)', wall: '#422006',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  goblin_caverns: {
    width: 4800, height: 4800,
    floor: '#a16207', grid: 'rgba(0,0,0,0.10)', wall: '#451a03',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  volcano: {
    width: 4800, height: 4800,
    floor: '#b91c1c', grid: 'rgba(0,0,0,0.12)', wall: '#450a0a',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  bone_crypt: {
    width: 4800, height: 4800,
    floor: '#57534e', grid: 'rgba(0,0,0,0.12)', wall: '#1c1917',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  haunted_ruins: {
    width: 4800, height: 4800,
    floor: '#6366a8', grid: 'rgba(0,0,0,0.12)', wall: '#1e1b4b',
    spawn: { x: 2400, y: 2400 },
    objects: []
  },
  boss_lair: {
    width: 3200, height: 3200,
    floor: '#7f1d1d', grid: 'rgba(0,0,0,0.15)', wall: '#220505',
    spawn: { x: 1600, y: 1600 },
    objects: []
  }
};

export function getMapDef(zoneId) {
  return MAP_DEFS[zoneId] || MAP_DEFS.meadows;
}

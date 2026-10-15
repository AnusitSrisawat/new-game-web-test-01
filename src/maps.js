// Map definitions shared by the client and the server.
// Maps are plain open fields for now (flat floor + wall around the edge).
// Objects (trees, buildings, NPCs, portals...) can be added later via `objects`.

export const TILE_SIZE = 32; // 1 "ช่อง" = 32 px (used by Auto range, grid and future collision)

// Width/height are in pixels and must be multiples of TILE_SIZE.
export const MAP_DEFS = {
  town: {
    width: 3200, height: 2400,
    floor: '#94a3b8', grid: 'rgba(255,255,255,0.07)', wall: '#334155',
    spawn: { x: 1600, y: 1200 },
    objects: []
  },
  meadows: {
    width: 4800, height: 3200,
    floor: '#86c98b', grid: 'rgba(0,0,0,0.07)', wall: '#14532d',
    spawn: { x: 800, y: 1200 },
    objects: []
  },
  misty_forest: {
    width: 4800, height: 3200,
    floor: '#64748b', grid: 'rgba(0,0,0,0.10)', wall: '#1e293b',
    spawn: { x: 800, y: 1200 },
    objects: []
  },
  goblin_caverns: {
    width: 4800, height: 3200,
    floor: '#a16207', grid: 'rgba(0,0,0,0.10)', wall: '#451a03',
    spawn: { x: 800, y: 1200 },
    objects: []
  },
  volcano: {
    width: 4800, height: 3200,
    floor: '#b91c1c', grid: 'rgba(0,0,0,0.12)', wall: '#450a0a',
    spawn: { x: 800, y: 1200 },
    objects: []
  },
  boss_lair: {
    width: 3200, height: 2400,
    floor: '#7f1d1d', grid: 'rgba(0,0,0,0.15)', wall: '#220505',
    spawn: { x: 1600, y: 1550 },
    objects: []
  }
};

export function getMapDef(zoneId) {
  return MAP_DEFS[zoneId] || MAP_DEFS.meadows;
}

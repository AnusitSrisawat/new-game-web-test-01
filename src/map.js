// Plain flat world map: one rectangular field per zone with a wall around the edge.
// Zone data (size, colors, spawn) lives in maps.js and is shared with the server.
import { TILE_SIZE, OBJECT_TYPES, getMapDef } from './maps.js';
import { getFloorPattern, drawMapObject } from './textures.js';

export class WorldMap {
  constructor() {
    this.setZoneTheme('meadows');
  }

  setZoneTheme(zoneId) {
    this.currentZoneId = zoneId || 'meadows';
    this.def = getMapDef(this.currentZoneId);
    this.width = this.def.width;
    this.height = this.def.height;
  }

  // The outermost tile ring is wall; solid Studio objects block too.
  isWalkable(x, y, radius = 16) {
    const wall = TILE_SIZE;
    if (x - radius < wall || x + radius > this.width - wall ||
        y - radius < wall || y + radius > this.height - wall) return false;
    for (const o of this.def.objects || []) {
      if (!o.solid) continue;
      const r = (OBJECT_TYPES[o.type]?.r || 0) * (o.scale || 1);
      if (r > 0 && Math.hypot(x - o.x, y - o.y) < r + radius * 0.6) return false;
    }
    return true;
  }

  renderGround(ctx, camera) {
    const minX = Math.max(0, camera.x);
    const maxX = Math.min(this.width, camera.x + camera.w);
    const minY = Math.max(0, camera.y);
    const maxY = Math.min(this.height, camera.y + camera.h);
    const def = this.def;

    // Floor
    ctx.fillStyle = def.floor;
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    const pattern = getFloorPattern(ctx, def.texture, def.floor, def.floorImage);
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    }

    // Tile grid
    ctx.strokeStyle = def.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(minX / TILE_SIZE) * TILE_SIZE; x < maxX; x += TILE_SIZE) {
      ctx.moveTo(x + 0.5, minY);
      ctx.lineTo(x + 0.5, maxY);
    }
    for (let y = Math.ceil(minY / TILE_SIZE) * TILE_SIZE; y < maxY; y += TILE_SIZE) {
      ctx.moveTo(minX, y + 0.5);
      ctx.lineTo(maxX, y + 0.5);
    }
    ctx.stroke();

    // Wall ring
    ctx.fillStyle = def.wall;
    ctx.fillRect(0, 0, this.width, TILE_SIZE);
    ctx.fillRect(0, this.height - TILE_SIZE, this.width, TILE_SIZE);
    ctx.fillRect(0, 0, TILE_SIZE, this.height);
    ctx.fillRect(this.width - TILE_SIZE, 0, TILE_SIZE, this.height);
  }

  // Objects placed in Studio, drawn back-to-front (only those near the camera).
  renderObjects(ctx, camera) {
    const list = this.def.objects;
    if (!list || !list.length) return;
    const pad = 200;
    const visible = list.filter(o => o.x > camera.x - pad && o.x < camera.x + camera.w + pad &&
                                     o.y > camera.y - pad && o.y < camera.y + camera.h + pad + 100);
    visible.sort((a, b) => a.y - b.y);
    for (const o of visible) drawMapObject(ctx, o);
  }
}

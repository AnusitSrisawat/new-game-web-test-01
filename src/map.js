// World Map, Procedural Compositing & Collision Engine with Multi-Zone Themes
export class WorldMap {
  constructor(width = 3200, height = 2400) {
    this.width = width;
    this.height = height;
    this.currentZoneId = 'meadows';

    // Environmental elements
    this.trees = [];
    this.rocks = [];
    this.bushes = [];
    this.flowers = [];
    this.fences = [];
    this.torches = [];
    this.crystals = [];
    this.bridges = [
      { x: 1550, y: 700, width: 140, height: 90 },
      { x: 1530, y: 1550, width: 140, height: 90 }
    ];

    // River definition (Runs vertically around x = 1600)
    this.riverX = 1600;
    this.riverWidth = 110;

    // Town fountain position
    this.fountainX = 1600;
    this.fountainY = 1200;

    this.generateMapElements();
  }

  setZoneTheme(zoneId) {
    this.currentZoneId = zoneId || 'meadows';
  }

  generateMapElements() {
    this.trees = [];
    this.rocks = [];
    this.bushes = [];
    this.flowers = [];
    this.fences = [];
    this.torches = [];
    this.crystals = [];

    // 1. Generate Trees (Border boundaries)
    for (let x = 60; x < this.width; x += 120) {
      this.trees.push({ x, y: 60, r: 35 });
      this.trees.push({ x, y: this.height - 60, r: 35 });
    }
    for (let y = 140; y < this.height - 140; y += 120) {
      this.trees.push({ x: 60, y, r: 35 });
      this.trees.push({ x: this.width - 60, y, r: 35 });
    }

    // Forest clusters
    for (let i = 0; i < 45; i++) {
      const tx = 180 + Math.random() * 850;
      const ty = 150 + Math.random() * 750;
      this.trees.push({ x: tx, y: ty, r: 36, scale: 0.85 + Math.random() * 0.3 });
    }

    for (let i = 0; i < 50; i++) {
      const tx = 1900 + Math.random() * 1050;
      const ty = 1100 + Math.random() * 950;
      this.trees.push({ x: tx, y: ty, r: 36, scale: 0.85 + Math.random() * 0.3 });
    }

    // 2. Rocks & Boulders
    for (let i = 0; i < 35; i++) {
      const rx = 200 + Math.random() * (this.width - 400);
      const ry = 200 + Math.random() * (this.height - 400);
      if (Math.abs(rx - this.riverX) > 100) {
        this.rocks.push({ x: rx, y: ry, r: 22 + Math.random() * 14, grayTone: 180 + Math.random() * 40 });
      }
    }

    // 3. Bushes
    for (let i = 0; i < 60; i++) {
      const bx = 120 + Math.random() * (this.width - 240);
      const by = 120 + Math.random() * (this.height - 240);
      if (Math.abs(bx - this.riverX) > 80) {
        this.bushes.push({ x: bx, y: by, r: 18 + Math.random() * 8 });
      }
    }

    // 4. Wildflowers
    const colors = ['#c084fc', '#fef08a', '#ffffff', '#f472b6', '#60a5fa'];
    for (let i = 0; i < 220; i++) {
      const fx = 80 + Math.random() * (this.width - 160);
      const fy = 80 + Math.random() * (this.height - 160);
      if (Math.abs(fx - this.riverX) > 60) {
        this.flowers.push({
          x: fx,
          y: fy,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 3 + Math.random() * 2.5
        });
      }
    }

    // 5. Wooden Fences
    for (let x = 600; x < 950; x += 40) {
      this.fences.push({ x, y: 1100 });
      this.fences.push({ x, y: 1350 });
    }

    // 6. Torches & Braziers for Cavern / Volcano / Boss Lair
    for (let i = 0; i < 24; i++) {
      this.torches.push({
        x: 300 + (i % 6) * 500 + Math.random() * 40,
        y: 300 + Math.floor(i / 6) * 550 + Math.random() * 40
      });
    }

    // 7. Glowing Crystals for Caverns
    for (let i = 0; i < 30; i++) {
      this.crystals.push({
        x: 200 + Math.random() * (this.width - 400),
        y: 200 + Math.random() * (this.height - 400),
        color: i % 2 === 0 ? '#c084fc' : '#38bdf8',
        size: 14 + Math.random() * 10
      });
    }
  }

  // Check if a point is walkable (Collision Detection)
  isWalkable(x, y, radius = 16) {
    // 1. Boundary check
    if (x - radius < 60 || x + radius > this.width - 60 || y - radius < 60 || y + radius > this.height - 60) {
      return false;
    }

    // 2. Town fountain collision
    if (this.currentZoneId === 'town') {
      const distFountain = Math.hypot(x - this.fountainX, y - this.fountainY);
      if (distFountain < 75 + radius) return false;
      return true;
    }

    // 3. Boss Lair arena is open
    if (this.currentZoneId === 'boss_lair') {
      return true;
    }

    // 4. River check (Can cross if on a bridge) - Applicable for Meadows & Forest
    if (this.currentZoneId === 'meadows' || this.currentZoneId === 'misty_forest') {
      const inRiverZone = (x + radius > this.riverX - this.riverWidth / 2) && (x - radius < this.riverX + this.riverWidth / 2);
      if (inRiverZone) {
        let onBridge = false;
        for (const b of this.bridges) {
          if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
            onBridge = true;
            break;
          }
        }
        if (!onBridge) return false;
      }
    }

    // 5. Rocks collision
    for (const rock of this.rocks) {
      const dist = Math.hypot(x - rock.x, y - rock.y);
      if (dist < radius + rock.r * 0.7) return false;
    }

    return true;
  }

  // Render the ground terrain layer according to currentZoneId
  renderGround(ctx, camera) {
    const minX = Math.max(0, camera.x);
    const maxX = Math.min(this.width, camera.x + camera.w);
    const minY = Math.max(0, camera.y);
    const maxY = Math.min(this.height, camera.y + camera.h);

    const zid = this.currentZoneId;

    if (zid === 'town') {
      // --- CENTRAL TOWN (PRONTERA) ---
      // Cobblestone stone plazas and paved boulevards
      ctx.fillStyle = '#64748b'; // stone gray
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      // Cobblestone grid pavers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      const startX = Math.floor(minX / 80) * 80;
      const startY = Math.floor(minY / 80) * 80;
      for (let x = startX; x < maxX; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
        ctx.stroke();
      }
      for (let y = startY; y < maxY; y += 80) {
        ctx.beginPath();
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
        ctx.stroke();
      }

      // Grand Center Plaza (around 1600, 1200)
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(this.fountainX, this.fountainY, 320, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Outer golden promenade ring
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.fountainX, this.fountainY, 300, 0, Math.PI * 2);
      ctx.stroke();

      // Animated Water Fountain
      this.renderFountain(ctx);

    } else if (zid === 'misty_forest') {
      // --- MISTY FOREST ---
      ctx.fillStyle = '#1e293b'; // dark slate teal
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      // Dark moss patches
      ctx.fillStyle = '#0f172a';
      const startTileX = Math.floor(minX / 100) * 100;
      const startTileY = Math.floor(minY / 100) * 100;
      for (let x = startTileX; x < maxX; x += 140) {
        for (let y = startTileY; y < maxY; y += 140) {
          ctx.beginPath();
          ctx.arc(x + 20, y + 20, 24, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      this.renderRoads(ctx, '#334155');
      this.renderRiver(ctx, '#0e7490');

    } else if (zid === 'goblin_caverns') {
      // --- GOBLIN CAVERNS ---
      ctx.fillStyle = '#292524'; // cave stone dark brown
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      // Rough rock texture
      ctx.fillStyle = '#1c1917';
      const startTileX = Math.floor(minX / 90) * 90;
      const startTileY = Math.floor(minY / 90) * 90;
      for (let x = startTileX; x < maxX; x += 120) {
        for (let y = startTileY; y < maxY; y += 120) {
          ctx.fillRect(x, y, 40, 25);
        }
      }

      // Wooden minecart rails
      this.renderMineRails(ctx);

    } else if (zid === 'volcano') {
      // --- LAVA VOLCANO ---
      ctx.fillStyle = '#18181b'; // obsidian black
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      // Basalt cracks
      ctx.fillStyle = '#27272a';
      for (let x = Math.floor(minX / 120) * 120; x < maxX; x += 120) {
        for (let y = Math.floor(minY / 120) * 120; y < maxY; y += 120) {
          ctx.fillRect(x + 10, y + 10, 50, 30);
        }
      }

      // Flowing Molten Lava River
      this.renderRiver(ctx, '#ea580c', true);

    } else if (zid === 'boss_lair') {
      // --- DRAGON'S LAIR (BOSS ARENA) ---
      ctx.fillStyle = '#2e1065'; // imperial obsidian
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      // Scorched ground cracks
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      // Giant concentric runic summoning circles
      const cx = 1600;
      const cy = 1200;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, 550, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 380, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 200, 0, Math.PI * 2);
      ctx.stroke();

      // Runic star lines
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200);
        ctx.lineTo(cx + Math.cos(a) * 550, cy + Math.sin(a) * 550);
        ctx.stroke();
      }

    } else {
      // --- GREEN MEADOWS (DEFAULT) ---
      ctx.fillStyle = '#65a30d'; // vibrant grass green
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      // Subtle grass patch patterns
      ctx.fillStyle = '#4d7c0f';
      const startTileX = Math.floor(minX / 100) * 100;
      const startTileY = Math.floor(minY / 100) * 100;
      for (let x = startTileX; x < maxX; x += 120) {
        for (let y = startTileY; y < maxY; y += 120) {
          ctx.beginPath();
          ctx.arc(x + 20, y + 20, 16, 0, Math.PI * 2);
          ctx.arc(x + 36, y + 26, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Winding Dirt Roads & River
      this.renderRoads(ctx);
      this.renderRiver(ctx);

      // Wildflowers
      for (const f of this.flowers) {
        if (f.x >= minX && f.x <= maxX && f.y >= minY && f.y <= maxY) {
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  renderFountain(ctx) {
    const fx = this.fountainX;
    const fy = this.fountainY;

    // Stone Basin
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(fx, fy, 85, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8'; // Crystal clear blue water
    ctx.beginPath();
    ctx.arc(fx, fy, 75, 0, Math.PI * 2);
    ctx.fill();

    // Center fountain pillar
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(fx, fy, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Animated water spray droplets
    const time = Date.now() / 250;
    ctx.fillStyle = '#e0f2fe';
    for (let i = 0; i < 8; i++) {
      const angle = time + (i * Math.PI * 2) / 8;
      const dist = 35 + Math.sin(time * 2 + i) * 22;
      const px = fx + Math.cos(angle) * dist;
      const py = fy + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderRoads(ctx, color = '#d4b996') {
    ctx.lineWidth = 90;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    // Main road
    ctx.beginPath();
    ctx.moveTo(100, 1200);
    ctx.bezierCurveTo(600, 1200, 1100, 750, 1550, 750);
    ctx.lineTo(1700, 750);
    ctx.bezierCurveTo(2200, 750, 2600, 600, 3100, 600);
    ctx.stroke();

    // Secondary road
    ctx.beginPath();
    ctx.moveTo(850, 1000);
    ctx.bezierCurveTo(1100, 1250, 1300, 1600, 1550, 1600);
    ctx.lineTo(1700, 1600);
    ctx.bezierCurveTo(2000, 1600, 2400, 1900, 3000, 1900);
    ctx.stroke();

    // Gathering Plaza
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(750, 1220, 160, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  renderMineRails(ctx) {
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(200, 800);
    ctx.lineTo(3000, 800);
    ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(200, 795);
    ctx.lineTo(3000, 795);
    ctx.moveTo(200, 805);
    ctx.lineTo(3000, 805);
    ctx.stroke();
  }

  renderRiver(ctx, waterColor = '#0284c7', isLava = false) {
    const rx = this.riverX;
    const rw = this.riverWidth;

    // River Water or Lava
    ctx.fillStyle = waterColor;
    ctx.beginPath();
    ctx.moveTo(rx - rw / 2, 0);
    ctx.bezierCurveTo(rx - 80, 600, rx + 60, 1400, rx - rw / 2, this.height);
    ctx.lineTo(rx + rw / 2, this.height);
    ctx.bezierCurveTo(rx + 60 + rw, 1400, rx - 80 + rw, 600, rx + rw / 2, 0);
    ctx.closePath();
    ctx.fill();

    // Glow highlights
    ctx.strokeStyle = isLava ? '#fef08a' : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    for (let wy = 80; wy < this.height; wy += 140) {
      ctx.beginPath();
      ctx.arc(rx, wy, 35, 0, Math.PI * 0.45);
      ctx.stroke();
    }

    // Wooden Bridges over the river (if not lava)
    if (!isLava) {
      for (const b of this.bridges) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 4;
        ctx.strokeRect(b.x, b.y, b.width, b.height);

        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2;
        for (let px = b.x + 8; px < b.x + b.width; px += 16) {
          ctx.beginPath();
          ctx.moveTo(px, b.y);
          ctx.lineTo(px, b.y + b.height);
          ctx.stroke();
        }
      }
    }
  }

  // Render static objects (Rocks, Trees, Torches, Crystals)
  renderObjects(ctx, camera) {
    const minX = camera.x - 100;
    const maxX = camera.x + camera.w + 100;
    const minY = camera.y - 120;
    const maxY = camera.y + camera.h + 120;

    const zid = this.currentZoneId;

    // 1. Torches / Braziers (in town, caverns, volcano, boss lair)
    if (zid === 'boss_lair' || zid === 'volcano' || zid === 'goblin_caverns' || zid === 'town') {
      const flameColor = zid === 'town' ? '#fde047' : '#ef4444';
      for (const t of this.torches) {
        if (t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY) {
          // Brazier base
          ctx.fillStyle = '#334155';
          ctx.fillRect(t.x - 8, t.y, 16, 20);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(t.x - 12, t.y - 4, 24, 6);

          // Animated fire flame
          const fBob = Math.sin((Date.now() + t.x) / 100) * 3;
          ctx.fillStyle = flameColor;
          ctx.shadowColor = flameColor;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(t.x, t.y - 10 + fBob, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // 2. Crystals in Caverns
    if (zid === 'goblin_caverns') {
      for (const c of this.crystals) {
        if (c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY) {
          ctx.fillStyle = c.color;
          ctx.shadowColor = c.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y - c.size);
          ctx.lineTo(c.x + c.size * 0.6, c.y);
          ctx.lineTo(c.x, c.y + c.size * 0.4);
          ctx.lineTo(c.x - c.size * 0.6, c.y);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // 3. Rocks
    for (const r of this.rocks) {
      if (r.x >= minX && r.x <= maxX && r.y >= minY && r.y <= maxY) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(r.x, r.y + r.r * 0.6, r.r, r.r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = zid === 'volcano' ? '#27272a' : `rgb(${r.grayTone}, ${r.grayTone}, ${r.grayTone})`;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Large Trees (for Meadows, Forest, and Town)
    if (zid === 'meadows' || zid === 'misty_forest' || zid === 'town') {
      const leafBase = zid === 'misty_forest' ? '#0f766e' : '#166534';
      const leafTop = zid === 'misty_forest' ? '#14b8a6' : '#22c55e';
      const leafHighlight = zid === 'misty_forest' ? '#5eead4' : '#86efac';

      for (const t of this.trees) {
        if (t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(t.x, t.y + 36, t.r * 1.3, t.r * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#5c3a21';
          ctx.fillRect(t.x - 9, t.y - 4, 18, 42);

          ctx.fillStyle = leafBase;
          ctx.beginPath();
          ctx.arc(t.x, t.y - 24, t.r, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = leafTop;
          ctx.beginPath();
          ctx.arc(t.x, t.y - 36, t.r * 0.85, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = leafHighlight;
          ctx.beginPath();
          ctx.arc(t.x - 10, t.y - 45, t.r * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

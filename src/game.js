// 2D Canvas Game Engine with Large Tile World, Camera Follow, Real Sprites, Multiplayer Sync & High-Impact VFX
import { WorldMap } from './map.js';
import { getMapDef, TILE_SIZE } from './maps.js';
import { ZONES, WEAPON_TYPES, MONSTERS, ITEMS, RELICS, QUESTS, SKILLS, SOUNDS } from './data.js';
import { weaponMatches } from './player.js';
import { soundEngine } from './audio.js';
import { monsterSprite, itemSprite, weaponSprite } from './sprites.js';

// ---- Sword swing animation (prog 0..1: wind-up, snap strike, follow-through) ----
// Angles are the blade direction: 0 = straight up, positive = clockwise (towards the facing side).
const ATTACK_ANIM = 0.34;
const PET_FETCH_RANGE = 750;     // px around the player in which a pet goes to fetch dropped items
const MONSTER_DEATH_TIME = 0.7;  // seconds of the death animation
const MONSTER_SPAWN_TIME = 0.6;  // seconds of the spawn animation
const PLAYER_SCALE = 1.7;   // player ≈ 1.2x a default (92px) monster
const PLAYER_TAG_UP = 40;   // extra height of the overhead tags at that scale
const SWORD_REST = { blade: 0.5, arm: 2.6 };
const SWINGS = [
  { a0: -1.9, a1: 1.9, pull: 0.35, lunge: 6 },    // overhead diagonal chop
  { a0: 2.3, a1: -1.0, pull: 0.3, lunge: 6 },     // rising backhand slash
  { a0: -2.6, a1: 2.4, pull: 0.5, lunge: 10 }     // wide finisher
];
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t * t * (3 - 2 * t);

function swordPose(prog, combo) {
  const s = SWINGS[combo % 3];
  const dir = Math.sign(s.a1 - s.a0);
  const pre = s.a0 - dir * s.pull;
  let sw, bodyX;
  if (prog < 0.2) {
    const t = easeOut(prog / 0.2);
    sw = lerp(s.a0, pre, t);
    bodyX = -2 * t;
  } else if (prog < 0.45) {
    const t = (prog - 0.2) / 0.25;
    sw = lerp(pre, s.a1, easeOutCubic(t));
    bodyX = lerp(-2, s.lunge, easeOut(t));
  } else {
    const t = (prog - 0.45) / 0.55;
    sw = lerp(s.a1, s.a1 + dir * 0.15, easeOut(t));
    bodyX = s.lunge * (1 - easeInOut(t));
  }
  const env = prog < 0.2 ? prog / 0.2 : prog > 0.7 ? (1 - prog) / 0.3 : 1;
  return {
    blade: lerp(SWORD_REST.blade, sw, env),
    arm: lerp(SWORD_REST.arm, sw * 0.85 + 0.35, env),
    bodyX, lean: bodyX * 0.02
  };
}

export class GameEngine {
  constructor(canvas, minimapCanvas, player, onLog) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.miniCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
    this.player = player;
    this.onLog = onLog || console.log;

    this.network = null;
    this.uiController = null;

    // 1. Plain world map (size/colors come from maps.js per zone)
    this.worldMap = new WorldMap();

    // 2. Camera Viewport
    this.zoom = 1;
    try { this.zoom = parseFloat(localStorage.getItem('zoom')) || 1; } catch (e) { /* ignore */ }
    this.screenShakeEnabled = true;
    try { this.screenShakeEnabled = localStorage.getItem('screen_shake') !== '0'; } catch (e) { /* ignore */ }
    this.camera = {
      x: 0,
      y: 0,
      w: window.innerWidth,
      h: window.innerHeight
    };

    // 3. Screen Shake, VFX & Projectiles
    this.screenShake = 0;
    this.vfxList = [];
    this.particles = [];
    this.floatingTexts = [];
    this.serverBuffs = { exp: 1, gold: 1, drop: 1, monster: 1 }; // set by the server (GM /buffserver)
    this.lootOrbs = []; // Dropped gold / EXP that pop out, wait, then fly into the player
    this.groundLoot = []; // Server-owned item drops lying on the ground (visible to everyone on the map)
    this.attackEffects = [];
    this.afterimages = [];
    this.projectiles = []; // Arrows & spells
    this.groundTraps = []; // Ankle snares

    // 4. Sprite sheets (monsters + item icons), loaded on first use and cached per file
    this.sheetImages = {};

    // 5. Keyboard Controls State for WASD
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false
    };

    // 6. Player World State
    this.playerEntity = {
      x: 750,
      y: 1220,
      targetX: 750,
      targetY: 1220,
      facing: 1,
      isAttacking: false,
      attackCooldown: 0,
      attackAnimTimer: 0,
      attackCombo: 0,
      bowDrawTimer: 0,
      swordTrail: [],
      skillCooldowns: {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
      },
      buffs: { def: 0, berserk: 0, concentration: 0 },
      bobTimer: 0,
      walkFrame: 0
    };

    this.currentZoneIndex = 1; // Default: Green Meadows (index 1)
    {
      const spawn = getMapDef(ZONES[1].id).spawn;
      this.playerEntity.x = this.playerEntity.targetX = spawn.x;
      this.playerEntity.y = this.playerEntity.targetY = spawn.y;
    }
    this.monsters = [];
    this.selectedTarget = null;
    this.hoverMonster = null; // monster under the mouse cursor (attackable)
    this.lastTimestamp = performance.now();
    this.lastPosSync = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.startBackgroundTicker();
  }

  setNetwork(networkManager) {
    this.network = networkManager;
  }

  setUIController(ui) {
    this.uiController = ui;
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.setZoom(this.zoom); // recomputes the visible world size
  }

  // Zoom in/out (mouse wheel, +/- keys, buttons). Can't zoom out past the edge of the map.
  setZoom(z) {
    // The camera may never show anything outside the map: the view (screen size / zoom) must fit
    // inside the map on both axes, even on very large screens (this can force a zoom above 1).
    const min = Math.max(window.innerWidth / this.worldMap.width, window.innerHeight / this.worldMap.height);
    this.zoom = Math.max(min, Math.min(2.5, Number.isFinite(z) ? z : 1));
    this.camera.w = window.innerWidth / this.zoom;
    this.camera.h = window.innerHeight / this.zoom;
    try { localStorage.setItem('zoom', String(this.zoom)); } catch (e) { /* ignore */ }
  }

  zoomBy(factor) {
    this.setZoom(this.zoom * factor);
  }

  get currentZone() {
    return ZONES[this.currentZoneIndex] || ZONES[1];
  }

  setZone(index) {
    if (index >= 0 && index < ZONES.length) {
      this.currentZoneIndex = index;
      const z = this.currentZone;
      this.worldMap.setZoneTheme(z.id);
      this.setZoom(this.zoom);
      this.onLog(`🗺️ เดินทางสู่: ${z.name}`, 'system');

      const zoneTitle = document.getElementById('minimap-zone-name');
      if (zoneTitle) zoneTitle.textContent = z.name;
      document.dispatchEvent(new CustomEvent('mapchanged'));

      if (this.network) {
        this.network.sendChangeMap(z.id, this.playerEntity.x, this.playerEntity.y);
      }
    }
  }

  changeMap(mapId) {
    this.flushLoot();
    const idx = ZONES.findIndex(z => z.id === mapId);
    if (idx !== -1) {
      this.currentZoneIndex = idx;
      const z = ZONES[idx];
      this.worldMap.setZoneTheme(z.id);
      this.setZoom(this.zoom);

      // Spawn point comes from the map definition
      const spawn = getMapDef(z.id).spawn;
      this.playerEntity.x = spawn.x;
      this.playerEntity.y = spawn.y;
      this.playerEntity.targetX = this.playerEntity.x;
      this.playerEntity.targetY = this.playerEntity.y;
      this.selectedTarget = null;
      this.updateTargetHUD(null);

      this.onLog(`🗺️ ย้ายไปยังแผนที่: ${z.name}`, 'system');
      const zoneTitle = document.getElementById('minimap-zone-name');
      if (zoneTitle) zoneTitle.textContent = z.name;
      document.dispatchEvent(new CustomEvent('mapchanged'));

      if (this.network) {
        this.network.sendChangeMap(z.id, this.playerEntity.x, this.playerEntity.y);
      }
    }
  }

  syncMonstersFromServer(serverMonsters) {
    this.monsters = serverMonsters.map(sm => {
      const template = MONSTERS[sm.templateId] || MONSTERS.slime;
      return {
        id: sm.id,
        map: sm.map || 'meadows',
        templateId: sm.templateId,
        name: sm.name,
        emoji: template.emoji,
        level: sm.level,
        maxHp: sm.maxHp,
        currentHp: sm.currentHp,
        atk: template.atk,
        def: template.def,
        exp: template.exp,
        size: template.size || 92,
        faceRight: false,
        facing: template.facing || 'left',
        drops: template.drops,
        petChance: template.petChance,
        relicChance: template.relicChance,
        x: sm.x,
        y: sm.y,
        tx: sm.x,
        ty: sm.y,
        homeX: sm.spawnX || sm.x,
        homeY: sm.spawnY || sm.y,
        attackCooldown: 1.5,
        bobTimer: Math.random() * 5,
        isDead: sm.isDead || false,
        flashTimer: 0,
        squashTimer: 0,
        stunTimer: 0,
        knockbackX: 0,
        knockbackY: 0
      };
    });
  }

  onMonsterDamagedFromServer(monsterId, damage, currentHp, isCrit) {
    const m = this.monsters.find(item => item.id === monsterId);
    if (m) {
      m.currentHp = currentHp;
      soundEngine.play('monsterHit');
      m.flashTimer = 0.15;
      m.squashTimer = 0.18;
      this.addFloatingText(m.x, m.y - 20, `${damage}`, isCrit ? '#f59e0b' : '#ffffff', isCrit ? 22 : 16, isCrit);
      this.addParticle(m.x, m.y, isCrit ? '#f59e0b' : '#ef4444', isCrit ? 12 : 6);
      if (this.selectedTarget && this.selectedTarget.id === monsterId) {
        this.updateTargetHUD(m);
      }
    }
  }

  onMonsterKilledFromServer(monsterId, killerId, killerName, damage, isCrit) {
    const m = this.monsters.find(item => item.id === monsterId);
    if (m) {
      if (damage > 0) this.addFloatingText(m.x, m.y - 20, `${damage}`, isCrit ? '#f59e0b' : '#ffffff', isCrit ? 22 : 16, isCrit);
      soundEngine.play('monsterDie');
      m.isDead = true;
      m.currentHp = 0;
      m.deathTimer = MONSTER_DEATH_TIME;
      m.spawnTimer = 0;
      this.addParticle(m.x, m.y, '#f59e0b', 25);
      this.addParticle(m.x, m.y + 10, '#e2e8f0', 10);
      this.addShockwave(m.x, m.y, '#f59e0b', 50);

      if (this.selectedTarget && this.selectedTarget.id === monsterId) {
        this.selectedTarget = null;
        this.updateTargetHUD(null);
      }

      const isMe = this.network && this.network.myPlayerId === killerId;
      if (isMe) {
        // EXP / gold arrive separately from the server as a 'reward' message.

        // Quest Progress Sync
        QUESTS.forEach(q => {
          if (q.targetMonster === m.templateId) {
            if (!this.player.questProgress[q.id]) {
              this.player.questProgress[q.id] = { progress: 0, completed: false, claimed: false };
            }
            const qp = this.player.questProgress[q.id];
            if (!qp.completed) {
              qp.progress = Math.min(q.requiredCount, qp.progress + 1);
              if (qp.progress >= q.requiredCount) {
                qp.completed = true;
                this.onLog(`📜 เควสต์ [${q.title}] สำเร็จแล้ว! กดรับรางวัลได้ที่หน้าต่างเควสต์`, 'system');
              }
              this.player.saveToStorage();
            }
          }
        });

        // Item drops are rolled by the server and lie on the ground (see onLootSpawn).
      }
    }
  }

  // Server owns monster positions/AI: every client sees the same monsters.
  onMonstersSync(list) {
    for (const u of list) {
      const m = this.monsters.find(item => item.id === u.id);
      if (!m) continue;
      m.tx = u.x;
      m.ty = u.y;
      if (Math.hypot(m.x - u.x, m.y - u.y) > 400) { m.x = u.x; m.y = u.y; }
      if (u.state) m.state = u.state;
    }
  }

  // A monster hit someone (damage was calculated by the server)
  onMonsterAttackFromServer(msg) {
    const m = this.monsters.find(item => item.id === msg.monsterId);
    if (m) {
      m.squashTimer = 0.2;
      m.attackFlash = 0.2;
    }
    if (this.network && msg.targetId === this.network.myPlayerId) {
      this.applyMonsterDamage(msg.damage);
    }
  }

  onMonsterRespawnedFromServer(monsterData) {
    const m = this.monsters.find(item => item.id === monsterData.id);
    if (m) {
      m.isDead = false;
      m.deathTimer = 0;
      m.spawnTimer = MONSTER_SPAWN_TIME;
      m.currentHp = m.maxHp;
      m.x = m.tx = monsterData.spawnX || monsterData.x;
      m.y = m.ty = monsterData.spawnY || monsterData.y;
      this.addShockwave(m.x, m.y, '#22c55e', 35);
      this.addParticle(m.x, m.y, '#22c55e', 10);
    }
  }

  // Server-calculated EXP / gold reward (solo kill or party share)
  onRewardFromServer(msg) {
    // EXP / gold are applied when the orbs reach the player.
    const src = this.monsters.find(item => item.id === msg.monsterId);
    const ox = src ? src.x : this.playerEntity.x;
    const oy = src ? src.y : this.playerEntity.y;
    if (msg.gold > 0) this.spawnLootOrb(ox, oy, 'gold', { amount: msg.gold });
    if (msg.exp > 0) this.spawnLootOrb(ox, oy, 'exp', { amount: msg.exp });
    if (msg.shared) {
      this.addFloatingText(this.playerEntity.x, this.playerEntity.y - 45, `+${msg.exp} EXP [Party]`, '#4ade80', 16);
      this.onLog(`🤝 ได้ +${msg.exp} EXP, +${msg.gold} G`, 'system', 'monster');
    } else {
      this.onLog(`⚔️ ได้ +${msg.exp} EXP, +${msg.gold} G`, 'system', 'monster');
    }
  }

  // Handle Remote Player Attack Animations & VFX
  handleRemotePlayerAttack(msg) {
    const remoteProjectile = WEAPON_TYPES[msg.weaponType] && WEAPON_TYPES[msg.weaponType].projectile;
    if (remoteProjectile) {
      const kind = remoteProjectile;
      soundEngine.playBowShoot();
      // Spawn arrow flying from other player to their target
      if (msg.targetX && msg.targetY) {
        this.spawnArrow(msg.x, msg.y, msg.targetX, msg.targetY, msg.targetId, 0, false, msg.playerId, kind);
      } else {
        const targetX = msg.x + (msg.facing || 1) * 220;
        this.spawnArrow(msg.x, msg.y, targetX, msg.y, null, 0, false, msg.playerId, kind);
      }
    } else {
      soundEngine.playSlash();
      this.addSlashEffect(msg.x, msg.y, msg.facing);
      this.addParticle(msg.x, msg.y, '#38bdf8', 8);
    }

    if (msg.skillId === 2) {
      this.addCycloneEffect(msg.x, msg.y);
    } else if (msg.skillId === 1) {
      this.addFissure(msg.x + (msg.facing || 1) * 45, msg.y);
    }
  }

  // Spawn Ranged Arrow Projectile
  spawnArrow(startX, startY, targetX, targetY, targetMonsterId, damage = 0, isCrit = false, ownerId = null, kind = 'arrow') {
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const speed = 750; // px/sec

    this.projectiles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: angle,
      targetX,
      targetY,
      targetId: targetMonsterId,
      damage,
      isCrit,
      kind,
      ownerId: ownerId || (this.network ? this.network.myPlayerId : 'self'),
      life: 0.8,
      trail: []
    });
  }

  triggerScreenShake(intensity = 6) {
    if (!this.screenShakeEnabled) return;
    this.screenShake = Math.max(this.screenShake, intensity);
  }

  setScreenShakeEnabled(on) {
    this.screenShakeEnabled = !!on;
    if (!on) this.screenShake = 0;
    try { localStorage.setItem('screen_shake', on ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  addShockwave(x, y, color = '#f59e0b', maxRadius = 60) {
    this.vfxList.push({
      type: 'shockwave',
      x, y,
      radius: 8,
      maxRadius,
      color,
      life: 0.35,
      maxLife: 0.35
    });
  }

  addCycloneEffect(x, y) {
    this.vfxList.push({
      type: 'cyclone',
      x, y,
      angle: 0,
      radius: 120,
      life: 0.65,
      maxLife: 0.65
    });
  }

  addBarrierEffect(x, y) {
    this.vfxList.push({
      type: 'barrier',
      x, y,
      radius: 45,
      life: 1.0,
      maxLife: 1.0
    });
  }

  addSonicWave(x, y) {
    this.vfxList.push({
      type: 'sonic_wave',
      x, y,
      radius: 15,
      maxRadius: 160,
      color: '#fbbf24',
      life: 0.5,
      maxLife: 0.5
    });
  }

  addAfterimage(x, y, facing) {
    this.afterimages.push({
      x, y, facing,
      alpha: 0.65,
      life: 0.35,
      maxLife: 0.35
    });
  }

  addFissure(x, y) {
    this.vfxList.push({
      type: 'fissure',
      x, y,
      life: 1.2,
      maxLife: 1.2
    });
  }

  addSkillBanner(text, color = '#fbbf24') {
    this.vfxList.push({
      type: 'skill_banner',
      x: this.playerEntity.x,
      y: this.playerEntity.y - 65,
      text,
      color,
      life: 1.1,
      maxLife: 1.1
    });
  }

  addHealSpiral(x, y) {
    this.vfxList.push({
      type: 'heal_spiral',
      x, y,
      life: 0.8,
      maxLife: 0.8
    });
  }

  // MOUSE HOVER: highlight the monster under the cursor (same hit area as click-to-attack)
  handleMouseMove(screenX, screenY) {
    const worldX = screenX / this.zoom + this.camera.x;
    const worldY = screenY / this.zoom + this.camera.y;
    let best = null, bestD = 65;
    for (const m of this.monsters) {
      if (m.isDead || m.map !== this.currentZone.id) continue;
      const d = Math.hypot(worldX - m.x, worldY - m.y);
      if (d < bestD) { bestD = d; best = m; }
    }
    this.hoverMonster = best;
    return best;
  }

  // Ground ring under a monster: 'target' = being attacked / locked, 'hover' = mouse is over it
  drawTargetRing(ctx, m, kind) {
    const t = performance.now() / 1000;
    const x = m.x + (m.knockbackX || 0);
    const y = m.y + (m.knockbackY || 0) + 26;
    const size = (MONSTERS[m.templateId] && MONSTERS[m.templateId].size) || m.size || 92;
    const rx = Math.max(30, size * 0.5), ry = rx * 0.38;
    ctx.save();
    if (kind === 'target') {
      const pulse = 1 + Math.sin(t * 6) * 0.06;
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(239,68,68,0.18)';
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10;
      ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      // rotating dashed outer ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.ellipse(0, 0, rx + 8, ry + 3, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(250,204,21,0.12)';
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = '#facc15'; ctx.shadowBlur = 8;
      ctx.strokeStyle = 'rgba(253,224,71,' + (0.7 + Math.sin(t * 8) * 0.25) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  // RIGHT-CLICK: Select Target
  handleRightClick(screenX, screenY) {
    const worldX = screenX / this.zoom + this.camera.x;
    const worldY = screenY / this.zoom + this.camera.y;

    const liveMonsters = this.monsters.filter(m => !m.isDead && m.map === this.currentZone.id);
    for (const m of liveMonsters) {
      const dist = Math.hypot(worldX - m.x, worldY - m.y);
      if (dist < 65) {
        this.selectedTarget = m;
        this.updateTargetHUD(m);
        this.onLog(`🎯 [คลิกขวา] ล็อคเป้าหมาย: [${m.name} Lv.${m.level}]`, 'system');
        this.addFloatingText(m.x, m.y - 25, '🎯 LOCKED', '#f59e0b', 14);
        this.addShockwave(m.x, m.y, '#f59e0b', 30);
        return;
      }
    }
  }

  // LEFT-CLICK: Attack or Move
  handleLeftClick(screenX, screenY) {
    const worldX = screenX / this.zoom + this.camera.x;
    const worldY = screenY / this.zoom + this.camera.y;

    const liveMonsters = this.monsters.filter(m => !m.isDead && m.map === this.currentZone.id);
    for (const m of liveMonsters) {
      const dist = Math.hypot(worldX - m.x, worldY - m.y);
      if (dist < 65) {
        this.selectedTarget = m;
        this.updateTargetHUD(m);
        const distToPlayer = Math.hypot(m.x - this.playerEntity.x, m.y - this.playerEntity.y);
        const attackRange = this.player.attackRange;
        if (distToPlayer <= attackRange) {
          this.tryPlayerAttack(m);
        }
        return;
      }
    }

    if (this.selectedTarget && !this.selectedTarget.isDead) {
      const distToTarget = Math.hypot(this.selectedTarget.x - this.playerEntity.x, this.selectedTarget.y - this.playerEntity.y);
      const attackRange = this.player.attackRange;
      if (distToTarget <= attackRange) {
        this.tryPlayerAttack(this.selectedTarget);
        return;
      }
    }

    // click on a dropped item: walk over it (stepping on it picks it up)
    const clicked = this.groundLoot.find(l => l.map === this.currentZone.id && l.state === 'ground' && Math.hypot(worldX - l.x, worldY - l.y) < 30);
    if (clicked) {
      if (this.lootAvailable(clicked)) {
        this.playerEntity.targetX = clicked.x;
        this.playerEntity.targetY = clicked.y;
      } else {
        this.onLog(`🔒 ของชิ้นนี้เป็นของ [${clicked.ownerName}] อีก ${this.fmtLock((clicked.unlockAt - performance.now()) / 1000)}`, 'system');
      }
      return;
    }

    if (this.worldMap.isWalkable(worldX, worldY, 14)) {
      this.playerEntity.targetX = worldX;
      this.playerEntity.targetY = worldY;
      this.addShockwave(worldX, worldY, 'rgba(255,255,255,0.4)', 20);
    }
  }

  updateTargetHUD(monster) {
    const box = document.getElementById('target-hud-box');
    const nameEl = document.getElementById('target-monster-name');
    const textEl = document.getElementById('target-monster-hp-text');
    const fillEl = document.getElementById('target-monster-hp-fill');

    if (!box) return;
    const wrap = box.parentElement;

    if (!monster || monster.isDead) {
      box.style.opacity = '0';
      if (wrap) wrap.style.display = 'none';
      return;
    }

    if (wrap) wrap.style.display = '';
    box.style.opacity = '1';
    nameEl.textContent = `${monster.name} [Lv.${monster.level}]`;
    textEl.textContent = `${monster.currentHp} / ${monster.maxHp}`;
    const pct = Math.max(0, (monster.currentHp / monster.maxHp) * 100);
    fillEl.style.width = `${pct}%`;
    fillEl.style.backgroundColor = '#f59e0b';
  }

  // Returns the loaded image for a sheet file, or null while it is still loading
  getSheet(src) {
    let e = this.sheetImages[src];
    if (!e) {
      const img = new Image();
      e = this.sheetImages[src] = { img, ready: false };
      img.onload = () => { e.ready = true; };
      img.src = './' + src;
    }
    return e.ready ? e.img : null;
  }

  // Armor part pictures (assets/sprites/armor, cut by tools/armor_cutout.py); null until all are loaded
  getArmor() {
    const parts = {};
    for (const n of ['helmet', 'chest', 'arm_l', 'arm_r', 'leg_l', 'leg_r']) {
      const img = this.getSheet(`assets/sprites/armor/${n}.png`);
      if (!img) return null;
      parts[n] = img;
    }
    return parts;
  }

  // Armored body (legs, chest, helmet) drawn from the armor sheet parts, placed relative to the player's centre
  drawArmorBody(ctx, A, legOffset, lean) {
    const fit = (img, h) => [img, h * img.width / img.height, h];
    for (const [name, x, off] of [['leg_l', -4.5, legOffset], ['leg_r', 4.5, -legOffset]]) {
      const [img, w, h] = fit(A[name], 15);
      ctx.drawImage(img, x - w / 2, 9 - Math.max(0, off) * 0.4, w, h);
    }
    ctx.save();
    ctx.rotate(lean);
    const [c, cw, ch] = fit(A.chest, 26);
    ctx.drawImage(c, -cw / 2, -12, cw, ch);
    const [hm, hw, hh] = fit(A.helmet, 26);
    ctx.drawImage(hm, -hw / 2 + 0.5, -34, hw, hh);
    ctx.restore();
  }

  // One arm: hangs from the shoulder (sx, sy) and points along `angle` (0 = up, clockwise positive)
  drawArmorArm(ctx, img, sx, sy, angle) {
    const h = 24, w = h * img.width / img.height;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle - Math.PI);
    ctx.drawImage(img, -w * 0.5, -h * 0.2, w, h);
    ctx.restore();
  }

  // ---- Loot orbs: pop out of the monster, linger briefly, then home in on the player ----
  spawnLootOrb(x, y, kind, data = {}) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 34;
    this.lootOrbs.push({
      kind, ...data,
      x, y,
      startX: x, startY: y,
      landX: x + Math.cos(ang) * dist,
      landY: y + Math.sin(ang) * dist * 0.6,
      t: 0,                                  // pop-out progress time
      popTime: 0.45,
      delay: 0.5 + Math.random() * 0.3,      // pause on the ground before flying in
      state: 'pop',                          // pop -> wait -> fly
      speed: 120,
      bob: Math.random() * 6
    });
  }

  collectLootOrb(o) {
    const pl = this.playerEntity;
    if (o.kind === 'gold') {
      this.player.gold += o.amount;
      soundEngine.play('coin');
      this.player.saveToStorage();
      this.addFloatingText(pl.x, pl.y - 40, `+${o.amount} G`, '#fbbf24', 15);
      this.addParticle(pl.x, pl.y - 10, '#fbbf24', 4);
    } else if (o.kind === 'exp') {
      const lv = this.player.baseLevel;
      this.player.gainExp(o.amount);
      soundEngine.play(this.player.baseLevel > lv ? 'levelUp' : 'coin');
      this.player.saveToStorage();
      this.addFloatingText(pl.x, pl.y - 52, `+${o.amount} EXP`, '#4ade80', 15);
      this.addParticle(pl.x, pl.y - 10, '#4ade80', 4);
    } else if (o.isPet) {
      const pid = `pet_${o.monsterId}`;
      const name = MONSTERS[o.monsterId]?.name || o.monsterId;
      this.player.addItem(pid, 1);
      soundEngine.play('loot');
      this.onLog(`🐾 ได้รับ Pet: ${name}! เปิดกระเป๋า [I] แล้วกด "สวมใส่" เพื่อให้เดินตาม`, 'relic');
      this.addSkillBanner(`🐾 PET: ${name}`, '#ec4899');
    } else {
      const item = ITEMS[o.itemId] || RELICS[o.itemId];
      const res = this.player.addItem(o.itemId, 1);
      soundEngine.play('loot');
      if (res.isRelic) {
        this.onLog(`💎 ค้นพบสมบัติในตำนาน! [${item.name}] บันทึกลงสมุดสมบัติสำเร็จ!`, 'relic');
        this.addSkillBanner(`💎 RELIC FOUND: ${item.name}`, '#a855f7');
        this.addShockwave(pl.x, pl.y, '#a855f7', 80);
      } else {
        this.onLog(`🎁 ได้รับไอเทม: ${item.icon} ${item.name}`, 'loot');
        this.addFloatingText(pl.x, pl.y - 64, `${item.name}`, '#ffffff', 14);
      }
    }
  }

  // ---- Ground loot (server-owned): everyone on the map sees it; the top damage dealer picks first ----
  makeGroundLoot(d) {
    const sprite = d.isPet ? monsterSprite(d.monsterId) : itemSprite(d.itemId);
    const item = d.isPet ? null : (ITEMS[d.itemId] || RELICS[d.itemId]);
    const mon = d.isPet ? MONSTERS[d.monsterId] : null;
    const now = performance.now();
    return {
      ...d,
      name: d.isPet ? `Pet ${mon?.name || d.monsterId}` : (item?.name || d.itemId),
      icon: d.isPet ? (mon?.emoji || '🐾') : (item?.icon || '🎁'),
      sprite,
      unlockAt: now + (d.lockLeft || 0) * 1000,
      startX: d.fromX ?? d.x, startY: d.fromY ?? d.y,
      state: d.fromX === undefined ? 'ground' : 'pop',
      t: 0, popTime: 0.45, bob: Math.random() * 6,
      ignoreUntil: 0, pending: 0
    };
  }

  onLootSync(items) {
    this.groundLoot = items.map(d => this.makeGroundLoot({ ...d, fromX: undefined, fromY: undefined }));
  }

  onLootSpawn(items) {
    for (const d of items) {
      if (!this.groundLoot.some(l => l.id === d.id)) this.groundLoot.push(this.makeGroundLoot(d));
    }
    const mine = items.filter(d => d.ownerId === this.network?.myPlayerId && d.map === this.currentZone.id);
    if (mine.length) {
      const names = mine.map(d => (this.groundLoot.find(l => l.id === d.id) || {}).name).filter(Boolean).join(', ');
      this.onLog(`🎁 ของดรอปตกที่พื้น (เป็นของคุณ 3 นาที): ${names}`, 'loot');
    }
  }

  onLootRemoved(id) {
    const i = this.groundLoot.findIndex(l => l.id === id);
    if (i !== -1) this.groundLoot.splice(i, 1);
    if (this.petState && this.petState.targetId === id) this.petState.targetId = null;
  }

  onLootPicked(msg) {
    if (msg.viaPet && this.petState) {
      // the pet brings it back to the player before it lands in the bag
      this.petState.carry = msg;
      this.petState.targetId = null;
    } else {
      this.collectLootOrb(msg);
    }
  }

  onLootDenied(msg) {
    const l = this.groundLoot.find(x => x.id === msg.id);
    if (l) { l.unlockAt = performance.now() + (msg.lockLeft || 0) * 1000; l.pending = 0; l.ignoreUntil = performance.now() + 2000; }
    if (this.petState) this.petState.targetId = null;
    if (!msg.viaPet) this.onLog(`🔒 ของชิ้นนี้เป็นของ [${msg.ownerName}] อีก ${this.fmtLock(msg.lockLeft)}`, 'system');
  }

  fmtLock(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // Can this player pick the item up right now? (owner, lock over, or the owner left the server)
  lootAvailable(l) {
    const me = this.network && this.network.myPlayerId;
    if (l.map !== this.currentZone.id || l.state === 'pop') return false;
    if (!this.network) return true;
    if (l.ownerId === me || performance.now() >= l.unlockAt) return true;
    return !this.network.otherPlayers.has(l.ownerId);
  }

  requestPickup(l, viaPet = false) {
    const now = performance.now();
    if (now < l.pending || now < l.ignoreUntil) return;
    l.pending = now + 1500;
    if (this.network) this.network.sendPickupLoot(l.id, viaPet);
  }

  // Nearest available loot to (x, y) within maxDist, skipping `skipId`
  nearestLoot(x, y, maxDist) {
    const now = performance.now();
    let best = null, bd = maxDist;
    for (const l of this.groundLoot) {
      if (now < l.ignoreUntil || !this.lootAvailable(l)) continue;
      const d = Math.hypot(l.x - x, l.y - y);
      if (d <= bd) { bd = d; best = l; }
    }
    return best;
  }

  updateGroundLoot(dt) {
    const pl = this.playerEntity;
    for (const l of this.groundLoot) {
      if (l.state === 'pop') {
        l.t += dt;
        const k = Math.min(1, l.t / l.popTime);
        l.px = l.startX + (l.x - l.startX) * k;
        l.py = l.startY + (l.y - l.startY) * k - Math.sin(k * Math.PI) * 38;
        if (k >= 1) l.state = 'ground';
      } else {
        l.px = l.x; l.py = l.y;
        // walking over an available item picks it up
        if (this.lootAvailable(l) && Math.hypot(l.x - pl.x, l.y - pl.y) < 44) this.requestPickup(l);
      }
    }
  }

  // The pet runs to available loot, picks it up and brings it to the player
  updatePet(dt) {
    const mid = this.player.activePet;
    const p = this.playerEntity;
    if (!mid) { this.petState = null; return; }
    const pet = this.petState || (this.petState = { x: p.x - 40, y: p.y + 10 });
    const gx = p.x - p.facing * 46, gy = p.y + 14;
    let tx = gx, ty = gy, speed = 0, fast = false;
    if (pet.carry) {
      // go back to the player; hand the item over when close
      tx = p.x; ty = p.y;
      fast = true;
      if (Math.hypot(p.x - pet.x, p.y - pet.y) < 40) { this.collectLootOrb(pet.carry); pet.carry = null; }
    } else {
      let l = pet.targetId && this.groundLoot.find(x => x.id === pet.targetId);
      if (l && !this.lootAvailable(l)) l = null;
      if (!l) {
        pet.targetId = null;
        const cand = this.nearestLoot(p.x, p.y, PET_FETCH_RANGE);
        if (cand) { l = cand; pet.targetId = cand.id; }
      }
      if (l) {
        tx = l.x; ty = l.y; fast = true;
        if (Math.hypot(l.x - pet.x, l.y - pet.y) < 16) this.requestPickup(l, true);
      }
    }
    const d = Math.hypot(tx - pet.x, ty - pet.y);
    if (d > 700 && !fast) { pet.x = gx; pet.y = gy; }
    else if (fast) {
      speed = 380 * dt;
      if (d <= speed) { pet.x = tx; pet.y = ty; } else { pet.x += (tx - pet.x) / d * speed; pet.y += (ty - pet.y) / d * speed; }
    } else if (d > 4) {
      const k = Math.min(1, 0.06 + d / 400); pet.x += (tx - pet.x) * k * 0.2; pet.y += (ty - pet.y) * k * 0.2;
    }
    pet.moving = d > 12;
  }

  drawGroundLoot(ctx) {
    const now = performance.now();
    const t = now / 1000;
    const me = this.network && this.network.myPlayerId;
    for (const l of this.groundLoot) {
      if (l.map !== this.currentZone.id) continue;
      const locked = !this.lootAvailable(l) && l.state !== 'pop';
      const mine = l.ownerId === me && now < l.unlockAt;
      const hover = l.state === 'ground' ? Math.sin(t * 4 + l.bob) * 2 : 0;
      const x = l.px ?? l.x, y = (l.py ?? l.y) + hover;
      ctx.save();
      if (l.state !== 'pop') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(l.x, l.y + 8, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = locked ? 0.7 : 1;
      ctx.shadowColor = l.isRelic ? '#a855f7' : l.isPet ? '#ec4899' : mine ? '#4ade80' : locked ? '#94a3b8' : '#fde68a';
      ctx.shadowBlur = 10;
      const sheet = l.sprite ? this.getSheet(l.sprite.src) : null;
      if (sheet) {
        const ow = 30, oh = ow * l.sprite.sh / l.sprite.sw;
        ctx.drawImage(sheet, l.sprite.sx, l.sprite.sy, l.sprite.sw, l.sprite.sh, x - ow / 2, y - oh / 2, ow, oh);
      } else {
        ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(l.icon, x, y);
      }
      ctx.shadowBlur = 0;
      if (l.state === 'ground') {
        ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        const label = locked ? `🔒 ${l.name} ${this.fmtLock((l.unlockAt - now) / 1000)}` : l.name;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(label, x, y + 26);
        ctx.fillStyle = locked ? '#cbd5e1' : mine ? '#86efac' : '#fde68a'; ctx.fillText(label, x, y + 26);
        if (locked && l.ownerName) {
          ctx.font = '10px sans-serif'; ctx.fillStyle = '#94a3b8';
          ctx.strokeText(`ของ ${l.ownerName}`, x, y + 38); ctx.fillText(`ของ ${l.ownerName}`, x, y + 38);
        }
      }
      ctx.restore();
    }
  }

  // Instantly collect everything (used on map change so nothing is lost)
  flushLoot() {
    for (const o of this.lootOrbs) this.collectLootOrb(o);
    this.lootOrbs = [];
    if (this.petState && this.petState.carry) { this.collectLootOrb(this.petState.carry); this.petState.carry = null; }
  }

  updateLootOrbs(dt) {
    const pl = this.playerEntity;
    for (let i = this.lootOrbs.length - 1; i >= 0; i--) {
      const o = this.lootOrbs[i];
      if (o.state === 'pop') {
        o.t += dt;
        const k = Math.min(1, o.t / o.popTime);
        o.x = o.startX + (o.landX - o.startX) * k;
        o.y = o.startY + (o.landY - o.startY) * k - Math.sin(k * Math.PI) * 38;
        if (k >= 1) { o.state = 'wait'; o.t = 0; }
      } else if (o.state === 'wait') {
        o.t += dt;
        if (o.t >= o.delay) o.state = 'fly';
      } else {
        o.speed += 900 * dt;
        const dx = pl.x - o.x;
        const dy = (pl.y - 12) - o.y;
        const d = Math.hypot(dx, dy);
        const step = o.speed * dt;
        if (d <= step + 8) {
          this.collectLootOrb(o);
          this.lootOrbs.splice(i, 1);
          continue;
        }
        o.x += (dx / d) * step;
        o.y += (dy / d) * step;
      }
    }
  }

  drawLootOrbs(ctx) {
    const now = performance.now() / 1000;
    for (const o of this.lootOrbs) {
      const hover = o.state === 'wait' ? Math.sin(now * 5 + o.bob) * 2 : 0;
      const x = o.x, y = o.y + hover;
      ctx.save();
      // ground shadow
      if (o.state !== 'fly') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(o.landX, o.landY + 8, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (o.kind === 'item') {
        ctx.shadowColor = o.isRelic ? '#a855f7' : o.isPet ? '#ec4899' : '#fde68a';
        ctx.shadowBlur = 10;
        const sheet = o.sprite ? this.getSheet(o.sprite.src) : null;
        if (sheet) {
          const ow = 30, oh = ow * o.sprite.sh / o.sprite.sw;
          ctx.drawImage(sheet, o.sprite.sx, o.sprite.sy, o.sprite.sw, o.sprite.sh, x - ow / 2, y - oh / 2, ow, oh);
        } else {
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(o.icon || '🎁', x, y);
        }
      } else {
        const gold = o.kind === 'gold';
        ctx.shadowColor = gold ? '#fbbf24' : '#4ade80';
        ctx.shadowBlur = 10;
        ctx.fillStyle = gold ? '#fbbf24' : '#4ade80';
        ctx.strokeStyle = gold ? '#b45309' : '#166534';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, gold ? 8 : 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = gold ? '#78350f' : '#052e16';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gold ? 'G' : 'XP', x, y + 0.5);
      }
      ctx.restore();
    }
  }

  addFloatingText(x, y, text, color = '#ffffff', fontSize = 16, isCrit = false) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      fontSize,
      isCrit,
      life: 1.1,
      maxLife: 1.1,
      vy: -32 - Math.random() * 20,
      vx: (Math.random() - 0.5) * 16
    });
  }

  addSlashEffect(x, y, facing, type = 'normal') {
    this.attackEffects.push({
      x,
      y,
      facing,
      type,
      life: type === 'heavy' ? 0.32 : 0.22,
      maxLife: type === 'heavy' ? 0.32 : 0.22
    });
  }

  addParticle(x, y, color = '#fbbf24', count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 85;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        life: 0.5 + Math.random() * 0.4
      });
    }
  }

  // Hotkey 1-4: the 4-slot skill loadout (learned skills only). Rules: docs/SKILLS.md
  useSkillSlot(slot) {
    const id = this.player.skillLoadout[slot - 1];
    if (!id) {
      this.onLog(`ช่อง [${slot}] ว่างอยู่ — เปิดหน้าต่างสกิล [V] เพื่อใส่สกิลที่เรียนแล้ว`, 'system');
      return;
    }
    this.useSkill(id);
  }

  useSkill(id) {
    const pl = this.player;
    const sk = SKILLS[id];
    if (!sk || !pl.learnedSkills[id]) return;
    if (sk.kind === 'passive') {
      this.onLog(`✨ ${sk.name} เป็นสกิลติดตัว ทำงานอัตโนมัติ${weaponMatches(sk.weapon, pl.weaponInfo.type) ? '' : ' (แต่ต้องถืออาวุธให้ตรงชนิด)'}`, 'system');
      return;
    }
    if (!weaponMatches(sk.weapon, pl.weaponInfo.type)) {
      this.onLog(`🚫 ${sk.name} ต้องถืออาวุธชนิด: ${{ melee: 'ดาบ/ไม้/มือเปล่า', bow: 'ธนู', staff: 'คฑา' }[sk.weapon] || sk.weapon}`, 'system');
      return;
    }
    if ((pl.skillCd[id] || 0) > 0) return;
    if (pl.currentSp < sk.spCost) {
      this.onLog(`💧 SP ไม่พอสำหรับ ${sk.name} (ต้องการ ${sk.spCost})`, 'system');
      return;
    }
    const p = this.playerEntity;
    const mapMonsters = this.monsters.filter(m => !m.isDead && m.map === this.currentZone.id);
    const reach = (sk.range > 0 ? sk.range : pl.attackRange) + 40;
    let target = null;
    if (sk.target === 'enemy' || sk.target === 'enemy_area') {
      const t = this.selectedTarget;
      if (t && !t.isDead && t.map === this.currentZone.id) target = t;
      else target = mapMonsters.map(m => ({ m, d: Math.hypot(m.x - p.x, m.y - p.y) })).filter(c => c.d <= reach).sort((a, b) => a.d - b.d)[0]?.m || null;
      if (!target) { this.onLog('🎯 ไม่มีเป้าหมายให้ใช้สกิล', 'system'); return; }
      if (Math.hypot(target.x - p.x, target.y - p.y) > reach) { this.onLog('🎯 เป้าหมายไกลเกินไป', 'system'); return; }
      p.facing = target.x >= p.x ? 1 : -1;
    }
    pl.currentSp -= sk.spCost;
    pl.skillCd[id] = sk.cooldown;
    p.isAttacking = true;
    p.attackAnimTimer = ATTACK_ANIM;
    const color = { damage: '#f97316', heal: '#22c55e', buff: '#38bdf8', debuff: '#a855f7', dash: '#facc15' }[sk.effect] || '#fff';
    this.addSkillBanner(sk.name.replace(/\s*\(.*\)/, '').toUpperCase(), color);
    // Studio can pick the sound per skill; otherwise it follows the effect type
    soundEngine.play(SOUNDS[sk.sound] ? sk.sound : { damage: 'critHit', heal: 'firstAid', buff: 'berserk', debuff: 'warCry', dash: 'dash' }[sk.effect]);

    if (sk.effect === 'damage') {
      const cx = sk.target === 'self_area' ? p.x : target.x;
      const cy = sk.target === 'self_area' ? p.y : target.y;
      let victims = [target];
      if (sk.radius > 0) {
        victims = mapMonsters.filter(m => Math.hypot(m.x - cx, m.y - cy) <= sk.radius);
        if (target && !victims.includes(target)) victims.unshift(target);
      }
      victims = victims.filter(Boolean).slice(0, 8);
      if (sk.radius > 0) this.addShockwave(cx, cy, color, sk.radius * 0.5);
      const stat = sk.scalesWith && sk.scalesWith !== 'none' ? (pl.stats[sk.scalesWith] || 0) * (sk.statCoef || 0) : 0;
      for (const m of victims) {
        for (let h = 0; h < Math.max(1, sk.hits); h++) {
          setTimeout(() => {
            if (m.isDead) return;
            const crit = Math.random() <= pl.critRate;
            let dmg = Math.max(1, pl.attack * sk.power / 100 + stat - m.def) * (0.9 + Math.random() * 0.2);
            if (crit) dmg *= 1.6;
            dmg = Math.floor(dmg);
            m.flashTimer = 0.15;
            m.squashTimer = 0.18;
            this.addParticle(m.x, m.y, color, 10);
            this.addSlashEffect(m.x, m.y, p.facing, 'heavy');
            this.network?.sendMonsterHit(m.id, dmg, crit, id);
          }, h * 110);
        }
      }
      if (this.network) this.network.sendAttackAction({ weaponType: pl.weaponInfo.type, skillId: id, skillName: sk.name, targetId: target?.id, targetX: cx, targetY: cy });
      if (!target?.id) this.triggerScreenShake(3);
    } else if (sk.effect === 'heal') {
      const stat = sk.scalesWith && sk.scalesWith !== 'none' ? (pl.stats[sk.scalesWith] || 0) * (sk.statCoef || 0) : 0;
      const heal = Math.floor(pl.maxHp * sk.power / 100 + stat);
      pl.currentHp = Math.min(pl.maxHp, pl.currentHp + heal);
      this.addHealSpiral(p.x, p.y);
      this.addFloatingText(p.x, p.y - 35, `+${heal} HP`, '#22c55e', 18);
    } else if (sk.effect === 'buff') {
      pl.activeBuffs[id] = sk.duration;
      soundEngine.playPotion();
      this.addShockwave(p.x, p.y, color, 60);
      this.addParticle(p.x, p.y, color, 20);
    } else if (sk.effect === 'dash') {
      let dx = p.facing, dy = 0;
      const t = this.selectedTarget;
      if (t && !t.isDead) { const d = Math.hypot(t.x - p.x, t.y - p.y) || 1; dx = (t.x - p.x) / d; dy = (t.y - p.y) / d; }
      for (let d = 12; d <= sk.range; d += 12) {
        const nx = p.x + dx * 12, ny = p.y + dy * 12;
        if (!this.worldMap.isWalkable(nx, ny, 16)) break;
        p.x = nx; p.y = ny;
      }
      p.targetX = p.x; p.targetY = p.y;
      this.addShockwave(p.x, p.y, color, 45);
      this.addParticle(p.x, p.y, color, 16);
    }
    pl.saveToStorage();
    this.uiController?.updateHUD();
  }

  // Quick SP potion slot (button / E)
  useSpPotionSlot() {
    if (this.player.currentSp >= this.player.maxSp) { this.onLog('SP เต็มอยู่แล้ว', 'system'); return; }
    const res = this.player.useSpPotion(this.player.spPotionSlot);
    if (res) {
      soundEngine.playPotion();
      this.addFloatingText(this.playerEntity.x, this.playerEntity.y - 35, `+${res.restored} SP`, '#38bdf8', 18);
      this.addParticle(this.playerEntity.x, this.playerEntity.y, '#38bdf8', 16);
      this.onLog(`💧 ดื่ม ${res.itemName} ฟื้นฟู +${res.restored} SP`, 'system');
      this.uiController?.updateHUD();
    } else {
      this.onLog('⚠️ ไม่มียา SP เหลือในกระเป๋า (ซื้อได้ที่ร้านค้า)', 'system');
    }
  }

  // GM commands the server approved (/give, /level, /heal, /warp ...)
  onGmAction(msg) {
    const pl = this.player;
    const log = (t) => this.onLog(`🛡️ GM: ${t}`, 'system');
    switch (msg.action) {
      case 'heal': pl.currentHp = pl.maxHp; pl.currentSp = pl.maxSp; log('ฟื้น HP/SP เต็ม'); break;
      case 'level':
        pl.baseLevel = msg.value; pl.baseExp = 0; pl.currentHp = pl.maxHp; pl.currentSp = pl.maxSp;
        log(`ตั้งเลเวลเป็น ${msg.value}`); break;
      case 'points': pl.statPoints += msg.value; log(`ได้แต้มสเตตัส +${msg.value}`); break;
      case 'warp': this.changeMap(msg.map); break;
      case 'giveweapons':
        msg.ids.forEach(id => pl.addItem(id, 1));
        log(`ได้อาวุธ ${msg.ids.length} ชิ้น: ${msg.ids.map(id => ITEMS[id]?.name || id).join(', ')}`); break;
      case 'give':
        if (msg.kind === 'gold') { pl.gold += msg.value; log(`ได้ Gold +${msg.value.toLocaleString()}`); }
        else if (msg.kind === 'exp') { pl.gainExp(msg.value); log(`ได้ EXP +${msg.value.toLocaleString()}`); }
        else if (msg.kind === 'item') { pl.addItem(msg.id, msg.value); log(`ได้ไอเทม ${ITEMS[msg.id]?.name || msg.id} x${msg.value}`); }
        else if (msg.kind === 'book') { pl.addBook(msg.id, msg.value); log(`ได้สมุดสกิล ${SKILLS[msg.id]?.name || msg.id} x${msg.value}`); }
        else if (msg.kind === 'pet') { pl.addItem(`pet_${msg.id}`, 1); log(`ได้ Pet ${MONSTERS[msg.id]?.name || msg.id}`); }
        break;
    }
    pl.saveToStorage();
    this.uiController?.updateHUD();
    this.uiController?.refreshOpenWindows();
  }

  // Quick HP potion slot (button / Q): drinks the chosen potion, or the weakest owned
  usePotionSlot() {
    if (this.player.currentHp >= this.player.maxHp) {
      this.onLog('HP เต็มอยู่แล้ว', 'system');
      return;
    }
    const res = this.player.usePotion(this.player.hpPotionSlot);
    if (res) {
      soundEngine.playPotion();
      this.addSkillBanner(`🥤 +${res.healed} HP`, '#22c55e');
      this.addHealSpiral(this.playerEntity.x, this.playerEntity.y);
      this.addShockwave(this.playerEntity.x, this.playerEntity.y, '#22c55e', 45);
      this.addParticle(this.playerEntity.x, this.playerEntity.y, '#4ade80', 20);
      this.addFloatingText(this.playerEntity.x, this.playerEntity.y - 35, `+${res.healed} HP`, '#22c55e', 18);
      this.onLog(`🥤 ดื่ม ${res.itemName} ฟื้นฟู +${res.healed} HP`, 'system');
      this.uiController?.updateHUD();
    } else {
      this.onLog('⚠️ ไม่มียา HP เหลือในกระเป๋า', 'system');
    }
  }

  useFirstAidSlot() {
    const p = this.playerEntity;
    const cd = p.skillCooldowns;
    if (cd[8] > 0) return;
    cd[8] = 8.0;

    const heal = Math.floor(this.player.maxHp * 0.25);
    this.player.currentHp = Math.min(this.player.maxHp, this.player.currentHp + heal);
    soundEngine.playHolyCross();

    this.addSkillBanner(`💚 FIRST AID (+${heal} HP)`, '#4ade80');
    this.addHealSpiral(p.x, p.y);
    this.addShockwave(p.x, p.y, '#4ade80', 50);
    this.addParticle(p.x, p.y, '#86efac', 30);
    this.addFloatingText(p.x, p.y - 40, `+${heal} HP`, '#4ade80', 22);
    this.onLog(`💚 [8] ใช้สกิล First Aid ปฐมพยาบาล ฟื้นฟู +${heal} HP`, 'system');
  }

  useTownPortalSlot() {
    const p = this.playerEntity;
    const cd = p.skillCooldowns;
    if (cd[9] > 0) return;
    cd[9] = 15.0;

    soundEngine.playTownPortal();
    this.addSkillBanner('📜 TOWN PORTAL (RETURNING...)', '#38bdf8');
    this.vfxList.push({
      type: 'town_portal',
      x: p.x,
      y: p.y,
      maxHeight: 120,
      life: 0.8,
      maxLife: 0.8
    });

    setTimeout(() => {
      this.changeMap('town');
      this.addShockwave(this.playerEntity.x, this.playerEntity.y, '#38bdf8', 90);
      this.addParticle(this.playerEntity.x, this.playerEntity.y, '#7dd3fc', 35);
      this.onLog('🏛️ [9] วาร์ปกลับสู่ Central Town (ลานกลางเมือง Prontera) เรียบร้อยแล้ว', 'system');
    }, 600);
  }

  // Manual / auto attack entry point: respects the ASPD cooldown so clicking fast doesn't attack faster
  tryPlayerAttack(monster) {
    const p = this.playerEntity;
    if (!monster || p.attackCooldown > 0) return false;
    this.performPlayerAttack(monster);
    let aspd = this.player.aspd;
    if (p.buffs.berserk > 0) aspd *= 1.5;
    if (p.buffs.concentration > 0) aspd *= 1.25;
    p.attackCooldown = 1.0 / aspd;
    return true;
  }

  performPlayerAttack(monster) {
    const p = this.playerEntity;
    p.facing = monster.x >= p.x ? 1 : -1;
    p.isAttacking = true;
    p.attackAnimTimer = ATTACK_ANIM;
    p.attackCombo = (p.attackCombo + 1) % 3;

    let isCrit = Math.random() <= this.player.critRate;
    let damage = Math.max(1, this.player.attack - monster.def);
    const variance = 0.9 + Math.random() * 0.2;
    damage = Math.floor(damage * variance);
    if (isCrit) damage = Math.floor(damage * 1.6);

    const weapon = this.player.weaponInfo;

    if (weapon.projectile) {
      // RANGED ATTACK (bow arrow / staff magic bolt): launch projectile
      soundEngine.playBowShoot();
      this.spawnArrow(p.x, p.y, monster.x, monster.y, monster.id, damage, isCrit, null, weapon.projectile);

      if (this.network) {
        this.network.sendAttackAction({
          weaponType: weapon.type,
          targetId: monster.id,
          targetX: monster.x,
          targetY: monster.y
        });
      }

    } else {
      // MELEE ATTACK (fist / stick / sword)
      if (isCrit) {
        soundEngine.playCritHit();
        this.triggerScreenShake(5);
        this.addShockwave(monster.x, monster.y, '#f59e0b', 55);
      } else {
        soundEngine.playSlash();
      }

      monster.flashTimer = 0.15;
      monster.squashTimer = 0.18;

      this.addSlashEffect(monster.x, monster.y, p.facing, isCrit ? 'heavy' : 'normal');
      this.addParticle(monster.x, monster.y, isCrit ? '#f59e0b' : '#f87171', isCrit ? 16 : 8);

      if (this.network) {
        this.network.sendAttackAction({
          weaponType: weapon.type,
          targetId: monster.id
        });
        this.network.sendMonsterHit(monster.id, damage, isCrit);
      }
    }
  }

  applyMonsterDamage(damage) {
    soundEngine.play('playerHurt');
    this.player.currentHp = Math.max(0, this.player.currentHp - damage);
    this.addParticle(this.playerEntity.x, this.playerEntity.y, '#ef4444', 4);
    this.addFloatingText(this.playerEntity.x, this.playerEntity.y - 25, `-${damage}`, '#f87171', 14);

    if (this.player.currentHp <= 0) {
      this.onLog('💀 คุณหมดสติ! ถูกนำตัวกลับมาฟื้นฟูที่เมืองปลอดภัย', 'system');
      this.player.currentHp = Math.floor(this.player.maxHp * 0.6);
      this.changeMap('town');
      this.selectedTarget = null;
      this.updateTargetHUD(null);
    }
  }

  update(dt) {
    const p = this.playerEntity;

    // Screen Shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 20);
    }

    // Skill Cooldowns
    for (let i = 1; i <= 4; i++) {
      if (p.skillCooldowns[i] > 0) p.skillCooldowns[i] = Math.max(0, p.skillCooldowns[i] - dt);
    }
    if (p.buffs.def > 0) p.buffs.def = Math.max(0, p.buffs.def - dt);
    if (p.buffs.berserk > 0) p.buffs.berserk = Math.max(0, p.buffs.berserk - dt);
    if (p.buffs.concentration > 0) p.buffs.concentration = Math.max(0, p.buffs.concentration - dt);

    this.player.tickSkills(dt);
    p.bobTimer += dt * 6;
    p.attackCooldown -= dt;

    let hasMoved = false;

    // WASD Movement
    let vx = 0;
    let vy = 0;
    if (this.keys.w) vy -= 1;
    if (this.keys.s) vy += 1;
    if (this.keys.a) { vx -= 1; p.facing = -1; }
    if (this.keys.d) { vx += 1; p.facing = 1; }

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      const speed = 195 * this.player.moveMul;
      const stepX = (vx / len) * speed * dt;
      const stepY = (vy / len) * speed * dt;

      if (this.worldMap.isWalkable(p.x + stepX, p.y, 16)) { p.x += stepX; hasMoved = true; }
      if (this.worldMap.isWalkable(p.x, p.y + stepY, 16)) { p.y += stepY; hasMoved = true; }
      p.targetX = p.x;
      p.targetY = p.y;
      p.walkFrame += dt * 11;
    } else {
      // Auto Battle or Target Approach
      const currentMapMonsters = this.monsters.filter(m => !m.isDead && m.map === this.currentZone.id);

      // Auto pickup: with nothing to fight, walk to dropped items (a worn pet does this by itself)
      let lootGoal = null;
      if (this.player.autoBattle && this.player.auto.pickup && !this.player.activePet && (!this.selectedTarget || this.selectedTarget.isDead)) {
        lootGoal = this.nearestLoot(p.x, p.y, this.player.auto.range * TILE_SIZE);
      }

      if (!lootGoal && this.player.autoBattle && (!this.selectedTarget || this.selectedTarget.isDead || this.selectedTarget.map !== this.currentZone.id)) {
        // Auto: nearest allowed monster within the configured range (in tiles)
        const maxDist = this.player.auto.range * TILE_SIZE;
        const disabled = this.player.auto.disabledMonsters;
        const candidates = currentMapMonsters
          .filter(m => !disabled[m.templateId])
          .map(m => ({ m, d: Math.hypot(m.x - p.x, m.y - p.y) }))
          .filter(c => c.d <= maxDist)
          .sort((a, b) => a.d - b.d);
        if (candidates.length > 0) {
          this.selectedTarget = candidates[0].m;
          this.updateTargetHUD(this.selectedTarget);
        }
      }

      if (lootGoal) {
        const dx = lootGoal.x - p.x;
        const dy = lootGoal.y - p.y;
        const dist = Math.hypot(dx, dy);
        p.facing = dx >= 0 ? 1 : -1;
        if (dist > 20) {
          const speed = 175 * this.player.moveMul;
          const stepX = (dx / dist) * speed * dt;
          const stepY = (dy / dist) * speed * dt;
          if (this.worldMap.isWalkable(p.x + stepX, p.y, 16)) { p.x += stepX; hasMoved = true; }
          if (this.worldMap.isWalkable(p.x, p.y + stepY, 16)) { p.y += stepY; hasMoved = true; }
          p.walkFrame += dt * 10;
        } else {
          this.requestPickup(lootGoal); // standing on it but not yet requested / retry
          lootGoal.ignoreUntil = Math.max(lootGoal.ignoreUntil, performance.now() + 1000);
        }
        p.targetX = p.x;
        p.targetY = p.y;
      } else if (this.selectedTarget && !this.selectedTarget.isDead && this.selectedTarget.map === this.currentZone.id) {
        const target = this.selectedTarget;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.hypot(dx, dy);
        p.facing = dx >= 0 ? 1 : -1;
        const attackRange = this.player.attackRange;

        if (dist > attackRange) {
          const speed = 175 * this.player.moveMul;
          const stepX = (dx / dist) * speed * dt;
          const stepY = (dy / dist) * speed * dt;
          if (this.worldMap.isWalkable(p.x + stepX, p.y, 16)) { p.x += stepX; hasMoved = true; }
          if (this.worldMap.isWalkable(p.x, p.y + stepY, 16)) { p.y += stepY; hasMoved = true; }
          p.walkFrame += dt * 10;
        } else {
          if (p.attackCooldown <= 0) {
            this.tryPlayerAttack(target);
          }
        }
        // Stay where the fight ended instead of walking back to an old click destination
        p.targetX = p.x;
        p.targetY = p.y;
      } else {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          const speed = 180 * this.player.moveMul;
          const stepX = (dx / dist) * speed * dt;
          const stepY = (dy / dist) * speed * dt;
          if (this.worldMap.isWalkable(p.x + stepX, p.y, 16)) { p.x += stepX; hasMoved = true; }
          if (this.worldMap.isWalkable(p.x, p.y + stepY, 16)) { p.y += stepY; hasMoved = true; }
          p.facing = dx >= 0 ? 1 : -1;
          p.walkFrame += dt * 10;
        }
      }
    }

    // Auto HP potion (settings: enabled, % threshold, potion type)
    this.potionCooldown = Math.max(0, (this.potionCooldown || 0) - dt);
    const ap = this.player.auto.hpPotion;
    if (ap.enabled && this.potionCooldown <= 0 && this.player.currentHp > 0 &&
        this.player.currentHp < this.player.maxHp * (ap.percent / 100)) {
      const result = this.player.usePotion(ap.itemId);
      if (result) {
        this.potionCooldown = 1.0;
        soundEngine.playPotion();
        this.addHealSpiral(p.x, p.y);
        this.addFloatingText(p.x, p.y - 30, `+${result.healed} HP`, '#22c55e', 14);
        this.onLog(`🥤 Auto: ดื่ม ${result.itemName} ฟื้นฟู +${result.healed} HP`, 'system');
        this.uiController?.updateHUD();
      }
    }

    // Auto SP potion
    this.spPotionCooldown = Math.max(0, (this.spPotionCooldown || 0) - dt);
    const asp = this.player.auto.spPotion;
    if (asp.enabled && this.spPotionCooldown <= 0 && this.player.currentSp < this.player.maxSp * (asp.percent / 100) && this.player.ownedSpPotions().length) {
      const r = this.player.useSpPotion(asp.itemId);
      if (r) {
        this.spPotionCooldown = 1.0;
        soundEngine.playPotion();
        this.addFloatingText(p.x, p.y - 30, `+${r.restored} SP`, '#38bdf8', 14);
        this.onLog(`💧 Auto: ดื่ม ${r.itemName} ฟื้นฟู +${r.restored} SP`, 'system');
        this.uiController?.updateHUD();
      }
    }

    // Position sync over websocket
    const now = performance.now();
    if (this.network && (hasMoved || now - this.lastPosSync > 80)) {
      this.lastPosSync = now;
      this.network.sendPosition(p.x, p.y, p.facing, hasMoved, p.walkFrame, this.currentZone.id);
    }

    // Camera follow player
    const targetCamX = p.x - this.camera.w / 2;
    const targetCamY = p.y - this.camera.h / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.12;
    this.camera.y += (targetCamY - this.camera.y) * 0.12;
    this.camera.x = Math.max(0, Math.min(this.worldMap.width - this.camera.w, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.worldMap.height - this.camera.h, this.camera.y));

    // Attack anim timer decay
    if (p.attackAnimTimer > 0) {
      p.attackAnimTimer -= dt;
      if (p.attackAnimTimer <= 0) {
        p.isAttacking = false;
      }
    }

    // Update Projectiles (Arrows & Spells)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      // Add to particle trail
      pr.trail.push({ x: pr.x, y: pr.y });
      if (pr.trail.length > 5) pr.trail.shift();

      // Check hit with target monster
      if (pr.targetId) {
        const m = this.monsters.find(item => item.id === pr.targetId);
        if (m && !m.isDead) {
          const dist = Math.hypot(m.x - pr.x, m.y - pr.y);
          if (dist < 35 || pr.life <= 0) {
            // Impact!
            soundEngine.playArrowHit();
            this.addParticle(m.x, m.y, pr.isCrit ? '#f59e0b' : '#34d399', pr.isCrit ? 14 : 7);
            m.flashTimer = 0.15;
            m.squashTimer = 0.18;
            if (pr.damage > 0 && this.network && pr.ownerId === this.network.myPlayerId) {
              this.network.sendMonsterHit(m.id, pr.damage, pr.isCrit);
            }
            this.projectiles.splice(i, 1);
            continue;
          }
        }
      }

      if (pr.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update Ground Traps (Ankle snares)
    for (let i = this.groundTraps.length - 1; i >= 0; i--) {
      const trap = this.groundTraps[i];
      trap.life -= dt;
      // Check collision with monsters
      const liveMonsters = this.monsters.filter(m => !m.isDead && m.map === this.currentZone.id);
      for (const m of liveMonsters) {
        if (Math.hypot(m.x - trap.x, m.y - trap.y) < trap.radius) {
          m.stunTimer = 4.0;
          this.addShockwave(trap.x, trap.y, '#84cc16', 40);
          this.addFloatingText(m.x, m.y - 25, '🕸️ ROOTED (4s)!', '#84cc16', 16);
          this.groundTraps.splice(i, 1);
          break;
        }
      }
      if (trap.life <= 0) this.groundTraps.splice(i, 1);
    }

    // Monsters: positions come from the server (smoothed here); only animation timers run locally
    for (const m of this.monsters) {
      if (m.deathTimer > 0) m.deathTimer -= dt;
      if (m.spawnTimer > 0) m.spawnTimer -= dt;
      if (m.isDead || m.map !== this.currentZone.id) continue;
      if (m.flashTimer > 0) m.flashTimer -= dt;
      if (m.squashTimer > 0) m.squashTimer -= dt;
      if (m.attackFlash > 0) m.attackFlash -= dt;
      const k = Math.min(1, dt * 10);
      const mdx = m.tx - m.x;
      if (Math.abs(mdx) > 0.5) m.faceRight = mdx > 0; // walking direction
      m.x += mdx * k;
      m.y += (m.ty - m.y) * k;
      m.bobTimer += dt * 5;
    }

    // Other players: ease rendered position toward the latest server position
    if (this.network && this.network.otherPlayers) {
      const pk = 1 - Math.exp(-dt * 18);
      this.network.otherPlayers.forEach(op => {
        if (op.tx === undefined) return;
        const dx = op.tx - op.x, dy = op.ty - op.y;
        if (dx * dx + dy * dy > 400 * 400) { op.x = op.tx; op.y = op.ty; return; }
        op.x += dx * pk;
        op.y += dy * pk;
      });
    }

    // Update VFX list
    for (let i = this.vfxList.length - 1; i >= 0; i--) {
      const v = this.vfxList[i];
      v.life -= dt;
      if (v.type === 'shockwave') {
        const prog = 1 - (v.life / v.maxLife);
        v.radius = 5 + (v.maxRadius - 5) * prog;
      } else if (v.type === 'cyclone') {
        v.angle += dt * 18;
      } else if (v.type === 'sonic_wave') {
        const prog = 1 - (v.life / v.maxLife);
        v.radius = 10 + (v.maxRadius - 10) * prog;
      } else if (v.type === 'town_portal') {
        const prog = 1 - (v.life / v.maxLife);
        v.height = v.maxHeight * Math.sin(prog * Math.PI);
      }
      if (v.life <= 0) this.vfxList.splice(i, 1);
    }

    // Update Afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.life -= dt;
      a.alpha = (a.life / a.maxLife) * 0.65;
      if (a.life <= 0) this.afterimages.splice(i, 1);
    }

    this.updateLootOrbs(dt);
    this.updateGroundLoot(dt);
    this.updatePet(dt);

    // Update Floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.x += ft.vx * dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    // Update Attack effects
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      const ae = this.attackEffects[i];
      ae.life -= dt;
      if (ae.life <= 0) this.attackEffects.splice(i, 1);
    }
  }

  render() {
    const ctx = this.ctx;
    const cam = this.camera;

    // Apply Screen Shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake * 3;
      shakeY = (Math.random() - 0.5) * this.screenShake * 3;
    }

    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

    // 1. Terrain Ground
    this.worldMap.renderGround(ctx, cam);

    // 3. Ground Traps (Ankle Snares)
    this.renderGroundTraps(ctx);

    // 4. Static Objects (Rocks, Bushes, Trees, Braziers)
    this.worldMap.renderObjects(ctx, cam);

    // 5. Render Other Online Players (Multiplayer Fidelity)
    if (this.network && this.network.otherPlayers) {
      this.network.otherPlayers.forEach(op => {
        // Only render other players that are in the same map zone
        const opMap = op.currentMap || 'meadows';
        if (opMap === this.currentZone.id) {
          if (op.x >= cam.x - 100 && op.x <= cam.x + cam.w + 100 && op.y >= cam.y - 100 && op.y <= cam.y + cam.h + 100) {
            this.drawOtherPlayer(ctx, op);
          }
        }
      });
    }

    // 6. Render Active Monsters in Current Map
    const currentMonsters = this.monsters.filter(m => (!m.isDead || m.deathTimer > 0) && m.map === this.currentZone.id);
    for (const m of currentMonsters) {
      if (m.isDead) continue;
      const isTarget = m === this.selectedTarget;
      if (isTarget || m === this.hoverMonster) this.drawTargetRing(ctx, m, isTarget ? 'target' : 'hover');
    }
    for (const m of currentMonsters) {
      if (m.x >= cam.x - 120 && m.x <= cam.x + cam.w + 120 && m.y >= cam.y - 120 && m.y <= cam.y + cam.h + 120) {
        this.drawMonster(ctx, m);
      }
    }

    // 7. Render Projectiles (Arrows, Falcon, etc.)
    this.renderProjectiles(ctx);

    // 8. Render Attack Effects (Sword Slashes)
    for (const ae of this.attackEffects) {
      this.drawSlashEffect(ctx, ae);
    }

    // 9. Render Afterimages
    for (const a of this.afterimages) {
      ctx.save();
      ctx.globalAlpha = a.alpha;
      this.drawPlayerSprite(ctx, a.x, a.y, a.facing);
      ctx.restore();
    }

    // 10. Render Local Player Character
    this.drawPlayer(ctx);

    // 11. Render VFX Elements (Shockwaves, Cyclone, Fissures, Heal Spirals, Banners)
    this.renderVFX(ctx);

    // 12. Render Particles
    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawGroundLoot(ctx);
    this.drawLootOrbs(ctx);

    // 13. Render Floating Damage Numbers
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.font = ft.isCrit ? `bold ${ft.fontSize}px sans-serif` : `${ft.fontSize}px sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = ft.isCrit ? 8 : 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();

    // 14. Minimap Rendering
    this.renderMinimap();
  }

  // Render Ground Traps
  renderGroundTraps(ctx) {
    for (const trap of this.groundTraps) {
      ctx.strokeStyle = '#84cc16';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(trap.x, trap.y, trap.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🕸️', trap.x, trap.y + 7);
    }
  }

  // Render Projectiles (Arrows with Trails)
  renderProjectiles(ctx) {
    for (const pr of this.projectiles) {
      // Trail
      ctx.strokeStyle = pr.isCrit ? 'rgba(245, 158, 11, 0.5)' : 'rgba(52, 211, 153, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < pr.trail.length; i++) {
        const pt = pr.trail[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      if (pr.kind === 'bullet') {
        // Gun shot: short bright tracer
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(pr.angle);
        ctx.strokeStyle = pr.isCrit ? '#fde68a' : '#fef3c7';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (pr.kind === 'bolt') {
        // Magic bolt: glowing orb
        ctx.save();
        ctx.translate(pr.x, pr.y);
        const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
        glow.addColorStop(0, pr.isCrit ? '#fde68a' : '#e9d5ff');
        glow.addColorStop(0.5, pr.isCrit ? 'rgba(245,158,11,0.7)' : 'rgba(168,85,247,0.7)');
        glow.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      // Arrow Body with Angle
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(pr.angle);

      // Wooden Shaft
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();

      // Steel Arrowhead
      ctx.fillStyle = pr.isCrit ? '#f59e0b' : '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(6, -4);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();

      // Feathers Fletching
      ctx.fillStyle = pr.isCrit ? '#ea580c' : '#10b981';
      ctx.fillRect(-16, -3, 6, 6);

      ctx.restore();
    }
  }

  drawSlashEffect(ctx, ae) {
    const prog = 1 - (ae.life / ae.maxLife);
    const radius = ae.type === 'heavy' ? 62 : 46;

    ctx.save();
    ctx.translate(ae.x, ae.y);
    ctx.scale(ae.facing, 1);

    const grad = ctx.createLinearGradient(-radius, 0, radius, 0);
    if (ae.type === 'heavy') {
      grad.addColorStop(0, 'rgba(245, 158, 11, 0)');
      grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.95)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    } else {
      grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(0.5, 'rgba(186, 230, 253, 0.9)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }

    ctx.strokeStyle = grad;
    ctx.lineWidth = ae.type === 'heavy' ? 8 : 4.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI * 0.45 + prog * 0.3, Math.PI * 0.45 + prog * 0.3);
    ctx.stroke();

    ctx.restore();
  }

  renderVFX(ctx) {
    for (const v of this.vfxList) {
      if (v.type === 'shockwave') {
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 3.5 * (v.life / v.maxLife);
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
        ctx.stroke();

      } else if (v.type === 'cyclone') {
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(v.angle);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, 45 + i * 25, (i * Math.PI * 2) / 3, (i * Math.PI * 2) / 3 + Math.PI * 0.8);
          ctx.stroke();
        }
        ctx.restore();

      } else if (v.type === 'barrier') {
        const pulse = 0.5 + Math.sin(Date.now() / 80) * 0.2;
        ctx.strokeStyle = `rgba(96, 165, 250, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
        ctx.stroke();

      } else if (v.type === 'fissure') {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4 * (v.life / v.maxLife);
        ctx.beginPath();
        ctx.moveTo(v.x - 35, v.y + 12);
        ctx.lineTo(v.x - 10, v.y - 8);
        ctx.lineTo(v.x + 15, v.y + 16);
        ctx.lineTo(v.x + 40, v.y - 6);
        ctx.stroke();

      } else if (v.type === 'skill_banner') {
        ctx.save();
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = v.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = 6;
        ctx.fillText(v.text, v.x, v.y - (1 - v.life / v.maxLife) * 20);
        ctx.restore();

      } else if (v.type === 'heal_spiral') {
        const angle = Date.now() / 100;
        ctx.fillStyle = '#4ade80';
        for (let i = 0; i < 4; i++) {
          const a = angle + (i * Math.PI * 2) / 4;
          const r = 22 + Math.sin(angle * 2) * 8;
          ctx.beginPath();
          ctx.arc(v.x + Math.cos(a) * r, v.y - 15 + Math.sin(a) * 15, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (v.type === 'falcon_dive') {
        const prog = 1 - (v.life / v.maxLife);
        const fx = v.startX + (v.targetX - v.startX) * prog;
        const fy = v.startY + (v.targetY - v.startY) * prog;
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🦅', fx, fy);
      }
    }
  }

  // Pet: a small copy of the chosen monster that trails behind the player
  drawPet(ctx) {
    const mid = this.player.activePet;
    const sp = mid && monsterSprite(mid);
    const sheet = sp ? this.getSheet(sp.src) : null;
    if (!sheet) return;
    const p = this.playerEntity;
    const now = performance.now() / 1000;
    const pet = this.petState;
    if (!pet) return;
    const size = ((MONSTERS[mid] && MONSTERS[mid].size) || 92) * 0.42;
    const dh = size * sp.sh / sp.sw;
    const hop = pet.moving ? Math.abs(Math.sin(now * 12)) * 5 : 0;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(pet.x, pet.y + 8, size * 0.35, 4, 0, 0, Math.PI * 2); ctx.fill();
    const f = MONSTERS[mid]?.facing === 'none' ? false : (MONSTERS[mid]?.facing === 'right' ? p.facing < 0 : p.facing > 0);
    ctx.translate(pet.x, pet.y + 8 - hop);
    if (f) ctx.scale(-1, 1);
    ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, -size / 2, -dh, size, dh);
    ctx.restore();
    if (pet.carry) { // the item it is bringing back
      ctx.save();
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const c = pet.carry, isp = c.isPet;
      ctx.fillText(isp ? '🐾' : (ITEMS[c.itemId] || RELICS[c.itemId])?.icon || '🎁', pet.x, pet.y - dh - 6 - hop);
      ctx.restore();
    }
  }

  // Draw local player
  drawPlayer(ctx) {
    const p = this.playerEntity;
    this.drawPet(ctx);
    const legOffset = p.walkFrame ? Math.sin(p.walkFrame) * 4 : 0;
    this.drawPlayerSprite(ctx, p.x, p.y, p.facing, legOffset, true);
  }

  // Generic Articulated Player Renderer (Handles both Local Player & Detailed Remote Players)
  drawPlayerSprite(ctx, x, y, facing, legOffset = 0, isLocal = false, remoteProfile = null) {
    ctx.save();
    ctx.translate(x, y + 24);
    ctx.scale(PLAYER_SCALE * (facing || 1), PLAYER_SCALE); // scale around the feet
    ctx.translate(0, -24);

    // No classes: the outfit is the same for everyone, only the held weapon differs
    const wType = isLocal ? this.player.weaponInfo.type : ((remoteProfile && remoteProfile.weaponType) || 'fist');
    const isReborn = false;
    const isArcher = false;

    // Rebirth Aura
    if (isReborn) {
      const auraPulse = 0.5 + Math.sin(Date.now() / 200) * 0.3;
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 52);
      grad.addColorStop(0, `rgba(168, 85, 247, ${auraPulse * 0.7})`);
      grad.addColorStop(0.7, `rgba(234, 179, 8, ${auraPulse * 0.4})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings Costume (if equipped)
    if (isLocal && this.player.costumes.back === 'costume_angel_wings') {
      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🪽', -18, 0);
    }

    // Sword pose (also drives the armor arms); other weapons just rest the arms
    const swordAttacking = wType !== 'fist' && wType !== 'bow' && wType !== 'stick' && wType !== 'staff' &&
      (isLocal ? (this.playerEntity && this.playerEntity.attackAnimTimer > 0) : (remoteProfile && remoteProfile.isAttacking));
    let swingProg = 0, swingCombo = 0;
    if (swordAttacking) {
      swingProg = isLocal ? 1 - this.playerEntity.attackAnimTimer / ATTACK_ANIM : (Date.now() % 340) / 340;
      swingCombo = isLocal ? this.playerEntity.attackCombo : Math.floor(Date.now() / 340) % 3;
    }
    const pose = swordAttacking ? swordPose(swingProg, swingCombo) : { ...SWORD_REST, bodyX: 0, lean: 0 };
    const armor = this.getArmor();
    const SHOULDER_NEAR = [7, -6], SHOULDER_FAR = [-7, -6], FOREARM = 16;
    const handPos = (arm) => [SHOULDER_NEAR[0] + FOREARM * Math.sin(arm), SHOULDER_NEAR[1] - FOREARM * Math.cos(arm)];

    if (armor) {
      ctx.translate(pose.bodyX, 0);
      this.drawArmorArm(ctx, armor.arm_l, SHOULDER_FAR[0], SHOULDER_FAR[1], 2.85);
      this.drawArmorBody(ctx, armor, legOffset, pose.lean);
    } else {
    // Legs & Boots (Animated stride cycle)
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(-9, 12, 6, 12 + legOffset);
    ctx.fillRect(3, 12, 6, 12 - legOffset);
    ctx.fillStyle = isArcher ? '#065f46' : '#4a3b32';
    ctx.fillRect(-11, 4, 22, 12);

    // Torso / Armor (Green/Emerald for Archer, Silver/Blue for Swordsman)
    if (isArcher) {
      // Hunter Tunic
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(10, -4);
      ctx.lineTo(8, 8);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();

      // Leather quiver strap across chest
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.lineTo(8, 8);
      ctx.stroke();

      // Quiver with arrows on back
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-16, -16, 7, 24);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-15, -20, 5, 4); // Arrow fletching tips
    } else {
      // Silver/Blue Breastplate
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(10, -4);
      ctx.lineTo(7, 8);
      ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-6, -2);
      ctx.lineTo(2, -2);
      ctx.lineTo(0, 6);
      ctx.lineTo(-4, 6);
      ctx.closePath();
      ctx.fill();
    }

    // Belt
    ctx.fillStyle = '#291e18';
    ctx.fillRect(-11, 6, 22, 3);

    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -15, 13, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(4, -15, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Headband / Feather
    if (isArcher) {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-13, -20, 26, 4);
      ctx.font = '14px sans-serif';
      ctx.fillText('🪶', -12, -22); // Hunter feather
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-13, -20, 26, 5);
    }

    // Hair
    ctx.fillStyle = isArcher ? '#92400e' : '#6b462c';
    ctx.beginPath();
    ctx.arc(0, -21, 14, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    }

    // WEAPON RENDERING (by weapon type)
    if (wType === 'fist') {
      // bare hands: nothing held
    } else if (wType === 'bow') {
      // --- ARTICULATED HUNTER LONGBOW ---
      ctx.save();
      ctx.translate(12, 2);

      const isAttacking = isLocal ? this.playerEntity.isAttacking : (remoteProfile && remoteProfile.isAttacking);
      const drawProgress = isAttacking ? 1.0 : 0.0;

      // Curved Bow Limbs (Wood/Alloy)
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-2, 0, 20, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();

      // Gold Limb Tips
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(-2, -20, 3, 0, Math.PI * 2);
      ctx.arc(-2, 20, 3, 0, Math.PI * 2);
      ctx.fill();

      // Taut Bowstring (Drawn back during attack)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-2, -20);
      ctx.lineTo(-2 - drawProgress * 12, 0);
      ctx.lineTo(-2, 20);
      ctx.stroke();

      // Nocked Arrow ready to loose
      if (drawProgress > 0) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2 - drawProgress * 12, 0);
        ctx.lineTo(16, 0);
        ctx.stroke();
      }

      ctx.restore();

    } else if (wType === 'stick' || wType === 'staff') {
      // --- STICK / STAFF ---
      ctx.save();
      let swing = 0.35;
      const attacking = isLocal ? (this.playerEntity && this.playerEntity.attackAnimTimer > 0) : (remoteProfile && remoteProfile.isAttacking);
      if (attacking) {
        const prog = isLocal ? (1 - (this.playerEntity.attackAnimTimer / 0.22)) : 0.5;
        swing = wType === 'staff' ? -0.3 + prog * 0.8 : -1.2 + prog * 2.6;
      }
      ctx.translate(8, 6);
      ctx.rotate(swing);
      const isStaff = wType === 'staff';
      ctx.strokeStyle = isStaff ? '#7c3aed' : '#78350f';
      ctx.lineWidth = isStaff ? 4 : 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, isStaff ? -30 : -22);
      ctx.stroke();
      if (isStaff) {
        ctx.fillStyle = attacking ? '#fde68a' : '#c084fc';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -33, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // little leaves on the twig
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -12); ctx.lineTo(5, -17);
        ctx.moveTo(0, -18); ctx.lineTo(-5, -23);
        ctx.stroke();
      }
      ctx.restore();

    } else {
      // --- ARTICULATED STEEL/RUNE SWORD ---
      ctx.save();
      const swingAngle = pose.blade;
      const [hx, hy] = armor ? handPos(pose.arm) : [8, 2];

      // Blade trail: a fading crescent following the tip through the strike
      if (armor && swordAttacking && swingProg > 0.2 && swingProg < 0.62) {
        const fade = swingProg < 0.5 ? 1 : (0.62 - swingProg) / 0.12;
        const berserk = isLocal && this.playerEntity.buffs && this.playerEntity.buffs.berserk > 0;
        const rgb = berserk ? '248, 113, 113' : swingCombo === 2 ? '253, 224, 71' : '186, 230, 253';
        const STEPS = 12, SPAN = 0.1, LEN = 46;
        const at = (k) => {
          const q = swordPose(Math.max(0.2, swingProg - k * SPAN / STEPS), swingCombo);
          const [qx, qy] = handPos(q.arm);
          const dx = Math.sin(q.blade), dy = -Math.cos(q.blade);
          return [[qx + dx * LEN * 0.4, qy + dy * LEN * 0.4], [qx + dx * LEN, qy + dy * LEN]];
        };
        ctx.save();
        for (let k = 0; k < STEPS; k++) {
          const [i0, o0] = at(k), [i1, o1] = at(k + 1);
          ctx.fillStyle = `rgba(${rgb}, ${(1 - k / STEPS) * 0.6 * fade})`;
          ctx.beginPath();
          ctx.moveTo(i0[0], i0[1]); ctx.lineTo(o0[0], o0[1]); ctx.lineTo(o1[0], o1[1]); ctx.lineTo(i1[0], i1[1]);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.translate(hx, hy);
      ctx.rotate(swingAngle);

      // Held sword picture (local player only: other players only send their weapon type)
      const wSprite = isLocal ? weaponSprite(this.player.equipment.weapon) : null;
      const wImg = wSprite ? this.getSheet(wSprite.src) : null;
      if (wImg) {
        const dh = Math.min(wSprite.h * 0.36, 58);
        const dw = dh * wSprite.w / wSprite.h;
        if (this.playerEntity.buffs && this.playerEntity.buffs.berserk > 0) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14; }
        // grip sits on the hand: draw with the lower 20% of the picture behind the pivot
        ctx.drawImage(wImg, -dw / 2, -dh * 0.8, dw, dh);
      } else {

        const isBerserk = isLocal && this.playerEntity.buffs && this.playerEntity.buffs.berserk > 0;
        const isIronGuard = isLocal && this.playerEntity.buffs && this.playerEntity.buffs.def > 0;

        if (isBerserk) {
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;
        } else if (isIronGuard) {
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 10;
        } else if (isReborn) {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
        }

        // Hilt & Guard
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-2, -2, 4, 8);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-3, 6, 6, 3);
        ctx.fillStyle = isBerserk ? '#dc2626' : '#d97706';
        ctx.fillRect(-8, -4, 16, 3);

        // Blade
        const bladeGrad = ctx.createLinearGradient(-3, -28, 3, -4);
        if (isBerserk) {
          bladeGrad.addColorStop(0, '#fef08a');
          bladeGrad.addColorStop(0.5, '#f97316');
          bladeGrad.addColorStop(1, '#b91c1c');
        } else {
          bladeGrad.addColorStop(0, '#ffffff');
          bladeGrad.addColorStop(0.5, '#cbd5e1');
          bladeGrad.addColorStop(1, '#64748b');
        }

        ctx.fillStyle = bladeGrad;
        ctx.beginPath();
        ctx.moveTo(-3, -4);
        ctx.lineTo(-3, -24);
        ctx.lineTo(0, -31);
        ctx.lineTo(3, -24);
        ctx.lineTo(3, -4);
        ctx.closePath();
        ctx.fill();

      }
      ctx.restore();
    }

    // Sword arm in front: the hand covers the grip
    if (armor) this.drawArmorArm(ctx, armor.arm_r, SHOULDER_NEAR[0], SHOULDER_NEAR[1], wType === 'fist' ? 2.75 : pose.arm);

    ctx.restore();
  }

  // Draw Other Players with Full Visual Fidelity ("อื่นๆ: อยากให้เห็นผู้เล่นอื่น โจมตี เดิน หรืออื่นๆ อย่างละเอียด")
  drawOtherPlayer(ctx, op) {
    const x = op.x;
    const y = op.y;
    const facing = op.facing || 1;
    const legOffset = op.isMoving ? Math.sin((op.walkFrame || 0) * 0.8) * 5 : 0;

    // 1. Draw Player Character Body & Weapon
    this.drawPlayerSprite(ctx, x, y, facing, legOffset, false, op);

    // 2. Overhead Tags (Name, Job, Party Tag, Health Bar)
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';

    const isPartyMember = this.network && this.network.currentParty && this.network.currentParty.members && this.network.currentParty.members.some(m => m.id === op.id);

    // Name & Party Indicator
    ctx.fillStyle = isPartyMember ? '#38bdf8' : '#4ade80';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 4;
    const partyIcon = isPartyMember ? '🚩 [Party] ' : '👥 ';
    ctx.fillText(`${partyIcon}${op.name}`, x, y - 44 - PLAYER_TAG_UP);

    // Job Title & Level
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`Lv.${op.level || 1}`, x, y - 34 - PLAYER_TAG_UP);

    // Mini Overhead Health Bar
    const maxHp = op.maxHp || 200;
    const hp = op.hp !== undefined ? op.hp : maxHp;
    const hpPct = Math.max(0, Math.min(1, hp / maxHp));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x - 20, y - 30 - PLAYER_TAG_UP, 40, 4);
    ctx.fillStyle = isPartyMember ? '#38bdf8' : (hpPct > 0.4 ? '#22c55e' : '#ef4444');
    ctx.fillRect(x - 20, y - 30 - PLAYER_TAG_UP, 40 * hpPct, 4);

    ctx.restore();
  }

  // Draw Monster (Slime, Rabbits, and Golems)
  drawMonster(ctx, m) {
    const bob = Math.sin(m.bobTimer) * 4;
    let x = m.x + (m.knockbackX || 0);
    let y = m.y + bob + (m.knockbackY || 0);

    // Death / spawn animation state
    const dying = m.isDead;
    let alpha = 1;
    let bright = false;
    let scaleX = 1;
    let scaleY = 1;
    if (dying) {
      // flash white, bulge sideways, melt flat into the ground and fade out
      const p = Math.min(1, Math.max(0, 1 - m.deathTimer / MONSTER_DEATH_TIME));
      y = m.y + (m.knockbackY || 0);
      x = m.x + (m.knockbackX || 0);
      bright = p < 0.3;
      scaleX = 1 + 0.45 * Math.sin(Math.min(1, p * 1.6) * Math.PI / 2);
      scaleY = Math.max(0.02, 1 - 0.98 * p * p);
      alpha = Math.max(0, 1 - Math.pow(p, 1.6));
    } else if (m.spawnTimer > 0) {
      // pop up out of the ground with an overshoot, flashing as it appears
      const p = Math.min(1, Math.max(0, 1 - m.spawnTimer / MONSTER_SPAWN_TIME));
      const c1 = 1.9, c3 = c1 + 1;
      const e = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); // easeOutBack
      scaleX = Math.max(0.01, 0.4 + 0.6 * e);
      scaleY = Math.max(0.01, e);
      alpha = Math.min(1, p * 3);
      bright = p < 0.5;
    }
    if (!dying && m.squashTimer > 0) {
      const s = (m.squashTimer / 0.18) * 0.35;
      scaleX *= 1 + s;
      scaleY *= 1 - s;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // Shadow (shrinks while the body does)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 26, 22 * Math.min(1, scaleX), 9 * Math.min(1, Math.max(scaleY, 0.3)), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y);
    // The picture looks `facing` (left/right) in the sheet: mirror it when the monster walks the other way
    const mirror = m.facing === 'none' ? false : (m.facing === 'right' ? !m.faceRight : m.faceRight);
    ctx.translate(0, 28);
    ctx.scale(scaleX * (mirror ? -1 : 1), scaleY);
    ctx.translate(0, -28);

    const isFlashing = m.flashTimer > 0 || bright;
    const sp = monsterSprite(m.templateId);
    const sheet = sp ? this.getSheet(sp.src) : null;
    if (sheet) {
      // transparent cut-out standing on the ground (feet near the shadow)
      const size = (MONSTERS[m.templateId] && MONSTERS[m.templateId].size) || m.size || 92;
      const dh = size * sp.sh / sp.sw;
      ctx.save();
      if (isFlashing && 'filter' in ctx) ctx.filter = 'brightness(2.2)';
      ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, -size / 2, 28 - dh, size, dh);
      ctx.restore();
      if (m.stunTimer > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 22, 26, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.emoji, 0, 10);
    }

    ctx.restore();
    if (dying) return; // no stars / name / HP bar while dying

    // Stunned spinning stars
    if (m.stunTimer > 0) {
      ctx.save();
      const stunAngle = Date.now() / 180;
      for (let i = 0; i < 3; i++) {
        const a = stunAngle + (i * Math.PI * 2) / 3;
        const sx = x + Math.cos(a) * 20;
        const sy = y - 36 + Math.sin(a) * 8;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⭐', sx, sy);
      }
      ctx.restore();
    }

    // Name & HP Bar (fade in with the spawn animation)
    ctx.save();
    if (m.spawnTimer > 0) ctx.globalAlpha = Math.max(0, 1 - m.spawnTimer / MONSTER_SPAWN_TIME);
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    const labelUp = sp ? 28 + (((MONSTERS[m.templateId] && MONSTERS[m.templateId].size) || m.size || 92) * sp.sh / sp.sw) * 0.4 + 4 : 28; // cut-out pictures are taller than the old emoji
    ctx.fillText(`${m.name} Lv.${m.level}`, x, y - labelUp - 4);

    const hpPct = Math.max(0, m.currentHp / m.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 22, y - labelUp, 44, 4);
    ctx.fillStyle = hpPct > 0.4 ? '#ef4444' : '#b91c1c';
    ctx.fillRect(x - 22, y - labelUp, 44 * hpPct, 4);
    ctx.restore();
  }

  renderMinimap() {
    if (!this.miniCtx) return;
    const ctx = this.miniCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;
    const ww = this.worldMap.width;
    const wh = this.worldMap.height;

    const zid = this.currentZone.id;
    ctx.fillStyle = zid === 'town' ? '#64748b' : zid === 'volcano' ? '#18181b' : '#3f6212';
    ctx.fillRect(0, 0, mw, mh);

    const sx = mw / ww;
    const sy = mh / wh;

    // Monsters as Red Dots
    ctx.fillStyle = '#ef4444';
    const liveMonsters = this.monsters.filter(m => !m.isDead && m.map === this.currentZone.id);
    for (const m of liveMonsters) {
      ctx.beginPath();
      ctx.arc(m.x * sx, m.y * sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Other Players as Green/Blue Dots
    if (this.network && this.network.otherPlayers) {
      this.network.otherPlayers.forEach(op => {
        if ((op.currentMap || 'meadows') === this.currentZone.id) {
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(op.x * sx, op.y * sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // You as Bright Cyan Dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(this.playerEntity.x * sx, this.playerEntity.y * sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Camera Viewport Rectangle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.camera.x * sx, this.camera.y * sy, this.camera.w * sx, this.camera.h * sy);
  }

  // Advance the simulation by `elapsed` seconds in small steps (keeps physics/AI stable after long gaps)
  step(elapsed) {
    let remaining = Math.min(elapsed, 10);
    while (remaining > 0) {
      const dt = Math.min(remaining, 0.1);
      this.update(dt);
      remaining -= dt;
    }
  }

  loop(timestamp) {
    // rAF timestamps share performance.now()'s clock
    const now = performance.now();
    const dt = Math.min((now - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  }

  // Browsers stop requestAnimationFrame in background tabs, which froze the character
  // (no Auto, no movement, no position sync). A worker timer keeps the game logic running
  // while the tab is hidden; rendering is skipped until the tab is visible again.
  startBackgroundTicker() {
    const tick = () => {
      if (!document.hidden) return; // rAF drives the game while visible
      const now = performance.now();
      const elapsed = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      this.step(elapsed);
    };
    try {
      const src = 'setInterval(() => postMessage(0), 100);';
      this.bgWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'application/javascript' })));
      this.bgWorker.onmessage = tick;
    } catch (e) {
      // Workers unavailable: fall back to a (browser-throttled, ~1/s) page timer
      this.bgTimer = setInterval(tick, 250);
    }
    document.addEventListener('visibilitychange', () => {
      this.lastTimestamp = performance.now(); // no huge dt jump when returning to the tab
    });
  }
}

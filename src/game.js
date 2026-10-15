// 2D Canvas Game Engine with Large Tile World, Camera Follow, Real Sprites, Multiplayer Sync & High-Impact VFX
import { WorldMap } from './map.js';
import { getMapDef, TILE_SIZE } from './maps.js';
import { ZONES, MONSTERS, ITEMS, RELICS, QUESTS } from './data.js';
import { soundEngine } from './audio.js';

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
    this.attackEffects = [];
    this.afterimages = [];
    this.projectiles = []; // Arrows & spells
    this.telegraphedAoEs = []; // Red warning danger circles on floor
    this.groundTraps = []; // Ankle snares

    // 4. Monster Sprite Sheet Image
    this.monsterSheet = new Image();
    this.monsterSheetLoaded = false;
    this.monsterSheet.src = './assets/monsters_sheet.jpg';
    this.monsterSheet.onload = () => {
      this.monsterSheetLoaded = true;
    };

    this.spriteCrops = {
      slime: { sx: 40, sy: 40, sw: 420, sh: 420 },
      sprout: { sx: 540, sy: 30, sw: 440, sh: 430 },
      forest_wolf: { sx: 540, sy: 30, sw: 440, sh: 430 },
      horned_rabbit: { sx: 40, sy: 520, sw: 420, sh: 440 },
      wild_boar: { sx: 40, sy: 520, sw: 420, sh: 440 },
      stone_golem: { sx: 530, sy: 530, sw: 440, sh: 430 },
      ancient_golem: { sx: 530, sy: 530, sw: 440, sh: 430 }
    };

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
    this.monsters = [];
    this.selectedTarget = null;
    this.lastTimestamp = performance.now();
    this.lastPosSync = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
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
    this.camera.w = window.innerWidth;
    this.camera.h = window.innerHeight;
  }

  get currentZone() {
    return ZONES[this.currentZoneIndex] || ZONES[1];
  }

  setZone(index) {
    if (index >= 0 && index < ZONES.length) {
      this.currentZoneIndex = index;
      const z = this.currentZone;
      this.worldMap.setZoneTheme(z.id);
      this.onLog(`🗺️ เดินทางสู่: ${z.name}`, 'system');

      const zoneTitle = document.getElementById('minimap-zone-name');
      if (zoneTitle) zoneTitle.textContent = z.name;

      if (this.network) {
        this.network.sendChangeMap(z.id, this.playerEntity.x, this.playerEntity.y);
      }
    }
  }

  changeMap(mapId) {
    const idx = ZONES.findIndex(z => z.id === mapId);
    if (idx !== -1) {
      this.currentZoneIndex = idx;
      const z = ZONES[idx];
      this.worldMap.setZoneTheme(z.id);

      // Spawn point comes from the map definition
      const spawn = getMapDef(z.id).spawn;
      this.playerEntity.x = spawn.x;
      this.playerEntity.y = spawn.y;
      if (z.id === 'boss_lair') {
        this.addSkillBanner('🐉 DRAGON\'S LAIR (WORLD BOSS)', '#ef4444');
        soundEngine.playDragonRoar();
      }
      this.playerEntity.targetX = this.playerEntity.x;
      this.playerEntity.targetY = this.playerEntity.y;
      this.selectedTarget = null;
      this.updateTargetHUD(null);

      this.onLog(`🗺️ ย้ายไปยังแผนที่: ${z.name}`, 'system');
      const zoneTitle = document.getElementById('minimap-zone-name');
      if (zoneTitle) zoneTitle.textContent = z.name;

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
        drops: template.drops,
        isMvp: !!template.isMvp,
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
      m.flashTimer = 0.15;
      m.squashTimer = 0.18;
      this.addFloatingText(m.x, m.y - 20, `${damage}`, isCrit ? '#f59e0b' : '#ffffff', isCrit ? 22 : 16, isCrit);
      this.addParticle(m.x, m.y, isCrit ? '#f59e0b' : '#ef4444', isCrit ? 12 : 6);
      if (this.selectedTarget && this.selectedTarget.id === monsterId) {
        this.updateTargetHUD(m);
      }
    }
  }

  onMonsterKilledFromServer(monsterId, killerId, killerName, isMvp = false) {
    const m = this.monsters.find(item => item.id === monsterId);
    if (m) {
      m.isDead = true;
      m.currentHp = 0;
      this.addParticle(m.x, m.y, '#f59e0b', 25);
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

        // Drop handling
        if (m.drops) {
          m.drops.forEach(drop => {
            if (Math.random() <= drop.chance) {
              const item = ITEMS[drop.itemId] || RELICS[drop.itemId];
              if (item) {
                const addRes = this.player.addItem(drop.itemId, 1);
                if (addRes.isRelic) {
                  this.onLog(`💎 ค้นพบสมบัติในตำนาน! [${item.name}] บันทึกลงสมุดสมบัติสำเร็จ!`, 'relic');
                  this.addSkillBanner(`💎 RELIC FOUND: ${item.name}`, '#a855f7');
                  this.addShockwave(m.x, m.y, '#a855f7', 80);
                } else {
                  this.onLog(`🎁 ได้รับไอเทม: ${item.icon} ${item.name}`, 'loot');
                }
              }
            }
          });
        }
      } else {
        this.onLog(`👥 ผู้เล่น [${killerName || 'Adventurer'}] ปราบ [${m.name}]!`, 'chat');
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
      m.currentHp = m.maxHp;
      m.x = m.tx = monsterData.spawnX || monsterData.x;
      m.y = m.ty = monsterData.spawnY || monsterData.y;
      this.addShockwave(m.x, m.y, '#22c55e', 35);
      this.addParticle(m.x, m.y, '#22c55e', 10);
    }
  }

  // Server-calculated EXP / gold reward (solo kill or party share)
  onRewardFromServer(msg) {
    this.player.gainExp(msg.exp);
    this.player.gold += msg.gold || 0;
    this.player.saveToStorage();
    if (msg.shared) {
      this.addFloatingText(this.playerEntity.x, this.playerEntity.y - 45, `+${msg.exp} EXP [Party]`, '#4ade80', 16);
      this.onLog(`🤝 [ปาร์ตี้ x${msg.shareCount}] ปราบ [${msg.monsterName}] โดย ${msg.fromName} • ได้ +${msg.exp} EXP, +${msg.gold} G`, 'system');
    } else {
      this.onLog(`⚔️ ปราบ [${msg.monsterName}] สำเร็จ! ได้รับ +${msg.exp} EXP, +${msg.gold} G`, 'chat');
    }
  }

  // Handle Telegraphed Boss AoE Danger Zones
  handleBossAoeTelegraph(msg) {
    this.telegraphedAoEs.push({
      bossId: msg.bossId,
      skillName: msg.skillName,
      x: msg.x,
      y: msg.y,
      radius: msg.radius,
      duration: msg.duration,
      maxDuration: msg.duration,
      damage: msg.damage
    });
    this.addSkillBanner('⚠️ DANGER! หลบออกจากวงแดง (WASD)!', '#ef4444');
    soundEngine.playDragonRoar();
  }

  // Detonate Boss AoE after warning timer expires
  onBossAoeResult(msg) {
    const idx = this.telegraphedAoEs.findIndex(a => Math.hypot(a.x - msg.x, a.y - msg.y) < 1);
    const aoe = idx >= 0 ? this.telegraphedAoEs.splice(idx, 1)[0] : { x: msg.x, y: msg.y, radius: msg.radius };
    aoe.damage = msg.damage;
    this.detonateBossAoe(aoe, msg.hit);
  }

  detonateBossAoe(aoe, hit) {
    // Massive explosion at (aoe.x, aoe.y)
    this.triggerScreenShake(12);
    this.addShockwave(aoe.x, aoe.y, '#ef4444', aoe.radius * 1.3);
    this.addParticle(aoe.x, aoe.y, '#f97316', 50);
    soundEngine.playDragonRoar();

    // Hit/dodge is decided by the server
    if (hit) {
      // HIT! Heavy damage!
      let def = this.player.defense;
      if (this.playerEntity.buffs.def > 0) def += 60;
      const actualDmg = Math.max(50, aoe.damage - def);

      this.player.currentHp = Math.max(0, this.player.currentHp - actualDmg);
      this.addFloatingText(this.playerEntity.x, this.playerEntity.y - 45, `💥 -${actualDmg} HP [HIT BY BOSS AOE!]`, '#ef4444', 20, true);

      // Heavy knockback away from center
      const angle = Math.atan2(this.playerEntity.y - aoe.y, this.playerEntity.x - aoe.x);
      this.playerEntity.x += Math.cos(angle) * 80;
      this.playerEntity.y += Math.sin(angle) * 80;

      this.onLog(`💥 [เตือนภัย!] คุณโดนระเบิดเพลิงมังกร ${actualDmg} ดาเมจ! โปรดกด WASD หลบออกจากพื้นที่สีแดงให้ทัน!`, 'system');
    } else {
      // Safe! Player dodged!
      this.addFloatingText(this.playerEntity.x, this.playerEntity.y - 35, `💨 DODGED!`, '#38bdf8', 16);
      this.onLog(`💨 คุณใช้ WASD หลบการโจมตีพื้นที่สีแดงของบอสได้สำเร็จ!`, 'chat');
    }
  }

  // Handle Remote Player Attack Animations & VFX
  handleRemotePlayerAttack(msg) {
    if (msg.weaponType === 'bow' || msg.weaponType === 'staff') {
      const kind = msg.weaponType === 'staff' ? 'bolt' : 'arrow';
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
    this.screenShake = Math.max(this.screenShake, intensity);
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

  // RIGHT-CLICK: Select Target
  handleRightClick(screenX, screenY) {
    const worldX = screenX + this.camera.x;
    const worldY = screenY + this.camera.y;

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
    const worldX = screenX + this.camera.x;
    const worldY = screenY + this.camera.y;

    const liveMonsters = this.monsters.filter(m => !m.isDead && m.map === this.currentZone.id);
    for (const m of liveMonsters) {
      const dist = Math.hypot(worldX - m.x, worldY - m.y);
      if (dist < 65) {
        this.selectedTarget = m;
        this.updateTargetHUD(m);
        const distToPlayer = Math.hypot(m.x - this.playerEntity.x, m.y - this.playerEntity.y);
        const attackRange = this.player.attackRange;
        if (distToPlayer <= attackRange) {
          this.performPlayerAttack(m);
        }
        return;
      }
    }

    if (this.selectedTarget && !this.selectedTarget.isDead) {
      const distToTarget = Math.hypot(this.selectedTarget.x - this.playerEntity.x, this.selectedTarget.y - this.playerEntity.y);
      const attackRange = this.player.attackRange;
      if (distToTarget <= attackRange) {
        this.performPlayerAttack(this.selectedTarget);
        return;
      }
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

    if (!monster || monster.isDead) {
      box.style.opacity = '0';
      return;
    }

    box.style.opacity = '1';
    nameEl.textContent = `${monster.isMvp ? '👑 [MVP] ' : ''}${monster.name} [Lv.${monster.level}]`;
    textEl.textContent = `${monster.currentHp} / ${monster.maxHp}`;
    const pct = Math.max(0, (monster.currentHp / monster.maxHp) * 100);
    fillEl.style.width = `${pct}%`;
    fillEl.style.backgroundColor = monster.isMvp ? '#ef4444' : '#f59e0b';
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

  // Hotkey Skills Execution (Slots 1 to 9) - Handles Archer vs Swordsman branch dynamically
  // Hotbar 1-9 is filled by the player. There are no skills yet, so assigned
  // entries have nothing to run for now; empty slots just say so.
  useSkillSlot(slot) {
    const entry = this.player.hotbar[slot - 1];
    if (!entry) {
      this.onLog(`ช่อง [${slot}] ว่างอยู่ — ยังไม่ได้ตั้งสกิล/ไอเทมในช่องนี้`, 'system');
      return;
    }
    const item = ITEMS[entry];
    if (item && item.type === 'consumable') this.usePotionSlot();
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

  performPlayerAttack(monster) {
    const p = this.playerEntity;
    p.facing = monster.x >= p.x ? 1 : -1;
    p.isAttacking = true;
    p.attackAnimTimer = 0.22;
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
    for (let i = 1; i <= 9; i++) {
      if (p.skillCooldowns[i] > 0) p.skillCooldowns[i] = Math.max(0, p.skillCooldowns[i] - dt);
    }
    if (p.buffs.def > 0) p.buffs.def = Math.max(0, p.buffs.def - dt);
    if (p.buffs.berserk > 0) p.buffs.berserk = Math.max(0, p.buffs.berserk - dt);
    if (p.buffs.concentration > 0) p.buffs.concentration = Math.max(0, p.buffs.concentration - dt);

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
      const speed = 195;
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

      if (this.player.autoBattle && (!this.selectedTarget || this.selectedTarget.isDead || this.selectedTarget.map !== this.currentZone.id)) {
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

      if (this.selectedTarget && !this.selectedTarget.isDead && this.selectedTarget.map === this.currentZone.id) {
        const target = this.selectedTarget;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.hypot(dx, dy);
        p.facing = dx >= 0 ? 1 : -1;
        const attackRange = this.player.attackRange;

        if (dist > attackRange) {
          const speed = 175;
          const stepX = (dx / dist) * speed * dt;
          const stepY = (dy / dist) * speed * dt;
          if (this.worldMap.isWalkable(p.x + stepX, p.y, 16)) { p.x += stepX; hasMoved = true; }
          if (this.worldMap.isWalkable(p.x, p.y + stepY, 16)) { p.y += stepY; hasMoved = true; }
          p.walkFrame += dt * 10;
        } else {
          if (p.attackCooldown <= 0) {
            this.performPlayerAttack(target);
            let aspd = this.player.aspd;
            if (p.buffs.berserk > 0) aspd *= 1.5;
            if (p.buffs.concentration > 0) aspd *= 1.25;
            p.attackCooldown = 1.0 / aspd;
          }
        }
      } else {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          const speed = 180;
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

    // Update Telegraphed Danger Zones (Boss AoE)
    for (let i = this.telegraphedAoEs.length - 1; i >= 0; i--) {
      const aoe = this.telegraphedAoEs[i];
      aoe.duration -= dt;
      // The server decides hit/dodge at detonation (see onBossAoeResult); this only
      // drops the warning ring if the result message never arrives.
      if (aoe.duration <= -1) {
        this.telegraphedAoEs.splice(i, 1);
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
      if (m.isDead || m.map !== this.currentZone.id) continue;
      if (m.flashTimer > 0) m.flashTimer -= dt;
      if (m.squashTimer > 0) m.squashTimer -= dt;
      if (m.attackFlash > 0) m.attackFlash -= dt;
      const k = Math.min(1, dt * 10);
      m.x += (m.tx - m.x) * k;
      m.y += (m.ty - m.y) * k;
      m.bobTimer += dt * 5;
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
    ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

    // 1. Terrain Ground
    this.worldMap.renderGround(ctx, cam);

    // 2. Telegraphed Boss Danger Zones (Red Warning Circles on Floor)
    this.renderTelegraphedDangerZones(ctx);

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
    const currentMonsters = this.monsters.filter(m => !m.isDead && m.map === this.currentZone.id);
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

  // Render Red Telegraphed Danger Zones with Radial Countdown
  renderTelegraphedDangerZones(ctx) {
    const time = Date.now() / 200;

    for (const aoe of this.telegraphedAoEs) {
      const prog = 1 - (Math.max(0, aoe.duration) / aoe.maxDuration); // 0 to 1
      const pulse = 0.5 + Math.sin(time * 3) * 0.2;

      // Outer Red Warning Border
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 + pulse * 0.2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(aoe.x, aoe.y, aoe.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Translucent Red Danger Area
      ctx.fillStyle = `rgba(239, 68, 68, ${0.2 + pulse * 0.15})`;
      ctx.beginPath();
      ctx.arc(aoe.x, aoe.y, aoe.radius, 0, Math.PI * 2);
      ctx.fill();

      // Expanding Countdown Fill Circle
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(aoe.x, aoe.y, aoe.radius * prog, 0, Math.PI * 2);
      ctx.fill();

      // Warning Banner & Timer Text above zone
      ctx.save();
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 6;
      ctx.fillText(`⚠️ DANGER ZONE! [${Math.max(0, aoe.duration).toFixed(1)}s]`, aoe.x, aoe.y - aoe.radius - 12);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`[กด WASD หลบด่วน!]`, aoe.x, aoe.y - aoe.radius + 4);
      ctx.restore();
    }
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

  // Draw local player
  drawPlayer(ctx) {
    const p = this.playerEntity;
    const legOffset = p.walkFrame ? Math.sin(p.walkFrame) * 4 : 0;
    this.drawPlayerSprite(ctx, p.x, p.y, p.facing, legOffset, true);
  }

  // Generic Articulated Player Renderer (Handles both Local Player & Detailed Remote Players)
  drawPlayerSprite(ctx, x, y, facing, legOffset = 0, isLocal = false, remoteProfile = null) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing || 1, 1);

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
      let swingAngle = 0.35;
      const isAttacking = isLocal ? (this.playerEntity && this.playerEntity.attackAnimTimer > 0) : (remoteProfile && remoteProfile.isAttacking);

      if (isAttacking) {
        const prog = isLocal ? (1 - (this.playerEntity.attackAnimTimer / 0.22)) : 0.5;
        const combo = isLocal ? this.playerEntity.attackCombo : 0;
        if (combo === 0) swingAngle = -1.2 + prog * 2.6;
        else if (combo === 1) swingAngle = 1.2 - prog * 2.3;
        else swingAngle = -0.8 + prog * 2.3;
      }

      ctx.translate(8, 2);
      ctx.rotate(swingAngle);

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

      ctx.restore();
    }

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
    ctx.fillText(`${partyIcon}${op.name}`, x, y - 44);

    // Job Title & Level
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`Lv.${op.level || 1}`, x, y - 34);

    // Mini Overhead Health Bar
    const maxHp = op.maxHp || 200;
    const hp = op.hp !== undefined ? op.hp : maxHp;
    const hpPct = Math.max(0, Math.min(1, hp / maxHp));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x - 20, y - 30, 40, 4);
    ctx.fillStyle = isPartyMember ? '#38bdf8' : (hpPct > 0.4 ? '#22c55e' : '#ef4444');
    ctx.fillRect(x - 20, y - 30, 40 * hpPct, 4);

    ctx.restore();
  }

  // Draw Monster (Slime, Rabbits, Golems, and Giant Ancient Red Dragon MVP)
  drawMonster(ctx, m) {
    const bob = Math.sin(m.bobTimer) * 4;
    let x = m.x + (m.knockbackX || 0);
    let y = m.y + bob + (m.knockbackY || 0);

    // SPECIAL: Ancient Red Dragon MVP (World Boss)
    if (m.templateId === 'ancient_dragon' || m.isMvp) {
      this.drawAncientDragonMVP(ctx, m, x, y);
      return;
    }

    // Normal Monsters
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 26, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    let scaleX = 1;
    let scaleY = 1;
    if (m.squashTimer > 0) {
      const s = (m.squashTimer / 0.18) * 0.35;
      scaleX = 1 + s;
      scaleY = 1 - s;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);

    const isFlashing = m.flashTimer > 0;
    const crop = this.spriteCrops[m.templateId] || this.spriteCrops.slime;
    if (this.monsterSheetLoaded) {
      const size = 56;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.monsterSheet, crop.sx, crop.sy, crop.sw, crop.sh, -size / 2, -size / 2, size, size);

      if (isFlashing) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = m.stunTimer > 0 ? '#fde047' : isFlashing ? '#ef4444' : 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = m.stunTimer > 0 || isFlashing ? 3.5 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.emoji, 0, 10);
    }

    ctx.restore();

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

    // Name & HP Bar
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${m.name} Lv.${m.level}`, x, y - 32);

    const hpPct = Math.max(0, m.currentHp / m.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 22, y - 28, 44, 4);
    ctx.fillStyle = hpPct > 0.4 ? '#ef4444' : '#b91c1c';
    ctx.fillRect(x - 22, y - 28, 44 * hpPct, 4);
    ctx.restore();
  }

  // Draw Ancient Red Dragon MVP Boss
  drawAncientDragonMVP(ctx, m, x, y) {
    const time = Date.now() / 300;
    const wingFlap = Math.sin(time * 3) * 0.25;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 65, 75, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);

    // Left Wing (Flapping)
    ctx.save();
    ctx.rotate(-wingFlap);
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(-100, -70);
    ctx.lineTo(-70, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Right Wing (Flapping)
    ctx.save();
    ctx.rotate(wingFlap);
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(20, -10);
    ctx.lineTo(100, -70);
    ctx.lineTo(70, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Dragon Body (Crimson Red)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(0, 15, 45, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dragon Underbelly (Golden Scales)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(0, 20, 24, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dragon Neck & Head
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(0, -35, 26, 0, Math.PI * 2);
    ctx.fill();

    // Dragon Horns (Obsidian)
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(-15, -45);
    ctx.lineTo(-35, -80);
    ctx.lineTo(-5, -55);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(15, -45);
    ctx.lineTo(35, -80);
    ctx.lineTo(5, -55);
    ctx.closePath();
    ctx.fill();

    // Glowing Fiery Eyes
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(-8, -36, 4.5, 0, Math.PI * 2);
    ctx.arc(8, -36, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Fire breath particle embers
    if (Math.random() < 0.4) {
      this.addParticle(x + (Math.random() - 0.5) * 30, y - 20, '#ea580c', 2);
    }

    ctx.restore();

    // Giant Overhead MVP Title & Boss Bar
    ctx.save();
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 8;
    ctx.fillText(`👑 [WORLD BOSS MVP] Ancient Red Dragon`, x, y - 95);

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Lv.99 • HP: ${m.currentHp} / ${m.maxHp}`, x, y - 76);

    const hpPct = Math.max(0, m.currentHp / m.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 70, y - 68, 140, 8);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x - 70, y - 68, 140 * hpPct, 8);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 70, y - 68, 140, 8);
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
    ctx.fillStyle = zid === 'town' ? '#64748b' : zid === 'volcano' ? '#18181b' : zid === 'boss_lair' ? '#450a0a' : '#3f6212';
    ctx.fillRect(0, 0, mw, mh);

    const sx = mw / ww;
    const sy = mh / wh;

    // Monsters as Red Dots
    ctx.fillStyle = '#ef4444';
    const liveMonsters = this.monsters.filter(m => !m.isDead && m.map === this.currentZone.id);
    for (const m of liveMonsters) {
      ctx.beginPath();
      ctx.arc(m.x * sx, m.y * sy, m.isMvp ? 5 : 2.5, 0, Math.PI * 2);
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

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  }
}

// Authoritative Multiplayer Game Server (HTTP + WebSocket)
// Supports Multi-Zone Routing, Boss MVP Telegraphed AoE, Full Party System & High-Fidelity Sync
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

// 1. Create HTTP Server for Static Assets
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  let decoded;
  try { decoded = decodeURIComponent(reqPath); } catch { decoded = null; }
  const filePath = decoded === null ? null : path.join(__dirname, path.normalize(decoded));
  const rel = filePath === null ? null : path.relative(__dirname, filePath).split(path.sep);
  const allowed = rel !== null && !decoded.includes('\0') && (
    (rel.length === 1 && ['index.html', 'style.css'].includes(rel[0])) ||
    (rel.length > 1 && ['src', 'assets'].includes(rel[0]) && !rel.includes('..'))
  );
  if (!allowed) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// 2. Authoritative World State: Fixed Monsters Per Map
const FIXED_MONSTERS_DATA = [
  // --- GREEN MEADOWS (ทุ่งหญ้าเริ่มต้น) ---
  { id: 'm_slime_1', map: 'meadows', templateId: 'slime', name: 'Poring Slime', level: 1, maxHp: 40, x: 620, y: 880 },
  { id: 'm_slime_2', map: 'meadows', templateId: 'slime', name: 'Poring Slime', level: 1, maxHp: 40, x: 740, y: 950 },
  { id: 'm_slime_3', map: 'meadows', templateId: 'slime', name: 'Poring Slime', level: 2, maxHp: 45, x: 550, y: 1050 },
  { id: 'm_slime_4', map: 'meadows', templateId: 'slime', name: 'Poring Slime', level: 3, maxHp: 55, x: 850, y: 820 },
  { id: 'm_rabbit_1', map: 'meadows', templateId: 'horned_rabbit', name: 'Horned Rabbit', level: 8, maxHp: 120, x: 980, y: 680 },
  { id: 'm_rabbit_2', map: 'meadows', templateId: 'horned_rabbit', name: 'Horned Rabbit', level: 10, maxHp: 140, x: 1120, y: 780 },
  { id: 'm_rabbit_3', map: 'meadows', templateId: 'horned_rabbit', name: 'Horned Rabbit', level: 12, maxHp: 160, x: 1250, y: 920 },
  { id: 'm_sprout_1', map: 'meadows', templateId: 'sprout', name: 'Sprout Mandragora', level: 5, maxHp: 80, x: 1420, y: 620 },
  { id: 'm_sprout_2', map: 'meadows', templateId: 'sprout', name: 'Sprout Mandragora', level: 6, maxHp: 95, x: 1520, y: 550 },

  // --- MISTY FOREST (ป่าหมอกลึกลับ) ---
  { id: 'm_boar_1', map: 'misty_forest', templateId: 'wild_boar', name: 'Wild Boar', level: 18, maxHp: 260, x: 700, y: 800 },
  { id: 'm_boar_2', map: 'misty_forest', templateId: 'wild_boar', name: 'Wild Boar', level: 20, maxHp: 300, x: 880, y: 950 },
  { id: 'm_wolf_1', map: 'misty_forest', templateId: 'forest_wolf', name: 'Shadow Wolf', level: 25, maxHp: 420, x: 1350, y: 720 },
  { id: 'm_wolf_2', map: 'misty_forest', templateId: 'forest_wolf', name: 'Shadow Wolf', level: 28, maxHp: 480, x: 1550, y: 890 },
  { id: 'm_treant_1', map: 'misty_forest', templateId: 'treant', name: 'Elder Treant', level: 32, maxHp: 750, x: 2100, y: 1100 },

  // --- GOBLIN CAVERNS (ถ้ำก๊อบลินโบราณ) ---
  { id: 'm_scout_1', map: 'goblin_caverns', templateId: 'goblin_scout', name: 'Goblin Scout', level: 38, maxHp: 950, x: 920, y: 820 },
  { id: 'm_scout_2', map: 'goblin_caverns', templateId: 'goblin_scout', name: 'Goblin Scout', level: 40, maxHp: 1050, x: 1150, y: 960 },
  { id: 'm_shaman_1', map: 'goblin_caverns', templateId: 'goblin_shaman', name: 'Goblin Shaman', level: 44, maxHp: 1300, x: 1650, y: 780 },
  { id: 'm_ogre_1', map: 'goblin_caverns', templateId: 'ogre', name: 'Ironhide Ogre', level: 50, maxHp: 2200, x: 2350, y: 900 },

  // --- LAVA VOLCANO (ภูเขาไฟลาวา) ---
  { id: 'm_bat_1', map: 'volcano', templateId: 'crystal_bat', name: 'Crystal Bat', level: 56, maxHp: 2500, x: 1100, y: 700 },
  { id: 'm_bat_2', map: 'volcano', templateId: 'crystal_bat', name: 'Crystal Bat', level: 58, maxHp: 2700, x: 1350, y: 850 },
  { id: 'm_golem_1', map: 'volcano', templateId: 'stone_golem', name: 'Rune Stone Golem', level: 65, maxHp: 4200, x: 1850, y: 950 },
  { id: 'm_titan_1', map: 'volcano', templateId: 'ancient_golem', name: 'Ancient Titan Golem (Boss)', level: 75, maxHp: 9500, x: 2400, y: 1100 },

  // --- DRAGON'S LAIR (WORLD BOSS RAID INSTANCE) ---
  { id: 'm_dragon_mvp', map: 'boss_lair', templateId: 'ancient_dragon', name: 'Ancient Red Dragon MVP (มังกรบรรพกาล)', level: 99, maxHp: 50000, x: 1600, y: 1100, isMvp: true }
];

// Active State on Server
const monsters = FIXED_MONSTERS_DATA.map(m => ({
  ...m,
  currentHp: m.maxHp,
  isDead: false,
  respawnTimer: 0,
  spawnX: m.x,
  spawnY: m.y
}));

// Connected Players: ws -> playerState
const players = new Map();

// Active Parties: partyId -> { id, name, leaderId, leaderName, members: [{ id, name, classId, level, hp, maxHp }] }
const parties = new Map();
let nextPartyId = 1;

// 3. WebSocket Server
const wss = new WebSocketServer({ server });
let nextPlayerId = 1;

function broadcast(data, excludeWs = null) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function sendToPlayer(targetPlayerId, data) {
  const msg = JSON.stringify(data);
  for (const [ws, p] of players.entries()) {
    if (p.id === targetPlayerId && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
      break;
    }
  }
}

function broadcastToParty(partyId, data) {
  const party = parties.get(partyId);
  if (!party) return;
  const msg = JSON.stringify(data);
  for (const [ws, p] of players.entries()) {
    if (party.members.some(m => m.id === p.id) && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  const playerId = `player_${nextPlayerId++}`;

  // Initialize player state
  const playerState = {
    id: playerId,
    name: `Adventurer #${Math.floor(100 + Math.random() * 900)}`,
    classId: 'swordsman',
    weaponType: 'sword',
    level: 1,
    rebirthCount: 0,
    currentMap: 'meadows',
    x: 750 + (Math.random() - 0.5) * 60,
    y: 1220 + (Math.random() - 0.5) * 60,
    facing: 1,
    isMoving: false,
    walkFrame: 0,
    hp: 200,
    maxHp: 200,
    partyId: null,
    isAttacking: false
  };

  players.set(ws, playerState);

  // Send Initial Welcome & World State
  ws.send(JSON.stringify({
    type: 'init',
    playerId: playerId,
    you: playerState,
    monsters: monsters,
    otherPlayers: Array.from(players.values()).filter(p => p.id !== playerId)
  }));

  // Notify other players
  broadcast({
    type: 'player_joined',
    player: playerState
  }, ws);

  broadcast({
    type: 'chat',
    text: `🌟 ผู้เล่น [${playerState.name}] ก้าวเข้าสู่โลก TRIPLE CROWN ONLINE!`,
    channel: 'system'
  });

  // Handle incoming messages
  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      const p = players.get(ws);
      if (!p) return;

      if (data.type === 'update_profile') {
        if (data.name) p.name = data.name;
        if (data.level) p.level = data.level;
        if (data.classId) p.classId = data.classId;
        if (data.weaponType) p.weaponType = data.weaponType;
        if (data.rebirthCount !== undefined) p.rebirthCount = data.rebirthCount;
        if (data.maxHp) p.maxHp = data.maxHp;
        if (data.hp !== undefined) p.hp = data.hp;
        if (data.currentMap) p.currentMap = data.currentMap;

        // If player is in party, update party member record
        if (p.partyId && parties.has(p.partyId)) {
          const party = parties.get(p.partyId);
          const mem = party.members.find(m => m.id === p.id);
          if (mem) {
            mem.name = p.name;
            mem.classId = p.classId;
            mem.level = p.level;
            mem.hp = p.hp;
            mem.maxHp = p.maxHp;
            broadcastToParty(p.partyId, { type: 'party_update', party });
          }
        }

        broadcast({ type: 'player_profile_updated', player: p }, ws);

      } else if (data.type === 'move') {
        p.x = data.x;
        p.y = data.y;
        p.facing = data.facing || 1;
        p.isMoving = !!data.isMoving;
        p.walkFrame = data.walkFrame || 0;
        if (data.currentMap) p.currentMap = data.currentMap;

      } else if (data.type === 'change_map') {
        p.currentMap = data.mapId;
        p.x = data.x || 1600;
        p.y = data.y || 1200;
        broadcast({
          type: 'player_changed_map',
          playerId: p.id,
          mapId: p.currentMap,
          x: p.x,
          y: p.y
        });

      } else if (data.type === 'attack_action') {
        p.isAttacking = true;
        // Rich attack payload broadcast for realistic visual animations
        broadcast({
          type: 'player_attack_effect',
          playerId: p.id,
          classId: p.classId,
          weaponType: data.weaponType || p.weaponType || 'sword',
          x: p.x,
          y: p.y,
          facing: p.facing,
          skillId: data.skillId || null,
          skillName: data.skillName || null,
          targetId: data.targetId || null,
          targetX: data.targetX || null,
          targetY: data.targetY || null
        }, ws);

      } else if (data.type === 'hit_monster') {
        const m = monsters.find(item => item.id === data.monsterId);
        if (m && !m.isDead) {
          m.currentHp = Math.max(0, m.currentHp - data.damage);

          if (m.currentHp <= 0) {
            m.isDead = true;
            // Boss takes 60 seconds to respawn, normal monsters 8 seconds
            m.respawnTimer = m.isMvp ? 60 : 8;

            const expReward = data.exp || (m.isMvp ? 50000 : 35);
            const goldReward = m.isMvp ? 5000 : 80;

            broadcast({
              type: 'monster_killed',
              monsterId: m.id,
              killerId: playerId,
              killerName: p.name,
              isMvp: !!m.isMvp,
              exp: expReward
            });

            // PARTY EXP & GOLD SHARING BONUS (+25% BONUS!)
            if (p.partyId && parties.has(p.partyId)) {
              const party = parties.get(p.partyId);
              const sharedExp = Math.floor(expReward * 1.25);
              const sharedGold = Math.floor(goldReward * 1.25);

              broadcastToParty(p.partyId, {
                type: 'party_reward_share',
                fromKillerName: p.name,
                monsterName: m.name,
                sharedExp,
                sharedGold
              });
            }

            if (m.isMvp) {
              broadcast({
                type: 'chat',
                text: `🏆 [MVP BLAZE] ผู้กล้า [${p.name}] ได้พิชิต Ancient Red Dragon MVP สำเร็จแล้ว!`,
                channel: 'system'
              });
            }
          } else {
            broadcast({
              type: 'monster_damaged',
              monsterId: m.id,
              damage: data.damage,
              currentHp: m.currentHp,
              isCrit: data.isCrit
            });
          }
        }

      } else if (data.type === 'party_create') {
        // Create new Party
        const partyId = `party_${nextPartyId++}`;
        const newParty = {
          id: partyId,
          name: data.partyName || `${p.name}'s Party`,
          leaderId: p.id,
          leaderName: p.name,
          members: [{
            id: p.id,
            name: p.name,
            classId: p.classId,
            level: p.level,
            hp: p.hp,
            maxHp: p.maxHp
          }]
        };
        parties.set(partyId, newParty);
        p.partyId = partyId;

        ws.send(JSON.stringify({ type: 'party_update', party: newParty }));
        ws.send(JSON.stringify({
          type: 'chat',
          text: `🚩 ปาร์ตี้ [${newParty.name}] ถูกสร้างแล้ว! เชิญเพื่อนร่วมทีมเพื่อรับโบนัส EXP +25%`,
          channel: 'system'
        }));

      } else if (data.type === 'party_invite') {
        // Send invite to target player
        const targetWs = Array.from(players.entries()).find(([w, pl]) => pl.id === data.targetPlayerId);
        if (targetWs && p.partyId && parties.has(p.partyId)) {
          const party = parties.get(p.partyId);
          targetWs[0].send(JSON.stringify({
            type: 'party_invitation',
            partyId: party.id,
            partyName: party.name,
            leaderName: p.name
          }));
        }

      } else if (data.type === 'party_accept') {
        const party = parties.get(data.partyId);
        if (party && party.members.length < 6) {
          p.partyId = party.id;
          party.members.push({
            id: p.id,
            name: p.name,
            classId: p.classId,
            level: p.level,
            hp: p.hp,
            maxHp: p.maxHp
          });
          broadcastToParty(party.id, { type: 'party_update', party });
          broadcastToParty(party.id, {
            type: 'chat',
            text: `🤝 [${p.name}] ได้เข้าร่วมปาร์ตี้ [${party.name}] เรียบร้อยแล้ว!`,
            channel: 'system'
          });
        }

      } else if (data.type === 'party_leave') {
        if (p.partyId && parties.has(p.partyId)) {
          const party = parties.get(p.partyId);
          party.members = party.members.filter(m => m.id !== p.id);
          p.partyId = null;
          ws.send(JSON.stringify({ type: 'party_update', party: null }));

          if (party.members.length === 0 || party.leaderId === p.id) {
            // Disband party if leader left or empty
            parties.delete(party.id);
            party.members.forEach(m => {
              sendToPlayer(m.id, { type: 'party_update', party: null });
              sendToPlayer(m.id, { type: 'chat', text: `🚩 หัวหน้าปาร์ตี้ออกจากกลุ่ม ปาร์ตี้ถูกยุบแล้ว`, channel: 'system' });
            });
          } else {
            broadcastToParty(party.id, { type: 'party_update', party });
            broadcastToParty(party.id, {
              type: 'chat',
              text: `👋 [${p.name}] ได้ออกจากปาร์ตี้แล้ว`,
              channel: 'system'
            });
          }
        }

      } else if (data.type === 'chat') {
        if (data.text) {
          broadcast({
            type: 'chat',
            text: `[${p.name}]: ${data.text}`,
            channel: 'chat'
          });
        }
      }
    } catch (e) {
      console.warn('WS message error:', e);
    }
  });

  // Client disconnect
  ws.on('close', () => {
    const p = players.get(ws);
    if (p) {
      // Clean up party membership
      if (p.partyId && parties.has(p.partyId)) {
        const party = parties.get(p.partyId);
        party.members = party.members.filter(m => m.id !== p.id);
        if (party.members.length === 0) {
          parties.delete(p.partyId);
        } else {
          broadcastToParty(p.partyId, { type: 'party_update', party });
        }
      }

      players.delete(ws);
      broadcast({ type: 'player_left', playerId: p.id });
      broadcast({
        type: 'chat',
        text: `👋 ผู้เล่น [${p.name}] ออกจากเซิร์ฟเวอร์`,
        channel: 'system'
      });
    }
  });
});

// 4. Server Game Loop (20 FPS / 50ms)
// Handles Monster Respawn, Boss Telegraphed AoE Danger Attacks & Position Sync
let lastTick = performance.now();
let bossAoeTimer = 0;

setInterval(() => {
  const now = performance.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  // Handle Monster Respawns
  monsters.forEach(m => {
    if (m.isDead) {
      m.respawnTimer -= dt;
      if (m.respawnTimer <= 0) {
        m.isDead = false;
        m.currentHp = m.maxHp;
        m.x = m.spawnX;
        m.y = m.spawnY;
        broadcast({
          type: 'monster_respawned',
          monster: m
        });
        if (m.isMvp) {
          broadcast({
            type: 'chat',
            text: `🔥 [MVP ALERT] Ancient Red Dragon MVP ได้คืนชีพขึ้นมาใน Dragon's Lair แล้ว!`,
            channel: 'system'
          });
        }
      }
    }
  });

  // Handle World Boss Telegraphed AoE Danger Zones
  const dragon = monsters.find(m => m.id === 'm_dragon_mvp');
  if (dragon && !dragon.isDead) {
    bossAoeTimer += dt;
    // Broadcast a new Telegraphed AoE Danger Attack every 8 seconds
    if (bossAoeTimer >= 8.0) {
      bossAoeTimer = 0;
      // Check if any player is currently in boss_lair
      const playersInBossLair = Array.from(players.values()).filter(p => p.currentMap === 'boss_lair');
      if (playersInBossLair.length > 0) {
        // Pick target location (near a player or dragon arena center)
        const targetPlayer = playersInBossLair[Math.floor(Math.random() * playersInBossLair.length)];
        const aoeX = targetPlayer ? targetPlayer.x + (Math.random() - 0.5) * 50 : 1600;
        const aoeY = targetPlayer ? targetPlayer.y + (Math.random() - 0.5) * 50 : 1100;

        broadcast({
          type: 'boss_aoe_telegraph',
          bossId: 'm_dragon_mvp',
          skillName: '🔥 DRAGON BREATH & METEOR',
          x: Math.round(aoeX),
          y: Math.round(aoeY),
          radius: 170,
          duration: 2.2, // 2.2s warning time to dodge with WASD!
          damage: 180
        });
      }
    }
  }

  // Broadcast player positions to all clients
  if (players.size > 0) {
    const playerArray = Array.from(players.values());
    broadcast({
      type: 'world_sync',
      players: playerArray
    });
  }
}, 50);

// Start Server
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`⚔️ TRIPLE CROWN MMORPG Server Running!`);
  console.log(`🌐 HTTP & WebSocket: http://localhost:${PORT}`);
  console.log(`🐉 Boss Raid Instance & Party System Active`);
  console.log(`👥 Persistent Monster State & Multi-Zone Ready`);
  console.log(`===============================================`);
});

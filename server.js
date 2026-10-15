// Authoritative Multiplayer Game Server (HTTP + WebSocket)
// Supports Multi-Zone Routing, Boss MVP Telegraphed AoE, Full Party System & High-Fidelity Sync
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { MONSTERS, ZONES } from './src/data.js';

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

// ---------------------------------------------------------------------------
// Validation helpers & limits (the client is never trusted for combat numbers)
// ---------------------------------------------------------------------------
const WORLD_W = 3200;
const WORLD_H = 2400;
const ZONE_IDS = new Set(ZONES.map(z => z.id));
const MAX_PARTY_SIZE = 6;
const PARTY_EXP_BONUS = 1.25;
const MAX_HIT_RANGE = 700;      // px between player and monster for a hit to count
const HITS_PER_SECOND = 14;     // sustained hit-message budget per player
const HIT_BURST = 24;
const CHAT_PER_SECOND = 1;
const CHAT_BURST = 5;

function num(v, fallback = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function clampInt(v, min, max, fallback = min) {
  return Math.min(max, Math.max(min, Math.floor(num(v, fallback))));
}
function cleanText(v, maxLen, fallback = '') {
  if (typeof v !== 'string') return fallback;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLen);
  return t || fallback;
}
// Generous per-hit ceiling derived from the (client-reported) level. It is not
// real authority yet (stats still live on the client) but it stops absurd values.
function maxDamageForLevel(level) {
  return 500 + level * 60;
}
function takeToken(bucket, now, perSecond, burst) {
  bucket.tokens = Math.min(burst, bucket.tokens + (now - bucket.last) * perSecond);
  bucket.last = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}
function monsterGold(template, isMvp) {
  return isMvp ? 5000 : 5 + (template.level || 1) * 2;
}

// Connected Players: ws -> playerState
const players = new Map();

// Parties
// party: { id, name, leaderId, leaderName, members: [{id,name,classId,level,hp,maxHp,map}],
//          settings: { expShare: 'share'|'killer', autoAccept, minLevel, maxLevel } }
const parties = new Map();
let nextPartyId = 1;
const invites = new Map();       // targetPlayerId -> Set<partyId>
const joinRequests = new Map();  // partyId -> Set<requesterPlayerId>

// 3. WebSocket Server
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });
let nextPlayerId = 1;

function safeSend(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcast(data, excludeWs = null) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function findWs(playerId) {
  for (const [ws, p] of players.entries()) {
    if (p.id === playerId) return ws;
  }
  return null;
}

function sendToPlayer(targetPlayerId, data) {
  const ws = findWs(targetPlayerId);
  if (ws) safeSend(ws, data);
}

function sendToMap(mapId, data) {
  const msg = JSON.stringify(data);
  for (const [ws, p] of players.entries()) {
    if (p.currentMap === mapId && ws.readyState === WebSocket.OPEN) ws.send(msg);
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

function partyNotice(partyId, text) {
  broadcastToParty(partyId, { type: 'chat', text, channel: 'system' });
}

function pushParty(party) {
  broadcastToParty(party.id, { type: 'party_update', party });
}

function syncMember(p) {
  if (!p.partyId) return;
  const party = parties.get(p.partyId);
  const mem = party && party.members.find(m => m.id === p.id);
  if (!mem) return;
  mem.name = p.name;
  mem.classId = p.classId;
  mem.level = p.level;
  mem.hp = p.hp;
  mem.maxHp = p.maxHp;
  mem.map = p.currentMap;
  if (party.leaderId === p.id) party.leaderName = p.name;
  pushParty(party);
}

function levelAllowed(party, level) {
  return level >= party.settings.minLevel && level <= party.settings.maxLevel;
}

function addToParty(party, p) {
  p.partyId = party.id;
  party.members.push({
    id: p.id, name: p.name, classId: p.classId, level: p.level,
    hp: p.hp, maxHp: p.maxHp, map: p.currentMap
  });
  invites.get(p.id)?.delete(party.id);
  joinRequests.get(party.id)?.delete(p.id);
  pushParty(party);
  partyNotice(party.id, `🤝 [${p.name}] ได้เข้าร่วมปาร์ตี้ [${party.name}] (${party.members.length}/${MAX_PARTY_SIZE})`);
}

// Remove a player from their party; leadership passes to the next member.
function removeFromParty(p, reason = 'leave') {
  if (!p.partyId) return;
  const party = parties.get(p.partyId);
  p.partyId = null;
  sendToPlayer(p.id, { type: 'party_update', party: null });
  if (!party) return;

  party.members = party.members.filter(m => m.id !== p.id);
  if (party.members.length === 0) {
    parties.delete(party.id);
    joinRequests.delete(party.id);
    return;
  }
  const verb = reason === 'kick' ? 'ถูกเตะออกจากปาร์ตี้' : 'ได้ออกจากปาร์ตี้';
  partyNotice(party.id, `👋 [${p.name}] ${verb}`);
  if (party.leaderId === p.id) {
    const next = party.members[0];
    party.leaderId = next.id;
    party.leaderName = next.name;
    partyNotice(party.id, `👑 [${next.name}] ได้เป็นหัวหน้าปาร์ตี้คนใหม่`);
  }
  pushParty(party);
}

function partySummary(party) {
  const leader = party.members.find(m => m.id === party.leaderId) || party.members[0];
  return {
    id: party.id,
    name: party.name,
    leaderName: party.leaderName,
    leaderLevel: leader ? leader.level : 1,
    leaderMap: leader ? leader.map : null,
    count: party.members.length,
    max: MAX_PARTY_SIZE,
    settings: party.settings
  };
}

function applySettings(party, raw = {}) {
  const s = party.settings;
  if (raw.expShare === 'share' || raw.expShare === 'killer') s.expShare = raw.expShare;
  if (typeof raw.autoAccept === 'boolean') s.autoAccept = raw.autoAccept;
  if (raw.minLevel !== undefined) s.minLevel = clampInt(raw.minLevel, 1, 999, 1);
  if (raw.maxLevel !== undefined) s.maxLevel = clampInt(raw.maxLevel, 1, 999, 999);
  if (s.minLevel > s.maxLevel) s.minLevel = s.maxLevel;
}

// Server-side reward calculation and delivery
function rewardKill(killer, m) {
  const template = MONSTERS[m.templateId] || {};
  const exp = template.exp || 35;
  const jobExp = template.jobExp || 20;
  const gold = monsterGold(template, !!m.isMvp);

  const party = killer.partyId ? parties.get(killer.partyId) : null;
  let recipients = [killer];
  let shared = false;
  if (party && party.settings.expShare === 'share') {
    const nearby = [];
    for (const [, pl] of players.entries()) {
      if (pl.partyId === party.id && pl.currentMap === m.map) nearby.push(pl);
    }
    if (nearby.length > 1) {
      recipients = nearby;
      shared = true;
    }
  }

  const n = recipients.length;
  const mult = shared ? PARTY_EXP_BONUS / n : 1;
  for (const r of recipients) {
    sendToPlayer(r.id, {
      type: 'reward',
      monsterId: m.id,
      monsterName: m.name,
      exp: Math.max(1, Math.floor(exp * mult)),
      jobExp: Math.max(1, Math.floor(jobExp * mult)),
      gold: Math.floor(gold * mult),
      shared,
      shareCount: n,
      fromName: killer.name
    });
  }
}

wss.on('connection', (ws) => {
  const playerId = `player_${nextPlayerId++}`;

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
  const limits = {
    hits: { tokens: HIT_BURST, last: performance.now() / 1000 },
    chat: { tokens: CHAT_BURST, last: performance.now() / 1000 }
  };

  players.set(ws, playerState);

  safeSend(ws, {
    type: 'init',
    playerId: playerId,
    you: playerState,
    monsters: monsters,
    otherPlayers: Array.from(players.values()).filter(p => p.id !== playerId)
  });

  broadcast({ type: 'player_joined', player: playerState }, ws);
  broadcast({
    type: 'chat',
    text: `🌟 ผู้เล่น [${playerState.name}] ก้าวเข้าสู่โลก TRIPLE CROWN ONLINE!`,
    channel: 'system'
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      const p = players.get(ws);
      if (!p || !data || typeof data !== 'object') return;
      const now = performance.now() / 1000;

      switch (data.type) {
        case 'update_profile': {
          if (data.name !== undefined) p.name = cleanText(data.name, 16, p.name);
          if (data.level !== undefined) p.level = clampInt(data.level, 1, 999, p.level);
          if (typeof data.classId === 'string') p.classId = cleanText(data.classId, 32, p.classId);
          if (data.weaponType === 'sword' || data.weaponType === 'bow') p.weaponType = data.weaponType;
          if (data.rebirthCount !== undefined) p.rebirthCount = clampInt(data.rebirthCount, 0, 10, 0);
          if (data.maxHp !== undefined) p.maxHp = clampInt(data.maxHp, 1, 500000, p.maxHp);
          if (data.hp !== undefined) p.hp = clampInt(data.hp, 0, p.maxHp, p.hp);
          p.hp = Math.min(p.hp, p.maxHp);
          if (ZONE_IDS.has(data.currentMap)) p.currentMap = data.currentMap;
          syncMember(p);
          broadcast({ type: 'player_profile_updated', player: p }, ws);
          break;
        }

        case 'move': {
          p.x = Math.min(WORLD_W, Math.max(0, num(data.x, p.x)));
          p.y = Math.min(WORLD_H, Math.max(0, num(data.y, p.y)));
          p.facing = data.facing === -1 ? -1 : 1;
          p.isMoving = !!data.isMoving;
          p.walkFrame = clampInt(data.walkFrame, 0, 1000, 0);
          if (ZONE_IDS.has(data.currentMap) && data.currentMap !== p.currentMap) {
            p.currentMap = data.currentMap;
            syncMember(p);
          }
          break;
        }

        case 'change_map': {
          if (!ZONE_IDS.has(data.mapId)) break;
          p.currentMap = data.mapId;
          p.x = Math.min(WORLD_W, Math.max(0, num(data.x, 1600)));
          p.y = Math.min(WORLD_H, Math.max(0, num(data.y, 1200)));
          broadcast({ type: 'player_changed_map', playerId: p.id, mapId: p.currentMap, x: p.x, y: p.y });
          syncMember(p);
          break;
        }

        case 'attack_action': {
          p.isAttacking = true;
          broadcast({
            type: 'player_attack_effect',
            playerId: p.id,
            classId: p.classId,
            weaponType: data.weaponType === 'bow' ? 'bow' : (data.weaponType === 'sword' ? 'sword' : p.weaponType),
            x: p.x,
            y: p.y,
            facing: p.facing,
            skillId: cleanText(data.skillId, 40) || null,
            skillName: cleanText(data.skillName, 60) || null,
            targetId: cleanText(data.targetId, 40) || null,
            targetX: data.targetX === null || data.targetX === undefined ? null : num(data.targetX, 0),
            targetY: data.targetY === null || data.targetY === undefined ? null : num(data.targetY, 0)
          }, ws);
          break;
        }

        case 'hit_monster': {
          if (!takeToken(limits.hits, now, HITS_PER_SECOND, HIT_BURST)) break;
          const m = monsters.find(item => item.id === data.monsterId);
          if (!m || m.isDead || m.map !== p.currentMap) break;
          if (Math.hypot(m.x - p.x, m.y - p.y) > MAX_HIT_RANGE) break;
          const damage = clampInt(data.damage, 1, maxDamageForLevel(p.level), 1);
          const isCrit = data.isCrit === true;

          m.currentHp = Math.max(0, m.currentHp - damage);
          if (m.currentHp <= 0) {
            m.isDead = true;
            m.respawnTimer = m.isMvp ? 60 : 8;
            broadcast({
              type: 'monster_killed',
              monsterId: m.id,
              killerId: playerId,
              killerName: p.name,
              isMvp: !!m.isMvp
            });
            rewardKill(p, m);
            if (m.isMvp) {
              broadcast({
                type: 'chat',
                text: `🏆 [MVP BLAZE] ผู้กล้า [${p.name}] ได้พิชิต Ancient Red Dragon MVP สำเร็จแล้ว!`,
                channel: 'system'
              });
            }
          } else {
            broadcast({ type: 'monster_damaged', monsterId: m.id, damage, currentHp: m.currentHp, isCrit });
          }
          break;
        }

        // ------------------------------ PARTY ------------------------------
        case 'party_create': {
          if (p.partyId) {
            safeSend(ws, { type: 'chat', text: '⚠️ คุณอยู่ในปาร์ตี้แล้ว ต้องออกก่อนจึงจะสร้างใหม่ได้', channel: 'system' });
            break;
          }
          const partyId = `party_${nextPartyId++}`;
          const party = {
            id: partyId,
            name: cleanText(data.partyName, 24, `${p.name}'s Party`),
            leaderId: p.id,
            leaderName: p.name,
            members: [],
            settings: { expShare: 'share', autoAccept: false, minLevel: 1, maxLevel: 999 }
          };
          applySettings(party, data.settings || {});
          parties.set(partyId, party);
          addToParty(party, p);
          safeSend(ws, {
            type: 'chat',
            text: `🚩 ปาร์ตี้ [${party.name}] ถูกสร้างแล้ว! เชิญเพื่อนหรือรอคนมาขอเข้าร่วม`,
            channel: 'system'
          });
          break;
        }

        case 'party_invite': {
          const party = p.partyId && parties.get(p.partyId);
          if (!party) break;
          if (party.leaderId !== p.id) {
            safeSend(ws, { type: 'chat', text: '⚠️ เฉพาะหัวหน้าปาร์ตี้เท่านั้นที่เชิญได้', channel: 'system' });
            break;
          }
          if (party.members.length >= MAX_PARTY_SIZE) break;
          const target = Array.from(players.values()).find(pl => pl.id === data.targetPlayerId);
          if (!target || target.partyId || target.id === p.id) break;
          if (!levelAllowed(party, target.level)) {
            safeSend(ws, {
              type: 'chat',
              text: `⚠️ [${target.name}] เลเวลไม่ตรงเงื่อนไขปาร์ตี้ (Lv.${party.settings.minLevel}-${party.settings.maxLevel})`,
              channel: 'system'
            });
            break;
          }
          if (!invites.has(target.id)) invites.set(target.id, new Set());
          invites.get(target.id).add(party.id);
          sendToPlayer(target.id, {
            type: 'party_invitation',
            partyId: party.id,
            partyName: party.name,
            leaderName: p.name
          });
          safeSend(ws, { type: 'chat', text: `💌 ส่งคำเชิญไปยัง [${target.name}] แล้ว`, channel: 'system' });
          break;
        }

        case 'party_accept': {
          const party = parties.get(data.partyId);
          if (!party || p.partyId) break;
          if (!invites.get(p.id)?.has(party.id)) break; // must have been invited
          if (party.members.length >= MAX_PARTY_SIZE) {
            safeSend(ws, { type: 'chat', text: '⚠️ ปาร์ตี้เต็มแล้ว', channel: 'system' });
            break;
          }
          if (!levelAllowed(party, p.level)) {
            safeSend(ws, { type: 'chat', text: '⚠️ เลเวลของคุณไม่ตรงเงื่อนไขปาร์ตี้นี้', channel: 'system' });
            break;
          }
          addToParty(party, p);
          break;
        }

        case 'party_decline': {
          invites.get(p.id)?.delete(data.partyId);
          break;
        }

        case 'party_leave': {
          removeFromParty(p, 'leave');
          break;
        }

        case 'party_kick': {
          const party = p.partyId && parties.get(p.partyId);
          if (!party || party.leaderId !== p.id) break;
          const target = Array.from(players.values()).find(pl => pl.id === data.targetPlayerId);
          if (!target || target.id === p.id || target.partyId !== party.id) break;
          removeFromParty(target, 'kick');
          break;
        }

        case 'party_transfer_leader': {
          const party = p.partyId && parties.get(p.partyId);
          if (!party || party.leaderId !== p.id) break;
          const mem = party.members.find(m => m.id === data.targetPlayerId);
          if (!mem || mem.id === p.id) break;
          party.leaderId = mem.id;
          party.leaderName = mem.name;
          pushParty(party);
          partyNotice(party.id, `👑 [${p.name}] มอบหัวหน้าปาร์ตี้ให้ [${mem.name}]`);
          break;
        }

        case 'party_rename': {
          const party = p.partyId && parties.get(p.partyId);
          if (!party || party.leaderId !== p.id) break;
          const name = cleanText(data.name, 24);
          if (!name) break;
          party.name = name;
          pushParty(party);
          partyNotice(party.id, `✏️ ปาร์ตี้เปลี่ยนชื่อเป็น [${name}]`);
          break;
        }

        case 'party_settings': {
          const party = p.partyId && parties.get(p.partyId);
          if (!party || party.leaderId !== p.id) break;
          applySettings(party, data.settings || {});
          pushParty(party);
          const s = party.settings;
          partyNotice(
            party.id,
            `⚙️ ตั้งค่าปาร์ตี้: ${s.expShare === 'share' ? 'หาร EXP (+25%)' : 'ใครฆ่าคนนั้นได้'} • ` +
            `รับอัตโนมัติ: ${s.autoAccept ? 'เปิด' : 'ปิด'} • เลเวล ${s.minLevel}-${s.maxLevel}`
          );
          break;
        }

        case 'party_list_request': {
          const minLv = data.minLevel === undefined ? 1 : clampInt(data.minLevel, 1, 999, 1);
          const maxLv = data.maxLevel === undefined ? 999 : clampInt(data.maxLevel, 1, 999, 999);
          const map = ZONE_IDS.has(data.map) ? data.map : null;
          const list = Array.from(parties.values())
            .map(partySummary)
            .filter(s => s.leaderLevel >= minLv && s.leaderLevel <= maxLv && (!map || s.leaderMap === map));
          safeSend(ws, { type: 'party_list', parties: list.slice(0, 50) });
          break;
        }

        case 'party_join_request': {
          const party = parties.get(data.partyId);
          if (!party || p.partyId) break;
          if (party.members.length >= MAX_PARTY_SIZE) {
            safeSend(ws, { type: 'chat', text: '⚠️ ปาร์ตี้เต็มแล้ว', channel: 'system' });
            break;
          }
          if (!levelAllowed(party, p.level)) {
            safeSend(ws, {
              type: 'chat',
              text: `⚠️ ปาร์ตี้นี้รับเลเวล ${party.settings.minLevel}-${party.settings.maxLevel} เท่านั้น`,
              channel: 'system'
            });
            break;
          }
          if (party.settings.autoAccept) {
            addToParty(party, p);
            break;
          }
          if (!joinRequests.has(party.id)) joinRequests.set(party.id, new Set());
          joinRequests.get(party.id).add(p.id);
          sendToPlayer(party.leaderId, {
            type: 'party_join_request',
            partyId: party.id,
            requesterId: p.id,
            requesterName: p.name,
            requesterLevel: p.level
          });
          safeSend(ws, { type: 'chat', text: `📨 ส่งคำขอเข้าร่วมปาร์ตี้ [${party.name}] แล้ว รอหัวหน้าตอบรับ`, channel: 'system' });
          break;
        }

        case 'party_join_response': {
          const party = p.partyId && parties.get(p.partyId);
          if (!party || party.leaderId !== p.id) break;
          const reqSet = joinRequests.get(party.id);
          if (!reqSet || !reqSet.has(data.requesterId)) break;
          reqSet.delete(data.requesterId);
          const requester = Array.from(players.values()).find(pl => pl.id === data.requesterId);
          if (!requester || requester.partyId) break;
          if (data.accept === true && party.members.length < MAX_PARTY_SIZE && levelAllowed(party, requester.level)) {
            addToParty(party, requester);
          } else {
            sendToPlayer(requester.id, { type: 'chat', text: `❌ หัวหน้าปาร์ตี้ [${party.name}] ปฏิเสธคำขอของคุณ`, channel: 'system' });
          }
          break;
        }

        case 'chat': {
          const text = cleanText(data.text, 200);
          if (!text || !takeToken(limits.chat, now, CHAT_PER_SECOND, CHAT_BURST)) break;
          broadcast({ type: 'chat', text: `[${p.name}]: ${text}`, channel: 'chat' });
          break;
        }
      }
    } catch (e) {
      console.warn('WS message error:', e);
    }
  });

  ws.on('close', () => {
    const p = players.get(ws);
    if (p) {
      removeFromParty(p, 'leave');
      invites.delete(p.id);
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
let lastTick = performance.now();
let bossAoeTimer = 0;
const pendingAoes = []; // server-resolved boss danger zones

setInterval(() => {
  const now = performance.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  monsters.forEach(m => {
    if (m.isDead) {
      m.respawnTimer -= dt;
      if (m.respawnTimer <= 0) {
        m.isDead = false;
        m.currentHp = m.maxHp;
        m.x = m.spawnX;
        m.y = m.spawnY;
        broadcast({ type: 'monster_respawned', monster: m });
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

  // Boss telegraphed AoE: server picks the target, the timer AND the hit result.
  const dragon = monsters.find(m => m.id === 'm_dragon_mvp');
  if (dragon && !dragon.isDead) {
    bossAoeTimer += dt;
    if (bossAoeTimer >= 8.0) {
      bossAoeTimer = 0;
      const inLair = Array.from(players.values()).filter(p => p.currentMap === 'boss_lair');
      if (inLair.length > 0) {
        const target = inLair[Math.floor(Math.random() * inLair.length)];
        const aoe = {
          bossId: 'm_dragon_mvp',
          skillName: '🔥 DRAGON BREATH & METEOR',
          x: Math.round(target.x + (Math.random() - 0.5) * 50),
          y: Math.round(target.y + (Math.random() - 0.5) * 50),
          radius: 170,
          duration: 2.2,
          damage: 180
        };
        pendingAoes.push({ ...aoe, timeLeft: aoe.duration });
        sendToMap('boss_lair', { type: 'boss_aoe_telegraph', ...aoe });
      }
    }
  }

  for (let i = pendingAoes.length - 1; i >= 0; i--) {
    const aoe = pendingAoes[i];
    aoe.timeLeft -= dt;
    if (aoe.timeLeft > 0) continue;
    pendingAoes.splice(i, 1);
    for (const [ws, p] of players.entries()) {
      if (p.currentMap !== 'boss_lair') continue;
      const hit = Math.hypot(p.x - aoe.x, p.y - aoe.y) <= aoe.radius;
      safeSend(ws, {
        type: 'boss_aoe_result',
        x: aoe.x, y: aoe.y, radius: aoe.radius,
        hit,
        damage: hit ? aoe.damage : 0
      });
    }
  }

  if (players.size > 0) {
    broadcast({ type: 'world_sync', players: Array.from(players.values()) });
  }
}, 50);

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`⚔️ TRIPLE CROWN MMORPG Server Running!`);
  console.log(`🌐 HTTP & WebSocket: http://localhost:${PORT}`);
  console.log(`🐉 Boss Raid Instance & Party System Active`);
  console.log(`👥 Persistent Monster State & Multi-Zone Ready`);
  console.log(`===============================================`);
});

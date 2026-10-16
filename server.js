// Authoritative Multiplayer Game Server (HTTP + WebSocket)
// Supports Multi-Zone Routing, Full Party System & High-Fidelity Sync
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { MONSTERS, RELICS, ZONES, WEAPON_TYPES, MONSTER_AI, MONSTER_AI_DEFAULT, ITEMS, QUESTS, SKILLS, SOUNDS } from './src/data.js';
import { getMapDef, MAP_DEFS, OBJECT_TYPES, MAX_OBJECTS_PER_MAP } from './src/maps.js';
import { monsterSprite, itemSprite } from './src/sprites.js';
import { SOUND_META } from './src/sounds.js';
import { SCHEMA, sanitizeOverrides, snapshotEditable, applyOverrides, restoreDefaults, validateSpawns } from './src/overrides.js';

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
  if (reqPath.startsWith('/api/')) { handleApi(req, res, reqPath); return; }
  if (reqPath === '/') reqPath = '/index.html';
  if (reqPath === '/studio' || reqPath === '/studio/') reqPath = '/studio/index.html';

  let decoded;
  try { decoded = decodeURIComponent(reqPath); } catch { decoded = null; }
  const filePath = decoded === null ? null : path.join(__dirname, path.normalize(decoded));
  const rel = filePath === null ? null : path.relative(__dirname, filePath).split(path.sep);
  const allowed = rel !== null && !decoded.includes('\0') && (
    (rel.length === 1 && ['index.html', 'style.css'].includes(rel[0])) ||
    (rel.length > 1 && ['src', 'assets', 'studio'].includes(rel[0]) && !rel.includes('..'))
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

// 2. Game data (defaults + Studio overrides) and the monsters built from the spawn table
const DATA_DIR = path.join(__dirname, 'data');
const OVERRIDES_FILE = path.join(DATA_DIR, 'overrides.json');
const SPAWNS_FILE = path.join(DATA_DIR, 'spawns.json');
const gameData = { ZONES, MAP_DEFS, MONSTERS, MONSTER_AI, MONSTER_AI_DEFAULT, ITEMS, QUESTS, SKILLS, SOUNDS, RELICS };
const DEFAULTS = snapshotEditable(gameData); // untouched values, to restore before re-applying overrides
const KNOWN = {
  zones: new Set(ZONES.map(z => z.id)),
  maps: new Set(Object.keys(MAP_DEFS)),
  monsters: new Set(Object.keys(MONSTERS)),
  ai: new Set(Object.keys(MONSTERS)),
  items: new Set(Object.keys(ITEMS)),
  quests: new Set(QUESTS.map(q => q.id)),
  relics: new Set(Object.keys(RELICS)),
  ui: new Set(['main'])
};

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}
refreshFloorImages();
let overrides = sanitizeOverrides(readJson(OVERRIDES_FILE, {}), KNOWN);
let spawns = validateSpawns(readJson(SPAWNS_FILE, []), KNOWN.maps, KNOWN.monsters);
applyOverrides(gameData, overrides);

// Scatter the monsters over the whole map (deterministic per map, so positions are stable between
// restarts): random spots with a minimum spacing, nothing within 500px of the spawn point, and the
// weakest monsters get the spots closest to the centre. Maps are square.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layoutMonsters(list) {
  const byMap = new Map();
  for (const m of list) {
    if (!byMap.has(m.map)) byMap.set(m.map, []);
    byMap.get(m.map).push(m);
  }
  for (const [mapId, group] of byMap) {
    const def = getMapDef(mapId);
    const cx = def.spawn.x;
    const cy = def.spawn.y;
    const margin = 160;
    const regular = group.slice().sort((a, b) => a.level - b.level);

    const rand = mulberry32([...mapId].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7));
    const spots = [];
    let sep = 300;
    let tries = 0;
    while (spots.length < regular.length) {
      const x = margin + rand() * (def.width - 2 * margin);
      const y = margin + rand() * (def.height - 2 * margin);
      tries++;
      if (Math.hypot(x - cx, y - cy) < 500) continue;
      if (spots.some(p => Math.hypot(p.x - x, p.y - y) < sep)) {
        if (tries % 300 === 0) sep *= 0.85; // crowded map: relax the spacing
        continue;
      }
      spots.push({ x: Math.round(x), y: Math.round(y) });
    }
    spots.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    regular.forEach((m, i) => { m.x = spots[i].x; m.y = spots[i].y; });
  }
}

// Server-wide buffs, set by a GM with /buffserver (reset on restart)
const BUFF_KEYS = ['exp', 'gold', 'drop', 'monster'];
const BUFF_MAX = { exp: 100, gold: 100, drop: 100, monster: 5 };
const serverBuffs = { exp: 1, gold: 1, drop: 1, monster: 1 };

// Active monsters (rebuilt in place whenever the spawn table or monster data changes)
const monsters = [];
function buildMonsters() {
  monsters.length = 0;
  const counters = {};
  for (const sp of spawns) {
    const t = MONSTERS[sp.templateId];
    if (!t) continue;
    const spawnCount = Math.round(sp.count * serverBuffs.monster);
    for (let i = 0; i < spawnCount; i++) {
      const n = counters[sp.templateId] = (counters[sp.templateId] || 0) + 1;
      const id = `m_${sp.templateId}_${n}`;
      monsters.push({
        id, map: sp.map, templateId: sp.templateId, name: t.name, level: t.level, maxHp: t.hp,
        respawn: sp.respawn, x: 0, y: 0
      });
    }
  }
  layoutMonsters(monsters);
  for (const m of monsters) {
    Object.assign(m, {
      currentHp: m.maxHp,
      isDead: false,
      respawnTimer: 0,
      spawnX: m.x,
      spawnY: m.y,
      ai: { ...MONSTER_AI_DEFAULT, ...(MONSTER_AI[m.templateId] || {}) },
      targetId: null,      // player currently being chased (last attacker wins aggro)
      attackCd: Math.random() * 1.5,
      wander: null,        // {x, y} stroll destination
      wanderTimer: Math.random() * 3,
      moved: false
    });
  }
}
buildMonsters();

// ---------------------------------------------------------------------------
// Studio API (dev tool at /studio). Reads are open for the game client; everything else needs
// the studio token (STUDIO_TOKEN env, or a random one printed at startup).
// ---------------------------------------------------------------------------
const STUDIO_TOKEN = process.env.STUDIO_TOKEN || crypto.randomBytes(9).toString('base64url');
const STUDIO_TOKEN_FROM_ENV = !!process.env.STUDIO_TOKEN;
const STUDIO_ENABLED = process.env.NODE_ENV !== 'production' || STUDIO_TOKEN_FROM_ENV;

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function tokenOk(req) {
  const got = String(req.headers['x-studio-token'] || '');
  const a = Buffer.from(got);
  const b = Buffer.from(STUDIO_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // keep the previous version (last 20) so a bad edit can be rolled back
  if (fs.existsSync(file)) {
    const bdir = path.join(DATA_DIR, 'backups');
    fs.mkdirSync(bdir, { recursive: true });
    fs.copyFileSync(file, path.join(bdir, `${path.basename(file, '.json')}-${Date.now()}.json`));
    const old = fs.readdirSync(bdir).filter(f => f.startsWith(path.basename(file, '.json') + '-')).sort();
    old.slice(0, Math.max(0, old.length - 20)).forEach(f => fs.unlinkSync(path.join(bdir, f)));
  }
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

// Picture files in assets/floors/ and assets/ground/** (any subfolder) that a map can use as its tiled floor.
// Value = path relative to assets/ (re-scanned on every call)
function refreshFloorImages() {
  const found = [];
  const walk = (rel, depth) => {
    let ents = [];
    try { ents = fs.readdirSync(path.join(__dirname, 'assets', rel), { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const r = `${rel}/${e.name}`;
      if (e.isDirectory() && depth < 3) walk(r, depth + 1);
      else if (e.isFile() && /^[\w.-]+\.(png|jpe?g|webp|gif)$/i.test(e.name)) found.push(r);
    }
  };
  walk('floors', 0); walk('ground', 0);
  SCHEMA.maps.fields.floorImage.options = [
    { value: '', label: '(ไม่ใช้รูป — ใช้ texture ด้านบน)' },
    ...found.sort().map(f => ({ value: f, label: f }))
  ];
}

function studioPayload() {
  refreshFloorImages();
  return {
    schema: SCHEMA,
    soundMeta: SOUND_META,
    defaults: DEFAULTS,
    current: snapshotEditable(gameData),
    overrides,
    spawns,
    mapIds: Array.from(KNOWN.maps),
    monsters: Object.fromEntries(Object.entries(MONSTERS).map(([id, m]) => [id, {
      name: m.name, emoji: m.emoji, sprite: monsterSprite(id)
    }])),
    // every item a drop table can use
    itemsInfo: Object.fromEntries(Object.entries(ITEMS).map(([id, it]) => [id, {
      name: it.name, icon: it.icon, type: it.type, hat: it.hat, head: it.head, outfit: it.outfit, back: it.back, sprite: itemSprite(id)
    }])),
    zoneNames: Object.fromEntries(ZONES.map(z => [z.id, DEFAULTS.zones[z.id].name])),
    objectTypes: OBJECT_TYPES,
    maxObjects: MAX_OBJECTS_PER_MAP,
    spawnLimits: { count: [0, 60], respawn: [1, 3600] }
  };
}

async function handleApi(req, res, reqPath) {
  try {
    // Public: the game client applies these on load
    if (req.method === 'GET' && reqPath === '/api/overrides') {
      sendJson(res, 200, overrides);
      return;
    }
    if (!STUDIO_ENABLED || !reqPath.startsWith('/api/studio/')) {
      sendJson(res, 404, { error: 'not found' });
      return;
    }
    if (!tokenOk(req)) {
      await new Promise(r => setTimeout(r, 400)); // slow down guessing
      sendJson(res, 401, { error: 'invalid token' });
      return;
    }
    if (req.method === 'GET' && reqPath === '/api/studio/data') {
      sendJson(res, 200, studioPayload());
      return;
    }
    if (req.method === 'PUT' && reqPath === '/api/studio/save') {
      const body = JSON.parse(await readBody(req) || '{}');
      refreshFloorImages();
      const newOverrides = sanitizeOverrides(body.overrides, KNOWN);
      const newSpawns = validateSpawns(body.spawns, KNOWN.maps, KNOWN.monsters);
      writeJsonAtomic(OVERRIDES_FILE, newOverrides);
      writeJsonAtomic(SPAWNS_FILE, newSpawns);
      overrides = newOverrides;
      spawns = newSpawns;
      restoreDefaults(gameData, DEFAULTS);  // back to defaults...
      applyOverrides(gameData, overrides);  // ...then the new edits
      buildMonsters();
      broadcast({ type: 'monsters_reset', monsters });
      for (const [ws, pl] of players.entries()) {
        const md = getMapDef(pl.currentMap);
        pl.x = Math.min(pl.x, md.width - 64);
        pl.y = Math.min(pl.y, md.height - 64);
      }
      broadcast({ type: 'reload_data' });
      console.log('🛠️  Studio: game data saved & reloaded');
      sendJson(res, 200, studioPayload());
      return;
    }
    sendJson(res, 404, { error: 'not found' });
  } catch (e) {
    sendJson(res, 400, { error: e.message || 'bad request' });
  }
}

// ---------------------------------------------------------------------------
// Validation helpers & limits (the client is never trusted for combat numbers)
// ---------------------------------------------------------------------------
const ZONE_IDS = new Set(ZONES.map(z => z.id));
const WEAPON_TYPE_IDS = new Set(Object.keys(WEAPON_TYPES));
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
function monsterGold(template) {
  return 5 + (template.level || 1) * 2;
}

// ---------------------------------------------------------------------------
// Ground loot: item drops (everything except EXP / gold) lie on the ground for the whole map to see.
// The player who dealt the most damage owns them for LOOT_OWNER_LOCK seconds; after that anyone may pick up.
// ---------------------------------------------------------------------------
const LOOT_OWNER_LOCK = 180;    // seconds only the top damage dealer may pick the item up
const LOOT_LIFETIME = 900;      // seconds an item stays on the ground before it disappears
const LOOT_PICK_RANGE = 160;    // px between player and item for a pick-up
const LOOT_PET_RANGE = 1100;    // px between player and item when the player's pet fetches it
const LOOT_MAX_PER_MAP = 300;
const POTION_DROP_CHANCE = 0.05;                          // every monster, separate from its drop table
const POTION_DROP_IDS = ['hp_potion_s', 'sp_potion_s'];   // one roll, then a random kind
const groundLoot = new Map();   // id -> { id, map, x, y, fromX, fromY, itemId?, isPet?, monsterId?, isRelic?, ownerId, ownerName, unlockAt, expireAt }
let nextLootId = 1;

function lootView(l, now = Date.now()) {
  return {
    id: l.id, map: l.map, x: l.x, y: l.y, fromX: l.fromX, fromY: l.fromY,
    itemId: l.itemId, isPet: l.isPet, monsterId: l.monsterId, isRelic: l.isRelic,
    ownerId: l.ownerId, ownerName: l.ownerName,
    lockLeft: Math.max(0, (l.unlockAt - now) / 1000)
  };
}
function lootOnMap(mapId) {
  const now = Date.now();
  return Array.from(groundLoot.values()).filter(l => l.map === mapId).map(l => lootView(l, now));
}
function removeLoot(l) {
  groundLoot.delete(l.id);
  sendToMap(l.map, { type: 'loot_removed', id: l.id });
}
// Roll the monster's drops (server drop buff xN = N whole rolls + a fractional chance of one more)
// and lay them on the ground around it, owned by whoever hit it the most.
function spawnDrops(m, ownerId, ownerName) {
  const dm = serverBuffs.drop || 1;
  const rolls = Math.floor(dm) + (Math.random() < dm - Math.floor(dm) ? 1 : 0);
  const made = [];
  const add = (data) => {
    const ang = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 34;
    const md = getMapDef(m.map);
    const now = Date.now();
    const l = {
      id: `loot_${nextLootId++}`, map: m.map,
      x: Math.round(Math.min(md.width - 20, Math.max(20, m.x + Math.cos(ang) * dist))),
      y: Math.round(Math.min(md.height - 20, Math.max(20, m.y + Math.sin(ang) * dist * 0.6))),
      fromX: Math.round(m.x), fromY: Math.round(m.y),
      ownerId, ownerName, unlockAt: now + LOOT_OWNER_LOCK * 1000, expireAt: now + LOOT_LIFETIME * 1000,
      ...data
    };
    groundLoot.set(l.id, l);
    made.push(l);
  };
  const template = MONSTERS[m.templateId] || {};
  for (let ri = 0; ri < rolls; ri++) {
    // 1) normal drop table: ONE roll, chances are shares of 100% (the remainder = nothing drops)
    if (template.drops) {
      const r = Math.random();
      let acc = 0;
      for (const drop of template.drops) {
        acc += drop.chance;
        if (r < acc) { if (ITEMS[drop.itemId]) add({ itemId: drop.itemId }); break; }
      }
    }
    // 2) potion: its own roll for every monster (S size only, HP or SP; M / L are sold in the shop)
    if (Math.random() < POTION_DROP_CHANCE) {
      const pid = POTION_DROP_IDS[Math.floor(Math.random() * POTION_DROP_IDS.length)];
      if (ITEMS[pid]) add({ itemId: pid });
    }
    // 3) pet and 4) the monster's own relic: separate rolls
    if (Math.random() < (template.petChance || 0)) add({ isPet: true, monsterId: m.templateId });
    const relic = Object.values(RELICS).find(rl => rl.monsterId === m.templateId);
    if (relic && Math.random() < (template.relicChance || 0)) add({ itemId: relic.id, isRelic: true });
  }
  // cap the pile per map: the oldest items go first
  for (const mapId of new Set(made.map(l => l.map))) {
    const onMap = Array.from(groundLoot.values()).filter(l => l.map === mapId);
    for (let i = 0; i < onMap.length - LOOT_MAX_PER_MAP; i++) removeLoot(onMap[i]);
  }
  const alive = made.filter(l => groundLoot.has(l.id));
  if (alive.length) sendToMap(m.map, { type: 'loot_spawn', items: alive.map(l => lootView(l)) });
}

// Connected Players: ws -> playerState
const players = new Map();

// Parties
// party: { id, name, leaderId, leaderName, members: [{id,name,level,hp,maxHp,map}],
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
    id: p.id, name: p.name, level: p.level,
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
const GM_TOKEN = process.env.GM_TOKEN || crypto.randomBytes(9).toString('base64url');
const GM_TOKEN_FROM_ENV = !!process.env.GM_TOKEN;
const gmSockets = new WeakSet();

const fmtMul = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));
function buffSummary() {
  return `EXP x${fmtMul(serverBuffs.exp)} • Gold x${fmtMul(serverBuffs.gold)} • ดรอป x${fmtMul(serverBuffs.drop)} • มอนสเตอร์ x${fmtMul(serverBuffs.monster)}`;
}
function sysMsg(ws, text) { safeSend(ws, { type: 'chat', text, channel: 'system' }); }

// Slash commands typed in chat. Returns true when the text was a command.
function handleCommand(ws, p, text) {
  const [cmdRaw, ...args] = text.slice(1).split(/\s+/);
  const cmd = (cmdRaw || '').toLowerCase();
  if (cmd === 'help') {
    sysMsg(ws, '📖 คำสั่ง: /help • /reset (เริ่มใหม่ทั้งหมด) • /gm <รหัส> • (GM) /buffserver [exp|gold|drop|monster] <ตัวคูณ> • /buffserver reset • /give gold|exp|item|book|pet … • /giveweapons [ประเภท] • /level <n> • /points <n> • /heal • /warp <แมพ> • /announce <ข้อความ>');
    return true;
  }
  if (cmd === 'reset') {
    // Any player: wipe own item/level/stat progress and restart as a new character
    safeSend(ws, { type: 'reset_player' });
    return true;
  }
  if (cmd === 'gm') {
    if (gmSockets.has(ws)) sysMsg(ws, '🛡️ คุณเป็น GM อยู่แล้ว');
    else if (args[0] && args[0] === GM_TOKEN) {
      gmSockets.add(ws);
      safeSend(ws, { type: 'gm_status', isGm: true });
      sysMsg(ws, '🛡️ เข้าสู่โหมด GM แล้ว');
    } else sysMsg(ws, '⚠️ รหัส GM ไม่ถูกต้อง');
    return true;
  }
  if (cmd === 'buffserver') {
    if (!gmSockets.has(ws)) { sysMsg(ws, '⚠️ คำสั่งนี้ใช้ได้เฉพาะ GM'); return true; }
    if (args.length === 0) { sysMsg(ws, `✨ บัฟเซิร์ฟเวอร์: ${buffSummary()}`); return true; }
    const key = args[0].toLowerCase();
    if (key === 'reset') {
      const hadMonster = serverBuffs.monster !== 1;
      BUFF_KEYS.forEach(k => { serverBuffs[k] = 1; });
      afterBuffChange(p, hadMonster, 'รีเซ็ตบัฟทั้งหมด');
      return true;
    }
    if (!BUFF_KEYS.includes(key)) { sysMsg(ws, '⚠️ ใช้: /buffserver <exp|drop|monster> <ตัวคูณ> หรือ /buffserver reset'); return true; }
    // accepts "10", "*10", "x10", "* 10"
    const valStr = args.slice(1).join('').replace(/^[*xX×]/, '');
    const v = Number(valStr);
    if (!valStr || !Number.isFinite(v) || v < 1 || v > BUFF_MAX[key]) {
      sysMsg(ws, `⚠️ ตัวคูณของ ${key} ต้องอยู่ระหว่าง 1 – ${BUFF_MAX[key]}`);
      return true;
    }
    const mul = key === 'monster' ? Math.round(v) : Math.round(v * 100) / 100;
    const changedMonster = key === 'monster' && mul !== serverBuffs.monster;
    serverBuffs[key] = mul;
    afterBuffChange(p, changedMonster, `${key} x${fmtMul(mul)}`);
    return true;
  }
  // ---- other GM commands: the server checks the GM, then tells that client to apply it ----
  const GM_CMDS = ['give', 'giveweapons', 'level', 'points', 'heal', 'warp', 'announce'];
  if (GM_CMDS.includes(cmd)) {
    if (!gmSockets.has(ws)) { sysMsg(ws, '⚠️ คำสั่งนี้ใช้ได้เฉพาะ GM'); return true; }
    const n = (v, lo, hi) => { const x = Math.floor(Number(v)); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };
    const act = (msg) => safeSend(ws, { type: 'gm_action', ...msg });
    if (cmd === 'announce') {
      const t = cleanText(args.join(' '), 150);
      if (!t) { sysMsg(ws, '⚠️ ใช้: /announce <ข้อความ>'); return true; }
      broadcast({ type: 'chat', text: `📢 [ประกาศ] ${t}`, channel: 'system' });
    } else if (cmd === 'giveweapons') {
      // /giveweapons → every weapon; /giveweapons sword → one weapon type (or one weapon id)
      const q = (args[0] || '').toLowerCase();
      const all = Object.values(ITEMS).filter(it => it.type === 'weapon');
      const ids = (q && q !== 'all' ? all.filter(it => it.weaponType === q || it.id === q) : all).map(it => it.id);
      if (!ids.length) sysMsg(ws, `⚠️ ไม่มีอาวุธ "${q}" — ประเภทที่มี: ${[...new Set(all.map(it => it.weaponType))].join(', ')}`);
      else act({ action: 'giveweapons', ids });
    } else if (cmd === 'heal') act({ action: 'heal' });
    else if (cmd === 'level') {
      const v = n(args[0], 1, 999);
      if (v === null) sysMsg(ws, '⚠️ ใช้: /level <1-999>'); else act({ action: 'level', value: v });
    } else if (cmd === 'points') {
      const v = n(args[0], 1, 10000);
      if (v === null) sysMsg(ws, '⚠️ ใช้: /points <จำนวนแต้มสเตตัส>'); else act({ action: 'points', value: v });
    } else if (cmd === 'warp') {
      if (!args[0] || !MAP_DEFS[args[0]]) sysMsg(ws, `⚠️ ไม่มีแมพนี้ — แมพที่มี: ${Object.keys(MAP_DEFS).join(', ')}`);
      else act({ action: 'warp', map: args[0] });
    } else { // give
      const kind = (args[0] || '').toLowerCase();
      const usage = '⚠️ ใช้: /give gold <จำนวน> • /give exp <จำนวน> • /give item <ไอดี> [จำนวน] • /give book <สกิล> [จำนวน] • /give pet <มอนสเตอร์>';
      if (kind === 'gold' || kind === 'exp') {
        const v = n(args[1], 1, 1000000000);
        if (v === null) sysMsg(ws, usage); else act({ action: 'give', kind, value: v });
      } else if (kind === 'item' || kind === 'book' || kind === 'pet') {
        const id = args[1];
        const known = kind === 'item' ? ITEMS[id] : kind === 'book' ? SKILLS[id] : MONSTERS[id];
        if (!id || !known) { sysMsg(ws, `⚠️ ไม่รู้จัก ${kind} "${id || ''}"`); return true; }
        act({ action: 'give', kind, id, value: n(args[2] ?? 1, 1, 9999) ?? 1 });
      } else sysMsg(ws, usage);
    }
    return true;
  }
  sysMsg(ws, `⚠️ ไม่รู้จักคำสั่ง /${cmd} (พิมพ์ /help)`);
  return true;
}
function afterBuffChange(p, monsterChanged, what) {
  if (monsterChanged) {
    buildMonsters();
    broadcast({ type: 'monsters_reset', monsters });
  }
  broadcast({ type: 'server_buffs', buffs: serverBuffs });
  broadcast({ type: 'chat', text: `✨ GM [${p.name}] ตั้งบัฟเซิร์ฟเวอร์: ${what} → ${buffSummary()}`, channel: 'system' });
}

function rewardKill(killer, m) {
  const template = MONSTERS[m.templateId] || {};
  const exp = template.exp || 35;
  const gold = monsterGold(template);

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
      exp: Math.max(1, Math.floor(exp * mult * serverBuffs.exp)),
      gold: Math.floor(gold * mult * serverBuffs.gold),
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
    weaponType: 'stick',
    level: 1,
    currentMap: 'meadows',
    x: getMapDef('meadows').spawn.x + (Math.random() - 0.5) * 60,
    y: getMapDef('meadows').spawn.y + (Math.random() - 0.5) * 60,
    facing: 1,
    isMoving: false,
    walkFrame: 0,
    hp: 200,
    maxHp: 200,
    def: 0,
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
    buffs: serverBuffs,
    loot: lootOnMap(playerState.currentMap),
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
          if (WEAPON_TYPE_IDS.has(data.weaponType)) p.weaponType = data.weaponType;
          if (data.def !== undefined) p.def = clampInt(data.def, 0, 5000, p.def);
          if (data.maxHp !== undefined) p.maxHp = clampInt(data.maxHp, 1, 500000, p.maxHp);
          if (data.hp !== undefined) p.hp = clampInt(data.hp, 0, p.maxHp, p.hp);
          p.hp = Math.min(p.hp, p.maxHp);
          const ofType = (v, t) => (typeof v === 'string' && ITEMS[v]?.type === t ? v : null);
          if (data.hat !== undefined) p.hat = ofType(data.hat, 'hat');
          if (data.head !== undefined) p.head = ofType(data.head, 'head') || 'head_0';
          if (data.outfit !== undefined) p.outfit = ofType(data.outfit, 'outfit');
          if (data.shield !== undefined) p.shield = typeof data.shield === 'string' && ITEMS[data.shield]?.type === 'shield' ? data.shield : null;
          if (data.mount !== undefined) p.mount = typeof data.mount === 'string' && ITEMS[data.mount]?.type === 'mount' ? data.mount : null;
          if (data.riding !== undefined) p.riding = data.riding === true && !!p.mount;
          if (data.pet !== undefined) { p.pet = typeof data.pet === 'string' && MONSTERS[data.pet] ? data.pet : null; p.hasPet = !!p.pet; }
          if (ZONE_IDS.has(data.currentMap)) p.currentMap = data.currentMap;
          syncMember(p);
          broadcast({ type: 'player_profile_updated', player: p }, ws);
          break;
        }

        case 'pet_state': { // where the player's pet is right now (it runs off to fetch loot), so others can see it
          if (!p.pet) break;
          const md = getMapDef(p.currentMap);
          p.petX = Math.round(Math.min(md.width, Math.max(0, num(data.x, p.x))));
          p.petY = Math.round(Math.min(md.height, Math.max(0, num(data.y, p.y))));
          p.petCarry = typeof data.carry === 'string' ? cleanText(data.carry, 8) || null : null;
          break;
        }

        case 'move': {
          const md = getMapDef(p.currentMap);
          p.x = Math.min(md.width, Math.max(0, num(data.x, p.x)));
          p.y = Math.min(md.height, Math.max(0, num(data.y, p.y)));
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
          const md = getMapDef(p.currentMap);
          p.x = Math.min(md.width, Math.max(0, num(data.x, md.spawn.x)));
          p.y = Math.min(md.height, Math.max(0, num(data.y, md.spawn.y)));
          broadcast({ type: 'player_changed_map', playerId: p.id, mapId: p.currentMap, x: p.x, y: p.y });
          syncMember(p);
          // fresh monster positions for the map the player just entered
          safeSend(ws, {
            type: 'monsters_sync',
            list: monsters.filter(m => m.map === p.currentMap && !m.isDead).map(m => ({ id: m.id, x: Math.round(m.x), y: Math.round(m.y) }))
          });
          safeSend(ws, { type: 'loot_sync', items: lootOnMap(p.currentMap) });
          break;
        }

        case 'pickup_loot': {
          const l = groundLoot.get(cleanText(data.id, 40));
          if (!l || l.map !== p.currentMap) break;
          const viaPet = data.pet === true && p.hasPet === true;
          if (Math.hypot(l.x - p.x, l.y - p.y) > (viaPet ? LOOT_PET_RANGE : LOOT_PICK_RANGE)) break;
          const now = Date.now();
          const ownerHere = l.ownerId === p.id || !Array.from(players.values()).some(pl => pl.id === l.ownerId);
          if (!ownerHere && now < l.unlockAt) {
            safeSend(ws, { type: 'loot_denied', id: l.id, ownerName: l.ownerName, lockLeft: (l.unlockAt - now) / 1000 });
            break;
          }
          removeLoot(l);
          safeSend(ws, { type: 'loot_picked', id: l.id, itemId: l.itemId, isPet: l.isPet, monsterId: l.monsterId, isRelic: l.isRelic, viaPet });
          break;
        }

        case 'attack_action': {
          p.isAttacking = true;
          broadcast({
            type: 'player_attack_effect',
            playerId: p.id,
            weaponType: WEAPON_TYPE_IDS.has(data.weaponType) ? data.weaponType : p.weaponType,
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
          // A skill hit may exceed a normal hit by its power; slow/stun come from the server's own skill data
          const sk = typeof data.skillId === 'string' ? gameData.SKILLS[data.skillId] : null;
          const skillMul = sk && sk.effect === 'damage' ? 1 + (Number(sk.power) || 0) / 100 + (sk.scalesWith && sk.scalesWith !== 'none' ? 2 : 0) : 1;
          const damage = clampInt(data.damage, 1, Math.floor(maxDamageForLevel(p.level) * skillMul), 1);
          const isCrit = data.isCrit === true;
          if (sk) {
            if (sk.slowPct > 0) { m.slowUntil = Date.now() + 3000; m.slowPct = Math.min(80, sk.slowPct); }
            if (sk.stunSec > 0) m.stunUntil = Date.now() + Math.min(5, sk.stunSec) * 1000;
          }

          m.currentHp = Math.max(0, m.currentHp - damage);
          m.targetId = p.id; // whoever hit it last gets chased
          if (!m.dmgBy) m.dmgBy = {};
          m.dmgBy[p.id] = (m.dmgBy[p.id] || 0) + damage;
          if (m.currentHp <= 0) {
            m.isDead = true;
            m.targetId = null;
            m.respawnTimer = m.respawn;
            broadcast({
              type: 'monster_killed',
              monsterId: m.id,
              damage,
              isCrit,
              killerId: playerId,
              killerName: p.name
            });
            rewardKill(p, m);
            // drops belong to whoever dealt the most damage (still connected), else the killer
            let top = p, topDmg = -1;
            for (const [, pl] of players.entries()) {
              const dmg = m.dmgBy[pl.id] || 0;
              if (dmg > topDmg) { top = pl; topDmg = dmg; }
            }
            m.dmgBy = {};
            spawnDrops(m, top.id, top.name);
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
          if (text.startsWith('/')) { handleCommand(ws, p, text); break; }
          const line = `[${p.name}]: ${text}`;
          const ch = data.channel;
          if (ch === 'map') {
            sendToMap(p.currentMap, { type: 'chat', text: line, channel: 'map' });
          } else if (ch === 'party') {
            if (p.partyId && parties.has(p.partyId)) broadcastToParty(p.partyId, { type: 'chat', text: line, channel: 'party' });
            else safeSend(ws, { type: 'chat', text: '⚠️ คุณยังไม่ได้อยู่ในปาร์ตี้', channel: 'system' });
          } else if (ch === 'guild') {
            safeSend(ws, { type: 'chat', text: '⚠️ ระบบกิลด์ยังไม่เปิดใช้งาน', channel: 'system' });
          } else {
            broadcast({ type: 'chat', text: line, channel: 'world' });
          }
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
let monsterSyncTimer = 0;

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
        m.targetId = null;
        m.wander = null;
        m.dmgBy = {};
        broadcast({ type: 'monster_respawned', monster: m });
      }
    }
  });

  // ---- Ground loot that has lain around too long disappears ----
  const lootNow = Date.now();
  for (const l of Array.from(groundLoot.values())) if (lootNow >= l.expireAt) removeLoot(l);

  // ---- Monster AI (server-authoritative: everyone sees the same monsters) ----
  const alivePlayers = Array.from(players.values()).filter(pl => pl.hp > 0);
  for (const m of monsters) {
    if (m.isDead) continue;
    const ai = m.ai;
    m.attackCd -= dt;
    m.moved = false;
    const mapPlayers = alivePlayers.filter(pl => pl.currentMap === m.map);

    // Pick / keep a target. A monster that was hit keeps chasing its attacker until leash/dead.
    let target = m.targetId ? mapPlayers.find(pl => pl.id === m.targetId) : null;
    if (target && Math.hypot(m.x - m.spawnX, m.y - m.spawnY) > ai.leash) target = null;
    if (!target) {
      m.targetId = null;
      if (ai.aggro > 0) {
        let best = Infinity;
        for (const pl of mapPlayers) {
          const d = Math.hypot(pl.x - m.x, pl.y - m.y);
          if (d <= ai.aggro && d < best && Math.hypot(pl.x - m.spawnX, pl.y - m.spawnY) <= ai.leash * 1.5) {
            best = d;
            target = pl;
          }
        }
        if (target) m.targetId = target.id;
      }
    }

    const md = getMapDef(m.map);
    const nowMs = Date.now();
    const stunned = (m.stunUntil || 0) > nowMs;
    const slowMul = (m.slowUntil || 0) > nowMs ? 1 - (m.slowPct || 0) / 100 : 1;
    const step = (tx, ty, speed) => {
      if (stunned) return;
      speed *= slowMul;
      const dx = tx - m.x;
      const dy = ty - m.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1 || speed <= 0) return;
      const move = Math.min(dist, speed * dt);
      m.x = Math.min(md.width - 40, Math.max(40, m.x + (dx / dist) * move));
      m.y = Math.min(md.height - 40, Math.max(40, m.y + (dy / dist) * move));
      m.moved = true;
    };

    if (target) {
      const d = Math.hypot(target.x - m.x, target.y - m.y);
      if (d > ai.attackRange * 0.85) {
        step(target.x, target.y, ai.speed);
      }
      if (!stunned && d <= ai.attackRange && m.attackCd <= 0) {
        m.attackCd = ai.attackCooldown * (0.9 + Math.random() * 0.2);
        const template = MONSTERS[m.templateId] || {};
        const raw = (template.atk || 10) - (target.def || 0);
        const damage = Math.max(1, Math.floor(raw * (0.9 + Math.random() * 0.2)));
        target.hp = Math.max(0, target.hp - damage);
        sendToMap(m.map, { type: 'monster_attack', monsterId: m.id, targetId: target.id, damage });
      }
    } else if (ai.speed > 0) {
      // Idle: walk home if displaced, otherwise stroll around the spawn point
      if (Math.hypot(m.x - m.spawnX, m.y - m.spawnY) > ai.wanderRadius * 1.6) {
        step(m.spawnX, m.spawnY, ai.speed);
        m.wander = null;
      } else {
        m.wanderTimer -= dt;
        if (!m.wander && m.wanderTimer <= 0) {
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * ai.wanderRadius;
          m.wander = { x: m.spawnX + Math.cos(ang) * r, y: m.spawnY + Math.sin(ang) * r };
        }
        if (m.wander) {
          step(m.wander.x, m.wander.y, ai.speed * 0.5);
          if (Math.hypot(m.wander.x - m.x, m.wander.y - m.y) < 4) {
            m.wander = null;
            m.wanderTimer = 2 + Math.random() * 4;
          }
        }
      }
    }
  }

  // Send positions of monsters that moved, 10 times a second, only to players on that map
  monsterSyncTimer += dt;
  if (monsterSyncTimer >= 0.1) {
    monsterSyncTimer = 0;
    const byMap = new Map();
    for (const m of monsters) {
      if (!m.moved || m.isDead) continue;
      if (!byMap.has(m.map)) byMap.set(m.map, []);
      byMap.get(m.map).push({ id: m.id, x: Math.round(m.x), y: Math.round(m.y) });
    }
    for (const [mapId, list] of byMap) sendToMap(mapId, { type: 'monsters_sync', list });
  }

  if (players.size > 0) {
    broadcast({ type: 'world_sync', players: Array.from(players.values()) });
  }
}, 50);

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`⚔️ TRIPLE CROWN MMORPG Server Running!`);
  console.log(`🌐 HTTP & WebSocket: http://localhost:${PORT}`);
  console.log(`👥 Party System Active`);
  console.log(`🛡️  GM: พิมพ์ในเกม  /gm ${GM_TOKEN}${GM_TOKEN_FROM_ENV ? ' (from GM_TOKEN)' : ' (random, set GM_TOKEN to keep it)'}`);
  console.log(`👥 Persistent Monster State & Multi-Zone Ready`);
  if (STUDIO_ENABLED) console.log(`🛠️  Studio: http://localhost:${PORT}/studio   token: ${STUDIO_TOKEN}${STUDIO_TOKEN_FROM_ENV ? ' (from STUDIO_TOKEN)' : ' (random, set STUDIO_TOKEN to keep it)'}`);
  console.log(`===============================================`);
});

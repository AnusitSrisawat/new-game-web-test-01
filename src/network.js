// WebSocket Multiplayer Client Manager with Multi-Zone, Party & Rich Animation Sync
export class NetworkManager {
  constructor(gameEngine, player) {
    this.game = gameEngine;
    this.player = player;
    this.ws = null;
    this.myPlayerId = null;
    this.isConnected = false;
    this.otherPlayers = new Map(); // { [playerId]: playerState }
    this.currentParty = null;
    this.partyList = [];

    this.connect();
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.game.onLog('🌐 เชื่อมต่อเซิร์ฟเวอร์ MMORPG สำเร็จ (Online Sync)', 'system');
        
        // Send initial player profile, then keep level/HP/weapon in sync
        this.sendProfileUpdate();
        clearInterval(this.profileTimer);
        this.profileTimer = setInterval(() => this.sendProfileUpdate(), 1500);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        clearInterval(this.profileTimer);
        this.game.onLog('⚠️ ขาดการเชื่อมต่อกับเซิร์ฟเวอร์... กำลังพยายามต่อใหม่ใน 3 วินาที', 'system');
        setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    } catch (e) {
      console.warn('WS Init error:', e);
    }
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'init':
        this.myPlayerId = msg.playerId;
        // Sync Authoritative World Monsters from Server
        if (msg.monsters && msg.monsters.length > 0) {
          this.game.syncMonstersFromServer(msg.monsters);
        }
        if (msg.buffs) this.game.serverBuffs = msg.buffs;
        this.game.onLootSync(msg.loot || []);
        // Initialize other connected players
        if (msg.otherPlayers) {
          msg.otherPlayers.forEach(p => this.otherPlayers.set(p.id, p));
        }
        break;

      case 'gm_action':
        this.game.onGmAction(msg);
        break;

      case 'reset_player':
        this.game.onLog('🔄 รีเซ็ตตัวละครเป็นผู้เล่นใหม่...', 'system');
        this.game.player.resetProgress();
        break;

      case 'server_buffs':
        this.game.serverBuffs = msg.buffs;
        break;

      case 'monsters_reset':
        this.game.syncMonstersFromServer(msg.monsters || []);
        break;

      case 'player_joined':
        this.otherPlayers.set(msg.player.id, msg.player);
        this.game.onLog(`👋 [${msg.player.name}] ปรากฏตัวในโลก!`, 'system');
        break;

      case 'player_left':
        this.otherPlayers.delete(msg.playerId);
        break;

      case 'player_profile_updated':
        if (this.otherPlayers.has(msg.player.id)) {
          this.otherPlayers.set(msg.player.id, msg.player);
        }
        break;

      case 'player_changed_map':
        if (this.otherPlayers.has(msg.playerId)) {
          const op = this.otherPlayers.get(msg.playerId);
          op.currentMap = msg.mapId;
          op.x = op.tx = msg.x;
          op.y = op.ty = msg.y;
          op.renderMap = msg.mapId;
        }
        break;

      case 'world_sync':
        // Synchronize positions and walk animations of all other players
        msg.players.forEach(p => {
          if (p.id !== this.myPlayerId) {
            const existing = this.otherPlayers.get(p.id);
            if (!existing) {
              this.otherPlayers.set(p.id, { ...p, tx: p.x, ty: p.y });
              return;
            }
            // Keep the rendered x/y; the game loop eases them toward the server target (tx/ty)
            const { x, y, ...rest } = p;
            Object.assign(existing, rest);
            if (existing.currentMap !== existing.renderMap) {
              existing.x = x; existing.y = y; // map change: snap, don't glide across the world
              existing.renderMap = existing.currentMap;
            }
            existing.tx = x;
            existing.ty = y;
          }
        });
        break;

      case 'player_attack_effect':
        // Show rich attack animations (arrow, slash, skills) for another player
        this.game.handleRemotePlayerAttack(msg);
        break;

      case 'monster_damaged':
        this.game.onMonsterDamagedFromServer(msg.monsterId, msg.damage, msg.currentHp, msg.isCrit);
        break;

      case 'monster_killed':
        this.game.onMonsterKilledFromServer(msg.monsterId, msg.killerId, msg.killerName, msg.damage, msg.isCrit);
        break;

      case 'monster_respawned':
        this.game.onMonsterRespawnedFromServer(msg.monster);
        break;

      case 'party_update':
        this.currentParty = msg.party;
        if (this.game.uiController) {
          this.game.uiController.updatePartyHUD(this.currentParty);
        }
        break;

      case 'party_invitation':
        // Show party invite notification banner
        this.game.onLog(`💌 [${msg.leaderName}] ชวนคุณเข้าร่วมปาร์ตี้ [${msg.partyName}]`, 'system');
        if (this.game.uiController) {
          this.game.uiController.showPartyInviteModal(msg.partyId, msg.partyName, msg.leaderName);
        }
        break;

      case 'reload_data':
        this.game.onLog('🛠️ ข้อมูลเกมถูกอัปเดตจาก Studio — กำลังโหลดใหม่...', 'system');
        setTimeout(() => window.location.reload(), 1200);
        break;

      case 'monsters_sync':
        this.game.onMonstersSync(msg.list || []);
        break;

      case 'monster_attack':
        this.game.onMonsterAttackFromServer(msg);
        break;

      case 'loot_sync':
        this.game.onLootSync(msg.items || []);
        break;

      case 'loot_spawn':
        this.game.onLootSpawn(msg.items || []);
        break;

      case 'loot_removed':
        this.game.onLootRemoved(msg.id);
        break;

      case 'loot_picked':
        this.game.onLootPicked(msg);
        break;

      case 'loot_denied':
        this.game.onLootDenied(msg);
        break;

      case 'reward':
        this.game.onRewardFromServer(msg);
        break;

      case 'party_list':
        this.partyList = msg.parties || [];
        if (this.game.uiController) this.game.uiController.onPartyListReceived(this.partyList);
        break;

      case 'party_join_request':
        if (this.game.uiController) {
          this.game.uiController.showJoinRequestToast(msg.partyId, msg.requesterId, msg.requesterName, msg.requesterLevel);
        }
        break;

      case 'chat':
        // channel: world | map | party | guild (player chat) or system
        this.game.onLog(msg.text, msg.channel && msg.channel !== 'system' ? 'chat' : 'system', msg.channel || 'world');
        break;
    }
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendPosition(x, y, facing, isMoving = false, walkFrame = 0, currentMap = 'meadows') {
    this.send({
      type: 'move',
      x: Math.round(x),
      y: Math.round(y),
      facing: facing,
      isMoving: isMoving,
      walkFrame: Math.round(walkFrame),
      currentMap: currentMap
    });
  }

  sendChangeMap(mapId, x = 1600, y = 1200) {
    this.send({
      type: 'change_map',
      mapId,
      x,
      y
    });
  }

  sendAttackAction(opts = {}) {
    this.send({
      type: 'attack_action',
      weaponType: opts.weaponType || this.player.weaponInfo.type,
      skillId: opts.skillId || null,
      skillName: opts.skillName || null,
      targetId: opts.targetId || null,
      targetX: opts.targetX || null,
      targetY: opts.targetY || null
    });
  }

  sendMonsterHit(monsterId, damage, isCrit = false, skillId = null) {
    this.send({
      type: 'hit_monster',
      monsterId: monsterId,
      damage: damage,
      isCrit: isCrit,
      skillId: skillId
    });
  }

  sendPetState(x, y, carry) {
    this.send({ type: 'pet_state', x: Math.round(x), y: Math.round(y), carry: carry || null });
  }

  sendPickupLoot(id, viaPet = false) {
    this.send({ type: 'pickup_loot', id, pet: viaPet });
  }

  sendProfileUpdate() {
    this.send({
      type: 'update_profile',
      pet: this.player.activePet || null,
      name: this.player.name,
      level: this.player.baseLevel,
      weaponType: this.player.weaponInfo.type,
      def: this.player.defense,
      hp: this.player.currentHp,
      maxHp: this.player.maxHp,
      currentMap: this.game ? this.game.currentZone.id : 'meadows'
    });
  }

  sendCreateParty(partyName, settings = {}) {
    this.send({
      type: 'party_create',
      partyName,
      settings
    });
  }

  sendDeclineParty(partyId) {
    this.send({ type: 'party_decline', partyId });
  }

  sendKickMember(targetPlayerId) {
    this.send({ type: 'party_kick', targetPlayerId });
  }

  sendTransferLeader(targetPlayerId) {
    this.send({ type: 'party_transfer_leader', targetPlayerId });
  }

  sendRenameParty(name) {
    this.send({ type: 'party_rename', name });
  }

  sendPartySettings(settings) {
    this.send({ type: 'party_settings', settings });
  }

  sendPartyListRequest(filter = {}) {
    this.send({ type: 'party_list_request', ...filter });
  }

  sendJoinRequest(partyId) {
    this.send({ type: 'party_join_request', partyId });
  }

  sendJoinResponse(requesterId, accept) {
    this.send({ type: 'party_join_response', requesterId, accept });
  }

  sendInviteParty(targetPlayerId) {
    this.send({
      type: 'party_invite',
      targetPlayerId
    });
  }

  sendAcceptParty(partyId) {
    this.send({
      type: 'party_accept',
      partyId
    });
  }

  sendLeaveParty() {
    this.send({
      type: 'party_leave'
    });
  }

  sendChat(text, channel = 'world') {
    this.send({
      type: 'chat',
      text: text,
      channel: channel
    });
  }
}

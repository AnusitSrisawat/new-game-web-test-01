// UI Controller for PC MMORPG Fullscreen Edition
import { ZONES, ITEMS, RELICS, CRAFTING_RECIPES, GACHA_COSTUMES, QUESTS, WEAPON_TYPES, STAT_KEYS, MONSTERS, SKILLS } from './data.js';
import { SP_POTION_IDS, SKILL_SLOTS, GACHA_SINGLE, GACHA_PACK } from './player.js';
import { TILE_SIZE, getMapDef } from './maps.js';
import { soundEngine } from './audio.js';
import { itemIconHtml, relicIconHtml, monsterSprite, spriteStyle, weaponSprite } from './sprites.js';
import { drawLook, MODEL } from './player_look.js';
import { PLAYER_SPRITES } from './player_sprites.js';

// cut-out of a monster picture (falls back to its emoji)
function monsterIconHtml(mid, emoji, px) {
  const sp = monsterSprite(mid);
  return sp ? `<span style="${spriteStyle(sp, px)}"></span>` : `<span style="font-size:${Math.round(px * 0.7)}px; line-height:1; display:inline-block; vertical-align:middle;">${emoji || '🐾'}</span>`;
}

const GEAR_TYPES = ['weapon', 'hat', 'hair', 'face', 'mouth', 'head', 'outfit', 'back', 'armor', 'shield', 'mount', 'pet'];
const SLOT_OF_TYPE = { weapon: 'weapon', hat: 'hat', hair: 'hair', face: 'face', mouth: 'mouth', head: 'head', outfit: 'outfit', back: 'back', armor: 'outfit', shield: 'offhand', mount: 'mount', pet: 'pet' };

const SKILL_ICONS = {
  power_strike: '💥', whirlwind: '🌀', double_shot: '🏹', arrow_rain: '🌧️', fire_bolt: '🔥', frost_nova: '❄️', meteor_fall: '☄️',
  heal_light: '💚', iron_guard: '🛡️', berserk: '😡', dash: '💨', sword_mastery: '⚔️', tough_body: '💪', swift_feet: '👟', mana_well: '🔷', eagle_eye: '🦅'
};
const RARITY = { common: ['ธรรมดา', '#94a3b8'], uncommon: ['ไม่ธรรมดา', '#22c55e'], rare: ['หายาก', '#3b82f6'], epic: ['ตำนาน', '#f59e0b'] };
const WEAPON_REQ = { any: 'อาวุธใดก็ได้', melee: 'ดาบ/ไม้/มือเปล่า', bow: 'ธนู', staff: 'คฑา' };

const STAT_INFO = {
  str: { label: 'STR', name: 'พลังกาย (STR)', icon: '💪', color: '#f87171' },
  agi: { label: 'AGI', name: 'ความว่องไว (AGI)', icon: '👟', color: '#4ade80' },
  vit: { label: 'VIT', name: 'ความอึด (VIT)', icon: '❤️', color: '#f59e0b' },
  int: { label: 'INT', name: 'สติปัญญา (INT)', icon: '🔮', color: '#60a5fa' },
  dex: { label: 'DEX', name: 'ความชำนาญ (DEX)', icon: '🎯', color: '#a78bfa' },
  luk: { label: 'LUK', name: 'โชคลาภ (LUK)', icon: '🍀', color: '#facc15' }
};

function enhanceColor(level) {
  if (level >= 25) return '#fbbf24';
  if (level >= 20) return '#ef4444';
  if (level >= 15) return '#f59e0b';
  if (level >= 10) return '#c084fc';
  if (level >= 5) return '#38bdf8';
  return '#4ade80';
}

export class UIController {
  constructor(player, gameEngine) {
    this.player = player;
    this.gameEngine = gameEngine;
    this.openWindows = new Set(); // several windows can stay open at once
    this.zCounter = 100;
    this.questTab = 'active'; // 'active' | 'completed'
    this.windowRenderers = {
      'modal-status': () => this.renderStatusModal(),
      'modal-party': () => this.renderPartyModal(),
      'modal-inventory': () => this.renderInventoryModal(),
      'modal-craft': () => this.renderCraftModal(),
      'modal-enhance': () => this.renderEnhanceModal(),
      'modal-quests': () => this.renderQuestsModal(),
      'modal-relics': () => this.renderRelicsModal(),
      'modal-shop': () => this.renderShopModal(),
      'modal-zones': () => this.renderZonesModal(),
      'modal-auto': () => this.renderAutoModal(),
      'modal-skills': () => this.renderSkillsModal(),
      'modal-info': () => this.renderInfoModal()
    };

    this.initEventListeners();
    this.initKeyboardHotkeys();
    this.initWindows();
    this.initSidePanelCollapse();
    this.renderAll();
    this.restoreWindows();
  }

  initEventListeners() {
    // Modal Open Buttons
    const modalButtons = [
      { id: 'btn-open-status', modalId: 'modal-status', render: () => this.renderStatusModal() },
      { id: 'btn-open-party', modalId: 'modal-party', render: () => this.renderPartyModal() },
      { id: 'btn-open-party-modal', modalId: 'modal-party', render: () => this.renderPartyModal() },
      { id: 'btn-open-inventory', modalId: 'modal-inventory', render: () => this.renderInventoryModal() },
      { id: 'btn-open-info', modalId: 'modal-info', render: () => this.renderInfoModal() },
      { id: 'btn-open-skills', modalId: 'modal-skills', render: () => this.renderSkillsModal() },
      { id: 'btn-open-craft', modalId: 'modal-craft', render: () => this.renderCraftModal() },
      { id: 'btn-open-enhance', modalId: 'modal-enhance', render: () => this.renderEnhanceModal() },
      { id: 'btn-open-quests', modalId: 'modal-quests', render: () => this.renderQuestsModal() },
      { id: 'btn-open-relics', modalId: 'modal-relics', render: () => this.renderRelicsModal() },
      { id: 'btn-open-shop', modalId: 'modal-shop', render: () => this.renderShopModal() },
      { id: 'btn-open-zones', modalId: 'modal-zones', render: () => this.renderZonesModal() },
      { id: 'btn-open-quests-side', modalId: 'modal-quests', render: () => this.renderQuestsModal() },
      { id: 'btn-open-settings', modalId: 'modal-settings', render: () => this.renderSettingsModal() },
      { id: 'btn-auto-settings', modalId: 'modal-auto', render: () => this.renderAutoModal() }
    ];

    modalButtons.forEach(btn => {
      const el = document.getElementById(btn.id);
      if (el) {
        el.addEventListener('click', () => {
          this.toggleModal(btn.modalId, btn.render);
          this.closeOptionMenu();
        });
      }
    });

    // Clicking the top-left player card opens the status modal (same as pressing C)
    const pcCard = document.querySelector('.pc-card');
    if (pcCard) {
      pcCard.style.cursor = 'pointer';
      pcCard.addEventListener('click', (e) => {
        if (e.target.closest('#hud-stat-point-alert')) return; // pill has its own handler
        this.toggleModal('modal-status', () => this.renderStatusModal());
        this.closeOptionMenu();
      });
    }

    document.addEventListener('mapchanged', () => this.renderZonesModal());

    // Party Invitation Toast Accept & Decline
    document.getElementById('btn-party-accept')?.addEventListener('click', () => {
      const toast = document.getElementById('party-invite-toast');
      const partyId = toast ? toast.dataset.partyId : null;
      if (partyId && this.gameEngine.network) {
        this.gameEngine.network.sendAcceptParty(partyId);
      }
      if (toast) toast.style.display = 'none';
    });

    document.getElementById('btn-party-decline')?.addEventListener('click', () => {
      const toast = document.getElementById('party-invite-toast');
      const partyId = toast ? toast.dataset.partyId : null;
      if (partyId && this.gameEngine.network) this.gameEngine.network.sendDeclineParty(partyId);
      if (toast) toast.style.display = 'none';
    });

    // Close Modal Buttons
    document.querySelectorAll('.btn-modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.close;
        this.closeModal(targetId);
      });
    });

    // Auto Hunt Button
    const autoBtn = document.getElementById('btn-auto-hunt');
    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        this.player.autoBattle = !this.player.autoBattle;
        this.updateAutoButton();
        this.gameEngine.onLog(this.player.autoBattle ? '🤖 เปิดระบบ Auto Hunt ฟาร์มอัตโนมัติ' : '✋ ปิดระบบ Auto Hunt', 'system');
      });
    }

    // Option dropdown
    const optBtn = document.getElementById('btn-option');
    optBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('option-menu');
      const open = menu.style.display === 'none';
      menu.style.display = open ? 'grid' : 'none';
      optBtn.classList.toggle('open', open);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#option-menu') && !e.target.closest('#potion-chooser') && !e.target.closest('#slot-hp-potion')) {
        this.closeOptionMenu();
        this.closePotionChooser();
      }
    });

    // Side panel tabs (Party | Quests)
    document.querySelectorAll('.side-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.setSideTab(e.currentTarget.dataset.side));
    });
    this.setSideTab(this.sideTab || 'party');

    // HP potion quick slot: click = drink, right-click (or empty slot) = choose potion
    const hpSlot = document.getElementById('slot-hp-potion');
    hpSlot?.addEventListener('click', () => {
      if (!this.player.hpPotionSlot && this.player.ownedHpPotions().length) this.openPotionChooser();
      else this.gameEngine.usePotionSlot();
    });
    document.getElementById('slot-sp-potion')?.addEventListener('click', () => this.gameEngine.useSpPotionSlot());
    hpSlot?.addEventListener('contextmenu', (e) => { e.preventDefault(); this.openPotionChooser(); });

    // Big Attack Button (Action wheel)
    const atkBtn = document.getElementById('btn-big-attack');
    if (atkBtn) {
      atkBtn.addEventListener('click', () => {
        const g = this.gameEngine;
        const pe = g.playerEntity;
        let t = g.selectedTarget;
        if (!t || t.isDead || t.map !== g.currentZone.id) {
          // Pick the nearest live monster in the current zone
          const live = g.monsters.filter(m => !m.isDead && m.map === g.currentZone.id);
          live.sort((a, b) => Math.hypot(a.x - pe.x, a.y - pe.y) - Math.hypot(b.x - pe.x, b.y - pe.y));
          t = live[0];
          if (!t) return;
          g.selectedTarget = t;
          g.updateTargetHUD(t);
        }
        // Only strike when in range; otherwise the update loop walks toward the target first
        if (Math.hypot(t.x - pe.x, t.y - pe.y) <= this.player.attackRange) {
          g.tryPlayerAttack(t);
        }
      });
    }

    // Skills & Items Slots 1 to 9 clicks at Bottom-Center
    for (let slot = 1; slot <= 4; slot++) {
      const el = document.getElementById(`slot-${slot}`);
      if (el) {
        el.addEventListener('click', () => this.gameEngine.useSkillSlot(slot));
      }
    }

    // Monster kill event
    window.addEventListener('monsterKilled', (e) => {
      this.updateQuestProgress(e.detail.monsterId);
      if (this.isOpen('modal-quests')) this.renderQuestsModal();
    });
  }

  initKeyboardHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (this.isTyping()) return;

      // physical key position, so hotkeys work on any keyboard layout (e.g. Thai)
      const key = e.code && e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
      if (key === 'c') this.toggleModal('modal-status', () => this.renderStatusModal());
      else if (key === 'p') this.toggleModal('modal-party', () => this.renderPartyModal());
      else if (key === 'i') this.toggleModal('modal-inventory', () => this.renderInventoryModal());
      else if (key === 'b') this.toggleModal('modal-craft', () => this.renderCraftModal());
      else if (key === 'u') this.toggleModal('modal-enhance', () => this.renderEnhanceModal());
      else if (key === 'j') this.toggleModal('modal-quests', () => this.renderQuestsModal());
      else if (key === 't') this.toggleModal('modal-relics', () => this.renderRelicsModal());
      else if (key === 'k') this.toggleModal('modal-shop', () => this.renderShopModal());
      else if (key === 'm') this.toggleModal('modal-zones', () => this.renderZonesModal());
      else if (key === 'q') this.gameEngine.usePotionSlot();
      else if (key === 'e') this.gameEngine.useSpPotionSlot();
      else if (key === 'r') this.gameEngine.toggleMount();
      else if (key === 'n') this.toggleModal('modal-info', () => this.renderInfoModal());
      else if (key === 'v') this.toggleModal('modal-skills', () => this.renderSkillsModal());
      else if (key === 'escape') {
        const front = this.frontWindowId();
        if (front) this.closeModal(front);
        else this.closeOptionMenu();
      }
    });
  }

  // True only while typing text (not when a slider/checkbox/button merely has focus)
  isTyping() {
    const a = document.activeElement;
    if (!a) return false;
    if (a.tagName === 'TEXTAREA') return true;
    return a.tagName === 'INPUT' && !/^(range|checkbox|radio|button)$/.test(a.type);
  }

  isOpen(modalId) {
    return this.openWindows.has(modalId);
  }

  // Windows stay open until you close them (X / same hotkey / Esc closes the front-most).
  toggleModal(modalId, renderFn) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (this.isOpen(modalId)) {
      this.closeModal(modalId);
      return;
    }
    this.openWindow(modalId, renderFn);
  }

  openWindow(modalId, renderFn) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    this.openWindows.add(modalId);
    this.placeWindow(modal);
    modal.classList.add('active');
    this.bringToFront(modal);
    if (renderFn) renderFn();
    // Re-verify modal stays strictly inside viewport after content is rendered
    requestAnimationFrame(() => {
      const w = modal.offsetWidth || 600;
      const h = modal.offsetHeight || 400;
      modal.style.left = `${this.clampX(modal.offsetLeft, w)}px`;
      modal.style.top = `${this.clampY(modal.offsetTop, h)}px`;
    });
    this.saveWindowState();
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    this.openWindows.delete(modalId);
    this.saveWindowState();
    const monTip = document.getElementById('mon-tooltip');
    if (monTip) monTip.style.display = 'none';
  }

  bringToFront(modal) {
    modal.style.zIndex = ++this.zCounter;
  }

  frontWindowId() {
    let best = null;
    let bestZ = -1;
    this.openWindows.forEach(id => {
      const z = Number(document.getElementById(id)?.style.zIndex) || 0;
      if (z >= bestZ) { bestZ = z; best = id; }
    });
    return best;
  }

  // Position: remembered spot, otherwise cascade near centre, always strictly inside screen
  placeWindow(modal) {
    if (modal.dataset.placed) return;
    modal.dataset.placed = '1';
    let pos = null;
    try { pos = (JSON.parse(localStorage.getItem('win_pos') || '{}'))[modal.id]; } catch (e) { /* ignore */ }
    const modalW = modal.offsetWidth || (modal.id === 'modal-status' ? 860 : modal.id === 'modal-inventory' ? 960 : modal.id === 'modal-shop' ? 940 : modal.id === 'modal-info' ? 880 : 680);
    const modalH = modal.offsetHeight || 520;
    const w = Math.min(modalW, window.innerWidth - 16);
    const h = Math.min(modalH, window.innerHeight - 16);
    if (!pos) {
      const n = this.openWindows.size - 1;
      pos = {
        x: Math.max(8, (window.innerWidth - w) / 2 + (n % 4) * 20),
        y: Math.max(8, Math.min(60 + (n % 4) * 20, window.innerHeight - h - 16))
      };
    }
    modal.style.left = `${this.clampX(pos.x, w)}px`;
    modal.style.top = `${this.clampY(pos.y, h)}px`;
  }

  // Clamps X so the window is 100% visible on screen (never sticks out left or right)
  clampX(x, w) {
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - (w || 600) - margin);
    return Math.min(Math.max(margin, x), maxLeft);
  }

  // Clamps Y so the window is 100% visible on screen (never sticks out top or bottom)
  clampY(y, h) {
    const margin = 8;
    const maxTop = Math.max(margin, window.innerHeight - (h || 400) - margin);
    return Math.min(Math.max(margin, y), maxTop);
  }

  // Clamps all open windows so none stick out
  clampAllWindowsToScreen() {
    this.openWindows.forEach(id => {
      const modal = document.getElementById(id);
      if (!modal) return;
      const w = modal.offsetWidth || 600;
      const h = modal.offsetHeight || 400;
      modal.style.left = `${this.clampX(modal.offsetLeft, w)}px`;
      modal.style.top = `${this.clampY(modal.offsetTop, h)}px`;
    });
  }

  saveWindowState() {
    try {
      localStorage.setItem('win_open', JSON.stringify([...this.openWindows]));
    } catch (e) { /* ignore */ }
  }

  // Drag by header, click brings to front, positions are remembered and clamped
  initWindows() {
    window.addEventListener('resize', () => this.clampAllWindowsToScreen());

    document.querySelectorAll('.game-modal').forEach(modal => {
      modal.addEventListener('mousedown', () => this.bringToFront(modal));
      const header = modal.querySelector('.modal-header');
      if (!header) return;
      header.style.cursor = 'move';
      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        const startX = e.clientX - modal.offsetLeft;
        const startY = e.clientY - modal.offsetTop;
        const move = (ev) => {
          modal.style.left = `${this.clampX(ev.clientX - startX, modal.offsetWidth)}px`;
          modal.style.top = `${this.clampY(ev.clientY - startY, modal.offsetHeight)}px`;
        };
        const up = () => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
          try {
            const all = JSON.parse(localStorage.getItem('win_pos') || '{}');
            all[modal.id] = { x: modal.offsetLeft, y: modal.offsetTop };
            localStorage.setItem('win_pos', JSON.stringify(all));
          } catch (err) { /* ignore */ }
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        e.preventDefault();
      });
    });
  }

  // Re-open the windows that were open last time
  restoreWindows() {
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem('win_open') || '[]'); } catch (e) { /* ignore */ }
    ids.forEach(id => {
      const r = this.windowRenderers[id];
      if (r) this.openWindow(id, r);
    });
  }

  // Keep open windows fresh when game data changes (loot, EXP, gold, quest progress)
  refreshOpenWindows() {
    if (this.openWindows.size === 0) return;
    const pl = this.player;
    const sig = JSON.stringify([pl.gold, pl.gachaTokens, pl.baseLevel, pl.statPoints, pl.inventory, pl.equipment, pl.itemEnhancements, pl.questProgress, pl.collectedRelics.length, pl.learnedSkills, pl.skillBooks, pl.skillLoadout]);
    if (sig === this.lastWindowSig) return;
    this.lastWindowSig = sig;
    const a = document.activeElement;
    this.openWindows.forEach(id => {
      if (id === 'modal-party' || id === 'modal-auto' || id === 'modal-zones' || id === 'modal-info') return; // have their own refresh / inputs
      const modal = document.getElementById(id);
      if (a && modal && modal.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
      const r = this.windowRenderers[id];
      if (r) r();
    });
  }

  // Party/Quest side panel can be folded to just its tab bar (remembered)
  initSidePanelCollapse() {
    const panel = document.getElementById('hud-party-widget');
    const btn = document.getElementById('side-collapse');
    if (!panel || !btn) return;
    const apply = (collapsed) => {
      panel.classList.toggle('collapsed', collapsed);
      btn.textContent = collapsed ? '▾' : '▴';
      btn.title = collapsed ? 'แสดงแผง' : 'ซ่อนแผง';
      try { localStorage.setItem('side_collapsed', collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
    };
    btn.addEventListener('click', () => apply(!panel.classList.contains('collapsed')));
    // Clicking a tab while folded opens the panel again
    document.querySelectorAll('.side-tab').forEach(t => t.addEventListener('click', () => {
      if (panel.classList.contains('collapsed')) apply(false);
    }));
    let saved = false;
    try { saved = localStorage.getItem('side_collapsed') === '1'; } catch (e) { /* ignore */ }
    apply(saved);
  }

  // In-game yes/no dialog (not the browser's confirm())
  showConfirm(message, onYes, yesLabel = 'ไปเลย') {
    document.getElementById('confirm-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'confirm-overlay';
    overlay.className = 'confirm-overlay';
    const box = document.createElement('div');
    box.className = 'confirm-box';
    const msg = document.createElement('div');
    msg.className = 'confirm-msg';
    msg.textContent = message;
    const row = document.createElement('div');
    row.className = 'confirm-actions';
    const yes = document.createElement('button');
    yes.className = 'confirm-yes';
    yes.textContent = yesLabel;
    const no = document.createElement('button');
    no.className = 'confirm-no';
    no.textContent = 'ยกเลิก';
    const close = () => overlay.remove();
    yes.addEventListener('click', () => { close(); onYes(); });
    no.addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    row.append(no, yes);
    box.append(msg, row);
    overlay.append(box);
    document.getElementById('game-viewport').append(overlay);
    yes.focus();
  }

  // Clicking a quest offers to travel to the map where its target monster lives
  promptQuestTravel(questId) {
    const q = QUESTS.find(item => item.id === questId);
    if (!q) return;
    const zone = ZONES.find(z => (z.monsterIds || []).includes(q.targetMonster));
    const mon = MONSTERS[q.targetMonster];
    if (!zone) {
      this.gameEngine.onLog('ไม่พบแมพที่มีมอนสเตอร์ตัวนี้', 'system');
      return;
    }
    if (this.gameEngine.currentZone.id === zone.id) {
      this.gameEngine.onLog(`📍 คุณอยู่ที่ ${zone.name} แล้ว — ออกล่า ${mon ? mon.name : q.targetMonster} ได้เลย`, 'quest');
      return;
    }
    this.showConfirm(
      `ต้องการเดินทางไป "${zone.name}" เพื่อล่า ${mon ? mon.name : q.targetMonster} สำหรับเควสต์ "${q.title}" หรือไม่?`,
      () => this.gameEngine.changeMap(zone.id)
    );
  }

  // Settings window with tabs: sound / graphics / account
  renderSettingsModal() {
    const body = document.getElementById('modal-settings-body');
    if (!body) return;
    const tab = this.settingsTab || 'sound';
    const tabs = [['sound', '🔊 เสียง'], ['graphics', '🖼️ ภาพ'], ['account', '👤 บัญชี']];
    const pct = v => Math.round(v * 100);
    const slider = (id, label, v) => `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${label}</span><b id="${id}-val">${pct(v)}%</b></div>
        <input type="range" id="${id}" min="0" max="100" value="${pct(v)}" style="width:100%;">
      </div>`;
    let content = '';
    if (tab === 'sound') {
      content = `
        ${slider('set-vol-music', '🎵 เสียงเพลง', soundEngine.musicVolume)}
        ${slider('set-vol-sfx', '💥 เสียงเอฟเฟกต์', soundEngine.sfxVolume)}
        <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="set-mute" ${soundEngine.muted ? 'checked' : ''}> ปิดเสียงทั้งหมด</label>`;
    } else if (tab === 'graphics') {
      content = `
        ${slider('set-zoom', '🔍 ระดับซูม', ((this.gameEngine.zoom || 1) - 0.5) / 2)}
        <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="set-shake" ${this.gameEngine.screenShakeEnabled ? 'checked' : ''}> 📳 จอสั่น (ตอนตีคริ / ใช้สกิล)</label>`;
    } else {
      content = `<div>ชื่อตัวละคร: <b>${this.player.name}</b></div><div style="margin-top:6px;">เลเวล: <b>${this.player.level ?? '-'}</b></div>`;
    }
    body.innerHTML = `
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        ${tabs.map(([id, label]) => `<button class="side-tab ${id === tab ? 'active' : ''}" data-set-tab="${id}" style="flex:1;">${label}</button>`).join('')}
      </div>
      <div style="min-width:280px;">${content}</div>`;
    body.querySelectorAll('[data-set-tab]').forEach(btn => btn.addEventListener('click', () => {
      this.settingsTab = btn.dataset.setTab;
      this.renderSettingsModal();
    }));
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      el?.addEventListener('input', () => {
        const v = el.value / 100;
        document.getElementById(`${id}-val`).textContent = `${el.value}%`;
        fn(v);
      });
    };
    bind('set-vol-music', v => soundEngine.setMusicVolume(v));
    bind('set-vol-sfx', v => { soundEngine.setSfxVolume(v); soundEngine.playSlash(); });
    bind('set-zoom', v => this.gameEngine.setZoom(0.5 + v * 2));
    document.getElementById('set-shake')?.addEventListener('change', e => this.gameEngine.setScreenShakeEnabled(e.target.checked));
    document.getElementById('set-mute')?.addEventListener('change', () => soundEngine.toggleMute());
  }

  closeOptionMenu() {
    const menu = document.getElementById('option-menu');
    if (menu) menu.style.display = 'none';
    document.getElementById('btn-option')?.classList.remove('open');
  }

  setSideTab(tab) {
    this.sideTab = tab === 'quests' ? 'quests' : 'party';
    document.querySelectorAll('.side-tab').forEach(t => t.classList.toggle('active', t.dataset.side === this.sideTab));
    const party = document.getElementById('side-party');
    const quests = document.getElementById('side-quests');
    if (party) party.style.display = this.sideTab === 'party' ? 'block' : 'none';
    if (quests) quests.style.display = this.sideTab === 'quests' ? 'block' : 'none';
  }

  updatePotionSlot() {
    const iconEl = document.getElementById('qs-hp-icon');
    const countEl = document.getElementById('qs-hp-count');
    if (!iconEl || !countEl) return;
    const owned = this.player.ownedHpPotions();
    let id = this.player.hpPotionSlot;
    if (!id || !ITEMS[id]) id = null;
    // Shows the chosen potion, or the weakest owned one when none is chosen
    const shown = id || owned[0] || null;
    iconEl.innerHTML = shown ? itemIconHtml(shown, ITEMS[shown].icon, 28) : '＋';
    countEl.textContent = shown ? (this.player.inventory[shown] || 0) : '';
    document.getElementById('slot-hp-potion')?.classList.toggle('empty', !shown || !(this.player.inventory[shown] > 0));
    const spOwned = this.player.ownedSpPotions();
    const spShown = (this.player.spPotionSlot && this.player.inventory[this.player.spPotionSlot] > 0) ? this.player.spPotionSlot : spOwned[0];
    const spIcon = document.getElementById('qs-sp-icon');
    const spCount = document.getElementById('qs-sp-count');
    if (spIcon && spCount) {
      spIcon.innerHTML = spShown ? itemIconHtml(spShown, ITEMS[spShown].icon, 28) : '＋';
      spCount.textContent = spShown ? (this.player.inventory[spShown] || 0) : '';
    }
    document.getElementById('slot-sp-potion')?.classList.toggle('empty', !spShown);
  }

  openPotionChooser() {
    const box = document.getElementById('potion-chooser');
    if (!box) return;
    const owned = this.player.ownedHpPotions();
    box.innerHTML = owned.length
      ? owned.map(id => `<button data-id="${id}">${itemIconHtml(id, ITEMS[id].icon || '🧪', 20)} ${ITEMS[id].name} <span style="margin-left:auto; color:#fde68a;">x${this.player.inventory[id]}</span></button>`).join('') +
        `<button data-id="">↺ อัตโนมัติ (ตัวที่อ่อนที่สุด)</button>`
      : '<div class="pc-empty">ไม่มียา HP ในกระเป๋า</div>';
    box.style.display = 'block';
    box.querySelectorAll('button').forEach(b => b.addEventListener('click', (e) => {
      this.player.hpPotionSlot = e.currentTarget.dataset.id || null;
      this.player.saveToStorage();
      this.closePotionChooser();
      this.updatePotionSlot();
    }));
  }

  closePotionChooser() {
    const box = document.getElementById('potion-chooser');
    if (box) box.style.display = 'none';
  }

  // Auto-hunt settings window
  renderAutoModal() {
    const body = document.getElementById('modal-auto-body');
    if (!body) return;
    const a = this.player.auto;
    const zone = this.gameEngine.currentZone;
    const monsterIds = zone.monsterIds || [];
    const md = getMapDef(zone.id);
    // The longest distance inside the map is its diagonal: that range covers the whole map
    const maxRange = Math.ceil(Math.hypot(md.width, md.height) / TILE_SIZE);
    if (a.range > maxRange) a.range = maxRange;
    const rangeLabel = (r) => r >= maxRange ? 'ทั้งแมพ' : `${r} ช่อง`;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const monCards = monsterIds.length
      ? monsterIds.map(id => {
          const m = MONSTERS[id];
          if (!m) return '';
          const on = !a.disabledMonsters[id];
          return `<label class="auto-mon ${on ? 'on' : ''}"><input type="checkbox" class="auto-mon-cb" data-id="${esc(id)}" ${on ? 'checked' : ''}> ${m.emoji || ''} ${esc(m.name)} <span style="margin-left:auto; color:#94a3b8;">Lv.${m.level}</span></label>`;
        }).join('')
      : '<div class="auto-note">แมพนี้ไม่มีมอนสเตอร์</div>';

    body.innerHTML = `
      <div class="auto-grid">
        <div class="auto-card full">
          <h4>🎯 ระยะค้นหา</h4>
          <div class="auto-row">
            <input type="range" id="auto-range" min="3" max="${maxRange}" step="1" value="${a.range}">
            <span class="auto-val" id="auto-range-val">${rangeLabel(a.range)}</span>
          </div>
          <div class="auto-note">1 ช่อง = ${TILE_SIZE} px • สูงสุด ${maxRange} ช่อง = ครอบคลุมทั้งแมพ (แมพนี้ ${md.width / TILE_SIZE}×${md.height / TILE_SIZE} ช่อง) • Auto จะไล่ตีเฉพาะมอนสเตอร์ที่อยู่ในระยะนี้จากตัวคุณ</div>
        </div>

        <div class="auto-card full">
          <h4>🎁 เก็บของดรอป</h4>
          <div class="auto-row">
            <label><input type="checkbox" id="auto-pickup" ${a.pickup ? 'checked' : ''}> ให้ Auto เดินไปเก็บไอเท็มที่ตกพื้น</label>
          </div>
          <div class="auto-note">EXP และเงินเข้าตัวเองอัตโนมัติ ส่วนไอเท็มอื่นจะตกที่พื้น (ทุกคนเห็น) • คนที่ตีมอนสเตอร์ตัวนั้นมากสุดเก็บได้ก่อน คนอื่นเก็บได้เมื่อของตกพื้นครบ 3 นาที • มี Pet สวมใส่อยู่ Pet จะวิ่งไปเก็บมาให้เอง ไม่ต้องเปิดตัวเลือกนี้</div>
        </div>

        <div class="auto-card">
          <h4>🧪 ใช้ยา HP อัตโนมัติ</h4>
          <div class="auto-row">
            <label><input type="checkbox" id="auto-hp-on" ${a.hpPotion.enabled ? 'checked' : ''}> เปิดใช้งาน</label>
          </div>
          <div class="auto-row">
            <span>เมื่อ HP ต่ำกว่า</span>
            <input type="range" id="auto-hp-pct" min="10" max="95" step="5" value="${a.hpPotion.percent}">
            <span class="auto-val" id="auto-hp-pct-val">${a.hpPotion.percent}%</span>
          </div>
          <div class="auto-row">
            <span>ชนิดยา</span>
            <select id="auto-hp-item">
              <option value="">อัตโนมัติ (ตัวที่อ่อนที่สุด)</option>
              ${['hp_potion_s', 'hp_potion_m', 'hp_potion_l'].filter(id => ITEMS[id]).map(id =>
                `<option value="${id}" ${a.hpPotion.itemId === id ? 'selected' : ''}>${ITEMS[id].name} (มี ${this.player.inventory[id] || 0})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="auto-card">
          <h4>🔷 ใช้ยา SP อัตโนมัติ</h4>
          <div class="auto-row">
            <label><input type="checkbox" id="auto-sp-on" ${a.spPotion.enabled ? 'checked' : ''}> เปิดใช้งาน</label>
          </div>
          <div class="auto-row">
            <span>เมื่อ SP ต่ำกว่า</span>
            <input type="range" id="auto-sp-pct" min="5" max="90" step="5" value="${a.spPotion.percent}">
            <span class="auto-val" id="auto-sp-pct-val">${a.spPotion.percent}%</span>
          </div>
          <div class="auto-row">
            <span>ชนิดยา</span>
            <select id="auto-sp-item">
              <option value="">อัตโนมัติ (ตัวที่อ่อนที่สุด)</option>
              ${SP_POTION_IDS.filter(id => ITEMS[id]).map(id =>
                `<option value="${id}" ${a.spPotion.itemId === id ? 'selected' : ''}>${ITEMS[id].name} (มี ${this.player.inventory[id] || 0})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="auto-card full">
          <h4>👾 มอนสเตอร์ที่จะตี — ${esc(zone.name)}</h4>
          <div class="auto-mon-actions">
            <button id="auto-mon-all">เลือกทั้งหมด</button>
            <button id="auto-mon-none">ไม่เลือกเลย</button>
          </div>
          <div class="auto-mons">${monCards}</div>
        </div>

      </div>`;

    const save = () => this.player.saveToStorage();
    const range = document.getElementById('auto-range');
    range.addEventListener('input', () => {
      a.range = Number(range.value);
      document.getElementById('auto-range-val').textContent = rangeLabel(a.range);
      save();
    });
    document.getElementById('auto-pickup').addEventListener('change', e => { a.pickup = e.target.checked; save(); });
    document.getElementById('auto-hp-on').addEventListener('change', e => { a.hpPotion.enabled = e.target.checked; save(); });
    const pct = document.getElementById('auto-hp-pct');
    pct.addEventListener('input', () => {
      a.hpPotion.percent = Number(pct.value);
      document.getElementById('auto-hp-pct-val').textContent = `${a.hpPotion.percent}%`;
      save();
    });
    document.getElementById('auto-sp-on').addEventListener('change', e => { a.spPotion.enabled = e.target.checked; save(); });
    const spct = document.getElementById('auto-sp-pct');
    spct.addEventListener('input', () => {
      a.spPotion.percent = Number(spct.value);
      document.getElementById('auto-sp-pct-val').textContent = `${a.spPotion.percent}%`;
      save();
    });
    document.getElementById('auto-sp-item').addEventListener('change', e => { a.spPotion.itemId = e.target.value || null; save(); });
    document.getElementById('auto-hp-item').addEventListener('change', e => { a.hpPotion.itemId = e.target.value || null; save(); });
    body.querySelectorAll('.auto-mon-cb').forEach(cb => cb.addEventListener('change', e => {
      const id = e.target.dataset.id;
      if (e.target.checked) delete a.disabledMonsters[id]; else a.disabledMonsters[id] = true;
      e.target.closest('.auto-mon').classList.toggle('on', e.target.checked);
      save();
    }));
    const setAll = (on) => {
      monsterIds.forEach(id => { if (on) delete a.disabledMonsters[id]; else a.disabledMonsters[id] = true; });
      save();
      this.renderAutoModal();
    };
    document.getElementById('auto-mon-all').addEventListener('click', () => setAll(true));
    document.getElementById('auto-mon-none').addEventListener('click', () => setAll(false));
  }

  updateAutoButton() {
    const btn = document.getElementById('btn-auto-hunt');
    if (btn) {
      btn.classList.toggle('off', !this.player.autoBattle);
      btn.textContent = this.player.autoBattle ? 'AUTO' : 'OFF';
    }
  }

  updateQuestProgress(monsterId) {
    QUESTS.forEach(q => {
      if (q.targetMonster === monsterId) {
        if (!this.player.questProgress[q.id]) {
          this.player.questProgress[q.id] = { progress: 0, completed: false, claimed: false };
        }
        const state = this.player.questProgress[q.id];
        if (!state.completed) {
          state.progress = Math.min(q.requiredCount, state.progress + 1);
          if (state.progress >= q.requiredCount) {
            state.completed = true;
            this.gameEngine.onLog(`📜 สำเร็จเควสต์! [${q.title}] กด [J] เพื่อรับรางวัล`, 'quest');
          }
          this.player.saveToStorage();
        }
      }
    });
  }

  renderAll() {
    this.updateHUD();
    this.updateAutoButton();
  }

  updateHUD() {
    // Unit Frame at Top-Left
    const nameEl = document.getElementById('hud-unit-name');
    const weaponEl = document.getElementById('hud-unit-weapon');
    const baseLvlEl = document.getElementById('hud-base-lvl');

    const hpFill = document.getElementById('hud-hp-fill');
    const hpText = document.getElementById('hud-hp-text');
    const spFill = document.getElementById('hud-sp-fill');
    const spText = document.getElementById('hud-sp-text');
    const baseExpFill = document.getElementById('hud-base-exp-fill');
    const baseExpText = document.getElementById('hud-base-exp-text');

    const goldEl = document.getElementById('hud-gold-text');
    const tokenEl = document.getElementById('hud-token-text');

    if (nameEl) nameEl.textContent = this.player.name;
    if (weaponEl) {
      const w = ITEMS[this.player.equipment.weapon];
      weaponEl.textContent = w ? w.name.replace(/\s*\(.*\)/, '') : 'มือเปล่า';
    }

    if (baseLvlEl) baseLvlEl.textContent = `Lv. ${this.player.baseLevel}`;
    // 1. HP & SP Bars
    if (hpFill && hpText) {
      const hpPct = Math.max(0, (this.player.currentHp / this.player.maxHp) * 100);
      hpFill.style.width = `${hpPct}%`;
      hpText.textContent = `${this.player.currentHp} / ${this.player.maxHp}`;
    }
    if (spFill && spText) {
      spFill.style.width = `${Math.min(100, (this.player.currentSp / this.player.maxSp) * 100)}%`;
      spText.textContent = `${Math.floor(this.player.currentSp)} / ${this.player.maxSp}`;
    }

    // 2. EXP bar (full-width strip at the bottom of the screen)
    const expFill = document.getElementById('hud-exp-fill');
    const expText = document.getElementById('hud-exp-text');
    if (expFill) {
      const maxB = this.player.maxBaseExp;
      const bPct = Math.min(100, (this.player.baseExp / maxB) * 100);
      expFill.style.width = `${bPct}%`;
      if (expText) expText.textContent = `Lv.${this.player.baseLevel}  ${this.player.baseExp.toLocaleString()} / ${maxB.toLocaleString()}  (${bPct.toFixed(2)}%)`;
    }

    if (goldEl) goldEl.textContent = this.player.gold.toLocaleString();
    if (tokenEl) tokenEl.textContent = this.player.gachaTokens.toLocaleString();

    // 5. Stat points pill
    const statAlert = document.getElementById('hud-stat-point-alert');
    const statCount = document.getElementById('hud-stat-point-count');
    if (statAlert && statCount) {
      statAlert.style.display = this.player.statPoints > 0 ? 'inline-block' : 'none';
      statCount.textContent = this.player.statPoints;
      statAlert.onclick = () => this.toggleModal('modal-status', () => this.renderStatusModal());
    }

    // 5a. Buff icons (server buffs from /buffserver + running skill buffs)
    this.updateBuffIcons();

    // 5b. HP potion quick slot
    this.updatePotionSlot();

    // 6. Update Pinned Active Quest Tracker Widget
    this.updateQuestTrackerWidget();

    // 7. Hotbar 1-9: the player assigns these; empty by default
    const p = this.gameEngine.playerEntity;
    const slotMeta = {};
    this.player.skillLoadout.forEach((id, i) => {
      const sk = id && SKILLS[id];
      if (sk) slotMeta[i + 1] = { icon: SKILL_ICONS[id] || (sk.kind === 'passive' ? '🔷' : '✨'), name: sk.name.replace(/\s*\(.*\)/, ''), title: `[${i + 1}] ${sk.name} — ${sk.kind === 'passive' ? 'ติดตัว' : `SP ${sk.spCost} • CD ${sk.cooldown}s`}`, id };
    });

    if (p) {
      for (let slot = 1; slot <= 4; slot++) {
        const el = document.getElementById(`slot-${slot}`);
        if (!el) continue;

        const meta = slotMeta[slot] || { icon: '', name: '', title: `[${slot}] ช่องว่าง` };
        el.title = meta.title;
        el.classList.toggle('empty', !slotMeta[slot]);
        const iconEl = el.querySelector('.skill-icon-emoji');
        if (iconEl && iconEl.textContent !== meta.icon) iconEl.textContent = meta.icon;
        const nameEl = el.querySelector('.skill-label-name');
        if (nameEl && nameEl.textContent !== meta.name) nameEl.textContent = meta.name;

        const cd = (slotMeta[slot] && this.player.skillCd[slotMeta[slot].id]) || 0;
        let mask = el.querySelector('.skill-cd-mask');
        if (!mask) {
          mask = document.createElement('div');
          mask.className = 'skill-cd-mask';
          mask.innerHTML = `<span class="skill-cd-text"></span>`;
          el.appendChild(mask);
        }
        const textSpan = mask.querySelector('.skill-cd-text');
        if (cd > 0) {
          el.classList.add('on-cooldown');
          textSpan.textContent = cd >= 1 ? `${Math.ceil(cd)}s` : cd.toFixed(2);
        } else {
          if (el.classList.contains('on-cooldown')) {
            el.classList.remove('on-cooldown');
            el.classList.add('skill-ready-flash');
            setTimeout(() => el.classList.remove('skill-ready-flash'), 400);
          }
        }
      }
    }
  }

  updateBuffIcons() {
    const host = document.getElementById('hud-buffs');
    if (!host) return;
    const parts = [];
    const sb = this.gameEngine.serverBuffs || {};
    const fmt = v => (Number.isInteger(v) ? v : Math.round(v * 100) / 100);
    [['exp', '📈', 'EXP'], ['gold', '🪙', 'Gold'], ['drop', '🎁', 'ดรอป'], ['monster', '👾', 'มอนสเตอร์']].forEach(([k, icon, label]) => {
      if (sb[k] && sb[k] !== 1) parts.push(`<div class="buff-icon server" title="บัฟเซิร์ฟเวอร์: ${label} x${fmt(sb[k])}">${icon}<span class="bi-txt">x${fmt(sb[k])}</span></div>`);
    });
    for (const [id, left] of Object.entries(this.player.activeBuffs || {})) {
      const sk = SKILLS[id];
      if (!sk || left <= 0) continue;
      parts.push(`<div class="buff-icon" title="${sk.name} — เหลือ ${Math.ceil(left)} วินาที">${SKILL_ICONS[id] || '✨'}<span class="bi-txt">${Math.ceil(left)}s</span></div>`);
    }
    const html = parts.join('');
    if (host.innerHTML !== html) host.innerHTML = html;
  }

  // Update Active Quest Tracker Widget on HUD
  updateQuestTrackerWidget() {
    const listEl = document.getElementById('quest-tracker-list');
    if (!listEl) return;

    let html = '';
    QUESTS.forEach(q => {
      const st = this.player.questProgress[q.id] || { progress: 0, completed: false, claimed: false };
      if (!st.claimed) {
        html += `
          <div class="quest-tracker-item ${st.completed ? 'completed' : ''}" data-qid="${q.id}" title="คลิกเพื่อไปยังแมพที่ต้องล่า" style="cursor:pointer;">
            <div style="display:flex; justify-content:space-between; font-weight:700;">
              <span>${q.title}</span>
              <span style="color:${st.completed ? '#4ade80' : '#f59e0b'};">${st.progress}/${q.requiredCount}</span>
            </div>
            ${st.completed ? `
              <button class="btn-tracker-claim" data-qid="${q.id}">🎁 รับรางวัล (+${q.rewardGold} G)</button>
            ` : `
              <div style="font-size:0.62rem; color:#94a3b8; margin-top:2px;">เป้าหมาย: กำจัด ${MONSTERS[q.targetMonster] ? MONSTERS[q.targetMonster].name : q.targetMonster}</div>
            `}
          </div>
        `;
      }
    });

    if (!html) {
      html = '<div style="font-size:0.68rem; color:#94a3b8; text-align:center;">สำเร็จทุกเควสต์แล้ว! 🎉</div>';
    }

    // The HUD refreshes ~10x/second; rebuilding identical HTML swallowed clicks on the claim button
    if (html === this.lastQuestHtml) return;
    this.lastQuestHtml = html;
    listEl.innerHTML = html;

    listEl.querySelectorAll('.quest-tracker-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // the claim button has its own action
        this.promptQuestTravel(el.dataset.qid);
      });
    });

    listEl.querySelectorAll('.btn-tracker-claim').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const qid = e.currentTarget.dataset.qid;
        const q = QUESTS.find(item => item.id === qid);
        const st = this.player.questProgress[qid];
        if (q && st && st.completed && !st.claimed) {
          st.claimed = true;
          this.player.gold += q.rewardGold;
          this.player.gachaTokens += q.rewardTokens;
          this.player.gainExp(q.rewardExp);
          this.player.saveToStorage();
          this.gameEngine.onLog(`🎁 รับรางวัลเควสต์: +${q.rewardGold} Gold, +${q.rewardTokens} Token`, 'quest');
          this.updateHUD();
        }
      });
    });
  }

  // 1. Status Modal (level, stat allocation, derived combat stats, gear)
  renderStatusModal() {
    const body = document.getElementById('modal-status-body');
    if (!body) return;

    const pl = this.player;
    const maxB = pl.maxBaseExp;
    const bPct = Math.min(100, (pl.baseExp / maxB) * 100);
    const w = ITEMS[pl.equipment.weapon];
    const a = ITEMS[pl.equipment.outfit];
    const info = pl.weaponInfo;
    const wtName = WEAPON_TYPES[info.type] ? WEAPON_TYPES[info.type].name : info.type;
    const statHelp = {
      str: 'ดาเมจอาวุธประชิด (กิ่งไม้/ดาบ/มือเปล่า)',
      agi: 'ความเร็วโจมตี และความเร็วเดิน',
      vit: 'HP สูงสุด และ DEF',
      dex: 'ดาเมจธนู และเสริมดาเมจรวม',
      int: 'ดาเมจคฑา (เวท)',
      luk: 'โอกาสคริติคอล'
    };
    // Points are staged locally; nothing is committed until the single Confirm button is pressed
    const pend = this.pendingStats || (this.pendingStats = {});
    const pendTotal = STAT_KEYS.reduce((n, k) => n + (pend[k] || 0), 0);
    if (pendTotal > pl.statPoints) { STAT_KEYS.forEach(k => { pend[k] = 0; }); }
    const pendLeft = pl.statPoints - STAT_KEYS.reduce((n, k) => n + (pend[k] || 0), 0);
    // Preview: temporarily apply staged points to read the derived stats, then restore
    const readDerived = () => ({ hp: pl.maxHp, atk: pl.displayAtk, matk: pl.displayMatk, cdmg: pl.critDamage, def: pl.defense, aspd: pl.aspd, move: pl.moveMul, crit: pl.critRate });
    const before = readDerived();
    STAT_KEYS.forEach(k => { pl.stats[k] += pend[k] || 0; });
    const after = readDerived();
    STAT_KEYS.forEach(k => { pl.stats[k] -= pend[k] || 0; });
    const prev = (key, fmt = v => v) => {
      const a = after[key], b = before[key];
      return a !== b ? `${fmt(b)} <span style="color:#4ade80; font-weight:700;">→ ${fmt(a)}</span>` : fmt(b);
    };
    const row = (icon, l, v) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 8px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
        <span style="display:flex; align-items:center; gap:6px; color:#cbd5e1; font-size:0.82rem;">
          <span>${icon}</span>
          <span>${l}</span>
        </span>
        <b style="font-size:0.86rem; color:#f8fafc;">${v}</b>
      </div>
    `;

    this.hideStatInfo();
    body.innerHTML = `
      <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:10px 14px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:3px;">
          <span style="font-weight:700; color:#38bdf8;">⭐ Level ${pl.baseLevel}</span>
          <span style="color:#94a3b8; font-size:0.75rem;">${bPct.toFixed(2)}%</span>
        </div>
        <div style="width:100%; height:8px; background:#1e293b; border-radius:4px; overflow:hidden;">
          <div style="width:${bPct}%; height:100%; background:linear-gradient(90deg,#0284c7,#38bdf8);"></div>
        </div>
        <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px; text-align:right;">${pl.baseExp.toLocaleString()} / ${maxB.toLocaleString()} EXP</div>
      </div>

      <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:16px;">
        <div style="background:rgba(0,0,0,0.3); padding:12px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="display:flex; align-items:center; gap:8px;">
                <span style="font-weight:700; font-size:0.92rem; color:#fbbf24;">⚡ จัดสรรค่าสเตตัส</span>
                <button id="btn-stat-reset" style="padding:3px 8px; background:#7f1d1d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:0.72rem; font-weight:600;">รีสเตตัส (ฟรี)</button>
              </span>
              <span style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); padding:3px 10px; border-radius:6px; color:#f59e0b; font-size:0.82rem;">
                แต้มคงเหลือ: <b style="color:#fbbf24; font-size:0.95rem;">${pendLeft.toLocaleString()}</b>
              </span>
            </div>
            ${STAT_KEYS.map(k => {
              const bs = 'height:28px; border:none; border-radius:5px; color:#fff; cursor:pointer; font-size:0.75rem; font-weight:700; touch-action:none; padding:0 8px; white-space:nowrap; transition:all 0.15s;';
              const canAdd = pendLeft > 0, canSub = pend[k] > 0;
              const addBtn = (n, label, bg) => canAdd ? `<button class="btn-stat-add" data-stat="${k}" data-amt="${n}" style="${bs} background:${bg};">${label}</button>` : '';
              const optBonus = pl.gearOptionBonus ? pl.gearOptionBonus(k) : 0;
              return `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
                <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                  <span class="stat-name" data-stat="${k}" style="
                    font-weight:800; text-transform:uppercase; min-width:40px; cursor:help;
                    color:#38bdf8; font-size:0.92rem; text-decoration:underline dotted rgba(56,189,248,0.5); text-underline-offset:3px;
                  ">${k}</span>
                  <div style="display:flex; align-items:baseline; gap:5px; white-space:nowrap;">
                    <span style="font-size:1.02rem; font-weight:700; color:#f8fafc;">${(pl.stats[k] || 0).toLocaleString()}</span>
                    ${optBonus > 0 ? `<span style="color:#38bdf8; font-size:0.78rem; font-weight:700; background:rgba(56,189,248,0.12); padding:1px 5px; border-radius:4px; border:1px solid rgba(56,189,248,0.25);" title="โบนัสจาก Option อุปกรณ์">+${optBonus}</span>` : ''}
                    ${pend[k] ? `<span style="color:#4ade80; font-size:0.85rem; font-weight:700; background:rgba(74,222,128,0.12); padding:1px 6px; border-radius:4px; border:1px solid rgba(74,222,128,0.3);">+${pend[k].toLocaleString()}</span>` : ''}
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                  ${canSub ? `<button class="btn-stat-sub" data-stat="${k}" data-amt="all" style="${bs} background:#7f1d1d;" title="ล้างทั้งหมด">ล้าง</button>` : ''}
                  ${canSub ? `<button class="btn-stat-sub" data-stat="${k}" data-amt="1" style="${bs} background:#475569;" title="ลด 1 แต้ม">−1</button>` : ''}
                  ${canSub && canAdd ? '<span style="width:1px; height:18px; background:rgba(255,255,255,0.2); margin:0 2px;"></span>' : ''}
                  ${addBtn(1, '+1', '#2563eb')}
                  ${addBtn(10, '+10', '#1d4ed8')}
                  ${addBtn('max', 'MAX', '#b45309')}
                </div>
              </div>`;
            }).join('')}
          </div>
          ${pendTotal > 0 ? `<div style="display:flex; gap:8px; margin-top:12px;">
            <button id="btn-stat-confirm" style="flex:1; padding:7px; background:#16a34a; color:#fff; border:none; border-radius:5px; cursor:pointer; font-weight:700; font-size:0.85rem; box-shadow:0 2px 6px rgba(22,163,74,0.3);">✅ ยืนยัน (${pendTotal.toLocaleString()} แต้ม)</button>
            <button id="btn-stat-cancel" style="padding:7px 14px; background:#475569; color:#fff; border:none; border-radius:5px; cursor:pointer; font-size:0.85rem;">ยกเลิก</button>
          </div>` : ''}
        </div>
        <div style="background:rgba(0,0,0,0.3); padding:12px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); font-size:0.85rem; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="font-weight:700; font-size:0.9rem; margin-bottom:10px; color:#fbbf24; display:flex; align-items:center; gap:6px;">
              <span>⚔️</span> ข้อมูลพลังรบรวม (Combat Stats)
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${row('❤️', 'Max HP', prev('hp', v => Number(Number(v || 0).toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 })))}
              ${row('⚔️', 'ATK', prev('atk', v => Number(Number(v || 0).toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 })))}
              ${row('🔮', 'MATK', prev('matk', v => Number(Number(v || 0).toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 })))}
              ${row('🛡️', 'DEF', prev('def', v => Number(Number(v || 0).toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 })))}
              ${row('⚡', 'ASPD', prev('aspd', v => `${Number(v).toFixed(2)}/s`))}
              ${row('🎯', 'Crit Rate', prev('crit', v => `${(Number(v) * 100).toFixed(2)}%`))}
              ${row('💥', 'Crit Damage', prev('cdmg', v => `${(Number(v) * 100).toFixed(2)}%`))}
              ${row('👟', 'Move Speed', prev('move', v => `${(Number(v) * 100).toFixed(2)}%`))}
            </div>
          </div>
        </div>
      </div>
    `;

    body.querySelectorAll('.stat-name').forEach(el => {
      el.addEventListener('mouseenter', () => this.showStatInfo(el.dataset.stat, el));
      el.addEventListener('mouseleave', () => this.hideStatInfo());
      el.addEventListener('click', () => this.showStatInfo(el.dataset.stat, el)); // touch devices
    });

    const confirmBtn = body.querySelector('#btn-stat-confirm');
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
      STAT_KEYS.forEach(k => { for (let i = 0; i < (pend[k] || 0); i++) this.player.allocateStat(k); pend[k] = 0; });
      this.renderStatusModal();
      this.updateHUD();
    });
    const cancelBtn = body.querySelector('#btn-stat-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      STAT_KEYS.forEach(k => { pend[k] = 0; });
      this.renderStatusModal();
    });
    const resetBtn = body.querySelector('#btn-stat-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (!confirm('ยืนยันรีเซ็ตสเตตัสทั้งหมด? แต้มที่อัพไว้จะคืนให้นำไปจัดสรรใหม่ (ฟรี)')) return;
      STAT_KEYS.forEach(k => { pend[k] = 0; });
      this.player.resetStats();
      this.renderStatusModal();
      this.updateHUD();
    });

    // Press-and-hold on + / - repeats (slow start, then faster); bound once on the stable container
    if (!body._holdBound) {
      body._holdBound = true;
      let delay = null, tick = null;
      const stop = () => { clearTimeout(delay); clearInterval(tick); delay = tick = null; };
      const step = (k, dir, amt) => {
        const p = this.pendingStats || (this.pendingStats = {});
        const left = this.player.statPoints - STAT_KEYS.reduce((n, key) => n + (p[key] || 0), 0);
        let n = amt === 'max' || amt === 'all' ? Infinity : parseInt(amt, 10) || 1;
        n = dir > 0 ? Math.min(n, left) : Math.min(n, p[k] || 0);
        if (n <= 0) return false;
        p[k] = (p[k] || 0) + dir * n;
        this.renderStatusModal();
        return true;
      };
      body.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.btn-stat-add, .btn-stat-sub');
        if (!btn || btn.disabled) return;
        e.preventDefault();
        const k = btn.dataset.stat, amt = btn.dataset.amt;
        const dir = btn.classList.contains('btn-stat-add') ? 1 : -1;
        stop();
        if (!step(k, dir, amt)) return;
        if (amt !== '1') return; // hold-to-repeat only for single steps
        delay = setTimeout(() => {
          tick = setInterval(() => { if (!step(k, dir, 1)) stop(); }, 110);
        }, 400);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => body.addEventListener(ev, stop));
      document.addEventListener('pointerup', stop);
    }
  }

  // Tooltip explaining what each point of a stat gives (hover the stat name)
  showStatInfo(k, anchor) {
    const INFO = {
      str: ['STR (พลังกาย)', ['ATK +3 ต่อ 1 แต้ม เมื่อใช้อาวุธประชิด (มือเปล่า/กิ่งไม้/ดาบ)', 'ATK +1 ต่อ 1 แต้ม เมื่อใช้ธนู/คฑา', 'ดาเมจสกิลที่สเกลตาม STR']],
      agi: ['AGI (ความคล่องแคล่ว)', ['ASPD +0.015 ต่อ 1 แต้ม', 'Move Speed +0.3% ต่อ 1 แต้ม (สูงสุด +40%)', 'ดาเมจสกิลที่สเกลตาม AGI']],
      vit: ['VIT (ความอึด)', ['Max HP +18 ต่อ 1 แต้ม', 'DEF +1.5 ต่อ 1 แต้ม', 'ดาเมจสกิลที่สเกลตาม VIT']],
      dex: ['DEX (ความแม่นยำ)', ['ATK +3 ต่อ 1 แต้ม เมื่อใช้ธนู', 'ATK +1 ต่อ 1 แต้ม เมื่อใช้อาวุธอื่น', 'ดาเมจสกิลที่สเกลตาม DEX']],
      int: ['INT (สติปัญญา)', ['MATK +3 ต่อ 1 แต้ม เมื่อใช้คฑา', 'Max SP +4 ต่อ 1 แต้ม', 'SP ฟื้นตัว +0.1/วินาที ต่อ 1 แต้ม', 'ดาเมจสกิลที่สเกลตาม INT']],
      luk: ['LUK (โชค)', ['Crit Rate +0.5% ต่อ 1 แต้ม (สูงสุด 75%)', 'ดาเมจสกิลที่สเกลตาม LUK']]
    };
    const [title, lines] = INFO[k] || [k.toUpperCase(), []];
    this.hideStatInfo();
    const tip = document.createElement('div');
    tip.id = 'stat-info-tip';
    tip.style.cssText = 'position:fixed; z-index:10000; width:min(300px, 86vw); background:#0f172a; border:1px solid rgba(245,158,11,0.5); border-radius:8px; padding:10px 14px; color:#e2e8f0; box-shadow:0 6px 20px rgba(0,0,0,0.5); pointer-events:none;';
    tip.innerHTML = `
      <div style="font-weight:700; color:#f59e0b; margin-bottom:6px;">${title}</div>
      <div style="font-size:0.72rem; color:#94a3b8; margin-bottom:4px;">ทุก 1 แต้มที่อัพ จะได้:</div>
      <ul style="margin:0 0 0 16px; padding:0; font-size:0.8rem; line-height:1.55;">${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
    document.body.appendChild(tip);
    const r = anchor.getBoundingClientRect(), t = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(r.left, window.innerWidth - t.width - 8)) + 'px';
    tip.style.top = (r.bottom + t.height + 12 > window.innerHeight ? Math.max(8, r.top - t.height - 6) : r.bottom + 6) + 'px';
  }

  hideStatInfo() { document.getElementById('stat-info-tip')?.remove(); }

  // Live Paper-doll Preview of the player character inside the inventory / equipment window
  drawPlayerPreview(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const zoom = this.previewZoom || 1.0;
    const panX = this.previewPanX || 0;
    const panY = this.previewPanY || 0;

    const eq = this.player.equipment || {};
    const mountId = eq.mount;
    const isRiding = !!(this.player.isMounted && mountId && ITEMS[mountId]);

    const look = {
      hat: ITEMS[eq.hat],
      hair: ITEMS[eq.hair],
      face: ITEMS[eq.face],
      mouth: ITEMS[eq.mouth],
      head: ITEMS[eq.head] || { part: 'head_0', partW: 131, partY: 134 },
      outfit: ITEMS[eq.outfit],
      back: ITEMS[eq.back],
      shield: eq.offhand,
      weapon: eq.weapon,
      mount: mountId,
      riding: isRiding
    };

    const getImg = (src) => {
      let img = this.gameEngine ? this.gameEngine.getSheet(src) : null;
      if (!img) {
        if (this.gameEngine && this.gameEngine.sheetImages && this.gameEngine.sheetImages[src]) {
          const entry = this.gameEngine.sheetImages[src];
          if (entry.img && !entry._invHooked) {
            entry._invHooked = true;
            const oldOnload = entry.img.onload;
            entry.img.onload = () => {
              if (oldOnload) oldOnload();
              const cv = document.getElementById('inv-player-preview');
              if (cv) this.drawPlayerPreview(cv);
            };
          }
        }
      }
      return img;
    };

    // Calculate base scale & coordinates
    // In game: PLAYER_BODY_H = 58, MODEL.h = 301. Ground is at y = 24 in world units.
    const unitScale = (isRiding ? 2.3 : 3.4) * zoom;
    const cx = w / 2 + panX;
    const groundY = (h - 38) + panY;

    // Floor shadow / pedestal
    const shadowW = (isRiding ? 92 : 48) * zoom;
    const grad = ctx.createRadialGradient(cx, groundY, 4, cx, groundY, shadowW);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, groundY, shadowW, 13 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    // Translate origin to ground (where y = 24 in world units)
    ctx.translate(cx, groundY - 24 * unitScale);
    ctx.scale(unitScale, unitScale);

    let seatY = 0, seatClip = 0, mountFront = null;

    if (isRiding && ITEMS[mountId]) {
      const mi = ITEMS[mountId];
      const ms = PLAYER_SPRITES.mounts[mountId];
      const img = ms && getImg(`assets/sprites/mounts/${mountId}.png`);
      if (img) {
        const MOUNT_H = { mount_runner: 50, mount_wolf: 40, mount_unicorn: 62, mount_drake: 44 };
        const SEAT = { mount_runner: [0.5, 0.4], mount_wolf: [0.52, 0.3], mount_unicorn: [0.43, 0.3], mount_drake: [0.58, 0.5] };
        const km = (MOUNT_H[mountId] || 50) * (mi.scale || 1) / ms.h;
        const mw = ms.w * km, mh = ms.h * km;
        const flip = mi.flip === 'yes' ? -1 : 1;
        const seat = [mi.seatX ?? (SEAT[mountId] ? SEAT[mountId][0] : 0.5), mi.seatY ?? (SEAT[mountId] ? SEAT[mountId][1] : 0.4)];
        const drawMount = () => {
          ctx.save();
          ctx.translate((mi.offX || 0), 24 + (mi.offY || 0));
          ctx.scale(flip, 1);
          ctx.drawImage(img, -mw / 2, -mh, mw, mh);
          ctx.restore();
        };
        if (mi.layer !== 'front') drawMount();
        const sx = ((flip > 0 ? seat[0] : 1 - seat[0]) - 0.5) * mw + (mi.offX || 0);
        seatY = 24 + (mi.offY || 0) - mh + seat[1] * mh;
        ctx.translate(sx, seatY - 24 + (mi.seatDrop ?? 6));
        seatClip = mi.seatClip ?? 0;
        if (mi.layer === 'front') {
          mountFront = () => {
            ctx.save();
            ctx.translate(-sx, -(seatY - 24 + (mi.seatDrop ?? 6)));
            drawMount();
            ctx.restore();
          };
        }
      }
    } else if (!isRiding && mountId && ITEMS[mountId]) {
      // Standing beside mount: draw mount next to player as a companion
      const mi = ITEMS[mountId];
      const ms = PLAYER_SPRITES.mounts[mountId];
      const img = ms && getImg(`assets/sprites/mounts/${mountId}.png`);
      if (img) {
        const MOUNT_H = { mount_runner: 50, mount_wolf: 40, mount_unicorn: 62, mount_drake: 44 };
        const km = (MOUNT_H[mountId] || 50) * (mi.scale || 1) / ms.h;
        const mw = ms.w * km * 0.72, mh = ms.h * km * 0.72;
        const flip = mi.flip === 'yes' ? 1 : -1;
        ctx.save();
        ctx.translate(38 + (mi.offX || 0), 24 + (mi.offY || 0));
        ctx.scale(flip, 1);
        ctx.drawImage(img, -mw / 2, -mh, mw, mh);
        ctx.restore();
      }
    }

    // Shield (behind body)
    const sh = look.shield && ITEMS[look.shield];
    const simg = sh && getImg(`assets/sprites/player/parts/${look.shield}.png`);
    const drawShield = () => {
      if (!simg) return;
      const sm = PLAYER_SPRITES.parts[look.shield];
      if (!sm) return;
      const sw = 20 * (sh.scale ?? 1), shh = sw * sm.h / sm.w;
      ctx.save();
      ctx.translate(5 + (sh.offX || 0), 3 + (sh.offY || 0));
      if (sh.flip === 'yes') ctx.scale(-1, 1);
      ctx.drawImage(simg, -sw / 2, -shh / 2, sw, shh);
      ctx.restore();
    };
    if (sh && sh.layer === 'behind') drawShield();

    // Player paper doll (body + outfit + wings + head + hair + face + mouth + hat)
    {
      const kb = (58 * (isRiding ? 0.95 : 1)) / 301;
      ctx.save();
      if (isRiding && seatClip > 0) {
        ctx.beginPath();
        ctx.rect(-80, -120, 160, 120 + 24 - seatClip);
        ctx.clip();
      }
      drawLook(ctx, getImg, look, kb);
      ctx.restore();
    }

    if (sh && sh.layer !== 'behind') drawShield();
    if (mountFront) mountFront();

    // Weapon in hand (right hand)
    if (look.weapon && ITEMS[look.weapon]) {
      const it = ITEMS[look.weapon];
      const ws = weaponSprite(look.weapon);
      const wImg = ws && getImg(ws.src);
      if (wImg) {
        ctx.save();
        const wType = it.weaponType || 'sword';
        if (wType === 'bow') {
          ctx.translate(10, 2);
          ctx.rotate(0.08);
          const dh = Math.min(ws.h * 0.38, 60);
          const dw = dh * ws.w / ws.h;
          ctx.drawImage(wImg, -dw / 2, -dh * 0.5, dw, dh);
        } else if (wType === 'stick' || wType === 'staff') {
          ctx.translate(8, 6);
          ctx.rotate(0.35);
          const dh = Math.min(ws.h * 0.40, 64);
          const dw = dh * ws.w / ws.h;
          ctx.drawImage(wImg, -dw / 2, -dh * 0.78, dw, dh);
        } else if (wType === 'gun') {
          ctx.translate(8, 4);
          ctx.rotate(0.2);
          const dh = Math.min(ws.h * 0.35, 52);
          const dw = dh * ws.w / ws.h;
          ctx.drawImage(wImg, -dw / 2, -dh * 0.65, dw, dh);
        } else if (wType === 'book') {
          ctx.translate(9, 6);
          ctx.rotate(0.15);
          const dh = Math.min(ws.h * 0.38, 50);
          const dw = dh * ws.w / ws.h;
          ctx.drawImage(wImg, -dw / 2, -dh * 0.5, dw, dh);
        } else {
          ctx.translate(8, 2);
          ctx.rotate(0.35);
          const dh = Math.min(ws.h * 0.36, 58);
          const dw = dh * ws.w / ws.h;
          ctx.drawImage(wImg, -dw / 2, -dh * 0.8, dw, dh);
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // 2. Inventory & Equipment Modal: Left = Equipment & Live Character Preview, Right = Bag items
  renderInventoryModal() {
    const body = document.getElementById('modal-inventory-body');
    if (!body) return;

    // Preserve scroll position of items grid across equips
    const oldScrollEl = body.querySelector('.inv-grid-scroll');
    const prevScrollTop = oldScrollEl ? oldScrollEl.scrollTop : 0;

    const TABS = [
      { id: 'fashion', label: '🥋 ชุด & ปีก', match: it => ['outfit', 'back'].includes(it.type) },
      { id: 'all', label: '🎒 ทั้งหมด', match: () => true },
      { id: 'combat', label: '⚔️ อาวุธ & โล่', match: it => ['weapon', 'shield'].includes(it.type) },
      { id: 'headwear', label: '🎩 หมวก & ผม', match: it => ['hat', 'hair', 'face', 'mouth', 'head'].includes(it.type) },
      { id: 'consumable', label: '🧪 ของใช้', match: it => it.type === 'consumable' },
      { id: 'material', label: '🦴 วัสดุ', match: it => it.type === 'material' },
      { id: 'other', label: '🐾 สัตว์เลี้ยง/ขี่', match: it => ['pet', 'mount'].includes(it.type) }
    ];
    if (!TABS.some(t => t.id === this.invTab)) this.invTab = 'fashion'; // Default to fashion for easy dressing
    const tab = TABS.find(t => t.id === this.invTab);

    // Equipped items: excluded from the right bag so they only appear on the left equipment slots
    const equippedIds = new Set(Object.values(this.player.equipment).filter(Boolean));
    const owned = Object.keys(this.player.inventory).filter(k => ITEMS[k] && this.player.inventory[k] > 0 && !equippedIds.has(k));
    const countOf = t => owned.filter(k => t.match(ITEMS[k])).length;

    const searchQ = (this.invSearch || '').trim().toLowerCase();
    const shown = owned.filter(k => {
      const it = ITEMS[k];
      if (!tab.match(it)) return false;
      if (searchQ) {
        return (it.name && it.name.toLowerCase().includes(searchQ)) ||
               (it.desc && it.desc.toLowerCase().includes(searchQ)) ||
               k.toLowerCase().includes(searchQ);
      }
      return true;
    });

    // Equipped slots for the Left Column
    const GEAR_SLOTS = [
      { slot: 'outfit', label: 'ชุดแฟชั่น', icon: '🥋' },
      { slot: 'back', label: 'ปีก/ผ้าคลุม', icon: '🪽' },
      { slot: 'weapon', label: 'อาวุธขวา', icon: '⚔️' },
      { slot: 'offhand', label: 'โล่ซ้าย', icon: '🛡️' },
      { slot: 'hat', label: 'หมวก', icon: '🎩' },
      { slot: 'hair', label: 'ทรงผม', icon: '💇' },
      { slot: 'face', label: 'ใบหน้า', icon: '👀' },
      { slot: 'mouth', label: 'ปาก', icon: '👄' },
      { slot: 'pet', label: 'สัตว์เลี้ยง', icon: '🐾' },
      { slot: 'mount', label: 'สัตว์ขี่', icon: '🐎' }
    ];

    const slotCardHtml = (gs) => {
      const itemId = this.player.equipment[gs.slot];
      const it = itemId ? ITEMS[itemId] : null;
      const enh = itemId ? this.player.getItemEnhance(itemId) : null;
      const enhLevel = enh ? enh.level : 0;
      return `
        <div class="equip-slot-card" data-slot="${gs.slot}" data-id="${itemId || ''}" style="
          position: relative;
          display: flex; align-items: center; gap: 7px;
          background: ${it ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
          border: 1px solid ${it ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
          border-radius: 8px; padding: 5px 8px; user-select: none; transition: all 0.15s;
          cursor: ${it && gs.slot !== 'head' ? 'pointer' : 'default'};
          height: 38px; box-sizing: border-box;
        " title="${it ? `${enhLevel > 0 ? `+${enhLevel} ` : ''}${it.name} (คลิก ✕ หรือการ์ดเพื่อถอดคืนกระเป๋า)` : `${gs.label} (ว่าง)`}">
          <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.35); border-radius: 6px; flex-shrink: 0; font-size: 16px; position:relative;">
            ${it ? itemIconHtml(it.id, it.icon, 26) : `<span style="opacity: 0.35; font-size: 14px;">${gs.icon}</span>`}
          </div>
          <div style="flex: 1; min-width: 0; font-size: 0.74rem; font-weight: 700; color: ${it ? '#93c5fd' : '#64748b'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display:flex; align-items:center; gap:4px;">
            ${enhLevel > 0 ? `<span style="background:${enhanceColor(enhLevel)}; color:#000; font-size:0.65rem; font-weight:900; padding:1px 4px; border-radius:4px; line-height:1;">+${enhLevel}</span>` : ''}
            <span>${gs.label}</span>
          </div>
          ${it && gs.slot !== 'head' ? `
            <button class="btn-slot-unequip" data-slot="${gs.slot}" title="ถอดชิ้นนี้คืนกระเป๋า" style="
              width: 20px; height: 20px; border: none; border-radius: 4px;
              background: rgba(239, 68, 68, 0.25); color: #fca5a5;
              font-size: 0.7rem; font-weight: 700; cursor: pointer;
              display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            ">✕</button>
          ` : ''}
        </div>
      `;
    };

    const slotsGridHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%;">
        ${GEAR_SLOTS.map(slotCardHtml).join('')}
      </div>
    `;

    // Tabs HTML
    const tabsHtml = TABS.map(t => {
      const active = t.id === tab.id;
      return `<button class="btn-inv-tab" data-tab="${t.id}" style="
        padding: 5px 10px; border: none; border-radius: 6px; cursor: pointer;
        font-size: 0.76rem; font-weight: 700; transition: all 0.15s;
        background: ${active ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.06)'};
        color: ${active ? '#fff' : '#94a3b8'};
        box-shadow: ${active ? '0 2px 6px rgba(37,99,235,0.4)' : 'none'};
      ">${t.label} <span style="font-size: 0.68rem; opacity: 0.85;">(${countOf(t)})</span></button>`;
    }).join('');

    // Item slots in bag
    const slotStyle = 'position:relative; aspect-ratio:1; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.04); border-radius:8px; cursor:pointer; user-select:none; transition:all 0.12s;';
    let invHtml = '<div class="inv-items-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(56px, 1fr)); gap:6px;">';
    if (shown.length === 0) {
      invHtml += '<div style="color:#94a3b8; font-size:0.85rem; grid-column:1/-1; padding:30px 10px; text-align:center;">ไม่มีไอเทมในหมวดนี้ หรือถูกสวมใส่อยู่</div>';
    } else {
      shown.forEach(k => {
        const item = ITEMS[k];
        const enh = this.player.getItemEnhance(k);
        const enhLevel = enh ? enh.level : 0;
        invHtml += `
          <div class="inv-slot" data-id="${k}" title="${item.name}" style="${slotStyle} border:1px solid rgba(255,255,255,0.1);">
            <span style="font-size:28px; display:flex;">${itemIconHtml(k, item.icon, 40)}</span>
            ${enhLevel > 0 ? `<span style="position:absolute; top:2px; left:3px; font-size:0.68rem; font-weight:900; color:${enhanceColor(enhLevel)}; text-shadow:0 0 3px #000, 0 1px 2px #000; z-index:2; pointer-events:none;">+${enhLevel}</span>` : ''}
            <span style="position:absolute; right:3px; bottom:1px; font-size:0.68rem; color:#f59e0b; text-shadow:0 0 3px #000; font-weight:700;">${this.player.inventory[k] > 1 ? this.player.inventory[k] : ''}</span>
          </div>`;
      });
    }
    invHtml += '</div>';

    body.innerHTML = `
      <div class="inv-two-col" style="display: flex; gap: 14px; align-items: stretch; height: 100%; min-height: 0; box-sizing: border-box; overflow: hidden;">
        <!-- LEFT COLUMN: Character Live Preview & Equipment Slots -->
        <div class="inv-left-col" style="
          flex: 0 0 316px; width: 316px; display: flex; flex-direction: column; gap: 8px;
          background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px; padding: 10px; box-sizing: border-box;
          height: 100%; min-height: 0; overflow-y: auto;
        ">
          <!-- Character Preview Frame -->
          <div style="
            position: relative; width: 100%; border-radius: 10px;
            background: radial-gradient(circle at 50% 35%, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 1));
            border: 1px solid rgba(245, 158, 11, 0.4);
            box-shadow: inset 0 0 25px rgba(0,0,0,0.7), 0 4px 15px rgba(0,0,0,0.4);
            display: flex; flex-direction: column; align-items: center; padding: 6px 6px 8px 6px; box-sizing: border-box; flex-shrink: 0;
          ">
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #94a3b8; font-weight: 700; margin-bottom: 4px; padding: 0 4px;">
              <span>👤 ${this.player.name} · <b style="color: #38bdf8;">Lv.${this.player.baseLevel}</b></span>
              ${this.player.equipment.mount ? `
                <button id="btn-preview-toggle-mount" title="คลิกเพื่อสลับระหว่างขี่สัตว์ หรือ ยืนปกติ" style="
                  padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.7rem; font-weight: 700;
                  border: 1px solid ${this.player.isMounted ? 'rgba(245, 158, 11, 0.8)' : 'rgba(255, 255, 255, 0.15)'};
                  background: ${this.player.isMounted ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(217, 119, 6, 0.45))' : 'rgba(255, 255, 255, 0.06)'};
                  color: ${this.player.isMounted ? '#fef08a' : '#94a3b8'};
                  box-shadow: ${this.player.isMounted ? '0 0 8px rgba(245,158,11,0.4)' : 'none'};
                ">
                  ${this.player.isMounted ? '🏇 ขี่สัตว์พาหนะ' : '🚶 ยืนปกติ'}
                </button>
              ` : ''}
            </div>

            <!-- Canvas Viewport -->
            <div style="position: relative; width: 100%; height: 285px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 8px; background: rgba(0,0,0,0.25);">
              <canvas id="inv-player-preview" width="294" height="285" style="width: 294px; height: 285px; image-rendering: auto; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.65)); cursor: grab;"></canvas>

              <!-- Zoom Controls overlay on top-right -->
              <div style="
                position: absolute; top: 6px; right: 6px; display: flex; align-items: center; gap: 4px;
                background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(4px); padding: 2px 6px;
                border-radius: 16px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              ">
                <button id="btn-preview-zoom-out" title="ซูมออก (-)" style="width: 20px; height: 20px; border-radius: 50%; border: none; background: rgba(255,255,255,0.12); color: #fff; font-size: 13px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">−</button>
                <span id="inv-preview-zoom-val" style="font-size: 0.68rem; color: #38bdf8; font-weight: 700; min-width: 38px; text-align: center;">${Math.round((this.previewZoom || 1) * 100)}%</span>
                <button id="btn-preview-zoom-in" title="ซูมเข้า (+)" style="width: 20px; height: 20px; border-radius: 50%; border: none; background: rgba(255,255,255,0.12); color: #fff; font-size: 13px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">+</button>
                <button id="btn-preview-zoom-reset" title="รีเซ็ตขนาด 100%" style="margin-left: 2px; padding: 1px 5px; border-radius: 4px; border: none; background: rgba(255,255,255,0.08); color: #cbd5e1; font-size: 0.65rem; font-weight: 600; cursor: pointer;">↺</button>
              </div>
            </div>

            <div style="font-size: 0.65rem; color: #64748b; margin-top: 4px;">🔍 ใช้ลูกกลิ้งเมาส์ซูม · ลากเพื่อเลื่อนดูรายละเอียด</div>
          </div>

          <!-- Equipment Slots Grid -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px; flex-shrink: 0;">
            <span style="font-size: 0.78rem; font-weight: 700; color: #fbbf24;">🛡️ ช่องอุปกรณ์ที่สวมใส่</span>
            <button id="btn-unequip-fashion-all" style="
              border: none; background: transparent; color: #f87171;
              font-size: 0.7rem; font-weight: 600; cursor: pointer; text-decoration: underline;
            ">ถอดชุด & ปีก</button>
          </div>
          ${slotsGridHtml}
        </div>

        <!-- RIGHT COLUMN: Items Grid with Tabs & Search -->
        <div class="inv-right-col" style="flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; height: 100%; min-height: 0; overflow: hidden;">
          <!-- Top Row: Tabs + Search -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center; justify-content: space-between; flex-shrink: 0;">
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">${tabsHtml}</div>
            <input type="text" id="inv-search-input" value="${this.invSearch || ''}" placeholder="🔍 ค้นหาไอเทม..." style="
              width: 125px; padding: 5px 8px; font-size: 0.74rem; border-radius: 6px;
              background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); color: #fff;
            "/>
          </div>

          <!-- Scrollable Items Grid -->
          <div class="inv-grid-scroll" style="
            flex: 1 1 0; min-height: 0; overflow-y: auto; padding-right: 4px;
            background: rgba(0,0,0,0.22); border-radius: 8px; padding: 8px;
            border: 1px solid rgba(255,255,255,0.06);
          ">
            ${invHtml}
          </div>

          <!-- Bottom Summary Bar -->
          <div style="
            display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
            font-size: 0.75rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px;
          ">
            <span>🪙 <b style="color:#fbbf24;">${(this.player.gold || 0).toLocaleString()}</b> Gold · 🎟️ <b style="color:#38bdf8;">${this.player.gachaTokens || 0}</b> Token</span>
            <span>⚡ คลิกไอเทมฝั่งขวาเพื่อสวมใส่ · คลิก ✕ ฝั่งซ้ายเพื่อถอดคืน</span>
          </div>
        </div>
      </div>
    `;

    // Render Character on Preview Canvas
    const previewCanvas = document.getElementById('inv-player-preview');
    if (previewCanvas) {
      this.drawPlayerPreview(previewCanvas);

      // Mouse Wheel Zoom
      previewCanvas.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        this.previewZoom = Math.max(0.4, Math.min(2.5, +( (this.previewZoom || 1) + delta ).toFixed(2)));
        this.drawPlayerPreview(previewCanvas);
        const zoomLbl = document.getElementById('inv-preview-zoom-val');
        if (zoomLbl) zoomLbl.textContent = Math.round(this.previewZoom * 100) + '%';
      }, { passive: false });

      // Drag to Pan
      let isDragging = false;
      let startX = 0, startY = 0;
      previewCanvas.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.clientX - (this.previewPanX || 0);
        startY = e.clientY - (this.previewPanY || 0);
        previewCanvas.style.cursor = 'grabbing';
      });
      const onMove = e => {
        if (!isDragging) return;
        this.previewPanX = e.clientX - startX;
        this.previewPanY = e.clientY - startY;
        this.drawPlayerPreview(previewCanvas);
      };
      const onUp = () => {
        if (isDragging) {
          isDragging = false;
          const cv = document.getElementById('inv-player-preview');
          if (cv) cv.style.cursor = 'grab';
        }
      };
      window.removeEventListener('mousemove', this._invPanMove);
      window.removeEventListener('mouseup', this._invPanUp);
      this._invPanMove = onMove;
      this._invPanUp = onUp;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    // Zoom Buttons
    const updateZoomDisplay = () => {
      const zoomLbl = document.getElementById('inv-preview-zoom-val');
      if (zoomLbl) zoomLbl.textContent = Math.round((this.previewZoom || 1) * 100) + '%';
      const cv = document.getElementById('inv-player-preview');
      if (cv) this.drawPlayerPreview(cv);
    };

    body.querySelector('#btn-preview-zoom-in')?.addEventListener('click', () => {
      this.previewZoom = Math.min(2.5, +( (this.previewZoom || 1) + 0.2 ).toFixed(2));
      updateZoomDisplay();
    });

    body.querySelector('#btn-preview-zoom-out')?.addEventListener('click', () => {
      this.previewZoom = Math.max(0.4, +( (this.previewZoom || 1) - 0.2 ).toFixed(2));
      updateZoomDisplay();
    });

    body.querySelector('#btn-preview-zoom-reset')?.addEventListener('click', () => {
      this.previewZoom = 1.0;
      this.previewPanX = 0;
      this.previewPanY = 0;
      updateZoomDisplay();
    });

    // Mount Toggle Button
    body.querySelector('#btn-preview-toggle-mount')?.addEventListener('click', () => {
      this.player.isMounted = !this.player.isMounted;
      this.player.saveToStorage();
      this.renderInventoryModal();
      this.updateHUD();
    });

    // Restore scroll position
    const newScrollEl = body.querySelector('.inv-grid-scroll');
    if (newScrollEl && prevScrollTop) {
      newScrollEl.scrollTop = prevScrollTop;
    }

    // Bind Search Input
    const searchInput = body.querySelector('#inv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.invSearch = e.target.value;
        this.renderInventoryModal();
        const inp = document.getElementById('inv-search-input');
        if (inp) {
          inp.focus();
          inp.selectionStart = inp.selectionEnd = inp.value.length;
        }
      });
    }

    // Bind Category Tabs
    body.querySelectorAll('.btn-inv-tab').forEach(b => {
      b.addEventListener('click', e => {
        this.invTab = e.currentTarget.dataset.tab;
        this.renderInventoryModal();
      });
    });

    // Bind Unequip All Fashion Button
    const unequipAllBtn = body.querySelector('#btn-unequip-fashion-all');
    if (unequipAllBtn) {
      unequipAllBtn.addEventListener('click', () => {
        this.player.unequip('outfit');
        this.player.unequip('back');
        this.gameEngine?.onLog('🥋 ถอดชุดและปีกทั้งหมดคืนกระเป๋า', 'system');
        this.renderInventoryModal();
        this.updateHUD();
      });
    }

    // Bind Slot Unequip Buttons
    body.querySelectorAll('.btn-slot-unequip').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const slot = e.currentTarget.dataset.slot;
        const itId = this.player.equipment[slot];
        const it = itId && ITEMS[itId];
        this.player.unequip(slot);
        if (it) this.gameEngine?.onLog(`ถอด ${it.name} คืนกระเป๋า`, 'system');
        this.renderInventoryModal();
        this.updateHUD();
      });
    });

    // Bind clicking on the equip slot card itself to unequip
    body.querySelectorAll('.equip-slot-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-slot-unequip')) return;
        const slot = card.dataset.slot;
        if (!slot || slot === 'head') return;
        const itId = this.player.equipment[slot];
        if (itId) {
          const it = ITEMS[itId];
          this.player.unequip(slot);
          if (it) this.gameEngine?.onLog(`ถอด ${it.name} คืนกระเป๋า`, 'system');
          this.renderInventoryModal();
          this.updateHUD();
        }
      });
    });

    // Tooltip handling
    let tip = document.getElementById('inv-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'inv-tooltip';
      tip.style.cssText = 'position:fixed; z-index:99999; display:none; pointer-events:none; gap:6px; align-items:flex-start; color:#fff; font-size:0.78rem; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.6));';
      document.body.appendChild(tip);
    }
    tip.style.display = 'none';

    const STAT_ROWS = [['atk', 'ATK'], ['def', 'DEF'], ['hp', 'Max HP'], ['speedPct', 'ความเร็วเดิน'], ['heal', 'HP ฟื้นฟู'], ['sp', 'SP ฟื้นฟู'], ['lootSpeed', 'เก็บของ']];
    const row = (label, val, extra = '') => `<div style="display:grid; grid-template-columns:78px 1fr; gap:6px; padding:2px 0; border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:#94a3b8;">${label}</span><span style="text-align:right; font-weight:600;">${val}${extra}</span></div>`;
    const panel = (title, inner, border) => `<div style="min-width:170px; max-width:220px; padding:8px 10px; background:rgba(15,23,42,0.97); border:1px solid ${border}; border-radius:8px;">${title}${inner}</div>`;
    const tipHtml = (k) => {
      const item = ITEMS[k];
      if (!item) return '';
      const isGear = GEAR_TYPES.includes(item.type);
      const curId = isGear ? this.player.equipment[SLOT_OF_TYPE[item.type]] : null;
      const cur = (curId && curId !== k) ? ITEMS[curId] : null;

      const enh = this.player.getItemEnhance(k);
      const curEnh = curId ? this.player.getItemEnhance(curId) : null;

      const head = (it, tag, tagColor, eLev = 0) => {
        const pfx = eLev > 0 ? `<span style="color:${enhanceColor(eLev)}; font-weight:800;">+${eLev}</span> ` : '';
        const tagExtra = eLev > 0 ? ` <span style="color:${enhanceColor(eLev)}; font-weight:600;">(ประสิทธิภาพ +${eLev}%)</span>` : '';
        return `<div style="font-weight:700; font-size:0.85rem;">${pfx}${it.name}</div><div style="color:${tagColor}; font-size:0.7rem; margin-bottom:4px;">${tag}${tagExtra}</div>`;
      };

      const stats = (it, other, eLev = 0, otherELev = 0) => STAT_ROWS.filter(([f]) => it[f] || (other && other[f])).map(([f, label]) => {
        const rawBase = it[f] || 0;
        const rawV = this.player.getEnhancedStat(rawBase, eLev, f);
        const v = typeof rawV === 'number' ? Number(rawV.toFixed(2)) : rawV;

        let extra = '';
        if (eLev > 0 && typeof rawBase === 'number' && (v - rawBase) !== 0) {
          extra += ` <span style="color:#38bdf8; font-size:0.68rem;">(+${Number((v - rawBase).toFixed(2))})</span>`;
        }
        if (other) {
          const rawOtherBase = other[f] || 0;
          const rawO = this.player.getEnhancedStat(rawOtherBase, otherELev, f);
          const oVal = typeof rawO === 'number' ? Number(rawO.toFixed(2)) : rawO;
          const d = Number((v - oVal).toFixed(2));
          if (d !== 0) extra += ` <span style="color:${d > 0 ? '#4ade80' : '#f87171'};">(${d > 0 ? '+' : ''}${d})</span>`;
        }
        return row(label, f === 'lootSpeed' ? `x${v}` : f === 'speedPct' ? `+${v}%` : `+${v}`, extra);
      }).join('');

      const renderOptionsSection = (eData) => {
        if (!eData || eData.level < 5) return '';
        const unlocked = this.player.getUnlockedOptionSlots(eData.level);
        const opts = eData.options || [];
        return `
          <div style="margin-top:6px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.15); font-size:0.72rem;">
            <div style="color:#fbbf24; font-weight:700; margin-bottom:2px;">✦ ออปชั่นเสริม (${opts.length}/${unlocked} ช่อง):</div>
            ${opts.map((opt, i) => {
              const info = STAT_INFO[opt.stat] || { label: opt.stat.toUpperCase(), icon: '✨' };
              return `<div style="color:#93c5fd; padding-left:4px;">${info.icon} ${info.label} <b style="color:#f8fafc;">+${opt.value}</b></div>`;
            }).join('')}
            ${unlocked > opts.length ? `<div style="color:#94a3b8; font-style:italic; padding-left:4px;">• ว่าง ${unlocked - opts.length} ช่อง (ไปสุ่มที่แท็บ Option)</div>` : ''}
          </div>
        `;
      };

      const typeLabel = { weapon: 'อาวุธ (มือขวา)', hat: 'หมวก', hair: 'ทรงผม', face: 'หน้าตา', mouth: 'ปาก', head: 'หัว', outfit: 'ชุด', back: 'ปีก / ผ้าคลุม', shield: 'โล่ (มือซ้าย)', mount: 'สัตว์ขี่', pet: 'สัตว์เลี้ยง (Pet)', consumable: 'ของใช้', material: 'วัสดุ' }[item.type] || '';
      const lv = item.reqLevel > 1 ? row('เลเวลที่ต้องการ', `Lv.${item.reqLevel}`, '').replace('<span style="text-align:right; font-weight:600;">', `<span style="text-align:right; font-weight:600; color:${this.player.baseLevel >= item.reqLevel ? '#e2e8f0' : '#ef4444'};">`) : '';
      const hint = isGear ? (curId === k ? '<div style="color:#4ade80; margin-top:4px;">สวมอยู่ (คลิกเพื่อถอด)</div>' : '<div style="color:#60a5fa; margin-top:4px;">คลิกเพื่อสวมใส่ทันที</div>')
        : (item.type === 'consumable' ? '<div style="color:#60a5fa; margin-top:4px;">ดับเบิลคลิกเพื่อใช้</div>' : '');
      const main = panel(head(item, typeLabel, '#94a3b8', enh?.level || 0), stats(item, cur, enh?.level || 0, curEnh?.level || 0) + renderOptionsSection(enh) + lv + (item.desc ? `<div style="color:#cbd5e1; margin-top:4px; font-size:0.72rem;">${item.desc}</div>` : '') + hint, '#3b82f6');
      if (!cur) return main;
      const cmp = panel(head(cur, 'ที่สวมอยู่ตอนนี้', '#4ade80', curEnh?.level || 0), stats(cur, null, curEnh?.level || 0) + renderOptionsSection(curEnh) + (cur.desc ? `<div style="color:#cbd5e1; margin-top:4px; font-size:0.72rem;">${cur.desc}</div>` : ''), '#16a34a');
      return main + cmp;
    };

    body.querySelectorAll('.inv-slot, .equip-slot-card').forEach(el => {
      const k = el.dataset.id;
      if (!k || !ITEMS[k]) return;
      const updatePos = (e) => {
        if (!e || e.clientX === undefined) return;
        const w = tip.offsetWidth || 200, h = tip.offsetHeight || 120;
        tip.style.left = Math.min(e.clientX + 14, window.innerWidth - w - 6) + 'px';
        tip.style.top = Math.min(e.clientY + 14, window.innerHeight - h - 6) + 'px';
      };
      el.addEventListener('mouseenter', (e) => {
        tip.innerHTML = tipHtml(k);
        tip.style.display = 'flex';
        updatePos(e);
      });
      el.addEventListener('mousemove', (e) => {
        updatePos(e);
      });
      el.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    });

    // Single Click on item slots -> Immediate Equip / Toggle!
    body.querySelectorAll('.inv-slot').forEach(el => {
      const k = el.dataset.id;
      if (!k || !ITEMS[k]) return;
      el.addEventListener('click', () => {
        tip.style.display = 'none';
        const item = ITEMS[k];
        if (GEAR_TYPES.includes(item.type)) {
          const slot = SLOT_OF_TYPE[item.type];
          if (this.player.equipment[slot] === k) {
            this.player.unequip(slot);
            this.gameEngine?.onLog(`ถอด ${item.name}`, 'system');
          } else {
            const res = this.player.equipItem(k);
            if (!res.ok) {
              this.gameEngine?.onLog(`🚫 สวมใส่ ${item.name} ไม่ได้: ${res.reason}`, 'system');
              return;
            }
            this.gameEngine?.onLog(`🛡️ สวมใส่ ${item.name}`, 'system');
          }
          this.renderInventoryModal();
          this.updateHUD();
        }
      });

      // Double-click for consumable usage
      el.addEventListener('dblclick', () => {
        const item = ITEMS[k];
        if (item.type !== 'material' && (item.heal > 0 || item.sp > 0 || item.exp > 0)) {
          tip.style.display = 'none';
          const res = this.player.useItem(k);
          if (res) {
            const parts = [];
            if (item.heal > 0) parts.push(`HP +${res.healed}`);
            if (item.sp > 0) parts.push(`SP +${res.restored}`);
            if (item.exp > 0) parts.push(`EXP +${res.exp}`);
            this.gameEngine?.onLog(`🧪 ใช้ ${res.itemName}: ${parts.join(' · ')}`, 'system');
          }
          this.renderInventoryModal();
          this.updateHUD();
        }
      });
    });
  }

  // Game Database (ข้อมูลเกม) window: Multi-tab Encyclopedia (Monsters, Items by Category, and Relics)
  renderInfoModal() {
    const body = document.getElementById('modal-info-body');
    if (!body) return;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const q = (this.infoSearch || '').trim().toLowerCase();
    const curTab = this.dbTab || 'monsters';
    const curMonFilter = this.dbMonFilter || 'all';
    const curItemFilter = this.dbItemFilter || 'all';
    const pct = (v) => `${(Number(v) * 100).toFixed(2)}%`;

    // Where each monster lives
    const mapsOf = (mid) => {
      const set = new Set(this.gameEngine.monsters.filter(m => m.templateId === mid).map(m => m.map));
      if (!set.size) ZONES.forEach(z => { if ((z.monsterIds || []).includes(mid)) set.add(z.id); });
      return ZONES.filter(z => set.has(z.id));
    };
    const here = this.gameEngine.currentZone.id;

    // Reverse drop lookup: which monsters drop this item
    const dropsFrom = (itemId) => {
      const res = [];
      for (const [mid, m] of Object.entries(MONSTERS)) {
        const d = (m.drops || []).find(x => x.itemId === itemId);
        if (d) res.push({ mid, m, chance: d.chance });
        if (itemId === `pet_${mid}` && m.petChance) res.push({ mid, m, chance: m.petChance, isPet: true });
        const r = RELICS[itemId];
        if (r && r.monsterId === mid && m.relicChance) res.push({ mid, m, chance: m.relicChance, isRelic: true });
      }
      return res;
    };

    // 1. Top Section Tabs (หัวข้อหลัก)
    const MAIN_TABS = [
      { id: 'monsters', label: '👹 มอนสเตอร์' },
      { id: 'items', label: '🎒 ไอเท็ม' },
      { id: 'relics', label: '💎 สมบัติ' }
    ];

    const mainTabsHtml = `<div class="db-tabs">
      ${MAIN_TABS.map(t => {
        const active = curTab === t.id;
        return `<button class="db-tab-btn ${active ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`;
      }).join('')}
    </div>`;

    // 2. Tab-specific content generation
    let subFiltersHtml = '';
    let gridContentHtml = '';
    let countText = '';
    let searchPlaceholder = '🔍 ค้นหาข้อมูลเกม...';

    if (curTab === 'monsters') {
      searchPlaceholder = '🔍 ค้นหามอนสเตอร์, เลเวล, ไอเทมดรอป, หรือแมพ...';
      const allList = Object.entries(MONSTERS).sort((a, b) => a[1].level - b[1].level);
      const filtered = allList.filter(([id, m]) => {
        if (curMonFilter === 'pet' && !m.petChance) return false;
        if (curMonFilter === 'relic' && !Object.values(RELICS).some(r => r.monsterId === id)) return false;
        if (!q) return true;
        const maps = mapsOf(id);
        const dropNames = (m.drops || []).map(d => ITEMS[d.itemId]?.name || '').join(' ').toLowerCase();
        const mapNames = maps.map(z => z.name).join(' ').toLowerCase();
        const text = `${id} ${m.name} ${dropNames} ${mapNames}`.toLowerCase();
        return text.includes(q);
      });

      const MON_FILTERS = [
        { id: 'all', label: '🌐 ทั้งหมด' },
        { id: 'pet', label: '🐾 สัตว์เลี้ยง' },
        { id: 'relic', label: '💎 สมบัติลับ' }
      ];

      subFiltersHtml = MON_FILTERS.map(f => {
        const active = curMonFilter === f.id;
        return `<button class="info-mon-filter-btn" data-filter="${f.id}" style="padding:4px 10px; border-radius:6px; border:1px solid ${active ? '#f59e0b' : 'rgba(255,255,255,0.1)'}; background:${active ? 'rgba(245,158,11,0.2)' : 'rgba(0,0,0,0.3)'}; color:${active ? '#fbbf24' : '#94a3b8'}; font-size:0.73rem; cursor:pointer; font-weight:${active ? '700' : '500'}; transition:all 0.15s ease;">${f.label}</button>`;
      }).join(' ');

      const cardsHtml = filtered.map(([id, m]) => {
        return `<div class="mon-card" data-mon="${id}">
          <div class="mon-card-avatar">
            ${monsterIconHtml(id, m.emoji, 136)}
          </div>
          <div class="mon-card-name" title="${esc(m.name)}">${esc(m.name)}</div>
          <div class="mon-card-sub">Lv.${m.level}</div>
        </div>`;
      }).join('');

      gridContentHtml = filtered.length ? `<div class="mon-grid-container">${cardsHtml}</div>` : '<div style="text-align:center; color:#64748b; padding:40px 0; font-size:0.85rem;">ไม่พบมอนสเตอร์ที่ตรงกับเงื่อนไข</div>';
      countText = `พบ <b>${filtered.length}</b> / ${allList.length}`;

    } else if (curTab === 'items') {
      searchPlaceholder = '🔍 ค้นหาไอเท็ม, สเตตัส, คำอธิบาย...';
      const ITEM_FILTERS = [
        { id: 'all', label: '🌐 ทั้งหมด' },
        { id: 'weapon', label: '⚔️ อาวุธ' },
        { id: 'armor', label: '🥋 ชุด' },
        { id: 'hat', label: '🪖 หมวก' },
        { id: 'shield', label: '🛡️ โล่' },
        { id: 'pet', label: '🐾 สัตว์เลี้ยง' },
        { id: 'mount', label: '🏇 สัตว์ขี่' },
        { id: 'back', label: '🪽 ปีก / ประดับ' },
        { id: 'consumable', label: '🧪 ยา / ของใช้' },
        { id: 'material', label: '📦 วัตถุดิบ' }
      ];

      subFiltersHtml = ITEM_FILTERS.map(f => {
        const active = curItemFilter === f.id;
        return `<button class="info-item-filter-btn" data-filter="${f.id}" style="padding:4px 10px; border-radius:6px; border:1px solid ${active ? '#38bdf8' : 'rgba(255,255,255,0.1)'}; background:${active ? 'rgba(56,189,248,0.2)' : 'rgba(0,0,0,0.3)'}; color:${active ? '#7dd3fc' : '#94a3b8'}; font-size:0.73rem; cursor:pointer; font-weight:${active ? '700' : '500'}; transition:all 0.15s ease; white-space:nowrap;">${f.label}</button>`;
      }).join(' ');

      const allList = Object.values(ITEMS);
      const filtered = allList.filter(it => {
        if (curItemFilter === 'weapon' && it.type !== 'weapon') return false;
        if (curItemFilter === 'armor' && it.type !== 'outfit' && it.type !== 'armor') return false;
        if (curItemFilter === 'hat' && it.type !== 'hat') return false;
        if (curItemFilter === 'shield' && it.type !== 'shield') return false;
        if (curItemFilter === 'pet' && it.type !== 'pet') return false;
        if (curItemFilter === 'mount' && it.type !== 'mount') return false;
        if (curItemFilter === 'back' && it.type !== 'back') return false;
        if (curItemFilter === 'consumable' && it.type !== 'consumable') return false;
        if (curItemFilter === 'material' && it.type !== 'material') return false;

        if (!q) return true;
        const text = `${it.id} ${it.name} ${it.desc || ''} ${it.type || ''}`.toLowerCase();
        return text.includes(q);
      });

      const itemBadgeHtml = (it) => {
        if (it.atk) return `<span class="item-badge" style="background:rgba(239,68,68,0.18); border:1px solid rgba(239,68,68,0.35); color:#fca5a5;">⚔️ ATK +${it.atk}</span>`;
        if (it.def) return `<span class="item-badge" style="background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.35); color:#93c5fd;">🛡️ DEF +${it.def}</span>`;
        if (it.speedPct) return `<span class="item-badge" style="background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.35); color:#6ee7b7;">🏇 วิ่ง +${Number(it.speedPct.toFixed(2))}%</span>`;
        if (it.lootSpeed) return `<span class="item-badge" style="background:rgba(236,72,153,0.18); border:1px solid rgba(236,72,153,0.35); color:#f472b6;">🐾 เก็บ x${Number(it.lootSpeed.toFixed(2))}</span>`;
        if (it.heal) return `<span class="item-badge" style="background:rgba(244,63,94,0.18); border:1px solid rgba(244,63,94,0.35); color:#fda4af;">❤️ +${it.heal} HP</span>`;
        if (it.sp) return `<span class="item-badge" style="background:rgba(14,165,233,0.18); border:1px solid rgba(14,165,233,0.35); color:#7dd3fc;">💧 +${it.sp} SP</span>`;
        if (it.exp) return `<span class="item-badge" style="background:rgba(234,179,8,0.18); border:1px solid rgba(234,179,8,0.35); color:#fde047;">⭐ +${it.exp} EXP</span>`;
        if (it.hp) return `<span class="item-badge" style="background:rgba(34,197,94,0.18); border:1px solid rgba(34,197,94,0.35); color:#86efac;">❤️ +${it.hp} HP</span>`;
        if (it.price) return `<span class="item-badge" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1;">💰 ${it.price.toLocaleString()}G</span>`;
        return `<span class="item-badge" style="background:rgba(100,116,139,0.15); border:1px solid rgba(100,116,139,0.25); color:#94a3b8;">${esc(it.type || 'ไอเท็ม')}</span>`;
      };

      const cardsHtml = filtered.map(it => {
        return `<div class="item-db-card" data-item="${it.id}">
          <div class="item-avatar">
            ${itemIconHtml(it.id, it.icon, 44)}
          </div>
          <div class="item-name" title="${esc(it.name)}">${esc(it.name)}</div>
          ${itemBadgeHtml(it)}
        </div>`;
      }).join('');

      gridContentHtml = filtered.length ? `<div class="item-grid-container">${cardsHtml}</div>` : '<div style="text-align:center; color:#64748b; padding:40px 0; font-size:0.85rem;">ไม่พบไอเท็มที่ตรงกับเงื่อนไข</div>';
      countText = `พบ <b>${filtered.length}</b> / ${allList.length}`;

    } else if (curTab === 'relics') {
      searchPlaceholder = '🔍 ค้นหาสมบัติลับ, มอนสเตอร์เจ้าของ, หรือบัฟสเตตัส...';
      const allList = Object.values(RELICS);
      const filtered = allList.filter(r => {
        if (!q) return true;
        const m = MONSTERS[r.monsterId];
        const text = `${r.id} ${r.name} ${r.bonusText || ''} ${r.desc || ''} ${m ? m.name : ''}`.toLowerCase();
        return text.includes(q);
      });

      const cardsHtml = filtered.map(r => {
        const m = MONSTERS[r.monsterId];
        return `<div class="relic-db-card" data-relic="${r.id}">
          <div class="relic-avatar">
            ${relicIconHtml(r.id, r.icon, 46)}
          </div>
          <div class="relic-name" title="${esc(r.name)}">${esc(r.name)}</div>
          <div class="relic-bonus" title="${esc(r.bonusText || '')}">✨ ${esc(r.bonusText || 'บัฟถาวร')}</div>
          <div class="relic-mon">${m ? `${m.emoji || '👾'} ${esc(m.name)}` : 'มอนสเตอร์ลึกลับ'}</div>
        </div>`;
      }).join('');

      gridContentHtml = filtered.length ? `<div class="relic-grid-container">${cardsHtml}</div>` : '<div style="text-align:center; color:#64748b; padding:40px 0; font-size:0.85rem;">ไม่พบสมบัติที่ตรงกับเงื่อนไข</div>';
      countText = `พบ <b>${filtered.length}</b> / ${allList.length}`;
    }

    // Modal Body HTML assembly
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${mainTabsHtml}
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" id="info-search" placeholder="${searchPlaceholder}" value="${esc(this.infoSearch || '')}" style="flex:1; padding:7px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background:rgba(0,0,0,0.35); color:#fff; font-size:0.8rem; outline:none;">
          <div style="font-size:0.75rem; color:#94a3b8; white-space:nowrap; padding:0 4px;">${countText}</div>
        </div>
        ${subFiltersHtml ? `<div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:2px;">${subFiltersHtml}</div>` : ''}
      </div>
      <div class="mon-grid-scroll" style="margin-top:6px;">
        ${gridContentHtml}
      </div>
    `;

    // Tooltip Handling
    let tip = document.getElementById('mon-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'mon-tooltip';
      tip.style.cssText = 'position:fixed; z-index:99999; display:none; pointer-events:none; width:310px; background:rgba(15,23,42,0.97); border:1.5px solid #f59e0b; border-radius:10px; padding:12px; box-shadow:0 12px 30px rgba(0,0,0,0.85), 0 0 15px rgba(245,158,11,0.25); color:#fff; font-size:0.75rem; backdrop-filter:blur(12px);';
      document.body.appendChild(tip);
    }
    tip.style.display = 'none';

    // Tooltip HTML for Monsters
    const monTipHtml = (id) => {
      const m = MONSTERS[id];
      if (!m) return '';
      const relic = Object.values(RELICS).find(r => r.monsterId === id);
      const maps = mapsOf(id);
      const total = (m.drops || []).reduce((a, d) => a + d.chance, 0);
      const missChance = Math.max(0, 1 - total);

      const dropsHtml = (m.drops || []).map(d => {
        const it = ITEMS[d.itemId];
        if (!it) return '';
        const pctColor = d.chance >= 0.2 ? '#4ade80' : d.chance >= 0.05 ? '#fbbf24' : '#c084fc';
        return `<div style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="display:inline-flex; align-items:center; gap:6px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${itemIconHtml(d.itemId, it.icon, 18)}
            <span style="font-size:0.73rem; color:#e2e8f0;">${esc(it.name)}</span>
          </span>
          <b style="color:${pctColor}; font-size:0.75rem; flex:none;">${pct(d.chance)}</b>
        </div>`;
      }).join('');

      const mapNames = maps.map(z => `<span style="padding:2px 7px; border-radius:4px; background:rgba(37,99,235,0.4); border:1px solid rgba(59,130,246,0.6); color:#93c5fd; font-size:0.68rem;">🗺️ ${esc(z.name)}</span>`).join(' ');

      return `
        <div style="display:flex; gap:12px; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
          <div style="width:64px; height:64px; flex:none; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); border-radius:10px; border:1px solid rgba(255,255,255,0.1);">
            ${monsterIconHtml(id, m.emoji, 60)}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.96rem; font-weight:800; color:#fbbf24; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(m.name)}</div>
            <div style="display:flex; gap:5px; margin-top:3px; align-items:center; font-size:0.68rem;">
              <span style="background:rgba(14,165,233,0.25); color:#38bdf8; padding:1px 6px; border-radius:4px; font-weight:700;">Lv.${m.level}</span>
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin:8px 0; background:rgba(0,0,0,0.4); padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.06); font-size:0.72rem;">
          <div><span style="color:#f87171;">❤️ HP:</span> <b style="color:#fff;">${m.hp.toLocaleString()}</b></div>
          <div><span style="color:#fbbf24;">⚔️ ATK:</span> <b style="color:#fff;">${m.atk}</b></div>
          <div><span style="color:#60a5fa;">🛡️ DEF:</span> <b style="color:#fff;">${m.def}</b></div>
          <div><span style="color:#c084fc;">⭐ EXP:</span> <b style="color:#fff;">${m.exp.toLocaleString()}</b></div>
        </div>

        <div style="margin-top:8px;">
          <div style="font-weight:700; color:#cbd5e1; font-size:0.74rem; margin-bottom:4px; display:flex; justify-content:space-between;">
            <span>🎁 ไอเทมที่ดรอป (Item Drops)</span>
            <span style="color:#94a3b8; font-weight:400; font-size:0.68rem;">🚫 ไม่ได้ของ ${pct(missChance)}</span>
          </div>
          <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:4px 8px;">
            ${dropsHtml || '<div style="color:#64748b; font-size:0.72rem; padding:4px 0;">ไม่มีไอเทมดรอป</div>'}
          </div>
        </div>

        <div style="margin-top:8px; display:flex; flex-direction:column; gap:4px; font-size:0.72rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 7px; background:rgba(236,72,153,0.1); border:1px solid rgba(236,72,153,0.25); border-radius:5px;">
            <span style="display:inline-flex; align-items:center; gap:4px; color:#f472b6;">
              🐾 <b>Pet สัตว์เลี้ยง</b> <span style="color:#cbd5e1; font-size:0.68rem;">(เก็บของ x${Number((ITEMS['pet_' + mid]?.lootSpeed || 1).toFixed(2))})</span>
            </span>
            <b style="color:#ec4899;">${pct(m.petChance || 0)}</b>
          </div>
          ${relic ? `
          <div style="padding:4px 7px; background:rgba(168,85,247,0.12); border:1px solid rgba(168,85,247,0.3); border-radius:5px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="display:inline-flex; align-items:center; gap:4px; color:#c084fc;">
                ${relicIconHtml(relic.id, relic.icon, 16)} <b>${esc(relic.name)}</b>
              </span>
              <b style="color:#a855f7;">${pct(m.relicChance || 0)}</b>
            </div>
            ${relic.bonusText ? `<div style="color:#e9d5ff; font-size:0.66rem; margin-top:2px;">✨ ${esc(relic.bonusText)}</div>` : ''}
          </div>` : ''}
        </div>

        <div style="margin-top:8px; font-size:0.72rem;">
          <div style="font-weight:700; color:#94a3b8; margin-bottom:3px;">🗺️ ถิ่นที่อยู่อาศัย (Habitat):</div>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            ${mapNames || '<span style="color:#64748b;">ยังไม่มีในแมพไหน</span>'}
          </div>
        </div>

        <div style="margin-top:10px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.12); text-align:center; color:#38bdf8; font-size:0.72rem; font-weight:700;">
          🚀 คลิกที่การ์ดเพื่อวาร์ปไปหาทันที
        </div>
      `;
    };

    // Tooltip HTML for Items
    const itemTipHtml = (id) => {
      const it = ITEMS[id];
      if (!it) return '';
      const drops = dropsFrom(id);
      const recipes = CRAFTING_RECIPES.filter(r => r.resultItemId === id);

      const typeLabels = {
        weapon: 'อาวุธ', outfit: 'ชุดเครื่องแต่งกาย', armor: 'ชุดเกราะ', hat: 'หมวก / ศีรษะ',
        shield: 'โล่ (มือซ้าย)', pet: 'สัตว์เลี้ยง (Pet)', mount: 'สัตว์ขี่ (Mount)',
        back: 'ปีก / ผ้าคลุม', consumable: 'ยาและของใช้', material: 'วัตถุดิบ'
      };
      const typeText = typeLabels[it.type] || it.type || 'ไอเท็ม';

      const statList = [];
      if (it.atk) statList.push(`<div><span style="color:#fbbf24;">⚔️ ATK:</span> <b style="color:#fff;">+${it.atk}</b></div>`);
      if (it.def) statList.push(`<div><span style="color:#60a5fa;">🛡️ DEF:</span> <b style="color:#fff;">+${it.def}</b></div>`);
      if (it.hp) statList.push(`<div><span style="color:#4ade80;">❤️ HP:</span> <b style="color:#fff;">+${it.hp}</b></div>`);
      if (it.speedPct) statList.push(`<div><span style="color:#34d399;">⚡ Move Speed:</span> <b style="color:#fff;">+${Number(it.speedPct.toFixed(2))}%</b></div>`);
      if (it.lootSpeed) statList.push(`<div><span style="color:#f472b6;">🐾 เก็บของเร็ว:</span> <b style="color:#fff;">x${Number(it.lootSpeed.toFixed(2))}</b></div>`);
      if (it.heal) statList.push(`<div><span style="color:#f87171;">❤️ ฟื้นฟู HP:</span> <b style="color:#fff;">+${it.heal}</b></div>`);
      if (it.sp) statList.push(`<div><span style="color:#38bdf8;">💧 ฟื้นฟู SP:</span> <b style="color:#fff;">+${it.sp}</b></div>`);
      if (it.exp) statList.push(`<div><span style="color:#facc15;">⭐ เพิ่ม EXP:</span> <b style="color:#fff;">+${it.exp}</b></div>`);

      const dropsHtml = drops.map(d => {
        const maps = mapsOf(d.mid);
        const mapStr = maps.map(m => m.name).join(', ') || 'ไม่มีข้อมูล';
        return `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="color:#e2e8f0;">${d.m.emoji || '👾'} <b>${esc(d.m.name)}</b> <span style="color:#94a3b8; font-size:0.65rem;">(Lv.${d.m.level} • ${mapStr})</span></span>
          <b style="color:#fbbf24;">${pct(d.chance)}</b>
        </div>`;
      }).join('');

      return `
        <div style="display:flex; gap:12px; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
          <div style="width:58px; height:58px; flex:none; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); border-radius:10px; border:1px solid rgba(255,255,255,0.1);">
            ${itemIconHtml(id, it.icon, 46)}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.96rem; font-weight:800; color:#38bdf8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(it.name)}</div>
            <div style="display:flex; gap:6px; margin-top:3px; align-items:center; font-size:0.68rem;">
              <span style="background:rgba(56,189,248,0.2); color:#7dd3fc; padding:1px 6px; border-radius:4px; font-weight:600;">${typeText}</span>
              ${it.reqLevel ? `<span style="background:rgba(245,158,11,0.2); color:#fbbf24; padding:1px 6px; border-radius:4px; font-weight:600;">Lv.${it.reqLevel}+</span>` : ''}
              ${it.price ? `<span style="color:#cbd5e1; margin-left:auto;">💰 ${it.price.toLocaleString()}G</span>` : ''}
            </div>
          </div>
        </div>

        ${statList.length ? `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin:8px 0; background:rgba(0,0,0,0.4); padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.06); font-size:0.72rem;">
          ${statList.join('')}
        </div>` : ''}

        ${it.desc ? `<div style="margin:8px 0; font-size:0.72rem; color:#cbd5e1; line-height:1.4; background:rgba(255,255,255,0.03); padding:6px 8px; border-radius:6px;">${esc(it.desc)}</div>` : ''}

        ${dropsHtml ? `
        <div style="margin-top:8px;">
          <div style="font-weight:700; color:#fbbf24; font-size:0.73rem; margin-bottom:4px;">🎁 ดรอปจากมอนสเตอร์:</div>
          <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:4px 8px; max-height:110px; overflow-y:auto;">
            ${dropsHtml}
          </div>
        </div>` : ''}

        ${recipes.length ? `
        <div style="margin-top:8px;">
          <div style="font-weight:700; color:#34d399; font-size:0.73rem; margin-bottom:4px;">🔨 คราฟต์ได้ที่โต๊ะช่างตีเหล็ก:</div>
          <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:4px 8px; font-size:0.7rem; color:#cbd5e1;">
            ${recipes.map(r => `<div>ค่าทำ: <b style="color:#fde047;">${r.goldCost}G</b> • วัตถุดิบ: ${r.materials.map(m => `${ITEMS[m.itemId]?.name || m.itemId} x${m.count}`).join(', ')}</div>`).join('')}
          </div>
        </div>` : ''}
      `;
    };

    // Tooltip HTML for Relics
    const relicTipHtml = (id) => {
      const r = RELICS[id];
      if (!r) return '';
      const m = MONSTERS[r.monsterId];
      const maps = r.monsterId ? mapsOf(r.monsterId) : [];
      const mapStr = maps.map(z => z.name).join(', ') || 'ไม่มีข้อมูล';

      return `
        <div style="display:flex; gap:12px; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
          <div style="width:60px; height:60px; flex:none; display:flex; align-items:center; justify-content:center; background:rgba(168,85,247,0.15); border-radius:10px; border:1px solid rgba(168,85,247,0.4); box-shadow:0 0 12px rgba(168,85,247,0.3);">
            ${relicIconHtml(id, r.icon, 48)}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.96rem; font-weight:800; color:#c084fc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(r.name)}</div>
            <div style="display:flex; gap:6px; margin-top:3px; align-items:center; font-size:0.68rem;">
              <span style="background:rgba(168,85,247,0.25); color:#d8b4fe; padding:1px 6px; border-radius:4px; font-weight:700;">💎 สมบัติลับถาวร</span>
            </div>
          </div>
        </div>

        <div style="margin:8px 0; background:rgba(236,72,153,0.15); border:1px solid rgba(236,72,153,0.35); padding:6px 10px; border-radius:6px; font-size:0.75rem; color:#fbcfe8; font-weight:700; text-align:center;">
          ✨ ${esc(r.bonusText || 'บัฟสเตตัสถาวร')}
        </div>

        ${r.desc ? `<div style="margin:8px 0; font-size:0.72rem; color:#cbd5e1; line-height:1.4; background:rgba(255,255,255,0.03); padding:6px 8px; border-radius:6px;">${esc(r.desc)}</div>` : ''}

        ${m ? `
        <div style="margin-top:8px; font-size:0.72rem;">
          <div style="font-weight:700; color:#fbbf24; margin-bottom:3px;">👾 ดรอปจากมอนสเตอร์:</div>
          <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 8px; display:flex; justify-content:space-between; align-items:center;">
            <span>${m.emoji || '👾'} <b>${esc(m.name)}</b> <span style="color:#94a3b8; font-size:0.68rem;">(Lv.${m.level} • 🗺️ ${mapStr})</span></span>
            <b style="color:#ec4899;">${pct(m.relicChance || 0.001)}</b>
          </div>
        </div>

        <div style="margin-top:10px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.12); text-align:center; color:#38bdf8; font-size:0.72rem; font-weight:700;">
          🚀 คลิกที่การ์ดเพื่อวาร์ปไปหา ${esc(m.name)} ทันที
        </div>` : ''}
      `;
    };

    // Tooltip position helper
    const updateTipPos = (e) => {
      const w = tip.offsetWidth || 310;
      const h = tip.offsetHeight || 300;
      let left = e.clientX + 16;
      let top = e.clientY + 12;
      if (left + w > window.innerWidth - 10) left = e.clientX - w - 16;
      if (top + h > window.innerHeight - 10) top = window.innerHeight - h - 10;
      if (top < 10) top = 10;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    };

    // Event binding: Monster Cards
    body.querySelectorAll('.mon-card').forEach(card => {
      const id = card.dataset.mon;
      card.addEventListener('mouseenter', () => {
        tip.innerHTML = monTipHtml(id);
        tip.style.display = 'block';
      });
      card.addEventListener('mousemove', updateTipPos);
      card.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
      card.addEventListener('click', () => {
        tip.style.display = 'none';
        const mon = MONSTERS[id];
        const maps = mapsOf(id);
        if (!maps.length) return;
        const targetZone = maps.find(z => z.id !== here) || maps[0];
        if (targetZone.id === here) {
          if (this.gameEngine && this.gameEngine.onLog) {
            this.gameEngine.onLog(`📍 คุณอยู่ในแผนที่ "${targetZone.name}" ที่มี ${mon ? mon.name : ''} อยู่แล้ว!`, 'system');
          }
          return;
        }
        this.showConfirm(`ต้องการเดินทางไป "${targetZone.name}" เพื่อล่า ${mon ? mon.name : ''} หรือไม่?`, () => this.gameEngine.changeMap(targetZone.id));
      });
    });

    // Event binding: Item Cards
    body.querySelectorAll('.item-db-card').forEach(card => {
      const id = card.dataset.item;
      card.addEventListener('mouseenter', () => {
        tip.innerHTML = itemTipHtml(id);
        tip.style.display = 'block';
      });
      card.addEventListener('mousemove', updateTipPos);
      card.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
      card.addEventListener('click', () => {
        const drops = dropsFrom(id);
        if (drops.length) {
          const targetMid = drops[0].mid;
          const mon = MONSTERS[targetMid];
          const maps = mapsOf(targetMid);
          if (!maps.length) return;
          const targetZone = maps.find(z => z.id !== here) || maps[0];
          this.showConfirm(`ต้องการเดินทางไป "${targetZone.name}" เพื่อฟาร์มดรอปไอเท็มนี้จาก ${mon ? mon.name : ''} หรือไม่?`, () => {
            tip.style.display = 'none';
            this.gameEngine.changeMap(targetZone.id);
          });
        }
      });
    });

    // Event binding: Relic Cards
    body.querySelectorAll('.relic-db-card').forEach(card => {
      const id = card.dataset.relic;
      card.addEventListener('mouseenter', () => {
        tip.innerHTML = relicTipHtml(id);
        tip.style.display = 'block';
      });
      card.addEventListener('mousemove', updateTipPos);
      card.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
      card.addEventListener('click', () => {
        const r = RELICS[id];
        if (!r || !r.monsterId) return;
        const mon = MONSTERS[r.monsterId];
        const maps = mapsOf(r.monsterId);
        if (!maps.length) return;
        const targetZone = maps.find(z => z.id !== here) || maps[0];
        this.showConfirm(`ต้องการเดินทางไป "${targetZone.name}" เพื่อล่า ${mon ? mon.name : ''} ชิงสมบัติ "${r.name}" หรือไม่?`, () => {
          tip.style.display = 'none';
          this.gameEngine.changeMap(targetZone.id);
        });
      });
    });

    // Top Section Tabs (มอนสเตอร์, ไอเท็ม, สมบัติ)
    body.querySelectorAll('.db-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dbTab = btn.dataset.tab;
        this.renderInfoModal();
      });
    });

    // Monster Subfilter Buttons
    body.querySelectorAll('.info-mon-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dbMonFilter = btn.dataset.filter;
        this.renderInfoModal();
      });
    });

    // Item Subfilter Buttons
    body.querySelectorAll('.info-item-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dbItemFilter = btn.dataset.filter;
        this.renderInfoModal();
      });
    });

    // Search input handler
    const inp = document.getElementById('info-search');
    if (inp) {
      inp.addEventListener('input', () => {
        this.infoSearch = inp.value;
        const pos = inp.selectionStart;
        this.renderInfoModal();
        const n = document.getElementById('info-search');
        if (n) { n.focus(); n.setSelectionRange(pos, pos); }
      });
    }
  }

  // Skills window: 4-slot loadout, learned skills, skill books (learn / sell), book gacha
  renderSkillsModal() {
    const body = document.getElementById('modal-skills-body');
    if (!body) return;
    const pl = this.player;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const sname = id => esc(SKILLS[id].name);
    const rar = id => { const r = RARITY[SKILLS[id].rarity] || RARITY.common; return `<span style="color:${r[1]}; font-size:0.68rem;">[${r[0]}]</span>`; };
    const info = id => {
      const s = SKILLS[id];
      if (s.kind === 'passive') return `ติดตัว • ${WEAPON_REQ[s.weapon] || ''}`;
      return `SP ${s.spCost} • CD ${s.cooldown}s • ${WEAPON_REQ[s.weapon] || ''}`;
    };
    const btn = (bg) => `padding:3px 8px; border:none; border-radius:4px; cursor:pointer; color:#fff; font-size:0.72rem; background:${bg};`;
    const card = 'background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); margin-bottom:10px;';

    const loadoutHtml = pl.skillLoadout.map((id, i) => `
      <div style="flex:1; min-width:96px; text-align:center; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:6px; padding:6px; font-size:0.75rem;">
        <div style="color:#fbbf24;">[${i + 1}]</div>
        ${id ? `<div style="font-size:22px;">${SKILL_ICONS[id] || '✨'}</div><div style="font-weight:600;">${sname(id)}</div>
          <button class="sk-unslot" data-slot="${i}" style="${btn('#64748b')} margin-top:3px;">ถอด</button>` : '<div style="color:#64748b; padding:14px 0;">ว่าง</div>'}
      </div>`).join('');

    const learned = Object.keys(pl.learnedSkills).filter(id => SKILLS[id]);
    const learnedHtml = learned.length ? learned.map(id => {
      const at = pl.skillLoadout.indexOf(id);
      const slotBtns = Array.from({ length: SKILL_SLOTS }, (_, i) =>
        `<button class="sk-slot" data-id="${id}" data-slot="${i}" style="${btn(at === i ? '#16a34a' : '#2563eb')}">${i + 1}</button>`).join(' ');
      return `<div style="display:flex; gap:8px; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:22px; width:30px; text-align:center;">${SKILL_ICONS[id] || '✨'}</div>
        <div style="flex:1; font-size:0.78rem;"><b>${sname(id)}</b> ${rar(id)}<div style="color:#94a3b8;">${esc(SKILLS[id].desc)}</div><div style="color:#7dd3fc;">${info(id)}</div></div>
        <div style="font-size:0.7rem; color:#94a3b8;">ใส่ช่อง<br>${slotBtns}</div></div>`;
    }).join('') : '<p style="color:#94a3b8; font-size:0.8rem;">ยังไม่ได้เรียนสกิลใด — สุ่มสมุดสกิลจากตู้ด้านล่าง</p>';

    const books = Object.keys(pl.skillBooks).filter(id => SKILLS[id] && pl.skillBooks[id] > 0);
    const booksHtml = books.length ? books.map(id => {
      const have = !!pl.learnedSkills[id];
      return `<div style="display:flex; gap:8px; align-items:center; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.78rem;">
        <span style="font-size:20px;">📕</span>
        <div style="flex:1;"><b>${sname(id)}</b> ${rar(id)} <span style="color:#f59e0b;">x${pl.skillBooks[id]}</span></div>
        <button class="sk-learn" data-id="${id}" style="${btn(have ? '#475569' : '#16a34a')}" ${have ? 'disabled title="เรียนสกิลนี้แล้ว"' : ''}>${have ? 'เรียนแล้ว' : 'เรียน'}</button>
        <button class="sk-sell" data-id="${id}" style="${btn('#f59e0b')} color:#000;">ขาย ${SKILLS[id].bookSellPrice} G</button></div>`;
    }).join('') : '<p style="color:#94a3b8; font-size:0.8rem;">ไม่มีสมุดสกิลในกระเป๋า</p>';

    body.innerHTML = `
      <div style="${card}"><h4>🎯 สกิลที่ใช้ได้ตอนนี้ (สูงสุด ${SKILL_SLOTS} ช่อง กด 1–${SKILL_SLOTS})</h4>
        <div style="display:flex; gap:6px; margin-top:8px;">${loadoutHtml}</div>
        <div style="font-size:0.7rem; color:#94a3b8; margin-top:6px;">สกิลติดตัว (Passive) ก็ใช้ 1 ช่องเหมือนกัน • 💧 SP ${Math.floor(pl.currentSp)}/${pl.maxSp} (ฟื้น ${pl.spRegen.toFixed(2)}/วิ)</div></div>
      <div style="${card}"><h4>📖 สกิลที่เรียนแล้ว (${learned.length})</h4>${learnedHtml}</div>
      <div style="${card}"><h4>📕 สมุดสกิลในกระเป๋า</h4>${booksHtml}
        <div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">สมุดใช้เรียนได้เฉพาะสกิลที่ยังไม่เคยเรียน • สมุดซ้ำขายเป็นเงินได้</div></div>
      <div style="${card}"><h4>🎰 ตู้สุ่มสมุดสกิล</h4>
        <div style="display:flex; gap:8px; margin:8px 0;">
          <button id="sk-pull-1" style="flex:1; ${btn('linear-gradient(135deg,#a855f7,#ec4899)')} padding:8px;" ${pl.gold >= GACHA_SINGLE ? '' : 'disabled'}>สุ่ม 1 ครั้ง (${GACHA_SINGLE} G)</button>
          <button id="sk-pull-10" style="flex:1; ${btn('linear-gradient(135deg,#f59e0b,#ef4444)')} padding:8px;" ${pl.gold >= GACHA_PACK ? '' : 'disabled'}>แพ็ก 10 ครั้ง (${GACHA_PACK.toLocaleString()} G)</button>
        </div>
        <div style="font-size:0.7rem; color:#94a3b8;">ไม่มีการันตี • โอกาสออก: ธรรมดา/ไม่ธรรมดา/หายาก/ตำนาน ตามค่าถ่วงน้ำหนักของแต่ละสกิล • 🪙 ${pl.gold.toLocaleString()} G</div></div>`;

    const refresh = () => { this.renderSkillsModal(); this.updateHUD(); };
    const log = (t, k = 'system') => this.gameEngine.onLog(t, k);
    body.querySelectorAll('.sk-slot').forEach(b => b.addEventListener('click', e => {
      pl.setLoadout(Number(e.currentTarget.dataset.slot), e.currentTarget.dataset.id);
      refresh();
    }));
    body.querySelectorAll('.sk-unslot').forEach(b => b.addEventListener('click', e => { pl.setLoadout(Number(e.currentTarget.dataset.slot), null); refresh(); }));
    body.querySelectorAll('.sk-learn').forEach(b => b.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id;
      const r = pl.learnSkill(id);
      log(r.ok ? `📖 เรียนสกิล ${SKILLS[id].name} สำเร็จ!` : `🚫 ${r.reason}`, r.ok ? 'relic' : 'system');
      refresh();
    }));
    body.querySelectorAll('.sk-sell').forEach(b => b.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id;
      const g = pl.sellBook(id);
      if (g) log(`💰 ขายสมุด ${SKILLS[id].name} ได้ +${g} Gold`);
      refresh();
    }));
    const pull = (n, cost) => {
      if (pl.gold < cost) return;
      pl.gold -= cost;
      const got = {};
      for (let i = 0; i < n; i++) { const id = pl.rollSkillBook(); if (id) { pl.addBook(id); got[id] = (got[id] || 0) + 1; } }
      pl.saveToStorage();
      const best = Object.keys(got).sort((a, b) => (SKILLS[a].gachaWeight || 0) - (SKILLS[b].gachaWeight || 0));
      log(`🎰 ได้สมุดสกิล: ${best.map(id => `${SKILLS[id].name}${got[id] > 1 ? ` x${got[id]}` : ''}`).join(', ')}`, 'relic');
      soundEngine.playPotion();
      refresh();
    };
    document.getElementById('sk-pull-1')?.addEventListener('click', () => pull(1, GACHA_SINGLE));
    document.getElementById('sk-pull-10')?.addEventListener('click', () => pull(10, GACHA_PACK));
  }

  // Crafting window (Blacksmith): recipes only, materials are taken from the bag
  renderCraftModal() {
    const body = document.getElementById('modal-craft-body');
    if (!body) return;

    let craftHtml = '<div style="display:flex; flex-direction:column; gap:8px;">';
    CRAFTING_RECIPES.forEach(r => {
      const resItem = ITEMS[r.resultItemId];
      if (!resItem) return;
      let canCraft = this.player.gold >= r.goldCost;
      const mats = r.materials.map(m => {
        const have = this.player.inventory[m.itemId] || 0;
        if (have < m.count) canCraft = false;
        const color = have >= m.count ? '#22c55e' : '#ef4444';
        return `<span style="color:${color};">${ITEMS[m.itemId]?.name || m.itemId}: ${have}/${m.count}</span>`;
      }).join(', ');

      craftHtml += `
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px; font-size:0.78rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <b>${itemIconHtml(r.resultItemId, resItem.icon, 22)} ${resItem.name}</b>
            <span style="color:#f59e0b;">🪙 ${r.goldCost.toLocaleString()} Gold</span>
          </div>
          <div style="color:#94a3b8; font-size:0.72rem; margin-bottom:4px;">${resItem.desc}</div>
          <div style="margin-bottom:6px;"><b>วัตถุดิบ:</b> ${mats}</div>
          <button class="btn-do-craft" data-id="${r.resultItemId}" ${canCraft ? '' : 'disabled'} style="padding:4px 10px; background:${canCraft ? '#f59e0b' : '#475569'}; color:#000; font-weight:700; border:none; border-radius:4px; cursor:${canCraft ? 'pointer' : 'not-allowed'};">คราฟต์</button>
        </div>
      `;
    });
    craftHtml += '</div>';
    body.innerHTML = `<div style="margin-bottom:8px; font-size:0.85rem;">🪙 ทองของคุณ: <b style="color:#f59e0b;">${this.player.gold.toLocaleString()}</b></div>${craftHtml}`;

    body.querySelectorAll('.btn-do-craft').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const recipe = CRAFTING_RECIPES.find(r => r.resultItemId === id);
        if (recipe) {
          this.player.gold -= recipe.goldCost;
          recipe.materials.forEach(m => this.player.removeItem(m.itemId, m.count));
          this.player.addItem(id, 1);
          this.gameEngine.onLog(`✨ คราฟต์สำเร็จ! ได้รับ ${ITEMS[id].icon} ${ITEMS[id].name}`, 'system');
          this.renderCraftModal();
          if (this.openWindows.has('modal-inventory')) this.renderInventoryModal();
          this.updateHUD();
        }
      });
    });
  }

  // Enhancement & Option System Modal (ตีบวก & สุ่มออปชั่น)
  async executeEnhanceStepByStep(itemId, totalCount = 1) {
    if (this.isEnhancing) return;
    this.isEnhancing = true;
    this.enhanceCancelRequested = false;
    this.enhanceStepProgress = { current: 0, total: totalCount, success: 0, fail: 0 };

    const itName = ITEMS[itemId]?.name || itemId;

    for (let i = 0; i < totalCount; i++) {
      // Check if user requested cancel or window was closed
      if (this.enhanceCancelRequested || !this.openWindows.has('modal-enhance')) {
        if (this.enhanceCancelRequested) {
          this.gameEngine?.onLog(`⏹️ หยุดการตีบวกต่อเนื่อง (${i}/${totalCount} ครั้ง)`, 'system');
        }
        break;
      }

      const curEnh = this.player.getItemEnhance(itemId);
      if (!curEnh || curEnh.level >= 25) {
        if (curEnh && curEnh.level >= 25) {
          this.gameEngine?.onLog(`👑 ${itName} ตีบวกถึงระดับสูงสุด (+25) แล้ว!`, 'system');
        }
        break;
      }

      const cost = this.player.getEnhanceCost(curEnh.level);
      if (this.player.gold < cost) {
        this.gameEngine?.onLog(`🪙 ทองไม่พอสำหรับการตีบวกขั้นต่อไป (ต้องการ ${cost.toLocaleString()} Gold)`, 'system');
        break;
      }

      this.enhanceStepProgress.current = i + 1;

      // 1. Strike animation phase (Hammer swings down + sparks)
      this.enhanceAnimationState = {
        phase: 'striking',
        status: 'striking'
      };
      this.renderEnhanceModal();
      soundEngine?.play('powerStrike');

      // Wait for hammer strike motion to connect
      await new Promise(r => setTimeout(r, 260));

      if (this.enhanceCancelRequested || !this.openWindows.has('modal-enhance')) {
        break;
      }

      // 2. Execute enhancement roll
      const res = this.player.enhanceItem(itemId);
      if (!res.ok) {
        this.gameEngine?.onLog(`🚫 ${res.reason}`, 'system');
        break;
      }

      // 3. Result animation phase (Sparks/flash, outcome badge, sound)
      if (res.broken) {
        this.enhanceStepProgress.fail++;
        this.enhanceAnimationState = {
          phase: 'result',
          status: 'broken',
          message: '💥 แตกหักสูญหาย!'
        };
        soundEngine?.play('monsterDie');
        this.gameEngine?.onLog(`💥 ไอเท็มแตกหัก! ${itName} สลายไปจากการตีบวกที่ล้มเหลว...`, 'combat');
        this.selectedEnhanceItemId = null;
        this.renderEnhanceModal();
        this.updateHUD();
        if (this.openWindows.has('modal-inventory')) this.renderInventoryModal();
        if (this.openWindows.has('modal-status')) this.renderStatusModal();
        await new Promise(r => setTimeout(r, 800));
        break;
      } else if (res.success) {
        this.enhanceStepProgress.success++;
        const unlockMsg = res.unlockedNewSlot ? ` 🔓 ปลดล็อกช่อง Option!` : '';
        this.enhanceAnimationState = {
          phase: 'result',
          status: 'success',
          message: `✨ สำเร็จ! +${res.newLevel}`
        };
        soundEngine?.play('ironGuard');
        this.gameEngine?.onLog(`✨ ตีบวกสำเร็จ! ${itName} เพิ่มเป็น +${res.newLevel}!${unlockMsg}`, 'system');
      } else {
        this.enhanceStepProgress.fail++;
        this.enhanceAnimationState = {
          phase: 'result',
          status: 'fail',
          message: `💥 ล้มเหลว! (เหลือ +${res.level})`
        };
        soundEngine?.play('playerHurt');
        this.gameEngine?.onLog(`💥 ตีบวกล้มเหลว! ${itName} ลดลงเหลือ +${res.level}`, 'combat');
      }

      this.renderEnhanceModal();
      this.updateHUD();
      if (this.openWindows.has('modal-inventory')) this.renderInventoryModal();
      if (this.openWindows.has('modal-status')) this.renderStatusModal();

      // Pause to let player see result and updated level/stats before next strike
      await new Promise(r => setTimeout(r, 380));
    }

    // Finished or cancelled
    this.enhanceAnimationState = null;
    this.isEnhancing = false;
    this.enhanceStepProgress = null;
    this.renderEnhanceModal();
  }

  renderEnhanceModal() {
    const body = document.getElementById('modal-enhance-body');
    if (!body) return;

    if (!this.enhanceTab) this.enhanceTab = 'enhance'; // 'enhance' | 'options'
    const pl = this.player;

    const GEAR_SLOTS = [
      { slot: 'weapon', label: 'อาวุธขวา', icon: '⚔️' },
      { slot: 'offhand', label: 'โล่ซ้าย', icon: '🛡️' },
      { slot: 'outfit', label: 'ชุดแฟชั่น', icon: '🥋' },
      { slot: 'back', label: 'ปีก/ผ้าคลุม', icon: '🪽' },
      { slot: 'hat', label: 'หมวก', icon: '🎩' },
      { slot: 'hair', label: 'ทรงผม', icon: '💇' },
      { slot: 'face', label: 'ใบหน้า', icon: '👀' },
      { slot: 'mouth', label: 'ปาก', icon: '👄' },
      { slot: 'pet', label: 'สัตว์เลี้ยง', icon: '🐾' },
      { slot: 'mount', label: 'สัตว์ขี่', icon: '🐎' }
    ];

    // Filter only equipped slots that actually have an item (eliminate empty slots!)
    const equippedItems = GEAR_SLOTS
      .map(gs => ({
        slot: gs.slot,
        label: gs.label,
        icon: gs.icon,
        itemId: pl.equipment[gs.slot]
      }))
      .filter(es => es.itemId && ITEMS[es.itemId]);

    const equippedIds = new Set(equippedItems.map(es => es.itemId));
    const bagGearIds = Object.keys(pl.inventory).filter(id => {
      const it = ITEMS[id];
      return it && pl.inventory[id] > 0 && GEAR_TYPES.includes(it.type) && !equippedIds.has(id);
    });

    // In Options tab, show ONLY items that have unlocked option slots (level >= 5)!
    let displayEquipped = equippedItems;
    let displayBagIds = bagGearIds;
    if (this.enhanceTab === 'options') {
      displayEquipped = equippedItems.filter(es => pl.getUnlockedOptionSlots(pl.getItemEnhance(es.itemId).level) > 0);
      displayBagIds = bagGearIds.filter(id => pl.getUnlockedOptionSlots(pl.getItemEnhance(id).level) > 0);
    }

    const allDisplayIds = [...displayEquipped.map(s => s.itemId), ...displayBagIds];
    if (!this.selectedEnhanceItemId || !ITEMS[this.selectedEnhanceItemId] || !allDisplayIds.includes(this.selectedEnhanceItemId)) {
      this.selectedEnhanceItemId = allDisplayIds[0] || null;
    }

    const curItem = this.selectedEnhanceItemId ? ITEMS[this.selectedEnhanceItemId] : null;
    const curEnh = this.selectedEnhanceItemId ? pl.getItemEnhance(this.selectedEnhanceItemId) : { level: 0, options: [] };
    const curLevel = curEnh.level;
    const unlockedSlots = pl.getUnlockedOptionSlots(curLevel);

    // Initialize option locks
    if (!this.optionLocks) this.optionLocks = {};
    if (this.selectedEnhanceItemId && !this.optionLocks[this.selectedEnhanceItemId]) {
      this.optionLocks[this.selectedEnhanceItemId] = new Set();
    }
    const currentLocks = (this.selectedEnhanceItemId && this.optionLocks[this.selectedEnhanceItemId]) ? this.optionLocks[this.selectedEnhanceItemId] : new Set();
    // Prune locks beyond unlocked slots
    for (const lIdx of Array.from(currentLocks)) {
      if (lIdx >= unlockedSlots) currentLocks.delete(lIdx);
    }

    // 1. Top Bar: Tabs & Player Gold
    const tabsHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:10px; flex-shrink:0; ${this.isEnhancing ? 'pointer-events:none; opacity:0.6;' : ''}">
        <div style="display:flex; gap:8px;">
          <button class="btn-enhance-tab ${this.enhanceTab === 'enhance' ? 'active' : ''}" data-tab="enhance" style="
            padding:6px 14px; border:none; border-radius:6px; font-size:0.82rem; font-weight:700; cursor:pointer; transition:all 0.15s;
            background:${this.enhanceTab === 'enhance' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)'};
            color:${this.enhanceTab === 'enhance' ? '#000' : '#cbd5e1'};
            box-shadow:${this.enhanceTab === 'enhance' ? '0 2px 8px rgba(245,158,11,0.35)' : 'none'};
          ">🔨 ตีบวกอุปกรณ์ (Refine)</button>
          <button class="btn-enhance-tab ${this.enhanceTab === 'options' ? 'active' : ''}" data-tab="options" style="
            padding:6px 14px; border:none; border-radius:6px; font-size:0.82rem; font-weight:700; cursor:pointer; transition:all 0.15s;
            background:${this.enhanceTab === 'options' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.06)'};
            color:${this.enhanceTab === 'options' ? '#fff' : '#cbd5e1'};
            box-shadow:${this.enhanceTab === 'options' ? '0 2px 8px rgba(59,130,246,0.35)' : 'none'};
          ">✨ สุ่มออปชั่น (Options)</button>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="font-size:0.85rem; font-weight:700; color:#fbbf24; background:rgba(0,0,0,0.35); padding:4px 12px; border-radius:20px; border:1px solid rgba(245,158,11,0.3);">
            🪙 ทองของคุณ: <b>${pl.gold.toLocaleString()}</b>
          </div>
          <button id="btn-add-test-gold" title="เพิ่มทองทดสอบ (+1,000,000 G)" style="
            background:rgba(245,158,11,0.2); border:1px solid rgba(245,158,11,0.5); color:#fbbf24; border-radius:6px;
            padding:3px 8px; cursor:pointer; font-weight:800; font-size:0.72rem; transition:all 0.12s;
          ">+ 1M G</button>
        </div>
      </div>
    `;

    // 2. Left Column: Gear selection list (Larger icons, no empty slots, no option dots)
    const leftColHtml = `
      <div style="
        flex: 0 0 290px; width: 290px; display: flex; flex-direction: column; gap: 8px;
        background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px; padding: 10px; box-sizing: border-box; height: 100%; min-height: 0; overflow-y: auto;
        ${this.isEnhancing ? 'pointer-events:none; opacity:0.6;' : ''}
      ">
        <div style="font-size:0.75rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.06);">
          🛡️ สวมใส่อยู่ (Equipped)
        </div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${displayEquipped.length === 0 ? `
            <div style="font-size:0.72rem; color:#64748b; padding:8px 4px; text-align:center;">
              ${this.enhanceTab === 'options' ? 'ไม่มีอุปกรณ์ที่ปลดล็อก Option' : 'ไม่มีอุปกรณ์ที่สวมใส่อยู่'}
            </div>
          ` : displayEquipped.map(es => {
            const it = ITEMS[es.itemId];
            const eData = pl.getItemEnhance(es.itemId);
            const lev = eData ? eData.level : 0;
            const isSel = this.selectedEnhanceItemId === es.itemId;
            return `
              <div class="enhance-item-pick ${isSel ? 'selected' : ''}" data-id="${es.itemId}" style="
                display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:7px;
                background:${isSel ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${isSel ? '#3b82f6' : 'rgba(255,255,255,0.07)'};
                cursor:pointer; transition:all 0.12s;
              ">
                <div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); border:1px solid rgba(255,255,255,0.08); border-radius:6px; flex-shrink:0;">
                  ${itemIconHtml(it.id, it.icon, 30)}
                </div>
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:1px;">
                  <div style="font-size:0.76rem; font-weight:700; color:${isSel ? '#fff' : '#e2e8f0'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:5px;">
                    ${lev > 0 ? `<span style="background:${enhanceColor(lev)}; color:#000; font-size:0.64rem; font-weight:900; padding:1px 4px; border-radius:3px;">+${lev}</span>` : ''}
                    <span>${it.name}</span>
                  </div>
                  <div style="font-size:0.67rem; color:#94a3b8;">${es.label}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="font-size:0.75rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.06); margin-top:8px;">
          🎒 อุปกรณ์ในกระเป๋า (Bag)
        </div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${displayBagIds.length === 0 ? `
            <div style="font-size:0.72rem; color:#64748b; padding:8px 4px; text-align:center;">
              ${this.enhanceTab === 'options' ? 'ไม่มีอุปกรณ์ในกระเป๋าที่ปลดล็อก Option' : 'ไม่มีอุปกรณ์อื่นในกระเป๋า'}
            </div>
          ` : displayBagIds.map(id => {
            const it = ITEMS[id];
            const eData = pl.getItemEnhance(id);
            const lev = eData ? eData.level : 0;
            const isSel = this.selectedEnhanceItemId === id;
            return `
              <div class="enhance-item-pick ${isSel ? 'selected' : ''}" data-id="${id}" style="
                display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:7px;
                background:${isSel ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${isSel ? '#3b82f6' : 'rgba(255,255,255,0.07)'};
                cursor:pointer; transition:all 0.12s;
              ">
                <div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); border:1px solid rgba(255,255,255,0.08); border-radius:6px; flex-shrink:0;">
                  ${itemIconHtml(it.id, it.icon, 30)}
                </div>
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:1px;">
                  <div style="font-size:0.76rem; font-weight:700; color:${isSel ? '#fff' : '#e2e8f0'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:5px;">
                    ${lev > 0 ? `<span style="background:${enhanceColor(lev)}; color:#000; font-size:0.64rem; font-weight:900; padding:1px 4px; border-radius:3px;">+${lev}</span>` : ''}
                    <span>${it.name}</span>
                  </div>
                  <div style="font-size:0.67rem; color:#94a3b8;">ในกระเป๋า</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // 3. Right Column: Action / Workspace
    let rightColHtml = '';
    if (!curItem) {
      rightColHtml = `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.88rem; gap:12px; padding:20px; text-align:center;">
          <span style="font-size:42px;">${this.enhanceTab === 'options' ? '✨' : '🔨'}</span>
          <b style="color:#e2e8f0; font-size:1rem;">${this.enhanceTab === 'options' ? 'ยังไม่มีอุปกรณ์ที่ปลดล็อกช่อง Option' : 'กรุณาเลือกอุปกรณ์ที่ต้องการเสริมพลัง'}</b>
          <span style="font-size:0.8rem; color:#64748b; max-width:320px;">
            ${this.enhanceTab === 'options'
              ? 'ต้องนำอุปกรณ์ไปตีบวกในแท็บ <b>"ตีบวกอุปกรณ์"</b> ให้ถึงระดับ <b>+5</b> ขึ้นไปก่อน เพื่อปลดล็อกช่อง Option สำหรับสุ่มสเตตัส'
              : 'เลือกอุปกรณ์จากรายการด้านซ้ายเพื่อทำการตีบวกเสริมพลัง'}
          </span>
        </div>
      `;
    } else {
      const typeLabel = { weapon: 'อาวุธ (มือขวา)', hat: 'หมวก', hair: 'ทรงผม', face: 'หน้าตา', mouth: 'ปาก', head: 'หัว', outfit: 'ชุดแฟชั่น', back: 'ปีก / ผ้าคลุม', shield: 'โล่ (มือซ้าย)', mount: 'สัตว์ขี่', pet: 'สัตว์เลี้ยง (Pet)' }[curItem.type] || 'อุปกรณ์';

      // Item Header Card
      const headerCard = `
        <div style="display:flex; align-items:center; gap:12px; background:rgba(15, 23, 42, 0.7); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px; flex-shrink:0;">
          <div style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); border:1px solid ${enhanceColor(curLevel)}; border-radius:8px; flex-shrink:0; position:relative; box-shadow:0 0 12px ${enhanceColor(curLevel)}44;">
            ${itemIconHtml(curItem.id, curItem.icon, 40)}
            ${curLevel > 0 ? `<span style="position:absolute; bottom:1px; right:2px; font-size:0.68rem; font-weight:900; color:${enhanceColor(curLevel)}; text-shadow:0 0 3px #000;">+${curLevel}</span>` : ''}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
              ${curLevel > 0 ? `<span style="background:${enhanceColor(curLevel)}; color:#000; font-size:0.72rem; font-weight:900; padding:1px 6px; border-radius:4px;">+${curLevel}</span>` : ''}
              <b style="font-size:1.02rem; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${curItem.name}</b>
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; display:flex; align-items:center; gap:8px;">
              <span>${typeLabel}</span>
              <span>·</span>
              <span style="color:${enhanceColor(curLevel)}; font-weight:700;">ระดับตีบวก +${curLevel}</span>
              ${this.enhanceTab === 'options' ? `<span>·</span><span style="color:#38bdf8;">ปลดล็อก Option ${unlockedSlots}/5 ช่อง</span>` : ''}
            </div>
          </div>
        </div>
      `;

      if (this.enhanceTab === 'enhance') {
        const isMax = curLevel >= 25;
        const nextLevel = curLevel + 1;
        const rate = isMax ? 0 : pl.getEnhanceRate(curLevel);
        const cost = isMax ? 0 : pl.getEnhanceCost(curLevel);
        const canAfford = pl.gold >= cost;

        // Stat progression calculation
        const STAT_KEYS_TO_CHECK = [
          ['atk', 'พลังโจมตี (ATK)'],
          ['def', 'พลังป้องกัน (DEF)'],
          ['hp', 'พลังชีวิต (HP)'],
          ['speedPct', 'ความเร็วเคลื่อนที่'],
          ['lootSpeed', 'ความเร็วเก็บของ']
        ];
        const activeStats = STAT_KEYS_TO_CHECK.filter(([f]) => curItem[f]);

        const statsTableHtml = activeStats.length === 0 ? `
          <div style="padding:10px; background:rgba(0,0,0,0.25); border-radius:6px; color:#94a3b8; font-size:0.75rem; text-align:center;">
            ไอเท็มชิ้นนี้ไม่มีสเตตัสพื้นฐาน (สามารถสุ่มเพิ่มออปชั่นได้ที่แท็บ สุ่มออปชั่น)
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:4px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:8px 12px;">
            ${activeStats.map(([f, label]) => {
              const base = curItem[f];
              const rawCur = pl.getEnhancedStat(base, curLevel, f);
              const curVal = typeof rawCur === 'number' ? (f === 'speedPct' || f === 'lootSpeed' ? Number(rawCur.toFixed(2)) : rawCur) : rawCur;
              const rawNext = isMax ? rawCur : pl.getEnhancedStat(base, nextLevel, f);
              const nextVal = typeof rawNext === 'number' ? (f === 'speedPct' || f === 'lootSpeed' ? Number(rawNext.toFixed(2)) : rawNext) : rawNext;
              const fmt = v => f === 'lootSpeed' ? `x${v}` : f === 'speedPct' ? `+${v}%` : `+${v}`;
              return `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.76rem; padding:2px 0;">
                  <span style="color:#94a3b8;">${label}</span>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="color:#cbd5e1; font-weight:600;">${fmt(curVal)}</span>
                    ${!isMax ? `<span style="color:#38bdf8; font-size:0.7rem;">➔</span><span style="color:#4ade80; font-weight:700;">${fmt(nextVal)}</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        // Success Rate bar color
        const rateColor = rate === 100 ? '#22c55e' : rate >= 70 ? '#3b82f6' : rate >= 50 ? '#f59e0b' : '#ef4444';

        rightColHtml = `
          <div style="flex:1; display:flex; flex-direction:column; gap:10px; height:100%; min-height:0; overflow-y:auto; padding-right:4px;">
            ${headerCard}

            <!-- Compare Level Box with Dynamic Animation Overlay -->
            <div id="enhance-compare-box" class="${this.enhanceAnimationState?.status === 'success' ? 'box-enhance-success' : (this.enhanceAnimationState?.status === 'fail' || this.enhanceAnimationState?.status === 'broken' ? 'box-enhance-fail' : '')}" style="
              position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; gap:20px; padding:16px 12px;
              background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:10px; min-height:85px; box-sizing:border-box;
            ">
              ${this.enhanceAnimationState ? `
                <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.55); z-index:10; pointer-events:none; border-radius:10px;">
                  ${this.enhanceAnimationState.phase === 'striking' ? `
                    <div class="anim-hammer-strike" style="font-size:52px; filter:drop-shadow(0 0 16px #f59e0b);">🔨</div>
                    <div class="anim-spark-burst" style="font-size:42px;">💥</div>
                  ` : this.enhanceAnimationState.phase === 'result' ? `
                    <div class="badge-pop-in" style="
                      display:flex; flex-direction:column; align-items:center; gap:3px;
                      background:${this.enhanceAnimationState.status === 'success' ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(21, 128, 61, 0.95))' : this.enhanceAnimationState.status === 'broken' ? 'linear-gradient(135deg, rgba(0,0,0,0.95), rgba(127, 29, 29, 0.95))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))'};
                      border:2px solid ${this.enhanceAnimationState.status === 'success' ? '#4ade80' : this.enhanceAnimationState.status === 'broken' ? '#ef4444' : '#fca5a5'};
                      padding:8px 20px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.6);
                    ">
                      <span style="font-size:26px;">${this.enhanceAnimationState.status === 'success' ? '✨' : this.enhanceAnimationState.status === 'broken' ? '☠️' : '💥'}</span>
                      <span style="font-size:0.95rem; font-weight:900; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.9); white-space:nowrap;">
                        ${this.enhanceAnimationState.message}
                      </span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              <div style="display:flex; flex-direction:column; align-items:center;">
                <span style="font-size:0.72rem; color:#94a3b8;">ระดับปัจจุบัน</span>
                <span style="font-size:1.6rem; font-weight:900; color:${enhanceColor(curLevel)}; text-shadow:0 0 10px ${enhanceColor(curLevel)}55;">+${curLevel}</span>
                <span style="font-size:0.68rem; color:#cbd5e1;">ขั้น +${curLevel}</span>
              </div>
              <span style="font-size:22px; color:#f59e0b;">➔</span>
              <div style="display:flex; flex-direction:column; align-items:center;">
                <span style="font-size:0.72rem; color:#94a3b8;">ระดับถัดไป</span>
                <span style="font-size:1.6rem; font-weight:900; color:${isMax ? '#fbbf24' : enhanceColor(nextLevel)}; text-shadow:0 0 10px ${enhanceColor(nextLevel)}55;">
                  ${isMax ? 'MAX' : `+${nextLevel}`}
                </span>
                <span style="font-size:0.68rem; color:#cbd5e1;">${isMax ? 'ระดับสูงสุด' : `ขั้น +${nextLevel}`}</span>
              </div>
            </div>

            <!-- Stats table -->
            ${statsTableHtml}

            <!-- Rate & Cost Card -->
            ${isMax ? `
              <div style="padding:14px; background:rgba(34, 197, 94, 0.15); border:1px solid #22c55e; border-radius:8px; text-align:center; color:#4ade80; font-weight:700; font-size:0.85rem;">
                👑 ไอเท็มชิ้นนี้ถึงระดับสูงสุด (+25) แล้ว!
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem;">
                  <span style="color:#94a3b8;">โอกาสสำเร็จ:</span>
                  <b style="color:${rateColor}; font-size:0.95rem;">${rate}%</b>
                </div>
                <div style="width:100%; height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
                  <div style="width:${rate}%; height:100%; background:${rateColor}; transition:width 0.2s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; padding-top:4px; border-top:1px solid rgba(255,255,255,0.06);">
                  <span style="color:#94a3b8;">ค่าใช้จ่าย:</span>
                  <b style="font-size:0.95rem;">${cost === 0 ? '<span style="color:#22c55e; font-weight:800;">ฟรี (ระดับ 1-4)</span>' : `<span style="color:${canAfford ? '#f59e0b' : '#ef4444'};">🪙 ${cost.toLocaleString()} Gold</span>`}</b>
                </div>
                ${(() => {
                  const breakRate = pl.getBreakRate(curLevel);
                  if (curLevel < 4) {
                    return `<div style="font-size:0.72rem; color:#4ade80; display:flex; align-items:center; gap:5px;">
                      <span>✨</span> <b>ปลอดภัย 100%:</b> ตีบวกฟรี ไม่มีค่าใช้จ่าย และสำเร็จแน่นอน
                    </div>`;
                  } else if (curLevel < 10) {
                    return `<div style="font-size:0.72rem; color:#f59e0b; display:flex; align-items:center; gap:5px;">
                      <span>⚠️</span> <b>หากล้มเหลว:</b> ระดับลดลง 1 ขั้น (ไอเท็มไม่แตกหัก)
                    </div>`;
                  } else {
                    return `<div style="font-size:0.72rem; color:#ef4444; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:6px 8px; display:flex; flex-direction:column; gap:2px;">
                      <div style="font-weight:800; color:#fca5a5; display:flex; align-items:center; gap:5px;">
                        <span>☠️</span> คำเตือนระดับ 10+:
                      </div>
                      <div>• หากล้มเหลว: ระดับการตีบวกจะลดลง 1 ขั้น</div>
                      <div style="color:#f87171; font-weight:700;">• มีโอกาส <span style="font-size:0.82rem; color:#ef4444; text-decoration:underline;">${breakRate}%</span> ที่ไอเท็มจะแตกหักสูญหาย!</div>
                    </div>`;
                  }
                })()}
              </div>
            `}

            <!-- Action Buttons (x1, x5, x10) or Active Enhancing Status -->
            ${!isMax ? `
              <div style="margin-top:auto; display:flex; flex-direction:column; gap:6px;">
                ${this.isEnhancing ? `
                  <div style="
                    padding:10px 14px; background:rgba(15, 23, 42, 0.95); border:1px solid #f59e0b; border-radius:8px;
                    display:flex; align-items:center; justify-content:space-between; gap:12px; box-shadow:0 0 16px rgba(245, 158, 11, 0.25);
                  ">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <span style="font-size:24px; display:inline-block; animation:popIn 0.5s infinite alternate;">🔨</span>
                      <div>
                        <div style="font-size:0.86rem; font-weight:800; color:#fbbf24;">กำลังตีบวก... (${this.enhanceStepProgress?.current || 1}/${this.enhanceStepProgress?.total || 1})</div>
                        <div style="font-size:0.72rem; color:#94a3b8;">สำเร็จ ${this.enhanceStepProgress?.success || 0} ครั้ง · ล้มเหลว ${this.enhanceStepProgress?.fail || 0} ครั้ง</div>
                      </div>
                    </div>
                    ${(this.enhanceStepProgress?.total > 1) ? `
                      <button id="btn-cancel-enhance" style="
                        padding:6px 14px; border:none; border-radius:6px; font-size:0.8rem; font-weight:800; cursor:pointer;
                        background:linear-gradient(135deg, #ef4444, #dc2626); color:#fff; box-shadow:0 2px 8px rgba(239,68,68,0.4);
                        transition:all 0.15s;
                      ">⏹️ หยุด</button>
                    ` : ''}
                  </div>
                ` : `
                  <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
                    <button class="btn-do-enhance-batch" data-count="1" data-id="${curItem.id}" ${canAfford ? '' : 'disabled'} style="
                      padding:9px 4px; border:none; border-radius:8px; font-size:0.82rem; font-weight:800; cursor:${canAfford ? 'pointer' : 'not-allowed'};
                      background:${canAfford ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#475569'};
                      color:${canAfford ? '#000' : '#94a3b8'};
                      box-shadow:${canAfford ? '0 2px 8px rgba(245,158,11,0.35)' : 'none'};
                      transition:all 0.15s;
                    ">🔨 ตีบวก 1 ครั้ง</button>

                    <button class="btn-do-enhance-batch" data-count="5" data-id="${curItem.id}" ${canAfford ? '' : 'disabled'} style="
                      padding:9px 4px; border:none; border-radius:8px; font-size:0.82rem; font-weight:800; cursor:${canAfford ? 'pointer' : 'not-allowed'};
                      background:${canAfford ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#475569'};
                      color:${canAfford ? '#fff' : '#94a3b8'};
                      box-shadow:${canAfford ? '0 2px 8px rgba(59,130,246,0.35)' : 'none'};
                      transition:all 0.15s;
                    ">⚡ ตีบวก 5 ครั้ง</button>

                    <button class="btn-do-enhance-batch" data-count="10" data-id="${curItem.id}" ${canAfford ? '' : 'disabled'} style="
                      padding:9px 4px; border:none; border-radius:8px; font-size:0.82rem; font-weight:800; cursor:${canAfford ? 'pointer' : 'not-allowed'};
                      background:${canAfford ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : '#475569'};
                      color:${canAfford ? '#fff' : '#94a3b8'};
                      box-shadow:${canAfford ? '0 2px 8px rgba(139,92,246,0.35)' : 'none'};
                      transition:all 0.15s;
                    ">🔥 ตีบวก 10 ครั้ง</button>
                  </div>
                `}
              </div>
            ` : ''}
          </div>
        `;
      } else {
        // Tab 2: Options
        const curOptions = curEnh.options || [];
        const lockedIndices = Array.from(currentLocks);
        const lockedCount = lockedIndices.length;
        const slotsToReroll = Math.max(0, unlockedSlots - lockedCount);
        const totalRerollCost = pl.getOptionRerollCost(slotsToReroll, lockedCount);
        const lockSurcharge = totalRerollCost - (slotsToReroll * 1000);
        const canAffordAll = pl.gold >= totalRerollCost;

        rightColHtml = `
          <div style="flex:1; display:flex; flex-direction:column; gap:8px; height:100%; min-height:0; overflow-y:auto; padding-right:4px;">
            ${headerCard}

            <!-- Compact Rules info banner -->
            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 12px; background:rgba(59, 130, 246, 0.1); border:1px solid rgba(59, 130, 246, 0.25); border-radius:7px; font-size:0.72rem; color:#93c5fd; flex-shrink:0;">
              <span>💡 สุ่มทีเดียวทุกช่องที่ไม่ได้ล็อก (สุ่มช่องละ <b>1,000 G</b>) • กดปุ่ม <b>"🔒 ล็อก"</b> เพื่อเก็บสเตตัสที่ชอบไว้</span>
              <span style="color:#fbbf24; font-weight:700;">(ยิ่งล็อกเยอะ ค่าธรรมเนียมยิ่งแพง)</span>
            </div>

            <!-- Option Slots List (5 slots) -->
            <div style="display:flex; flex-direction:column; gap:5px; flex:1; min-height:0;">
              ${[0, 1, 2, 3, 4].map(idx => {
                const isUnlocked = idx < unlockedSlots;
                const opt = isUnlocked ? curOptions[idx] : null;
                const isLocked = currentLocks.has(idx);
                const info = opt ? (STAT_INFO[opt.stat] || { label: opt.stat.toUpperCase(), name: opt.stat.toUpperCase(), icon: '✨', color: '#38bdf8' }) : null;
                const tierColor = opt ? (opt.value >= 5 ? '#fbbf24' : opt.value >= 4 ? '#c084fc' : opt.value >= 3 ? '#38bdf8' : '#4ade80') : '#94a3b8';

                if (!isUnlocked) {
                  return `
                    <div style="
                      display:flex; align-items:center; justify-content:space-between; padding:7px 12px;
                      background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.08); border-radius:7px; opacity:0.45;
                    ">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:15px;">🔒</span>
                        <div style="font-size:0.74rem; color:#94a3b8;">
                          <b>ช่องที่ ${idx + 1}:</b> ล็อกอยู่ (ต้องตีบวกไอเท็มชิ้นนี้ถึง <b style="color:#f59e0b;">+${(idx + 1) * 5}</b>)
                        </div>
                      </div>
                    </div>
                  `;
                }

                return `
                  <div style="
                    display:flex; align-items:center; justify-content:space-between; padding:6px 12px;
                    background:${isLocked ? 'rgba(245, 158, 11, 0.08)' : 'rgba(0,0,0,0.3)'};
                    border:1px solid ${isLocked ? 'rgba(245, 158, 11, 0.45)' : opt ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'};
                    border-radius:7px; transition:all 0.12s;
                  ">
                    <div style="display:flex; align-items:center; gap:9px;">
                      <div style="width:30px; height:30px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); border-radius:6px; font-size:15px; border:1px solid ${isLocked ? '#f59e0b' : 'rgba(255,255,255,0.1)'}; flex-shrink:0;">
                        ${opt ? info.icon : '❓'}
                      </div>
                      <div>
                        <div style="font-size:0.68rem; color:#94a3b8; display:flex; align-items:center; gap:5px;">
                          <span>ช่องที่ ${idx + 1}</span>
                          ${isLocked ? `<span style="background:#f59e0b; color:#000; font-size:0.58rem; font-weight:900; padding:1px 4px; border-radius:3px;">🔒 ล็อกอยู่</span>` : ''}
                        </div>
                        ${opt ? `
                          <div style="display:flex; align-items:center; gap:6px; margin-top:1px;">
                            <b style="font-size:0.85rem; color:#f8fafc;">${info.name}</b>
                            <span style="font-size:0.8rem; font-weight:900; color:${tierColor}; background:${tierColor}22; padding:1px 6px; border-radius:4px; border:1px solid ${tierColor}44;">+${opt.value}</span>
                          </div>
                        ` : `
                          <div style="font-size:0.75rem; color:#f59e0b; font-style:italic;">ยังไม่ได้สุ่มสเตตัส (พร้อมสุ่ม)</div>
                        `}
                      </div>
                    </div>

                    <!-- Lock / Unlock Toggle Button -->
                    <button class="btn-toggle-option-lock" data-slot="${idx}" style="
                      display:flex; align-items:center; gap:4px; padding:5px 11px; border-radius:6px; font-size:0.74rem; font-weight:800; cursor:pointer;
                      background:${isLocked ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)'};
                      color:${isLocked ? '#000' : '#cbd5e1'};
                      border:1px solid ${isLocked ? '#f59e0b' : 'rgba(255,255,255,0.18)'};
                      box-shadow:${isLocked ? '0 2px 8px rgba(245,158,11,0.35)' : 'none'};
                      transition:all 0.12s;
                    ">
                      <span>${isLocked ? '🔒 ล็อกอยู่' : '🔓 ปลดล็อก'}</span>
                    </button>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Rearranged Cost Summary & Action Bar (Horizontal layout) -->
            <div style="
              margin-top:auto; padding:10px 14px; background:rgba(15, 23, 42, 0.8);
              border:1px solid rgba(255,255,255,0.1); border-radius:10px;
              display:flex; align-items:center; justify-content:space-between; gap:16px; flex-shrink:0;
            ">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="display:flex; align-items:center; gap:8px; font-size:0.74rem; color:#94a3b8;">
                  <span>สุ่มใหม่ <b style="color:#38bdf8;">${slotsToReroll} ช่อง</b> (1,000 G/ช่อง)</span>
                  ${lockedCount > 0 ? `<span style="color:#64748b;">·</span><span style="color:#fbbf24;">🔒 ล็อก <b>${lockedCount} ช่อง</b> (+🪙 ${lockSurcharge.toLocaleString()} G)</span>` : ''}
                </div>
                <div style="display:flex; align-items:baseline; gap:6px;">
                  <span style="font-size:0.78rem; color:#cbd5e1; font-weight:700;">รวมค่าใช้จ่าย:</span>
                  <b style="color:${canAffordAll ? '#fbbf24' : '#ef4444'}; font-size:1.15rem; font-weight:900;">🪙 ${totalRerollCost.toLocaleString()} Gold</b>
                </div>
              </div>

              <button id="btn-reroll-all-locks" data-id="${curItem.id}" ${unlockedSlots > 0 && slotsToReroll > 0 && canAffordAll ? '' : 'disabled'} style="
                padding:11px 22px; border:none; border-radius:8px; font-size:0.92rem; font-weight:800;
                cursor:${unlockedSlots > 0 && slotsToReroll > 0 && canAffordAll ? 'pointer' : 'not-allowed'};
                background:${slotsToReroll === 0 ? '#475569' : (unlockedSlots > 0 && canAffordAll ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#475569')};
                color:${slotsToReroll === 0 ? '#94a3b8' : (unlockedSlots > 0 && canAffordAll ? '#fff' : '#94a3b8')};
                box-shadow:${unlockedSlots > 0 && slotsToReroll > 0 && canAffordAll ? '0 4px 14px rgba(59,130,246,0.4)' : 'none'};
                transition:all 0.15s; white-space:nowrap; flex-shrink:0;
              ">
                ${slotsToReroll === 0 ? '🔒 ทุกล็อตถูกล็อกไว้' : `🎲 สุ่มออปชั่นทั้งหมด (🪙 ${totalRerollCost.toLocaleString()})`}
              </button>
            </div>
          </div>
        `;
      }
    }

    // Combine everything into body
    body.innerHTML = `
      ${tabsHtml}
      <div style="display:flex; gap:12px; height:calc(100% - 46px); min-height:0; overflow:hidden;">
        ${leftColHtml}
        ${rightColHtml}
      </div>
    `;

    // Event Listeners:
    // Tab switching (prevent switching while enhancing)
    body.querySelectorAll('.btn-enhance-tab').forEach(btn => {
      btn.addEventListener('click', e => {
        if (this.isEnhancing) return;
        this.enhanceTab = e.currentTarget.dataset.tab;
        this.renderEnhanceModal();
      });
    });

    // Selecting an item from the left column (prevent switching while enhancing)
    body.querySelectorAll('.enhance-item-pick').forEach(el => {
      el.addEventListener('click', e => {
        if (this.isEnhancing) return;
        const id = e.currentTarget.dataset.id;
        if (id && ITEMS[id]) {
          this.selectedEnhanceItemId = id;
          this.renderEnhanceModal();
        }
      });
    });

    // Do enhance buttons (1, 5, 10 attempts executed sequentially one by one with strike animation)
    body.querySelectorAll('.btn-do-enhance-batch').forEach(btn => {
      btn.addEventListener('click', e => {
        if (this.isEnhancing) return;
        const id = e.currentTarget.dataset.id;
        const count = parseInt(e.currentTarget.dataset.count, 10) || 1;
        if (!id) return;
        this.executeEnhanceStepByStep(id, count);
      });
    });

    // Stop / Cancel button for ongoing enhancement
    const cancelBtn = body.querySelector('#btn-cancel-enhance');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.enhanceCancelRequested = true;
        cancelBtn.textContent = '⏳ กำลังหยุด...';
        cancelBtn.disabled = true;
      });
    }

    // Quick Add Gold helper for testing
    body.querySelector('#btn-add-test-gold')?.addEventListener('click', () => {
      this.player.gold += 1000000;
      this.player.saveToStorage();
      this.updateHUD();
      this.renderEnhanceModal();
      this.gameEngine?.onLog('🪙 ได้รับทองทดสอบ +1,000,000 Gold', 'system');
    });

    // Toggle option lock button
    body.querySelectorAll('.btn-toggle-option-lock').forEach(btn => {
      btn.addEventListener('click', e => {
        const slot = parseInt(e.currentTarget.dataset.slot, 10);
        if (isNaN(slot) || !this.selectedEnhanceItemId) return;
        if (!this.optionLocks) this.optionLocks = {};
        if (!this.optionLocks[this.selectedEnhanceItemId]) this.optionLocks[this.selectedEnhanceItemId] = new Set();
        const locks = this.optionLocks[this.selectedEnhanceItemId];
        if (locks.has(slot)) {
          locks.delete(slot);
        } else {
          locks.add(slot);
        }
        soundEngine?.play('click');
        this.renderEnhanceModal();
      });
    });

    // Reroll all options button (respecting locks)
    const rerollBtn = body.querySelector('#btn-reroll-all-locks');
    if (rerollBtn) {
      rerollBtn.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        const locks = (this.optionLocks && this.optionLocks[id]) ? Array.from(this.optionLocks[id]) : [];
        const res = this.player.rerollItemOptionsWithLocks(id, locks);
        if (res.ok) {
          soundEngine?.play('critHit');
          const summary = res.options.map((o, idx) => `${idx + 1}. ${o.stat.toUpperCase()} +${o.value}`).join(', ');
          this.gameEngine?.onLog(`🎲 สุ่ม Option สำเร็จ (${res.rerolledCount} ช่อง, ล็อกไว้ ${res.lockedCount} ช่อง): [${summary}]`, 'system');
          this.renderEnhanceModal();
          this.updateHUD();
          if (this.openWindows.has('modal-inventory')) this.renderInventoryModal();
          if (this.openWindows.has('modal-status')) this.renderStatusModal();
        } else {
          this.gameEngine?.onLog(`🚫 ${res.reason}`, 'system');
        }
      });
    }
  }

  // 3. Quests Modal
  renderQuestsModal() {
    const body = document.getElementById('modal-quests-body');
    if (!body) return;

    if (!this.questTab) this.questTab = 'active';

    const activeQuests = [];
    const completedQuests = [];
    let unclaimedCount = 0;

    QUESTS.forEach(q => {
      const st = this.player.questProgress[q.id] || { progress: 0, completed: false, claimed: false };
      if (!st.claimed) {
        activeQuests.push(q);
      }
      if (st.completed) {
        completedQuests.push(q);
      }
      if (st.completed && !st.claimed) {
        unclaimedCount++;
      }
    });

    // Sort ready-to-claim quests to the top
    activeQuests.sort((a, b) => {
      const stA = this.player.questProgress[a.id] || {};
      const stB = this.player.questProgress[b.id] || {};
      const readyA = stA.completed && !stA.claimed ? 1 : 0;
      const readyB = stB.completed && !stB.claimed ? 1 : 0;
      return readyB - readyA;
    });

    completedQuests.sort((a, b) => {
      const stA = this.player.questProgress[a.id] || {};
      const stB = this.player.questProgress[b.id] || {};
      const readyA = stA.completed && !stA.claimed ? 1 : 0;
      const readyB = stB.completed && !stB.claimed ? 1 : 0;
      return readyB - readyA;
    });

    let html = `
      <div class="quest-tabs">
        <button class="quest-tab-btn ${this.questTab === 'active' ? 'active' : ''}" data-qtab="active">
          📋 เควสต์ที่มี
          <span class="quest-tab-badge">${activeQuests.length}</span>
          ${unclaimedCount > 0 ? `<span class="quest-tab-alert">${unclaimedCount} รอรับ</span>` : ''}
        </button>
        <button class="quest-tab-btn ${this.questTab === 'completed' ? 'active' : ''}" data-qtab="completed">
          ✅ เควสต์ที่สำเร็จแล้ว
          <span class="quest-tab-badge">${completedQuests.length}</span>
        </button>
      </div>
    `;

    const displayList = this.questTab === 'active' ? activeQuests : completedQuests;

    if (displayList.length === 0) {
      if (this.questTab === 'active') {
        html += `
          <div class="quest-empty-state">
            <div class="quest-empty-icon">🏆</div>
            <div class="quest-empty-title">ยอดเยี่ยมมาก! คุณทำเควสต์ทั้งหมดสำเร็จแล้ว</div>
            <div class="quest-empty-desc">ไม่มีเควสต์ที่ค้างอยู่ คุณสามารถดูประวัติเควสต์และของรางวัลที่ได้รับได้ที่แท็บ "เควสต์ที่สำเร็จแล้ว"</div>
            <button class="quest-empty-btn" id="btn-goto-completed-quests">ดูเควสต์ที่สำเร็จแล้ว ➔</button>
          </div>
        `;
      } else {
        html += `
          <div class="quest-empty-state">
            <div class="quest-empty-icon">📜</div>
            <div class="quest-empty-title">ยังไม่มีเควสต์ที่สำเร็จ</div>
            <div class="quest-empty-desc">ออกสำรวจแผนที่และล่ามอนสเตอร์ตามภารกิจ เพื่อรับเหรียญทอง, ค่าประสบการณ์ และ Gacha Token!</div>
            <button class="quest-empty-btn" id="btn-goto-active-quests">ดูเควสต์ที่มี ➔</button>
          </div>
        `;
      }
    } else {
      html += '<div style="display:flex; flex-direction:column; gap:8px;">';
      displayList.forEach(q => {
        const st = this.player.questProgress[q.id] || { progress: 0, completed: false, claimed: false };
        const pct = Math.min(100, (st.progress / q.requiredCount) * 100);
        const zone = ZONES.find(z => z.monsters && z.monsters.includes(q.targetMonster));
        const mon = MONSTERS[q.targetMonster];
        const isReadyClaim = st.completed && !st.claimed;

        html += `
          <div class="quest-card ${isReadyClaim ? 'ready-claim' : ''} ${st.claimed ? 'claimed' : ''}" data-qid="${q.id}" ${!st.claimed ? 'title="คลิกเพื่อเดินทางไปยังแมพของมอนสเตอร์"' : ''} style="${!st.claimed ? 'cursor:pointer;' : ''}">
            <div class="quest-card-header">
              <div class="quest-card-title">
                <span>${q.title}</span>
              </div>
              <div>
                ${st.claimed
                  ? '<span class="quest-status-badge claimed">✅ สำเร็จแล้ว</span>'
                  : isReadyClaim
                  ? '<span class="quest-status-badge ready">🎉 สำเร็จ! พร้อมรับรางวัล</span>'
                  : `<span class="quest-status-badge ongoing">⏳ กำลังทำ (${st.progress}/${q.requiredCount})</span>`
                }
              </div>
            </div>

            <div class="quest-card-desc">${q.desc}</div>

            <div class="quest-meta-row">
              <span class="quest-target-tag">🎯 เป้าหมาย: <b>${mon ? mon.name : q.targetMonster}</b></span>
              <span class="quest-location-tag">📍 แผนที่: <b>${zone ? zone.name : 'ทั่วไป'}</b></span>
            </div>

            <div class="quest-progress-wrap">
              <div class="quest-progress-track">
                <div class="quest-progress-bar ${st.completed ? 'green' : 'blue'}" style="width:${pct}%;"></div>
              </div>
              <span class="quest-progress-num" style="color:${st.completed ? '#4ade80' : '#38bdf8'};">
                ${st.completed ? '100%' : `${st.progress}/${q.requiredCount}`}
              </span>
            </div>

            <div class="quest-footer-row">
              <div class="quest-rewards-text">
                <span>🪙 +${q.rewardGold.toLocaleString()} G</span>
                <span>✨ +${q.rewardExp.toLocaleString()} EXP</span>
                <span>🎟️ +${q.rewardTokens} Token</span>
              </div>
              <div class="quest-actions">
                ${isReadyClaim ? `
                  <button class="btn-claim-q" data-id="${q.id}">🎁 รับรางวัล</button>
                ` : !st.claimed ? `
                  <button class="btn-travel-q" data-qid="${q.id}" title="เดินทางไปยังแมพนี้">📍 ไปยังแมพ</button>
                ` : `
                  <span class="quest-done-tag">✨ รับรางวัลแล้ว</span>
                `}
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    body.innerHTML = html;

    // Tab buttons event
    body.querySelectorAll('.quest-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.questTab = e.currentTarget.dataset.qtab;
        this.renderQuestsModal();
      });
    });

    // Empty state switch buttons
    body.querySelector('#btn-goto-completed-quests')?.addEventListener('click', () => {
      this.questTab = 'completed';
      this.renderQuestsModal();
    });
    body.querySelector('#btn-goto-active-quests')?.addEventListener('click', () => {
      this.questTab = 'active';
      this.renderQuestsModal();
    });

    // Travel to monster location
    body.querySelectorAll('.quest-card').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const qid = el.dataset.qid;
        const st = this.player.questProgress[qid];
        if (!st || !st.claimed) {
          this.promptQuestTravel(qid);
        }
      });
    });

    body.querySelectorAll('.btn-travel-q').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.promptQuestTravel(btn.dataset.qid);
      });
    });

    // Claim reward button
    body.querySelectorAll('.btn-claim-q').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const q = QUESTS.find(item => item.id === id);
        const st = this.player.questProgress[id];
        if (q && st && st.completed && !st.claimed) {
          st.claimed = true;
          this.player.gold += q.rewardGold;
          this.player.gachaTokens += q.rewardTokens;
          this.player.gainExp(q.rewardExp);
          this.player.saveToStorage();
          this.gameEngine.onLog(`🎁 รับรางวัลเควสต์: +${q.rewardGold} Gold, +${q.rewardTokens} Token, +${q.rewardExp} EXP`, 'quest');
          this.renderQuestsModal();
          this.updateHUD();
        }
      });
    });
  }

  // 4. Treasure Relics Modal
  renderRelicsModal() {
    const body = document.getElementById('modal-relics-body');
    if (!body) return;

    const list = Object.values(RELICS);
    let html = `
      <div style="background:rgba(236,72,153,0.1); border:1px solid #ec4899; padding:10px; border-radius:8px; margin-bottom:12px; font-size:0.85rem;">
        💎 มอนสเตอร์ทุกตัวในเกมมี <b>Rare Relic ประจำตัว 1 ชิ้น</b> (ดรอปแยกจากไอเทมปกติ) สะสมแล้วจะเพิ่มสเตตัสถาวรให้ทั้งตัวละคร! (สะสมแล้ว: <b>${this.player.collectedRelics.length}/${list.length} ชิ้น</b>)
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px;">
    `;

    list.forEach(r => {
      const unlocked = this.player.collectedRelics.includes(r.id);
      const mName = MONSTERS[r.monsterId]?.name || 'มอนสเตอร์เฉพาะตัว';
      html += `
        <div style="background:rgba(0,0,0,0.35); border:1px solid ${unlocked ? '#ec4899' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:10px; display:flex; gap:12px; align-items:center; opacity:${unlocked ? '1' : '0.45'}; transition:all 0.2s;" title="${unlocked ? r.desc : `ดรอปจาก ${mName}`}">
          <div style="width:48px;height:48px;flex:none;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border-radius:6px;border:1px solid ${unlocked ? 'rgba(236,72,153,0.35)' : 'rgba(255,255,255,0.05)'};">
            ${unlocked ? relicIconHtml(r.id, r.icon, 44) : '<span style="font-size:24px;opacity:0.6;">❓</span>'}
          </div>
          <div style="flex:1;min-width:0;">
            <b style="font-size:0.85rem;color:${unlocked ? '#f8fafc' : '#94a3b8'};display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${unlocked ? r.name : '??? (สมบัติยังไม่ถูกค้นพบ)'}</b>
            <div style="font-size:0.75rem; color:#f59e0b; margin-top:2px;">${unlocked ? `⚡ ${r.bonusText}` : `🔒 ดรอปจาก ${mName}`}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    body.innerHTML = html;
  }

  // 5. NPC Shop Modal (Separate Buy & Sell Tabs)
  renderShopModal() {
    const body = document.getElementById('modal-shop-body');
    if (!body) return;

    // Default main tab: 'buy' or 'sell'
    if (!this.shopMainTab) this.shopMainTab = 'buy';
    const mainTab = this.shopMainTab;

    // Preserve scroll position
    const oldScrollEl = body.querySelector(mainTab === 'sell' ? '.shop-sell-scroll' : '.shop-buy-scroll');
    const prevScrollTop = oldScrollEl ? oldScrollEl.scrollTop : 0;

    // Available Potions to Buy (Only HP & SP Potions; Yellow EXP Potions removed)
    const SHOP_POTIONS = [
      { id: 'hp_potion_s', type: 'hp', tag: 'HP (เล็ก)', color: '#ef4444', desc: 'ฟื้นฟู +60 HP' },
      { id: 'hp_potion_m', type: 'hp', tag: 'HP (กลาง)', color: '#ef4444', desc: 'ฟื้นฟู +200 HP' },
      { id: 'hp_potion_l', type: 'hp', tag: 'HP (ใหญ่)', color: '#ef4444', desc: 'ฟื้นฟู +600 HP' },
      { id: 'sp_potion_s', type: 'sp', tag: 'SP (เล็ก)', color: '#3b82f6', desc: 'ฟื้นฟู +40 SP' },
      { id: 'sp_potion_m', type: 'sp', tag: 'SP (กลาง)', color: '#3b82f6', desc: 'ฟื้นฟู +120 SP' },
      { id: 'sp_potion_l', type: 'sp', tag: 'SP (ใหญ่)', color: '#3b82f6', desc: 'ฟื้นฟู +300 SP' },
    ];

    // All Items in Bag available to sell (excluding currently equipped items)
    const equippedIds = new Set(Object.values(this.player.equipment || {}).filter(Boolean));
    const allSellableKeys = Object.keys(this.player.inventory || {}).filter(k => {
      return ITEMS[k] && this.player.inventory[k] > 0 && !equippedIds.has(k);
    });

    // Top Navigation Tabs (Buy vs Sell)
    const mainTabsHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px; margin-bottom:12px; flex-shrink:0;">
        <div style="display:flex; gap:8px;">
          <button class="btn-shop-main-tab" data-tab="buy" style="
            padding:7px 18px; border:none; border-radius:8px; cursor:pointer; font-size:0.86rem; font-weight:700; transition:all 0.15s;
            background:${mainTab === 'buy' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'rgba(255,255,255,0.06)'};
            color:${mainTab === 'buy' ? '#fff' : '#94a3b8'};
            box-shadow:${mainTab === 'buy' ? '0 2px 8px rgba(37,99,235,0.4)' : 'none'};
          ">🛒 ซื้อของ (Buy)</button>
          <button class="btn-shop-main-tab" data-tab="sell" style="
            padding:7px 18px; border:none; border-radius:8px; cursor:pointer; font-size:0.86rem; font-weight:700; transition:all 0.15s;
            background:${mainTab === 'sell' ? 'linear-gradient(135deg,#059669,#047857)' : 'rgba(255,255,255,0.06)'};
            color:${mainTab === 'sell' ? '#fff' : '#94a3b8'};
            box-shadow:${mainTab === 'sell' ? '0 2px 8px rgba(5,150,105,0.4)' : 'none'};
          ">💰 ขายของ (Sell) <span style="font-size:0.72rem; opacity:0.85;">(${allSellableKeys.length})</span></button>
        </div>
        <div style="display:flex; align-items:center; gap:6px; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); padding:4px 12px; border-radius:8px; font-size:0.82rem;">
          🪙 Gold: <b style="color:#fbbf24; font-size:0.95rem;">${(this.player.gold || 0).toLocaleString()}</b> G
        </div>
      </div>
    `;

    let contentHtml = '';

    // ==========================================
    // TAB 1: BUY POTIONS VIEW
    // ==========================================
    if (mainTab === 'buy') {
      const buyCardsHtml = SHOP_POTIONS.map(pot => {
        const it = ITEMS[pot.id];
        if (!it) return '';
        const owned = this.player.inventory[pot.id] || 0;
        const canAfford1 = (this.player.gold || 0) >= it.price;
        const canAfford10 = (this.player.gold || 0) >= it.price * 10;

        // Buff / Effect list (supports multiple buffs cleanly on separate rows)
        const effects = [];
        if (it.heal) effects.push({ icon: '❤️', label: `ฟื้นฟู +${it.heal} HP`, color: '#f87171' });
        if (it.sp) effects.push({ icon: '💧', label: `ฟื้นฟู +${it.sp} SP`, color: '#38bdf8' });
        if (it.atk) effects.push({ icon: '⚔️', label: `เพิ่มพลังโจมตี +${it.atk}`, color: '#fbbf24' });
        if (it.def) effects.push({ icon: '🛡️', label: `เพิ่มพลังป้องกัน +${it.def}`, color: '#60a5fa' });
        if (it.speedPct) effects.push({ icon: '⚡', label: `เพิ่มความเร็วเดิน +${it.speedPct}%`, color: '#34d399' });
        if (!effects.length && pot.desc) effects.push({ icon: '✨', label: pot.desc, color: '#cbd5e1' });
        if (!effects.length && it.desc) effects.push({ icon: '✨', label: it.desc, color: '#cbd5e1' });

        return `
          <div style="
            display:flex; flex-direction:column; justify-content:space-between; gap:12px;
            background:rgba(255,255,255,0.03); border:1px solid ${pot.type === 'hp' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'};
            padding:14px; border-radius:12px; box-shadow:0 3px 10px rgba(0,0,0,0.3); transition:all 0.2s;
          ">
            <!-- Top: Item Details (รายละเอียดอยู่ข้างบน) -->
            <div>
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
                  <div style="width:46px; height:46px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); border-radius:10px; border:1px solid rgba(255,255,255,0.08); flex-shrink:0;">
                    ${itemIconHtml(pot.id, it.icon, 38)}
                  </div>
                  <div style="min-width:0; flex:1;">
                    <div style="font-size:0.92rem; font-weight:700; color:${pot.color}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${it.name}
                    </div>
                    <div style="font-size:0.73rem; color:#94a3b8; display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:2px;">
                      <span style="color:#fbbf24; font-weight:600;">🪙 ${it.price.toLocaleString()} G</span>
                      <span style="color:rgba(255,255,255,0.2);">·</span>
                      <span>มีในกระเป๋า: <b style="color:#f59e0b;">${owned}</b> ขวด</span>
                    </div>
                  </div>
                </div>

                <!-- Category Tag -->
                <span style="
                  font-size:0.7rem; padding:2px 8px; border-radius:6px; font-weight:700; flex-shrink:0;
                  background:${pot.type === 'hp' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)'};
                  color:${pot.color}; border:1px solid ${pot.type === 'hp' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'};
                ">${pot.tag}</span>
              </div>

              <!-- Effect & Buffs Box (กล่องแสดงผลลัพธ์/บัฟเฉพาะ) -->
              <div style="
                background:rgba(0,0,0,0.28); border-radius:8px; padding:8px 10px; font-size:0.76rem;
                border:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:5px;
              ">
                ${effects.map(eff => `
                  <div style="display:flex; align-items:center; gap:6px; color:${eff.color}; font-weight:600;">
                    <span>${eff.icon}</span> <span>${eff.label}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Bottom: Action Buttons (เอาปุ่มมาไว้ข้างล่าง) -->
            <div style="display:flex; gap:8px; margin-top:auto; padding-top:10px; border-top:1px solid rgba(255,255,255,0.06);">
              <button class="btn-buy-pot" data-id="${pot.id}" data-qty="1" data-cost="${it.price}" ${canAfford1 ? '' : 'disabled'} style="
                flex:1; padding:8px 10px; border:none; border-radius:6px; font-size:0.78rem; font-weight:700;
                cursor:${canAfford1 ? 'pointer' : 'not-allowed'};
                background:${canAfford1 ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'rgba(255,255,255,0.08)'};
                color:${canAfford1 ? '#fff' : '#64748b'};
                box-shadow:${canAfford1 ? '0 2px 6px rgba(37,99,235,0.35)' : 'none'};
                transition:all 0.15s;
              ">ซื้อ x1 (${it.price} G)</button>

              <button class="btn-buy-pot" data-id="${pot.id}" data-qty="10" data-cost="${it.price * 10}" ${canAfford10 ? '' : 'disabled'} style="
                flex:1; padding:8px 10px; border:none; border-radius:6px; font-size:0.78rem; font-weight:700;
                cursor:${canAfford10 ? 'pointer' : 'not-allowed'};
                background:${canAfford10 ? 'linear-gradient(135deg,#059669,#047857)' : 'rgba(255,255,255,0.08)'};
                color:${canAfford10 ? '#fff' : '#64748b'};
                box-shadow:${canAfford10 ? '0 2px 6px rgba(5,150,105,0.35)' : 'none'};
                transition:all 0.15s;
              ">ซื้อ x10 (${(it.price * 10).toLocaleString()} G)</button>
            </div>
          </div>
        `;
      }).join('');

      contentHtml = `
        <div style="display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden;">
          <div style="margin-bottom:12px;">
            <p style="font-size:0.78rem; color:#94a3b8; margin:0;">เลือกซื้อโพชั่นฟื้นฟูเลือด (HP) และมานา (SP) สำหรับออกผจญภัย</p>
          </div>
          <div class="shop-buy-scroll shop-scroll" style="flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(270px, 1fr)); gap:12px; padding-right:4px;">
            ${buyCardsHtml}
          </div>
        </div>
      `;
    }

    // ==========================================
    // TAB 2: SELL INVENTORY VIEW
    // ==========================================
    else {
      if (!this.shopSellTab) this.shopSellTab = 'all';
      const currentTab = this.shopSellTab;
      const searchQ = (this.shopSellSearch || '').trim().toLowerCase();

      // Categories
      const TABS = [
        { id: 'all', label: '🎒 ทั้งหมด', match: () => true },
        { id: 'material', label: '🦴 วัสดุ/ขยะ', match: it => it.type === 'material' },
        { id: 'combat', label: '⚔️ อุปกรณ์', match: it => ['weapon', 'shield', 'outfit', 'back', 'hat', 'hair', 'face', 'mouth', 'pet', 'mount'].includes(it.type) },
        { id: 'consumable', label: '🧪 ของใช้', match: it => it.type === 'consumable' },
      ];
      const currentTabDef = TABS.find(t => t.id === currentTab) || TABS[0];

      // Filter sellable items
      const filteredSellKeys = allSellableKeys.filter(k => {
        const it = ITEMS[k];
        if (!currentTabDef.match(it)) return false;
        if (searchQ) {
          const nameMatch = it.name && it.name.toLowerCase().includes(searchQ);
          const descMatch = it.desc && it.desc.toLowerCase().includes(searchQ);
          const idMatch = k.toLowerCase().includes(searchQ);
          return nameMatch || descMatch || idMatch;
        }
        return true;
      });

      // Calculate total trash gold
      let totalTrashGold = 0;
      let totalTrashCount = 0;
      allSellableKeys.forEach(k => {
        const it = ITEMS[k];
        if (it && it.type === 'material') {
          const qty = this.player.inventory[k] || 0;
          const price = Math.max(1, it.price || 1);
          totalTrashGold += qty * price;
          totalTrashCount += qty;
        }
      });

      // Sell Sub-Tabs HTML
      const tabsHtml = `
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          ${TABS.map(t => {
            const isActive = t.id === currentTab;
            return `
              <button class="btn-shop-tab" data-tab="${t.id}" style="
                padding:4px 10px; border-radius:6px; border:none; cursor:pointer; font-size:0.75rem; font-weight:600;
                background:${isActive ? '#059669' : 'rgba(255,255,255,0.06)'};
                color:${isActive ? '#fff' : '#94a3b8'};
                transition:all 0.15s;
              ">${t.label}</button>
            `;
          }).join('')}
        </div>
      `;

      // Item Rows HTML
      let rowsHtml = '';
      if (filteredSellKeys.length === 0) {
        rowsHtml = `
          <div style="text-align:center; padding:40px 10px; color:#64748b; font-size:0.85rem;">
            📦 ไม่มีไอเทมที่สามารถขายได้ในหมวดนี้
          </div>
        `;
      } else {
        rowsHtml = filteredSellKeys.map(k => {
          const it = ITEMS[k];
          const owned = this.player.inventory[k] || 0;
          const unitPrice = Math.max(1, it.price || 1);
          const defaultTotal = unitPrice;

          return `
            <div style="
              display:flex; align-items:center; justify-content:space-between; gap:12px;
              background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06);
              padding:8px 12px; border-radius:8px; margin-bottom:6px; transition:border 0.15s;
            ">
              <!-- Item Info -->
              <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
                <div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3); border-radius:6px; flex-shrink:0;">
                  ${itemIconHtml(k, it.icon, 30)}
                </div>
                <div style="min-width:0;">
                  <div style="font-size:0.83rem; font-weight:600; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${it.name}
                  </div>
                  <div style="font-size:0.72rem; color:#94a3b8; display:flex; gap:6px; align-items:center; margin-top:1px;">
                    <span style="color:#f59e0b;">มี <b>${owned}</b> ชิ้น</span>
                    <span>·</span>
                    <span>ราคาขาย: <b>${unitPrice.toLocaleString()}</b> G/ชิ้น</span>
                  </div>
                </div>
              </div>

              <!-- Sell Stepper and Button -->
              <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                <div style="display:flex; align-items:center; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:6px; overflow:hidden;">
                  <button class="btn-shop-dec" data-id="${k}" style="padding:4px 8px; border:none; background:transparent; color:#94a3b8; cursor:pointer; font-size:0.78rem;">-</button>
                  <input type="number" class="shop-sell-input" data-id="${k}" data-unit-price="${unitPrice}" min="1" max="${owned}" value="1" style="
                    width:42px; text-align:center; background:transparent; border:none; color:#f8fafc; font-size:0.8rem; font-weight:600; outline:none;
                  " />
                  <button class="btn-shop-inc" data-id="${k}" style="padding:4px 8px; border:none; background:transparent; color:#94a3b8; cursor:pointer; font-size:0.78rem;">+</button>
                  <button class="btn-shop-max" data-id="${k}" style="padding:4px 7px; border:none; border-left:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#38bdf8; cursor:pointer; font-size:0.7rem; font-weight:700;">Max</button>
                </div>

                <div style="min-width:70px; text-align:right; font-size:0.78rem; color:#fbbf24; font-weight:700;">
                  🪙 <span id="sell-gold-val-${k}">${defaultTotal.toLocaleString()}</span> G
                </div>

                <button class="btn-confirm-sell" data-id="${k}" style="
                  padding:5px 12px; border:none; border-radius:6px; cursor:pointer; font-size:0.76rem; font-weight:700;
                  background:linear-gradient(135deg,#f59e0b,#d97706); color:#000; box-shadow:0 2px 6px rgba(245,158,11,0.25);
                ">💰 ขาย</button>
              </div>
            </div>
          `;
        }).join('');
      }

      contentHtml = `
        <div style="display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden;">
          <!-- Controls Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px; flex-shrink:0; flex-wrap:wrap;">
            ${tabsHtml}
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" id="shop-sell-search" placeholder="🔍 ค้นหาไอเทม..." value="${this.shopSellSearch || ''}" style="
                padding:4px 8px; font-size:0.75rem; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#f8fafc; outline:none; width:130px;
              " />
              <button id="btn-sell-trash-all" ${totalTrashCount > 0 ? '' : 'disabled'} style="
                padding:5px 12px; border:none; border-radius:6px; font-size:0.75rem; font-weight:700;
                cursor:${totalTrashCount > 0 ? 'pointer' : 'not-allowed'};
                background:${totalTrashCount > 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,0.06)'};
                color:${totalTrashCount > 0 ? '#000' : '#64748b'};
                box-shadow:${totalTrashCount > 0 ? '0 2px 6px rgba(245,158,11,0.3)' : 'none'};
                white-space:nowrap;
              ">🗑️ ขายขยะทั้งหมด (${totalTrashGold.toLocaleString()} G)</button>
            </div>
          </div>

          <!-- Sell Items List Scroll Area -->
          <div class="shop-sell-scroll shop-scroll" style="flex:1; overflow-y:auto; padding-right:4px;">
            ${rowsHtml}
          </div>
        </div>
      `;
    }

    // Render Full Modal HTML
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden;">
        ${mainTabsHtml}
        <div style="flex:1; min-height:0; overflow:hidden;">
          ${contentHtml}
        </div>
      </div>
    `;

    // Restore scroll position
    const newScrollEl = body.querySelector(mainTab === 'sell' ? '.shop-sell-scroll' : '.shop-buy-scroll');
    if (newScrollEl && prevScrollTop) {
      newScrollEl.scrollTop = prevScrollTop;
    }

    // Main Tab Switching
    body.querySelectorAll('.btn-shop-main-tab').forEach(b => {
      b.addEventListener('click', (e) => {
        this.shopMainTab = e.currentTarget.dataset.tab;
        this.renderShopModal();
      });
    });

    // Buy Potion Event Listeners
    body.querySelectorAll('.btn-buy-pot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const qty = parseInt(e.currentTarget.dataset.qty) || 1;
        const cost = parseInt(e.currentTarget.dataset.cost);
        if ((this.player.gold || 0) >= cost) {
          this.player.gold -= cost;
          this.player.addItem(id, qty);
          soundEngine.playPotion();
          this.gameEngine.onLog(`🛒 ซื้อ ${ITEMS[id].name} x${qty} (-${cost.toLocaleString()} Gold)`, 'system');
          this.renderShopModal();
          this.updateHUD();
          if (this.openWindows.has('modal-inventory')) this.renderInventoryModal();
        } else {
          this.gameEngine.onLog('⚠️ Gold ไม่เพียงพอสำหรับการซื้อ', 'system');
        }
      });
    });

    // Sell Trash All Event Listener
    document.getElementById('btn-sell-trash-all')?.addEventListener('click', () => {
      let gain = 0;
      let count = 0;
      allSellableKeys.forEach(k => {
        const item = ITEMS[k];
        if (item && item.type === 'material') {
          const qty = this.player.inventory[k] || 0;
          const price = Math.max(1, item.price || 1);
          gain += qty * price;
          count += qty;
          this.player.removeItem(k, qty);
        }
      });
      if (gain > 0) {
        this.player.gold += gain;
        soundEngine.play('coin');
        this.gameEngine.onLog(`💰 ขายไอเทมขยะและวัตถุดิบ ${count} ชิ้น ได้รับเงิน +${gain.toLocaleString()} Gold!`, 'system');
        this.renderShopModal();
        this.updateHUD();
        if (this.openWindows.has('modal-inventory')) this.renderInventoryModal();
      } else {
        this.gameEngine.onLog('⚠️ ไม่มีไอเทมขยะในกระเป๋า', 'system');
      }
    });

    // Shop Category Tabs
    body.querySelectorAll('.btn-shop-tab').forEach(b => {
      b.addEventListener('click', (e) => {
        this.shopSellTab = e.currentTarget.dataset.tab;
        this.renderShopModal();
      });
    });

    // Shop Search Input
    const searchInp = body.querySelector('#shop-sell-search');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.shopSellSearch = e.target.value;
        this.renderShopModal();
        const inp = document.getElementById('shop-sell-search');
        if (inp) {
          inp.focus();
          inp.selectionStart = inp.selectionEnd = inp.value.length;
        }
      });
    }

    // Sell Quantity Steppers & Logic
    const updateSellRowPrice = (itemId) => {
      const input = body.querySelector(`.shop-sell-input[data-id="${itemId}"]`);
      const goldSpan = body.querySelector(`#sell-gold-val-${itemId}`);
      if (!input || !goldSpan) return;
      const unitPrice = parseInt(input.dataset.unitPrice) || 1;
      const max = parseInt(input.max) || 1;
      let val = parseInt(input.value) || 1;
      if (val < 1) val = 1;
      if (val > max) val = max;
      input.value = val;
      goldSpan.textContent = (unitPrice * val).toLocaleString();
    };

    body.querySelectorAll('.btn-shop-dec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const input = body.querySelector(`.shop-sell-input[data-id="${id}"]`);
        if (input) {
          input.value = Math.max(1, (parseInt(input.value) || 1) - 1);
          updateSellRowPrice(id);
        }
      });
    });

    body.querySelectorAll('.btn-shop-inc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const input = body.querySelector(`.shop-sell-input[data-id="${id}"]`);
        if (input) {
          const max = parseInt(input.max) || 1;
          input.value = Math.min(max, (parseInt(input.value) || 1) + 1);
          updateSellRowPrice(id);
        }
      });
    });

    body.querySelectorAll('.btn-shop-max').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const input = body.querySelector(`.shop-sell-input[data-id="${id}"]`);
        if (input) {
          input.value = parseInt(input.max) || 1;
          updateSellRowPrice(id);
        }
      });
    });

    body.querySelectorAll('.shop-sell-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const id = e.currentTarget.dataset.id;
        updateSellRowPrice(id);
      });
    });

    // Confirm Sell Single / Multiple Button
    body.querySelectorAll('.btn-confirm-sell').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const it = ITEMS[id];
        if (!it) return;
        const input = body.querySelector(`.shop-sell-input[data-id="${id}"]`);
        const owned = this.player.inventory[id] || 0;
        let qtyToSell = input ? (parseInt(input.value) || 1) : 1;
        qtyToSell = Math.max(1, Math.min(owned, qtyToSell));
        if (qtyToSell <= 0) return;

        const unitPrice = Math.max(1, it.price || 1);
        const totalPrice = unitPrice * qtyToSell;

        this.player.removeItem(id, qtyToSell);
        this.player.gold += totalPrice;
        soundEngine.play('coin');
        this.gameEngine.onLog(`💰 ขาย ${it.name} x${qtyToSell} ได้รับเงิน +${totalPrice.toLocaleString()} Gold`, 'system');

        this.updateHUD();
        this.renderShopModal();
        if (this.openWindows.has('modal-inventory')) this.renderInventoryModal();
      });
    });
  }

  // 6. World Map Zones Modal
  renderZonesModal() {
    const body = document.getElementById('modal-zones-body');
    if (!body) return;

    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
    ZONES.forEach((z, idx) => {
      const isCur = this.gameEngine.currentZoneIndex === idx;
      const locked = false; // every map is open to every level
      // Recommended level = level range of the monsters living in this map
      const lvs = (z.monsterIds || []).map(id => MONSTERS[id]?.level).filter(Number.isFinite);
      const lo = lvs.length ? Math.min(...lvs) : 0, hi = lvs.length ? Math.max(...lvs) : 0;
      const recLv = !lvs.length ? 'ปลอดภัย' : `แนะนำ Lv.${lo === hi ? lo : `${lo}-${hi}`}`;
      // green once the player has reached the recommended level, red until then
      const recColor = !lvs.length ? '#38bdf8' : (this.player.baseLevel >= lo ? '#22c55e' : '#ef4444');

      html += `
        <div class="zone-card" data-idx="${idx}" style="display:flex; align-items:center; gap:14px; background:rgba(0,0,0,0.3); border:2px solid ${isCur ? '#fbbf24' : 'rgba(255,255,255,0.1)'}; padding:10px 14px; border-radius:8px; cursor:${locked ? 'not-allowed' : 'pointer'}; opacity:${locked ? '0.45' : '1'};">
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.92rem; color:${isCur ? '#fbbf24' : '#fff'};">${z.name}${isCur ? ' <span style="font-size:0.7rem; color:#fbbf24;">(อยู่ที่นี่)</span>' : ''}</div>
            <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">${z.desc}</div>
          </div>
          <div style="text-align:right; white-space:nowrap; font-size:0.72rem;">
            <div style="color:${recColor};">${recLv}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    body.innerHTML = html;

    body.querySelectorAll('.zone-card').forEach(c => {
      c.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        this.gameEngine.changeMap(ZONES[idx].id);
        this.closeModal('modal-zones');
      });
    });
  }

  // 7. Party Modal
  renderPartyModal() {
    const body = document.getElementById('modal-party-body');
    if (!body) return;

    // Don't wipe what the user is typing when a background party update arrives
    const active = document.activeElement;
    if (active && body.contains(active) && /^(INPUT|SELECT)$/.test(active.tagName)) return;

    const net = this.gameEngine.network;
    const party = net ? net.currentParty : null;
    const myId = net ? net.myPlayerId : null;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const zoneName = (id) => { const z = ZONES.find(zz => zz.id === id); return z ? z.name : (id || '-'); };
    const box = 'background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:12px;';
    const inp = 'padding:6px 8px; background:rgba(15,23,42,0.8); border:1px solid #475569; border-radius:6px; color:#fff; font-size:0.82rem;';
    const btn = (bg) => `padding:5px 10px; background:${bg}; color:#fff; border:none; border-radius:5px; cursor:pointer; font-size:0.75rem; font-weight:600;`;

    const settingsFields = (s, disabled) => `
      <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 10px; align-items:center; font-size:0.8rem; color:#cbd5e1;">
        <label>การแบ่ง EXP</label>
        <select id="ps-expShare" ${disabled ? 'disabled' : ''} style="${inp}">
          <option value="share" ${s.expShare === 'share' ? 'selected' : ''}>หาร EXP ทั้งตี้ (+25% โบนัส)</option>
          <option value="killer" ${s.expShare === 'killer' ? 'selected' : ''}>ใครฆ่าคนนั้นได้</option>
        </select>
        <label>รับสมาชิกอัตโนมัติ</label>
        <label><input type="checkbox" id="ps-autoAccept" ${s.autoAccept ? 'checked' : ''} ${disabled ? 'disabled' : ''}> เปิด (ไม่ต้องรอหัวหน้าอนุมัติ)</label>
        <label>เงื่อนไขเลเวล</label>
        <span><input type="number" id="ps-minLevel" min="1" max="999" value="${s.minLevel}" ${disabled ? 'disabled' : ''} style="${inp} width:64px;"> ถึง
        <input type="number" id="ps-maxLevel" min="1" max="999" value="${s.maxLevel}" ${disabled ? 'disabled' : ''} style="${inp} width:64px;"></span>
      </div>`;
    const readSettings = () => ({
      expShare: document.getElementById('ps-expShare').value,
      autoAccept: document.getElementById('ps-autoAccept').checked,
      minLevel: Number(document.getElementById('ps-minLevel').value) || 1,
      maxLevel: Number(document.getElementById('ps-maxLevel').value) || 999
    });

    if (!party) {
      const tab = this.partyTab === 'find' ? 'find' : 'create';
      const tabBtn = (id, label) => `<button class="btn-party-tab" data-tab="${id}" style="flex:1; padding:8px; border:none; border-bottom:3px solid ${tab === id ? '#3b82f6' : 'transparent'}; background:${tab === id ? 'rgba(59,130,246,0.15)' : 'transparent'}; color:${tab === id ? '#fff' : '#94a3b8'}; font-weight:700; cursor:pointer;">${label}</button>`;
      const tabs = `<div style="display:flex; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1);">${tabBtn('create', '🚩 สร้างปาร์ตี้')}${tabBtn('find', '🔎 ค้นหาปาร์ตี้')}</div>`;

      if (tab === 'create') {
        body.innerHTML = `${tabs}
          <div style="${box}">
            <div style="margin-bottom:8px;"><input type="text" id="input-party-name" maxlength="24" style="${inp} width:100%;" value="กิลด์ผู้กล้า" placeholder="ชื่อปาร์ตี้"></div>
            ${settingsFields({ expShare: 'share', autoAccept: false, minLevel: 1, maxLevel: 999 }, false)}
            <button id="btn-create-party-submit" style="${btn('linear-gradient(135deg,#3b82f6,#2563eb)')} margin-top:10px; padding:7px 16px;">สร้างปาร์ตี้</button>
          </div>`;
        document.getElementById('btn-create-party-submit').addEventListener('click', () => {
          const name = document.getElementById('input-party-name').value.trim() || `${this.player.name}'s Party`;
          net?.sendCreateParty(name, readSettings());
        });
      } else {
        const zoneOpts = ZONES.map(z => `<option value="${z.id}">${esc(z.name)}</option>`).join('');
        body.innerHTML = `${tabs}
          <div style="${box}">
            <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; font-size:0.8rem; color:#cbd5e1; margin-bottom:8px;">
              เลเวลหัวหน้า <input type="number" id="pf-min" min="1" value="1" style="${inp} width:60px;"> -
              <input type="number" id="pf-max" min="1" value="999" style="${inp} width:60px;">
              แมพ <select id="pf-map" style="${inp}"><option value="">ทุกแมพ</option>${zoneOpts}</select>
              <button id="btn-party-search" style="${btn('#0ea5e9')}">ค้นหา</button>
            </div>
            <div id="party-search-results" style="font-size:0.8rem; color:#94a3b8;">กำลังค้นหา...</div>
          </div>`;
        const search = () => net?.sendPartyListRequest({
          minLevel: Number(document.getElementById('pf-min').value) || 1,
          maxLevel: Number(document.getElementById('pf-max').value) || 999,
          map: document.getElementById('pf-map').value || undefined
        });
        document.getElementById('btn-party-search').addEventListener('click', search);
        search();
      }

      body.querySelectorAll('.btn-party-tab').forEach(b => b.addEventListener('click', e => {
        this.partyTab = e.currentTarget.dataset.tab;
        this.renderPartyModal();
      }));
      return;
    }

    // ---- In a party ----
    const isLeader = party.leaderId === myId;
    const s = party.settings || { expShare: 'share', autoAccept: false, minLevel: 1, maxLevel: 999 };
    const memCount = party.members.length;

    const membersHtml = party.members.map(m => {
      const isMe = m.id === myId;
      const isMemLeader = m.id === party.leaderId;
      const actions = isLeader && !isMe ? `
        <button class="btn-pm-leader" data-id="${esc(m.id)}" style="${btn('#d97706')}">👑 มอบหัวหน้า</button>
        <button class="btn-pm-kick" data-id="${esc(m.id)}" style="${btn('#dc2626')}">เตะ</button>` : '';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid ${isMemLeader ? '#fbbf24' : 'rgba(255,255,255,0.08)'}; padding:8px 12px; border-radius:6px; margin-bottom:6px;">
          <div>
            <b style="color:${isMe ? '#38bdf8' : '#fff'}; font-size:0.88rem;">${isMemLeader ? '👑' : '🛡️'} ${esc(m.name)} ${isMe ? '(คุณ)' : ''}</b>
            <span style="font-size:0.75rem; color:#94a3b8;">Lv.${m.level || 1}</span>
            <div style="font-size:0.72rem; color:#34d399; margin-top:2px;">🗺️ ${esc(zoneName(m.map))} • HP ${m.hp ?? 0}/${m.maxHp ?? 0}</div>
          </div>
          <div style="display:flex; gap:6px;">${actions}</div>
        </div>`;
    }).join('');

    let inviteHtml = '';
    if (isLeader && memCount < 6 && net) {
      const rows = [];
      net.otherPlayers.forEach((op, pid) => {
        if (op.partyId || party.members.some(m => m.id === pid)) return;
        rows.push(`<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; font-size:0.8rem; color:#cbd5e1;">
          <span>${esc(op.name || 'Adventurer')} (Lv.${op.level || 1}) • ${esc(zoneName(op.currentMap))}</span>
          <button class="btn-party-invite-more" data-target="${esc(pid)}" style="${btn('#2563eb')}">✉️ ชวน</button></div>`);
      });
      inviteHtml = `<div style="${box}"><h5 style="margin-bottom:6px; font-size:0.82rem; color:#94a3b8;">ชวนผู้เล่นอื่น (${memCount}/6)</h5>${rows.join('') || '<span style="font-size:0.78rem; color:#94a3b8;">ไม่มีผู้เล่นที่ว่างอยู่</span>'}</div>`;
    }

    body.innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(59,130,246,0.25),rgba(245,158,11,0.15)); border:1px solid #3b82f6; border-radius:8px; padding:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div>
          <h4 style="color:#60a5fa; margin-bottom:3px;">🚩 ${esc(party.name)}</h4>
          <div style="font-size:0.78rem; color:#cbd5e1;">หัวหน้า: <b>${esc(party.leaderName)}</b> • สมาชิก: <b>${memCount}/6</b></div>
        </div>
        <button id="btn-party-leave-action" style="${btn('#ef4444')} padding:6px 14px;">ออกจากปาร์ตี้</button>
      </div>
      ${isLeader ? `<div style="${box}"><h4 style="margin-bottom:8px;">✏️ ชื่อปาร์ตี้</h4>
        <div style="display:flex; gap:8px;"><input type="text" id="input-rename" maxlength="24" style="${inp} flex:1;" value="${esc(party.name)}">
        <button id="btn-party-rename" style="${btn('#2563eb')}">เปลี่ยนชื่อ</button></div></div>` : ''}
      <div style="${box}"><h4 style="margin-bottom:8px;">⚙️ ตั้งค่าปาร์ตี้ ${isLeader ? '' : '(เฉพาะหัวหน้าแก้ได้)'}</h4>
        ${settingsFields(s, !isLeader)}
        ${isLeader ? `<button id="btn-party-save-settings" style="${btn('#16a34a')} margin-top:10px;">บันทึกการตั้งค่า</button>` : ''}
      </div>
      <div style="${box}"><h4 style="margin-bottom:10px;">👥 สมาชิก (${memCount}/6)</h4>${membersHtml}</div>
      ${inviteHtml}`;

    document.getElementById('btn-party-leave-action').addEventListener('click', () => {
      if (confirm('ยืนยันออกจากปาร์ตี้?')) net?.sendLeaveParty();
    });
    document.getElementById('btn-party-rename')?.addEventListener('click', () => {
      net?.sendRenameParty(document.getElementById('input-rename').value);
    });
    document.getElementById('btn-party-save-settings')?.addEventListener('click', () => {
      net?.sendPartySettings(readSettings());
    });
    body.querySelectorAll('.btn-pm-leader').forEach(b => b.addEventListener('click', e => {
      if (confirm('มอบหัวหน้าปาร์ตี้ให้คนนี้?')) net?.sendTransferLeader(e.currentTarget.dataset.id);
    }));
    body.querySelectorAll('.btn-pm-kick').forEach(b => b.addEventListener('click', e => {
      if (confirm('เตะสมาชิกคนนี้ออกจากปาร์ตี้?')) net?.sendKickMember(e.currentTarget.dataset.id);
    }));
    body.querySelectorAll('.btn-party-invite-more').forEach(b => b.addEventListener('click', e => {
      net?.sendInviteParty(e.currentTarget.dataset.target);
    }));
  }

  // Party finder results
  onPartyListReceived(list) {
    const el = document.getElementById('party-search-results');
    if (!el) return;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    if (!list.length) {
      el.innerHTML = 'ไม่พบปาร์ตี้ที่ตรงกับเงื่อนไข';
      return;
    }
    const myLevel = this.player.baseLevel;
    el.innerHTML = list.map(p => {
      const s = p.settings;
      const ok = myLevel >= s.minLevel && myLevel <= s.maxLevel && p.count < p.max;
      const z = ZONES.find(zz => zz.id === p.leaderMap);
      return `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:8px 10px; border-radius:6px; margin-bottom:6px;">
        <div style="color:#e2e8f0;">
          <b>${esc(p.name)}</b> <span style="color:#94a3b8;">(${p.count}/${p.max})</span>
          <div style="font-size:0.72rem; color:#94a3b8;">หัวหน้า ${esc(p.leaderName)} Lv.${p.leaderLevel} • ${esc(z ? z.name : '-')}<br>
          รับเลเวล ${s.minLevel}-${s.maxLevel} • ${s.expShare === 'share' ? 'หาร EXP' : 'ใครฆ่าได้'} • ${s.autoAccept ? '✅ รับอัตโนมัติ' : '📨 ต้องรออนุมัติ'}</div>
        </div>
        <button class="btn-party-join" data-id="${esc(p.id)}" ${ok ? '' : 'disabled'} style="padding:5px 12px; background:${ok ? '#16a34a' : '#475569'}; color:#fff; border:none; border-radius:5px; cursor:${ok ? 'pointer' : 'not-allowed'}; font-size:0.75rem;">${ok ? 'ขอเข้าร่วม' : 'เข้าไม่ได้'}</button>
      </div>`;
    }).join('');
    el.querySelectorAll('.btn-party-join:not([disabled])').forEach(b => b.addEventListener('click', e => {
      this.gameEngine.network?.sendJoinRequest(e.currentTarget.dataset.id);
    }));
  }

  // Update Party HUD widget on left side
  updatePartyHUD(party) {
    const listEl = document.getElementById('party-members-list');
    if (!listEl) return;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    if (!party || !party.members || party.members.length === 0) {
      listEl.innerHTML = '<div style="font-size:0.7rem; color:#94a3b8; padding:4px 6px;">ยังไม่มีปาร์ตี้ (กด [P] เพื่อสร้าง/ค้นหา)</div>';
      if (this.isOpen('modal-party')) this.renderPartyModal();
      return;
    }

    const myId = this.gameEngine.network ? this.gameEngine.network.myPlayerId : null;
    let html = '';
    party.members.forEach(m => {
      const isLeader = m.id === party.leaderId;
      const isMe = m.id === myId;
      const curHp = isMe ? this.player.currentHp : (m.hp || 0);
      const maxHp = isMe ? this.player.maxHp : (m.maxHp || 1);
      const hpPct = Math.min(100, Math.max(0, (curHp / maxHp) * 100));

      html += `
        <div class="party-member-row">
          <div class="party-member-info">
            <span class="party-member-name">${isLeader ? '👑 ' : ''}${esc(m.name)} ${isMe ? '(คุณ)' : ''}</span>
            <span class="party-member-lvl">Lv.${m.level || 1}</span>
          </div>
          <div class="party-member-hp-track">
            <div class="party-member-hp-fill" style="width: ${hpPct}%;"></div>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;

    if (this.isOpen('modal-party')) {
      this.renderPartyModal();
    }
  }

  // Show Party Invite popup banner
  showPartyInviteModal(partyId, partyName, leaderName) {
    const toast = document.getElementById('party-invite-toast');
    const desc = document.getElementById('party-invite-desc');
    if (toast && desc) {
      toast.dataset.partyId = partyId;
      desc.textContent = `${leaderName} ชวนคุณเข้าร่วมปาร์ตี้ "${partyName}"`;
      toast.style.display = 'block';
    }
  }

  // Leader sees this when someone asks to join (auto-accept off)
  showJoinRequestToast(partyId, requesterId, requesterName, requesterLevel) {
    const host = document.getElementById('game-viewport');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'party-invite-popup';
    el.style.display = 'block';
    el.style.top = `${180 + document.querySelectorAll('.party-join-toast').length * 110}px`;
    el.classList.add('party-join-toast');
    el.innerHTML = `
      <div class="invite-header">📨 ขอเข้าร่วมปาร์ตี้</div>
      <div class="invite-desc"></div>
      <div class="invite-actions">
        <button class="btn-invite-accept">รับเข้าตี้</button>
        <button class="btn-invite-decline">ปฏิเสธ</button>
      </div>`;
    el.querySelector('.invite-desc').textContent = `${requesterName} (Lv.${requesterLevel}) ขอเข้าร่วมปาร์ตี้ของคุณ`;
    const answer = (accept) => {
      this.gameEngine.network?.sendJoinResponse(requesterId, accept);
      el.remove();
    };
    el.querySelector('.btn-invite-accept').addEventListener('click', () => answer(true));
    el.querySelector('.btn-invite-decline').addEventListener('click', () => answer(false));
    host.appendChild(el);
    setTimeout(() => el.remove(), 60000);
  }
}

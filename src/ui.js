// UI Controller for PC MMORPG Fullscreen Edition
import { ZONES, ITEMS, RELICS, CRAFTING_RECIPES, GACHA_COSTUMES, QUESTS, WEAPON_TYPES, STAT_KEYS, MONSTERS, SKILLS } from './data.js';
import { SP_POTION_IDS, SKILL_SLOTS, GACHA_SINGLE, GACHA_PACK } from './player.js';
import { TILE_SIZE, getMapDef } from './maps.js';
import { soundEngine } from './audio.js';
import { itemIconHtml } from './sprites.js';

const SKILL_ICONS = {
  power_strike: '💥', whirlwind: '🌀', double_shot: '🏹', arrow_rain: '🌧️', fire_bolt: '🔥', frost_nova: '❄️', meteor_fall: '☄️',
  heal_light: '💚', iron_guard: '🛡️', berserk: '😡', dash: '💨', sword_mastery: '⚔️', tough_body: '💪', swift_feet: '👟', mana_well: '🔷', eagle_eye: '🦅'
};
const RARITY = { common: ['ธรรมดา', '#94a3b8'], uncommon: ['ไม่ธรรมดา', '#22c55e'], rare: ['หายาก', '#3b82f6'], epic: ['ตำนาน', '#f59e0b'] };
const WEAPON_REQ = { any: 'อาวุธใดก็ได้', melee: 'ดาบ/ไม้/มือเปล่า', bow: 'ธนู', staff: 'คฑา' };

export class UIController {
  constructor(player, gameEngine) {
    this.player = player;
    this.gameEngine = gameEngine;
    this.openWindows = new Set(); // several windows can stay open at once
    this.zCounter = 100;
    this.windowRenderers = {
      'modal-status': () => this.renderStatusModal(),
      'modal-party': () => this.renderPartyModal(),
      'modal-inventory': () => this.renderInventoryModal(),
      'modal-craft': () => this.renderCraftModal(),
      'modal-quests': () => this.renderQuestsModal(),
      'modal-relics': () => this.renderRelicsModal(),
      'modal-shop': () => this.renderShopModal(),
      'modal-zones': () => this.renderZonesModal(),
      'modal-auto': () => this.renderAutoModal(),
      'modal-skills': () => this.renderSkillsModal()
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
      { id: 'btn-open-skills', modalId: 'modal-skills', render: () => this.renderSkillsModal() },
      { id: 'btn-open-craft', modalId: 'modal-craft', render: () => this.renderCraftModal() },
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
      menu.style.display = open ? 'flex' : 'none';
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
        if (!this.gameEngine.selectedTarget) {
          const live = this.gameEngine.monsters.filter(m => !m.isDead);
          if (live.length > 0) {
            this.gameEngine.selectedTarget = live[0];
            this.gameEngine.updateTargetHUD(live[0]);
          }
        } else {
          this.gameEngine.tryPlayerAttack(this.gameEngine.selectedTarget);
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
      else if (key === 'j') this.toggleModal('modal-quests', () => this.renderQuestsModal());
      else if (key === 't') this.toggleModal('modal-relics', () => this.renderRelicsModal());
      else if (key === 'k') this.toggleModal('modal-shop', () => this.renderShopModal());
      else if (key === 'm') this.toggleModal('modal-zones', () => this.renderZonesModal());
      else if (key === 'q') this.gameEngine.usePotionSlot();
      else if (key === 'e') this.gameEngine.useSpPotionSlot();
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
    this.saveWindowState();
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    this.openWindows.delete(modalId);
    this.saveWindowState();
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

  // Position: remembered spot, otherwise a cascade near the centre
  placeWindow(modal) {
    if (modal.dataset.placed) return;
    modal.dataset.placed = '1';
    let pos = null;
    try { pos = (JSON.parse(localStorage.getItem('win_pos') || '{}'))[modal.id]; } catch (e) { /* ignore */ }
    const w = Math.min(680, window.innerWidth * 0.94);
    if (!pos) {
      const n = this.openWindows.size - 1;
      pos = { x: Math.max(8, (window.innerWidth - w) / 2 + n * 28), y: 70 + n * 28 };
    }
    modal.style.left = `${this.clampX(pos.x, w)}px`;
    modal.style.top = `${this.clampY(pos.y)}px`;
  }

  clampX(x, w) { return Math.min(Math.max(0, x), Math.max(0, window.innerWidth - Math.min(w, 120))); }
  clampY(y) { return Math.min(Math.max(0, y), Math.max(0, window.innerHeight - 60)); }

  saveWindowState() {
    try {
      localStorage.setItem('win_open', JSON.stringify([...this.openWindows]));
    } catch (e) { /* ignore */ }
  }

  // Drag by header, click brings to front, positions are remembered
  initWindows() {
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
          modal.style.top = `${this.clampY(ev.clientY - startY)}px`;
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
    const sig = JSON.stringify([pl.gold, pl.gachaTokens, pl.baseLevel, pl.statPoints, pl.inventory, pl.equipment, pl.questProgress, pl.collectedRelics.length, pl.learnedSkills, pl.skillBooks, pl.skillLoadout]);
    if (sig === this.lastWindowSig) return;
    this.lastWindowSig = sig;
    const a = document.activeElement;
    this.openWindows.forEach(id => {
      if (id === 'modal-party' || id === 'modal-auto' || id === 'modal-zones') return; // have their own refresh / inputs
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
    iconEl.textContent = shown ? (ITEMS[shown].icon || '🧪') : '＋';
    countEl.textContent = shown ? (this.player.inventory[shown] || 0) : '';
    document.getElementById('slot-hp-potion')?.classList.toggle('empty', !shown || !(this.player.inventory[shown] > 0));
    const spOwned = this.player.ownedSpPotions();
    const spShown = (this.player.spPotionSlot && this.player.inventory[this.player.spPotionSlot] > 0) ? this.player.spPotionSlot : spOwned[0];
    const spIcon = document.getElementById('qs-sp-icon');
    const spCount = document.getElementById('qs-sp-count');
    if (spIcon && spCount) {
      spIcon.textContent = spShown ? (ITEMS[spShown].icon || '💧') : '＋';
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
              ${['hp_potion_s', 'apple', 'hp_potion_m', 'boar_meat', 'hp_potion_l'].filter(id => ITEMS[id]).map(id =>
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
      if (expText) expText.textContent = `Lv.${this.player.baseLevel}  ${this.player.baseExp.toLocaleString()} / ${maxB.toLocaleString()}  (${bPct.toFixed(1)}%)`;
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
          textSpan.textContent = cd >= 1 ? `${Math.ceil(cd)}s` : cd.toFixed(1);
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
    const a = ITEMS[pl.equipment.armor];
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
    const readDerived = () => ({ hp: pl.maxHp, atk: pl.attack, def: pl.defense, aspd: pl.aspd, move: pl.moveMul, crit: pl.critRate });
    const before = readDerived();
    STAT_KEYS.forEach(k => { pl.stats[k] += pend[k] || 0; });
    const after = readDerived();
    STAT_KEYS.forEach(k => { pl.stats[k] -= pend[k] || 0; });
    const prev = (key, fmt = v => v) => {
      const a = after[key], b = before[key];
      return a !== b ? `${fmt(b)} <span style="color:#4ade80;">→ ${fmt(a)}</span>` : fmt(b);
    };
    const row = (l, v) => `<div style="display:flex; justify-content:space-between; padding:4px 0;"><span>${l}</span> <b>${v}</b></div>`;

    body.innerHTML = `
      <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:10px 14px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:3px;">
          <span style="font-weight:700; color:#38bdf8;">⭐ Level ${pl.baseLevel}</span>
          <span style="color:#94a3b8; font-size:0.75rem;">${bPct.toFixed(1)}%</span>
        </div>
        <div style="width:100%; height:8px; background:#1e293b; border-radius:4px; overflow:hidden;">
          <div style="width:${bPct}%; height:100%; background:linear-gradient(90deg,#0284c7,#38bdf8);"></div>
        </div>
        <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px; text-align:right;">${pl.baseExp.toLocaleString()} / ${maxB.toLocaleString()} EXP</div>
        <div style="font-size:0.72rem; color:#94a3b8; margin-top:4px;">เลเวลใช้เป็นเงื่อนไขสวมอาวุธ/เกราะหายาก</div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="font-weight:700;">📊 จัดสรรค่าสเตตัส</span>
            <span style="color:#f59e0b; font-size:0.85rem;">แต้มคงเหลือ: <b>${pendLeft}</b>
              <button id="btn-stat-reset" style="margin-left:8px; padding:2px 8px; background:#7f1d1d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:0.75rem;">🔄 รีสเตตัส (ฟรี)</button></span>
          </div>
          ${STAT_KEYS.map(k => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05);" title="${statHelp[k]}">
              <span style="font-weight:600; text-transform:uppercase; width:42px;">${k}</span>
              <span style="flex:1; font-size:0.68rem; color:#94a3b8;">${statHelp[k]}</span>
              <b style="width:50px; text-align:right; margin-right:8px;">${pl.stats[k]}${pend[k] ? `<span style="color:#4ade80;"> +${pend[k]}</span>` : ''}</b>
              <button class="btn-stat-sub" data-stat="${k}" ${pend[k] > 0 ? '' : 'disabled'} style="width:24px; height:24px; margin-right:4px; background:#475569; color:#fff; border:none; border-radius:4px; cursor:pointer; touch-action:none; ${pend[k] > 0 ? '' : 'opacity:0.4;'}">−</button>
              <button class="btn-stat-add" data-stat="${k}" ${pendLeft > 0 ? '' : 'disabled'} style="width:24px; height:24px; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer; touch-action:none;">+</button>
            </div>
          `).join('')}
          ${pendTotal > 0 ? `<div style="display:flex; gap:8px; margin-top:10px;">
            <button id="btn-stat-confirm" style="flex:1; padding:6px; background:#16a34a; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:700;">✅ ยืนยัน (${pendTotal} แต้ม)</button>
            <button id="btn-stat-cancel" style="padding:6px 10px; background:#475569; color:#fff; border:none; border-radius:4px; cursor:pointer;">ยกเลิก</button>
          </div>` : ''}
        </div>
        <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); font-size:0.85rem;">
          <h4 style="margin-bottom:8px;">⚔️ ข้อมูลพลังรบรวม</h4>
          ${row('อาวุธ:', w ? w.name : 'มือเปล่า')}
          ${row('ประเภท / ระยะโจมตี:', `${wtName} / ${info.range}px`)}
          ${row('เกราะ:', a ? a.name : '-')}
          ${row('Max HP:', prev('hp'))}
          ${row('Total ATK:', prev('atk'))}
          ${row('Total DEF:', prev('def'))}
          ${row('ASPD:', prev('aspd', v => `${v}/s`))}
          ${row('Move Speed:', prev('move', v => `${Math.round(v * 100)}%`))}
          ${row('Crit Rate:', prev('crit', v => `${(v * 100).toFixed(1)}%`))}
          ${row('สมบัติ Relic:', `${pl.collectedRelics.length}/12 ชิ้น`)}
        </div>
      </div>
    `;

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
      const step = (k, dir) => {
        const p = this.pendingStats || (this.pendingStats = {});
        const left = this.player.statPoints - STAT_KEYS.reduce((n, key) => n + (p[key] || 0), 0);
        if (dir > 0 && left <= 0) return false;
        if (dir < 0 && !(p[k] > 0)) return false;
        p[k] = (p[k] || 0) + dir;
        this.renderStatusModal();
        return true;
      };
      body.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.btn-stat-add, .btn-stat-sub');
        if (!btn || btn.disabled) return;
        e.preventDefault();
        const k = btn.dataset.stat;
        const dir = btn.classList.contains('btn-stat-add') ? 1 : -1;
        stop();
        if (!step(k, dir)) return;
        delay = setTimeout(() => {
          tick = setInterval(() => { if (!step(k, dir)) stop(); }, 110);
        }, 400);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => body.addEventListener(ev, stop));
      document.addEventListener('pointerup', stop);
    }
  }

  // 2. Inventory Modal: items only, split into tabs (crafting lives in its own window)
  renderInventoryModal() {
    const body = document.getElementById('modal-inventory-body');
    if (!body) return;

    const TABS = [
      { id: 'all', label: '🎒 ทั้งหมด', match: () => true },
      { id: 'gear', label: '🛡️ ของสวมใส่', match: it => it.type === 'weapon' || it.type === 'armor' },
      { id: 'consumable', label: '🧪 ของใช้', match: it => it.type === 'consumable' },
      { id: 'material', label: '🦴 วัสดุจากมอนสเตอร์', match: it => it.type === 'material' }
    ];
    if (!TABS.some(t => t.id === this.invTab)) this.invTab = 'all';
    const tab = TABS.find(t => t.id === this.invTab);

    const weapon = ITEMS[this.player.equipment.weapon];
    const armor = ITEMS[this.player.equipment.armor];
    const owned = Object.keys(this.player.inventory).filter(k => ITEMS[k] && this.player.inventory[k] > 0);
    const countOf = t => owned.filter(k => t.match(ITEMS[k])).length;
    const shown = owned.filter(k => tab.match(ITEMS[k]));

    const tabsHtml = TABS.map(t => `<button class="btn-inv-tab" data-tab="${t.id}" style="padding:5px 10px; border:none; border-radius:5px 5px 0 0; cursor:pointer; font-size:0.78rem; font-weight:600; background:${t.id === tab.id ? '#2563eb' : 'rgba(255,255,255,0.08)'}; color:#fff;">${t.label} (${countOf(t)})</button>`).join('');

    const view = this.invView === 'equip' ? 'equip' : 'bag';
    const viewBtn = (id, label) => `<button class="btn-inv-view" data-view="${id}" style="flex:1; padding:7px; border:none; border-bottom:3px solid ${view === id ? '#3b82f6' : 'transparent'}; background:${view === id ? 'rgba(59,130,246,0.15)' : 'transparent'}; color:${view === id ? '#fff' : '#94a3b8'}; font-weight:700; cursor:pointer;">${label}</button>`;
    const viewsHtml = `<div style="display:flex; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1);">${viewBtn('bag', '🎒 Inventory')}${viewBtn('equip', '🛡️ อุปกรณ์สวมใส่')}</div>`;

    const slotStyle = 'position:relative; aspect-ratio:1; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); border-radius:6px; cursor:pointer; user-select:none;';
    let invHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(56px, 1fr)); gap:6px; margin-top:10px;">';
    if (shown.length === 0) {
      invHtml += '<p style="color:#94a3b8; font-size:0.85rem; grid-column:1/-1;">ไม่มีไอเทมในหมวดนี้ ออกไปฟาร์มมอนสเตอร์กันเถอะ!</p>';
    } else {
      shown.forEach(k => {
        const item = ITEMS[k];
        const isOn = k === this.player.equipment.weapon || k === this.player.equipment.armor;
        invHtml += `
          <div class="inv-slot" data-id="${k}" style="${slotStyle} border:1px solid ${isOn ? '#2563eb' : 'rgba(255,255,255,0.1)'};">
            <span style="font-size:26px; display:flex;">${itemIconHtml(k, item.icon, 40)}</span>
            <span style="position:absolute; right:3px; bottom:1px; font-size:0.68rem; color:#f59e0b; text-shadow:0 0 3px #000;">${this.player.inventory[k] > 1 ? this.player.inventory[k] : ''}</span>
          </div>`;
      });
    }
    invHtml += '</div>';

    const gearRow = (label, it) => `
      <div class="inv-slot" data-id="${it ? it.id : ''}" style="display:flex; gap:12px; align-items:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; margin-bottom:8px;">
        <div style="font-size:30px; display:flex;">${it ? itemIconHtml(it.id, it.icon, 44) : '—'}</div>
        <div style="font-size:0.85rem;">
          <div style="color:#94a3b8; font-size:0.72rem;">${label}</div>
          <div style="font-weight:700;">${it ? it.name : 'ไม่มี'}</div>
          ${it ? `<div style="color:#fde68a;">${it.atk ? `ATK +${it.atk}` : ''}${it.atk && it.def ? ' · ' : ''}${it.def ? `DEF +${it.def}` : ''}</div>` : ''}
          ${it && it.desc ? `<div style="color:#94a3b8; font-size:0.72rem;">${it.desc}</div>` : ''}
        </div>
      </div>`;

    body.innerHTML = viewsHtml + (view === 'equip' ? `
      ${gearRow('⚔️ อาวุธ', weapon)}
      ${gearRow('🛡️ เกราะ', armor)}
      <div style="margin-top:8px; font-size:0.78rem; color:#94a3b8;">ดับเบิลคลิกอุปกรณ์ในแท็บ Inventory เพื่อสวมใส่</div>
    ` : `
      <div style="display:flex; gap:4px; flex-wrap:wrap; border-bottom:1px solid rgba(255,255,255,0.15);">${tabsHtml}</div>
      ${invHtml}
      <div style="margin-top:12px; font-size:0.78rem; color:#94a3b8;">เลื่อนเมาส์ไปที่ไอเทมเพื่อดูรายละเอียด · ดับเบิลคลิกเพื่อสวมใส่/ใช้ · 🔨 คราฟต์ที่ <b>โต๊ะคราฟต์</b> <kbd>B</kbd></div>
    `);

    // Hover tooltip in a separate floating window
    let tip = document.getElementById('inv-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'inv-tooltip';
      tip.style.cssText = 'position:fixed; z-index:99999; display:none; pointer-events:none; gap:6px; align-items:flex-start; color:#fff; font-size:0.78rem; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.6));';
      document.body.appendChild(tip);
    }
    tip.style.display = 'none';
    const STAT_ROWS = [['atk', 'ATK'], ['def', 'DEF'], ['heal', 'HP ฟื้นฟู'], ['sp', 'SP ฟื้นฟู']];
    const row = (label, val, extra = '') => `<div style="display:grid; grid-template-columns:78px 1fr; gap:6px; padding:2px 0; border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:#94a3b8;">${label}</span><span style="text-align:right; font-weight:600;">${val}${extra}</span></div>`;
    const panel = (title, inner, border) => `<div style="min-width:170px; max-width:220px; padding:8px 10px; background:rgba(15,23,42,0.97); border:1px solid ${border}; border-radius:8px;">${title}${inner}</div>`;
    const tipHtml = (k) => {
      const item = ITEMS[k];
      const isGear = item.type === 'weapon' || item.type === 'armor';
      const curId = isGear ? this.player.equipment[item.type] : null;
      const cur = (curId && curId !== k) ? ITEMS[curId] : null;
      const head = (it, tag, tagColor) => `<div style="font-weight:700; font-size:0.85rem;">${it.name}</div><div style="color:${tagColor}; font-size:0.7rem; margin-bottom:4px;">${tag}</div>`;
      const stats = (it, other) => STAT_ROWS.filter(([f]) => it[f] || (other && other[f])).map(([f, label]) => {
        const v = it[f] || 0;
        let extra = '';
        if (other) {
          const d = v - (other[f] || 0);
          if (d !== 0) extra = ` <span style="color:${d > 0 ? '#4ade80' : '#f87171'};">(${d > 0 ? '+' : ''}${d})</span>`;
        }
        return row(label, `+${v}`, extra);
      }).join('');
      const typeLabel = { weapon: 'อาวุธ', armor: 'เกราะ', consumable: 'ของใช้', material: 'วัสดุ' }[item.type] || '';
      const lv = item.reqLevel > 1 ? row('เลเวลที่ต้องการ', `Lv.${item.reqLevel}`, '') .replace('<span style="text-align:right; font-weight:600;">', `<span style="text-align:right; font-weight:600; color:${this.player.baseLevel >= item.reqLevel ? '#e2e8f0' : '#ef4444'};">`) : '';
      const hint = isGear ? (curId === k ? '<div style="color:#4ade80; margin-top:4px;">สวมอยู่</div>' : '<div style="color:#60a5fa; margin-top:4px;">ดับเบิลคลิกเพื่อสวมใส่</div>')
        : (item.type === 'consumable' ? '<div style="color:#60a5fa; margin-top:4px;">ดับเบิลคลิกเพื่อใช้</div>' : '');
      const main = panel(head(item, typeLabel, '#94a3b8'), stats(item, cur) + lv + (item.desc ? `<div style="color:#cbd5e1; margin-top:4px; font-size:0.72rem;">${item.desc}</div>` : '') + hint, '#3b82f6');
      if (!cur) return main;
      const cmp = panel(head(cur, 'ที่สวมอยู่ตอนนี้', '#4ade80'), stats(cur, null) + (cur.desc ? `<div style="color:#cbd5e1; margin-top:4px; font-size:0.72rem;">${cur.desc}</div>` : ''), '#16a34a');
      return main + cmp;
    };
    body.querySelectorAll('.inv-slot').forEach(el => {
      const k = el.dataset.id;
      if (!k || !ITEMS[k]) return;
      el.addEventListener('mouseenter', () => { el.dataset.bc = el.style.borderColor; el.style.borderColor = '#fbbf24'; el.style.boxShadow = '0 0 0 1px #fbbf24'; tip.innerHTML = tipHtml(k); tip.style.display = 'flex'; });
      el.addEventListener('mousemove', e => {
        const w = tip.offsetWidth, h = tip.offsetHeight;
        tip.style.left = Math.min(e.clientX + 14, window.innerWidth - w - 6) + 'px';
        tip.style.top = Math.min(e.clientY + 14, window.innerHeight - h - 6) + 'px';
      });
      el.addEventListener('mouseleave', () => { tip.style.display = 'none'; el.style.borderColor = el.dataset.bc || ''; el.style.boxShadow = ''; });
      el.addEventListener('dblclick', () => {
        tip.style.display = 'none';
        const item = ITEMS[k];
        if (item.type === 'weapon' || item.type === 'armor') {
          const res = this.player.equipItem(k);
          if (!res.ok) { this.gameEngine.onLog(`🚫 สวมใส่ ${item.name} ไม่ได้: ${res.reason}`, 'system'); return; }
          this.gameEngine.onLog(`🛡️ สวมใส่ ${item.name}`, 'system');
        } else if (item.type === 'consumable' && item.sp) {
          const res = this.player.useSpPotion(k);
          if (res) this.gameEngine.onLog(`💧 ใช้ ${res.itemName} ฟื้นฟู ${res.restored} SP`, 'system');
        } else if (item.type === 'consumable' && item.heal) {
          const res = this.player.usePotion(k);
          if (res) this.gameEngine.onLog(`🧪 ใช้ ${res.itemName} ฟื้นฟู ${res.healed} HP`, 'system');
        } else return;
        this.renderInventoryModal();
        this.updateHUD();
      });
    });

    body.querySelectorAll('.btn-inv-view').forEach(b => b.addEventListener('click', e => {
      this.invView = e.currentTarget.dataset.view;
      this.renderInventoryModal();
    }));

    body.querySelectorAll('.btn-inv-tab').forEach(b => {
      b.addEventListener('click', e => {
        this.invTab = e.currentTarget.dataset.tab;
        this.renderInventoryModal();
      });
    });
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
        <div style="font-size:0.7rem; color:#94a3b8; margin-top:6px;">สกิลติดตัว (Passive) ก็ใช้ 1 ช่องเหมือนกัน • 💧 SP ${Math.floor(pl.currentSp)}/${pl.maxSp} (ฟื้น ${pl.spRegen.toFixed(1)}/วิ)</div></div>
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

  // 3. Quests Modal
  renderQuestsModal() {
    const body = document.getElementById('modal-quests-body');
    if (!body) return;

    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
    QUESTS.forEach(q => {
      const st = this.player.questProgress[q.id] || { progress: 0, completed: false, claimed: false };
      const pct = Math.min(100, (st.progress / q.requiredCount) * 100);

      html += `
        <div class="quest-card" data-qid="${q.id}" title="คลิกเพื่อไปยังแมพที่ต้องล่า" style="cursor:pointer; background:rgba(0,0,0,0.3); border:1px solid ${st.completed ? '#10b981' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:10px;">
          <div style="display:flex; justify-content:space-between; font-size:0.88rem; margin-bottom:4px;">
            <b>${q.title}</b>
            <span style="color:${st.completed ? '#34d399' : '#94a3b8'};">${st.claimed ? '✅ รับรางวัลแล้ว' : st.completed ? '🎉 สำเร็จ!' : `${st.progress}/${q.requiredCount}`}</span>
          </div>
          <p style="font-size:0.78rem; color:#94a3b8; margin-bottom:6px;">${q.desc}</p>
          <div style="width:100%; height:6px; background:#1e293b; border-radius:3px; overflow:hidden; margin-bottom:6px;">
            <div style="height:100%; width:${pct}%; background:#3b82f6;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#f59e0b;">
            <span>รางวัล: +${q.rewardGold} Gold, +${q.rewardExp} Base EXP, +${q.rewardTokens} Gacha Token</span>
            ${!st.claimed ? `
              <button class="btn-claim-q" data-id="${q.id}" ${st.completed ? '' : 'disabled'} style="padding:4px 10px; background:${st.completed ? '#10b981' : '#475569'}; color:#fff; border:none; border-radius:4px; cursor:${st.completed ? 'pointer' : 'not-allowed'}; font-weight:600;">รับรางวัล</button>
            ` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';

    body.innerHTML = html;

    body.querySelectorAll('.quest-card').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        this.promptQuestTravel(el.dataset.qid);
      });
    });

    body.querySelectorAll('.btn-claim-q').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const q = QUESTS.find(item => item.id === id);
        const st = this.player.questProgress[id];
        if (q && st && st.completed && !st.claimed) {
          st.claimed = true;
          this.player.gold += q.rewardGold;
          this.player.gachaTokens += q.rewardTokens;
          this.player.gainExp(q.rewardExp);
          this.player.saveToStorage();
          this.gameEngine.onLog(`🎁 รับรางวัลเควสต์: +${q.rewardGold} Gold, +${q.rewardTokens} Token`, 'quest');
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
        💎 มอนสเตอร์ทุกตัวในเกมมี <b>Rare Relic ประจำตัว 1 ชิ้น</b> สะสมแล้วจะเพิ่มสเตตัสถาวรให้ทั้งตัวละคร! (สะสมแล้ว: <b>${this.player.collectedRelics.length}/${list.length} ชิ้น</b>)
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px;">
    `;

    list.forEach(r => {
      const unlocked = this.player.collectedRelics.includes(r.id);
      html += `
        <div style="background:rgba(0,0,0,0.3); border:1px solid ${unlocked ? '#ec4899' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:10px; display:flex; gap:10px; align-items:center; opacity:${unlocked ? '1' : '0.45'};">
          <div style="font-size:28px;">${unlocked ? r.icon : '❓'}</div>
          <div>
            <b style="font-size:0.85rem;">${unlocked ? r.name : '??? (สมบัติยังไม่ถูกค้นพบ)'}</b>
            <div style="font-size:0.75rem; color:#f59e0b; margin-top:2px;">${unlocked ? `⚡ ${r.bonusText}` : '🔒 ดรอปจากมอนสเตอร์เฉพาะตัว'}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    body.innerHTML = html;
  }

  // 5. Shop & Gacha Modal
  renderShopModal() {
    const body = document.getElementById('modal-shop-body');
    if (!body) return;

    let wardrobeHtml = '<div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto; margin-top:8px;">';
    GACHA_COSTUMES.forEach(c => {
      const unlocked = this.player.unlockedCostumes.includes(c.id);
      const isEquipped = Object.values(this.player.costumes).includes(c.id);
      wardrobeHtml += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:6px 10px; border-radius:6px; opacity:${unlocked ? '1' : '0.5'};">
          <span style="font-size:0.82rem;">${c.icon} <b>${c.name}</b></span>
          ${unlocked ? `
            <button class="btn-wear-costume" data-id="${c.id}" style="padding:3px 8px; background:${isEquipped ? '#ef4444' : '#a855f7'}; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:0.72rem;">
              ${isEquipped ? 'ถอด' : 'สวมใส่'}
            </button>
          ` : '<span style="font-size:0.7rem; color:#94a3b8;">ยังไม่มี</span>'}
        </div>
      `;
    });
    wardrobeHtml += '</div>';

    body.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1.2fr; gap:14px;">
        <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
          <h4>🛒 ร้านค้าของชำ (NPC Merchant)</h4>
          <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 10px;">ขายขยะฟาร์ม หรือซื้อโพชั่นเพิ่มเลือด</p>
          <button id="modal-sell-trash" style="width:100%; padding:8px; background:#f59e0b; color:#000; font-weight:700; border:none; border-radius:6px; cursor:pointer; margin-bottom:12px;">💰 ขายขยะทั้งหมด (Sell All Trash)</button>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
              <span>🧪 Red Potion (S)</span>
              <button class="btn-buy-pot-m" data-id="hp_potion_s" data-cost="20" style="padding:3px 8px; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer;">ซื้อ (20 G)</button>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
              <span>💧 Blue Potion (S) +40 SP</span>
              <button class="btn-buy-pot-m" data-id="sp_potion_s" data-cost="30" style="padding:3px 8px; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer;">ซื้อ (30 G)</button>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
              <span>💧 Blue Potion (M) +120 SP</span>
              <button class="btn-buy-pot-m" data-id="sp_potion_m" data-cost="90" style="padding:3px 8px; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer;">ซื้อ (90 G)</button>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
              <span>🧪 Red Potion (M)</span>
              <button class="btn-buy-pot-m" data-id="hp_potion_m" data-cost="60" style="padding:3px 8px; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer;">ซื้อ (60 G)</button>
            </div>
          </div>
        </div>

        <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
          <h4>✨ ตู้สุ่มกาชาแฟชั่น (Fashion Gacha)</h4>
          <div style="display:flex; gap:8px; margin:10px 0;">
            <button id="modal-pull-token" style="flex:1; padding:7px; background:linear-gradient(135deg,#a855f7,#ec4899); color:#fff; font-weight:600; border:none; border-radius:6px; cursor:pointer;" ${this.player.gachaTokens >= 1 ? '' : 'disabled'}>🎟️ สุ่มด้วย Token [${this.player.gachaTokens}]</button>
            <button id="modal-pull-gold" style="flex:1; padding:7px; background:#f59e0b; color:#000; font-weight:600; border:none; border-radius:6px; cursor:pointer;" ${this.player.gold >= 500 ? '' : 'disabled'}>🪙 สุ่ม (500 G)</button>
          </div>
          <h5 style="margin-top:10px; font-size:0.85rem;">👗 ตู้เสื้อผ้าแฟชั่น:</h5>
          ${wardrobeHtml}
        </div>
      </div>
    `;

    document.getElementById('modal-sell-trash')?.addEventListener('click', () => {
      let gain = 0;
      Object.keys(this.player.inventory).forEach(k => {
        const item = ITEMS[k];
        if (item && item.type === 'material') {
          const qty = this.player.inventory[k];
          gain += qty * item.price;
          this.player.removeItem(k, qty);
        }
      });
      if (gain > 0) {
        this.player.gold += gain;
        this.gameEngine.onLog(`💰 ขายไอเทมขยะได้เงิน +${gain.toLocaleString()} Gold!`, 'system');
        this.renderShopModal();
        this.updateHUD();
      } else {
        this.gameEngine.onLog('⚠️ ไม่มีไอเทมขยะในกระเป๋า', 'system');
      }
    });

    body.querySelectorAll('.btn-buy-pot-m').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const cost = parseInt(e.currentTarget.dataset.cost);
        if (this.player.gold >= cost) {
          this.player.gold -= cost;
          this.player.addItem(id, 1);
          this.gameEngine.onLog(`🛒 ซื้อ ${ITEMS[id].name}`, 'system');
          this.renderShopModal();
          this.updateHUD();
        } else {
          this.gameEngine.onLog('⚠️ Gold ไม่เพียงพอ', 'system');
        }
      });
    });

    const pullGacha = () => {
      const picked = GACHA_COSTUMES[Math.floor(Math.random() * GACHA_COSTUMES.length)];
      if (!this.player.unlockedCostumes.includes(picked.id)) {
        this.player.unlockedCostumes.push(picked.id);
        this.gameEngine.onLog(`🎉 กาชาแตก! ได้รับชุดแฟชั่นใหม่: ${picked.name}`, 'relic');
      } else {
        this.player.gold += 300;
        this.gameEngine.onLog(`✨ ได้รับชุดซ้ำ: ${picked.name} (แปลงเป็น +300 Gold)`, 'system');
      }
      this.renderShopModal();
      this.updateHUD();
    };

    document.getElementById('modal-pull-token')?.addEventListener('click', () => {
      if (this.player.gachaTokens >= 1) {
        this.player.gachaTokens--;
        pullGacha();
      }
    });

    document.getElementById('modal-pull-gold')?.addEventListener('click', () => {
      if (this.player.gold >= 500) {
        this.player.gold -= 500;
        pullGacha();
      }
    });

    body.querySelectorAll('.btn-wear-costume').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const c = GACHA_COSTUMES.find(item => item.id === id);
        if (!c) return;
        if (this.player.costumes[c.slot] === id) {
          this.player.costumes[c.slot] = null;
        } else {
          this.player.costumes[c.slot] = id;
        }
        this.player.saveToStorage();
        this.renderShopModal();
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

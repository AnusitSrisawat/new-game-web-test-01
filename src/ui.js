// UI Controller for PC MMORPG Fullscreen Edition
import { ZONES, ITEMS, RELICS, CRAFTING_RECIPES, GACHA_COSTUMES, QUESTS } from './data.js';
import { soundEngine } from './audio.js';

export class UIController {
  constructor(player, gameEngine) {
    this.player = player;
    this.gameEngine = gameEngine;
    this.activeModal = null;
    this.chatFilter = 'all';

    this.initEventListeners();
    this.initKeyboardHotkeys();
    this.renderAll();
  }

  initEventListeners() {
    // Modal Open Buttons
    const modalButtons = [
      { id: 'btn-open-status', modalId: 'modal-status', render: () => this.renderStatusModal() },
      { id: 'btn-open-party', modalId: 'modal-party', render: () => this.renderPartyModal() },
      { id: 'btn-open-party-modal', modalId: 'modal-party', render: () => this.renderPartyModal() },
      { id: 'btn-open-inventory', modalId: 'modal-inventory', render: () => this.renderInventoryModal() },
      { id: 'btn-open-quests', modalId: 'modal-quests', render: () => this.renderQuestsModal() },
      { id: 'btn-open-relics', modalId: 'modal-relics', render: () => this.renderRelicsModal() },
      { id: 'btn-open-shop', modalId: 'modal-shop', render: () => this.renderShopModal() },
      { id: 'btn-open-zones', modalId: 'modal-zones', render: () => this.renderZonesModal() },
      { id: 'btn-hud-zone', modalId: 'modal-zones', render: () => this.renderZonesModal() }
    ];

    modalButtons.forEach(btn => {
      const el = document.getElementById(btn.id);
      if (el) {
        el.addEventListener('click', () => {
          this.toggleModal(btn.modalId, btn.render);
        });
      }
    });

    // Quick Boss Raid Entry Button
    const quickBossBtn = document.getElementById('btn-quick-boss-raid');
    if (quickBossBtn) {
      quickBossBtn.addEventListener('click', () => {
        this.gameEngine.changeMap('boss_lair');
      });
    }

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

    // Potion Button (Action wheel)
    const potBtn = document.getElementById('btn-hud-potion');
    if (potBtn) {
      potBtn.addEventListener('click', () => {
        this.gameEngine.useSkillSlot(5);
      });
    }

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
          this.gameEngine.performPlayerAttack(this.gameEngine.selectedTarget);
        }
      });
    }

    // Skills & Items Slots 1 to 9 clicks at Bottom-Center
    for (let slot = 1; slot <= 9; slot++) {
      const el = document.getElementById(`slot-${slot}`);
      if (el) {
        el.addEventListener('click', () => this.gameEngine.useSkillSlot(slot));
      }
    }

    // Sound Mute / Unmute Button
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const isMuted = soundEngine.toggleMute();
        soundBtn.textContent = isMuted ? '🔇 เสียง [OFF]' : '🔊 เสียง [ON]';
        this.gameEngine.onLog(isMuted ? '🔇 ปิดเสียงเอฟเฟกต์' : '🔊 เปิดเสียงเอฟเฟกต์', 'system');
      });
    }

    // Chat tabs
    document.querySelectorAll('.chat-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.chatFilter = e.currentTarget.dataset.tab;
      });
    });

    // Monster kill event
    window.addEventListener('monsterKilled', (e) => {
      this.updateQuestProgress(e.detail.monsterId);
      if (this.activeModal === 'modal-quests') this.renderQuestsModal();
    });
  }

  initKeyboardHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      if (key === 'c') this.toggleModal('modal-status', () => this.renderStatusModal());
      else if (key === 'p') this.toggleModal('modal-party', () => this.renderPartyModal());
      else if (key === 'i') this.toggleModal('modal-inventory', () => this.renderInventoryModal());
      else if (key === 'j') this.toggleModal('modal-quests', () => this.renderQuestsModal());
      else if (key === 't') this.toggleModal('modal-relics', () => this.renderRelicsModal());
      else if (key === 'k') this.toggleModal('modal-shop', () => this.renderShopModal());
      else if (key === 'm') this.toggleModal('modal-zones', () => this.renderZonesModal());
      else if (key === 'escape') {
        if (this.activeModal) this.closeModal(this.activeModal);
      }
    });
  }

  toggleModal(modalId, renderFn) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (this.activeModal === modalId) {
      this.closeModal(modalId);
    } else {
      if (this.activeModal) this.closeModal(this.activeModal);
      this.activeModal = modalId;
      modal.classList.add('active');
      if (renderFn) renderFn();
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    if (this.activeModal === modalId) this.activeModal = null;
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
    const classEl = document.getElementById('hud-unit-class');
    const rebornEl = document.getElementById('hud-unit-reborn');
    const baseLvlEl = document.getElementById('hud-base-lvl');
    const jobLvlEl = document.getElementById('hud-job-lvl');

    const hpFill = document.getElementById('hud-hp-fill');
    const hpText = document.getElementById('hud-hp-text');
    const spFill = document.getElementById('hud-sp-fill');
    const spText = document.getElementById('hud-sp-text');
    const baseExpFill = document.getElementById('hud-base-exp-fill');
    const baseExpText = document.getElementById('hud-base-exp-text');
    const jobExpFill = document.getElementById('hud-job-exp-fill');
    const jobExpText = document.getElementById('hud-job-exp-text');

    const goldEl = document.getElementById('hud-gold-text');
    const tokenEl = document.getElementById('hud-token-text');

    if (nameEl) nameEl.textContent = this.player.name;
    if (classEl) classEl.textContent = this.player.currentClass.name;
    if (rebornEl) {
      if (this.player.rebirthCount > 0) {
        rebornEl.style.display = 'inline-block';
        rebornEl.textContent = `★ Reborn x${this.player.rebirthCount}`;
      } else {
        rebornEl.style.display = 'none';
      }
    }

    if (baseLvlEl) baseLvlEl.textContent = `Lv. ${this.player.baseLevel}`;
    if (jobLvlEl) {
      jobLvlEl.textContent = this.player.jobLevel >= 50 ? 'Lv. 50 (MAX)' : `Lv. ${this.player.jobLevel} / 50`;
    }

    // 1. HP & SP Bars
    if (hpFill && hpText) {
      const hpPct = Math.max(0, (this.player.currentHp / this.player.maxHp) * 100);
      hpFill.style.width = `${hpPct}%`;
      hpText.textContent = `${this.player.currentHp} / ${this.player.maxHp}`;
    }
    if (spFill && spText) {
      spFill.style.width = '100%';
      spText.textContent = '100 / 100';
    }

    // 2. Base EXP Bar
    if (baseExpFill && baseExpText) {
      const maxB = this.player.maxBaseExp;
      const bPct = Math.min(100, (this.player.baseExp / maxB) * 100);
      baseExpFill.style.width = `${bPct}%`;
      baseExpText.textContent = `${this.player.baseExp} / ${maxB} (${bPct.toFixed(1)}%)`;
    }

    // 3. Job EXP Bar
    if (jobExpFill && jobExpText) {
      if (this.player.jobLevel >= 50) {
        jobExpFill.style.width = '100%';
        jobExpText.textContent = 'JOB MAX (100%)';
      } else {
        const maxJ = this.player.maxJobExp;
        const jPct = Math.min(100, (this.player.jobExp / maxJ) * 100);
        jobExpFill.style.width = `${jPct}%`;
        jobExpText.textContent = `${this.player.jobExp} / ${maxJ} (${jPct.toFixed(1)}%)`;
      }
    }

    if (goldEl) goldEl.textContent = this.player.gold.toLocaleString();
    if (tokenEl) tokenEl.textContent = this.player.gachaTokens.toLocaleString();

    // 4. Job Advancement & Rebirth Alert Banner
    const advanceAlert = document.getElementById('hud-class-advance-alert');
    const advanceText = document.getElementById('hud-job-alert-text');
    const advanceBtn = document.getElementById('hud-job-alert-btn');
    const canAdvance = this.player.canAdvanceClass();
    const canRebirth = this.player.canRebirth();

    if (advanceAlert && advanceText && advanceBtn) {
      if (canAdvance) {
        advanceAlert.style.display = 'flex';
        const targetName = canAdvance === 'knight' ? 'Knight (คลาส 2)' : canAdvance === 'high_knight' ? 'High Knight (คลาส 2 จุติ)' : 'Rune Knight (คลาส 3)';
        advanceText.textContent = `🌟 Job 50! เลื่อนขั้นเป็น ${targetName}`;
        advanceBtn.textContent = 'เปลี่ยนอาชีพ';
        advanceBtn.onclick = () => {
          if (this.player.advanceClass()) {
            this.gameEngine.onLog(`🎉 ยินดีด้วย! คุณได้เลื่อนขั้นเป็น ${this.player.currentClass.name} สำเร็จ!`, 'system');
            this.gameEngine.triggerScreenShake(6);
            this.gameEngine.addShockwave(this.gameEngine.playerEntity.x, this.gameEngine.playerEntity.y, '#f59e0b', 90);
            this.renderAll();
          }
        };
      } else if (canRebirth) {
        advanceAlert.style.display = 'flex';
        advanceText.textContent = '🔮 Knight Job 50! ปลดล็อคพิธีจุติ Rebirth Lv.1';
        advanceBtn.textContent = 'เข้าสู่พิธีจุติ';
        advanceBtn.onclick = () => {
          if (this.player.rebirth()) {
            this.gameEngine.onLog('🔮 เข้าสู่พิธีจุติ Rebirth สำเร็จ! เริ่มต้นใหม่พร้อมโบนัส All Stats +15% ถาวร!', 'system');
            this.gameEngine.triggerScreenShake(8);
            this.gameEngine.addShockwave(this.gameEngine.playerEntity.x, this.gameEngine.playerEntity.y, '#c084fc', 120);
            this.renderAll();
          }
        };
      } else {
        advanceAlert.style.display = 'none';
      }
    }

    // 5. Stat Points Notification Alert
    const statAlert = document.getElementById('hud-stat-point-alert');
    const statCount = document.getElementById('hud-stat-point-count');
    const statBtn = document.getElementById('hud-stat-alert-btn');
    if (statAlert && statCount && statBtn) {
      if (this.player.statPoints > 0) {
        statAlert.style.display = 'flex';
        statCount.textContent = `+${this.player.statPoints}`;
        statBtn.onclick = () => this.toggleModal('modal-status', () => this.renderStatusModal());
      } else {
        statAlert.style.display = 'none';
      }
    }

    // 6. Update Pinned Active Quest Tracker Widget
    this.updateQuestTrackerWidget();

    // 7. Dynamic Hotbar Icons, Names & Cooldown Badges 1-9
    const p = this.gameEngine.playerEntity;
    const isArcher = this.player.currentClass.category === 'archer';
    const slotMeta = isArcher ? {
      1: { icon: '🏹', name: 'Double Strafe', title: '[1] Double Strafe (ยิงศรคู่ 280% ดาเมจ)' },
      2: { icon: '🌧️', name: 'Arrow Shower', title: '[2] Arrow Shower (ฝนธนูระดมยิง AoE)' },
      3: { icon: '🎯', name: 'Improve Con', title: '[3] Improve Concentration (+25% ASPD, +15% Crit)' },
      4: { icon: '🦅', name: 'Falcon Assault', title: '[4] Falcon Assault (เหยี่ยวโฉบทำลายล้าง)' },
      5: { icon: '🧪', name: 'HP Potion', title: '[5] Red Potion (ดื่มยาฟื้น HP)' },
      6: { icon: '🤸', name: 'Tumble Evade', title: '[6] Tumble Evade (กลิ้งตัวหลบ)' },
      7: { icon: '🕸️', name: 'Ankle Snare', title: '[7] Ankle Snare (กับดักล็อคขามอนสเตอร์)' },
      8: { icon: '💚', name: 'First Aid', title: '[8] First Aid (ปฐมพยาบาล)' },
      9: { icon: '📜', name: 'Town Portal', title: '[9] Town Portal (วาร์ปกลับเมือง)' }
    } : {
      1: { icon: '💥', name: 'Power Strike', title: '[1] Power Strike (ฟันหนัก 250% ดาเมจ)' },
      2: { icon: '🌪️', name: 'Whirlwind', title: '[2] Whirlwind Slash (หมุนดาบรอบตัว AoE)' },
      3: { icon: '🛡️', name: 'Iron Guard', title: '[3] Iron Guard (เกราะเหล็ก +60 DEF)' },
      4: { icon: '⚡', name: 'Berserk', title: '[4] Berserk Rage (เร่งความเร็วโจมตี ASPD)' },
      5: { icon: '🧪', name: 'HP Potion', title: '[5] Red Potion (ดื่มยาฟื้น HP)' },
      6: { icon: '💨', name: 'Dash', title: '[6] Flash Dash (พุ่งตัวไปข้างหน้า)' },
      7: { icon: '📢', name: 'War Cry', title: '[7] War Cry (คำรามสะกดมอนสเตอร์สตัน)' },
      8: { icon: '💚', name: 'First Aid', title: '[8] First Aid (ปฐมพยาบาล)' },
      9: { icon: '📜', name: 'Town Portal', title: '[9] Town Portal (วาร์ปกลับเมือง)' }
    };

    if (p && p.skillCooldowns) {
      for (let slot = 1; slot <= 9; slot++) {
        const el = document.getElementById(`slot-${slot}`);
        if (!el) continue;

        const meta = slotMeta[slot];
        if (meta) {
          el.title = meta.title;
          const iconEl = el.querySelector('.skill-icon-emoji');
          if (iconEl && iconEl.textContent !== meta.icon) iconEl.textContent = meta.icon;
          const nameEl = el.querySelector('.skill-label-name');
          if (nameEl && nameEl.textContent !== meta.name) nameEl.textContent = meta.name;
        }

        const cd = p.skillCooldowns[slot] || 0;
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
          <div class="quest-tracker-item ${st.completed ? 'completed' : ''}">
            <div style="display:flex; justify-content:space-between; font-weight:700;">
              <span>${q.title}</span>
              <span style="color:${st.completed ? '#4ade80' : '#f59e0b'};">${st.progress}/${q.requiredCount}</span>
            </div>
            ${st.completed ? `
              <button class="btn-tracker-claim" data-qid="${q.id}">🎁 รับรางวัล (+${q.rewardGold} G)</button>
            ` : `
              <div style="font-size:0.62rem; color:#94a3b8; margin-top:2px;">เป้าหมาย: กำจัด ${q.targetMonster}</div>
            `}
          </div>
        `;
      }
    });

    if (!html) {
      html = '<div style="font-size:0.68rem; color:#94a3b8; text-align:center;">สำเร็จทุกเควสต์แล้ว! 🎉</div>';
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll('.btn-tracker-claim').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const qid = e.currentTarget.dataset.qid;
        const q = QUESTS.find(item => item.id === qid);
        const st = this.player.questProgress[qid];
        if (q && st && st.completed && !st.claimed) {
          st.claimed = true;
          this.player.gold += q.rewardGold;
          this.player.gachaTokens += q.rewardTokens;
          this.player.gainExp(q.rewardExp, q.rewardJobExp);
          this.player.saveToStorage();
          this.gameEngine.onLog(`🎁 รับรางวัลเควสต์: +${q.rewardGold} Gold, +${q.rewardTokens} Token, +${q.rewardJobExp} Job Exp`, 'quest');
          this.updateHUD();
        }
      });
    });
  }

  // 1. Status & Advancement Modal
  renderStatusModal() {
    const body = document.getElementById('modal-status-body');
    if (!body) return;

    const canAdvance = this.player.canAdvanceClass();
    const canRebirth = this.player.canRebirth();

    let advanceHtml = '';
    if (canAdvance) {
      const targetName = canAdvance === 'knight' ? 'Knight (คลาส 2)' : canAdvance === 'high_knight' ? 'High Knight (คลาส 2 จุติ)' : 'Rune Knight (คลาส 3)';
      advanceHtml = `
        <div style="background:linear-gradient(135deg,rgba(59,130,246,0.3),rgba(16,185,129,0.2)); border:1px solid #3b82f6; padding:12px; border-radius:8px; margin-bottom:12px; text-align:center;">
          <h4 style="color:#60a5fa; margin-bottom:4px;">🌟 สามารถเลื่อนขั้นอาชีพได้แล้ว!</h4>
          <p style="font-size:0.85rem; color:#cbd5e1; margin-bottom:8px;">Job Lv. 50 บรรลุแล้ว! เลื่อนขั้นเป็น <b>${targetName}</b></p>
          <button id="modal-btn-advance" class="btn-primary" style="padding:6px 16px;">เปลี่ยนอาชีพ</button>
        </div>
      `;
    } else if (canRebirth) {
      advanceHtml = `
        <div style="background:linear-gradient(135deg,rgba(168,85,247,0.3),rgba(236,72,153,0.2)); border:1px solid #a855f7; padding:12px; border-radius:8px; margin-bottom:12px; text-align:center;">
          <h4 style="color:#c084fc; margin-bottom:4px;">🔮 เข้าสู่พิธีกรรมจุติ (Rebirth)</h4>
          <p style="font-size:0.85rem; color:#cbd5e1; margin-bottom:8px;">Knight Job 50! ทำการจุติเพื่อเริ่มใหม่ที่ Lv.1 พร้อมรับ <b>โบนัส All Stats +15% ถาวร</b> และออร่าเรืองแสง</p>
          <button id="modal-btn-rebirth" class="btn-special" style="padding:6px 16px;">เข้าสู่พิธีจุติ</button>
        </div>
      `;
    }

    const maxB = this.player.maxBaseExp;
    const bPct = Math.min(100, (this.player.baseExp / maxB) * 100);
    const maxJ = this.player.maxJobExp;
    const jPct = this.player.jobLevel >= 50 ? 100 : Math.min(100, (this.player.jobExp / maxJ) * 100);

    const isArcher = this.player.currentClass.category === 'archer';

    body.innerHTML = `
      ${advanceHtml}

      <!-- Class Branch Switcher (Swordsman vs Archer) -->
      <div style="background:rgba(30,41,59,0.7); border:1px solid #475569; padding:8px 12px; border-radius:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:0.75rem; color:#94a3b8;">สายอาชีพ:</span>
          <b style="color:${isArcher ? '#10b981' : '#3b82f6'}; margin-left:6px; font-size:0.85rem;">${this.player.currentClass.name}</b>
        </div>
        <div>
          <button id="modal-btn-switch-swordsman" class="btn-class-switch ${!isArcher ? 'active' : ''}">⚔️ นักดาบ</button>
          <button id="modal-btn-switch-archer" class="btn-class-switch ${isArcher ? 'active' : ''}">🏹 นักธนู</button>
        </div>
      </div>

      <!-- Dual Levels & EXP Cards -->
      <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:10px 14px; margin-bottom:12px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px;">
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:3px;">
              <span style="font-weight:700; color:#38bdf8;">⭐ Base Level: Lv. ${this.player.baseLevel}</span>
              <span style="color:#94a3b8; font-size:0.75rem;">${bPct.toFixed(1)}%</span>
            </div>
            <div style="width:100%; height:8px; background:#1e293b; border-radius:4px; overflow:hidden;">
              <div style="width:${bPct}%; height:100%; background:linear-gradient(90deg,#0284c7,#38bdf8);"></div>
            </div>
            <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px; text-align:right;">${this.player.baseExp.toLocaleString()} / ${maxB.toLocaleString()} EXP</div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:3px;">
              <span style="font-weight:700; color:#fbbf24;">✨ Job Level: Lv. ${this.player.jobLevel} / 50</span>
              <span style="color:#94a3b8; font-size:0.75rem;">${this.player.jobLevel >= 50 ? 'MAX' : `${jPct.toFixed(1)}%`}</span>
            </div>
            <div style="width:100%; height:8px; background:#1e293b; border-radius:4px; overflow:hidden;">
              <div style="width:${jPct}%; height:100%; background:linear-gradient(90deg,#d97706,#fbbf24);"></div>
            </div>
            <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px; text-align:right;">${this.player.jobLevel >= 50 ? 'JOB LEVEL 50 MAXED' : `${this.player.jobExp.toLocaleString()} / ${maxJ.toLocaleString()} Job EXP`}</div>
          </div>
        </div>

        <!-- Career Progression Roadmap -->
        <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:8px; display:flex; align-items:center; justify-content:space-between; font-size:0.7rem; color:#94a3b8; flex-wrap:wrap; gap:4px;">
          <span style="font-weight:700; color:#cbd5e1;">เส้นทางอาชีพ:</span>
          ${isArcher ? `
            <span style="${this.player.classId === 'archer' ? 'color:#10b981; font-weight:800; background:rgba(16,185,129,0.2); padding:1px 6px; border-radius:4px;' : ''}">1. Archer</span> ➔
            <span style="${this.player.classId === 'hunter' ? 'color:#10b981; font-weight:800; background:rgba(16,185,129,0.2); padding:1px 6px; border-radius:4px;' : ''}">2. Hunter</span> ➔
            <span style="${this.player.classId === 'high_archer' ? 'color:#c084fc; font-weight:800; background:rgba(168,85,247,0.2); padding:1px 6px; border-radius:4px;' : ''}">3. High Archer (จุติ)</span> ➔
            <span style="${this.player.classId === 'sniper' ? 'color:#c084fc; font-weight:800; background:rgba(168,85,247,0.2); padding:1px 6px; border-radius:4px;' : ''}">4. Sniper</span> ➔
            <span style="${this.player.classId === 'ranger' ? 'color:#14b8a6; font-weight:800; background:rgba(20,184,166,0.2); padding:1px 6px; border-radius:4px;' : ''}">5. Ranger (คลาส 3)</span>
          ` : `
            <span style="${this.player.classId === 'swordsman' ? 'color:#facc15; font-weight:800; background:rgba(245,158,11,0.2); padding:1px 6px; border-radius:4px;' : ''}">1. Swordsman</span> ➔
            <span style="${this.player.classId === 'knight' ? 'color:#facc15; font-weight:800; background:rgba(245,158,11,0.2); padding:1px 6px; border-radius:4px;' : ''}">2. Knight</span> ➔
            <span style="${this.player.classId === 'high_swordsman' ? 'color:#c084fc; font-weight:800; background:rgba(168,85,247,0.2); padding:1px 6px; border-radius:4px;' : ''}">3. High Swordsman (จุติ)</span> ➔
            <span style="${this.player.classId === 'high_knight' ? 'color:#c084fc; font-weight:800; background:rgba(168,85,247,0.2); padding:1px 6px; border-radius:4px;' : ''}">4. High Knight</span> ➔
            <span style="${this.player.classId === 'rune_knight' ? 'color:#f43f5e; font-weight:800; background:rgba(244,63,94,0.2); padding:1px 6px; border-radius:4px;' : ''}">5. Rune Knight (คลาส 3)</span>
          `}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="font-weight:700;">📊 จัดสรรค่าสเตตัส</span>
            <span style="color:#f59e0b; font-size:0.85rem;">แต้มคงเหลือ: <b>${this.player.statPoints}</b></span>
          </div>
          ${['str', 'agi', 'vit', 'dex', 'luk'].map(s => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="font-weight:600; text-transform:uppercase;">${s}</span>
              <span>${this.player.stats[s]}</span>
              <button class="btn-stat-add" data-stat="${s}" ${this.player.statPoints > 0 ? '' : 'disabled'} style="width:24px; height:24px; background:#2563eb; color:#fff; border:none; border-radius:4px; cursor:pointer;">+</button>
            </div>
          `).join('')}
        </div>
        <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); font-size:0.85rem;">
          <h4 style="margin-bottom:8px;">⚔️ ข้อมูลพลังรบรวม</h4>
          <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>คลาสปัจจุบัน:</span> <b style="color:#facc15;">${this.player.currentClass.name}</b></div>
          <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Job Level:</span> <b>${this.player.jobLevel} / 50</b></div>
          <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Max HP:</span> <b>${this.player.maxHp}</b></div>
          <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Total ATK:</span> <b>${this.player.attack}</b></div>
          <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Total DEF:</span> <b>${this.player.defense}</b></div>
          <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>ASPD:</span> <b>${this.player.aspd}/s</b></div>
          <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Crit Rate:</span> <b>${(this.player.critRate * 100).toFixed(1)}%</b></div>
          <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>สมบัติ Relic:</span> <b>${this.player.collectedRelics.length}/12 ชิ้น</b></div>
        </div>
      </div>
    `;

    body.querySelectorAll('.btn-stat-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const s = e.currentTarget.dataset.stat;
        if (this.player.allocateStat(s)) {
          this.renderStatusModal();
          this.updateHUD();
        }
      });
    });

    const advBtn = document.getElementById('modal-btn-advance');
    if (advBtn) {
      advBtn.addEventListener('click', () => {
        if (this.player.advanceClass()) {
          this.gameEngine.onLog(`🎉 เลื่อนขั้นอาชีพสำเร็จเป็น ${this.player.currentClass.name}!`, 'system');
          this.renderStatusModal();
          this.updateHUD();
        }
      });
    }

    const rebBtn = document.getElementById('modal-btn-rebirth');
    if (rebBtn) {
      rebBtn.addEventListener('click', () => {
        if (confirm('ยืนยันเข้าสู่พิธีจุติ (Rebirth) เพื่อเริ่มต้นใหม่ที่เลเวล 1 พร้อมโบนัสถาวร +15% All Stats?')) {
          if (this.player.rebirth()) {
            this.gameEngine.onLog(`🌟 ถือกำเนิดใหม่เป็น High Swordsman! ได้รับออร่าวิญญาณพิเศษ`, 'system');
            this.renderStatusModal();
            this.updateHUD();
          }
        }
      });
    }

    // Class Branch Switcher Buttons (Swordsman vs Archer)
    const switchSwordsmanBtn = document.getElementById('modal-btn-switch-swordsman');
    if (switchSwordsmanBtn) {
      switchSwordsmanBtn.addEventListener('click', () => {
        if (this.player.currentClass.category !== 'swordsman') {
          this.player.switchClassBranch('swordsman');
          if (this.gameEngine.network) {
            this.gameEngine.network.sendProfile(
              this.player.name,
              this.player.baseLevel,
              this.player.jobLevel,
              this.player.classId,
              this.player.equipment?.weapon
            );
          }
          this.gameEngine.onLog(`⚔️ สลับสายอาชีพเป็น: ${this.player.currentClass.name}`, 'system');
          this.renderStatusModal();
          this.updateHUD();
        }
      });
    }

    const switchArcherBtn = document.getElementById('modal-btn-switch-archer');
    if (switchArcherBtn) {
      switchArcherBtn.addEventListener('click', () => {
        if (this.player.currentClass.category !== 'archer') {
          this.player.switchClassBranch('archer');
          if (this.gameEngine.network) {
            this.gameEngine.network.sendProfile(
              this.player.name,
              this.player.baseLevel,
              this.player.jobLevel,
              this.player.classId,
              this.player.equipment?.weapon
            );
          }
          this.gameEngine.onLog(`🏹 สลับสายอาชีพเป็น: ${this.player.currentClass.name}`, 'system');
          this.renderStatusModal();
          this.updateHUD();
        }
      });
    }
  }

  // 2. Inventory & Crafting Modal
  renderInventoryModal() {
    const body = document.getElementById('modal-inventory-body');
    if (!body) return;

    const weapon = ITEMS[this.player.equipment.weapon];
    const armor = ITEMS[this.player.equipment.armor];

    let invHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:8px; margin-top:8px;">';
    const keys = Object.keys(this.player.inventory);
    if (keys.length === 0) {
      invHtml += '<p style="color:#94a3b8; font-size:0.85rem;">กระเป๋าว่างเปล่า ออกไปฟาร์มมอนสเตอร์กันเถอะ!</p>';
    } else {
      keys.forEach(k => {
        const count = this.player.inventory[k];
        const item = ITEMS[k];
        if (!item) return;
        invHtml += `
          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:6px; text-align:center; font-size:0.75rem;">
            <div style="font-size:24px;">${item.icon || '📦'}</div>
            <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
            <div style="color:#f59e0b;">x${count}</div>
            ${item.type === 'weapon' || item.type === 'armor' ? `<button class="btn-inv-equip" data-id="${k}" style="margin-top:3px; padding:2px 6px; background:#2563eb; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:0.68rem;">สวมใส่</button>` : ''}
          </div>
        `;
      });
    }
    invHtml += '</div>';

    let craftHtml = '<div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">';
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
            <b>${resItem.icon} ${resItem.name}</b>
            <span style="color:#f59e0b;">🪙 ${r.goldCost.toLocaleString()} Gold</span>
          </div>
          <div style="color:#94a3b8; font-size:0.72rem; margin-bottom:4px;">${resItem.desc}</div>
          <div style="margin-bottom:6px;"><b>วัตถุดิบ:</b> ${mats}</div>
          <button class="btn-do-craft" data-id="${r.resultItemId}" ${canCraft ? '' : 'disabled'} style="padding:4px 10px; background:${canCraft ? '#f59e0b' : '#475569'}; color:#000; font-weight:700; border:none; border-radius:4px; cursor:${canCraft ? 'pointer' : 'not-allowed'};">คราฟต์</button>
        </div>
      `;
    });
    craftHtml += '</div>';

    body.innerHTML = `
      <div style="background:rgba(0,0,0,0.4); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); margin-bottom:12px; font-size:0.85rem;">
        <b>🛡️ อุปกรณ์ที่สวมใส่:</b>
        <span style="margin-left:10px;">อาวุธ: <b>${weapon ? `${weapon.icon} ${weapon.name} (+${weapon.atk} ATK)` : 'ไม่มี'}</b></span>
        <span style="margin-left:14px;">เกราะ: <b>${armor ? `${armor.icon} ${armor.name} (+${armor.def} DEF)` : 'ไม่มี'}</b></span>
      </div>
      <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:14px;">
        <div>
          <h4>🎒 ช่องเก็บของ (Inventory)</h4>
          ${invHtml}
        </div>
        <div>
          <h4>🔨 โต๊ะคราฟต์อุปกรณ์ (Blacksmith)</h4>
          ${craftHtml}
        </div>
      </div>
    `;

    body.querySelectorAll('.btn-inv-equip').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.player.equipItem(id);
        this.gameEngine.onLog(`🛡️ สวมใส่ ${ITEMS[id].name}`, 'system');
        this.renderInventoryModal();
        this.updateHUD();
      });
    });

    body.querySelectorAll('.btn-do-craft').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const recipe = CRAFTING_RECIPES.find(r => r.resultItemId === id);
        if (recipe) {
          this.player.gold -= recipe.goldCost;
          recipe.materials.forEach(m => this.player.removeItem(m.itemId, m.count));
          this.player.addItem(id, 1);
          this.gameEngine.onLog(`✨ คราฟต์สำเร็จ! ได้รับ ${ITEMS[id].icon} ${ITEMS[id].name}`, 'system');
          this.renderInventoryModal();
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
        <div style="background:rgba(0,0,0,0.3); border:1px solid ${st.completed ? '#10b981' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:10px;">
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

    body.querySelectorAll('.btn-claim-q').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const q = QUESTS.find(item => item.id === id);
        const st = this.player.questProgress[id];
        if (q && st && st.completed && !st.claimed) {
          st.claimed = true;
          this.player.gold += q.rewardGold;
          this.player.gachaTokens += q.rewardTokens;
          this.player.gainExp(q.rewardExp, q.rewardJobExp);
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

    let html = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">';
    ZONES.forEach((z, idx) => {
      const isCur = this.gameEngine.currentZoneIndex === idx;
      const locked = this.player.baseLevel < z.reqLevel;

      html += `
        <div class="zone-card" data-idx="${idx}" style="background:rgba(0,0,0,0.3); border:2px solid ${isCur ? '#fbbf24' : 'rgba(255,255,255,0.1)'}; padding:12px; border-radius:8px; cursor:${locked ? 'not-allowed' : 'pointer'}; opacity:${locked ? '0.45' : '1'};">
          <div style="font-weight:700; font-size:0.92rem; color:${isCur ? '#fbbf24' : '#fff'};">${z.name}</div>
          <p style="font-size:0.75rem; color:#94a3b8; margin:4px 0;">${z.desc}</p>
          <div style="font-size:0.72rem; color:#38bdf8;">${locked ? `🔒 ปลดล็อกที่ Lv.${z.reqLevel}` : '✅ เดินทางได้'}</div>
        </div>
      `;
    });
    html += '</div>';

    body.innerHTML = html;

    body.querySelectorAll('.zone-card').forEach(c => {
      c.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        if (this.player.baseLevel >= ZONES[idx].reqLevel) {
          this.gameEngine.setZone(idx);
          this.closeModal('modal-zones');
        }
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
      const zoneOpts = ZONES.map(z => `<option value="${z.id}">${esc(z.name)}</option>`).join('');
      body.innerHTML = `
        <div style="${box}">
          <h4 style="margin-bottom:8px;">🚩 สร้างปาร์ตี้ใหม่</h4>
          <div style="margin-bottom:8px;"><input type="text" id="input-party-name" maxlength="24" style="${inp} width:100%;" value="กิลด์ผู้กล้า" placeholder="ชื่อปาร์ตี้"></div>
          ${settingsFields({ expShare: 'share', autoAccept: false, minLevel: 1, maxLevel: 999 }, false)}
          <button id="btn-create-party-submit" style="${btn('linear-gradient(135deg,#3b82f6,#2563eb)')} margin-top:10px; padding:7px 16px;">สร้างปาร์ตี้</button>
        </div>
        <div style="${box}">
          <h4 style="margin-bottom:8px;">🔎 ค้นหาปาร์ตี้</h4>
          <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; font-size:0.8rem; color:#cbd5e1; margin-bottom:8px;">
            เลเวลหัวหน้า <input type="number" id="pf-min" min="1" value="1" style="${inp} width:60px;"> -
            <input type="number" id="pf-max" min="1" value="999" style="${inp} width:60px;">
            แมพ <select id="pf-map" style="${inp}"><option value="">ทุกแมพ</option>${zoneOpts}</select>
            <button id="btn-party-search" style="${btn('#0ea5e9')}">ค้นหา</button>
          </div>
          <div id="party-search-results" style="font-size:0.8rem; color:#94a3b8;">กด “ค้นหา” เพื่อดูปาร์ตี้ที่เปิดอยู่</div>
        </div>`;

      document.getElementById('btn-create-party-submit').addEventListener('click', () => {
        const name = document.getElementById('input-party-name').value.trim() || `${this.player.name}'s Party`;
        net?.sendCreateParty(name, readSettings());
      });
      const search = () => net?.sendPartyListRequest({
        minLevel: Number(document.getElementById('pf-min').value) || 1,
        maxLevel: Number(document.getElementById('pf-max').value) || 999,
        map: document.getElementById('pf-map').value || undefined
      });
      document.getElementById('btn-party-search').addEventListener('click', search);
      if (net && net.partyList && net.partyList.length) this.onPartyListReceived(net.partyList);
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
      if (this.activeModal === 'modal-party') this.renderPartyModal();
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

    if (this.activeModal === 'modal-party') {
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

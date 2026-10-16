// Main Entry Point (Fullscreen PC MMORPG with WASD, Right-Click Target, Left-Click Attack & 1-9 Skills)
import { Player } from './player.js';
import { GameEngine } from './game.js';
import { UIController } from './ui.js';
import { NetworkManager } from './network.js';
import { ZONES, MONSTERS, MONSTER_AI, MONSTER_AI_DEFAULT, ITEMS, QUESTS, SKILLS, SOUNDS, RELICS } from './data.js';
import { MAP_DEFS } from './maps.js';
import { applyOverrides } from './overrides.js';
import { applyUiTheme } from './uitheme.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Studio edits (names, stats, map colours/sizes...) are layered over the built-in data before anything uses it
  try {
    const res = await fetch('/api/overrides', { cache: 'no-store' });
    if (res.ok) {
      const ov = await res.json();
      applyOverrides({ ZONES, MAP_DEFS, MONSTERS, MONSTER_AI, MONSTER_AI_DEFAULT, ITEMS, QUESTS, SKILLS, SOUNDS, RELICS }, ov);
      applyUiTheme(ov.ui && ov.ui.main);
    }
  } catch (e) {
    console.warn('Could not load Studio overrides:', e);
  }

  const canvas = document.getElementById('gameCanvas');
  const minimapCanvas = document.getElementById('minimapCanvas');
  const chatContainer = document.getElementById('chat-messages-container');

  // Chat can be collapsed to a 💬 icon (remembered between visits)
  let chatCollapsed = false;
  let unread = 0;
  const chatPanel = document.getElementById('chat-panel');
  const chatIconBtn = document.getElementById('chat-icon-btn');
  const setChatCollapsed = (collapsed) => {
    chatCollapsed = collapsed;
    if (chatPanel) chatPanel.classList.toggle('collapsed', collapsed);
    if (chatIconBtn) chatIconBtn.style.display = collapsed ? 'block' : 'none';
    if (!collapsed) {
      unread = 0;
      const badge = document.getElementById('chat-unread');
      if (badge) badge.style.display = 'none';
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    try { localStorage.setItem('chat_collapsed', collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
  };
  document.getElementById('chat-collapse-btn')?.addEventListener('click', () => setChatCollapsed(true));
  chatIconBtn?.addEventListener('click', () => setChatCollapsed(false));
  try { if (localStorage.getItem('chat_collapsed') === '1') setChatCollapsed(true); } catch (e) { /* ignore */ }

  // ---- Chat channels ----
  // Every message carries a category: world | map | party | guild | system | monster
  const CAT_TAG = { world: 'โลก', map: 'แมพ', party: 'ปาร์ตี้', guild: 'กิลด์', system: 'ระบบ', monster: 'มอนฯ' };
  const PLAYER_CATS = ['world', 'map', 'party', 'guild'];
  const CAT_LABEL = { world: 'โลก', map: 'แมพ', party: 'ปาร์ตี้', guild: 'กิลด์' };
  const MAX_MSGS = 200;
  let chatTab = 'all';
  // The combined tab holds player chat only; system / monster messages stay in their own tabs
  const tabShows = (tab, cat) => (tab === 'all' ? PLAYER_CATS.includes(cat) : tab === cat);
  const applyChatFilter = () => {
    chatContainer.dataset.tab = chatTab;
    chatContainer.querySelectorAll('.chat-msg').forEach(el => {
      el.hidden = !tabShows(chatTab, el.dataset.cat);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
    const lbl = document.getElementById('chat-channel-label');
    if (lbl) lbl.textContent = CAT_LABEL[chatTab] || 'โลก';
  };
  // Typing goes to the open channel tab (world for all/system/monster)
  const sendChannel = () => (PLAYER_CATS.includes(chatTab) ? chatTab : 'world');
  document.querySelectorAll('.chat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      chatTab = tab.dataset.tab;
      applyChatFilter();
    });
  });

  // Chat panel can be stretched sideways (width remembered between visits)
  const MIN_CHAT_W = 280;
  const clampChatW = (w) => Math.max(MIN_CHAT_W, Math.min(w, window.innerWidth - 40));
  const setChatW = (w) => { if (chatPanel) chatPanel.style.width = clampChatW(w) + 'px'; };
  try { const w = parseInt(localStorage.getItem('chat_width'), 10); if (w) setChatW(w); } catch (e) { /* ignore */ }
  const resizeHandle = document.getElementById('chat-resize-handle');
  resizeHandle?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    resizeHandle.setPointerCapture(e.pointerId);
    const left = chatPanel.getBoundingClientRect().left;
    const move = (ev) => setChatW(ev.clientX - left);
    const up = () => {
      resizeHandle.removeEventListener('pointermove', move);
      resizeHandle.removeEventListener('pointerup', up);
      try { localStorage.setItem('chat_width', String(parseInt(chatPanel.style.width, 10))); } catch (e) { /* ignore */ }
    };
    resizeHandle.addEventListener('pointermove', move);
    resizeHandle.addEventListener('pointerup', up);
  });
  // ...and upwards (panel is anchored at the bottom, so dragging the top edge changes its height)
  const MIN_CHAT_H = 120;
  const clampChatH = (h) => Math.max(MIN_CHAT_H, Math.min(h, window.innerHeight - 120));
  const setChatH = (h) => { if (chatPanel) chatPanel.style.height = clampChatH(h) + 'px'; };
  try { const h = parseInt(localStorage.getItem('chat_height'), 10); if (h) setChatH(h); } catch (e) { /* ignore */ }
  const topHandle = document.getElementById('chat-resize-handle-top');
  topHandle?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    topHandle.setPointerCapture(e.pointerId);
    const bottom = chatPanel.getBoundingClientRect().bottom;
    const move = (ev) => { setChatH(bottom - ev.clientY); chatContainer.scrollTop = chatContainer.scrollHeight; };
    const up = () => {
      topHandle.removeEventListener('pointermove', move);
      topHandle.removeEventListener('pointerup', up);
      try { localStorage.setItem('chat_height', String(parseInt(chatPanel.style.height, 10))); } catch (e) { /* ignore */ }
    };
    topHandle.addEventListener('pointermove', move);
    topHandle.addEventListener('pointerup', up);
  });
  // top-right corner: both at once
  const cornerHandle = document.getElementById('chat-resize-handle-corner');
  cornerHandle?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    cornerHandle.setPointerCapture(e.pointerId);
    const rect = chatPanel.getBoundingClientRect();
    const move = (ev) => { setChatW(ev.clientX - rect.left); setChatH(rect.bottom - ev.clientY); chatContainer.scrollTop = chatContainer.scrollHeight; };
    const up = () => {
      cornerHandle.removeEventListener('pointermove', move);
      cornerHandle.removeEventListener('pointerup', up);
      try {
        localStorage.setItem('chat_width', String(parseInt(chatPanel.style.width, 10)));
        localStorage.setItem('chat_height', String(parseInt(chatPanel.style.height, 10)));
      } catch (e) { /* ignore */ }
    };
    cornerHandle.addEventListener('pointermove', move);
    cornerHandle.addEventListener('pointerup', up);
  });
  window.addEventListener('resize', () => {
    if (chatPanel?.style.width) setChatW(parseInt(chatPanel.style.width, 10));
    if (chatPanel?.style.height) setChatH(parseInt(chatPanel.style.height, 10));
  });

  // Combat & System Log Callback
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  const addLog = (message, type = 'system', cat) => {
    if (!chatContainer) return;
    // loot / relic drops belong to the monster channel; everything else defaults to system
    cat = cat || (type === 'loot' || type === 'relic' ? 'monster' : 'system');
    if (!CAT_TAG[cat]) cat = 'system';
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg ${type}`;
    msgEl.dataset.cat = cat;
    msgEl.hidden = !tabShows(chatTab, cat);
    msgEl.innerHTML = `<span class="chat-tag">${CAT_TAG[cat]}</span><span class="chat-text">${esc(message)}</span>`;
    chatContainer.appendChild(msgEl);
    if (chatCollapsed && cat !== 'system') {
      unread++;
      const badge = document.getElementById('chat-unread');
      if (badge) { badge.textContent = unread > 99 ? '99+' : unread; badge.style.display = 'block'; }
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;

    while (chatContainer.children.length > MAX_MSGS) {
      chatContainer.removeChild(chatContainer.firstChild);
    }
  };

  // 1. Initialize Player & Engine
  const player = new Player();
  const game = new GameEngine(canvas, minimapCanvas, player, addLog);
  window.__game = game; // handy for debugging / tests
  const ui = new UIController(player, game);
  game.setUIController(ui);

  // 2. Initialize Multiplayer Network Sync (WebSocket)
  const network = new NetworkManager(game, player);
  game.setNetwork(network);

  // 3. Connect Chat Send
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const handleSendChat = () => {
    const txt = chatInput.value.trim();
    if (txt) {
      network.sendChat(txt, sendChannel());
      chatInput.value = '';
    }
  };
  // Enter once opens the chat box for typing; Enter again sends and gives the keys back to the game
  const stopMoving = () => { Object.keys(game.keys).forEach(k => { game.keys[k] = false; }); };
  if (chatSendBtn) chatSendBtn.addEventListener('click', () => { handleSendChat(); chatInput.blur(); });
  // ---- Slash-command suggestions: type "/" to see them, arrows / Tab / click to pick ----
  // insert = text put in the box; done = full command (Enter then sends it)
  const CMD_LIST = [
    { insert: '/help', done: true, label: '/help', desc: 'แสดงรายการคำสั่ง' },
    { insert: '/gm ', label: '/gm <รหัส>', desc: 'เข้าโหมด GM' },
    { insert: '/buffserver', done: true, label: '/buffserver', desc: 'ดูบัฟเซิร์ฟเวอร์ตอนนี้ (GM)' },
    { insert: '/buffserver exp ', label: '/buffserver exp <ตัวคูณ>', desc: 'EXP ทั้งเซิร์ฟเวอร์ (GM)' },
    { insert: '/buffserver drop ', label: '/buffserver drop <ตัวคูณ>', desc: 'ของดรอปทั้งเซิร์ฟเวอร์ (GM)' },
    { insert: '/buffserver monster ', label: '/buffserver monster <ตัวคูณ>', desc: 'จำนวนมอนสเตอร์ทั้งเซิร์ฟเวอร์ (GM)' },
    ...['exp', 'drop', 'monster'].flatMap(k => (k === 'monster' ? [2, 3, 5] : [2, 5, 10]).map(x => ({
      insert: `/buffserver ${k} ${x}`, done: true, label: `/buffserver ${k} ${x}`, desc: `${k} x${x}`
    }))),
    { insert: '/buffserver reset', done: true, label: '/buffserver reset', desc: 'รีเซ็ตบัฟทั้งหมดเป็น x1 (GM)' }
  ];
  const sugBox = document.createElement('div');
  sugBox.className = 'cmd-suggest';
  sugBox.hidden = true;
  document.body.appendChild(sugBox);
  let sugItems = [];
  let sugIdx = 0;
  const hideSug = () => { sugBox.hidden = true; sugItems = []; };
  const pickSug = (it) => {
    chatInput.value = it.insert;
    chatInput.focus();
    updateSug();
  };
  const renderSug = () => {
    sugBox.innerHTML = '';
    sugItems.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'cmd-suggest-row' + (i === sugIdx ? ' active' : '');
      row.innerHTML = `<span class="cmd-name">${esc(it.label)}</span><span class="cmd-desc">${esc(it.desc)}</span>`;
      row.addEventListener('mousedown', (e) => { e.preventDefault(); pickSug(it); });
      sugBox.appendChild(row);
    });
    const r = chatPanel.getBoundingClientRect();
    sugBox.style.left = r.left + 'px';
    sugBox.style.width = r.width + 'px';
    sugBox.style.bottom = (window.innerHeight - r.bottom + 30) + 'px';
    sugBox.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  };
  const updateSug = () => {
    const v = chatInput.value.toLowerCase();
    if (!v.startsWith('/') || v.includes('  ')) { hideSug(); return; }
    sugItems = CMD_LIST.filter(c => c.insert.startsWith(v) || c.label.toLowerCase().startsWith(v));
    if (!sugItems.length || (sugItems.length === 1 && sugItems[0].insert === v && sugItems[0].done)) { hideSug(); return; }
    sugIdx = Math.min(sugIdx, sugItems.length - 1);
    sugBox.hidden = false;
    renderSug();
  };
  if (chatInput) {
    chatInput.placeholder = 'กด Enter เพื่อพิมพ์แชท... (พิมพ์ / เพื่อดูคำสั่ง)';
    chatInput.addEventListener('focus', stopMoving);
    chatInput.addEventListener('input', () => { sugIdx = 0; updateSug(); });
    chatInput.addEventListener('blur', () => setTimeout(hideSug, 120));
    chatInput.addEventListener('keydown', (e) => {
      const open = !sugBox.hidden && sugItems.length > 0;
      if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length) % sugItems.length;
        renderSug();
      } else if (open && e.key === 'Tab') {
        e.preventDefault();
        pickSug(sugItems[sugIdx]);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = open ? sugItems[sugIdx] : null;
        if (it && chatInput.value.trim().toLowerCase() !== it.insert.trim()) {
          pickSug(it); // first Enter completes the command, next Enter sends
        } else {
          handleSendChat();
          chatInput.blur();
          hideSug();
        }
      } else if (e.key === 'Escape') {
        if (open) hideSug(); else chatInput.blur();
      }
      e.stopPropagation();
    });
  }

  // 4. MOUSE CONTROLS: Left Click = Attack / Move, Right Click = Target Selection
  // Prevent context menu from appearing on right click in the game
  // Zoom: mouse wheel over the game, or +/- keys
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    game.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => game.zoomBy(1.2));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => game.zoomBy(1 / 1.2));

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const hit = game.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);
    canvas.style.cursor = hit ? 'crosshair' : '';
  });
  canvas.addEventListener('mouseleave', () => {
    game.hoverMonster = null;
    canvas.style.cursor = '';
  });

  canvas.addEventListener('mousedown', (e) => {
    if (document.activeElement === chatInput) chatInput.blur();
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (e.button === 2) {
      // Right Click: Select / Lock Target
      e.preventDefault();
      game.handleRightClick(clickX, clickY);
    } else if (e.button === 0) {
      // Left Click: Attack or Move
      game.handleLeftClick(clickX, clickY);
    }
  });

  // 5. KEYBOARD CONTROLS: WASD to Move, 1 to 9 for Skills & Items
  // Keys are read by physical position (e.code) so WASD also works with a Thai/other keyboard layout
  const physicalKey = (e) => (e.code && e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase());

  window.addEventListener('keydown', (e) => {
    // Enter: open the chat box (typing keys then go to the chat, not the game)
    if (e.key === 'Enter' && !ui.isTyping() && !(document.activeElement && /^(BUTTON|SELECT)$/.test(document.activeElement.tagName))) {
      e.preventDefault();
      if (chatCollapsed) setChatCollapsed(false);
      chatInput?.focus();
      return;
    }
    if (ui.isTyping()) return; // sliders/checkboxes/buttons with focus must not block movement

    const key = physicalKey(e);

    if (e.key === '+' || e.key === '=') game.zoomBy(1.2);
    else if (e.key === '-' || e.key === '_') game.zoomBy(1 / 1.2);

    // WASD Movement
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      game.keys[key] = true;
    }

    // Number keys 1-9 for Skills
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= 4) {
      game.useSkillSlot(num);
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = physicalKey(e);
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      game.keys[key] = false;
    }
  });

  // 6. Periodic UI Sync
  setInterval(() => {
    ui.updateHUD();
    ui.refreshOpenWindows();
  }, 100);

  addLog('🌿 ยินดีต้อนรับสู่ TRIPLE CROWN ONLINE!', 'system');
  addLog('🕹️ การควบคุม: [WASD] เดิน • [คลิกขวา] ล็อคเป้า • [คลิกซ้าย] โจมตี', 'system');
});

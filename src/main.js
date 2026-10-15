// Main Entry Point (Fullscreen PC MMORPG with WASD, Right-Click Target, Left-Click Attack & 1-9 Skills)
import { Player } from './player.js';
import { GameEngine } from './game.js';
import { UIController } from './ui.js';
import { NetworkManager } from './network.js';
import { ZONES, MONSTERS, MONSTER_AI, MONSTER_AI_DEFAULT, ITEMS, QUESTS } from './data.js';
import { MAP_DEFS } from './maps.js';
import { applyOverrides } from './overrides.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Studio edits (names, stats, map colours/sizes...) are layered over the built-in data before anything uses it
  try {
    const res = await fetch('/api/overrides', { cache: 'no-store' });
    if (res.ok) applyOverrides({ ZONES, MAP_DEFS, MONSTERS, MONSTER_AI, MONSTER_AI_DEFAULT, ITEMS, QUESTS }, await res.json());
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

  // Combat & System Log Callback
  const addLog = (message, type = 'system') => {
    if (!chatContainer) return;
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg ${type}`;
    const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    msgEl.innerHTML = `<span style="opacity:0.5; font-size:0.7rem;">[${time}]</span> ${String(message).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]))}`;
    chatContainer.appendChild(msgEl);
    if (chatCollapsed && type !== 'system') {
      unread++;
      const badge = document.getElementById('chat-unread');
      if (badge) { badge.textContent = unread > 99 ? '99+' : unread; badge.style.display = 'block'; }
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;

    while (chatContainer.children.length > 60) {
      chatContainer.removeChild(chatContainer.firstChild);
    }
  };

  // 1. Initialize Player & Engine
  const player = new Player();
  const game = new GameEngine(canvas, minimapCanvas, player, addLog);
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
      network.sendChat(txt);
      chatInput.value = '';
    }
  };
  // Enter once opens the chat box for typing; Enter again sends and gives the keys back to the game
  const stopMoving = () => { Object.keys(game.keys).forEach(k => { game.keys[k] = false; }); };
  if (chatSendBtn) chatSendBtn.addEventListener('click', () => { handleSendChat(); chatInput.blur(); });
  if (chatInput) {
    chatInput.placeholder = 'กด Enter เพื่อพิมพ์แชท...';
    chatInput.addEventListener('focus', stopMoving);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendChat();
        chatInput.blur();
      } else if (e.key === 'Escape') {
        chatInput.blur();
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
  addLog('🕹️ การควบคุม: [WASD] เดิน • [คลิกขวา] ล็อคเป้า • [คลิกซ้าย] โจมตี', 'chat');
});

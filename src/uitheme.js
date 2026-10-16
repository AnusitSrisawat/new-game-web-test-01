// Applies the Studio "หน้าจอ UI" settings: theme colours (CSS variables) and show/hide of HUD panels.
import { UI_DEFAULTS } from './overrides.js';

const VARS = {
  hudBorder: '--hud-border', goldAccent: '--gold-accent', goldBorder: '--gold-border',
  hpRed: '--hp-red', spBlue: '--sp-blue', expYellow: '--exp-yellow', textMain: '--text-main', textDim: '--text-dim'
};
const PANELS = {
  showMinimap: '.minimap-card',
  showChat: '#chat-panel, #chat-icon-btn',
  showSidePanel: '#hud-party-widget',
  showZoom: '.zoom-buttons'
};

// Live character sizes read by the renderer (updated by applyUiTheme)
export const CHAR_SCALE = { player: UI_DEFAULTS.playerScale, pet: UI_DEFAULTS.petScale };

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// `ui` may be partial (only the edited fields); everything else keeps the built-in look.
export function applyUiTheme(ui, root = document.documentElement) {
  const u = { ...UI_DEFAULTS, ...(ui || {}) };
  CHAR_SCALE.player = u.playerScale;
  CHAR_SCALE.pet = u.petScale;
  const st = root.style;
  st.setProperty('--hud-bg', hexToRgba(u.hudBg, u.hudOpacity / 100));
  for (const [key, cssVar] of Object.entries(VARS)) {
    st.setProperty(cssVar, key === 'hudBorder' ? hexToRgba(u.hudBorder, 0.4) : u[key]);
  }
  let tag = document.getElementById('studio-ui-style');
  if (!tag) { tag = document.createElement('style'); tag.id = 'studio-ui-style'; document.head.appendChild(tag); }
  tag.textContent = Object.entries(PANELS)
    .filter(([key]) => u[key] === 'hide')
    .map(([, sel]) => `${sel} { display: none !important; }`).join('\n');
}

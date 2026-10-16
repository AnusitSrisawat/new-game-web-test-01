// Client-only drawing helpers: tiled floor textures and the placeable map objects.
// Textures are generated procedurally (no image files) from the map's floor colour.
import { OBJECT_TYPES } from './maps.js';

const TEX = 128;
const cache = new Map();

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, f) {
  const [r, g, b] = rgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paint(kind, base) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const g = c.getContext('2d');
  const r = rng(kind.length * 977 + 13);
  g.fillStyle = base; g.fillRect(0, 0, TEX, TEX);
  const wrap = (x, y, w, h, style) => { // draw so it tiles seamlessly
    g.fillStyle = style;
    for (const ox of [0, -TEX]) for (const oy of [0, -TEX]) g.fillRect(x + ox, y + oy, w, h);
  };
  const hex = base;
  if (kind === 'grass') {
    for (let i = 0; i < 220; i++) wrap(r() * TEX, r() * TEX, 2, 5 + r() * 5, shade(hex, r() < 0.5 ? -0.18 : 0.15));
  } else if (kind === 'dirt') {
    for (let i = 0; i < 160; i++) { const s = 2 + r() * 5; wrap(r() * TEX, r() * TEX, s, s * 0.7, shade(hex, r() < 0.5 ? -0.14 : 0.1)); }
  } else if (kind === 'stone') {
    for (let i = 0; i < 40; i++) { const s = 8 + r() * 18; wrap(r() * TEX, r() * TEX, s, s * 0.8, shade(hex, r() < 0.5 ? -0.08 : 0.07)); }
    for (let i = 0; i < 60; i++) wrap(r() * TEX, r() * TEX, 1, 1 + r() * 8, shade(hex, -0.25));
  } else if (kind === 'sand') {
    for (let i = 0; i < 400; i++) wrap(r() * TEX, r() * TEX, 1.5, 1.5, shade(hex, r() < 0.5 ? -0.1 : 0.14));
  } else if (kind === 'cobble') {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const ox = (y % 2) * 16;
      wrap(x * 32 + ox + 2, y * 32 + 2, 28, 28, shade(hex, (r() - 0.5) * 0.18));
    }
  } else if (kind === 'tiles') {
    g.strokeStyle = shade(hex, -0.3); g.lineWidth = 2;
    g.strokeRect(1, 1, TEX / 2, TEX / 2); g.strokeRect(TEX / 2 + 1, TEX / 2 + 1, TEX / 2 - 2, TEX / 2 - 2);
    g.strokeRect(TEX / 2 + 1, 1, TEX / 2 - 2, TEX / 2); g.strokeRect(1, TEX / 2 + 1, TEX / 2, TEX / 2 - 2);
    wrap(0, 0, TEX / 2, TEX / 2, shade(hex, 0.05));
  } else if (kind === 'lava') {
    for (let i = 0; i < 30; i++) wrap(r() * TEX, r() * TEX, 6 + r() * 20, 3 + r() * 6, shade(hex, r() < 0.5 ? 0.35 : -0.35));
  } else if (kind === 'snow') {
    for (let i = 0; i < 200; i++) wrap(r() * TEX, r() * TEX, 2, 2, shade(hex, r() < 0.5 ? 0.2 : -0.08));
  }
  return c;
}

// Returns a CanvasPattern for the texture, or null for 'plain'.
// If `image` (a path under assets/, e.g. ground/map1/x.png) is set and loaded, that picture is tiled instead.
// Images load async: until then this falls back to the procedural texture; `onLoad` fires once ready.
const images = new Map();
export function getFloorPattern(ctx, kind, floor, image, onLoad) {
  if (image) {
    let img = images.get(image);
    if (!img) {
      img = new Image();
      img.onload = () => { img.ready = true; if (onLoad) onLoad(); };
      img.src = `/assets/${image.split('/').map(encodeURIComponent).join('/')}`;
      images.set(image, img);
    } else if (!img.ready && onLoad) {
      img.addEventListener('load', onLoad, { once: true });
    }
    if (img.ready) return ctx.createPattern(img, 'repeat');
  }
  if (!kind || kind === 'plain') return null;
  const key = `${kind}|${floor}`;
  let canvas = cache.get(key);
  if (!canvas) { canvas = paint(kind, floor); cache.set(key, canvas); }
  return ctx.createPattern(canvas, 'repeat');
}

// Draws one object with its feet at (0,0). `size` in px for scale 1.
export function drawObjectShape(g, type, s) {
  const ellipse = (x, y, rx, ry, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  ellipse(0, 0, s * 0.3, s * 0.1, 'rgba(0,0,0,0.25)');
  switch (type) {
    case 'tree':
      g.fillStyle = '#78350f'; g.fillRect(-s * 0.07, -s * 0.4, s * 0.14, s * 0.4);
      ellipse(0, -s * 0.6, s * 0.34, s * 0.3, '#15803d'); ellipse(-s * 0.1, -s * 0.66, s * 0.2, s * 0.17, '#22c55e');
      break;
    case 'pine':
      g.fillStyle = '#78350f'; g.fillRect(-s * 0.05, -s * 0.2, s * 0.1, s * 0.2);
      g.fillStyle = '#166534';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, -s * (0.95 - i * 0.2)); g.lineTo(s * (0.18 + i * 0.07), -s * (0.4 - i * 0.2 + 0.0)); g.lineTo(-s * (0.18 + i * 0.07), -s * (0.4 - i * 0.2)); g.fill(); }
      break;
    case 'bush':
      ellipse(0, -s * 0.25, s * 0.38, s * 0.28, '#166534'); ellipse(-s * 0.1, -s * 0.3, s * 0.2, s * 0.16, '#22c55e');
      break;
    case 'rock':
      ellipse(0, -s * 0.2, s * 0.4, s * 0.28, '#64748b'); ellipse(-s * 0.1, -s * 0.28, s * 0.2, s * 0.12, '#94a3b8');
      break;
    case 'crate':
      g.fillStyle = '#a16207'; g.fillRect(-s * 0.4, -s * 0.8, s * 0.8, s * 0.8);
      g.strokeStyle = '#713f12'; g.lineWidth = 2; g.strokeRect(-s * 0.4, -s * 0.8, s * 0.8, s * 0.8);
      g.beginPath(); g.moveTo(-s * 0.4, -s * 0.8); g.lineTo(s * 0.4, 0); g.moveTo(s * 0.4, -s * 0.8); g.lineTo(-s * 0.4, 0); g.stroke();
      break;
    case 'house':
      g.fillStyle = '#e7d3a7'; g.fillRect(-s * 0.4, -s * 0.5, s * 0.8, s * 0.5);
      g.fillStyle = '#b91c1c'; g.beginPath(); g.moveTo(-s * 0.5, -s * 0.5); g.lineTo(0, -s * 0.95); g.lineTo(s * 0.5, -s * 0.5); g.fill();
      g.fillStyle = '#78350f'; g.fillRect(-s * 0.08, -s * 0.28, s * 0.16, s * 0.28);
      g.fillStyle = '#7dd3fc'; g.fillRect(-s * 0.3, -s * 0.4, s * 0.12, s * 0.12); g.fillRect(s * 0.18, -s * 0.4, s * 0.12, s * 0.12);
      break;
    case 'sign':
      g.fillStyle = '#78350f'; g.fillRect(-s * 0.04, -s * 0.5, s * 0.08, s * 0.5);
      g.fillStyle = '#d6a65c'; g.fillRect(-s * 0.3, -s * 0.8, s * 0.6, s * 0.34);
      break;
    case 'flower':
      g.fillStyle = '#16a34a'; g.fillRect(-1, -s * 0.4, 2, s * 0.4);
      ellipse(0, -s * 0.45, s * 0.14, s * 0.14, '#f472b6'); ellipse(0, -s * 0.45, s * 0.05, s * 0.05, '#fde047');
      break;
    case 'torch':
      g.fillStyle = '#57534e'; g.fillRect(-s * 0.04, -s * 0.5, s * 0.08, s * 0.5);
      ellipse(0, -s * 0.6, s * 0.14, s * 0.2, '#f97316'); ellipse(0, -s * 0.58, s * 0.07, s * 0.11, '#fde047');
      break;
    default:
      ellipse(0, -s * 0.2, s * 0.3, s * 0.3, '#ef4444');
  }
}

export function drawMapObject(g, o) {
  const t = OBJECT_TYPES[o.type];
  if (!t) return;
  g.save();
  g.translate(o.x, o.y);
  drawObjectShape(g, o.type, t.size * (o.scale || 1));
  g.restore();
}

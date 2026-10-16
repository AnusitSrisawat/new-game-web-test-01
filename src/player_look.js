// Player paper-doll: back (wings/cape) -> headless body -> outfit -> head -> hat, composed live from the cut parts
// (assets/sprites/player/parts, see tools/player_parts_cutout.py). Shared by the game and the Studio preview.
//
// The BASE MODEL is the bare body picture: 135 x 301 px, head 0-134, chin at y=134, feet at y=301, centre x=66.
// Every piece is placed on it by three numbers stored on the item itself (editable in Studio -> items):
//   partW = width of the piece (px of the base model), partX = shift from the model centre (+ = right, px),
//   partY = the height line it hangs on:  hat -> its bottom edge,  head -> the chin,  outfit -> its bottom (feet),
//                                         back (wings/cape) -> its centre.
import { PLAYER_SPRITES } from './player_sprites.js';

export const MODEL = { w: 135, h: 301, cx: 66, chinY: 134, feetY: 301 };
export const PLAYER_BODY_PX = MODEL.h;
// which anchor each slot uses: 'bottom' = partY is the bottom edge, 'center' = partY is the vertical centre
export const ANCHOR = { back: 'center', outfit: 'bottom', head: 'bottom', hat: 'bottom' };

// Draw order stages on the model (back to front). Each piece has one main picture (its own fields) plus any number of
// extra layers (item.layers: a cropped copy of any part picture with its own place + stage), so one item can be split:
// e.g. wings = whole wings 'behind_body' + a cropped tip 'over_outfit'.
export const LAYER_ZS = ['behind_body', 'over_body', 'over_outfit', 'over_head', 'over_hat'];
export const MAX_EXTRA_LAYERS = 8;
export const LAYER_Z_LABEL = { behind_body: 'หลังตัวละคร', over_body: 'ทับตัวเปล่า (ใต้ชุด)', over_outfit: 'ทับชุด (ใต้หัว)', over_head: 'ทับหัว (ใต้หมวก)', over_hat: 'บนสุด (ทับหมวก)' };
const MAIN_Z = { back: 'behind_body', outfit: 'over_body', head: 'over_outfit', hat: 'over_head' };

// drawLook(ctx, getImg, look, k): look = { back, outfit, head, hat } (item objects with .part and partW/partX/partY).
// Draws with the model's feet-centre at the context origin (0, 24); k = world units per base-model pixel.
export function drawLook(ctx, getImg, look, k) {
  const P = PLAYER_SPRITES.parts;
  // draw (a crop of) a part picture into a base-model rect
  const draw = (id, left, top, w, h, flip, crop) => {
    const im = P[id] && getImg(`assets/sprites/player/parts/${id}.png`);
    if (!im) return;
    const x = (left - MODEL.cx) * k, y = 24 + (top - MODEL.feetY) * k, wk = w * k, hk = h * k;
    ctx.save();
    if (flip) { ctx.translate(x + wk / 2, 0); ctx.scale(-1, 1); }
    const dx = flip ? -wk / 2 : x;
    if (crop && crop.poly && crop.poly.length >= 3) {          // freehand outline: only what is inside it is shown
      ctx.beginPath();
      crop.poly.forEach(([px, py], i) => { const X = dx + (px - crop.sx) * wk / crop.sw, Y = y + (py - crop.sy) * hk / crop.sh; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.clip();
    }
    if (crop) ctx.drawImage(im, crop.sx, crop.sy, crop.sw, crop.sh, dx, y, wk, hk);
    else ctx.drawImage(im, dx, y, wk, hk);
    ctx.restore();
  };
  const stages = Object.fromEntries(LAYER_ZS.map(z => [z, []]));
  const addMain = (slot, it) => {
    if (!it || !it.part || !P[it.part]) return;
    const z = it.layer === 'behind' ? 'behind_body' : MAIN_Z[slot];
    const w = it.partW || P[it.part].w, h = P[it.part].h * w / P[it.part].w;
    const y = it.partY ?? (slot === 'head' ? MODEL.chinY : MODEL.feetY);
    stages[z].push(() => draw(it.part, MODEL.cx + (it.partX || 0) - w / 2, ANCHOR[slot] === 'center' ? y - h / 2 : y - h, w, h, it.flip === 'yes'));
    for (const l of it.layers || []) {                       // extra cloned / cropped layers
      if (!P[l.src]) continue;
      const cw = l.sw || P[l.src].w, ch = l.sh || P[l.src].h, lw = l.partW || cw, lh = ch * lw / cw;
      stages[LAYER_ZS.includes(l.z) ? l.z : z].push(() =>
        draw(l.src, MODEL.cx + (l.partX || 0) - lw / 2, (l.partY ?? 150) - lh / 2, lw, lh, l.flip === 'yes', { sx: l.sx || 0, sy: l.sy || 0, sw: cw, sh: ch, poly: l.poly }));
    }
  };
  addMain('back', look.back);
  addMain('outfit', look.outfit);
  addMain('head', look.head || { part: 'head_0', partW: 131, partY: MODEL.chinY });
  addMain('hat', look.hat);
  const run = (z) => stages[z].forEach(f => f());
  run('behind_body');
  draw('body_nohead', 0, 132, P.body_nohead.w, P.body_nohead.h);
  run('over_body'); run('over_outfit'); run('over_head'); run('over_hat');
}

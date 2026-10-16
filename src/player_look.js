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

// drawLook(ctx, getImg, look, k): look = { back, outfit, head, hat } (item objects with .part and partW/partX/partY).
// Draws with the model's feet-centre at the context origin (0, 24); k = world units per base-model pixel.
export function drawLook(ctx, getImg, look, k) {
  const P = PLAYER_SPRITES.parts;
  const draw = (id, left, top, w, h, flip) => {
    const im = P[id] && getImg(`assets/sprites/player/parts/${id}.png`);
    if (!im) return;
    const x = (left - MODEL.cx) * k, y = 24 + (top - MODEL.feetY) * k, wk = w * k, hk = h * k;
    if (flip) { ctx.save(); ctx.translate(x + wk / 2, 0); ctx.scale(-1, 1); ctx.drawImage(im, -wk / 2, y, wk, hk); ctx.restore(); }
    else ctx.drawImage(im, x, y, wk, hk);
  };
  const place = (slot, it) => {
    if (!it || !it.part || !P[it.part]) return;
    const w = it.partW || P[it.part].w, h = P[it.part].h * w / P[it.part].w;
    const y = it.partY ?? (slot === 'head' ? MODEL.chinY : MODEL.feetY);
    draw(it.part, MODEL.cx + (it.partX || 0) - w / 2, ANCHOR[slot] === 'center' ? y - h / 2 : y - h, w, h, it.flip === 'yes');
  };
  // item.layer: 'behind' = drawn before (under) the body, 'front' = over it. Default: wings/cape behind, the rest in front.
  const list = [['back', look.back], ['outfit', look.outfit], ['head', look.head || { part: 'head_0', partW: 131, partY: MODEL.chinY }], ['hat', look.hat]];
  const behind = (slot, it) => (it.layer || (slot === 'back' ? 'behind' : 'front')) === 'behind';
  for (const [slot, it] of list) if (it && behind(slot, it)) place(slot, it);
  draw('body_nohead', 0, 132, P.body_nohead.w, P.body_nohead.h);
  for (const [slot, it] of list) if (it && !behind(slot, it)) place(slot, it);
}

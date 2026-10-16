// Player paper-doll: back (wings/cape) -> headless body -> outfit -> head -> hat, composed live from the cut parts
// (assets/sprites/player/parts, see tools/player_parts_cutout.py). Shared by the game and the Studio preview.
import { PLAYER_SPRITES } from './player_sprites.js';

// Layout in "body picture" pixels (the bare body picture is 135 x 301: head 0-134, feet at 301)
const FEET_X = 65, FEET_Y = 301, HEAD_CX = 66, CHIN_Y = 134, TORSO_CX = 65;
const HEAD_W = 131;                                                  // every head is scaled to this width
const HAT = { hat_helm: [150, 128], hat_wizard: [200, 70], hat_cat: [135, 52], hat_crown: [105, 36] }; // [width, bottom y]
const BACK = { wings_angel: [225, 165], wings_dragon: [270, 150], wings_fairy: [200, 160], cape_red: [150, 215] }; // [width, centre y]
export const PLAYER_BODY_PX = 301;

// item = { part, scale, offX, offY } style objects are the ITEMS entries (hat.hat, head.head, outfit.outfit / .back)
// drawLook(ctx, getImg, look, k): draws with the feet-centre at the current origin's (0, 24), k = world units per picture pixel
export function drawLook(ctx, getImg, look, k) {
  const P = PLAYER_SPRITES.parts;
  const img = (id) => (P[id] ? getImg(`assets/sprites/player/parts/${id}.png`) : null);
  const put = (id, bx, by, bw, bh, it) => {                           // body-picture rect -> world units around the feet
    const im = img(id); if (!im) return;
    const s = (it && it.scale) || 1, ox = (it && it.offX) || 0, oy = (it && it.offY) || 0;
    const cx = bx + bw / 2, cy = by + bh / 2;
    ctx.drawImage(im, (cx - FEET_X) * k - bw * s * k / 2 + ox, 24 + (cy - FEET_Y) * k - bh * s * k / 2 + oy, bw * s * k, bh * s * k);
  };
  const fitW = (id, w) => [w, Math.round(P[id].h * w / P[id].w)];
  const fitH = (id, h) => [Math.round(P[id].w * h / P[id].h), h];
  const outfit = look.outfit, head = look.head, hat = look.hat;
  if (outfit && outfit.back && BACK[outfit.back]) {
    const [w, cy] = BACK[outfit.back], [bw, bh] = fitW(outfit.back, w);
    put(outfit.back, TORSO_CX - bw / 2, cy - bh / 2, bw, bh, outfit);
  }
  put('body_nohead', 0, 132, P.body_nohead.w, P.body_nohead.h);
  if (outfit && outfit.outfit && P[outfit.outfit]) {
    const [bw, bh] = fitH(outfit.outfit, 172);
    put(outfit.outfit, TORSO_CX - bw / 2, FEET_Y - bh + 2, bw, bh, outfit);
  }
  const hid = (head && head.head) || 'head_0';
  const [hw, hh] = fitW(hid, HEAD_W);
  put(hid, HEAD_CX - hw / 2, CHIN_Y - hh, hw, hh, head);
  if (hat && hat.hat && HAT[hat.hat]) {
    const [w, bottom] = HAT[hat.hat], [bw, bh] = fitW(hat.hat, w);
    put(hat.hat, HEAD_CX - bw / 2, bottom - bh, bw, bh, hat);
  }
}

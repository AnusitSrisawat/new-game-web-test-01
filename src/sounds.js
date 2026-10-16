// Sound effect DATA. Each effect is a small synth recipe (see SoundEngine.playParams in audio.js):
//   a tone layer  (wave, freq -> freqEnd, over dur seconds; arp = play it as a chord / rising arpeggio)
//   a noise layer (band-passed noise, noiseFreq -> noiseFreqEnd)  — good for swooshes, hits, crunch
//   tone / noise = how loud each layer is (0-100), vol = overall loudness, pitchVar = random pitch wobble (%)
// Edited in Studio (tab "เสียง"); the game plays them by id via soundEngine.play(id).
export const SOUND_META = {
  slash:       { label: 'ฟันปกติ', when: 'โจมตีระยะประชิดทั่วไป' },
  critHit:     { label: 'ฟันคริติคอล', when: 'โจมตีติดคริ / ใช้สกิลดาเมจ' },
  monsterHit:  { label: 'มอนสเตอร์โดนตี', when: 'มอนสเตอร์ได้รับดาเมจ (ทุกคนในแมพได้ยิน)' },
  monsterDie:  { label: 'มอนสเตอร์ตาย', when: 'ฟันมอนสเตอร์ตาย' },
  playerHurt:  { label: 'ผู้เล่นโดนตี', when: 'มอนสเตอร์โจมตีเรา' },
  bowShoot:    { label: 'ยิงธนู/เวทย์', when: 'ปล่อยลูกศร / กระสุนเวทย์' },
  arrowHit:    { label: 'ลูกศรโดนเป้า', when: 'ลูกศร/กระสุนถึงเป้าหมาย' },
  levelUp:     { label: 'เลเวลอัป', when: 'เลเวลเพิ่ม' },
  coin:        { label: 'เก็บเงิน/EXP', when: 'เก็บ Gold หรือ EXP orb' },
  loot:        { label: 'เก็บไอเทม', when: 'เก็บไอเทมที่ดรอป' },
  potion:      { label: 'ดื่มยา', when: 'ใช้ยาฟื้น HP' },
  firstAid:    { label: 'ปฐมพยาบาล', when: 'สกิล First Aid / ฟื้น HP' },
  townPortal:  { label: 'วาร์ปกลับเมือง', when: 'สกิล Town Portal' },
  powerStrike: { label: 'ฟันหนัก', when: 'สกิล Power Strike' },
  whirlwind:   { label: 'กวาดรอบตัว', when: 'สกิล Whirlwind' },
  ironGuard:   { label: 'เกราะเหล็ก', when: 'สกิล Iron Guard' },
  berserk:     { label: 'คลั่ง', when: 'สกิล Berserk' },
  dash:        { label: 'พุ่งตัว', when: 'สกิลพุ่ง (Flash Dash)' },
  warCry:      { label: 'ตะโกนศึก', when: 'สกิล War Cry' },
  falconCry:   { label: 'เหยี่ยวร้อง', when: 'สกิล Falcon' },
  dragonRoar:  { label: 'มังกรคำราม', when: 'สกิล Dragon Roar' }
};

const S = (wave, freq, freqEnd, dur, vol, tone, noise, noiseFreq, noiseFreqEnd, arp = 'none', pitchVar = 0) =>
  ({ wave, freq, freqEnd, dur, vol, tone, noise, noiseFreq, noiseFreqEnd, arp, pitchVar });

export const SOUND_DEFAULTS = {
  slash:       S('sine',     400,  400, 0.12, 40,   0, 100, 1400, 400, 'none', 6),
  critHit:     S('triangle', 500,   90, 0.20, 70,  90,  25, 2500, 600, 'none', 4),
  monsterHit:  S('triangle', 260,   90, 0.10, 45,  70,  50, 1800, 500, 'none', 10),
  monsterDie:  S('sawtooth', 320,   50, 0.45, 60,  70,  45, 1200, 150, 'none', 6),
  playerHurt:  S('square',   200,   80, 0.16, 35,  70,  40,  900, 300, 'none', 5),
  bowShoot:    S('sine',     880,  320, 0.14, 35,  80,  30, 3000, 1500, 'none', 5),
  arrowHit:    S('triangle', 350,  110, 0.10, 40,  85,  30, 1500, 500, 'none', 8),
  levelUp:     S('triangle', 440,  440, 0.35, 40, 100,   0, 1000, 1000, 'chord', 0),
  coin:        S('square',   988, 1319, 0.12, 25, 100,   0, 1000, 1000, 'none', 0),
  loot:        S('sine',     660,  990, 0.15, 30, 100,   0, 1000, 1000, 'none', 0),
  potion:      S('sine',     440,  880, 0.25, 40, 100,   0, 1000, 1000, 'none', 0),
  firstAid:    S('sine',     523,  523, 0.60, 30, 100,   0, 1000, 1000, 'chord', 0),
  townPortal:  S('sine',     262, 1047, 0.55, 35, 100,   0, 1000, 1000, 'none', 0),
  powerStrike: S('triangle', 160,   35, 0.35, 80,  80,  35,  800, 120, 'none', 3),
  whirlwind:   S('sine',     220,  260, 0.45, 40,  60,  50,  500, 1500, 'none', 0),
  ironGuard:   S('sine',     988, 1319, 0.60, 50, 100,   0, 1000, 1000, 'none', 0),
  berserk:     S('sawtooth',  90,   60, 0.50, 60,  90,  25,  300, 100, 'none', 0),
  dash:        S('sine',     600,  150, 0.18, 45,  80,  35, 2000, 600, 'none', 0),
  warCry:      S('sawtooth', 120,   90, 0.45, 60, 100,   0, 1000, 1000, 'none', 0),
  falconCry:   S('sawtooth', 1600, 1200, 0.30, 25, 100,   0, 1000, 1000, 'none', 3),
  dragonRoar:  S('sawtooth', 160,   65, 0.85, 60,  90,  30,  250, 80, 'none', 0)
};

// Live copy (Studio overrides are layered on top, like SKILLS)
export const SOUNDS = JSON.parse(JSON.stringify(SOUND_DEFAULTS));

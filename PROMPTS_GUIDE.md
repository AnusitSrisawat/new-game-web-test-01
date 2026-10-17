# 🎨 รวมคู่มือ AI Prompts สำหรับสร้าง Asset เกม (Game Assets Prompt Guide)

เอกสารรวบรวม Prompt สำหรับสร้างชิ้นส่วนตัวละคร, อุปกรณ์ และอาวุธทั้งหมดของเกม โดยออกแบบโครงสร้างคำสั่ง (Prompt Architecture) ให้เข้ากับสไตล์ภาพ **2D Chibi Fantasy RPG** และรองรับการนำไปตัดพื้นหลังอัตโนมัติ (Sprite Cutout) เพื่อประกอบเข้ากับระบบ **Paperdoll Rig** (`src/player_look.js`)

---

## 📌 มาตรฐานสเปกภาพกลาง (Universal Generation Rules)

> [!CRITICAL]
> ### 🚫 กฎเหล็กสำคัญที่สุด: ห้ามมีเงาที่พื้นเด็ดขาด (NO GROUND / FLOOR SHADOW)
> **ทุกภาพที่สร้างต้องไม่มีเงาตกกระทบบนพื้นเด็ดขาด (ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO CONTACT SHADOW UNDER FEET, NO DROP SHADOW)**
> * **ตัวอย่าง:** เมื่อตัวละครยืน หรือชุดเสื้อผ้าเกราะตั้งอยู่ **เท้าและรองเท้าบูทต้องลอยอยู่บนพื้นเรียบสะอาดตา 100% ห้ามมีวงรีเงาดำ คราบเงาสีเทา หรือเงาทอดตัวใต้ฝ่าเท้า**
> * **เหตุผลสำคัญ:** ระบบเกมมีโค้ดวาดเงาวงรีใต้เท้าตัวละคร (`Layer 0: Shadow Ellipse` ใน Canvas) ให้แบบไดนามิกอยู่แล้ว หากภาพต้นฉบับมีเงาติดพื้นมาด้วย เครื่องมือตัดภาพ (Cutout Tool) จะตัดติดคราบเงาดำใต้เท้า ทำให้สไปรต์ตัวละครเมื่อสวมใส่มีเงาซ้อนทับกัน (Double Shadows) ดูสกปรกและผิดสัดส่วน

### ข้อกำหนดอื่นๆ:
* **Background:** `solid clean flat light grey background (#E2E2E2)` หรือ `pure white background` พื้นเรียบสนิท ไม่มีลวดลาย ไม่มีเงาตกกระทบ
* **Art Style:** `2D clean vector RPG game art, bold dark outlines, vibrant cel-shaded colors`
* **Scale & Spacing:** สเกลเท่ากันทุกชิ้น มีระยะห่างระหว่างไอเทมชัดเจน ไม่เกยหรือทับซ้อนกัน
* **No Visual FX (สำหรับชิ้นที่ต้องไดคัท):** ไม่มีประกายแสงออร่า ควัน หรือเอฟเฟกต์ไฟฟุ้งกระจาย เพื่อให้เครื่องมือตัดไดคัทขอบได้คมชัด 100%

---

## 1. 💇 ทรงผม (Hairstyles)

### 1.1 Sheet รวมทรงผมหลายแบบ (Hairstyles Collection Grid)
> สำหรับสร้างทรงผมหลากหลายสไตล์บนหัวหุ่นเปล่า หรือวิกผมแยกชิ้น
```text
Create a 2D fantasy RPG chibi character hairstyles collection sprite sheet, arranged in a neat grid on a solid clean light grey background (#E2E2E2). Displayed as wigs fitted on blank featureless mannequin chibi heads. CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS, heads cleanly floating with no shadows on background. A variety of hairstyles:
- Row 1 (Anime & Action): spiky golden hero hair, neat chestnut side-part, wild crimson punk undercut, midnight samurai topknot with ribbon.
- Row 2 (Twin & Braids): cute pastel pink twin odango buns, noble blonde single braided plait, lavender flowing twin drills, auburn twin low braids.
- Row 3 (Short & Bob Cuts): mint green short pixie cut, vanilla neat bob with straight bangs, silver shaggy wolf cut, asymmetric sakura bob.
- Row 4 (Long & Flowing): emerald green high ponytail with dynamic wind sway, royal navy blue side braid, grand sunset orange layered waves, snow white long straight hime cut.
Art style: 2D clean anime game asset, crisp bold dark outlines, cel-shaded color highlights, uniform head scale, front three-quarter view, no facial features, clear spacing between heads, no text, no watermark.
```

**Negative Prompt:**
```text
floor shadow, ground shadow, drop shadow, contact shadow, human face, skin, realistic photo, 3d render, blurry, messy background, overlapping items, watermark
```

### 1.2 เจนทรงผมเดี่ยว (Single Hairstyle Template)
```text
Single 2D chibi RPG hairstyle game asset, fitted on a blank bald mannequin head, [COLOR] [STYLE DESCRIPTION] (e.g. golden spiky warrior hair / fluffy lavender twintails / jet-black samurai topknot), 2D cel-shaded anime art, bold dark outlines, vibrant highlights, front three-quarter angle, isolated on solid clean light grey background (#E2E2E2), CRITICAL: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOW, no face details, no watermark.
```

---

## 2. 🥋 ชุดเครื่องแต่งกาย (Outfits / Costumes)

### 2.1 Sheet รวม 4 ชุดหลัก (ตามภาพ `player_parts_sheet.jpg`)
> สไปรต์ชุดแบบ **Headless Mannequin** (คอกลวง/ไม่มีหัวและแขนขาคนจริง) สัดส่วน Chibi ขาสั้นเอวสั้น **เท้าลอยไม่มีเงาที่พื้นเด็ดขาด**
```text
2D chibi fantasy RPG character outfits and armor costume sprite sheet, game asset collection arranged horizontally in a single row with 4 distinct costumes, isolated on solid clean flat light grey background (#E2E2E2). Chibi proportions, short stocky torso and legs, headless hollow mannequin display showing only the clothing and armor. 

CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO CONTACT SHADOW UNDER FEET OR BOOTS, NO DROP SHADOWS. Boots and legs must cleanly float on flat light grey background without touching any shadow or ground plane:

1. Blue & Silver Novice Knight Plate: polished silver steel plate armor, blue sash belt tied at waist, pauldrons, matching greaves and sabatons.
2. Emerald Ranger Leather Tunic: forest green tunic with brown leather vest, shoulder straps with quiver, brass belt buckle, dark brown leather boots.
3. Crimson Sorcerer Robe: deep crimson red wizard robe with ornate gold trim embroidery, matching purple/pink sash belt, brown leather spellcaster boots.
4. Black Shadow Assassin Coat: dark charcoal hooded leather trench coat, strapped utility belts, buckled cuffs, stealth rogue black boots.

Crisp clean vector cel-shaded digital game art, bold dark outlines, vibrant colors, uniform scale, front three-quarter view, high contrast, clean separation between items, strictly no ground shadows under feet, no drop shadows, no text, no watermark, master quality game assets.
```

**Negative Prompt:**
```text
floor shadow, ground shadow, contact shadow under feet, feet shadow, shadow on floor, drop shadow, surface shadow, human head, face, hair, skin, watermark, realistic photo, 3d render, blurry, messy background, overlapping items
```

### 2.2 เจนชุดเดี่ยวแบบกำหนดสไตล์เอง (Single Outfit Template)
```text
Single 2D chibi fantasy RPG character outfit, headless hollow mannequin display showing only the armor and clothing, [THEME/CLASS] (e.g. Holy Paladin white-gold plate armor / Arch-Mage starry midnight robe / Cyberpunk neon ninja jacket), short chibi torso and leg proportions, 2D vector game asset style, bold dark outlines, clean cel-shading, front three-quarter angle, isolated on solid clean flat light grey background (#E2E2E2). CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW UNDER FEET, NO DROP SHADOW, boots cleanly floating without touching any shadow, no human head, no arms, no background shadow.
```

---

## 3. 🪽 ปีกและผ้าคลุม (Wings & Back Items)

### 3.1 Sheet รวม 4 ชิ้นหลังหลัก (ตามภาพ `player_parts_sheet.jpg`)
> ปีกกางเป็นคู่สมมาตร หรือผ้าคลุมมุมมองด้านหลัง จัดวางมีระยะห่างชัดเจน ลอยบนพื้นหลังไม่มีเงา
```text
2D fantasy RPG back accessories and equipment sprite sheet, game asset collection of 4 distinct wings and cape items arranged horizontally in a single row, isolated on solid clean flat light grey background (#E2E2E2), perfectly sized for chibi character backs. CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS:

1. Radiant White Feathered Angel Wings: a pair of pure white holy feathered angel wings with soft baby blue shading and neat feather layers, spread symmetrically outward.
2. Purple Dragon Bat Wings: a pair of dark purple demonic dragon bat wings with pointed black claw tips and bone membrane structure, spread symmetrically.
3. Green Butterfly Fairy Wings: a pair of delicate emerald green fairy butterfly wings with translucent stained-glass veined patterns and glowing mint accents.
4. Flowing Red Knight Cape: a rich crimson red velvet hero cape draped neatly with royal gold trim accents, flowing folds seen from the back view.

Clean 2D vector RPG game art, bold crisp dark outlines, cel-shaded coloring, vibrant palette, uniform scale, isolated elements with ample spacing, no ground shadow, no text, no labels, no messy aura, no background effects, easy for sprite sheet cutout.
```

**Negative Prompt:**
```text
floor shadow, ground shadow, drop shadow, character wearing, human body, full avatar, messy glows, particle effects, fire, smoke, background clutter, overlapping, cropped edges, watermark, 3d model
```

### 3.2 เจนปีกหรือผ้าคลุมเดี่ยว (Single Back Item Template)
```text
A pair of 2D fantasy RPG [WINGS / CAPE] back accessory equipment, [DESCRIPTION] (e.g. golden phoenix flame wings / dark void raven wings / noble royal blue fur-collared cape), symmetrical wide spread design viewed from back, bold dark outlines, cel-shaded game asset vector art, isolated on clean solid light grey background (#E2E2E2). CRITICAL: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOW, no character, no effects bleeding outside borders.
```

---

## 4. 👀 ดวงตาและใบหน้า (Eyes & Face Expressions)

### 4.1 Sheet ใบหน้าและดวงตาแบบต่างๆ (Face Parts Sheet)
> ออกแบบมาเป็นแผ่นสไปรต์สำหรับระบบแยกหน้า-ตา ปรับแต่งอารมณ์ตัวละครได้ ลอยอิสระไม่มีเงา
```text
2D anime chibi character facial expressions and eye styles sprite sheet, arranged in a neat 3x3 grid on solid light grey background (#E2E2E2). CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS. Each cell shows a cute stylized anime face on a soft peach-tone circular chibi head template:
- Row 1 (Standard):
  1. Determined Hero: bright amber-brown open eyes, small confident smile, neat brows.
  2. Cheerful Idol: sparkling blue joyful eyes, blushing pink cheeks, sweet open curved smile.
  3. Calm Sage: relaxed dark purple eyes, subtle peaceful gentle smile.
- Row 2 (Playful & Tsundere):
  4. Winking Rogue: one glowing golden eye winking, playful mischievous smirk.
  5. Tsundere Pout: narrowed teal eyes looking away, cute puffed blushing cheeks, wavy pout mouth.
  6. Starry Dreamer: pink eyes with glittering star pupils, excited sparkling expression.
- Row 3 (Mystic & Intense):
  7. Mystic Mage: glowing cyan runic circle eyes, calm neutral stoic expression.
  8. Dark Shadow: sharp crimson slit-pupil eyes, cunning sharp confident grin.
  9. Sleepy Cozy: relaxed horizontal curved line sleepy eyes, tiny 'o' yawning mouth.
Clean vector anime game illustration, bold crisp lines, kawaii chibi aesthetic, uniform scale, perfectly spaced for game asset extraction, no cast shadows.
```

### 4.2 ตาและคิ้วโปร่งใส (Eyes Only Overlay)
```text
Collection of 2D anime chibi eyes and eyebrow pairs sprite sheet, without hair or skin, isolated on solid clean light grey background (#E2E2E2). CRITICAL: NO GROUND SHADOW, NO DROP SHADOW. High-resolution expressive anime vector eyes: sparkling blue, emerald green, ruby red, amethyst purple, golden amber. Symmetrical front-facing pairs, bold outlines, clean glossy eye reflections, suitable for 2D character avatar customization.
```

---

## 5. 👄 ปากและการแสดงอารมณ์ (Mouth Expressions)

```text
2D anime chibi mouth expressions sprite sheet collection, game UI asset, arranged neatly in 2 rows on clean solid light grey background (#E2E2E2). CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO DROP SHADOWS:
- Tiny subtle happy smile line
- Wide cheerful open laughing mouth with visible tongue
- Cute cat-mouth shape (':3' shape)
- Playful vampire smirk with single tiny tooth fang
- Pouting wavy mouth line
- Shocked small 'O' shaped open mouth
- Confident broad grin
- Serious firm closed line
Bold clean outlines, minimalist cute anime aesthetic, high contrast, uniform spacing between each mouth sprite for easy cut-out.
```

---

## 6. ⚔️ อาวุธประเภทต่างๆ (Weapons Collection)

> **กฎเหล็กของอาวุธ:** เอียง 45 องศา (หันปลายขึ้นขวา ฐานลงซ้าย), ไม่มีประกายไฟ/ออร่าฟุ้งกระจาย, **และห้ามมีเงาตกกระทบบนพื้นเด็ดขาด (NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOW)** เพื่อให้หมุนควงและแสดงผลลอยข้างตัวได้คมชัด

### 6.1 ดาบ (Swords & Blades)
```text
Create a 2D fantasy RPG sword weapon sprite sheet, arranged neatly in a grid on a solid clean light grey background (#E2E2E2). All swords must be identical in uniform scale and size, tilted diagonally at 45 degrees pointing upper-right with hilt at lower-left. CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS, NO CAST SHADOWS ON BACKGROUND. CRITICAL REQUIREMENT: NO visual effects, NO fire, NO flames, NO lightning, NO glow, NO magical aura. Strictly plain bare physical forged steel and fantasy metals: iron broadsword, silver paladin longsword, rune-carved claymore, crimson dragon slayer greatsword, obsidian katana. 2D vector RPG game asset style, bold dark outlines, crisp clean sprites.
```

### 6.2 คทาและไม้เท้าเวท (Staves & Wands)
```text
Create a 2D fantasy RPG magic staff and scepter sprite sheet, arranged in a neat grid on a solid clean light grey background (#E2E2E2). All staves identical in uniform scale, tilted diagonally at 45 degrees pointing upper-right with base at lower-left. CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS, NO CAST SHADOWS ON BACKGROUND. CRITICAL REQUIREMENT: NO visual effects, NO fire flames, NO floating magic auras, NO particle sparks. Plain physical staves: carved wooden wand, silver cleric scepter, crystal orb rod, bone sorcery staff, gilded archangel staff. Bold dark outlines, crisp 2D vector RPG game art.
```

### 6.3 ธนูและหน้าไม้ (Bows & Crossbows)
```text
Create a 2D fantasy RPG bow and crossbow weapon sprite sheet, arranged in a grid on clean solid light grey background (#E2E2E2). All bows identical in uniform scale, tilted diagonally at 45 degrees pointing upper-right. CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS, NO CAST SHADOWS ON BACKGROUND. CRITICAL REQUIREMENT: NO visual effects, NO energy beams, NO floating magical arrows, NO particle dust. Plain physical bows: wooden recurve bow, elven silver longbow, iron heavy crossbow, crimson horn greatbow, celestial feathered bow. Bold outlines, crisp clean separation.
```

### 6.4 หอกและง้าว (Spears & Lances)
```text
Create a 2D fantasy RPG spear, halberd, and lance weapon sprite sheet on clean solid light grey background (#E2E2E2). All polearms identical in uniform scale, tilted diagonally at 45 degrees pointing upper-right with shaft at lower-left. CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS, NO CAST SHADOWS ON BACKGROUND. CRITICAL REQUIREMENT: NO visual effects, NO elemental glow, NO lightning bolts. Physical metal and wood: iron pike, steel battle halberd, knight jousting lance, winged holy partisan, dragonbone trident. 2D vector game asset style, bold dark outlines.
```

### 6.5 ปืนและปืนใหญ่เวท (Guns & Blasters)
```text
Create a 2D fantasy RPG firearms and blunderbuss weapon sprite sheet on clean solid light grey background (#E2E2E2). All weapons identical in uniform scale, tilted diagonally at 45 degrees pointing upper-right with handle at lower-left. CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS, NO CAST SHADOWS ON BACKGROUND. CRITICAL REQUIREMENT: NO muzzle flash, NO laser beams, NO smoke, NO fire bullets. Physical gun bodies: flintlock pistol, brass musket rifle, twin revolvers, steampunk steam cannon, ornate engraved silver handgun. High resolution, crisp clean 2D vector art.
```

### 6.6 หนังสือและคัมภีร์เวท (Books & Grimoires)
```text
Create a 2D fantasy RPG magic books and grimoires sprite sheet on clean solid light grey background (#E2E2E2). All books identical in uniform scale, tilted diagonally at 45 degrees. CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS, NO CAST SHADOWS ON BACKGROUND. CRITICAL REQUIREMENT: ALL BOOKS MUST BE COMPLETELY CLOSED with visible hardcovers, clasps, and spines. NO open pages, NO floating parchment, NO glowing magic circles. Plain physical ornate books: leather-bound tome, iron-trimmed grimoire, ruby-encrusted holy bible, forbidden demon scripture. Bold outlines, clean separation.
```

### 6.7 โล่ (Shields & Bucklers)
```text
Create a 2D fantasy RPG shields sprite sheet, arranged in a neat row on clean solid light grey background (#E2E2E2). Front-facing display:
1. Golden Lion Crest Kite Shield: embossed golden lion head on red heraldic steel plate.
2. Magic Rune Buckler: circular silver shield with glowing azure mana runic engravings.
3. Heavy Iron Tower Shield: rectangular reinforced iron fortress shield with bronze rivets.
4. Nature Wooden Aegis: carved ancient oak buckler wrapped with leaf vine iron straps.
CRITICAL REQUIREMENT: ABSOLUTELY NO FLOOR SHADOW, NO GROUND SHADOW, NO DROP SHADOWS. Bold crisp dark outlines, cel-shaded metallic shading, clean separation, no background shadows.
```

---

## 7. 🛠️ เคล็ดลับการแปลงภาพเข้าสู่เกม (Integration Workflow)

1. **บันทึกรูป:** นำภาพที่เจนได้มาวางในโฟลเดอร์ `assets/player/` หรือ `assets/weapons/`
2. **ตัดชิ้นส่วนโปร่งใส (Cutout):**
   * เมื่อภาพไม่มีเงาที่พื้น สคริปต์อัตโนมัติ `python3 tools/player_parts_cutout.py` จะสามารถตรวจจับและตัดฉากหลังออกได้หมดจด 100% ไม่มีรอยดำขอบเท้า
   * หรือใช้ **Studio Editor** ในเกม (`http://localhost:3000` -> ปุ่ม Studio) เพื่อเลือกจุดตัด ปรับพิกัดสวมใส่ (`partW`, `partX`, `partY`) และจัดลำดับเลเยอร์ได้แบบเรียลไทม์
3. **กำหนดค่าในแคตตาล็อก:** ลงทะเบียนชิ้นส่วนใหม่ใน [src/catalog.js](file:///d:/jimmy/game/eco/Game/game-web/new-game-web-test-01/src/catalog.js) เพื่อให้ผู้เล่นสวมใส่ได้ทันที

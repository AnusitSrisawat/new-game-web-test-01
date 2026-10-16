# คู่มือไอเทมดรอปและอาวุธ (Items & Weapons Database)

เอกสารรวบรวมข้อมูลรายละเอียดไอเทมทั้งหมดในเกม แบ่งเป็น **ไอเทมดรอปจากมอนสเตอร์ (72 ชิ้น)** และ **อาวุธดาบไล่ระดับเลเวล 1 - 100 (20 ชิ้น)** พร้อมพิกัดสไปรต์ สเตตัส และวิธีการนำไปต่อยอดในโค้ดเกม

---

## สารบัญ
1. [ที่ตั้งไฟล์ Assets ทั้งหมด](#ที่ตั้งไฟล์-assets-ทั้งหมด)
2. [ไอเทมดรอปจากมอนสเตอร์ (72 รายการ)](#1-ไอเทมดรอปจากมอนสเตอร์-72-รายการ)
   - [0. ชุดเริ่มต้น (Starter Monsters)](#0-ชุดเริ่มต้น-starter-monsters---assetsitemsitems_monsters_sheetjpg)
   - [1. ประเภทสัตว์ป่า (Beast Monsters)](#1-ประเภทสัตว์ป่า-beast-monsters---assetsitemsitems_beastsjpg)
   - [2. ประเภทโครงกระดูก (Skeleton Monsters)](#2-ประเภทโครงกระดูก-skeleton-monsters---assetsitemsitems_skeletonjpg)
   - [3. ประเภทแฟนตาซี (Fantasy Monsters)](#3-ประเภทแฟนตาซี-fantasy-monsters---assetsitemsitems_fantasyjpg)
   - [4. ประเภทกลุ่มโจร (Bandit Enemies)](#4-ประเภทกลุ่มโจร-bandit-enemies---assetsitemsitems_banditsjpg)
   - [5. ประเภทอื่นๆ (Other Monsters)](#5-ประเภทอื่นๆ-other-monsters---assetsitemsitems_othersjpg)
3. [อาวุธดาบไล่ระดับ Level 1 - 100 (20 เลเวล)](#2-อาวุธดาบไล่ระดับ-level-1---100-20-เลเวล)
   - [Tier 1: Novice to Veteran (Lv 1 - 50)](#tier-1-novice-to-veteran-level-1---50)
   - [Tier 2: Master to Divine God (Lv 55 - 100)](#tier-2-master-to-divine-god-level-55---100)
4. [โครงสร้างโค้ดนำไปใช้ใน src/data.js และ src/sprites.js](#3-การนำไปใช้งานในโค้ด-code-integration)

---

## ที่ตั้งไฟล์ Assets ทั้งหมด

### มอนสเตอร์ (Monsters - 2x2 Grid, 1024x1024)
- `assets/monsters/monsters_sheet.jpg` (ชุดเริ่มต้น: Slime, Hornet, Rabbit, Golem)
- `assets/monsters/monsters_beasts.jpg` (สัตว์ป่า: Wolf, Boar, Viper, Bear)
- `assets/monsters/monsters_skeleton.jpg` (โครงกระดูก: Warrior, Archer, Mage, Knight)
- `assets/monsters/monsters_fantasy.jpg` (แฟนตาซี: Goblin, Imp, Treant, Mimic)
- `assets/monsters/monsters_bandits.jpg` (โจร: Rogue, Archer, Brute, Leader)
- `assets/monsters/monsters_others.jpg` (อื่นๆ: Eye, Armor, Shroom, Dragon)

### ไอเทมดรอป (Drops - 4x3 Grid, 12 Items per sheet, 1024x1024)
- `assets/items/items_monsters_sheet.jpg` (ดรอปจากชุดเริ่มต้น 4 ตัว)
- `assets/items/items_beasts.jpg` (ดรอปจากสัตว์ป่า 4 ตัว)
- `assets/items/items_skeleton.jpg` (ดรอปจากโครงกระดูก 4 ตัว)
- `assets/items/items_fantasy.jpg` (ดรอปจากแฟนตาซี 4 ตัว)
- `assets/items/items_bandits.jpg` (ดรอปจากกลุ่มโจร 4 ตัว)
- `assets/items/items_others.jpg` (ดรอปจากมอนสเตอร์อื่นๆ 4 ตัว)

### อาวุธ (Weapons - 10 Weapons per sheet, 1024x1024)
- `assets/weapons/weapons_tier1.jpg` (ดาบเลเวล 1 ถึง 50 รวม 10 เล่ม)
- `assets/weapons/weapons_tier2.jpg` (ดาบเลเวล 55 ถึง 100 รวม 10 เล่ม)

---

## 1. ไอเทมดรอปจากมอนสเตอร์ (72 รายการ)

แต่ละมอนสเตอร์มีไอเทมดรอป 3 ชิ้น (วัตถุดิบทั่วไป / อุปกรณ์-อาหาร / Relic แรร์)

### 0. ชุดเริ่มต้น (Starter Monsters) - `assets/items/items_monsters_sheet.jpg`
| มอนสเตอร์ | ลำดับ | รหัสไอเทม (ID) | ชื่อไอเทม | ประเภท | ราคา | คำอธิบาย |
|---|:---:|---|---|:---:|:---:|---|
| **Bouncy Slime** | 1 | `sticky_mucus` | Sticky Mucus | material | 5 | เมือกเหนียวสีฟ้าใส ยืดหยุ่น ใช้ปรุงยาและทำกาว |
| | 2 | `bouncy_core` | Bouncy Core | material | 15 | แก่นสไลม์เด้งดึ๋ง เรืองแสงฟ้า เปล่งประกายพลังชีวิต |
| | 3 | `relic_slime_core` | Slime Crown | relic | 250 | มงกุฎทองคำประดับอัญมณีของราชาสไลม์ (HP +50, LUK +2) |
| **Forest Hornet** | 4 | `poison_stinger` | Poison Stinger | material | 18 | เหล็กในผึ้งต่อสีเหลืองสลับดำ ปลายมีหยดพิษมรกต |
| | 5 | `gossamer_wing` | Gossamer Wing | material | 30 | ปีกแมลงบางใสสะท้อนแสงฟ้าอ่อน น้ำหนักเบามาก |
| | 6 | `royal_honeycomb` | Royal Honeycomb | consumable | 45 | รวงผึ้งทองคำหกเหลี่ยมชุ่มน้ำผึ้งแท้ ฟื้นฟู 150 HP |
| **Horned Rabbit** | 7 | `rabbit_fluff` | Rabbit Fluff | material | 20 | ก้อนขนกระต่ายนุ่มฟูสีน้ำตาลอ่อน ใช้ทอเครื่องนุ่งห่ม |
| | 8 | `small_horn` | Sharp Little Horn | material | 28 | เขาเล็กแหลมคมสีงาช้างของกระต่ายป่า ใช้ทำหัวลูกศร |
| | 9 | `relic_golden_carrot` | Golden Carrot | relic | 400 | แครอททองคำแท้เปล่งประกาย เพิ่มความเร็วและการฟื้นฟู |
| **Mossy Golem** | 10 | `stone_plate` | Mossy Stone Plate | material | 40 | แผ่นหินผาหนาปกคลุมด้วยมอสเขียว แข็งแกร่งทนทาน |
| | 11 | `golem_core_gem` | Golem Core Gem | material | 85 | ผลึกคริสตัลอักษรรูนสีฟ้าเรืองแสง หัวใจจักรกลโกเลม |
| | 12 | `relic_golem_core` | Ancient Earth Relic | relic | 650 | ศิลาหัวใจหินสลักอักขระเวทโบราณ เพิ่ม DEF +15 |

---

### 1. ประเภทสัตว์ป่า (Beast Monsters) - `assets/items/items_beasts.jpg`
| มอนสเตอร์ | ลำดับ | รหัสไอเทม (ID) | ชื่อไอเทม | ประเภท | ราคา | คำอธิบาย |
|---|:---:|---|---|:---:|:---:|---|
| **Shadow Wolf** | 1 | `wolf_fur` | Wolf Fur | material | 60 | ขนหมาป่าเงาสีเทาเข้ม นุ่มและทนทาน |
| | 2 | `sharp_fang` | Sharp Fang | material | 80 | เขี้ยวสัตว์ป่าแหลมคม ใช้สร้างอาวุธ |
| | 3 | `alpha_eye_gem` | Alpha Eye Gem | relic | 850 | อัญมณีดวงตาสีทองของจ่าฝูง เพิ่มความแม่นยำ (HIT +10) |
| **Armored Boar** | 4 | `boar_meat` | Boar Rib Meat | consumable | 35 | เนื้อซี่โครงหมูป่าย่าง ฟื้นฟู HP 90 หน่วย |
| | 5 | `hard_tusk` | Curved Tusk | material | 45 | เขี้ยวหมูป่าโค้งยาว แข็งแกร่งทนทาน |
| | 6 | `boar_leather_harness` | Boar Leather Harness | armor | 180 | สายรัดหนังหนาพร้อมหัวเข็มขัดเหล็ก เพิ่ม DEF +8 |
| **Jungle Viper** | 7 | `venom_vial` | Venom Vial | material | 75 | หลอดแก้วบรรจุพิษงูเขียวมรกตเข้มข้น |
| | 8 | `emerald_snake_scale` | Emerald Snake Scale | material | 95 | เกล็ดงูสีเขียวประกายเพชร ใช้ทำชุดเกราะเบา |
| | 9 | `viper_fang_dagger` | Viper Fang Dagger | weapon | 320 | กริชกระดูกอาบพิษ (ATK +35, มีโอกาสติดพิษ) |
| **Claw Bear** | 10 | `sharp_bear_claw` | Sharp Bear Claw | material | 120 | กรงเล็บหมีโค้งยาว คมกริบดั่งเคียว |
| | 11 | `heavy_fur_coat` | Heavy Fur Coat | armor | 450 | เสื้อคลุมขนหมีหนา (DEF +20, HP +150) |
| | 12 | `wild_honey_pot` | Wild Honey Pot | consumable | 110 | โถน้ำผึ้งป่าแท้ ฟื้นฟู 300 HP และลบล้างอาการเมื่อยล้า |

---

### 2. ประเภทโครงกระดูก (Skeleton Monsters) - `assets/items/items_skeleton.jpg`
| มอนสเตอร์ | ลำดับ | รหัสไอเทม (ID) | ชื่อไอเทม | ประเภท | ราคา | คำอธิบาย |
|---|:---:|---|---|:---:|:---:|---|
| **Skeleton Warrior** | 1 | `cracked_skull` | Cracked Skull | material | 70 | เศษกะโหลกกระดูกโบราณ มีไอวิญญาณสถิต |
| | 2 | `rusty_shortsword` | Rusty Shortsword | weapon | 90 | ดาบสั้นขึ้นสนิมของพลทหารโบราณ (ATK +20) |
| | 3 | `wooden_buckler` | Wooden Buckler | shield | 150 | โล่ไม้กลมขอบเหล็ก น้ำหนักเบา ปัดป้องการโจมตี (DEF +12) |
| **Skeleton Archer** | 4 | `bone_arrowhead` | Bone Arrowhead | material | 85 | หัวลูกศรเหลากระดูก คมและเบา |
| | 5 | `hunter_hood` | Hunter Hood | armor | 210 | ฮู้ดผ้าคลุมสีเขียวเก่า พรางตัวในความมืด (EVA +5%) |
| | 6 | `bone_recurve_bow` | Bone Recurve Bow | weapon | 380 | คันธนูแกะสลักจากกระดูก เพิ่มระยะยิง (ATK +45) |
| **Skeleton Mage** | 7 | `soul_essence_orb` | Soul Essence Orb | relic | 950 | ลูกแก้วแก่นวิญญาณสีฟ้า เรืองแสงพลังเวทมนตร์ (MATK +25) |
| | 8 | `necrotic_scroll` | Necrotic Scroll | material | 220 | ม้วนคำสาปโบราณอักษรสีม่วง ใช้คราฟต์ไอเทมสายมืด |
| | 9 | `bone_magic_wand` | Bone Magic Wand | weapon | 420 | ไม้เท้ากระดูกยอดลูกแก้วมนตราสีฟ้า (MATK +55) |
| **Skeleton Knight** | 10 | `corroded_plate` | Corroded Plate | material | 160 | แผ่นเกราะเหล็กสนิมเขรอะ แข็งแกร่งเป็นพิเศษ |
| | 11 | `greatsword_hilt` | Greatsword Hilt | material | 260 | ด้ามดาบยักษ์โบราณ ใช้สร้างดาบสองมือระดับสูง |
| | 12 | `horned_helm_crest` | Horned Helm Crest | armor | 520 | หมวกเหล็กอัศวินมีเขา ป้องกันการโจมตีระดับสูง (DEF +28) |

---

### 3. ประเภทแฟนตาซี (Fantasy Monsters) - `assets/items/items_fantasy.jpg`
| มอนสเตอร์ | ลำดับ | รหัสไอเทม (ID) | ชื่อไอเทม | ประเภท | ราคา | คำอธิบาย |
|---|:---:|---|---|:---:|:---:|---|
| **Goblin Scout** | 1 | `curved_shiv` | Curved Shiv | weapon | 110 | มีดสั้นปลายงอของก๊อบลิน แทงเร็ว (ATK +28, ASPD +3%) |
| | 2 | `stolen_coin_bag` | Stolen Coin Bag | consumable | 150 | ถุงหนังใส่เหรียญทองที่ก๊อบลินขโมยมา (เปิดสุ่มได้ 100-300 Gold) |
| | 3 | `goblin_ear` | Goblin Ear | material | 60 | ใบหูก๊อบลิน ใช้ส่งเควสต์ล่าค่าหัวสมาคม |
| **Fire Imp** | 4 | `crimson_imp_horn` | Crimson Imp Horn | material | 140 | เขาสีแดงเพลิงของอิมป์ กักเก็บความร้อน |
| | 5 | `flame_essence` | Flame Essence | material | 250 | ผลึกแก่นไฟเปลวเพลิง ใช้หลอมอาวุธธาตุไฟ |
| | 6 | `mini_pitchfork` | Mini Pitchfork | weapon | 390 | สามง่ามจิ๋วของปีศาจน้อย (ATK +50, เผาไหม้เป้าหมาย) |
| **Treant Sapling** | 7 | `living_branch` | Living Branch | material | 130 | กิ่งไม้มีชีวิต ผลิใบสดตลอดเวลา |
| | 8 | `amber_sap_droplet` | Amber Sap Droplet | material | 220 | หยดเรซินยางไม้อำพันสีทองเรืองแสง |
| | 9 | `ancient_acorn` | Ancient Acorn | relic | 1100 | เมล็ดโอ๊กโบราณสลักลวดลายมนตราธรรมชาติ (ฟื้นฟู HP ต่อวิ) |
| **Chest Mimic** | 10 | `sharp_mimic_tooth` | Sharp Mimic Tooth | material | 180 | ฟันคริสตัลม่วงแหลมคมของกล่องมิมิค |
| | 11 | `skeleton_key` | Skeleton Key | consumable | 500 | กุญแจผีโบราณรูปหัวกะโหลกทองคำ ใช้ไขหีบสมบัติลับ |
| | 12 | `mimic_tongue` | Mimic Tongue | material | 320 | ลิ้นมิมิคสีรุ้งเหนียวหนึบ ยืดหยุ่นเป็นพิเศษ |

---

### 4. ประเภทกลุ่มโจร (Bandit Enemies) - `assets/items/items_bandits.jpg`
| มอนสเตอร์ | ลำดับ | รหัสไอเทม (ID) | ชื่อไอเทม | ประเภท | ราคา | คำอธิบาย |
|---|:---:|---|---|:---:|:---:|---|
| **Bandit Rogue** | 1 | `rogue_face_mask` | Rogue Face Mask | armor | 240 | หน้ากากผ้าดำปิดหน้า (CRIT +3%, EVA +4%) |
| | 2 | `serrated_dagger` | Serrated Dagger | weapon | 290 | มีดสั้นฟันเลื่อย โจมตีทำให้เลือดไหล (Bleed) |
| | 3 | `lockpick_set` | Lockpick Set | tool | 160 | ชุดเหล็กสะเดาะกลอนกุญแจในซองหนัง |
| **Bandit Archer** | 4 | `poacher_bandana` | Poacher Bandana | armor | 220 | ผ้าโพกหัวสีน้ำตาลของนายพรานเถื่อน (HIT +8) |
| | 5 | `hunting_arrow_quiver` | Hunting Arrow Quiver | accessory | 340 | ซองใส่ลูกศรหนังสะพายหลัง (เพิ่ม Max Arrows & ASPD) |
| | 6 | `composite_shortbow` | Composite Shortbow | weapon | 420 | คันธนูสั้นไม้ประกับ ง้างเร็ว แม่นยำ (ATK +60) |
| **Bandit Brute** | 7 | `spiked_pauldron` | Spiked Pauldron | armor | 480 | เกราะไหล่เหล็กหนาม สะท้อนดาเมจ 5% (DEF +18) |
| | 8 | `heavy_iron_nails` | Heavy Iron Nails | material | 120 | ตะปูเหล็กยักษ์สนิมเขรอะ ใช้คราฟต์กระบองหนาม |
| | 9 | `spiked_wood_club` | Spiked Wood Club | weapon | 510 | กระบองท่อนซุงตอกหมุดเหล็ก พลังทุบสูง (ATK +75, Stun) |
| **Bandit Leader** | 10 | `feathered_tricorne` | Feathered Tricorne | armor | 850 | หมวกโจรสลัดขนนกสีทอง เพิ่มบารมีและโชค (LUK +8) |
| | 11 | `ornate_cutlass` | Ornate Cutlass | weapon | 950 | ดาบโค้งขลิบทองคำของกัปตันโจร คมกริบและสง่างาม (ATK +110) |
| | 12 | `secret_treasure_map` | Secret Treasure Map | quest | 1500 | แผนที่ขุมทรัพย์ลับทำเครื่องหมายกากบาทสีแดง ปลดล็อกดันเจี้ยนลับ |

---

### 5. ประเภทอื่นๆ (Other Monsters) - `assets/items/items_others.jpg`
| มอนสเตอร์ | ลำดับ | รหัสไอเทม (ID) | ชื่อไอเทม | ประเภท | ราคา | คำอธิบาย |
|---|:---:|---|---|:---:|:---:|---|
| **Floating Eye** | 1 | `ominous_eyeball` | Ominous Eyeball | material | 220 | ลูกตาปีศาจเรืองแสงสีม่วง มองเห็นศัตรูล่องหน |
| | 2 | `bat_wing_membrane` | Bat Wing Membrane | material | 190 | พังผืดปีกค้างคาวสีม่วง เหนียวและเบา |
| | 3 | `void_gazer_lens` | Void Gazer Lens | relic | 1400 | แว่นเลนส์คริสตัลมองทะลุจุดอ่อน (ทะลุพลังป้องกันศัตรู 8%) |
| **Spectral Armor** | 4 | `ethereal_soul_flame` | Ethereal Soul Flame | material | 350 | ดวงไฟวิญญาณสีฟ้าบริสุทธิ์ ใช้หลอมเกราะเวท |
| | 5 | `haunted_visor` | Haunted Visor | armor | 680 | หน้ากากเหล็กโบราณมีรอยร้าวเรืองแสงวิญญาณ (DEF +30) |
| | 6 | `spectral_steel_ingot` | Spectral Steel Ingot | material | 500 | แท่งเหล็กกล้าสถิตไฟวิญญาณ สำหรับคราฟต์อาวุธระดับสูง |
| **Mushroom Sporeling** | 7 | `spore_mushroom_cap` | Spore Mushroom Cap | material | 140 | หมวกเห็ดแดงลายจุด รสชาติหวานมัน |
| | 8 | `luminescent_powder` | Luminescent Powder | material | 210 | ถุงผงละอองสปอร์สีทองส่องประกายในความมืด |
| | 9 | `spore_elixir` | Spore Elixir | consumable | 320 | น้ำยาขวดกลมสีชมพู ฟื้นฟู 250 HP และ 100 MP |
| **Baby Fire Wyrm** | 10 | `crimson_dragon_scale` | Crimson Dragon Scale | material | 800 | เกล็ดมังกรแดงทนความร้อนสูง ไม่หลอมละลาย |
| | 11 | `smoking_wyrm_horn` | Smoking Wyrm Horn | material | 950 | เขามังกรไฟมีควันกรุ่น ปลายเขามีประกายไฟ |
| | 12 | `tiny_dragon_heart` | Tiny Dragon Heart | relic | 3500 | หัวใจมังกรน้อยรูปผลึกเพลิง (ATK +40, ออร่าเผาไหม้รอบตัว) |

---

## 2. อาวุธดาบไล่ระดับ Level 1 - 100 (20 เลเวล)

อาวุธถูกจัดเรียงเป็น 2 ชุดภาพ (Tier 1 และ Tier 2) ชุดละ 10 เล่ม ห่างกันระดับละ 5 เลเวล

### Tier 1: Novice to Veteran (Level 1 - 50)
📁 ภาพสไปรต์: `assets/weapons/weapons_tier1.jpg`

| เลเวล | รหัสไอเทม (ID) | ชื่อดาบ | ค่าพลังแนะนำ | ราคา | คำอธิบาย & เอฟเฟกต์พิเศษ |
|:---:|---|---|:---:|:---:|---|
| **Lv. 1** | `wooden_sword` | Wooden Practice Sword | ATK +8 | 15 | ดาบไม้ฝึกหัดเริ่มต้น พันผ้าด้ามจับ เหมาะสำหรับมือใหม่ |
| **Lv. 5** | `iron_broadsword` | Iron Broadsword | ATK +22, DEF +3 | 60 | ดาบเหล็กกล้ามาตรฐาน ใบมีดขัดเงา กระบังทองเหลือง น้ำหนักสมดุล |
| **Lv. 10** | `steel_blade` | Steel Hunter Blade | ATK +42, CRIT +3% | 180 | ดาบเหล็กกล้าสองคม กระบังปีกนกนักล่า คมกริบและแม่นยำ |
| **Lv. 15** | `wolf_fang_saber` | Wolf Fang Saber | ATK +68, ASPD +5% | 450 | ดาบโค้งสลักรูปหมาป่า ประดับเขี้ยวสัตว์สีงาช้าง ว่องไวและฉีกเฉือนเนื้อ |
| **Lv. 20** | `bandit_cutlass` | Bandit Cutlass | ATK +98, BLEED +5% | 900 | ดาบโค้งโจรสลัด กระบังทองเหลืองทรงตะกร้อ ใบมีดบากฟันเลื่อย |
| **Lv. 25** | `knight_longsword` | Silver Knight Longsword | ATK +135, DEF +10 | 1,600 | ดาบอัศวินเงินแท้ ประดับไพลินสีน้ำเงิน เพิ่มพลังป้องกันและความมั่นคง |
| **Lv. 30** | `bone_cleaver` | Goblin Bone Cleaver | ATK +180, STUN +4% | 2,800 | ดาบปังตอยักษ์หลอมจากกระดูกสัตว์ร้ายหัวตัด ฟันกระแทกศัตรูล้มคว่ำ |
| **Lv. 35** | `shadow_dagger` | Shadow Dagger | ATK +230, EVA +6% | 4,500 | มีดสั้นอัสซาสซินโลหะม่วงดำ แผ่ไอหมอกเงาทมิฬ โจมตีจุดตายรุนแรง |
| **Lv. 40** | `crimson_falchion` | Crimson Falchion | ATK +290, FIRE +15 | 7,000 | ดาบเพลิงชาดปลายบาน เปลวไฟลุกโชนตลอดเวลา เผาผลาญศัตรูต่อเนื่อง |
| **Lv. 50** | `rune_claymore` | Rune Claymore | ATK +380, DEF +25 | 12,000 | ดาบยักษ์สองมือสลักอักขระรูนโบราณสีฟ้าคราม ปลดปล่อยคลื่นพลังเวทมนตร์ปฐพี |

---

### Tier 2: Master to Divine God (Level 55 - 100)
📁 ภาพสไปรต์: `assets/weapons/weapons_tier2.jpg`

| เลเวล | รหัสไอเทม (ID) | ชื่อดาบ | ค่าพลังแนะนำ | ราคา | คำอธิบาย & เอฟเฟกต์พิเศษ |
|:---:|---|---|:---:|:---:|---|
| **Lv. 55** | `glacial_frostbrand` | Glacial Frostbrand | ATK +460, SLOW +20% | 18,000 | ดาบคริสตัลน้ำแข็งนิรันดร์ แผ่ไอเย็นเยือกแข็ง ลดความเร็วการเคลื่อนที่ศัตรู |
| **Lv. 60** | `storm_thunder_edge` | Storm Thunder Edge | ATK +550, CHAIN +10% | 26,000 | ดาบซิกแซกสีทอง-น้ำเงิน ประกายสายฟ้าแลบ ช็อตศัตรูรอบข้างต่อเนื่อง |
| **Lv. 65** | `titan_earthbreaker` | Titan Earthbreaker | ATK +660, DEF +50 | 38,000 | ดาบศิลาไททันโบราณหุ้มทองคำ พลังทำลายหนักหน่วง ทลายเกราะป้องกันของเป้าหมาย |
| **Lv. 70** | `chaos_blade` | Abyssal Chaos Blade | ATK +780, LIFESTEAL +6% | 55,000 | ดาบปีศาจสีแดงเลือด มีดวงตาสีทองมีชีวิตสถิตที่ด้ามดาบ ดูดกลืนพลังชีวิตเหยื่อ |
| **Lv. 75** | `holy_excalibur` | Holy Excalibur | ATK +920, ALL STAT +10 | 80,000 | ดาบศักดิ์สิทธิ์สีขาวทอง เปล่งออร่าแสงทิพย์ ปราบเหล่าปีศาจและความมืด |
| **Lv. 80** | `dragon_scale_blade` | Dragon Scale Blade | ATK +1100, BURN +35 | 120,000 | ตีขึ้นจากเกล็ดและกระดูกมังกรบรรพกาล ปลดปล่อยเพลิงมังกรผลาญทำลายทั้งกองทัพ |
| **Lv. 85** | `astral_cosmic_saber` | Astral Cosmic Saber | ATK +1320, IGNORE DEF +15% | 180,000 | ใบดาบโปร่งแสงสีม่วงกาแล็กซี ประดับดวงดารา ฟันทะลวงมิติโดยไม่สนพลังป้องกัน |
| **Lv. 90** | `phoenix_edge` | Nether Phoenix Edge | ATK +1580, REVIVE BUFF | 280,000 | ดาบสลักรูปปีกวิหคเพลิงฟีนิกซ์ เปลวเพลิงอมตะชุบชีวิตผู้ถือครองเมื่อตกอยู่ในอันตราย |
| **Lv. 95** | `chrono_timeblade` | Chrono Timeblade | ATK +1880, CDR -20% | 420,000 | ดาบจักรกลสวรรค์สีทองคำขาวผสมฟันเฟืองกาลเวลา ลดคูลดาวน์สกิลทุกชนิดลงอย่างมาก |
| **Lv. 100** | `genesis_godslayer` | Genesis Godslayer | ATK +2500, ALL STAT +50 | 1,000,000 | ดาบแห่งพระเจ้าปฐมกาล ใบดาบปริซึมเปล่งออร่าสีรุ้ง พลังสูงสุดของจักรวาล |

---

## 3. การนำไปใช้งานในโค้ด (Code Integration)

### 3.1 การเพิ่มใน `src/sprites.js`

สามารถเพิ่มชีตอาวุธและไอเทมชุดเริ่มต้นลงใน `SHEETS` ของ [src/sprites.js](file:///d:/jimmy/game/eco/Game/game-web/new-game-web-test-01/src/sprites.js):

```javascript
export const SHEETS = {
  starter:  { monsters: 'assets/monsters/monsters_sheet.jpg',   items: 'assets/items/items_monsters_sheet.jpg' },
  beasts:   { monsters: 'assets/monsters/monsters_beasts.jpg',   items: 'assets/items/items_beasts.jpg' },
  bandits:  { monsters: 'assets/monsters/monsters_bandits.jpg',  items: 'assets/items/items_bandits.jpg' },
  fantasy:  { monsters: 'assets/monsters/monsters_fantasy.jpg',  items: 'assets/items/items_fantasy.jpg' },
  others:   { monsters: 'assets/monsters/monsters_others.jpg',   items: 'assets/items/items_others.jpg' },
  skeleton: { monsters: 'assets/monsters/monsters_skeleton.jpg', items: 'assets/items/items_skeleton.jpg' },
  
  // ชุดชีตอาวุธดาบ
  weapons_t1: { items: 'assets/weapons/weapons_tier1.jpg' },
  weapons_t2: { items: 'assets/weapons/weapons_tier2.jpg' }
};

// รายชื่อไอเทมของ starter sheet (12 ช่อง)
export const STARTER_ITEM_SHEET_IDS = [
  'sticky_mucus', 'bouncy_core', 'relic_slime_core',
  'poison_stinger', 'gossamer_wing', 'royal_honeycomb',
  'rabbit_fluff', 'small_horn', 'relic_golden_carrot',
  'stone_plate', 'golem_core_gem', 'relic_golem_core'
];

// รายชื่ออาวุธ Tier 1 & 2 (ชุดละ 10 ช่อง)
export const WEAPON_TIER1_IDS = [
  'wooden_sword', 'iron_broadsword', 'steel_blade', 'wolf_fang_saber', 'bandit_cutlass',
  'knight_longsword', 'bone_cleaver', 'shadow_dagger', 'crimson_falchion', 'rune_claymore'
];

export const WEAPON_TIER2_IDS = [
  'glacial_frostbrand', 'storm_thunder_edge', 'titan_earthbreaker', 'chaos_blade', 'holy_excalibur',
  'dragon_scale_blade', 'astral_cosmic_saber', 'phoenix_edge', 'chrono_timeblade', 'genesis_godslayer'
];
```

### 3.2 ฟังก์ชันคำนวณตำแหน่งตัดภาพอาวุธ (10 Weapons Grid)


---

## 4. อาวุธเพิ่มเติม (คฑา, ธนู, หอก, ปืน, หนังสือ)

เตรียมโครงสร้างโฟลเดอร์ไว้ที่ `assets/weapons/<type>/weapons_tier1.jpg` และ `weapons_tier2.jpg`

```
assets/weapons/
├── sword/   (weapons_tier1.jpg, weapons_tier2.jpg)
├── staff/   (คฑา/ไม้เท้าเวทมนตร์)
├── bow/     (ธนู/หน้าไม้)
├── spear/   (หอก/ง้าว/ทวน)
├── gun/     (ปืนสั้น/ปืนยาว/ปืนใหญ่เวทมนตร์)
└── book/    (คัมภีร์เวท/ตำราเวทมนตร์)
```

---

### 4.1 คฑา / ไม้เท้าเวทมนตร์ (Staff & Wand)
📁 ที่ตั้งไฟล์: `assets/weapons/staff/weapons_tier1.jpg` (Lv 1-50) & `weapons_tier2.jpg` (Lv 55-100)

| ระดับ | เลเวล | รหัสไอเทม (ID) | ชื่ออาวุธ | สเตตัสแนะนำ | คำอธิบาย |
|---|:---:|---|---|:---:|---|
| **T1** | Lv. 1 | `wooden_wand` | Wooden Wand | MATK +10 | กิ่งไม้อ่อนเหลาเป็นไม้กายสิทธิ์ฝึกหัด |
| | Lv. 5 | `oak_apprentice_rod` | Oak Apprentice Rod | MATK +26 | ไม้เท้าไม้โอ๊กหัวกลม กักเก็บกระแสมานาเริ่มต้น |
| | Lv. 10 | `crystal_gem_wand` | Crystal Gem Wand | MATK +48, MP +30 | ไม้เท้าประดับผลึกแก้วใส เสริมสมาธิและเร่งฟื้นฟู MP |
| | Lv. 15 | `nature_sprout_staff` | Nature Sprout Staff | MATK +75, HEAL +5% | คฑาพฤกษารากไม้มีชีวิต เร่งพลังเวทฟื้นฟูธรรมชาติ |
| | Lv. 20 | `dark_bone_wand` | Dark Bone Wand | MATK +105, CURSE +3% | กิ่งกระดูกสถิตวิญญาณ คำสาปกัดกร่อนพลังชีวิตศัตรู |
| | Lv. 25 | `silver_cleric_scepter` | Silver Cleric Scepter | MATK +145, INT +4 | คฑาเงินบริสุทธิ์ของนักบวช แผ่ออร่าแสงศักดิ์สิทธิ์ |
| | Lv. 30 | `ruby_fire_staff` | Ruby Fire Staff | MATK +195, FIRE +20 | ไม้เท้าหัวทับทิมเพลิง ยิงลูกไฟเผาผลาญศัตรู |
| | Lv. 35 | `shadow_sorcery_staff` | Shadow Sorcery Staff | MATK +250, DRAIN +4% | คฑาหมอกทมิฬ ดูดซับพลังเวทจากศัตรู |
| | Lv. 40 | `thunder_archmage_staff`| Thunder Archmage Staff | MATK +315, SHOCK +10%| ไม้เท้ายอดสายฟ้าแลบ ปลดปล่อยคลื่นฟ้าผ่ารุนแรง |
| | Lv. 50 | `ancient_elder_staff` | Ancient Elder Staff | MATK +410, INT +12 | คฑาไม้โบราณพันปี สลักอักขระเวทมนตร์มหาศาล |
| **T2** | Lv. 55 | `glacial_frost_staff` | Glacial Frost Staff | MATK +495, FREEZE +15%| คฑาคริสตัลน้ำแข็ง แช่แข็งศัตรูรอบตัว |
| | Lv. 60 | `tempest_storm_rod` | Tempest Storm Rod | MATK +590, ASPD +8% | คฑาวายุหมุนเร่งความเร็วในการร่ายเวท |
| | Lv. 65 | `terra_gaia_scepter` | Terra Gaia Scepter | MATK +705, DEF +40 | คฑาศิลาพสุธา เสริมเกราะหินป้องกันให้ผู้ถือ |
| | Lv. 70 | `nether_abyss_staff` | Nether Abyss Staff | MATK +835, LIFESTEAL +5%| คฑาอเวจีปีศาจ ดึงดูดวิญญาณมาฟื้นฟูพลัง |
| | Lv. 75 | `archangel_holy_scepter`| Archangel Holy Scepter | MATK +980, RESIST +20% | คฑาปีกเทวทูตสีขาวทอง ชำระล้างสถานะผิดปกติ |
| | Lv. 80 | `dragon_heart_dragonstaff`| Dragon Heart Staff | MATK +1170, BURN +40 | ยอดคฑาคือหัวใจมังกรเพลิง ลมหายใจมังกรแผดเผา |
| | Lv. 85 | `astral_starfall_rod` | Astral Starfall Rod | MATK +1400, M-PEN +15%| คฑาละอองดาวกาแล็กซี ทะลวงม่านพลังเวทมนตร์ |
| | Lv. 90 | `phoenix_rebirth_scepter`| Phoenix Rebirth Scepter| MATK +1670, AUTO-REVIVE| เปลวเพลิงอมตะชุบชีวิตผู้ถือครองเมื่อพลังหมด |
| | Lv. 95 | `chronos_time_staff` | Chronos Time Staff | MATK +1990, CDR -25% | คฑาฟันเฟืองเวลา หยุดเวลาและเร่งคูลดาวน์สกิล |
| | Lv. 100| `genesis_divine_staff` | Genesis Divine Staff | MATK +2650, ALL +60 | คฑาผู้สร้างปฐมกาล ควบคุมกฎเกณฑ์เวทมนตร์ทั้งปวง |

---

### 4.2 ธนู (Bow & Crossbow)
📁 ที่ตั้งไฟล์: `assets/weapons/bow/weapons_tier1.jpg` (Lv 1-50) & `weapons_tier2.jpg` (Lv 55-100)

| ระดับ | เลเวล | รหัสไอเทม (ID) | ชื่ออาวุธ | สเตตัสแนะนำ | คำอธิบาย |
|---|:---:|---|---|:---:|---|
| **T1** | Lv. 1 | `wooden_shortbow` | Wooden Shortbow | ATK +9 | ธนูไม้สั้นยิงเร็ว เหมาะสำหรับการล่าเบื้องต้น |
| | Lv. 5 | `hunting_recurve_bow` | Hunting Recurve Bow | ATK +24, HIT +5 | ธนูโค้งนักพราน ยิงแม่นยำระยะกลาง |
| | Lv. 10 | `iron_longbow` | Iron Longbow | ATK +45, CRIT +3% | คันธนูเสริมขอบเหล็ก ยิงได้ไกลและพลังทะลวงสูง |
| | Lv. 15 | `elven_yew_bow` | Elven Yew Bow | ATK +72, DEX +3 | ธนูไม้เอลฟ์โบราณ น้ำหนักเบา ยิงต่อเนื่องไม่เมื่อยล้า |
| | Lv. 20 | `bandit_crossbow` | Bandit Crossbow | ATK +102, BLEED +5% | หน้าไม้ดัดแปลงของกองโจร ลูกดอกเจาะเกราะทำให้เลือดไหล |
| | Lv. 25 | `silver_ranger_bow` | Silver Ranger Bow | ATK +140, EVA +5% | ธนูเงินประกายของพรานหลวง เคลื่อนที่คล่องตัวขณะเล็ง |
| | Lv. 30 | `bone_piercer_bow` | Bone Piercer Bow | ATK +188, PIERCE +8% | คันธนูแกะจากโครงกระดูกสัตว์ร้าย หัวลูกศรเจาะทะลุศัตรู |
| | Lv. 35 | `nightshade_assassin_bow`| Nightshade Bow | ATK +240, POISON +10% | ธนูลอบสังหารเคลือบพิษพืชราตรี ไร้เสียงขณะลั่นไก |
| | Lv. 40 | `crimson_flame_bow` | Crimson Flame Bow | ATK +305, FIRE +20 | ธนูเพลิงสีชาด จุดไฟเผาศัตรูตั้งแต่ระยะไกล |
| | Lv. 50 | `gale_windforce_bow` | Gale Windforce Greatbow | ATK +395, RANGE +50 | ธนูยักษ์สายลม พายุหมุนหอบลูกศรพุ่งทะลวงระยะไกลพิเศษ |
| **T2** | Lv. 55 | `glacial_ice_bow` | Glacial Ice Bow | ATK +480, SLOW +25% | ลูกศรเคลือบผลึกน้ำแข็ง ทำให้ศัตรูก้าวขาไม่ออก |
| | Lv. 60 | `thunder_strike_bow` | Thunder Strike Bow | ATK +575, CHAIN +12%| ธนูสายฟ้า ยิงหนึ่งนัดสะท้อนช็อตศัตรูเป็นกลุ่ม |
| | Lv. 65 | `titan_heavy_crossbow` | Titan Heavy Crossbow | ATK +690, STUN +10% | หน้าไม้ยักษ์ไททัน แรงสะท้อนสูงจนศัตรูกระเด็นหงาย |
| | Lv. 70 | `abyssal_shadowstring` | Abyssal Shadowstring | ATK +815, LIFESTEAL +5%| สายธนูเงาดำ ดูดเลือดเป้าหมายกลับคืนผู้ยิง |
| | Lv. 75 | `seraphim_holy_bow` | Seraphim Holy Bow | ATK +960, UNDEAD +30%| ธนูเทวทูตแสงสวรรค์ เผาผลาญพวกผีดิบและวิญญาณร้าย |
| | Lv. 80 | `dragon_breath_longbow` | Dragon Breath Longbow | ATK +1145, EXPLODE +15%| ลูกศรกลายสภาพเป็นมังกรเพลิงระเบิดเมื่อกระทบเป้า |
| | Lv. 85 | `astral_starlight_bow` | Astral Starlight Bow | ATK +1370, IGNORE +15%| ยิงลูกศรละอองดาว ไม่สนใจม่านเกราะและสิ่งกีดขวาง |
| | Lv. 90 | `phoenix_firefeather_bow`| Phoenix Feather Bow | ATK +1640, BURN +50 | ขนนกฟีนิกซ์ทองคำ ยิงพายุเพลิงล้างผลาญ |
| | Lv. 95 | `chrono_gear_crossbow` | Chrono Gear Crossbow | ATK +1950, ASPD +30% | หน้าไม้ฟันเฟืองเวลา รัวลูกดอกอย่างต่อเนื่องเสมือนหยุดเวลา |
| | Lv. 100| `genesis_celestial_bow` | Genesis Celestial Bow | ATK +2600, CRIT-DMG +50%| ธนูแห่งพระเจ้าปฐมกาล ยิงทะลุมิติติดคริติคอลสูงสุด |

---

### 4.3 หอก / ทวน / ง้าว (Spear, Lance & Halberd)
📁 ที่ตั้งไฟล์: `assets/weapons/spear/weapons_tier1.jpg` (Lv 1-50) & `weapons_tier2.jpg` (Lv 55-100)

| ระดับ | เลเวล | รหัสไอเทม (ID) | ชื่ออาวุธ | สเตตัสแนะนำ | คำอธิบาย |
|---|:---:|---|---|:---:|---|
| **T1** | Lv. 1 | `wooden_pike` | Wooden Pike | ATK +9, RANGE +20 | หอกไม้ปลายแหลมระยะแทงยาวกว่าดาบทั่วไป |
| | Lv. 5 | `iron_hunting_spear` | Iron Hunting Spear | ATK +25, STR +2 | หอกเหล็กล่าสัตว์ ถ่วงน้ำหนักสมดุล |
| | Lv. 10 | `steel_halberd` | Steel Halberd | ATK +46, DEF +4 | ง้าวเหล็กกล้า ฟันและแทงได้ในอาวุธเดียว |
| | Lv. 15 | `wild_boar_lance` | Wild Boar Lance | ATK +73, CHARGE +10% | หอกเขี้ยวหมูป่า เพิ่มพลังแทงขณะวิ่งชาร์จ |
| | Lv. 20 | `bandit_partisan` | Bandit Partisan | ATK +104, BLEED +5% | หอกใบกว้างของหัวหน้าโจร ใบหอกบากฟันฉีกเนื้อ |
| | Lv. 25 | `silver_knight_lance` | Silver Knight Lance | ATK +142, DEF +12 | ทวนอัศวินเกราะเงิน สำหรับการรบประจัญบาน |
| | Lv. 30 | `bone_glaive` | Bone Glaive | ATK +190, STUN +5% | ง้าวกระดูกหนาทึบ ฟันหักเกราะศัตรู |
| | Lv. 35 | `shadow_piercer_spear` | Shadow Piercing Spear | ATK +245, CRIT +6% | หอกปลายเรียวแหลมสีดำ แทงเข้าจุดตายอย่างแม่นยำ |
| | Lv. 40 | `crimson_dragonpike` | Crimson Dragonpike | ATK +310, FIRE +20 | หอกเพลิงมังกรแดง เปลวไฟหมุนวนรอบด้ามหอก |
| | Lv. 50 | `valkyrie_war_spear` | Valkyrie War Spear | ATK +405, ALL +8 | หอกนักรบสวรรค์วาลคิรี เปล่งประกายเกียรติยศแห่งสงคราม |
| **T2** | Lv. 55 | `frostfang_glacier_spear`| Frost Glacier Spear | ATK +490, SLOW +20% | หอกน้ำแข็งขั้วโลก ปลายหอกเยือกแข็งเกาะติดเป้าหมาย |
| | Lv. 60 | `thunderstorm_trident` | Thunderstorm Trident | ATK +585, SHOCK +15% | สามง่ามอัสนีบาต แทงเรียกสายฟ้าฟาดจากฟากฟ้า |
| | Lv. 65 | `titan_stone_halberd` | Titan Stone Halberd | ATK +700, DEF +55 | ง้าวศิลาไททัน ป้องกันแน่นหนาดั่งปราการหิน |
| | Lv. 70 | `chaos_demon_lance` | Chaos Demon Lance | ATK +825, LIFESTEAL +6%| ทวนปีศาจสีโลหิต คมทวนกระหายเลือดสูบพลังศัตรู |
| | Lv. 75 | `holy_aegis_spear` | Holy Aegis Spear | ATK +970, BLOCK +15%| หอกศักดิ์สิทธิ์พร้อมพู่ทอง ปัดป้องการโจมตีศัตรู |
| | Lv. 80 | `dragon_horn_warpike` | Dragon Horn Warpike | ATK +1160, BURN +35 | ตีขึ้นจากเขามังกรดำโบราณ ทะลวงเกราะเหล็กได้ทุกชนิด |
| | Lv. 85 | `astral_void_glaive` | Astral Void Glaive | ATK +1390, M-PEN +15%| ง้าวแห่งความว่างเปล่า กวัดแกว่งตัดผ่านมิติความจริง |
| | Lv. 90 | `phoenix_radiant_spear` | Phoenix Radiant Spear| ATK +1660, HEAL-HIT +3%| หอกปีกเพลิงฟีนิกซ์ ทุกการแทงรักษาพลังชีวิตผู้ถือ |
| | Lv. 95 | `chronos_pendulum_lance`| Chronos Pendulum Lance| ATK +1970, CDR -20% | ทวนลูกตุ้มกาลเวลา แกว่งทลายห้วงเวลาศัตรู |
| | Lv. 100| `genesis_divine_spear` | Genesis Divine Spear | ATK +2620, PIERCE +100%| หอกเทพปฐมกาล แทงทะลวงทุกสรรพสิ่งโดยไร้แรงต้าน |

---

### 4.4 ปืน (Gun, Pistol, Blaster & Musket)
📁 ที่ตั้งไฟล์: `assets/weapons/gun/weapons_tier1.jpg` (Lv 1-50) & `weapons_tier2.jpg` (Lv 55-100)

| ระดับ | เลเวล | รหัสไอเทม (ID) | ชื่ออาวุธ | สเตตัสแนะนำ | คำอธิบาย |
|---|:---:|---|---|:---:|---|
| **T1** | Lv. 1 | `flintlock_pistol` | Flintlock Pistol | ATK +10, RANGE +180 | ปืนคาบศิลาโบราณ เสียงลั่นไกดังสนั่น ยิงแม่นยำระยะสั้น |
| | Lv. 5 | `hunting_musket` | Hunting Musket | ATK +27, HIT +6 | ปืนคาบศิลายาวสำหรับล่าสัตว์ ระยะยิงไกลและพลังกระแทกสูง |
| | Lv. 10 | `iron_revolver` | Iron Revolver | ATK +49, ASPD +5% | ปืนลูกโม่เหล็กกล้า 6 นัด ยิงต่อเนื่องรวดเร็ว |
| | Lv. 15 | `pirate_dual_pistols` | Pirate Dual Pistols | ATK +76, CRIT +4% | ปืนพกคู่โจรสลัด กระสุนกระจายตัวระยะใกล้ |
| | Lv. 20 | `trench_blunderbuss` | Trench Blunderbuss | ATK +108, KNOCKBACK| ปืนลูกซองปากแตร พลังทำลายล้างกลุ่มศัตรูระยะเผาขน |
| | Lv. 25 | `silver_knight_rifle` | Silver Knight Rifle | ATK +148, DEF +6 | ปืนยาวลูกเลื่อนเงินประณีตของทหารม้าหลวง |
| | Lv. 30 | `bone_carbine` | Bone Carbine | ATK +198, BLEED +6% | ปืนคาร์ไบน์โครงกระดูก ยิงเศษกระดูกแหลมคมฉีกเนื้อ |
| | Lv. 35 | `shadow_silencer_gun` | Shadow Silencer Gun | ATK +255, CRIT +8% | ปืนติดปลอกเก็บเสียงสีดำเงียบกริบ สังหารเป้าหมายไร้ร่องรอย |
| | Lv. 40 | `crimson_fire_blaster` | Crimson Fire Blaster| ATK +320, FIRE +25 | ปืนพลังงานความร้อน ยิงลำแสงเพลิงเผาไหม้ |
| | Lv. 50 | `rune_steam_cannon` | Rune Steam Cannon | ATK +420, EXPLODE +12%| ปืนใหญ่ไอน้ำอักขระรูน ยิงกระสุนอัดระเบิดพลังงานสูง |
| **T2** | Lv. 55 | `cryo_frost_cannon` | Cryo Frost Cannon | ATK +505, SLOW +25% | ปืนไครโอเจนิก ยิงลำแสงแช่แข็งเป้าหมายให้หยุดชะงัก |
| | Lv. 60 | `voltaic_storm_blaster` | Voltaic Storm Blaster| ATK +605, CHAIN +15%| ปืนเทสลาไฟฟ้า ยิงสายฟ้าช็อตศัตรูต่อเนื่องทั้งฝูง |
| | Lv. 65 | `titan_siege_railgun` | Titan Siege Railgun | ATK +720, PIERCE +20%| ปืนเรลกันแรงแม่เหล็กสูง ยิงกระสุนทะลุกำแพงและมอนสเตอร์ |
| | Lv. 70 | `abyssal_demon_revolver`| Abyssal Demon Revolver| ATK +850, LIFESTEAL +6%| ปืนลูกโม่กะโหลกปีศาจ กระสุนวิญญาณสูบเลือดคืนกลับ |
| | Lv. 75 | `judgment_holy_handgun` | Judgment Holy Handgun| ATK +1000, LIGHT +35| ปืนพกสีขาวทองสลักอักขระศักดิ์สิทธิ์ กระสุนแสงปราบมาร |
| | Lv. 80 | `dragonfire_hand_cannon`| Dragonfire Cannon | ATK +1195, BURN +45 | ปืนปากกระบอกหัวมังกร พ่นเปลวเพลิงนรกผลาญศัตรู |
| | Lv. 85 | `astral_photon_laser` | Astral Photon Laser | ATK +1430, IGNORE +20%| ปืนลำแสงโฟตอนดวงดาว ยิงทะลุเกราะป้องกันทันที |
| | Lv. 90 | `phoenix_flame_blaster` | Phoenix Flame Blaster| ATK +1700, REVIVE BUFF| ปืนเพลิงฟีนิกซ์ ปล่อยออร่าฟื้นฟูเพื่อนร่วมทีมและเผาศัตรู |
| | Lv. 95 | `chrono_clockwork_gun` | Chrono Clockwork Gun| ATK +2020, ASPD +35%| ปืนกลฟันเฟืองเวลา ยิงกระสุนต่อเนื่องดั่งเข็มนาฬิกาหมุน |
| | Lv. 100| `genesis_celestial_cannon`| Genesis Divine Cannon| ATK +2680, ALL +60 | ปืนใหญ่จักรวาลปฐมกาล ปลดปล่อยลำแสงบิ๊กแบงกวาดล้าง |

---

### 4.5 หนังสือ / ตำราเวทมนตร์ (Book, Grimoire & Tome)
📁 ที่ตั้งไฟล์: `assets/weapons/book/weapons_tier1.jpg` (Lv 1-50) & `weapons_tier2.jpg` (Lv 55-100)

| ระดับ | เลเวล | รหัสไอเทม (ID) | ชื่ออาวุธ | สเตตัสแนะนำ | คำอธิบาย |
|---|:---:|---|---|:---:|---|
| **T1** | Lv. 1 | `apprentice_book` | Apprentice Notebook | MATK +10, MP +20 | สมุดบันทึกคาถาเบื้องต้นของนักเรียนเวทมนตร์ |
| | Lv. 5 | `leather_grimoire` | Leather Grimoire | MATK +27, INT +2 | คัมภีร์ปกหนังแท้ บันทึกสูตรปรุงยาและเวทพื้นฐาน |
| | Lv. 10 | `magic_theory_tome` | Magic Theory Tome | MATK +50, CDR -3% | ตำราทฤษฎีเวทมนตร์ เข้าใจโครงสร้างคาถาได้เร็วขึ้น |
| | Lv. 15 | `herbalist_codex` | Herbalist Codex | MATK +77, HEAL +8% | ตำราสมุนไพรและพฤกษาศาสตร์ เสริมพลังเวทรัักษา |
| | Lv. 20 | `dark_pact_scripture` | Dark Pact Scripture | MATK +108, CURSE +4% | คัมภีร์สัญญาปีศาจ อักษรสีเลือดแผ่ไอคำสาปมืด |
| | Lv. 25 | `holy_scripture_book` | Holy Scripture Book | MATK +148, SHIELD +10%| พระคัมภีร์ศักดิ์สิทธิ์ปกขาว กางบาเรียแสงคุ้มครองผู้ถือ |
| | Lv. 30 | `forbidden_necronomicon` | Forbidden Necronomicon| MATK +198, SUMMON +1 | ตำรามนตร์ดำต้องห้าม ปลุกวิญญาณคนตายมาช่วยสู้ |
| | Lv. 35 | `shadow_whisper_tome` | Shadow Whisper Tome | MATK +255, DRAIN +5% | คัมภีร์เสียงกระซิบเงา ดูดกลืนพลังเวทศัตรูเข้าตัว |
| | Lv. 40 | `crimson_element_grimoire`| Crimson Grimoire | MATK +320, FIRE +25 | ตำราเวทธาตุเพลิง บทสวดระเบิดภูเขาไฟ |
| | Lv. 50 | `ancient_rune_archive` | Ancient Rune Archive | MATK +415, INT +15 | หอสมุดศิลาจารึกรูนโบราณ รวมมหาเวทโบราณที่สาบสูญ |
| **T2** | Lv. 55 | `blizzard_glacial_tome` | Blizzard Glacial Tome| MATK +500, FREEZE +15%| คัมภีร์พายุน้ำแข็ง แผ่ไอเย็นเยือกแข็งรอบตัวหนังสือ |
| | Lv. 60 | `thunder_wrath_scripture`| Thunder Scripture | MATK +600, SHOCK +15% | พระคัมภีร์สายฟ้าพิโรธ เรียกสายฟ้าฟาดใส่ศัตรูต่อเนื่อง |
| | Lv. 65 | `titan_earth_grimoire` | Titan Earth Grimoire | MATK +715, DEF +50 | ตำราปฐพีไททัน เสริมความทนทานดั่งขุนเขา |
| | Lv. 70 | `chaos_demonic_codex` | Chaos Demonic Codex | MATK +845, LIFESTEAL +6%| คัมภีร์มารอเวจี ตาปีศาจบนหน้าปกกะพริบตาจ้องเหยื่อ |
| | Lv. 75 | `book_of_heavenly_light` | Book of Heavenly Light| MATK +990, ALL-HEAL +25%| คัมภีร์แสงทิพย์สวรรค์ ฟื้นฟูเพื่อนร่วมปาร์ตี้อย่างมหาศาล |
| | Lv. 80 | `dragon_secret_tome` | Dragon Secret Tome | MATK +1180, DRAGON-ROAR| บันทึกภาษาและเวทมนตร์มังกรบรรพกาล ปลดปล่อยเพลิงผลาญ |
| | Lv. 85 | `astral_cosmos_scripture`| Astral Cosmos Scripture| MATK +1415, M-PEN +20% | ตำราดาราศาสตร์จักรวาล อัญเชิญฝนดาวตกถล่มสนามรบ |
| | Lv. 90 | `book_of_immortal_phoenix`| Book of Phoenix | MATK +1685, REVIVE BUFF| คัมภีร์นกฟีนิกซ์อมตะ คืนชีพทันทีเมื่อผู้ร่ายถูกสังหาร |
| | Lv. 95 | `chronos_time_archive` | Chronos Time Archive | MATK +2010, TIME-WARP | บันทึกกาลเวลา ย้อนเวลากลับไปฟื้นฟู HP/MP และลดคูลดาวน์ |
| | Lv. 100| `genesis_divine_grimoire`| Genesis Divine Grimoire| MATK +2660, ALL +70 | มหาคัมภีร์สร้างโลกปฐมกาล ควบคุมความเป็นไปของทุกเวทมนตร์ |

---

## 5. คู่มือ Prompt สำหรับสร้างภาพ Sprite Sheet (23 Pieces Layout, No Effects)

โครงสร้างเหมือนชุดดาบ (Sword) ทุกประการ:
- **จำนวนชิ้น**: รวม 23 ชิ้นต่อประเภท แบ่งเป็น **Tier 1 (11 ชิ้น)** และ **Tier 2 (12 ชิ้น)**
- **ขนาดและสเกล**: ทุกชิ้นมีขนาดเท่ากัน (Uniform scale) เอียง 45 องศา
- **ไม่มี Visual Effect**: ไม่มีไฟ น้ำแข็ง สายฟ้า แสงออร่า ลำแสงปืน หรือประกายเวทใดๆ (Plain bare weapons)
- **หนังสือ (Book)**: หน้าปกปิดสนิททุกเล่ม ไม่เปิดหน้ากระดาษ
- **พื้นหลัง**: สีเทาอ่อนสะอาดตา `#E2E2E2`

### 5.1 คฑา (Staff) - [สร้างเสร็จสมบูรณ์แล้ว]
- **Tier 1 (11 ชิ้น):**
  > `Create a 2D fantasy RPG magic staff and wand weapon sprite sheet, in the exact same layout and composition as the reference image with exactly 11 items (row 1: 3 items, row 2: 3 items, row 3: 2 items, row 4: 3 items). Clean solid light grey background (#E2E2E2). All 11 staves must be identical in uniform scale and size, tilted diagonally at 45 degrees pointing upper-right. CRITICAL REQUIREMENT: NO visual effects, NO fire, NO flames, NO ice, NO lightning, NO glow, NO magical aura, NO smoke or particles. Strictly plain bare physical weapons only (physical wood, metal, bone, polished gem, silver, stone). Each staff has bold text label underneath: Lv.1 Wooden Wand, Lv.5 Oak Rod, Lv.10 Crystal Wand, Lv.15 Nature Sprout Staff, Lv.20 Dark Bone Wand, Lv.25 Silver Cleric Scepter, Lv.25 Silver Cleric Scepter, Lv.30 Ruby Fire Staff, Lv.35 Shadow Sorcery Staff, Lv.40 Thunder Archmage Staff, Lv.50 Ancient Elder Staff. 2D vector RPG game asset style, bold dark outlines, crisp clean sprites.`
- **Tier 2 (12 ชิ้น):**
  > `Create a 2D fantasy RPG legendary magic staff and scepter sprite sheet, in the exact same layout and composition as the reference image with exactly 12 items arranged in a 4x3 grid (4 rows, 3 items per row). Clean solid light grey background (#E2E2E2). All 12 staves must be identical in uniform scale and size, tilted diagonally at 45 degrees pointing upper-right with base at lower-left. CRITICAL REQUIREMENT: NO visual effects, NO fire, NO flames, NO ice crystals floating, NO lightning bolts, NO glow, NO magical aura, NO halos, NO smoke or particles. Strictly plain bare physical weapons only (physical forged metals, carved gems, gold, dragon horns, mechanical gears). Labels underneath: Lv.55 Glacial Frost Staff, Lv.60 Tempest Storm Rod, Lv.65 Terra Gaia Scepter, Lv.70 Nether Abyss Staff, Lv.70 Nether Abyss Staff, Lv.75 Archangel Holy Scepter, Lv.80 Dragon Heart Staff, Lv.85 Astral Starfall Rod, Lv.90 Phoenix Rebirth Scepter, Lv.90 Phoenix Rebirth Scepter, Lv.95 Chronos Time Staff, Lv.100 Genesis Divine Staff. 2D vector RPG game art, bold dark outlines, crisp clean sprites.`

### 5.2 ธนู (Bow)
- **Tier 1 (11 ชิ้น):**
  > `Create a 2D fantasy RPG bow and crossbow weapon sprite sheet, in the exact same layout and composition as the reference image with exactly 11 items (row 1: 3 items, row 2: 3 items, row 3: 2 items, row 4: 3 items). Clean solid light grey background (#E2E2E2). All 11 bows must be identical in uniform scale and size, tilted diagonally at 45 degrees pointing upper-right. CRITICAL REQUIREMENT: NO visual effects, NO fire, NO flames, NO ice, NO lightning, NO glow, NO magical aura, NO smoke or particles, NO floating arrows or beams. Strictly plain bare physical weapons only (physical wood, iron, steel, bone, silver). Each bow has bold text label underneath: Lv.1 Wooden Shortbow, Lv.5 Hunting Recurve Bow, Lv.10 Iron Longbow, Lv.15 Elven Yew Bow, Lv.20 Bandit Crossbow, Lv.25 Silver Ranger Bow, Lv.25 Silver Ranger Bow, Lv.30 Bone Piercer Bow, Lv.35 Nightshade Bow, Lv.40 Crimson Flame Bow, Lv.50 Gale Windforce Greatbow. 2D vector RPG game art, bold dark outlines, crisp clean sprites.`
- **Tier 2 (12 ชิ้น):**
  > `Create a 2D fantasy RPG legendary bow and crossbow sprite sheet, in the exact same layout and composition as the reference image with exactly 12 items arranged in a 4x3 grid (4 rows, 3 items per row). Clean solid light grey background (#E2E2E2). All 12 bows must be identical in uniform scale and size, tilted diagonally at 45 degrees. CRITICAL REQUIREMENT: NO visual effects, NO fire, NO flames, NO ice, NO lightning, NO glow, NO energy auras, NO floating arrows or energy beams. Strictly plain bare physical bows only. Labels underneath: Lv.55 Glacial Ice Bow, Lv.60 Thunder Strike Bow, Lv.65 Titan Heavy Crossbow, Lv.70 Abyssal Shadowstring, Lv.70 Abyssal Shadowstring, Lv.75 Seraphim Holy Bow, Lv.80 Dragon Breath Longbow, Lv.85 Astral Starlight Bow, Lv.90 Phoenix Feather Bow, Lv.90 Phoenix Feather Bow, Lv.95 Chrono Gear Crossbow, Lv.100 Genesis Celestial Bow. High resolution, clean separation.`

### 5.3 หอก (Spear)
- **Tier 1 (11 ชิ้น):**
  > `Create a 2D fantasy RPG spear, halberd and lance weapon sprite sheet, in the exact same layout and composition as the reference image with exactly 11 items (row 1: 3 items, row 2: 3 items, row 3: 2 items, row 4: 3 items). Clean solid light grey background (#E2E2E2). All 11 polearms must be identical in uniform scale and size, tilted diagonally at 45 degrees pointing upper-right with base at lower-left. CRITICAL REQUIREMENT: NO visual effects, NO fire, NO flames, NO ice, NO lightning, NO glow, NO aura. Plain physical spears only. Labels underneath: Lv.1 Wooden Pike, Lv.5 Iron Hunting Spear, Lv.10 Steel Halberd, Lv.15 Wild Boar Lance, Lv.20 Bandit Partisan, Lv.25 Silver Knight Lance, Lv.25 Silver Knight Lance, Lv.30 Bone Glaive, Lv.35 Shadow Piercing Spear, Lv.40 Crimson Dragonpike, Lv.50 Valkyrie War Spear. High resolution, clear separation.`
- **Tier 2 (12 ชิ้น):**
  > `Create a 2D fantasy RPG legendary spear and lance sprite sheet, in the exact same layout and composition as the reference image with exactly 12 items arranged in a 4x3 grid (4 rows, 3 items per row). Clean solid light grey background (#E2E2E2). All 12 polearms must be identical in uniform scale and size, tilted diagonally at 45 degrees pointing upper-right. CRITICAL REQUIREMENT: NO visual effects, NO fire, NO flames, NO ice crystals, NO lightning bolts, NO glow, NO magical aura. Plain bare physical polearms only. Labels underneath: Lv.55 Frost Glacier Spear, Lv.60 Thunderstorm Trident, Lv.65 Titan Stone Halberd, Lv.70 Chaos Demon Lance, Lv.70 Chaos Demon Lance, Lv.75 Holy Aegis Spear, Lv.80 Dragon Horn Warpike, Lv.85 Astral Void Glaive, Lv.90 Phoenix Radiant Spear, Lv.90 Phoenix Radiant Spear, Lv.95 Chronos Pendulum Lance, Lv.100 Genesis Divine Spear. High resolution, clear separation.`

### 5.4 ปืน (Gun)
- **Tier 1 (11 ชิ้น):**
  > `Create a 2D fantasy RPG firearms and guns sprite sheet, in the exact same layout and composition as the reference image with exactly 11 items (row 1: 3 items, row 2: 3 items, row 3: 2 items, row 4: 3 items). Clean solid light grey background (#E2E2E2). All 11 guns must be identical in uniform scale and size, tilted diagonally at 45 degrees pointing upper-right with grip at lower-left. CRITICAL REQUIREMENT: NO visual effects, NO muzzle flash, NO laser beams, NO bullets firing, NO fire, NO flames, NO smoke, NO lightning, NO glow. Plain physical guns only. Labels underneath: Lv.1 Flintlock Pistol, Lv.5 Hunting Musket, Lv.10 Iron Revolver, Lv.15 Pirate Dual Pistols, Lv.20 Trench Blunderbuss, Lv.25 Silver Knight Rifle, Lv.25 Silver Knight Rifle, Lv.30 Bone Carbine, Lv.35 Shadow Silencer Gun, Lv.40 Crimson Fire Blaster, Lv.50 Rune Steam Cannon. High resolution, clear separation.`
- **Tier 2 (12 ชิ้น):**
  > `Create a 2D fantasy RPG legendary blaster and cannon sprite sheet, in the exact same layout and composition as the reference image with exactly 12 items arranged in a 4x3 grid (4 rows, 3 items per row). Clean solid light grey background (#E2E2E2). All 12 guns must be identical in uniform scale and size, tilted diagonally at 45 degrees pointing upper-right with grip at lower-left. CRITICAL REQUIREMENT: NO visual effects, NO laser beams shooting out of barrels, NO muzzle blast, NO light rays, NO flames, NO lightning, NO glowing aura. Plain physical gun bodies only. Labels underneath: Lv.55 Cryo Frost Cannon, Lv.60 Voltaic Storm Blaster, Lv.65 Titan Siege Railgun, Lv.70 Abyssal Demon Revolver, Lv.70 Abyssal Demon Revolver, Lv.75 Judgment Holy Handgun, Lv.80 Dragonfire Cannon, Lv.85 Astral Photon Laser, Lv.90 Phoenix Flame Blaster, Lv.90 Phoenix Flame Blaster, Lv.95 Chrono Clockwork Gun, Lv.100 Genesis Divine Cannon. High resolution, clear separation.`

### 5.5 หนังสือ (Book / Grimoire)
- **Tier 1 (11 ชิ้น):**
  > `Create a 2D fantasy RPG magic books and grimoires sprite sheet, in the exact same layout and composition as the reference image with exactly 11 items (row 1: 3 items, row 2: 3 items, row 3: 2 items, row 4: 3 items). Clean solid light grey background (#E2E2E2). All 11 books must be identical in uniform scale and size, tilted diagonally at 45 degrees. CRITICAL REQUIREMENT: ALL BOOKS MUST BE COMPLETELY CLOSED with closed hardcovers and visible spines, NO open books, NO open pages, NO floating pages. CRITICAL REQUIREMENT: NO visual effects, NO fire, NO flames, NO smoke, NO lightning, NO glow, NO magical aura. Plain closed hardcover books only (leather, iron trims, wood, bone, buckles). Labels underneath: Lv.1 Apprentice Notebook, Lv.5 Leather Grimoire, Lv.10 Magic Theory Tome, Lv.15 Herbalist Codex, Lv.20 Dark Pact Scripture, Lv.25 Holy Scripture Book, Lv.25 Holy Scripture Book, Lv.30 Forbidden Necronomicon, Lv.35 Shadow Whisper Tome, Lv.40 Crimson Grimoire, Lv.50 Ancient Rune Archive. High resolution, clear separation.`
- **Tier 2 (12 ชิ้น):**
  > `Create a 2D fantasy RPG legendary divine grimoires and cosmic tomes sprite sheet, in the exact same layout and composition as the reference image with exactly 12 items arranged in a 4x3 grid (4 rows, 3 items per row). Clean solid light grey background (#E2E2E2). All 12 books must be identical in uniform scale and size, tilted diagonally at 45 degrees. CRITICAL REQUIREMENT: ALL BOOKS MUST BE COMPLETELY CLOSED with closed hardcovers and visible spines, NO open books, NO open pages, NO floating pages. CRITICAL REQUIREMENT: NO visual effects, NO fire, NO flames, NO smoke, NO lightning, NO halos, NO glow, NO aura. Plain closed ornate books only. Labels underneath: Lv.55 Blizzard Glacial Tome, Lv.60 Thunder Scripture, Lv.65 Titan Earth Grimoire, Lv.70 Chaos Demonic Codex, Lv.70 Chaos Demonic Codex, Lv.75 Book of Heavenly Light, Lv.80 Dragon Secret Tome, Lv.85 Astral Cosmos Scripture, Lv.90 Book of Phoenix, Lv.90 Book of Phoenix, Lv.95 Chronos Time Archive, Lv.100 Genesis Divine Grimoire. High resolution, clear separation.`

---

## 6. มอนสเตอร์และ Rare Relics ประจำตัว 24 ชิ้น (Unique Monster Relics Database)

มอนสเตอร์ทุกตัวในเกม (รวม 24 ตัว ใน 6 แผ่นสไปรต์) มี **Rare Relic ประจำตัว 1 ชิ้น** ซึ่งสุ่มดรอปแยกต่างหากจากไอเทมปกติ (`relicChance` 0.1% ขึ้นไป) เมื่อผู้เล่นเก็บได้จะปลดล็อกบันทึกลงใน **Treasure Compendium** และมอบบัฟสเตตัสถาวรให้ตัวละครทันที

ไฟล์รูปภาพต้นฉบับ: `assets/relics/relics_<group>.jpg` (2x2 Grid, 1024x1024)  
ไฟล์สไปรต์โปร่งใส: `assets/sprites/relics/<group>_<cell>.png` (160x160 Transparent PNG)

### 6.1 Starter Group (`assets/relics/relics_starter.jpg`)
| มอนสเตอร์ | Cell | รหัส Relic (ID) | ชื่อ Relic | สเตตัสโบนัสถาวร | คำอธิบายความสามารถ |
|---|:---:|---|---|---|---|
| **Bouncy Slime** | 0 | `relic_slime_heart` | 🫧 Royal Slime Heart Reliquary | +100 Max HP | จอกแก้วทองคำบรรจุผลึกหัวใจสไลม์สีครามบริสุทธิ์ เปล่งประกายพลังชีวิตและความยืดหยุ่น |
| **Forest Hornet** | 1 | `relic_amber_queen_brooch` | 🐝 Amber Queen Brooch | +10 ATK, +4% ASPD | เข็มกลัดอำพันโบราณล้อมลายปีกผึ้งทองคำ กักเก็บพลังแห่งความเร็วและการโจมตีที่แม่นยำ |
| **Horned Rabbit** | 2 | `relic_carrot_charm` | 🌙 Lunar Rabbit Jade Talisman | +12 ATK, +5% ASPD, +3% Crit | เครื่องรางหยกพระจันทร์เสี้ยวประดับใบโคลเวอร์สี่แฉกและผนึกกระต่าย เพิ่มโชคและความคล่องตัว |
| **Mossy Golem** | 3 | `relic_golem_heart` | 🗿 Primordial Earth Titan Rune | +35 DEF, +500 HP | แผ่นศิลาอักขระไททันปฐพีโบราณ รัดแถบสำริดสลักรูนเขียวเรืองแสง มอบความทนทานดั่งขุนเขา |

### 6.2 Beasts Group (`assets/relics/relics_beasts.jpg`)
| มอนสเตอร์ | Cell | รหัส Relic (ID) | ชื่อ Relic | สเตตัสโบนัสถาวร | คำอธิบายความสามารถ |
|---|:---:|---|---|---|---|
| **Shadow Wolf** | 0 | `relic_alpha_eye` | 🐺 Silver Moon Alpha Medallion | +25 ATK, +6% Crit Rate | เหรียญเงินจันทราเสี้ยวสลักรูปหมาป่าหอน ประดับอัญมณีดวงตาสีไพลินเรืองแสง มองทะลุจุดตายศัตรู |
| **Armored Boar** | 1 | `relic_boar_crest` | 🐗 Crest of the Primal Behemoth | +18 ATK, +15 DEF, +300 HP | ตราศึกสำริดประดับเขี้ยวหมูป่าทองคำและทับทิมโลหิต มอบพลังการบุกทะลวงและพลังกายดุดัน |
| **Jungle Viper** | 2 | `relic_ouroboros_viper` | 🐍 Ouroboros Emerald Idol | +32 ATK, +6% ASPD | เทวรูปทองคำรูปงูขดคาบหยดมรกตพิษบริสุทธิ์ เสริมพลังโจมตีรวดเร็วและอันตราย |
| **Claw Bear** | 3 | `relic_ursa_totem` | 🐻 Ursa Major Star Totem | +36 ATK, +600 HP | โทเทมไม้สักทองแกะสลักรูปพญาหมี ฝังอัญมณีประกายดาวฤกษ์ มอบพละกำลังอันมหาศาล |

### 6.3 Bandits Group (`assets/relics/relics_bandits.jpg`)
| มอนสเตอร์ | Cell | รหัส Relic (ID) | ชื่อ Relic | สเตตัสโบนัสถาวร | คำอธิบายความสามารถ |
|---|:---:|---|---|---|---|
| **Bandit Rogue** | 0 | `relic_shadow_cameo` | 🥷 Phantom Cameo of the Shadow | +35 ATK, +7% Crit Rate | จี้เหรียญเงินรมดำแกะสลักหน้ากากเงาลึกลับ เรืองแสงไอเวทสีม่วง ช่วยหลบหลีกและจู่โจมจุดตาย |
| **Bandit Archer** | 1 | `relic_falcon_astrolabe` | 🏹 Falcon Eye Astrolabe | +40 ATK, +7% ASPD | อุปกรณ์ดาราศาสตร์สำริดทองเหลืองเลนส์คริสตัล ประดับขนนกอินทรี เพิ่มระยะเล็งและความเร็วโจมตี |
| **Bandit Brute** | 2 | `relic_titan_knuckle_seal` | 💪 Iron Titan Knuckle Seal | +45 ATK, +30 DEF, +500 HP | แท่นหินเหล็กกล้าฝังหนามสลักอักขระรูนโลหิตสีแดง มอบพลังโจมตีทำลายล้างและการป้องกัน |
| **Bandit Leader** | 3 | `relic_pirate_sovereign_brooch` | 🏴‍☠️ Pirate Sovereign Brooch | +55 ATK, +5% Crit, +750 HP | เข็มกลัดทองคำแท้ลวดลายดาบไขว้หัวกะโหลกสวมมงกุฎทับทิม อภิมหาสมบัติของผู้นำกองโจร |

### 6.4 Fantasy Group (`assets/relics/relics_fantasy.jpg`)
| มอนสเตอร์ | Cell | รหัส Relic (ID) | ชื่อ Relic | สเตตัสโบนัสถาวร | คำอธิบายความสามารถ |
|---|:---:|---|---|---|---|
| **Goblin Scout** | 0 | `relic_goblin_badge` | 🪙 Cunning Clockwork Goblin Idol | +45 ATK, +450 HP, +15% Gold | หุ่นกลโบราณรูปก็อบลินถือเหรียญทองอัญมณีมรกต เพิ่มการหาเงินและพละกำลัง |
| **Fire Imp** | 1 | `relic_brimstone_censer` | 😈 Brimstone Infernal Censer | +58 ATK, +6% ASPD | กระถางกำยานห้อยสายโซ่ทองคำ กักขังเปลวเพลิงเวทสีม่วงที่ไม่มีวันมอดดับ มอบพลังทำลายล้าง |
| **Treant** | 2 | `relic_heart_of_forest` | 🌲 Golden Seed of Yggdrasil | +60 DEF, +1,200 HP | เมล็ดพันธุ์ทองคำเรืองแสงในอ้อมกอดของรากไม้เงินศักดิ์สิทธิ์ มอบพลังฟื้นฟูและความทนทาน |
| **Chest Mimic** | 3 | `relic_pandora_mimic_lock` | 🧰 Pandora Gilded Mimic Lock | +65 ATK, +8% Crit Rate | กล่องกลไกทองคำโบราณสลักลวดลายคมเขี้ยว ฝังดวงตาสีม่วงอมตะของมิมิค นำโชคลาภและการโจมตีคริติคอล |

### 6.5 Others Group (`assets/relics/relics_others.jpg`)
| มอนสเตอร์ | Cell | รหัส Relic (ID) | ชื่อ Relic | สเตตัสโบนัสถาวร | คำอธิบายความสามารถ |
|---|:---:|---|---|---|---|
| **Floating Eye** | 0 | `relic_void_gazer_sphere` | 👁️ Celestial Void Gazer Sphere | +70 ATK, +8% Crit Rate | วงแหวนไจโรสโคปทองคำกักขังทรงกลมเนตรจักรวาลและละอองเนบิวลา มองเห็นจุดอ่อนทุกมิติ |
| **Spectral Armor** | 1 | `relic_phantom_aegis` | 🛡️ Aegis of the Phantom Sovereign | +80 DEF, +1,400 HP | โล่เงินสลักอักขระเวทโบราณล้อมปีกเทวา เรืองแสงเพลิงวิญญาณสีฟ้า ป้องกันการโจมตีรอบด้าน |
| **Mushroom Sporeling** | 2 | `relic_mycelium_chalice` | 🍄 Chalice of the Fungal Goddess | +50 DEF, +1,500 HP | จอกศิลาแกะสลักโบราณที่เห็ดเรืองแสงสีฟ้าครามผลิบานตลอดกาล มอบพลังชีวิตอันมหาศาล |
| **Baby Fire Wyrm** | 3 | `relic_solar_dragon_egg` | 🐲 Solar Hearth Dragon Egg | +90 ATK, +1,000 HP | ไข่มังกรทองคำฝังเกล็ดทับทิมล้อมรอบด้วยเปลวไฟศักดิ์สิทธิ์ ปลดปล่อยพลังโจมตีและชีวิต |

### 6.6 Skeleton Group (`assets/relics/relics_skeleton.jpg`)
| มอนสเตอร์ | Cell | รหัส Relic (ID) | ชื่อ Relic | สเตตัสโบนัสถาวร | คำอธิบายความสามารถ |
|---|:---:|---|---|---|---|
| **Skeleton Warrior** | 0 | `relic_vanguard_crest` | 💀 Crest of the Fallen Vanguard | +88 ATK, +65 DEF | ตราศึกดาบคู่สลักหัวกะโหลกสวมมงกุฎ บ่งบอกถึงเกียรติยศและพลังโจมตีของผู้ไม่ยอมจำนน |
| **Skeleton Archer** | 1 | `relic_banshee_harp` | 🏹 Banshee Bone Harp | +95 ATK, +8% ASPD | พิณแกะสลักจากงาช้างโบราณ ขึงด้วยสายเพลิงวิญญาณสีเขียว บรรเลงเสียงแห่งความเร็วอันไร้เสียงสะท้อน |
| **Skeleton Mage** | 2 | `relic_lich_archon_orb` | 🧙 Lich Archon Soul Sphere | +110 ATK, +9% Crit Rate | หัวคทากระดูกโบราณโอบอุ้มลูกแก้ววิญญาณสีฟ้าคราม สลักอักขระต้องห้ามแห่งความตาย |
| **Skeleton Knight** | 3 | `relic_death_knight_crown` | ⚔️ Crown of the Dread Death Knight | +70 ATK, +110 DEF, +2,000 HP | มงกุฎเหล็กดำปลายแหลมฝังไพลินแห่งความมืด มอบพลังป้องกันและพลังกายสูงสุดของขุนศึกยมโลก |

---

## 7. ระบบยาโพชั่น (Potions Database - 3 Types x 3 Sizes)

ระบบยาโพชั่นออกแบบเป็นกริด 3x3 แบ่งเป็น 3 ชนิด (HP, SP, EXP) แต่ละชนิดมี 3 ขนาด (S, M, L) รวม 9 ชิ้น

- ไฟล์รูปภาพต้นฉบับ: `assets/potions/potions_sheet.jpg` (3x3 Grid, 1024x1024)
- ไฟล์สไปรต์โปร่งใส: `assets/sprites/potions/<id>.png` (140x140 Transparent PNG)

### ตารางรายละเอียดโพชั่นทั้งหมด 9 รายการ
| ชนิด | ขนาด | รหัสไอเทม (ID) | ชื่อไอเทม | ราคา (Gold) | ผลการใช้งาน | รายละเอียดและลักษณะขวด |
|:---:|:---:|---|---|:---:|---|---|
| **HP (สีแดง)** | **S** | `hp_potion_s` | Red Potion (S) | 20 G | ฟื้นฟู 60 HP | ขวดแก้วกลมกะทัดรัด จุกไม้คอร์ก บรรจุน้ำยาสีทับทิมเปล่งแสง |
| | **M** | `hp_potion_m` | Red Potion (M) | 60 G | ฟื้นฟู 200 HP | ขวดเล่นแร่แปรธาตุทรงกรวย คอขวดรัดทองเหลือง น้ำยาสีแดงเข้มข้น |
| | **L** | `hp_potion_l` | Red Potion (L) | 180 G | ฟื้นฟู 600 HP | ขวดแก้วคริสตัลเจียระไนล้อมโครงทองคำลายหัวใจ จุกอัญมณีทับทิมสีแดงเจิดจ้า |
| **SP (สีน้ำเงิน)** | **S** | `sp_potion_s` | Blue Potion (S) | 30 G | ฟื้นฟู 40 SP | หลอดแก้วทรงกระบอก จุกไม้คอร์ก บรรจุน้ำยามานาสีฟ้าครามใส |
| | **M** | `sp_potion_m` | Blue Potion (M) | 90 G | ฟื้นฟู 120 SP | ลูกแก้วมนตราทรงกลม คอขวดรัดเงินบริสุทธิ์ บรรจุไอเวทมนตร์สีไพลินหมุนวน |
| | **L** | `sp_potion_l` | Blue Potion (L) | 250 G | ฟื้นฟู 300 SP | โถแก้วดาราศาสตร์โบราณล้อมปีกเงิน จุกเพชรไพลิน ประกายแสงมานามหาศาล |
| **EXP (สีเหลือง)** | **S** | `exp_potion_s` | Yellow EXP Potion (S) | 100 G | มอบ 100 EXP | ขวดแก้วเหลี่ยมจิ๋ว บรรจุน้ำยาสีเหลืองทองพร้อมประกายดาวระยิบระยับ |
| | **M** | `exp_potion_m` | Yellow EXP Potion (M) | 400 G | มอบ 500 EXP | คริสตัลทรงเพชรขอบทองคำ บรรจุน้ำทิพย์สีอำพันเรืองรอง มอบความรู้และประสบการณ์ |
| | **L** | `exp_potion_l` | Yellow EXP Potion (L) | 1,500 G | มอบ 2,500 EXP | โถสุริยันทองคำสลักลายรัศมีตะวัน จุกบุษราคัมสีทองเปล่งประกายเจิดจรัส |

---

## 8. ระบบเหรียญทองและลูกแก้ว EXP ดรอป (Gold & EXP Drop Assets - 3 Sizes)

ระบบสไปรต์สำหรับไอเทมดรอปบนพื้นหลังกำจัดมอนสเตอร์ (Loot Orbs) ปรับปรุงจากการวาดวงกลมธรรมดาเป็นภาพกราฟิก 2D สวยงาม คมชัด แบ่งตามจำนวนที่ดรอป (Amount Thresholds)

- ไฟล์รูปภาพต้นฉบับ: `assets/drops/drops_gold_exp.jpg` (2x3 Grid, 1024x1024)
- ไฟล์สไปรต์โปร่งใส: `assets/sprites/drops/<id>.png` (140x140 Transparent PNG)

### ตารางสไปรต์เหรียญทอง (Yellow Gold)
| ขนาด | ไฟล์สไปรต์ | เกณฑ์การดรอป (Amount) | คำอธิบายลักษณะ |
|:---:|---|:---:|---|
| **S** | `gold_s.png` | `< 80 G` (มอนสเตอร์ทั่วไป) | เหรียญทองเดี่ยวสลักลายดาว 5 แฉก หนาเงางามสะท้อนแสง |
| **M** | `gold_m.png` | `80 - 499 G` (มอนสเตอร์เลเวลสูง / มินิบอส) | เหรียญทอง 4 เหรียญเรียงซ้อนกันเป็นกอง พร้อมประกายวิบวับ |
| **L** | `gold_l.png` | `≥ 500 G` (บอสใหญ่ / กล่องสมบัติ) | กองเหรียญทองคำพูนสูงตระการตา ประกายแสงสีทองอร่าม |

### ตารางสไปรต์ลูกแก้วค่าประสบการณ์ (Vibrant Green EXP)
| ขนาด | ไฟล์สไปรต์ | เกณฑ์การดรอป (Amount) | คำอธิบายลักษณะ |
|:---:|---|:---:|---|
| **S** | `exp_s.png` | `< 150 EXP` (มอนสเตอร์ทั่วไป) | ฟองอากาศพลังงานสีเขียวใส มีฟองอากาศจิ๋วและตัวอักษร "EXP" เรืองรอง |
| **M** | `exp_m.png` | `150 - 999 EXP` (มอนสเตอร์เลเวลสูง / มินิบอส) | ลูกแก้วมรกตเข้มข้น ล้อมด้วยวงแหวนพลังงานสีเขียวหมุนวนและอักษร "EXP" |
| **L** | `exp_l.png` | `≥ 1,000 EXP` (บอสใหญ่ / รางวัลใหญ่) | ลูกแก้วดวงอาทิตย์พลังงานมหาศาล รัศมีแฉก 8 ทิศ พร้อมอักษร "EXP" สีทองอร่าม |

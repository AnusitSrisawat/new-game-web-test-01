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

สำหรับภาพ 1024x1024 ที่มีอาวุธ 10 ชิ้น:

```javascript
// คำนวณพิกัด Crop สำหรับอาวุธในชีต 10 ชิ้น
export function weaponRect(index) {
  // index 0..9 (แถวบน 5 ชิ้น, แถวล่าง 5 ชิ้น)
  const col = index % 5;
  const row = Math.floor(index / 5);
  return {
    sx: 35 + col * 195,
    sy: 25 + row * 490,
    sw: 185,
    sh: 420
  };
}
```

from PIL import Image, ImageDraw, ImageFont
import os

body = Image.open('assets/sprites/player/base_body.png').convert('RGBA')

# Load Knight Set
helm_knight = Image.open('assets/sprites/equipment/helm_knight.png').convert('RGBA')
armor_knight = Image.open('assets/sprites/equipment/armor_knight.png').convert('RGBA')
wings_angel = Image.open('assets/sprites/equipment/wings_angel.png').convert('RGBA')
shield_lion = Image.open('assets/sprites/equipment/shield_lion.png').convert('RGBA')
pet_griffon = Image.open('assets/sprites/equipment/pet_griffon.png').convert('RGBA')

# Load Mage Set
hat_wizard = Image.open('assets/sprites/equipment/hat_wizard.png').convert('RGBA')
robe_sorcerer = Image.open('assets/sprites/equipment/robe_sorcerer.png').convert('RGBA')
wings_fairy = Image.open('assets/sprites/equipment/wings_fairy.png').convert('RGBA')
ward_spellbook = Image.open('assets/sprites/equipment/ward_spellbook.png').convert('RGBA')
pet_owl = Image.open('assets/sprites/equipment/pet_star_owl.png').convert('RGBA')

# Target canvas width & height for each assembled character: 320 x 420
def build_character(body_img, outfit, headgear, wings=None, offhand=None, pet=None):
    c = Image.new('RGBA', (360, 420), (0, 0, 0, 0))
    
    # 0. Shadow
    shadow = Image.new('RGBA', (360, 420), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    # Character feet center around x: 170, y: 375
    draw.ellipse((120, 365, 220, 395), fill=(0, 0, 0, 75))
    if pet:
        draw.ellipse((235, 368, 305, 388), fill=(0, 0, 0, 60))
    c = Image.alpha_composite(c, shadow)
    
    # 1. Wings (behind body)
    if wings:
        # Scale wings nicely
        w_sc = wings.resize((int(wings.width * 0.95), int(wings.height * 0.95)), Image.LANCZOS)
        # Position on the back
        c.alpha_composite(w_sc, (65, 125))
        
    # 2. Base Body
    c.alpha_composite(body_img, (100, 80))
    
    # 3. Outfit / Armor (covers torso, waist, legs)
    if outfit:
        o_sc = outfit.resize((int(outfit.width * 0.96), int(outfit.height * 0.96)), Image.LANCZOS)
        c.alpha_composite(o_sc, (93, 160))
        
    # 4. Off-hand (Shield / Ward)
    if offhand:
        s_sc = offhand.resize((int(offhand.width * 0.68), int(offhand.height * 0.68)), Image.LANCZOS)
        c.alpha_composite(s_sc, (168, 195))
        
    # 5. Headgear (Helm / Wizard Hat)
    if headgear:
        h_sc = headgear.resize((int(headgear.width * 0.88), int(headgear.height * 0.88)), Image.LANCZOS)
        # Position over the head
        if 'helm' in str(headgear):
            c.alpha_composite(h_sc, (70, 48))
        else: # Wizard Hat
            c.alpha_composite(h_sc, (65, 30))
            
    # 6. Pet walking beside
    if pet:
        p_sc = pet.resize((int(pet.width * 0.65), int(pet.height * 0.65)), Image.LANCZOS)
        c.alpha_composite(p_sc, (230, 260))
        
    return c

# Build 3 variations:
# 1. Full Holy Knight
char_knight = build_character(body, armor_knight, helm_knight, wings_angel, shield_lion, pet_griffon)

# 2. Full Arcane Sorcerer
char_mage = build_character(body, robe_sorcerer, hat_wizard, wings_fairy, ward_spellbook, pet_owl)

# 3. Mixed: Spellsword (Knight Armor + Wizard Hat + Fairy Wings + Lion Shield)
char_mix = build_character(body, armor_knight, hat_wizard, wings_fairy, shield_lion, pet_griffon)

# Create a combined comparison sheet (1150 x 500) on solid light grey background
sheet = Image.new('RGBA', (1150, 480), (218, 218, 218, 255))
sheet.alpha_composite(char_knight, (20, 30))
sheet.alpha_composite(char_mage, (400, 30))
sheet.alpha_composite(char_mix, (780, 30))

draw_sheet = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("arial.ttf", 20)
    font_sub = ImageFont.truetype("arial.ttf", 15)
except:
    font = ImageFont.load_default()
    font_sub = font

draw_sheet.text((180, 20), "1. Full Holy Knight Set", fill=(30, 41, 59), font=font, anchor="mt")
draw_sheet.text((180, 440), "Helm + Armor + Angel Wings + Shield + Griffon", fill=(71, 85, 105), font=font_sub, anchor="mt")

draw_sheet.text((560, 20), "2. Full Arcane Sorcerer Set", fill=(30, 41, 59), font=font, anchor="mt")
draw_sheet.text((560, 440), "Wizard Hat + Robe + Fairy Wings + Tome + Owl", fill=(71, 85, 105), font=font_sub, anchor="mt")

draw_sheet.text((940, 20), "3. Mix & Match (Spellsword)", fill=(30, 41, 59), font=font, anchor="mt")
draw_sheet.text((940, 440), "Wizard Hat + Knight Armor + Fairy Wings", fill=(71, 85, 105), font=font_sub, anchor="mt")

out_path = 'assets/player/modular_composite_proof.png'
sheet.save(out_path)
print(f"Saved modular composition proof to: {out_path}")

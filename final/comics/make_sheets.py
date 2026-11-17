"""Character design sheets: people, evil ones from below, good ones from below.

Each design is one fixed description, reused in every comic panel where the
character appears, so they look the same throughout the book.
"""
import os, re, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageOps
from make_comics import gen, FONT_B, FONT_I, PANELS

STYLE = ("anime style character design, manga illustration, cel shading, sharp clean lineart, full body, "
         "dramatic lighting, dark desert background, horror atmosphere, no text, no letters")

SHEETS = {
    'People of the Story': [
        ("Theyab", "the Marked boy, raised below", "15-year-old Emirati Bedouin boy, brown sun-darkened skin, thick black eyebrows, dark wavy black hair, light amber-gold eyes, thin face, ragged sand-coloured kandura, faint glowing golden feather mark on his chest, left fist closed"),
        ("Ghareeb", "the smoke-touched saluki, narrator", "lean Arabian saluki hound, sand-coloured, long feathered ears and tail, one amber eye and one glowing silver eye, its shadow slightly too long"),
        ("Umm Hanan", "the widow who leaves bread", "old Emirati widow in black abaya and shayla, gold metallic face mask burqa, kind tired eyes, holding a steady oil lamp"),
        ("Mutawwa' Hilal", "the reader who casts them out", "thin old Omani holy teacher, very dark sun-blackened skin, white trimmed beard, white turban, brown goat-hair cloak, wooden staff, leather satchel"),
        ("Old Bakhit", "the blind healer, 300 years old", "ancient blind Bedouin healer, milky white eyes, very long white beard, white ghutra, holding a small brass bell"),
        ("Haddaj the Digger", "the treasure sorcerer", "old gaunt Bedouin sorcerer in dark hooded bisht, hawk nose, clay-stained fingers, holding a battered book and a shovel"),
        ("Nadim & Shibl", "the well-keeper's sons", "two Emirati Bedouin brothers, a broad proud teenage boy in white kandura and a small 7-year-old boy with huge dark eyes and a blue bead necklace"),
        ("The Nameless", "the cult who burned their names", "riders in grey robes wearing smooth white faceless masks, on pale camels, holding grey blades"),
    ],
    'More People of the Story': [
        ("Hazza'", "the exiled sheikh's son, Theyab's only friend", "17-year-old Emirati Bedouin prince, tall, brown skin, short black beard starting, scar along his jaw, gold signet ring, red-and-gold bisht over a white kandura, holding a sword broken halfway"),
        ("Sharood", "the Veiled Rider, Theyab's father", "tall Bedouin man in his forties wrapped in grey desert cloth, face veiled except tired eyes, riding a pale camel, long hunting spear"),
        ("Saqr / the Seventh", "Theyab's lost brother, the hunter", "lean 20-year-old Arab warrior in grey robes, smooth white faceless mask cracked down the middle, twin grey curved blades"),
        ("Wazir Muhaisen", "the vizier who betrays", "elderly Arab vizier, silver hair and silver beard, soft kind smile, faded grey eyes, rich dark-blue bisht with gold trim, stone seal on a neck chain"),
        ("Jasir", "the guide, half from below", "17-year-old Emirati boy guide, brown skin, black hair, eyes that shine like an animal's at night, goatskin waterskin tied with a red wool knot, sea-blue sash"),
        ("Ghanim", "the cheating trader", "fat Emirati trader, orange henna-dyed beard, white kandura, gold rings, holding crooked brass scales and a silver coin"),
        ("Saqi", "the well-keeper, once Worn", "heavy Emirati well-keeper, grey beard, white ghutra, holding a well rope and leather bucket"),
        ("Sheikh Mutlaq", "proud ruler of Ubar", "proud old Arab sheikh on a dark throne, grey beard, black bisht with gold, gold ring on a chain, lantern-lit hall"),
        ("Zaid", "Hazza's little brother", "10-year-old Arab prince, brown skin, white kandura, gold-embroidered cap, holding a small herder's whistle"),
        ("Umm Shamma", "the palace cook of Ubar", "large cheerful Emirati cook in black abaya with sleeves rolled up, flour on her hands, holding a tray of honey cakes"),
        ("Hessa", "Nadim's wife, the newborn's mother", "young Emirati mother in black abaya and gold face mask, holding a newborn baby, frightened eyes"),
        ("The Eldest", "the giant silent bodyguard", "giant silent Arab warrior in grey robes, smooth white faceless mask, huge curved sword"),
        ("Ghadban", "the first bearer, the angry shepherd", "Omani shepherd boy of the Hajar mountains, brown skin, angry eyes, ragged goat-hair cloak, black smoke curling from his hands"),
        ("Suhail", "the half-emptied stable boy", "12-year-old Arab stable boy with jug-handle ears, half his face ash-grey, one blank white eye"),
        ("Old Nadim at the fire", "the teller, decades later", "very old Emirati Bedouin storyteller with white beard, white ghutra and agal, brown bisht, pouring coffee from a brass dallah by a fire, an old saluki with one scarred eye at his feet"),
        ("The boy at the fire", "the one no one saw arrive", "small boy at the edge of firelight in a white dishdasha, face in shadow, donkey hooves showing under the hem"),
    ],
    'The Evil Ones From Below': [
        ("The Sealed King", "bound beneath Ubar", "colossal figure of black smokeless fire with ember eyes, chained inside a giant cracked brass vessel in a limestone cavern, a broken brass seal on its forehead"),
        ("Ash-Mouth", "eats names", "tall gaunt grey creature made of ash, no eyes, enormous mouth from which grey ash and faded letters pour out"),
        ("The Smiling Hunger", "puts people on", "shadow creature with a huge too-wide grin, wearing stolen human faces like masks layered over each other"),
        ("The Thousand-Voiced", "speaks with the voices of the dead", "a column of dark smoke full of dozens of open human mouths"),
        ("The Heavy One", "master of the Sitters", "hunched massive creature of black stone and shadow with glowing eyes, squatting on a sleeping man's chest"),
        ("Old Thorn", "guards stolen treasure", "ancient creature made of dry acacia thorns and branches, gold coins tangled in it, long thorn fingers, buried in sand"),
        ("The Perfumed Bride", "lures men at night", "beautiful woman in gold-embroidered black bridal abaya, coils of perfume smoke, hands ending in long curved sickle blades, rotten skin showing under her veil"),
        ("The Deep Caller", "drags divers under", "giant pale half-fish half-man sea creature covered in barnacles, white eyes, long webbed arms rising from dark water"),
        ("The Noon Mare", "takes children at noon", "pale woman with long black hair in a faded dress, her legs are donkey legs with hooves, standing in shimmering noon heat in an empty lane"),
        ("The Lantern Man", "leads travellers to die", "very tall thin dark figure with no face holding a glowing lantern among night dunes"),
        ("The Cradle Mother", "comes for newborns", "gaunt woman with empty reaching arms, long veil, cracked lips, standing at a tent doorway at night"),
        ("The Halfman", "hunts on the salt", "creature split lengthwise down the middle: one eye, one arm, one leg, hopping across white salt flats"),
        ("Ember Hounds", "packs that track the Light", "pack of jackals made of shadow with burning ember eyes and smoking fur"),
        ("The Black Wind", "the great storm", "mountain-high black sandstorm whirlwind with a gaping mouth inside it, swallowing a camel caravan"),
        ("The Twin", "Theyab's other self", "a mirror double of an Emirati teenage boy with grey skin and fully black eyes, smiling, standing behind him"),
        ("The Worn", "the possessed", "Emirati man possessed, eyes rolled completely white, black smoke leaking from his mouth, unnatural twisted pose"),
    ],
    'The Good Ones From Below': [
        ("The Sand-Mother", "raised Theyab in the Quiet Country", "tall gentle woman with gazelle features and glowing gold eyes, white flowing robes, her feet not touching the sand, warm golden glow, a gazelle beside her"),
        ("The Lamp-Keeper", "guards Umm Hanan's house", "small hooded figure made of warm amber light cupping an oil lamp flame with both hands inside a mud-brick room"),
        ("The Lifter", "keeps wells sweet, lifts the drowning", "tall translucent figure made of clear blue-green water lifting a drowning pearl diver up toward the light"),
        ("The Turning Wind", "turns storms away", "graceful spiral of golden sand shaped like a winged guardian, turning a dark sandstorm aside"),
        ("The Quiet Voice", "whispers 'wake up'", "faint glowing face made of soft white light whispering into a sleeping boy's ear"),
        ("The Threshold-Watcher", "guards doors and cradles", "tall old guardian made of mud-brick and soft light standing in a tent doorway with arms spread wide over a cradle"),
    ],
}


def sheet(title, items, out, seed0):
    cols = 4 if len(items) > 8 else 2 if len(items) <= 6 and len(items) % 3 else 3
    if len(items) == 8: cols = 4
    if len(items) == 6: cols = 3
    rows = -(-len(items) // cols)
    cw, ch, cap = 400, 520, 110
    W, H = cols * cw + (cols + 1) * 20, 110 + rows * (ch + cap + 20) + 20
    page = Image.new('RGB', (W, H), (18, 12, 10))
    d = ImageDraw.Draw(page)
    d.text((24, 30), title, font=ImageFont.truetype(FONT_I, 44), fill=(230, 210, 180))
    for k, (name, role, desc) in enumerate(items):
        r, c = divmod(k, cols)
        x, y = 20 + c * (cw + 20), 110 + r * (ch + cap + 20)
        path = os.path.join(PANELS, "design-" + re.sub(r'[^a-z0-9]+', '-', name.lower().replace('&', 'and')).strip('-') + ".jpg")
        ok = gen(f"{STYLE}. {desc}", 512, 640, path, seed0 + k)
        if ok:
            page.paste(ImageOps.fit(Image.open(path).convert('RGB'), (cw, ch)), (x, y))
        d.rectangle([x, y, x + cw, y + ch], outline=(140, 100, 60), width=4)
        d.text((x + 6, y + ch + 10), name, font=ImageFont.truetype(FONT_B, 28), fill=(240, 220, 190))
        for n, line in enumerate(textwrap.wrap(role, 30)[:2]):
            d.text((x + 6, y + ch + 50 + n * 26), line, font=ImageFont.truetype(FONT_I, 21), fill=(190, 160, 120))
    d.text((W - 300, H - 18), 'Art: pollinations.ai (free)', font=ImageFont.truetype(FONT_B, 13), fill=(110, 110, 110))
    page.save(out)
    print('sheet', out, flush=True)


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    import sys
    want = sys.argv[1:]
    for i, (t, items) in enumerate(SHEETS.items()):
        if not want or t in want:
            sheet(t, items, os.path.join(here, 'pages', 'sheet-' + re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-') + '.png'), 7000 + i * 100)

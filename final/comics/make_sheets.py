"""Character design sheets: people, evil ones from below, good ones from below.

Each design is one fixed description, reused in every comic panel where the
character appears, so they look the same throughout the book.
"""
import os, re, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageOps
from make_comics import gen, FONT_B, FONT_I, PANELS

STYLE = ("anime style character design, Arab Emirati and Omani people with brown skin, men have short hair and no headdress, women modestly dressed and fully covered with hair covered, manga illustration, cel shading, sharp clean lineart, full body, "
         "dramatic lighting, dark desert background, horror atmosphere, no text, no letters")

SHEETS = {
    'People of the Story': [
        ("Theyab", "the Marked boy, raised below", "15-year-old Emirati Bedouin boy, brown sun-darkened skin, thick black eyebrows, short black hair, light amber-gold eyes, thin face, ragged sand-coloured kandura, faint glowing golden feather mark on his chest, left fist closed"),
        ("Ghareeb", "the smoke-touched saluki, narrator", "lean Arabian saluki hound, sand-coloured, long feathered ears and tail, one amber eye and one glowing silver eye, its shadow slightly too long"),
        ("Umm Hanan", "the widow who leaves bread", "old Emirati widow fully covered in black abaya, hair completely covered by black shayla, gold metallic face mask burqa, kind tired eyes, holding a steady oil lamp"),
        ("Mutawwa' Hilal", "the reader who casts them out", "thin old Omani holy teacher, very dark sun-blackened skin, white trimmed beard, brown goat-hair cloak, wooden staff, leather satchel"),
        ("Old Bakhit", "the blind healer, 300 years old", "ancient blind Bedouin healer, milky white eyes, very short white hair and long white beard, holding a small brass bell"),
        ("Haddaj the Digger", "the treasure sorcerer", "old gaunt Bedouin sorcerer in dark bisht, hawk nose, clay-stained fingers, holding a battered book and a shovel"),
        ("Nadim & Shibl", "the well-keeper's sons", "two Emirati Bedouin brothers, a broad proud teenage boy in white kandura and a small 7-year-old boy with huge dark eyes and a blue bead necklace"),
        ("The Nameless", "the cult who burned their names", "riders in grey robes wearing smooth white faceless masks, on pale camels, holding grey blades"),
    ],
    'More People of the Story': [
        ("Hazza'", "the exiled sheikh's son, Theyab's only friend", "17-year-old Emirati Bedouin prince, tall, brown skin, short black beard starting, scar along his jaw, gold signet ring, red-and-gold bisht over a white kandura, holding a sword broken halfway"),
        ("Sharood", "the Veiled Rider, Theyab's father", "tall Bedouin man in his forties wrapped in grey desert cloth, face veiled except tired eyes, riding a pale camel, long hunting spear"),
        ("Saqr / the Seventh", "Theyab's lost brother, the hunter", "lean 20-year-old Arab warrior in grey robes, smooth white faceless mask cracked down the middle, twin grey curved blades"),
        ("Wazir Muhaisen", "the vizier who betrays", "elderly Arab vizier, short silver hair and silver beard, soft kind smile, faded grey eyes, rich dark-blue bisht with gold trim, stone seal on a neck chain"),
        ("Jasir", "the guide, half from below", "17-year-old Emirati boy guide, brown skin, black hair, eyes that shine like an animal's at night, goatskin waterskin tied with a red wool knot, sea-blue sash"),
        ("Ghanim", "the cheating trader", "fat Emirati trader, orange henna-dyed beard, white kandura, gold rings, holding crooked brass scales and a silver coin"),
        ("Saqi", "the well-keeper, once Worn", "heavy Emirati well-keeper, grey beard, holding a well rope and leather bucket"),
        ("Sheikh Mutlaq", "proud ruler of Ubar", "proud old Arab sheikh on a dark throne, grey beard, black bisht with gold, gold ring on a chain, lantern-lit hall"),
        ("Zaid", "Hazza's little brother", "10-year-old Arab prince, brown skin, white kandura, holding a small herder's whistle"),
        ("Umm Shamma", "the palace cook of Ubar", "large cheerful Emirati cook in a black abaya with hair fully covered by a black shayla, flour on her hands, holding a tray of honey cakes"),
        ("Hessa", "Nadim's wife, the newborn's mother", "young Emirati mother in black abaya, hair fully covered by black shayla, gold face mask, holding a newborn baby, frightened eyes"),
        ("The Eldest", "the giant silent bodyguard", "giant silent Arab warrior in grey robes, smooth white faceless mask, huge curved sword"),
        ("Ghadban", "the first bearer, the angry shepherd", "Omani shepherd boy of the Hajar mountains, brown skin, angry eyes, ragged goat-hair cloak, black smoke curling from his hands"),
        ("Suhail", "the half-emptied stable boy", "12-year-old Arab stable boy with jug-handle ears, half his face ash-grey, one blank white eye"),
        ("Old Nadim at the fire", "the teller, decades later", "very old Emirati Bedouin storyteller with white beard, brown bisht, pouring coffee from a brass dallah by a fire, an old saluki with one scarred eye at his feet"),
        ("The boy at the fire", "the one no one saw arrive", "small boy at the edge of firelight in a white dishdasha, face in shadow, donkey hooves showing under the hem"),
    ],
    'The Evil Ones From Below': [
        ("The Sealed King", "bound beneath Ubar", "colossal figure of black smokeless fire with ember eyes, chained inside a giant cracked brass vessel in a limestone cavern, a broken brass seal on its forehead"),
        ("Ash-Mouth", "eats names", "tall gaunt monster made of grey ash, no eyes, no hair, a huge gaping mouth spilling grey ash and floating Arabic-like letters, cracked grey skin, inhuman"),
        ("The Smiling Hunger", "puts people on", "tall shadow monster in tattered black robes, its head covered by several pale stolen human faces stacked like masks, the front face with an impossibly wide grin from ear to ear"),
        ("The Thousand-Voiced", "speaks with the voices of the dead", "towering column of black smoke covered in dozens of open screaming human mouths, at night in the desert"),
        ("The Heavy One", "master of the Sitters", "hunched massive creature of black stone and shadow with glowing eyes, squatting on a sleeping man's chest"),
        ("Old Thorn", "guards stolen treasure", "monstrous non-human creature like a twisted dead acacia tree with a skull-like face of bark, body of black thorns and dry branches, gold coins and jewels caught in its thorns, long thorn claws, half buried in desert sand, not a woman, not human"),
        ("The Lady of the Crossroads", "waits where night roads meet; lures men", "beautiful woman fully covered in a modest long gold-embroidered black bridal abaya with long sleeves, hair completely covered by a black shayla, only her face showing, standing alone where two desert tracks cross at night, coils of oud perfume smoke, hands ending in long curved sickle blades, a hint of rot at the edge of her face"),
        ("The Deep Caller", "drags divers under", "giant pale half-fish half-man sea creature covered in barnacles, white eyes, long webbed arms rising from dark water"),
        ("The Noon Mare", "takes children at noon", "creepy creature: upper body of a pale woman in a long faded modest Arab dress with long sleeves and her hair fully covered by a dark headscarf, face in shadow, lower body and legs of a grey donkey with hooves, centaur-like, in white noon heat haze in an empty mud-brick lane"),
        ("The Lantern Man", "leads travellers to die", "very tall thin dark figure with no face holding a glowing lantern among night dunes"),
        ("The Cradle Mother", "comes for newborns", "gaunt woman fully covered in a long black abaya with hair completely covered by a black veil, empty reaching arms in long sleeves, cracked lips, standing at a tent doorway at night"),
        ("The Halfman", "hunts on the salt", "horrifying creature that is exactly half of a man cut vertically down the middle, only one eye, one arm and one leg, the cut side dark and smoky, hopping on its single leg across white salt flats at night"),
        ("Ember Hounds", "packs that track the Light", "pack of jackals made of shadow with burning ember eyes and smoking fur"),
        ("The Black Wind", "the great storm", "enormous black tornado of sand towering over the desert like a mountain, a giant screaming face formed inside the swirling sand, tiny camel caravan below being sucked in, no animals in foreground"),
        ("The Twin", "Theyab's other self", "two identical Emirati teenage boys in sand-coloured kandura, one normal with brown skin, the other his mirror double behind him with ash-grey skin and completely black eyes and a cruel smile"),
        ("The Worn", "the possessed", "Emirati man possessed, eyes rolled completely white, black smoke leaking from his mouth, unnatural twisted pose"),
    ],
    'The Good Ones From Below': [
        ("The Sand-Mother", "raised Theyab in the Quiet Country", "tall gentle woman with gazelle-like face and glowing gold eyes, modest long white robes with long sleeves, hair fully covered by a white veil, her feet not touching the sand, warm golden glow, a gazelle beside her"),
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

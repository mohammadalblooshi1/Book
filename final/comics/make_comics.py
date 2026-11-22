"""Build anime comic pages for Part I from comic-prompts-part-I.md.

Generates each panel with the free Pollinations image service, lays the
panels out on a page, and draws speech bubbles and caption boxes.
Re-running skips panels that already exist.
"""
import os, re, sys, time, textwrap, urllib.parse, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'comic-prompts-part-I.md')
PANELS = os.path.join(HERE, 'panels')
PAGES = os.path.join(HERE, 'pages')
os.makedirs(PANELS, exist_ok=True); os.makedirs(PAGES, exist_ok=True)

STYLE = ("anime style, fully clothed, modest, family-friendly, no nudity, Arab Emirati and Omani Bedouin people with brown skin and Arab features, the characters are men and boys unless a woman is named, men and boys have short hair and bare heads, manga illustration, cel shading, sharp clean lineart, cinematic lighting, "
         "detailed, 1920s Arabian desert of UAE and Oman, horror atmosphere, no text, no letters, no speech bubbles")
CHARS = [
    (r"\bTheyab\b|teenage boy(?!.*Nadim)", "Theyab: a male teenage boy, 15-year-old Emirati Bedouin boy, brown sun-darkened skin, thick black eyebrows, short black hair, light amber-gold eyes, thin face, ragged sand-coloured kandura robe, faint glowing golden feather mark on his chest"),
    (r"small boy|7-year-old", "small Emirati Bedouin boy with brown skin and black hair"),
    (r"Ghareeb|saluki|\bdog\b", "Ghareeb: lean Arabian saluki hound, sand-coloured, long feathered ears and tail, slender long face, one amber eye and one glowing silver eye"),
    (r"Umm Hanan", "Umm Hanan: old Emirati widow in black abaya and black shayla, gold metallic face mask burqa over nose and mouth, kind tired eyes, wrinkled brown hands"),
    (r"Hilal", "Mutawwa Hilal: a thin old man, very dark sun-blackened skin, white trimmed beard, brown goat-hair cloak, wooden walking stick, leather satchel"),
    (r"Bakhit", "Old Bakhit: an ancient blind old man, Bedouin healer, milky white eyes, short white hair and long white beard, deep wrinkles, tent full of hanging herbs and brass bells"),
    (r"Ghanim", "Ghanim: a fat middle-aged man, Emirati trader, orange henna-dyed beard, white kandura, gold rings, crooked brass scales"),
    (r"Haddaj", "Haddaj: an old gaunt man, Bedouin sorcerer, dark bisht, hawk nose, clay under his fingernails, battered leather book"),
    (r"Nadim", "Nadim: a male teenage boy, broad Emirati Bedouin boy, brown skin, short black hair, white kandura, hard proud face"),
    (r"Shibl", "Shibl: a little boy, small 7-year-old Emirati boy, brown skin, black hair, huge dark eyes, blue bead on a string"),
    (r"Saqi", "Saqi: a heavy middle-aged man, Emirati well-keeper, grey beard, white kandura"),
    (r"old man|teller", "a very old man, Emirati Bedouin storyteller, white beard, brown bisht, face in firelight"),
    (r"villager|crowd|men\b", "Emirati Bedouin villagers, men with short black hair and no headdress in white kandura, women fully covered in black abaya with hair covered by black shayla"),
    (r"Noon Mare|legs are wrong|donkey", "the Noon Mare: pale woman in a long modest dress with her hair fully covered by a dark headscarf, whose lower body is donkey legs with hooves, standing in noon heat-shimmer"),
    (r"Lamp-Keeper|protecting Umm Hanan's lamp", "the Lamp-Keeper: small hooded figure made of warm amber light cupping a lamp flame with both hands"),
    (r"gazelle", "the Sand-Guide: graceful desert gazelle with glowing gold eyes, soft golden light around it"),
    (r"emptied|grey-skinned|white-eyed|white eyes", "emptied people: ash-grey skin, blank white eyes, colourless clothes, standing still, eerie"),
    (r"possessed|Worn", "possessed man: eyes rolled completely white, black smoke leaking from his mouth, unnatural pose"),
    (r"grey mist|the grey|Grey", "flat ash-grey fog that drains all colour from everything it touches"),
    (r"masked|masks", "the Nameless: riders in grey robes with smooth white faceless masks on pale camels"),
    (r"hoofprints|hoof-prints", "small donkey hoofprints in the sand"),
]
FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_I = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
W, H, M, HEAD = 1200, 1800, 24, 84


def parse():
    pages, chap = [], ''
    cur = None
    for line in open(SRC, encoding='utf-8'):
        line = line.rstrip('\n')
        m = re.match(r'^## CHAPTER (\d+): (.+)$', line)
        if m:
            chap = f"Chapter {m.group(1)}: {m.group(2).title()}"
            continue
        m = re.match(r'^### Page (\d+)$', line)
        if m:
            cur = {'n': int(m.group(1)), 'chap': chap, 'panels': []}
            pages.append(cur)
            continue
        m = re.match(r'^> Panel \d+(?: \(([^)]*)\))?: (.+)$', line)
        if m and cur is not None:
            cur['panels'].append({'tag': (m.group(1) or '').lower(), 'text': m.group(2)})
    return pages


def split_text(t):
    """Return (scene description, [(kind, text)]) from one panel line."""
    bubbles = []
    for kind, txt in re.findall(r'(Caption|Speech[^:"]*|[A-Z][a-zA-Z\' ]{1,20}):\s*"([^"]+)"', t):
        bubbles.append(('caption' if kind.startswith('Caption') else 'speech', txt))
    if not bubbles:
        for txt in re.findall(r'"([^"]{2,90})"', t):
            bubbles.append(('speech', txt))
    scene = re.sub(r'(Caption|Speech[^:"]*|[A-Z][a-zA-Z\' ]{1,20}):\s*"[^"]*"', '', t)
    scene = re.sub(r'"[^"]*"', '', scene)
    scene = re.sub(r'\s+', ' ', scene).strip(' .:')
    return scene, bubbles


def gen(prompt, w, h, path, seed):
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        return True
    url = ("https://image.pollinations.ai/prompt/" + urllib.parse.quote(prompt[:900]) +
           f"?width={w}&height={h}&nologo=true&seed={seed}&model=turbo")
    for attempt in range(8):
        r = subprocess.run(['curl', '-sS', '--max-time', '180', '-o', path, '-w', '%{http_code}', url],
                           capture_output=True, text=True)
        if r.stdout == '200' and os.path.getsize(path) > 5000:
            return True
        time.sleep(15 + attempt * 10)
    if os.path.exists(path):
        os.remove(path)
    return False


def layout(panels):
    rows, i = [], 0
    while i < len(panels):
        t = panels[i]['tag']
        if any(k in t for k in ('wide', 'big', 'tall', 'hook')) or i == len(panels) - 1:
            rows.append([i]); i += 1
        else:
            rows.append([i, i + 1]); i += 2
    weights = [1.6 if any(k in panels[r[0]]['tag'] for k in ('big', 'tall')) and len(r) == 1 else 1.0 for r in rows]
    avail = H - HEAD - M * (len(rows) + 1)
    boxes, y = {}, HEAD + M
    for r, wt in zip(rows, weights):
        rh = int(avail * wt / sum(weights))
        cw = (W - M * (len(r) + 1)) // len(r)
        for j, idx in enumerate(r):
            boxes[idx] = (M + j * (cw + M), y, cw, rh)
        y += rh + M
    return boxes


def draw_bubbles(d, box, bubbles):
    x, y, w, h = box
    cy = y + 12
    for k, (kind, txt) in enumerate(bubbles):
        f = ImageFont.truetype(FONT_I if kind == 'caption' else FONT_B, 22)
        lines = textwrap.wrap(txt, width=max(16, int(w / 15)))
        lh = 28
        bw = min(w - 30, max(d.textlength(l, font=f) for l in lines) + 30)
        bh = lh * len(lines) + 20
        bx = x + 12 if (kind == 'caption' or k % 2 == 0) else x + w - bw - 12
        if cy + bh > y + h - 10:
            break
        if kind == 'caption':
            d.rectangle([bx, cy, bx + bw, cy + bh], fill=(250, 236, 190), outline='black', width=3)
        else:
            d.rounded_rectangle([bx, cy, bx + bw, cy + bh], radius=22, fill='white', outline='black', width=3)
        for n, l in enumerate(lines):
            d.text((bx + 15, cy + 10 + n * lh), l, font=f, fill='black')
        cy += bh + 10


def build_page(pg):
    out = os.path.join(PAGES, f"page-{pg['n']:02d}.png")
    boxes = layout(pg['panels'])
    page = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(page)
    d.rectangle([0, 0, W, HEAD], fill=(20, 12, 10))
    d.text((M, 24), pg['chap'], font=ImageFont.truetype(FONT_I, 32), fill=(230, 210, 180))
    d.text((W - 150, 30), f"Page {pg['n']}", font=ImageFont.truetype(FONT_B, 22), fill=(180, 160, 140))
    ok = True
    for i, p in enumerate(pg['panels']):
        x, y, w, h = boxes[i]
        scene, bubbles = split_text(p['text'])
        chars = [desc for pat, desc in CHARS if re.search(pat, p['text'])]
        prompt = f"{STYLE}. {scene}. " + ". ".join(chars)
        gw, gh = max(256, min(1024, w // 64 * 64)), max(256, min(1024, h // 64 * 64))
        path = os.path.join(PANELS, f"p{pg['n']:02d}-{i + 1}.jpg")
        if gen(prompt, gw, gh, path, seed=4100 + pg['n'] * 10 + i):
            img = ImageOps.fit(Image.open(path).convert('RGB'), (w, h))
            page.paste(img, (x, y))
        else:
            ok = False
            d.rectangle([x, y, x + w, y + h], fill=(40, 40, 40))
        d.rectangle([x, y, x + w, y + h], outline='black', width=6)
        draw_bubbles(d, boxes[i], bubbles)
    d.text((W - 330, H - 20), 'Panel art: pollinations.ai (free)', font=ImageFont.truetype(FONT_B, 13), fill=(120, 120, 120))
    page.save(out)
    print(f"page {pg['n']}: {'ok' if ok else 'MISSING PANELS'}", flush=True)
    return ok


if __name__ == '__main__':
    only = set(int(a) for a in sys.argv[1:])
    for pg in parse():
        if not only or pg['n'] in only:
            build_page(pg)

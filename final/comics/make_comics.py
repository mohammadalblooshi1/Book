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

STYLE = ("anime style, Arab Bedouin characters with brown skin, manga illustration, cel shading, sharp clean lineart, cinematic lighting, "
         "detailed, 1920s Arabian desert of UAE and Oman, horror atmosphere, no text, no letters, no speech bubbles")
CHARS = [
    (r"\bTheyab\b|\bboy\b(?!.*Shibl)", "Arab teenage boy with messy sun-bleached hair, light golden eyes, ragged sand-coloured kandura robe, faint glowing golden feather mark on his chest"),
    (r"Ghareeb|saluki|\bdog\b", "lean sand-coloured saluki dog with feathered ears, one amber eye and one glowing silver eye"),
    (r"Umm Hanan", "old Arab widow in black abaya and gold face mask, kind tired eyes"),
    (r"Hilal", "thin old Arab man with white beard, goat-hair cloak and walking stick"),
    (r"Bakhit", "very old blind Arab healer with milky white eyes and long white beard"),
    (r"Ghanim", "fat Arab trader with hennaed beard"),
    (r"Haddaj", "old hooded Bedouin sorcerer with clay-stained hands and a battered book"),
    (r"Nadim", "broad Arab teenage boy in white kandura"),
    (r"Shibl", "small Arab boy aged seven with big eyes"),
    (r"Saqi", "heavy Arab man with grey beard"),
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

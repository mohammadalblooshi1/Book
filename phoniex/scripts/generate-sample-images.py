"""Generates the illustrated sample-listing images in seed/images/.
Run: python3 scripts/generate-sample-images.py   (needs Pillow)
All images are original illustrations, watermarked as samples."""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "seed", "images")
os.makedirs(OUT, exist_ok=True)
W, H = 1200, 800

def font(size):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gradient(d, box, top, bottom):
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        d.line([(x0, y), (x1, y)], fill=lerp(top, bottom, (y - y0) / max(1, y1 - y0)))

def watermark(im, text="Illustration · sample listing"):
    d = ImageDraw.Draw(im, "RGBA")
    f = font(max(14, im.width // 70))
    tw = d.textlength(text, font=f)
    pad = 10
    d.rounded_rectangle([im.width - tw - 3 * pad, im.height - 2 * pad - f.size - 6, im.width - pad, im.height - pad], 8, fill=(0, 0, 0, 120))
    d.text((im.width - tw - 2 * pad, im.height - 1.5 * pad - f.size - 4), text, font=f, fill=(255, 255, 255, 230))

def palm(d, x, base, h, lean=1):
    pts = [(x + lean * 18 * math.sin(t / 10 * math.pi / 2), base - h * t / 10) for t in range(11)]
    for i in range(10):
        d.line([pts[i], pts[i + 1]], fill=(120, 88, 55), width=max(6, int(14 - i)))
    cx, cy = pts[-1]
    for a in range(0, 360, 40):
        r = math.radians(a)
        tip = (cx + math.cos(r) * h * 0.38, cy + math.sin(r) * h * 0.18 + 18)
        mid = (cx + math.cos(r) * h * 0.2, cy + math.sin(r) * h * 0.1 - 10)
        d.polygon([(cx, cy), mid, tip, (mid[0], mid[1] + 14)], fill=(52, 128, 66))

def sky_and_ground(d, sky=((120, 180, 235), (225, 238, 248)), ground=(226, 205, 160), horizon=560):
    gradient(d, (0, 0, W, horizon), *sky)
    d.rectangle([0, horizon, W, H], fill=ground)
    d.ellipse([980, 70, 1060, 150], fill=(255, 236, 170))

def window(d, box, frame=(60, 66, 80)):
    x0, y0, x1, y1 = box
    gradient(d, (x0, y0, x1, y1), (110, 160, 200), (190, 220, 240))
    d.rectangle(box, outline=frame, width=4)
    d.polygon([(x0 + 6, y1 - 6), (x0 + (x1 - x0) * 0.45, y0 + 6), (x0 + (x1 - x0) * 0.6, y0 + 6), (x0 + 6 + (x1 - x0) * 0.15, y1 - 6)], fill=(230, 242, 250))

def villa(name, wall, accent, pool=True, palms=2, sky=None):
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    sky_and_ground(d, sky=sky or ((120, 180, 235), (225, 238, 248)))
    d.rectangle([0, 600, W, H], fill=(196, 176, 134))
    d.rectangle([60, 520, 1140, 620], fill=lerp(wall, (255, 255, 255), 0.3))  # boundary wall
    d.rectangle([250, 300, 760, 600], fill=wall)                              # ground floor
    d.rectangle([380, 170, 900, 300], fill=lerp(wall, (255, 255, 255), 0.15))  # upper floor
    d.rectangle([360, 158, 920, 176], fill=accent); d.rectangle([230, 290, 780, 306], fill=accent)
    for x in (420, 560, 700, 790): window(d, (x, 195, x + 80, 280))
    window(d, (290, 350, 520, 560)); window(d, (560, 350, 640, 560))
    d.rectangle([665, 420, 735, 600], fill=accent)                             # door
    d.rectangle([760, 380, 1000, 600], fill=lerp(wall, (0, 0, 0), 0.08))       # garage wing
    d.rectangle([790, 430, 970, 600], fill=(170, 170, 175))
    for y in range(445, 600, 22): d.line([(790, y), (970, y)], fill=(150, 150, 158), width=2)
    if pool:
        d.polygon([(120, 700), (1080, 700), (1140, 790), (60, 790)], fill=(70, 170, 215))
        for i in range(6): d.arc([200 + i * 150, 720, 300 + i * 150, 760], 200, 340, fill=(200, 235, 250), width=3)
    for i in range(palms): palm(d, 130 + i * 900, 600, 330, lean=1 if i % 2 == 0 else -1)
    watermark(im); im.save(os.path.join(OUT, name), quality=82)

def tower(name, sea=True, color=(205, 215, 225), night=False):
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    gradient(d, (0, 0, W, H), (25, 35, 80) if night else (110, 170, 230), (240, 150, 110) if night else (220, 236, 248))
    for i, (x, w, h) in enumerate([(30, 140, 360), (190, 120, 300), (820, 160, 420), (1000, 150, 330)]):
        d.rectangle([x, H - 160 - h, x + w, H - 160], fill=(150, 165, 185) if not night else (45, 55, 85))
    d.rectangle([430, 60, 760, 640], fill=color)
    d.polygon([(430, 60), (595, 10), (760, 60)], fill=lerp(color, (0, 0, 0), 0.15))
    for y in range(90, 620, 34):
        for x in range(450, 740, 36):
            lit = night and random.random() < 0.6
            d.rectangle([x, y, x + 26, y + 22], fill=(255, 214, 120) if lit else ((80, 130, 175) if not night else (35, 45, 70)))
    if sea:
        gradient(d, (0, 640, W, H), (40, 120, 170), (20, 80, 130))
        for i in range(14): d.line([(random.randint(0, W), random.randint(660, 790)), (random.randint(0, W), random.randint(660, 790))], fill=(120, 190, 220), width=2)
        d.polygon([(860, 700), (990, 700), (960, 730), (880, 730)], fill=(250, 250, 250)); d.line([(925, 640), (925, 700)], fill=(240, 240, 240), width=4)
    else:
        d.rectangle([0, 640, W, H], fill=(90, 95, 105))
    watermark(im); im.save(os.path.join(OUT, name), quality=82)

def townhouses(name, wall=(236, 222, 200), accent=(150, 110, 80)):
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    sky_and_ground(d, horizon=600); d.rectangle([0, 640, W, H], fill=(110, 170, 90))
    for i in range(4):
        x = 60 + i * 270
        d.rectangle([x, 300, x + 250, 640], fill=wall if i % 2 == 0 else lerp(wall, (255, 255, 255), 0.35))
        d.polygon([(x - 10, 300), (x + 125, 210), (x + 260, 300)], fill=accent)
        window(d, (x + 30, 340, x + 110, 430)); window(d, (x + 140, 340, x + 220, 430))
        window(d, (x + 30, 480, x + 110, 570)); d.rectangle([x + 150, 490, x + 210, 640], fill=accent)
    palm(d, 1150, 660, 260, lean=-1)
    watermark(im); im.save(os.path.join(OUT, name), quality=82)

def land(name):
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    sky_and_ground(d, horizon=430, ground=(232, 208, 160))
    for i in range(40):
        x = random.randint(0, W); y = random.randint(450, H)
        d.ellipse([x, y, x + random.randint(30, 120), y + random.randint(6, 18)], fill=(220, 192, 140))
    pts = [(150, 520), (1050, 500), (1120, 760), (80, 770)]
    for a, b in zip(pts, pts[1:] + pts[:1]): d.line([a, b], fill=(200, 60, 40), width=5)
    for p in pts: d.rectangle([p[0] - 5, p[1] - 40, p[0] + 5, p[1]], fill=(120, 90, 60))
    d.rectangle([520, 440, 760, 540], fill=(250, 250, 250), outline=(60, 60, 60), width=3); d.line([(640, 540), (640, 610)], fill=(90, 90, 90), width=8)
    d.text((545, 470), "PLOT FOR SALE", font=font(26), fill=(200, 60, 40))
    watermark(im); im.save(os.path.join(OUT, name), quality=82)

def interior(name, kind, wall=(238, 232, 222), floor=(200, 170, 135), accent=(70, 110, 150)):
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 560], fill=wall); gradient(d, (0, 560, W, H), floor, lerp(floor, (0, 0, 0), 0.2))
    for x in range(-400, W + 400, 140): d.line([(W / 2 + (x - W / 2) * 0.35, 560), (x, H)], fill=lerp(floor, (0, 0, 0), 0.12), width=2)
    window(d, (760, 110, 1110, 470))
    if kind in ("living", "office"):
        for i, (x, h) in enumerate([(790, 120), (860, 200), (930, 160), (1000, 240), (1060, 140)]):
            d.rectangle([x, 470 - h, x + 50, 470], fill=(120, 150, 185))
    if kind == "living":
        d.rounded_rectangle([140, 430, 640, 600], 30, fill=accent); d.rounded_rectangle([110, 470, 670, 640], 30, fill=lerp(accent, (0, 0, 0), 0.15))
        d.ellipse([200, 650, 600, 760], fill=(225, 205, 175)); d.rectangle([330, 640, 470, 690], fill=(140, 100, 70))
        d.line([(700, 300), (700, 600)], fill=(80, 80, 80), width=6); d.polygon([(660, 300), (740, 300), (720, 250), (680, 250)], fill=(250, 225, 160))
    elif kind == "bedroom":
        d.rectangle([260, 300, 760, 470], fill=lerp(accent, (255, 255, 255), 0.2))
        d.rounded_rectangle([230, 440, 790, 680], 20, fill=(250, 250, 248)); d.rectangle([230, 560, 790, 680], fill=accent)
        d.rounded_rectangle([290, 470, 480, 530], 18, fill=(235, 235, 235)); d.rounded_rectangle([540, 470, 730, 530], 18, fill=(235, 235, 235))
        for x in (120, 820): d.rectangle([x, 520, x + 100, 640], fill=(160, 120, 90)); d.ellipse([x + 30, 470, x + 70, 520], fill=(250, 225, 160))
    elif kind == "kitchen":
        d.rectangle([0, 200, 720, 380], fill=(250, 250, 250)); d.rectangle([0, 450, 720, 600], fill=(250, 250, 250))
        for x in range(0, 720, 120): d.rectangle([x + 8, 208, x + 112, 372], outline=(210, 210, 210), width=3); d.rectangle([x + 8, 458, x + 112, 592], outline=(210, 210, 210), width=3)
        d.rectangle([0, 430, 720, 450], fill=(70, 70, 75)); d.rectangle([260, 600, 900, 720], fill=accent); d.rectangle([240, 585, 920, 605], fill=(60, 60, 65))
        for x in (380, 580, 780): d.line([(x, 0), (x, 420)], fill=(40, 40, 40), width=3); d.polygon([(x - 30, 420), (x + 30, 420), (x + 15, 385), (x - 15, 385)], fill=(40, 40, 40))
    elif kind == "office":
        for x in (120, 420): d.rectangle([x, 560, x + 260, 580], fill=(240, 240, 240)); d.rectangle([x + 20, 580, x + 30, 680], fill=(90, 90, 90)); d.rectangle([x + 230, 580, x + 240, 680], fill=(90, 90, 90)); d.rectangle([x + 80, 470, x + 180, 550], fill=(40, 45, 55))
        d.rectangle([0, 0, 90, 700], fill=(200, 225, 235)); d.line([(90, 0), (90, 700)], fill=(150, 160, 170), width=4)
    elif kind == "garden":
        d.rectangle([0, 0, W, 560], fill=(150, 200, 240)); d.rectangle([0, 380, W, 560], fill=wall)
        d.polygon([(150, 600), (1050, 600), (1150, 780), (50, 780)], fill=(70, 170, 215))
        for x in (200, 420): d.polygon([(x, 560), (x + 160, 560), (x + 190, 600), (x + 30, 600)], fill=(250, 250, 250))
        palm(d, 1080, 600, 380, lean=-1); palm(d, 80, 600, 300)
    watermark(im); im.save(os.path.join(OUT, name), quality=82)

def pano(name, wall, floor, ceiling=(246, 244, 240), accent=(70, 110, 150), outdoor=False):
    PW, PH = 2048, 1024
    im = Image.new("RGB", (PW, PH)); d = ImageDraw.Draw(im)
    top, bottom = int(PH * 0.36), int(PH * 0.62)
    if outdoor: gradient(d, (0, 0, PW, top + 60), (90, 160, 230), (210, 232, 248))
    else: d.rectangle([0, 0, PW, top], fill=ceiling)
    d.rectangle([0, top, PW, bottom], fill=wall)
    gradient(d, (0, bottom, PW, PH), floor, lerp(floor, (0, 0, 0), 0.25))
    for x in range(0, PW, 64): d.line([(x, bottom), (x, PH)], fill=lerp(floor, (0, 0, 0), 0.12), width=2)
    for k in range(4):  # four walls
        cx = k * PW // 4 + PW // 8
        d.line([(k * PW // 4, top - 40), (k * PW // 4, bottom + 40)], fill=lerp(wall, (0, 0, 0), 0.18), width=4)
        if k == 0: window(d, (cx - 170, top + 10, cx + 170, bottom - 30))
        elif k == 1: d.rounded_rectangle([cx - 200, bottom - 120, cx + 200, bottom + 10], 20, fill=accent)
        elif k == 2: d.rectangle([cx - 60, top + 40, cx + 60, bottom + 30], fill=lerp(wall, (90, 60, 40), 0.7))
        else:
            for i in range(3): d.rectangle([cx - 150 + i * 110, top + 40, cx - 70 + i * 110, top + 140], fill=lerp(accent, (255, 255, 255), 0.4), outline=(90, 90, 90), width=3)
    if outdoor:
        d.rectangle([0, bottom + 40, PW, bottom + 220], fill=(70, 170, 215))
        for i in range(4): palm(d, 300 + i * 500, bottom + 20, 300)
    if not outdoor:
        for k in range(4): d.ellipse([k * PW // 4 + PW // 8 - 40, 30, k * PW // 4 + PW // 8 + 40, 70], fill=(255, 240, 200))
    watermark(im, "360° illustration · sample listing")
    im.save(os.path.join(OUT, name), quality=80)

random.seed(7)
villa("villa-sand.jpg", (236, 222, 196), (120, 95, 70))
villa("villa-white.jpg", (245, 245, 242), (60, 70, 85), sky=((90, 150, 220), (210, 230, 250)))
villa("villa-terracotta.jpg", (226, 190, 160), (150, 80, 50), pool=False, palms=2)
villa("villa-grey.jpg", (215, 218, 222), (40, 45, 55), sky=((240, 160, 110), (250, 220, 170)))
tower("tower-marina.jpg"); tower("tower-city.jpg", sea=False, color=(190, 200, 215)); tower("tower-night.jpg", night=True)
townhouses("townhouses.jpg"); townhouses("townhouses-modern.jpg", wall=(230, 230, 228), accent=(80, 85, 95))
land("land.jpg")
interior("living-blue.jpg", "living"); interior("living-sage.jpg", "living", accent=(110, 140, 110), floor=(185, 160, 130))
interior("bedroom.jpg", "bedroom"); interior("bedroom-warm.jpg", "bedroom", accent=(170, 110, 90))
interior("kitchen.jpg", "kitchen"); interior("kitchen-dark.jpg", "kitchen", accent=(60, 65, 75))
interior("office.jpg", "office", wall=(235, 238, 242), floor=(150, 150, 155))
interior("garden.jpg", "garden")
pano("pano-living.jpg", (236, 230, 220), (196, 166, 130))
pano("pano-bedroom.jpg", (228, 222, 236), (180, 150, 120), accent=(150, 100, 90))
pano("pano-terrace.jpg", (240, 232, 215), (210, 190, 150), outdoor=True)
print("generated", len(os.listdir(OUT)), "images")

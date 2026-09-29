"""Assemble the painted panels into comic pages with captions and speech balloons.
Text from the script (dante_three_scene_script_it_v2): narrator = cream caption box, characters = white
balloons with a tail and a small name tag in the character's script colour (Bart: narrator plain,
characters coloured). Panel ids refer to panels/<id>.png (paint_panels.py); "crop" zooms into a panel.
usage: python3 pages.py            -> ../Dante/comic/page_01.png ... + comic_contact.jpg"""
import json, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = Path("/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets")
PANELS = ROOT / "Dante/comic/panels"
OUT = ROOT / "Dante/comic"
FONT_B, FONT_R, FONT_H = (str(ROOT / "_fonts" / f) for f in ("ComicNeue-Bold.ttf", "ComicNeue-Regular.ttf", "PatrickHand-Regular.ttf"))

PAGE_W, MARGIN, GUTTER = 1800, 60, 34
INK, PAPER, CAPTION = (30, 26, 22), (250, 247, 240), (246, 236, 208)
WHO = {  # name tag colours (script view)
    "DANTE": (52, 92, 170), "BEATRICE": (214, 120, 40), "GUIDO": (140, 36, 66), "PRIORE": (46, 120, 80),
    "VIRGILIO": (90, 110, 140),
}


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(text, f, width_px, draw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=f) <= width_px:
            cur = t
        else:
            lines.append(cur); cur = w
    return lines + [cur] if cur else lines


def caption(img, text, xy, max_w, tag=None, s=1.0):
    """Cream narrator box; tag (e.g. 'NEL POEMA · ...') in small caps on a dark band above it."""
    d = ImageDraw.Draw(img)
    f = font(FONT_H, round(40 * s)); lh = round(46 * s)
    lines = wrap(text, f, max_w - 40, d) if text else []
    h = len(lines) * lh + round(28 * s) if lines else 0
    x, y = xy
    if tag:
        ft = font(FONT_B, round(28 * s))
        tw = d.textlength(tag, font=ft) + 36
        d.rectangle([x, y, x + tw, y + round(46 * s)], fill=INK)
        d.text((x + 18, y + round(8 * s)), tag, font=ft, fill=PAPER)
        y += round(46 * s)
    if lines:
        w = max(d.textlength(l, font=f) for l in lines) + 40
        d.rectangle([x, y, x + w, y + h], fill=CAPTION, outline=INK, width=3)
        for i, l in enumerate(lines):
            d.text((x + 20, y + round(12 * s) + i * lh), l, font=f, fill=INK)


def balloon(img, who, text, centre, tail, max_w=560, verse=False, s=1.0):
    """White speech balloon centred at `centre` with a tail to `tail` (panel pixels)."""
    d = ImageDraw.Draw(img)
    f = font(FONT_R if verse else FONT_B, round(40 * s)); lh = round(48 * s)
    lines = wrap(text, f, max_w, d)
    tw = max(d.textlength(l, font=f) for l in lines)
    bw, bh = tw + round(70 * s), len(lines) * lh + round(44 * s)
    pad, th0 = round(18 * s), round(18 * s)
    cx = min(max(centre[0], pad + bw / 2), img.width - pad - bw / 2)      # keep the whole balloon (and its
    cy = min(max(centre[1], pad + th0 + bh / 2), img.height - pad - bh / 2)   # name tag) inside the panel
    x0, y0 = cx - bw / 2, cy - bh / 2
    # tail first (under the balloon), as a curved wedge
    base = 0.18 * bw
    tx, ty = tail
    bx = min(max(tx, x0 + bw * 0.25), x0 + bw * 0.75)
    by = y0 + bh if ty > cy else y0
    d.polygon([(bx - base / 2, by), (bx + base / 2, by), (tx, ty)], fill="white", outline=INK)
    d.line([(bx - base / 2, by), (tx, ty), (bx + base / 2, by)], fill=INK, width=4)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=bh / 2 if len(lines) == 1 else 46, fill="white", outline=INK, width=4)
    d.polygon([(bx - base / 2 + 4, by + (3 if ty < cy else -3)), (bx + base / 2 - 4, by + (3 if ty < cy else -3)),
               (tx + (bx - tx) * 0.15, ty + (by - ty) * 0.15)], fill="white")
    for i, l in enumerate(lines):
        lw = d.textlength(l, font=f)
        d.text((cx - lw / 2, y0 + round(22 * s) + i * lh), l, font=f, fill=INK)
    # name tag on the balloon's top edge
    ft = font(FONT_B, round(24 * s)); th = round(16 * s)
    nw = d.textlength(who, font=ft) + 24
    d.rounded_rectangle([x0 + 28, y0 - th, x0 + 28 + nw, y0 + th], radius=th, fill=WHO.get(who, INK))
    d.text((x0 + 40, y0 - th + 3), who, font=ft, fill="white")


def panel(spec, w):
    im = Image.open(PANELS / (spec["id"] + ".png")).convert("RGB")
    if "crop" in spec:
        l, t, r, b = spec["crop"]
        im = im.crop((int(l * im.width), int(t * im.height), int(r * im.width), int(b * im.height)))
    h = round(w * 9 / 16)
    im = im.resize((w, h), Image.LANCZOS)
    P = lambda xy: (xy[0] * w, xy[1] * h)
    s = max(0.78, w / 1680)          # lettering stays readable in half-width panels
    for c in spec.get("captions", []):
        x, y = P(c.get("at", (0.02, 0.03)))
        caption(im, c.get("text", ""), (x, y), int(w * c.get("w", 0.62)), tag=c.get("tag"), s=s)
    for b in spec.get("balloons", []):
        balloon(im, b["who"], b["text"], P(b["at"]), P(b["tail"]), max_w=int(w * b.get("w", 0.34)), verse=b.get("verse", False), s=s)
    return im


def page(rows, n):
    inner = PAGE_W - 2 * MARGIN
    tiles = []
    for row in rows:
        k = len(row)
        pw = (inner - GUTTER * (k - 1)) // k
        tiles.append([panel(p, pw) for p in row])
    H = 2 * MARGIN + sum(r[0].height for r in tiles) + GUTTER * (len(tiles) - 1)
    pg = Image.new("RGB", (PAGE_W, H), PAPER)
    d = ImageDraw.Draw(pg)
    y = MARGIN
    for r in tiles:
        x = MARGIN
        for im in r:
            pg.paste(im, (x, y)); d.rectangle([x, y, x + im.width - 1, y + im.height - 1], outline=INK, width=5)
            x += im.width + GUTTER
        y += r[0].height + GUTTER
    d.text((PAGE_W - MARGIN - 20, H - MARGIN + 12), str(n), font=font(FONT_B, 28), fill=INK)
    return pg


if __name__ == "__main__":
    book = json.load(open(HERE / "book.json"))
    pages = []
    for i, rows in enumerate(book, 1):
        pg = page(rows, i)
        pg.save(OUT / ("page_%02d.png" % i)); pages.append(pg)
        print("page", i, pg.size)
    thumbs = [p.resize((600, round(p.height * 600 / p.width))) for p in pages]
    cols = 4
    rows_ = [thumbs[i:i + cols] for i in range(0, len(thumbs), cols)]
    H = sum(max(t.height for t in r) for r in rows_) + 20 * (len(rows_) + 1)
    sheet = Image.new("RGB", (cols * 620 + 20, H), (200, 196, 188))
    y = 20
    for r in rows_:
        x = 20
        for t in r:
            sheet.paste(t, (x, y)); x += 620
        y += max(t.height for t in r) + 20
    sheet.save(OUT / "comic_contact.jpg", quality=88)

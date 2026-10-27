"""Placeholder History Lines library for the 2.5D stage (src/stage25d) until the real bundles land.

Six transparent PNGs drawn procedurally (ink outline + flat wash + hatching) and a library.json in the
contract-1 shape, every asset flagged "placeholder". Deterministic (fixed seed).
    python3 scripts/make_placeholder_library.py   ->  public/library/_placeholder/
"""
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "public" / "library" / "_placeholder"
SS = 2  # supersample, then downsample: smooth alpha edges
INK = (58, 48, 44, 255)
rnd = random.Random(7)


def canvas(w, h):
    img = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def finish(img, name):
    w, h = img.size[0] // SS, img.size[1] // SS
    img.resize((w, h), Image.LANCZOS).save(OUT / name, optimize=True)
    return w, h


def wobbly(points, amp, seed):
    r = random.Random(seed)
    return [(x + r.uniform(-amp, amp), y + r.uniform(-amp, amp)) for x, y in points]


def hatch(d, box, mask, step, color, width):
    """Diagonal hatching inside mask (an L image) over box."""
    x0, y0, x1, y1 = box
    for k in range(int(x0 - (y1 - y0)), int(x1), step):
        pts = []
        for t in range(0, int(y1 - y0), 3):
            x, y = k + t, y0 + t
            inside = 0 <= x < mask.size[0] and 0 <= y < mask.size[1] and mask.getpixel((int(x), int(y))) > 128
            if inside:
                pts.append((x, y))
            elif len(pts) > 1:
                d.line(pts, fill=color, width=width); pts = []
            else:
                pts = []
        if len(pts) > 1:
            d.line(pts, fill=color, width=width)


def sky():
    w, h = 2048, 1024
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for y in range(h):
        t = y / h
        c = (int(150 + 80 * t), int(182 + 55 * t), int(206 + 30 * t), 255)
        for x in range(w):
            px[x, y] = c
    # soft wash clouds, wrapped across x so the strip tiles
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(26):
        cx, cy, r = rnd.uniform(0, w), rnd.uniform(80, h * 0.55), rnd.uniform(60, 160)
        for dx in (-w, 0, w):
            d.ellipse((cx + dx - r * 1.8, cy - r * 0.5, cx + dx + r * 1.8, cy + r * 0.5), fill=(250, 246, 236, 120))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(28)))
    img.save(OUT / "sky-day-01.png", optimize=True)
    return w, h


def hills():
    w, h = 2400, 700
    img, d = canvas(w, h)
    W, H = w * SS, h * SS
    # periodic ridge: sum of sines with whole periods over W, so the strip tiles
    def ridge(x):
        return H * 0.42 + sum(a * math.sin(2 * math.pi * k * x / W + p) for k, a, p in ((1, 70, 0.3), (3, 40, 1.7), (7, 14, 0.4))) * SS / 2
    top = [(x, ridge(x)) for x in range(0, W + 1, 8)]
    poly = top + [(W, H), (0, H)]
    d.polygon(poly, fill=(128, 146, 104, 255))
    mask = Image.new("L", (W, H)); ImageDraw.Draw(mask).polygon(poly, fill=255)
    hatch(d, (0, 0, W, H), mask, 26, (96, 110, 80, 200), 2)
    d.line(top, fill=INK, width=5)
    return finish(img, "hills-heath-01.png")


def hut():
    w, h = 900, 760
    img, d = canvas(w, h)
    W, H = w * SS, h * SS
    wall = wobbly([(W * .18, H * .55), (W * .82, H * .55), (W * .8, H * .99), (W * .2, H * .99)], 6, 1)
    roof = wobbly([(W * .05, H * .6), (W * .5, H * .04), (W * .95, H * .6)], 8, 2)
    d.polygon(wall, fill=(170, 140, 104, 255), outline=INK, width=6)
    d.polygon(roof, fill=(196, 168, 96, 255))
    mask = Image.new("L", (W, H)); ImageDraw.Draw(mask).polygon(roof, fill=255)
    thatch = Image.new("RGBA", (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(thatch)
    for k in range(-200, W, 22):  # thatch strokes, kept inside the roof
        td.line([(k, H * .05), (k + 120, H * .6)], fill=(150, 122, 70, 180), width=3)
    img.alpha_composite(Image.composite(thatch, Image.new("RGBA", (W, H), (0, 0, 0, 0)), mask))
    d = ImageDraw.Draw(img)
    d.line(roof + [roof[0]], fill=INK, width=7)
    d.rectangle((W * .44, H * .72, W * .56, H * .99), fill=(70, 52, 40, 255), outline=INK, width=5)
    return finish(img, "hut-farm-01.png")


def tree():
    w, h = 1100, 1500
    img, d = canvas(w, h)
    W, H = w * SS, h * SS
    trunk = wobbly([(W * .45, H), (W * .47, H * .45), (W * .53, H * .45), (W * .56, H)], 5, 3)
    d.polygon(trunk, fill=(110, 86, 64, 255), outline=INK, width=6)
    blobs = [(W * .5 + rnd.uniform(-.28, .28) * W, H * .32 + rnd.uniform(-.2, .14) * H, rnd.uniform(.14, .22) * W) for _ in range(14)]
    mask = Image.new("L", (W, H)); md = ImageDraw.Draw(mask)
    for x, y, r in blobs:
        md.ellipse((x - r, y - r * .85, x + r, y + r * .85), fill=255)
    crown = Image.new("RGBA", (W, H), (98, 132, 74, 255)); crown.putalpha(mask)
    img.alpha_composite(crown)
    d = ImageDraw.Draw(img)
    hatch(d, (0, 0, W, H), mask, 18, (70, 98, 56, 210), 2)
    edges = mask.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(5))
    ink = Image.new("RGBA", (W, H), INK); ink.putalpha(edges)
    img.alpha_composite(ink)
    return finish(img, "tree-oak-01.png")


def reeds():
    w, h = 1200, 600
    img, d = canvas(w, h)
    W, H = w * SS, h * SS
    for i in range(70):
        x = rnd.uniform(0.02, 0.98) * W
        top = H * rnd.uniform(0.05, 0.5)
        bend = rnd.uniform(-40, 40) * SS
        pts = [(x + bend * (1 - t) ** 2 * 0 + bend * t * t, H - (H - top) * t) for t in [k / 12 for k in range(13)]]
        d.line(pts, fill=(120, 132, 70, 255) if i % 3 else INK, width=5)
        if i % 4 == 0:
            ex, ey = pts[-1]
            d.ellipse((ex - 9, ey - 30, ex + 9, ey + 10), fill=(110, 76, 50, 255), outline=INK, width=3)
    return finish(img, "reeds-01.png")


def cloud():
    w, h = 1000, 420
    img, d = canvas(w, h)
    W, H = w * SS, h * SS
    mask = Image.new("L", (W, H)); md = ImageDraw.Draw(mask)
    for x, y, r in ((.3, .62, .2), (.5, .45, .28), (.7, .6, .2), (.42, .7, .18), (.6, .72, .2)):
        md.ellipse(((x - r) * W, y * H - r * W * .55, (x + r) * W, y * H + r * W * .55), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(4)).point(lambda v: 255 if v > 128 else 0)
    body = Image.new("RGBA", (W, H), (252, 249, 242, 255)); body.putalpha(mask)
    img.alpha_composite(body)
    edges = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3))
    ink = Image.new("RGBA", (W, H), (120, 128, 140, 255)); ink.putalpha(edges.point(lambda v: 160 if v > 40 else 0))
    img.alpha_composite(ink)
    return finish(img, "cloud-01.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    spec = [
        ("sky-day-01", "sky", ["sky", "day", "clear"], sky, [0.5, 1.0], 400, True, "none"),
        ("cloud-01", "sky", ["cloud", "sky"], cloud, [0.5, 1.0], 30, False, "drift"),
        ("hills-heath-01", "bg", ["hills", "heath", "landscape"], hills, [0.5, 1.0], 16, True, "none"),
        ("hut-farm-01", "mid", ["hut", "farm", "house", "prehistory"], hut, [0.5, 1.0], 6, False, "none"),
        ("tree-oak-01", "fg", ["tree", "oak", "forest"], tree, [0.5, 1.0], 6, False, "sway"),
        ("reeds-01", "fg", ["reeds", "water", "marsh"], reeds, [0.5, 1.0], 1.6, False, "sway"),
    ]
    assets = []
    for aid, layer, tags, draw, anchor, height_m, tile, motion in spec:
        w, h = draw()
        assets.append({
            "id": aid, "layer": layer, "tags": tags, "file": f"{aid}.png", "w": w, "h": h, "anchor": anchor,
            "height_m": height_m, "tileable_x": tile, "motion": motion, "placeholder": True,
            "qa": {"score": 0, "alpha_ok": True, "ink_coverage": 0, "ranked_vs_anchor": "placeholder"},
        })
    lib = {"version": 1, "bundle": "_placeholder", "style": "placeholder", "assets": assets}
    (OUT / "library.json").write_text(json.dumps(lib, indent=2) + "\n")
    print(f"{len(assets)} assets -> {OUT}")


if __name__ == "__main__":
    main()

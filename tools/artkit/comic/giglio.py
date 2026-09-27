"""Draw the Florentine giglio (red lily on white) as a banner texture, supersampled and smooth.
usage: python3 giglio.py out.png"""
import sys
from PIL import Image, ImageDraw, ImageFilter

S = 4                      # supersampling
W, H = 600 * S, 800 * S
RED, WHITE = (176, 28, 30), (241, 237, 226)


def bez(p0, p1, p2, p3, n=40):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append((u**3 * p0[0] + 3 * u*u*t * p1[0] + 3 * u*t*t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u*u*t * p1[1] + 3 * u*t*t * p2[1] + t**3 * p3[1]))
    return out


def sc(pts):
    return [(x * S, y * S) for x, y in pts]


def mirror(pts, cx=300):
    return [(2 * cx - x, y) for x, y in pts]


im = Image.new("RGB", (W, H), WHITE); d = ImageDraw.Draw(im)
cx = 300
# central petal: a tall rounded blade
centre = bez((cx, 95), (cx + 70, 180), (cx + 60, 330), (cx + 26, 440)) + [(cx - 26, 440)] + \
    bez((cx - 60, 330), (cx - 70, 180), (cx, 95), (cx, 95))[::-1][:0]
centre = bez((cx, 95), (cx + 72, 190), (cx + 58, 340), (cx + 24, 445)) + bez((cx - 24, 445), (cx - 58, 340), (cx - 72, 190), (cx, 95))
d.polygon(sc(centre), fill=RED)
# right outer petal: rises from the band and curls outwards and down, a crescent
outer = bez((cx + 30, 440), (cx + 110, 420), (cx + 200, 330), (cx + 205, 220)) + \
        bez((cx + 205, 220), (cx + 207, 175), (cx + 180, 150), (cx + 160, 165)) + \
        bez((cx + 160, 165), (cx + 185, 200), (cx + 170, 290), (cx + 30, 395))
d.polygon(sc(outer), fill=RED); d.polygon(sc(mirror(outer)), fill=RED)
# stamens between the petals, each ending in a round bud
for s in (1, -1):
    stem = bez((cx + s * 40, 430), (cx + s * 60, 360), (cx + s * 90, 300), (cx + s * 104, 245))
    d.line(sc(stem), fill=RED, width=12 * S, joint="curve")
    bx, by = cx + s * 106, 232
    d.ellipse([(bx - 22) * S, (by - 26) * S, (bx + 22) * S, (by + 18) * S], fill=RED)
# the band
d.rounded_rectangle([(cx - 140) * S, 445 * S, (cx + 140) * S, 500 * S], radius=10 * S, fill=RED)
# below the band: a short central foot and two curled lower petals
d.polygon(sc(bez((cx - 26, 500), (cx - 30, 580), (cx - 20, 640), (cx, 690)) + bez((cx, 690), (cx + 20, 640), (cx + 30, 580), (cx + 26, 500))), fill=RED)
low = bez((cx + 30, 500), (cx + 110, 505), (cx + 170, 560), (cx + 165, 640)) + \
      bez((cx + 165, 640), (cx + 162, 670), (cx + 135, 680), (cx + 120, 662)) + \
      bez((cx + 120, 662), (cx + 140, 620), (cx + 110, 560), (cx + 30, 548))
d.polygon(sc(low), fill=RED); d.polygon(sc(mirror(low)), fill=RED)
im = im.filter(ImageFilter.GaussianBlur(S * 0.6)).resize((W // S, H // S), Image.LANCZOS)
im.save(sys.argv[1])

"""House perspective grids (standard hp1). Sent as reference image 1 with every generation.
Camera: eye 1.60 m, horizon on the upper third, 28 mm equivalent (~65 deg horizontal FOV), 16:9.
Run: python3 resources/art/perspective/make_grids.py  -> grid-hp1-{R1,R2,L0}.png (2560x1440)."""
import math
from PIL import Image, ImageDraw

W, H = 2560, 1440
EYE = 1.60                                 # metres
HORIZON = round(H / 3)                     # upper third line
HFOV = 65.0  # 28 mm: nearest visible floor ~3.35 m, good for interiors; 35 mm would start at 4.2 m
F = (W / 2) / math.tan(math.radians(HFOV / 2))   # focal length in px
CX = W / 2
GRID, HOR, REF = (170, 190, 230), (230, 60, 60), (120, 120, 120)

def ground(x, z):
    """World point on the floor (x right, z forward, metres) -> image px."""
    return CX + F * x / z, HORIZON + F * EYE / z

def figure(d, x, z, h=1.70):
    fx, fy = ground(x, z)
    top = HORIZON + F * (EYE - h) / z
    w = F * 0.45 / z
    d.rounded_rectangle([fx - w / 2, top, fx + w / 2, fy], radius=w / 2, outline=REF, width=3)
    d.ellipse([fx - w * 0.3, top, fx + w * 0.3, top + w * 0.6], outline=REF, width=3)
    d.text((fx + w / 2 + 6, top), f"1.70 m @ {z:g} m", fill=REF)

def base(name):
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)
    d.line([(0, HORIZON), (W, HORIZON)], fill=HOR, width=4)
    d.text((20, HORIZON - 26), f"hp1 {name}: horizon (eye 1.60 m), 28 mm, 16:9", fill=HOR)
    return im, d

def r1():
    im, d = base("R1 one-point")
    for x in range(-12, 13):                                   # receding floor lines to the centre VP
        d.line([ground(x, 1.5), (CX, HORIZON)], fill=GRID, width=2)
    for z in [1.5, 2, 3, 4, 6, 8, 12, 20]:
        d.line([ground(-40, z), ground(40, z)], fill=GRID, width=2)
    d.ellipse([CX - 8, HORIZON - 8, CX + 8, HORIZON + 8], outline=HOR, width=4)
    for x, z in [(-1.4, 4), (1.3, 6), (-0.4, 10)]:
        figure(d, x, z)
    return im

def r2():
    im, d = base("R2 two-point")
    # 1 m floor tiles turned 45 deg, projected from world coordinates (no fake bottom-edge lines),
    # drawn out to 40 m so they fade towards the horizon instead of crowding into a solid band.
    a = math.radians(45)
    ca, sa = math.cos(a), math.sin(a)
    for k in range(-40, 41):
        for u_dir in (0, 1):
            pts = []
            for i in range(0, 400):
                t = -20 + i * 0.1
                u, v = (k, t) if u_dir == 0 else (t, k)
                x, z = u * ca - v * sa, u * sa + v * ca + 22
                if 1.0 < z < 40:
                    pts.append(ground(x, z))
            if len(pts) > 1:
                d.line(pts, fill=GRID, width=2)
    # the two vanishing points of this grid lie on the horizon at +-F (45 deg)
    vl, vr = CX - F, CX + F
    for vp in (vl, vr):
        d.text((min(max(vp, 20), W - 360), HORIZON + 10), f"VP at {vp - CX:+.0f} px ( {(vp - CX) / W:+.1f} W )", fill=HOR)
    for x, z in [(-1.3, 4), (1.5, 6), (0.2, 10)]:
        figure(d, x, z)
    return im

def l0():
    im, d = base("L0 horizon only")
    for z in [3, 5, 10, 20, 50, 200]:
        y = HORIZON + F * EYE / z
        d.line([(0, y), (W, y)], fill=GRID, width=2)
        d.text((W - 170, y - 22), f"{z} m", fill=GRID)
    for x, z in [(-2, 5), (3, 10), (-6, 20)]:
        figure(d, x, z)
    return im

if __name__ == "__main__":
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    for name, fn in [("R1", r1), ("R2", r2), ("L0", l0)]:
        fn().save(os.path.join(here, f"grid-hp1-{name}.png"))
    print(f"focal {F:.0f}px, horizon y={HORIZON}")

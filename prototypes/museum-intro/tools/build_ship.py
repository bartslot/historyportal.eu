"""The hero VOC ship (a 1640s Dutch jacht, after Vroom's painting) built from basic shapes in Blender.

Run: Blender -b --factory-startup -P tools/build_ship.py -- <out.glb> <out.blend>

Everything is written in the three.js frame of the prototype (model units, x to the bow, y up, z across) and
converted to Blender's z-up on the way in, so the glTF comes out in the same frame as the old ship.glb: main mast
x -1, fore mast x 10, main deck y 4.3, waterline y 0.6. The set courses and topsails are added in code
(src/world.js) from src/ship_layout.json, which this script reads too, so yards, sheets and buntlines fit them.

One mesh per material (wood_hull, wood_deck, wood_tar, spar, iron, rope, block, sail, flag, barrel, crate). Each
piece carries its own id in the `_part` vertex attribute: the ink pass draws a line where two pieces meet.
UVs are in model units (1 = one unit of the tile scale), except ropes (u along / one turn, v around) and flags (0..1).
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
LAYOUT = json.loads((ROOT / 'src' / 'ship_layout.json').read_text())
BRACE = LAYOUT['brace']
V = Vector


# ---------------------------------------------------------------- mesh accumulation
class Acc:
    def __init__(self):
        self.v, self.uv, self.part, self.f = [], [], [], []


MATS = {}
_part = [0]
ROPE_MATS = {'rope'}


def new_part(mat):
    """Ids 0.02..0.47 for solid pieces, 0.5..0.97 for rigging (the ink pass draws ropes with thinner lines)."""
    _part[0] += 1
    k = _part[0]
    return (0.5 + (k % 48) * 0.01) if mat in ROPE_MATS else (0.02 + (k % 46) * 0.01)


def add(mat, verts, uvs, faces, part=None):
    a = MATS.setdefault(mat, Acc())
    p = new_part(mat) if part is None else part
    o = len(a.v)
    a.v += [tuple(v) for v in verts]
    a.uv += list(uvs)
    a.part += [p] * len(verts)
    a.f += [tuple(i + o for i in f) for f in faces]
    return p


def grid(mat, P, U, ni, nj, part=None):
    """Quad grid over (i/ni, j/nj); P(s, t) -> point, U(s, t) -> uv."""
    verts, uvs, faces = [], [], []
    for i in range(ni + 1):
        for j in range(nj + 1):
            s, t = i / ni, j / nj
            verts.append(P(s, t))
            uvs.append(U(s, t))
    for i in range(ni):
        for j in range(nj):
            a = i * (nj + 1) + j
            faces.append((a, a + nj + 1, a + nj + 2, a + 1))
    return add(mat, verts, uvs, faces, part)


def perp(d):
    a = V((0, 1, 0)) if abs(d.y) < 0.9 else V((1, 0, 0))
    return d.cross(a).normalized()


def tube(mat, pts, r, sides=8, rope=None, caps=False, part=None):
    """Tube along a polyline. r: float or per-point list. UV: units (along, around*r), or rope: one tile per turn."""
    pts = [V(p) for p in pts]
    rs = r if isinstance(r, (list, tuple)) else [r] * len(pts)
    rope = (mat in ROPE_MATS) if rope is None else rope
    n = len(pts)
    tang = []
    for k in range(n):
        d = pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]
        tang.append(d.normalized())
    nrm = perp(tang[0])
    verts, uvs, faces = [], [], []
    s = 0.0
    rmean = sum(rs) / n
    for k in range(n):
        if k:
            s += (pts[k] - pts[k - 1]).length
            # parallel transport of the frame
            nrm = (nrm - tang[k] * nrm.dot(tang[k])).normalized()
        b = tang[k].cross(nrm)
        for j in range(sides + 1):
            a = 2 * math.pi * j / sides
            verts.append(pts[k] + (nrm * math.cos(a) + b * math.sin(a)) * rs[k])
            uvs.append((s / (2 * math.pi * rmean * 1.6), j / sides) if rope else (s, a * rs[k]))
    for k in range(n - 1):
        for j in range(sides):
            a = k * (sides + 1) + j
            faces.append((a, a + 1, a + sides + 2, a + sides + 1))
    if caps:
        for k, sign in ((0, -1), (n - 1, 1)):
            c = len(verts)
            verts.append(pts[k])
            uvs.append((0, 0))
            ring = [k * (sides + 1) + j for j in range(sides)]
            for j in range(sides):
                f = (c, ring[j], ring[(j + 1) % sides])
                faces.append(f if sign < 0 else f[::-1])
    return add(mat, verts, uvs, faces, part)


def lathe(mat, origin, axis, prof, sides=12, part=None, around_units=True):
    """Surface of revolution: prof = [(h, r)], h along axis from origin. UV (around*rmax, h) in units."""
    origin, axis = V(origin), V(axis).normalized()
    e1 = perp(axis)
    e2 = axis.cross(e1)
    rmax = max(r for _, r in prof)
    verts, uvs, faces = [], [], []
    for (h, r) in prof:
        for j in range(sides + 1):
            a = 2 * math.pi * j / sides
            verts.append(origin + axis * h + (e1 * math.cos(a) + e2 * math.sin(a)) * r)
            uvs.append((a * rmax if around_units else j / sides, h))
    for k in range(len(prof) - 1):
        for j in range(sides):
            a = k * (sides + 1) + j
            faces.append((a, a + 1, a + sides + 2, a + sides + 1))
    return add(mat, verts, uvs, faces, part)


def box(mat, c, size, ex=(1, 0, 0), ey=(0, 1, 0), part=None):
    """Box with centre c, size along (ex, ey, ex x ey). Planar UVs per face, grain along the longest edge."""
    c, ex, ey = V(c), V(ex).normalized(), V(ey).normalized()
    ez = ex.cross(ey).normalized()
    ey = ez.cross(ex)
    ax = [ex, ey, ez]
    hs = [size[0] / 2, size[1] / 2, size[2] / 2]
    verts, uvs, faces = [], [], []
    for n in range(3):
        a, b = [(n + 1) % 3, (n + 2) % 3]
        if size[b] > size[a]:
            a, b = b, a  # u along the longer edge of this face
        for sgn in (-1, 1):
            o = len(verts)
            for (sa, sb) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                verts.append(c + ax[n] * hs[n] * sgn + ax[a] * hs[a] * sa + ax[b] * hs[b] * sb)
                uvs.append((sa * hs[a], sb * hs[b]))
            faces.append((o, o + 1, o + 2, o + 3) if sgn > 0 else (o + 3, o + 2, o + 1, o))
    return add(mat, verts, uvs, faces, part)


def poly(mat, pts, uvf, part=None):
    """Flat fan from the centroid of a closed outline."""
    pts = [V(p) for p in pts]
    c = sum(pts, V((0, 0, 0))) / len(pts)
    verts = [c] + pts
    uvs = [uvf(p) for p in verts]
    faces = [(0, i + 1, (i + 1) % len(pts) + 1) for i in range(len(pts))]
    return add(mat, verts, uvs, faces, part)


def lerp(a, b, t):
    return V(a).lerp(V(b), t)


def sagline(a, b, sag=0.0, n=8):
    a, b = V(a), V(b)
    return [a.lerp(b, i / n) - V((0, sag * 4 * (i / n) * (1 - i / n), 0)) for i in range(n + 1)]


def rope(a, b, r=0.03, sag=None, n=None, sides=6, part=None):
    L = (V(b) - V(a)).length
    sag = L * 0.012 if sag is None else sag
    n = n or max(2, min(16, int(L / 0.8) + 2))
    return tube('rope', sagline(a, b, sag, n), r, sides, part=part)


def ellipsoid(mat, c, axis, length, radius, sides=10, part=None):
    axis = V(axis).normalized()
    prof = [(-length / 2 + length * i / 8, radius * math.sin(math.pi * i / 8) + 1e-3) for i in range(9)]
    return lathe(mat, c, axis, prof, sides, part)


def ring(mat, c, axis, R, r, sides=6, n=16, part=None):
    """A torus (iron strap, hoop, rope grommet)."""
    c, axis = V(c), V(axis).normalized()
    e1 = perp(axis)
    e2 = axis.cross(e1)
    pts = [c + (e1 * math.cos(2 * math.pi * i / n) + e2 * math.sin(2 * math.pi * i / n)) * R for i in range(n + 1)]
    return tube(mat, pts, r, sides, part=part)


def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- hull form
X_STERN, X_STEM = -13.0, 17.0
BREAK_Q, BREAK_P, BREAK_F = -9.0, -11.5, 12.5  # quarterdeck, poop, forecastle breaks
Y_MAIN, Y_QUARTER, Y_POOP, Y_FORE = 4.3, 6.0, 7.3, 5.6


def deck_y(x):
    if x < BREAK_P:
        return Y_POOP
    if x < BREAK_Q:
        return Y_QUARTER
    if x < BREAK_F:
        return Y_MAIN
    return Y_FORE


def rail_y(x):
    S = lambda d: smooth(-0.3, 0.3, d)
    return 5.35 + 1.7 * S(BREAK_Q - x) + 1.3 * S(BREAK_P - x) + 1.3 * S(x - BREAK_F)


def beam(x):
    if x < -5:
        return 4.2 - 1.1 * ((-5 - x) / 8) ** 2
    if x > 7:
        return 4.2 * max(0.0, 1 - ((x - 7) / 10) ** 2) ** 0.55
    return 4.2


def keel_y(x):
    if x > 11:
        return -1.6 + 5.0 * ((x - 11) / 6) ** 2
    if x < -11:
        return -1.6 + 0.2 * (-11 - x)
    return -1.6


def half(x, y):
    """Half breadth of the hull at (x, y): round bilge, widest at y 2.6, tumblehome above."""
    b, yk = beam(x), keel_y(x)
    ym = max(2.6, yk + 0.8)
    if y <= yk:
        return 0.0
    if y < ym:
        return b * math.sin(math.pi / 2 * (y - yk) / (ym - yk)) ** 0.65
    q = (y - ym) / 2.7
    return b * (1 - min(0.26, 0.11 * q * q))


def hull():
    nx, nt = 120, 32
    xs = lambda s: X_STERN + (X_STEM - X_STERN) * s
    for side in (1, -1):
        def P(s, t, side=side):
            x = xs(s)
            y = keel_y(x) + (rail_y(x) - keel_y(x)) * t
            return V((x, y, side * half(x, y)))
        grid('wood_hull', P, lambda s, t: (xs(s), keel_y(xs(s)) + (rail_y(xs(s)) - keel_y(xs(s))) * t), nx, nt)
    # transom
    def PT(s, t):
        y = keel_y(X_STERN) + (rail_y(X_STERN) - keel_y(X_STERN)) * t
        return V((X_STERN, y, (2 * s - 1) * half(X_STERN, y)))
    grid('wood_hull', PT, lambda s, t: (PT(s, t).z, PT(s, t).y), 10, nt)
    # keel + stem
    kp = [V((x, keel_y(x) - 0.05, 0)) for x in [X_STERN + 0.2 + i * 0.5 for i in range(int((X_STEM - X_STERN) / 0.5))]]
    kp += [V((X_STEM + 0.15, keel_y(X_STEM) + 1.4 * i / 4, 0)) for i in range(1, 5)]
    tube('wood_tar', kp, 0.2, 8, caps=True)
    # inner bulwark (honey), decks, bulkheads
    def PB(s, t):
        x = xs(0.003 + s * 0.99)
        y = deck_y(x) + (rail_y(x) - 0.03 - deck_y(x)) * t
        return V((x, y, max(0.05, half(x, y) - 0.12)))
    for side in (1, -1):
        grid('wood_deck', lambda s, t, side=side: V((PB(s, t).x, PB(s, t).y, side * PB(s, t).z)),
             lambda s, t: (PB(s, t).x, PB(s, t).y), 160, 3)
    for (x0, x1, y) in ((BREAK_Q, BREAK_F, Y_MAIN), (BREAK_P, BREAK_Q, Y_QUARTER), (X_STERN + 0.01, BREAK_P, Y_POOP), (BREAK_F, 16.2, Y_FORE)):
        def PD(s, t, x0=x0, x1=x1, y=y):
            x = x0 + (x1 - x0) * s
            return V((x, y, (2 * t - 1) * max(0.05, half(x, y) - 0.12)))
        grid('wood_deck', PD, lambda s, t, PD=PD: (PD(s, t).x, PD(s, t).z), max(4, int((x1 - x0) / 0.5)), 16)
    for (x, y0, y1) in ((BREAK_Q, Y_MAIN, Y_QUARTER), (BREAK_P, Y_QUARTER, Y_POOP), (BREAK_F, Y_MAIN, Y_FORE)):
        def PK(s, t, x=x, y0=y0, y1=y1):
            y = y0 + (y1 - y0) * t
            return V((x, y, (2 * s - 1) * (half(x, y) - 0.12)))
        grid('wood_deck', PK, lambda s, t, PK=PK: (PK(s, t).z, PK(s, t).y), 12, 4)
        # balustrade along the break: rail + turned balusters
        hz = half(x, y1) - 0.15
        tube('spar', [V((x + 0.05, y1 + 0.9, -hz)), V((x + 0.05, y1 + 0.9, hz))], 0.07, 8, caps=True)
        for i in range(int(2 * hz / 0.45) + 1):
            z = -hz + i * 0.45
            if abs(z) < 0.6 and x == BREAK_Q:
                continue  # the gap for the ladder
            lathe('spar', (x + 0.05, y1, z), (0, 1, 0), [(0, 0.05), (0.15, 0.07), (0.45, 0.04), (0.7, 0.07), (0.9, 0.05)], 6)
    # doors in the bulkheads
    for z in (-1.6, 1.6):
        box('wood_tar', (BREAK_Q + 0.02, Y_MAIN + 0.7, z), (0.06, 1.3, 0.75))
    box('wood_tar', (BREAK_F - 0.02, Y_MAIN + 0.6, -1.2), (0.06, 1.1, 0.7))
    # ladder up to the quarterdeck
    for i in range(5):
        box('wood_deck', (BREAK_Q + 0.15 + i * 0.16, Y_MAIN + 0.3 + i * 0.34, 0), (0.12, 0.05, 0.9))
    for z in (-0.5, 0.5):
        tube('wood_deck', [V((BREAK_Q + 0.05, Y_MAIN, z)), V((BREAK_Q + 0.9, Y_QUARTER + 0.05, z))], 0.05, 6, caps=True)


def along_hull(y, x0, x1, out=0.07, step=0.4):
    pts = []
    x = x0
    while x <= x1 + 1e-6:
        if half(x, y) > 0.2:
            pts.append(x)
        x += step
    return pts


def wales_and_rails():
    for y, x0, x1 in ((1.5, -12.9, 15.3), (2.3, -12.9, 15.8), (3.9, -12.9, 16.2), (6.55, -12.9, BREAK_Q + 0.4), (7.75, -12.9, BREAK_P + 0.3)):
        xs = along_hull(y, x0, x1)
        for side in (1, -1):
            tube('wood_tar', [V((x, y, side * (half(x, y) + 0.07))) for x in xs], 0.12, 8, caps=True)
    # cap rail along the top of the side (follows the castle steps)
    for side in (1, -1):
        pts = []
        x = X_STERN
        while x <= 16.4:
            y = rail_y(x)
            pts.append(V((x, y + 0.04, side * (half(x, y) - 0.05))))
            x += 0.15
        tube('spar', pts, 0.09, 8, caps=True)


def gunports():
    y = 3.1
    for x in (-6.6, -4.2, -1.8, 0.6, 3.0, 5.4):
        for side in (1, -1):
            z = half(x, y)
            box('wood_tar', (x, y, side * (z + 0.02)), (0.62, 0.62, 0.1))
            th = math.radians(62)
            hinge = V((x, y + 0.33, side * (z + 0.05)))
            d = V((0, -math.cos(th), side * math.sin(th)))
            box('wood_hull', hinge + d * 0.33, (0.66, 0.66, 0.07), ex=(1, 0, 0), ey=d)
            tube('iron', [V((x, y - 0.03, side * (z - 0.3))), V((x, y - 0.03, side * (z + 0.45))), V((x, y - 0.03, side * (z + 0.5)))],
                 [0.13, 0.1, 0.12], 10, caps=True)
    for z in (-1.1, 1.1):  # stern-chase ports
        box('wood_tar', (X_STERN - 0.02, 3.2, z), (0.1, 0.55, 0.55))


def stern():
    # two narrow pointed-arch windows with a carved frame
    for zc in (-0.9, 0.9):
        arch = [V((X_STERN - 0.04, 6.05, zc - 0.28)), V((X_STERN - 0.04, 6.95, zc - 0.28))]
        arch += [V((X_STERN - 0.04, 6.95 + 0.4 * math.sin(math.pi / 2 * i / 6), zc - 0.28 + 0.28 * (1 - math.cos(math.pi / 2 * i / 6)) ** 0.8)) for i in range(1, 7)]
        arch += [V((p.x, p.y, 2 * zc - p.z)) for p in reversed(arch[:-1])]
        poly('wood_tar', [V((X_STERN - 0.03, p.y, p.z)) for p in arch], lambda p: (p.z, p.y))
        tube('spar', arch + [arch[0]], 0.055, 6)
        tube('spar', [V((X_STERN - 0.05, 6.5, zc - 0.28)), V((X_STERN - 0.05, 6.5, zc + 0.28))], 0.025, 5)
        tube('spar', [V((X_STERN - 0.05, 6.05, zc)), V((X_STERN - 0.05, 7.3, zc))], 0.025, 5)
    # gallery: floor, roof, rail on turned balusters
    zg = half(X_STERN, 6.0) - 0.2
    box('wood_tar', (X_STERN - 0.38, 5.72, 0), (0.75, 0.12, 2 * zg))
    box('wood_tar', (X_STERN - 0.38, 7.72, 0), (0.8, 0.1, 2 * zg + 0.2))
    tube('spar', [V((X_STERN - 0.72, 6.45, -zg)), V((X_STERN - 0.72, 6.45, zg))], 0.06, 8, caps=True)
    for i in range(15):
        z = -zg + 2 * zg * i / 14
        lathe('spar', (X_STERN - 0.72, 5.78, z), (0, 1, 0), [(0, 0.04), (0.12, 0.06), (0.35, 0.035), (0.55, 0.06), (0.67, 0.04)], 6)
    for z in (-zg, zg):
        box('wood_tar', (X_STERN - 0.38, 6.72, z), (0.7, 2.0, 0.12))
    # taffrail arch above the transom and its fill
    zt = half(X_STERN, rail_y(X_STERN)) - 0.05
    yt = rail_y(X_STERN)
    arc = [V((X_STERN, yt + 0.55 * (1 - (2 * i / 16 - 1) ** 2), -zt + 2 * zt * i / 16)) for i in range(17)]
    poly('wood_hull', [V((X_STERN, yt, -zt))] + arc + [V((X_STERN, yt, zt))], lambda p: (p.z, p.y))
    tube('spar', arc, 0.1, 8, caps=True)
    # three stern lanterns
    for z in (-2.0, 0.0, 2.0):
        yb = yt + 0.55 * (1 - (z / zt) ** 2) + 0.05
        tube('iron', [V((X_STERN - 0.05, yb, z)), V((X_STERN - 0.05, yb + 0.35, z))], 0.04, 6)
        lathe('iron', (X_STERN - 0.05, yb + 0.35, z), (0, 1, 0), [(0, 0.1), (0.05, 0.17), (0.45, 0.2), (0.55, 0.12), (0.75, 0.04), (0.82, 0.0)], 6)
    # rudder
    box('wood_tar', (X_STERN - 0.25, 1.9, 0), (0.45, 6.2, 0.24))
    # ensign staff
    tube('spar', [V((X_STERN - 0.2, yt + 0.4, 0)), V((X_STERN - 1.2, yt + 4.3, 0))], [0.09, 0.05], 8, caps=True)


def bow():
    tube('wood_tar', [V((16.2, 3.4, 0)), V((17.8, 4.3, 0)), V((19.4, 4.9, 0))], [0.3, 0.22, 0.12], 8, caps=True)
    for side in (1, -1):
        for dy in (0.0, 0.45):
            tube('wood_deck', [V((14.6, 5.0 + dy, side * (half(14.6, 5.0) - 0.05))), V((16.8, 5.0 + dy * 0.8, side * 0.9)), V((19.2, 4.95 + dy * 0.5, side * 0.12))], 0.06, 6, caps=True)
    ellipsoid('spar', (19.6, 5.2, 0), (1, 0.3, 0), 0.9, 0.28)  # the lion at the head
    # catheads + anchors
    for side in (1, -1):
        zc = half(14.0, 6.0)
        box('wood_tar', (14.0, 6.0, side * (zc + 0.45)), (0.25, 0.25, 1.1))
        za = side * (zc + 0.95)
        top, foot = V((14.0, 5.85, za)), V((14.2, 2.4, side * (half(14.2, 2.4) + 0.35)))
        tube('iron', [top, foot], 0.07, 8, caps=True)
        arms = [foot + V((math.sin(a) * 0.75, 0.75 * (1 - math.cos(a)), 0)) for a in [math.radians(d) for d in range(-70, 71, 14)]]
        tube('iron', arms, 0.06, 6, caps=True)
        for p in (arms[0], arms[-1]):
            box('iron', p + V((0, 0.05, 0)), (0.28, 0.32, 0.05), ex=(1, 0.6, 0), ey=(0, 1, 0))
        box('wood_tar', top + V((0, -0.35, 0)), (0.14, 0.14, 1.7), ex=(1, 0, 0), ey=(0, 1, 0))


# ---------------------------------------------------------------- masts, tops, yards
MASTS = {
    #        x     foot  lower  r0    r1    top   R    tm0   tm1   tmr0 tmr1 tg0   tg1   tgr
    'main': (-1.0, -1.0, 14.6, 0.42, 0.32, 13.3, 1.9, 12.4, 21.0, 0.25, 0.17, 20.0, 28.0, 0.13),
    'fore': (10.0, -1.0, 13.4, 0.38, 0.29, 12.5, 1.6, 11.6, 19.4, 0.22, 0.15, 18.6, 24.5, 0.11),
    'mizzen': (-10.5, 3.0, 13.5, 0.27, 0.2, 12.6, 1.1, 11.9, 18.0, 0.15, 0.1, None, None, None),
}
TM_DX = 0.7  # the topmast stands in front of the lower masthead


def mast_r(m, y):
    x, foot, lower, r0, r1 = MASTS[m][:5]
    return r0 + (r1 - r0) * smooth(deck_y(x), lower, y)


def mast(name):
    x, foot, lower, r0, r1, top, R, tm0, tm1, tmr0, tmr1, tg0, tg1, tgr = MASTS[name]
    ys = [foot + (lower - foot) * i / 12 for i in range(13)]
    tube('spar', [V((x, y, 0)) for y in ys], [mast_r(name, y) for y in ys], 16, caps=True)
    y = deck_y(x) + 1.0
    while y < top - 0.9:
        r = mast_r(name, y) + 0.035
        tube('iron', [V((x, y - 0.09, 0)), V((x, y + 0.09, 0))], r, 16, caps=True)
        y += 1.15
    cx = x + 0.3
    # top: planked platform (planar uv: boards), drum rim, cap rail, trestle + cross trees beneath
    disc_pts = [V((cx + R * math.cos(a), top + 0.13, R * math.sin(a))) for a in [2 * math.pi * i / 32 for i in range(32)]]
    poly('wood_deck', disc_pts, lambda p: (p.x, p.z))
    poly('wood_tar', [p - V((0, 0.13, 0)) for p in reversed(disc_pts)], lambda p: (p.x, p.z))  # dark weathered underside
    lathe('wood_tar', (cx, top, 0), (0, 1, 0), [(0, R), (0.55, R)], 32)
    lathe('wood_deck', (cx, top + 0.13, 0), (0, 1, 0), [(0, R - 0.08), (0.42, R - 0.08)], 32)
    ring('iron', (cx, top + 0.56, 0), (0, 1, 0), R - 0.04, 0.06, 6, 32)  # iron hoop round the rim
    ring('iron', (cx, top + 0.03, 0), (0, 1, 0), R + 0.02, 0.04, 6, 32)
    for dz in (-0.42, 0.42):
        box('spar', (cx, top - 0.1, dz), (2 * R * 0.92, 0.18, 0.16))
    for dx in (-0.65, 0.65):
        box('spar', (cx + dx, top - 0.28, 0), (0.16, 0.18, 2 * R * 0.95))
    # the cap that holds the topmast, and the topmast doubling
    box('wood_tar', (x + TM_DX / 2, lower - 0.15, 0), (TM_DX + 0.75, 0.3, 0.75))
    tx = x + TM_DX
    ys = [tm0 + (tm1 - tm0) * i / 10 for i in range(11)]
    tube('spar', [V((tx, y, 0)) for y in ys], [tmr0 + (tmr1 - tmr0) * i / 10 for i in range(11)], 12, caps=True)
    for yb in (tm0 + 0.6, lower + 0.5, (lower + tm1) / 2):
        tube('iron', [V((tx, yb - 0.07, 0)), V((tx, yb + 0.07, 0))], tmr0 + 0.03, 12, caps=True)
    for dz in (-0.25, 0.25):
        box('spar', (tx, tm1 - 1.0, dz), (1.1, 0.12, 0.12))
    for dx in (-0.35, 0.35):
        box('spar', (tx + dx, tm1 - 0.9, 0), (0.12, 0.12, 2.6))
    if tg0 is not None:
        box('wood_tar', (tx + 0.18, tm1 - 0.1, 0), (0.8, 0.22, 0.5))
        gx = tx + 0.38
        tube('spar', [V((gx, tg0, 0)), V((gx, tg1, 0))], [tgr, tgr * 0.55], 8, caps=True)
        lathe('spar', (gx, tg1, 0), (0, 1, 0), [(0, 0.0), (0.0, 0.17), (0.12, 0.17), (0.12, 0.0)], 10)
        return {'head': V((x, top + 0.25, 0)), 'top': (cx, top, R), 'tmhead': V((tx, tm1 - 1.05, 0)), 'tghead': V((gx, tg1 - 0.6, 0)), 'truck': V((gx, tg1, 0))}
    lathe('spar', (tx, tm1, 0), (0, 1, 0), [(0, 0.0), (0.0, 0.13), (0.1, 0.13), (0.1, 0.0)], 10)
    return {'head': V((x, top + 0.25, 0)), 'top': (cx, top, R), 'tmhead': V((tx, tm1 - 1.05, 0)), 'truck': V((tx, tm1, 0))}


def braced(mx, lx, y, lz, brace=BRACE):
    c, s = math.cos(brace), math.sin(brace)
    return V((mx + lx * c + lz * s, y, -lx * s + lz * c))


def yard(mx, y, L, r, lx, furled=False):
    """Yard across the ship, braced; returns its two yardarms (world)."""
    n = 10
    pts = [braced(mx, lx, y, -L / 2 + L * i / n) for i in range(n + 1)]
    rs = [r * (0.45 + 0.55 * math.sin(math.pi * i / n)) for i in range(n + 1)]
    tube('spar', pts, rs, 10, caps=True)
    for zz in (-0.35, 0.35):
        tube('iron', [braced(mx, lx, y, zz - 0.07), braced(mx, lx, y, zz + 0.07)], r + 0.03, 10, caps=True)
    if furled:
        fp = [braced(mx, lx + 0.05, y - r - 0.12, -L * 0.42 + L * 0.84 * i / n) for i in range(n + 1)]
        tube('sail', fp, [0.06 + 0.13 * math.sin(math.pi * i / n) ** 0.6 for i in range(n + 1)], 10, caps=True)
        for i in range(1, 6):
            p = braced(mx, lx + 0.05, y - r - 0.12, -L * 0.42 + L * 0.84 * i / 6)
            ring('rope', p, braced(0, 0, 0, 1) - braced(0, 0, 0, 0), 0.2, 0.02, 4, 10)
    # footrope sagging beneath
    for sgn in (-1, 1):
        a = braced(mx, lx - 0.1, y - 0.1, sgn * L * 0.48)
        b = braced(mx, lx - 0.1, y - 0.25, sgn * 0.6)
        tube('rope', [lerp(a, b, t) - V((0, 0.85 * math.sin(math.pi * t), 0)) for t in [i / 8 for i in range(9)]], 0.028, 5)
    return braced(mx, lx, y, -L / 2), braced(mx, lx, y, L / 2)


def block(c, axis, size=0.34):
    """Rigging block: dark wooden oval with an iron strap round it."""
    p = ellipsoid('block', c, axis, size, size * 0.36, 8)
    e = perp(V(axis))
    ring('iron', c, e, size * 0.42, 0.018, 4, 14)
    return p


def deadeye(c, out, r=0.17):
    out = V(out).normalized()
    lathe('wood_tar', V(c) - out * 0.06, out, [(0, 0.0), (0, r * 0.8), (0.02, r), (0.1, r), (0.12, r * 0.8), (0.12, 0.0)], 12)
    ring('iron', c, out, r + 0.01, 0.022, 4, 16)
    e1 = perp(out)
    e2 = out.cross(e1)
    for k in range(3):  # the three lanyard holes
        a = 2 * math.pi * k / 3 + 0.5
        h = V(c) + out * 0.065 + (e1 * math.cos(a) + e2 * math.sin(a)) * r * 0.45
        poly('iron', [h + (e1 * math.cos(b) + e2 * math.sin(b)) * r * 0.18 for b in [2 * math.pi * i / 8 for i in range(8)]], lambda p: (0, 0))


# ---------------------------------------------------------------- sails (the set ones live in code)
def sail_point(s, u, v):
    w = s['w1'] + (s['w0'] - s['w1']) * v
    belly = s['belly'] * math.sin(math.pi * u) * (0.35 + 0.65 * math.sin(math.pi * (0.15 + 0.85 * (1 - v)) * 0.6 + 0.35))
    return braced(s['x'], s['off'] + belly, s['y0'] + (s['y1'] - s['y0']) * v, (u - 0.5) * w)


def billow(corners, belly_dir, belly, nu=14, nv=10):
    """Bellied sail between head A-B (v=1) and foot D-C (v=0), uv in units (seams run down the sail)."""
    A, B, C, D = [V(p) for p in corners]
    bd = V(belly_dir).normalized()
    head = (B - A).length

    def P(s, t):
        top, bot = lerp(A, B, s), lerp(D, C, s)
        p = lerp(bot, top, t)
        return p + bd * belly * math.sin(math.pi * s) * (0.35 + 0.65 * math.sin(math.pi * (1 - t) * 0.85 + 0.2))

    grid('sail', P, lambda s, t: (s * head, (1 - t) * (A - D).length), nu, nv)
    return P


# ---------------------------------------------------------------- rigging
def shrouds(name, info, n):
    x, foot, lower, r0, r1, top, R = MASTS[name][:7]
    y = rail_y(x) - 0.35
    xs = [x - 2.6 * (n - 1) / 5 + i * (3.2 * (n - 1) / 5) / (n - 1) - 0.0 for i in range(n)] if n > 1 else [x]
    for side in (1, -1):
        zc = half((xs[0] + xs[-1]) / 2, y)
        box('wood_tar', ((xs[0] + xs[-1]) / 2, y, side * (zc + 0.34)), (xs[-1] - xs[0] + 0.8, 0.12, 0.56))
        heads, rows = [], []
        for xi in xs:
            z = half(xi, y)
            low = V((xi, y + 0.2, side * (z + 0.5)))
            masthead = V((x - 0.1, top + 0.25, side * 0.38))
            d = (masthead - low).normalized()
            up = low + d * 0.62
            out = V((0, 0, side))
            deadeye(low, out)
            deadeye(up, out)
            for k in (-0.08, 0.0, 0.08):
                rope(low + V((k, 0.05, 0)), up + V((k, -0.05, 0)), 0.018, 0.0, 2, 4)
            tube('iron', [low - V((0, 0.15, 0)), V((xi, y - 1.6, side * (half(xi, y - 1.6) + 0.08)))], 0.035, 5, caps=True)
            tube('rope', [up + d * 0.12, masthead], 0.055, 12)
            heads.append((up + d * 0.12, masthead))
        # ratlines: one rope across all shrouds every 0.42, a knot (clove hitch) at each shroud
        yy = heads[0][0].y + 0.55
        while yy < top - 0.9:
            pts = []
            for a, b in heads:
                t = (yy - a.y) / (b.y - a.y)
                pts.append(lerp(a, b, t))
            line = []
            for i in range(len(pts) - 1):
                for k in range(4):
                    tt = k / 4
                    line.append(lerp(pts[i], pts[i + 1], tt) - V((0, 0.03 * math.sin(math.pi * tt), 0)))
            line.append(pts[-1])
            p = tube('rope', line, 0.028, 5)
            for q in pts:
                ellipsoid('rope', q, (1, 0, 0), 0.13, 0.055, 6, part=p)
            yy += 0.42
    return xs


def top_shrouds(name, info, n, tm=True):
    x, foot, lower, r0, r1, top, R = MASTS[name][:7]
    cx = x + 0.3
    head = info['tmhead']
    for side in (1, -1):
        heads = []
        for i in range(n):
            dx = -0.55 * R + (1.1 * R) * i / max(1, n - 1)
            z = math.sqrt(max(0.01, R * R - dx * dx)) * 0.97
            low = V((cx + dx, top + 0.45, side * z))
            deadeye(low, (0, 0, side), 0.11)
            end = V((head.x - 0.05, head.y, side * 0.24))
            tube('rope', [low, end], 0.04, 6)
            heads.append((low, end))
            # futtock shroud under the top, to the mast
            tube('rope', [low - V((0, 0.12, 0)), V((x + dx * 0.2, top - 1.9, side * 0.42))], 0.035, 6)
        yy = top + 0.95
        while yy < head.y - 0.8:
            pts = [lerp(a, b, (yy - a.y) / (b.y - a.y)) for a, b in heads]
            p = tube('rope', pts, 0.022, 5)
            for q in pts:
                ellipsoid('rope', q, (1, 0, 0), 0.09, 0.04, 6, part=p)
            yy += 0.4
    if 'tghead' in info:
        tmhead, tg = info['tmhead'], info['tghead']
        for side in (1, -1):
            for dx in (-0.35, 0.35):
                tube('rope', [V((tmhead.x + dx, tmhead.y + 0.1, side * 1.25)), V((tg.x, tg.y, side * 0.13))], 0.03, 5)


def falls(name):
    """Halyard and jeer falls beside the lower mast: ropes from under the top to the deck, with their blocks."""
    x, foot, lower, r0, r1, top = MASTS[name][:6]
    dy = deck_y(x)
    for (dx, dz) in ((0.55, 0.35), (0.55, -0.35), (-0.5, 0.42), (-0.5, -0.42)):
        a = V((x + dx * 0.8, top - 0.45, dz * 0.8))
        b = V((x + dx, dy + 0.75, dz * 1.3))
        block(a, (0, 1, 0), 0.38)
        mid = lerp(a, b, 0.62)
        block(mid, b - a, 0.32)
        for k in (-0.06, 0.06):
            tube('rope', [a + V((k, -0.15, 0)), mid + V((k, 0.12, 0))], 0.026, 5)
        tube('rope', [mid - V((0, 0.12, 0)), b], 0.026, 5)


def stay(a, b, r=0.06, heart=True):
    a, b = V(a), V(b)
    rope(a, b, r, (a - b).length * 0.006, 14, 8)
    if heart:
        deadeye(lerp(a, b, 0.93), (b - a).normalized().cross(V((0, 0, 1))), 0.2)


def flag(pole_top, L, H, droop=0.25):
    """Orange-white-blue (the Prince's flag), streaming to +x (downwind). uv 0..1: u along the fly, v top to bottom."""
    pole_top = V(pole_top)

    def P(s, t):
        y = -t * H - droop * H * s * s
        z = 0.12 * L * s * math.sin(s * 2.6 * math.pi + t * 0.8)
        return pole_top + V((s * L, y, z))
    grid('flag', P, lambda s, t: (s, t), 18, 9)
    tube('rope', [pole_top, pole_top - V((0, H, 0))], 0.025, 4)


def rigging(info, xs_main, xs_fore):
    M, F, Z = MASTS['main'], MASTS['fore'], MASTS['mizzen']
    sails = LAYOUT['sails']
    # yards (in front of the masts, braced) with lifts, braces, sheets
    ya = {}
    ya['main_course'] = yard(M[0], sails[0]['y1'] + 0.15, 10.8, 0.22, sails[0]['off'] - 0.22)
    ya['main_top'] = yard(M[0], sails[1]['y1'] + 0.15, 8.6, 0.17, sails[1]['off'] - 0.2)
    ya['main_tg'] = yard(M[0], 24.6, 5.2, 0.1, 1.55, furled=True)
    ya['fore_course'] = yard(F[0], sails[2]['y1'] + 0.15, 9.6, 0.2, sails[2]['off'] - 0.2)
    ya['fore_top'] = yard(F[0], sails[3]['y1'] + 0.15, 7.6, 0.15, sails[3]['off'] - 0.2)
    ya['fore_tg'] = yard(F[0], 22.4, 4.4, 0.09, 1.5, furled=True)
    heads = {'main_course': info['main']['head'] + V((0, 1.0, 0)), 'main_top': info['main']['tmhead'], 'main_tg': info['main']['tghead'],
             'fore_course': info['fore']['head'] + V((0, 0.9, 0)), 'fore_top': info['fore']['tmhead'], 'fore_tg': info['fore']['tghead']}
    brace_to = {'main_course': -8.0, 'main_top': -9.6, 'main_tg': -10.4, 'fore_course': 3.5, 'fore_top': 1.0, 'fore_tg': -0.5}
    for k, arms in ya.items():
        for arm in arms:
            rope(arm, heads[k] + V((0, 0, 0.2 if arm.z > 0 else -0.2)), 0.025, 0.05)
            pend = arm + (arm - heads[k]).normalized() * 0.0 + V((-0.5, -0.1, 0))
            block(pend, (1, 0, 0), 0.3)
            bx = brace_to[k]
            yb = rail_y(bx)
            rope(pend, V((bx, yb + 0.1, (1 if arm.z > 0 else -1) * (half(bx, yb) - 0.05))), 0.025)
    # sheets and tacks from the set sails' clews, buntlines down their faces
    for i, s in enumerate(sails):
        for u in (0.0, 1.0):
            clew = sail_point(s, u, 0.0)
            side = 1 if clew.z > 0 else -1
            if i in (0, 2):
                xr = s['x'] - 3.8
                yr = rail_y(xr)
                rope(clew, V((xr, yr + 0.05, side * (half(xr, yr) - 0.05))), 0.03)
                xt = s['x'] + 3.5
                yt = rail_y(xt)
                rope(clew, V((xt, yt + 0.05, side * (half(xt, yt) - 0.05))), 0.03)
            else:
                low = ya['main_course' if i == 1 else 'fore_course']
                arm = low[0] if (low[0].z > 0) == (side > 0) else low[1]
                rope(clew, arm, 0.025, 0.05)
            block(clew + V((0, -0.15, 0)), (0, 1, 0), 0.26)
        for u in (0.28, 0.5, 0.72):
            pts = [sail_point(s, u, v / 10) for v in range(11)]
            pts = [p + V((math.cos(BRACE), 0, -math.sin(BRACE))) * 0.07 for p in pts]
            tube('rope', pts, 0.02, 4)
            block(pts[-1] + V((0, 0.2, 0)), (0, 1, 0), 0.22)
    # shroud deadeyes at the rail, ratlines, top shrouds, falls
    for name in ('main', 'fore'):
        falls(name)
    # stays
    stay(info['main']['head'] + V((0.4, 0.2, 0)), V((BREAK_F + 0.3, Y_FORE + 0.2, 0)), 0.075)
    stay(info['main']['tmhead'] + V((0.2, 0.1, 0)), V((F[0] + 0.3, F[5] + 0.6, 0)), 0.05)
    stay(info['main']['tghead'], info['fore']['tmhead'] + V((0.2, 0.0, 0)), 0.03, heart=False)
    bs0, bs1 = V((14.0, 5.0, 0)), V((24.5, 9.2, 0))
    stay(info['fore']['head'] + V((0.4, 0.2, 0)), lerp(bs0, bs1, 0.36), 0.065)
    stay(info['fore']['tmhead'] + V((0.2, 0.1, 0)), lerp(bs0, bs1, 0.86), 0.045)
    stay(info['fore']['tghead'], V((24.5, 11.9, 0)), 0.03, heart=False)
    stay(info['mizzen']['head'] + V((0.3, 0.2, 0)), V((M[0] - 0.4, 8.0, 0)), 0.045)
    stay(info['mizzen']['tmhead'], info['main']['head'] + V((-0.3, 1.0, 0)), 0.03, heart=False)
    # topmast backstays
    for name, xb in (('main', -6.0), ('fore', 5.0)):
        for side in (1, -1):
            for dx in (0.0, -1.1):
                xr = xb + dx
                yr = rail_y(xr) - 0.3
                low = V((xr, yr, side * (half(xr, yr) + 0.4)))
                deadeye(low, (0, 0, side), 0.13)
                tube('rope', [low, info[name]['tmhead'] + V((0, 0.1, side * 0.3))], 0.04, 6)
    return ya


def mizzen_and_bowsprit(info):
    Z = MASTS['mizzen']
    # lateen yard on the starboard side of the mizzen, its sail bellied out to starboard
    a, b = V((-5.6, 7.9, 0.45)), V((-15.0, 16.3, 0.45))
    tube('spar', [lerp(a, b, i / 10) for i in range(11)], [0.08 + 0.08 * math.sin(math.pi * i / 10) for i in range(11)], 10, caps=True)
    clew = V((-13.4, 9.0, 0.6))
    P = billow([b, a, a + V((0.15, -0.1, 0.05)), clew], (0, 0, 1), 0.7, 12, 10)
    rope(clew, V((-13.2, rail_y(-13.2) + 0.1, 0.8)), 0.025)
    rope(lerp(a, b, 0.25), info['mizzen']['head'] + V((0, 1.0, 0.2)), 0.03, 0.02)
    # bowsprit, sprit topmast, spritsail
    bs0, bs1 = V((13.6, 4.8, 0)), V((24.5, 9.2, 0))
    tube('spar', [lerp(bs0, bs1, i / 8) for i in range(9)], [0.34 - 0.18 * i / 8 for i in range(9)], 12, caps=True)
    for t in (0.35, 0.55, 0.75):
        tube('iron', [lerp(bs0, bs1, t - 0.008), lerp(bs0, bs1, t + 0.008)], 0.34 - 0.18 * t + 0.03, 12, caps=True)
    for t in (0.33, 0.37, 0.41):  # gammoning lashing at the stem
        ring('rope', lerp(bs0, bs1, t), bs1 - bs0, 0.34 - 0.18 * t + 0.03, 0.035, 5, 14)
    tube('spar', [V((24.3, 9.1, 0)), V((24.5, 12.3, 0))], [0.11, 0.06], 8, caps=True)
    pts = [V((24.4 + 0.5 * math.cos(a), 9.6, 0.5 * math.sin(a))) for a in [2 * math.pi * i / 16 for i in range(16)]]
    poly('wood_deck', pts, lambda p: (p.x, p.z))
    ring('spar', (24.4, 9.75, 0), (0, 1, 0), 0.48, 0.04, 5, 16)
    ps = lerp(bs0, bs1, 0.72)
    yy = ps.y - 0.75
    tube('spar', [V((ps.x, yy, -3.6 + 7.2 * i / 10)) for i in range(11)], [0.07 + 0.07 * math.sin(math.pi * i / 10) for i in range(11)], 10, caps=True)
    rope(V((ps.x, yy, -0.3)), ps + V((0, 0, -0.2)), 0.03, 0.0)
    rope(V((ps.x, yy, 0.3)), ps + V((0, 0, 0.2)), 0.03, 0.0)
    A, B = V((ps.x + 0.12, yy - 0.12, -3.3)), V((ps.x + 0.12, yy - 0.12, 3.3))
    C, D = V((ps.x - 0.3, 4.0, 3.6)), V((ps.x - 0.3, 4.0, -3.6))
    billow([A, B, C, D], (1, 0.15, 0), 1.0, 14, 10)
    for c in (C, D):
        rope(c, V((15.2, rail_y(15.2) + 0.1, (1 if c.z > 0 else -1) * (half(15.2, 6.0) - 0.05))), 0.025)
    return {'jack': V((24.5, 12.3, 0))}


# ---------------------------------------------------------------- deck furniture
def barrel(c, axis=(0, 1, 0)):
    h, re, rm = 0.95, 0.29, 0.36
    prof = [(0, 0.0), (0.0, re)] + [(h * i / 8, re + (rm - re) * math.sin(math.pi * i / 8)) for i in range(9)] + [(h, 0.0)]
    axis = V(axis).normalized()
    base = V(c) - axis * (h / 2 if axis.y < 0.5 else 0)
    p = lathe('barrel', base, axis, prof, 16)
    for t in (0.1, 0.32, 0.68, 0.9):
        r = re + (rm - re) * math.sin(math.pi * t) + 0.012
        lathe('iron', base + axis * (h * t - 0.03), axis, [(0, r), (0.06, r)], 16)


def crate(c, size, yaw=0.0):
    ex = (math.cos(yaw), 0, -math.sin(yaw))
    box('crate', c, size, ex=ex)
    for sy in (-1, 1):  # the battens round the edges
        box('wood_tar', V(c) + V((0, sy * size[1] * 0.42, 0)), (size[0] + 0.03, 0.06, size[2] + 0.03), ex=ex)


def coil(c, R=0.45, turns=4, r=0.035):
    pts = []
    n = 24 * turns
    for i in range(n + 1):
        t = i / n
        a = 2 * math.pi * turns * t
        rr = 0.12 + (R - 0.12) * t
        pts.append(V(c) + V((rr * math.cos(a), r + 0.01 + 0.012 * math.sin(a * 3.0) * 0, rr * math.sin(a))))
    tube('rope', pts, r, 5)


def hanging_coil(pin_top, along):
    along = V(along).normalized()
    for k in range(3):
        c = V(pin_top) - V((0, 0.35 + 0.02 * k, 0)) + along * (0.03 * k)
        pts = [c + along * (0.17 * math.sin(2 * math.pi * i / 16)) + V((0, 0.33 * math.cos(2 * math.pi * i / 16), 0)) for i in range(17)]
        tube('rope', pts, 0.028, 5)


def pin_rail(x0, x1, y, side):
    xm = (x0 + x1) / 2
    z = half(xm, y) - 0.27
    box('wood_tar', (xm, y, side * z), (x1 - x0, 0.1, 0.24))
    x = x0 + 0.25
    i = 0
    while x < x1 - 0.2:
        zp = side * (half(x, y) - 0.27)
        tube('spar', [V((x, y - 0.22, zp)), V((x, y + 0.2, zp)), V((x, y + 0.24, zp))], [0.03, 0.035, 0.045], 6, caps=True)
        if i % 3 == 1:
            hanging_coil(V((x, y + 0.12, zp + side * 0.05)), (1, 0, 0))
        x += 0.42
        i += 1


def fife_rail(mx):
    y = Y_MAIN
    for dz in (-1.0, 1.0):
        box('wood_tar', (mx + 1.0, y + 0.45, dz), (0.16, 0.9, 0.16))
    box('wood_tar', (mx + 1.0, y + 0.9, 0), (0.22, 0.12, 2.3))
    for z in (-0.75, -0.45, -0.15, 0.15, 0.45, 0.75):
        tube('spar', [V((mx + 1.0, y + 0.75, z)), V((mx + 1.0, y + 1.12, z))], [0.03, 0.045], 6, caps=True)
    hanging_coil(V((mx + 1.08, y + 1.0, 0.45)), (0, 0, 1))


def deck_furniture():
    y = Y_MAIN
    # main hatch with a grating
    for (x0, x1, z0, z1) in ((1.6, 3.4, -1.0, 1.0), (-5.6, -4.4, -0.65, 0.65)):
        xc, zc, sx, sz = (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0
        for dz in (-1, 1):
            box('wood_tar', (xc, y + 0.15, zc + dz * sz / 2), (sx + 0.16, 0.3, 0.12))
        for dx in (-1, 1):
            box('wood_tar', (xc + dx * sx / 2, y + 0.15, zc), (0.12, 0.3, sz))
        n = int(sx / 0.22)
        for i in range(n + 1):
            box('crate', (x0 + sx * i / n, y + 0.27, zc), (0.06, 0.05, sz - 0.02))
        n = int(sz / 0.22)
        for i in range(n + 1):
            box('crate', (xc, y + 0.27, z0 + sz * i / n), (sx - 0.02, 0.05, 0.06))
    # capstan with its bars
    cx = -7.3
    lathe('barrel', (cx, y, 0), (0, 1, 0), [(0, 0.0), (0, 0.55), (0.12, 0.55), (0.2, 0.4), (0.75, 0.36), (0.85, 0.5), (1.05, 0.55), (1.12, 0.3), (1.12, 0.0)], 16)
    for k in range(6):
        a = math.pi * k / 3
        d = V((math.cos(a), 0, math.sin(a)))
        box('spar', V((cx, y + 0.95, 0)) + d * 0.95, (1.3, 0.09, 0.09), ex=d)
    # barrels, crates, coils
    for (x, z) in ((-8.2, -2.55), (-7.55, -2.85), (-7.9, -1.9), (11.4, -2.2), (11.9, -1.5), (4.0, 2.7)):
        barrel((x, y, z))
    barrel((-6.9, y + 0.37, -2.6), (0, 0, 1))
    crate((4.6, y + 0.3, -2.45), (0.85, 0.6, 0.65), 0.1)
    crate((4.55, y + 0.85, -2.5), (0.6, 0.5, 0.5), -0.2)
    crate((3.6, y + 0.32, -2.85), (0.7, 0.64, 0.55), 0.35)
    for (x, z, R) in ((0.4, 1.5, 0.45), (9.3, 2.65, 0.4), (-2.3, -2.7, 0.42), (-6.0, 1.8, 0.38)):
        coil((x, y, z), R)
    # belaying-pin rails along the bulwarks at the main and fore shrouds
    for side in (1, -1):
        pin_rail(-3.2, 0.8, y + 0.65, side)
        pin_rail(8.8, 11.6, y + 0.65, side)
    fife_rail(MASTS['main'][0])
    fife_rail(MASTS['fore'][0])
    # ship's bell in a small belfry at the forecastle break
    bx = BREAK_F + 0.2
    for dz in (-0.38, 0.38):
        box('wood_tar', (bx, Y_FORE + 0.5, dz), (0.12, 1.0, 0.12))
    box('wood_tar', (bx, Y_FORE + 1.05, 0), (0.18, 0.14, 0.95))
    lathe('iron', (bx, Y_FORE + 0.98, 0), (0, -1, 0), [(0, 0.0), (0.0, 0.07), (0.06, 0.12), (0.2, 0.15), (0.34, 0.2), (0.4, 0.25), (0.42, 0.25)], 14)


# ---------------------------------------------------------------- blender output
COLOURS = {  # viewport only (the prototype's shader has its own palettes)
    'wood_hull': (0.42, 0.24, 0.12), 'wood_deck': (0.69, 0.43, 0.2), 'wood_tar': (0.12, 0.07, 0.04), 'spar': (0.75, 0.37, 0.12),
    'iron': (0.11, 0.12, 0.13), 'rope': (0.3, 0.2, 0.11), 'block': (0.24, 0.22, 0.2), 'sail': (0.95, 0.92, 0.82),
    'flag': (0.9, 0.9, 0.9), 'barrel': (0.55, 0.3, 0.12), 'crate': (0.64, 0.4, 0.18),
}


def to_blender(p):
    return (p[0], -p[2], p[1])


def write(out_glb, out_blend):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    col = bpy.data.collections.new('ship_v4')
    bpy.context.scene.collection.children.link(col)
    total = 0
    for name, a in MATS.items():
        me = bpy.data.meshes.new(name)
        me.from_pydata([to_blender(v) for v in a.v], [], a.f)
        uv = me.uv_layers.new(name='UVMap')
        loop_v = [0] * len(me.loops)
        me.loops.foreach_get('vertex_index', loop_v)
        flat = []
        for vi in loop_v:
            u, v = a.uv[vi]
            flat += [u, 1.0 - v]  # glTF flips v on export
        uv.data.foreach_set('uv', flat)
        attr = me.attributes.new('_part', 'FLOAT', 'POINT')
        attr.data.foreach_set('value', a.part)
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        me.validate(clean_customdata=False)
        me.update()
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*COLOURS[name], 1)
        me.materials.append(mat)
        ob = bpy.data.objects.new(name, me)
        col.objects.link(ob)
        total += len(a.v)
        print(f'MESH {name}: {len(a.v)} verts, {len(a.f)} faces')
    print('TOTAL verts', total)
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)
    bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', export_attributes=True, export_yup=True,
                              export_apply=False, export_materials='EXPORT', export_image_format='NONE', export_extras=False)


def build():
    hull()
    wales_and_rails()
    gunports()
    stern()
    bow()
    info = {k: mast(k) for k in MASTS}
    xs_main = shrouds('main', info['main'], 6)
    xs_fore = shrouds('fore', info['fore'], 5)
    shrouds('mizzen', info['mizzen'], 3)
    top_shrouds('main', info['main'], 4)
    top_shrouds('fore', info['fore'], 4)
    top_shrouds('mizzen', info['mizzen'], 2)
    rigging(info, xs_main, xs_fore)
    extra = mizzen_and_bowsprit(info)
    deck_furniture()
    flag(info['main']['truck'], 3.4, 2.2)
    flag(info['fore']['truck'], 3.0, 1.9)
    flag(info['mizzen']['truck'], 2.4, 1.5)
    flag(extra['jack'], 2.0, 1.3)
    flag(V((X_STERN - 1.2, rail_y(X_STERN) + 4.3, 0)), 4.4, 2.8, 0.45)


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:]
    build()
    write(argv[0], argv[1])

# Pack: the dark wood (selva oscura), Inferno I. Scene 3. A narrow earth path winds along +y between
# old trees and thorny undergrowth; through a gap at the end, a hill lit by the first sun.
# Built from free Sketchfab models (tools/artkit/fetch_sketchfab.py), not blockouts (Bart, 2026-09-27).
import random

OUT = ASSETS_ROOT + "/Dante/packs/forest3d"
sc = new_scene("forest")
G, T, U, B = (coll(sc, n) for n in ("ground", "trees", "plants", "blocking"))
rnd = random.Random(1300)

SKOV, MIGHTY, OAKT, OLD, CHERRY = ("fd582b0d4a8c4af1a1b5c4f21a481c93", "4f6ab5594a8a415aba3f958682b9ced5",
                                   "3dc59560f2d24345bdbe65c44636453b", "3cb4d59eb4844dc4802480e9ee53785e",
                                   "232e1f60165342afb09a40230f7a469d")
PACK, DEAD, LOG = ("cf138b8eb2d340cda643ed59f824989c", "9bdd36641ef541adb51f0d01ddb07b2c",
                   "f5ad948275cd4d13ba3ce2040b72ed47")
ROSE, ROCK, HILLS = ("a92d6bdc2a364f50b838f62a528fbf40",
                            "70b586d54a1e46ab9398f25369a39df3", "6d7faf10658e44279da7356cbe749d56")


def path_x(y):
    return 1.6 * math.sin(y / 11.0)


def ground_h(x, y):
    """Flat on the path (figures stand at z 0), rising into gentle banks and hummocks beside it."""
    d = abs(x - path_x(y))
    bank = max(0.0, min(1.0, (d - 1.4) / 4.0))
    return bank * (0.55 + 0.35 * math.sin(x * 0.7 + y * 0.31) * math.cos(y * 0.23 - x * 0.4))


# ground: one grid, textured; path strip on top
bm = bmesh.new()
NX, NY, X0, X1, Y0, Y1 = 90, 150, -45.0, 45.0, -20.0, 130.0
vs = [[bm.verts.new((X0 + (X1 - X0) * i / NX, Y0 + (Y1 - Y0) * j / NY,
                     ground_h(X0 + (X1 - X0) * i / NX, Y0 + (Y1 - Y0) * j / NY))) for j in range(NY + 1)] for i in range(NX + 1)]
for i in range(NX):
    for j in range(NY):
        bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
set_mat(_mesh_obj("ground", bm, G, "floor"), "stony_dirt_path")
# far meadow to the hill, and the hill in first light
box(G, "meadow", (400, 140, 0.1), (0, 200, -0.05), "floor")
sf(G, "hill", HILLS, "floor", loc=(0, 235, -0.2), size=330)

# trees: (uid, pick, height range, weight). Old, twisted, deciduous: a medieval Tuscan wood, no palms or firs.
TREES = [(SKOV, ["Object_2"], (8, 11), 3), (MIGHTY, ["structure_2", "foliage_3"], (13, 17), 2), (OAKT, None, (11, 15), 2),
         (OLD, None, (7, 10), 3), (CHERRY, None, (5, 7), 2),
         (PACK, ["Oak_25"], (14, 18), 2), (PACK, ["Maple_24"], (13, 17), 1), (PACK, ["AshTree_1"], (12, 15), 1)]
# not the pack's DeciduousDead1: its straight bare trunk with one crossing branch inked as a telegraph pole
BUSH = [(PACK, ["DeciduousShrub_27"], (2.5, 4), 2), (PACK, ["HollyShrub_4"], (2, 3), 2), (ROSE, None, (1.2, 1.8), 3),
        (DEAD, ["DT_Demo_001"], (2, 3), 1), (DEAD, ["DT_Demo_003"], (1.8, 2.6), 1)]


def pick(table):
    u, p, (h0, h1), _ = rnd.choices(table, weights=[t[3] for t in table])[0]
    return u, p, rnd.uniform(h0, h1)


def clear_of_path(x, y, margin):
    return abs(x - path_x(y)) > margin


def gap_to_hill(x, y):
    """Keep a window from the fo02 camera (x 0, looking +y) to the hill: nothing tall in that cone."""
    return y > 6 and abs(x) < 2.2 + (y - 6) * 0.13


# open ground: the small clearing where Dante and Virgil meet (seen from above in fo01), and room
# around the eye-level cameras so they don't stand inside a bush
CLEARINGS = [(path_x(11.0), 11.0, 6.5), (path_x(0.0), 0.0, 2.5), (path_x(11.0) + 7.0, 7.4, 3.0)]


def in_clearing(x, y, extra=0.0):
    return any((x - cx) ** 2 + (y - cy) ** 2 < (r + extra) ** 2 for cx, cy, r in CLEARINGS)


n = 0
for k in range(260):
    y = rnd.uniform(-8, 110)
    x = rnd.uniform(-40, 40)
    near = abs(x - path_x(y))
    if not clear_of_path(x, y, 3.2) or gap_to_hill(x, y) or near > 26 or in_clearing(x, y, 3.0):
        continue
    u, p, h = pick(TREES)
    sf(T, "tree_%d" % n, u, "plant", loc=(x, y, ground_h(x, y) - 0.15), yaw_deg=rnd.uniform(0, 360), height=h, pick=p)
    n += 1
# undergrowth crowding the path edges (thorns, ferns), heavier near the camera
m = 0
for k in range(420):
    y = rnd.uniform(-6, 70)
    side = rnd.choice((-1, 1))
    x = path_x(y) + side * rnd.uniform(1.5, 9.0)
    if gap_to_hill(x, y) or in_clearing(x, y):   # keep the far path and the clearing readable
        continue
    u, p, h = pick(BUSH)
    if h > 2.0 and abs(x - path_x(y)) < 3.8:   # tall shrubs stand back; low thorns may touch the path
        x = path_x(y) + side * rnd.uniform(3.8, 9.0)
    sf(U, "bush_%d" % m, u, "plant", loc=(x, y, ground_h(x, y) - 0.05), yaw_deg=rnd.uniform(0, 360), height=h, pick=p)
    m += 1
# ferns along the path edge (Poly Haven fern: the Sketchfab "ferns" was a rock wall scan)
for i in range(160):
    y = rnd.uniform(-6, 45); x = path_x(y) + rnd.choice((-1, 1)) * rnd.uniform(1.3, 6.0)
    if in_clearing(x, y, -1.5):   # ferns may edge the clearing, low enough to see over
        continue
    ph(U, "fern_%d" % i, "fern_02", "plant", loc=(x, y, ground_h(x, y) - 0.05), yaw_deg=rnd.uniform(0, 360), height=rnd.uniform(0.6, 1.1))
# a fallen trunk, rocks
sf(T, "fallen", LOG, "wood", loc=(path_x(16) + 4.8, 16.0, 0.2), yaw_deg=70, size=8.0)
for i in range(14):
    y = rnd.uniform(0, 45); x = path_x(y) + rnd.choice((-1, 1)) * rnd.uniform(1.6, 6)
    sf(U, "rock_%d" % i, ROCK, "props", loc=(x, y, ground_h(x, y) - 0.1), yaw_deg=rnd.uniform(0, 360), size=rnd.uniform(0.6, 1.8))

# blocking: Dante lost on the path; Virgil where the hill path begins
dan = mannequin(B, "dante", (path_x(9.0), 9.0, 0), yaw_deg=10, height=1.72)
vir = mannequin(B, "virgil", (path_x(13.0) + 0.9, 13.0, 0), yaw_deg=180 + 25, height=1.78)

SHOTS = [
    ("fo01_establishing_high", camera(sc, "fo01", (path_x(-4) + 1.0, -4.0, 32.0), yaw_deg=-4, pitch_deg=-52, shift_y=0.0, family="high"), None),
    ("fo02_path_and_hill",     camera(sc, "fo02", (path_x(0.0) - 0.3, 0.0, EYE)), None),
    ("fo03_two_shot",          camera(sc, "fo03", (path_x(11.0) + 7.0, 7.4, EYE), yaw_deg=58), ["dante", "virgil"]),
]
out = []
for name, cam, figs in SHOTS:
    info = render_shot(sc, cam, OUT, name, meta={"pack": "dante_forest", "period": "Inferno I (poem)"},
                       figures=figs, lines=False)
    out.append(name)
result = {"shots": out, "trees": n, "bushes": m, "objects": len(objs(sc))}

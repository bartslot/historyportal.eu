# Pack: a reusable temperate European woodland, built only from procedural trees (trees.py, forest LOD).
# Species mix checked with JEV 2026-09-28 (0.89 for medieval Tuscany / Low Countries): pedunculate oak
# dominant, silver birch and aspen in the light gaps and along edges, field maple and wild cherry as
# understory, low oak scrub. Left out: larch (0.27, alpine), weeping willow and Lombardy poplar (both
# planted in Europe only from the 1700s), and the American presets.
# Layout: a meadow in front, the wood's ragged edge, a cart track curving in to a clearing with one old
# oak (the landmark every inside shot leads to).
import random

OUT = ASSETS_ROOT + "/_scenes/woodland"
sc = new_scene("woodland")
G, T, U = (coll(sc, n) for n in ("ground", "trees", "understory"))
rnd = random.Random(1300)

CLEARING, CLEARING_R = (4.0, 62.0), 11.0
X0, X1, Y0, Y1 = -70.0, 70.0, -40.0, 150.0
CANOPY = [("cambridge_oak", 0.55), ("silver_birch", 0.25), ("quaking_aspen", 0.20)]
EDGE_CANOPY = [("cambridge_oak", 0.30), ("silver_birch", 0.40), ("quaking_aspen", 0.30)]   # light-loving at edges
UNDER = [("acer", 0.35), ("hill_cherry", 0.30), ("black_oak", 0.35)]
CANOPY_GAP, UNDER_GAP = 7.5, 4.5   # minimum spacing (m) between trunks of each layer


def track_x(y):
    """The cart track: in from the meadow, a lazy S, ending in the clearing."""
    return CLEARING[0] + 5.0 * math.sin((y - CLEARING[1]) / 20.0)


def edge_y(x):
    """Where the wood starts: ragged, not a ruled line."""
    return 15.0 + 3.0 * math.sin(x / 7.0) + 2.0 * math.sin(x / 3.1 + 1.0)


def ground_h(x, y):
    swell = 0.6 * math.sin(x / 23.0) * math.cos(y / 31.0) + 0.3 * math.sin(x / 9.0 + y / 13.0)
    rut = max(0.0, 1.0 - abs(x - track_x(y)) / 1.6) * 0.12 if y < CLEARING[1] else 0.0
    return swell - rut


def in_wood(x, y):
    return y > edge_y(x) and math.dist((x, y), CLEARING) > CLEARING_R


def near_open(x, y):
    """Within 8 m of the edge, the clearing or the track: where birch and aspen take the light."""
    return y - edge_y(x) < 8 or math.dist((x, y), CLEARING) < CLEARING_R + 8 or abs(x - track_x(y)) < 5


# ground: one grid, faces tagged meadow / forest floor / track by their centre
bm = bmesh.new()
NX, NY = 140, 190
vs = [[bm.verts.new((X0 + (X1 - X0) * i / NX, Y0 + (Y1 - Y0) * j / NY, 0)) for j in range(NY + 1)] for i in range(NX + 1)]
for row in vs:
    for v in row:
        v.co.z = ground_h(v.co.x, v.co.y)
for i in range(NX):
    for j in range(NY):
        f = bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
        cx, cy = X0 + (X1 - X0) * (i + 0.5) / NX, Y0 + (Y1 - Y0) * (j + 0.5) / NY
        on_track = abs(cx - track_x(cy)) < 1.3 and cy < CLEARING[1] - CLEARING_R * 0.5
        f.material_index = 2 if on_track else (1 if in_wood(cx, cy) else 0)
ground = _mesh_obj("ground", bm, G, "floor")
for tid in ("leafy_grass", "forest_leaves_02", "stony_dirt_path"):
    ground.data.materials.append(pbr(tid))


def place(layer, gap, tries, keep, pick):
    """Dart throwing: trunk positions at least gap apart, where keep(x, y) holds."""
    for _ in range(tries):
        x, y = rnd.uniform(X0 + 3, X1 - 3), rnd.uniform(Y0, Y1 - 3)
        if not keep(x, y) or abs(x - track_x(y)) < 3.2 and y < CLEARING[1]:
            continue
        if any(math.dist((x, y), p) < gap for p in layer):
            continue
        layer.append((x, y))
        species = pick(x, y)
        yield species, x, y


def weighted(table):
    r, acc = rnd.random(), 0.0
    for name, w in table:
        acc += w
        if r <= acc:
            return name
    return table[-1][0]


canopy, under = [], []
n = 0
for species, x, y in place(canopy, CANOPY_GAP, 9000, in_wood,
                           lambda x, y: weighted(EDGE_CANOPY if near_open(x, y) else CANOPY)):
    pt(T, "c%d" % n, species, rnd.randint(1, 3), (x, y, ground_h(x, y)), rnd.uniform(0, 360), rnd.uniform(0.85, 1.15))
    n += 1
for species, x, y in place(under + canopy, UNDER_GAP, 5000, in_wood, lambda x, y: weighted(UNDER)):
    pt(U, "u%d" % n, species, rnd.randint(1, 3), (x, y, ground_h(x, y)), rnd.uniform(0, 360), rnd.uniform(0.6, 0.9))
    n += 1
# a few lone trees out in the meadow break the edge line
for i, (x, y) in enumerate([(-38, 2), (27, -6), (46, 8)]):
    pt(T, "lone%d" % i, "cambridge_oak", i % 3 + 1, (x, y, ground_h(x, y)), i * 97, 1.1)
# the landmark: one old, broad oak in the clearing
OX, OY = CLEARING[0] + 2.0, CLEARING[1] + 1.5
pt(T, "old_oak", "cambridge_oak", 3, (OX, OY, ground_h(OX, OY)), 40, 1.35)

sc["sky_rgb"] = (0.72, 0.78, 0.86)
sun = _sun(sc)
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))   # afternoon, from the left: long shadows across the track

ty = lambda y: (track_x(y), y)
SHOTS = [
    # wide: the meadow, the wood's edge, the track going in (where are we)
    ("wd01_edge_wide", camera(sc, "wd01", (track_x(-14) - 4.0, -14.0, EYE + ground_h(track_x(-14) - 4, -14)), yaw_deg=-6)),
    # on the track: the tunnel of trunks leading to the lit clearing (one focal point: the gap)
    ("wd02_track", camera_look(sc, "wd02", (*ty(26.0), EYE + ground_h(*ty(26.0))), (*ty(58.0), 3.0), lens=26, family="ms")),
    # medium: the old oak from the clearing's edge
    ("wd03_old_oak", camera_look(sc, "wd03", (OX - 13.0, OY - 12.0, EYE + ground_h(OX - 13, OY - 12)), (OX, OY, 5.5), lens=30, family="ms")),
    # high: over the canopy, the clearing as a hole in the wood
    ("wd04_high", camera_look(sc, "wd04", (-35.0, -25.0, 48.0), (CLEARING[0], CLEARING[1], 0.0), lens=30, family="high")),
]
for name, cam in SHOTS:
    render_shot(sc, cam, OUT, name, meta={"pack": "woodland", "trees": n + 4}, blocking=False, lines=False)
result = {"shots": [s[0] for s in SHOTS], "trees": n + 4, "objects": len(objs(sc))}
save_pack(sc, OUT, "woodland")

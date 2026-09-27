# Pack: a Florentine street, c.1283-1300. Stone tower-houses, shops with counters, wooden overhangs,
# a tall tower. Street along +y, 4.6 m wide. Scene 1 (1283: Beatrice's greeting) and scene 2 (1300: the notice).
OUT = ASSETS_ROOT + "/Dante/packs/street"
sc = new_scene("street")
G, BL, WD, P, B = (coll(sc, n) for n in ("ground", "buildings", "wood", "props", "blocking"))
HALF = 2.3                      # half street width
FLOOR1, STOREY = 3.8, 3.3       # top of the ground floor, height of upper storeys

box(G, "ground", (HALF * 2 + 0.2, 90, 0.1), (0, 40, -0.05), "floor")
for i in range(0, 60, 3):       # a few stone slabs, flush, for scale lines
    box(G, "slab_%02d" % i, (1.1, 0.9, 0.02), ((-1) ** i * 0.9, 2 + i * 1.3, 0.005), "floor")

def facade_cut(side, y, z, w, h, depth=0.45, pointed=False, name="op"):
    """Opening cutter in the facade plane x = side*HALF, recessed into the wall, overshooting into the street."""
    xf = side * HALF
    return arch_cutter(BL, name, w, h, depth, (xf + side * (depth / 2 - 0.12), y, z), rot=(0, 0, math.radians(90)), pointed=pointed)

def building(tag, side, y0, w, h, shop=True, door=True, sporto=False, windows=True):
    D = 9.0
    cx = side * (HALF + D / 2)
    body = box(BL, tag, (D, w, h), (cx, y0 + w / 2, h / 2), "wall")
    xf = side * HALF
    cuts = []
    yc = y0 + w / 2
    if shop:
        sy = y0 + 0.4 + 1.25
        cuts.append(facade_cut(side, sy, -0.1, 2.5, 3.1, name=tag + "_shop"))
        box(WD, tag + "_counter", (0.55, 2.3, 0.9), (xf - side * 0.12, sy, 0.45), "wood")
        box(WD, tag + "_counter_top", (0.7, 2.45, 0.06), (xf - side * 0.2, sy, 0.93), "wood")
        box(WD, tag + "_shop_shutter", (0.05, 2.3, 0.9), (xf - side * 0.45, sy, 2.45), "wood", rot=(0, side * math.radians(55), 0))
    if door:
        dy = y0 + w - 0.9 if shop else yc
        cuts.append(facade_cut(side, dy, -0.1, 1.1, 2.55, name=tag + "_door"))
        box(WD, tag + "_door_leaf", (0.06, 1.05, 2.2), (xf + side * 0.30, dy, 1.1), "opening")
    first = 1
    if sporto:  # projecting wooden upper storey on beams
        box(WD, tag + "_sporto", (0.85, w - 0.2, STOREY), (xf - side * 0.42, yc, FLOOR1 + STOREY / 2), "wood")
        for k in range(int(w // 1.1)):
            by = y0 + 0.5 + k * 1.1
            box(WD, tag + "_beam_%d" % k, (1.0, 0.14, 0.16), (xf - side * 0.35, by, FLOOR1 - 0.08), "wood")
            box(WD, tag + "_brace_%d" % k, (0.10, 0.12, 1.1), (xf - side * 0.30, by, FLOOR1 - 0.55), "wood", rot=(0, -side * math.radians(35), 0))
        n = max(1, int(w // 2.2))
        for k in range(n):
            wy = y0 + (k + 0.5) * w / n
            box(WD, tag + "_sporto_win_%d" % k, (0.05, 0.75, 1.0), (xf - side * 0.86, wy, FLOOR1 + 1.6), "opening")
        first = 2
    if windows:
        f = first
        while FLOOR1 + (f - 1) * STOREY + 2.6 < h - 0.5:
            z0 = FLOOR1 + (f - 1) * STOREY + 0.9
            n = max(1, int(w // 2.0))
            for k in range(n):
                cuts.append(facade_cut(side, y0 + (k + 0.5) * w / n, z0, 0.72, 1.45, name="%s_w%d_%d" % (tag, f, k)))
            f += 1
    for f in range(1, 20):      # string courses at each floor line
        z = FLOOR1 + (f - 1) * STOREY
        if z > h - 0.6:
            break
        if not (sporto and f == 1):
            box(BL, "%s_course_%d" % (tag, f), (0.14, w, 0.10), (xf - side * 0.05, yc, z), "wall")
    box(WD, tag + "_eave", (1.0, w + 0.2, 0.14), (xf - side * 0.35, yc, h + 0.07), "roof")
    for k in range(int(w // 0.6)):
        box(WD, "%s_rafter_%d" % (tag, k), (1.0, 0.10, 0.10), (xf - side * 0.35, y0 + 0.3 + k * 0.6, h - 0.05), "roof")
    cut_many(body, cuts)
    return body

LEFT = [("L1", 5.0, 12.5, True, True, False), ("L2", 6.5, 14.0, True, True, True), ("L3", 4.5, 11.5, False, True, False),
        ("L4", 5.5, 18.0, True, True, False), ("L5", 6.0, 13.0, True, True, True), ("L6", 5.0, 12.0, True, True, False)]
RIGHT = [("R1", 6.0, 13.0, True, True, False), ("R2", 5.2, 12.0, False, True, False), ("R3", 6.5, 14.5, True, True, True),
         ("R4", 4.8, 12.5, True, True, False), ("R5", 5.5, 16.0, True, True, False), ("R6", 6.0, 12.5, True, True, True)]
y = -3.0
for tag, w, h, shop, door, sp in LEFT:
    building(tag, -1, y, w, h, shop, door, sp); y += w + 0.05
TOWER_Y = y + 1.0
tower = box(BL, "tower", (6.0, 6.0, 34.0), (-HALF - 3.0 - 1.0, TOWER_Y + 3.0, 17.0), "wall")
cut_many(tower, [facade_cut(-1, TOWER_Y + 3.0, zz, 0.6, 1.2, name="tw_%d" % i) for i, zz in enumerate((6, 12, 18, 24, 30))])
y = -3.0
for tag, w, h, shop, door, sp in RIGHT:
    building(tag, 1, y, w, h, shop, door, sp); y += w + 0.05
# far end: a building across the street, a gap on the left where the street turns
end = box(BL, "end_house", (9.0, 9.0, 13.0), (1.5, 43.5 + 4.5, 6.5), "wall")
cut_many(end, [arch_cutter(BL, "end_door", 1.2, 2.6, 0.6, (1.5, 43.4, -0.1)),
               arch_cutter(BL, "end_w1", 0.8, 1.5, 0.6, (0.0, 43.4, 5.0)), arch_cutter(BL, "end_w2", 0.8, 1.5, 0.6, (3.0, 43.4, 5.0))])

# the notice (scene 2, 1300 only): on R2's plain wall
R2Y = -3.0 + 6.0 + 0.05
NOTICE = (HALF - 0.01, R2Y + 1.6, 1.65)
box(P, "notice", (0.01, 0.42, 0.58), NOTICE, "props")

# blocking
bea = mannequin(B, "beatrice", (-0.6, 9.0, 0), yaw_deg=180 - 25, height=1.60)
l1 = mannequin(B, "lady_1", (-1.3, 9.6, 0), yaw_deg=180, height=1.58)
l2 = mannequin(B, "lady_2", (0.1, 9.7, 0), yaw_deg=180, height=1.57)
dan = mannequin(B, "dante", (1.1, 5.2, 0), yaw_deg=35, height=1.72)
gui = mannequin(B, "guido", (HALF - 0.75, NOTICE[1] - 0.15, 0), yaw_deg=-90, height=1.76)
BH, DHd, GH = (tuple(m["head_m"]) for m in (bea, dan, gui))

S1 = ["beatrice", "lady_1", "lady_2", "dante"]
shots = [
  ("sr01_wide_street",   camera(sc, "sr01", (0.5, -1.0, EYE)),                                    S1, ["notice"]),
  ("sr02_notice_wall",   camera(sc, "sr02", (-1.7, NOTICE[1] - 4.2, EYE), yaw_deg=-40),           ["guido"], []),
  ("sr03_ots_dante",     camera_look(sc, "sr03", (DHd[0] + 0.45, DHd[1] - 0.75, DHd[2] + 0.02), BH, lens=35, family="ots"), S1, ["notice"]),
  ("sr04_cu_beatrice",   camera_look(sc, "sr04", (DHd[0] - 0.2, DHd[1] + 0.35, DHd[2] - 0.05), BH, lens=60), ["beatrice", "lady_1", "lady_2"], ["notice"]),
  ("sr05_cu_dante",      camera_look(sc, "sr05", (BH[0] + 0.4, BH[1] - 1.9, BH[2] + 0.05), DHd, lens=60), ["dante"], ["notice"]),
  ("sr06_cu_guido",      camera_look(sc, "sr06", (GH[0] - 1.4, GH[1] - 0.9, GH[2]), GH, lens=55),     ["guido"], []),
]
out = {}
for name, cam, figs, hide in shots:
    info = render_shot(sc, cam, OUT, name, meta={"pack": "dante_street", "period": "Florence c.1283-1300"}, figures=figs, hide=hide)
    out[name] = info["horizon_y_px"]
bpy.ops.wm.save_as_mainfile(filepath=ASSETS_ROOT + "/Dante/packs/dante_packs.blend")
result = {"shots": out, "objects": len(sc.collection.all_objects)}

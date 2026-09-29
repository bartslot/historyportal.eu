# Pack: a Florentine street, c.1283-1300. Stone tower-houses, shops with counters, wooden overhangs,
# a tall tower. Street along +y, 4.6 m wide. Scene 1 (1283: Beatrice's greeting) and scene 2 (1300: the notice).
OUT = ASSETS_ROOT + "/Dante/packs/street"
sc = new_scene("street")
G, BL, WD, P, B = (coll(sc, n) for n in ("ground", "buildings", "wood", "props", "blocking"))
HALF = 2.3                      # half street width
FLOOR1, STOREY = 3.8, 3.3       # top of the ground floor, height of upper storeys

box(G, "ground", (HALF * 2 + 0.2, 90, 0.1), (0, 40, -0.05), "floor")
# (no flat slabs: with a textured cobble street, Qwen drew them as manhole covers, 2026-09-27)

def facade_cut(side, y, z, w, h, depth=0.45, pointed=False, name="op"):
    """Opening cutter in the facade plane x = side*HALF, recessed into the wall, overshooting into the street."""
    xf = side * HALF
    return arch_cutter(BL, name, w, h, depth, (xf + side * (depth / 2 - 0.12), y, z), rot=(0, 0, math.radians(90)), pointed=pointed)

FEATURES = []   # (kind, side, y) of shops and doors, for set dressing


def building(tag, side, y0, w, h, shop=True, door=True, sporto=False, windows=True):
    D = 9.0
    cx = side * (HALF + D / 2)
    body = box(BL, tag, (D, w, h), (cx, y0 + w / 2, h / 2), "wall")
    xf = side * HALF
    cuts = []
    yc = y0 + w / 2
    if shop:
        sy = y0 + 0.4 + 1.25
        FEATURES.append(("shop", side, sy, tag))
        cuts.append(facade_cut(side, sy, -0.1, 2.5, 3.1, name=tag + "_shop"))
        box(WD, tag + "_counter", (0.55, 2.3, 0.9), (xf - side * 0.12, sy, 0.45), "wood")
        box(WD, tag + "_counter_top", (0.7, 2.45, 0.06), (xf - side * 0.2, sy, 0.93), "wood")
        box(WD, tag + "_shop_shutter", (0.05, 2.3, 0.9), (xf - side * 0.45, sy, 2.45), "wood", rot=(0, side * math.radians(55), 0))
    if door:
        dy = y0 + w - 0.9 if shop else yc
        FEATURES.append(("door", side, dy, tag))
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


# ---- set dressing (Poly Haven CC0 + simple built props) -------------------------------------------
import random
rnd = random.Random(1283)
PL = coll(sc, "plants")
FIG_SPOTS = [(-0.6, 9.0), (-1.3, 9.6), (0.1, 9.7), (1.1, 5.2)]     # keep the blocking spots free
def free(x, y, r=0.9):
    return all((x - fx) ** 2 + (y - fy) ** 2 > r * r for fx, fy in FIG_SPOTS)
WARES = ["ceramic_pot", "jug_01", "wooden_bowl_01", "wooden_bowl_02", "wooden_cutting_board"]   # no antique_ceramic_vase_01: blue-and-white porcelain dates it (JEV/historian)
n = 0
for kind, side, y, tag in FEATURES:
    xf = side * HALF
    if kind == "shop":
        for k in range(3):   # wares on the counter top (z 0.96)
            ph(P, "%s_ware_%d" % (tag, k), rnd.choice(WARES), "props", loc=(xf - side * 0.22, y - 0.8 + k * 0.8, 0.96), yaw_deg=rnd.uniform(0, 360), size=rnd.uniform(0.22, 0.34))
        box(P, tag + "_awning", (1.0, 2.7, 0.02), (xf - side * 0.5, y, 3.05), "wood", rot=(0, side * math.radians(-18), 0))
        for k, yy in enumerate((y - 1.3, y + 1.3)):
            box(P, "%s_awning_pole_%d" % (tag, k), (0.04, 0.04, 0.9), (xf - side * 0.95, yy, 2.55), "wood")
        bx, by = xf - side * 0.45, y + 1.75
        if free(bx, by):
            if rnd.random() < 0.5:
                ph(P, tag + "_barrel", rnd.choice(["wine_barrel_01", "Barrel_01", "Barrel_02"]), "props", loc=(bx, by, 0), yaw_deg=rnd.uniform(0, 360), height=0.95)
            else:
                ph(P, tag + "_crate_a", "wooden_crate_01", "props", loc=(bx, by, 0), yaw_deg=rnd.uniform(-10, 10), size=0.55)
                ph(P, tag + "_crate_b", "wooden_crate_02", "props", loc=(bx, by, 0.5), yaw_deg=rnd.uniform(-15, 15), size=0.45)
    else:
        dx, dy = xf - side * 0.45, y + side * 0.0 + 0.85
        if not free(dx, dy):
            continue
        pick = rnd.choice(["stool", "bucket", "pot"])
        if pick == "stool":
            ph(P, tag + "_stool", rnd.choice(["wooden_stool_01", "wooden_stool_02"]), "seat", loc=(dx, dy, 0), yaw_deg=rnd.uniform(0, 360), height=0.45)
        elif pick == "bucket":
            ph(P, tag + "_bucket", rnd.choice(["wooden_bucket_01", "wooden_bucket_02"]), "props", loc=(dx, dy, 0), yaw_deg=rnd.uniform(0, 360), height=0.35)
        else:
            ph(P, tag + "_pot", "planter_pot_clay", "props", loc=(dx, dy, 0), height=0.45)
            ph(PL, tag + "_pot_plant", rnd.choice(["nettle_plant", "weed_plant_02", "shrub_03"]), "plant", loc=(dx, dy, 0.40), size=0.5)
# weeds and grass at the foot of the walls
for k in range(26):
    side = rnd.choice((-1, 1)); y = rnd.uniform(-1.0, 36.0)
    x = side * (HALF - 0.12)
    if free(x, y):
        ph(PL, "weed_%02d" % k, rnd.choice(["grass_medium_01", "grass_medium_02", "weed_plant_02", "dandelion_01", "celandine_01"]), "plant", loc=(x, y, 0), yaw_deg=rnd.uniform(0, 360), size=rnd.uniform(0.25, 0.45))   # size caps patch-sized models
# washing line between upper windows, a ladder, a handcart, lanterns on brackets
box(P, "line_rope", (HALF * 2, 0.012, 0.012), (0, 14.5, 7.4), "props")
for k, (x, w, h) in enumerate(((-1.2, 0.55, 0.8), (-0.3, 0.7, 0.55), (0.7, 0.5, 0.9), (1.5, 0.4, 0.6))):
    box(P, "laundry_%d" % k, (w, 0.02, h), (x, 14.5, 7.4 - h / 2), "props", rot=(0, math.radians(rnd.uniform(-4, 4)), 0))
ph(P, "ladder", "wooden_ladder", "wood", loc=(HALF - 0.45, 21.5, 0), yaw_deg=90, height=3.2)
CX, CY = -1.35, 18.0
box(P, "cart_bed", (0.9, 1.5, 0.08), (CX, CY, 0.62), "wood")
for sx in (-1, 1):
    box(P, "cart_side_%d" % sx, (0.04, 1.5, 0.28), (CX + sx * 0.43, CY, 0.8), "wood")
    cyl(P, "cart_wheel_%d" % sx, 0.42, 0.06, (CX + sx * 0.52, CY + 0.2, 0.42), "wood", rot=(0, math.radians(90), 0))
    box(P, "cart_shaft_%d" % sx, (0.05, 1.3, 0.05), (CX + sx * 0.3, CY - 1.3, 0.55), "wood", rot=(math.radians(12), 0, 0))
ph(P, "cart_load_a", "wooden_crate_01", "props", loc=(CX, CY - 0.3, 0.66), size=0.5)
ph(P, "cart_load_b", "wine_barrel_01", "props", loc=(CX, CY + 0.35, 0.66), height=0.7)
for k, (side, y) in enumerate(((-1, 7.4), (1, 12.2), (-1, 24.0))):
    xf = side * HALF
    box(P, "lantern_arm_%d" % k, (0.45, 0.04, 0.04), (xf - side * 0.22, y, 2.85), "props")
    ph(P, "lantern_%d" % k, "wooden_lantern_01", "props", loc=(xf - side * 0.42, y, 2.35), height=0.42)

# the notice (scene 2, 1300 only): on R2's plain wall
R2Y = -3.0 + 6.0 + 0.05
NOTICE = (HALF - 0.01, R2Y + 1.6, 1.65)
box(P, "notice", (0.01, 0.42, 0.58), NOTICE, "props")


# ---- materials (Poly Haven CC0, real scale) for the shaded pass -----------------------------------
WALLS = ["medieval_blocks_02", "rough_block_wall", "plaster_stone_wall_01", "plastered_stone_wall", "old_stone_wall", "sandstone_blocks_04"]
for o in objs(sc):
    part, n = o.get("part"), o.name.split(".", 1)[-1]
    if o.get("source"):                       # imported props keep their own scanned materials
        continue
    if part == "wall":
        set_mat(o, WALLS[sum(map(ord, n.split("_")[0])) % len(WALLS)])   # one stone per house
    elif part == "floor":
        set_mat(o, "stone_pavers" if n.startswith("slab") else "cobblestone_floor_02")
    elif part in ("wood", "roof"):
        set_mat(o, "weathered_planks" if part == "roof" else "medieval_wood")
    elif part == "opening":
        set_mat(o, "wooden_gate")

# blocking
# posed Human Base Mesh figures (figure.py); costume colours tell the paint pass who is who:
# white = Beatrice (Vita nuova III: dressed in white), sage and brown = the two older ladies,
# blue = Dante at 18, wine red = Guido (scene 2). Poses carry the beat.
BEATRICE, LADY_A, LADY_B, DANTE18, GUIDO = (0.95, 0.94, 0.90), (0.50, 0.58, 0.44), (0.55, 0.42, 0.32), (0.26, 0.36, 0.62), (0.48, 0.14, 0.24)
bea = figure(B, "beatrice", (-0.6, 9.0, 0), yaw_deg=180 - 25, height=1.60, pose="turn_greet", body="female", rgb=BEATRICE)
l1 = figure(B, "lady_1", (-1.3, 9.6, 0), yaw_deg=180, height=1.58, pose="walk", body="female", rgb=LADY_A)
l2 = figure(B, "lady_2", (0.1, 9.9, 0), yaw_deg=185, height=1.57, pose="walk", body="female", rgb=LADY_B,
            extra={"leg_upper.L": (30, 0, 0), "leg_upper.R": (-30, 0, 0)})      # the other foot forward: not copy-paste
dan = figure(B, "dante", (1.1, 5.2, 0), yaw_deg=35, height=1.72, pose="startled", rgb=DANTE18)
gui = figure(B, "guido", (HALF - 0.75, NOTICE[1] - 0.15, 0), yaw_deg=-90, height=1.76, pose="stand", rgb=GUIDO,
             extra={"neck": (10, 0, 0), "head": (12, 0, 12)})   # arms down, head bent to the notice: reading, still
BH, DHd, GH = (tuple(m["head_m"]) for m in (bea, dan, gui))

S1 = ["beatrice", "lady_1", "lady_2", "dante"]
shots = [
  ("sr01_wide_street",   camera(sc, "sr01", (0.5, -1.0, EYE)),                                    S1, ["notice"]),
  ("sr02_notice_wall",   camera(sc, "sr02", (-1.7, NOTICE[1] - 4.2, EYE), yaw_deg=-40),           ["guido"], []),
  # over Dante's shoulder: his shoulder and cheek on the left edge, Beatrice clear on the right third
  ("sr03_ots_dante",     camera_look(sc, "sr03", (DHd[0] + 0.95, DHd[1] - 1.35, DHd[2] + 0.05), (BH[0] - 0.6, BH[1], BH[2] - 0.1), lens=40, family="ots"), S1, ["notice"]),
  ("sr04_cu_beatrice",   camera_look(sc, "sr04", (DHd[0] - 0.2, DHd[1] + 0.35, DHd[2] - 0.05), BH, lens=60), ["beatrice", "lady_1", "lady_2"], ["notice"]),
  ("sr05_cu_dante",      camera_look(sc, "sr05", (BH[0] + 0.4, BH[1] - 1.9, BH[2] + 0.05), DHd, lens=60), ["dante"], ["notice"]),
  # Guido from along the wall, facing him: his face and the notice in one frame
  ("sr06_cu_guido",      camera_look(sc, "sr06", (HALF - 0.2, GH[1] + 1.35, GH[2] + 0.02), (GH[0] - 0.1, GH[1] - 0.35, GH[2] - 0.05), lens=40), ["guido"], []),
]
out = {}
for name, cam, figs, hide in shots:
    info = render_shot(sc, cam, OUT, name, meta={"pack": "dante_street", "period": "Florence c.1283-1300"}, figures=figs, hide=hide, lines=False)
    out[name] = info["horizon_y_px"]
result = {"shots": out, "objects": len(sc.collection.all_objects)}

save_pack(sc, OUT, "dante_street")   # the composition, for adjusting by hand

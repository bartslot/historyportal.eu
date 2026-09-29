# Pack: the commander's cabin of the Heemskerck, 1642, at sea. Pilot for the Tasman comic in the Dante recipe
# (Bart 2026-09-29): a figure-free plate (painted as a softer aquarelle background) + the same frame with
# costume-coloured mannequins (painted as the panel, figures cut out onto the plate).
# Size from JEV (2026-09-29, a jacht of ~120 last): about 4 m wide, 3 m deep, 1.6-1.7 m headroom (a tall man
# stoops); a row of small leaded stern windows (0.66) and a chart table (0.78) are plausible.
# Story (Bart): the exterior shot of the stern with a balloon points into the cabin; inside we only need the
# desk, so the shots here are tight: the two men at the chart, and the chart from above.
# Staging (story-director): Visscher, the pilot-major, sits and taps the chart; Tasman stoops under the beams
# and leans on the table to look. The windows show only open sea (the ships are at sea, no coast).
import math
OUT = ASSETS_ROOT + "/Tasman/packs/cabin"
sc = new_scene("tasman_cabin")
R, F, P, B = (coll(sc, n) for n in ("room", "furniture", "props", "blocking"))
W, BACK, FRONT, H, T = 4.0, 3.0, 0.0, 1.68, 0.12
BEAM = 0.13    # beam depth: underside at 1.55 m

floor = box(R, "floor", (W, BACK - FRONT, 0.08), (0, (BACK + FRONT) / 2, -0.04), "floor"); set_mat(floor, "old_wooden_floor_01")
back = box(R, "wall_back", (W, T, H), (0, BACK + T / 2, H / 2), "wood")
cuts = [box(R, "win_cut_%d" % k, (0.60, T + 0.3, 0.52), (-1.2 + k * 1.2, BACK + T / 2, 1.05), "opening") for k in range(3)]
cut_many(back, cuts); set_mat(back, "weathered_planks")
for k in range(3):   # small leaded stern windows: frame + panes
    wx = -1.2 + k * 1.2
    for j in range(1, 4):
        box(R, "mull_v_%d_%d" % (k, j), (0.012, 0.03, 0.52), (wx - 0.30 + j * 0.15, BACK + 0.02, 1.05), "opening")
    for j in range(1, 3):
        box(R, "mull_h_%d_%d" % (k, j), (0.60, 0.03, 0.012), (wx, BACK + 0.02, 0.79 + j * 0.173), "opening")
    for nm, zz in (("top", 1.33), ("bot", 0.77)):
        set_mat(box(R, "win_frame_%s_%d" % (nm, k), (0.68, 0.08, 0.05), (wx, BACK - 0.02, zz), "wood"), "medieval_wood")
box(R, "sea", (80, 80, 0.02), (0, BACK + 41, -0.8), "floor")      # open sea to the horizon behind the stern
for side in (-1, 1):
    wall = box(R, "wall_%d" % side, (T, BACK - FRONT, H), (side * (W / 2 + T / 2), (BACK + FRONT) / 2, H / 2), "wood")
    set_mat(wall, "weathered_planks")
    for i in range(4):   # the ship's frames showing along the sides, leaning in with the hull
        set_mat(box(R, "rib_%d_%d" % (side, i), (0.12, 0.14, H), (side * (W / 2 - 0.05), FRONT + 0.35 + i * 0.8, H / 2), "wood",
                    rot=(0, side * math.radians(5), 0)), "medieval_wood")
set_mat(box(R, "wall_front", (W, T, H), (0, FRONT - T / 2, H / 2), "wood"), "weathered_planks")
for i in range(5):   # deck beams overhead
    set_mat(box(R, "beam_%d" % i, (W, 0.18, BEAM), (0, FRONT + 0.25 + i * 0.65, H - BEAM / 2), "wood"), "medieval_wood")
set_mat(box(R, "ceiling", (W, BACK - FRONT, 0.05), (0, (BACK + FRONT) / 2, H + 0.025), "wood"), "old_planks_02")
set_mat(box(F, "stern_bench", (W - 0.3, 0.40, 0.05), (0, BACK - 0.26, 0.44), "seat"), "worn_planks")
set_mat(box(F, "stern_bench_front", (W - 0.3, 0.04, 0.42), (0, BACK - 0.45, 0.21), "seat"), "worn_planks")

# the chart table (fixed to the deck), long side to the camera; top 0.74 m
TY, TL, TD, TH = 1.75, 1.40, 0.80, 0.74
set_mat(box(F, "table_top", (TL, TD, 0.05), (0, TY, TH - 0.025), "furniture"), "worn_planks")
for sx in (-1, 1):
    for sy in (-1, 1):
        set_mat(box(F, "table_leg_%d_%d" % (sx, sy), (0.07, 0.07, TH - 0.05), (sx * (TL / 2 - 0.1), TY + sy * (TD / 2 - 0.1), (TH - 0.05) / 2), "furniture"), "medieval_wood")
    set_mat(box(F, "table_rail_%d" % sx, (0.05, TD - 0.2, 0.07), (sx * (TL / 2 - 0.1), TY, 0.10), "furniture"), "medieval_wood")
set_mat(box(F, "sea_chest", (0.9, 0.5, 0.5), (-W / 2 + 0.6, 0.55, 0.25), "furniture"), "wooden_gate")

# on the table: the chart, dividers, a rolled chart, inkwell, the journal, chart weights; a lantern on a beam
box(P, "chart", (0.90, 0.62, 0.002), (-0.05, TY + 0.10, TH + 0.001), "props", rot=(0, 0, math.radians(-4)))
box(P, "divider_a", (0.012, 0.18, 0.01), (0.17, TY + 0.07, TH + 0.008), "props", rot=(0, 0, math.radians(25)))
box(P, "divider_b", (0.012, 0.18, 0.01), (0.20, TY + 0.07, TH + 0.008), "props", rot=(0, 0, math.radians(40)))
cyl(P, "chart_roll", 0.035, 0.55, (-0.55, TY - 0.28, TH + 0.035), "props", rot=(0, math.radians(90), 0))
cyl(P, "inkwell", 0.03, 0.055, (0.55, TY + 0.25, TH + 0.028), "props")
box(P, "journal", (0.22, 0.30, 0.045), (0.52, TY - 0.16, TH + 0.022), "props", rot=(0, 0, math.radians(12)))
for k, (cx, cy) in enumerate(((-0.42, TY - 0.16), (0.35, TY + 0.36))):
    cyl(P, "weight_%d" % k, 0.03, 0.045, (cx, cy, TH + 0.023), "props")
cyl(P, "lantern", 0.08, 0.22, (0.55, TY + 0.55, H - BEAM - 0.18), "props")

# blocking. Costume codes for the paint pass: near-black = Abel Tasman (black doublet, white collar; the orange
# rosette is modelled on his chest so it lands in the same place every shot); brown = Frans Visscher.
TASMAN, VISSCHER = (0.07, 0.07, 0.08), (0.42, 0.28, 0.16)
set_mat(box(F, "stool_seat", (0.36, 0.36, 0.04), (-0.25, TY + 0.62, 0.45), "seat"), "worn_planks")
for j, (lx, ly) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
    box(F, "stool_leg_%d" % j, (0.04, 0.04, 0.43), (-0.25 + lx * 0.14, TY + 0.62 + ly * 0.14, 0.215), "seat")
f_v = figure(B, "visscher", (-0.25, TY + 0.58, 0), yaw_deg=180, height=1.70, pose="sit_point", rgb=VISSCHER,
             seat_z=0.47, extra={"head": (14, 0, -12), "chest": (10, 0, 0),
                    "arm_upper.R": (-12, 0, -6), "arm_lower.R": (8, 0, 0)})   # extras ADD to sit_point (-62): reach further onto the chart
# Tasman stands at the table's right end, stooping (headroom 1.68 m, he is 1.74 m) with both hands on the table
TY_T = 70    # yaw: +y at 0, (-sin, cos): 70 = facing -x (towards the table and Visscher), slightly aft
f_t = figure(B, "tasman", (0.95, TY + 0.30, 0), yaw_deg=TY_T, height=1.74, pose="stand", rgb=TASMAN,
             extra={"belly": (22, 0, 0), "chest": (14, 0, 0), "neck": (8, 0, 0), "head": (10, 0, 0),
                    "arm_upper.L": (-42, 0, 6), "arm_upper.R": (-42, 0, -6), "arm_lower.L": (-8, 0, 0), "arm_lower.R": (-8, 0, 0)})
bpy.context.view_layer.update()
yaw = math.radians(TY_T)
fwd = Vector((-math.sin(yaw), math.cos(yaw), 0))
chest = bpy.data.objects[sc.name + ".tasman.chest"]
cv = [chest.matrix_world @ v.co for v in chest.data.vertices]
zlo, zhi = min(p.z for p in cv), max(p.z for p in cv)
breast = zlo + 0.40 * (zhi - zlo)    # on the breast, below the collar
front_pt = max((p for p in cv if abs(p.z - breast) < 0.04), key=lambda p: p.dot(fwd))
ros = cyl(B, "tasman.rosette", 0.045, 0.02, tuple(front_pt + fwd * 0.012), "figure", rot=(math.radians(90), 0, yaw))
ros.data.materials.append(costume((1.0, 0.45, 0.02)))
VH, TH_ = tuple(f_v["head_m"]), tuple(f_t["head_m"])

sc["sky_rgb"] = (0.55, 0.60, 0.66)   # daylight from the stern windows
mid = ((VH[0] + TH_[0]) / 2, (VH[1] + TH_[1]) / 2)
shots = [   # camera at 1.35 m: the beams hang at 1.55 m, an eye-height camera would sit in them (hp1 exception)
  ("cb02_two_shot", camera_look(sc, "cb02", (-1.25, FRONT + 0.18, 1.35), (mid[0] + 0.1, mid[1], 0.95), lens=22), None),
  ("cb03_chart_top", camera(sc, "cb03", (-0.1, TY + 0.25, 1.50), pitch_deg=-90, shift_y=0.0, family="top"), ["visscher"]),   # 5b: his finger on the chart
]
out = {}
for name, cam, figs in shots:
    info = render_shot(sc, cam, OUT, name, meta={"pack": "tasman_cabin", "period": "VOC ship 1642"}, figures=figs, lines=False)
    out[name] = info["horizon_y_px"]
result = {"shots": out, "objects": len(objs(sc)), "tasman_head": TH_, "visscher_head": VH, "rosette": tuple(front_pt)}
save_pack(sc, OUT, "tasman_cabin")

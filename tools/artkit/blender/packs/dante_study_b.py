# Pack: Dante's study, version B for the A/B test: scanned CC0 props (Poly Haven) + exposed masonry as geometry.
PH = ASSETS_ROOT + "/_polyhaven/"
OUT = ASSETS_ROOT + "/Dante/packs/study_b"
sc = new_scene("study_b")
R, D, S, P, B = (coll(sc, n) for n in ("room", "desk", "stool", "props", "blocking"))

W, BACK, H, T = 4.6, 5.0, 3.2, 0.35
for i in range(int(W / 0.24) + 1):
    box(R, "floor_board_%02d" % i, (0.235, BACK + 1.0, 0.03), (-W / 2 + 0.12 + i * 0.24, (BACK - 1.0) / 2, -0.015), "floor")
WZ0, WW, WH = 1.05, 0.95, 1.05
wall = box(R, "wall_back", (W, T, H), (0, BACK + T / 2, H / 2), "wall")
cut_many(wall, [box(R, "win_cut", (WW, T + 0.2, WH), (0, BACK + T / 2, WZ0 + WH / 2), "cut")])
box(R, "window_sill", (WW + 0.12, 0.42, 0.05), (0, BACK + 0.12, WZ0 - 0.025), "opening")
wl = box(R, "wall_left", (T, BACK + 2, H), (-W / 2 - T / 2, BACK / 2 - 0.5, H / 2), "wall")
box(R, "wall_right", (T, BACK + 2, H), (W / 2 + T / 2, BACK / 2 - 0.5, H / 2), "wall")
FRONT = -1.2
fw = box(R, "wall_front", (W, T, H), (0, FRONT - T / 2, H / 2), "wall")
door = arch_cutter(R, "door_cut", 0.95, 2.25, T + 0.2, (-0.75, FRONT - T / 2, -0.10))   # cutters overshoot: coplanar faces break booleans
niche_f = arch_cutter(R, "niche_front_cut", 0.40, 0.55, 0.20, (0.85, FRONT - 0.10, 1.15))
cut_many(fw, [door, niche_f])
import_asset(R, "door_leaf", PH + "large_castle_door/large_castle_door_1k.gltf", "opening", loc=(-0.75, FRONT - 0.30, 0.0), height=2.20)
cyl(R, "niche_candle", 0.02, 0.14, (0.85, FRONT - 0.10, 1.22), "props")
cyl(R, "niche_candle_dish", 0.06, 0.015, (0.85, FRONT - 0.10, 1.157), "props")
box(R, "peg", (0.04, 0.10, 0.04), (0.30, FRONT + 0.05, 1.85), "wood")
box(R, "cloak", (0.42, 0.10, 0.95), (0.30, FRONT + 0.08, 1.38), "props", rot=(math.radians(-3), 0, 0))
box(R, "cloak_hood", (0.28, 0.14, 0.22), (0.30, FRONT + 0.11, 1.80), "props")
cut_many(wl, [arch_cutter(R, "niche_left_cut", 0.50, 0.70, 0.20, (-W / 2 - 0.06, 2.6, 1.05), rot=(0, 0, math.radians(90)))])
import_asset(R, "niche_jug", PH + "jug_01/jug_01_1k.gltf", "props", loc=(-W / 2 - 0.08, 2.6, 1.05), height=0.24)
stone_patch(R, "masonry_back_l", ("y", BACK, -1), (-1.35, 1.9), (0.75, 0.65), rng_seed=3)
stone_patch(R, "masonry_back_r", ("y", BACK, -1), (1.55, 0.55), (0.55, 0.45), rng_seed=7)
stone_patch(R, "masonry_left", ("x", -W / 2, 1), (3.9, 1.7), (0.6, 0.5), rng_seed=11)
stone_patch(R, "masonry_front", ("y", FRONT, 1), (1.6, 1.9), (0.5, 0.45), rng_seed=5)
box(R, "shelf", (0.22, 1.10, 0.04), (W / 2 - 0.11, 2.3, 1.35), "wood")
for i, (dy, t) in enumerate(((-0.35, 0.06), (-0.1, 0.05), (0.25, 0.07))):
    box(R, "shelf_book_%d" % i, (0.18, 0.24, t), (W / 2 - 0.12, 2.3 + dy, 1.37 + t / 2), "props")
import_asset(R, "chest", PH + "treasure_chest/treasure_chest_1k.gltf", "furniture", loc=(W / 2 - 0.35, 1.0, 0.0), yaw_deg=90, size=0.95)
import_asset(R, "plate", PH + "carved_wooden_plate/carved_wooden_plate_1k.gltf", "props", loc=(W / 2 - 0.10, 2.75, 1.37), yaw_deg=90, size=0.26)
for i in range(6):
    box(R, "beam_%d" % i, (W, 0.18, 0.22), (0, 0.0 + i * 1.0, H - 0.11), "wood")
for s, sx in (("L", -WW / 4), ("R", WW / 4)):
    for p in range(3):
        box(R, "shutter_%s_%d" % (s, p), (WW / 6 - 0.006, 0.04, WH - 0.02), (sx - WW / 4 + WW / 12 + p * WW / 6, BACK + 0.06, WZ0 + WH / 2), "opening")
    for b, z in enumerate((WZ0 + 0.22, WZ0 + WH - 0.22)):
        box(R, "batten_%s_%d" % (s, b), (WW / 2 - 0.08, 0.03, 0.09), (sx, BACK + 0.025, z), "opening")

DY, DD, DW, DH = 3.95, 0.70, 1.60, 0.75
box(D, "desk_top", (DW, DD, 0.05), (0, DY + DD / 2, DH - 0.025), "furniture")
for n, (lx, ly) in enumerate(((-1, 0), (1, 0), (-1, 1), (1, 1))):
    box(D, "desk_leg_%d" % n, (0.08, 0.08, DH - 0.05), (lx * (DW / 2 - 0.1), DY + 0.08 + ly * (DD - 0.16), (DH - 0.05) / 2), "furniture")
for n, ly in enumerate((0, 1)):
    box(D, "desk_stretcher_%d" % n, (DW - 0.2, 0.05, 0.06), (0, DY + 0.08 + ly * (DD - 0.16), 0.15), "furniture")
box(D, "desk_apron", (DW - 0.28, 0.03, 0.10), (0, DY + 0.05, DH - 0.10), "furniture")

SY, SS, SH = DY - 0.40, 0.36, 0.46
box(S, "stool_seat", (SS, SS, 0.04), (0, SY, SH - 0.02), "seat")
for n, (lx, ly) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
    box(S, "stool_leg_%d" % n, (0.045, 0.045, SH - 0.04), (lx * (SS / 2 - 0.04), SY + ly * (SS / 2 - 0.04), (SH - 0.04) / 2), "seat")
for n, sy in enumerate((-1, 1)):
    box(S, "stool_rung_%d" % n, (SS - 0.08, 0.03, 0.03), (0, SY + sy * (SS / 2 - 0.04), 0.14), "seat")

box(P, "lectern_base", (0.40, 0.30, 0.04), (0.50, DY + 0.45, DH + 0.02), "props")
box(P, "lectern_board", (0.44, 0.34, 0.025), (0.50, DY + 0.42, DH + 0.16), "props", rot=(math.radians(-35), 0, 0))
box(P, "lectern_book", (0.40, 0.26, 0.03), (0.50, DY + 0.40, DH + 0.19), "props", rot=(math.radians(-35), 0, 0))
box(P, "book_1", (0.26, 0.34, 0.06), (-0.52, DY + 0.35, DH + 0.03), "props", rot=(0, 0, math.radians(8)))
box(P, "book_2", (0.22, 0.30, 0.05), (-0.50, DY + 0.36, DH + 0.085), "props", rot=(0, 0, math.radians(-5)))
box(P, "sheet_sonnet", (0.22, 0.30, 0.002), (0.02, DY + 0.25, DH + 0.001), "props", rot=(0, 0, math.radians(-4)))
box(P, "sheet_reply_1", (0.20, 0.27, 0.002), (-0.20, DY + 0.18, DH + 0.001), "props", rot=(0, 0, math.radians(11)))
cyl(P, "inkwell", 0.035, 0.06, (-0.18, DY + 0.45, DH + 0.03), "props")
cyl(P, "candle_holder", 0.05, 0.02, (-0.30, DY + 0.58, DH + 0.01), "props")
cyl(P, "candle", 0.018, 0.16, (-0.30, DY + 0.58, DH + 0.10), "props")

# Dante at 18 on the stool, writing: a posed figure (figure.py) in his blue costume code, pelvis on the seat
dante = figure(B, "dante_seated", (0, SY + 0.10, 0), yaw_deg=0, height=1.72, pose="write", rgb=(0.26, 0.36, 0.62), seat_z=SH)
HEAD = tuple(dante["head_m"])

sc["sky_rgb"] = (0.38, 0.38, 0.40)   # a dim interior: the default daylight fill washed the room out
anchors = {"dante_head_m": [round(v, 3) for v in HEAD], "stool_seat_top_m": [0, SY, SH], "desk_top_z_m": DH, "desk_front_y_m": DY}
shots = {
  "st01_wide_front":   camera(sc, "st01", (0, -0.30, EYE)),
  "st02_profile":      camera(sc, "st02", (-2.15, SY + 0.10, EYE), yaw_deg=-90),
  # close on Dante reading the replies: from the desk's right end, level with his eyes
  "st04_cu_reading":   camera_look(sc, "st04", (0.95, DY + 0.15, HEAD[2] + 0.05), (HEAD[0] - 0.05, HEAD[1], HEAD[2] - 0.12), lens=40, family="cu"),

}
out = {}
for name, cam in shots.items():
    info = render_shot(sc, cam, OUT, name, meta={"pack": "dante_study", "period": "Florence 1283", "anchors": anchors})
    out[name] = info["horizon_y_px"]
result = {"shots": out}

save_pack(sc, OUT, "dante_study_b")   # the composition, for adjusting by hand

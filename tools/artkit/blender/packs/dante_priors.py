# Pack: the priors' room, Florence 1300. In 1300 the priors still met in borrowed seats (the Torre della
# Castagna) while the Palazzo dei Priori was being built: a sober stone hall, timber beams, a trestle table.
OUT = "/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets/Dante/packs/priors"
sc = new_scene("priors")
R, F, P, B = (coll(sc, n) for n in ("room", "furniture", "props", "blocking"))
W, BACK, FRONT, H, T = 8.0, 8.4, -2.0, 3.9, 0.45

box(R, "floor", (W, BACK - FRONT, 0.1), (0, (BACK + FRONT) / 2, -0.05), "floor")
for i in range(1, 12):  # stone floor joints, flush
    box(R, "joint_%02d" % i, (W, 0.02, 0.004), (0, FRONT + i * 0.9, 0.002), "floor")
back = box(R, "wall_back", (W, T, H), (0, BACK + T / 2, H / 2), "wall")
win_cuts = []
for k, wx in enumerate((-2.1, 2.1)):
    win_cuts.append(arch_cutter(R, "win_%d" % k, 1.0, 2.1, T + 0.3, (wx, BACK + T / 2, 1.25), pointed=True))
cut_many(back, win_cuts)
for k, wx in enumerate((-2.1, 2.1)):   # shutters half open, iron bar in the opening
    box(R, "shutter_%d_l" % k, (0.5, 0.04, 1.35), (wx - 0.62, BACK - 0.14, 1.95), "opening", rot=(0, 0, math.radians(-40)))
    box(R, "shutter_%d_r" % k, (0.5, 0.04, 1.35), (wx + 0.62, BACK - 0.14, 1.95), "opening", rot=(0, 0, math.radians(40)))
    box(R, "bar_%d" % k, (0.03, 0.03, 1.3), (wx, BACK + 0.2, 1.9), "opening")
    box(R, "sill_%d" % k, (1.15, 0.5, 0.06), (wx, BACK + 0.15, 1.22), "opening")
left = box(R, "wall_left", (T, BACK - FRONT + 1, H), (-W / 2 - T / 2, (BACK + FRONT) / 2, H / 2), "wall")
right = box(R, "wall_right", (T, BACK - FRONT + 1, H), (W / 2 + T / 2, (BACK + FRONT) / 2, H / 2), "wall")
cut_many(right, [arch_cutter(R, "door_r", 1.2, 2.45, T + 0.3, (W / 2 + T / 2, 3.2, -0.1), rot=(0, 0, math.radians(90)))])
box(R, "door_r_leaf", (0.06, 1.15, 2.1), (W / 2 + 0.35, 3.2, 1.05), "opening")
front = box(R, "wall_front", (W, T, H), (0, FRONT - T / 2, H / 2), "wall")
cut_many(front, [arch_cutter(R, "door_f", 1.2, 2.45, T + 0.3, (-1.8, FRONT - T / 2, -0.1))])
box(R, "door_f_leaf", (1.15, 0.06, 2.1), (-1.8, FRONT - 0.35, 1.05), "opening")
for i in range(9):  # ceiling beams on corbels
    by = FRONT + 0.6 + i * 1.2
    box(R, "beam_%d" % i, (W, 0.26, 0.30), (0, by, H - 0.15), "wood")
    for sx in (-1, 1):
        box(R, "corbel_%d_%d" % (i, sx), (0.35, 0.22, 0.25), (sx * (W / 2 - 0.17), by, H - 0.43), "wall")
box(R, "ceiling", (W, BACK - FRONT, 0.1), (0, (BACK + FRONT) / 2, H + 0.05), "wood")
# the commune's shield between the windows (the painter draws the lily)
box(R, "shield", (0.62, 0.05, 0.75), (0, BACK - 0.03, 2.45), "props")
box(R, "shield_tip", (0.44, 0.05, 0.44), (0, BACK - 0.03, 2.05), "props", rot=(0, math.radians(45), 0))

# trestle table, long side to the camera, top 0.78 m
TY, TL, TD, TH = 5.2, 3.8, 0.95, 0.78
box(F, "table_top", (TL, TD, 0.06), (0, TY, TH - 0.03), "furniture")
for k, tx in enumerate((-TL / 2 + 0.35, 0.0, TL / 2 - 0.35)):
    for sy in (-1, 1):
        box(F, "trestle_%d_%d" % (k, sy), (0.07, 0.07, 0.86), (tx, TY + sy * 0.22, (TH - 0.06) / 2), "furniture", rot=(sy * math.radians(14), 0, 0))
    box(F, "trestle_bar_%d" % k, (0.08, TD - 0.15, 0.08), (tx, TY, TH - 0.10), "furniture")
    box(F, "trestle_foot_%d" % k, (0.08, TD - 0.05, 0.06), (tx, TY, 0.03), "furniture")
box(F, "bench_back", (3.6, 0.36, 0.05), (0, TY + 0.85, 0.45), "seat")
for k, bx in enumerate((-1.6, 0, 1.6)):
    box(F, "bench_back_leg_%d" % k, (0.06, 0.30, 0.43), (bx, TY + 0.85, 0.215), "seat")
for k, sx in enumerate((-1, 1)):
    box(F, "stool_end_%d" % k, (0.36, 0.36, 0.05), (sx * (TL / 2 + 0.55), TY, 0.45), "seat")
    for j, (lx, ly) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        box(F, "stool_end_%d_leg_%d" % (k, j), (0.045, 0.045, 0.43), (sx * (TL / 2 + 0.55) + lx * 0.14, TY + ly * 0.14, 0.215), "seat")
box(F, "chest", (1.4, 0.6, 0.62), (-W / 2 + 0.9, 6.9, 0.31), "furniture")
box(F, "chest_lid", (1.44, 0.64, 0.06), (-W / 2 + 0.9, 6.9, 0.65), "furniture")
box(F, "lectern_stand", (0.10, 0.10, 1.05), (W / 2 - 1.0, 6.8, 0.525), "furniture")
box(F, "lectern_top", (0.55, 0.42, 0.04), (W / 2 - 1.0, 6.8, 1.12), "furniture", rot=(math.radians(-25), 0, 0))
# on the table: the list, other papers, inkwell, quill, a seal, a closed register
box(P, "list", (0.24, 0.40, 0.002), (0.10, TY - 0.10, TH + 0.001), "props", rot=(0, 0, math.radians(6)))
box(P, "paper_2", (0.22, 0.30, 0.002), (-0.75, TY + 0.05, TH + 0.001), "props", rot=(0, 0, math.radians(-12)))
box(P, "paper_3", (0.22, 0.30, 0.002), (1.10, TY + 0.10, TH + 0.001), "props", rot=(0, 0, math.radians(20)))
box(P, "register", (0.30, 0.40, 0.08), (-1.45, TY + 0.15, TH + 0.04), "props", rot=(0, 0, math.radians(5)))
cyl(P, "inkwell", 0.04, 0.07, (0.55, TY + 0.25, TH + 0.035), "props")
cyl(P, "seal", 0.03, 0.08, (0.72, TY + 0.20, TH + 0.04), "props")
box(P, "quill", (0.01, 0.30, 0.01), (0.46, TY + 0.10, TH + 0.01), "props", rot=(0, 0, math.radians(30)))
cyl(P, "candle_l", 0.03, 0.22, (-1.0, TY + 0.32, TH + 0.11), "props")
cyl(P, "candle_r", 0.03, 0.22, (1.5, TY + 0.32, TH + 0.11), "props")

# blocking: six priors (one per sesto) + Dante among them; the speaking prior centre-left
seats = [(-1.5, "prior_1"), (-0.55, "prior_speaker"), (0.45, "dante"), (1.4, "prior_4")]
for sx, n in seats:
    mannequin(B, n, (sx, TY + 0.95, 0), yaw_deg=180, height=1.70, seated=True, seat_h=0.47)
mannequin(B, "prior_5", (-(TL / 2 + 0.60), TY, 0), yaw_deg=-90, height=1.70, seated=True, seat_h=0.47)
mannequin(B, "prior_6", ((TL / 2 + 0.60), TY, 0), yaw_deg=90, height=1.70, seated=True, seat_h=0.47)
fig = {o.name.split(".", 1)[1]: tuple(o["head_m"]) for o in objs(sc) if o.get("part") == "figure"}
DH, SH = fig["dante"], fig["prior_speaker"]

shots = [
  ("pr01_wide_room",     camera(sc, "pr01", (0.0, 0.0, EYE)),                                             None),
  ("pr02_table_top",     camera(sc, "pr02", (0.15, TY - 0.05, TH + 0.95), pitch_deg=-90, shift_y=0.0, family="top"), []),
  ("pr03_ms_speaker",    camera_look(sc, "pr03", (SH[0] - 0.4, SH[1] - 2.3, SH[2] + 0.05), SH, lens=40),   None),
  ("pr04_cu_dante",      camera_look(sc, "pr04", (DH[0] + 0.25, DH[1] - 1.35, DH[2] + 0.02), DH, lens=60), ["dante"]),
  ("pr05_two_shot",      camera_look(sc, "pr05", ((SH[0] + DH[0]) / 2, SH[1] - 2.6, SH[2] + 0.02), ((SH[0] + DH[0]) / 2, SH[1], SH[2] - 0.1), lens=40), ["prior_speaker", "dante", "prior_1", "prior_4"]),
]
out = {}
for name, cam, figs in shots:
    info = render_shot(sc, cam, OUT, name, meta={"pack": "dante_priors", "period": "Florence 1300"}, figures=figs)
    out[name] = info["horizon_y_px"]
bpy.ops.wm.save_as_mainfile(filepath="/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets/Dante/packs/dante_packs.blend")
result = {"shots": out, "objects": len(objs(sc))}

# Pack: the dark wood (selva oscura), Inferno I. Scene 3. Built from free Sketchfab models
# (tools/artkit/fetch_sketchfab.py), not blockouts (Bart, 2026-09-27).
# Composition (Bart: "too crowded, my eyes go everywhere"): ONE focal point, the bright gap where the path
# ends, with the lit hill behind it. Everything leads there: trunk pairs in shrinking layers form a tunnel,
# one old oak bends over the path as an arch, giant ferns sit right in front of the lens (depth), the path
# floor stays calm, and haze makes each layer lighter than the one in front.
import random

# MOOD: "day" (default) or "dawn" (the poem's hour: the wood cool and dim, only the opening glows).
# Set it by sending a one-line file first:  bl.py --render --lib mood_dawn.py packs/dante_forest.py
MOOD = globals().get("MOOD", "day")
OUT = ASSETS_ROOT + "/Dante/packs/forest3d" + ("" if MOOD == "day" else "_" + MOOD)
sc = new_scene("forest")
G, T, U, B = (coll(sc, n) for n in ("ground", "trees", "plants", "blocking"))
rnd = random.Random(1300)

# (not the gnarled Skovfogedegen oak: its trunk sits metres off its own bounding-box centre)
MIGHTY, OAKT = "4f6ab5594a8a415aba3f958682b9ced5", "3dc59560f2d24345bdbe65c44636453b"
PACK, ROCK, HILLS = ("cf138b8eb2d340cda643ed59f824989c", "70b586d54a1e46ab9398f25369a39df3",
                     "6d7faf10658e44279da7356cbe749d56")
BIGFERN = "165f3870237f488885faf406d9deddc0"


def path_x(y):
    """Gentle S towards the gap, ending a little right of centre (focal point on a third)."""
    return 1.4 * math.sin(y / 15.0)


def ground_h(x, y):
    d = abs(x - path_x(y))
    bank = max(0.0, min(1.0, (d - 1.5) / 4.0))
    return bank * (0.45 + 0.25 * math.sin(x * 0.6 + y * 0.27))


bm = bmesh.new()
NX, NY, X0, X1, Y0, Y1 = 80, 140, -40.0, 40.0, -10.0, 130.0
vs = [[bm.verts.new((X0 + (X1 - X0) * i / NX, Y0 + (Y1 - Y0) * j / NY,
                     ground_h(X0 + (X1 - X0) * i / NX, Y0 + (Y1 - Y0) * j / NY))) for j in range(NY + 1)] for i in range(NX + 1)]
for i in range(NX):
    for j in range(NY):
        bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
ground = _mesh_obj("ground", bm, G, "floor")
# one floor, two materials blended by a painted mask: earth on the path fading softly into a green,
# mossy forest floor (Bart: "much more green"; a separate path strip gave a hard, flat edge)
pm = ground.data.color_attributes.new("pathmask", 'FLOAT_COLOR', 'POINT')
for v in ground.data.vertices:
    d = abs(v.co.x - path_x(v.co.y))
    t = max(0.0, min(1.0, (d - 0.9) / 1.3))          # 0 on the path, 1 on the floor, soft edge in between
    t = t * t * (3 - 2 * t)
    pm.data[v.index].color = (t, t, t, 1)


def floor_material():
    m = bpy.data.materials.get("forest_floor")
    if m:
        bpy.data.materials.remove(m)
    m = bpy.data.materials.new("forest_floor"); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]; bsdf.inputs["Roughness"].default_value = 0.95
    tc = nt.nodes.new("ShaderNodeTexCoord")

    def tex(tid, key, non_colour):
        d = os.path.join(ASSETS_ROOT, "_polyhaven_tex", tid); info = json.load(open(os.path.join(d, "credit.json")))
        mp = nt.nodes.new("ShaderNodeMapping"); tw, th = info["tile_m"]
        mp.inputs["Scale"].default_value = (1 / tw, 1 / th, 1)
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(os.path.join(d, info["maps"][key]), check_existing=True)
        t.image.colorspace_settings.name = "Non-Color" if non_colour else "sRGB"
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], t.inputs["Vector"])
        return t.outputs["Color"]
    mask = nt.nodes.new("ShaderNodeAttribute"); mask.attribute_name = "pathmask"
    green = nt.nodes.new("ShaderNodeHueSaturation")          # push the grass towards a fresh, mossy green
    green.inputs["Saturation"].default_value = 1.6; green.inputs["Value"].default_value = 1.15
    green.inputs["Hue"].default_value = 0.53
    nt.links.new(tex("leafy_grass", "diff", False), green.inputs["Color"])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'
    nt.links.new(mask.outputs["Fac"], mix.inputs["Factor"])
    nt.links.new(tex("mud_forest", "diff", False), mix.inputs[6]); nt.links.new(green.outputs[0], mix.inputs[7])
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(tex("leafy_grass", "nor", True), nm.inputs["Color"])
    nt.links.new(nm.outputs[0], bsdf.inputs["Normal"])
    return m


ground.data.materials.append(floor_material())
box(G, "meadow", (400, 140, 0.1), (0, 200, -0.05), "floor")
sf(G, "hill", HILLS, "floor", loc=(8, 235, -0.2), size=300)


BASES = []   # (x, y, trunk radius) of every big trunk: they get dressed where they meet the ground


def tree(name, uid, x, y, h, yaw=0.0, pick=None, coll_=T, part="plant"):
    if coll_ is T and h > 6:
        BASES.append((x, y, 0.5))
    return sf(coll_, name, uid, part, loc=(x, y, ground_h(x, y) - 0.35), yaw_deg=yaw, height=h, pick=pick)   # sunk in, no floating root flare


def dress_base(i, x, y, r):
    """Trunk meets floor (Bart: "more realistic contact"): roots spreading into the soil, moss on the
    root flare, grass and small woodland plants gathering at the foot, a few rocks half buried."""
    for k in range(2):
        a = rnd.uniform(0, 360)
        ph(U, "root_%d_%d" % (i, k), rnd.choice(["root_cluster_01", "root_cluster_02"]), "plant",
           loc=(x + math.cos(math.radians(a)) * r, y + math.sin(math.radians(a)) * r, ground_h(x, y) - 0.1),
           yaw_deg=a, size=rnd.uniform(1.4, 2.2))
    for k in range(7):
        a = math.radians(rnd.uniform(0, 360)); d = r + rnd.uniform(0.2, 1.4)
        gx, gy = x + math.cos(a) * d, y + math.sin(a) * d
        asset = "fern_02"
        ph(U, "foot_%d_%d" % (i, k), asset, "plant", loc=(gx, gy, ground_h(gx, gy) - 0.03), yaw_deg=rnd.uniform(0, 360),
           height=rnd.uniform(0.25, 0.55))


def bark():
    """Dark bark with deep vertical furrows (procedural, so it follows any trunk we draw)."""
    m = bpy.data.materials.get("forest_bark")
    if m:
        return m
    m = bpy.data.materials.new("forest_bark"); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.13, 0.10, 0.08, 1); bsdf.inputs["Roughness"].default_value = 0.9
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (9.0, 9.0, 1.2)            # stretched: furrows run along the trunk
    wave = nt.nodes.new("ShaderNodeTexNoise"); wave.inputs["Scale"].default_value = 3.0
    wave.inputs["Detail"].default_value = 8.0
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.9
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs[0], bsdf.inputs["Normal"])
    return m


def limb(name, pts, r0, r1, coll_=T):
    """A curvy trunk or branch as a tapered tube through pts (world metres). Hand-drawn curves give the
    extreme, sinuous shapes the forest wants (Bart, 2026-09-27); no free model bends like this."""
    cu = bpy.data.curves.new("forest." + name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = 1.0; cu.bevel_resolution = 6; cu.resolution_u = 16; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for i, (bp, p) in enumerate(zip(sp.bezier_points, pts)):
        bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
        bp.radius = r0 + (r1 - r0) * i / (len(pts) - 1)
    o = bpy.data.objects.new("forest." + name, cu); coll_.objects.link(o)
    cu.materials.append(pbr("jolcham_oak_bark_01")); o["part"] = "plant"
    return o


def crown(name, centre, h, n=3, spread=1.6):
    """Leaf masses at a limb's end: a few holly/shrub clumps, overlapping."""
    for k in range(n):
        x, y, z = centre
        u, pk = rnd.choice([(PACK, ["HollyShrub_4"]), (PACK, ["DeciduousShrub_27"])])
        o = sf(U, "%s_%d" % (name, k), u, "plant", loc=(x + rnd.uniform(-spread, spread), y + rnd.uniform(-spread, spread),
               z - h * 0.4 + rnd.uniform(-0.4, 0.4)), yaw_deg=rnd.uniform(0, 360), height=h * rnd.uniform(0.8, 1.2), pick=pk)
        o.rotation_euler[0] = math.radians(rnd.uniform(-25, 25))


# the tunnel: trunk pairs, each layer smaller in the frame, leaving the path open to the gap
# (y, left (uid, pick, height, dx from the path), right)
LAYERS = [
    (14.0, (OAKT, None, 11, -3.9), (MIGHTY, ["structure_2", "foliage_3"], 14, 4.2)),
    (24.0, (OAKT, None, 12, -4.4), (PACK, ["Oak_25"], 15, 4.6)),
    (34.0, (PACK, ["Maple_24"], 14, -4.8), (OAKT, None, 12, 4.8)),
]
for k, (y, left, right) in enumerate(LAYERS):
    for side, spec in (("l", left), ("r", right)):
        if spec:
            uid, pk, h, dx = spec
            tree("t%d%s" % (k, side), uid, path_x(y) + dx, y, h, yaw=rnd.uniform(0, 360), pick=pk)
# the arch: an old trunk rooted right of the path, rising, then bowing right over it to the left,
# its crown hanging above the far side: the frame everything is seen through
ax = path_x(8.0)
limb("arch", [(ax + 3.8, 8.0, -0.3), (ax + 3.2, 8.3, 1.5), (ax + 3.6, 8.2, 2.9), (ax + 2.2, 8.7, 4.0),
              (ax - 0.2, 9.2, 4.4), (ax - 2.6, 9.8, 3.9), (ax - 3.9, 10.4, 3.0)], 0.55, 0.14)   # peak just under the frame top
limb("arch_b1", [(ax + 3.4, 8.2, 2.6), (ax + 5.0, 8.6, 4.4), (ax + 5.6, 9.8, 6.8)], 0.26, 0.08)
limb("arch_b2", [(ax + 0.4, 9.1, 4.3), (ax + 0.2, 10.6, 6.2), (ax + 1.6, 12.0, 7.8)], 0.20, 0.06)
for i, (dx, dy) in enumerate([(-0.6, 0.0), (1.2, 0.4), (-0.6, 2.2)]):   # roots gripping the bank
    limb("arch_root%d" % i, [(ax + 3.8, 8.0, 0.6), (ax + 3.8 + dx * 0.6, 8.0 + dy * 0.6 - 0.5, 0.15),
                             (ax + 3.8 + dx * 1.6, 8.0 + dy - 1.2, -0.1)], 0.30, 0.05)
crown("arch_crown", (ax - 4.0, 10.6, 3.4), 2.6, n=3)
crown("arch_crown_b", (ax + 1.6, 12.0, 8.2), 3.0, n=3)
crown("arch_crown_c", (ax + 5.6, 9.8, 7.0), 2.6, n=2)
# the near-left trunk: an S leaning in towards the path (the other side of the frame)
lx = path_x(4.0) - 3.2
limb("lean", [(lx, 4.0, -0.3), (lx - 0.5, 4.2, 2.5), (lx + 0.6, 4.4, 5.0), (lx + 0.3, 4.9, 7.5), (lx + 1.6, 5.6, 10.5)], 0.75, 0.2)
limb("lean_b", [(lx + 0.5, 4.4, 5.2), (lx + 2.4, 5.2, 6.4), (lx + 3.2, 6.8, 7.6)], 0.26, 0.07)
crown("lean_crown", (lx + 1.8, 5.8, 10.8), 3.4, n=4)
crown("lean_crown_b", (lx + 3.2, 7.0, 7.8), 2.4, n=2)

# side walls: dark, even masses between the trunks (calm, so they don't pull the eye)
for y in range(2, 44, 3):
    for side in (-1, 1):
        x = path_x(y) + side * rnd.uniform(4.8, 7.5)
        u, pk, h = PACK, ["HollyShrub_4"], rnd.uniform(2.4, 3.4)   # one kind: an even, dark wall
        tree("wall_%d_%d" % (y, side), u, x, y + rnd.uniform(-1, 1), h, yaw=rnd.uniform(0, 360), pick=pk, coll_=U)
# depth behind the walls: trees out of the path's sight lines
for i in range(70):
    y = rnd.uniform(0, 90); x = rnd.choice((-1, 1)) * rnd.uniform(9, 30)
    u, pk, h = rnd.choice([(OAKT, None, 13), (PACK, ["Oak_25"], 16), (PACK, ["Maple_24"], 15)])
    tree("back_%d" % i, u, x, y, h * rnd.uniform(0.85, 1.15), yaw=rnd.uniform(0, 360), pick=pk)
# beyond the gap: a few light, distant trees framing the meadow and the hill
for i, (x, y) in enumerate([(-14, 58), (-9, 64), (13, 60), (18, 70), (-22, 75)]):
    tree("far_%d" % i, PACK, x, y, 14, yaw=i * 70, pick=["Oak_25"])

# where trunks meet the floor, and grass softening the path edges into the forest floor
BASES += [(path_x(8.0) + 3.8, 8.0, 0.6), (path_x(4.0) - 3.2, 4.0, 0.75)]   # the arch and the S-trunk
for i, (x, y, r) in enumerate(BASES):
    if abs(x) < 16 and y < 60:
        dress_base(i, x, y, r)
for i in range(90):
    y = rnd.uniform(-2, 44); x = path_x(y) + rnd.choice((-1, 1)) * rnd.uniform(1.2, 2.6)
    ph(U, "edge_%d" % i, "fern_02", "plant",
       loc=(x, y, ground_h(x, y) - 0.03), yaw_deg=rnd.uniform(0, 360), height=rnd.uniform(0.2, 0.4))

# (no Poly Haven moss_01/celandine/periwinkle/weed_plant: moss_01 is a row of variants that renders as
# black leaf shards; the moss green comes from the floor texture)
# the floor is alive: moss carpets, dense grass, woodland flowers, twigs and bark everywhere (Bart)
def floor_spot(off_path=1.4, y0=-4, y1=46):
    while True:
        y = rnd.uniform(y0, y1); x = path_x(y) + rnd.uniform(-12, 12)
        if abs(x - path_x(y)) > off_path:
            return x, y


for i in range(260):
    x, y = floor_spot(1.2)
    ph(U, "smallfern_%d" % i, "fern_02", "plant",   # not grass_medium: black spikes here
       loc=(x, y, ground_h(x, y) - 0.03), yaw_deg=rnd.uniform(0, 360), height=rnd.uniform(0.25, 0.5))
for i in range(60):
    x, y = floor_spot()
    ph(U, "flower_%d" % i, "fern_02", "plant",
       loc=(x, y, ground_h(x, y) - 0.03), yaw_deg=rnd.uniform(0, 360), height=rnd.uniform(0.2, 0.4))
for i in range(140):   # twigs also cross the path
    x, y = floor_spot(0.0 if i % 3 == 0 else 1.2)
    ph(U, "twigs_%d" % i, "dry_branches_medium_01", "wood", loc=(x, y, ground_h(x, y) + 0.01),
       yaw_deg=rnd.uniform(0, 360), size=rnd.uniform(0.5, 1.3))
for i in range(40):
    x, y = floor_spot(0.0)
    ph(U, "bark_%d" % i, "bark_debris_01", "wood", loc=(x, y, ground_h(x, y) + 0.01), yaw_deg=rnd.uniform(0, 360), size=rnd.uniform(0.3, 0.7))
for i, (dx, y, yaw) in enumerate([(-5.5, 18.0, 20), (6.0, 27.0, -35)]):
    ph(T, "deadlog_%d" % i, "dead_tree_trunk_02", "wood", loc=(path_x(y) + dx, y, ground_h(path_x(y) + dx, y) - 0.1), yaw_deg=yaw, size=6.0)

# giant ferns right in front of the lens (bottom corners), then smaller ones edging the path
for i, (dx, y, h) in enumerate([(-1.6, 1.3, 1.5), (1.9, 1.7, 1.7), (-2.7, 3.0, 1.3), (2.9, 4.2, 1.2)]):
    tree("bigfern_%d" % i, BIGFERN, path_x(y) + dx, y, h, yaw=i * 83, coll_=U)
for i in range(16):   # few: the floor stays calm
    y = rnd.uniform(6, 40); x = path_x(y) + rnd.choice((-1, 1)) * rnd.uniform(1.6, 3.2)
    ph(U, "fern_%d" % i, "fern_02", "plant", loc=(x, y, ground_h(x, y) - 0.05), yaw_deg=rnd.uniform(0, 360), height=rnd.uniform(0.5, 0.8))
for i, (dx, y, s) in enumerate([(-2.2, 11.0, 0.9), (2.4, 19.0, 0.7)]):
    sf(U, "rock_%d" % i, ROCK, "props", loc=(path_x(y) + dx, y, 0.0), yaw_deg=i * 50, size=s)

# light: a low sun from behind the canopy, slanting towards the camera, so the path is striped with
# shadow and rays fall through the tunnel (Bart: "a lot of shadows, and sun rays").
wn = sc.world.node_tree
if wn.nodes.get("haze"):          # an earlier attempt: a world volume is infinitely deep, the frame went black
    wn.nodes.remove(wn.nodes["haze"])
sun = _sun(sc)
sun.data.angle = math.radians(1.5)   # crisp shadow edges
if MOOD == "dawn":   # low warm sun from behind the opening, cool blue fill: the wood dim, the gap glowing
    sun.rotation_euler = (math.radians(-70), 0, math.radians(-15))
    sun.data.energy = 8.0; sun.data.color = (1.0, 0.72, 0.45)
    sc["sky_rgb"] = (0.20, 0.25, 0.34)   # dim but not black (near-black shade gets painted as holes and puddles)
else:
    sun.rotation_euler = (math.radians(-45), 0, math.radians(-62))   # high-ish, from the side: stripes across the path
    sun.data.energy = 11.0; sun.data.color = (1.0, 1.0, 1.0)
    sc["sky_rgb"] = (0.30, 0.32, 0.30)   # shade must stay readable: near-black path shade was painted as holes and puddles
# rays: a bounded box of thin haze over the tunnel only; the sun's shadows through the canopy become shafts
rays = box(G, "rays", (30, 70, 22), (0, 30, 11), "sky")
rays["shaded_only"] = True
rays.data.materials.clear()
vm = bpy.data.materials.get("forest_rays") or bpy.data.materials.new("forest_rays"); vm.use_nodes = True
vn = vm.node_tree; vn.nodes.clear()
pv = vn.nodes.new("ShaderNodeVolumePrincipled"); pv.inputs["Density"].default_value = 0.010
pv.inputs["Color"].default_value = (1.0, 0.85, 0.65, 1) if MOOD == "dawn" else (1.0, 0.96, 0.85, 1)
vn.links.new(pv.outputs[0], vn.nodes.new("ShaderNodeOutputMaterial").inputs["Volume"])
rays.data.materials.append(vm)
ee = sc.eevee
for k, v in (("use_gtao", True), ("gtao_distance", 1.5), ("use_shadows", True), ("fast_gi_distance", 1.5)):
    if hasattr(ee, k):   # soft occlusion where trunks, roots and plants meet the ground
        setattr(ee, k, v)
for k, v in (("volumetric_end", 120.0), ("volumetric_tile_size", '4'), ("use_volumetric_shadows", True),
             ("volumetric_shadow_samples", 32), ("volumetric_samples", 128)):
    if hasattr(ee, k):
        setattr(ee, k, v)

# blocking: Dante on the path facing the light; Virgil ahead, turning to him
# costume colours tell the paint pass who is who: Dante the pilgrim in his red lucco, Virgil in grey-blue
# posed figures (figure.py): Dante walks up the path towards the light, head raised; Virgil steps out of
# the trees and raises a hand
dan = figure(B, "dante", (path_x(9.0) - 0.4, 9.0, 0), yaw_deg=0, height=1.72, pose="walk", rgb=(0.72, 0.10, 0.08),
             extra={"head": (-12, 0, 0), "neck": (-6, 0, 0)})
vir = figure(B, "virgil", (path_x(12.5) + 0.6, 12.5, 0), yaw_deg=180 + 20, height=1.78, pose="greet", rgb=(0.55, 0.62, 0.72))
# the last beat ("Per cominciare, non sul colle"): the same Virgil, now pointing away from the light, to the side
vir_pt = figure(B, "virgil_point", (path_x(12.5) + 0.6, 12.5, 0), yaw_deg=180 + 20, height=1.78, pose="point",
                rgb=(0.55, 0.62, 0.72), extra={"arm_upper.R": (0, 0, -55), "head": (0, 0, -25)})
dan_turn = figure(B, "dante_turn", (path_x(9.0) - 0.4, 9.0, 0), yaw_deg=25, height=1.72, pose="stand",
                  rgb=(0.72, 0.10, 0.08), extra={"head": (-8, 0, 30)})   # he looks back up at the light

DH = dan["head_m"]
FO1_CAM = clear_view(sc, [DH, (DH[0], DH[1], 0.1), (DH[0], DH[1] + 3.0, 0.05)], 9.0,
                     elev_deg=(62, 55, 68, 50, 72), azim_deg=(200, 160, 230, 130, 180, 250, 110, 270, 90)) or (path_x(9) + 2, 3, 9)
VH = vir_pt["head_m"]; DT = dan_turn["head_m"]
FO4_CAM = clear_view(sc, [VH, DT, (VH[0], VH[1], 0.3), (DT[0], DT[1], 0.3)], 5.5,
                     elev_deg=(4, 8, 12), azim_deg=(235, 215, 250, 200, 265, 185, 280)) or (path_x(10) - 3.5, 7.0, 1.6)
SHOTS = [
    ("fo02_path_and_hill", camera(sc, "fo02", (path_x(0.0) - 0.2, 0.0, EYE)), ["dante"]),
    # side two-shot, closer: Virgil points the other way, Dante still looking up at the light
    ("fo04_other_way", camera_look(sc, "fo04", FO4_CAM, (path_x(10.8) + 0.1, 10.8, 1.35), lens=32, family="ms"),
     ["dante_turn", "virgil_point"]),   # Dante from behind, towards the light
    ("fo03_two_shot",      camera(sc, "fo03", (path_x(3.5) - 0.7, 3.5, EYE), yaw_deg=-3), ["dante", "virgil"]),   # names: no _point/_turn
    # high and steep, looking down at Dante small and lost on the path: the first clear line of sight
    # (clear_view ray-casts past trunks and crowns; guessed cameras kept landing behind a trunk)
    ("fo01_establishing_high", camera_look(sc, "fo01", FO1_CAM, (path_x(9.0) - 0.4, 9.5, 0.4), lens=26, family="high"), ["dante"]),
]
out = []
for name, cam, figs in SHOTS:
    render_shot(sc, cam, OUT, name, meta={"pack": "dante_forest", "period": "Inferno I (poem)"}, figures=figs, lines=False,
                hide=("rays",) if name.startswith("fo01") else ())   # from above the ray box is just fog
    out.append(name)
result = {"shots": out, "objects": len(objs(sc))}

save_pack(sc, OUT, "dante_forest")   # the composition, for adjusting by hand

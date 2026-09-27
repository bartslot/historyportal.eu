# Pack: the dark wood (selva oscura), Inferno I. Scene 3. Built from free Sketchfab models
# (tools/artkit/fetch_sketchfab.py), not blockouts (Bart, 2026-09-27).
# Composition (Bart: "too crowded, my eyes go everywhere"): ONE focal point, the bright gap where the path
# ends, with the lit hill behind it. Everything leads there: trunk pairs in shrinking layers form a tunnel,
# one old oak bends over the path as an arch, giant ferns sit right in front of the lens (depth), the path
# floor stays calm, and haze makes each layer lighter than the one in front.
import random

OUT = ASSETS_ROOT + "/Dante/packs/forest3d"
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
set_mat(_mesh_obj("ground", bm, G, "floor"), "stony_dirt_path")
box(G, "meadow", (400, 140, 0.1), (0, 200, -0.05), "floor")
sf(G, "hill", HILLS, "floor", loc=(8, 235, -0.2), size=300)


def tree(name, uid, x, y, h, yaw=0.0, pick=None, coll_=T, part="plant"):
    return sf(coll_, name, uid, part, loc=(x, y, ground_h(x, y) - 0.15), yaw_deg=yaw, height=h, pick=pick)


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
    cu.materials.append(bark()); o["part"] = "plant"
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
sun.rotation_euler = (math.radians(-45), 0, math.radians(-62))   # high-ish, from the side: stripes across the path
sun.data.energy = 11.0; sun.data.angle = math.radians(1.5)   # crisp shadow edges
sc["sky_rgb"] = (0.12, 0.13, 0.14)                          # low fill: shadows stay deep
# rays: a bounded box of thin haze over the tunnel only; the sun's shadows through the canopy become shafts
rays = box(G, "rays", (30, 70, 22), (0, 30, 11), "sky")
rays["shaded_only"] = True
rays.data.materials.clear()
vm = bpy.data.materials.get("forest_rays") or bpy.data.materials.new("forest_rays"); vm.use_nodes = True
vn = vm.node_tree; vn.nodes.clear()
pv = vn.nodes.new("ShaderNodeVolumePrincipled"); pv.inputs["Density"].default_value = 0.010
pv.inputs["Color"].default_value = (1.0, 0.96, 0.85, 1)
vn.links.new(pv.outputs[0], vn.nodes.new("ShaderNodeOutputMaterial").inputs["Volume"])
rays.data.materials.append(vm)
ee = sc.eevee
for k, v in (("volumetric_end", 120.0), ("volumetric_tile_size", '4'), ("use_volumetric_shadows", True),
             ("volumetric_shadow_samples", 32), ("volumetric_samples", 128)):
    if hasattr(ee, k):
        setattr(ee, k, v)

# blocking: Dante on the path facing the light; Virgil ahead, turning to him
dan = mannequin(B, "dante", (path_x(9.0) - 0.4, 9.0, 0), yaw_deg=0, height=1.72)
vir = mannequin(B, "virgil", (path_x(12.5) + 0.6, 12.5, 0), yaw_deg=180 + 20, height=1.78)

SHOTS = [
    ("fo02_path_and_hill", camera(sc, "fo02", (path_x(0.0) - 0.2, 0.0, EYE)), []),
    ("fo03_two_shot",      camera(sc, "fo03", (path_x(3.5) - 0.7, 3.5, EYE), yaw_deg=-3), ["dante", "virgil"]),
    ("fo01_establishing_high", camera(sc, "fo01", (path_x(-4) + 1.0, -4.0, 30.0), yaw_deg=-4, pitch_deg=-52, shift_y=0.0, family="high"), ["dante"]),
]
out = []
for name, cam, figs in SHOTS:
    render_shot(sc, cam, OUT, name, meta={"pack": "dante_forest", "period": "Inferno I (poem)"}, figures=figs, lines=False,
                hide=("rays",) if name.startswith("fo01") else ())   # from above the ray box is just fog
    out.append(name)
result = {"shots": out, "objects": len(objs(sc))}

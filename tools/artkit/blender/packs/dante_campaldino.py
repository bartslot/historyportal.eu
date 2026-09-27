# Pack: Campaldino, 11 June 1289. Dante rides among the Florentine feditori, the front-line cavalry
# (Leonardo Bruni, Vita di Dante, citing a lost letter of Dante). Plain in the Casentino, hills behind.
# Composition: ONE focal point, Dante's horse in the right foreground charging diagonally towards the lens;
# the charge rolls in behind him in uneven, staggered ranks. Nothing copy-pasted (Bart, 2026-09-27): each
# horse is a different model from its neighbour, with its own heading, size, gap and lance angle.
# Riders are costume-coloured mannequins; the paint pass turns them into people (see comic/).
import random

OUT = ASSETS_ROOT + "/Dante/packs/campaldino"
sc = new_scene("campaldino")
G, R, B = (coll(sc, n) for n in ("ground", "riders", "blocking"))
rnd = random.Random(1289)

# free Sketchfab horses; FACE = yaw that turns the model to face -y (towards a camera looking +y)
HORSES = [("98c3f1c40a6b422dba76bf5403e0a3d8", 0.0),     # Armored Horse: saddled, bridle
          ("e813eb5569694c5c88ee34d84a3055f3", 0.0),     # Knight's Horse: red caparison
          ("527c570af430404ba8458d473db8cc20", 90.0)]    # Low Poly Horse: saddled; faces -x natively
# (not "Animated Rigged Horse With Saddle": its tack imports as floating blobs)
HILLS = "6d7faf10658e44279da7356cbe749d56"
SADDLE_H = 1.45      # seat height on a 2.2 m (ears) horse
DANTE_RGB, FELLOW_RGB = (0.80, 0.32, 0.10), (0.46, 0.52, 0.62)   # the paint pass is told: orange = Dante

# the plain: trampled grass, gently rolling; the Casentino hills behind
bm = bmesh.new()
NX, NY = 60, 60
vs = [[bm.verts.new((-60 + 120 * i / NX, -10 + 150 * j / NY, 0.25 * math.sin(i * 0.4) * math.cos(j * 0.3) * (j / NY)))
       for j in range(NY + 1)] for i in range(NX + 1)]
for i in range(NX):
    for j in range(NY):
        bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
set_mat(_mesh_obj("plain", bm, G, "floor"), "sparse_grass")
hills = sf(G, "hills", HILLS, "floor", loc=(0, 260, -0.5), size=360)
hills.scale[2] *= 0.45    # rolling Casentino hills, not a mountain wall
for i in range(18):   # a few trees at the edge of the plain
    sf(G, "tree_%d" % i, "cf138b8eb2d340cda643ed59f824989c", "plant", loc=(rnd.uniform(-70, 70), rnd.uniform(90, 140), 0),
       yaw_deg=rnd.uniform(0, 360), height=rnd.uniform(9, 14), pick=["Oak_25"])


def rider(k, x, y, heading, is_dante=False):
    """Horse + seated rider (no lances: Bart, 2026-09-27). heading 0 = charging straight at the camera (-y)."""
    uid, face = HORSES[k % len(HORSES)]
    h = rnd.uniform(2.05, 2.3)
    sf(R, "horse_%d" % k, uid, "props", loc=(x, y, 0), yaw_deg=heading + face, height=h)
    s = h / 2.2
    name = "dante" if is_dante else "rider_%d" % k
    mannequin(B, name, (x, y + 0.15, 0), yaw_deg=heading + 180, height=rnd.uniform(1.68, 1.80), seated=True,
              seat_h=SADDLE_H * s, shin_h=0.75, rgb=DANTE_RGB if is_dante else FELLOW_RGB)
    return name


# Dante first, then the charge: staggered ranks, jittered gaps, headings fanning slightly
rider(0, 2.2, 4.5, -18, is_dante=True)
k = 1
for rank, (y0, n, spread) in enumerate([(8.5, 3, 7.0), (13.0, 4, 11.0), (19.0, 3, 15.0)]):
    xs = sorted(rnd.uniform(-spread, spread) for _ in range(n))
    for x in xs:
        if abs(x - 2.2) < 1.8 and rank == 0:
            x += 2.5                                 # keep a gap around Dante's head in the frame
        rider(k, x, y0 + rnd.uniform(-1.4, 1.4), rnd.uniform(-28, 8))
        k += 1

# dust thrown up by the charge (shaded pass only)
dust = box(G, "dust", (40, 26, 1.4), (0, 18, 0.7), "sky")   # low, behind Dante: kicked-up earth, not fog; dust["shaded_only"] = True
dust.data.materials.clear()
dm = bpy.data.materials.get("campaldino_dust") or bpy.data.materials.new("campaldino_dust"); dm.use_nodes = True
dn = dm.node_tree; dn.nodes.clear()
pv = dn.nodes.new("ShaderNodeVolumePrincipled"); pv.inputs["Density"].default_value = 0.015
pv.inputs["Color"].default_value = (0.85, 0.75, 0.6, 1)
dn.links.new(pv.outputs[0], dn.nodes.new("ShaderNodeOutputMaterial").inputs["Volume"])
dust.data.materials.append(dm)

sun = _sun(sc)
# morning sun low from behind-left: rim light on horses and riders, long shadows running towards the lens
sun.rotation_euler = (math.radians(58), 0, math.radians(-150)); sun.data.energy = 6.0; sun.data.angle = math.radians(1.0)
sc["sky_rgb"] = (0.45, 0.50, 0.58)

SHOTS = [
    # low camera, a little below the riders' eyes: the charge looms
    ("ca01_charge", camera(sc, "ca01", (-1.0, -4.0, 1.2), yaw_deg=-6), None),
    # closer on Dante in the charge (a medium shot, for his panel)
    ("ca02_dante", camera_look(sc, "ca02", (0.4, 0.2, 1.9), (2.2, 4.6, SADDLE_H + 0.9), lens=40, family="ms"), None),
]
for name, cam, figs in SHOTS:
    render_shot(sc, cam, OUT, name, meta={"pack": "dante_campaldino", "period": "1289"}, figures=figs, lines=False)
result = {"shots": [s[0] for s in SHOTS], "riders": k}

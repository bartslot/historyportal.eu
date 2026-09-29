# Pack: Campaldino, 11 June 1289. Dante, about 24, rides among the Florentine feditori, the front-line cavalry
# (Leonardo Bruni, Vita di Dante). Plain in the Casentino, green hills behind.
#
# Director's notes (Bart, 2026-09-27): movement, horses galloping, Dante clearly visible, several perspectives,
# nothing copy-pasted, nothing floating, light + contact shadows, no lances, Florentine banners.
# JEV (plausible): mail + surcoats, simple helmets, red lily on white, caparisons on some horses, war saddles,
# green summer hills. Implausible: plate armour, snowy hills.
#
# The charge runs left to right (+x). Dante leads in the rank nearest the camera; the others follow in uneven
# echelons with their own gap, heading, size and horse model; the Aretine line comes in from the right.
# Riders: posed Human Base Mesh figures (figure.py) in costume colours; the paint pass makes them people.
# Send with:  bl.py --render --lib figure.py packs/dante_campaldino.py
import random

OUT = ASSETS_ROOT + "/Dante/packs/campaldino"
sc = new_scene("campaldino")
G, R, B = (coll(sc, n) for n in ("ground", "riders", "blocking"))
rnd = random.Random(1289)

# free Sketchfab horses; FACE = yaw that turns the model to face -y
HORSES = [("98c3f1c40a6b422dba76bf5403e0a3d8", 0.0),     # Armored Horse: saddle, bridle
          ("e813eb5569694c5c88ee34d84a3055f3", 0.0),     # Knight's Horse: red caparison
          ("527c570af430404ba8458d473db8cc20", 90.0)]    # Low Poly Horse: saddled; faces -x natively
# (not "Animated Rigged Horse With Saddle": its tack imports as floating blobs)
SADDLE_H = 1.42
DANTE, FLORENCE, ARETINE = (0.80, 0.32, 0.10), (0.86, 0.84, 0.80), (0.28, 0.33, 0.30)   # costume colour codes

# --- the plain and the hills -------------------------------------------------------------------------------
def plain_h(x, y):
    """Flat, slightly rolling plain; beyond y 70 the Casentino hills rise (part of the same ground: a separate
    hill model floated as a loose sheet)."""
    roll = 0.3 * math.sin(x * 0.35) * math.cos(y * 0.3) * min(1, max(0, y) / 8)
    t = max(0.0, (y - 70) / 90)
    return roll + t * t * (13 + 5 * math.sin(x / 31.0) + 3 * math.sin(x / 13.0 + y / 29.0))   # soft, rolling


bm = bmesh.new()
NX, NY = 90, 70
vs = [[bm.verts.new((-90 + 200 * i / NX, -20 + 240 * j / NY, plain_h(-90 + 200 * i / NX, -20 + 240 * j / NY)))
       for j in range(NY + 1)] for i in range(NX + 1)]
for i in range(NX):
    for j in range(NY):
        bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
set_mat(_mesh_obj("plain", bm, G, "floor"), "sparse_grass")
for i in range(24):
    tx, ty = rnd.uniform(-80, 100), rnd.uniform(60, 130)
    sf(G, "tree_%d" % i, "cf138b8eb2d340cda643ed59f824989c", "plant", loc=(tx, ty, plain_h(tx, ty) - 0.3),
       yaw_deg=rnd.uniform(0, 360), height=rnd.uniform(9, 14), pick=["Oak_25"])


# --- riders ------------------------------------------------------------------------------------------------
def banner_mat():
    m = bpy.data.materials.get("florence_banner")
    if m:
        return m
    m = bpy.data.materials.new("florence_banner"); m.use_nodes = True
    t = m.node_tree.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(ASSETS_ROOT + "/_textures/florence_lily_banner.png", check_existing=True)
    m.node_tree.links.new(t.outputs["Color"], m.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def banner(name, hand, heading_deg):
    """A pole from the rider's hand with the Florentine lily streaming back from its top."""
    top = Vector(hand) + Vector((0, 0, 3.2))
    cyl(R, name + "_pole", 0.03, 4.2, tuple(Vector(hand) + Vector((0, 0, 1.1))), "props")
    bm = bmesh.new()
    a = math.radians(heading_deg)
    back = Vector((-math.cos(a), -math.sin(a), 0))       # the cloth streams opposite to the gallop
    W, Hh, n = 1.3, 1.0, 12
    rows = []
    for i in range(n + 1):
        u = i / n
        off = back * (u * W) + Vector((math.sin(a), -math.cos(a), 0)) * (0.18 * math.sin(u * 5.5))   # a ripple
        rows.append([bm.verts.new(top + off + Vector((0, 0, -v * Hh))) for v in (0.0, 1.0)])
    uv = bm.loops.layers.uv.new()
    for i in range(n):
        f = bm.faces.new((rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]))
        for loop, (uu, vv) in zip(f.loops, ((i / n, 1), ((i + 1) / n, 1), ((i + 1) / n, 0), (i / n, 0))):
            loop[uv].uv = (uu, vv)
    o = _mesh_obj(name + "_cloth", bm, R, "props")
    o.data.materials.append(banner_mat())


def rider(k, x, y, heading_deg, rgb, pose="ride", flag=False):
    """Horse + posed rider. heading_deg: direction of the gallop in the ground plane (0 = +x)."""
    uid, face = HORSES[k % len(HORSES)]
    h = rnd.uniform(2.05, 2.3)
    yaw_horse = face + 90 + heading_deg                    # -y model -> +x at heading 0
    horse = sf(R, "horse_%d" % k, uid, "props", loc=(x, y, 0), yaw_deg=yaw_horse, height=h)
    horse.rotation_euler[1] = math.radians(rnd.uniform(-3, 3))   # a little pitch: not all on one level
    s = h / 2.2
    name = "dante" if rgb == DANTE else "rider_%d" % k
    figure(B, name, (x - 0.1 * math.cos(math.radians(heading_deg)), y - 0.1 * math.sin(math.radians(heading_deg)), 0),
           yaw_deg=heading_deg - 90, height=rnd.uniform(1.68, 1.80), pose=pose, rgb=rgb, seat_z=SADDLE_H * s,
           extra={"head": (0, 0, rnd.uniform(-15, 15))})
    if flag:
        a = math.radians(heading_deg)
        banner("banner_%d" % k, (x + 0.3 * math.cos(a) - 0.35 * math.sin(a), y + 0.3 * math.sin(a) + 0.35 * math.cos(a), SADDLE_H * s + 0.3), heading_deg)
    return name


# PLATE: the empty plain only (lesson backgrounds; riders become separate sprites, Bart 2026-09-28).
# Send plate_mode.py first:  bl.py --render --lib figure.py plate_mode.py packs/dante_campaldino.py
PLATE = globals().get("PLATE", False)
if PLATE:
    OUT = OUT + "_plate"
    rider = lambda *a, **k: None                    # noqa: E731  no horses, riders or banners
# Dante leads in the nearest rank, arm raised; the charge follows in uneven echelons
rider(0, 3.0, 2.0, 4, DANTE, pose="charge")
k = 1
for rank, (y0, n, x_back) in enumerate([(4.0, 3, 5.0), (7.0, 4, 8.0), (11.0, 4, 12.0), (15.0, 3, 16.0)]):
    xs = sorted(rnd.uniform(-x_back, 3.0 - rank * 0.8) for _ in range(n))
    for i, x in enumerate(xs):
        rider(k, x, y0 + rnd.uniform(-1.0, 1.0), rnd.uniform(-6, 10), FLORENCE,
              pose=rnd.choice(["ride", "ride", "charge"]), flag=(k in (2, 7, 11)))
        k += 1
# the Aretine line, coming in from the right
for i in range(7):   # close enough to clash in the side shot
    rider(k, rnd.uniform(15, 22), rnd.uniform(5, 16), 180 + rnd.uniform(-12, 12), ARETINE, pose=rnd.choice(["ride", "charge"]))
    k += 1

# dust thrown up by the charge, low along the ground (shaded pass only)
dust = box(G, "dust", (46, 22, 1.6), (4, 9, 0.8), "sky"); dust["shaded_only"] = True
dust.data.materials.clear()
dm = bpy.data.materials.get("campaldino_dust") or bpy.data.materials.new("campaldino_dust"); dm.use_nodes = True
dn = dm.node_tree; dn.nodes.clear()
pv = dn.nodes.new("ShaderNodeVolumePrincipled"); pv.inputs["Density"].default_value = 0.02
pv.inputs["Color"].default_value = (0.86, 0.76, 0.6, 1)
dn.links.new(pv.outputs[0], dn.nodes.new("ShaderNodeOutputMaterial").inputs["Volume"])
dust.data.materials.append(dm)

# morning sun low from behind-left: rim light, long shadows; a readable fill
sun = _sun(sc)
sun.rotation_euler = (math.radians(55), 0, math.radians(-150)); sun.data.energy = 6.0; sun.data.angle = math.radians(1.0)
sc["sky_rgb"] = (0.45, 0.50, 0.58)

D = (3.0, 2.0, SADDLE_H + 0.9)   # Dante's head, roughly
SHOTS = [
    # 1. side tracking: the whole charge crosses the frame left to right, Dante leading on the right third,
    #    nearest and largest; banners break the skyline; hills behind
    ("ca01_side", camera(sc, "ca01", (0.5, -4.2, 1.0), yaw_deg=-18, lens=30.0, shift_y=0.02)),   # low and close: riders fill two thirds
    # 2. low and ahead of Dante: his horse comes at us on the left third, arm up; the charge fans out behind
    ("ca02_front", camera_look(sc, "ca02", (6.2, 0.6, 1.0), (1.0, 4.2, 2.4), lens=28, family="low")),   # Dante big, the charge behind him
]
for name, cam in SHOTS:
    render_shot(sc, cam, OUT, name, meta={"pack": "dante_campaldino", "period": "1289"}, lines=False)
result = {"shots": [s[0] for s in SHOTS], "riders": k}

save_pack(sc, OUT, "dante_campaldino")   # the composition, for adjusting by hand

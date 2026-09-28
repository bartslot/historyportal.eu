# Tasman 1642, the full-sail wide: Heemskerck and Zeehaen running east before the westerlies,
# late October 1642 (fair wind, NOT the 6 Nov storm: that one is reduced sail). Run: bl.py --render --lib this.py
#
# Composition (story-director): wide, screen direction east = left to right; both bows point +X, so the
# camera sits on the -Y side. Heemskerck (flagship) nearer and larger in frame, Zeehaen further back and
# astern, keeping station. Running before the wind: little heel, spray from astern, long westerly swell
# rolling left to right. Horizon on the upper third (hp1), camera low over the water as from a boat.

OUT = ASSETS_ROOT + "/Tasman/packs/sea"
HEEMSKERCK = ("8ff8f94903e84131832c35e5371b5d59", 34.0)   # "dutch ship large"
ZEEHAEN = ("551827509baf496288ae8df48b756147", 30.0)      # "Dutch Ship Medium"
# Masts measured once from each model's height profile along the hull (x from the ship's origin, top
# above the keel, in metres at the sizes above), bow first: fore, main, mizzen. Detection by heuristic
# kept mistaking the bowsprit and deck clutter for masts.
MASTS = {
    "heemskerck": [(7.0, 26.6), (-4.0, 32.1), (-13.0, 23.0)],
    "zeehaen": [(5.0, 22.2), (-3.0, 24.7), (-10.0, 15.5)],
}


def ocean(c, size=900.0):
    """A wide sea: Blender's Ocean modifier (a long swell, some chop), grey-green water."""
    me = bpy.data.meshes.new("sea")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=2, y_segments=2, size=size / 2)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(c.name.split(".")[0] + ".sea", me)
    c.objects.link(o)
    m = o.modifiers.new("ocean", 'OCEAN')
    m.geometry_mode = 'GENERATE'
    m.size = 1.0
    m.spatial_size = 120
    m.resolution = 22
    m.wave_scale = 2.2          # a long, even westerly swell: fair wind, not the storm
    m.choppiness = 0.8
    m.wind_velocity = 18.0      # a fresh westerly
    m.wave_alignment = 0.6
    m.wave_direction = 0.0      # waves travel +X, the same way as the ships (wind from astern)
    m.repeat_x = 8
    m.repeat_y = 8
    o.location = (-480, -480, 0)
    mat = bpy.data.materials.new("sea_water")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.05, 0.11, 0.13, 1)   # deep grey-green, cold water
    bsdf.inputs["Roughness"].default_value = 0.45   # a wind-roughened sea, not a mirror
    o.data.materials.append(mat)
    o["part"] = "floor"
    return o


def square_sail(c, name, x, y, z_top, z_bot, width, belly):
    """A square sail set on its yard, bellied toward the bow (+X): wind from astern."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    nu, nv = 16, 14
    verts = []
    for j in range(nv + 1):
        row = []
        t = j / nv
        z = z_top + (z_bot - z_top) * t
        for i in range(nu + 1):
            u = i / nu
            yy = y + (u - 0.5) * width * (1.0 - 0.12 * t)      # the foot a touch narrower
            # Wind from astern: the head is lashed straight to the yard (no belly at t=0), the canvas
            # bulges forward most a little below the middle, the sheets pull the foot back toward the
            # yard below. The leeches (sides) curve forward too, less than the middle.
            across = 0.3 + 0.7 * math.sin(math.pi * u)
            down = math.sin(math.pi * 0.95 * (t ** 0.8))
            b = belly * across * down
            row.append(bm.verts.new((x + b, yy, z)))
        verts.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    bm.to_mesh(me); bm.free()
    for poly in me.polygons:
        poly.use_smooth = True                   # cloth, not folded paper
    o = bpy.data.objects.new(c.name.split(".")[0] + "." + name, me)
    c.objects.link(o)
    mat = bpy.data.materials.get("canvas") or bpy.data.materials.new("canvas")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.82, 0.78, 0.68, 1)
    o.data.materials.append(mat)
    o["part"] = "props"
    return o


def strip_sails(ship):
    """Delete the model's own half-furled sails (material *_sails): the ink pass drew them as torn,
    flapping cloth next to the set sails. The mesh is shared by later imports of the same model."""
    mats = ship.data.materials
    idx = {i for i, m in enumerate(mats) if m and "sail" in m.name.lower()}
    if not idx:
        return 0
    bm = bmesh.new(); bm.from_mesh(ship.data)
    gone = [f for f in bm.faces if f.material_index in idx]
    bmesh.ops.delete(bm, geom=gone, context='FACES')
    bm.to_mesh(ship.data); bm.free()
    return len(gone)


def sun(sc, elevation_deg, azimuth_deg, strength=4.0):
    """A low sun, so the belly of the sails reads as light against shadow."""
    ld = bpy.data.lights.new("sun", 'SUN'); ld.energy = strength; ld.angle = math.radians(2)
    o = bpy.data.objects.new(sc.name + ".sun", ld)
    coll(sc, "lights").objects.link(o)
    o.rotation_euler = (math.radians(90 - elevation_deg), 0, math.radians(azimuth_deg))
    return o


def sheet(c, name, pts_rows, part="props"):
    """A cloth surface from a grid of points (rows of equal length)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rows = [[bm.verts.new(p) for p in row] for row in pts_rows]
    for j in range(len(rows) - 1):
        for i in range(len(rows[0]) - 1):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    bm.to_mesh(me); bm.free()
    for poly in me.polygons:
        poly.use_smooth = True                   # cloth, not folded paper
    o = bpy.data.objects.new(c.name.split(".")[0] + "." + name, me)
    c.objects.link(o)
    o.data.materials.append(bpy.data.materials.get("canvas"))
    o["part"] = part
    return o


def lateen_sail(c, name, x, y, base, h, belly):
    """The mizzen's triangular lateen sail, set: under a diagonal yard (low forward, high aft), its foot
    to the deck aft. Running before the wind it is let out to one side, about 50 degrees off the
    centreline, bellied to leeward."""
    head_f = (x + 6.5, base + h * 0.40)          # yard, forward (low) end
    head_a = (x - 9.0, base + h * 0.95)          # yard, after (high) end
    clew = (x - 7.5, base + h * 0.30)            # the aft lower corner, sheeted to the stern
    swing = math.radians(50)
    rows, n = [], 12
    for j in range(n + 1):                       # from the yard down to the foot
        t = j / n
        row = []
        for i in range(n + 1):
            u = i / n
            # point on the yard, then blended toward the clew: a triangle
            yx = head_f[0] + (head_a[0] - head_f[0]) * u
            yz = head_f[1] + (head_a[1] - head_f[1]) * u
            px = yx + (clew[0] - yx) * t * u
            pz = yz + (clew[1] - yz) * t * u
            b = belly * math.sin(math.pi * u) * math.sin(math.pi * min(1.0, t))
            dx, dy = px - x, b                        # in the sail's own plane, belly sideways
            row.append((x + dx * math.cos(swing), y - dx * math.sin(swing) + dy * math.cos(swing), pz))
        rows.append(row)
    return sheet(c, name, rows)


def sprit_sail(c, name, ship, y, base, h, beam):
    """The spritsail: a square sail under the bowsprit, ahead of the bow, bellied forward."""
    tip = max((ship.matrix_world @ v.co).x for v in ship.data.vertices)
    x0, zt, zb, w = tip - 3.0, base + h * 0.30, base + h * 0.12, beam * 1.3
    rows = []
    for j in range(11):
        t = j / 10
        rows.append([(x0 + beam * 0.35 * math.sin(math.pi * i / 10) * math.sin(math.pi * 0.95 * t ** 0.8),
                      y + (i / 10 - 0.5) * w, zt + (zb - zt) * t) for i in range(11)])
    return sheet(c, name, rows)


def set_sails(c, ship, key, beam):
    """Full sail, 1640s rig: course and topsail on fore and main, the lateen on the mizzen, the
    spritsail under the bowsprit. Course yard ~0.44 of the mast, topsail ~0.74."""
    mw = ship.matrix_world
    base = min((mw @ v.co).z for v in ship.data.vertices)
    ox, oy = ship.location.x, ship.location.y
    ms = [(ox + x, base + top, oy) for x, top in MASTS[key]]
    made = []
    for mi, (x, top, y) in enumerate(ms[:2]):
        h = top - base
        course = (base + h * 0.44, base + h * 0.20, beam * 2.3)
        topsail = (base + h * 0.74, base + h * 0.47, beam * 1.7)
        for si, (zt, zb, w) in enumerate((course, topsail)):
            made.append(square_sail(c, f"{key}_sail_{mi}_{si}", x + 0.6, y, zt, zb, w, belly=w * 0.30))
    if len(ms) >= 3:                             # full sail: the mizzen's lateen is set too
        x, top, y = ms[2]
        made.append(lateen_sail(c, f"{key}_lateen", x, y, base, top - base, belly=2.2))
    fx, ftop, fy = ms[0]
    made.append(sprit_sail(c, f"{key}_sprit", ship, fy, base, ftop - base, beam))
    return [(round(m[0], 1), round(m[1], 1)) for m in ms], made


sc = new_scene("tasman_fullsail_wide")
_set_world(sc, (0.72, 0.78, 0.82))                      # cold bright sky
c = coll(sc, "sea")
ocean(c)
ships = coll(sc, "ships")
heem = sf(ships, "heemskerck", HEEMSKERCK[0], "props", loc=(0, 0, -1.4), size=HEEMSKERCK[1])
zee = sf(ships, "zeehaen", ZEEHAEN[0], "props", loc=(-55, 10, -1.2), size=ZEEHAEN[1])    # astern, off the line of sight, in frame
stripped = {k: strip_sails(o) for k, o in (("heemskerck", heem), ("zeehaen", zee))}
sun(sc, elevation_deg=24, azimuth_deg=-60)            # low, from the port bow side: the bellies shade
sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55
found = {}
for key, s_obj, beam in (("heemskerck", heem, 8.4), ("zeehaen", zee, 7.0)):
    found[key], sails = set_sails(ships, s_obj, key, beam)
    for sail in sails:                                   # the sails heel with their ship
        sail.parent = s_obj
        # matrix_basis, not matrix_world: the world matrix is stale until the depsgraph updates, so a
        # ship moved away from the origin got its offset twice (the Zeehaen's sails floated astern).
        sail.matrix_parent_inverse = s_obj.matrix_basis.inverted()
for s_obj, roll in ((heem, 2.0), (zee, 1.5)):
    s_obj.rotation_euler[0] = math.radians(roll)         # running: very little heel

# Ahead on the port bow, looking back: running before the wind the sails stand square across the
# ship, so from abeam they are edge-on. From here the ships come on diagonally, still heading right
# (east), and the canvas shows its full width. yaw 40.6 deg = looking back along (-60, 70).
# EXCEPTION to hp1 (for Bart's OK): horizon on the LOWER third. A ship under full sail needs the sky:
# with the house horizon (upper third) the masts leave the frame and two thirds is empty sea.
cam = camera(sc, "wide", (44, -52, 4.5), yaw_deg=40.2, pitch_deg=0.0, shift_y=(RES_Y / 6) / RES_X)
cam["family"] = "sea-wide"
meta = {"pack": "tasman_sea", "date": "late October 1642", "wind": "westerly, from astern"}
render_shot(sc, cam, OUT, "fullsail_wide", meta=meta, lines=False)
# Bart's test (2026-09-28): the same frame with a FLAT sea, the waves left to the ink pass's prompt.
sea_obj = next(o for o in objs(sc) if o.name.endswith(".sea"))
sea_obj.modifiers["ocean"].show_render = False
sea_obj.modifiers["ocean"].show_viewport = False
sea_obj.scale = (1, 1, 1)
render_shot(sc, cam, OUT, "fullsail_wide_flat", meta=dict(meta, sea="flat plane, waves from the prompt"), lines=False)
result = {"masts": found, "sail_faces_removed": stripped}

# Blender-side helpers for history-line asset packs (house camera hp1). Sent together with a pack
# script to the Blender Lab MCP socket (see tools/artkit/blender/bl.py); runs inside Blender.
import bpy, bmesh, math, json, os, colorsys
from mathutils import Vector

RES_X, RES_Y = 2560, 1440
EYE = 1.60
HFOV = 65.0
LENS = 18.0 / math.tan(math.radians(HFOV / 2))          # 28.25 mm on a 36 mm sensor
# Mask colours per part, the same in every pack.
PARTS = {
    "floor": (255, 0, 0), "wall": (255, 255, 0), "opening": (0, 255, 0), "furniture": (0, 255, 255),
    "seat": (0, 0, 255), "props": (255, 0, 255), "wood": (255, 128, 0), "roof": (128, 0, 255),
    "sky": (0, 0, 0),
}


def new_scene(name):
    old = bpy.data.scenes.get(name)
    if old:
        for o in list(objs(old)):
            bpy.data.objects.remove(o, do_unlink=True)
        for c in list(old.collection.children_recursive):
            bpy.data.collections.remove(c)
        sc = old
    else:
        sc = bpy.data.scenes.new(name)
    sc.unit_settings.system = 'METRIC'
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = RES_X, RES_Y, 100
    sc.view_settings.view_transform = 'Standard'
    if not sc.world:
        sc.world = bpy.data.worlds.new(name + "_world")
    wins = bpy.context.window_manager.windows
    if wins:                                   # interactive Blender; headless has no window
        wins[0].scene = sc
    return sc


def _depsgraph(sc):
    """This scene's evaluated depsgraph, with or without a window (headless render PC)."""
    vl = sc.view_layers[0]
    with bpy.context.temp_override(scene=sc, view_layer=vl):
        dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    return dg


def coll(sc, name):
    c = bpy.data.collections.get(sc.name + ":" + name)
    if not c:
        c = bpy.data.collections.new(sc.name + ":" + name)
        sc.collection.children.link(c)
    return c


def _mesh_obj(name, bm, c, part):
    name = c.name.split(":")[0] + "." + name        # scene prefix: packs never share object names
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    c.objects.link(o)
    o["part"] = part
    return o


def box(c, name, size, loc, part, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    o = _mesh_obj(name, bm, c, part)
    o.location = loc; o.rotation_euler = rot
    return o


def cyl(c, name, r, h, loc, part, rot=(0, 0, 0), v=24):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=v, radius1=r, radius2=r, depth=h)
    o = _mesh_obj(name, bm, c, part)
    o.location = loc; o.rotation_euler = rot
    return o


def arch_cutter(c, name, w, h, depth, loc, rot=(0, 0, 0), pointed=False):
    """Opening cutter: a rectangle of height h - w/2 topped by a round (or pointed) arch; y = depth axis."""
    parts = [box(c, name + "_r", (w, depth, h - w / 2), (0, 0, (h - w / 2) / 2), "cut")]
    if pointed:
        for s in (-1, 1):
            k = cyl(c, name + "_a%d" % s, w * 0.75, depth, (s * w * 0.25, 0, h - w / 2), "cut", rot=(math.radians(90), 0, 0), v=48)
            parts.append(k)
    else:
        parts.append(cyl(c, name + "_a", w / 2, depth, (0, 0, h - w / 2), "cut", rot=(math.radians(90), 0, 0), v=48))
    o = join(parts, name)
    if pointed:  # clip the two circles to the opening width and the apex
        clip = box(c, name + "_clip", (w, depth + 0.1, h), (0, 0, h / 2), "cut")
        boolean(o, clip, 'INTERSECT')
    o.location = loc; o.rotation_euler = rot
    return o


def join(objs, name):
    """Merge objects into the first one (world transforms baked), without operators."""
    base = objs[0]
    bm = bmesh.new()
    for o in objs:
        m = o.data.copy(); m.transform(o.matrix_basis if o.parent is None else o.matrix_world)
        bm.from_mesh(m); bpy.data.meshes.remove(m)
    base.location = (0, 0, 0); base.rotation_euler = (0, 0, 0); base.scale = (1, 1, 1)
    bm.to_mesh(base.data); bm.free()
    for o in objs[1:]:
        bpy.data.objects.remove(o, do_unlink=True)
    base.name = objs[0].users_collection[0].name.split(":")[0] + "." + name if "." not in name else name
    return base


def boolean(target, cutter, op='DIFFERENCE', keep=False):
    """Apply a boolean through the depsgraph (no operator context needed)."""
    m = target.modifiers.new("b", 'BOOLEAN'); m.operation = op; m.object = cutter; m.solver = 'EXACT'
    m.use_self = True; m.use_hole_tolerant = True     # cutters are overlapping parts (box + arch)
    dg = _depsgraph(target.users_scene[0])
    ev = target.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, depsgraph=dg)
    old = target.data
    target.modifiers.remove(m)
    target.data = me
    bpy.data.meshes.remove(old)
    if not keep:
        bpy.data.objects.remove(cutter, do_unlink=True)


def cut_many(target, cutters):
    if not cutters:
        return
    cut = join(cutters, target.name + "_cuts")
    boolean(target, cut)


def camera(sc, name, loc, yaw_deg=0.0, pitch_deg=0.0, lens=LENS, shift_y=None, family="hp1"):
    """hp1: level camera at eye height, horizon on the upper third via lens shift.
    family 'top' = straight down insert shot (approved exception)."""
    cd = bpy.data.cameras.new(name)
    cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.0; cd.lens = lens
    cd.shift_y = (-(RES_Y / 6) / RES_X) if shift_y is None else shift_y
    cam = bpy.data.objects.new(sc.name + "." + name, cd)
    coll(sc, "cameras").objects.link(cam)
    cam.location = loc
    cam.rotation_euler = (math.radians(90 + pitch_deg), 0, math.radians(yaw_deg))
    cam["family"] = family
    return cam


def mannequin(c, name, loc, yaw_deg=0.0, height=1.70, seated=False, seat_h=0.46):
    """Blocking figure from primitives; faces +y at yaw 0. Not rendered in background passes."""
    s = height / 1.70
    ps = []
    x, y, z = loc
    if seated:
        hip = seat_h + 0.10 * s
        ps.append(box(c, name + "_thighs", (0.34 * s, 0.46 * s, 0.14 * s), (0, 0.18 * s, seat_h + 0.07 * s), "figure"))
        ps.append(box(c, name + "_shins", (0.30 * s, 0.12 * s, seat_h), (0, 0.40 * s, seat_h / 2), "figure"))
    else:
        hip = 0.90 * s
        for sx in (-1, 1):
            ps.append(cyl(c, name + "_leg%d" % sx, 0.07 * s, hip, (sx * 0.10 * s, 0, hip / 2), "figure"))
    ps.append(box(c, name + "_torso", (0.40 * s, 0.24 * s, 0.58 * s), (0, 0, hip + 0.29 * s), "figure"))
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=0.11 * s)
    head = _mesh_obj(name + "_head", bm, c, "figure"); head.location = (0, 0, hip + 0.58 * s + 0.16 * s)
    ps.append(head)
    ps.append(box(c, name + "_nose", (0.04, 0.06, 0.04), (0, 0.11 * s, hip + 0.74 * s), "figure"))
    o = join(ps, name)
    o["part"] = "figure"; o["height_m"] = height; o["seated"] = seated
    o["head_m"] = [round(x, 3), round(y, 3), round(z + hip + 0.74 * s, 3)]
    o.location = (x, y, z); o.rotation_euler = (0, 0, math.radians(yaw_deg))
    return o


def _white_mat():
    m = bpy.data.materials.get("hp1_flat_white")
    if not m:
        m = bpy.data.materials.new("hp1_flat_white"); m.use_nodes = True
        nt = m.node_tree; nt.nodes.clear()
        em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (1, 1, 1, 1)
        out = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(em.outputs[0], out.inputs[0])
    return m


def _set_world(sc, rgb):
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes.get("Background") or sc.world.node_tree.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (*rgb, 1); bg.inputs["Strength"].default_value = 1
    sc.world.color = rgb


def objs(sc):
    """All objects of a scene. Not `objs(sc)`: that list is cached and misses
    objects created earlier in the same script, so visibility loops silently skipped them."""
    seen, out = set(), []
    for c in [sc.collection] + list(sc.collection.children_recursive):
        for o in c.objects:
            if o.name not in seen:
                seen.add(o.name); out.append(o)
    return out


def _sync(sc):
    """Visibility flips inside one script must reach the depsgraph before the next render."""
    sc.view_layers[0].update()
    _depsgraph(sc)


def _figures_visible(sc, on, only=None):
    for o in objs(sc):
        if o.get("part") == "figure":
            o.hide_render = not (on and (only is None or any(o.name.endswith("." + n) for n in only)))
    _sync(sc)


def render_shot(sc, cam, outdir, shot, meta=None, blocking=True, figures=None, hide=()):
    """Writes <shot>_lines.png, _clay.png, _mask.png, (_blocking.png) and _camera.json.
    figures: names of the blocking mannequins to show (None = all); hide: objects left out of this shot."""
    for o in objs(sc):
        if o.get("part") != "figure":
            o.hide_render = any(o.name.endswith("." + h) for h in hide)
    _sync(sc)
    os.makedirs(outdir, exist_ok=True)
    sc.camera = cam
    wm = bpy.data.materials
    white = _white_mat()
    for o in objs(sc):
        if o.type == 'MESH':
            o.data.materials.clear(); o.data.materials.append(white)
            rgb = PARTS.get(o.get("part", "wall"), (128, 128, 128))
            o.color = (rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1)
    d = sc.display.shading
    p = lambda k: os.path.join(outdir, "%s_%s.png" % (shot, k))

    _figures_visible(sc, False)
    # lines
    sc.render.engine = 'BLENDER_EEVEE'; _set_world(sc, (1, 1, 1))
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 2.0
    vl = sc.view_layers[0]; vl.use_freestyle = True
    fs = vl.freestyle_settings
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new("lines")
    ls.select_by_visibility = True; ls.visibility = 'VISIBLE'
    ls.select_silhouette = ls.select_border = ls.select_crease = True
    ls.linestyle.color = (0, 0, 0); ls.linestyle.thickness = 2.0
    sc.render.filepath = p("lines"); bpy.ops.render.render(write_still=True, scene=sc.name)
    sc.render.use_freestyle = False
    # clay
    sc.render.engine = 'BLENDER_WORKBENCH'; _set_world(sc, (1, 1, 1))
    d.light = 'STUDIO'; d.color_type = 'SINGLE'; d.single_color = (0.95, 0.95, 0.95)
    d.show_cavity = True; d.show_object_outline = True; d.object_outline_color = (0, 0, 0); d.show_shadows = False
    sc.display.render_aa = '8'
    sc.render.filepath = p("clay"); bpy.ops.render.render(write_still=True, scene=sc.name)
    # blocking (clay with the mannequins)
    has_fig = any(o.get("part") == "figure" and (figures is None or any(o.name.endswith("." + n) for n in figures))
                  for o in objs(sc))
    if blocking and has_fig:
        _figures_visible(sc, True, figures)
        sc.render.filepath = p("blocking"); bpy.ops.render.render(write_still=True, scene=sc.name)
        _figures_visible(sc, False)
    # mask
    _set_world(sc, (0, 0, 0))
    d.light = 'FLAT'; d.color_type = 'OBJECT'; d.show_cavity = False; d.show_object_outline = False
    sc.display.render_aa = 'OFF'
    sc.render.filepath = p("mask"); bpy.ops.render.render(write_still=True, scene=sc.name)
    _set_world(sc, (1, 1, 1))
    # camera sidecar
    cd = cam.data
    f_px = (RES_X / 2) / (cd.sensor_width / 2 / cd.lens)
    info = {
        "shot": shot, "scene": sc.name, "family": cam.get("family", "hp1"),
        "resolution": [RES_X, RES_Y], "camera_location_m": [round(v, 4) for v in cam.location],
        "camera_rotation_deg": [round(math.degrees(a), 3) for a in cam.rotation_euler],
        "lens_mm": round(cd.lens, 3), "sensor_width_mm": cd.sensor_width, "shift_y": round(cd.shift_y, 5),
        "focal_px": round(f_px, 2),
        "horizon_y_px": round(RES_Y / 2 + cd.shift_y * RES_X, 2) if cam.get("family", "hp1") == "hp1" else None,
        "eye_height_m": round(cam.location.z, 3),
        "mask_palette_rgb": {k: list(v) for k, v in PARTS.items()},
        "axes": "x right, y forward, z up, metres; camera yaw 0 looks +y",
    }
    figs = {}
    for o in objs(sc):
        if o.get("part") == "figure" and (figures is None or any(o.name.endswith("." + n) for n in figures)):
            figs[o.name.split(".", 1)[1]] = {"feet_m": [round(v, 3) for v in o.location], "head_m": list(o.get("head_m") or []),
                                            "height_m": o.get("height_m"), "seated": o.get("seated", False)}
    info["figures"] = figs
    if meta:
        info.update(meta)
    json.dump(info, open(os.path.join(outdir, shot + "_camera.json"), "w"), indent=1)
    return info


def camera_look(sc, name, loc, target, lens=50.0, family="cu"):
    """Close-up / over-the-shoulder camera aimed at a point (e.g. a head). No lens shift;
    the composer frames the face on a third afterwards."""
    cd = bpy.data.cameras.new(name)
    cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.0; cd.lens = lens; cd.shift_y = 0.0
    cam = bpy.data.objects.new(sc.name + "." + name, cd)
    coll(sc, "cameras").objects.link(cam)
    cam.location = loc
    direction = Vector(target) - Vector(loc)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    cam["family"] = family
    cam["target_m"] = list(target)
    return cam


def head_of(mannequin_obj, height=1.70, seated=False, seat_h=0.46):
    s = height / 1.70
    hip = (seat_h + 0.10 * s) if seated else 0.90 * s
    x, y, z = mannequin_obj.location
    return (x, y, z + hip + 0.74 * s)


def import_asset(c, name, gltf_path, part, loc=(0, 0, 0), yaw_deg=0.0, height=None, size=None):
    """Import a glTF (e.g. Poly Haven CC0), bake it into one mesh object in collection c.
    height: scale so the object is this tall (m); size: scale so its longest side is this long."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=gltf_path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    bm = bmesh.new()
    for o in meshes:
        m = o.data.copy(); m.transform(o.matrix_world); bm.from_mesh(m); bpy.data.meshes.remove(m)
    me = bpy.data.meshes.new(c.name.split(":")[0] + "." + name)
    bm.to_mesh(me); bm.free()
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    dims = (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
    k = 1.0
    if height:
        k = height / dims[2]
    elif size:
        k = size / max(dims)
    # origin at the bottom centre, then scale
    cx, cy, z0 = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)
    for v in me.vertices:
        v.co.x, v.co.y, v.co.z = (v.co.x - cx) * k, (v.co.y - cy) * k, (v.co.z - z0) * k
    o = bpy.data.objects.new(me.name, me); c.objects.link(o)
    o["part"] = part; o.location = loc; o.rotation_euler = (0, 0, math.radians(yaw_deg))
    o["source"] = gltf_path
    return o


def stone_patch(c, name, plane, centre, radius, rng_seed=1, course=0.17, gap=0.016, proud=0.012):
    """Exposed masonry where plaster has fallen off: stone blocks as real geometry (their joints
    become lines in the line render). plane: ('y', value, facing) for a wall facing -y/+y, or
    ('x', value, facing) for a wall facing -x/+x; centre: (u, z) on the wall; radius: (ru, rz)."""
    import random
    rnd = random.Random(rng_seed)
    axis, value, facing = plane
    u0, z0c = centre
    ru, rz = radius
    blocks = []
    z = z0c - rz
    row = 0
    while z < z0c + rz:
        h = course * rnd.uniform(0.75, 1.3)
        u = u0 - ru - rnd.uniform(0, 0.25)
        while u < u0 + ru:
            L = rnd.uniform(0.18, 0.42)
            cu, cz = u + L / 2, z + h / 2 + rnd.uniform(-0.012, 0.012)   # rubble courses are not ruled
            if ((cu - u0) / ru) ** 2 + ((cz - z0c) / rz) ** 2 < 1.0 - rnd.uniform(0, 0.25):
                tilt = math.radians(rnd.uniform(-2.5, 2.5))
                hh = (h - gap) * rnd.uniform(0.85, 1.0)
                if axis == 'y':
                    pos = (cu, value + facing * proud / 2, cz); sz = (L - gap, proud, hh); rot = (0, tilt, 0)
                else:
                    pos = (value + facing * proud / 2, cu, cz); sz = (proud, L - gap, hh); rot = (tilt, 0, 0)
                blocks.append(box(c, "%s_%d_%d" % (name, row, len(blocks)), sz, pos, "wall", rot=rot))
            u += L
        z += h; row += 1
    return join(blocks, name) if blocks else None

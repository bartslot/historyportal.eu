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
    "plant": (0, 128, 0), "sky": (0, 0, 0),
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


def costume(rgb):
    """A flat matte colour for a mannequin: the paint pass is told which colour is which character."""
    name = "costume_%02x%02x%02x" % tuple(round(v * 255) for v in rgb)
    m = bpy.data.materials.get(name)
    if not m:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*rgb, 1)
        b.inputs["Roughness"].default_value = 0.9
    return m


def mannequin(c, name, loc, yaw_deg=0.0, height=1.70, seated=False, seat_h=0.46, rgb=None, shin_h=None):
    """Blocking figure from primitives; faces +y at yaw 0. Not rendered in background passes."""
    s = height / 1.70
    ps = []
    x, y, z = loc
    if seated:
        hip = seat_h + 0.10 * s
        ps.append(box(c, name + "_thighs", (0.34 * s, 0.46 * s, 0.14 * s), (0, 0.18 * s, seat_h + 0.07 * s), "figure"))
        shin = shin_h or seat_h        # shin_h: legs hang from a saddle instead of reaching the floor
        ps.append(box(c, name + "_shins", (0.30 * s, 0.12 * s, shin), (0, 0.40 * s, seat_h - shin / 2), "figure"))
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
    if rgb:
        o.data.materials.clear(); o.data.materials.append(costume(rgb))
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


def _is_fig(o, names):
    """Box mannequins are one object "<scene>.<name>"; posed figures are parts "<scene>.<name>.<part>"."""
    return any(o.name.endswith("." + n) or ("." + n + ".") in o.name for n in names)


def _figures_visible(sc, on, only=None):
    for o in objs(sc):
        if o.get("part") == "figure":
            o.hide_render = not (on and (only is None or _is_fig(o, only)))
    _sync(sc)


def render_shot(sc, cam, outdir, shot, meta=None, blocking=True, figures=None, hide=(), lines=True, shaded=True):
    """Writes <shot>_shaded.png (materials, GPU), _lines.png (Freestyle, CPU: skip for heavy scenes),
    _clay.png, _mask.png, (_blocking.png) and _camera.json.
    figures: names of the blocking mannequins to show (None = all); hide: objects left out of this shot."""
    for o in objs(sc):
        if o.get("part") != "figure":
            o.hide_render = any(o.name.endswith("." + h) for h in hide)
    _sync(sc)
    os.makedirs(outdir, exist_ok=True)
    sc.camera = cam
    wm = bpy.data.materials
    white = _white_mat()
    p = lambda k: os.path.join(outdir, "%s_%s.png" % (shot, k))
    if shaded:   # materials as assigned (Poly Haven textures, glTF props), sun + sky, Eevee on the GPU
        _figures_visible(sc, False)
        _sun(sc); sc.render.engine = 'BLENDER_EEVEE'; sc.render.use_freestyle = False
        _set_world(sc, tuple(sc.get("sky_rgb", (0.78, 0.82, 0.88))))   # a pack may darken the fill for deep shadows
        sc.view_settings.view_transform = 'AgX'
        for k, v in (("use_gtao", True), ("use_raytracing", True), ("use_shadows", True)):
            if hasattr(sc.eevee, k):   # ambient occlusion + ray-traced contact shadows: nothing floats (Bart)
                setattr(sc.eevee, k, v)
        sc.render.filepath = p("shaded"); bpy.ops.render.render(write_still=True, scene=sc.name)
        if any(o.get("part") == "figure" for o in objs(sc)) and figures != []:
            # the same frame with the costume-coloured mannequins: the paint pass turns each colour into
            # its character, at the right size and perspective (comic panels, 2026-09-27)
            _figures_visible(sc, True, figures)
            sc.render.filepath = p("shadedfig"); bpy.ops.render.render(write_still=True, scene=sc.name)
            _figures_visible(sc, False)
        sc.view_settings.view_transform = 'Standard'
    if shaded:   # depth: metres from the camera plane, 16-bit PNG, 0 = at the camera, 65535 = DEPTH_MAX or farther.
        # For foreground cut-outs (a street corner, a table, ferns) that sprites walk behind (Bart, 2026-09-28).
        _figures_visible(sc, False)
        dm = _depth_mat()
        sc.view_layers[0].material_override = dm
        vt, look = sc.view_settings.view_transform, sc.view_settings.look
        sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
        wc = tuple(sc.world.color); _set_world(sc, (1, 1, 1))     # sky = far
        fmt = sc.render.image_settings
        old = (fmt.color_depth, fmt.color_mode)
        fmt.color_depth = '16'; fmt.color_mode = 'BW'
        sc.render.filepath = p("depth"); bpy.ops.render.render(write_still=True, scene=sc.name)
        fmt.color_depth, fmt.color_mode = old
        sc.view_layers[0].material_override = None
        sc.view_settings.view_transform, sc.view_settings.look = vt, look
        _set_world(sc, wc)
    sun = bpy.data.objects.get(sc.name + ".hp1_sun")
    if sun:
        sun.hide_render = True
    only_shaded = [o for o in objs(sc) if o.get("shaded_only")]   # e.g. a ray volume: a solid box in clay/mask
    for o in only_shaded:
        o.hide_render = True
    # white via the view layer override: clearing mesh slots would reset every face to slot 0
    # (multi-material assets then kept bark on their leaves in every later shot)
    sc.view_layers[0].material_override = white
    for o in objs(sc):
        if o.type == 'MESH':
            rgb = PARTS.get(o.get("part", "wall"), (128, 128, 128))
            o.color = (rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1)
    d = sc.display.shading

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
    plants = bpy.data.collections.get(sc.name + ":plants")
    if plants:   # dense foliage: thin silhouette-only lines, or it renders as a black blob
        ls.select_by_collection = True; ls.collection = plants; ls.collection_negation = 'EXCLUSIVE'
        lp = fs.linesets.get("plants") or fs.linesets.new("plants")
        lp.select_by_visibility = True; lp.visibility = 'VISIBLE'
        lp.select_by_collection = True; lp.collection = plants; lp.collection_negation = 'INCLUSIVE'
        lp.select_by_edge_types = True
        lp.select_silhouette = True; lp.select_border = True; lp.select_crease = False
        lp.linestyle.color = (0, 0, 0); lp.linestyle.thickness = 1.1
    if lines:
        sc.render.filepath = p("lines"); bpy.ops.render.render(write_still=True, scene=sc.name)
    sc.render.use_freestyle = False
    # clay
    sc.render.engine = 'BLENDER_WORKBENCH'; _set_world(sc, (1, 1, 1))
    d.light = 'STUDIO'; d.color_type = 'SINGLE'; d.single_color = (0.95, 0.95, 0.95)
    d.show_cavity = True; d.show_object_outline = True; d.object_outline_color = (0, 0, 0); d.show_shadows = False
    sc.display.render_aa = '8'
    sc.render.filepath = p("clay"); bpy.ops.render.render(write_still=True, scene=sc.name)
    # blocking (clay with the mannequins)
    has_fig = any(o.get("part") == "figure" and (figures is None or _is_fig(o, figures)) for o in objs(sc))
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
    sc.view_layers[0].material_override = None
    if sun:
        sun.hide_render = False
    for o in only_shaded:
        o.hide_render = False
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
        if o.get("part") == "figure" and o.get("head_m") and (figures is None or _is_fig(o, figures)):
            figs[o.get("fig_name") or o.name.split(".", 1)[1]] = {"feet_m": [round(v, 3) for v in o.location], "head_m": list(o.get("head_m") or []),
                                            "height_m": o.get("height_m"), "seated": o.get("seated", False)}
    info["figures"] = figs
    if meta:
        info.update(meta)
    json.dump(info, open(os.path.join(outdir, shot + "_camera.json"), "w"), indent=1)
    return info


DEPTH_MAX = 200.0   # metres at white in _depth.png


def _depth_mat():
    """Emission = camera Z distance / DEPTH_MAX (linear, unlit), for the depth pass."""
    m = bpy.data.materials.get("hp1_depth")
    if m:
        return m
    m = bpy.data.materials.new("hp1_depth"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    cam = nt.nodes.new("ShaderNodeCameraData")
    div = nt.nodes.new("ShaderNodeMath"); div.operation = 'DIVIDE'; div.inputs[1].default_value = DEPTH_MAX
    em = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(cam.outputs["View Z Depth"], div.inputs[0]); nt.links.new(div.outputs[0], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


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


def clear_view(sc, target_pts, dist, elev_deg, azim_deg, ignore=("figure",)):
    """First camera position (dist from target_pts[0], at each elevation x azimuth tried in order) from which
    every target point is visible: no scene geometry between (ray casts). For high shots in dense scenes,
    where a guessed camera kept landing behind a trunk or inside a crown."""
    dg = _depsgraph(sc)
    t0 = Vector(target_pts[0])
    for el in elev_deg:
        for az in azim_deg:
            e, a = math.radians(el), math.radians(az)
            cam = t0 + Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e))) * dist
            ok = True
            for t in target_pts:
                d = Vector(t) - cam
                hit, loc, _, _, ob, _ = sc.ray_cast(dg, cam, d.normalized(), distance=d.length - 0.05)
                if hit and ob.get("part") not in ignore:
                    ok = False; break
            if ok:
                return tuple(cam)
    return None


def head_of(mannequin_obj, height=1.70, seated=False, seat_h=0.46):
    s = height / 1.70
    hip = (seat_h + 0.10 * s) if seated else 0.90 * s
    x, y, z = mannequin_obj.location
    return (x, y, z + hip + 0.74 * s)


def ph(c, name, asset_id, part, loc=(0, 0, 0), yaw_deg=0.0, height=None, size=None):
    """Poly Haven (CC0) asset by id from ASSETS_ROOT/_polyhaven (see tools/artkit/fetch_polyhaven.py)."""
    return _library(c, name, "_polyhaven", asset_id, part, loc, yaw_deg, height, size)


def sf(c, name, uid, part, loc=(0, 0, 0), yaw_deg=0.0, height=None, size=None, pick=None):
    """Free Sketchfab model by uid from ASSETS_ROOT/_sketchfab (see tools/artkit/fetch_sketchfab.py).
    pick: node-name substrings, to take one tree out of a pack or one LOD out of several."""
    return _library(c, name, "_sketchfab", uid, part, loc, yaw_deg, height, size, pick)


def _library(c, name, lib, asset_id, part, loc, yaw_deg, height, size, pick=None):
    d = os.path.join(ASSETS_ROOT, lib, asset_id)
    gl = json.load(open(os.path.join(d, "credit.json"))).get("gltf") or \
        next(f for f in os.listdir(d) if f.endswith((".gltf", ".glb")))
    return import_asset(c, name, os.path.join(d, gl), part, loc, yaw_deg, height, size, pick)


def _picked(o, pick):
    while o:
        if any(k in o.name for k in pick):
            return True
        o = o.parent
    return False


_ASSET_MESHES = {}   # (path, pick) -> mesh with its origin at the bottom centre, native size


def import_asset(c, name, gltf_path, part, loc=(0, 0, 0), yaw_deg=0.0, height=None, size=None, pick=None):
    """Import a glTF (Poly Haven, Sketchfab), baked into one mesh; later calls with the same file and
    pick share that mesh, so twenty trees cost one import. height: scale so the object is this tall (m);
    size: scale so its longest side is this long. The scale lives on the object."""
    key = (gltf_path, tuple(pick or ()))
    me = _ASSET_MESHES.get(key)
    if me is None or me.name not in bpy.data.meshes:
        me = _bake_gltf(gltf_path, pick, c.name.split(":")[0] + "." + name)
        _ASSET_MESHES[key] = me
    dims = me["dims"]
    k = height / dims[2] if height else (size / max(dims) if size else 1.0)
    o = bpy.data.objects.new(c.name.split(":")[0] + "." + name, me); c.objects.link(o)
    o["part"] = part; o.location = loc; o.rotation_euler = (0, 0, math.radians(yaw_deg))
    o.scale = (k, k, k)
    o["source"] = gltf_path
    return o


def _bake_gltf(gltf_path, pick, mesh_name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=gltf_path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH' and (not pick or _picked(o, pick))]
    if not meshes:
        raise ValueError("no mesh in %s matches pick %s" % (gltf_path, pick))
    bm = bmesh.new()
    mats = []
    for o in meshes:   # keep each part's materials: offset its material indices into one shared slot list
        m = o.data.copy(); m.transform(o.matrix_world)
        # one UV layer under one name, or bmesh drops the UVs of every part named differently
        # (leaf cards then sample one texel: opaque grey sheets instead of leaves)
        for uv in list(m.uv_layers)[1:]:
            m.uv_layers.remove(uv)
        if m.uv_layers:
            m.uv_layers[0].name = "UVMap"
        base = len(mats); mats.extend(o.data.materials)
        for poly in m.polygons:
            poly.material_index += base
        bm.from_mesh(m); bpy.data.meshes.remove(m)
    me = bpy.data.meshes.new(mesh_name)
    bm.to_mesh(me); bm.free()
    for mt in mats:
        me.materials.append(mt)
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    cx, cy, z0 = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)
    for v in me.vertices:   # origin at the bottom centre
        v.co.x, v.co.y, v.co.z = v.co.x - cx, v.co.y - cy, v.co.z - z0
    me["dims"] = [max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)]
    return me


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


def pbr(tid):
    """Poly Haven CC0 texture as a real-scale material (box projection in object space, metres)."""
    name = "pbr_" + tid
    m = bpy.data.materials.get(name)
    if m:
        return m
    d = os.path.join(ASSETS_ROOT, "_polyhaven_tex", tid)
    info = json.load(open(os.path.join(d, "credit.json")))
    tw, th = info["tile_m"]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / tw, 1 / th, 1 / th)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])

    def tex(fname, non_colour):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(os.path.join(d, fname), check_existing=True)
        t.image.colorspace_settings.name = "Non-Color" if non_colour else "sRGB"
        t.projection = 'BOX'; t.projection_blend = 0.25
        nt.links.new(mp.outputs[0], t.inputs["Vector"])
        return t
    maps = info["maps"]
    if "diff" in maps:
        nt.links.new(tex(maps["diff"], False).outputs["Color"], bsdf.inputs["Base Color"])
    if "rough" in maps:
        nt.links.new(tex(maps["rough"], True).outputs["Color"], bsdf.inputs["Roughness"])
    if "nor" in maps:
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(tex(maps["nor"], True).outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def set_mat(o, tid):
    if o.type == 'MESH':
        o.data.materials.clear(); o.data.materials.append(pbr(tid))


def _sun(sc):
    """Soft afternoon sun + light sky for the shaded pass (created once per scene)."""
    name = sc.name + ".hp1_sun"
    s = bpy.data.objects.get(name)
    if not s:
        ld = bpy.data.lights.new(name, 'SUN'); ld.energy = 3.2; ld.angle = math.radians(6)
        s = bpy.data.objects.new(name, ld); coll(sc, "lights").objects.link(s)
        s.rotation_euler = (math.radians(52), math.radians(8), math.radians(38))
        s["part"] = "light"
    return s


def save_pack(sc, outdir, name):
    """Keep the composition (Bart, 2026-09-27): a .blend next to the renders, with only this pack's scene,
    so it can be opened, adjusted and re-rendered by hand. Written as a copy: the MCP session stays as is."""
    path = os.path.join(outdir, name + ".blend")
    # the MCP session holds every pack's scene (a first save was ~980 MB): drop the others, purge orphans.
    # Safe: every pack rebuilds its own scene from scratch when it runs.
    for other in [x for x in bpy.data.scenes if x != sc]:
        for o in list(objs(other)):
            if not any(o.name in c.all_objects for c in [sc.collection]):
                bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.scenes.remove(other)
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    bpy.ops.wm.save_as_mainfile(filepath=path, copy=True, compress=True)
    return path

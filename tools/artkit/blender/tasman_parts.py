"""Tasman's found parts fitted to the MPFB standard body (Bart 2026-10-13: "we find the assets that look close,
then we change these so they fit the body"). Every part is someone else's asset, only placed, scaled, dyed and
bound to the body here, in the REST pose (before any clip), so it moves with every Mixamo clip afterwards.

  ruff     Sketchfab a1dcb303 "Beaked mask with ruff collar and beaded veil" (CC-BY): only RuffCollar
  hat      Sketchfab c0a97984 "Hat Of The Cavalier" by Normal Map Enjoyer (CC-BY), feathers included
  boots    Sketchfab db24dfa9 "Leather boot (leren laars) OB71-232" by Museum Batavialand (CC-BY), mirrored
  rapier   BlendSwap 18303 "XVIIth century rapier" by CommonBlenderUser (CC-BY)
  moustache BlendSwap 14439 "Gentleman Facial Accessories - Low Poly" by DrakeEnson (CC-BY): only the moustache
Credits go in the credits file of whatever is published with these parts.
"""
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

RUFF_OUTER_M = 0.34            # outer diameter of the millstone ruff
RUFF_DROP_M = 0.02             # its centre this far below the Neck joint (it sits on the collar bone line)
HAT_BAND_M = 0.20              # inner band width, about the MPFB head width plus hair
HAT_SINK_M = 0.035             # the band sits this far below the top of the head (0.075 covered the eyes)
BOOT_TOP_BELOW_KNEE_M = -0.02  # the boot's turned-down top just over the knee joint
RAPIER_M = 1.05
CUFF_OUTER_M = 0.15           # the wrist ruffs
CUFF_BACK_M = 0.035           # from the wrist joint toward the elbow
RAPIER_AT = (0.27, 0.0, -0.22)   # from the Hips joint: the figure's left (+X), level with the hip, a little low
MOUSTACHE_W_M = 0.075
DECIMATE_TO = 1500             # faces per part at most: low poly (Bart: "low poly and toony")
BELT_MAX_H_M = 0.6             # rope and its hanging ends
SCAN_CREASE_DEG = 15           # scans and pleats: Line Art draws a crease only where faces fold sharper than this


def _import(path, keep=None):
    """Import a glTF or append objects from a .blend; keep = substrings of object names to keep (others go)."""
    before = set(bpy.data.objects)
    if str(path).endswith(".blend"):
        with bpy.data.libraries.load(str(path)) as (src, dst):
            dst.objects = list(src.objects)
        for o in dst.objects:
            bpy.context.scene.collection.objects.link(o)
    else:
        bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = []
    for o in new:
        if o.type == "MESH" and (keep is None or any(k.lower() in o.name.lower() for k in keep)):
            meshes.append(o)
    for o in new:
        if o not in meshes and o.type in ("MESH", "CURVE", "EMPTY", "LIGHT", "CAMERA"):
            if o.type != "EMPTY" or not any(c in meshes for c in o.children_recursive):
                bpy.data.objects.remove(o, do_unlink=True)
    for o in meshes:                     # bake the import hierarchy (glTF root rotation, unit scale) into the mesh
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    for o in [o for o in bpy.data.objects if o not in before and o.type == "EMPTY" and o.name in bpy.data.objects]:
        bpy.data.objects.remove(o, do_unlink=True)
    for o in meshes:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):      # source modifiers (decimate, subsurf, particles) baked or dropped
            if m.type in ("PARTICLE_SYSTEM",):
                o.modifiers.remove(m)
        o.select_set(True)
    return meshes


def _apply_all(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.convert(target="MESH")            # modifiers applied, curves become meshes
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def _join(objs, name):
    _apply_all(objs)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    return o


def _weld(o, dist=0.0005):
    """Scans often come as triangle soup (every triangle its own corners): weld coinciding corners first, or the
    decimate collapses tear the surface into flakes (the boot: 47,686 loose vertices for 4,000 faces)."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    scale = max(o.matrix_world.to_scale())
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist / scale)
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()


def _decimate(o, faces=DECIMATE_TO, weld=False):
    if weld:
        _weld(o)
    n = len(o.data.polygons)
    if n > faces:
        d = o.modifiers.new("decimate", "DECIMATE")
        d.ratio = faces / n
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=d.name)


def _bbox(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi


def _fit(o, centre_to, scale):
    """Scale about its own bounding-box centre, then move that centre to `centre_to` (world, rest pose)."""
    lo, hi = _bbox([o])
    c = (lo + hi) / 2
    o.matrix_world = Matrix.Translation(centre_to) @ Matrix.Scale(scale, 4) @ Matrix.Translation(-c) @ o.matrix_world
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def _bone_world(rig, name, tail=False):
    b = rig.data.bones[name]
    return rig.matrix_world @ (b.tail_local if tail else b.head_local)


def _parent_to_bone(o, rig, bone):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    rig.data.bones.active = rig.data.bones[bone]
    bpy.ops.object.parent_set(type="BONE", keep_transform=True)


def _skin_from_body(o, body, rig):
    """Bone weights from the body's nearest surface, then the body's armature: the part bends with the body."""
    dt = o.modifiers.new("weights from body", "DATA_TRANSFER")
    dt.object = body
    dt.use_vert_data = True
    dt.data_types_verts = {"VGROUP_WEIGHTS"}
    dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"
    dt.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.datalayout_transfer(modifier=dt.name)
    bpy.ops.object.modifier_apply(modifier=dt.name)
    arm = o.modifiers.new("Armature", "ARMATURE")
    arm.object = rig
    o.parent = rig.parent if rig.parent else None


def ruff(path, body, rig):
    o = _join(_import(path, keep=["RuffCollar"]), "Tasman ruff")
    _decimate(o)
    lo, hi = _bbox([o])
    neck = _bone_world(rig, "mixamorig:Neck")
    _fit(o, neck - Vector((0, 0, RUFF_DROP_M)), RUFF_OUTER_M / max(hi.x - lo.x, hi.y - lo.y))
    _skin_from_body(o, body, rig)
    quiet_lines(o)
    return o


def cuffs(path, body, rig):
    """White cuffs = the same ruff, small, around each wrist (one part reused: LEGO). In the rest pose the arms lie
    along X (Y Bot's T-pose), so the ring is turned to face along the arm."""
    out = []
    for side, sign in (("Left", 1), ("Right", -1)):
        o = _join(_import(path, keep=["RuffCollar"]), f"Tasman cuff {side[0]}")
        _decimate(o, DECIMATE_TO // 2)
        o.matrix_world = Matrix.Rotation(math.radians(90), 4, "Y") @ o.matrix_world
        _apply_all([o])
        lo, hi = _bbox([o])
        wrist = _bone_world(rig, f"mixamorig:{side}Hand")
        elbow = _bone_world(rig, f"mixamorig:{side}ForeArm")
        along = (wrist - elbow).normalized()
        _fit(o, wrist - along * CUFF_BACK_M, CUFF_OUTER_M / max(hi.y - lo.y, hi.z - lo.z))
        _skin_from_body(o, body, rig)
        quiet_lines(o)
        out.append(o)
    return out


def hat(path, rig, head_top_z):
    parts = _import(path)
    band = next((p for p in parts if "band" in p.name.lower() and "wrinkled" not in p.name.lower()), parts[0])
    blo, bhi = _bbox([band])
    s = HAT_BAND_M / max(bhi.x - blo.x, bhi.y - blo.y)
    lo, hi = _bbox(parts)
    head = _bone_world(rig, "mixamorig:Head")
    # move the whole hat so the band's centre sits on the head axis, HAT_SINK below the top of the head
    band_c = (blo + bhi) / 2
    target = Vector((head.x, head.y, head_top_z - HAT_SINK_M))
    for p in parts:
        p.matrix_world = (Matrix.Translation(target) @ Matrix.Scale(s, 4) @ Matrix.Translation(-band_c)) @ p.matrix_world
    _apply_all(parts)
    for p in parts:
        p.name = "Tasman hat " + p.name.split("_")[0].lower()
        _decimate(p, DECIMATE_TO // 2)
        _parent_to_bone(p, rig, "mixamorig:Head")
    return parts


def _toe_dir(o):
    """Horizontal direction the boot's foot points to: low vertices' centre minus the shaft's centre."""
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    z0 = min(v.z for v in vs)
    z1 = max(v.z for v in vs)
    low = [v for v in vs if v.z < z0 + 0.12 * (z1 - z0)]
    high = [v for v in vs if v.z > z0 + 0.6 * (z1 - z0)]
    d = sum(low, Vector()) / len(low) - sum(high, Vector()) / len(high)
    d.z = 0
    return d.normalized()


def boots(path, body, rig):
    # Object_3..6 are four PIECES of one scanned boot (Object_7 the lining), Object_2 the museum label plate
    parts = _import(path, keep=["Object_3", "Object_4", "Object_5", "Object_6", "Object_7"])
    left = _join(parts, "Tasman boot L")
    _decimate(left, 4000, weld=True)                # triangle soup: weld, then reduce (it tears below ~4k faces)
    # toe forward: the figure faces -Y (Mixamo contract)
    d = _toe_dir(left)
    left.matrix_world = Matrix.Rotation(math.atan2(-1, 0) - math.atan2(d.y, d.x), 4, "Z") @ left.matrix_world
    _apply_all([left])
    out = []
    for side, sign in (("Left", 1), ("Right", -1)):
        o = left if side == "Left" else left.copy()
        if side == "Right":
            o.data = left.data.copy()
            o.name = "Tasman boot R"
            bpy.context.scene.collection.objects.link(o)
        knee = _bone_world(rig, f"mixamorig:{side}Leg")
        foot = _bone_world(rig, f"mixamorig:{side}Foot")
        lo, hi = _bbox([o])
        s = (knee.z + BOOT_TOP_BELOW_KNEE_M) / (hi.z - lo.z)
        shaft_c = (lo + hi) / 2
        # the sole on the floor, the shaft around the ankle
        o.matrix_world = (Matrix.Translation(Vector((foot.x, foot.y, 0))) @ Matrix.Scale(s, 4)
                          @ Matrix.Translation(-Vector((shaft_c.x, shaft_c.y, lo.z)))) @ o.matrix_world
        if sign < 0:
            o.matrix_world = Matrix.Translation(Vector((foot.x, 0, 0))) @ Matrix.Scale(-1, 4, Vector((1, 0, 0))) \
                @ Matrix.Translation(Vector((-foot.x, 0, 0))) @ o.matrix_world
        _apply_all([o])
        if sign < 0:                                    # mirrored: turn the faces back outward
            bm = bmesh.new()
            bm.from_mesh(o.data)
            bmesh.ops.reverse_faces(bm, faces=bm.faces)
            bm.to_mesh(o.data)
            bm.free()
        _skin_from_body(o, body, rig)
        quiet_lines(o)
        out.append(o)
    top = max(_bbox([b])[1].z for b in out) - 0.04
    for o in [body] + [o for o in bpy.data.objects if o.type == "MESH" and "pants" in o.name.lower()]:
        hide_under(o, top, "under boots")          # skin AND breeches: the boots are the outer layer down there
    return out


def quiet_lines(o, crease_deg=SCAN_CREASE_DEG):
    """A scanned surface is noisy: every edge reads as a crease and Line Art scribbles it black. Smooth shading and
    a per-object crease threshold leave only the real folds (the contour still comes from the silhouette)."""
    for p in o.data.polygons:
        p.use_smooth = True
    o.lineart.use_crease_override = True
    o.lineart.crease_threshold = math.radians(crease_deg)


def hide_under(body, top_z, name):
    """Hide the body below `top_z` (rest pose), like MPFB's own clothes do: no skin pokes through the boots."""
    vg = body.vertex_groups.new(name=name)
    mw = body.matrix_world
    vg.add([v.index for v in body.data.vertices if (mw @ v.co).z < top_z], 1.0, "REPLACE")
    m = body.modifiers.new(name, "MASK")
    m.vertex_group = name
    m.invert_vertex_group = True


def rapier(path, rig):
    parts = _import(path, keep=["BezierCurve"])
    o = _join(parts, "Tasman rapier")
    _decimate(o, 6000)
    lo, hi = _bbox([o])
    long_axis = max(range(3), key=lambda i: hi[i] - lo[i])
    s = RAPIER_M / (hi[long_axis] - lo[long_axis])
    hips = _bone_world(rig, "mixamorig:Hips")
    # along X after import: lay it from front-low-left to back, hilt forward at the left hip, blade down and back
    if long_axis != 0:
        o.matrix_world = Matrix.Rotation(math.radians(90), 4, "Z" if long_axis == 1 else "Y") @ o.matrix_world
    o.matrix_world = Matrix.Rotation(math.radians(-90), 4, "Z") @ o.matrix_world            # blade along +Y (back)
    o.matrix_world = Matrix.Rotation(math.radians(-35), 4, "X") @ o.matrix_world            # tip down
    _fit(o, hips + Vector((RAPIER_AT)), s)   # outside the coat at the left hip, hilt forward
    _parent_to_bone(o, rig, "mixamorig:Hips")
    return o


def moustache(path, body, rig):
    o = _join(_import(path, keep=["Mousetache"]), "Tasman moustache")
    # long side left-right (X), thinnest side front-back (Y): the source file stands it on end
    lo, hi = _bbox([o])
    size = hi - lo
    axes = sorted(range(3), key=lambda i: size[i])          # thin, middle, long
    if axes[2] != 0:
        o.matrix_world = Matrix.Rotation(math.radians(90), 4, "Y" if axes[2] == 2 else "Z") @ o.matrix_world
        _apply_all([o])
    lo, hi = _bbox([o])
    if (hi - lo).y > (hi - lo).z:
        o.matrix_world = Matrix.Rotation(math.radians(90), 4, "X") @ o.matrix_world
        _apply_all([o])
    lo, hi = _bbox([o])
    s = MOUSTACHE_W_M / (hi.x - lo.x)
    head = _bone_world(rig, "mixamorig:Head")
    group = body.vertex_groups["mixamorig:Head"]
    face = [body.matrix_world @ v.co for v in body.data.vertices
            if abs((body.matrix_world @ v.co).x - head.x) < 0.015
            and any(g.group == group.index and g.weight > 0.5 for g in v.groups)]
    nose = min(face, key=lambda p: p.y)                       # the front-most point on the face's midline
    lip = min((p for p in face if nose.z - 0.045 < p.z < nose.z - 0.02), key=lambda p: p.y, default=nose)
    _fit(o, Vector((head.x, lip.y - 0.006, nose.z - 0.028)), s)
    _parent_to_bone(o, rig, "mixamorig:Head")
    return o


def belt_brown(robe, material, waist):
    """The robe's rope belt = its small loose pieces at waist height: give them their own (brown) material."""
    bm = bmesh.new()
    bm.from_mesh(robe.data)
    bm.faces.ensure_lookup_table()
    seen, islands = set(), []
    for f in bm.faces:
        if f.index in seen:
            continue
        stack, island = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop()
            island.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen:
                        seen.add(h.index)
                        stack.append(h)
        islands.append(island)
    robe.data.materials.append(material)
    idx = len(robe.data.materials) - 1
    mw = robe.matrix_world
    n = 0
    for island in islands:                        # the rope: small pieces, short in height, at the waist
        zs = [(mw @ v.co).z for f in island for v in f.verts]
        if len(island) < 0.08 * len(bm.faces) and max(zs) - min(zs) < BELT_MAX_H_M and waist[0] < min(zs) and max(zs) < waist[1]:
            for f in island:
                f.material_index = idx
            n += 1
    bm.to_mesh(robe.data)
    bm.free()
    return n

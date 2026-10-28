"""LEGO garment slots for the standard body, from FOUND parts (Bart: never model garments by hand).

Each part is cut by the BODY's own landmarks (hip, knee, ankle), pushed outside the trousers (Shrinkwrap OUTSIDE),
snugged at the waist, low-poly, and skinned to Man_Rig with weights copied from the trousers (part of the swing
goes to the hips, so a skirt does not split between the legs). Called from export_wardrobe.py before the export.

| slot              | source (licence)                                                   | used for                 |
|-------------------|--------------------------------------------------------------------|--------------------------|
| Garment_SkirtKnee | MakeHuman donitz_monk_robe, Donitz (CC0), cut hem->knee           | prehistoric tunic skirt  |
| Garment_SkirtLong | same robe, cut hem->ankle                                         | a long dress             |
| Garment_Peplum    | same robe, cut hem->mid-thigh                                     | 1600s doublet skirts     |
| Garment_Breeches  | MakeHuman rehmanpolanski_viking_pants, Rehman Polanski (CC0), cut | 1600s breeches           |
| Garment_HatWide   | Sketchfab c0a97984 "Hat Of The Cavalier", Normal Map Enjoyer (CC-BY) | 1640s wide felt hat    |
"""
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

MH = os.path.expanduser("~/Library/Application Support/Blender/5.1/mpfb/data/clothes")
ROBE = f"{MH}/donitz_monk_robe/Monks_Robe.obj"
PANTS = f"{MH}/rehmanpolanski_viking_pants/pantsviking.obj"
HAT = os.path.expanduser("~/BartsMedia/3d-pipeline/comic-look-refs/tasman-parts/hat_sketchfab_c0a97984/scene.gltf")
FACES = 1400          # low poly
HAT_TURN = 1          # quarter turns about the vertical that put the found hat's feather at the back
EASE_M = 0.012        # cloth stands this far outside the trousers
HIP_SWING = 0.75      # share of a skirt's weight on the hips: low, and the skirt splits open between the legs
SKIRT_NARROW = 0.72   # the robe's flare pulled in toward the legs before the fit (1 = as found, a box on this body)


def _bone_z(rig, name):
    return (rig.matrix_world @ rig.data.bones[name].head_local).z


def _import_obj(path):
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=path)
    new = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in new:
        o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    if len(new) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def _bbox(o):
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return lo, hi


def _transform(o, m):
    o.data.transform(m)
    o.data.update()


def _cut(o, top, bottom):
    """keep only the band bottom < z < top (world z; o has an identity matrix)"""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for z, keep_below in ((top, True), (bottom, False)):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_outer=keep_below, clear_inner=not keep_below)
        del res
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()


def _modifier(o, kind, **kw):
    m = o.modifiers.new(kind.lower(), kind)
    for k, v in kw.items():
        setattr(m, k, v)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=m.name)


def _fit_to_body(o, trousers, waist_z):
    # anything inside the trousers comes out, EASE_M clear of them
    _modifier(o, "SHRINKWRAP", target=trousers, wrap_method="NEAREST_SURFACEPOINT", wrap_mode="OUTSIDE", offset=EASE_M)
    # the top 6 cm hug the waist: on the surface, just outside
    g = o.vertex_groups.new(name="waist")
    g.add([v.index for v in o.data.vertices if v.co.z > waist_z - 0.06], 1.0, "REPLACE")
    _modifier(o, "SHRINKWRAP", target=trousers, wrap_method="NEAREST_SURFACEPOINT", wrap_mode="OUTSIDE_SURFACE", offset=EASE_M, vertex_group="waist")
    o.vertex_groups.remove(o.vertex_groups["waist"])  # look it up again: applying a modifier invalidates g


def _skin(o, rig, source, hip_bone="root.x", hip_share=HIP_SWING):
    o.parent = rig
    _modifier(o, "DATA_TRANSFER", object=source, use_vert_data=True, data_types_verts={"VGROUP_WEIGHTS"},
              vert_mapping="POLYINTERP_NEAREST", layers_vgroup_select_src="ALL", layers_vgroup_select_dst="NAME")
    hip = o.vertex_groups.get(hip_bone) or o.vertex_groups.new(name=hip_bone)
    if hip_share > 0:
        for v in o.data.vertices:
            total = sum(g.weight for g in v.groups)
            for g in v.groups:
                g.weight = g.weight * (1 - hip_share) / max(total, 1e-6)
            hip.add([v.index], hip_share, "ADD")
    arm = o.modifiers.new("Armature", "ARMATURE")
    arm.object = rig


def _decimate(o):
    n = len(o.data.polygons)
    if n > FACES:
        _modifier(o, "DECIMATE", ratio=FACES / n)


def _material(o, name):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    o.data.materials.clear()
    o.data.materials.append(mat)


def _robe_band(rig, trousers, name, top, bottom):
    o = _import_obj(ROBE)
    lo, hi = _bbox(o)
    blo, bhi = _bbox(trousers)
    # scale the robe to the body's height from the floor, centre it on the trousers
    s = 1.78 / (hi.z - lo.z)
    c = (blo + bhi) / 2
    _transform(o, Matrix.Translation(Vector((c.x, c.y, 0))) @ Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))))
    _cut(o, top, bottom)
    _transform(o, Matrix.Translation(Vector((c.x, c.y, 0))) @ Matrix.Diagonal((SKIRT_NARROW, SKIRT_NARROW, 1, 1)) @ Matrix.Translation(Vector((-c.x, -c.y, 0))))
    _fit_to_body(o, trousers, top)
    _decimate(o)
    o.name = name
    _material(o, name)
    _skin(o, rig, trousers)
    return o


def _breeches(rig, trousers, top, bottom):
    o = _import_obj(PANTS)
    lo, hi = _bbox(o)
    blo, bhi = _bbox(trousers)
    # map the pants' own waist->floor span onto the trousers' (both are full-length legwear)
    sz = (bhi.z - blo.z) / (hi.z - lo.z)
    sxy = max((bhi.x - blo.x) / (hi.x - lo.x), (bhi.y - blo.y) / (hi.y - lo.y))
    c = (blo + bhi) / 2
    _transform(o, Matrix.Translation(Vector((c.x, c.y, blo.z))) @ Matrix.Diagonal((sxy, sxy, sz, 1)) @ Matrix.Translation(Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))))
    _cut(o, top, bottom)
    _fit_to_body(o, trousers, top)
    _decimate(o)
    o.name = "Garment_Breeches"
    _material(o, "Garment_Breeches")
    _skin(o, rig, trousers, hip_share=0.0)  # breeches follow each leg
    return o


def _brim_z(o, slices=12):
    """height of the hat's widest horizontal slice (its brim)"""
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    lo, hi = min(v.z for v in vs), max(v.z for v in vs)
    best, best_w = lo, -1.0
    for i in range(slices):
        z0, z1 = lo + (hi - lo) * i / slices, lo + (hi - lo) * (i + 1) / slices
        band = [v for v in vs if z0 <= v.z <= z1]
        if band:
            w = max(v.x for v in band) - min(v.x for v in band) + max(v.y for v in band) - min(v.y for v in band)
            if w > best_w:
                best, best_w = (z0 + z1) / 2, w
    return best


def _wide_hat(rig, cowboy):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=HAT)
    parts = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    for o in parts:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    for o in [o for o in bpy.data.objects if o not in before and o.type != "MESH"]:
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(parts) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    # the found hat lies with its feather along x: turn it so the feather trails back (the body faces -y)
    _transform(o, Matrix.Rotation(1.5708 * HAT_TURN, 4, "Z"))
    # crown up: the brim is the hat's widest slice and it lies below the crown; flip it if it came upside down
    if _brim_z(o) > (_bbox(o)[0].z + _bbox(o)[1].z) / 2:
        _transform(o, Matrix.Rotation(3.14159, 4, "X"))
    # sit it where the vendor hat sits: centred on it, as wide as its brim, brim at the vendor brim's height
    lo, hi = _bbox(o)
    clo, chi = _bbox(cowboy)
    s = max(chi.x - clo.x, chi.y - clo.y) / max(hi.x - lo.x, hi.y - lo.y) * 1.05
    cc, hc = (clo + chi) / 2, (lo + hi) / 2
    _transform(o, Matrix.Translation(Vector((cc.x, cc.y, _brim_z(cowboy)))) @ Matrix.Scale(s, 4) @ Matrix.Translation(Vector((hc.x, hc.y, _brim_z(o)))).inverted())
    print("HAT bbox found", tuple(round(v, 3) for v in hi - lo), "cowboy", tuple(round(v, 3) for v in chi - clo))
    _decimate(o)
    o.name = "Garment_HatWide"
    _material(o, "Garment_HatWide")
    o.parent = rig
    o.vertex_groups.new(name="head.x").add([v.index for v in o.data.vertices], 1.0, "REPLACE")
    arm = o.modifiers.new("Armature", "ARMATURE")
    arm.object = rig
    return o


def fit_garments(rig, meshes):
    trousers = next(m for m in meshes if m.name == "Geo_Pants")
    shirt = next(m for m in meshes if m.name == "Geo_Shirt")
    cowboy = next(m for m in meshes if m.name == "Cowboy_Hat")
    hem = _bbox(shirt)[0].z
    knee = _bone_z(rig, "leg_stretch.l")
    ankle = _bone_z(rig, "foot.l")
    hip = _bone_z(rig, "root.x")
    top = hem + 0.07  # starts under the coat's hem: no gap at the waist
    out = [
        _robe_band(rig, trousers, "Garment_SkirtKnee", top, knee - 0.04),
        _robe_band(rig, trousers, "Garment_SkirtLong", top, ankle + 0.03),
        _robe_band(rig, trousers, "Garment_Peplum", top, hem - 0.13),
        _breeches(rig, trousers, top, knee - 0.07),
        _wide_hat(rig, cowboy),
    ]
    print("GARMENTS", [(o.name, len(o.data.polygons)) for o in out], "hip", round(hip, 3), "knee", round(knee, 3), "ankle", round(ankle, 3))
    return out

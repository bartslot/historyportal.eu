"""Walk-cycle key poses on a real human body instead of the tube mannequin (walk_poses.py), as a part-ID strip.

    blender -b --factory-startup --python basemesh_walk.py -- <outdir> [front|side] [blend_path]

Body: Blender Studio "Human Base Meshes" bundle v1.4.1, object GEO-body_male_realistic (licence CC0, no attribution
required; https://studio.blender.org/). Multires is dropped (level-0 cage, ~10k verts), scaled to 1.72 m.

Rig: a hand-built 16-bone armature fitted to the mesh (joint heights measured from mesh slices, x/y re-centred on the
local vertex centroid), bound with automatic weights (bone heat); if heat leaves unweighted vertices, a distance
falloff to the bone segments is used instead. Rigify was skipped: generating it headless is slow and its 100+ bones
buy nothing for 8 FK key poses.

Poses: KEYS from walk_poses.py (thigh swing, knee bend, arm swing, pelvis bob), mirrored for the second stride.
Part-ID: each face gets the flat colour of its nearest bone (torso, head, nose, upper arm, forearm, hand, thigh, shin,
foot, per side) plus eyes and a sheared-cone gown like walk_poses.gown(). Lines: walk_lines.py on the Mac.

Output: walk_<view>_ids.png (2560 px, 4x2 cells, ortho) and walk_<view>.json (cell boxes, same layout as walk_poses).
"""
import colorsys
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]
OUT = Path(ARGS[0])
VIEW = ARGS[1] if len(ARGS) > 1 else "front"
BLEND = ARGS[2] if len(ARGS) > 2 else ("/home/bart/assets/human-base-meshes/human-base-meshes-bundle-v1.4.1/"
                                       "human_base_meshes_bundle.blend")
BODY = "GEO-body_male_realistic"
HEIGHT = 1.72
ARM_DOWN_DEG = 14        # the base mesh stands in an A-pose; bring the arms in toward the body
GOWN_HEM_R, GOWN_HEM_ABOVE_ANKLE, GOWN_LAG_M = 0.24, 0.05, 0.05

KEYS = [  # same table as walk_poses.py: name, L thigh, L knee, R thigh, R knee, L arm, R arm, bob
    ("contact",   24,  4,   -20, 10,   -18, 18,  0.000),
    ("down",      14, 20,   -24, 38,   -12, 12, -0.025),
    ("passing",    0,  6,    12, 55,     0,  0,  0.000),
    ("up",       -14,  2,    26, 22,    10, -10,  0.015),
]
CYCLE = KEYS + [(n + "_m", rt, rk, lt, lk, ra, la, b) for (n, lt, lk, rt, rk, la, ra, b) in KEYS]

COLS, ROWS = 4, 2
CELL_W, CELL_H = 1.1, 2.05
PX_PER_M = 640 / CELL_W

# Joints of the UNSCALED mesh (1.69 m, facing -y, character left = +x), from z-slices of the mesh.
J = {
    "pelvis": (0.0, 0.90), "chest": (0.0, 1.05), "neck": (0.0, 1.43), "crown": (0.0, 1.69),
    "hip": (0.10, 0.90), "knee": (0.135, 0.48), "ankle": (0.165, 0.085), "toe": (0.20, 0.02),
    "shoulder": (0.17, 1.39), "elbow": (0.27, 1.13), "wrist": (0.38, 0.87), "fingers": (0.44, 0.72),
}
TOE_FWD = -0.14   # toes point -y
# bone: (head joint, tail joint, parent, part colour key)
BONES = {
    "hips": ("pelvis", "chest", None, "torso"), "spine": ("chest", "neck", "hips", "torso"),
    "head": ("neck", "crown", "spine", "head"),
}
for s in ("L", "R"):
    BONES.update({
        f"thigh.{s}": (f"hip.{s}", f"knee.{s}", "hips", f"thigh.{s}"),
        f"shin.{s}": (f"knee.{s}", f"ankle.{s}", f"thigh.{s}", f"shin.{s}"),
        f"foot.{s}": (f"ankle.{s}", f"toe.{s}", f"shin.{s}", f"foot.{s}"),
        f"upperarm.{s}": (f"shoulder.{s}", f"elbow.{s}", "spine", f"upperarm.{s}"),
        f"forearm.{s}": (f"elbow.{s}", f"wrist.{s}", f"upperarm.{s}", f"forearm.{s}"),
        f"hand.{s}": (f"wrist.{s}", f"fingers.{s}", f"forearm.{s}", f"hand.{s}"),
    })

# Bone "thickness": nearest-bone uses distance minus radius, else thin bones (upper arm) steal the chest/shoulder.
RADIUS = {"hips": 0.13, "spine": 0.13, "head": 0.12, "thigh": 0.08, "shin": 0.05, "foot": 0.03,
          "upperarm": 0.045, "forearm": 0.035, "hand": 0.02}
GOWN_PARTS = {"torso", "thigh.L", "thigh.R", "shin.L", "shin.R"}

_hue = [0]


def flat_mat(name):
    _hue[0] += 1
    r, g, b = colorsys.hsv_to_rgb((_hue[0] * 0.618034) % 1.0, 0.9, 0.9)
    m = bpy.data.materials.new(name)
    m.diffuse_color = (r, g, b, 1)
    return m


def load_body():
    with bpy.data.libraries.load(BLEND) as (src, dst):
        dst.objects = [BODY]
    o = dst.objects[0]
    bpy.context.scene.collection.objects.link(o)
    o.parent = None
    o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); o.scale = (1, 1, 1)
    o.data = o.data.copy()          # linked-in data is fine to edit once made local
    for m in list(o.modifiers):
        o.modifiers.remove(m)
    o.data.materials.clear()
    return o


def subdivide(o):
    """One Catmull-Clark level: smoother silhouette and finer faces, so part borders are less stair-stepped."""
    bpy.context.view_layer.objects.active = o
    m = o.modifiers.new("sub", "SUBSURF"); m.levels = 1
    bpy.ops.object.modifier_apply(modifier="sub")


def fit_joints(me):
    """World joint positions (scaled): x/y re-centred on the vertex centroid of a thin slice around each joint."""
    verts = [v.co for v in me.vertices]
    out = {}
    for name, (x, z) in J.items():
        sides = (("L", 1), ("R", -1)) if x else (("", 1),)
        for s, sg in sides:
            key = f"{name}.{s}" if s else name
            if name == "toe":
                a = out[f"ankle.{s}"]
                out[key] = Vector((a.x + sg * 0.03, a.y + TOE_FWD, z))
                continue
            near = [v for v in verts if abs(v.z - z) < 0.025 and abs(v.x - sg * x) < 0.09]
            if x == 0:
                near = [v for v in verts if abs(v.z - z) < 0.025 and abs(v.x) < 0.12]
            cx = sum(v.x for v in near) / len(near) if near and x else sg * x
            cy = sum(v.y for v in near) / len(near) if near else 0.0
            out[key] = Vector((cx if x else 0.0, cy, z))
    return out


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def nearest_bone(p, segs):
    return min(segs, key=lambda n: seg_dist(p, *segs[n]) - RADIUS[n.split(".")[0]])


def build_armature(joints):
    arm = bpy.data.armatures.new("rig")
    rig = bpy.data.objects.new("rig", arm)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (h, t, parent, _) in BONES.items():
        eb = arm.edit_bones.new(name)
        eb.head, eb.tail = joints[h], joints[t]
        eb.roll = 0
        if parent:
            eb.parent = arm.edit_bones[parent]
            eb.use_connect = (eb.head - arm.edit_bones[parent].tail).length < 1e-4
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def bind(body, rig, joints):
    """Automatic weights; fall back to a distance falloff if bone heat leaves vertices unweighted."""
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    unweighted = sum(1 for v in body.data.vertices if sum(g.weight for g in v.groups) < 0.01)
    method = "automatic (bone heat)"
    if unweighted > 0.005 * len(body.data.vertices):
        method = f"distance falloff ({unweighted} verts unweighted by bone heat)"
        segs = {n: (joints[h], joints[t]) for n, (h, t, _, _) in BONES.items()}
        groups = {n: body.vertex_groups.get(n) or body.vertex_groups.new(name=n) for n in BONES}
        for v in body.data.vertices:
            d = {n: seg_dist(v.co, a, b) - RADIUS[n.split(".")[0]] for n, (a, b) in segs.items()}
            dmin = min(d.values())
            for n, dist in d.items():
                w = math.exp(-(dist - dmin) / 0.02)
                groups[n].add([v.index], w if w > 0.01 else 0.0, "REPLACE")
    return method


def paint_parts(body, joints):
    """Face material = nearest bone's part (rest pose), plus a nose patch so the head reads front vs back."""
    segs = {n: (joints[h], joints[t]) for n, (h, t, _, _) in BONES.items()}
    parts = sorted({p for (_, _, _, p) in BONES.values()}) + ["nose"]
    mats = {p: flat_mat(p) for p in parts}
    me = body.data
    for p in parts:
        me.materials.append(mats[p])
    idx = {p: i for i, p in enumerate(parts)}
    head_front = min(v.co.y for v in me.vertices if v.co.z > joints["neck"].z + 0.05)
    for poly in me.polygons:
        c = poly.center
        part = BONES[nearest_bone(c, segs)][3]
        if part == "head" and c.y < head_front + 0.02 and abs(c.x) < 0.02:
            part = "nose"
        poly.material_index = idx[part]
    # which vertices the gown hull wraps (lower torso, thighs, shins)
    return [BONES[nearest_bone(v.co, segs)][3] in GOWN_PARTS and v.co.z < joints["chest"].z for v in me.vertices]


def rot_x(deg):
    return Matrix.Rotation(math.radians(deg), 3, "X")


def rot_y(deg):
    return Matrix.Rotation(math.radians(deg), 3, "Y")


def world_rotations(pose):
    """Delta rotation per bone, in the rig's frame (facing -y: a forward swing is a NEGATIVE rotation about x)."""
    _, lt, lk, rt, rk, la, ra, _ = pose
    R = {"hips": Matrix.Identity(3), "spine": Matrix.Identity(3), "head": Matrix.Identity(3)}
    for s, t, k, a, sg in (("L", lt, lk, la, 1), ("R", rt, rk, ra, -1)):
        R[f"thigh.{s}"] = rot_x(-t)
        R[f"shin.{s}"] = rot_x(k - t)
        R[f"foot.{s}"] = rot_x((k - t) * 0.3)       # foot stays near level, a little toe-drop on the swing leg
        down = rot_y(sg * ARM_DOWN_DEG)
        R[f"upperarm.{s}"] = rot_x(-a) @ down
        fore = rot_x(-(a + 15 + max(0, a) * 0.6)) @ down   # elbow bends more on the forward swing (walk_poses)
        R[f"forearm.{s}"] = fore
        R[f"hand.{s}"] = fore
    return R


def pose_rig(rig, pose):
    R = world_rotations(pose)
    bob = pose[7]
    arm = rig.data
    heads = {}
    for name, (_, _, parent, _) in BONES.items():      # dict order is parent-first
        b = arm.bones[name]
        if parent is None:
            heads[name] = b.head_local + Vector((0, 0, bob))
        else:
            pb_ = arm.bones[parent]
            heads[name] = heads[parent] + R[parent] @ (b.head_local - pb_.head_local)
        m = R[name].to_4x4() @ b.matrix_local.to_3x3().to_4x4()
        m.translation = heads[name]
        rig.pose.bones[name].matrix = m
        bpy.context.view_layer.update()
    return {s: heads[f"foot.{s}"] for s in ("L", "R")}


def gown(body, wrapped, ankles: dict, fwd: Vector, mat):
    """Gown = convex hull of the posed hips/thighs/shins plus a flared hem ring that trails the feet: cloth that drapes
    over a knee instead of the knee poking through a rigid cone (walk_poses.gown), cut off just above the ankles."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg)
    me = ev.to_mesh()
    hem_z = min(a.z for a in ankles.values()) + GOWN_HEM_ABOVE_ANKLE
    pts = [body.matrix_world @ v.co for v, w in zip(me.vertices, wrapped) if w]
    ev.to_mesh_clear()
    pts = [p for p in pts if p.z > hem_z]
    feet_mid = (ankles["L"] + ankles["R"]) / 2
    hem_c = Vector((feet_mid.x, feet_mid.y, hem_z)) - fwd * GOWN_LAG_M
    spread = abs((ankles["L"] - ankles["R"]).dot(fwd))
    r = max(GOWN_HEM_R, spread / 2 + 0.10)
    pts += [hem_c + Vector((math.cos(t) * r, math.sin(t) * r, 0)) for t in (i * math.tau / 48 for i in range(48))]
    bm = bmesh.new()
    for p in pts:
        bm.verts.new(p)
    res = bmesh.ops.convex_hull(bm, input=bm.verts)
    drop = {v for v in res["geom_interior"] + res["geom_unused"] if isinstance(v, bmesh.types.BMVert)}
    bmesh.ops.delete(bm, geom=list(drop), context="VERTS")
    gm = bpy.data.meshes.new("gown"); bm.to_mesh(gm); bm.free()
    o = bpy.data.objects.new("gown", gm); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat)
    c = sum(pts, Vector()) / len(pts)
    o.location = c; gm.transform(Matrix.Translation(-c))
    o.scale = (1.03, 1.03, 1.0)          # a little ease so skin never z-fights through the cloth
    return o


def lowest_z(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    z = min((obj.matrix_world @ v.co).z for v in me.vertices)
    ev.to_mesh_clear()
    return z


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    body = load_body()
    s = HEIGHT / (max(v.co.z for v in body.data.vertices) - min(v.co.z for v in body.data.vertices))
    body.data.transform(Matrix.Scale(s, 4))
    for k, (x, z) in list(J.items()):
        J[k] = (x * s, z * s)
    joints = fit_joints(body.data)
    subdivide(body)
    wrapped = paint_parts(body, joints)
    rig = build_armature(joints)
    method = bind(body, rig, joints)
    print("BIND", method)
    gown_mat = flat_mat("gown")

    turn = 0.0 if VIEW == "front" else math.radians(90)     # side: rig faces +x, walks right
    fwd_world = Vector((0, -1, 0)) if VIEW == "front" else Vector((1, 0, 0))
    cells = []
    for i, pose in enumerate(CYCLE):
        c, r = i % COLS, i // COLS
        x = (c - (COLS - 1) / 2) * CELL_W
        zbase = (ROWS - 1 - r) * CELL_H
        rg = rig.copy(); sc.collection.objects.link(rg)
        bd = body.copy(); sc.collection.objects.link(bd)
        bd.parent = rg
        bd.modifiers["Armature"].object = rg
        rg.rotation_euler = (0, 0, turn)
        rg.location = (x, 0, zbase)
        bpy.context.view_layer.update()
        ankles_local = pose_rig(rg, pose)
        mw = rg.matrix_world
        ankles = {k: mw @ v for k, v in ankles_local.items()}
        dz = zbase - lowest_z(bd)             # plant the lowest foot on the cell floor
        g = gown(bd, wrapped, ankles, fwd_world, gown_mat)
        rg.location.z += dz; g.location.z += dz
        cells.append({"index": i, "pose": pose[0], "col": c, "row": r, "foot_m": [x, zbase]})
    body.hide_render = True; rig.hide_render = True
    body.location.x = 100; rig.location.x = 100

    cam_z = ROWS * CELL_H / 2
    bpy.ops.object.camera_add(location=(0, -30, cam_z), rotation=(math.radians(90), 0, 0))
    cam = bpy.context.object; sc.camera = cam
    cam.data.type = "ORTHO"; cam.data.ortho_scale = COLS * CELL_W; cam.data.clip_end = 100
    W = int(COLS * CELL_W * PX_PER_M); H = int(ROWS * CELL_H * PX_PER_M)
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "FLAT"; sc.display.shading.color_type = "MATERIAL"
    sc.display.shading.background_type = "VIEWPORT"; sc.display.shading.background_color = (0, 0, 0)
    sc.display.render_aa = "OFF"
    sc.render.dither_intensity = 0.0
    sc.view_settings.view_transform = "Standard"
    OUT.mkdir(parents=True, exist_ok=True)
    sc.render.filepath = str(OUT / f"walk_{VIEW}_ids.png")
    bpy.ops.render.render(write_still=True)
    for cell in cells:
        x, z = cell["foot_m"]
        cell["foot_px"] = [round(W / 2 + x * PX_PER_M), round(H / 2 - (z - cam_z) * PX_PER_M)]
        cell["box_px"] = [round(cell["foot_px"][0] - CELL_W / 2 * PX_PER_M), round(cell["foot_px"][1] - CELL_H * PX_PER_M),
                          round(cell["foot_px"][0] + CELL_W / 2 * PX_PER_M), cell["foot_px"][1]]
    meta = {"view": VIEW, "size_px": [W, H], "px_per_m": PX_PER_M, "height_m": HEIGHT, "cells": cells,
            "body": f"{BODY} (Blender Studio Human Base Meshes, CC0)", "bind": method,
            "timing": "8 drawings/cycle, on threes at 24 fps", "cycle_m": 1.4}
    (OUT / f"walk_{VIEW}.json").write_text(json.dumps(meta, indent=1))


main()

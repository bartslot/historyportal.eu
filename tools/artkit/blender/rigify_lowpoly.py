"""Rig a low-poly segmented character with Rigify, the steps of Grant Abbitt's "Easy Rigging Using RIGIFY in Blender"
(Bart 2026-10-14: "follow the steps and show me that you control blender"):

    Blender -b IN.blend --python rigify_lowpoly.py -- OUT.blend [POSE.png]

  1 enable Rigify                        2 add the Human metarig
  3 fit the metarig to the body: every joint MEASURED from the body pieces (limb pieces are boxes along their local
    Z axis: the mesh's extent along it gives the joints), face and finger bones deleted (a PS1 hand is one block)
  4 Generate Rig                         5 apply the mirrors, parent the pieces to the rig with automatic weights
  6 a test pose through the rig's own controls (IK hand up, foot forward, head turned), rendered to POSE.png

The input file is never written; the result is saved as OUT.blend.
Piece names are this model's (Male Character PS1 Style - LowPoly.blend): see PIECES.
"""
import math
import sys
from pathlib import Path

import addon_utils
import bpy
from mathutils import Vector

PIECES = {"head": "Cube", "chest": "Cube.001", "belly": "Cube.002", "upper_arm": "Cube.003", "forearm": "Cube.004",
          "hand": "Cube.005", "thigh": "Cube.006", "shin": "Cube.007", "foot": "Cube.008"}
BEND_M = 0.015          # a slight bend at elbows (back) and knees (forward): Rigify's IK needs it to know the bend side
NECK_M = 0.04           # neck length above the chest piece's top under the head


def args():
    a = sys.argv[sys.argv.index("--") + 1:]
    return Path(a[0]), (Path(a[1]) if len(a) > 1 else None)


def ends(o):
    """World positions of a limb box's two ends along its local Z axis: the mesh's own extent along that axis
    (not +-1: the shin block does not span its unit cube), at the centre of its cross-section. Upper end first."""
    co = [v.co for v in o.data.vertices]
    cx = sum(c.x for c in co) / len(co)
    cy = sum(c.y for c in co) / len(co)
    mw = o.matrix_world
    a = mw @ Vector((cx, cy, max(c.z for c in co)))
    b = mw @ Vector((cx, cy, min(c.z for c in co)))
    return (a, b) if a.z > b.z else (b, a)


def left(o, which):
    """The +X (character's left) copy of a mirrored piece: its own transform is the left one when loc.x > 0."""
    a, b = ends(o)
    if o.location.x < 0:
        a, b = Vector((-a.x, a.y, a.z)), Vector((-b.x, b.y, b.z))
    return a if which == "top" else b


def box(o):
    dg = bpy.context.evaluated_depsgraph_get()
    e = o.evaluated_get(dg)
    me = e.to_mesh()
    p = [o.matrix_world @ v.co for v in me.vertices]
    e.to_mesh_clear()
    return Vector([min(q[i] for q in p) for i in range(3)]), Vector([max(q[i] for q in p) for i in range(3)])


def landmarks():
    P = {k: bpy.data.objects[v] for k, v in PIECES.items()}
    head_lo, head_hi = box(P["head"])
    chest_lo, chest_hi = box(P["chest"])
    belly_lo, belly_hi = box(P["belly"])
    foot_lo, foot_hi = box(P["foot"])
    shoulder, elbow_a = left(P["upper_arm"], "top"), left(P["upper_arm"], "bottom")
    elbow_b, wrist_a = left(P["forearm"], "top"), left(P["forearm"], "bottom")
    hand = [q for q in box(P["hand"])]
    hip, knee_a = left(P["thigh"], "top"), left(P["thigh"], "bottom")
    knee_b, ankle = left(P["shin"], "top"), left(P["shin"], "bottom")
    elbow = (elbow_a + elbow_b) / 2 + Vector((0, BEND_M, 0))     # back (+Y: the figure faces -Y)
    knee = (knee_a + knee_b) / 2 + Vector((0, -BEND_M, 0))       # forward
    wrist = wrist_a
    hand_end = wrist + (wrist - elbow).normalized() * (hand[1].z - hand[0].z)
    cy = (chest_lo.y + chest_hi.y) / 2
    return {
        "cy": cy, "pelvis_z": belly_lo.z + 0.08, "chest_top": head_lo.z, "head_top": head_hi.z, "head_y": (head_lo.y + head_hi.y) / 2,
        "shoulder": shoulder, "elbow": elbow, "wrist": wrist, "hand_end": hand_end,
        "hip": hip, "knee": knee, "ankle": ankle,
        "toe": Vector((ankle.x, foot_lo.y, foot_lo.z + 0.03)), "ball": Vector((ankle.x, (foot_lo.y + ankle.y) / 2 - 0.04, foot_lo.z + 0.04)),
        "heel": Vector((ankle.x, foot_hi.y, foot_lo.z)), "foot_w": foot_hi.x - foot_lo.x,
    }


def fit_metarig(rig, L):
    """Step 3: move the metarig's bones onto the measured joints (left side; the right side is the mirror)."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    eb = rig.data.edit_bones
    # no face rig and no fingers on a low-poly block head and block hands (the video deletes the face too)
    doomed = [b for b in eb if b.name == "face" or b.name.startswith(("palm", "f_", "thumb", "breast"))]
    for b in list(doomed):
        for c in b.children_recursive:
            if c in eb.values():
                eb.remove(c)
        if b.name in eb:
            eb.remove(b)
    cy, z0, z1 = L["cy"], L["pelvis_z"], L["chest_top"]
    spine = ["spine", "spine.001", "spine.002", "spine.003"]
    for i, n in enumerate(spine):
        eb[n].head = (0, cy, z0 + (z1 - z0) * i / 4)
        eb[n].tail = (0, cy, z0 + (z1 - z0) * (i + 1) / 4)
    eb["spine.004"].head, eb["spine.004"].tail = (0, cy, z1), (0, cy, z1 + NECK_M / 2)
    eb["spine.005"].head, eb["spine.005"].tail = (0, cy, z1 + NECK_M / 2), (0, cy, z1 + NECK_M)
    eb["spine.006"].head, eb["spine.006"].tail = (0, L["head_y"], z1 + NECK_M), (0, L["head_y"], L["head_top"])
    for side, s in (("L", 1), ("R", -1)):
        m = lambda v: Vector((v.x * s, v.y, v.z))
        eb[f"shoulder.{side}"].head = Vector((0.03 * s, cy, z1 - 0.03))
        eb[f"shoulder.{side}"].tail = m(L["shoulder"])
        for n, a, b in (("upper_arm", "shoulder", "elbow"), ("forearm", "elbow", "wrist"), ("hand", "wrist", "hand_end"),
                        ("thigh", "hip", "knee"), ("shin", "knee", "ankle")):
            eb[f"{n}.{side}"].head, eb[f"{n}.{side}"].tail = m(L[a]), m(L[b])
        eb[f"foot.{side}"].head, eb[f"foot.{side}"].tail = m(L["ankle"]), m(L["ball"])
        eb[f"toe.{side}"].head, eb[f"toe.{side}"].tail = m(L["ball"]), m(L["toe"])
        heel = m(L["heel"])
        eb[f"heel.02.{side}"].head = heel + Vector((-L["foot_w"] / 3 * s, 0, 0))
        eb[f"heel.02.{side}"].tail = heel + Vector((L["foot_w"] / 3 * s, 0, 0))
        eb[f"pelvis.{side}"].head = (0, cy, z0)
        eb[f"pelvis.{side}"].tail = m(L["hip"]) + Vector((0, 0, 0.12))
    # arms and legs: roll so the joints bend the natural way (Rigify reads the chain's bend)
    bpy.ops.armature.select_all(action="DESELECT")
    for n in ("upper_arm", "forearm", "hand"):
        for side in "LR":
            eb[f"{n}.{side}"].select = True
    bpy.ops.armature.calculate_roll(type="GLOBAL_NEG_Y")
    bpy.ops.armature.select_all(action="DESELECT")
    for n in ("thigh", "shin"):
        for side in "LR":
            eb[f"{n}.{side}"].select = True
    bpy.ops.armature.calculate_roll(type="GLOBAL_POS_Y")
    bpy.ops.object.mode_set(mode="OBJECT")


def bind(rig, pieces):
    """Step 5: the mirrors applied, every piece parented to the generated rig with automatic weights."""
    for o in pieces:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            if m.type == "MIRROR":
                bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.select_all(action="DESELECT")
    for o in pieces:
        o.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    empty = [o.name for o in pieces if not any(len(g.name) and g.name.startswith("DEF-") for g in o.vertex_groups)]
    print("BIND pieces without weights:", empty or "none")


def test_pose(rig):
    """Step 6: pose through the rig's own controls: the head turns (about its own length), the left arm in FK swings
    forward with a bent elbow, the chest leans a little."""
    pb = rig.pose.bones
    bpy.context.view_layer.objects.active = rig
    if "upper_arm_parent.L" in pb:
        pb["upper_arm_parent.L"]["IK_FK"] = 1.0              # this arm on its FK controls
    for name, axis, deg in (("head", "Y", 25), ("chest", "X", 6), ("upper_arm_fk.L", "X", 55), ("forearm_fk.L", "X", 45)):
        if name in pb:
            b = pb[name]
            b.rotation_mode = "XYZ"
            b.rotation_euler["XYZ".index(axis)] = math.radians(deg)
    bpy.context.view_layer.update()


def main():
    out, pose_png = args()
    addon_utils.enable("rigify", default_set=True)                       # step 1
    bpy.ops.object.select_all(action="DESELECT")
    pieces = [bpy.data.objects[v] for v in PIECES.values()]
    L = landmarks()
    bpy.ops.object.armature_human_metarig_add()                         # step 2
    meta = bpy.context.active_object
    fit_metarig(meta, L)                                                # step 3
    bpy.ops.object.select_all(action="DESELECT")
    meta.select_set(True)
    bpy.context.view_layer.objects.active = meta
    bpy.ops.pose.rigify_generate()                                      # step 4
    rig = bpy.data.objects.get("rig") or next(o for o in bpy.data.objects if o.type == "ARMATURE" and o is not meta)
    meta.hide_set(True)
    meta.hide_render = True
    bind(rig, pieces)                                                   # step 5
    test_pose(rig)                                                      # step 6
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out), copy=True)
    print("RIGIFY ok", out, "bones", len(rig.data.bones))
    if pose_png:
        sc = bpy.context.scene
        sc.render.filepath = str(pose_png)
        sc.render.resolution_x, sc.render.resolution_y = 1080, 1350
        bpy.ops.render.render(write_still=True)
        print("POSE ok", pose_png)


if __name__ == "__main__":
    main()

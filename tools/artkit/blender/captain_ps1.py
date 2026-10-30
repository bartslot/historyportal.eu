"""Dress the PS1 low-poly base (rigged by rigify_lowpoly.py) as the captain, without editing the base:

    Blender -b "Male Character PS1 Style - LowPoly (rigify).blend" --python captain_ps1.py -- FACES_DIR OUT_DIR

  colours    the base is built from blocks, so the clothes are block colours: object-level materials (the shared mesh
             data is not touched): coat = chest, belly and arms, breeches = thighs, boots = shins and feet
  shapes     the captain's own pieces, sized from the measured body, on the Rigify deform bones: coat skirt, belt,
             falling collar, cuffs, boot tops, ponytail, hat (archetype.py's ring shapes)
  face       the 2D face (face_decal.py: History Lines eyes + moustache) through a projector empty on the head bone;
             hair is painted by position in the same shader. No UV map is added to the base.
Renders OUT_DIR/captain_ps1_{0..3}.png (four colourways, the last bareheaded), captain_ps1_face.png, saves the .blend.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import anime_lineup as al   # noqa: E402
import archetype as ar      # noqa: E402  (ring, girth, half_widths, COLOURWAYS, stage, close_up)
from rigify_lowpoly import PIECES   # noqa: E402

FACE_SCALE = 1.18           # this head against the MPFB head the face decals are drawn for (eyes 3.75 vs 3.2 cm)
EYE_Z_M = 1.97              # measured on an orthographic front render of the head (2026-10-14)
HAIRLINE_ABOVE_EYES_M = 0.105
NAPE_BELOW_EYES_M = 0.06
BLOCK_ZONE = {"chest": "coat", "belly": "coat", "upper_arm": "coat", "forearm": "coat", "hand": "skin",
              "thigh": "breeches", "shin": "boots", "foot": "boots"}
D = "DEF-"
ARMS_DOWN_DEG = 30         # FK upper-arm turn from the A-pose down to the sides


def args():
    a = sys.argv[sys.argv.index("--") + 1:]
    return Path(a[0]), Path(a[1])


def measure_body(pieces):
    """One temporary mesh of all blocks in the rest pose, only to measure sections (deleted after)."""
    dg = bpy.context.evaluated_depsgraph_get()
    import bmesh
    bm = bmesh.new()
    for o in pieces:
        e = o.evaluated_get(dg)
        me = e.to_mesh()
        me.transform(o.matrix_world)
        bm.from_mesh(me)
        e.to_mesh_clear()
    me = bpy.data.meshes.new("measure")
    bm.to_mesh(me)
    bm.free()
    m = bpy.data.objects.new("measure", me)
    bpy.context.scene.collection.objects.link(m)
    return m


def rest(rig):
    for pb in rig.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def arms_down(rig):
    """From the base's A-pose to arms hanging, through the rig's FK controls: each FK upper arm turns about the
    world front-back axis at the shoulder (a bone-local axis swung the arm forward and back instead)."""
    pb = rig.pose.bones
    mw = rig.matrix_world
    for side, sign in (("L", 1), ("R", -1)):
        pb[f"upper_arm_parent.{side}"]["IK_FK"] = 1.0
        b = pb[f"upper_arm_fk.{side}"]
        bpy.context.view_layer.update()
        pivot = mw @ b.head
        turn = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(ARMS_DOWN_DEG) * sign, 4, "Y") @ Matrix.Translation(-pivot)
        b.matrix = mw.inverted() @ turn @ mw @ b.matrix
    bpy.context.view_layer.update()


def bone_head(rig, name):
    return rig.matrix_world @ rig.data.bones[name].head_local


def costume(body, rig, head):
    """The captain's pieces, sized from the measured body (archetype.py's shapes, Rigify's bone names)."""
    ring = ar.ring
    waist = bone_head(rig, D + "spine.001").z
    knee = bone_head(rig, D + "shin.L").z
    keep = lambda p: abs(p.x) < 0.3
    wx, wy, wcy = ar.half_widths(body, waist, keep=keep)
    hem = knee + 0.12
    secs = [ar.half_widths(body, hem + (waist - hem) * k / 8, keep=keep) for k in range(9)]
    ry_max = max(s[1] for s in secs)
    top_r, bot_r = wx + 0.025, max(s[0] for s in secs) + 0.05

    def follow_thighs(p):
        t = max(0.0, min(1.0, (waist - p.z) / (waist - hem)))
        return {D + "spine": 1 - 0.85 * t, D + ("thigh.L" if p.x > 0 else "thigh.R"): 0.85 * t}

    parts = []

    def add(o, zone):
        o["zone"] = zone
        parts.append(o)

    add(ring("coat skirt", rig, D + "spine", Vector((0, wcy, hem)), Vector((0, 0, 1)), bot_r, top_r, waist - hem,
             squash=(1.0, (ry_max + 0.025) / top_r), segments=48, skin=follow_thighs), "coat")
    br = top_r + 0.008
    add(ring("belt", rig, D + "spine.001", Vector((0, wcy, waist - 0.03)), Vector((0, 0, 1)), br, br, 0.06,
             squash=(1.0, (ry_max + 0.033) / br), segments=48), "belt")
    # the falling collar lies on the chest block's top (that block reaches up to the shoulders)
    chest = bpy.data.objects[PIECES["chest"]]
    top = ar_box(chest)[1].z
    nx, _, ncy = ar.half_widths(body, top + 0.03, keep=lambda p: abs(p.x) < 0.1)
    sx, sy, scy = ar.half_widths(body, top - 0.05, keep=lambda p: abs(p.x) < 0.17)
    add(ring("collar", rig, D + "spine.003", Vector((0, (ncy + scy) / 2, top - 0.05)), Vector((0, 0, 1)),
             sx + 0.015, nx + 0.02, 0.09, squash=(1.0, (sy + 0.015) / (sx + 0.015)), segments=48), "collar")
    for side in ("L", "R"):
        hand, fore = bone_head(rig, f"{D}hand.{side}"), bone_head(rig, f"{D}forearm.{side}")
        axis = (hand - fore).normalized()
        at = hand - axis * 0.1
        r = ar.girth(body, at, axis, reach=0.12) + 0.02
        add(ring(f"cuff {side}", rig, f"{D}forearm.{side}.001", at, axis, r, r + 0.012, 0.09), "collar")
        shin = bone_head(rig, f"{D}shin.{side}")
        at = Vector((shin.x, shin.y, shin.z - 0.12))
        r = ar.girth(body, at, Vector((0, 0, 1)), reach=0.11) + 0.01
        add(ring(f"boot top {side}", rig, f"{D}shin.{side}", at, Vector((0, 0, 1)), r, r + 0.008, 0.09), "boots")
    # hat and ponytail from the head block's own size
    lo, hi = ar_box(head)
    cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
    band = EYE_Z_M + 0.09
    rx = (hi.x - lo.x) / 2 + 0.01
    ry = (hi.y - lo.y) / 2 + 0.01
    crown = ring("hat crown", rig, D + "spine.006", Vector((cx, cy, band)), Vector((0, 0, 1)), rx, rx - 0.025, 0.13,
                 squash=(1.0, ry / rx), segments=32, cap=True)
    brim = ring("hat brim", rig, D + "spine.006", Vector((cx, cy, band - 0.005)), Vector((0, 0, 1)), rx + 0.09, rx + 0.003,
                0.014, squash=(1.0, (ry + 0.09) / (rx + 0.09)), segments=32, cap=True)
    hat = [crown, brim]
    for o in hat:
        o["zone"] = "hat"
    add(ring("ponytail", rig, D + "spine.006", Vector((cx, hi.y - 0.02, EYE_Z_M - 0.02)), Vector((0, 0.3, -1)),
             0.035, 0.014, 0.24, segments=12, cap=True), "hair")
    return parts, hat


def ar_box(o):
    p = [o.matrix_world @ v.co for v in o.data.vertices]
    return Vector([min(q[i] for q in p) for i in range(3)]), Vector([max(q[i] for q in p) for i in range(3)])


def projector(rig, head):
    """An empty on the head bone whose object space is the face frame: x, z in -1..1 over the 2D face decal."""
    lo, hi = ar_box(head)
    size = ar.FRAME_M * FACE_SCALE
    top = EYE_Z_M + ar.FRAME_TOP_M * FACE_SCALE
    e = bpy.data.objects.new("face projector", None)
    bpy.context.scene.collection.objects.link(e)
    e.location = ((lo.x + hi.x) / 2, lo.y, top - size / 2)
    e.scale = (size / 2, size / 2, size / 2)
    e.parent = rig
    e.parent_type = "BONE"
    e.parent_bone = D + "spine.006"
    bpy.context.view_layer.update()
    e.matrix_world = Matrix.LocRotScale(Vector(((lo.x + hi.x) / 2, lo.y, top - size / 2)), None, Vector((size / 2,) * 3))
    return e


def head_material(skin, hair, face_png, proj):
    """Skin, hair painted by position (above the hairline, and the back of the head), the 2D face on the front."""
    m = al.cel_material(None, skin)
    nt = m.node_tree
    mul = next(n for n in nt.nodes if n.type == "MIX" and n.blend_type == "MULTIPLY")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.object = proj
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    uv = nt.nodes.new("ShaderNodeCombineXYZ")
    for axis, out in (("X", "X"), ("Z", "Y")):
        mad = nt.nodes.new("ShaderNodeMath")
        mad.operation = "MULTIPLY_ADD"
        mad.inputs[1].default_value = 0.5
        mad.inputs[2].default_value = 0.5
        nt.links.new(sep.outputs[axis], mad.inputs[0])
        nt.links.new(mad.outputs[0], uv.inputs[out])
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(face_png), check_existing=True)
    tex.extension = "CLIP"
    nt.links.new(uv.outputs[0], tex.inputs["Vector"])
    front = nt.nodes.new("ShaderNodeMath")                 # only the front of the head (projector y < ~0)
    front.operation = "LESS_THAN"
    front.inputs[1].default_value = 0.6
    nt.links.new(sep.outputs["Y"], front.inputs[0])
    show = nt.nodes.new("ShaderNodeMath")
    show.operation = "MULTIPLY"
    nt.links.new(tex.outputs["Alpha"], show.inputs[0])
    nt.links.new(front.outputs[0], show.inputs[1])
    # hair: world height above the hairline, or behind the ears above the nape
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    gsep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], gsep.inputs[0])
    above = nt.nodes.new("ShaderNodeMath")
    above.operation = "GREATER_THAN"
    above.inputs[1].default_value = EYE_Z_M + HAIRLINE_ABOVE_EYES_M
    nt.links.new(gsep.outputs["Z"], above.inputs[0])
    back = nt.nodes.new("ShaderNodeMath")
    back.operation = "GREATER_THAN"
    back.inputs[1].default_value = 0.02
    nt.links.new(gsep.outputs["Y"], back.inputs[0])
    high = nt.nodes.new("ShaderNodeMath")
    high.operation = "GREATER_THAN"
    high.inputs[1].default_value = EYE_Z_M - NAPE_BELOW_EYES_M
    nt.links.new(gsep.outputs["Z"], high.inputs[0])
    back_hair = nt.nodes.new("ShaderNodeMath")
    back_hair.operation = "MULTIPLY"
    nt.links.new(back.outputs[0], back_hair.inputs[0])
    nt.links.new(high.outputs[0], back_hair.inputs[1])
    is_hair = nt.nodes.new("ShaderNodeMath")
    is_hair.operation = "MAXIMUM"
    nt.links.new(above.outputs[0], is_hair.inputs[0])
    nt.links.new(back_hair.outputs[0], is_hair.inputs[1])
    base = nt.nodes.new("ShaderNodeMix")
    base.data_type = "RGBA"
    base.inputs["A"].default_value = (*skin, 1)
    base.inputs["B"].default_value = (*hair, 1)
    nt.links.new(is_hair.outputs[0], base.inputs["Factor"])
    over = nt.nodes.new("ShaderNodeMix")
    over.data_type = "RGBA"
    nt.links.new(base.outputs["Result"], over.inputs["A"])
    nt.links.new(tex.outputs["Color"], over.inputs["B"])
    nt.links.new(show.outputs[0], over.inputs["Factor"])
    nt.links.new(over.outputs["Result"], mul.inputs["A"])
    return m


def set_object_material(o, mat):
    """Per figure, on the OBJECT: the base's shared mesh keeps its own material."""
    if not o.material_slots:
        o.data.materials.append(None)
    for slot in o.material_slots:
        slot.link = "OBJECT"
        slot.material = mat


def dress(blocks, head, parts, hat, colours, face_png, proj):
    lin = {k: al.srgb_to_linear(v) for k, v in colours.items()}
    for key, o in blocks.items():
        set_object_material(o, al.cel_material(None, lin[BLOCK_ZONE[key]]))
    set_object_material(head, head_material(lin["skin"], lin["hair"], face_png, proj))
    for o in parts + hat:
        o.data.materials.clear()
        o.data.materials.append(al.cel_material(None, lin[o["zone"]]))


def main():
    faces, out = args()
    out.mkdir(parents=True, exist_ok=True)
    rig = bpy.data.objects["rig"]
    rest(rig)
    pieces = {k: bpy.data.objects[v] for k, v in PIECES.items()}
    head = pieces.pop("head")
    body = measure_body(list(pieces.values()) + [head])
    parts, hat = costume(body, rig, head)
    bpy.data.objects.remove(body, do_unlink=True)
    proj = projector(rig, head)
    arms_down(rig)
    face = faces / f"face_{ar.FACE}.png"
    dress(pieces, head, parts, hat, ar.COLOURWAYS[0], face, proj)
    sc = bpy.context.scene
    for o in [o for o in sc.objects if o.type in ("EMPTY",) and o.empty_display_type == "IMAGE"]:
        o.hide_render = True                                   # the artist's reference images
    keep_cam = sc.camera
    ar.stage()                                                 # paper, sun, a 3/4 camera at figure scale
    sc.render.film_transparent = False
    cam = sc.camera
    cam.location = Vector((0, 0, 1.15)) + (cam.location - Vector((0, 0, 1.0))) * 1.25
    cam.rotation_euler = (Vector((0, 0, 1.15)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    hull_mat = al.emission("ink hull", al.HULL, cull=True)
    for o in [head] + list(pieces.values()):
        al.add_hull(o, hull_mat)
    drawn = bpy.data.collections.new("drawn")
    sc.collection.children.link(drawn)
    for o in [head] + list(pieces.values()) + parts + hat:
        drawn.objects.link(o)
    gp = al.lineart(drawn)
    la = next(m for m in gp.modifiers if m.type == "LINEART")
    la.use_crease = la.use_intersection = False
    shots = []
    head_c = Vector((0, -0.05, EYE_Z_M))
    sc.render.filepath = str(out / "captain_ps1_face.png")
    keep = (cam.location.copy(), cam.data.lens, cam.rotation_euler.copy())
    cam.location = head_c + (keep[0] - Vector((0, 0, 1.15))).normalized() * 1.4
    cam.rotation_euler = (head_c - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 85
    bpy.ops.render.render(write_still=True)
    cam.location, cam.data.lens, cam.rotation_euler = keep
    for i, cw in enumerate(ar.COLOURWAYS):
        dress(pieces, head, parts, hat, cw, faces / (f"face_{ar.FACE}.png" if i % 2 == 0 else
                                                      f"face_{ar.FACE.replace('neutral', 'smile')}.png"), proj)
        for h in hat:
            h.hide_render = i == len(ar.COLOURWAYS) - 1
        sc.render.filepath = str(out / f"captain_ps1_{i}.png")
        bpy.ops.render.render(write_still=True)
        shots.append(sc.render.filepath)
    for h in hat:
        h.hide_render = False
    dress(pieces, head, parts, hat, ar.COLOURWAYS[0], face, proj)
    del keep_cam
    bpy.ops.wm.save_as_mainfile(filepath=str(out / "captain_ps1.blend"), copy=True)
    print("CAPTAIN_PS1 ok", " ".join(shots))


if __name__ == "__main__":
    main()

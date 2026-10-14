"""An archetype figure from a basic mannequin, no modelling and no generator (Bart 2026-10-14: "these are so
basic that any basic mesh will do"): the body itself carries the costume.

    Blender -b --python archetype.py -- "Y Bot.fbx" FACES_DIR OUT_DIR [captain]

Base = Mixamo's Y Bot: smooth, a plain head, the Mixamo rig. (The MPFB body was tried first: its sculpted face,
nipples and toes drew lines through every costume, and smoothing them away shrank the limbs.)

  colour zones   every body face takes the zone of its strongest bone (head = skin, upper legs = breeches...),
                 one flat dye per zone: a colourway is only a list of colours
  shape          the body is pushed out along its normals per zone (bone-weighted, so seams stay smooth), plus a
                 few plain rings for the silhouette: coat skirt, collar, cuffs, belt, boot tops
  face           the 2D face decal (face_decal.py) projected on the plain head; hair = a painted zone on the head
  hat            two plain shapes on the head bone, sized from the head (on/off)

Renders OUT_DIR/<name>_colourways.png (the same figure in four colourways, hat on, then off) and saves <name>.blend.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import anime_lineup as al   # noqa: E402  (cel material, ink hull, Line Art, anime normals, low poly)

PAPER = (0.96, 0.94, 0.89, 1.0)
FRAME_M, FRAME_TOP_M = 0.18, 0.06   # the face frame (face_decal.py): 18 cm square, top edge 6 cm above the eyes
EYE_AT = 0.42               # eye line as a fraction of the head bone span (neck joint -> head top), from the bottom
SKIRT_FLARE_M = 0.035       # coat hem beyond the hips
SKIRT_FOLLOW = 0.85         # how much of the hem follows the thigh (the rest stays with the hips)
HAT_BAND_ABOVE_EYES_M = 0.075   # the hat band sits on the forehead this far above the eye line
HAT_CROWN_M = (0.13, 0.025)     # crown height, and how much narrower its top is than its band
HAT_BRIM_M = 0.075              # brim beyond the band
BELT_TUCK_M = 0.04          # the coat colour reaches this far below the belt line (under the belt, no gap)
TORSO_MAX_M = 0.2           # half-width limit when measuring the chest (beyond it are the T-posed arms)
NECK_MAX_M = 0.09           # half-width limit when measuring the neck (beyond it are the shoulders)
HAIRLINE_M = 0.05           # hair starts this far above the eye line on the forehead

# bone name fragment -> zone (first match wins; "Hand" before "Arm" so hands stay skin)
CAPTAIN_ZONES = [("Head", "skin"), ("Neck", "skin"), ("Hand", "skin"), ("Arm", "coat"), ("Shoulder", "coat"),
                 ("Spine", "coat"), ("Hips", "breeches"), ("UpLeg", "breeches"), ("Leg", "boots"),
                 ("Foot", "boots"), ("Toe", "boots")]
ZONE_ORDER = ["skin", "coat", "breeches", "boots", "hair"]   # the body's material slots
PUSH_M = {"skin": 0.0, "coat": 0.012, "breeches": 0.028, "boots": 0.012, "hair": 0.006}
COLOURWAYS = [   # sRGB: coat, breeches, boots, collar (collar + cuffs), belt, skin, hair, hat, feather
    {"coat": "#2f5596", "breeches": "#45484f", "boots": "#7a4a2a", "collar": "#f2efe6", "belt": "#6b4426",
     "skin": "#e9c4a2", "hair": "#b26c40", "hat": "#1c1c20", "feather": "#f2efe6"},
    {"coat": "#6b3a2a", "breeches": "#3b3530", "boots": "#3a2a20", "collar": "#f2efe6", "belt": "#2a2420",
     "skin": "#d9a882", "hair": "#4a3426", "hat": "#4a3a2a", "feather": "#d8cfa8"},
    {"coat": "#2c2c30", "breeches": "#2c2c30", "boots": "#2a2420", "collar": "#f2efe6", "belt": "#8a6a3a",
     "skin": "#f0cfb0", "hair": "#c9b07a", "hat": "#1c1c20", "feather": "#b03a2e"},
    {"coat": "#4a6a48", "breeches": "#5a4a3a", "boots": "#6b4426", "collar": "#e8e2cf", "belt": "#3a2a20",
     "skin": "#a9744f", "hair": "#2a201a", "hat": "#3a3a3e", "feather": "#f2efe6"},
]


def args():
    a = sys.argv[sys.argv.index("--") + 1:]
    return Path(a[0]), Path(a[1]), Path(a[2]), (a[3] if len(a) > 3 else "captain")


def bone_z(rig, name, tail=False):
    b = rig.data.bones[name]
    return (rig.matrix_world @ (b.tail_local if tail else b.head_local)).z


def zone_of(group_name):
    return next((z for key, z in CAPTAIN_ZONES if key in group_name), "coat")


def vertex_zones(body):
    """Per vertex: {zone: weight} from its bone weights."""
    names = {g.index: g.name for g in body.vertex_groups}
    out = []
    for v in body.data.vertices:
        w = {}
        for g in v.groups:
            if g.group in names and names[g.group].startswith("mixamorig:"):
                z = zone_of(names[g.group])
                w[z] = w.get(z, 0) + g.weight
        out.append(w)
    return out


def coat_above_belt(body, zones, waist):
    """The coat covers everything of the torso above the belt (the hip bone reaches up to the stomach)."""
    for v, w in zip(body.data.vertices, zones):
        if v.co.z > waist - BELT_TUCK_M and "breeches" in w:
            w["coat"] = w.get("coat", 0) + w.pop("breeches")


def push_zones(body, zones):
    """Clothes as thickness: every vertex moves out along its normal by its zones' weighted push."""
    me = body.data
    me.update()
    for v, w in zip(me.vertices, zones):
        total = sum(w.values()) or 1.0
        d = sum(PUSH_M.get(z, 0) * x for z, x in w.items()) / total
        v.co += v.normal * d


def zone_materials(body, zones):
    """One material slot per zone; each face takes the zone most of its vertices lean to."""
    order = ZONE_ORDER
    me = body.data
    me.materials.clear()
    for z in order:
        me.materials.append(bpy.data.materials.new(z))
    for f in me.polygons:
        score = {}
        for i in f.vertices:
            for z, x in zones[i].items():
                score[z] = score.get(z, 0) + x
        me.polygons[f.index].material_index = order.index(max(score, key=score.get)) if score else 1


def face_uv(body, eye_z):
    """A second UV map: the front view of the face frame, for the 2D face decal (elsewhere: a transparent corner)."""
    me = body.data
    uv = me.uv_layers.new(name="face")
    mw = body.matrix_world
    head = body.vertex_groups["mixamorig:Head"].index
    on_head = {v.index for v in me.vertices if any(g.group == head and g.weight > 0.5 for g in v.groups)}
    for f in me.polygons:
        front = f.normal.y < -0.2 and all(i in on_head for i in f.vertices)
        for li in f.loop_indices:
            if not front:
                uv.data[li].uv = (0.0, 0.0)
                continue
            p = mw @ me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = ((p.x + FRAME_M / 2) / FRAME_M, 1 - (eye_z + FRAME_TOP_M - p.z) / FRAME_M)


def ring(name, rig, bone, centre, axis, r0, r1, length, squash=(1.0, 1.0), segments=24, skin=None, cap=False):
    """An open tube (a cone when r0 != r1) along `axis` from `centre`, rigid on `bone`: a cuff, collar or coat skirt."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segments, radius1=r0, radius2=r1, depth=length)
    for v in bm.verts:
        v.co.x *= squash[0]
        v.co.y *= squash[1]
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    rot = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()
    o.matrix_world = Matrix.Translation(centre + axis.normalized() * length / 2) @ rot
    bpy.context.view_layer.update()
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix.Identity(4)
    if skin is None:                                   # rigid on one bone
        skin = lambda p: {bone: 1.0}
    for v in me.vertices:
        for b, w in skin(v.co).items():
            g = o.vertex_groups.get(b) or o.vertex_groups.new(name=b)
            g.add([v.index], w, "REPLACE")
    o.modifiers.new("rig", "ARMATURE").object = rig
    o.parent = rig
    o.matrix_parent_inverse = rig.matrix_world.inverted()   # stays where it was built (the FBX rig is rotated + scaled)
    return o


def half_widths(body, z, band=0.02, keep=lambda p: True):
    pts = [body.matrix_world @ v.co for v in body.data.vertices]
    s = [p for p in pts if abs(p.z - z) < band and keep(p)]
    if not s:
        raise ValueError(f"no body vertices at z={z:.3f} (body z {min(p.z for p in pts):.3f}..{max(p.z for p in pts):.3f})")
    return (max(abs(p.x) for p in s), max(abs(p.y - sum(q.y for q in s) / len(s)) for p in s), sum(p.y for p in s) / len(s))


def costume_rings(body, rig):
    """The few plain shapes that make the silhouette read: coat skirt, collar, cuffs, belt, boot tops."""
    B = "mixamorig:"
    waist = bone_z(rig, B + "Spine")
    knee = bone_z(rig, B + "LeftLeg")
    wx, wy, wcy = half_widths(body, waist)
    hx, hy, _ = half_widths(body, bone_z(rig, B + "Hips") - 0.12)
    parts = []
    # coat skirt: waist to just above the knee, a little flare; it swings with the thighs and is open at the front
    top_r, bot_r = wx + 0.02, max(hx + SKIRT_FLARE_M, wx + 0.05)
    hem = knee + 0.06

    def follow_thighs(p):
        t = max(0.0, min(1.0, (waist - p.z) / (waist - hem)))    # 0 at the waist, 1 at the hem
        thigh = B + ("LeftUpLeg" if p.x > 0 else "RightUpLeg")
        return {B + "Hips": 1 - SKIRT_FOLLOW * t, thigh: SKIRT_FOLLOW * t}

    sk = ring("coat skirt", rig, B + "Hips", Vector((0, wcy, hem)), Vector((0, 0, 1)), bot_r, top_r, waist - hem,
              squash=(1.0, (wy + 0.05) / top_r), segments=32, skin=follow_thighs)
    sk["zone"] = "coat"
    parts.append(sk)
    # coat body: one plain tube from the waist to the armpits around Y Bot's separate chest and stomach plates
    # (pushing or smoothing the plates one by one broke them apart)
    pit = bone_z(rig, B + "LeftArm") - 0.07
    cx_, cy_, ccy = half_widths(body, pit, keep=lambda p: abs(p.x) < TORSO_MAX_M)

    def up_the_spine(p):
        t = max(0.0, min(1.0, (p.z - waist) / (pit - waist)))
        return {B + "Spine": 1 - t, B + "Spine2": t}

    torso = ring("coat body", rig, B + "Spine", Vector((0, (wcy + ccy) / 2, waist - 0.03)), Vector((0, 0, 1)),
                 wx + 0.025, cx_ + 0.02, pit - waist + 0.03, squash=(1.0, (cy_ + 0.03) / (cx_ + 0.02)), segments=32,
                 skin=up_the_spine)
    torso["zone"] = "coat"
    parts.append(torso)
    belt = ring("belt", rig, B + "Spine", Vector((0, wcy, waist - 0.025)), Vector((0, 0, 1)), wx + 0.025, wx + 0.025, 0.05,
                squash=(1.0, (wy + 0.03) / (wx + 0.025)))
    belt["zone"] = "belt"
    parts.append(belt)
    neck = bone_z(rig, B + "Neck")
    nx, ny, ncy = half_widths(body, neck + 0.01, keep=lambda p: abs(p.x) < NECK_MAX_M)   # not the shoulders
    collar = ring("collar", rig, B + "Spine2", Vector((0, ncy, neck - 0.03)), Vector((0, 0, 1)), nx + 0.085, nx + 0.012, 0.045,
                  squash=(1.0, 0.85))
    collar["zone"] = "collar"
    parts.append(collar)
    for side in ("Left", "Right"):
        hand = rig.matrix_world @ rig.data.bones[f"{B}{side}Hand"].head_local
        fore = rig.matrix_world @ rig.data.bones[f"{B}{side}ForeArm"].head_local
        axis = (hand - fore).normalized()
        cuff = ring(f"cuff {side}", rig, f"{B}{side}ForeArm", hand - axis * 0.085, axis, 0.052, 0.058, 0.075)
        cuff["zone"] = "collar"
        parts.append(cuff)
        leg = rig.matrix_world @ rig.data.bones[f"{B}{side}Leg"].head_local
        lx = half_widths(body, leg.z - 0.06, keep=lambda p, x=leg.x: abs(p.x - x) < 0.12 and p.x * x > 0)
        top = ring(f"boot top {side}", rig, f"{B}{side}Leg", Vector((leg.x, lx[2], leg.z - 0.1)), Vector((0, 0, 1)),
                   0.068, 0.078, 0.09)
        top["zone"] = "boots"
        parts.append(top)
    return parts


def face_material(skin_rgb, face_png):
    """Skin with the 2D face decal over it (alpha), then the same cel step as everything else."""
    m = al.cel_material(None, skin_rgb)
    nt = m.node_tree
    mul = next(n for n in nt.nodes if n.type == "MIX" and n.blend_type == "MULTIPLY")
    uvn = nt.nodes.new("ShaderNodeUVMap")
    uvn.uv_map = "face"
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(face_png), check_existing=True)
    tex.extension = "CLIP"
    over = nt.nodes.new("ShaderNodeMix")
    over.data_type = "RGBA"
    over.inputs["A"].default_value = (*skin_rgb, 1)
    nt.links.new(uvn.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Alpha"], over.inputs["Factor"])
    nt.links.new(tex.outputs["Color"], over.inputs["B"])
    nt.links.new(over.outputs["Result"], mul.inputs["A"])
    m.name = "skin + face"
    return m


def dress(objs, colours, face_png):
    """Put a colourway on: body zones, rings, hair, hat (cel materials, flat dyes)."""
    lin = {k: al.srgb_to_linear(v) for k, v in colours.items()}
    for o in objs:
        if o.type != "MESH" or o.name.endswith(("ink hull", "normal proxy", "face sphere")):
            continue
        if o.name == "Human":                                  # slots in ZONE_ORDER; slot 0 (skin) carries the face
            for i, slot in enumerate(o.material_slots):
                slot.material = face_material(lin["skin"], face_png) if i == 0 else al.cel_material(None, lin[ZONE_ORDER[i]])
        elif "zone" in o:
            o.data.materials.clear()
            o.data.materials.append(al.cel_material(None, lin[o["zone"]]))
        elif "hat" in o.name.lower():
            o.data.materials.clear()
            o.data.materials.append(al.cel_material(None, lin["feather" if "feather" in o.name.lower() else "hat"]))


def plain_hat(body, rig, eye_z):
    """A broad-brimmed hat from two plain shapes on the head bone: a crown (capped cone) and a flat brim.
    Sized from THIS head, so it never floats or sinks in; a feather-less toy hat that takes any dye."""
    head = body.vertex_groups["mixamorig:Head"].index
    band = eye_z + HAT_BAND_ABOVE_EYES_M
    ring_pts = [v.co for v in body.data.vertices
                if abs(v.co.z - band) < 0.015 and any(g.group == head and g.weight > 0.5 for g in v.groups)]
    cx, cy = sum(p.x for p in ring_pts) / len(ring_pts), sum(p.y for p in ring_pts) / len(ring_pts)
    rx = max(abs(p.x - cx) for p in ring_pts) + 0.008
    ry = max(abs(p.y - cy) for p in ring_pts) + 0.008
    h, taper = HAT_CROWN_M
    crown = ring("hat crown", rig, "mixamorig:Head", Vector((cx, cy, band)), Vector((0, 0, 1)), rx, rx - taper, h,
                 squash=(1.0, ry / rx), segments=32, cap=True)
    brim = ring("hat brim", rig, "mixamorig:Head", Vector((cx, cy, band - 0.004)), Vector((0, 0, 1)),
                rx + HAT_BRIM_M, rx + 0.002, 0.012, squash=(1.0, (ry + HAT_BRIM_M) / (rx + HAT_BRIM_M)), segments=32, cap=True)
    for o in (crown, brim):
        o["zone"] = "hat"
    return [crown, brim]


def _import(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    return [o for o in bpy.data.objects if o not in before]


def base_body(new, rig):
    """Y Bot's surface + joint meshes as ONE body in world space (identity transform, still on the rig)."""
    meshes = [o for o in new if o.type == "MESH"]
    for o in meshes:
        o.data.transform(o.matrix_world)
        o.matrix_parent_inverse = rig.matrix_world.inverted()   # first: matrix_world is solved against it
        o.matrix_world = Matrix.Identity(4)
        o.data.materials.clear()
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    body = bpy.context.active_object
    body.name = "Human"
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)       # the joint pieces meet the surface: one skin to push out
    bpy.ops.object.mode_set(mode="OBJECT")
    return body


def eye_line(rig):
    head, top = bone_z(rig, "mixamorig:Head"), bone_z(rig, "mixamorig:HeadTop_End")
    return head + EYE_AT * (top - head)


def paint_hair(body, zones, eye_z):
    """Hair as a painted cap: head vertices above the hairline, and the back of the head down to the nape."""
    head = body.vertex_groups["mixamorig:Head"].index
    me = body.data
    ys = [v.co.y for v in me.vertices if any(g.group == head and g.weight > 0.5 for g in v.groups)]
    mid = (min(ys) + max(ys)) / 2
    for v in me.vertices:
        if not any(g.group == head and g.weight > 0.5 for g in v.groups):
            continue
        if v.co.z > eye_z + HAIRLINE_M or (v.co.y > mid and v.co.z > eye_z - 0.07):
            zones[v.index] = {"hair": 1.0}


def load(path):
    sys.path.insert(0, str(al.PIPELINE))
    import job   # noqa: E402
    new = _import(path)
    rig = next(o for o in new if o.type == "ARMATURE")
    body = base_body(new, rig)
    eye_z = eye_line(rig)
    zones = vertex_zones(body)
    paint_hair(body, zones, eye_z)
    coat_above_belt(body, zones, bone_z(rig, "mixamorig:Spine"))
    push_zones(body, zones)
    zone_materials(body, zones)
    face_uv(body, eye_z)
    rings = costume_rings(body, rig)
    head_top = bone_z(rig, "mixamorig:HeadTop_End")
    hat = plain_hat(body, rig, eye_z)
    action = job.apply_clip(rig, Path(al.CLIP))
    start, end = action.frame_range
    bpy.context.scene.frame_set(int(round(start + (end - start) * al.CLIP_FRAME)))
    al.anime_normals(body, rig)
    return rig, body, [body] + rings, hat


def stage():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 900, 1200
    sc.view_settings.view_transform = "Standard"
    sc.world = bpy.data.worlds.new("paper")
    sc.world.use_nodes = True
    sc.world.node_tree.nodes["Background"].inputs["Color"].default_value = PAPER
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 24
    cam.data.lens = 55
    target = Vector((0, 0, 1.0))
    cam.location = target + Vector((math.sin(math.radians(-30)), -math.cos(math.radians(-30)), 0.0)) * 5.0 + Vector((0, 0, 0.25))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sc.collection.objects.link(sun)
    sun.data.energy = al.SUN_W
    to_light = Vector((-0.8, -1.0, 1.1)).normalized()      # front-left and high: one clear shade step
    sun.rotation_euler = (-to_light).to_track_quat("-Z", "Y").to_euler()


def close_up(sc, path):
    """The head at 1:1 (the 2D face decal must read in a close shot), then the camera goes back."""
    cam = sc.camera
    keep = (cam.location.copy(), cam.data.lens)
    head = Vector((0, -0.05, 1.72))
    cam.location = head + (keep[0] - Vector((0, 0, 1.0))).normalized() * 1.2
    cam.rotation_euler = (head - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 85
    sc.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    cam.location, cam.data.lens = keep
    cam.rotation_euler = (Vector((0, 0, 1.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()


def main():
    fbx, faces, out, name = args()
    out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage()
    rig, body, figure, hat = load(fbx)
    dress(figure + hat, COLOURWAYS[0], faces / "face_neutral.png")
    hull_mat = al.emission("ink hull", al.HULL, cull=True)
    al.add_hull(body, hull_mat)
    drawn = bpy.data.collections.new("drawn")
    bpy.context.scene.collection.children.link(drawn)
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and not o.name.endswith(("normal proxy", "face sphere")):
            drawn.objects.link(o)
    gp = al.lineart(drawn)
    la = next(m for m in gp.modifiers if m.type == "LINEART")
    la.use_crease = la.use_intersection = False   # Y Bot's panel creases and joint pieces: outline + colour borders only
    sc = bpy.context.scene
    shots = []
    close_up(sc, out / f"{name}_face.png")
    for i, cw in enumerate(COLOURWAYS):
        dress(figure + hat, cw, faces / ("face_neutral.png" if i % 2 == 0 else "face_smile.png"))
        for h in hat:
            h.hide_render = i == len(COLOURWAYS) - 1           # the last one bareheaded: the hat is a prop
        sc.render.filepath = str(out / f"{name}_{i}.png")
        bpy.ops.render.render(write_still=True)
        shots.append(sc.render.filepath)
    for h in hat:
        h.hide_render = False
    dress(figure + hat, COLOURWAYS[0], faces / "face_neutral.png")
    al.show_rendered_through_camera()
    bpy.ops.wm.save_as_mainfile(filepath=str(out / f"{name}.blend"))
    print("ARCHETYPE ok", " ".join(shots), out / f"{name}.blend")


if __name__ == "__main__":
    main()

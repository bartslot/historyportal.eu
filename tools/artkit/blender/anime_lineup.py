"""The MPFB standard body next to the anime figure, on the Heemskerck's deck, drawn the way anime 3D is drawn
(Bart 2026-10-13: "put it next to the anime character ... reproduce the lines and techniques ... in blender").

  Blender -b --python anime_lineup.py -- MPFB_REST.fbx ANIME.vrm|REFERENCE.png SHIP.glb PLATE.png OUT_DIR [NAME]
(MPFB_REST.fbx = mh_build.py's FBX through normalize_rest.py, so Mixamo clips pose it.)

Techniques (what pro anime 3D does; see Memory/3d-pipeline/topics/comic-look/notes.md):
  1 cel shade      each material's own texture x ONE hard light/shade step (Shader to RGB -> constant ramp)
  2 inverted hull  Solidify outward with flipped normals, line-colour material with backface culling: the outline
  3 Line Art       Grease Pencil Line Art over the whole set: contour, creases, material borders, intersections
Camera, ship placement and backdrop = the spyglass shot (engine-mvp/src/engine/frame-match.js), in Blender's Z-up:
ship keel at z=0 from ship_glb.py, so the ship is lowered 4.61 m to put its midships deck at z=0.
Writes OUT_DIR/anime_lineup.png and OUT_DIR/anime_lineup.blend (open it to look around).
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

LINE = (0.42, 0.35, 0.29, 1.0)          # History Lines pencil brown (STYLE.md: never black)
HULL = (0.30, 0.24, 0.20, 1.0)          # outline: a little darker than the inner lines
SHADE = 0.72                            # the shade step multiplies the texture by this
STEP = 0.45                             # where light turns to shade: cos(angle to the sun), with the sun at SUN_W
SUN_W = math.pi / 0.8                   # sun strength at which the default diffuse (albedo 0.8) gives exactly cos(angle)
SKIN = (0.87, 0.72, 0.62, 1.0)          # MPFB body without a material of its own
HULL_MIN_FACES = 5000                   # outline only body, face, hair: not eyes, lashes, teeth
HULL_M = 0.006                          # outline width in metres at ~3 m (1.6-1.8 m figures)
LINE_RADIUS = 0.0015
DECK_Y = 4.61                           # Heemskerck midships deck above the keel (measured, frame-match.js)
CAM = Vector((-2.5, -1.6, 1.1))         # 2.5 m aft of midships, 1.6 m to starboard, eye 1.1 m above the deck
YAW = math.radians(-26)                 # looking forward, turned 26 deg toward the starboard rail
FOV_Y = 0.7                             # rad, vertical (Babylon's camera.fov)
SMOOTH_REPEAT = 60                      # proxy smoothing: large simple shapes, like a drawn body
HEAD_BONE = "mixamorig:Head"
ARMS_DOWN_DEG = 65
# Tasman's canon colours (Memory/historyportal/topics/tasman-standard/STYLE.md), by garment object name
DYES = {"robe": (0.20, 0.30, 0.55), "hat": (0.07, 0.07, 0.08), "boot": (0.42, 0.27, 0.15), "pants": (0.23, 0.25, 0.31)}
DYE_GAIN = 2.2
COAT_HEM_ABOVE_KNEE = -0.04             # the robe is cut here (metres above the knee joint): a knee-length coat
PIPELINE = Path("/Users/bartslot/BartsAutomation/BartsDev/workflows/3D pipeline")
CLIP = PIPELINE / "in" / "Breathing Idle.fbx"
CLIP_FRAME = 0.35                        # fraction of the clip: a relaxed moment of the breath                      # degrees below horizontal: relaxed, hands beside the thighs


def args():
    a = sys.argv[sys.argv.index("--") + 1:]
    return [Path(x) for x in a[:5]] + [a[5] if len(a) > 5 else "anime_lineup"]


def forward():
    return Vector((math.cos(YAW), math.sin(YAW), 0.0))


def on_deck(ahead, left):
    """A spot `ahead` m in front of the camera and `left` m to its left, on the deck (z=0)."""
    f = forward()
    l = Vector((-f.y, f.x, 0.0))
    p = CAM + f * ahead + l * left
    return Vector((p.x, p.y, 0.0))


def face_camera(root, pos, front=Vector((0, -1, 0))):
    """Turn a figure whose front is `front` (Blender) to look at the camera, then stand it at `pos`."""
    to = (CAM - pos)
    to.z = 0
    to.normalize()
    root.rotation_euler = (0, 0, math.atan2(to.y, to.x) - math.atan2(front.y, front.x))
    root.location = pos


def arms_down(rig, names, deg):
    """Upper arms to `deg` below horizontal, whatever the rest pose (MPFB rests in an A-pose, VRoid in a T-pose)
    and whatever axis frame the importer gave the rig: the rotation is worked out in WORLD space, about the
    horizontal axis across the arm, at the shoulder joint, then taken back into armature space."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    up = Vector((0, 0, 1))
    for name in names:
        pb = rig.pose.bones.get(name)
        if not pb:
            continue
        mw = rig.matrix_world
        # the arm's direction = shoulder joint -> elbow joint (glTF-imported bones point their tails anywhere)
        elbow = next((c for c in pb.children if "Lower" in c.name or "Fore" in c.name), None)
        head, tail = mw @ pb.head, mw @ (elbow.head if elbow else pb.tail)
        v = tail - head
        flat = Vector((v.x, v.y, 0))
        now = math.atan2(-v.z, flat.length)                 # current angle below horizontal
        axis = up.cross(flat).normalized()
        r = Matrix.Translation(head) @ Matrix.Rotation(math.radians(deg) - now, 4, axis) @ Matrix.Translation(-head)
        pb.matrix = mw.inverted() @ r @ mw @ pb.matrix
        bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")


def base_image(mat):
    if not mat or not mat.use_nodes:
        return None
    for n in mat.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image:
            return n.image
    return None


def cel_material(src, dye=None):
    """Anime cel: the material's own texture (or colour) x one hard shade step, emission (no PBR).
    dye: an RGB the texture is recoloured to, keeping its folds and shading (texture brightness x dye)."""
    m = bpy.data.materials.new(f"cel_{src.name if src else 'plain'}")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse")
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].color = (SHADE, SHADE, SHADE, 1)
    ramp.color_ramp.elements[1].position = STEP
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    img = base_image(src)
    if img:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = img
        if dye:
            bw = nt.nodes.new("ShaderNodeRGBToBW")
            gain = nt.nodes.new("ShaderNodeMath")
            gain.operation = "MULTIPLY"
            gain.inputs[1].default_value = DYE_GAIN          # a mid-grey texture keeps the dye's own brightness
            tint = nt.nodes.new("ShaderNodeMix")
            tint.data_type = "RGBA"
            tint.blend_type = "MULTIPLY"
            tint.inputs["Factor"].default_value = 1.0
            tint.inputs["A"].default_value = (*dye, 1.0)
            nt.links.new(tex.outputs["Color"], bw.inputs[0])
            nt.links.new(bw.outputs[0], gain.inputs[0])
            nt.links.new(gain.outputs[0], tint.inputs["B"])
            nt.links.new(tint.outputs["Result"], mul.inputs["A"])
        else:
            nt.links.new(tex.outputs["Color"], mul.inputs["A"])
        alpha = tex.outputs["Alpha"]
    else:
        col = (*dye, 1.0) if dye else (src.diffuse_color if src else (0.9, 0.88, 0.84, 1))
        mul.inputs["A"].default_value = col
        alpha = None
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(dif.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], mul.inputs["B"])
    nt.links.new(mul.outputs["Result"], em.inputs["Color"])
    if alpha is not None and src and src.blend_method != "OPAQUE":   # lashes, brows, hair cards: cut out
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(alpha, mix.inputs["Fac"])
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(em.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs[0])
        m.blend_method = "CLIP" if hasattr(m, "blend_method") else m.blend_method
    else:
        nt.links.new(em.outputs[0], out.inputs[0])
    return m


def skin_material():
    m = bpy.data.materials.new("skin")
    m.diffuse_color = SKIN
    return m


def emission(name, rgba, cull=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = rgba
    nt.links.new(em.outputs[0], out.inputs[0])
    m.use_backface_culling = cull
    return m


def animeify(meshes, hull_mat):
    """Techniques 1 + 2 on a figure: cel materials and an inverted-hull outline (hull_mat None: cel only)."""
    for o in meshes:
        if not o.material_slots:                # MPFB's body carries no material of its own: give it skin
            o.data.materials.append(skin_material())
        dye = next((rgb for key, rgb in DYES.items() if key in o.name.lower()), None)
        for i, slot in enumerate(o.material_slots):
            slot.material = cel_material(slot.material, dye)
        if hull_mat is None or len(o.data.polygons) < HULL_MIN_FACES:          # eyes, lashes, teeth: no outline of their own
            continue
        add_hull(o, hull_mat)


def add_hull(o, hull_mat):
    """The inverted hull as its OWN object: a copy of the mesh with its faces reversed, pushed out HULL_M along the
    normals, in the line colour with backface culling, so only the rim behind the body shows. As a separate object
    it casts no shadow; as a Solidify on the body itself it shadowed the whole body (the cel step never lit)."""
    import bmesh
    hull = o.copy()
    hull.data = o.data.copy()
    hull.name = f"{o.name} ink hull"
    for c in o.users_collection:
        c.objects.link(hull)
    bm = bmesh.new()
    bm.from_mesh(hull.data)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(hull.data)
    bm.free()
    hull.data.materials.clear()
    hull.data.materials.append(hull_mat)
    for m in [m for m in hull.modifiers if m.type not in ("ARMATURE", "MASK")]:   # MASK hides MPFB helper geometry
        hull.modifiers.remove(m)
    push = hull.modifiers.new("push out", "DISPLACE")
    push.direction = "NORMAL"
    push.mid_level = 0.0
    push.strength = -HULL_M                     # the normals now point inward: negative = outward
    hull.visible_shadow = False


def anime_normals(body, rig):
    """Clean anime shadow shapes without touching the silhouette (what Arc System Works and VRoid do):
      body: custom normals transferred from a heavily SMOOTHED copy that follows the same rig (hidden in render),
      head: normals from an ELLIPSOID around the head, so the face takes one clean shadow shape.
    The geometry, and so the outline and Line Art, stay exactly as they are; only the light reads simpler."""
    proxy = body.copy()
    proxy.data = body.data.copy()
    proxy.name = f"{body.name} normal proxy"
    for c in body.users_collection:
        c.objects.link(proxy)
    for m in [m for m in proxy.modifiers if m.type not in ("ARMATURE",)]:
        proxy.modifiers.remove(m)
    sm = proxy.modifiers.new("simplify shapes", "SMOOTH")
    sm.factor = 1.0
    sm.iterations = SMOOTH_REPEAT
    proxy.hide_render = True
    proxy.display_type = "WIRE"
    proxy.visible_shadow = False
    dt = body.modifiers.new("normals from smooth proxy", "DATA_TRANSFER")
    dt.object = proxy
    dt.use_loop_data = True
    dt.data_types_loops = {"CUSTOM_NORMAL"}
    dt.loop_mapping = "POLYINTERP_NEAREST"

    # head: an ellipsoid on the head bone, its normals on the head's vertices only (vertex group = the bone's weights)
    bone = rig.pose.bones.get(HEAD_BONE)
    group = body.vertex_groups.get(HEAD_BONE)
    if not (bone and group):
        return
    mw = rig.matrix_world
    head_pts = [body.matrix_world @ v.co for v in body.data.vertices
                if any(g.group == group.index and g.weight > 0.5 for g in v.groups)]
    lo = Vector([min(p[i] for p in head_pts) for i in range(3)])
    hi = Vector([max(p[i] for p in head_pts) for i in range(3)])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=(lo + hi) / 2)
    egg = bpy.context.active_object
    egg.name = f"{body.name} face sphere"
    egg.scale = (hi - lo) / 2 * 1.05
    egg.hide_render = True
    egg.display_type = "WIRE"
    egg.visible_shadow = False
    bpy.ops.object.shade_smooth()
    # it moves with the head
    bpy.ops.object.select_all(action="DESELECT")
    egg.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    rig.data.bones.active = rig.data.bones[HEAD_BONE]
    bpy.ops.object.parent_set(type="BONE", keep_transform=True)
    dh = body.modifiers.new("face normals from sphere", "DATA_TRANSFER")
    dh.object = egg
    dh.use_loop_data = True
    dh.data_types_loops = {"CUSTOM_NORMAL"}
    dh.loop_mapping = "POLYINTERP_NEAREST"
    dh.vertex_group = HEAD_BONE
    dh.mix_factor = 0.85


def shorten(obj, rig, knee_bone="mixamorig:LeftLeg", above=COAT_HEM_ABOVE_KNEE):
    """Cut a long garment off at knee height (rest pose): the monk's robe becomes a knee-length coat."""
    import bmesh
    knee = (rig.matrix_world @ rig.data.bones[knee_bone].head_local).z + above
    mw = obj.matrix_world
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    gone = [f for f in bm.faces if all((mw @ v.co).z < knee for v in f.verts)]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def load_mpfb(path, clip, frame_frac):
    """The MPFB body in Mixamo's rest pose (normalize_rest.py output, FBX) posed with a frame of a real Mixamo clip,
    via the 3D pipeline's own job.apply_clip (prefix normalised, hips retargeted): a natural stance and relaxed
    hands, where rotating the upper arms by hand gave a stiff dummy (Bart: "the pose is really bad")."""
    sys.path.insert(0, str(PIPELINE))
    import job   # noqa: E402  (workflows/3D pipeline/job.py)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    new = [o for o in bpy.data.objects if o not in before]
    rig = next(o for o in new if o.type == "ARMATURE")
    for o in new:                       # garments are fitted in the rest pose, before the clip
        if o.type == "MESH" and "robe" in o.name.lower():
            shorten(o, rig)
    action = job.apply_clip(rig, Path(clip))
    start, end = action.frame_range
    bpy.context.scene.frame_set(int(round(start + (end - start) * frame_frac)))
    root = bpy.data.objects.new("mpfb", None)
    bpy.context.scene.collection.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    body = next(o for o in new if o.type == "MESH" and o.name == "Human")
    meshes = [o for o in new if o.type == "MESH"]
    anime_normals(body, rig)
    return root, meshes


def load_vrm(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    # the VRM brings a 2.6 m Icosphere without material (a helper of the exporter): it draws a dome over the scene
    for o in [o for o in new if o.type == "MESH" and not o.material_slots]:
        new.remove(o)
        bpy.data.objects.remove(o, do_unlink=True)
    root = bpy.data.objects.new("anime", None)
    bpy.context.scene.collection.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    for o in new:                       # VRM spring-bone colliders: helper spheres, only clutter in the editor
        if o.type == "EMPTY":
            o.hide_set(True)
            o.hide_render = True
    rig = next((o for o in new if o.type == "ARMATURE"), None)
    if rig:
        arms_down(rig, ["J_Bip_L_UpperArm", "J_Bip_R_UpperArm"], ARMS_DOWN_DEG)
    return root, [o for o in new if o.type == "MESH"]


def load_ship(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new("ship", None)
    bpy.context.scene.collection.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    root.location.z = -DECK_Y
    return root, [o for o in new if o.type == "MESH"]


def backdrop(plate):
    """The painted sea and coast on a card: horizon at the camera's height, 1.3 x the view (plate.js 'view' fit)."""
    img = bpy.data.images.load(str(plate))
    aspect = img.size[0] / img.size[1]
    dist = 10 + 28
    h = 2 * dist * math.tan(FOV_Y / 2) * 1.3
    w = h * aspect
    horizon_up = 1 - 0.5155
    bpy.ops.mesh.primitive_plane_add(size=1)
    card = bpy.context.active_object
    card.name = "backdrop"
    card.scale = (w, h, 1)
    f = forward()
    card.location = CAM + f * dist + Vector((0, 0, -horizon_up * h + h / 2))
    card.rotation_euler = (math.radians(90), 0, math.atan2(f.y, f.x) + math.radians(90))
    m = bpy.data.materials.new("backdrop")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs[0])
    card.data.materials.append(m)
    card.visible_shadow = False   # a painted backdrop never blocks the sun (it stands where a key light from behind comes from)
    return card


def camera_and_light():
    sc = bpy.context.scene
    cam = bpy.data.objects.new("shot camera", bpy.data.cameras.new("shot camera"))
    sc.collection.objects.link(cam)
    cam.data.sensor_fit = "VERTICAL"
    cam.data.angle_y = FOV_Y
    cam.location = CAM
    target = CAM + forward() * 10 + Vector((0, 0, 0.14))
    cam.rotation_euler = (target - CAM).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sc.collection.objects.link(sun)
    sun.data.energy = SUN_W
    # key light high and front-left of the figures (from the camera side): their right halves fall in
    # the one shade step (a front light leaves the cel step invisible)
    f = forward()
    left = Vector((-f.y, f.x, 0))
    to_light = (-f * 0.6 + left * 1.0 + Vector((0, 0, 0.8))).normalized()   # front-left and high: anime key light
    sun.rotation_euler = (-to_light).to_track_quat("-Z", "Y").to_euler()
    return cam


def lineart(collection):
    bpy.ops.object.grease_pencil_add(type="LINEART_SCENE")
    gp = bpy.context.active_object
    gp.name = "Line Art (pencil)"
    mod = next(m for m in gp.modifiers if m.type == "LINEART")
    mod.source_type = "COLLECTION"
    mod.source_collection = collection
    mod.radius = LINE_RADIUS
    mod.use_contour = mod.use_crease = mod.use_material = mod.use_intersection = True
    mod.crease_threshold = math.radians(140)
    for mat in gp.data.materials:
        if mat.grease_pencil:
            mat.grease_pencil.color = LINE
    return gp


def reference_card(image, at, height=2.0):
    """A reference image standing on the deck like a modeller's reference (Blender image empty), facing the camera."""
    img = bpy.data.images.load(str(image))
    ref = bpy.data.objects.new("reference: " + Path(image).stem, None)
    bpy.context.scene.collection.objects.link(ref)
    ref.empty_display_type = "IMAGE"
    ref.data = img
    ref.empty_display_size = height * img.size[0] / img.size[1]
    ref.empty_image_offset = (-0.5, 0.0)
    ref.use_empty_image_alpha = False
    to = CAM - at
    to.z = 0
    ref.rotation_euler = (math.radians(90), 0, math.atan2(to.y, to.x) - math.radians(90))
    ref.location = at
    ref.show_in_front = False
    return ref


def show_rendered_through_camera():
    """Open the file the way it renders: every 3D view in Rendered shading, looking through the shot camera."""
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            space.shading.type = "RENDERED"
            space.region_3d.view_perspective = "CAMERA"
    for o in bpy.data.objects:          # the normal proxies and face spheres stay out of sight too
        if o.name.endswith(("normal proxy", "face sphere")):
            o.hide_set(True)


def main():
    mpfb, second, ship, plate, out, name = args()
    out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.view_settings.view_transform = "Standard"
    cam = camera_and_light()
    _, ship_meshes = load_ship(ship)
    animeify(ship_meshes, None)                            # the set gets the same cel step, no outline
    for o in ship_meshes:                                  # the sails would shade the whole deck: anime sets light
        o.visible_shadow = False                           # their actors, they do not shadow them
    backdrop(plate)
    body, body_meshes = load_mpfb(mpfb, CLIP, CLIP_FRAME)
    face_camera(body, on_deck(2.9, 1.05))                   # side by side at Tasman's distance, the fair comparison
    hull_mat = emission("ink hull", HULL, cull=True)
    animeify(body_meshes, hull_mat)
    if second.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):   # a reference sheet beside him, not a figure
        reference_card(second, on_deck(2.9, 0.15))
    else:
        anime, anime_meshes = load_vrm(second)
        face_camera(anime, on_deck(2.9, 0.15), front=Vector((0, -1, 0)))   # just inside the starboard rail
        animeify(anime_meshes, hull_mat)
    lines = bpy.data.collections.new("drawn")
    sc.collection.children.link(lines)
    for o in list(sc.objects):
        if o.type == "MESH" and o.name != "backdrop":
            lines.objects.link(o)
    lineart(lines)
    sc.render.filepath = str(out / f"{name}.png")
    bpy.ops.render.render(write_still=True)
    show_rendered_through_camera()
    bpy.ops.wm.save_as_mainfile(filepath=str(out / f"{name}.blend"))
    print(f"LINEUP ok {out / (name + '.png')} {out / (name + '.blend')}")


main()

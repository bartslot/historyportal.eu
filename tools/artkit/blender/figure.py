# Posable people from the Blender Foundation Human Base Meshes (CC0; on the render PC, Bart 2026-09-27:
# "use the mannequin from Blender and position bodies", not Sketchfab, not box mannequins).
# The primitive body is a chain of parts (pelvis > leg_upper > leg_lower > foot, belly > chest > shoulder >
# arm_upper > arm_lower > hand, chest > neck > head) with every origin at 0. figure() moves each part's
# origin to its joint (where it meets its parent) so a rotation bends it there, then applies a pose.
# Sent after hp1lib.py:  bl.py --render --lib figure.py packs/<pack>.py
HBM = "/home/bart/assets/human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend"
HBM_COLL = {"male": "Body Male - Primitve (Realistic)", "female": "Body Female - Primitve (Realistic)"}

# Poses: part -> (x, y, z) degrees in the figure's own frame (the base mesh faces -y; +x = its left).
# Keys match the part name between "GEO-" and "_male/_female" plus ".L"/".R".
POSES = {
    "stand": {},
    "walk": {"leg_upper.L": (-22, 0, 0), "leg_lower.L": (18, 0, 0), "leg_upper.R": (16, 0, 0), "leg_lower.R": (6, 0, 0),
             "arm_upper.L": (14, 0, 0), "arm_upper.R": (-16, 0, 0)},
    "sit": {"leg_upper.L": (-88, 0, 0), "leg_upper.R": (-88, 0, 0), "leg_lower.L": (88, 0, 0), "leg_lower.R": (88, 0, 0)},
    "ride": {"leg_upper.L": (-55, -28, 0), "leg_upper.R": (-55, 28, 0), "leg_lower.L": (70, 0, 0), "leg_lower.R": (70, 0, 0),
             "belly": (-10, 0, 0), "arm_upper.L": (-30, 0, 0), "arm_upper.R": (-30, 0, 0), "arm_lower.L": (-55, 0, 0), "arm_lower.R": (-55, 0, 0)},   # hands on the reins
    "charge": {"leg_upper.L": (-55, -28, 0), "leg_upper.R": (-55, 28, 0), "leg_lower.L": (70, 0, 0), "leg_lower.R": (70, 0, 0),
               "belly": (-18, 0, 0), "chest": (-8, 0, 0), "arm_upper.L": (-50, 0, 10), "arm_lower.L": (-40, 0, 0),
               "arm_upper.R": (-150, 30, 0), "arm_lower.R": (-25, 0, 0)},   # right arm raised: sword or banner up
    "greet": {"arm_upper.R": (-20, -70, 0), "arm_lower.R": (-80, 0, 0)},
    "point": {"arm_upper.R": (-80, 0, -10), "arm_lower.R": (-10, 0, 0), "head": (0, 0, -10)},
    "read": {"arm_upper.L": (-25, 0, -15), "arm_upper.R": (-25, 0, 15), "arm_lower.L": (-60, 0, 0), "arm_lower.R": (-60, 0, 0),
             "neck": (15, 0, 0), "head": (18, 0, 0)},
    "turn_greet": {"leg_upper.L": (-15, 0, 0), "leg_lower.L": (12, 0, 0), "leg_upper.R": (10, 0, 0),
                   "chest": (0, 0, 15), "neck": (0, 0, 20), "head": (0, 0, 25), "arm_upper.R": (-15, 0, 0)},
    "startled": {"arm_upper.L": (-20, 0, 0), "arm_upper.R": (-20, 0, 0), "arm_lower.L": (-30, 0, 0), "arm_lower.R": (-30, 0, 0),
                 "chest": (6, 0, 0), "head": (-8, 0, 0), "leg_upper.R": (12, 0, 0)},
    "sit_point": {"leg_upper.L": (-88, 0, 0), "leg_upper.R": (-88, 0, 0), "leg_lower.L": (88, 0, 0), "leg_lower.R": (88, 0, 0),
                  "arm_upper.R": (-62, 0, -12), "arm_lower.R": (5, 0, 0), "arm_upper.L": (-32, 0, 0), "arm_lower.L": (-22, 0, 0),
                  "head": (18, 0, 0)},   # right hand points down at the list on the table
    "sit_listen": {"leg_upper.L": (-88, 0, 0), "leg_upper.R": (-88, 0, 0), "leg_lower.L": (88, 0, 0), "leg_lower.R": (88, 0, 0),
                   "arm_upper.L": (-30, 0, 6), "arm_upper.R": (-30, 0, -6), "arm_lower.L": (-22, 0, 0), "arm_lower.R": (-22, 0, 0),
                   "head": (10, 0, 0)},   # forearms resting on the table
    "sleep": {"neck": (-10, 0, 0)},
    "write": {"leg_upper.L": (-88, 0, 0), "leg_upper.R": (-88, 0, 0), "leg_lower.L": (88, 0, 0), "leg_lower.R": (88, 0, 0),
              "arm_upper.L": (-40, 0, 8), "arm_upper.R": (-45, 0, -8), "arm_lower.L": (-30, 0, 0), "arm_lower.R": (-35, 0, 0),
              "neck": (18, 0, 0), "head": (12, 0, 0)},
}


# The base mesh stands in an A-pose (arms ~40 degrees out). Every pose except "greet" starts from arms at
# the sides: +y rotation lowers the left arm (+x side), -y the right.
ARMS_DOWN = {"arm_upper.L": (0, 38, 0), "arm_upper.R": (0, -38, 0)}


def _part_key(name):
    import re
    base = re.sub(r"\.\d{3}$", "", name.replace("GEO-", ""))   # second import: "....L.001"
    side = base[-2:] if base[-2:] in (".L", ".R") else ""
    stem = base[:-2] if side else base
    for tag in ("_male_primitive_realistic", "_female_primitive_realistic", "_primitive_female_realistic"):
        stem = stem.replace(tag, "")
    return stem + side


def _world_verts(o):
    return [o.matrix_world @ v.co for v in o.data.vertices]


def _to_joints(parts):
    """Origin of every part -> its joint: the mean of its 8% vertices closest to the parent's centre."""
    centre = {o.name: sum(_world_verts(o), Vector()) / max(1, len(o.data.vertices)) for o in parts}
    world = {o.name: o.matrix_world.copy() for o in parts}
    for o in parts:                                  # unparent, keep the world shape
        o.parent = None; o.matrix_world = world[o.name]
    pivots = {}
    for o in parts:
        par = next((p for p in parts if p.name == o.get("hbm_parent")), None)
        if not par:
            continue
        vs = sorted(_world_verts(o), key=lambda v: (v - centre[par.name]).length)
        near = vs[:max(3, len(vs) * 8 // 100)]
        pivots[o.name] = sum(near, Vector()) / len(near)
    for o in parts:
        if o.name not in pivots:
            continue
        local = o.matrix_world.inverted() @ pivots[o.name]
        o.data.transform(Matrix.Translation(-local))            # vertices move so the pivot is the origin...
        o.matrix_world = o.matrix_world @ Matrix.Translation(local)   # ...and the object moves back (local space:
        # the parts' world matrices carry the file's offset, so T(pv) @ M would push every part outwards)
    for o in parts:                                  # re-parent without moving anything
        par = next((p for p in parts if p.name == o.get("hbm_parent")), None)
        if par:
            mw = o.matrix_world.copy(); o.parent = par; o.matrix_world = mw


def figure_points(root, cam, sc):
    """Balloon/anchor metadata for one posed figure, in render pixels (x right, y down) and world metres:
    mouth (below the nose tip, in front of the face), head_top, feet (lowest point). Sitting, standing, riding
    or fighting figures all differ, so it is measured per pose (Bart, 2026-09-28)."""
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    tag = root.name.rsplit(".", 1)[0] + "."            # "<scene>.<name>."
    parts = [o for o in objs(sc) if o.type == 'MESH' and o.name.startswith(tag)]
    by = {o["key"]: o for o in parts if "key" in o}
    head, nose = by["head"], by.get("nose")
    hv = [head.matrix_world @ v.co for v in head.data.vertices]
    top = max(hv, key=lambda v: v.z)
    hc = sum(hv, Vector()) / len(hv)
    if nose:
        nv = [nose.matrix_world @ v.co for v in nose.data.vertices]
        tip = max(nv, key=lambda v: (v - hc).length)          # the nose point farthest from the head centre
        down = -(top - hc).normalized()                         # the head's own "down", works when it tilts
        mouth = tip + down * (0.045 * root.scale[0] / 1.0) - (tip - hc).normalized() * 0.01
    else:
        mouth = hc
    allv = [o.matrix_world @ v.co for o in parts for v in o.data.vertices]
    feet = min(allv, key=lambda v: v.z)
    W, H = sc.render.resolution_x, sc.render.resolution_y

    def px(p):
        c = world_to_camera_view(sc, cam, p)
        return [round(c.x * W, 1), round((1 - c.y) * H, 1)]
    return {"mouth_px": px(mouth), "head_top_px": px(top), "feet_px": px(feet),
            "mouth_m": [round(v, 3) for v in mouth], "pose": root.get("pose")}


SKIN_PARTS = ("head", "neck", "ear", "nose", "eye", "eyelid", "hand", "finger", "thumb")
SKIN_RGB = (0.86, 0.66, 0.52)


def figure(c, name, loc, yaw_deg=0.0, height=1.72, pose="stand", body="male", rgb=None, extra=None, seat_z=None,
           skin=SKIN_RGB):
    """A posed person made of Human Base Mesh parts, standing on loc (feet on z) and facing +y at yaw 0
    (like mannequin()). rgb: costume colour for the paint pass; extra: {part: (x, y, z)} added to the pose."""
    from mathutils import Matrix, Euler
    globals()["Matrix"] = Matrix
    with bpy.data.libraries.load(HBM, link=False) as (src, dst):
        dst.collections = [HBM_COLL[body]]
    col = dst.collections[0]
    parts = [o for o in col.all_objects if o.type == 'MESH']
    for o in parts:
        o["hbm_parent"] = o.parent.name if o.parent else ""
        o["key"] = _part_key(o.name)             # names change below; the key does not
        if o.data.users > 1:
            o.data = o.data.copy()                   # .L and .R share one mesh: moving a pivot would move both
        for m in o.modifiers:
            if m.type == 'SUBSURF':
                m.levels = m.render_levels = 1       # the primitives need it; 1 level is enough under paint
        c.objects.link(o)
    bpy.data.collections.remove(col)
    bpy.context.view_layer.update()      # just-linked objects report identity matrix_world until evaluated
    _to_joints(parts)
    root = next(o for o in parts if "pelvis" in o.name)
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ v.co for o in parts for v in o.data.vertices]
    k = height / (max(p.z for p in pts) - min(p.z for p in pts))   # measured in the rest pose
    rest = {} if pose == "stand_a" else dict(ARMS_DOWN)
    for kk, v in POSES.get(pose, {}).items():
        rest[kk] = tuple(a + b for a, b in zip(rest.get(kk, (0, 0, 0)), v))
    for kk, v in (extra or {}).items():
        rest[kk] = tuple(a + b for a, b in zip(rest.get(kk, (0, 0, 0)), v))
    def depth(o):
        d = 0
        while o.parent:
            o, d = o.parent, d + 1
        return d
    # pose = a rotation in the figure's own frame (world axes at rest: faces -y, +x its left, forward swing
    # of a leg = negative x), about the joint, parents first so children follow. Never overwrite a part's
    # rotation_euler: the parts carry rest rotations from the file (and the .R side a mirror scale).
    for o in sorted(parts, key=depth):
        r = rest.get(o["key"])
        if r:
            bpy.context.view_layer.update()
            pv = o.matrix_world.translation.copy()
            # 'YXZ': the Y part (arms down from the A-pose, legs apart) first, then the X swing forward/back
            R = Euler(tuple(math.radians(a) for a in r), 'YXZ').to_matrix().to_4x4()
            o.matrix_world = Matrix.Translation(pv) @ R @ Matrix.Translation(-pv) @ o.matrix_world
    for o in parts:
        o["part"] = "figure"
        o.name = "%s.%s.%s" % (c.name.split(":")[0], name, o["key"])
        if rgb:   # costume colour on the body, skin colour on head and hands: an all-blue mannequin got blue skin
            is_skin = skin and any(o["key"].startswith(k) for k in SKIN_PARTS)
            o.data.materials.clear(); o.data.materials.append(costume(skin if is_skin else rgb))
    root.scale = (k, k, k)
    root.rotation_euler[2] += math.radians(yaw_deg + 180)   # base mesh faces -y; ours face +y at yaw 0
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ v.co for o in parts for v in o.data.vertices]
    cx = sum(p.x for p in pts) / len(pts); cy = sum(p.y for p in pts) / len(pts); zmin = min(p.z for p in pts)
    root.location = (root.location.x + loc[0] - cx, root.location.y + loc[1] - cy, root.location.z + loc[2] - zmin)
    if seat_z is not None:   # riders and sitters: the pelvis rests on the seat instead of feet on loc z
        bpy.context.view_layer.update()
        pz = min((root.matrix_world @ v.co).z for v in root.data.vertices)
        root.location.z += seat_z - pz
    bpy.context.view_layer.update()
    head = next(o for o in parts if o["key"] == "head")
    hv = [head.matrix_world @ v.co for v in head.data.vertices]
    root["head_m"] = [round(sum(p[i] for p in hv) / len(hv), 3) for i in range(3)]
    root["fig_name"] = name; root["seated"] = pose in ("sit", "write", "ride", "charge")
    root["height_m"] = height; root["pose"] = pose
    return root

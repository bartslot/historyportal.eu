"""An archetype figure from a basic mannequin, no modelling and no generator (Bart 2026-10-14: "these are so
basic that any basic mesh will do"): the body itself carries the costume.

    Blender -b --python archetype.py -- --make-base base_lowpoly.fbx base_v1.fbx     (once per base version)
    Blender -b --python archetype.py -- base_v1.fbx FACES_DIR OUT_DIR [captain]

The base is FROZEN: prepared once (standard flat face + face-decal UV map), then every figure loads it unchanged.
Clothes are separate garment meshes (copies of the surface they cover, pushed out, same rig weights); the skin under
them is only masked at render time.

Base = the pipeline's low-poly body (baserig_mixamo.py ... 0: Blend Swap "Rigged Man" by brightonpiers, CC-BY 3.0,
~1.4k quads on the Mixamo skeleton). Tried before it: the MPFB body (sculpted face, nipples and toes drew lines
through every costume) and Mixamo's Y Bot (separate muscular armour plates broke apart under the coat).

  colour zones   every base face belongs to the zone of its strongest bone (head = skin, upper legs = breeches...),
                 one flat dye per zone: a colourway is only a list of colours
  garments       per zone a copy of the base surface pushed out (coat, breeches, boots, hair), plus a few plain
                 rings for the silhouette: coat skirt, collar, cuffs, belt, boot tops
  face           (in the base) flattened to a smooth egg; the 2D face decal (face_decal.py) projected on it;
                 hair = a painted zone on the head plus a ponytail
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
SKIRT_FLARE_M = 0.04        # coat hem beyond the widest section of seat and thighs
SKIRT_FOLLOW = 0.85         # how much of the hem follows the thigh (the rest stays with the hips)
HAT_BAND_ABOVE_EYES_M = 0.075   # the hat band sits on the forehead this far above the eye line
HAT_CROWN_M = (0.10, 0.02)      # crown height, and how much narrower its top is than its band
HAT_BRIM_M = 0.075              # brim beyond the band
BELT_TUCK_M = 0.04          # the coat colour reaches this far below the belt line (under the belt, no gap)
COAT_HEM_ABOVE_KNEE_M = 0.10   # the captain sheet: the coat ends at mid-thigh, above the boots
COLLAR_M = (0.075, None)       # falling collar: how far it drops from the neck (its width comes from the shoulders)
COLLAR_CLEAR_M = 0.012         # collar edge this far outside the shoulders
SHOULDER_MAX_M = 0.17          # half-width limit for the collar's shoulder measure (beyond: the T-posed arm)
PONYTAIL_M = 0.2
SKIRT_CLEAR_M = 0.02        # skirt top beyond the coated waist
CUFF_CLEAR_M = 0.02         # cuffs and boot tops beyond the measured girth
TORSO_MAX_M = 0.25          # half-width limit for torso sections (beyond it are the T-posed arms)
FACE_RELAX = 30             # passes spreading the flattened face's folded vertices
FACE_WIDTH = 0.75           # the flattened face spans this fraction of the head's half-width (socket rims too)
FACE = "neutral_moustache"  # the captain's face decal (face_decal.py output name)
NECK_MAX_M = 0.09           # half-width limit when measuring the neck (beyond it are the shoulders)
HAIRLINE_M = 0.05           # hair starts this far above the eye line on the forehead

# bone name fragment -> zone (first match wins; "Hand" before "Arm" so hands stay skin)
CAPTAIN_ZONES = [("Head", "skin"), ("Neck", "skin"), ("Hand", "skin"), ("Arm", "coat"), ("Shoulder", "coat"),
                 ("Spine", "coat"), ("Hips", "breeches"), ("UpLeg", "breeches"), ("Leg", "boots"),
                 ("Foot", "boots"), ("Toe", "boots")]
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


def flatten_face(body):
    """A plain egg for a face: the front of the head goes onto an ellipsoid fitted to the head, so the sculpted
    sockets, nose and lips are gone and the 2D face sits on a calm surface; faded out towards the cheeks, so the
    sides and the jaw keep their shape. By position, not normal: the socket rims face sideways."""
    head = body.vertex_groups["mixamorig:Head"].index
    me = body.data
    pts = [v for v in me.vertices if any(g.group == head and g.weight > 0.6 for g in v.groups)]
    lo = Vector([min(v.co[i] for v in pts) for i in range(3)])
    hi = Vector([max(v.co[i] for v in pts) for i in range(3)])
    c, r = (lo + hi) / 2, (hi - lo) / 2
    face = []
    for v in pts:
        dx = abs(v.co.x - c.x) / (FACE_WIDTH * r.x)
        if v.co.y > c.y or dx >= 1 or not (c.z - 0.8 * r.z < v.co.z < c.z + 0.6 * r.z):
            continue
        q = 1 - ((v.co.x - c.x) / r.x) ** 2 - ((v.co.z - c.z) / r.z) ** 2
        if q <= 0:
            continue
        w = 1 - dx ** 4                                  # full on the face, fading out to the cheeks
        v.co.y += (c.y - r.y * math.sqrt(q) - v.co.y) * w
        face.append(v.index)
    # the socket rims and nostrils now lie on top of each other (folds Line Art draws): relax them sideways and
    # up-down on the face, then put them back on the egg
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    verts = [bm.verts[i] for i in face]
    for _ in range(FACE_RELAX):
        bmesh.ops.smooth_vert(bm, verts=verts, factor=0.5, use_axis_x=True, use_axis_y=False, use_axis_z=True)
    for v in verts:
        q = 1 - ((v.co.x - c.x) / r.x) ** 2 - ((v.co.z - c.z) / r.z) ** 2
        if q > 0:
            v.co.y = c.y - r.y * math.sqrt(q)
    bm.to_mesh(me)
    bm.free()
    me.update()


def face_zones(body, zones):
    """Per face: the zone most of its vertices lean to."""
    out = []
    for f in body.data.polygons:
        score = {}
        for i in f.vertices:
            for z, x in zones[i].items():
                score[z] = score.get(z, 0) + x
        out.append(max(score, key=score.get) if score else "skin")
    return out


def garments(body, zones):
    """The clothes as their OWN meshes: per zone a copy of the base surface it covers, pushed out along its normals;
    same vertices, so the same rig weights. The base body is never edited: the skin under the clothes is only
    hidden at render time (a MASK modifier on the vertices that have no bare skin face left)."""
    per_face = face_zones(body, zones)
    made = []
    for zone in sorted(set(per_face) - {"skin"}):
        g = body.copy()
        g.data = body.data.copy()
        g.name = f"garment {zone}"
        for c in body.users_collection:
            c.objects.link(g)
        for m in [m for m in g.modifiers if m.type != "ARMATURE"]:
            g.modifiers.remove(m)
        bm = bmesh.new()
        bm.from_mesh(g.data)
        bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if per_face[f.index] != zone], context="FACES")
        bm.normal_update()
        for v in bm.verts:
            v.co += v.normal * PUSH_M[zone]
        bm.to_mesh(g.data)
        bm.free()
        g.data.materials.clear()
        g["zone"] = zone
        made.append(g)
    bare = {i for f, z in zip(body.data.polygons, per_face) if z == "skin" for i in f.vertices}
    covered = body.vertex_groups.new(name="covered by clothes")
    covered.add([v.index for v in body.data.vertices if v.index not in bare], 1.0, "REPLACE")
    mask = body.modifiers.new("hide skin under clothes", "MASK")
    mask.vertex_group = covered.name
    mask.invert_vertex_group = True
    return made


def face_uv(body, eye_z):
    """A second UV map: the front view of the face frame, for the 2D face decal (elsewhere: a transparent corner)."""
    me = body.data
    while len(me.uv_layers) > 1:                       # the base carries the artist's 8 UV maps: room for ours
        me.uv_layers.remove(me.uv_layers[-1])
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


def ring(name, rig, bone, centre, axis, r0, r1, length, squash=(1.0, 1.0), segments=24, skin=None, cap=False, rows=1):
    """An open tube (a cone when r0 != r1) along `axis` from `centre`, rigid on `bone`: a cuff, collar or coat skirt.
    rows > 1 splits it lengthwise, so an opening can be cut that widens along it (cut_front)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segments, radius1=r0, radius2=r1, depth=length)
    if rows > 1:
        side = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1e-6]
        bmesh.ops.subdivide_edges(bm, edges=side, cuts=rows - 1, use_grid_fill=True)
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


def cut_front(o, cy, deg_top, deg_bottom):
    """An opening at the front (-Y) of a vertical tube: faces within an angle of straight ahead go; the angle grows
    from deg_top at the top to deg_bottom at the bottom, so the opening is a V (coat over the legs, collar points)."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    zs = [v.co.z for v in bm.verts]
    lo, hi = min(zs), max(zs)
    gone = []
    for f in bm.faces:
        c = f.calc_center_median()
        t = (hi - c.z) / (hi - lo)
        off = math.degrees(abs(math.atan2(c.x, -(c.y - cy))))
        if c.y < cy and off < deg_top + (deg_bottom - deg_top) * t:
            gone.append(f)
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    bm.to_mesh(o.data)
    bm.free()


def ponytail(body, rig, eye_z):
    """A tied ponytail: a tapered tube from the back of the head, hanging down and a little back."""
    head = body.vertex_groups["mixamorig:Head"].index
    back = max(v.co.y for v in body.data.vertices if any(g.group == head and g.weight > 0.5 for g in v.groups))
    o = ring("ponytail", rig, "mixamorig:Head", Vector((0, back - 0.015, eye_z - 0.01)), Vector((0, 0.3, -1)),
             0.03, 0.012, PONYTAIL_M, segments=12, cap=True)
    o["zone"] = "hair"
    return o


def girth(body, point, axis, reach=0.15):
    """Radius of the body around `axis` through `point`: the farthest edge crossing of the plane through `point`
    square to `axis`, within `reach` of it (so a wrist does not measure the thigh beside it)."""
    axis = axis.normalized()
    co = [body.matrix_world @ v.co for v in body.data.vertices]
    best = 0.0
    for e in body.data.edges:
        a, b = co[e.vertices[0]], co[e.vertices[1]]
        da, db = (a - point).dot(axis), (b - point).dot(axis)
        if da * db > 0 or da == db:
            continue
        p = a.lerp(b, da / (da - db))
        d = (p - point).length
        if d < reach:
            best = max(best, d)
    return best


def half_widths(body, z, band=None, keep=lambda p: True):
    """The body's cross-section at height z: (half-width in x, half-depth in y about its centre, centre y).
    Where its edges cross the plane, not the vertices near it: a low-poly body has whole bands with no vertex."""
    me = body.data
    mw = body.matrix_world
    co = [mw @ v.co for v in me.vertices]
    s = []
    for e in me.edges:
        a, b = co[e.vertices[0]], co[e.vertices[1]]
        if (a.z - z) * (b.z - z) <= 0 and a.z != b.z:
            p = a.lerp(b, (z - a.z) / (b.z - a.z))
            if keep(p):
                s.append(p)
    if not s:
        raise ValueError(f"no body section at z={z:.3f} (body z {min(p.z for p in co):.3f}..{max(p.z for p in co):.3f})")
    cy = (min(p.y for p in s) + max(p.y for p in s)) / 2
    return max(abs(p.x) for p in s), max(abs(p.y - cy) for p in s), cy


def costume_rings(body, rig):
    """The few plain shapes that make the silhouette read: coat skirt, collar, cuffs, belt, boot tops."""
    B = "mixamorig:"
    waist = bone_z(rig, B + "Spine")
    knee = bone_z(rig, B + "LeftLeg")
    wx, wy, wcy = half_widths(body, waist, keep=lambda p: abs(p.x) < TORSO_MAX_M)
    parts = []
    # coat skirt: waist to just above the knee, a little flare; it swings with the thighs and is open at the front
    hem = knee + COAT_HEM_ABOVE_KNEE_M
    # the widest section between hem and waist (seat, thighs) sets the skirt, or the body pokes through it
    secs = [half_widths(body, hem + (waist - hem) * k / 8, keep=lambda p: abs(p.x) < TORSO_MAX_M) for k in range(9)]
    ry_max = max(sec[1] for sec in secs)
    top_r = wx + SKIRT_CLEAR_M
    bot_r = max(sec[0] for sec in secs) + SKIRT_FLARE_M

    def follow_thighs(p):
        t = max(0.0, min(1.0, (waist - p.z) / (waist - hem)))    # 0 at the waist, 1 at the hem
        thigh = B + ("LeftUpLeg" if p.x > 0 else "RightUpLeg")
        return {B + "Hips": 1 - SKIRT_FOLLOW * t, thigh: SKIRT_FOLLOW * t}

    sk = ring("coat skirt", rig, B + "Hips", Vector((0, wcy, hem)), Vector((0, 0, 1)), bot_r, top_r, waist - hem,
              squash=(1.0, (ry_max + SKIRT_CLEAR_M) / top_r), segments=48, skin=follow_thighs)
    sk["zone"] = "coat"
    parts.append(sk)
    br = wx + SKIRT_CLEAR_M + 0.006                                   # just over the skirt's top
    belt = ring("belt", rig, B + "Spine", Vector((0, wcy, waist - 0.025)), Vector((0, 0, 1)), br, br, 0.05,
                squash=(1.0, (ry_max + SKIRT_CLEAR_M + 0.006) / br), segments=48)
    belt["zone"] = "belt"
    parts.append(belt)
    neck = bone_z(rig, B + "Neck")
    nx, ny, ncy = half_widths(body, neck + 0.01, keep=lambda p: abs(p.x) < NECK_MAX_M)   # not the shoulders
    drop, _ = COLLAR_M
    sx, sy, scy = half_widths(body, neck - drop, keep=lambda p: abs(p.x) < SHOULDER_MAX_M)   # lies ON the shoulders
    collar = ring("collar", rig, B + "Spine2", Vector((0, (ncy + scy) / 2, neck - drop)), Vector((0, 0, 1)),
                  sx + COLLAR_CLEAR_M, nx + 0.02, drop + 0.01, squash=(1.0, (sy + COLLAR_CLEAR_M) / (sx + COLLAR_CLEAR_M)),
                  segments=48)
    collar["zone"] = "collar"
    parts.append(collar)
    for side in ("Left", "Right"):
        hand = rig.matrix_world @ rig.data.bones[f"{B}{side}Hand"].head_local
        fore = rig.matrix_world @ rig.data.bones[f"{B}{side}ForeArm"].head_local
        axis = (hand - fore).normalized()
        at = hand - axis * 0.085
        r = girth(body, at, axis, reach=0.1) + CUFF_CLEAR_M
        cuff = ring(f"cuff {side}", rig, f"{B}{side}ForeArm", at, axis, r, r + 0.008, 0.075)
        cuff["zone"] = "collar"
        parts.append(cuff)
        leg = rig.matrix_world @ rig.data.bones[f"{B}{side}Leg"].head_local
        lx = half_widths(body, leg.z - 0.06, keep=lambda p, x=leg.x: abs(p.x - x) < 0.12 and p.x * x > 0)
        at = Vector((leg.x, lx[2], leg.z - 0.1))
        r = girth(body, at, Vector((0, 0, 1)), reach=0.12) + CUFF_CLEAR_M
        top = ring(f"boot top {side}", rig, f"{B}{side}Leg", at, Vector((0, 0, 1)), r, r + 0.012, 0.09)
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
        if o.name == "Human":                                  # the bare base: skin with the 2D face
            o.data.materials.clear()
            o.data.materials.append(face_material(lin["skin"], face_png))
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
    """The base's mesh(es) as ONE body in world space (identity transform, still on the rig)."""
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
    if len(meshes) > 1:
        bpy.ops.object.join()
    body = bpy.context.active_object
    body.name = "Human"
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


def upright(rig):
    """Stand up straight: the idle clip left Y Bot's chest ~5 cm behind the hips (leaning back). Turn the spine
    about its own joint, around the left-right axis, until the neck is right above the hips; the legs stay."""
    mw = rig.matrix_world
    pb = rig.pose.bones["mixamorig:Spine"]
    spine = mw @ pb.head
    hips = mw @ rig.pose.bones["mixamorig:Hips"].head
    neck = mw @ rig.pose.bones["mixamorig:Neck"].head
    now = math.atan2(neck.y - spine.y, neck.z - spine.z)
    want = math.atan2(hips.y - spine.y, neck.z - spine.z)
    turn = Matrix.Translation(spine) @ Matrix.Rotation(now - want, 4, "X") @ Matrix.Translation(-spine)
    pb.matrix = mw.inverted() @ turn @ mw @ pb.matrix
    bpy.context.view_layer.update()
    neck = mw @ rig.pose.bones["mixamorig:Neck"].head
    print(f"UPRIGHT spine turned {math.degrees(now - want):.1f} deg; neck {neck.y - hips.y:+.3f} m from above the hips")


def prepare_base(src, out):
    """ONCE per base version: the standard face (flattened to an egg) and the face-decal UV map, then exported.
    Every figure loads this file and never edits it (Bart 2026-10-14: the base must not be misformed per figure)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    new = _import(src)
    rig = next(o for o in new if o.type == "ARMATURE")
    body = base_body(new, rig)
    flatten_face(body)
    face_uv(body, eye_line(rig))
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    body.select_set(True)
    bpy.ops.export_scene.fbx(filepath=str(out), use_selection=True, add_leaf_bones=False, bake_anim=False)
    print("BASE ok", out, len(body.data.polygons), "faces")


def load(path):
    """The frozen base (prepare_base output) + this figure's garments, rings and hat, posed."""
    sys.path.insert(0, str(al.PIPELINE))
    import job   # noqa: E402
    new = _import(path)
    rig = next(o for o in new if o.type == "ARMATURE")
    body = base_body(new, rig)
    if "face" not in body.data.uv_layers:
        raise ValueError(f"{path.name} is not a prepared base (no 'face' UV map): run --make-base first")
    eye_z = eye_line(rig)
    zones = vertex_zones(body)
    paint_hair(body, zones, eye_z)
    coat_above_belt(body, zones, bone_z(rig, "mixamorig:Spine"))
    clothes = garments(body, zones)
    rings = costume_rings(body, rig) + [ponytail(body, rig, eye_z)]
    hat = plain_hat(body, rig, eye_z)
    action = job.apply_clip(rig, Path(al.CLIP))
    start, end = action.frame_range
    bpy.context.scene.frame_set(int(round(start + (end - start) * al.CLIP_FRAME)))
    rig.animation_data.action = None            # keep this frame as the pose, so it can be corrected
    upright(rig)
    al.anime_normals(body, rig)
    mask = body.modifiers["hide skin under clothes"]
    while body.modifiers[-1] != mask:           # hide last, after the normals are transferred
        bpy.ops.object.select_all(action="DESELECT")
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.modifier_move_down(modifier=mask.name)
    return rig, body, [body] + clothes + rings, hat


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
    argv = sys.argv[sys.argv.index("--") + 1:]
    if argv[0] == "--make-base":
        prepare_base(Path(argv[1]), Path(argv[2]))
        return
    fbx, faces, out, name = args()
    out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    stage()
    rig, body, figure, hat = load(fbx)
    dress(figure + hat, COLOURWAYS[0], faces / f"face_{FACE}.png")
    hull_mat = al.emission("ink hull", al.HULL, cull=True)
    al.add_hull(body, hull_mat)
    drawn = bpy.data.collections.new("drawn")
    bpy.context.scene.collection.children.link(drawn)
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and not o.name.endswith(("normal proxy", "face sphere")):
            drawn.objects.link(o)
    gp = al.lineart(drawn)
    la = next(m for m in gp.modifiers if m.type == "LINEART")
    la.use_crease = la.use_intersection = False   # outline + colour borders only (no sculpt creases)
    sc = bpy.context.scene
    shots = []
    close_up(sc, out / f"{name}_face.png")
    for i, cw in enumerate(COLOURWAYS):
        dress(figure + hat, cw, faces / (f"face_{FACE}.png" if i % 2 == 0 else f"face_{FACE.replace('neutral', 'smile')}.png"))
        for h in hat:
            h.hide_render = i == len(COLOURWAYS) - 1           # the last one bareheaded: the hat is a prop
        sc.render.filepath = str(out / f"{name}_{i}.png")
        bpy.ops.render.render(write_still=True)
        shots.append(sc.render.filepath)
    for h in hat:
        h.hide_render = False
    dress(figure + hat, COLOURWAYS[0], faces / f"face_{FACE}.png")
    al.show_rendered_through_camera()
    bpy.ops.wm.save_as_mainfile(filepath=str(out / f"{name}.blend"))
    print("ARCHETYPE ok", " ".join(shots), out / f"{name}.blend")


if __name__ == "__main__":
    main()

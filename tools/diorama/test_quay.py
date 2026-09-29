"""Diorama pilot test scene (plan step 2): a quay with a doorway and a rail, one sailor, one barrel.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python tools/diorama/test_quay.py -- public/diorama/test-quay

Writes, all from one hp1 camera (eye 1.60 m, horizon on the upper third):
  background.webp  sky, quay floor and the room behind the door, WITHOUT the wall and the rail,
                   so there are real pixels behind both occluders
  wall.webp        the building front with the doorway cut out (transparent), alone
  rail.webp        the quay rail, alone
  sailor.webp      orthographic cut-out, feet on the bottom row, centred: 400 px per metre
  barrel.webp      the same for a barrel
  camera.json      hp1 camera sidecar (what BlenderCamera / diorama:import --camera read)
  reference.webp   Blender's own render of the whole scene with the sailor and barrel at their
                   cells: the truth a browser composite of the layers must match (plan step 4)
  scene.json       the diorama JSON (floors, spots, items, plate layers with their depth)
  truth.json       Blender's pixel for each item's feet and top in the reference render
  assets.json      per-asset px_per_m, real height and balloon points (mouth, head_top)

Clay look on purpose: this is a geometry test rig, not lesson art.
Axes: x right, y forward, z up, metres. Camera at the origin looking +y.
"""
import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artkit", "blender"))
from hp1lib import EYE, RES_X, RES_Y, box, camera, coll, cut_many, cyl, join, mannequin, new_scene  # noqa: E402

OUT = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
os.makedirs(OUT, exist_ok=True)

PX_PER_M = 400          # cut-out resolution: source pixels per metre of the real thing
WALL_Y, WALL_T = 14.0, 0.4
RAIL_Y, RAIL_T = 6.0, 0.08
DOOR_X, DOOR_W, DOOR_H = -3.0, 1.2, 2.2

COLOURS = {
    "floor": (0.86, 0.84, 0.80), "room": (0.42, 0.38, 0.34), "wall": (0.93, 0.88, 0.76),
    "rail": (0.55, 0.38, 0.22), "sailor": (0.25, 0.35, 0.60), "barrel": (0.62, 0.45, 0.28),
}

sc = new_scene("dq")
c = coll(sc, "set")


def tint(o, key):
    o.color = (*COLOURS[key], 1)
    return o


# ── set ──────────────────────────────────────────────────────────────
quay = tint(box(c, "quay", (40, 20, 0.5), (0, 10, -0.25), "floor"), "floor")          # y 0..20, top at 0
room = [tint(box(c, "room_back", (8, 0.3, 4), (DOOR_X, 19.0, 2), "wall"), "room"),
        tint(box(c, "room_left", (0.3, 4.4, 4), (DOOR_X - 4, 16.8, 2), "wall"), "room"),
        tint(box(c, "room_right", (0.3, 4.4, 4), (DOOR_X + 4, 16.8, 2), "wall"), "room")]
wall = tint(box(c, "wall", (40, WALL_T, 6), (0, WALL_Y + WALL_T / 2, 3), "wall"), "wall")
cut_many(wall, [box(c, "door_cut", (DOOR_W, 2.0, DOOR_H), (DOOR_X, WALL_Y + WALL_T / 2, DOOR_H / 2), "cut")])
rail_parts = [box(c, "post%d" % i, (RAIL_T, RAIL_T, 1.0), (0.0 + i, RAIL_Y + RAIL_T / 2, 0.5), "wood") for i in range(7)]
rail_parts += [box(c, "bar_top", (6.1, RAIL_T, RAIL_T), (3.0, RAIL_Y + RAIL_T / 2, 1.0), "wood"),
               box(c, "bar_mid", (6.1, RAIL_T, RAIL_T), (3.0, RAIL_Y + RAIL_T / 2, 0.5), "wood")]
rail = tint(join(rail_parts, "rail"), "rail")

cam = camera(sc, "hp1", (0.0, 0.0, EYE))

# ── clay look ────────────────────────────────────────────────────────
sc.render.engine = "BLENDER_WORKBENCH"
sc.world.color = (1, 1, 1)
d = sc.display.shading
d.light = "STUDIO"; d.color_type = "OBJECT"
d.show_cavity = True; d.show_object_outline = True; d.object_outline_color = (0, 0, 0); d.show_shadows = False
sc.display.render_aa = "8"
fmt = sc.render.image_settings
fmt.file_format = "WEBP"; fmt.color_mode = "RGBA"; fmt.quality = 80


def all_objects():
    return [o for o in bpy.data.objects if o.type == "MESH"]


def render(name, show, transparent):
    for o in all_objects():
        o.hide_render = o not in show
    sc.render.film_transparent = transparent
    sc.render.filepath = os.path.join(OUT, name + ".webp")
    bpy.ops.render.render(write_still=True, scene=sc.name)


sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = RES_X, RES_Y
render("background", [quay, *room], transparent=False)
render("wall", [wall], transparent=True)
render("rail", [rail], transparent=True)

# ── cut-outs: orthographic, feet on the bottom row, centred ─────────
sailor = tint(mannequin(c, "sailor", (0, 0, 0), yaw_deg=180, height=1.70), "sailor")   # faces the camera
barrel = tint(cyl(c, "barrel", 0.30, 0.90, (0, 0, 0.45), "props", v=32), "barrel")
sailor.location.x = barrel.location.x = 100      # out of the plate views above; placed per render below


def top_of(o):
    return max((o.matrix_world @ v.co).z for v in o.data.vertices)


def cutout(name, o, width_m, height_m):
    o.location = (0, 0, o.location.z if name == "barrel" else 0)
    bpy.context.view_layer.update()
    cd = bpy.data.cameras.new(name + "_ortho")
    cd.type = "ORTHO"; cd.sensor_fit = "VERTICAL"; cd.ortho_scale = height_m
    oc = bpy.data.objects.new(name + "_ortho", cd)
    c.objects.link(oc)
    oc.location = (0, -10, height_m / 2)                  # frame spans z 0..height_m: feet on the bottom row
    oc.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = oc
    sc.render.resolution_x, sc.render.resolution_y = round(width_m * PX_PER_M), round(height_m * PX_PER_M)
    render(name, [o], transparent=True)
    return top_of(o)


sailor_top = cutout("sailor", sailor, 1.0, 2.0)
barrel_top = cutout("barrel", barrel, 1.0, 1.0)

# ── walker: side view, parts that swing, frames stitched into one sprite sheet ──
# Faces +x (right in the picture). A full cycle is two steps: 2 × (2 × leg × sin(swing)).
LEG_L, HIP_Z, SWING = 0.90, 0.90, 25.0
STRIDE_M = round(2 * (2 * LEG_L * math.sin(math.radians(SWING))), 3)
WALK_POSES = [0.0, SWING, 0.0, -SWING, 0.0]          # idle, then contact / pass / contact / pass


def limb(name, r, length, top):
    """A cylinder hanging from its top end, so rotating it swings it from the hip or shoulder."""
    o = cyl(c, name, r, length, (0, 0, 0), "figure", v=16)
    for v in o.data.vertices:
        v.co.z -= length / 2
    o.location = top
    return tint(o, "sailor")


walker_parts = [
    tint(box(c, "w_torso", (0.24, 0.40, 0.58), (0, 0, HIP_Z + 0.29), "figure"), "sailor"),
    tint(box(c, "w_nose", (0.06, 0.04, 0.04), (0.13, 0, HIP_Z + 0.76), "figure"), "sailor"),
]
bm_head = __import__("bmesh").new()
__import__("bmesh").ops.create_uvsphere(bm_head, u_segments=24, v_segments=12, radius=0.11)
from hp1lib import _mesh_obj  # noqa: E402
head = tint(_mesh_obj("w_head", bm_head, c, "figure"), "sailor"); head.location = (0, 0, HIP_Z + 0.74)
walker_parts.append(head)
legs = [limb("w_leg_l", 0.07, LEG_L, (0, -0.10, HIP_Z)), limb("w_leg_r", 0.07, LEG_L, (0, 0.10, HIP_Z))]
arms = [limb("w_arm_l", 0.05, 0.62, (0, -0.24, HIP_Z + 0.55)), limb("w_arm_r", 0.05, 0.62, (0, 0.24, HIP_Z + 0.55))]
walker = walker_parts + legs + arms
for o in walker:
    o.location.x += 200                                  # out of every other view until posed


def walk_sheet(name, width_m=1.0, height_m=2.0):
    """Render WALK_POSES side by side into <name>.webp: one shared crop, feet on the bottom row."""
    import numpy as np
    cd = bpy.data.cameras.new(name + "_ortho")
    cd.type = "ORTHO"; cd.sensor_fit = "VERTICAL"; cd.ortho_scale = height_m
    oc = bpy.data.objects.new(name + "_ortho", cd)
    c.objects.link(oc)
    oc.location = (0, -10, height_m / 2); oc.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = oc
    fw, fh = round(width_m * PX_PER_M), round(height_m * PX_PER_M)
    sc.render.resolution_x, sc.render.resolution_y = fw, fh
    for o in all_objects():
        o.hide_render = o not in walker
    sc.render.film_transparent = True
    for o in walker:
        o.location.x -= 200
        o["rest_z"] = o.location.z
    frames = []
    fmt.file_format = "PNG"
    for i, a in enumerate(WALK_POSES):
        for leg, sign in zip(legs, (1, -1)):
            leg.rotation_euler = (0, math.radians(sign * a), 0)
        for arm, sign in zip(arms, (-1, 1)):             # arms swing against the legs
            arm.rotation_euler = (0, math.radians(sign * a * 0.8), 0)
        # A swung leg reaches less far down: the hips drop so both feet stay on the ground.
        drop = LEG_L * (1 - math.cos(math.radians(a)))
        for o in walker:
            o.location.z = o["rest_z"] - drop
        path = os.path.join(OUT, "_frame%d.png" % i)
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True, scene=sc.name)
        img = bpy.data.images.load(path)
        frames.append(np.array(img.pixels[:], dtype=np.float32).reshape(fh, fw, 4))
        bpy.data.images.remove(img)
        os.remove(path)
    fmt.file_format = "WEBP"
    out = bpy.data.images.new(name, width=fw * len(frames), height=fh, alpha=True)
    out.pixels = np.concatenate(frames, axis=1).ravel()
    out.save_render(os.path.join(OUT, name + ".webp"), scene=sc)
    for o in walker:
        o.location.x += 200
        o.location.z = o["rest_z"]
    for leg in legs + arms:
        leg.rotation_euler = (0, 0, 0)
    return max(top_of(o) for o in walker_parts)


walker_top = walk_sheet("sailor_walk")

# Truth render: everything in 3D at the cells scene.json gives them.
SAILOR_AT, BARREL_AT = (2.5, RAIL_Y - 0.6), (-1.0, 9.0)   # both inside the frame
sailor.location = (*SAILOR_AT, 0)
barrel.location = (*BARREL_AT, 0.45)
sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = RES_X, RES_Y
render("reference", [quay, *room, wall, rail, sailor, barrel], transparent=False)

# Where Blender puts each item's bottom centre and top, in plate pixels (tests compare the JS to this).
def pixel(p):
    ndc = world_to_camera_view(sc, cam, Vector(p))
    return [round(ndc.x * RES_X, 3), round((1 - ndc.y) * RES_Y, 3)]


truth = {
    "sailor_1": {"feet_px": pixel((*SAILOR_AT, 0)), "top_px": pixel((*SAILOR_AT, top_of(sailor)))},
    "barrel_1": {"feet_px": pixel((*BARREL_AT, 0)), "top_px": pixel((*BARREL_AT, top_of(barrel)))},
}

# Balloon points as fractions of the picture (x right, y down), like sprite sheet.json points.
mouth_z = sailor["head_m"][2]
assets = {
    "test/sailor": {"image": "sailor.webp", "px_per_m": PX_PER_M, "frame_m": [1.0, 2.0], "height_m": round(sailor_top, 3),
                    "points": {"mouth": [0.5, round(1 - mouth_z / 2.0, 4)], "head_top": [0.5, round(1 - sailor_top / 2.0, 4)], "feet": [0.5, 1.0]}},
    "test/sailor_walk": {"image": "sailor_walk.webp", "px_per_m": PX_PER_M, "frame_m": [1.0, 2.0], "height_m": round(walker_top, 3),
                         "faces": "right",
                         "sheet": {"frames": len(WALK_POSES), "anims": {"idle": {"frames": [0]}, "walk": {"frames": [1, 2, 3, 4], "stride_m": STRIDE_M}}},
                         "points": {"feet": [0.5, 1.0], "head_top": [0.5, round(1 - walker_top / 2.0, 4)]}},
    "test/barrel": {"image": "barrel.webp", "px_per_m": PX_PER_M, "frame_m": [1.0, 1.0], "height_m": round(barrel_top, 3),
                    "points": {"feet": [0.5, 1.0]}},
}

# ── sidecars ─────────────────────────────────────────────────────────
cd = cam.data
focal_px = (RES_X / 2) / (cd.sensor_width / 2 / cd.lens)
horizon = RES_Y / 2 + cd.shift_y * RES_X
camera_json = {
    "shot": "test_quay", "family": "hp1", "resolution": [RES_X, RES_Y],
    "camera_location_m": list(cam.location), "camera_rotation_deg": [math.degrees(a) for a in cam.rotation_euler],
    "lens_mm": cd.lens, "sensor_width_mm": cd.sensor_width, "shift_y": cd.shift_y,
    "focal_px": focal_px, "horizon_y_px": horizon, "eye_height_m": EYE,
    "axes": "x right, y forward, z up, metres; camera yaw 0 looks +y",
}

CELL = 0.5
WALK_SPEED = 1.3        # m/s, an easy walking pace


def walk_keys():
    """Stand a second at the rail, walk left round its end, cross past the barrel to the doorway
    and go through it into the room: behind the wall, seen only through the door."""
    route = [SAILOR_AT, (-0.8, SAILOR_AT[1]), (DOOR_X, WALL_Y - 0.4), (DOOR_X, WALL_Y + 2.0)]
    keys, t = [{"t": 0, "cell": [SAILOR_AT[0] / CELL, SAILOR_AT[1] / CELL]}], 1.0
    keys.append({"t": t, "cell": keys[0]["cell"]})
    for (x0, y0), (x1, y1) in zip(route, route[1:]):
        t += math.hypot(x1 - x0, y1 - y0) / WALK_SPEED
        keys.append({"t": round(t, 2), "cell": [round(x1 / CELL, 3), round(y1 / CELL, 3)], "walk": "walk"})
    return keys


scene_json = {
    "diorama": 1,
    "camera": {"width": RES_X, "height": RES_Y, "focal_px": focal_px, "principal_px": [RES_X / 2, horizon],
               "position_m": list(cam.location), "yaw_deg": 0.0, "level": True, "source": "test_quay"},
    "plate": {
        "base": "/diorama/test-quay/",
        "image": "background.webp",
        "occluders": [
            {"id": "wall", "image": "wall.webp", "depth_m": [WALL_Y, WALL_Y + WALL_T]},
            {"id": "rail", "image": "rail.webp", "depth_m": [RAIL_Y, RAIL_Y + RAIL_T]},
        ],
    },
    # one floor for quay and room: the doorway is the way in
    "floors": [{"id": "quay", "height_m": 0.0, "cell_m": CELL, "origin_m": [0, 0], "cells": [[-20, 6], [20, 36]]}],
    "spots": [
        {"id": "doorway", "floor": "quay", "cell": [DOOR_X / CELL, (WALL_Y + WALL_T + 0.3) / CELL], "facing": "right"},
        {"id": "at_the_rail", "floor": "quay", "cell": [2.5 / CELL, (RAIL_Y - 0.6) / CELL], "facing": "left"},
    ],
    "items": [
        {"id": "sailor_1", "label": "Sailor", "asset": "test/sailor_walk", "asset_version": 1, "floor": "quay",
         "cell": [SAILOR_AT[0] / CELL, SAILOR_AT[1] / CELL], "facing": "left", "keys": walk_keys()},
        {"id": "barrel_1", "label": "Barrel", "asset": "test/barrel", "asset_version": 1, "floor": "quay",
         "cell": [BARREL_AT[0] / CELL, BARREL_AT[1] / CELL]},
    ],
}

for name, data in (("camera", camera_json), ("scene", scene_json), ("assets", assets), ("truth", truth)):
    with open(os.path.join(OUT, name + ".json"), "w") as fh:
        json.dump(data, fh, indent=1)
print("test_quay: wrote", sorted(os.listdir(OUT)))

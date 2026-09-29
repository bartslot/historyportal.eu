"""Golden projection cases for resources/js/scene/diorama/projection.js, straight from Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python tools/diorama/blender_golden.py -- resources/js/scene/diorama/__fixtures__/blender-golden.json

Builds hp1 cameras (28.254 mm on a 36 mm sensor, 2560x1440, level) and asks Blender's own
world_to_camera_view where feet and heads land: a 1.75 m sailor at 2, 4 and 8 m on a quay
(0 m), on a deck above eye height (2.5 m) and on the sea (-1.2 m), plus a yawed camera.
The JS test must match these pixels; nothing here uses our maths.
"""
import json
import math
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1]
W, H = 2560, 1440
LENS, SENSOR = 28.254, 36.0
FIGURE_M = 1.75

scene = bpy.context.scene
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1

cam_data = bpy.data.cameras.new("hp1")
cam_data.lens, cam_data.sensor_width, cam_data.sensor_fit = LENS, SENSOR, "HORIZONTAL"
cam = bpy.data.objects.new("hp1", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

CAMERAS = [
    # horizon on the upper third. Shift is in units of the larger dimension (width), and a
    # positive shift moves the frame UP, which puts the horizon LOWER in the picture.
    {"name": "level_upper_third", "loc": (0.0, -8.65, 1.6), "yaw": 0.0, "shift_y": -(H / 2 - H / 3) / W},
    {"name": "yawed_20", "loc": (1.5, -6.0, 1.6), "yaw": 20.0, "shift_y": 0.0},
]
FLOORS = {"quay": 0.0, "deck": 2.5, "sea": -1.2}

cases = []
for c in CAMERAS:
    cam.location = c["loc"]
    cam.rotation_euler = (math.radians(90), 0.0, math.radians(c["yaw"]))
    cam_data.shift_y = c["shift_y"]
    bpy.context.view_layer.update()

    focal_px = LENS / SENSOR * W
    camera = {
        "width": W, "height": H, "focal_px": focal_px,
        "principal_px": [W / 2, H / 2 + c["shift_y"] * W],
        "position_m": list(c["loc"]), "yaw_deg": c["yaw"], "level": True,
    }
    forward = cam.matrix_world.to_quaternion() @ Vector((0, 0, -1))
    right = cam.matrix_world.to_quaternion() @ Vector((1, 0, 0))
    points = []
    for floor, z in FLOORS.items():
        for dist in (2.0, 4.0, 8.0):
            for side in (-1.5, 0.0, 2.0):
                base = Vector(c["loc"]) + forward * dist + right * side
                for part, dz in (("feet", 0.0), ("head", FIGURE_M)):
                    world = Vector((base.x, base.y, z + dz))
                    ndc = world_to_camera_view(scene, cam, world)
                    points.append({
                        "floor": floor, "distance_m": dist, "side_m": side, "part": part,
                        "world": [round(world.x, 6), round(world.y, 6), round(world.z, 6)],
                        "u": ndc.x * W, "v": (1 - ndc.y) * H, "depth": ndc.z,
                    })
    cases.append({"name": c["name"], "camera": camera, "points": points})

with open(OUT, "w") as fh:
    json.dump({"source": "tools/diorama/blender_golden.py", "blender": bpy.app.version_string, "cases": cases}, fh, indent=1)
print(f"wrote {sum(len(c['points']) for c in cases)} points to {OUT}")

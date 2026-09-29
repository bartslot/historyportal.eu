"""Walk-cycle key poses as a line-drawing strip, rendered headless (own Blender process, not the shared MCP one).

    blender -b --factory-startup --python walk_poses.py -- <outdir> [front|side]

8 drawings per cycle = 4 per stride (contact, down, passing, up) and the same 4 mirrored. Played on threes at
24 fps (8 drawings/s) that is a ~1 s cycle, about a relaxed adult's two steps: Miyazaki's rule that the stride
timing must fit the character (Dante, 35, long gown: grounded, little bounce). Research note in the vault:
research_2026-09-27_1850_ghibli-walk-animation-techniques.

Output: walk_<view>_ids.png (part-ID colours; walk_lines.py turns it into lines) (2 rows x 4 cells, orthographic at eye height, white background) and
walk_<view>.json (cell grid, foot point per cell in px, height scale).
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

OUT = Path(sys.argv[sys.argv.index("--") + 1])
VIEW = sys.argv[sys.argv.index("--") + 2] if len(sys.argv) > sys.argv.index("--") + 2 else "front"

# Body (metres), a 1.72 m adult
HIP_H, THIGH, SHIN, FOOT = 0.92, 0.45, 0.43, 0.24
TORSO, NECK, HEAD_R = 0.52, 0.08, 0.11
SHOULDER_W, HIP_W = 0.40, 0.20
UPPER_ARM, FOREARM = 0.30, 0.27
GOWN = True
GOWN_HEM_R, GOWN_HEM_ABOVE_ANKLE, GOWN_LAG_M = 0.22, 0.05, 0.05

# Key poses for the LEFT leg leading; angles in degrees, + = forward swing. (thigh, knee bend) per leg,
# arm swing per arm (opposite to the legs), pelvis bob in m. Low bounce: a grown man in a long gown.
KEYS = [
    # name        L thigh, L knee, R thigh, R knee, L arm, R arm, bob
    ("contact",   24,  4,   -20, 10,   -18, 18,  0.000),
    ("down",      14, 20,   -24, 38,   -12, 12, -0.025),
    ("passing",    0,  6,    12, 55,     0,  0,  0.000),
    ("up",       -14,  2,    26, 22,    10, -10,  0.015),
]
CYCLE = KEYS + [(n + "_m", rt, rk, lt, lk, ra, la, b) for (n, lt, lk, rt, rk, la, ra, b) in KEYS]

COLS, ROWS = 4, 2
CELL_W, CELL_H = 1.1, 2.05          # metres per cell in the ortho frame
PX_PER_M = 640 / CELL_W             # 640 px wide cells -> 2560 x ~2385 image


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    return sc


def white_mat():
    m = bpy.data.materials.new("white")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (1, 1, 1, 1)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


_PART = [0]


def part_mat():
    """A distinct flat colour per body part, for the part-ID render (golden-angle hues never repeat nearby)."""
    import colorsys
    _PART[0] += 1
    r, g, b = colorsys.hsv_to_rgb((_PART[0] * 0.618034) % 1.0, 0.9, 0.9)
    m = bpy.data.materials.new(f"part{_PART[0]}"); m.diffuse_color = (r, g, b, 1)
    return m


def capsule(p0: Vector, p1: Vector, r: float, mat, name: str):
    mat = part_mat()
    d = p1 - p0
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=r, depth=d.length, location=(p0 + p1) / 2)
    o = bpy.context.object; o.name = name
    o.rotation_mode = "QUATERNION"; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.data.materials.append(mat)
    parts = [o]
    for p in (p0, p1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=r, location=p)
        parts.append(bpy.context.object)
    # one object per segment, so the part-ID render has no seam at the rounded ends
    bpy.ops.object.select_all(action="DESELECT")
    for q in parts:
        q.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.join()


def box(center: Vector, size, mat):
    mat = part_mat()
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.object; o.scale = size; o.data.materials.append(mat)


def leg_points(hip: Vector, thigh_deg: float, knee_deg: float, fwd: Vector):
    """Planar FK in the walking plane: fwd is the walking direction, z up."""
    a = math.radians(thigh_deg)
    knee = hip + (fwd * math.sin(a) - Vector((0, 0, 1)) * math.cos(a)) * THIGH
    b = a - math.radians(knee_deg)
    ankle = knee + (fwd * math.sin(b) - Vector((0, 0, 1)) * math.cos(b)) * SHIN
    return knee, ankle


def figure(origin: Vector, pose, fwd: Vector, side: Vector, mat):
    _, lt, lk, rt, rk, la, ra, bob = pose
    pelvis = origin + Vector((0, 0, HIP_H + bob))
    ankles = {}
    for sgn, (t, k) in ((1, (lt, lk)), (-1, (rt, rk))):
        hip = pelvis + side * (sgn * HIP_W / 2)
        knee, ankle = leg_points(hip, t, k, fwd)
        capsule(hip, knee, 0.075, mat, "thigh"); capsule(knee, ankle, 0.06, mat, "shin")
        box(ankle + fwd * (FOOT * 0.3) - Vector((0, 0, 0.03)), (0.10 if side.x else FOOT, FOOT if side.x else 0.10, 0.06), mat)
        ankles[sgn] = ankle
    chest = pelvis + Vector((0, 0, TORSO))
    capsule(pelvis, chest, 0.16, mat, "torso")
    head = chest + Vector((0, 0, NECK + HEAD_R))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=HEAD_R, location=head)
    bpy.context.object.data.materials.append(part_mat())
    for sgn, a in ((1, la), (-1, ra)):
        sh = chest + side * (sgn * SHOULDER_W / 2) - Vector((0, 0, 0.04))
        ang = math.radians(a)
        elbow = sh + (fwd * math.sin(ang) - Vector((0, 0, 1)) * math.cos(ang)) * UPPER_ARM
        ang2 = ang + math.radians(15 + max(0, a) * 0.6)          # elbows bend more on the forward swing
        wrist = elbow + (fwd * math.sin(ang2) - Vector((0, 0, 1)) * math.cos(ang2)) * FOREARM
        capsule(sh, elbow, 0.05, mat, "uparm"); capsule(elbow, wrist, 0.045, mat, "forearm")
    face(head, fwd, side)
    if GOWN:
        gown(pelvis, ankles, fwd)
    lowest = min(a.z for a in ankles.values()) - 0.06
    return lowest


def face(head: Vector, fwd: Vector, side: Vector):
    """Nose and eyes: without them a mannequin reads as front OR back and the model guesses (it drew back views)."""
    box(head + fwd * (HEAD_R * 0.95) - Vector((0, 0, 0.015)), tuple(abs(v) for v in (fwd * 0.05 + side * 0.03 + Vector((0, 0, 0.05)))), None)
    for sgn in (1, -1):
        p = head + fwd * (HEAD_R * 0.85) + side * (sgn * 0.04) + Vector((0, 0, 0.025))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.016, location=p)
        bpy.context.object.data.materials.append(part_mat())


def gown(pelvis: Vector, ankles: dict, fwd: Vector):
    """Ankle-length gown as a flared cone. Its hem centre trails the feet a little (overlapping action: the
    cloth follows the body with a delay), so each drawing already carries the swing; the model only dresses it."""
    waist = pelvis + Vector((0, 0, 0.08))
    hem_z = min(a.z for a in ankles.values()) + GOWN_HEM_ABOVE_ANKLE
    feet_mid = sum((a for a in ankles.values()), Vector()) / 2
    lag = -fwd * GOWN_LAG_M
    hem_c = Vector((feet_mid.x, feet_mid.y, hem_z)) + lag
    spread = max(abs((ankles[1] - ankles[-1]).dot(fwd)), 0.0)
    depth = waist.z - hem_z
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=max(GOWN_HEM_R, spread / 2 + 0.08), radius2=0.19, depth=depth,
                                    location=(waist.x, waist.y, hem_z + depth / 2))
    o = bpy.context.object
    o.data.materials.append(part_mat())
    shift = hem_c - Vector((waist.x, waist.y, hem_z))
    for v in o.data.vertices:          # shear: bottom ring moves to the trailing hem centre, top ring stays at the waist
        w = 1.0 - (v.co.z + depth / 2) / depth
        v.co.x += shift.x * w; v.co.y += shift.y * w


def main():
    sc = clear()
    mat = white_mat()
    if VIEW == "front":      # walking toward the camera (camera looks +y, figure walks -y)
        fwd, side = Vector((0, -1, 0)), Vector((1, 0, 0))
    else:                    # walking to the right, seen from the side
        fwd, side = Vector((1, 0, 0)), Vector((0, 1, 0))
    cells = []
    for i, pose in enumerate(CYCLE):
        c, r = i % COLS, i // COLS
        x = (c - (COLS - 1) / 2) * CELL_W
        zbase = (ROWS - 1 - r) * CELL_H
        origin = Vector((x, 0, zbase))
        figure(origin, pose, fwd, side, mat)
        cells.append({"index": i, "pose": pose[0], "col": c, "row": r, "foot_m": [x, zbase]})
    # ground each figure: lift so the lowest foot sits on its cell floor
    cam_z = ROWS * CELL_H / 2
    bpy.ops.object.camera_add(location=(0, -30, cam_z), rotation=(math.radians(90), 0, 0))
    cam = bpy.context.object; sc.camera = cam
    cam.data.type = "ORTHO"; cam.data.ortho_scale = COLS * CELL_W
    W = int(COLS * CELL_W * PX_PER_M); H = int(ROWS * CELL_H * PX_PER_M)
    sc.render.resolution_x, sc.render.resolution_y = W, H
    # Part-ID render: every body segment a flat random colour, no anti-aliasing, black background. Lines are drawn
    # on the colour boundaries afterwards (walk_lines.py); headless Freestyle drew nothing in Blender 5.1.
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "FLAT"; sc.display.shading.color_type = "MATERIAL"
    sc.display.shading.background_type = "VIEWPORT"; sc.display.shading.background_color = (0, 0, 0)
    sc.display.render_aa = "OFF"
    sc.render.dither_intensity = 0.0
    sc.view_settings.view_transform = "Standard"
    OUT.mkdir(parents=True, exist_ok=True)
    sc.render.filepath = str(OUT / f"walk_{VIEW}_ids.png")
    bpy.ops.render.render(write_still=True)
    # foot point per cell in pixels (ortho: 1 m = PX_PER_M px; image centre = (0, cam_z))
    for cell in cells:
        x, z = cell["foot_m"]
        cell["foot_px"] = [round(W / 2 + x * PX_PER_M), round(H / 2 - (z - cam_z) * PX_PER_M)]
        cell["box_px"] = [round(cell["foot_px"][0] - CELL_W / 2 * PX_PER_M), round(cell["foot_px"][1] - CELL_H * PX_PER_M),
                          round(cell["foot_px"][0] + CELL_W / 2 * PX_PER_M), cell["foot_px"][1]]
    meta = {"view": VIEW, "size_px": [W, H], "px_per_m": PX_PER_M, "height_m": 1.72, "cells": cells,
            "timing": "8 drawings/cycle, on threes at 24 fps", "cycle_m": 1.4}
    (OUT / f"walk_{VIEW}.json").write_text(json.dumps(meta, indent=1))


main()

"""The mannequin (Mixamo Y Bot) with drawn lines, the way anime 3D does it (2026-10-13, Bart's question).

  Blender -b --factory-startup --python lineart_mannequin.py -- "Y Bot.fbx" OUT_DIR

Three variants, three-quarter view, 1920x1080, saved as OUT_DIR/{a_lineart,b_hull,c_both}.png + mannequin_lines.blend:
  a  Line Art (Grease Pencil): contour, crease, material borders and intersections as real pencil strokes
  b  inverted hull: a slightly larger copy with flipped normals in line colour, the outline only
  c  both, plus ONE hard shadow band (anime cel), like professional 3D anime
Lines in the History Lines pencil brown (STYLE.md: thin brown-grey pencil, never black). Paper-white body.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

PENCIL = (0.42, 0.35, 0.29, 1.0)
PAPER = (0.96, 0.94, 0.89, 1.0)
SHADOW = (0.80, 0.76, 0.70, 1.0)
HULL_M = 0.006           # outline thickness of the inverted hull, metres (a 1.8 m figure)
LINE_RADIUS = 0.0018     # Line Art stroke radius (Grease Pencil v3, scene units): a thin pencil line on a 1.8 m figure
ARMS_DOWN_DEG = 55       # out of the T-pose into a relaxed A-pose


def args():
    a = sys.argv[sys.argv.index("--") + 1:]
    return Path(a[0]), Path(a[1])


def unlit(name, rgba):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = rgba
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def cel(name):
    """Paper white with one hard shadow band from the sun: diffuse -> shader-to-RGB -> constant ramp."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse")
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].color = SHADOW
    ramp.color_ramp.elements[1].position = 0.35
    ramp.color_ramp.elements[1].color = PAPER
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(dif.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def hull_material():
    """Line colour, back faces only: the enlarged copy shows only where it sticks out behind the body."""
    m = unlit("hull", PENCIL)
    m.use_backface_culling = True
    return m


def scene_setup(fig):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.view_settings.view_transform = "Standard"
    sc.world = bpy.data.worlds.new("paper")
    sc.world.use_nodes = True
    sc.world.node_tree.nodes["Background"].inputs["Color"].default_value = PAPER
    lo, hi = bbox(fig)
    centre = (lo + hi) / 2
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    cam.data.lens = 50
    # three-quarter view from the figure's front left, a little above the waist
    d = 4.6
    cam.location = centre + Vector((d * math.sin(math.radians(35)), -d * math.cos(math.radians(35)), 0.15))
    look = centre - cam.location
    cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-40))   # key light high and to the side of the camera
    return sc


def bbox(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return (Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)]))


def a_pose(arm):
    for side, sign in (("Left", 1), ("Right", -1)):
        pb = next((b for b in arm.pose.bones if b.name.endswith(f"{side}Arm")), None)
        if pb:
            pb.rotation_mode = "XYZ"
            pb.rotation_euler = (0, 0, math.radians(ARMS_DOWN_DEG) * sign)   # down at the shoulder
    bpy.context.view_layer.update()


def add_lineart(fig_collection):
    bpy.ops.object.grease_pencil_add(type="LINEART_SCENE")
    gp = bpy.context.active_object
    gp.name = "lineart"
    mod = next(m for m in gp.modifiers if m.type == "LINEART")
    mod.source_type = "COLLECTION"
    mod.source_collection = fig_collection
    mod.radius = LINE_RADIUS
    mod.use_contour = mod.use_crease = mod.use_material = mod.use_intersection = True
    mod.crease_threshold = math.radians(140)   # only real folds, not every polygon edge
    mat = gp.data.materials[0] if gp.data.materials else None
    if mat is not None and mat.grease_pencil:
        mat.grease_pencil.color = PENCIL
    return gp


def add_hull(figs):
    hull_mat = hull_material()
    hulls = []
    for o in figs:
        o.data.materials.append(hull_mat)
        sol = o.modifiers.new("hull", "SOLIDIFY")
        sol.thickness = -HULL_M            # outward
        sol.use_flip_normals = True
        sol.use_rim = False
        sol.material_offset = len(o.data.materials) - 1
        hulls.append(sol)
    return hulls


def main():
    fbx, out = args()
    out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(fbx))
    figs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    arm = next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)
    if arm:
        a_pose(arm)
    fig_col = bpy.data.collections.new("figure")
    bpy.context.scene.collection.children.link(fig_col)
    for o in figs:
        for c in o.users_collection:
            c.objects.unlink(o)
        fig_col.objects.link(o)
    paper, celm = unlit("paper", PAPER), cel("cel")
    sc = scene_setup(figs)
    gp = add_lineart(fig_col)
    hulls = add_hull(figs)

    def variant(name, lines, hull, shade):
        gp.hide_render = not lines
        for h in hulls:
            h.show_render = hull
        for o in figs:
            o.data.materials[0] = celm if shade else paper
            for i in range(1, len(o.data.materials) - 1):
                o.data.materials[i] = celm if shade else paper
        sc.render.filepath = str(out / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"LINES ok {sc.render.filepath}")

    variant("a_lineart", True, False, False)
    variant("b_hull", False, True, False)
    variant("c_both", True, True, True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out / "mannequin_lines.blend"))
    print(f"LINES ok {out / 'mannequin_lines.blend'}")


main()

"""Procedural tree asset packs with friggog/tree-gen (GPL-3 addon; the trees it makes are ours).

Runs headless on the render PC, one .blend per species with every seed as a marked asset
collection (bark + leaves meshes, real metres, origin at the root), plus a clay contact render.

    blender --background --python trees.py -- OUT_DIR [species ...] [--seeds 1,2,3]

Addon lives at ~/.config/blender/5.1/scripts/addons/tree_gen (symlink to ~/tree-gen).
"""
import importlib
import math
import os
import sys

import addon_utils
import bmesh
import bpy

addon_utils.enable("tree_gen", default_set=True)
from tree_gen.parametric import gen  # noqa: E402

gen.update_log = lambda msg: None  # the addon logs every 500 leaves

SPECIES = [
    "acer", "apple", "balsam_fir", "bamboo", "black_oak", "black_tupelo", "cambridge_oak",
    "douglas_fir", "european_larch", "fan_palm", "hill_cherry", "lombardy_poplar", "palm",
    "quaking_aspen", "sassafras", "silver_birch", "small_pine", "weeping_willow",
]
CLAY_BARK = (0.55, 0.52, 0.48, 1)
CLAY_LEAF = (0.72, 0.74, 0.66, 1)
GAP_M = 4.0  # spacing between trees in the contact render


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    seeds = [1, 2, 3]
    if "--seeds" in argv:
        i = argv.index("--seeds")
        seeds = [int(s) for s in argv[i + 1].split(",")]
        argv = argv[:i] + argv[i + 2:]
    if not argv:
        sys.exit("usage: trees.py -- OUT_DIR [species ...] [--seeds 1,2,3]")
    out, species = argv[0], argv[1:] or SPECIES
    unknown = set(species) - set(SPECIES)
    if unknown:
        sys.exit(f"unknown species: {sorted(unknown)}")
    return out, species, seeds


def clay(name, rgba):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    return mat


def bake_mesh(objs, name, mat, coll):
    """Evaluated copies of curves/meshes merged into one plain mesh object in coll, world space.

    bmesh, not bpy.ops.object.join: the operator misses objects in a collection the view
    layer has not synced yet, which left the first tree's trunk as a separate object.
    """
    dg = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new()
    for obj in objs:
        tmp = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
        tmp.transform(obj.matrix_world)
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    out = bpy.data.objects.new(name, mesh)
    coll.objects.link(out)
    return out


def make_tree(species, seed, bark, leaf):
    params = importlib.import_module(f"tree_gen.parametric.tree_params.{species}").params
    raw = gen.construct(params, seed=seed)
    coll = bpy.data.collections.new(f"{species}_{seed:02d}")
    bpy.context.scene.collection.children.link(coll)
    wood = [c for c in raw.children if c.type == "CURVE"]
    parts = [bake_mesh(wood, f"{coll.name}_bark", bark, coll)]
    leaves = [c for c in raw.children if c.type == "MESH" and c.data.polygons]
    if leaves:
        parts.append(bake_mesh(leaves, f"{coll.name}_leaves", leaf, coll))
    for o in [raw, *raw.children]:
        bpy.data.objects.remove(o, do_unlink=True)
    height = max(max((o.matrix_world @ v.co).z for v in o.data.vertices) for o in parts)
    coll["species"], coll["seed"], coll["height_m"] = species, seed, round(height, 2)
    coll.asset_mark()
    coll.asset_data.tags.new(species)
    coll.asset_data.tags.new("tree")
    return coll, parts, height


def contact_render(path, rows):
    """rows: [(parts, height)] laid out left to right, Workbench clay with outlines."""
    x, top = 0.0, 1.0
    for parts, height in rows:
        width = max(max(abs((o.matrix_world @ v.co).x) for v in o.data.vertices) for o in parts)
        x += width
        for o in parts:
            o.location.x += x
        x += width + GAP_M
        top = max(top, height)
    sc = bpy.context.scene
    cam = bpy.data.objects.new("contact_cam", bpy.data.cameras.new("contact_cam"))
    sc.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = max(x, top * 16 / 9) * 1.05
    cam.location = (x / 2 - GAP_M / 2, -200, top / 2)
    cam.rotation_euler = (math.pi / 2, 0, 0)
    sc.camera = cam
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.display.shading.show_object_outline = True
    sc.display.shading.show_shadows = False
    sc.world = sc.world or bpy.data.worlds.new("paper")
    sc.world.color = (1, 1, 1)
    sc.view_settings.view_transform = "Standard"
    sc.render.resolution_x, sc.render.resolution_y = 2560, 1440
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)
    for parts, _ in rows:  # back to the origin so the saved assets sit at 0,0,0
        for o in parts:
            o.location.x = 0


def build_species(out, species, seeds):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bark, leaf = clay("tree_bark_clay", CLAY_BARK), clay("tree_leaf_clay", CLAY_LEAF)
    rows = []
    for seed in seeds:
        coll, parts, height = make_tree(species, seed, bark, leaf)
        rows.append((parts, height))
        print(f"TREE {coll.name} {height:.1f} m {sum(len(o.data.polygons) for o in parts)} faces", flush=True)
    contact_render(os.path.join(out, f"{species}_clay.png"), rows)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, f"{species}.blend"), compress=True)


def main():
    out, species, seeds = parse_args()
    os.makedirs(out, exist_ok=True)
    for sp in species:
        build_species(out, sp, seeds)


main()

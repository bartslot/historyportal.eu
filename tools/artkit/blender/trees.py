"""Procedural tree asset packs with friggog/tree-gen (GPL-3 addon; the trees it makes are ours).

Runs headless on the render PC, one .blend per species with every seed as a marked asset
collection (bark + leaves meshes, real metres, origin at the root), plus a clay contact render.

    blender --background --python trees.py -- OUT_DIR [species ...] [--seeds 1,2,3]
        [--lod hero|forest] [--set '{"curve": [0, 60, 0, 0]}']

--lod      vertex budget per tree (tree_budget.LODS): hero 250k (close shots), forest 50k (default hero).
--set JSON overrides tree-gen parameters for every species in the run (tuning knob).

Addon lives at ~/.config/blender/5.1/scripts/addons/tree_gen (symlink to ~/tree-gen).
"""
import importlib
import json
import math
import os
import random
import sys

import addon_utils
import bmesh
import bpy
from mathutils import Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
addon_utils.enable("tree_gen", default_set=True)
from tree_gen.leaf import Leaf  # noqa: E402
from tree_gen.parametric import gen  # noqa: E402

import tree_budget  # noqa: E402
import tree_roots  # noqa: E402

gen.update_log = lambda msg: None  # the addon logs every 500 leaves

# No leaf UVs: tree-gen writes them one loop at a time from Python, which in Blender 5.1 crawls; with the
# forest LOD's rectangle leaves (the only UV'd shapes with triangle) a balsam fir hung for hours. Clay needs none.
_leaf_shape = Leaf.get_shape.__func__
Leaf.get_shape = classmethod(lambda cls, *args: (*_leaf_shape(cls, *args)[:2], []))

SPECIES = [
    "acer", "apple", "balsam_fir", "bamboo", "black_oak", "black_tupelo", "cambridge_oak",
    "douglas_fir", "european_larch", "fan_palm", "hill_cherry", "lombardy_poplar", "palm",
    "quaking_aspen", "sassafras", "silver_birch", "small_pine", "weeping_willow",
]
# Buttress strength per species; palms and bamboo have no buttresses, conifers small ones.
ROOTS = {"bamboo": 0, "fan_palm": 0, "palm": 0, "balsam_fir": 0.6, "douglas_fir": 0.7,
         "european_larch": 0.6, "small_pine": 0.5, "lombardy_poplar": 0.8}

# Our own corrections to tree-gen's presets.
OVERRIDES = {
    # Stock preset: bare limbs spike upward and the whips hang off stiff side branches in a box.
    # A willow is a dome of arching limbs whose long whips fall from along the arches, pulled
    # down by their leaves, with a ragged hem near the ground.
    "weeping_willow": {
        # three levels: the leaves sit straight on the whips, as on a real willow (and a finer twig level
        # was most of the vertex budget)
        "levels": 3, "shape": 3, "g_scale": 12, "g_scale_v": 2, "base_splits": 0, "prune_ratio": 0,
        "base_size": [0.25, 0.1, 0.02, 0.05],
        "down_angle": [0, 35, 65, 30], "down_angle_v": [0, 12, 15, 10],
        "rotate": [0, 140, 140, 140], "rotate_v": [0, 30, 30, 0],
        "branches": [1, 16, 90, 22],
        "length": [1, 0.6, 1.1, 0.07], "length_v": [0, 0.1, 0.4, 0.02],
        "seg_splits": [0.6, 0.2, 0, 0], "split_angle": [30, 20, 0, 0], "split_angle_v": [8, 8, 0, 0],
        "curve_res": [6, 14, 14, 2], "curve": [0, 110, 0, 0], "curve_back": [0, 0, 0, 0],
        "curve_v": [25, 40, 15, 0], "bend_v": [0, 20, 0, 0],
        "radius_mod": [1, 1, 0.3, 1], "tropism": [0, 0, -5],
        "leaf_blos_num": 70, "leaf_scale": 0.13, "leaf_scale_x": 0.22,
    },
}
LEAF_BOOST = 3.0  # most extra leaves per twig when the budget removes twigs
GROUND_CLEAR = 0.25  # branch and leaf faces below this height (m) are cut: nothing hangs through the floor
CLAY_BARK = (0.55, 0.52, 0.48, 1)
CLAY_LEAF = (0.72, 0.74, 0.66, 1)
GAP_M = 4.0  # spacing between trees in the contact render


def take(argv, flag, cast):
    if flag not in argv:
        return argv, None
    i = argv.index(flag)
    return argv[:i] + argv[i + 2:], cast(argv[i + 1])


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    argv, seeds = take(argv, "--seeds", lambda s: [int(x) for x in s.split(",")])
    argv, lod = take(argv, "--lod", str)
    argv, extra = take(argv, "--set", json.loads)
    if not argv:
        sys.exit(__doc__)
    out, species = argv[0], argv[1:] or SPECIES
    unknown = set(species) - set(SPECIES)
    if unknown:
        sys.exit(f"unknown species: {sorted(unknown)}")
    lod = lod or "hero"
    if lod not in tree_budget.LODS:
        sys.exit(f"--lod is one of {sorted(tree_budget.LODS)}")
    return out, species, seeds or [1, 2, 3], lod, extra or {}


def params_for(species, lod, extra, twig_keep=1.0):
    base = importlib.import_module(f"tree_gen.parametric.tree_params.{species}").params
    p = {**base, **OVERRIDES.get(species, {}), **extra}
    spec = tree_budget.LODS[lod]
    levels = p.get("levels", 4)
    branches = list(p.get("branches", [1, 50, 30, 10]))
    branches[levels - 1] = max(1, round(branches[levels - 1] * twig_keep))
    p["branches"] = branches
    # leaves sit on the finest twigs: fewer twigs carry more leaves each, but at most LEAF_BOOST times
    # (an uncapped 1/twig_keep made a balsam fir grow 50x its needles and hang for 7 hours)
    p["leaf_blos_num"] = max(1, round(p.get("leaf_blos_num", 40) * spec["leaf_pre"] * min(1 / twig_keep, LEAF_BOOST)))
    p["leaf_scale"] = p.get("leaf_scale", 0.17) / math.sqrt(spec["leaf_pre"])
    p["leaf_shape"] = tree_budget.leaf_shape(p.get("leaf_shape", 8), spec)
    p["bevel_res"] = spec["bevel"][:levels] + [0] * max(0, levels - 4)
    if levels == 4:   # 3-level trees end in whips or hanging twigs whose curve is the look
        p["curve_res"] = [*p["curve_res"][: levels - 1], spec["twig_segs"], *p["curve_res"][levels:]]
    return p


def clay(name, rgba):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    return mat


def to_mesh(obj):
    """Evaluated world-space copy of a curve/mesh object as mesh data."""
    tmp = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    tmp.transform(obj.matrix_world)
    return tmp


def merge(meshes, name, mat, coll):
    """Mesh datablocks merged into one object in coll (they are consumed).

    bmesh, not bpy.ops.object.join: the operator misses objects in a collection the view
    layer has not synced yet, which left the first tree's trunk as a separate object.
    """
    bm = bmesh.new()
    for m in meshes:
        bm.from_mesh(m)
        bpy.data.meshes.remove(m)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    out = bpy.data.objects.new(name, mesh)
    coll.objects.link(out)
    return out


def clip_ground(mesh):
    """Drop faces lying under GROUND_CLEAR (whips and low boughs that droop into the floor)."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    low = [f for f in bm.faces if f.calc_center_median().z < GROUND_CLEAR]
    bmesh.ops.delete(bm, geom=low, context="FACES")
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def bark_meshes(raw, species, seed):
    """(branch meshes with the trunk flared into buttresses and surface roots added, base radius)."""
    meshes, trunk = [], None
    for c in raw.children:
        if c.type != "CURVE":
            continue
        if c.name.startswith("Trunk"):
            trunk = to_mesh(c)
        else:
            meshes.append(clip_ground(to_mesh(c)))
    if trunk is None:
        return meshes, 0.0
    meshes.append(trunk)
    strength = ROOTS.get(species, 1.0)
    if strength <= 0:
        return meshes, tree_roots.base_of(trunk)[2]
    roots, r0 = tree_roots.add_roots(trunk, random.Random(seed), strength, f"{species}_{seed}_roots")
    root_mesh = to_mesh(roots)
    root_mesh.transform(Matrix.Diagonal((1, 1, tree_roots.ROOT_FLAT, 1)))
    meshes.append(root_mesh)
    bpy.data.curves.remove(roots.data)
    return meshes, r0


def leaf_meshes(raw, budget, rng):
    """Leaves thinned to budget (before the ground clip: thinning needs tree-gen's leaf order)."""
    foliage = [c for c in raw.children if c.type == "MESH" and c.data.polygons]   # leaves and blossoms
    total = sum(len(c.data.vertices) for c in foliage) or 1
    out = []
    for c in foliage:
        m = tree_budget.thin_leaves(to_mesh(c), budget * len(c.data.vertices) // total, rng)
        out.append(clip_ground(m))
    return out


def curve_verts(raw):
    total = 0
    for c in raw.children:
        if c.type == "CURVE":
            m = to_mesh(c)
            total += len(m.vertices)
            bpy.data.meshes.remove(m)
    return total


def build_raw(species, seed, lod, extra):
    """tree-gen output whose branches fit the LOD's bark budget: fewer finest twigs until they do."""
    spec = tree_budget.LODS[lod]
    budget, keep = spec["verts"] * spec["bark_share"], spec["twig_keep"]
    for attempt in range(4):
        raw = gen.construct(params_for(species, lod, extra, keep), seed=seed)
        tree_budget.coarsen_curves(raw, spec)
        n = curve_verts(raw)
        if n <= budget * 1.05 or keep <= 0.02 or attempt == 3:
            print(f"BUDGET {species}_{seed} {lod}: branches {n} verts, twig_keep {keep:.3f}", flush=True)
            return raw
        keep = max(0.02, keep * budget / n * 0.9)   # the twigs are most of it: shrink them by the overshoot
        for o in [*raw.children, raw]:
            bpy.data.objects.remove(o, do_unlink=True)


def make_tree(species, seed, lod, extra, bark, leaf):
    spec = tree_budget.LODS[lod]
    raw = build_raw(species, seed, lod, extra)
    coll = bpy.data.collections.new(f"{species}_{seed:02d}")
    bpy.context.scene.collection.children.link(coll)
    wood, base_r = bark_meshes(raw, species, seed)
    parts = [merge(wood, f"{coll.name}_bark", bark, coll)]
    leaf_budget = max(0, spec["verts"] - len(parts[0].data.vertices))   # leaves get what the bark leaves over
    leaves = leaf_meshes(raw, leaf_budget, random.Random(seed))
    if leaves:
        parts.append(merge(leaves, f"{coll.name}_leaves", leaf, coll))
    coll["base_r"] = round(base_r, 3)
    for o in [raw, *raw.children]:
        bpy.data.objects.remove(o, do_unlink=True)
    height = max(max(v.co.z for v in o.data.vertices) for o in parts)
    coll["species"], coll["seed"], coll["height_m"], coll["lod"] = species, seed, round(height, 2), lod
    coll.asset_mark()
    coll.asset_data.tags.new(species)
    coll.asset_data.tags.new("tree")
    return coll, parts, height


def contact_render(path, rows):
    """rows: [(parts, height)] laid out left to right, Workbench clay with outlines."""
    x, top = 0.0, 1.0
    for parts, height in rows:
        width = max(max(abs(v.co.x) for v in o.data.vertices) for o in parts)
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


def build_species(out, species, seeds, lod, extra):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bark, leaf = clay("tree_bark_clay", CLAY_BARK), clay("tree_leaf_clay", CLAY_LEAF)
    rows = []
    for seed in seeds:
        coll, parts, height = make_tree(species, seed, lod, extra, bark, leaf)
        rows.append((parts, height))
        counts = " ".join(f"{o.name.rsplit('_', 1)[1]}={len(o.data.vertices)}" for o in parts)
        print(f"TREE {coll.name} {height:.1f} m verts {counts}", flush=True)
    contact_render(os.path.join(out, f"{species}_clay.png"), rows)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, f"{species}.blend"), compress=True)


def main():
    out, species, seeds, lod, extra = parse_args()
    os.makedirs(out, exist_ok=True)
    for sp in species:
        build_species(out, sp, seeds, lod, extra)


if __name__ == "__main__":
    main()

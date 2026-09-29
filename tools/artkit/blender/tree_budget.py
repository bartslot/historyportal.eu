"""Vertex budgets for tree-gen trees. Stock tree-gen makes every twig a 24-sided tube sampled 16 times a
segment and hundreds of thousands of leaves: 7.6M verts for one oak. A LOD sets the curve detail, the
number of finest twigs is lowered until the bark fits its share, and leaves are thinned to the rest.
(Decimate does not help: twig tubes are open, every vertex is a boundary and collapse keeps them.)"""
import math

import bpy
import numpy as np

# verts: cap per tree (bark first, leaves get the rest); bark_share: bark's target part of it;
# bevel: ring resolution per level (0 = 4-sided tube); res_u / trunk_res_u: curve samples per segment;
# twig_segs: segments of the finest level (too small for a curve to show); twig_keep: first guess at the
# fraction of finest-level twigs to keep (lowered until the bark fits); leaf_pre: leaves asked of tree-gen;
# leaf_shapes: tree-gen leaf shape swaps (6/7 spiky/round oak are ~45 verts a leaf, 1 ovate 11, 9 rectangle 4):
# a budget buys 4x-10x more leaves, and a lobe is invisible at forest distance anyway.
MAX_LEAF_GROWTH = 1.8   # thinned leaves grow at most this much; beyond it they read as cards, not leaves
LODS = {
    "hero": {"verts": 300_000, "bark_share": 0.6, "bevel": [16, 4, 1, 0], "res_u": 2, "trunk_res_u": 3,
             "twig_segs": 2, "twig_keep": 0.6, "leaf_pre": 1.0, "leaf_shapes": {6: 1, 7: 1}},
    "forest": {"verts": 80_000, "bark_share": 0.55, "bevel": [8, 0, 0, 0], "res_u": 1, "trunk_res_u": 1,
               "twig_segs": 1, "twig_keep": 0.3, "leaf_pre": 1.0, "leaf_shapes": "all:9"},
}


def leaf_shape(shape, spec):
    """The LOD's replacement for a tree-gen leaf shape (blossoms, negative, stay)."""
    swap = spec["leaf_shapes"]
    if shape < 0:
        return shape
    if isinstance(swap, str):
        return int(swap.split(":")[1])
    return swap.get(shape, shape)


def coarsen_curves(raw, spec):
    """Fewer samples along every branch curve, and along the trunk."""
    for c in raw.children:
        if c.type == "CURVE":
            res = spec["trunk_res_u"] if c.name.startswith("Trunk") else spec["res_u"]
            c.data.resolution_u = res
            for s in c.data.splines:
                s.resolution_u = res


def first_leaf(mesh):
    """(verts, faces) of one leaf: tree-gen writes leaves one after another, each the same shape."""
    top = -1
    for i, p in enumerate(mesh.polygons):
        if top >= 0 and min(p.vertices) > top:
            return top + 1, i
        top = max(top, max(p.vertices))
    return top + 1, len(mesh.polygons)


def thin_leaves(mesh, max_verts, rng):
    """Keep a random subset of leaves and scale each survivor up about its centre, so the crown keeps
    its coverage with fewer, larger leaves. Returns a new mesh (the old one is removed) or mesh as is."""
    per_leaf, per_faces = first_leaf(mesh)
    n_leaves = len(mesh.vertices) // per_leaf
    keep = max_verts // per_leaf
    if keep >= n_leaves or len(mesh.vertices) != n_leaves * per_leaf:
        return mesh
    co = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get("co", co)
    co = co.reshape(n_leaves, per_leaf, 3)[np.sort(np.array(rng.sample(range(n_leaves), keep), dtype=np.int64))]
    centre = co.mean(axis=1, keepdims=True)
    co = centre + (co - centre) * min(MAX_LEAF_GROWTH, math.sqrt(n_leaves / keep))
    shape = [list(p.vertices) for p in mesh.polygons[:per_faces]]
    faces = [[v + i * per_leaf for v in f] for i in range(keep) for f in shape]
    out = bpy.data.meshes.new(mesh.name)
    out.from_pydata(co.reshape(-1, 3).tolist(), [], faces)
    bpy.data.meshes.remove(mesh)
    return out

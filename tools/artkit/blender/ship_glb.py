"""A Sketchfab ship (glTF) -> one browser GLB for the Studio, with its deck height measured.

Scales the ship to LENGTH metres along its long axis (bow along +X in Blender, like packs/tasman_sea.py),
puts the keel's lowest point at z=0, shrinks textures to TEX px, and prints the deck height at midships
(a ray straight down at the centre line) so a figure can stand on it.

  blender -b --factory-startup --python ship_glb.py -- scene.gltf OUT.glb [--length 34] [--tex 1024]
"""
import sys
import bpy
from mathutils import Vector


def args():
    a = sys.argv[sys.argv.index("--") + 1:]
    opt = lambda k, d: float(a[a.index(k) + 1]) if k in a else d
    return a[0], a[1], opt("--length", 34.0), int(opt("--tex", 1024))


def main():
    src, out, length, tex = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    obs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    size = hi - lo
    s = length / max(size.x, size.y)
    roots = [o for o in bpy.context.scene.objects if o.parent is None]
    pivot = bpy.data.objects.new("ship", None)
    bpy.context.scene.collection.objects.link(pivot)
    for r in roots:
        r.parent = pivot
    pivot.scale = (s, s, s)
    pivot.location = (-(lo.x + hi.x) / 2 * s, -(lo.y + hi.y) / 2 * s, -lo.z * s)
    bpy.context.view_layer.update()

    for img in bpy.data.images:
        if img.size[0] > tex:
            img.scale(tex, int(img.size[1] * tex / img.size[0]))

    # deck height: highest hit going down at midships and a quarter toward bow and stern, on the centre line
    deps = bpy.context.evaluated_depsgraph_get()
    decks = []
    for x in (-length / 4, 0.0, length / 4):
        hit, loc, *_ = bpy.context.scene.ray_cast(deps, Vector((x, 0.0, 200.0)), Vector((0, 0, -1)))
        # the first hit may be a sail or yard: keep casting from just below it until a wide horizontal surface
        z = 200.0
        while hit:
            z = loc.z - 0.01
            nxt = bpy.context.scene.ray_cast(deps, Vector((x, 0.0, z)), Vector((0, 0, -1)))
            if not nxt[0]:
                break
            hit, loc = nxt[0], nxt[1]
            decks.append((x, round(loc.z, 2)))
    long_axis = "x" if size.x >= size.y else "y"
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_image_format="JPEG")
    print(f"SHIP ok {out} long_axis={long_axis} size={[round(v * s, 2) for v in size]} hits={decks}")


main()

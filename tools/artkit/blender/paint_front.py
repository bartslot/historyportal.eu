"""Paint a picture back onto the mesh made from it (comic-look Gate 1, 2026-10-13).

Hunyuan3D-Omni builds a shape from ONE picture, seen from the front. This projects that same picture onto the
shape from the front (planar, the picture's frame = the mesh's front bounding box), decimates to a browser
budget, and exports a textured GLB in metres with the soles on the floor. Seen from near that front view, the
3D figure carries the painter's own colours, light and lines; other angles show the picture smeared.

  blender -b --factory-startup --python paint_front.py -- IN.glb PICTURE.png OUT.glb [--faces 40000] [--height 1.8]
PICTURE must be cropped to the figure (no empty border): its edges are matched to the mesh's bounding box.
"""
import sys
import bpy
import bmesh


def args():
    a = sys.argv[sys.argv.index("--") + 1:]
    opt = lambda k, d: float(a[a.index(k) + 1]) if k in a else d
    return a[0], a[1], a[2], int(opt("--faces", 40000)), opt("--height", 1.8)


def main():
    src, picture, out, faces, height = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.context.view_layer.objects.active = meshes[0]
    for o in meshes:
        o.select_set(True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    dec = ob.modifiers.new("decimate", "DECIMATE")
    dec.ratio = min(1.0, faces / max(1, len(ob.data.polygons)))
    bpy.ops.object.modifier_apply(modifier=dec.name)

    # metres, soles on z=0, centred on x/y (Blender z-up; glTF export turns it back to y-up)
    xs, ys, zs = zip(*[v.co[:] for v in ob.data.vertices])
    s = height / (max(zs) - min(zs))
    cx, cy, z0 = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)
    for v in ob.data.vertices:
        v.co = ((v.co.x - cx) * s, (v.co.y - cy) * s, (v.co.z - z0) * s)
    ob.data.update()

    # front projection: glTF +z (the picture's view) is Blender -y; picture right = +x, picture up = +z
    xs, _, zs = zip(*[v.co[:] for v in ob.data.vertices])
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    uv = bm.loops.layers.uv.new("front")
    for f in bm.faces:
        for loop in f.loops:
            co = loop.vert.co
            loop[uv].uv = ((co.x - x0) / (x1 - x0), (co.z - z0) / (z1 - z0))
    bm.to_mesh(ob.data)
    bm.free()
    for p in ob.data.polygons:
        p.use_smooth = True

    mat = bpy.data.materials.new("painted")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes["Principled BSDF"]
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(picture)
    tex.extension = "EXTEND"
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    ob.data.materials.clear()
    ob.data.materials.append(mat)

    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=False)
    print(f"PAINT ok {out} faces={len(ob.data.polygons)} size={x1 - x0:.2f}x{z1 - z0:.2f} m")


main()

"""Root flare for tree-gen trunks: buttress lobes plus surface roots that sink into the ground.

tree-gen's own `flare` is a smooth bell, which reads as a tube standing on the floor. Real trunks
bulge into a few uneven buttresses where the big roots leave, and those roots run out over the
ground and dive under it.
"""
import math

import bpy

FLARE_H = 3.0        # flare height in base radii
SINK = 0.3           # the bottom ring goes this many base radii under the ground (hides the cut)
ROOT_POINTS = 8
ROOT_FLAT = 0.55    # surface roots are wider than tall: their mesh is squashed to this height


def base_of(mesh):
    """Axis centre and median radius of the trunk's lowest ring."""
    low = [v.co for v in mesh.vertices if v.co.z < 0.05]
    cx = sum(p.x for p in low) / len(low)
    cy = sum(p.y for p in low) / len(low)
    radii = sorted(math.hypot(p.x - cx, p.y - cy) for p in low)
    return cx, cy, radii[len(radii) // 2]


def lobes_for(rng, strength):
    """[(angle, width, amplitude)] of uneven buttresses, 4 to 7 of them."""
    n = rng.randint(4, 7)
    return [
        (2 * math.pi * i / n + rng.uniform(-0.35, 0.35), rng.uniform(0.2, 0.38), rng.uniform(0.35, 1.0) * strength)
        for i in range(n)
    ]


def lobe_at(theta, lobes):
    best = 0.0
    for angle, width, amp in lobes:
        d = math.atan2(math.sin(theta - angle), math.cos(theta - angle))
        best = max(best, amp * math.exp(-((d / width) ** 2)))
    return best


def flare(mesh, lobes, cx, cy, r0):
    """Push the trunk base out into buttresses; sink the bottom ring under the ground."""
    top = FLARE_H * r0
    for v in mesh.vertices:
        z = v.co.z
        if z >= top:
            continue
        dx, dy = v.co.x - cx, v.co.y - cy
        fall = (1 - max(z, 0) / top) ** 2
        scale = 1 + fall * (0.25 + 1.8 * lobe_at(math.atan2(dy, dx), lobes))
        v.co.x, v.co.y = cx + dx * scale, cy + dy * scale
        if z < 0.02:
            v.co.z = -SINK * r0
    mesh.update()


def surface_roots(rng, lobes, cx, cy, r0, name):
    """One tapered root per strong buttress, running out over the ground and diving under it."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 1.0
    curve.bevel_resolution = 3
    curve.resolution_u = 4
    strongest = max(a for _, _, a in lobes)
    for angle, _, amp in lobes:
        if amp < 0.45 * strongest:
            continue
        length = r0 * rng.uniform(3.0, 5.0) * (0.6 + amp)
        spline = curve.splines.new("BEZIER")
        spline.bezier_points.add(ROOT_POINTS - 1)
        heading = angle
        for i, pt in enumerate(spline.bezier_points):
            s = i / (ROOT_POINTS - 1)
            heading += rng.gauss(0, 0.03)
            dist = r0 * 0.3 + length * s
            z = r0 * (0.6 * (1 - s) ** 1.2 - 0.7 * s ** 1.5)
            pt.co = (cx + dist * math.cos(heading), cy + dist * math.sin(heading), z)
            pt.handle_left_type = pt.handle_right_type = "AUTO"
            pt.radius = r0 * (0.5 * amp * (1 - s) ** 0.8 + 0.06)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def add_roots(trunk_mesh, rng, strength, name):
    """Flare trunk_mesh in place; return (curve object with its surface roots, base radius)."""
    cx, cy, r0 = base_of(trunk_mesh)
    lobes = lobes_for(rng, strength)
    flare(trunk_mesh, lobes, cx, cy, r0)
    return surface_roots(rng, lobes, cx, cy, r0, name), r0

# Tasman 1642: the two ship models alone, before any scene is composed with them.
# Checks what each Sketchfab model really is (hull form, rig, sails set or furled), which way its bow
# points, and its size, so the ships are placed and scaled right. Run: bl.py --render --lib this.py
#
# Heemskerck: a jacht of ~120 last, Zeehaen: a fluit of ~100 last; both roughly 30-35 m overall.
# Models (CC-BY, TegnoGenial), from the gallery: "dutch ship large" (high galleon-like stern, the warship
# profile) = Heemskerck, the jacht and flagship; "Dutch Ship Medium" (lower, rounder hull and stern, closest
# to a fluit) = Zeehaen. Both have their sails mostly furled: set sails are added per scene.
# Rejected: "Ship Pinnace" (e4e6...), its stern is painted LEUSDEN, a VOC ship of the 1720s.

OUT = ASSETS_ROOT + "/Tasman/gallery"
SHIPS = [
    ("heemskerck", "8ff8f94903e84131832c35e5371b5d59", 34.0),   # "dutch ship large"
    ("zeehaen", "551827509baf496288ae8df48b756147", 30.0),      # "Dutch Ship Medium"
]

report = {}
for key, uid, length in SHIPS:
    sc = new_scene("tasman_gallery_" + key)
    c = coll(sc, "ships")
    ship = sf(c, key, uid, "props", size=length)
    dims = [round(v, 2) for v in ship.dimensions * ship.scale.x] if hasattr(ship, "dimensions") else None
    bb = [ship.matrix_world @ Vector(v) for v in ship.bound_box]
    xs, ys, zs = [v.x for v in bb], [v.y for v in bb], [v.z for v in bb]
    report[key] = {"x": round(max(xs) - min(xs), 2), "y": round(max(ys) - min(ys), 2), "z": round(max(zs) - min(zs), 2)}
    centre = Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, (max(zs) - min(zs)) * 0.35))
    far = max(report[key]["x"], report[key]["y"]) * 1.6
    views = {
        "side_x": centre + Vector((far, 0, 3)),
        "side_y": centre + Vector((0, far, 3)),
        "quarter": centre + Vector((far * 0.75, far * 0.75, 6)),
    }
    for view, loc in views.items():
        cam = camera_look(sc, "cam_" + view, loc, centre, lens=35.0)
        render_shot(sc, cam, OUT, key + "_" + view, meta={"pack": "tasman_ships_gallery"}, lines=False)

result = report

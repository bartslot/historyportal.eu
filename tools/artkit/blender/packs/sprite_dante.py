# Sprite test (phase B, Bart 2026-09-28: "backgrounds separate, figures as sprite sheets, like an anime movie").
# Dante at 18 alone on a transparent background, seen from the street camera (hp1: eye 1.60 m), so the frames
# drop onto the painted street plate at the right perspective. Limited animation: few drawings, held.
#   walk:     4 frames (contact L, passing, contact R, passing)
#   idle:     2 frames (breath in / out)
#   startled: 3 frames (walking -> stops -> turns his head, hand half raised)
# Send with:  bl.py --render --lib figure.py packs/sprite_dante.py
OUT = ASSETS_ROOT + "/Dante/sprites/dante18"
sc = new_scene("sprite_dante")
B = coll(sc, "blocking")
DANTE18 = (0.26, 0.36, 0.62)
# no floor: an Eevee shadow catcher rendered as an opaque grey plane; the player gives sprites a soft shadow

STEP = 26   # degrees of hip swing at contact
FRAMES = {
    "walk_0": {"leg_upper.L": (-STEP, 0, 0), "leg_lower.L": (6, 0, 0), "leg_upper.R": (STEP * 0.8, 0, 0), "leg_lower.R": (22, 0, 0),
               "arm_upper.L": (16, 0, 0), "arm_upper.R": (-18, 0, 0), "arm_lower.R": (-12, 0, 0)},
    "walk_1": {"leg_upper.L": (-4, 0, 0), "leg_upper.R": (8, 0, 0), "leg_lower.R": (38, 0, 0), "belly": (0, 0, 0)},
    "walk_2": {"leg_upper.R": (-STEP, 0, 0), "leg_lower.R": (6, 0, 0), "leg_upper.L": (STEP * 0.8, 0, 0), "leg_lower.L": (22, 0, 0),
               "arm_upper.R": (16, 0, 0), "arm_upper.L": (-18, 0, 0), "arm_lower.L": (-12, 0, 0)},
    "walk_3": {"leg_upper.R": (-4, 0, 0), "leg_upper.L": (8, 0, 0), "leg_lower.L": (38, 0, 0)},
    "idle_0": {"head": (-3, 0, 0)},
    "idle_1": {"chest": (-2, 0, 0), "head": (-1, 0, 0), "arm_upper.L": (0, 3, 0), "arm_upper.R": (0, -3, 0)},
    "startled_0": {"leg_upper.L": (-14, 0, 0), "leg_upper.R": (10, 0, 0), "leg_lower.R": (14, 0, 0)},
    "startled_1": {"chest": (8, 0, 0), "head": (-10, 0, 0), "arm_upper.L": (-20, 0, 0), "arm_upper.R": (-20, 0, 0),
                   "arm_lower.L": (-30, 0, 0), "arm_lower.R": (-30, 0, 0)},
    "startled_2": {"chest": (6, 0, 18), "neck": (0, 0, 20), "head": (-8, 0, 28), "arm_upper.R": (-55, 0, -10),
                   "arm_lower.R": (-50, 0, 0), "arm_upper.L": (-15, 0, 0)},
}
# three-quarter view walking left-to-right across the street, 6 m from the lens
# the street camera's viewpoint (eye 1.60 m), zoomed in on the figure: same perspective, more pixels to paint
cam = camera_look(sc, "cam", (0, 0, EYE), (0, 6.0, 0.95), lens=120, family="sprite")
sc.render.resolution_x, sc.render.resolution_y = 1024, 1536
sun = _sun(sc); sun.rotation_euler = (math.radians(50), 0, math.radians(-40)); sun.data.energy = 4.0
sc.render.film_transparent = True
sc.render.engine = 'BLENDER_EEVEE'
sc.view_settings.view_transform = 'AgX'
_set_world(sc, (0.55, 0.58, 0.62))
os.makedirs(OUT, exist_ok=True)
done = []
POINTS = {}
for name, extra in FRAMES.items():
    for o in list(objs(sc)):
        if o.get("part") == "figure":
            bpy.data.objects.remove(o, do_unlink=True)
    root = figure(B, "dante", (0, 6.0, 0), yaw_deg=-60, height=1.72, pose="stand", rgb=DANTE18, extra=extra)
    for o in objs(sc):
        if o.get("part") == "figure":
            o.hide_render = False
    sc.camera = cam
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True, scene=sc.name)
    POINTS[name] = figure_points(root, cam, sc)   # mouth for text balloons, per frame
    done.append(name)
json.dump({"resolution": [sc.render.resolution_x, sc.render.resolution_y], "frames": POINTS},
          open(os.path.join(OUT, "points.json"), "w"), indent=1)
save_pack(sc, OUT, "sprite_dante")
result = {"frames": done, "out": OUT}

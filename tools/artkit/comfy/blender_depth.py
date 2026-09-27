"""Blender depth for a shot: per-pixel camera distance (metres), read-only ray-cast with the shot's camera JSON.

Runs inside the render PC's headless Blender through the Blender Lab MCP socket (localhost:9876 on the PC).
Open a tunnel first; use your own local port, another session may hold 9877:
    ssh -fN -L 9878:localhost:9876 render
Writes <shot>_depth.npy (camera distance) and <shot>_depth_axial.npy next to the camera JSON on the PC.
Blocking mannequins (part == "figure") are passed through: they are not background.

usage: python3 blender_depth.py /home/bart/artkit/lesson_assets/Dante/packs/street/sr01_wide_street_camera.json [...] [--port 9878]
"""
import argparse, json, socket

BLENDER_CODE = r'''
# Read-only: per-pixel camera distance for one shot, from its camera JSON, by ray-casting the scene.
import bpy, json, math, time, numpy as np
from mathutils import Euler, Vector
SHOTS = __SHOTS__  # filled in by blender_depth.py
DOWN = 2                      # 2560x1440 -> 1280x720 samples; nearest-upsampled, then smoothed in depth_lines
out = {}
for cam_path in SHOTS:
    t0 = time.time()
    c = json.load(open(cam_path))
    sc = bpy.data.scenes[c["scene"]]
    dg = sc.view_layers[0].depsgraph
    W, H = c["resolution"]; f = c["focal_px"]
    cx = W / 2; cy = H / 2 + c["shift_y"] * W
    R = Euler([math.radians(a) for a in c["camera_rotation_deg"]], "XYZ").to_matrix()
    o = Vector(c["camera_location_m"])
    fwd = R @ Vector((0, 0, -1))
    w, h = W // DOWN, H // DOWN
    dist = np.full((h, w), np.inf, np.float32); axial = np.full((h, w), np.inf, np.float32)
    for j in range(h):
        v = (j + 0.5) * DOWN
        for i in range(w):
            u = (i + 0.5) * DOWN
            d = (R @ Vector(((u - cx) / f, (cy - v) / f, -1.0))).normalized()
            start = o
            for _ in range(8):   # pass through blocking mannequins: they are not part of the background
                hit, loc, _n, _i, ob, _m = sc.ray_cast(dg, start, d)
                if not hit or ob.get("part") != "figure":
                    break
                start = loc + d * 1e-3
            if hit:
                r = (loc - o).length
                dist[j, i] = r; axial[j, i] = r * d.dot(fwd)
    stem = cam_path.replace("_camera.json", "")
    np.save(stem + "_depth.npy", dist); np.save(stem + "_depth_axial.npy", axial)
    fin = dist[np.isfinite(dist)]
    out[c["shot"]] = {"secs": round(time.time() - t0, 1), "hit_frac": round(float(fin.size) / dist.size, 3),
                      "min_m": round(float(fin.min()), 2), "p50_m": round(float(np.median(fin)), 2), "max_m": round(float(fin.max()), 2)}
result = out
'''


def send(code: str, port: int) -> str:
    s = socket.create_connection(("localhost", port), timeout=1800)
    s.sendall(json.dumps({"type": "execute", "code": code, "strict_json": False}).encode() + b"\0")
    buf = b""
    while not buf.endswith(b"\0"):
        chunk = s.recv(65536)
        if not chunk:
            break
        buf += chunk
    return buf.rstrip(b"\0").decode()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cameras", nargs="+", help="camera JSON paths ON THE PC")
    ap.add_argument("--port", type=int, default=9878)
    a = ap.parse_args()
    for cam in a.cameras:   # one shot per call: a busy street takes ~100 s and a batch can outlive the socket
        print(send(BLENDER_CODE.replace("__SHOTS__", json.dumps([cam])), a.port))

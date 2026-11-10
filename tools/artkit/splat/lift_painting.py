"""A splat world from one of OUR paintings, so the world under a scene is drawn in our style stroke for stroke
(Bart, 2026-11-10: "splat in our art style"). No training: every pixel of the painting becomes one splat at the
depth Depth Anything V2 gives it, and the sky painting hangs on a far curved wall behind. The stage camera never
turns sideways (no yaw), so the one view a painting has is the only view the class ever sees; walking a few metres
gives real parallax.

    python3 tools/artkit/splat/lift_painting.py <land.webp> <sky.webp> <out.spz> [--horizon 0.28] [--hfov 90]

land: an RGBA strip (transparent sky), its horizon `--horizon` of the way down. Depth is fitted to metres on the
ground: a pixel r rows below the horizon lies EYE * f / r away on a flat floor. Writes gzipped SPZ v2, the format
the stage loads (resources/js/scene/stage25d/world.js). Model: depth-anything/Depth-Anything-V2-Small-hf
(Apache-2.0), the one tools/artkit/depth uses.
"""
import argparse
import gzip
import struct
import sys

import numpy as np

MODEL = "depth-anything/Depth-Anything-V2-Small-hf"
EYE = 1.6            # metres: the stage camera's eye height (layout.ts HOUSE.y)
FAR = 150.0          # metres: the tree line; nothing on the land lies farther
NEAR = 2.0
SKY_R = 400.0        # metres: the sky wall's radius around the eye
SKY_SPAN = 160.0     # degrees of sky across, wider than any stage view
SKY_UP = (-3.0, 55.0)  # degrees: from just under the horizon (behind the tree line) to high overhead
LAND_W, SKY_W = 1024, 512   # splats across: the land is detailed, a watercolour sky is soft
SPLAT = 0.75         # a splat's size in pixel footprints: no gaps, no mush
FRACTIONAL_BITS = 12  # SPZ fixed point: +-2048 m at 0.25 mm


def depth_of(rgb):
    """Relative inverse depth (bigger = nearer) for an RGB PIL image, at its size."""
    import torch
    from transformers import pipeline

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    pred = pipeline("depth-estimation", model=MODEL, device=device)(rgb)["predicted_depth"]
    pred = torch.nn.functional.interpolate(pred.reshape(1, 1, *pred.shape[-2:]).float().cpu(),
                                           size=(rgb.height, rgb.width), mode="bicubic", align_corners=False)
    return pred[0, 0].numpy().astype(np.float64)


def metres(disp, horizon_row, f):
    """Fit metres = 1 / (a disp + b) to the flat floor below the horizon (1/Z = r / (EYE f) there)."""
    h = disp.shape[0]
    rows = np.arange(h, dtype=np.float64)[:, None] - horizon_row
    floor = np.broadcast_to(rows > 0.15 * (h - horizon_row), disp.shape)
    inv = np.broadcast_to(rows / (EYE * f), disp.shape)
    a, b = np.polyfit(disp[floor], inv[floor], 1)
    return np.clip(1.0 / np.maximum(a * disp + b, 1.0 / FAR), NEAR, FAR)


def snap_edges(z, k=5, edge=1.15):
    """Where depth jumps (a roof against the trees), the model blurs it: an ink pixel between them floats in mid-air
    and shows as a speckle once the camera moves. Snap each such pixel to the nearer or the farther side."""
    from scipy.ndimage import maximum_filter, minimum_filter

    lo, hi = minimum_filter(z, k), maximum_filter(z, k)
    snapped = np.where(z - lo < hi - z, lo, hi)
    return np.where(hi > lo * edge, snapped, z)


def land_splats(land, sky_rgb, horizon, hfov):
    from PIL import Image

    h = round(land.height * LAND_W / land.width)
    land = land.convert("RGBA").resize((LAND_W, h), Image.LANCZOS)
    backed = sky_rgb.resize((LAND_W, h), Image.LANCZOS).convert("RGBA")
    backed.alpha_composite(land)   # the model sees a whole picture, not a hole where the sky was
    f = (LAND_W / 2) / np.tan(np.radians(hfov / 2))
    hr = horizon * h
    z = snap_edges(metres(depth_of(backed.convert("RGB")), hr, f))
    px = np.asarray(land, np.float64) / 255
    v, u = np.nonzero(px[..., 3] > 0.5)   # solid paint only: the soft rim left speckles in the sky
    zz = z[v, u]
    pos = np.stack([(u + 0.5 - LAND_W / 2) / f * zz, EYE - (v + 0.5 - hr) / f * zz, zz], 1)
    return pos, px[v, u, :3], np.ones(len(v)), SPLAT * zz / f


def sky_splats(sky):
    from PIL import Image

    lo, hi = SKY_UP
    h = round(SKY_W * (hi - lo) / SKY_SPAN)
    px = np.asarray(sky.resize((SKY_W, h), Image.LANCZOS), np.float64) / 255
    v, u = np.mgrid[0:h, 0:SKY_W]
    yaw = np.radians((u.ravel() + 0.5) / SKY_W * SKY_SPAN - SKY_SPAN / 2)
    pitch = np.radians(hi - (v.ravel() + 0.5) / h * (hi - lo))
    pos = SKY_R * np.stack([np.sin(yaw) * np.cos(pitch), np.sin(pitch), np.cos(yaw) * np.cos(pitch)], 1)
    pos[:, 1] += EYE
    step = np.radians(SKY_SPAN / SKY_W) * SKY_R
    return pos, px.reshape(-1, 3), np.ones(len(pos)), np.full(len(pos), SPLAT * 1.4 * step)


def spz(pos, rgb, alpha, size):
    """Gzipped SPZ v2: header, then positions, alphas, colours, scales, rotations, each for every splat."""
    n = len(pos)
    fixed = np.round(pos * np.array([1, -1, 1]) * (1 << FRACTIONAL_BITS)).astype(np.int32)   # Babylon flips y on load
    b = fixed.astype("<i4").view(np.uint8).reshape(n, 3, 4)[:, :, :3].reshape(-1)
    colour = np.clip(np.round((rgb - 0.5) / 0.28209479177387814 * 0.15 * 255 + 127.5), 0, 255)
    scale = np.clip(np.round((np.log(np.maximum(size, 1e-4)) + 10) * 16), 0, 255)
    body = [b, np.round(alpha * 255), colour.reshape(-1), np.repeat(scale, 3), np.full(n * 3, 128)]
    head = struct.pack("<IIIBBBB", 0x5053474E, 2, n, 0, FRACTIONAL_BITS, 0, 0)
    return gzip.compress(head + b"".join(np.asarray(x, np.uint8).tobytes() for x in body), 9)


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("land"), ap.add_argument("sky"), ap.add_argument("out")
    ap.add_argument("--horizon", type=float, default=0.28)
    ap.add_argument("--hfov", type=float, default=90.0)
    a = ap.parse_args(argv)
    from PIL import Image

    sky = Image.open(a.sky).convert("RGB")
    parts = [land_splats(Image.open(a.land), sky, a.horizon, a.hfov), sky_splats(sky)]
    data = spz(*(np.concatenate(k) for k in zip(*parts)))
    with open(a.out, "wb") as fh:
        fh.write(data)
    print(a.out, sum(len(p[0]) for p in parts), "splats", len(data) // 1024, "KB")
    return 0


if __name__ == "__main__":
    step = snap_edges(np.array([[10.0, 10, 30, 50, 50]]), k=3)
    assert step.tolist() == [[10, 10, 50, 50, 50]] or step.tolist() == [[10, 10, 10, 50, 50]], step
    raw = gzip.decompress(spz(np.array([[1.0, 2.0, -3.0]]), np.array([[0.5, 1.0, 0.0]]), np.array([1.0]), np.array([1.0])))
    assert struct.unpack("<IIIBBBB", raw[:16]) == (0x5053474E, 2, 1, 0, FRACTIONAL_BITS, 0, 0)
    assert int.from_bytes(raw[19:22], "little", signed=True) == -2 << FRACTIONAL_BITS   # y flipped
    assert raw[25] == 255 and raw[26:29] == bytes([128, 195, 60]) and raw[29] == 160   # alpha, SH colour, scale e^0 = (0+10)*16
    sys.exit(main(sys.argv[1:]))

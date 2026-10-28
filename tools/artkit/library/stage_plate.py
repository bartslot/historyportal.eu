"""A plate = what a class sees: a lesson scene's set composed with the stage25d maths (PM 2026-10-28).

Port of engine-mvp/src/stage25d/layout.ts placeLayer + ground.ts (branch feat/stage-ground): pinhole house camera at
eye height 1.6 m, fov 50 (vertical), looking up HOUSE_PITCH; every layer a plane at its depth, sized by height_m x
scale (never stretched); the ground a floor plane under everything, tiled every asset.height_m metres.

    python3 stage_plate.py <plate.json>      # {"bundle", "out", "set": {sky, ground, horizon, layers: [...]}}
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from gen import LIB  # noqa: E402

DEPTH_Z = {"sky": 380.0, "bg": 70.0, "mid": 22.0, "fg": 7.0}  # layout.ts
EYE, FOV, PITCH = 1.6, 50.0, 2.0  # HOUSE y, fov; HOUSE_PITCH_DEG -2 = looking up 2 degrees
COVER_MARGIN, SAME_DEPTH_STEP_M = 1.6, 0.05
BG_FEATHER = 0.22  # ground.ts: a bg strip's bottom feathers into the ground
GROUND_TILE_M = 12.0
W, H = 1920, 1080
F = (H / 2) / math.tan(math.radians(FOV / 2))  # px per unit of tan(angle)
CY = H / 2 - F * math.tan(math.radians(-PITCH))  # screen row of the horizon (looking up moves it down)


def to_px(x: float, y: float, z: float) -> tuple[float, float]:
    return W / 2 + F * x / z, CY - F * (y - EYE) / z


def span_at(z: float) -> float:
    return 2 * z * math.tan(math.radians(FOV / 2)) * W / H


def ground(lib_dir: Path, asset: dict | None, paper: tuple[int, int, int]) -> np.ndarray:
    """The floor: per pixel below the horizon, the ground point it sees, sampled from the tile (wraps)."""
    out = np.zeros((H, W, 3), np.uint8) + np.array(paper, np.uint8)
    if not asset:
        return out
    tile = np.asarray(Image.open(lib_dir / asset["file"]).convert("RGB"))
    th, tw = tile.shape[:2]
    m = asset.get("height_m") or GROUND_TILE_M
    ys = np.arange(int(math.ceil(CY)) + 1, H)
    z = F * EYE / (ys - CY)  # distance of the floor seen by each row
    xs = (np.arange(W) - W / 2) / F
    X = xs[None, :] * z[:, None]
    u = ((X / m) % 1 * tw).astype(int)
    v = ((z[:, None] / m) % 1 * th).astype(int)
    out[ys] = tile[(th - 1 - v) % th, u % tw]
    return out


def place(canvas: Image.Image, im: Image.Image, depth: str, x: float, scale: float, order: int, horizon: float,
          asset: dict) -> None:
    z = DEPTH_Z[depth] - order * SAME_DEPTH_STEP_M
    span = span_at(z)
    if asset["layer"] == "sky":  # the backdrop: covers the view at its distance, horizon a little below the frame
        w_m = span * COVER_MARGIN
        h_m = w_m / (W / H)
        x0, y_m = -w_m / 2, -h_m * 0.12
    else:
        h_m = asset["height_m"] * scale
        w_m = h_m * im.width / im.height  # uniform: the asset is never stretched
        x0 = (x - 0.5) * span - w_m / 2
        y_m = horizon if depth == "bg" else 0.0
    left, top = to_px(x0, y_m + h_m, z)
    right, bottom = to_px(x0 + w_m, y_m, z)
    pw, ph = max(1, round(right - left)), max(1, round(bottom - top))
    im = im.resize((pw, ph), Image.LANCZOS)
    if depth == "bg" and asset["layer"] != "sky":  # feather the bottom into the ground
        a = np.asarray(im).copy()
        n = max(1, int(ph * BG_FEATHER))
        a[-n:, :, 3] = (a[-n:, :, 3] * np.linspace(1, 0, n)[:, None]).astype(np.uint8)
        im = Image.fromarray(a)
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    layer.paste(im, (round(left), round(top)))
    canvas.alpha_composite(layer)


LAND_TARGET = 0.42  # PM: horizon ~0.40-0.45 of the frame, sky <= 40 %


def auto_horizon(lib_dir: Path, a: dict, order: int = 0, target: float = LAND_TARGET) -> float:
    """set.horizon (metres the bg stands higher; negative = lower) that puts the bg strip's land top at LAND_TARGET."""
    al = np.asarray(Image.open(lib_dir / a["file"] if not Path(a["file"]).is_absolute() else Path(a["file"])).convert("RGBA"))[..., 3]
    rows = np.nonzero((al > 128).mean(1) > 0.5)[0]  # first row where most of the width is land
    top_frac = rows[0] / al.shape[0] if len(rows) else 0.0
    z = DEPTH_Z["bg"] - order * SAME_DEPTH_STEP_M
    land_top_m = a["height_m"] * (1 - top_frac)  # metres above the strip's bottom
    want_y = EYE + (CY - target * H) * z / F  # world height that projects to the target row
    return round(want_y - land_top_m, 1)


def plate(spec: dict) -> dict:
    lib_dir = LIB / spec["bundle"]
    lib = json.loads((lib_dir / "library.json").read_text())
    by = {a["id"]: a for a in lib["assets"]}
    s = spec["set"]
    for l in s["layers"]:  # a candidate not shipped yet (the plate is its gate): {"asset", "src": cut png, "height_m"}
        if l.get("src"):
            im = Image.open(LIB / "_work" / l["src"])
            by[l["asset"]] = {"id": l["asset"], "layer": l["depth"], "height_m": l["height_m"], "w": im.width,
                              "h": im.height, "file": str(LIB / "_work" / l["src"])}
    ids = [s["sky"], s.get("ground")] + [l["asset"] for l in s["layers"]]
    missing = [i for i in ids if i and i not in by]
    if missing:
        raise SystemExit(f"{spec['out']}: not shipped: {', '.join(missing)}")
    canvas = Image.fromarray(ground(lib_dir, by.get(s.get("ground")), (246, 245, 238))).convert("RGBA")
    sky = Image.open(lib_dir / by[s["sky"]]["file"]).convert("RGBA")
    back = Image.new("RGBA", canvas.size)
    place(back, sky, "sky", 0.5, 1, 0, 0, by[s["sky"]])
    sky_px = np.asarray(back)[..., 3] > 0
    canvas_arr = np.asarray(canvas).copy()
    canvas_arr[: int(math.ceil(CY)) + 1] = np.asarray(back)[: int(math.ceil(CY)) + 1]  # sky above the horizon
    canvas = Image.fromarray(canvas_arr)
    if s.get("horizon") == "auto":
        bgs = [l for l in s["layers"] if l["depth"] == "bg"]
        s = {**s, "horizon": auto_horizon(lib_dir, by[bgs[0]["asset"]], 0, s.get("land_target", LAND_TARGET))
             if bgs else 0.0}  # the first bg is the landscape; later bg layers (a far ship) stand on it
    order = {d: 0 for d in DEPTH_Z}
    cover = np.zeros((H, W), bool)
    for l in sorted(s["layers"], key=lambda l: -DEPTH_Z[l["depth"]]):
        a = by[l["asset"]]
        before = np.asarray(canvas)[..., :3].copy()
        place(canvas, Image.open(lib_dir / a["file"] if not Path(a["file"]).is_absolute() else Path(a["file"])).convert("RGBA"), l["depth"], l.get("x", 0.5), l.get("scale", 1),
              order[l["depth"]], s.get("horizon", 0.0), a)
        cover |= (np.asarray(canvas)[..., :3] != before).any(-1)
        order[l["depth"]] += 1
    rows = np.arange(H)[:, None] < CY
    sky_share = float((rows & ~cover & sky_px).mean())
    out = LIB / spec["bundle"] / spec["out"]
    canvas.convert("RGB").save(out)
    return {"out": str(out), "horizon_frac": round(CY / H, 3), "set_horizon_m": s.get("horizon", 0.0),
            "sky_share": round(sky_share, 3)}


if __name__ == "__main__":
    print(json.dumps(plate(json.loads(Path(sys.argv[1]).read_text())), indent=1))

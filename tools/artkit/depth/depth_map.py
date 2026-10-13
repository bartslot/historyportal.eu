"""A depth map for a painted backdrop, computed ONCE at import (php artisan art:depth), never at play time.

    python3 tools/artkit/depth/depth_map.py <plate.webp> [<plate.webp> ...]

Writes <plate>.depth.webp beside each plate: 8-bit grayscale, lossless, half the plate's size,
NEAR = WHITE, far (sky, horizon) = black. The values are Depth Anything V2's relative inverse depth
(disparity), stretched per picture to 0..255: only their ORDER means something (nearer / farther),
not metres. On a flat floor disparity grows linearly with the row below the horizon, which is what
the player's occlusion and the editor's "fit to this spot" lean on (resources/js/scene/occlusion.js).

Model: depth-anything/Depth-Anything-V2-Small-hf (Apache-2.0), downloaded by transformers on the first
run into the Hugging Face cache. CPU or Apple MPS; the plate goes in at half size, one at a time.
Requirements: requirements.txt beside this file. Production (SiteGround) never runs this: the depth
files are committed beside the art and shipped like it.
"""
import gc
import sys
from pathlib import Path

import numpy as np

MODEL = "depth-anything/Depth-Anything-V2-Small-hf"
SCALE = 0.5   # input and output at half the plate's size: plenty for a mask, light on memory


def depth_path(plate: Path) -> Path:
    return plate.with_name(plate.stem + ".depth.webp")


def to_gray(pred: np.ndarray) -> np.ndarray:
    """Relative inverse depth -> uint8, nearest pixel 255, farthest 0."""
    lo, hi = float(pred.min()), float(pred.max())
    if hi - lo < 1e-9:
        return np.zeros(pred.shape, np.uint8)
    return np.round((pred - lo) / (hi - lo) * 255).astype(np.uint8)


def main(paths: list[str]) -> int:
    if not paths:
        print(__doc__)
        return 2
    import torch
    from PIL import Image
    from transformers import pipeline

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    estimate = pipeline("depth-estimation", model=MODEL, device=device)
    for p in map(Path, paths):
        with Image.open(p) as src:
            w, h = max(1, round(src.width * SCALE)), max(1, round(src.height * SCALE))
            plate = src.convert("RGB").resize((w, h), Image.LANCZOS)
        with torch.no_grad():
            pred = estimate(plate)["predicted_depth"]
            pred = torch.nn.functional.interpolate(pred.reshape(1, 1, *pred.shape[-2:]).float().cpu(),
                                                   size=(h, w), mode="bicubic", align_corners=False)
        out = depth_path(p)
        Image.fromarray(to_gray(pred[0, 0].numpy()), mode="L").save(out, "WEBP", lossless=True)
        print(out, flush=True)
        del pred, plate
        gc.collect()
        if device == "mps":
            torch.mps.empty_cache()
    return 0


if __name__ == "__main__":
    assert to_gray(np.array([[0.0, 2.0], [1.0, 2.0]])).tolist() == [[0, 255], [128, 255]]
    assert depth_path(Path("a/deck.webp")).name == "deck.depth.webp"
    sys.exit(main(sys.argv[1:]))

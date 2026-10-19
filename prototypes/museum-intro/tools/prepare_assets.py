"""Compress the raw sources into public/assets (WebP).

Usage: python3 tools/prepare_assets.py <raw_dir> <tasman_png>
raw_dir holds vroom.jpg (3840 px Commons thumb), vroom_full.jpg (optional original), vroom_depth_dav2.png (Depth Anything V2 from the render PC, tools/comfy_geom.py in the
vault relight-test), milkmaid.jpg, avercamp.jpg, swan.jpg and sil_1..7.png (ChatGPT image gen).
"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter

RAW, TASMAN = Path(sys.argv[1]), Path(sys.argv[2])
OUT = Path(__file__).resolve().parent.parent / "public" / "assets"
OUT.mkdir(parents=True, exist_ok=True)


def fit(im, long_side):
    s = long_side / max(im.size)
    return im if s >= 1 else im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


def save(im, name, q=80):
    p = OUT / name
    im.save(p, "WEBP", quality=q, method=6)
    print(f"{name:24s} {im.size} {p.stat().st_size // 1024} KB")


painting = Image.open(RAW / "vroom.jpg").convert("RGB")
save(fit(painting, 3840), "vroom.webp", 82)
if (RAW / "vroom_full.jpg").exists():  # the 7658 px Commons original, for GPUs that take 8k textures
    full = Image.open(RAW / "vroom_full.jpg").convert("RGB")
    save(full.resize((7680, round(7680 * full.height / full.width)), Image.LANCZOS), "vroom_hd.webp", 74)
# depth: same aspect as the painting. A grey "opening" (min then max filter) removes ropes and thin spars, so
# they stay painted on the layer behind instead of becoming floating slivers; a slight blur stops stair-steps.
depth = Image.open(RAW / "vroom_depth_dav2.png").convert("L").resize((1024, 472), Image.LANCZOS)
depth = depth.filter(ImageFilter.MinFilter(11)).filter(ImageFilter.MaxFilter(11))
save(depth.filter(ImageFilter.GaussianBlur(1.2)), "vroom_depth.webp", 90)

for name in ("milkmaid", "avercamp", "swan"):
    save(fit(Image.open(RAW / f"{name}.jpg").convert("RGB"), 1024), f"{name}.webp", 78)

for i in range(1, 8):
    im = Image.open(RAW / f"sil_{i}.png").convert("RGBA")
    save(fit(im.crop(im.getchannel("A").getbbox()), 640), f"sil_{i}.webp", 80)

tasman = Image.open(TASMAN).convert("RGBA")
save(fit(tasman.crop(tasman.getchannel("A").getbbox()), 1400), "tasman.webp", 85)

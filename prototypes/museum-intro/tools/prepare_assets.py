"""Compress the raw sources into public/assets (WebP).

Usage: python3 tools/prepare_assets.py <raw_dir> <figures_dir> <v2_textures_dir>
  raw_dir: vroom.jpg (3840 px Commons thumb), vroom_full.jpg (optional 7658 px original), milkmaid/avercamp/swan.jpg,
           sil_7.png (round 1 ChatGPT silhouette)
  figures_dir: resources/icons/history-line/figures/tasman (History Portal library)
  v2_textures_dir: Memory/historyportal/assets/museum-intro/v2/textures (ChatGPT, see ../PROMPT_LOG.md)
The ship (public/assets/world/ship_v4.glb) is built by tools/build_ship.py in Blender, see CREDITS.md.
"""
import sys
from pathlib import Path
from PIL import Image

RAW, FIG, V2 = (Path(a) for a in sys.argv[1:4])
OUT = Path(__file__).resolve().parent.parent / "public" / "assets"
(OUT / "world").mkdir(parents=True, exist_ok=True)


def fit(im, long_side):
    s = long_side / max(im.size)
    return im if s >= 1 else im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


def trim(im):
    return im.crop(im.getchannel("A").getbbox())


def save(im, name, q=80):
    p = OUT / name
    im.save(p, "WEBP", quality=q, method=6)
    print(f"{name:32s} {im.size} {p.stat().st_size // 1024} KB")


save(fit(Image.open(RAW / "vroom.jpg").convert("RGB"), 3840), "vroom.webp", 82)
if (RAW / "vroom_full.jpg").exists():  # for GPUs that take 8k textures
    full = Image.open(RAW / "vroom_full.jpg").convert("RGB")
    save(full.resize((7680, round(7680 * full.height / full.width)), Image.LANCZOS), "vroom_hd.webp", 74)
for name in ("milkmaid", "avercamp", "swan"):
    save(fit(Image.open(RAW / f"{name}.jpg").convert("RGB"), 1280), f"{name}.webp", 80)

# visitors: four whole upper bodies (round 2) + the teen from round 1
for n in ("point", "hat", "kid", "old"):
    save(fit(trim(Image.open(V2 / f"sil2_{n}.png").convert("RGBA")), 720), f"sil_{n}.webp", 82)
save(fit(trim(Image.open(RAW / "sil_7.png").convert("RGBA")), 720), "sil_teen.webp", 82)

# Tasman in two looks + crew (History Lines library cut-outs)
save(fit(trim(Image.open(FIG / "tasman_side.webp").convert("RGBA")), 1400), "world/tasman_lines.webp", 85)


def align_to(ref, img):
    """Place img on ref's canvas at the x offset (same height) where the two alpha masks overlap best."""
    import numpy as np
    img = img.resize((round(img.width * ref.height / img.height), ref.height), Image.LANCZOS)
    ra = np.array(ref.getchannel("A")) > 128
    ia = np.array(img.getchannel("A")) > 128
    def iou(dx):
        c = np.zeros_like(ra)
        x0, x1 = max(dx, 0), min(dx + img.width, ref.width)
        c[:, x0:x1] = ia[:, x0 - dx:x1 - dx]
        return (c & ra).sum() / (c | ra).sum()
    dx = max(range(-img.width, ref.width, 4), key=iou)
    out = Image.new("RGBA", ref.size, (0, 0, 0, 0))
    out.paste(img, (dx, 0))
    return out


# the painterly Tasman must sit exactly on the History Lines one, or the wipe shows a jump
lines_t = Image.open(OUT / "world/tasman_lines.webp").convert("RGBA")
save(align_to(lines_t, trim(Image.open(V2 / "tasman_paint.png").convert("RGBA"))), "world/tasman_paint.webp", 85)
for n in ("sailor_front", "sailor_threequarter", "pieter_looking_up_mast"):
    save(fit(trim(Image.open(FIG / f"{n}.webp").convert("RGBA")), 900), f"world/{n}.webp", 82)

for name in ("hull", "sail", "sea"):
    for look in ("paint", "lines"):
        save(Image.open(V2 / f"{name}_{look}.png").convert("RGB").resize((1024, 1024), Image.LANCZOS), f"world/{name}_{look}.webp", 80)
for look in ("paint", "lines"):
    save(Image.open(V2 / f"sky_{look}.png").convert("RGB").resize((2048, 1024), Image.LANCZOS), f"world/sky_{look}.webp", 82)

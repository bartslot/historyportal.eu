#!/usr/bin/env python3
"""Pack painted set assets (sky, bg, mid, fg, near_ground, ground) into a stage25d bundle folder.

  pack_assets.py <assets.json> <colour_dir> <bundle_dir>

assets.json: [{"id", "src", "layer", "tags", "height_m", "motion"?, "tileable_x"?}]. Per asset:
- sky and ground stay opaque and uncropped (a sky fills the view, a ground tiles);
- everything else gets real alpha: the generator's own alpha when it gave one, else the white paper that
  touches the picture's edge is cut away (enclosed white, like a sail, stays). Then it is cropped to what is
  painted, so the picture's last opaque row IS the contact line and nothing floats above the floor;
- the anchor x is the middle of the lowest opaque rows (where the thing touches the floor).
Writes <id>.webp and merges the entries, with any _<char>.json figure lists cut_figures.py left there, into
library.json (style history-lines-v1).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

WHITE = 236        # darkest channel above this = paper
OPAQUE = ('sky', 'ground')
ALPHA_ON = 24      # alpha above this counts as painted


def paper_alpha(rgb: np.ndarray) -> np.ndarray:
    """Alpha from white paper: paper connected to the border is background, a soft ramp at its edge."""
    dark = rgb.min(axis=2).astype(np.float32)
    paper = dark > WHITE
    lab, _ = ndi.label(paper)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(border))
    a = np.clip((WHITE + 12 - dark) / 40, 0, 1)
    return np.where(outside, 0, np.maximum(a, ~outside)).astype(np.float32)


def pack(spec: dict, src_dir: Path, out: Path) -> dict:
    im = Image.open(src_dir / spec['src'])
    layer = spec['layer']
    if layer in OPAQUE:
        im = im.convert('RGB')
        anchor = [0.5, 1.0]
    else:
        rgba = np.array(im.convert('RGBA'))
        has_alpha = im.mode == 'RGBA' and (rgba[..., 3] < 250).mean() > 0.02
        alpha = rgba[..., 3] / 255.0 if has_alpha else paper_alpha(rgba[..., :3])
        rgba[..., 3] = (alpha * 255).astype(np.uint8)
        on = rgba[..., 3] > ALPHA_ON
        ys, xs = np.where(on)
        if not len(ys):
            sys.exit(f"{spec['id']}: nothing painted")
        rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        im = Image.fromarray(rgba, 'RGBA')
        a = rgba[..., 3] > ALPHA_ON
        bot = np.where(a.any(axis=1))[0].max()
        foot = a[max(0, bot - max(2, int(0.03 * im.height))):bot + 1]
        anchor = [round(float(np.where(foot)[1].mean() / im.width), 3), 1.0]
    im.save(out / f"{spec['id']}.webp", quality=90, method=6)
    return {
        'id': spec['id'], 'layer': layer, 'tags': spec['tags'], 'file': f"{spec['id']}.webp",
        'w': im.width, 'h': im.height, 'anchor': anchor, 'height_m': spec['height_m'],
        'tileable_x': bool(spec.get('tileable_x', layer == 'ground')), 'motion': spec.get('motion', 'none'),
        'era': '1642', 'qa': {'score': 7, 'alpha_ok': layer not in OPAQUE},
    }


def main(specs: str, src_dir: str, bundle_dir: str) -> None:
    out = Path(bundle_dir)
    out.mkdir(parents=True, exist_ok=True)
    entries = [pack(s, Path(src_dir), out) for s in json.loads(Path(specs).read_text())]
    for figs in sorted(out.glob('_*.json')):
        entries += json.loads(figs.read_text())
    lib = {'version': 1, 'bundle': out.name, 'style': 'history-lines-v1', 'paper': '#f6f5ee', 'assets': entries}
    (out / 'library.json').write_text(json.dumps(lib, indent=1) + '\n')
    print(out.name, len(entries), 'assets', [(e['id'], e['w'], e['h']) for e in entries if e['layer'] != 'figure'])


if __name__ == '__main__':
    main(*sys.argv[1:4])

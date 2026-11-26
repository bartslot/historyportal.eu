"""Outfits from a History Lines ink drawing: ChatGPT draws the clothes on the body's own figure, this cuts the drawing
into a baked kit piece (fill, ink, shade), its colour kinds taken from the outfit's shapes in kit_outfit_svg.py.

Bart 2026-11-24: "update the clothes ... to come closer to the level of detail of History Lines with ChatGPT". The SVG
outfits drew clean lines from a few numbers; this keeps ChatGPT's own pen (folds, hatching, laces, stitching, fur) and
only adds what the creator needs: which colour each area takes and where the shade lies.

The drawing: an edit of the body's figure (body/man-body.png, 1024 x 1536, the label map at half scale), made by
LocalChatGpt on Bart's Mac (the Codex CLI on his subscription), black ink on white paper, the head bald, nothing moved:
  "image 1's exact figure (same canvas, pose, outline; head, hands and feet where they are) dressed as image 2 ...
   black ink only on pure white paper ... the History Lines ink pass, light hatching only in folds and shadow sides,
   clean closed outlines round every garment" (+ the Marco character sheet as image 2).

How a drawing becomes a piece:
  - ink: how dark each pixel is, at the kit's scale (x2);
  - the figure: everything the outside paper cannot reach through the outline;
  - colour: each area between the lines takes the kind most of it lies nearest to in the outfit's SVG shapes
    (tunic, belt and satchel, hose, boots, fur), skin elsewhere (hands); the head stays the plain body's own piece;
  - shade: the hatching, softened, so the stage's watercolour lays a soft glaze where the pen shaded (never a hard band).

  python3 engine-mvp/tools/kit_outfit_ink.py [<outfit id> <drawing> ...]   # default: every outfit with a `drawing`

The drawings are kept in engine-mvp/tools/kit-drawings/ (lossless webp of ChatGPT's PNG).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit_outfit_svg as S  # noqa: E402

KIT = S.KIT
HERE = Path(__file__).resolve().parent
SCALE = 2                      # drawing px -> kit canvas px
NECK_Y = 588                   # canvas px: above this, inside the head's part, the plain body's own piece stays
SHADE_SIGMA = 9.0              # canvas px: how far the hatching's shade spreads
SHADE_GAIN = 2.6


def key(kinds: list[str], kind: str) -> tuple[int, int, int]:
    i = kinds.index(kind)
    return 10 + 18 * i, 250 - 18 * i, 128


def piece_of(kit, body, pid):
    return next(p for b in kit['bodies'] if b['id'] == body for p in b['pieces'] if p['id'] == pid)


def on_canvas(path: Path, box, shape, mode='RGBA') -> np.ndarray:
    x, y, w, h = box
    a = np.asarray(Image.open(path).convert(mode))
    out = np.zeros(shape + a.shape[2:], a.dtype)
    out[y:y + h, x:x + w] = a
    return out


def build(oid: str, drawing: Path, kit: dict) -> dict:
    o = S.OUTFITS[oid]
    body = o['body']
    kinds = kit['kinds']
    lab, parts = S.labels_of(body)
    H, W = lab.shape
    head = lab == parts.index('head') + 1

    # ink at the kit's scale
    d = Image.open(drawing).convert('L')
    d = d.resize((d.width * SCALE, d.height * SCALE), Image.LANCZOS)
    g = np.asarray(d).astype(np.float32)[:H, :W]
    ink = np.clip((232.0 - g) / 150.0, 0, 1)

    # the figure: what the paper outside cannot reach (the outline closed over its pen gaps)
    lines = ndimage.binary_dilation(ink > 0.3, iterations=3)
    outside, _ = ndimage.label(~lines)
    paper = np.isin(outside, np.unique(np.concatenate([outside[0], outside[-1], outside[:, 0], outside[:, -1]])))
    figure = ndimage.binary_fill_holes(~paper)
    figure = ndimage.binary_erosion(figure, iterations=2) | (figure & (ink > 0.3))

    # the kinds of the outfit's shapes, back to front; skin where the plain body shows (hands, neck)
    under = piece_of(kit, body, S.BODIES[body]['under'])
    folder = KIT / body
    base_fill = on_canvas(folder / under['files']['fill'], under['box'], (H, W))
    kmap = np.full((H, W), -1, np.int16)
    kmap[base_fill[..., 3] > 128] = kinds.index('skin')
    for _, kind, m in S.outfit_svg(oid, {**o, **o.get('drawn', {})}, kit, masks_only=True):   # the shapes where the drawing has them
        kmap[m] = kinds.index(kind)
    _, (iy, ix) = ndimage.distance_transform_edt(kmap < 0, return_indices=True)
    nearest = kmap[iy, ix]

    # each area between the lines takes the kind most of it lies on; the lines themselves their nearest area's
    areas, n = ndimage.label(figure & ~ndimage.binary_dilation(ink > 0.22, iterations=1))   # lines closed: no leaks
    fill_k = np.full((H, W), -1, np.int16)
    if n:
        votes = np.zeros((n + 1, len(kinds)), np.int64)
        np.add.at(votes, (areas.ravel(), nearest.ravel()), 1)
        best = votes.argmax(1)
        best[0] = -1
        fill_k = best[areas].astype(np.int16)
        fill_k[areas == 0] = -1
    known = fill_k >= 0
    _, (jy, jx) = ndimage.distance_transform_edt(~known, return_indices=True)
    fill_k = np.where(figure, fill_k[jy, jx], -1)

    fill = np.zeros((H, W, 4), np.uint8)
    for i, k in enumerate(kinds):
        m = fill_k == i
        if m.any():
            fill[m] = (*key(kinds, k), 255)
    ink8 = (ink * 255).astype(np.uint8)
    ink8[~ndimage.binary_dilation(figure, iterations=4)] = 0

    # shade: the hatching, softened (outlines count less: a long line is not a shadow)
    hatch = ink * (1.0 - ndimage.maximum_filter(ink > 0.5, size=1) * 0.35)
    shade = np.clip(ndimage.gaussian_filter(hatch, SHADE_SIGMA) * SHADE_GAIN, 0, 1)
    shade = (np.where(figure, shade, 0) * 255).astype(np.uint8)
    shade_rgb = np.dstack([shade, np.zeros_like(shade), np.zeros_like(shade)])

    # the head stays the plain body's own (the face piece lies over it; the outfit only reaches up to the collar)
    keep_base = head & (np.arange(H)[:, None] < NECK_Y) & ((fill_k == kinds.index('skin')) | (fill_k < 0))   # a fur collar stays
    base_ink = on_canvas(folder / under['files']['ink'], under['box'], (H, W), 'L')
    base_shade = on_canvas(folder / under['files']['shade'], under['box'], (H, W), 'RGB')
    fill[keep_base] = base_fill[keep_base]
    ink8[keep_base] = base_ink[keep_base]
    shade_rgb[keep_base] = base_shade[keep_base]

    drawn = (fill[..., 3] > 0) | (ink8 > 8)
    ys, xs = np.nonzero(drawn)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    crop = (slice(y0, y1), slice(x0, x1))
    name = f'outfit-{oid}'
    Image.fromarray(fill[crop]).save(folder / f'{name}.webp', lossless=True, method=6)
    i = ink8[crop]
    Image.fromarray(np.dstack([i, i, i])).save(folder / f'{name}-ink.webp', quality=86, method=6)
    Image.fromarray(shade_rgb[crop]).save(folder / f'{name}-shade.webp', quality=82, method=6)
    # the collar: where the drawn cloth first reaches into the head's part; the face piece's neck goes under it (layers.js)
    cloth = head & (fill_k >= 0) & (fill_k != kinds.index('skin'))
    collar = int(np.nonzero(cloth.any(1))[0].min()) if cloth.any() else None
    used = sorted({kinds[k] for k in np.unique(fill_k[fill_k >= 0])}, key=kinds.index)
    return {'id': f'outfit/{oid}', 'slot': 'outfit', 'label': o['label'], 'period': o['period'], 'kinds': used,
            'box': [x0, y0, x1 - x0, y1 - y0], **({'collar': collar} if collar else {}), 'made': 'kit_outfit_ink.py',
            'files': {'fill': f'{name}.webp', 'ink': f'{name}-ink.webp', 'shade': f'{name}-shade.webp'}}


def main() -> None:
    args = sys.argv[1:] or [x for oid, o in S.OUTFITS.items() if 'drawing' in o for x in (oid, str(HERE / o['drawing']))]
    kit_path = KIT / 'kit.json'
    kit = json.loads(kit_path.read_text())
    for oid, drawing in zip(args[::2], args[1::2]):
        entry = build(oid, Path(drawing), kit)
        body = next(b for b in kit['bodies'] if b['id'] == S.OUTFITS[oid]['body'])
        at = next(i for i, p in enumerate(body['pieces']) if p['id'] == entry['id'])
        body['pieces'][at] = entry
        old_svg = KIT / body['id'] / f'outfit-{oid}.svg'
        if old_svg.exists():
            old_svg.unlink()
        print(entry['id'], entry['box'], entry['kinds'])
    kit_path.write_text(json.dumps(kit, indent=1))


if __name__ == '__main__':
    main()

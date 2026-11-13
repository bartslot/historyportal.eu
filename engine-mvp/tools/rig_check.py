#!/usr/bin/env python3
"""Does a ChatGPT part sheet line up with its rest drawing? (vault topics/character-bones/plan.md, 2.4)

A sheet is a folder: rest.png (on #00FF00) and pictures made by editing it on the same canvas: map.png (flat colours on
black), under-a.png / under-b.png / under-c.png (what the arms, the outer clothes or the shawl hide), map-b.png (the thighs), face/*.png (edits of
head-base.png, boxes in face/boxes.json). Parts drawn apart never fit (Pieter, 11-05), so every edit is measured against
the rest drawing before anything is cut. A missing file is a failed line, never a skipped one. Writes check.json and
check.png in the folder and prints one line per check.

usage: rig_check.py SHEET_DIR
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

from img_io import find, save as save_image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'artkit'))
from green_key import key  # noqa: E402
from rig_face import STRONG, BOX_REACH  # noqa: E402

# The part map's colours (plan 2.2). Black is the air: green would be read as the background of a rest drawing.
PALETTE = {
    'head': (255, 0, 255), 'braid': (255, 128, 0), 'chest': (0, 255, 255), 'shawl': (255, 255, 0), 'skirt': (128, 128, 128),
    'upperarm_n': (255, 0, 0), 'forearm_n': (128, 0, 0), 'upperarm_f': (0, 0, 255), 'forearm_f': (0, 0, 128),
    'shin_n': (0, 128, 0), 'foot_n': (128, 255, 0), 'shin_f': (0, 128, 128), 'foot_f': (0, 128, 255),
    'thigh_n': (64, 64, 0), 'thigh_f': (0, 64, 64), 'other': (255, 255, 255),
}
MAP_PARTS = [n for n in PALETTE if not n.startswith('thigh') and n != 'other']
MAP_B_PARTS = ['thigh_n', 'thigh_f', 'shin_n', 'shin_f', 'foot_n', 'foot_f', 'other']
AIR = (0, 0, 0)
OFF_COLOUR = 60          # RGB distance: further than this from every palette colour is a smeared pixel
SOLID = 0.5              # keyed alpha this high is the figure
GREEN_LEAN = 2.0         # green this many times red and blue: green-leaning, for a pocket's dark edge
PURE_GREEN = 110         # RGB distance from #00FF00: background, even in a pocket the figure encloses
INK = 90                 # luminance below this is a drawn line
LINE_REACH = 2           # px a line may sit off and still count as the same line
MAX_SHIFT = 6            # px of pure translation searched for and corrected (and logged); at the limit it is a failed edit
BORDER = 2               # px from where two parts meet: an off-colour pixel there is the map's anti-aliasing, not a smear
SPECK_PX = 300           # a stray piece of a part smaller than this is a speck; bigger is a real piece (belt tassels)
SLIVER = 3               # px: no thicker than this from its middle to its edge, and long, a piece is a sliver
SLIVER_LENGTH = 6        # a sliver is at least this many times as long as it is wide: long, not a dot
RIM = 2                  # px of the map's outer edge that are blends with the black (red + black reads as dark red)
ABSORB_ROUNDS = 5        # passes of absorb_islands; it stops sooner when nothing moves
DOT_PX = 20              # px: a piece this small where parts meet is an anti-aliased blend
ISLAND_PX = 150          # px: the biggest piece absorb_islands folds into a neighbour (Ana's fringe gaps: up to ~100)
ISLAND_RING = 0.6        # share of a small piece's border (the air not counted) that one other part must hold to take it
FACE_SCALE = 1024        # px: the head crop the face pixel floors are written for; other sizes scale by area
FAR = 3                  # px: drawn and map paint further apart than this is a part left out, or paint on the air

PASS = {'far': 0.002, 'off_colour': 0.005, 'speck': 0.002, 'shift': 2.0, 'region_iou': 0.97, 'line_kept': 0.90,
        'face_outside': 0.05, 'face_inside_px': 300, 'face_edge_px': 3}

# What an edit must leave alone, by the rest map's parts: its outline (IoU) and its drawn lines. under-a takes the arms
# off, under-b the shawl and the skirt. The cutter takes every visible pixel from rest, so under-b may re-ink the shins:
# only their outline has to meet its thighs at the hem. Ana's under-b (11-13) re-inked the feet and sleeves lighter with
# the outline in place (IoU 0.99): lines are judged on the head only, where the neck's hidden paint meets the drawing.
KEEP = {
    'under-a.png': (['head', 'shin_n', 'shin_f', 'foot_n', 'foot_f'], ['head', 'shin_n', 'shin_f', 'foot_n', 'foot_f']),
    'under-b.png': (['head', 'shin_n', 'shin_f', 'foot_n', 'foot_f'], ['head']),
    # under-c takes the shawl off (what the chest and skirt show when the shawl swings with a turned chest)
    'under-c.png': (['head', 'upperarm_n', 'forearm_n', 'shin_n', 'shin_f', 'foot_n', 'foot_f'],
                    ['head', 'upperarm_n', 'forearm_n', 'shin_n', 'shin_f', 'foot_n', 'foot_f']),
}


def rgb_of(path):
    return np.asarray(Image.open(path).convert('RGB'))


def keyed(rgb):
    """(clean rgb, alpha 0..1) of a picture on #00FF00. green_key keeps an enclosed green pocket as paint (a leaf, for
    a scene); a character sheet has no pure green in it, so a pocket of the background caught inside a hand (Ana's near
    palm, 11-13) goes too."""
    c, a = key(rgb)
    f = rgb.astype(float)
    pure = np.linalg.norm(f - (0, 255, 0), axis=-1) < PURE_GREEN
    # the pocket's shadowed edge is dark green, (5, 24, 1): kept as ink by the key. A green-leaning region the figure
    # encloses (it never reaches the background round the figure) that holds some pure green is background as a whole;
    # the anti-aliased edge of an outline touches the outer background, so outlines keep their weight.
    leaning = (f[..., 1] > GREEN_LEAN * np.maximum(f[..., 0], f[..., 2])) & (f[..., 1] > 15)
    outside, _ = ndi.label(a <= 0)
    border_ids = np.unique(np.concatenate([outside[0], outside[-1], outside[:, 0], outside[:, -1]]))
    outer = np.isin(outside, border_ids[border_ids > 0])
    found, k = ndi.label(leaning)
    if k:
        touches_outer = np.zeros(k + 1, bool)
        touches_outer[np.unique(found[ndi.binary_dilation(outer) & leaning])] = True
        has_pure = np.zeros(k + 1, bool)
        has_pure[np.unique(found[pure & leaning])] = True
        pocket = (found > 0) & has_pure[found] & ~touches_outer[found]
    else:
        pocket = np.zeros_like(pure)
    return c, np.where(pure | pocket, 0.0, a)


def figure_of(path):
    """A picture on green as (clean rgb, solid mask)."""
    c, a = keyed(rgb_of(path))
    return c, a > SOLID


def labels_of(map_rgb, names):
    """Each pixel's part (index into names), -1 for the air; and the share of the figure's pixels that are off every colour
    away from a border between parts (a smear; on a border it is only anti-aliasing, and the nearest colour is right)."""
    colours = np.array([AIR] + [PALETTE[n] for n in names], float)
    d = np.sqrt(((map_rgb[..., None, :].astype(float) - colours) ** 2).sum(-1))
    nearest = d.argmin(-1)
    figure = nearest > 0
    border = ndi.binary_dilation(ndi.morphological_gradient(nearest, size=3) > 0, iterations=BORDER)
    off = figure & (d.min(-1) > OFF_COLOUR) & ~border
    return nearest - 1, float(off.sum() / max(figure.sum(), 1))


def clean_labels(labels, solid):
    """The map's parts on the drawing itself: the map's outer rim (blends with black) and every drawn pixel the map missed
    take the nearest part painted inside the rim. The phase 2 cutter must import this, so it cuts by what was checked."""
    figure = labels >= 0
    rim = figure & (ndi.distance_transform_edt(figure) <= RIM)
    sure = figure & ~rim
    if not sure.any():
        return np.where(solid, labels, -1)
    iy, ix = ndi.distance_transform_edt(~sure, return_distances=False, return_indices=True)
    return np.where(solid, labels[iy, ix], -1)


def absorb_islands(labels, islands=True):
    """Small pieces of a part (under SPECK_PX) that touch other parts join the part around them: cloth showing between a
    shawl's fringe strands moves with the shawl, and a 1-3 px dot where three parts meet (an anti-aliased blend that reads
    as a fourth colour: cyan + yellow = lime) joins its most common neighbour. A piece needs ISLAND_RING of its border
    (air not counted) on one part and must be under ISLAND_PX, unless it is a dot under DOT_PX: a bigger patch of the wrong
    colour is a smear for specks() to count, never repaired quietly. Wisps floating in the air stay with their part.
    The phase 2 cutter must import clean_labels and absorb_islands from here, so it cuts by what was checked.
    Dots go first, then pieces, again until nothing moves: a dot joining a piece changes that piece's border.
    islands=False joins dots only: the cutter keeps cloth between fringe strands with the cloth behind (the map was
    right), or it would swing with the shawl as pale streaks (Ana, chest turned, 11-13)."""
    out = labels.copy()
    for _ in range(ABSORB_ROUNDS):
        changed = False
        for dots_only in (True, False):
            for part in np.unique(out[out >= 0]):
                found, k = ndi.label(out == part)
                sizes = ndi.sum(out == part, found, range(1, k + 1))
                if not dots_only and not islands:
                    continue
                for i in np.flatnonzero(sizes < (DOT_PX if dots_only else SPECK_PX)) + 1:
                    piece = found == i
                    ring = out[ndi.binary_dilation(piece) & ~piece]
                    ring = ring[(ring >= 0) & (ring != part)]
                    if not ring.size:
                        continue
                    values, counts = np.unique(ring, return_counts=True)
                    if dots_only or (sizes[i - 1] < ISLAND_PX and counts.max() >= ISLAND_RING * ring.size):
                        out[piece] = values[counts.argmax()]
                        changed = True
        if not changed:
            break
    return out


def iou(a, b):
    return float((a & b).sum() / max((a | b).sum(), 1))


def far_apart(drawn, painted):
    """(drawn px the map left out, map paint on the air): each as a share of the drawing, beyond FAR px from the other."""
    total = max(drawn.sum(), 1)
    missed = drawn & (ndi.distance_transform_edt(~painted) > FAR)
    extra = painted & (ndi.distance_transform_edt(~drawn) > FAR)
    return float(missed.sum() / total), float(extra.sum() / total)


def specks(labels, names):
    """Per part: the share of its pixels in stray blobs smaller than SPECK_PX that touch another part (a smear of the map),
    its slivers (thin AND long: cloth between fringe strands), and how many real pieces it has."""
    out = {}
    for i, n in enumerate(names):
        m = labels == i
        if not m.any():
            continue
        found, k = ndi.label(m)
        sizes = ndi.sum(m, found, range(1, k + 1))
        thick = ndi.maximum(ndi.distance_transform_edt(m), found, range(1, k + 1))
        width = 2 * np.maximum(thick, 1)
        sliver = (thick <= SLIVER) & (sizes >= SLIVER_LENGTH * width ** 2)   # size = width x length
        others = ndi.binary_dilation(m) & ~m & (labels >= 0)
        touching = np.zeros(k + 1, bool)
        touching[np.unique(found[ndi.binary_dilation(others) & m])] = True
        blob = (sizes < SPECK_PX) & ~sliver & touching[1:]   # a wisp in the air is drawing, not a smear
        out[n] = {'speck': float(sizes[blob].sum() / sizes.sum()), 'slivers': int(((sizes < SPECK_PX) & sliver).sum()),
                  'pieces': int((sizes >= SPECK_PX).sum())}
    return out


def moved(img, dy, dx):
    return np.roll(np.roll(img, dy, axis=0), dx, axis=1)


def shift_between(a, b, region):
    """(dy, dx) within MAX_SHIFT that moves b onto a best, inside region: the best IoU over every shift. Phase correlation
    was tried first and found 0 for a 3 px shift, because the region's own edges are the same in both masked pictures."""
    if not region.any():
        return 0, 0
    ys, xs = np.where(ndi.binary_dilation(region, iterations=MAX_SHIFT))
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    a, region = a[y0:y1, x0:x1] & region[y0:y1, x0:x1], region[y0:y1, x0:x1]
    best, best_iou = (0, 0), -1.0
    for dy in range(-MAX_SHIFT, MAX_SHIFT + 1):
        for dx in range(-MAX_SHIFT, MAX_SHIFT + 1):
            score = iou(a, moved(b, dy, dx)[y0:y1, x0:x1] & region)
            if score > best_iou + 1e-9 or (abs(score - best_iou) <= 1e-9 and abs(dy) + abs(dx) < abs(best[0]) + abs(best[1])):
                best, best_iou = (dy, dx), score
    return best


def ink_of(rgb, solid):
    """The drawn lines of a figure. Only on the figure: key() turns the green around it black, which is not a line."""
    return (rgb.astype(float) @ np.array([0.299, 0.587, 0.114]) < INK) & solid


def line_kept(ink_a, ink_b, region):
    """Share of a's lines in the region that b also draws, within LINE_REACH px."""
    lines = ink_a & region
    if not lines.any():
        return 1.0
    near = ndi.binary_dilation(ink_b, iterations=LINE_REACH)
    return float((lines & near).sum() / lines.sum())


def check_edit(rest_rgb, rest_solid, rest_labels, path, keep):
    """An under pass against the rest drawing, on the parts it must keep: (outline parts, line parts)."""
    rgb, solid = figure_of(path)
    if solid.shape != rest_solid.shape:
        return {'size': list(solid.shape)}, rgb, solid
    region_of = lambda parts: ndi.binary_dilation(np.isin(rest_labels, [MAP_PARTS.index(n) for n in parts]), iterations=4)
    region, lines = region_of(keep[0]), region_of(keep[1])
    dy, dx = shift_between(rest_solid, solid, region)
    if dy or dx:
        rgb, solid = moved(rgb, dy, dx), moved(solid, dy, dx)
    return {
        'shift': [int(dy), int(dx)], 'shift_px': float(np.hypot(dy, dx)), 'corrected': bool(dy or dx),
        'at_limit': max(abs(dy), abs(dx)) >= MAX_SHIFT, 'region_empty': not region.any(),
        'region_iou': iou(rest_solid & region, solid & region),
        'line_kept': line_kept(ink_of(rest_rgb, rest_solid), ink_of(rgb, solid), lines & rest_solid),
    }, rgb, solid


def signed_pieces(folder):
    """map-pieces.json: {part: pieces} a person has looked at and found real (belt tassels below a shawl). A part in more
    big pieces than signed fails: a patch of the wrong colour too big to be a speck looks exactly like a real piece."""
    path = os.path.join(folder, 'map-pieces.json')
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)


def check_map(map_path, names, solid, signed=None):
    """A part map against the figure it paints: (report, cleaned labels)."""
    map_rgb = rgb_of(map_path)
    if map_rgb.shape[:2] != solid.shape:
        return {'size': list(map_rgb.shape[:2])}, np.full(solid.shape, -1)
    labels, off = labels_of(map_rgb, names)
    clean = absorb_islands(clean_labels(labels, solid))
    sp = specks(clean, names)
    missed, extra = far_apart(solid, labels >= 0)
    return {'iou': iou(labels >= 0, solid), 'far_miss': missed, 'far_extra': extra, 'off_colour': off, 'specks': sp,
            'worst_speck': max((v['speck'] for v in sp.values()), default=0.0),
            'missing': [n for n in names if n not in sp],
            'unsigned': [n for n, v in sp.items() if v['pieces'] > (signed or {}).get(n, 1)]}, clean


def real_change(base, edit):
    """Where an edit really drew something: stronger than STRONG (rig_face.py's measure, so a pasted box's tone drift
    is not drawing) against the base nudged by up to 1 px every way. ChatGPT re-renders the whole head and moves every fine
    hair line by a fraction of a pixel (Ana's eyes-half: 21% of its 'change' was that); a new stroke differs under every
    nudge."""
    base, edit = base.astype(int), edit.astype(int)
    least = np.min([np.abs(edit - moved(base, dy, dx)).max(-1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)], axis=0)
    return ndi.binary_opening(least > STRONG, iterations=1)


def check_face(base_rgb, path, box):
    """A face switch changes its own box and leaves the rest of the head as it was, and its change does not run into the
    box's edge, or rig_face.py would cut it off there (a raised brow above a tight box). outside is a share of the change
    itself, so one redrawn eye counts however big the head is; at_edge counts pixels, since one thin brow line crossing the
    edge is only a handful of them."""
    rgb = rgb_of(path)
    if rgb.shape != base_rgb.shape:
        rgb = np.asarray(Image.fromarray(rgb).resize(base_rgb.shape[1::-1], Image.LANCZOS))
    changed = real_change(base_rgb, rgb)
    y0, y1, x0, x1 = box
    box_only = np.zeros_like(changed)
    box_only[max(0, y0):y1, max(0, x0):x1] = True
    reach = np.zeros_like(changed)
    reach[max(0, y0 - BOX_REACH):y1 + BOX_REACH, max(0, x0 - BOX_REACH):x1 + BOX_REACH] = True
    edge = reach & ~ndi.binary_erosion(reach, iterations=2, border_value=1)
    total = max(changed.sum(), 1)
    head = (base_rgb.shape[0] / FACE_SCALE) ** 2   # the pixel floors are for a 1024 px head crop
    return {'outside': float((changed & ~reach).sum() / total), 'inside': float((changed & box_only).sum() / head),
            'at_edge': float((changed & edge).sum() / head)}


def face_boxes(folder):
    """The boxes written for this head (face/boxes.json), or None."""
    written = os.path.join(folder, 'face', 'boxes.json')
    if not os.path.exists(written):
        return None
    with open(written) as f:
        return {k: tuple(v) for k, v in json.load(f).items()}


def check_faces(folder):
    """Every face edit against head-base.png: {file: result}, or {file: {'no_box': group}}."""
    base_rgb = rgb_of(find(os.path.join(folder, 'head-base.png')))
    boxes = face_boxes(folder) or {}
    out = {}
    face_dir = os.path.join(folder, 'face')
    for file in sorted(os.listdir(face_dir)) if os.path.isdir(face_dir) else []:
        if not file.endswith(('.png', '.webp')):
            continue
        group = file.split('-')[0]
        out[file] = check_face(base_rgb, os.path.join(face_dir, file), boxes[group]) if group in boxes else {'no_box': group}
    return out


def map_lines(label, m):
    if 'size' in m:
        return [(f'{label} has the drawing\'s size', str(m['size']), False)]
    return [(f'{label}: drawn px further than {FAR} px from its paint (raw IoU {m["iou"]:.4f})', m['far_miss'], m['far_miss'] <= PASS['far']),
            (f'{label}: paint further than {FAR} px from the drawing', m['far_extra'], m['far_extra'] <= PASS['far']),
            (f'{label} off-colour share', m['off_colour'], m['off_colour'] <= PASS['off_colour']),
            (f'{label} parts whole (worst speck share)', m.get('worst_speck', 0.0), m.get('worst_speck', 0.0) <= PASS['speck']),
            (f'{label} parts present (missing: {",".join(m["missing"]) or "none"})', len(m['missing']), not m['missing']),
            (f'{label} parts in several big pieces, each signed off in map-pieces.json after a look: {several_pieces(m) or "none"}',
             len(m['unsigned']), not m['unsigned'])]


def several_pieces(m):
    """Parts the map paints in more than one big piece: real (belt tassels) or a smear too big to be a speck."""
    return ','.join(f'{n}({v["pieces"]})' for n, v in m['specks'].items() if v['pieces'] > 1)


def edit_lines(name, e):
    if 'size' in e:
        return [(f'{name} has the drawing\'s size', str(e['size']), False)]
    return [(f'{name} shift px (corrected: {e["corrected"]})', e['shift_px'], not e['at_limit']),
            (f'{name} kept parts found on the map', int(not e['region_empty']), not e['region_empty']),
            (f'{name} kept parts (IoU)', e['region_iou'], e['region_iou'] >= PASS['region_iou']),
            (f'{name} lines kept', e['line_kept'], e['line_kept'] >= PASS['line_kept'])]


def face_lines(name, f):
    if 'no_box' in f:
        return [(f'face {name} has a box for "{f["no_box"]}" in face/boxes.json', 0, False)]
    return [(f'face {name}: share of its change outside its box', f['outside'], f['outside'] <= PASS['face_outside']),
            (f'face {name} changed px inside its box (px at a 1024 head; a pressed lip is ~900)', f['inside'], f['inside'] >= PASS['face_inside_px']),
            (f'face {name}: changed px at the box edge (at a 1024 head)', f['at_edge'], f['at_edge'] <= PASS['face_edge_px'])]


def grade(report):
    """Each check: (what, value, pass). A file the sheet needs and lacks is a failed line."""
    lines = [(f'{name} is there', 0, False) for name in report['absent']]
    if 'map' in report:
        lines += map_lines('map', report['map'])
    for name, e in report['edits'].items():
        lines += edit_lines(name, e)
    if 'map_b' in report:
        lines += map_lines('map-b', report['map_b'])
    if report.get('faces') == {}:
        lines.append(('face edits are there', 0, False))
    for name, f in report.get('faces', {}).items():
        lines += face_lines(name, f)
    return lines


def tinted(rgb, solid, colour):
    out = rgb.astype(float).copy()
    out[solid] = out[solid] * 0.5 + np.array(colour) * 0.5
    return out.clip(0, 255).astype(np.uint8)


def run(folder):
    at = lambda name: str(find(os.path.join(folder, name)))   # a sheet may be .webp (ours) or .png (ChatGPT's)
    needed = ['rest.png', 'map.png', 'under-a.png', 'under-b.png', 'under-c.png', 'map-b.png', 'head-base.png', 'face/boxes.json']
    report, tiles = {'absent': [n for n in needed if not os.path.exists(at(n))], 'edits': {}}, []
    if 'rest.png' in report['absent']:
        return finish(folder, report, tiles)
    rest_rgb, rest_solid = figure_of(at('rest.png'))
    if 'map.png' not in report['absent']:
        report['map'], rest_labels = check_map(at('map.png'), MAP_PARTS, rest_solid, signed_pieces(folder).get('map'))
        tiles.append(tinted(rest_rgb, (rest_labels >= 0) ^ rest_solid, (255, 0, 0)))
        for name, keep in KEEP.items():
            if name not in report['absent']:
                report['edits'][name], rgb, solid = check_edit(rest_rgb, rest_solid, rest_labels, at(name), keep)
                if solid.shape == rest_solid.shape:
                    tiles.append(tinted(rgb, solid ^ rest_solid, (255, 0, 0)))
    if 'map-b.png' not in report['absent'] and 'under-b.png' not in report['absent']:
        report['map_b'], _ = check_map(at('map-b.png'), MAP_B_PARTS, figure_of(at('under-b.png'))[1], signed_pieces(folder).get('map-b'))
    if 'head-base.png' not in report['absent'] and 'face/boxes.json' not in report['absent']:
        report['faces'] = check_faces(folder)
    return finish(folder, report, tiles)


def finish(folder, report, tiles):
    lines = grade(report)
    report['lines'] = [{'check': c, 'value': v, 'pass': bool(p)} for c, v, p in lines]
    report['pass'] = bool(lines) and all(p for _, _, p in lines)
    with open(os.path.join(folder, 'check.json'), 'w') as f:
        json.dump(report, f, indent=1, default=float)
    if tiles:
        h = max(t.shape[0] for t in tiles)
        save_image(np.hstack([np.pad(t, ((0, h - t.shape[0]), (0, 0), (0, 0))) for t in tiles]), os.path.join(folder, 'check.webp'))
    for c, v, p in lines:
        print(f'{"PASS" if p else "FAIL"}  {c}: {v:.4f}' if isinstance(v, float) else f'{"PASS" if p else "FAIL"}  {c}: {v}')
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder')
    report = run(ap.parse_args().folder)
    sys.exit(0 if report['pass'] else 1)


if __name__ == '__main__':
    main()

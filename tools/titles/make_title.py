#!/usr/bin/env python3
"""
Comic title poster generator: a recipe (resources/lessons/titles/{group}.json) in, a poster folder
out (poster.json + letter SVGs + mask.svg + outlines.svg + picture WebPs), in the shape
App\\Support\\TitlePoster and resources/js/title-poster.js already read.

    python3 make_title.py RECIPE.json OUT_DIR BASE_DIR GROUP

BASE_DIR is the repo root that the recipe's file paths are relative to. The recipe's shape is
checked by the artisan command (titles:make); this only fails on what it can see while building
(a row whose letter count does not match its text, a missing glyph). Errors go to stderr, exit 1.

Deterministic: every number is rounded and every file is written in a fixed order, so the same
recipe and art give byte-identical files.

Geometry, all in FRAME units (H = 1000 = the first row's letter height):
  rows stack top to bottom, each centred on x = 0; the gap after row 0 holds the live subtitle.
  The frame is the letters' box padded so the letters fill `focus_width` % of its width (or
  `focus_height` % of its height when the title is tall), at `aspect` (w / h).
"""
import hashlib
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from PIL import Image

H = 1000.0
MAX_PX = 2880
WEBP_QUALITY = 80

DEFAULTS = {
    'aspect': 1.5314,          # Bart's Tasman frame, 8696 x 5679
    'focus_width': 80.0,       # % of the frame width the letters fill
    'focus_height': 60.0,      # ... at most this % of its height
    'outline': 0.04,           # visible outline ring, share of H
    'shadow': [0.065, 0.06],   # hard shadow offset x, y, share of H
    'row_gap': 0.5,            # gap between rows (holds the subtitle), share of H
    'subtitle': {'size': 2.3, 'color': '#FFFFFF', 'width': 52.0},
}


class RecipeError(Exception):
    pass


def num(v):
    """Fixed rounding for every number written, so output is byte-stable."""
    r = round(float(v), 4)
    return 0.0 if r == 0 else r


def path_to(d_draw, matrix):
    """Run a drawing (a callable that draws into a pen) through an affine matrix; return (d, bounds)."""
    svg = SVGPathPen(None, ntos=lambda x: ('%.2f' % x).rstrip('0').rstrip('.'))
    d_draw(TransformPen(svg, matrix))
    bounds = BoundsPen(None)
    d_draw(TransformPen(bounds, matrix))
    return svg.getCommands(), bounds.bounds


# ── letter sources: each returns rows of letters {draw, bounds} in a y-down source space ──────────

def wordmark_rows(svg_path):
    root = ET.parse(svg_path).getroot()
    seen, letters = set(), []
    for el in root.iter():
        if not el.tag.endswith('}path') and el.tag != 'path':
            continue
        d = el.get('d')
        if not d or d in seen:          # a wordmark may draw each letter twice (fill, then stroke)
            continue
        if el.get('transform'):
            raise RecipeError(f'{svg_path}: transformed paths are not supported; flatten the wordmark first.')
        seen.add(d)
        draw = (lambda dd: lambda pen: parse_path(dd, pen))(d)
        b = BoundsPen(None)
        draw(b)
        letters.append({'draw': draw, 'bounds': b.bounds, 'evenodd': el.get('fill-rule') == 'evenodd'})

    # Rows: a letter joins the row whose vertical span holds its centre.
    rows = []
    for L in sorted(letters, key=lambda l: (l['bounds'][1], l['bounds'][0])):
        cy = (L['bounds'][1] + L['bounds'][3]) / 2
        for row in rows:
            if row['top'] <= cy <= row['bottom']:
                row['letters'].append(L)
                row['top'] = min(row['top'], L['bounds'][1])
                row['bottom'] = max(row['bottom'], L['bounds'][3])
                break
        else:
            rows.append({'top': L['bounds'][1], 'bottom': L['bounds'][3], 'letters': [L]})
    return [sorted(r['letters'], key=lambda l: l['bounds'][0]) for r in rows]


def pair_kerning(font):
    """{(left, right): x advance change} from the font's GPOS pair positioning (glyph pairs and
    class pairs), so a title set from a font is kerned as it would be in a browser."""
    kern = {}
    if 'GPOS' not in font:
        return kern
    order = font.getGlyphOrder()
    for lookup in font['GPOS'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            if lookup.LookupType == 9:          # extension: the real subtable sits inside
                if st.ExtensionLookupType != 2:
                    continue
                st = st.ExtSubTable
            elif lookup.LookupType != 2:
                continue
            if st.Format == 1:
                for first, pset in zip(st.Coverage.glyphs, st.PairSet):
                    for rec in pset.PairValueRecord:
                        v = getattr(rec.Value1, 'XAdvance', 0) if rec.Value1 else 0
                        if v:
                            kern.setdefault((first, rec.SecondGlyph), v)
            elif st.Format == 2:
                c1, c2 = st.ClassDef1.classDefs, st.ClassDef2.classDefs
                for first in st.Coverage.glyphs:
                    rec1 = st.Class1Record[c1.get(first, 0)]
                    for second in order:
                        rec = rec1.Class2Record[c2.get(second, 0)]
                        v = getattr(rec.Value1, 'XAdvance', 0) if rec.Value1 else 0
                        if v:
                            kern.setdefault((first, second), v)
    return kern


def font_rows(font_path, texts):
    from fontTools.ttLib import TTFont
    font = TTFont(font_path)
    cmap, glyphs = font.getBestCmap(), font.getGlyphSet()
    kern = pair_kerning(font)
    rows = []
    for text in texts:
        x, row, prev = 0.0, [], None
        for ch in text:
            name = cmap.get(ord(ch))
            if name is None:
                raise RecipeError(f'{font_path} has no glyph for "{ch}".')
            g = glyphs[name]
            x += kern.get((prev, name), 0)
            prev = name
            if not ch.isspace():
                # Font units are y-up; flip into the y-down source space.
                draw = (lambda gg, dx: lambda pen: gg.draw(TransformPen(pen, (1, 0, 0, -1, dx, 0))))(g, x)
                b = BoundsPen(glyphs)
                draw(b)
                if b.bounds:
                    row.append({'draw': draw, 'bounds': b.bounds, 'evenodd': False})
            x += g.width
        rows.append(row)
    return rows


def letter_ids(text, count):
    """Ids unique across the whole poster: a, b, ... and a1, a2 for repeats (as Bart's Tasman)."""
    ids = []
    for ch in re.sub(r'\s+', '', text).lower():
        base = re.sub(r'[^a-z0-9]', 'x', ch)
        n = count.get(base, 0)
        ids.append(base if n == 0 else f'{base}{n}')
        count[base] = n + 1
    return ids


# ── layout ───────────────────────────────────────────────────────────────────────────────────────

def layout(recipe, base):
    src = recipe['letters']
    texts = [r['text'] for r in recipe['rows']]
    if 'wordmark' in src:
        rows = wordmark_rows(os.path.join(base, src['wordmark']))
        if len(rows) != len(texts):
            raise RecipeError(f"The wordmark has {len(rows)} row(s) of letters, the recipe names {len(texts)}.")
        # One scale for the whole wordmark: its rows keep their relative sizes.
        ref = rows[0]
        ref_h = max(l['bounds'][3] for l in ref) - min(l['bounds'][1] for l in ref)
        scales = [H / ref_h] * len(rows)
    else:
        rows = font_rows(os.path.join(base, src['font']), texts)
        scales = []
        for r in rows:
            h = max(l['bounds'][3] for l in r) - min(l['bounds'][1] for l in r)
            scales.append(H / h)

    placed, y, count = [], 0.0, {}
    for i, (letters, rdef) in enumerate(zip(rows, recipe['rows'])):
        ids = letter_ids(rdef['text'], count)
        if len(ids) != len(letters):
            raise RecipeError(f'Row {i} "{rdef["text"]}" has {len(ids)} letters but its source has {len(letters)} shapes.')
        s = scales[i] * float(rdef.get('scale', 1.0))
        tracking = float(rdef.get('tracking', 0.0)) * H
        x0 = min(l['bounds'][0] for l in letters)
        top = min(l['bounds'][1] for l in letters)
        bottom = max(l['bounds'][3] for l in letters)
        # Row width with tracking, so the row can be centred on x = 0.
        width = (max(l['bounds'][2] for l in letters) - x0) * s + tracking * (len(letters) - 1)
        out = []
        for k, (lid, L) in enumerate(zip(ids, letters)):
            m = (s, 0, 0, s, -x0 * s - width / 2 + k * tracking, y - top * s)
            d, b = path_to(L['draw'], m)
            out.append({'id': lid, 'd': d, 'bounds': b, 'evenodd': L['evenodd']})
        row_h = (bottom - top) * s
        placed.append({'letters': out, 'top': y, 'bottom': y + row_h, 'def': rdef})
        y += row_h + float(recipe.get('row_gap', DEFAULTS['row_gap'])) * H
    return placed


def union(boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


# ── writers ──────────────────────────────────────────────────────────────────────────────────────

def svg_doc(view, body):
    x, y, w, h = view
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{num(x)} {num(y)} {num(w)} {num(h)}" '
            f'width="{num(w)}" height="{num(h)}" preserveAspectRatio="none" fill="none">\n{body}</svg>\n')


def fill_rule(L):
    return ' fill-rule="evenodd"' if L['evenodd'] else ''


def letter_svg(L, row, outline):
    pad = outline / 2 + 1
    x0, y0, x1, y1 = L['bounds']
    view = (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)
    top, bottom = row['def']['gradient']
    body = (f'<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="{num(row["top"])}" x2="0" y2="{num(row["bottom"])}">'
            f'<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient></defs>\n'
            f'<path d="{L["d"]}"{fill_rule(L)} fill="url(#g)" stroke="#000" stroke-width="{num(outline)}" stroke-linejoin="round"/>\n')
    return view, svg_doc(view, body)


def save_picture(p, base, out_dir, written):
    """Write a recipe picture as WebP: crop, cap at MAX_PX, q80, alpha kept. Returns (file name, (w, h))."""
    art = os.path.join(base, p['art'])
    im = Image.open(art)
    im.load()
    crop = p.get('crop')
    if crop:
        im = im.crop((crop[0], crop[1], crop[0] + crop[2], crop[1] + crop[3]))
    if max(im.size) > MAX_PX:
        f = MAX_PX / max(im.size)
        im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    stem = re.sub(r'[^a-z0-9]+', '-', os.path.splitext(os.path.basename(p['art']))[0].lower()).strip('-')
    if crop:
        stem += '-' + hashlib.sha1(json.dumps(crop).encode()).hexdigest()[:6]
    name = f'{stem}.webp'
    if name not in written:
        im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
        im.save(os.path.join(out_dir, name), 'WEBP', quality=WEBP_QUALITY, method=6, exact=False)
        written.add(name)
    return name, im.size


def picture(p, rows, base, out_dir, written):
    """A scene picture placed against a row of letters. Returns its file name and frame box."""
    name, (iw, ih) = save_picture(p, base, out_dir, written)
    row = rows[int(p.get('row', 0))]
    row_h = row['bottom'] - row['top']
    at = p.get('at', 50)
    if isinstance(at, str):
        L = next((l for l in row['letters'] if l['id'] == at), None)
        if L is None:
            raise RecipeError(f'Picture {p["art"]}: row {p.get("row", 0)} has no letter "{at}" '
                              f'(it has {", ".join(l["id"] for l in row["letters"])}).')
        cx, top, bottom = (L['bounds'][0] + L['bounds'][2]) / 2, L['bounds'][1], L['bounds'][3]
        ref_h = bottom - top
    else:
        x0, _, x1, _ = union([l['bounds'] for l in row['letters']])
        cx, top, bottom, ref_h = x0 + (x1 - x0) * float(at) / 100, row['top'], row['bottom'], row_h
    h = ref_h * float(p.get('height', 100)) / 100
    w = h * iw / ih
    align = p.get('align', 'bottom')
    y = bottom - h if align == 'bottom' else top if align == 'top' else (top + bottom - h) / 2
    y += ref_h * float(p.get('dy', 0)) / 100
    cx += ref_h * float(p.get('dx', 0)) / 100
    return name, (cx - w / 2, y, w, h)


def build(recipe, base, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    outline = float(recipe.get('outline', DEFAULTS['outline'])) * H
    sx, sy = (float(v) * H for v in recipe.get('shadow', DEFAULTS['shadow']))
    rows = layout(recipe, base)

    fills = union([l['bounds'] for r in rows for l in r['letters']])
    ink = (fills[0] - outline / 2, fills[1] - outline / 2, fills[2] + outline / 2 + sx, fills[3] + outline / 2 + sy)
    ink_w, ink_h = ink[2] - ink[0], ink[3] - ink[1]
    aspect = float(recipe.get('aspect', DEFAULTS['aspect']))
    fw = ink_w / (float(recipe.get('focus_width', DEFAULTS['focus_width'])) / 100)
    fh = fw / aspect
    max_h = float(recipe.get('focus_height', DEFAULTS['focus_height'])) / 100
    if ink_h > fh * max_h:
        fh = ink_h / max_h
        fw = fh * aspect
    # Frame origin: the ink sits centred in the frame.
    ox, oy = (ink[0] + ink[2]) / 2 - fw / 2, (ink[1] + ink[3]) / 2 - fh / 2
    pct = lambda box: {'x': num((box[0] - ox) / fw * 100), 'y': num((box[1] - oy) / fh * 100),
                       'w': num(box[2] / fw * 100), 'h': num(box[3] / fh * 100)}

    layers, groups = [], {}
    for i, row in enumerate(rows):
        g = f'row{i}'
        groups[g] = {'box': {'x': 0, 'y': 0, 'w': 100, 'h': 100}, 'shadow': {'x': num(sx), 'y': num(sy), 'color': '#000000'}}
        for L in row['letters']:
            view, doc = letter_svg(L, row, outline)
            name = f'letter-{L["id"]}.svg'
            write(out_dir, name, doc)
            layers.append({'id': L['id'], 'src': name, 'box': pct(view), 'enter': 'drop', 'group': g})

    # The scene: pictures masked into the union of the letter fills, the outline drawn back on top.
    scene = (fills[0], fills[1], fills[2] - fills[0], fills[3] - fills[1])
    paths = ''.join(f'<path d="{l["d"]}"{fill_rule(l)} fill="#000"/>\n' for r in rows for l in r['letters'])
    write(out_dir, 'mask.svg', svg_doc(scene, paths))
    strokes = ''.join(f'<path d="{l["d"]}"{fill_rule(l)} stroke="#000" stroke-width="{num(outline)}" stroke-linejoin="round"/>\n'
                      for r in rows for l in r['letters'])
    write(out_dir, 'outlines.svg', svg_doc(scene, strokes))
    groups['scene'] = {'box': pct(scene), 'mask': 'mask.svg'}

    written, ids = set(), set()
    pics = list(recipe.get('pictures', [])) + ([recipe['hero']] if recipe.get('hero') else [])
    for p in pics:
        name, box = picture(p, rows, base, out_dir, written)
        pid = p.get('id') or name[:-5]
        n, k = pid, 1
        while n in ids:
            n, k = f'{pid}-{k}', k + 1
        ids.add(n)
        layer = {'id': n, 'src': name, 'group': 'scene', 'box': pct(box), 'enter': 'fade'}
        for key in ('flip', 'rotate', 'ambient', 'ambient_speed', 'ambient_amount'):
            if key in p:
                layer[key] = p[key]
        layers.append(layer)
    layers.append({'id': 'outlines', 'src': 'outlines.svg', 'group': 'scene', 'box': pct(scene), 'enter': 'fade'})

    sub = {**DEFAULTS['subtitle'], **recipe.get('subtitle', {})}
    gap_top = rows[0]['bottom'] + outline / 2 + sy
    gap_bottom = rows[1]['top'] - outline / 2 if len(rows) > 1 else gap_top + float(recipe.get('row_gap', DEFAULTS['row_gap'])) * H
    sw = fw * float(sub['width']) / 100
    sub_box = (ox + fw / 2 - sw / 2, gap_top, sw, max(gap_bottom - gap_top, 1))

    poster = {
        'version': 1,
        'source': f'titles:make from resources/lessons/titles/{recipe["_group"]}.json',
        **candidate_meta(recipe),
        'frame': {'w': num(fw), 'h': num(fh)},
        'background': recipe['background'],
        'focus': pct((ink[0], ink[1], ink_w, ink_h)),
        'groups': groups,
        'layers': layers,
        'subtitle': {'box': pct(sub_box), 'size': num(sub['size']), 'color': sub['color']},
    }
    write(out_dir, 'poster.json', json.dumps(poster, indent=2) + '\n')


def candidate_meta(recipe):
    """How the candidate presents itself: the picker's label, place and thumbnail, and its badge layout."""
    return {key: recipe[key] for key in ('label', 'order', 'thumb', 'badges') if key in recipe}


def write(out_dir, name, text):
    with open(os.path.join(out_dir, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def main(argv):
    if len(argv) != 5:
        print(__doc__, file=sys.stderr)
        return 2
    recipe_path, out_dir, base, group = argv[1:]
    with open(recipe_path, encoding='utf-8') as f:
        recipe = json.load(f)
    recipe['_group'] = group
    try:
        if recipe.get('layout') == 'cover':
            # cover.py imports this module by name: make it this very module, so its RecipeError
            # is the one caught below.
            sys.modules.setdefault('make_title', sys.modules[__name__])
            from cover import build_cover
            build_cover(recipe, base, out_dir)
        else:
            build(recipe, base, out_dir)
    except RecipeError as e:
        print(str(e), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))

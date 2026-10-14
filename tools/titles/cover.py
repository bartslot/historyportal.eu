"""The cover layout of the title generator (recipe "layout": "cover"): a Tintin album cover.

    a full-frame painted plate (the scene), optionally a subject standing on the horizon and
    heroes seen from behind in the lower-left box with their feet below the frame edge; a small
    series line, the huge title in flat dark ink (no outline, no shadow) and the live subtitle.

Writes the same poster.json the player already reads (resources/js/title-poster.js), plus three
cover keys: "fit": "cover" (fill the view instead of letterboxing), "background_bottom" (the
colour under the frame on a tall phone) and subtitle "font".

Small lines: the series line and the live subtitle each take a "font": "comicroma" (the title
font), "lettering" (ComicRoma Lettering, our comic lettering face, Bold) or, for the subtitle only,
"comic" (Coming Soon).

Geometry: FRAME units are the plate's own pixels (after the MAX_PX cap); recipe positions are %
of the frame (x of its width, y of its height). Letters come from the recipe's font with its
kerning, one SVG per letter so they drop in one after another, as on the comic poster.
"""
import json
import os

from fontTools.ttLib import TTFont

from make_title import (RecipeError, box_list, candidate_meta, font_rows, hero_keep_clear, letter_ids, num, path_to,
                        recipe_keep_clear, save_picture, svg_doc, write)

COVER_DEFAULTS = {
    'horizon': 72.0,           # % down the frame (Tintin's red line)
    'ink': '#1B2330',
    'series': {'cap': 2.6, 'gap': 2.2},                 # cap height and gap above the title, % of frame height
    'subtitle': {'size': 2.2, 'gap': 2.4, 'font': 'comicroma'},
    'hero_bottom': 103.0,      # heroes' feet sit below the frame edge
    'bleed': 0.0,              # % the plate is scaled past each edge, room for its ambient motion
}
SUBTITLE_FONTS = ('comic', 'comicroma', 'lettering')
SERIES_FONTS = ('comicroma', 'lettering')
LETTERING_FONT = 'public/fonts/comic-lettering/ComicRomaLettering-Bold.ttf'


def cap_units(font):
    """The font's cap height in font units (OS/2), else the height of its H."""
    os2 = font['OS/2'] if 'OS/2' in font else None
    cap = getattr(os2, 'sCapHeight', 0) if os2 else 0
    if cap:
        return float(cap)
    from fontTools.pens.boundsPen import BoundsPen
    gs = font.getGlyphSet()
    b = BoundsPen(gs)
    gs[font.getBestCmap()[ord('H')]].draw(b)
    return float(b.bounds[3])


def set_line(font_path, text, cap_px, cap_units_):
    """One line of letters at a cap height in frame px. Returns letters (d, bounds) with x from 0
    and y from the cap top, and the line's ink width."""
    row = font_rows(font_path, [text])[0]
    if not row:
        raise RecipeError(f'"{text}" has no letters to draw.')
    s = cap_px / cap_units_
    # font_rows is y-down with the baseline at 0: the cap top sits at -cap.
    x0 = min(L['bounds'][0] for L in row)
    out = []
    for L in row:
        d, b = path_to(L['draw'], (s, 0, 0, s, -x0 * s, cap_px))
        out.append({'d': d, 'bounds': b})
    return out, max(L['bounds'][2] for L in out)


def place_line(letters, width, cx, top):
    """Shift a set line so its ink is centred on cx with its cap top at `top` (frame px)."""
    dx = cx - width / 2
    for L in letters:
        x0, y0, x1, y1 = L['bounds']
        L['bounds'] = (x0 + dx, y0 + top, x1 + dx, y1 + top)
        L['shift'] = (dx, top)
    return letters


def letter_file(L, ink, pad=1.0):
    x0, y0, x1, y1 = L['bounds']
    dx, dy = L['shift']
    view = (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)
    body = f'<path d="{L["d"]}" fill="{ink}" transform="translate({num(dx)} {num(dy)})"/>\n'
    return view, svg_doc(view, body)


def cut_out(p, base, out_dir, written, W, H, bottom, default_id):
    """A cut-out (hero or subject): height % of the frame, centred on x %, its bottom at `bottom` %."""
    name, (iw, ih) = save_picture(p, base, out_dir, written)
    h = H * float(p['height']) / 100
    w = h * iw / ih
    x = W * float(p.get('x', 50)) / 100 - w / 2
    y = H * bottom / 100 - h
    layer = {'id': p.get('id', default_id), 'src': name, 'box': box_pct((x, y, w, h), W, H), 'enter': 'fade'}
    for key in ('flip', 'rotate', 'ambient', 'ambient_speed', 'ambient_amount'):
        if key in p:
            layer[key] = p[key]
    return layer, (x, y, w, h)


def box_pct(box, W, H):
    x, y, w, h = box
    return {'x': num(x / W * 100), 'y': num(y / H * 100), 'w': num(w / W * 100), 'h': num(h / H * 100)}


def union(boxes):
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    return (x0, y0, max(b[0] + b[2] for b in boxes) - x0, max(b[1] + b[3] for b in boxes) - y0)


def build_cover(recipe, base, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    font_path = os.path.join(base, recipe['letters']['font'])
    font = TTFont(font_path)
    capu = cap_units(font)
    ink = recipe.get('ink', COVER_DEFAULTS['ink'])
    horizon = float(recipe.get('horizon', COVER_DEFAULTS['horizon']))
    written, layers, focus_boxes = set(), [], []
    keep = []                     # what the join QR keeps clear of (resources/js/title-qr.js)

    # The plate sets the frame: its own pixels.
    plate = recipe['plate']
    name, (W, H) = save_picture(plate, base, out_dir, written)
    bleed = float(plate.get('bleed', COVER_DEFAULTS['bleed']))
    layer = {'id': 'plate', 'src': name,
             'box': {'x': num(-bleed), 'y': num(-bleed), 'w': num(100 + 2 * bleed), 'h': num(100 + 2 * bleed)}}
    for key in ('ambient', 'ambient_speed', 'ambient_amount'):
        if key in plate:
            layer[key] = plate[key]
    layers.append(layer)          # no "enter": the painting is there from the first frame

    # The subject stands on the horizon (its waterline/feet `sink` % below it); heroes in front.
    if recipe.get('subject'):
        s = recipe['subject']
        lay, box = cut_out(s, base, out_dir, written, W, H, horizon + float(s.get('sink', 0)), 'subject')
        layers.append(lay)
        focus_boxes.append(box)
        keep.append({'box': box_list(box_pct(box, W, H)), 'kind': 'subject'})
    for i, h in enumerate(recipe.get('heroes', [])):
        lay, box = cut_out(h, base, out_dir, written, W, H, float(h.get('bottom', COVER_DEFAULTS['hero_bottom'])), f'hero-{i + 1}')
        layers.append(lay)
        focus_boxes.append(box)
        keep += hero_keep_clear(box_pct(box, W, H))

    # The title: one line, its ink `w` % of the frame wide (or `cap` % high), centred on x.
    t = recipe['title']
    probe, probe_w = set_line(font_path, t['text'], 100.0, capu)
    cap_px = (W * float(t['w']) / 100) / probe_w * 100.0 if 'w' in t else H * float(t['cap']) / 100
    title, title_w = set_line(font_path, t['text'], cap_px, capu)
    cx, top = W * float(t.get('x', 50)) / 100, H * float(t.get('y', 10)) / 100
    place_line(title, title_w, cx, top)
    count = {}
    ids = letter_ids(t['text'], count)
    for lid, L in zip(ids, title):
        view, doc = letter_file(L, ink)
        write(out_dir, f'letter-{lid}.svg', doc)
        layers.append({'id': lid, 'src': f'letter-{lid}.svg', 'box': box_pct(view, W, H), 'enter': 'drop'})
    title_box = union([(L['bounds'][0], L['bounds'][1], L['bounds'][2] - L['bounds'][0], L['bounds'][3] - L['bounds'][1]) for L in title])
    focus_boxes.append(title_box)
    keep.append({'box': box_list(box_pct(title_box, W, H)), 'kind': 'letters'})

    # The series line, small, over the title, one picture that fades in after the letters.
    sr = {**COVER_DEFAULTS['series'], **recipe.get('series', {})}
    if sr.get('font', 'comicroma') not in SERIES_FONTS:
        raise RecipeError(f'series.font must be one of: {", ".join(SERIES_FONTS)}.')
    if sr.get('text'):
        s_cap = H * float(sr['cap']) / 100
        s_path = os.path.join(base, LETTERING_FONT) if sr.get('font') == 'lettering' else font_path
        line, line_w = set_line(s_path, sr['text'], s_cap, cap_units(TTFont(s_path)))
        place_line(line, line_w, cx, top - H * float(sr['gap']) / 100 - s_cap)
        box = union([(L['bounds'][0], L['bounds'][1], L['bounds'][2] - L['bounds'][0], L['bounds'][3] - L['bounds'][1]) for L in line])
        view = (box[0] - 1, box[1] - 1, box[2] + 2, box[3] + 2)
        body = ''.join(f'<path d="{L["d"]}" fill="{ink}" transform="translate({num(L["shift"][0])} {num(L["shift"][1])})"/>\n' for L in line)
        write(out_dir, 'series.svg', svg_doc(view, body))
        layers.append({'id': 'series', 'src': 'series.svg', 'box': box_pct(view, W, H), 'enter': 'fade'})
        focus_boxes.append(box)
        keep.append({'box': box_list(box_pct(box, W, H)), 'kind': 'letters'})

    # The live subtitle: under the title, as wide as it.
    sub = {**COVER_DEFAULTS['subtitle'], **recipe.get('subtitle', {})}
    if sub['font'] not in SUBTITLE_FONTS:
        raise RecipeError(f'subtitle.font must be one of: {", ".join(SUBTITLE_FONTS)}.')
    sub_h = W * float(sub['size']) / 100 * 1.3        # size is in cqw: % of the frame width
    sub_box = (title_box[0], title_box[1] + title_box[3] + H * float(sub['gap']) / 100, title_box[2], sub_h)
    focus_boxes.append(sub_box)

    focus = recipe.get('focus')
    focus_box = (W * focus['x'] / 100, H * focus['y'] / 100, W * focus['w'] / 100, H * focus['h'] / 100) if focus else union(focus_boxes)

    poster = {
        'version': 1,
        'source': f'titles:make from resources/lessons/titles/{recipe["_group"]}-cover.json',
        **candidate_meta(recipe),
        'layout': 'cover',
        'fit': 'cover',
        'frame': {'w': num(W), 'h': num(H)},
        'background': recipe['background'],
        'background_bottom': recipe.get('background_bottom', recipe['background']),
        'horizon': num(horizon),
        'focus': box_pct(focus_box, W, H),
        'groups': {},
        'layers': layers,
        'subtitle': {'box': box_pct(sub_box, W, H), 'size': num(sub['size']), 'color': sub.get('color', ink), 'font': sub['font']},
        'keep_clear': keep + recipe_keep_clear(recipe),
    }
    write(out_dir, 'poster.json', json.dumps(poster, indent=2) + '\n')

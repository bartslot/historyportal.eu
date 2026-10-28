"""Cut painted face parts (eyes+brows, mouth) from the Figma expression sheets.

Input dir (default ~/BartsMedia/.../faces/paint): head_src.png (the stand head, 2.9x), s1/s2/s3_export.png (3x2
expression heads, Figma edits of the ORIGINAL head: s1 cell 1 is an unchanged control). Neutral = the original pixels.
Each edit re-renders the whole head a little (tone, sub-pixel), so (a) the tone offset original-vs-control is blurred and
added to every edit, and (b) a patch's alpha is only where an expression actually changes something (diff vs the control,
union over states), so nose, contour, cheeks and hair stay the sprite's own pixels.

  python3 cut_face_parts.py PAINT_DIR OUT_DIR
"""
import json, sys
import cv2
import numpy as np
from pathlib import Path

CELL, K, HEAD_AT, HEAD_BOX = 512, 2.9, (9, 31), (70, 45)     # head_src = sheet crop (70,45)+ at 2.9x, pasted at (9,31)
EYES = (290, 160, 155, 130)                                  # x, y, w, h in cell px
MOUTH = (322, 298, 128, 142)
FEATHER = 3.5
DIFF_THR, GROW, TONE_SIGMA, TONE_MAX = 44, 6, 14, 28
EDGE = 16                                                   # px the patch fades out before the rect's own border
NAMES = [['neutral', 'happy', 'worried', 'surprised', 'sad', 'angry'],
         ['determined', 'thinking', 'scared', 'proud', 'tired', 'closed'],
         ['half', 'talk_a', 'talk_ah', 'talk_wide', 'talk_oo', 'talk_smile']]
EYE_STATES = ['neutral', 'happy', 'worried', 'surprised', 'sad', 'angry', 'determined', 'thinking', 'scared', 'proud',
              'tired', 'closed', 'half']
MOUTH_STATES = ['neutral', 'happy', 'worried', 'surprised', 'sad', 'angry', 'determined', 'thinking', 'scared', 'proud',
                'tired', 'talk_a', 'talk_ah', 'talk_wide', 'talk_oo', 'talk_smile']


def rd(p): return cv2.imread(str(p))[:, :, ::-1].astype(np.float32)
def cell(img, i): return img[(i // 3) * CELL:(i // 3) * CELL + CELL, (i % 3) * CELL:(i % 3) * CELL + CELL]


def feather_alpha(w, h):
    a = np.zeros((h + 40, w + 40), np.float32)
    a[20 + 6:20 + h - 6, 20 + 6:20 + w - 6] = 1
    return cv2.GaussianBlur(a, (0, 0), FEATHER)[20:20 + h, 20:20 + w]


def head_mask(src, erode=5):
    """the head's silhouette in the cell: everything not connected to the white paper at the border (holes filled)"""
    white = (src.min(2) >= 240).astype(np.uint8)
    n, lab = cv2.connectedComponents(white)
    bg = np.isin(lab, np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) & (white > 0)
    m = cv2.erode((~bg).astype(np.uint8), np.ones((erode, erode), np.uint8)).astype(np.float32)   # stop inside the contour: the sprite's own line stays under the patch edge
    return cv2.GaussianBlur(m, (0, 0), 0.8)


def contour_ink(src, band=10):
    """the head's own outline ink (dark pixels within `band` px of the silhouette): left to the sprite, so it never rides along into another pose"""
    white = (src.min(2) >= 240).astype(np.uint8)
    n, lab = cv2.connectedComponents(white)
    bg = np.isin(lab, np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) & (white > 0)
    inside = (~bg).astype(np.uint8)
    edge = inside - cv2.erode(inside, np.ones((2 * band + 1, 2 * band + 1), np.uint8))
    dark = (src.mean(2) < 120).astype(np.uint8)
    return cv2.GaussianBlur(cv2.dilate(edge & dark, np.ones((3, 3), np.uint8)).astype(np.float32), (0, 0), 1.2)


def atlas(patches, cols, w, h):
    rows = -(-len(patches) // cols)
    out = np.zeros((rows * h, cols * w, 4), np.float32)
    for i, p in enumerate(patches):
        out[(i // cols) * h:(i // cols + 1) * h, (i % cols) * w:(i % cols + 1) * w] = p
    return out


def stand_offset(paint, stand_png):
    """Where head_src sits in the stand sprite (px): template-match the downscaled head."""
    head = cv2.imread(str(paint / 'head_src.png'))
    small = cv2.resize(head, None, fx=1 / K, fy=1 / K, interpolation=cv2.INTER_AREA)
    sp = cv2.imread(str(stand_png), cv2.IMREAD_UNCHANGED)
    a = sp[:, :, 3:4].astype(np.float32) / 255
    rgb = (sp[:, :, :3].astype(np.float32) * a + 255 * (1 - a)).astype(np.uint8)
    # the top rows of the sprite hold the head; match on the hair/forehead band only
    band = small[8:small.shape[0] // 2]
    res = cv2.matchTemplate(rgb[:200], band, cv2.TM_CCOEFF_NORMED)
    _, score, _, (x, y) = cv2.minMaxLoc(res)
    return x, y - 8, score


def region_alpha(cells, control, rect, hm):
    """where any state differs from the control inside the rect: the features, dilated and softened"""
    x, y, w, h = rect
    u = np.zeros((h, w), np.uint8)
    for n, c in cells.items():
        if n == 'neutral' or c is control:
            continue
        d = cv2.GaussianBlur(np.abs(c - control).max(2), (0, 0), 1.5)[y:y + h, x:x + w]
        u |= (d > DIFF_THR).astype(np.uint8)
    u = cv2.morphologyEx(u, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    u = cv2.dilate(u, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * GROW + 1, 2 * GROW + 1)))
    a = np.clip(cv2.GaussianBlur(u.astype(np.float32), (0, 0), FEATHER) * 1.5, 0, 1)
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.clip(np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)) / EDGE, 0, 1)
    return a * edge * hm[y:y + h, x:x + w]


def main(paint, out, stand_png):
    paint, out = Path(paint), Path(out)
    sheets = [rd(paint / f's{i}_export.png') for i in (1, 2, 3)]
    src = np.full((CELL, CELL, 3), 255, np.float32)
    h = rd(paint / 'head_src.png'); src[HEAD_AT[1]:HEAD_AT[1] + h.shape[0], HEAD_AT[0]:HEAD_AT[0] + h.shape[1]] = h
    gen = {n: cell(s, i) for s, row in zip(sheets, NAMES) for i, n in enumerate(row)}
    control = gen['neutral']
    tone = np.clip(cv2.GaussianBlur(src - control, (0, 0), TONE_SIGMA), -TONE_MAX, TONE_MAX)   # original minus the re-render, low frequency
    cells = {n: (src if n == 'neutral' else np.clip(c + tone, 0, 255)) for n, c in gen.items()}
    ci = contour_ink(src)
    hm, hm_mouth = head_mask(src) * (1 - ci), head_mask(src, 21)   # an open mouth drops the jaw past the sprite's chin: the patch stops inside the contour
    ew, eh, mw, mh = EYES[2], EYES[3], MOUTH[2], MOUTH[3]
    ea, ma = region_alpha(gen, control, EYES, hm), region_alpha(gen, control, MOUTH, hm_mouth)

    def patch(c, r, a):
        x, y, w, hh = r
        return np.dstack([c[y:y + hh, x:x + w], a[..., None] * 255])
    eyes = atlas([patch(cells[n], EYES, ea) for n in EYE_STATES], 5, ew, eh)
    mouth = atlas([patch(cells[n], MOUTH, ma) for n in MOUTH_STATES], 4, mw, mh)
    (out / 'face').mkdir(parents=True, exist_ok=True)
    for name, im in (('eyes', eyes), ('mouth', mouth)):
        bgra = np.dstack([im[..., 2], im[..., 1], im[..., 0], im[..., 3]]).clip(0, 255).astype(np.uint8)
        cv2.imwrite(str(out / 'face' / f'{name}.webp'), bgra, [cv2.IMWRITE_WEBP_QUALITY, 95])
    ox, oy, score = stand_offset(paint, stand_png)
    # cell px -> head_src px -> stand sprite px
    def to_sprite(r):
        x, y, w, hh = r
        return [round((x - HEAD_AT[0]) / K + ox, 2), round((y - HEAD_AT[1]) / K + oy, 2), round(w / K, 2), round(hh / K, 2)]
    ref = json.loads((Path(stand_png).parent.parent / 'poses.json').read_text())['poses']['stand']['face']
    meta = {'k': K, 'ref': {'eye': ref['eye'], 'mouth': ref['mouth']}, 'match': round(float(score), 3), 'origin': [ox, oy],
            'eyes': {'rect': to_sprite(EYES), 'px': [ew, eh], 'cols': 5, 'states': EYE_STATES},
            'mouth': {'rect': to_sprite(MOUTH), 'px': [mw, mh], 'cols': 4, 'states': MOUTH_STATES}}
    (out / 'face' / 'face.json').write_text(json.dumps(meta, indent=1))
    print(json.dumps(meta)[:200])
    ea_img = np.zeros((CELL, CELL), np.float32); ea_img[EYES[1]:EYES[1] + eh, EYES[0]:EYES[0] + ew] = ea
    ea_img[MOUTH[1]:MOUTH[1] + mh, MOUTH[0]:MOUTH[0] + mw] = np.maximum(ea_img[MOUTH[1]:MOUTH[1] + mh, MOUTH[0]:MOUTH[0] + mw], ma)
    cv2.imwrite(str(paint.parent / 'region_alpha.png'), (np.hstack([src, np.dstack([src[..., 0] * (1 - ea_img * .6) + 255 * ea_img * .6, src[..., 1] * (1 - ea_img * .6), src[..., 2] * (1 - ea_img * .6)])])[:, :, ::-1]).astype(np.uint8))
    # proof: every state composited on the original head (what the runtime does)
    tiles = []
    for n in MOUTH_STATES[:11] + ['closed', 'half'] + MOUTH_STATES[11:]:
        e = n if n in EYE_STATES else 'neutral'
        m = n if n in MOUTH_STATES else 'neutral'
        t = src.copy()
        for st, r, a in ((e, EYES, ea), (m, MOUTH, ma)):
            x, y, w, hh = r
            t[y:y + hh, x:x + w] = t[y:y + hh, x:x + w] * (1 - a[..., None]) + cells[st][y:y + hh, x:x + w] * a[..., None]
        tiles.append(t[130:430, 250:470])
    cols = 6
    rows = [np.hstack(tiles[i:i + cols] + [np.full_like(tiles[0], 255)] * (cols - len(tiles[i:i + cols]))) for i in range(0, len(tiles), cols)]
    cv2.imwrite(str(paint.parent / 'painted_states.png'), np.vstack(rows)[:, :, ::-1].astype(np.uint8))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])

"""Cut painted face parts (eyes+brows, mouth) from the Figma expression sheets.

Input dir (default ~/BartsMedia/.../faces/paint): head_src.png (the stand head, 2.9x), plate_sheet.png (3x2 face-free
heads), s1/s2/s3_export.png (3x2 expression heads, edits of the plate). Output: <out>/face/{eyes,mouth}.webp atlases +
face.json (rects in STAND sprite px) and a proof contact sheet. The edits are pixel-registered to the plate (verified
< 0.3 px), so a patch is the same skin plus new features: patches are cross-fadable, no tone matching needed.

  python3 cut_face_parts.py PAINT_DIR OUT_DIR
"""
import json, sys
import cv2
import numpy as np
from pathlib import Path

CELL, K, HEAD_AT, HEAD_BOX = 512, 2.9, (9, 31), (70, 45)     # head_src = sheet crop (70,45)+ at 2.9x, pasted at (9,31)
EYES = (290, 160, 155, 130)                                  # x, y, w, h in cell px
MOUTH = (330, 300, 115, 110)
FEATHER = 5.0
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


def head_mask(src):
    """the head's silhouette in the cell: everything not connected to the white paper at the border (holes filled)"""
    white = (src.min(2) >= 240).astype(np.uint8)
    n, lab = cv2.connectedComponents(white)
    bg = np.isin(lab, np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) & (white > 0)
    m = cv2.erode((~bg).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32)   # stop inside the contour: the sprite's own line stays under the patch edge
    return cv2.GaussianBlur(m, (0, 0), 0.8)


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


def main(paint, out, stand_png):
    paint, out = Path(paint), Path(out)
    plate = rd(paint / 'plate_sheet.png')
    sheets = [rd(paint / f's{i}_export.png') for i in (1, 2, 3)]
    cells = {n: cell(s, i) for s, row in zip(sheets, NAMES) for i, n in enumerate(row)}
    ew, eh, mw, mh = EYES[2], EYES[3], MOUTH[2], MOUTH[3]
    src = np.full((CELL, CELL, 3), 255, np.float32)
    h = rd(paint / 'head_src.png'); src[HEAD_AT[1]:HEAD_AT[1] + h.shape[0], HEAD_AT[0]:HEAD_AT[0] + h.shape[1]] = h
    hm = head_mask(src)
    ea = feather_alpha(ew, eh) * hm[EYES[1]:EYES[1] + eh, EYES[0]:EYES[0] + ew]   # never paint outside the head
    ma = feather_alpha(mw, mh) * hm[MOUTH[1]:MOUTH[1] + mh, MOUTH[0]:MOUTH[0] + mw]

    def patch(c, r, a):
        x, y, w, h = r
        rgb = c[y:y + h, x:x + w]
        return np.dstack([rgb, a[..., None] * 255])
    eyes = atlas([patch(cells[n], EYES, ea) for n in EYE_STATES], 5, ew, eh)
    mouth = atlas([patch(cells[n], MOUTH, ma) for n in MOUTH_STATES], 4, mw, mh)
    (out / 'face').mkdir(parents=True, exist_ok=True)
    for name, im in (('eyes', eyes), ('mouth', mouth)):
        bgra = np.dstack([im[..., 2], im[..., 1], im[..., 0], im[..., 3]]).clip(0, 255).astype(np.uint8)
        cv2.imwrite(str(out / 'face' / f'{name}.webp'), bgra, [cv2.IMWRITE_WEBP_QUALITY, 95])
    ox, oy, score = stand_offset(paint, stand_png)
    # cell px -> head_src px -> stand sprite px
    def to_sprite(r):
        x, y, w, h = r
        return [round((x - HEAD_AT[0]) / K + ox, 2), round((y - HEAD_AT[1]) / K + oy, 2), round(w / K, 2), round(h / K, 2)]
    ref = json.loads((Path(stand_png).parent.parent / 'poses.json').read_text())['poses']['stand']['face']
    meta = {'k': K, 'ref': {'eye': ref['eye'], 'mouth': ref['mouth']}, 'match': round(float(score), 3), 'origin': [ox, oy],
            'eyes': {'rect': to_sprite(EYES), 'px': [ew, eh], 'cols': 5, 'states': EYE_STATES},
            'mouth': {'rect': to_sprite(MOUTH), 'px': [mw, mh], 'cols': 4, 'states': MOUTH_STATES}}
    (out / 'face' / 'face.json').write_text(json.dumps(meta, indent=1))
    print(json.dumps(meta)[:400])

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

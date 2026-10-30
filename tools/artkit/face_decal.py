"""2D face decals for the archetype figures (Bart 2026-10-14: "the eyes should be just 2D", History Lines eyes).

    python3 face_decal.py FACE_SHEET.png OUT_DIR [MOUSTACHE.png]

FACE_SHEET: ChatGPT's 3x2 grid of face parts on transparency (neutral, smile, surprised, worried, angry, closed),
each cell = two eyes with brows + a mouth. Writes OUT_DIR/face_<expression>.png: the parts cut out and placed at
the MPFB standard head's real eye and mouth positions, in the FACE FRAME that archetype.py projects onto the head
(front view, FRAME_M square, top edge FRAME_TOP_M above the eyes). Swap the file = change the expression.
MOUSTACHE (optional, a single part on transparency): also writes face_<expression>_moustache.png, the moustache
over the upper lip, drawn after the mouth so it covers it.
"""
import sys
from pathlib import Path

from PIL import Image

EXPRESSIONS = ["neutral", "smile", "surprised", "worried", "angry", "closed"]
GRID = (3, 2)
SIZE = 1024
FRAME_M = 0.18               # the face frame: 18 cm square on the head, front view
FRAME_TOP_M = 0.06           # its top edge sits this far above the eyes
EYE_X_M = 0.032              # MPFB standard head (measured 2026-10-14): eye centres +-3.2 cm, z 1.762
MOUTH_DROP_M = 0.078         # mouth line below the eye line (lips at z ~1.684)
PART_SCALE = 1.6             # sheet pixels -> frame pixels: eyes ~3 cm wide, small like the Dante panels
# boxes inside one 512 px cell (left, top, right, bottom) and the point in the box that lands on the anchor
LEFT_EYE = ((60, 130, 260, 310), (160, 262))
RIGHT_EYE = ((270, 130, 470, 310), (370, 262))
MOUTH = ((150, 360, 380, 470), (268, 410))
MOUSTACHE_W_M = 0.07         # tip to tip
MOUSTACHE_DROP_M = 0.066     # its centre below the eye line (just above the mouth line)
PX_PER_M = SIZE / FRAME_M


def to_px(x_m, drop_m):
    """Frame pixel of a point x_m right of the centre line and drop_m below the eye line."""
    return round(SIZE / 2 + x_m * PX_PER_M), round((FRAME_TOP_M + drop_m) * PX_PER_M)


def place(out, cell, box_anchor, at):
    (l, t, r, b), (ax, ay) = box_anchor
    part = cell.crop((l, t, r, b))
    part = part.resize((round(part.width * PART_SCALE), round(part.height * PART_SCALE)), Image.LANCZOS)
    out.alpha_composite(part, (at[0] - round((ax - l) * PART_SCALE), at[1] - round((ay - t) * PART_SCALE)))


def moustache_over(face, part):
    part = part.crop(part.getbbox())
    w = round(MOUSTACHE_W_M * PX_PER_M)
    part = part.resize((w, round(part.height * w / part.width)), Image.LANCZOS)
    x, y = to_px(0, MOUSTACHE_DROP_M)
    out = face.copy()
    out.alpha_composite(part, (x - part.width // 2, y - part.height // 2))
    return out


def main():
    sheet_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    tache = Image.open(sys.argv[3]).convert("RGBA") if len(sys.argv) > 3 else None
    out_dir.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(sheet_path).convert("RGBA")
    cw, ch = sheet.width // GRID[0], sheet.height // GRID[1]
    for i, name in enumerate(EXPRESSIONS):
        cx, cy = i % GRID[0], i // GRID[0]
        cell = sheet.crop((cx * cw, cy * ch, (cx + 1) * cw, (cy + 1) * ch)).resize((512, 512), Image.LANCZOS)
        out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        # the sheet's left eye is the figure's right eye: it sits at -x seen from the front
        place(out, cell, LEFT_EYE, to_px(-EYE_X_M, 0))
        place(out, cell, RIGHT_EYE, to_px(EYE_X_M, 0))
        place(out, cell, MOUTH, to_px(0, MOUTH_DROP_M))
        out.save(out_dir / f"face_{name}.png")
        print(f"FACE ok {out_dir / f'face_{name}.png'}")
        if tache:
            moustache_over(out, tache).save(out_dir / f"face_{name}_moustache.png")


if __name__ == "__main__":
    main()

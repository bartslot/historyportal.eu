"""Contact sheet of a pack: per shot the line render and the blocking (or clay) render side by side.
usage: python3 sheet.py <pack_dir> <out.jpg>"""
import glob, os, sys
from PIL import Image, ImageDraw

pack, out = sys.argv[1], sys.argv[2]
shots = sorted({os.path.basename(p)[:-len("_lines.png")] for p in glob.glob(os.path.join(pack, "*_lines.png"))})
TW, TH = 640, 360
sheet = Image.new("RGB", (TW * 2, (TH + 22) * len(shots)), "white")
d = ImageDraw.Draw(sheet)
for i, s in enumerate(shots):
    y = i * (TH + 22)
    d.text((6, y + 4), s, fill="black")
    for j, kind in enumerate(("lines", "blocking")):
        f = os.path.join(pack, "%s_%s.png" % (s, kind))
        if not os.path.exists(f):
            f = os.path.join(pack, "%s_clay.png" % s)
        sheet.paste(Image.open(f).convert("RGB").resize((TW, TH)), (j * TW, y + 22))
sheet.save(out, quality=85)
print(out, len(shots), "shots")

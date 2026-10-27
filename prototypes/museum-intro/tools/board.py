"""Side-by-side style board: render (left) | anchor (right), both 960x540, labelled.
Usage: python3 tools/board.py <render.png> <anchor.png> <out.png>"""
import sys
from PIL import Image, ImageDraw

W, H = 960, 540


def fit(path):
    im = Image.open(path).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


render, anchor, out = sys.argv[1:4]
board = Image.new('RGB', (W * 2 + 12, H + 34), 'white')
board.paste(fit(render), (0, 34))
board.paste(fit(anchor), (W + 12, 34))
d = ImageDraw.Draw(board)
d.text((8, 10), 'LEFT: candidate', fill='black')
d.text((W + 20, 10), 'RIGHT: TARGET style (History Lines)', fill='black')
board.save(out)
print(out)

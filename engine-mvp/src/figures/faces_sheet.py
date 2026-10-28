"""Compose the face proof images from capture_faces.mjs frames: the model sheet (every emotion, 100% head crops), the
body strip (lean/tilt/shoulders), the emotes. usage: python3 faces_sheet.py DIR"""
import sys
from PIL import Image, ImageDraw

d = sys.argv[1]
names = "neutral happy worried surprised sad angry determined thinking scared proud tired".split()


def grid(tiles, labels, cols, box, size):
    cw, ch = size
    o = Image.new("RGB", (cols * cw, ((len(tiles) + cols - 1) // cols) * ch), "white")
    for k, (t, n) in enumerate(zip(tiles, labels)):
        w, h = t.size
        c = t.convert("RGB").crop((w // 2 - box[0], h // 2 - box[1], w // 2 + box[0], h // 2 + box[1])).resize(size)
        ImageDraw.Draw(c).text((6, 4), n, fill=(0, 0, 0))
        o.paste(c, ((k % cols) * cw, (k // cols) * ch))
    return o


grid([Image.open(f"{d}/head_{n}.png") for n in names], names, 6, (130, 170), (312, 408)).save(f"{d}/model_sheet.png")
bodies = ["neutral", "worried", "angry", "tired"]
grid([Image.open(f"{d}/body_{n}.png") for n in bodies], bodies, 4, (170, 340), (340, 680)).save(f"{d}/model_sheet_bodies.png")
em = ["worried", "surprised", "thinking", "scared", "proud"]
grid([Image.open(f"{d}/emote_{n}.png") for n in em], em, 5, (230, 250), (300, 326)).save(f"{d}/model_sheet_emotes.png")

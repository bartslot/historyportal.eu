"""The kit's parts board: every sheet the kit is made of, by folder."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
from img_io import find, save as save_image  # noqa: E402
R = Path.home() / 'BartsMedia/historyportal/topics/character-creator'
K = R / 'kits/old-babylonian/v1'; A = R / 'part-sheets/ana/v1'
rows = [
    ('Body + outfits', [('standard body', K / 'body/standard-body.png'), ('long wrap', K / 'outfits/long-wrap.png'),
                        ('long tunic + shawl', K / 'outfits/long-tunic-shawl.png'), ('work tunic + apron', K / 'outfits/work-tunic-apron.png'),
                        ('Ana (hero)', A / 'flat.png')]),
    ('Faces', [('girl', A / 'parts/head-bald.png'), ('young woman', K / 'heads/young-woman.png'), ('woman', K / 'heads/woman-40.png'),
               ('old woman', A / 'parts/head-bald-old.png')]),
    ('Hair, headwear, extras', [('braid', K / 'parts/hair/braid.png'), ('bun', K / 'parts/hair/bun.png'), ('loose', K / 'parts/hair/loose.png'),
                                ('headband', K / 'parts/headwear/headband.png'), ('shawl over head', K / 'parts/headwear/shawl-over-head.png'),
                                ('jewellery', K / 'parts/extras/jewellery.png')]),
    ('Mouths', [(m, K / f'mouths/{m}.png') for m in ['ah', 'oh', 'down', 'pressed', 'gentle-smile']]),
]
paper = (246, 245, 238); CELL = 300
out = Image.new('RGB', (CELL * 6 + 40, sum(CELL * (2 if i == 0 else 1) + 50 for i in range(len(rows))) + 20), paper)
d = ImageDraw.Draw(out); y = 10
for i, (title, items) in enumerate(rows):
    d.text((20, y), title, fill=(40, 30, 20)); y += 20
    hh = CELL * (2 if i == 0 else 1)
    for k, (name, p) in enumerate(items):
        im = Image.open(find(p)).convert('RGB')   # parts are .webp now, ChatGPT sheets .png
        if i == 3:
            im = im.crop((540, 420, 940, 760))
        im.thumbnail((CELL - 10, hh - 10))
        out.paste(im, (20 + k * CELL, y))
        d.text((20 + k * CELL, y + hh - 4), name, fill=(40, 30, 20))
    y += hh + 30
save_image(out, K / 'kit-parts-board.webp'); print('ok', out.size)

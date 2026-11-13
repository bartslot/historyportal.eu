"""Old Babylonian kit presets: a preset is a recipe (body, face, parts, outfit, colours); this composes and renders each one.

Body types (Bart 2026-11-13 "Body types next"): girl, woman and man, each its own drawing with its own part map, head box
and outfits. Data lives in the kit folder (kits/old-babylonian/v1: body/, outfits/, heads/, parts/); the code is here.

  python3 kit_presets.py [preset ...]      -> kits/old-babylonian/v1/presets-bodies/<id>/{recipe.json, head.webp, *-full*.webp, ...}
  python3 kit_presets.py cut [preset ...]  -> first: the man's parts, the cleaned woman and man maps (data prep)
  python3 kit_presets.py mouths            -> every mouth on the weaver's face
"""
from __future__ import annotations
import json, os, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
import kit_parts as kp  # noqa: E402
from kit_parts import K, ANA, compose  # noqa: E402
from img_io import find, save as save_image  # noqa: E402

HERE = Path(__file__).parent
TWELVE = {'bleached-linen': '#f1eadb', 'raw-linen': '#e2d5b8', 'undyed-wool': '#d3bf9a', 'sand': '#b99a6b', 'camel-brown': '#96724a',
          'dark-wool-brown': '#5f4632', 'madder-red': '#a8463a', 'red-ochre': '#b0754f', 'yellow-ochre': '#c9a24e',
          'reed-green': '#7f8650', 'indigo-blue': '#46607a', 'charcoal-wool': '#3a3632'}
SKIN = {'s1': '#eac39a', 's2': '#dcaa7c', 's3': '#c99263', 's4': '#ad764c', 's5': '#8c5c3c'}
HAIR = {'black-brown': '#2f231d', 'dark-brown': '#4c2e20', 'brown': '#6e3b22', 'grey': '#a9a49c', 'white': '#ddd8cf'}
# zones of an outfit -> the sheet colour kind they were drawn in
ZONE_KIND = {'garment': 'tunic', 'second': 'shawl', 'cord': 'rope', 'apron': 'apron', 'head-cloth': 'ochre', 'band': 'apron'}

BOXES = json.loads((K / 'body/head-boxes.json').read_text())
BODIES = {   # map: the body's part map; box: where its head sheet sits; collar: the girl head sheets' collar must go
    'girl': dict(map=Path.home() / 'BartsMedia/historyportal/topics/character-bones/ana/rig/v1/map.png', box=BOXES['girl']),
    'woman': dict(map=K / 'body/woman-map-clean.webp', box=BOXES['woman'], collar=True),
    'man': dict(map=K / 'body/man-map-clean.webp', box=BOXES['man']),
}
OUTFITS = {
    'girl': {'ana': ANA / 'flat.png', 'base-shift': K / 'body/standard-body.png', 'work-tunic-apron': K / 'outfits/work-tunic-apron.png',
             'long-wrap': K / 'outfits/long-wrap.png', 'long-tunic-shawl': K / 'outfits/long-tunic-shawl.png'},
    'woman': {'long-wrap': K / 'outfits/woman-long-wrap.png', 'long-tunic-shawl': K / 'outfits/woman-long-tunic-shawl.png',
              'work-tunic-apron': K / 'outfits/woman-work-tunic-apron.png', 'base-shift': K / 'body/woman-body.png'},
    'man': {'scribe-wrap': K / 'outfits/man-scribe-wrap.png', 'merchant-tunic': K / 'outfits/man-merchant-tunic.png',
            'soldier': K / 'outfits/man-soldier.png', 'base-kilt': K / 'body/man-body.png'},
}

PRESETS = {
    'miller-girl': dict(role='Girl at the grinding stone', body='girl', face='girl', outfit='work-tunic-apron', parts=['hair/loose'],
                        skin='s3', hair_colour='dark-brown', height_m=1.42, zones={'garment': 'sand', 'apron': 'raw-linen', 'cord': 'camel-brown'}),
    'weaver': dict(role='Weaver', body='woman', face='young-woman', outfit='work-tunic-apron', parts=['hair/bun', 'headwear/headband'], mouth='pressed',
                   skin='s3', hair_colour='black-brown', height_m=1.55, zones={'garment': 'undyed-wool', 'apron': 'indigo-blue', 'cord': 'dark-wool-brown'}),
    'naditu': dict(role='Naditu of Sippar, trader', body='woman', face='woman', outfit='long-tunic-shawl', parts=['hair/bun', 'extras/jewellery'],
                   skin='s2', hair_colour='dark-brown', height_m=1.56, zones={'garment': 'bleached-linen', 'second': 'madder-red'}),
    'tavern-keeper': dict(role='Tavern keeper', body='woman', face='woman', outfit='long-wrap', parts=['hair/bun', 'headwear/headband'], mouth='ah',
                          skin='s4', hair_colour='black-brown', height_m=1.54, zones={'garment': 'raw-linen', 'second': 'red-ochre', 'band': 'reed-green'}),
    'grandmother': dict(role='Grandmother', body='woman', face='old-woman', outfit='long-tunic-shawl', parts=['hair/bun', 'headwear/shawl-over-head'],
                        skin='s2', hair_colour='grey', height_m=1.50, zones={'garment': 'camel-brown', 'second': 'dark-wool-brown', 'head-cloth': 'undyed-wool'}),
    'scribe': dict(role='Scribe', body='man', face='man', outfit='scribe-wrap', parts=['hair/man-hair-headband', 'hair/man-beard', 'extras/man-seal'],
                   skin='s3', hair_colour='black-brown', height_m=1.66, zones={'garment': 'bleached-linen', 'second': 'indigo-blue', 'band': 'madder-red'}),
    'merchant': dict(role='Merchant', body='man', face='man', outfit='merchant-tunic', parts=['hair/man-hair-headband', 'hair/man-beard', 'extras/man-seal'],
                     skin='s2', hair_colour='dark-brown', height_m=1.68, zones={'garment': 'undyed-wool', 'second': 'red-ochre', 'band': 'reed-green'}),
    'soldier': dict(role='Soldier', body='man', face='man', outfit='soldier', parts=['hair/man-beard', 'headwear/man-helmet'],
                    skin='s4', hair_colour='black-brown', height_m=1.70, zones={'garment': 'raw-linen', 'second': 'madder-red', 'cord': 'dark-wool-brown', 'head-cloth': 'yellow-ochre'}),
}
rgbt = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def clean_map(name):
    """The map's head part grown 8 px above the chin: the edge of the body sheet's own small head is head, never chest."""
    m = np.asarray(Image.open(find(K / f'body/{name}-map.png')).convert('RGB')).astype(int)
    head = (np.abs(m - [255, 0, 255]).sum(-1) < 120)
    x0, y0, x1, y1 = BOXES[name]
    grow = ndimage.binary_dilation(head, iterations=8)
    grow[int(y0 + 0.62 * (y1 - y0)):] = False
    out = m.copy()
    out[grow & ~head] = [255, 0, 255]
    save_image(out.astype(np.uint8), K / f'body/{name}-map-clean.webp', lossless=True)


def drop_collar(head, drawn):
    """The girl head sheets carry her tunic collar and a V slit; on a longer adult neck they would show. Below the chin,
    cloth and the lines along it go (green), so the adult body's own neck and neckline show there."""
    a = head.astype(int)
    r, g, bl = a[..., 0], a[..., 1], a[..., 2]
    cloth = ((r > 225) & (g > 200) & (bl > 150) & (bl < 215)) | ((r > 180) & (g < 120) & (bl < 100))   # tunic cream (skin blue ~120), shawl red
    cloth[:560] = False
    gone = ndimage.binary_dilation(ndimage.binary_opening(cloth, iterations=2), iterations=16) & ~drawn
    gone[:560] = False
    skin = np.abs(a - [250, 190, 120]).sum(-1) < 60
    gone |= ndimage.binary_dilation(gone, iterations=6) & ~skin & ~drawn & (np.arange(a.shape[0])[:, None] >= 560)
    out = head.copy()
    out[gone] = [0, 255, 0]
    return out


def palette(p):
    pal = {'skin': rgbt(SKIN[p['skin']]), 'hair': rgbt(HAIR[p['hair_colour']]), 'grey': rgbt(HAIR[p['hair_colour']])}
    pal['brow'] = [int(v * 0.72) for v in pal['hair']]                 # brows follow the hair, a little darker
    for z, c in p['zones'].items():
        pal[ZONE_KIND[z]] = rgbt(TWELVE[c])
    return pal


def build(pid, p, renders='full,closeup', folder='presets-bodies', root=None):
    out = (root or K / folder) / pid
    out.mkdir(parents=True, exist_ok=True)
    (out / 'recipe.json').write_text(json.dumps(dict(kit='babylonia-old-babylonian', view='front34', **p), indent=1))
    body = BODIES[p['body']]
    names = list(p['parts']) + ([f"mouths/{p['mouth']}"] if p.get('mouth') else [])
    head, drawn = compose(p['face'], names)
    if body.get('collar'):
        head = drop_collar(head, drawn)
    save_image(head, out / 'head.webp', lossless=True)                  # re-read by kit_render: exact pixels
    save_image((drawn * 255).astype(np.uint8), out / 'parts-mask.webp', lossless=True)
    mouth = np.asarray(Image.open(find(K / f"parts/mouths/{p['mouth']}-mask.png")).convert('L')) > 127 if p.get('mouth') else np.zeros(drawn.shape, bool)
    save_image((mouth * 255).astype(np.uint8), out / 'mouth-mask.webp', lossless=True)
    flat = OUTFITS[p['body']][p['outfit']]
    env = dict(os.environ, KIT='1', NAME=pid, FLAT=str(flat), HEAD_SHEET=str(out / 'head.webp'), HAIR_MASK=str(out / 'parts-mask.webp'),
               MOUTH_MASK=str(out / 'mouth-mask.webp'), PAL=json.dumps(palette(p)), HEAD_BOX=json.dumps(body['box']), RENDERS=renders)
    part_map = find(body['map'])                                       # the cleaned maps were written as .png before 11-13
    if p.get('pose') == 'stooped':     # posed rigidly per part about this body's own joints
        pd = out / 'posed'
        subprocess.run([sys.executable, str(HERE / 'pose.py'), str(flat), str(part_map), str(out / 'head.webp'), str(out / 'parts-mask.webp'),
                        str(pd), '8', '7', p['body']], check=True)
        env.update(FLAT=str(pd / 'flat.webp'), HEAD_SHEET=str(pd / 'head.webp'), HAIR_MASK=str(pd / 'hair-mask.webp'),
                   HEAD_BOX=(pd / 'box.json').read_text(), MOUTH_MASK='')
        part_map = pd / 'map.webp'
    r = subprocess.run([sys.executable, str(HERE / 'kit_render.py'), str(ANA), str(part_map), str(out)], env=env, capture_output=True, text=True)
    print(pid, 'ok' if r.returncode == 0 else 'FAILED\n' + r.stderr[-2500:])
    return r.returncode == 0


def cut():
    """Data prep: the man's parts (kit_parts cuts every part the same way) and the woman's and man's cleaned maps."""
    for name, (sp, bp, how) in kp.PARTS.items():
        if '/man-' not in name:
            continue
        sheet = kp.rgb(sp)
        m = kp.cut(sheet, kp.rgb(bp), how)
        kp.save_part(name, sheet, m)
        print(f'{name:28s} {int(m.sum()):7d} px')
    clean_map('woman')
    clean_map('man')


if __name__ == '__main__':
    args = sys.argv[1:]
    if args == ['mouths']:                 # every mouth on the weaver's face (the mouths were drawn on the girl's head)
        for m in [None, 'ah', 'oh', 'down', 'pressed', 'gentle-smile']:
            build(m or 'closed', dict(PRESETS['weaver'], mouth=m), renders='closeup', folder='mouths-on-weaver')
        sys.exit()
    if args[:1] == ['cut']:
        cut()
        args = args[1:]
        if not args:
            sys.exit()
    ok = [build(pid, PRESETS[pid]) for pid in (args or PRESETS)]
    sys.exit(0 if all(ok) else 1)

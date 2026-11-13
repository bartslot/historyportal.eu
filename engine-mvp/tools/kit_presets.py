"""Old Babylonian kit presets: a preset is a recipe (parts + colours); this composes and renders each one.

  python3 kit_presets.py [preset ...]      -> kits/old-babylonian/v1/presets/<id>/{recipe.json, head.png, *-full*.png, ...}
"""
from __future__ import annotations
import json, os, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from kit_parts import K, ANA, compose  # noqa: E402

HERE = Path(__file__).parent
REPO = Path(__file__).resolve().parents[2]   # this repo: aquarel.py + wash texture
MAP = Path.home() / 'BartsMedia/historyportal/topics/character-bones/ana/rig/v1/map.png'
TWELVE = {'bleached-linen': '#f1eadb', 'raw-linen': '#e2d5b8', 'undyed-wool': '#d3bf9a', 'sand': '#b99a6b', 'camel-brown': '#96724a',
          'dark-wool-brown': '#5f4632', 'madder-red': '#a8463a', 'red-ochre': '#b0754f', 'yellow-ochre': '#c9a24e',
          'reed-green': '#7f8650', 'indigo-blue': '#46607a', 'charcoal-wool': '#3a3632'}
SKIN = {'s1': '#eac39a', 's2': '#dcaa7c', 's3': '#c99263', 's4': '#ad764c', 's5': '#8c5c3c'}
HAIR = {'black-brown': '#2f231d', 'dark-brown': '#4c2e20', 'brown': '#6e3b22', 'grey': '#a9a49c', 'white': '#ddd8cf'}
OUTFITS = {'ana': ANA / 'flat.png', 'base-shift': K / 'body/standard-body.png', 'long-wrap': K / 'outfits/long-wrap.png',
           'long-tunic-shawl': K / 'outfits/long-tunic-shawl.png', 'work-tunic-apron': K / 'outfits/work-tunic-apron.png'}
# zones of an outfit -> the sheet colour kind they were drawn in
ZONE_KIND = {'garment': 'tunic', 'second': 'shawl', 'cord': 'rope', 'apron': 'apron', 'head-cloth': 'ochre', 'band': 'apron'}

PRESETS = {
    'weaver': dict(role='Weaver', face='young-woman', outfit='work-tunic-apron', hair='bun', headwear='headband', mouth='pressed',
                   skin='s3', hair_colour='black-brown', height_m=1.55,
                   zones={'garment': 'undyed-wool', 'apron': 'indigo-blue', 'cord': 'dark-wool-brown'}),
    'naditu': dict(role='Naditu of Sippar, trader', face='woman', outfit='long-tunic-shawl', hair='bun', extras=['jewellery'],
                   skin='s2', hair_colour='dark-brown', height_m=1.56, zones={'garment': 'bleached-linen', 'second': 'madder-red'}),
    'tavern-keeper': dict(role='Tavern keeper', face='woman', outfit='long-wrap', hair='bun', headwear='headband', mouth='ah',
                          skin='s4', hair_colour='black-brown', height_m=1.54,
                          zones={'garment': 'raw-linen', 'second': 'red-ochre', 'band': 'reed-green'}),
    'miller-girl': dict(role='Girl at the grinding stone', face='girl', outfit='work-tunic-apron', hair='loose',
                        skin='s3', hair_colour='dark-brown', height_m=1.42,
                        zones={'garment': 'sand', 'apron': 'raw-linen', 'cord': 'camel-brown'}),
    'grandmother': dict(role='Grandmother', face='old-woman', outfit='long-tunic-shawl', hair='bun', headwear='shawl-over-head',
                        skin='s2', hair_colour='grey', height_m=1.47, pose='stooped',
                        zones={'garment': 'camel-brown', 'second': 'dark-wool-brown', 'head-cloth': 'undyed-wool'}),
}
rgbt = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def build(pid, p, renders='full,closeup', folder='presets'):
    out = K / folder / pid
    out.mkdir(parents=True, exist_ok=True)
    recipe = dict(kit='babylonia-old-babylonian', body='standard-f', view='front34', **p)
    (out / 'recipe.json').write_text(json.dumps(recipe, indent=1))
    names = ([f"hair/{p['hair']}"] if p.get('hair') else []) + ([f"headwear/{p['headwear']}"] if p.get('headwear') else []) \
        + [f'extras/{e}' for e in p.get('extras', [])] + ([f"mouths/{p['mouth']}"] if p.get('mouth') else [])
    head, drawn = compose(p['face'], names)
    Image.fromarray(head).save(out / 'head.png')
    Image.fromarray((drawn * 255).astype(np.uint8)).save(out / 'parts-mask.png')
    mouth = np.zeros(drawn.shape, bool)
    if p.get('mouth'):
        mouth = np.asarray(Image.open(K / f"parts/mouths/{p['mouth']}-mask.png").convert('L')) > 127
    Image.fromarray((mouth * 255).astype(np.uint8)).save(out / 'mouth-mask.png')
    pal = {'skin': rgbt(SKIN[p['skin']]), 'hair': rgbt(HAIR[p['hair_colour']]), 'grey': rgbt(HAIR[p['hair_colour']])}
    pal['brow'] = [int(v * 0.72) for v in pal['hair']]                 # brows follow the hair, a little darker
    for z, c in p['zones'].items():
        pal[ZONE_KIND[z]] = rgbt(TWELVE[c])
    env = dict(os.environ, KIT='1', NAME=pid, FLAT=str(OUTFITS[p['outfit']]), HEAD_SHEET=str(out / 'head.png'),
               HAIR_MASK=str(out / 'parts-mask.png'), MOUTH_MASK=str(out / 'mouth-mask.png'), PAL=json.dumps(pal), RENDERS=renders)
    mp = MAP
    if p.get('pose') == 'stooped':
        pd = out / 'posed'
        subprocess.run([sys.executable, str(HERE / 'pose.py'), str(OUTFITS[p['outfit']]), str(MAP), str(out / 'head.png'), str(out / 'parts-mask.png'), str(pd)], check=True)
        env.update(FLAT=str(pd / 'flat.png'), HEAD_SHEET=str(pd / 'head.png'), HAIR_MASK=str(pd / 'hair-mask.png'),
                   HEAD_BOX=(pd / 'box.json').read_text(), MOUTH_MASK='')
        mp = pd / 'map.png'
    r = subprocess.run([sys.executable, str(HERE / 'kit_render.py'), str(ANA), str(mp), str(out), str(REPO)], env=env, capture_output=True, text=True)
    print(pid, 'ok' if r.returncode == 0 else 'FAILED\n' + r.stderr[-2500:])
    print('\n'.join(l for l in r.stdout.splitlines() if 'kinds' in l or 'lines' in l))


if __name__ == '__main__':
    if sys.argv[1:] == ['mouths']:                 # every mouth on the weaver's face (the mouths were drawn on the girl's head)
        for m in [None, 'ah', 'oh', 'down', 'pressed', 'gentle-smile']:
            build(m or 'closed', dict(PRESETS['weaver'], mouth=m), renders='closeup', folder='mouths-on-weaver')
        sys.exit()
    for pid in (sys.argv[1:] or PRESETS):
        build(pid, PRESETS[pid])

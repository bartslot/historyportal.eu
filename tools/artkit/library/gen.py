#!/usr/bin/env python3
"""Make library sheets in the one history-lines-v1 look: ink pass, colour EDIT of that ink, gates, cut, library.json.

    python3 gen.py jobs/<bundle>.json --stage ink|colour|cut|all [--only <sheet> ...] [--tries 3] [--judge]

A job file: {"bundle": "nl-golden-age", "era": "nl-golden-age", "sheets": [{"id": "prop-ship", "layer": "prop",
  "subject": "Arranged in two rows of three: (1) ...", "assets": [{"id": "lantern-01", "tags": ["lantern", ...],
  "height_m": 0.5}, ...]}]}. One sheet = one image = one hand, so its 2-6 objects match each other.
Work files: ~/BartsMedia/historyportal/library/_work/<bundle>/<sheet>/{ink.png, colour_<v>.png, gates.json}.
A sheet that fails a gate is redrawn up to --tries times, then held (never shipped). Paid: one ChatGPT image per try.
"""
import argparse
import json
import string
import sys
from pathlib import Path

import numpy as np
from PIL import Image

import cut
import prompts
import qa

sys.path.insert(0, str(Path.home() / 'BartsAutomation/BartsDev/workflows/historyportal-mcp'))
from chatgpt_mcp import ask_chatgpt, make_image  # noqa: E402  the same codex channel the MCP tools use

LIBRARY = prompts.MEDIA / 'library'
TIMEOUT_S = 600
JUDGE_GATE = 7.0
# a band is a standing picture to the stage (layer mid, its tags make it a ground band)
LIBRARY_LAYER = {'band': 'mid', 'field': 'mid', 'terrain': 'ground', 'horizon': 'mid'}


def rgb(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert('RGB'))


def ink_stage(job: dict, sheet: dict, work: Path, tries: int) -> dict:
    for t in range(tries):
        out = work / 'ink.png'
        make_image(prompts.ink_prompt(sheet['layer'], job['era'], sheet['subject'], view=sheet.get('view', 'three-quarter')), str(out), [str(prompts.INK_ANCHOR)], False, TIMEOUT_S)
        img = rgb(out)
        inside = None if sheet['layer'] in ('sky', 'bg', 'ground', 'terrain') else cut.alpha_matte(img, cut.border_paper(img), islands=False) > 0.1
        cov = qa.ink_coverage(img, inside)
        gate = {'ink_coverage': round(cov, 4), 'ink_ok': qa.ink_ok(sheet['layer'], cov, sheet.get('view', 'three-quarter')), 'try': t + 1}
        print(f"  {sheet['id']}/ink try {t + 1}: coverage {cov:.3f} {'ok' if gate['ink_ok'] else 'OUT OF BAND'}")
        if gate['ink_ok']:
            return gate
    return gate


def colour_stage(job: dict, sheet: dict, work: Path, tries: int) -> dict:
    ink = rgb(work / 'ink.png')
    hexes = prompts.palette_hexes(job['era']) + sheet.get('hexes', [])   # a sky's own light adds its colours
    for t in range(tries):
        v = next(c for c in string.ascii_lowercase if not (work / f'colour_{c}.png').exists())
        out = work / f'colour_{v}.png'
        make_image(prompts.colour_prompt(sheet['layer'], job['era'], out.name, sheet.get('light')), str(out),
                   [str(work / 'ink.png'), str(prompts.COLOUR_ANCHOR)], False, TIMEOUT_S)
        img = rgb(out)
        kept = qa.ink_kept(ink, img)
        de = qa.palette_de(img, hexes, cut.border_paper(img))
        gate = {'variant': v, 'ink_kept': round(kept, 3), 'palette_de': round(de, 2),
                'colour_ok': qa.ink_kept_ok(sheet['layer'], kept) and de <= qa.PALETTE_GATE}
        print(f"  {sheet['id']}/colour_{v}: ink kept {kept:.2f}, palette dE {de:.1f} {'ok' if gate['colour_ok'] else 'HELD'}")
        if gate['colour_ok']:
            return gate
    return gate


def judge(sheet_png: Path) -> float:
    """Neutral ChatGPT verdict against the canonical watercolour, same question every time (never anchored)."""
    q = ('Image 1 is a reference illustration style. Image 2 is a new sheet. Judge ONLY the drawing and painting style '
         '(line quality, hatching density, watercolour handling, palette, paper white), not the content. Reply with one '
         'JSON object: {"score": 0-10 how alike the style is, "differs": "one short sentence"}.')
    res = ask_chatgpt(q, [str(prompts.COLOUR_ANCHOR), str(sheet_png)])
    text = res['reply'] if isinstance(res, dict) else str(res)
    try:
        return float(json.loads(text[text.index('{'):text.rindex('}') + 1])['score'])
    except (ValueError, KeyError):
        print('  judge reply not understood:', text[:200])
        return 0.0


def cut_stage(job: dict, sheet: dict, work: Path, gates: dict) -> list[dict]:
    v = gates['colour']['variant']
    pieces = cut.cut_sheet(rgb(work / f'colour_{v}.png'), sheet['layer'])
    if len(pieces) != len(sheet['assets']):
        look = work / f'cut_{v}'
        look.mkdir(exist_ok=True)
        for i, p in enumerate(pieces):
            Image.fromarray(p['rgba'], 'RGBA').save(look / f'{i:02d}.png')
        print(f"  {sheet['id']}: cut found {len(pieces)} objects, the job names {len(sheet['assets'])}: pieces in {look}, not added")
        return []
    out = LIBRARY / job['bundle']
    entries = []
    for spec, p in zip(sheet['assets'], pieces):
        tiles = spec.get('tileable_x', sheet['layer'] in ('sky', 'bg', 'ground', 'terrain'))
        seam = {'band': cut.tile_seam, 'horizon': cut.tile_seam, 'terrain': cut.tile_seam, 'ground': cut.tile_both}.get(sheet['layer']) if tiles else None
        im = Image.fromarray(seam(p['rgba']) if seam else p['rgba'], 'RGBA')
        im.save(out / f"{spec['id']}.webp", quality=90, method=6)
        entries.append({'id': spec['id'], 'layer': LIBRARY_LAYER.get(sheet['layer'], sheet['layer']), 'tags': spec['tags'],
                        'file': f"{spec['id']}.webp", 'w': im.width, 'h': im.height, 'anchor': p['anchor'], 'height_m': spec['height_m'],
                        'tileable_x': tiles, **({'tileable_y': True} if sheet['layer'] == 'ground' else {}), **({'perspective': True} if sheet['layer'] == 'terrain' else {}), **({'horizon': spec['horizon']} if spec.get('horizon') else {}), 'motion': spec.get('motion', 'none'),
                        'era': job.get('era_label', job['era']),
                        'qa': {'sheet': sheet['id'], 'variant': v, 'ink_coverage': gates['ink']['ink_coverage'],
                               'palette_de': gates['colour']['palette_de'], 'ink_kept': gates['colour']['ink_kept'],
                               'score': gates.get('judge'), 'alpha_ok': sheet['layer'] not in ('sky', 'ground', 'terrain')}})
    return entries


def merge_library(bundle: str, entries: list[dict]) -> None:
    path = LIBRARY / bundle / 'library.json'
    lib = json.loads(path.read_text()) if path.exists() else {'version': 1, 'bundle': bundle, 'style': 'history-lines-v1', 'assets': []}
    ids = {e['id'] for e in entries}
    lib['assets'] = [a for a in lib['assets'] if a['id'] not in ids] + entries
    path.write_text(json.dumps(lib, indent=1) + '\n')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('job')
    ap.add_argument('--stage', choices=['ink', 'colour', 'cut', 'all'], default='all')
    ap.add_argument('--only', nargs='*')
    ap.add_argument('--tries', type=int, default=3)
    ap.add_argument('--judge', action='store_true')
    ap.add_argument('--accept', metavar='REASON', help='a person looked and passes the --only sheets past a failed gate; the reason is kept in gates.json')
    a = ap.parse_args()
    job = json.loads(Path(a.job).read_text())
    if job['era'] not in prompts.PALETTE:
        raise SystemExit(f"no palette for era {job['era']}: add it to prompts.PALETTE first")
    unknown = {sh['layer'] for sh in job['sheets']} - set(prompts.LAYER)
    if unknown:  # ground tiles need the seam repaint of the 10-28 runs, not rebuilt yet
        raise SystemExit(f"no prompt template for layer(s) {sorted(unknown)}")
    (LIBRARY / job['bundle']).mkdir(parents=True, exist_ok=True)
    for sheet in job['sheets']:
        if a.only and sheet['id'] not in a.only:
            continue
        work = LIBRARY / '_work' / job['bundle'] / sheet['id']
        work.mkdir(parents=True, exist_ok=True)
        gf = work / 'gates.json'
        gates = json.loads(gf.read_text()) if gf.exists() else {}
        if a.accept:   # never silent: only named sheets, and the reason stays beside the gate it overrides
            if not a.only:
                raise SystemExit('--accept needs --only: a person passes sheets they looked at, never a whole job')
            for g, key in (('ink', 'ink_ok'), ('colour', 'colour_ok')):
                if g in gates and not gates[g].get(key):
                    gates[g] = {**gates[g], key: True, 'accepted_by': a.accept}
        if a.stage in ('ink', 'all'):
            gates['ink'] = ink_stage(job, sheet, work, a.tries)
        if a.stage in ('colour', 'all') and gates.get('ink', {}).get('ink_ok'):
            gates['colour'] = colour_stage(job, sheet, work, a.tries)
            if a.judge and gates['colour']['colour_ok']:
                gates['judge'] = judge(work / f"colour_{gates['colour']['variant']}.png")
                print(f"  {sheet['id']}: judge {gates['judge']}")
        gf.write_text(json.dumps(gates, indent=1) + '\n')
        passed = gates.get('colour', {}).get('colour_ok') and (gates.get('judge', JUDGE_GATE) >= JUDGE_GATE)
        if a.stage in ('cut', 'all'):
            if not passed:
                print(f"  {sheet['id']}: held (gates {gates}), not cut")
                continue
            entries = cut_stage(job, sheet, work, gates)
            if entries:
                merge_library(job['bundle'], entries)
                print(f"  {sheet['id']}: cut into {len(entries)} assets")


if __name__ == '__main__':
    main()

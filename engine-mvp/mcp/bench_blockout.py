"""Gate 2 measurement: the clay-blockout MCP tools against a naive baseline, on the open studio page.

    STUDIO_SERVER=http://127.0.0.1:8093 python3 mcp/bench_blockout.py OUT_DIR [shot ...]

Per shot (public/blockout/<shot>.json, converted to the tools' command shape):
  smart   kit_list -> blockout_apply (all pieces + camera) -> blockout_command with the shot's "fix" ops if the
          readback lists problems -> no image
  naive   one call per piece (apply with the first piece, then one place command each), a 1024 px screenshot after
          every step (how an agent stages a scene by looking), then the camera and a last screenshot
Counted: tool calls, wall seconds of the calls, text tokens back (estimate: characters / 4), images and their tokens
(Anthropic's estimate: width x height / 750). Writes OUT_DIR/bench.json, bench.md, and each shot's last readback.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blockout_mcp as b   # noqa: E402

SHOTS = Path(__file__).resolve().parent.parent / 'public' / 'blockout'
DEFAULT = ['tasman-spyglass', 'cabin-table', 'harbour-wide', 'tavern-four', 'street-cart']
NAIVE_SHOT_PX = (1024, 576)
CHARS_PER_TOKEN = 4
TARGETS = {'calls': 4, 'seconds': 10, 'tokens': 6000, 'images': 0}


def to_command(spec):
    """A shot file's spec -> the validated place-command shape (the inverse of blockout.js specFromCommand)."""
    c = {'id': spec['id'], 'kit': spec['kit']}
    if 'pose' in spec:
        c['pose'] = spec['pose']
    if 'at' in spec:
        c['x'], c['z'] = spec['at'][0], spec['at'][-1]
    p = spec.get('place') or {}
    if 'between' in p:
        c['rel'], c['of'], c['and'] = 'between', p['between'][0], p['between'][1]
    for rel in ('near', 'behind', 'in_front', 'left_of', 'right_of'):
        if rel in p:
            c['rel'], c['of'] = rel, p[rel]
    for k in ('side', 'gap'):
        if k in p:
            c[k] = p[k]
    if 'offset' in p:
        c['offset_r'], c['offset_f'] = p['offset']
    for k in ('on', 'turn'):
        if k in spec:
            c[k] = spec[k]
    if 'face' in spec:
        c['face'] = str(spec['face'])
    if 'height_m' in spec:
        c['height'] = spec['height_m']
    return c


def to_frame(cam):
    f = {k: cam[k] for k in ('shot', 'subjects', 'horizon', 'az', 'align') if k in cam}
    if 'lens_mm' in cam:
        f['lens'] = cam['lens_mm']
    return f


class Meter:
    def __init__(self):
        self.calls = 0
        self.seconds = 0.0
        self.text_chars = 0
        self.images = 0
        self.image_tokens = 0

    def __call__(self, fn, *a, **kw):
        t = time.perf_counter()
        out = fn(*a, **kw)
        self.seconds += time.perf_counter() - t
        self.calls += 1
        if isinstance(out, str):
            self.text_chars += len(out)
        else:                                   # an Image
            self.images += 1
            self.image_tokens += NAIVE_SHOT_PX[0] * NAIVE_SHOT_PX[1] // 750
        return out

    def row(self):
        tokens = self.text_chars // CHARS_PER_TOKEN + self.image_tokens
        return {'calls': self.calls, 'seconds': round(self.seconds, 2), 'tokens': tokens,
                'text_tokens': self.text_chars // CHARS_PER_TOKEN, 'images': self.images, 'image_tokens': self.image_tokens}


def smart(doc):
    m = Meter()
    b._kit.cache_clear()                        # a fresh session: kit_list is a real call
    m(b.kit_list)
    objects = [to_command(o) for o in doc['objects']]
    out = m(b.blockout_apply, objects, to_frame(doc['camera']) if doc.get('camera') else None, 'clay')
    if 'problems:\n' in out and doc.get('fix'):
        out = m(b.blockout_command, doc['fix'])
    return m.row(), out


def naive(doc):
    m = Meter()
    objects = [to_command(o) for o in doc['objects']]
    m(b.blockout_apply, objects[:1], None, 'clay')
    m(b.blockout_snapshot, NAIVE_SHOT_PX[0], 'clay')
    for o in objects[1:]:
        m(b.blockout_command, [{'cmd': 'place', **o}])
        m(b.blockout_snapshot, NAIVE_SHOT_PX[0], 'clay')
    if doc.get('camera'):
        m(b.blockout_command, [{'cmd': 'frame', **to_frame(doc['camera'])}])
        m(b.blockout_snapshot, NAIVE_SHOT_PX[0], 'clay')
    return m.row()


def main():
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    shots = sys.argv[2:] or DEFAULT
    rows = []
    for name in shots:
        doc = json.loads((SHOTS / f'{name}.json').read_text())
        s, readback = smart(doc)
        (out_dir / f'{name}_mcp_readback.txt').write_text(readback + '\n')
        n = naive(doc)
        rows.append({'shot': name, 'pieces': len(doc['objects']), 'smart': s, 'naive': n,
                     'smart_problems': readback.split('problems:', 1)[-1].strip() if 'problems:' in readback else ''})
        print(name, 'smart', s, 'naive', n, flush=True)
    (out_dir / 'bench.json').write_text(json.dumps(rows, indent=2))
    lines = ['| shot | pieces | MCP calls | MCP s | MCP tokens | MCP images | naive calls | naive s | naive tokens | naive images |',
             '|---|---|---|---|---|---|---|---|---|---|']
    for r in rows:
        s, n = r['smart'], r['naive']
        lines.append(f"| {r['shot']} | {r['pieces']} | {s['calls']} | {s['seconds']} | {s['tokens']} | {s['images']} | "
                     f"{n['calls']} | {n['seconds']} | {n['tokens']} | {n['images']} |")
    ok = all(r['smart']['calls'] <= TARGETS['calls'] and r['smart']['seconds'] <= TARGETS['seconds']
             and r['smart']['tokens'] <= TARGETS['tokens'] and r['smart']['images'] == 0 for r in rows)
    lines.append('')
    lines.append(f"Targets per shot: <= {TARGETS['calls']} calls, <= {TARGETS['seconds']} s, <= {TARGETS['tokens']} tokens, no image: "
                 + ('ALL MET' if ok else 'NOT ALL MET'))
    (out_dir / 'bench.md').write_text('\n'.join(lines) + '\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()

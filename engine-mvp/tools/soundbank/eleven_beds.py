#!/usr/bin/env python3
"""Generate ambience beds with ElevenLabs sound effects and fold them into seamless loops.

Same recipe as the Babylonia bundle (CREDITS.md): eleven_text_to_sound_v2, loop, 22 s, prompt_influence 0.45,
then a 20 s seamless loop (2 s equal-power crossfade), -21 LUFS (limiter -5 dBFS), stereo AAC 128k.

    ELEVENLABS_API_KEY=... python3 eleven_beds.py --batch 1
    ELEVENLABS_API_KEY=... python3 eleven_beds.py sail-open-sea bazaar

Raw mp3s go to <out>/raw/ (kept, so a re-fold never costs credits again); loops to <out>/beds/<id>.m4a.
An id whose raw mp3 exists is not generated again.
"""
import argparse, json, os, pathlib, subprocess, sys, urllib.request

HERE = pathlib.Path(__file__).parent
API = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128'
GEN_S, LOOP_S, XF_S = 22, 20, 2


def generate(text: str, dest: pathlib.Path, key: str) -> None:
    body = json.dumps({'text': text, 'model_id': 'eleven_text_to_sound_v2', 'duration_seconds': GEN_S,
                       'prompt_influence': 0.45, 'loop': True}).encode()
    req = urllib.request.Request(API, body, {'xi-api-key': key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=180) as r:
        dest.write_bytes(r.read())


def fold(src: pathlib.Path, dest: pathlib.Path) -> None:
    """Loop = src[0:20] with its first 2 s replaced by src[20:22] fading out over src[0:2] fading in,
    so the loop's end (src 20 s) runs straight into its own start."""
    graph = (f'[0:a]asplit=3[a][b][c];'
             f'[a]atrim=0:{XF_S},asetpts=PTS-STARTPTS,afade=t=in:d={XF_S}:curve=qsin[h];'
             f'[b]atrim={LOOP_S}:{LOOP_S + XF_S},asetpts=PTS-STARTPTS,afade=t=out:d={XF_S}:curve=qsin[t];'
             f'[h][t]amix=inputs=2:normalize=0[x];'
             f'[c]atrim={XF_S}:{LOOP_S},asetpts=PTS-STARTPTS[m];'
             f'[x][m]concat=n=2:v=0:a=1,loudnorm=I=-21:TP=-5:LRA=11,aresample=44100[o]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-filter_complex', graph, '-map', '[o]',
                    '-ac', '2', '-c:a', 'aac', '-b:a', '128k', '-t', str(LOOP_S), str(dest)], check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--batch', type=int)
    ap.add_argument('--out', default=os.path.expanduser('~/BartsMedia/historyportal/sound'))
    a = ap.parse_args()
    spec = json.loads((HERE / 'eleven_beds.json').read_text())
    beds = [b for b in spec['beds'] if b['id'] in a.ids or (a.batch and b['batch'] == a.batch)]
    if not beds:
        sys.exit('no beds picked: pass ids or --batch N')
    key = os.environ.get('ELEVENLABS_API_KEY')
    out = pathlib.Path(a.out)
    (out / 'raw').mkdir(parents=True, exist_ok=True)
    (out / 'beds').mkdir(parents=True, exist_ok=True)
    for b in beds:
        raw = out / 'raw' / f"{b['id']}.mp3"
        if not raw.exists():
            if not key:
                sys.exit('ELEVENLABS_API_KEY not set')
            print('generate', b['id'], flush=True)
            generate(f"{b['prompt']} {spec['suffix']}", raw, key)
        fold(raw, out / 'beds' / f"{b['id']}.m4a")
        print('ok', b['id'])
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

#!/usr/bin/env python3
"""Make the studio's sound bank: ambience beds + UI/foley SFX, all synthesised here, so every file is
our own work, released CC0. Recipes adapt the procedural foley idea of lemo-opuscar core/audio/sfx.py
(MIT, LemoLab 2026); no code or audio copied.

    python3 tools/soundbank/make_bank.py [--out ~/BartsMedia/historyportal/sound]

Writes <out>/beds/*.m4a (seamless 24 s loops), <out>/sfx/*.m4a and <out>/CREDITS.md. Needs numpy,
scipy and ffmpeg. Seeded: the same run gives the same files. Ids must match src/sound/bank.json.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
LOOP_S = 24.0
XFADE_S = 2.0
rng = np.random.default_rng(1642)
HERE = Path(__file__).resolve().parent
BANK = HERE.parent.parent / 'src' / 'sound' / 'bank.json'


# ---------- building blocks ----------
def t_(d): return np.arange(int(round(d * SR))) / SR
def noise(d): return rng.standard_normal(int(round(d * SR)))
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def norm(x, p=0.9): m = np.abs(x).max(); return x * (p / m) if m > 0 else x
def env(d, a=0.01, r=None):
    n = len(t_(d)); e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    if r: nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e
def decay(d, tau): return np.exp(-t_(d) / tau)
def slow(d, hz):
    """A smooth random 0..1 curve changing about `hz` times a second (gusts, swells)."""
    x = lp(noise(d + 4), hz, 2)[int(2 * SR):int(2 * SR) + len(t_(d))]
    x = (x - x.min()) / (np.ptp(x) + 1e-9)
    return x
def brown(d):
    x = np.cumsum(noise(d)); return hp(x - x.mean(), 20)
def add(buf, x, at):
    i = int(at * SR); j = min(len(buf), i + len(x))
    if i < len(buf): buf[i:j] += x[:j - i]
def events(d, every_lo, every_hi, start=0.3):
    t = start
    while t < d:
        yield t
        t += rng.uniform(every_lo, every_hi)


# ---------- voices ----------
def chirp_trill():
    out = []
    f = rng.uniform(2500, 4800)
    for _ in range(rng.integers(3, 9)):
        d = rng.uniform(0.04, 0.09); tt = t_(d)
        sweep = f * (1 + rng.uniform(-0.25, 0.3) * tt / d)
        out.append(np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.sin(np.pi * tt / d) ** 2)
        out.append(np.zeros(int(rng.uniform(0.02, 0.06) * SR)))
    return np.concatenate(out)

def crackle():
    d = rng.uniform(0.004, 0.02)
    return bp(noise(d), 1200, 7000) * decay(d, d / 4) * rng.pareto(2.5)

def moo():
    d = rng.uniform(1.4, 2.2); tt = t_(d)
    f0 = rng.uniform(95, 125) * (1 + 0.15 * np.sin(np.pi * tt / d)) * (1 - 0.1 * tt / d)
    saw = 2 * ((np.cumsum(f0) / SR) % 1) - 1
    v = bp(saw, 250, 400) * 1.0 + bp(saw, 600, 900) * 0.6
    return v * env(d, 0.25, 0.5)

def knock(f=160, v=1.0):
    d = 0.18
    body = np.sin(2 * np.pi * f * t_(d)) * decay(d, 0.035)
    click = bp(noise(d), 1500, 5000) * decay(d, 0.004)
    return v * (body + 0.5 * click)

def creak(d=None):
    d = d or rng.uniform(0.5, 1.2); n = len(t_(d)); x = np.zeros(n)
    rate = rng.uniform(25, 70); t = 0.0
    while t < d:  # stick-slip: a train of tiny clicks whose rate wanders
        add(x, np.array([1.0, -0.6, 0.3]), t)
        t += 1 / (rate * (1 + 0.4 * np.sin(2 * np.pi * t / d)))
    return bp(x, 350, 1800) * env(d, 0.08, 0.3)

def gull():
    out = []
    for _ in range(rng.integers(2, 5)):
        d = rng.uniform(0.25, 0.45); tt = t_(d)
        f = np.interp(tt, [0, d * 0.2, d], [1300, 1900, 1050]) * (1 + 0.02 * np.sin(2 * np.pi * 28 * tt))
        ph = 2 * np.pi * np.cumsum(f) / SR
        v = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)
        out.append(bp(v, 900, 5000) * env(d, 0.02, 0.15)); out.append(np.zeros(int(rng.uniform(0.06, 0.15) * SR)))
    return np.concatenate(out)

def bell(f=330, d=5.0):
    tt = t_(d); x = np.zeros_like(tt)
    for ratio, amp, tau in [(0.5, 0.5, 2.5), (1, 1, 1.8), (1.2, 0.6, 1.2), (1.5, 0.4, 1.0), (2, 0.5, 0.8), (2.5, 0.25, 0.5), (3, 0.2, 0.4)]:
        x += amp * np.sin(2 * np.pi * f * ratio * tt) * np.exp(-tt / tau)
    return lp(x * env(d, 0.003), 2500)

VOWELS = [(700, 1200), (400, 2000), (300, 800), (500, 1500), (600, 1000)]
def voice(d):
    """One far-off talker: a jittery pulse train through changing vowel formants, in syllables."""
    n = len(t_(d)); x = np.zeros(n); f0 = rng.uniform(100, 230)
    t = 0.0
    while t < d:
        add(x, np.array([1.0]), t); t += 1 / (f0 * rng.uniform(0.96, 1.04))
    y = np.zeros(n); seg = int(0.2 * SR)
    for i in range(0, n, seg):
        f1, f2 = VOWELS[rng.integers(len(VOWELS))]
        y[i:i + seg] = (bp(x, f1 * 0.8, f1 * 1.2) + 0.6 * bp(x, f2 * 0.85, f2 * 1.15))[i:i + seg]
    syll = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(3, 5) * t_(d) + rng.uniform(0, 6))
    talk = (slow(d, 0.3) > 0.4).astype(float)
    return lp(y * syll * lp(talk, 3), 3000)


# ---------- beds (24 s, looped) ----------
def wind(d, level=1.0):
    g = 0.35 + 0.65 * slow(d, 0.15)
    return level * (bp(brown(d), 120, 900) * g + 0.15 * bp(noise(d), 1500, 3200) * g ** 2)

def bed_heath_wind(d): return wind(d)
def bed_heath_birds(d):
    x = 0.35 * norm(wind(d)); b = np.zeros_like(x)
    for at in events(d, 0.6, 3.0): add(b, chirp_trill() * rng.uniform(0.2, 0.7), at)
    return x + 0.5 * b
def bed_camp_fire(d):
    x = 0.5 * norm(lp(brown(d), 300)) * (0.7 + 0.3 * slow(d, 0.5)); c = np.zeros_like(x)
    for at in events(d, 0.02, 0.25): add(c, crackle(), at)
    return x + 0.6 * norm(c)
def bed_cattle_field(d):
    x = 0.4 * norm(wind(d)); m = np.zeros_like(x)
    for at in events(d, 6, 11, start=2): add(m, moo() * rng.uniform(0.4, 0.9), at)
    return x + 0.5 * norm(m)
def bed_hand_tools(d):
    x = 0.3 * norm(wind(d)); k = np.zeros_like(x); t = 0.5
    while t < d - 1:
        for _ in range(rng.integers(3, 8)):  # a burst of blows, then a rest
            add(k, knock(rng.uniform(130, 220), rng.uniform(0.5, 1)), t); t += rng.uniform(0.55, 0.9)
        t += rng.uniform(1.5, 3.5)
    return x + 0.5 * norm(k)
def bed_harbour_water(d):
    lap = lp(noise(d), 500) * (0.3 + 0.7 * slow(d, 0.6) ** 2); p = np.zeros_like(lap)
    for at in events(d, 0.4, 1.6): add(p, bp(noise(0.06), 250, 900) * decay(0.06, 0.015) * rng.uniform(0.3, 1), at)
    return norm(lap) + 0.4 * norm(p) + 0.2 * norm(wind(d))
def bed_gulls(d):
    x = 0.25 * norm(wind(d)); g = np.zeros_like(x)
    for at in events(d, 2.5, 6.5, start=1): add(g, gull() * rng.uniform(0.3, 0.8), at)
    return x + 0.6 * norm(g)
def bed_rigging_creak(d):
    x = 0.3 * norm(lp(noise(d), 400) * slow(d, 0.3)); c = np.zeros_like(x)
    for at in events(d, 1.8, 4.5): add(c, creak() * rng.uniform(0.4, 1), at)
    return x + 0.6 * norm(c)
def bed_sea_waves(d):
    sw = slow(d, 0.13) ** 1.5
    body = lp(brown(d), 400) * sw; wash = bp(noise(d), 1500, 6000) * np.clip(sw - 0.5, 0, 1) ** 2
    return norm(body) + 0.5 * norm(wash)
def bed_town_bells(d):
    x = 0.2 * norm(wind(d)); b = np.zeros_like(x); t = 2.0
    while t < d - 6:
        for i in range(rng.integers(4, 7)):
            add(b, bell(rng.choice([294, 330, 392])) * 0.6, t + i * 1.4)
        t += 14
    return x + 0.6 * norm(lp(b, 1800))
def bed_quay_crowd(d):
    v = sum(voice(d) * rng.uniform(0.3, 1) for _ in range(10))
    return norm(v) + 0.3 * norm(bed_harbour_water(d))
def bed_neutral_air(d):
    # open air with no landscape in it: soft broadband, slow gentle swell, no whistle, no birds
    g = 0.6 + 0.4 * slow(d, 0.08)
    return norm(lp(brown(d), 500) * g) + 0.15 * norm(bp(noise(d), 800, 2500)) * g


def bed_museum_room(d):
    # a big quiet hall: low air, a far door, a few soft footsteps far off in the room
    x = norm(lp(brown(d), 220)) * 0.6 + 0.08 * norm(bp(noise(d), 2000, 5000)) * slow(d, 0.2)
    s = np.zeros_like(x)
    for at in events(d, 5, 9, start=3):
        for k in range(rng.integers(3, 6)): add(s, lp(bp(noise(0.08), 300, 2500) * env(0.08, 0.005, 0.06), 1200) * 0.3, at + k * 0.55)
    return x + norm(s) * 0.25


# ---------- sfx (one-shots) ----------
def tone(f, d, tau, partials=((1, 1), (2, 0.3), (3, 0.1))):
    tt = t_(d); return sum(a * np.sin(2 * np.pi * f * r * tt) for r, a in partials) * np.exp(-tt / tau) * env(d, 0.005)
def cat(*xs): return np.concatenate(xs)
def sfx_answer_correct(): return cat(tone(1047, 0.12, 0.15), tone(1568, 0.6, 0.25))
def sfx_answer_wrong(): return lp(cat(tone(330, 0.18, 0.2), tone(277, 0.45, 0.25)), 1500)  # soft, never a buzzer
def sfx_meter_rise():
    d = 1.2; tt = t_(d); f = 300 * 3 ** (tt / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * tt)) * env(d, 0.05, 0.2)
def sfx_reveal():
    x = np.zeros(int(1.4 * SR))
    for i, f in enumerate([784, 988, 1319]): add(x, tone(f, 0.9, 0.35), i * 0.11)
    add(x, bp(noise(0.6), 3000, 9000) * env(0.6, 0.2, 0.4) * 0.3, 0)
    return x
def sfx_ink_whoosh():
    d = 0.9; tt = t_(d); x = noise(d); y = np.zeros_like(x); step = 512
    for i in range(0, len(x), step):
        c = np.interp(tt[i], [0, 0.45, d], [300, 2800, 600]); y[i:i + step] = bp(x[max(0, i - 2048):i + step], c * 0.7, c * 1.3)[-len(x[i:i + step]):]
    return y * np.sin(np.pi * tt / d) ** 2
def sfx_step_grass():
    x = np.zeros(int(0.7 * SR))
    for at in (0.0, 0.38): add(x, bp(noise(0.12), 1800, 6500) * env(0.12, 0.01, 0.08) * rng.uniform(0.7, 1), at)
    return x
def sfx_wood_knock(): return cat(knock(180), np.zeros(int(0.12 * SR)), knock(170, 0.7))
def sfx_rope_creak(): return creak(0.9)


# ---------- output ----------
def loop(x, d=LOOP_S, xf=XFADE_S):
    """Fold the extra tail over the head with an equal-power fade, so the file loops without a seam."""
    n, m = int(d * SR), int(xf * SR)
    head, tail = x[:m], x[n:n + m]
    w = np.linspace(0, 1, m)
    out = x[:n].copy(); out[:m] = head * np.sqrt(w) + tail * np.sqrt(1 - w)
    return out

def write_m4a(x, path: Path, peak=0.7, rms_db=None):
    """Beds are levelled by loudness (rms_db), so bank.json's gains mean the same on every bed;
    a soft tanh limiter keeps peaks under `peak`. AAC rings on hard transients (knocks), so the
    targets sit well under full scale; tools/soundbank/peaks.sh checks the DECODED peak."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if rms_db is not None:
        x = x * (10 ** (rms_db / 20) / (np.sqrt(np.mean(x ** 2)) + 1e-12))
        x = peak * np.tanh(x / peak)
    else:
        x = norm(x, peak)
    pcm = (x * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        with wave.open(tmp.name, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-c:a', 'aac', '-b:a', '96k', str(path)], check=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(Path.home() / 'BartsMedia/historyportal/sound'))
    out = Path(ap.parse_args().out).expanduser()
    bank = json.loads(BANK.read_text())
    rows = []
    for b in bank['beds']:
        fn = globals()['bed_' + b['id'].replace('-', '_')]
        write_m4a(loop(fn(LOOP_S + XFADE_S)), out / b['file'], peak=0.5, rms_db=-20)
        rows.append((b['file'], 'ambience bed, seamless 24 s loop'))
    for s in bank['sfx']:
        fn = globals()['sfx_' + s['id'].replace('-', '_')]
        write_m4a(fn(), out / s['file'], peak=0.6)
        rows.append((s['file'], 'one-shot'))
    lines = ['# Sound bank credits', '',
             'Every file below is synthesised by `engine-mvp/tools/soundbank/make_bank.py` (History Portal),',
             'no recordings or samples used. Licence: **CC0 1.0** (self-generated). Recipe idea: lemo-opuscar',
             '`core/audio/sfx.py` (MIT, LemoLab 2026), reimplemented; no code or audio copied.', '',
             '| File | Kind | Source | Licence |', '|---|---|---|---|']
    lines += [f'| `{f}` | {k} | self-generated (make_bank.py) | CC0 1.0 |' for f, k in rows]
    (out / 'CREDITS.md').write_text('\n'.join(lines) + '\n')
    print(f'{len(rows)} files -> {out}')

if __name__ == '__main__':
    main()

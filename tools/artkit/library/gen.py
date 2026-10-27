"""Generate library sheets with ChatGPT image gen (headless codex): ink pass, then watercolour edit FROM that ink.

    python3 gen.py jobs/nl-prehistory.json                 # all sheets, ink then colour
    python3 gen.py jobs/nl-prehistory.json --only fg-trees --stage colour --variants 2

Work files: ~/BartsMedia/historyportal/library/_work/<bundle>/<sheet>/{ink.png, colour_a.png, ...}.
Every call carries the fixed template + the same anchors (codex has no memory).
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import prompts  # noqa: E402

CODEX = "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"
MEDIA = Path.home() / "BartsMedia/historyportal"
LIB = MEDIA / "library"
VERBREE = MEDIA / "topics/verbree-book-sample"
INK_ANCHOR = VERBREE / "pass1-ink/castle_ink.png"
COLOUR_ANCHOR = VERBREE / "pass2-watercolour/castle_r2.png"
TIMEOUT_S = 600


def codex(workdir: Path, prompt: str, images: list[Path], log: Path) -> bool:
    cmd = [CODEX, "exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", str(workdir)]
    for im in images:
        cmd += ["-i", str(im)]
    t = time.time()
    try:
        r = subprocess.run(cmd, input=prompt, text=True, capture_output=True, timeout=TIMEOUT_S)
        log.write_text(prompt + "\n\n=====\n" + r.stdout[-6000:] + r.stderr[-3000:])
        ok = r.returncode == 0
    except subprocess.TimeoutExpired:
        log.write_text(prompt + "\n\n===== TIMEOUT")
        ok = False
    print(f"  {log.parent.name}/{log.stem}: {'ok' if ok else 'FAIL'} {time.time() - t:.0f}s", flush=True)
    return ok


def ink(bundle: str, sheet: dict, force: bool) -> None:
    d = LIB / "_work" / bundle / sheet["id"]
    d.mkdir(parents=True, exist_ok=True)
    out = d / "ink.png"
    if out.exists() and not force:
        return
    p = prompts.ink_prompt(sheet["layer"], sheet["subject"], out.name)
    codex(d, p, [INK_ANCHOR], d / "ink.log")


def colour(bundle: str, sheet: dict, variant: str, force: bool) -> None:
    d = LIB / "_work" / bundle / sheet["id"]
    src, out = d / "ink.png", d / f"colour_{variant}.png"
    if not src.exists() or (out.exists() and not force):
        return
    p = prompts.colour_prompt(sheet["layer"], bundle, out.name)
    codex(d, p, [src, COLOUR_ANCHOR], d / f"colour_{variant}.log")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("job")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--stage", choices=["ink", "colour", "both"], default="both")
    ap.add_argument("--variants", type=int, default=2)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("-j", type=int, default=3)
    a = ap.parse_args()
    job = json.loads(Path(a.job).read_text())
    sheets = [s for s in job["sheets"] if not a.only or s["id"] in a.only]
    with ThreadPoolExecutor(a.j) as ex:
        if a.stage in ("ink", "both"):
            list(ex.map(lambda s: ink(job["bundle"], s, a.force), sheets))
        if a.stage in ("colour", "both"):
            tasks = [(s, chr(97 + v)) for s in sheets for v in range(a.variants)]
            list(ex.map(lambda t: colour(job["bundle"], t[0], t[1], a.force), tasks))


if __name__ == "__main__":
    main()

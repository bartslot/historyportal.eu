"""Paint the comic panels listed in panels.json: prompt = character prompt(s) + style prompt, source = a
Blender render with costume-coloured figures (<shot>_shadedfig.png). Writes out/<panel>.png (the latest paint).
usage: python3 paint_panels.py [panel_id ...]     (no ids: every panel whose output is missing)"""
import json, shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PACKS = Path("/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets/Dante/packs")
OUT = PACKS.parent / "comic" / "panels"
PASSES = HERE.parent / "passes" / "passes.py"


def paint(p):
    src = PACKS / p["src"]
    prompt = "\n".join((HERE / "prompts" / f).read_text().strip() for f in p["prompt"])
    tmp = OUT / (p["id"] + "_prompt.txt"); tmp.write_text(prompt)
    local = src.parent / "local"
    r = subprocess.run([sys.executable, str(PASSES), "paint", str(src), str(tmp), "--seed", str(p.get("seed", 1)),
                        "-o", str(local)], capture_output=True, text=True)
    line = (r.stdout.strip().splitlines() or [""])[-1]
    if r.returncode or not line:
        raise SystemExit("paint failed for %s: %s" % (p["id"], r.stderr[-400:]))
    shutil.copy(local / line.split()[1], OUT / (p["id"] + ".png"))
    print(p["id"], line)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    panels = json.load(open(HERE / "panels.json"))
    want = set(sys.argv[1:])
    for p in panels:
        if not p.get("src"):
            continue
        if (want and p["id"] in want) or (not want and not (OUT / (p["id"] + ".png")).exists()):
            paint(p)

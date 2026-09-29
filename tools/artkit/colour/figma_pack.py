"""Colour pass via Figma (Nano Banana 2), done by hand: no fal, no render PC (Bart, 2026-09-28).
  pack:   python3 figma_pack.py pack     -> lesson_assets/_colour_pass/in/<cat>__<sub>__<name>.png (on white)
                                           + PROMPTS.md (one prompt per asset, < 1,200 chars for Figma)
  import: python3 figma_pack.py import   <- lesson_assets/_colour_pass/out/<same name>.png|jpg|webp
          each result is resized to the original and given the ORIGINAL alpha, then written into
          resources/icons/history-line/...; the line original is kept in storage/app/art-raw/line/.
Then: php artisan icons:import --collection=history-line"""
import re, shutil, subprocess, sys
from pathlib import Path
from PIL import Image

WT = Path(__file__).resolve().parents[3]
LIB = WT / "resources/icons/history-line"
KEEP = WT / "storage/app/art-raw/line"
PASS = Path("/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets/_colour_pass")
DONE = {"figures/dante/dante-giovane", "props/medieval/lanterna", "nature/tuscany/quercia"}   # pilot, already coloured

BASE = ("Colour this black-and-white ink drawing of {what} (Italy, around 1300) as a soft hand-painted watercolour "
        "illustration for a history book: transparent washes under the existing lines, the paper glowing through. "
        "Keep every line, the drawing and its outline exactly as they are; do not redraw, move or add anything. "
        "Natural, restrained period colours: undyed wool, linen, leather browns, iron greys, muted madder red, woad "
        "blue, weld yellow, sage green. {extra}Soft shading, light from the upper left. The white background stays "
        "pure white. Any window or lantern panes are yellowish translucent horn, never clear glass. No text, no black fills.")
# character colours that must stay the same in every asset (the script's costume codes)
EXTRA = {
    "dante": "Dante always wears a deep madder-red robe (lucco) and a red cap or hood. ",
    "beatrice": "Beatrice wears a white or pale ivory gown and a light white veil. ",
    "guido-cavalcanti": "Guido wears a dark wine-red tunic and cloak. ",
    "virgilio": "Virgil wears a pale grey-blue mantle and a green laurel wreath. ",
    "papa-bonifacio": "The pope wears a white and gold cope and a white tiara. ",
    "cavaliere-guelfo": "His surcoat and shield are white with the red Florentine lily. ",
    "stendardo": "The banner is white with the red Florentine lily. ",
}


def descriptions():
    """item -> manifest description, read from the PHP manifests without PHP."""
    out = {}
    for m in (WT / "resources/art/manifests").glob("*.php"):
        for k, v in re.findall(r"'([a-z0-9-]+)'\s*=>\s*'([^']{12,})'", m.read_text()):
            out.setdefault(k, v)
    return out


def targets():
    for f in sorted(LIB.rglob("*.webp")):
        rel = f.relative_to(LIB).with_suffix("")
        if not str(rel).startswith("backdrops/") and str(rel) not in DONE:
            yield rel


def pack():
    (PASS / "in").mkdir(parents=True, exist_ok=True); (PASS / "out").mkdir(exist_ok=True)
    desc = descriptions(); lines = ["# Colour pass in Figma (Nano Banana 2)\n",
                                    "For each file in `in/`: input image = the file, prompt = below. Save the result in "
                                    "`out/` with the SAME file name. Then tell Claude: it runs `figma_pack.py import`.\n"]
    for rel in targets():
        name = rel.name
        keep = KEEP / rel.with_suffix(".webp")
        keep.parent.mkdir(parents=True, exist_ok=True)
        if not keep.exists():
            shutil.copy(LIB / rel.with_suffix(".webp"), keep)
        im = Image.open(keep).convert("RGBA")
        paper = Image.new("RGB", im.size, (255, 255, 255)); paper.paste(im, mask=im.split()[3])
        flat = str(rel).replace("/", "__")
        paper.save(PASS / "in" / (flat + ".png"))
        extra = next((v for k, v in EXTRA.items() if name.startswith(k) or k == name), "")
        prompt = BASE.format(what=desc.get(name, name.replace("-", " ")), extra=extra)
        assert len(prompt) < 1200, (name, len(prompt))
        lines.append(f"\n## {flat}.png\n```\n{prompt}\n```\n")
    (PASS / "PROMPTS.md").write_text("".join(lines))
    print("packed", len(lines) - 2, "->", PASS)


def paper_to_white(col, orig):
    """Nano Banana sometimes tints the white paper yellow. The pixels outside the original cut-out are that paper:
    scale each channel so their median becomes white (keeps enclosed whites and edge pixels from staying yellow)."""
    import numpy as np
    c = np.asarray(col).astype(np.float32)
    bg = np.asarray(orig.split()[3]) == 0
    if bg.sum() < 1000:
        return col
    gain = 255.0 / np.maximum(np.median(c[bg], axis=0), 1.0)
    return Image.fromarray(np.clip(c * gain, 0, 255).astype(np.uint8))


def do_import():
    n = 0
    for out in sorted((PASS / "out").iterdir()):
        if out.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
            continue
        stem = re.sub(r" \d+$", "", out.stem)   # Figma exports "name 1.jpg"
        rel = Path(stem.replace("__", "/"))
        keep = KEEP / rel.with_suffix(".webp")
        if not keep.exists():
            print("skip (no original):", out.name); continue
        orig = Image.open(keep).convert("RGBA")
        col = paper_to_white(Image.open(out).convert("RGB").resize(orig.size, Image.LANCZOS), orig)
        col.putalpha(orig.split()[3])
        col.save(LIB / rel.with_suffix(".webp"), "WEBP", quality=80)
        n += 1; print("imported", rel)
    print(n, "imported; now: php artisan icons:import --collection=history-line")


if __name__ == "__main__":
    {"pack": pack, "import": do_import}[sys.argv[1]]()

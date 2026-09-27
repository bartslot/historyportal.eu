"""Write <shot>_prompt.txt next to every line render, under Figma's ~1,500-character prompt limit.
usage: python3 prompts.py <packs_dir>"""
import glob, os, sys

LIMIT = 1200
HEAD = ("Turn this clean perspective line drawing into a finished black ink illustration on pure white paper, "
        "an art asset for a story set in {when}: {place}.\n"
        "Keep every object exactly where it is: same outlines, same perspective, same size. "
        "Add no objects, no people, no furniture.\n")
STYLE = ("Style: hand-inked lines with slight natural variation, restrained historical comic shading. "
         "About 10-14% black, at least 75% white. Shadows only as sparse single-direction hatching; "
         "no grey, no washes, no solid black fills.\n")
TAIL = "Nothing modern, no glass. Clean lines, clear silhouettes; no micro-detail, fused objects, repetitive marks or AI clutter."
KIND = {
    "cu": "This is the background behind a face in a close-up: keep it calm and light, fewer lines, nothing that competes with a face.\n",
    "ms": "This is the background of a medium shot: keep the middle calm for the figures.\n",
    "top": "Seen from directly above, looking down at the table top.\n",
    "ots": "Over-the-shoulder view down the street; keep the left foreground empty for a shoulder.\n",
    "wide": "",
}
PACKS = {
    "study": ("Florence, 1283", "Dante's small study",
              "rough stone blocks faintly suggested on the walls (a few, not all), wood grain and nail heads on the floor planks, "
              "iron hinges and plank grain on the shutters and the arched door, worn wood on the desk and stool, a medieval "
              "manuscript on the lectern, closed leather books, a clay inkwell, wax candles, a wool cloak with a hood on a peg."),
    "street": ("Florence, 1283-1300", "a narrow medieval street",
               "rough stone blocks faintly suggested on the tower-houses, wooden shop counters and shutters, wooden beams "
               "under the overhanging upper floors, roof eaves with rafter ends, packed earth with a few stone slabs, "
               "small arched windows with wooden shutters."),
    "priors": ("Florence, 1300", "the hall where the priors meet",
               "rough stone walls, heavy timber beams on stone corbels, a trestle table of thick planks, benches and stools, "
               "pointed windows with open wooden shutters and an iron bar, a heater shield with a lily drawn in outline, "
               "papers, a written list, a clay inkwell, a quill, a wax seal, a bound register, candles, an iron-banded chest."),
}
PACKS["forest3d"] = ("Inferno I, just before dawn", "the dark wood where Dante is lost",
                      "sinuous old trunks with deep bark furrows arching over the path like a gate, giant ferns close "
                      "in front, shadows as light sparse hatching, dappled light patches left white on the earth path, "
                      "a few sun rays slanting through the canopy, the bright opening at the end almost white. "
                      "Bare earth path; no fences, posts, gates or signs.")
PACKS["study_b"] = PACKS["study"]   # A/B test: same room with scanned props and masonry as geometry
EXTRA = {"sr02_notice_wall": "A handwritten paper notice is nailed to the wall. ",
         "sr06_cu_guido": "A handwritten paper notice is nailed to the wall. "}


def kind_of(shot):
    for k in ("cu", "top", "ots", "ms", "two"):
        if "_%s_" % k in shot or shot.endswith("_" + k):
            return {"two": "ms"}.get(k, k)
    if "mcu" in shot or "profile" in shot:
        return "ms" if "profile" in shot else "cu"
    if "desk_top" in shot or "table_top" in shot:
        return "top"
    return "wide"


# Close-ups are cut from a converted wide/medium shot (plates.py): a separate conversion of a flat
# wall has no perspective cues and Nano Banana invents a new perspective (Bart, 2026-09-27).
DERIVED = ("st04", "st05", "sr04", "sr05", "sr06", "pr03", "pr04", "pr05")

root = sys.argv[1]
# heavy packs render no Freestyle lines (lines=False): their shaded render is the conversion input
sources = {p.rsplit("_", 1)[0]: p for p in sorted(glob.glob(os.path.join(root, "*", "*_shaded.png")) +
                                                   glob.glob(os.path.join(root, "*", "*_lines.png")))}
for base, lines in sorted(sources.items()):
    pack = os.path.basename(os.path.dirname(lines))
    if pack not in PACKS:
        continue
    shot = os.path.basename(base)
    if shot.startswith(DERIVED):
        stale = os.path.join(os.path.dirname(lines), shot + "_prompt.txt")
        if os.path.exists(stale):
            os.remove(stale)
        continue
    when, place, details = PACKS[pack]
    text = (HEAD.format(when=when, place=place) + KIND[kind_of(shot)] + STYLE +
            "Add period detail inside the existing shapes only: " + EXTRA.get(shot, "") + details + "\n" + TAIL)
    assert len(text) <= LIMIT, (shot, len(text))
    open(os.path.join(os.path.dirname(lines), shot + "_prompt.txt"), "w").write(text)
    print("%-28s %-5s %4d chars" % (shot, kind_of(shot), len(text)))

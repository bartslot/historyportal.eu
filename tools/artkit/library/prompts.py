"""Fixed prompt templates for history-lines-v1 library assets.

Consistency comes from these templates + the same anchors on every call, never from free prompts.
Mirror of ~/BartsMedia/historyportal/library/STYLE.md (keep both in step).
"""
from __future__ import annotations

STYLE_ID = "history-lines-v1"

# Bart's ink rule, verbatim. Goes in every pass-1 prompt.
INK_RULE = (
    "approximately 10 to 14% black coverage. Use single-direction hatching for medium shadows and no more "
    "than two intersecting directions for deep shadows. Keep 65 to 75% white space. Cross-hatching should "
    "occupy no more than 20% of the shaded area."
)

TOOL = (
    "Use your image generation tool to create ONE image and save it as PNG to ./{out} in the current "
    "directory. Do not write code to draw it and do not post-process it; use the image generation tool. "
    "Reply only with the saved file name."
)

INK_ESSENCE = (
    "Clean black-and-white ink illustration in the style of the attached anchor (match its line quality "
    "and hatching, not its content): educational history comic, crisp black contours with an expressive, "
    "slightly broken hand-drawn line that leaves gaps for the imagination. Line drawing, {ink_rule} "
    "No solid black fills on any area that will later be coloured; dark areas are built from hatching. "
    "No colour, no grey wash, no text, no labels, no border, no frame, no signature."
)

ISOLATE = (
    "Plain untouched white paper background everywhere around and between the objects. Each object is "
    "complete (nothing cropped by the canvas edge) and stands alone with wide white space around it; "
    "objects never touch or overlap. Only a tiny tuft of ground directly under each object, no ground "
    "plane, no horizon, no cast shadows on the paper."
)

# Per-layer content framing. {subject} = era + what to draw.
LAYER = {
    "sky": (
        "A wide empty sky, full bleed, no land, no horizon, no birds. {subject} Clouds begin as negative "
        "space: large irregular cumulus silhouettes with very thin contours, few overlapping inner forms, "
        "80 to 90% of each cloud left white, only a few sparse strokes under selected lobes. The sky itself "
        "has almost no hatching. Landscape 3:2, the left and right edges must continue seamlessly."
    ),
    "bg": (
        "A far background landscape strip seen from eye level, wide panorama. {subject} The land occupies "
        "only the lower 45% of the canvas; everything above the land silhouette is empty white paper (no sky "
        "drawing, no clouds). The land runs edge to edge and fills the canvas down to the bottom edge. Far "
        "distance: fewer, thinner lines, sparse hatching. The terrain height at the left edge equals the "
        "height at the right edge so the strip can tile. Landscape 3:2."
    ),
    "strip": (
        "A ground strip seen from eye level, wide panorama: {subject} The ground runs edge to edge and "
        "fills the canvas from a gently uneven top edge at about 50% height all the way down to the bottom "
        "edge; everything above it is empty white paper. No objects standing up out of it taller than a "
        "tuft. The left edge continues seamlessly into the right edge so the strip can tile. Landscape 3:2."
    ),
    "ground": (
        "A seamless ground texture tile seen from above at a low oblique angle, as if looking down at the ground "
        "a few metres ahead: {subject} The ground fills the whole canvas edge to edge: no sky, no horizon, no "
        "object taller than a tuft, no single dominant feature. Marks are spread evenly so the tile repeats in "
        "both directions: the left edge continues into the right edge and the top edge into the bottom edge. "
        "Square."
    ),
    "near_ground": (  # stage25d set.near (S1 feat/stage-look-plates): eye 1.6 m, pitch 4, floor 2.9 m -> 16 m, ~4.9:1
        "Two separate wide bands of near ground, one in the upper half and one in the lower half of the canvas, divided "
        "by a clean strip of empty white paper; both bands show the same kind of ground but different marks: {subject} "
        "Each band is seen from standing eye height, looking ahead and slightly down: the bottom edge of a band is the "
        "ground about three metres in front of you, its top edge the ground about sixteen metres away, so tufts, stones "
        "and marks are large near the bottom of the band and become small, flatter and closer together toward its top. "
        "No horizon, no sky, nothing standing taller than a tuft, no single dominant feature. Each band runs edge to edge "
        "across the full width; its top edge is a soft uneven line. Landscape 3:2."
    ),
    "decal": (  # stage25d layer.flat: lies flat on the floor, painted straight from above
        "Ground patches seen straight from above, like looking down at the ground at your feet, each a separate "
        "isolated patch with soft ragged edges that fade into the white paper: {subject} Flat on the ground, no "
        "perspective, no horizon, nothing standing up, no cast shadows. Plain untouched white paper around and between "
        "the patches; patches never touch. Landscape 3:2."
    ),
    "ground_band": (  # stage25d set.groundBands (S1 2026-10-28): 6:1 upright strips at 2..2000 m, tileable x
        "{subject} Each band is a wide landscape strip about six times as wide as it is tall, stacked top to bottom, "
        "separated by a clean empty white paper gap. In each band everything above a soft hilly skyline is empty white "
        "paper (no sky, no clouds); below the skyline the ground runs edge to edge down to the band's bottom edge. The "
        "skyline lies about one third down from the band's top. The left end of every band continues seamlessly into its "
        "right end (same skyline height, same marks at the edges) so the band can repeat sideways. Every band has its "
        "own different skyline. No houses, no people, no animals, no trees. Landscape 3:2."
    ),
    "mid": (
        "Middle-distance set pieces, each a separate isolated object: {subject} Seen from slightly above "
        "eye level, three-quarter view, same scale for all. " + ISOLATE + " Landscape 3:2."
    ),
    "fg": (
        "Foreground nature elements, each a separate isolated object: {subject} Same light from the upper "
        "left on all. " + ISOLATE + " Landscape 3:2."
    ),
    "prop": (
        "Small historical objects as a tidy specimen sheet, each a separate isolated object: {subject} "
        "Three-quarter view from slightly above, same light from the upper left. " + ISOLATE + " Landscape 3:2."
    ),
}

COLOUR = (
    "The FIRST attached image is the locked ink drawing to colour. The SECOND attached image is the "
    "watercolour STYLE reference only (copy its watercolour handling and colour temperature, never its "
    "content). Edit the first image: keep the exact canvas size, framing, positions, every black line, "
    "hatch and cross-hatch. Do not add, remove, move or redraw anything. Colour only things already drawn.\n"
    "Colour it as a clean educational historical illustration with real transparent watercolour beneath "
    "the ink: visible paper tooth inside the washes, soft blooms and backruns at wash edges, light "
    "granulation in earth and stone colours, uneven layered glazes, colour pooling darker at the shadow "
    "side. Washes stay transparent so the ink stays dominant and black. Palette: {palette} "
    "Every drawn surface gets at least a very faint wash (white things such as birch bark, wool, linen or "
    "white stone get a pale cream or cool grey glaze), but the paper AROUND and BETWEEN objects, and the "
    "gaps between branches and leaves, stay pure untouched white paper with no wash, no tint, no shadow and "
    "no texture. {extra}\n"
    "No blur, no airbrush gradients, no speckle or dot noise, no stippling, no antique or sepia filter, no "
    "muddy wash, no glossy 3D rendering, no repainting of the linework."
)

COLOUR_EXTRA = {
    "ground": "This is a repeating ground tile: wash the whole canvas edge to edge with calm, even washes, no "
              "white paper left, no light falloff or vignette, so the tile repeats without seams.",
    "sky": (
        "This is a sky: fill the whole canvas with a very pale transparent blue watercolour sky with gentle "
        "uneven glazes; clouds stay 80 to 90% white paper with only an extremely pale cool blue-grey wash "
        "under selected lower edges."
    ),
    "strip": "Wash the whole ground band, including its pale parts, down to the bottom edge; the paper "
             "above the ground stays pure white.",
    "near_ground": "Wash both ground bands edge to edge, including their pale parts; the paper strip between and above "
                   "the bands stays pure white.",
    "ground_band": "Wash each band from its skyline down to its bottom edge with an opaque ground colour (muted olive, straw and "
                   "sandy earth), edge to edge with no white left inside the ground; the paper above each skyline and in "
                   "the gaps between bands stays pure white. Keep the left and right ends matching.",
    "decal": "Wash each patch, fading softly to nothing at its ragged edge; the paper around the patches stays pure white.",
    "bg": (
        "This is far distance: quieter and less saturated than the foreground, cool and slightly bluish. "
        "The empty paper above the land stays pure white."
    ),
}

PALETTE = {
    "nl-prehistory": (
        "olive and sap greens for vegetation (#8d9a5b, #6f7f45), pale straw and ochre for grass "
        "and reeds (#e3cf9a, #c9a86a), warm grey-brown earth (#a08a6c), weathered brown wood and bark "
        "(#7d6752), cool grey granite for boulders (#a9adab, #8e8474), heather mauve only as small accents "
        "(#b39ab0), clay brown for pottery (#b0754f), pale transparent blue sky (#d2e6f2, #a9d7f6)."
    ),
    "near-east-neolithic": (
        "sun-bleached sand and pale ochre for dry land and mudbrick (#f4d5a8, #e6ae7c, #d0bba0), warm "
        "grey-brown earth and dark Nile mud (#a08a6c, #7d6752), olive and sap greens for palms, "
        "barley and reeds (#8d9a5b, #6f7f45), straw gold for ripe grain (#e3cf9a, #c9a86a), clear muted "
        "blue-green for rivers and canals (#72a2b5, #98c3d3), whitewash cream for the temple (#f5e6ce), "
        "clay terracotta for pottery (#c07b57), pale transparent blue sky (#d2e6f2, #a9d7f6)."
    ),
    "nl-golden-age": (
        "warm brick red and rose for brick walls (#c07b57, #d79a7a), pale sandstone and cream for stone "
        "(#f4d5a8, #f5e6ce), weathered brown for wood, ships, barrels and crates (#7d6752, #b19f86), clear "
        "muted blue-green for water (#72a2b5, #98c3d3), slate blue-grey for roofs (#4a728c, #aab1b3), "
        "olive for trees (#8d9a5b), off-white canvas for sails (#f6f5ee), pale transparent blue "
        "sky (#d2e6f2, #a9d7f6)."
    ),
}


# Near layers only (sky/bg are light by nature). Ranked 1st+2nd vs the canonical ref over the same
# sheets without it, which the ranker called "dense etched shading" (2026-10-27, _work/exp_rank.log).
LIGHT_LINE = (
    "Economical line, lighter than the anchor: fewer, longer strokes. The lit side of every object stays "
    "open white paper with no hatching at all; hatching only on the shadow side and in the darkest "
    "crevices. Leaves and grass are suggested by a few contour shapes, not drawn one by one."
)


def ink_prompt(template: str, subject: str, out: str) -> str:
    parts = [TOOL.format(out=out), LAYER[template].format(subject=subject), INK_ESSENCE.format(ink_rule=INK_RULE)]
    if template not in ("sky", "bg"):
        parts.append(LIGHT_LINE)
    return "\n\n".join(parts)


def colour_prompt(template: str, bundle: str, out: str) -> str:
    extra = COLOUR_EXTRA.get(template, "")
    if template == "bg":
        extra += " " + COLOUR_EXTRA["strip"]
    body = COLOUR.format(palette=PALETTE[bundle], extra=extra)
    return "\n\n".join([TOOL.format(out=out), body])


RANK = (
    "Do not generate or edit any image. Look at the attached images. Image 1 is the REFERENCE. Images 2 to "
    "{n1} are candidates {labels}. Ignore subject matter and composition. Judge only the drawing and "
    "painting style: ink line quality, hatching density, watercolour handling (transparency, paper tooth, "
    "blooms, granulation), palette and value range. Rank the candidates from most to least like the "
    "reference in style, and for each say whether its style is 'alike', 'close' or 'different' to the "
    "reference. Answer with only one line of JSON, no markdown: "
    '{{"ranking": ["A", ...], "verdict": {{"A": "alike|close|different", ...}}, "why": "one short sentence"}}'
)


def rank_prompt(n: int) -> str:
    labels = ", ".join(chr(65 + i) for i in range(n))
    return RANK.format(n1=n + 1, labels=labels)


# --- Weave (Figma, GPT Image 2.5) ---------------------------------------------------------------
# Same templates, minus the codex TOOL line, plus an explicit role for every attached image.
# Reference order is fixed (weave.REF_ORDER): 4 watercolours, their 4 inks, the texture ref.

WEAVE_REFS = (
    "Of the nine attached reference images, the first four are finished History Lines watercolour "
    "illustrations, the next four are the black ink drawings those watercolours were painted over, the last "
    "one is a watercolour texture reference. They show STYLE only: never copy their subjects, buildings, people or "
    "composition."
)

WEAVE_INK_LEAD = (
    "Draw a NEW black-and-white ink drawing (pass 1 of 2: ink only, colour comes later). Match the line "
    "quality, line weight and sparing hatching of the ink references exactly."
)

WEAVE_COLOUR_LEAD = (
    "The image being edited is the locked ink drawing to colour (pass 2 of 2). Colour it the way the watercolour references "
    "were painted over their inks: same watercolour handling, transparency, paper tooth, blooms, backruns, "
    "granulation and colour temperature."
)


# Figma's edit model mottles stone and adds ground patches (consistency check 2026-10-27).
WEAVE_COLOUR_CALM = (
    "Keep each wash broad and calm inside its shape: no mottled patches, no lichen or moss spots, no added "
    "pebbles, dots or ground patches outside the drawn lines. Output the same framing as the ink: no zoom, "
    "no crop."
)


def _refs_line(first: int = 1) -> str:
    return WEAVE_REFS


def weave_ink_prompt(template: str, subject: str) -> str:
    parts = [WEAVE_INK_LEAD, _refs_line(1), LAYER[template].format(subject=subject),
             INK_ESSENCE.format(ink_rule=INK_RULE)]
    if template not in ("sky", "bg"):
        parts.append(LIGHT_LINE)
    return "\n\n".join(parts)


# Measured on the 4 approved watercolours with refs_kind.stats (2026-10-28): wash chroma C* mean 13-22 (p90 30-37),
# darkest washes L* ~47-51, lightest ~92-96, dark washes (L* 40-60) on 9-19 % of the painted area. PM: drop
# "restrained", ask for the refs' saturated, high-contrast washes and their darker accents.
REF_COLOUR = (  # PM 2026-10-28 (2nd): the "saturated" push made greens too bright; match the refs, not more
    "Colour strength like the watercolour references, not more: muted earth tones, clear but never bright or "
    "candy-coloured washes (the references' wash chroma is low to moderate, about C* 13 to 22); the darkest washes "
    "go about half way to black on the shadow sides (never as dark as the ink), the lightest stay near paper white "
    "on the lit sides, and darker accent washes cover roughly an eighth of the painted area. Greens stay olive and "
    "sage, never lime or emerald."
)


def weave_colour_prompt(template: str, bundle: str) -> str:
    extra = COLOUR_EXTRA.get(template, "")
    if template == "bg":
        extra += " " + COLOUR_EXTRA["strip"]
    body = COLOUR.format(palette=PALETTE[bundle], extra=extra)
    body = body.replace(
        "The FIRST attached image is the locked ink drawing to colour. The SECOND attached image is the "
        "watercolour STYLE reference only (copy its watercolour handling and colour temperature, never its "
        "content). ", "").replace("Edit the first image", "Edit the ink drawing")
    return "\n\n".join([WEAVE_COLOUR_LEAD, _refs_line(2), body, REF_COLOUR, WEAVE_COLOUR_CALM, STYLE_GAPS])


# Figma generate_image is text-only: the ink pass describes the anchor instead of attaching it.
FIGMA_INK_LEAD = (
    "A black-and-white ink drawing for a children's history book, pass 1 of 2 (ink only, watercolour comes "
    "later). The look of a confident European bande-dessinee history illustrator working with a dip pen: "
    "clean black contours of varying weight, slightly broken where light hits, sparse parallel hatching "
    "only on shadow sides, large areas of untouched white paper."
)


def figma_ink_prompt(template: str, subject: str) -> str:
    essence = INK_ESSENCE.format(ink_rule=INK_RULE).replace(
        " in the style of the attached anchor (match its line quality and hatching, not its content)", "")
    parts = [FIGMA_INK_LEAD, LAYER[template].format(subject=subject), essence,
             "No people and no animals unless they are named above; nothing from a later period."]
    if template not in ("sky", "bg"):
        parts.append(LIGHT_LINE.replace("lighter than the anchor", "light"))
    return " ".join(" ".join(parts).split())


# Second colour pass for sheets the judge scored < 8 (ChatGPT critiques 2026-10-27: micro-detail, weak contour
# hierarchy, uniform/saturated washes, speckled stone, realistic 3D shading).
WEAVE_COLOUR_FIX = (
    "Make it read like the watercolour references: keep the black ink outlines dark and confident, strongest on "
    "the outer silhouette of each object; let the watercolour sit in distinct, irregular, transparent patches "
    "with paper white showing through on the lit sides; simplify texture into a few broad washes; stone stays a "
    "calm pale grey with soft wash shadows, never speckled; no realistic 3D or anatomical shading."
)


# The three gaps the independent checker measured against the references (2026-10-27). Part of every colour pass.
STYLE_GAPS = (
    "Match the references' paper and paint: visible cold-press paper tooth in every wash, uneven washes with soft "
    "blooms, backruns and light granulation, never flat even fills. Keep the outer contour thin-to-medium and broken "
    "and do not add interior detail lines. Use the references' palette: soft sky blues, warm "
    "sandstone and ochre, muted local colour, with generous paper white left on the lit sides."
)


# v3 sparse ink (2026-10-28). Every protocol-2 critique blamed the INK: dense dark shading and interior
# micro-detail that no colour edit can undo. Same rule, said as drawing instructions the model follows.
SPARSE_INK = (
    "SPARSE INK, this matters most: a thin-to-medium, broken, varied outer contour (a little heavier on the shadow "
    "side and at the base, thinning and breaking open where light hits, never a uniform heavy outline) carries each object. Inside the contour "
    "draw only about half the detail you normally would: a few structural lines, no texture marks, no fur, wool, "
    "bark, leaf, grass, scale, plank-grain, stone-grain or wave micro-strokes; suggest masses of leaves, wool or "
    "waves by their outline and a few inner shapes only. Medium shadow = a small patch of single-direction "
    "parallel hatching on the shadow side, nothing else. Deepest shade only (under overhangs, crevices, the "
    "darkest underside) may use two crossing directions, never three, and cross-hatching stays under one fifth "
    "of the shaded area. The lit half of every object is open white paper inside its contour. Aim for about "
    "12% black ink and 70% white paper inside each object."
)

# Plants measured 28 % black with SPARSE_INK alone (fg-shrubs ink3): foliage needs its own instruction.
SPARSE_FOLIAGE = (
    "NOT a botanical engraving and NOT a field-guide plate. Foliage, needles, heather, grass and fleece are drawn "
    "the picture-book way: each bush or crown is one big silhouette made of 3 to 7 scalloped or spiky lobes, each "
    "lobe a single closed wobbly contour that is EMPTY white paper inside. A few short marks only along the edge of "
    "a lobe, never inside it; never draw individual needles, florets or berries in rows. Hatch only a narrow band "
    "under the lowest lobes. Branches and stems are single strokes."
)
FOLIAGE_WORDS = ("tree", "shrub", "bush", "heather", "bramble", "reed", "grass", "hedge", "juniper", "hazel",
                 "willow", "linden", "elm", "oak", "birch", "palm", "barley", "wheat", "sheep", "wool")


def sparse_ink_prompt(template: str, subject: str) -> str:
    """figma_ink_prompt with the v3 sparse block in place of LIGHT_LINE (all layers, skies keep their own rule)."""
    essence = INK_ESSENCE.format(ink_rule=INK_RULE).replace(
        " in the style of the attached anchor (match its line quality and hatching, not its content)", "")
    parts = [FIGMA_INK_LEAD, LAYER[template].format(subject=subject), essence,
             "No people and no animals unless they are named above; nothing from a later period."]
    if template != "sky":
        parts.append(SPARSE_INK)
        if any(w in subject.lower() for w in FOLIAGE_WORDS):
            parts.append(SPARSE_FOLIAGE)
    return " ".join(" ".join(parts).split())


if __name__ == "__main__":  # python3 prompts.py jobs/<bundle>.json <sheet>  -> the v3 sparse ink prompt
    import json
    import sys
    _job = json.loads(open(sys.argv[1]).read())
    _s = next(x for x in _job["sheets"] if x["id"] == sys.argv[2])
    print(sparse_ink_prompt("strip" if _s.get("strip") else _s["layer"], _s["subject"]))

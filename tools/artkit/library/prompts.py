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
    "side. Washes stay transparent so the ink stays dominant and black. Restrained palette: {palette} "
    "Every drawn surface gets at least a very faint wash (white things such as birch bark, wool, linen or "
    "white stone get a pale cream or cool grey glaze), but the paper AROUND and BETWEEN objects, and the "
    "gaps between branches and leaves, stay pure untouched white paper with no wash, no tint, no shadow and "
    "no texture. {extra}\n"
    "No blur, no airbrush gradients, no speckle or dot noise, no stippling, no antique or sepia filter, no "
    "muddy wash, no glossy 3D rendering, no repainting of the linework."
)

COLOUR_EXTRA = {
    "sky": (
        "This is a sky: fill the whole canvas with a very pale transparent blue watercolour sky with gentle "
        "uneven glazes; clouds stay 80 to 90% white paper with only an extremely pale cool blue-grey wash "
        "under selected lower edges."
    ),
    "strip": "Wash the whole ground band, including its pale parts, down to the bottom edge; the paper "
             "above the ground stays pure white.",
    "bg": (
        "This is far distance: quieter and less saturated than the foreground, cool and slightly bluish. "
        "The empty paper above the land stays pure white."
    ),
}

PALETTE = {
    "nl-prehistory": (
        "restrained olive and sap greens for vegetation (#8d9a5b, #6f7f45), pale straw and ochre for grass "
        "and reeds (#e3cf9a, #c9a86a), warm grey-brown earth (#a08a6c), weathered brown wood and bark "
        "(#7d6752), cool grey granite for boulders (#a9adab, #8e8474), heather mauve only as small accents "
        "(#b39ab0), clay brown for pottery (#b0754f), pale transparent blue sky (#d2e6f2, #a9d7f6)."
    ),
    "nl-golden-age": (
        "warm brick red and rose for brick walls (#c07b57, #d79a7a), pale sandstone and cream for stone "
        "(#f4d5a8, #f5e6ce), weathered brown for wood, ships, barrels and crates (#7d6752, #b19f86), clear "
        "muted blue-green for water (#72a2b5, #98c3d3), slate blue-grey for roofs (#4a728c, #aab1b3), "
        "restrained olive for trees (#8d9a5b), off-white canvas for sails (#f6f5ee), pale transparent blue "
        "sky (#d2e6f2, #a9d7f6)."
    ),
}


def ink_prompt(template: str, subject: str, out: str) -> str:
    return "\n\n".join([
        TOOL.format(out=out),
        LAYER[template].format(subject=subject),
        INK_ESSENCE.format(ink_rule=INK_RULE),
    ])


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

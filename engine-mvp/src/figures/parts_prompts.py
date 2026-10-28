"""The PARTS SHEET prompts (two-pass since round 2: ink_prompt, then colour_prompt as Figma "Edit with prompt" on the
ink node with the 9 library refs; v1 sheets were text-only prompt()) (Figma generate_image, gpt-image-2.5-sunburst, 1536x1024) for every puppet character and
view. The grid order is what cut_parts.py ROWS expects. usage: python3 parts_prompts.py [character_view]"""
import json
import sys
STYLE = ("Style: History Lines: a confident DARK ink drawing carries everything, bold variable-weight contour (thick on the shadow side, thin in the light), "
 "ink fold lines in the cloth, a few ink lines of facial detail (brows, eyelids, nose ridge, mouth corners), single-direction hatching only in the deepest shadows; "
 "transparent watercolour washes under the ink with paper tooth, soft blooms, light granulation, pigment pooling on the shadow side. No glossy 3D, no airbrush, no blur, no shadows on the ground.")
CHAR = {
 "boer-vrouw": ("a Neolithic Funnelbeaker farmer woman of the Netherlands, c. 3400 BCE, about 30, slim realistic adult proportions (7.5 heads tall), long calm face, hair tied back in a low knot, ankle-length undyed wool dress in warm straw tones, woven red-brown belt, short hide cape, bare feet",
   "woman", "Palette: straw #e3cf9a, ochre #c9a86a, earth #a08a6c, bark #7d6752, clay #b0754f, skin warm."),
 "boer-man": ("a Neolithic Funnelbeaker farmer man of the Netherlands, c. 3400 BCE, about 35, lean and strong, realistic adult proportions (7.5 heads tall), long weathered face, short dark beard, shoulder-length dark hair, knee-length wool tunic in olive green with a leather belt, long sleeves, hide leg wraps tied with cord from knee to ankle, simple hide shoes",
   "man", "Palette: olive #8d9a5b, sap #6f7f45, straw #e3cf9a, earth #a08a6c, bark #7d6752, skin weathered."),
 "voc-matroos": ("a Dutch VOC sailor of the 1640s, about 25, wiry, realistic adult proportions (7.5 heads tall), long face, clean-shaven, short untidy hair, loose off-white linen shirt with long sleeves, short red-brown wool waistcoat, wide slate-blue canvas knee breeches, grey wool stockings, low black leather shoes",
   "voc", "Palette: slate #4a728c, water #72a2b5, cream #f5e6ce, brick #c07b57, wood #7d6752, skin weathered."),
 "voc-kapitein": ("a Dutch VOC ship's captain of the 1640s in the look of Abel Tasman: about 40, realistic adult proportions (7.5 heads tall), long serious face, dark moustache and a small chin tuft, shoulder-length dark hair, black wool doublet with long sleeves and a broad white linen falling collar, black knee breeches, dark stockings, black shoes with a small buckle",
   "voc", "Palette: black and charcoal with cream #f5e6ce linen, sandstone #f4d5a8, wood #7d6752, skin warm."),
}
HAT = {"boer-man": "a simple rounded hide cap", "voc-matroos": "a red-brown knitted wool Monmouth cap", "voc-kapitein": "a wide-brimmed black flat felt hat of the 1640s with a low crown"}
VIEW = {"34": "THREE-QUARTER VIEW facing right", "side": "exact SIDE PROFILE facing right", "front": "FRONT VIEW facing the viewer"}
def prompt(cid, view):
    desc, kind, pal = CHAR[cid]
    v = VIEW[view]
    heads = "(1) head + neck, neutral face, bare-headed; (2) the same head, happy smile; (3) the same head, worried; (4) the same head, surprised;"
    torso = "(5) torso from the neck to the hips with the clothing, NO arms and NO sleeves (sleeves belong to the arm parts), only the armholes, no head;"
    if kind == "woman":
        r1 = f"Row 1: {heads} {torso} (6) the skirt of the dress from the belt down to the hem, hanging straight, no legs visible."
        r2 = "Row 2: (1) upper arm in the sleeve, hanging straight down, shoulder at the top, elbow at the bottom; (2) forearm hanging straight down, elbow at the top, wrist at the bottom; (3) open hand hanging down; (4) hand gripping (closed around a handle); (5) hand pointing with the index finger, pointing down; (6) empty."
        r3 = "Row 3: (1) thigh hanging straight down, hip at the top, knee at the bottom (bare leg); (2) lower leg hanging straight down, knee at the top, ankle at the bottom; (3) bare foot; (4) a second bare foot; (5) empty; (6) empty."
    elif kind == "man":
        r1 = f"Row 1: {heads} {torso.replace('to the hips', 'to the belt')} (6) the skirt of the tunic from the belt down to the knee, hanging straight, no legs visible."
        r2 = f"Row 2: (1) upper arm in the sleeve, hanging straight down, shoulder at the top, elbow at the bottom; (2) forearm in the sleeve hanging straight down, elbow at the top, wrist at the bottom; (3) open hand hanging down; (4) hand gripping (closed around a handle); (5) hand pointing with the index finger, pointing down; (6) {HAT[cid]} on its own."
        r3 = "Row 3: (1) bare thigh hanging straight down, hip at the top, knee at the bottom; (2) lower leg in the leg wraps hanging straight down, knee at the top, ankle at the bottom; (3) foot in a hide shoe; (4) a second foot in a hide shoe; (5) empty; (6) empty."
    else:
        r1 = f"Row 1: {heads} {torso} (6) {HAT[cid]} on its own."
        r2 = "Row 2: (1) upper arm in the sleeve, hanging straight down, shoulder at the top, elbow at the bottom; (2) forearm in the sleeve hanging straight down, elbow at the top, wrist at the bottom; (3) open hand hanging down; (4) hand gripping (closed around a handle); (5) hand pointing with the index finger, pointing down; (6) empty."
        r3 = "Row 3: (1) thigh in the breeches hanging straight down, hip at the top, knee at the bottom; (2) lower leg in the stocking hanging straight down, knee at the top, ankle at the bottom; (3) foot in the shoe; (4) a second foot in the shoe; (5) empty; (6) empty."
    return (f"Cut-out puppet PARTS SHEET for a children's history book animation, on pure flat white paper. The character: {desc}. "
            f"Every part drawn in {v}, at the same scale, each part SEPARATE with clear white space around it, never touching or overlapping another part, no labels, no text, no numbers, no guide lines. "
            f"Lay the parts out in a strict grid of 6 columns and 3 rows, one part centred in each cell:\n{r1}\n{r2}\n{r3}\n"
            "Each limb part slightly longer at its joint ends with a rounded overlap so pieces can rotate under each other.\n" + STYLE + " " + pal)
# --- two-pass (round 2): the art library's v3 templates (claude/art-library-v3 tools/artkit/library/prompts.py),
# copied so the figures stay one look with the scenes; keep in step with that file.
FIGMA_INK_LEAD = "A black-and-white ink drawing for a children's history book, pass 1 of 2 (ink only, watercolour comes later). The look of a confident European bande-dessinee history illustrator working with a dip pen: clean black contours of varying weight, slightly broken where light hits, sparse parallel hatching only on shadow sides, large areas of untouched white paper."
INK_ESSENCE = 'Clean black-and-white ink illustration: educational history comic, crisp black contours with an expressive, slightly broken hand-drawn line that leaves gaps for the imagination. Line drawing, approximately 10 to 14% black coverage. Use single-direction hatching for medium shadows and no more than two intersecting directions for deep shadows. Keep 65 to 75% white space. Cross-hatching should occupy no more than 20% of the shaded area. No solid black fills on any area that will later be coloured; dark areas are built from hatching. No colour, no grey wash, no text, no labels, no border, no frame, no signature.'
SPARSE_INK = 'SPARSE INK, this matters most: a bold, slightly broken outer contour of varying weight (thick on the shadow side and at the base, thinning and breaking open where light hits) carries each object. Inside the contour draw only about half the detail you normally would: a few structural lines, no texture marks, no fur, wool, bark, leaf, grass, scale, plank-grain, stone-grain or wave micro-strokes; suggest masses of leaves, wool or waves by their outline and a few inner shapes only. Medium shadow = a small patch of single-direction parallel hatching on the shadow side, nothing else. Deepest shade only (under overhangs, crevices, the darkest underside) may use two crossing directions, never three, and cross-hatching stays under one fifth of the shaded area. The lit half of every object is open white paper inside its contour. Aim for about 12% black ink and 70% white paper inside each object.'
FACES = ("Faces: a few precise ink lines for brows, eyelids, the nose ridge and the mouth corners; the expression must "
         "read clearly. The figure has realistic adult proportions, a long face.")
COLOUR = "The image being edited is the locked ink drawing to colour (pass 2 of 2). Colour it the way the watercolour references were painted over their inks: same watercolour handling, transparency, paper tooth, blooms, backruns, granulation and colour temperature. Of the nine attached reference images, four are finished History Lines watercolour illustrations, four are the black ink drawings those watercolours were painted over, and one is a watercolour texture reference. They show STYLE only: never copy their subjects, buildings, people or composition. Edit the ink drawing: keep the exact canvas size, framing, positions, every black line, hatch and cross-hatch. Do not add, remove, move or redraw anything. Colour only things already drawn. Colour it as a clean educational historical illustration with real transparent watercolour beneath the ink: visible paper tooth inside the washes, soft blooms and backruns at wash edges, light granulation in earth and stone colours, uneven layered glazes, colour pooling darker at the shadow side. Washes stay transparent so the ink stays dominant and black. Restrained palette: restrained olive and sap greens for vegetation (#8d9a5b, #6f7f45), pale straw and ochre for grass and reeds (#e3cf9a, #c9a86a), warm grey-brown earth (#a08a6c), weathered brown wood and bark (#7d6752), cool grey granite for boulders (#a9adab, #8e8474), heather mauve only as small accents (#b39ab0), clay brown for pottery (#b0754f), pale transparent blue sky (#d2e6f2, #a9d7f6). Every drawn surface gets at least a very faint wash (white things such as birch bark, wool, linen or white stone get a pale cream or cool grey glaze), but the paper AROUND and BETWEEN objects, and the gaps between branches and leaves, stay pure untouched white paper with no wash, no tint, no shadow and no texture. No blur, no airbrush gradients, no speckle or dot noise, no stippling, no antique or sepia filter, no muddy wash, no glossy 3D rendering, no repainting of the linework. Keep each wash broad and calm inside its shape: no mottled patches, no lichen or moss spots, no added pebbles, dots or ground patches outside the drawn lines. Output the same framing as the ink: no zoom, no crop. Match the references' paper and paint: visible cold-press paper tooth in every wash, uneven washes with soft blooms, backruns and light granulation, never flat even fills. Keep the outer contour bold and slightly broken and do not add interior detail lines. Use the references' wider, warmer palette: clear saturated sky blues, warm sandstone and ochre, and confident local colour, with generous paper white left on the lit sides."
GARMENTS = {
    "boer-vrouw": "The wool dress (torso, skirt, sleeves) undyed warm straw and pale ochre; the short cape a soft brown hide; the woven belt red-brown clay; skin a warm light flesh tone with a little rose on the cheeks, on every head, hand, bare leg and foot (the thighs and lower legs are BARE SKIN, not cloth); hair warm mid brown.",
    "boer-man": "The wool tunic (torso, skirt, sleeves) olive green; the belt and the shoes brown leather; the leg wraps pale hide with dark cord; the cap brown hide; skin weathered warm; hair and beard dark brown.",
    "voc-matroos": "The shirt off-white linen; the waistcoat brick red-brown wool; the breeches slate blue canvas; the stockings grey wool; the shoes black leather; the cap red-brown knitted wool; skin weathered warm; hair mid brown.",
    "voc-kapitein": "The doublet, sleeves and breeches black wool shown as deep blue-black washes, never flat black; the falling collar and cuffs cream linen; the stockings dark grey; the shoes black with a brass buckle; the hat black felt; skin warm; hair, moustache and chin tuft dark brown.",
}


# Bart's FIGURE rules (round 3, PM 10-28): the background coverage rule and the sparse template are for scenery. A
# figure is carried by a dark, variable-weight contour and drawn fold lines; no hatching, only light etching in the
# darkest spots.
FIGURE_INK = (
    "A black-and-white ink drawing for a children's history book, pass 1 of 2 (ink only, watercolour comes later), in "
    "the manner of a confident European bande-dessinee history illustrator working with a dip pen. FIGURE INK, this "
    "matters most: every part is carried by a DARK, BOLD contour of strongly varying weight, thick and black on the "
    "shadow side, at the base and where one form overlaps another, thinning to a fine line and breaking open where light "
    "hits. Draw the folds of the cloth as confident ink fold lines (a few long strokes that follow how the cloth hangs "
    "and bunches), the seams, hems and the edges of the garments, the hair as a few flowing strokes, the face with a few "
    "precise lines. NO hatching and no cross-hatching anywhere, no stippling, no texture marks; only in the very darkest "
    "spots (deep under a fold, under the chin, inside a sleeve opening) a few short light etched strokes. Leave the "
    "inside of every form open white paper for the watercolour. No colour, no grey wash, no solid black fills, no text, "
    "no labels, no border, no frame, no signature."
)
SNUG = ("The cape or any outer garment sits snug on the torso part and ends above the elbow; nothing hangs off the edge "
        "of a part as a loose flap.")


def ink_prompt(cid: str, view: str) -> str:
    body = prompt(cid, view).split("\nEach limb part")[0].replace(
        "Cut-out puppet PARTS SHEET for a children's history book animation, on pure flat white paper. ", "A puppet PARTS SHEET on pure flat white paper. ")
    parts = [body, "Each limb part slightly longer at its joint ends with a rounded overlap so pieces can rotate under each other.",
             FIGURE_INK, SNUG, FACES]
    return " ".join(" ".join(parts).split())


# the 4 watercolour refs, painted area only (Lab; measured 10-28, numbers sent to art-library-v3): median chroma 9-20,
# p90 28-34, lightness spread (std) 20-26, 4-8 percent dark accents under L 25
REF_COLOUR = ("Match the references' measured colour: in the painted areas a median chroma around 16 with the strongest "
              "washes reaching about 33, a full value range (lightness spread like the references, deep shadows next to "
              "pale lights) and 5 to 8 percent dark accents in the deepest shade. Washes vary inside every shape: wetter "
              "and darker on the shadow side, lifting to near paper on the lit side, with soft blooms where two washes meet.")


def colour_prompt(cid: str) -> str:
    return " ".join((COLOUR.replace("Restrained palette", "Palette").replace("restrained ", "") + " " + REF_COLOUR + " This is a cut-out PARTS SHEET of one character: give the same thing the same colour on every part. "
                     + GARMENTS[cid] + " Every part keeps a crisp outline; the white paper between the parts stays pure white.").split())


# --- round 4 (PM 10-28, option A): whole-figure POSE paintings, one per pose (Bart's LEGO rule: drawn once, reused);
# cut-out stays only for the head (4 expressions), a breathing sway and the hat
POSE_SHEETS = {
    "A": ["standing at ease, relaxed contrapposto, weight on one leg, arms hanging loosely",
          "walking, first step: the near leg forward with the heel down, the far leg behind, arms swinging opposite",
          "walking, passing: the legs together under the body, one foot lifted a little, arms close to the body",
          "walking, second step: the far leg forward with the heel down, the near leg behind, arms swinging opposite"],
    "B": ["pointing ahead with the near arm stretched out at shoulder height, the index finger pointing, body leaning a little into it",
          "carrying a basket in front of the body with both hands, elbows bent, leaning back a little against the weight",
          "kneeling on one knee: the far knee up with that foot flat on the ground, the near knee on the ground, hands resting on the raised knee, the long dress falling over the legs to the ground",
          "sitting on a low rough stone, knees bent, feet flat on the ground, hands in the lap, the dress falling over the knees"],
}
STYLISED_FACE = ("Faces are STYLISED like a European history comic: almond eyes drawn with one line and a dot for the pupil, "
                 "simple brows, a nose drawn as one line, the mouth one short line, no realistic modelling, no wrinkles, no "
                 "skin texture; the expression reads from the brows and the mouth.")
GROUND_TUFT = "Each figure stands on a small loose tuft of heath grass under its feet (drawn, not a ground plane)."
VALUE = ("The garment is a mid-value colour, clearly darker than pale sand, so the figure separates from a pale ground; "
         "never a light outline around the figure.")


def pose_ink_prompt(cid: str, view: str, sheet: str) -> str:
    desc = CHAR[cid][0]
    v = VIEW[view]
    if sheet == "H":
        body = (f"A sheet of FOUR heads of the same character on pure flat white paper, in one row, same scale, each separate "
                f"with wide white space: the head and neck only, the neck ending in a clean straight cut at the collar line. "
                f"The character: {desc}. All drawn in {v}. (1) neutral, calm; (2) happy, a smile; (3) worried; (4) surprised, "
                f"brows up, mouth a little open. Bare-headed. No labels, no text.")
    else:
        poses = " ".join(f"({i + 1}) {p};" for i, p in enumerate(POSE_SHEETS[sheet]))
        body = (f"A sheet of FOUR full figures of the same character on pure flat white paper, in one row from left to right, "
                f"all at the SAME scale and standing on the same baseline, each separate with wide white space, never touching. "
                f"The character: {desc}. All drawn in {v}, each WITH the head, a calm neutral face. The poses: {poses} "
                f"The bare feet stand directly on the white paper: no grass, no ground, no shadow. No labels, no text, no numbers.")
    return " ".join(" ".join([body, FIGURE_INK, STYLISED_FACE, "Realistic adult proportions, 7.5 heads tall."]).split())


def pose_colour_prompt(cid: str) -> str:
    return " ".join((COLOUR.replace("Restrained palette", "Palette").replace("restrained ", "") + " " + REF_COLOUR
                     + " Granulated washes like the scene paintings: pigment settling in the paper tooth, never smooth gradients. "
                     + VALUE + " This sheet shows one character: the same thing gets the same colour on every figure. "
                     + POSE_GARMENTS.get(cid, GARMENTS[cid]) + " Every figure keeps a crisp drawn outline; the white paper "
                     + "between the figures stays pure white.").split())


POSE_GARMENTS = {
    "boer-vrouw": "The wool dress a natural mid-brown sheep's wool with warm ochre in the lights; the short cape a darker brown hide; the woven belt red-brown clay; skin a warm flesh tone; hair warm mid brown; the grass tuft olive and straw.",
}


if __name__ == "__main__":
    # python3 parts_prompts.py ink boer-vrouw_side | colour boer-vrouw | v1 boer-vrouw_side
    kind, key = sys.argv[1], sys.argv[2]
    if kind == "pose-ink":  # boer-vrouw_34_A
        print(pose_ink_prompt(*key.split("_")))
    elif kind == "pose-colour":
        print(pose_colour_prompt(key))
    else:
        print(ink_prompt(*key.split("_")) if kind == "ink" else colour_prompt(key) if kind == "colour" else prompt(*key.split("_")))

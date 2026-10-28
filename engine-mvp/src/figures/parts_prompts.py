"""The PARTS SHEET prompts (Figma generate_image, gpt-image-2.5-sunburst, 1536x1024) for every puppet character and
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
    torso = "(5) torso from the neck to the hips with the clothing, no arms, no head;"
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
if __name__ == "__main__":
    out = {f"{c}_{v}": prompt(c, v) for c in CHAR for v in VIEW}
    print(out[sys.argv[1]] if len(sys.argv) > 1 else json.dumps(out, indent=1))

"""Real-world heights for the history-line library, decided by JEV.

    python3 tools/diorama/library_heights.py            # ask JEV, write resources/icons/history-line/meta.json
    php artisan icons:import --collection=history-line  # store it on the library rows

Bart, 2026-09-29: every asset in our system stores WHAT it is and HOW TALL it is, so a diorama can
stand it on the floor at the right size (and so a screen reader can say what it is). The height is
of the drawn thing only, top to ground, never the transparent margin around it.

Each asset below has a description (written from looking at the picture: JEV cannot see images),
a placement, and for things that stand, three candidate heights. JEV picks the height.
Placement: stands (on a floor, bottom of the drawing = ground contact), sky (clouds, birds),
held (carried by a figure, never on the floor alone), closeup (an insert drawing of a small object),
cropped (cut off, no ground contact: cannot stand on a floor).
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artkit", "jev"))
from jev import ask  # noqa: E402

COLLECTION = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "resources", "icons", "history-line")
OUT = os.path.join(COLLECTION, "meta.json")
# One person is one height in every pose (JEV was unsure on some poses; the confident ones win).
SAME_PERSON = {"dante": 1.68}

# source_ref: (description, placement, candidate heights in metres or None)
ASSETS = {
    "architecture/florence/battistero.webp": ("The Baptistery of San Giovanni in Florence: an octagonal building with green and white marble bands and a small lantern on top of its dome, drawn whole from the ground to the tip of the lantern.", "stands", [22, 28, 34]),
    "architecture/florence/casa-torre.webp": ("A medieval Florentine tower house: a tall square stone tower with a wooden balcony high up, drawn whole from the ground to the top of its battlements.", "stands", [15, 25, 40]),
    "architecture/florence/chiesa-romanica.webp": ("A Romanesque church facade with a round rose window, arched doorway and small bell turret, drawn whole from the ground to the top of the gable.", "stands", [12, 18, 25]),
    "architecture/florence/porta-citta.webp": ("A medieval city gate: a square crenellated stone tower with a tall archway through it and a stretch of crenellated town wall, drawn from the ground to the top of the tower.", "stands", [12, 18, 25]),
    "figures/citizens/frate.webp": ("A friar in a brown habit with a knotted rope belt and sandals, standing, hands together.", "stands", [1.60, 1.68, 1.78]),
    "figures/citizens/scriba.webp": ("A scribe standing at a tall wooden writing desk, writing with a quill; the figure's head is the highest point.", "stands", [1.60, 1.68, 1.78]),
    "figures/citizens/donna-fiorentina.webp": ("A Florentine woman in a long dress and blue veil, standing, carrying a basket.", "stands", [1.52, 1.60, 1.68]),
    "figures/citizens/mercante.webp": ("A merchant in a long light tunic with a belt purse, standing, one hand out.", "stands", [1.60, 1.68, 1.78]),
    "figures/dante/beatrice.webp": ("Beatrice, a young Florentine woman in a long white gown and veil, standing.", "stands", [1.52, 1.60, 1.68]),
    "figures/dante/dante-cavaliere.webp": ("Dante as a young cavalryman in chain mail and a red surcoat, riding a saddled horse; the rider's head is the highest point.", "stands", [2.2, 2.45, 2.7]),
    "figures/dante/dante-esule.webp": ("Dante in exile: an older man in a red hooded robe with a walking staff and a shoulder bag, standing.", "stands", [1.60, 1.68, 1.78]),
    "figures/dante/dante-scrive.webp": ("Dante seated on a wooden chair, writing in a book on his lap; figure and chair are one drawing, his head is the highest point.", "stands", [1.15, 1.30, 1.45]),
    "figures/dante/dante-cammina.webp": ("Dante walking with a staff, in a red robe and white cap, a bag at his side.", "stands", [1.60, 1.68, 1.78]),
    "figures/dante/dante-legge.webp": ("Dante standing in a long red robe and red cap, reading a book held in both hands.", "stands", [1.60, 1.68, 1.78]),
    "figures/dante/guido-cavalcanti.webp": ("Guido Cavalcanti, a young Florentine nobleman in a short red tunic, cloak and hose, standing, holding a scroll.", "stands", [1.62, 1.72, 1.82]),
    "figures/dante/dante-giovane.webp": ("Young Dante in a red robe reading a book, drawn from the knees up (the lower legs and feet are cut off).", "cropped", None),
    "figures/power/messo.webp": ("A messenger in a short tunic with a satchel, standing, holding a sealed letter.", "stands", [1.60, 1.68, 1.78]),
    "figures/power/priore.webp": ("A prior, a Florentine city magistrate, in a long red gown with a blue collar and black cap, standing, reading a document.", "stands", [1.60, 1.68, 1.78]),
    "figures/power/virgilio.webp": ("Virgil, the Roman poet, in a white toga with a laurel wreath, standing, one hand raised.", "stands", [1.62, 1.72, 1.82]),
    "figures/power/papa-bonifacio.webp": ("Pope Boniface VIII standing in papal vestments and a tall papal tiara, raising a hand in blessing; the top of the tiara is the highest point.", "stands", [1.80, 1.95, 2.10]),
    "figures/soldiers/cavaliere-guelfo.webp": ("A Guelph knight in a great helm and a white surcoat with a red cross, on a white horse, holding a lance upright; the lance tip is the highest point.", "stands", [3.0, 3.6, 4.2]),
    "figures/soldiers/fante.webp": ("A foot soldier in a padded coat and kettle helmet, standing, holding an upright spear and a painted shield; the spear tip is the highest point.", "stands", [2.1, 2.5, 2.9]),
    "figures/soldiers/cavallo.webp": ("A saddled riding horse without a rider, standing, head up; the top of the head is the highest point.", "stands", [1.8, 2.1, 2.4]),
    "figures/soldiers/balestriere.webp": ("A crossbowman kneeling on one knee, aiming a crossbow, in a quilted coat and kettle helmet.", "stands", [1.10, 1.25, 1.40]),
    "nature/tuscany/erba.webp": ("A tuft of wild grass with a few poppies and daisies.", "stands", [0.35, 0.6, 0.9]),
    "nature/tuscany/cespuglio.webp": ("A rounded green shrub.", "stands", [0.8, 1.3, 2.0]),
    "nature/tuscany/quercia.webp": ("A broad oak tree with a spreading crown.", "stands", [8, 12, 18]),
    "nature/tuscany/ulivo.webp": ("An olive tree with a twisted trunk and a silvery crown.", "stands", [4, 6, 8]),
    "nature/tuscany/cipresso.webp": ("An Italian cypress: a tall narrow evergreen.", "stands", [10, 16, 22]),
    "nature/tuscany/nuvola-1.webp": ("A long flat white cloud.", "sky", None),
    "nature/tuscany/nuvola-2.webp": ("A puffy cumulus cloud tinted pink and yellow.", "sky", None),
    "nature/tuscany/nuvola-3.webp": ("A wispy, windswept cloud.", "sky", None),
    "nature/tuscany/stormo.webp": ("A small flock of birds in flight.", "sky", None),
    "props/medieval/lanterna.webp": ("An iron hand lantern with glass panes, a lit candle inside and a ring handle on top, standing upright.", "stands", [0.3, 0.45, 0.6]),
    "props/medieval/bisaccia.webp": ("A leather satchel with two buckled straps and a shoulder strap, standing upright.", "stands", [0.25, 0.35, 0.45]),
    "props/medieval/stendardo.webp": ("A war banner: a white cloth with a red cross hanging from a crossbar with a spear-point finial, on a short piece of pole.", "held", None),
    "props/medieval/fiorino.webp": ("A gold florin coin with the Florentine lily, drawn large as a close-up.", "closeup", None),
    "props/medieval/corona-alloro.webp": ("A laurel wreath, drawn as a close-up.", "closeup", None),
    "props/medieval/codice-aperto.webp": ("An open manuscript book with handwritten pages, drawn as a close-up.", "closeup", None),
    "props/medieval/pergamena-sigillata.webp": ("A rolled parchment tied with cord and a red wax seal, drawn as a close-up.", "closeup", None),
    "props/medieval/penna-calamaio.webp": ("A goose-feather quill standing in a glass inkwell, drawn as a close-up.", "closeup", None),
    "props/medieval/bastone.webp": ("A plain wooden walking staff drawn lying diagonally, as a close-up.", "closeup", None),
}

STATE = (
    "History Portal, a history comic for children, set mostly in Florence around 1265-1321 (Dante's lifetime). "
    "Drawings from our library are placed in 3D scenes at their real size. For each drawing below, the question "
    "is how tall the drawn thing really is in metres, from the ground to its highest drawn point, in the pose "
    "shown. People in 13th-14th century Tuscany: men about 1.65-1.70 m, women about 1.55-1.60 m on average. "
    "Pick the most realistic height."
)


def opaque_box(ref):
    """The drawn part of the picture as [left, top, right, bottom] fractions: alpha > 24 of 255.
    Heights are of THIS box, never of the transparent margin around it."""
    from PIL import Image
    im = Image.open(os.path.join(COLLECTION, ref))
    w, h = im.size
    box = im.convert("RGBA").getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    return [round(box[0] / w, 4), round(box[1] / h, 4), round(box[2] / w, 4), round(box[3] / h, 4)]


def fmt(h):
    return ("%.2f" % h).rstrip("0").rstrip(".")


def main():
    questions = {}
    for ref, (desc, placement, options) in ASSETS.items():
        if placement == "stands":
            key = ref.split("/")[-1].removesuffix(".webp")
            questions[key] = {
                "type": "choice",
                "instructions": f"The drawing: {desc} How tall is it from the ground to its highest drawn point?",
                "criteria": {fmt(h): f"About {fmt(h)} m tall." for h in options},
            }
    answers = ask(STATE, questions).get("answers", {})

    out = {}
    for ref, (desc, placement, options) in ASSETS.items():
        key = ref.split("/")[-1].removesuffix(".webp")
        entry = {"description": desc, "placement": placement, "opaque_box": opaque_box(ref)}
        a = answers.get(key)
        if a:
            entry["height_m"] = float(a["choice"])
            entry["jev"] = {"probabilities": a.get("probabilities"), "confidence": a.get("confidence")}
            person = next((p for p in SAME_PERSON if key.startswith(p + "-")), None)
            if person and placement == "stands" and "seated" not in desc and "riding" not in desc:
                entry["height_m"] = SAME_PERSON[person]
        out[ref] = entry
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w"), indent=2, ensure_ascii=False)
    print(json.dumps({k: (v.get("height_m"), v["placement"], (v.get("jev") or {}).get("confidence")) for k, v in out.items()}, indent=0))


if __name__ == "__main__":
    main()

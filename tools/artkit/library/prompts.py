"""history-lines-v1 prompt templates: the style lock for the asset library (BartsMedia library/STYLE.md).

Recovered word for word from the approved 10-27 runs (library/_work/<bundle>/<sheet>/ink.log, colour_*.log).
Only the era line, the subject and the palette change between calls; everything else is fixed on purpose,
because a fixed prompt plus fixed anchor images is what keeps every sheet in one hand.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import green_key

MEDIA = Path.home() / 'BartsMedia/historyportal'
SAMPLE = MEDIA / 'topics/verbree-book-sample'
# fixed anchors on every call (STYLE.md "Canonical refs"; Bart: "yes perfect. that's the style")
INK_ANCHOR = SAMPLE / 'pass1-ink/castle_ink.png'
COLOUR_ANCHOR = SAMPLE / 'pass2-watercolour/castle_r2.png'

TOOL = ('Use your image generation tool to create ONE image and save it as PNG to ./{out} in the current directory. '
        'Do not write code to draw it and do not post-process it; use the image generation tool. '
        'Reply only with the saved file name.')

ERA = {
    'nl-golden-age': 'Dutch Republic, Golden Age, c. 1640, Amsterdam and the VOC.',
    'nl-prehistory': 'Northwestern Europe, Funnelbeaker culture, c. 3400 BCE.',
    'near-east-neolithic': 'Ancient Near East, Neolithic to early Uruk period.',
    'babylonia-old-babylonian': 'Southern Mesopotamia, Old Babylonian period, Nippur and its agricultural hinterland, c. 1750 BCE; Sumerian scribal learning.',
    'egypt-old-kingdom': 'Egypt, Old Kingdom, Fourth Dynasty, Giza and adjacent Nile floodplain, c. 2550 BCE.',
    'rome-imperial-100': 'Roman Empire, city of Rome and immediate countryside, c. 100 CE, early reign of Trajan.',
    'punic-alps-218': 'Western Alps, autumn 218 BCE, Hannibal crossing during the Second Punic War; exact pass unspecified.',
}

ISOLATED = ('Plain untouched white paper background everywhere around and between the objects. Each object is complete '
            '(nothing cropped by the canvas edge) and stands alone with wide white space around it; objects never touch '
            'or overlap. Only a tiny tuft of ground directly under each object, no ground plane, no horizon, no cast '
            'shadows on the paper. Landscape 3:2.')

# pass 1 framing per layer; {era} and {subject} are filled in
LAYER = {
    'sky': ('A wide empty sky, full bleed, no land, no horizon, no birds. {era} {subject} Clouds begin as negative space: '
            'large irregular cumulus silhouettes with very thin contours, few overlapping inner forms, 80 to 90% of each '
            'cloud left white, only a few sparse strokes under selected lobes. The sky itself has almost no hatching. '
            'Landscape 3:2, the left and right edges must continue seamlessly.'),
    'bg': ('A far background landscape strip seen from eye level, wide panorama. {era} {subject} The land occupies only '
           'the lower 45% of the canvas; everything above the land silhouette is empty white paper (no sky drawing, no '
           'clouds). The land runs edge to edge and fills the canvas down to the bottom edge. Far distance: fewer, '
           'thinner lines, sparse hatching. The terrain height at the left edge equals the height at the right edge so '
           'the strip can tile. No people, no animals. Landscape 3:2.'),
    # a ground band (the stage stands it at a distance, LibraryBundle::isGroundBand): water or land strips to put things IN
    'band': ('Wide horizontal strips seen from eye level, each a separate strip running the full width of the canvas from '
             'the left edge to the right edge, stacked one above the other with wide white paper between them. {era} '
             '{subject} The top edge of each strip is its own silhouette; its bottom edge is a straight horizontal cut. '
             'Flat frontal view, no horizon, no sky drawing, nothing standing on the strips. No people, no animals. Landscape 3:2.'),
    # a terrain painted from eye height (Bart 11-11: the sea): the stage lays it through the house camera, so it must be
    # exactly that view, the horizon its top edge, repeating only sideways
    # a terrain's own far edge (Bart 11-11: "the terrain should also include a horizon layer so there is no hard edge"):
    # the stage stands it far out on the floor over the line where the terrain meets the sky
    'horizon': ('ONE single long low strip running the full width of the canvas from the left edge to the right edge, '
                'in the lower third of the canvas, white paper above it. {era} The far horizon of {subject}, seen from '
                'standing eye height: the land (or water) far away, low and hazy, pale soft colour and very few thin '
                'lines, no single stone, plant or wave bigger than a dot. Its top edge is a soft, low, irregular silhouette '
                '(distant crests, a far line of low growth); '
                'its bottom edge is a straight horizontal cut. Nothing close, no single large object, no sky drawing, '
                'no clouds, no people, no animals. The left end continues seamlessly into the right end. Landscape 3:2.'),
    # zoomed out (Bart 11-11: "too bloated, they need to zoom out"): a wide landscape view, every detail small
    'terrain': ('ONE wide full-bleed panorama, zoomed far out like a wide-angle landscape view. {era} {subject}, seen from '
                'standing eye height (1.6 m) looking straight ahead: the bottom edge of the canvas is the ground about 4 m '
                'in front of the viewer, the very top edge is the horizon far away. Everything is small: even at the '
                'bottom edge no single stone, plant, wave or clod is taller than a twentieth of the canvas height, and '
                'there are at least twelve receding rows of detail between the bottom edge and the horizon, shrinking '
                'and crowding together towards the top. No close-up, nothing large in the foreground. No sky, no land on '
                'the horizon, no objects, no ships, no people, no animals, no birds, no tracks or footprints, no border. The left edge continues seamlessly into the '
                'right edge. Landscape 2:1.'),
    # a floor tile: the scene's one ground, laid flat and repeated both ways
    'ground': ('ONE seamless floor texture tile seen from straight above, full bleed, filling the whole square canvas: {era} '
               '{subject} No horizon, no perspective, no objects standing on it, no cast shadows, no border. The left edge '
               'continues seamlessly into the right edge and the top edge into the bottom edge. Organic surfaces get very '
               'few lines. Square 1:1.'),
    # loose clouds the stage floats at sky depth (asset kind 'cloud'), placed one by one in front of a sky
    'cloud': ('Separate isolated clouds, each a complete cloud with wide empty space around it, nothing touching: {era} '
              '{subject} Clouds are negative space: very thin contours, few overlapping inner forms, 80 to 90% of each '
              'cloud left white, only a few sparse strokes under selected lobes. No sky drawing around them, no land, '
              'no birds. Landscape 3:2.'),
    # a ground strip the stage stands at a distance (layout.ts isBandPicture): the floor itself seen across, receding.
    # Not 'band' (a flat frontal screen): this is the ground surface in eye-level perspective, like meadow-band-01.
    'field': ('Wide strips of ground seen from standing eye height looking across it, each a separate strip running the '
              'full width of the canvas from the left edge to the right edge, stacked one above the other with wide white '
              'paper between them. {era} {subject} Inside each strip the ground surface recedes: large near detail at the '
              'bottom, smaller and sparser detail towards the top. The top edge of each strip is its own ragged silhouette '
              'of grass and plants; its bottom edge is a straight horizontal cut. No horizon line, no sky drawing, no '
              'trees, nothing standing taller than knee height. No people, no animals. Landscape 3:2.'),
    'mid': ('Middle-distance set pieces, each a separate isolated object: {era} {subject} {view} ' + ISOLATED),
    'fg': ('Foreground nature elements, each a separate isolated object: {era} {subject} Same light from the upper left '
           'on all. ' + ISOLATED),
    'prop': ('Small historical objects as a tidy specimen sheet, each a separate isolated object: {era} {subject} '
             '{view} ' + ISOLATED),
}

# sheet 'view': how mid / prop objects are seen. 'front' for anything that stands against a wall or on a flat floor
# the stage camera looks at level (Bart 11-10: a 1640 room in three-quarter views "looks like every asset is tilted").
FRONT = ('Seen dead straight from the front at standing eye height, like a flat theatre set piece: every horizontal '
         'edge drawn perfectly level and parallel to the bottom of the canvas, every vertical perfectly upright, no '
         'vanishing points, no converging lines, no side faces, no turn to either side. A table top, seat or chest '
         'lid shows only as a thin level band; open shutters or doors lie flat to the front.')
VIEW = {   # (layer, view) -> words; the three-quarter ones are the approved prompts, word for word
    ('mid', 'three-quarter'): 'Seen from slightly above eye level, three-quarter view, same scale for all.',
    ('prop', 'three-quarter'): 'Three-quarter view from slightly above, same light from the upper left.',
    ('mid', 'front'): FRONT + ' Same scale for all.',
    ('prop', 'front'): FRONT + ' Same light from the upper left.',
}

INK = ('Clean black-and-white ink illustration in the style of the attached anchor (match its line quality and '
       'hatching, not its content): educational history comic, crisp black contours with an expressive, slightly '
       'broken hand-drawn line that leaves gaps for the imagination. Line drawing, approximately 10 to 14% black '
       'coverage. Use single-direction hatching for medium shadows and no more than two intersecting directions for '
       'deep shadows. Keep 65 to 75% white space. Cross-hatching should occupy no more than 20% of the shaded area. '
       'No solid black fills on any area that will later be coloured; dark areas are built from hatching. No colour, '
       'no grey wash, no text, no labels, no border, no frame, no signature.')

COLOUR = ('The FIRST attached image is the locked ink drawing to colour. The SECOND attached image is the watercolour '
          'STYLE reference only (copy its watercolour handling and colour temperature, never its content). Edit the '
          'first image: keep the exact canvas size, framing, positions, every black line, hatch and cross-hatch. Do not '
          'add, remove, move or redraw anything. Colour only things already drawn.\n'
          'Colour it as a clean educational historical illustration with real transparent watercolour beneath the ink: '
          'visible paper tooth inside the washes, soft blooms and backruns at wash edges, light granulation in earth and '
          'stone colours, uneven layered glazes, colour pooling darker at the shadow side. Washes stay transparent so '
          'the ink stays dominant and black. Restrained palette: {palette}. Every drawn surface gets at least a very '
          'faint wash (white things such as birch bark, wool, linen or white stone get a pale cream or cool grey '
          'glaze){around}{sky}\n'
          'No blur, no airbrush gradients, no speckle or dot noise, no stippling, no antique or sepia filter, no muddy '
          'wash, no glossy 3D rendering, no repainting of the linework.')

SKY_ADDENDUM = (' This is a sky: fill the whole canvas with a very pale transparent blue watercolour sky with gentle '
                'uneven glazes; clouds stay 80 to 90% white paper with only an extremely pale cool blue-grey wash under '
                'selected lower edges.')

GROUND_ADDENDUM = (' This is a floor: the surface colour (soil, leaf litter, tiles, planks) covers the WHOLE canvas edge to '
                   'edge with layered transparent washes, no white paper showing anywhere, the drawn details sitting on '
                   'top of it, and every edge continuing seamlessly into the opposite edge.')

# (words, hexes) per era: the colour prompt names them, the palette gate measures against them (+ NEUTRALS)
PALETTE = {
    'near-east-neolithic': [
        ('sun-dried mudbrick, silt and dry earth', ['#d0bba0', '#a08a6c']),
        ('pale sand and gravel', ['#f4d5a8', '#e3cf9a']),
        ('dark wet river mud', ['#7d6752', '#8e8474']),
        ('restrained olive reeds, barley and palms', ['#8d9a5b', '#6f7f45']),
        ('muted river water', ['#98c3d3', '#72a2b5']),
        ('pale transparent sky', ['#d2e6f2', '#a9d7f6']),
    ],
    'babylonia-old-babylonian': [
        ('sun-dried mudbrick and silty earth', ['#d0bba0', '#a08a6c']),
        ('pale plaster and dry clay tablets', ['#f5e6ce', '#f4d5a8']),
        ('fired clay vessels and damp clay', ['#b0754f', '#b19f86']),
        ('reed matting, barley straw and weathered timber', ['#e3cf9a', '#7d6752']),
        ('restrained olive reeds and barley leaves', ['#8d9a5b', '#6f7f45']),
        ('muted canal water', ['#98c3d3', '#72a2b5']),
        ('pale transparent sky', ['#d2e6f2', '#a9d7f6']),
    ],
    'egypt-old-kingdom': [
        ('pale limestone and plaster', ['#f5e6ce', '#d2cfc9']),
        ('warm desert sand and sandstone', ['#d0bba0', '#f4d5a8']),
        ('Nile silt and mudbrick', ['#a08a6c', '#b19f86']),
        ('clay vessels and restrained red ochre', ['#b0754f', '#c07b57']),
        ('reeds and crops in restrained olive', ['#8d9a5b', '#6f7f45']),
        ('flax, straw and timber', ['#e3cf9a', '#7d6752']),
        ('muted river water', ['#98c3d3', '#72a2b5']),
        ('pale transparent sky', ['#d2e6f2', '#a9d7f6']),
    ],
    'rome-imperial-100': [
        ('warm brick and terracotta roof tiles', ['#c07b57', '#d79a7a']),
        ('pale travertine and plaster', ['#f5e6ce', '#f4d5a8']),
        ('worn paving and stone shadows', ['#d2cfc9', '#8e8474']),
        ('weathered timber and earth', ['#7d6752', '#b19f86']),
        ('restrained wall-paint red', ['#b0754f', '#c07b57']),
        ('olive foliage and dry verge grass', ['#8d9a5b', '#e3cf9a']),
        ('muted water and blue shadows', ['#98c3d3', '#4a728c']),
        ('pale transparent sky', ['#d2e6f2', '#a9d7f6']),
    ],
    'punic-alps-218': [
        ('cool rock faces and scree', ['#aab1b3', '#8e8474']),
        ('snow in pale cool glaze, never blank cutout holes', ['#f6f5ee', '#d2e6f2']),
        ('distant blue-grey mountain shadows', ['#98c3d3', '#4a728c']),
        ('gravel, soil and weathered timber', ['#b19f86', '#7d6752']),
        ('restrained pine and autumn larch', ['#6f7f45', '#c9a86a']),
        ('dry alpine grass and baggage fibre', ['#e3cf9a', '#a08a6c']),
        ('pale overcast sky', ['#d2e6f2', '#d2cfc9']),
    ],
    'nl-golden-age': [
        ('warm brick red and rose for brick walls', ['#c07b57', '#d79a7a']),
        ('pale sandstone and cream for stone', ['#f4d5a8', '#f5e6ce']),
        ('weathered brown for wood, ships, barrels and crates', ['#7d6752', '#b19f86']),
        ('clear muted blue-green for water', ['#72a2b5', '#98c3d3']),
        ('slate blue-grey for roofs', ['#4a728c', '#aab1b3']),
        ('restrained olive for trees', ['#8d9a5b']),
        ('off-white canvas for sails', ['#f6f5ee']),
        ('pale transparent blue sky', ['#d2e6f2', '#a9d7f6']),
    ],
    'nl-prehistory': [
        ('restrained olive and sap green for plants', ['#8d9a5b', '#6f7f45']),
        ('straw and ochre for grass, thatch and grain', ['#e3cf9a', '#c9a86a']),
        ('earth brown for soil and paths', ['#a08a6c']),
        ('weathered brown for wood and bark', ['#7d6752']),
        ('grey granite for stones', ['#a9adab', '#8e8474']),
        ('a muted heather accent', ['#b39ab0']),
        ('terracotta for clay pots', ['#b0754f']),
        ('pale transparent blue sky', ['#d2e6f2', '#a9d7f6']),
    ],
}
NEUTRALS = ['#1b1a18', '#f6f5ee', '#d2cfc9', '#8e8474', '#b19f86']


def palette_hexes(era: str) -> list[str]:
    return [h for _, hs in PALETTE[era] for h in hs] + NEUTRALS


def ink_prompt(layer: str, era: str, subject: str, out: str = 'ink.png', view: str = 'three-quarter') -> str:
    return '\n\n'.join([TOOL.format(out=out), LAYER[layer].format(era=ERA[era], subject=subject.strip(), view=VIEW.get((layer, view), '')), INK])


# Skies and grounds fill the canvas; everything else is cut, so it is painted on the green key.
PAPER_AROUND = (', but the paper AROUND and BETWEEN objects, and the gaps between branches and leaves, stay pure untouched white '
                'paper with no wash, no tint, no shadow and no texture.')


def colour_prompt(layer: str, era: str, out: str = 'colour.png', light: str | None = None) -> str:
    """light: a sky's own light in place of the default pale blue day (dusk, night, rain), with the colours it adds."""
    words = ', '.join(f"{w} ({', '.join(hs)})" for w, hs in PALETTE[era])
    around = PAPER_AROUND if layer in ('sky', 'ground', 'terrain') else '. ' + green_key.GREEN_BACKGROUND
    sky = (' This is a sky: fill the whole canvas. ' + light if light else SKY_ADDENDUM) if layer == 'sky' else ''
    if layer in ('ground', 'terrain'):   # a floor is the surface itself: no paper between the leaves, the soil runs under everything
        around, sky = '.', GROUND_ADDENDUM
    body = COLOUR.format(palette=words, around=around, sky=sky)
    return TOOL.format(out=out) + '\n\n' + body

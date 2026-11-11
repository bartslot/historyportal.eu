# The aquarel method

One way to paint any surface in History Portal as watercolour (Bart, 2026-11-11: "can you create an algorithm for
this or a method so we can apply this to more surfaces?", "and masking to white"). The code is
`tools/watercolour/aquarel.py`; the lesson map's land and sea are its first users (`scripts/build-chart-data.py`).

## The idea

Never paint a picture of a surface. Start from what the place IS, then lay it on paper the way a watercolourist
would.

**1. The colour field.** A float RGB image of the place with no paint in it:

- **Land:** the earth's colours from NASA's Blue Marble, with olive and khaki turned to sap green.
- **Sea:** colour from the real depth (DEPTH_RAMP): pale aqua on the shelves, a soft deep blue on the ocean.
- **Anything else:** a terrain or sky picture, or a flat colour per region.

The field carries the truth (where it is green, where it is deep). The method only decides how it is painted.

**2. The steps.** `paint(field, recipe, seed)` runs these in order:

| Step | What a painter does | Code | Turn up for | Turn down if |
|---|---|---|---|---|
| wander | lays broad washes; their edges never sit on a straight border | `soften`, `warp` | photo-like fields | the field is an inked picture: it smears the ink, so use 0 |
| wet edges | paints in a few washes; pigment pools where one wash meets the next | `levels`, `edge`, `edge_px` | flat, lifeless areas | it reads as contour lines |
| blooms | lets water run back into a drying wash: paler inside, a dark rim | `bloom_share`, `bloom_light`, `bloom_rim`, `bloom_scale`, `bloom_soft` | big quiet areas (sea, plains, sky) | it looks like stains |
| reserve (masking to white) | masks bits of paper before painting: flecks of white in a few clusters, slivers where two washes did not quite meet | `reserve_share`, `reserve_px`, `sliver_share` | glints on water, light on fields | it looks like dust or noise |
| granulate | the painted wash's own passes and grain over the colour (a ChatGPT-painted wash texture) | `texture` argument | a surface that feels digital | the texture's pattern repeats visibly |

**Masking keeps light parts light.** It only ever reserves white where the field is lighter than average, never in a
shadow, because that is where a painter puts the masking fluid.

**3. A recipe** is one row of numbers for one kind of surface. Sizes are pixels at the recipe's `ref` width, so a
recipe looks the same at any size. Current recipes:

- `map-land` and `map-sea`: the lesson map at z4 (4096 px across the world).
- `terrain`: a finished, inked 3D terrain picture. No wander, a light touch.
- `sky`: a sky picture.

A new surface gets a new recipe. Copy the closest one and change the numbers, never the steps.

## Using it

```bash
python3 tools/watercolour/aquarel.py in.webp out.webp --recipe terrain --seed 7
```

From Python:

```python
import aquarel
aquarel.paint(field, aquarel.RECIPES['map-sea'], seed=47)
```

The command writes WebP (lossy, alpha kept, `--quality 88`) or AVIF for an `.avif` name; a `.png` name is written as
`.webp`, because PNG is too heavy for painted pictures. It keeps the picture's alpha, so a cut-out stays cut out. Everything is deterministic for a seed. The map
build is checked twice with `--check`. Tests: `python3 -m pytest tools/watercolour/test_aquarel.py`.

## Where it pays off

- **Surfaces built from data** (the map's land and sea, a generated ground): there the method is the whole painting.
- **Pictures ChatGPT already painted as watercolour** (terrains, skies): the effect is quiet. A little pooling and
  a few damp patches can tie a set together, but the picture's own painting stays the main thing. Never `wander` an
  inked picture.

## Still open

- 3D-scene terrains and skies are not run through it yet (the `terrain` and `sky` recipes exist, nothing applies them
  in the library sync).
- The map's mountains, hills and tufts take the land colour (`glyph_atlases`) but not wet edges or reserve.

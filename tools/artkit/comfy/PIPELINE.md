# History Portal image pipeline (render PC)

Result of the 2026-09-27 study (plan, critique and log in the Obsidian vault, `historyportal/study-*`,
`critique_*`). Pilot evidence: 4 Blender shots (2 diagnostic, 2 held out), about 60 image-model runs.
**Provisional for Blender interiors and streets**; maps, satellite input and figures in scenes are not covered.

Two routes that share one style specification:

```
BACKGROUNDS  Blender shot ──► ink (klein 4B, 2 MP) ──► colour (Qwen-Image-Edit, 1 MP) ──► Upscayl std 2x ─┬─► depth fade ──► final (clean)
                 │                     │ ink master                                                         └─► washes × ink master ──► depth fade ──► final_rich (C1)
                 │ lines, mask, camera, depth ──────── Blender depth (ray-cast, metres) ──────────────────────────────────────────────▲

ASSETS       character/prop master (RGBA) ──► placed at its Blender distance: scale + the same depth fade + contact shadow
```

## Background route

| Stage | Tool | Settings | Keeps | Why (study finding) |
|---|---|---|---|---|
| 0. Blender | `tools/artkit/blender` packs, hp1 camera | `<shot>_lines.png`, `_mask.png`, `_camera.json` | composition, camera, geometry | authoritative after historical review |
| 0b. Depth | `depth_shot.py` over the Blender MCP socket (read-only ray-cast with the shot's camera JSON) | 1280x720, mannequins (`part == figure`) passed through | `<shot>_depth.npy` (metres, camera distance) | exact registration with the render; no estimation |
| 1. Ink | ComfyUI `klein4b` (FLUX.2 klein 4B fp8, 4 steps) | 2 MP, 3 seeds, **input = plain Blender lines** | textures + lines, geometry | recall of Blender contours 0.97-1.00 (Qwen 0.73-0.89: it moves the camera, redraws doors) |
| 1b. Pick | `stage_check.py` | rank by recall − 5 × ink on empty walls | the ink master | catches invented objects on protected walls |
| 2. Colour | ComfyUI `qwen` (Qwen-Image-Edit 2511 + Lightning 4-step LoRA) | **1 MP**, 3 seeds, no style reference | pale washes, line character | at 2 MP Qwen zooms/shifts (recall 0.61-0.79); at 1 MP 0.98-0.99. klein colours too saturated (patchwork paving) |
| 3. Upscale | Upscayl `upscayl-standard-4x`, `-s 2` | on the PC, about 6 s | texture character | `digital-art-4x` re-hardens faded far lines and flattens washes into blotches |
| 3b. Rich (C1) | `wash_ink.py` | median 1/240 of width, multiply | klein's hatching + Qwen's washes | the 1 MP colour pass drops most of klein's hatching; this puts it back. No visible double contours on the tested streets |
| 4. Depth fade | `depth_lines.py adjust` | near 3 m, far 40 m, log, gamma 1.8, far opacity 0.35, thin 0.8, soft ink ramp 100-200, smoothing w/480 | the near/far hierarchy | **must be last**: the colour pass and the upscaler both re-darken faded far lines |

`chain.py <shot> --family street|study -o OUT` runs stages 1-4 and writes both finals plus `<shot>_chain.json`.
**Recommendation: `final_rich`** (Bart, 2026-09-27: finished renders must be much richer in texture); `final` is
the lighter fallback when the C1 composite shows double edges (check the paving at 100%). Colour seeds
are all kept for a human pick. Every stage output is kept, so a changed Upscayl model reruns only stage 3-4.

### What did NOT work (keep out of the pipeline)
- **Depth guide for the model (method A)**: a Blender line render with distance-weighted lines as input. Both
  models redraw far ink as strong as near ink (strength ≈0.79 in every band). **Prompting for line
  perspective (method C) does nothing either.** Line weight by distance is a post-process, full stop.
- **Depth fade before colour**: the faded, empty-looking distance invites Qwen to paint **water and boats** at the
  vanishing point, and the colour pass re-darkens the lines anyway.
- **Bart's Carthage colour prompt used as is for other places**: its water/boat/turquoise words produced a
  harbour at the end of a Florentine street, and turquoise paving from klein. The house prompt now has a
  per-location palette slot and no place-specific nouns.
- **A style reference image in the colour pass**: Qwen pastes the reference's content (another session: the
  goal image's elephants in Dante's study; here: a harbour). Palette comes from words.
- **Hard ink threshold in the fade**: ghostly double exposure on coloured wood at 100%. Now a soft ramp.

## The system prompt (house style, two stage prompts with slots)

Files in `prompts/house/`. One shared style spec, two stage-specific prompts; a single chat-style
instruction cannot enforce geometry inside an image workflow.

**Ink (stage 1), `ink.txt`**, slots `{MATERIALS}` (per place family) and `{DEPTH_NOTE}` (empty in production):
> Image 1 is a clean perspective line drawing of a historical place, made in 3D. Redraw it as a finished
> black-and-white ink illustration on white paper for a historical comic. Keep the composition, camera,
> perspective, architecture and every object exactly where they are. Add nothing and remove nothing: no
> people, no animals, no plants, no new windows or doors, nothing on empty walls. Add material texture with
> restrained ink: {MATERIALS}. Single-direction hatching for medium shadows, at most two directions in the
> deepest shadows, about 10 to 15% black ink, 65 to 75% white paper. Line weight follows distance like in a
> comic: bold confident outlines in the foreground, thinner lighter lines in the middle ground, very fine
> sparse lines and almost no texture in the far distance. No grey wash, no solid black areas, no colour, no
> text. Avoid micro-detail, repetitive marks and AI clutter.

**Colour (stage 2), `colour_house.txt`**, slot `{PALETTE}` (per location, historically checked):
> Colour this black-and-white ink drawing as a clean educational historical illustration. Colour only what
> is drawn and add nothing: no new objects, no people, no water, no boats, no views or sky through openings,
> no plants unless they are drawn. Keep every ink line and all hatching exactly. Restrained watercolour-comic
> treatment: transparent washes on warm cream paper, subtle pigment variation, a bright editorial feel. Keep
> major architectural surfaces very light. Use selective colour: do not colour every surface, leave roughly
> 35 to 45% of the image very pale. Distant areas paler, cooler and less saturated than the foreground. Black
> ink stays dominant. No muddy wash, no antique filter, no glossy rendering, no heavy grunge, no repainting of
> linework. Local materials and colours: {PALETTE}.

For a scene that really has water (Carthage), the `no water, no boats` clause is removed and the palette
names the water; that is a per-location decision, never the default.

Slots in use: `ink_{street,study}_C.txt`, `colour_{street,study}.txt`. A new place = one `{MATERIALS}` line
and one `{PALETTE}` line, both checked by the historian (a sandstone palette is not a Florentine one).

## Asset route (characters, props)

- A master is made once, approved, versioned, and never modified by placement. `asset_place.py cutout` keeps
  light areas inside the figure opaque (flood fill from the border, not "remove white").
- `asset_place.py place` puts it at Blender coordinates (metres): height from the shot camera, the same
  distance → ink curve as the background, an atmospheric colour fade (`ATMOS` 0.55 at 40 m) and a contact
  shadow. The same master works near and far.
- **Open:** an asset has to be coloured with the **same house colour prompt** as the backgrounds. The test
  stand-in (a comic character sheet coloured separately) is visibly flatter and more saturated than the
  watercolour street. Asset pack generation itself is not settled by this study.
- **Open:** historical costume. Words alone give Dante a turban instead of a cappuccio; a costume reference
  (e.g. Botticelli 1495, which is later iconography, not evidence) must be used with an explicit
  role and a note of what is supported and what is convention.

## Acceptance gates (per critique; tolerances are provisional)

| Transition | Gate |
|---|---|
| Blender → ink | recall ≥ 0.95, ink on empty protected wall ≤ 0.03, no added object (eyeball the wall) |
| ink → colour | recall vs Blender ≥ 0.95 (catches Qwen drift), no added object, palette per slot |
| colour → upscale | no halos, washes not posterised, far lines not re-hardened (100% crop of the far band) |
| final | near/far hierarchy visible at 1920x1080; asset scale/shadow/fade consistent |

## Cost and time (measured, render PC RTX 3090 Ti at 300 W)

Per background: 3 ink × ~32 s + 3 colour × ~40 s + upscale ~6 s + fade/composite ~5 s ≈ **5-6 min wall time**
including transfers (measured: 3 shots in 11 min), ≈ **€0.02 electricity** at 300 W.

Acceptance in the pilot (eyeballed against the gates):

| Stage | Result |
|---|---|
| ink, klein, 21 runs on 4 shots | structure kept 21/21 (recall 0.97-1.00); no objects on empty walls |
| colour, Qwen 2 MP | 0/3 kept geometry on held-out sr02 (drift); 3/6 painted water/boats with Bart's Carthage prompt |
| colour, Qwen 1 MP + house prompt | wide street shots: sr02 3/3 clean, sr01 1/3 clean (1 added door) → **4/6** |
| close-up st03 (held out) | 0/3: composition re-invented; confirms "never convert close-ups on their own, cut plates" |

So about 2 accepted backgrounds per 3 colour seeds on wide shots. The labour for picking a seed is the
dominant cost; the study did not measure it.

## Not covered / unresolved
- Close-up shots: not supported (see acceptance); use `tools/artkit/blender/plates.py` on a converted wide.
- Satellite and map input, blank-sheet character generation (outside this pilot's claim).
- Close-ups converted on their own (the Blender README already forbids it: no perspective cues).
- Motion (pan/zoom) check of placed assets at several depths; discrete near/mid/far variants were not needed
  because placement applies the curve continuously.
- Bart's review of the style match against `city_*.png`; the metrics here are diagnostics, not taste.

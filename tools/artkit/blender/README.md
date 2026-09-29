# Blender asset packs (house camera hp1)

Scenes are composed in Blender in real metres and rendered per shot as a clean line drawing, a clay
render, a blocking render (mannequins), a part mask and a camera file. Bart converts the line
drawing with Nano Banana 2 in Figma; `finish.py` upscales the result (Upscayl digital-art 2x).

- `bl.py` sends Python to Blender through the Blender Lab MCP extension socket (localhost:9876,
  `{"type":"execute","code":...,"strict_json":false}` + NUL). `--lib` prepends `hp1lib.py`.
- `hp1lib.py` runs inside Blender: primitives with a `part` tag, arch cutters and booleans,
  `camera()` (hp1: eye 1.60 m, 28.25 mm on 36 mm, lens shift puts the horizon on the upper third),
  `camera_look()` (close-ups), `mannequin()`, `render_shot()`.
- `packs/*.py` build one place each and list its shots. Output: `lesson_assets/<lesson>/packs/<pack>/`.
- `prompts.py` writes a Figma prompt per shot (under 1,200 characters, Figma cuts at ~1,500).
- `plates.py` cuts close-ups from a converted wide/medium shot at the character's head (camera math from
  the shot's camera file). Close-ups are never converted on their own: a flat wall has no perspective
  cues and Nano Banana invents a new perspective.
- `trees.py` builds procedural tree packs with friggog/tree-gen (addon symlinked on the render PC at
  `~/.config/blender/5.1/scripts/addons/tree_gen`): 18 species x 3 seeds, each a marked asset collection
  (`<species>_<seed>`: `_bark` + `_leaves` meshes, metres, root at 0,0,0) plus `<species>_clay.png`.
  `--lod hero` (300k verts a tree, `lesson_assets/_trees`) or `--lod forest` (80k, `_trees_forest`);
  budgets in `tree_budget.py`. Stock tree-gen made 7.6M verts per oak: the finest twig level and 45-vert oak
  leaves were most of it. `tree_roots.py` adds buttress lobes and surface roots that dive into the soil.
  Our preset fixes (the weeping willow) live in `OVERRIDES`; `--set JSON` tunes any parameter.
  `blender --background --python trees.py -- ~/artkit/lesson_assets/_trees_forest --lod forest [species ...]`.
  In a pack: `pt(coll, name, species, seed, loc, yaw_deg, scale)` from `hp1lib.py` (copies share meshes).
- `packs/woodland.py`: reusable temperate European woodland from forest-LOD trees (species mix checked with JEV).
- `sheet.py` makes a contact sheet; `finish.py` upscales `<pack>/converted/*` into `<pack>/final/`.

Gotchas found building the Dante packs:
- `scene.collection.all_objects` is cached and misses objects created earlier in the same script;
  use `objs(sc)`.
- Boolean cutters must overshoot the wall faces (coplanar faces leave a skin over the hole), and
  need `use_self` because an arch cutter is a box plus a cylinder that overlap.
- Object names are prefixed with the scene name so packs in one .blend never collide.

```bash
python3 tools/artkit/blender/bl.py --lib tools/artkit/blender/packs/dante_study.py
python3 tools/artkit/blender/prompts.py lesson_assets/Dante/packs
python3 tools/artkit/blender/finish.py lesson_assets/Dante/packs
```

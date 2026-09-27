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

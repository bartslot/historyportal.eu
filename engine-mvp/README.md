# Scene engine studio (engine-mvp)

React + Babylon lesson studio. From this folder:

```bash
npm install
python3 server.py      # API + crew + the blockout channel, http://127.0.0.1:8090
npm run dev            # the studio page; the clay-blockout MCP tools drive THIS open page, so keep it open
```

The mannequin (`public/assets/models/xbot.glb`) is git-ignored; without it the studio loads it from the Babylon CDN.
To serve it locally (and on deploy):

```bash
curl -fL -o public/assets/models/xbot.glb https://assets.babylonjs.com/meshes/Xbot.glb
```

The `clay-blockout` MCP server is `mcp/blockout_mcp.py` (needs `pip install mcp`; `STUDIO_SERVER` = the server.py URL).
Tests: `npm test`, `python3 test_server.py`, `python3 test_blockout_link.py`.

## Script step: scene graph + clay frames (`src/storyboard/`)

One frame per SHOT beside the script (Figma 2087:1059). A line starts a new shot unless **New shot** is switched off
for it in the script toolbar; letters A, B, C... restart per scene. Each shot is data (`ShotData`: blockout specs,
camera, needed assets), derived from the script until the teacher directs it (double-click a frame or its slider
icon: drag figures, drag the frame to turn the camera, wheel = lens), then kept in `lesson.shots`. Frames render in
their own small Babylon engine (`clay.ts`), cached by their data. Tests: `npx vitest run src/storyboard`.

## 2.5D stage (`src/stage25d/`)

Painted History Lines layers on depth planes in front of a fixed house camera, played scene by scene. Reads the two
contracts in the vault (`topics/autonomous-lessons/plan.md`): `library.json` and `lesson.json`.

```ts
import { playLesson } from './src/stage25d/stage'
const player = await playLesson(lessonOrUrl, libraryUrl?, canvas?)   // library defaults to library/<bundle>/library.json
player.play(); player.pause(); await player.seek(sceneIndex, t)
player.doc.set(['scenes', 0, 'camera', 'dur_s'], 12)   // every value: one undo step (player.doc.undo() / redo())
player.stage.groundPoint(x, 'mid')                       // where a figure stands (x 0..1 across the house view)
```

Dev page: `npm run dev`, then `/stage25d.html?lesson=<url>&library=<url>` (defaults: `lessons/_placeholder.json`,
the `_placeholder` bundle). The panel edits every camera, timing and motion value of the scene on screen.

- **Depths**: sky 380 m, bg 70 m, mid 22 m, fg 7 m from the house camera (eye 1.6 m, fov 50, tilted up 2 deg). A layer's
  `x` 0..1 spans the house view at its depth; its plane is `height_m * scale` tall, origin at the asset's `anchor`.
  Tileable sky/bg strips stretch past the view (1.6x) and repeat. Draw order = depth, then list order (`alphaIndex`).
- **Render size**: sharp up to the device pixels, capped on the longest side (`stage.renderCap`, 1920 by default, Sharpness in the panel); a 2 s average under 50 fps drops a quarter of a CSS pixel per notch, never below 1x CSS (`renderScale`, `Stage.tick`).
- **No halos**: textures are premultiplied on load (`layer.ts`) and blended premultiplied; planes write no depth
  and stay out of the look's G-buffer (`metadata.noGBuffer`), so the ink pass draws lines only on 3D figures.
- **Motion** (`asset.motion`, overridden by `layer.motion`: a kind or `{ kind, amount, speed }`): sway bends from
  the base, drift slides slowly sideways, ripple wobbles the picture, flicker stretches and brightens. In the shader.
- **Camera**: `{ move, from: {x,y,z,fov}, to: {...}, ease: inOut|in|out|linear, dur_s }`, metres and fov in DEGREES.
  No camera = hold the house pose for `est_s`. **Layer keys**: `layer.keys: [{ t, x?, scale?, opacity? }]`, t in seconds.
- **Look**: the studio's post chain (`engine/look-chain.js`, shared with `look.js`) with `STAGE_LOOK` (History Lines
  pencil + paper grain); `lesson.look` overrides any number.
- **Library**: `public/library/_placeholder/` is procedural (`python3 scripts/make_placeholder_library.py`), every asset
  `placeholder: true`. Real bundles: `ln -s ~/BartsMedia/historyportal/library/<bundle> public/library/<bundle>`
  (git-ignored).

Tests: `npx vitest run src/stage25d`. Real-GPU check (muted, Metal ANGLE, 1080p frames, fps, edit + undo):
`node scripts/stage25d-check.mjs http://localhost:5197/stage25d.html <outDir>/` (launch config `stage25d`, port 5197) (needs `npx playwright install chromium`).

## Figures (`src/figures/`)

Lesson figures that read as History Lines comic characters: ONE standard body (Customizable Man, Auto-Rig Pro deform
rig), variety only from dyes, skin, hair part, hat on/off. `lesson.json` `figures[]` maps straight onto it.

```ts
import { Cast } from './src/figures/cast'
const cast = new Cast(player.stage.scene, player.stage, lesson)   // the whole lesson cast, one figure per char
const skipped = await cast.show(lesson.scenes[i])                 // on every scene change; skipped = no body (dog, waka)

// or one figure by hand:
import { createFigure, placeFigure } from './src/figures/figure'
import { figureRecipe } from './src/figures/recipes'
const fig = await createFigure(scene, figureRecipe(f.char, lesson.characters, lesson.bundle)!, f.char)
fig.setPose(f.pose)            // walk stand point kneel carry sit lie dig pull push climb row; returns the guard verdict
fig.setExpression(f.expression) // neutral happy worried surprised sad angry proud tired (an image swap, no blink)
placeFigure(scene, fig, { x: f.x, depth: f.depth, facing: f.facing }, player.stage)   // stage = anything with groundPoint(x, depth)
fig.setDye('coat', '#7a4a30'); fig.dispose()
prop.parent = fig.hold   // lesson `holds` (a pot, a basket): a node between the hands, moving with them
```

- **Any character**: `figureRecipe(char, lesson.characters, bundle)` reads the cast's `look` line: child (drawn at
  0.68), woman (longest hair, no beard), old (grey hair), VOC officer (black, hat, Tasman moustache), sailor (cap);
  the id seeds era dyes so no two farmers match. `null` for animals and far-off canoe crews. Unknown poses and
  expressions fall back (`poseFor`, `expressionFor`). Group chars repeated in one scene get their own dyes.
- **Contract with the stage**: `placeFigure(scene, fig, { x 0..1, depth: 'bg'|'mid'|'fg', facing: 'left'|'right'|'front'|'back' }, stage?)`.
  It stands `fig.root` on `stage.groundPoint(x, depth)` (S1's `Stage`); without a stage it uses the same depth maths.
  `left`/`right` = a 3/4 turn toward that side of the screen (`FACING_TURN_DEG`, 62; 90 = profile). Move `fig.root`
  for walks; the walk clip plays in place.
- **Paint** (`toon.ts`): flat dye, one hard cel step lit by the figure's own light (`TOON.light`), ink where the surface
  turns from the eye (contour + fold lines, thick on round forms, thin on flat). Skin is lit flat (`SKIN_STEP`).
- **Costume is painted, never modelled**: per-vertex zones by bone weight (`paintZones`) dye parts of the one body's
  meshes. Recipe words: `sleeves` (long sleeves on the arm skin), `legs: tunic | dress | breeches | trousers` (tunic =
  coat dye hip to knee over leg wraps; breeches = stockings below the knee), `collar` (white falling collar within
  `BANDS.collarRadius` of the neck joint), `belt` (a band at the coat's hem). `figureRecipe` picks them by era. The stage look's pencil pass adds its
  line on top. Every number is a knob in `TOON` / `FACE` / `POSES`.
- **Face**: the expression PNG (`public/figures/faces/`: a gpt-image-2.5 sheet made in Figma, cut and aligned by
  `faces_from_sheet.py`; the sheet is in BartsMedia `s3-figures/faces/`) is projected from
  a box riding the head bone onto skin and eyeballs; no contour ink in the face's middle.
- **Poses** (`pose.ts`): never Euler offsets. Each limb is AIMED at a direction in the character's own frame
  (forward from the feet, left from the shoulders), in rig space (below the glTF mirror). `checkPose` = knee never
  behind the hip-ankle line, elbow never bent forward, upper arm never across the body, hip extension under 45 deg.
  `npx vitest run src/figures` runs them on the real body (skipped where the GLB is missing) and proves the guards
  fail a broken knee and an arm through the torso.
- **Walk** (`clips.ts`): Ready Player Me `M_Walk_001` (Mixamo names) retargeted with `AnimatorAvatar` + root/ground
  fix (feet stay on the ground, no crouch, no float), then a guard bake straightens any backward knee in the keys:
  0 violations over 116 frames (figure lab: `__lab.walkAudit()`).
- **Lab**: `/figure-lab.html?char=boer-man,boer-vrouw&poses=point,carry&view=front|three|side|face&look=stage&ui=0`.
- **Assets** (git-ignored): `public/assets/models/customizable-man/man-lite.glb` from `src/figures/export_wardrobe.py`
  (Blender, licensed model in `workflows/3D pipeline/customizable-man/`, licence: no AI training) and `clips/`.
- **Gaps (needed assets)**: female body and a child body (now: the man at 0.95 / 0.68); long hair / braid /
  headscarf / white cap; period SILHOUETTES (the zones give tunic, dress, breeches, collar their colour, the shape is
  still sweater + trousers: a wide tunic skirt, a skirt, a cloak); a 1640s wide flat felt hat (the Cowboy_Hat part
  stands in); hand props for `carry` / `dig` / `pull` (basket, spade, rope); a seat for `sit` at a table; thin paper
  slivers at hems where the cloth stands off the trimmed body.

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
player.pause(); player.resume(); await player.seek(sceneIndex, t); await player.seekToScene('sc04')
player.onInteraction((scene, resume) => showCard(scene.interaction, resume))  // fires once per held scene
player.clock()                                           // lesson seconds; stands still while paused or holding
player.holdAt(sceneIndex, t); player.setTime(t); player.onScene((index) => ...)  // S5 cards + power meter
player.doc.set(['scenes', 0, 'camera', 'dur_s'], 12)   // every value: one undo step (player.doc.undo() / redo())
player.stage.groundPoint(x, 'mid')                       // where a figure stands (x 0..1 across the house view)
```

Dev page: `npm run dev`, then `/stage25d.html?lesson=<url>&library=<url>` (defaults: `lessons/_placeholder.json`,
the `_placeholder` bundle). The panel edits every camera, timing and motion value of the scene on screen.

- **Depths**: sky 380 m, bg 70 m, mid 22 m, fg 7 m from the house camera (eye 1.6 m, fov 50, tilted up 2 deg). A layer's
  `x` 0..1 spans the house view at its depth; its plane is `height_m * scale` tall, origin at the asset's `anchor`.
  Tileable sky/bg strips stretch past the view (1.6x) and repeat. Draw order = depth, then list order (`alphaIndex`).
- **Render size**: sharp up to the device pixels, capped on the longest side (`stage.renderCap`, 1920 by default, Sharpness in the panel). Adaptive tier (`ADAPT`, `nextTier` in layout.ts): a 2 s window under 50 fps steps a quarter CSS px down (never below 1x CSS); up only after 3 windows at 58+, 20 s after the last change, at most once a minute; two reversals lock the lower size for the session. Windows with a stall or a hidden tab are ignored.
- **No halos**: textures are premultiplied on load (`layer.ts`) and blended premultiplied; planes write no depth
  and stay out of the look's G-buffer (`metadata.noGBuffer`), so the ink pass draws lines only on 3D figures.
- **Motion** (`asset.motion`, overridden by `layer.motion`: a kind or `{ kind, amount, speed }`): sway bends from
  the base, drift slides slowly sideways, ripple wobbles the picture, flicker stretches and brightens. In the shader.
- **Camera**: `{ move, from: {x,y,z,fov}, to: {...}, ease: inOut|in|out|linear, dur_s }`, metres and fov in DEGREES.
  Scene length = `dur_s`, else the sum of its shots (where the last ends), else `est_s`. A director-split scene plays
  `camera`, then each of `camera_more` from its `at_s` (`shotAt`). No camera = hold the house pose. The panel (the
  studio's `Panel`, id `stage-scene`) lists the shots as tabs; a shot's Duration moves the later shots and `dur_s` with
  it (`setShotDuration`), and a shot's end pose IS the next one's start (`setShotPose`), so a cut never jumps.
  **Layer keys**: `layer.keys: [{ t, x?, scale?, opacity? }]`, t in seconds.
- **Look**: the studio's post chain (`engine/look-chain.js`, shared with `look.js`) with `STAGE_LOOK` (History Lines
  pencil + paper grain); `lesson.look` overrides any number.
- **Ground** (`ground.ts`, `ground-gl.ts`): one floor plane at y 0. `set.ground` = a `layer: "ground"` asset (id or tags;
  tileable art in world metres, `height_m` = one tile's depth), a `#hex` paper wash, or nothing (the bundle's first ground,
  else its `paper`, default `#f6f5ee`). Never a flat fill: a world-anchored watercolour grain, and toward the far landscape
  the floor fades into that landscape's own painted ground colour (`bottomColour`). bg strips paint their lower edge into
  that colour along a ragged line (`layer.feather`, default 0.22 of their height; not see-through, the sky is behind
  them). `set.horizon` raises the far landscape in metres. mid/fg assets stand on a soft painted contact stain at their
  anchor (`layer.shadow`, default 0.6; sized to read the same on screen at any distance). All in the panel, undoable.
- **Interactions**: a scene with `interaction` holds at its end (`timeline.ts`): the picture keeps its layer motion and
  the camera breathes around the end pose (`lesson.hold = { breath_m, breath_s }`, editable, `breathe()`), until the
  handler calls `resume`. A seek or rebuild never re-fires a hold; a stale `resume` after a seek is ignored.
- **Library**: a scene's `bundle` overrides the lesson's (`libraryUrlFor`; a bundle that does not load falls back to the lesson's, warned). `public/library/_placeholder/` is procedural (`python3 scripts/make_placeholder_library.py`), every asset
  `placeholder: true`. Real bundles: `ln -s ~/BartsMedia/historyportal/library/<bundle> public/library/<bundle>`
  (git-ignored).

Tests: `npx vitest run src/stage25d`. Real-GPU check (muted, Metal ANGLE, 1080p frames, fps, edit + undo):
`node scripts/stage25d-check.mjs http://localhost:5197/stage25d.html <outDir>/` (launch config `stage25d`, port 5197) (needs `npx playwright install chromium`).

## Puppet figures (`src/figures/puppet.ts`, the default route since 10-27)

Painted cut-out characters: the History Lines art itself, moved by 2D bones. Four characters (`CHARACTERS`):
`boer-vrouw`, `boer-man`, `voc-matroos`, `voc-kapitein` (Tasman look: moustache, 1640s hat).

```ts
import { createPuppet, placePuppet } from './src/figures/puppet'
const p = await createPuppet(player.stage.scene, 'voc-kapitein')     // warnings on: a broken pose is console.warned
placePuppet(p, { x: 0.6, depth: 'fg', facing: 'left' }, player.stage) // left = the art mirrored; { view: 'side' } for profile
p.setPose('kneel')           // stand walk point carry kneel sit; returns the guards' findings ([] = human)
p.setExpression('worried')   // 4 drawn heads; the lesson's 8 expressions map onto them (EXPRESSION_OF)
p.setHat(false)              // the hat is its own part
p.setDye('top', '#2b4a7a')   // garments(): top accent skirt sleeves breeches legs shoes hat; null = painted colour
```

**Art**: one PARTS SHEET per character and view (3/4, side, front; 12 sheets), Figma `generate_image`
(gpt-image-2.5-sunburst) in the Art library file `ULbjXnT1DAatLTQLwWLHTE` (node ids in BartsMedia
`topics/autonomous-lessons/puppet-parts/SOURCES.txt`). A fixed 6x3 grid: 4 expression heads, torso, skirt or hat /
upper arm, forearm, 3 hands (open, grip, point), hat / thigh, shin, 2 feet. Legs exist under every skirt. The prompts
(dark variable-weight contour, face detail, library palette): `python3 src/figures/parts_prompts.py voc-kapitein_side`.

**Cut** (`src/figures/cut_all.sh` -> `cut_parts.py`, nothing hand-set): parts are found as shapes and get their slot
by row and order (a merged or split shape stops the run); joints come from the shape (limb end caps by PCA, wrist and
ankle caps, waist = narrowest row, crown for the hat); every part is scaled to an anthropometric length (the model keeps
style, not scale); the painted joint discs are handled the cut-out way (a parent's far disc is cut, a child's near disc
refilled with the limb mirrored across the joint, the child drawn under the parent); dye masks are colouring-book
regions between the ink lines, clustered: R = the whole garment, G/B = clearly different accents (belt, collar,
waistcoat). Output WebP in `public/figures/puppets/<id>/<view>/` (4.5 MB for all four).

**Motion**: `solve()` places every part in the figure's own 2D frame (x forward, y up); side and 3/4 turn limbs in the
picture plane, front foreshortens them (`PUPPET.minForeshorten`). The vertices are computed there, so the guards in
`violations()` (knee bends back, elbow forward, shoulder and hip ranges) measure exactly what is drawn. A skirt drapes
waist -> knees -> down. Dye = target colour x the paint's own luminance (ink, wash, paper texture stay).
Knobs on sliders in `puppet-lab.html` (walk swing, knee lift, arm swing, steps/s, breathing, lap, front foreshortening).

**Evidence**: `puppet.test.ts` through `createPuppet` with warnings captured: every character x pose x view is human
and stands on the ground; 6 mutations (knee forward, far knee forward, elbow back, arm through the back, leg past the
hip, knee folded flat) are caught. Real stage frames: `node src/figures/capture_puppets.mjs` (silent headless
Chromium) -> BartsMedia `puppet-parts/stage/` (`contact_all_poses_views.png`).

**Guards per view**: `setPose` checks every view on its own sheet (`GUARD_TOL`: the front view hangs parts as drawn,
so only a fold-over counts there). Face-on, point/carry/kneel/sit would read as standing: they show in 3/4
(`FRONT_POSES`, logged). `placePuppet` with a stage gives the figure S1's contact stain and, from the stage library, a
seat (a rock, log, stump, stool...) that `sit` uses; with no seat the figure sits on the ground. Stand is a contrapposto
with a slow weight shift. A skirt drapes: each edge runs to its knee once that knee leaves the hanging cloth (a lap,
a kneel), and pools on the ground. `placePuppet(..., { behind })` stands a figure behind a same-depth layer.

**Edges** (asset pipeline, `cut_parts.py`): paper pockets near the outline (between hair strands, fingers) count as
background; the silhouette loses its 1 px fringe, the band the edge keeps takes the paint from just inside (no traced
rim: an even dark rim read as a sticker), and the alpha gets a soft sub-pixel edge, so the shader's 0.5 cut is smooth.
The painted joint disc past a sleeve is cut where the limb's own paint ends. Every part's `edge_fringe` (bright outer
pixel over dark paint just inside) is in its `parts.json` and tested < 0.03 (the fde8a591 assets measure 0.29-0.48).
Tests run on a clean checkout: the seat test uses the committed fixture `src/figures/__fixtures__/library.json`.

**Art, round 2**: the farmer woman is two-pass (art v3 sparse ink via `generate_image`, then Figma "Edit with prompt"
colour with the 9 library refs; `parts_prompts.py ink|colour`); `cut_all.sh` prefers `puppet-parts/v2/` sheets. Two
fresh reviewers scored her 4 and 4 vs the rider target (one-pass: 4): they ask for a heavier contour, more hatching
and stronger washes than the library's sparse-ink rule gives. The other three are still one-pass.

**Limits**: the woman's fur cape dyes with her dress; the sailor's torso art includes his shirt sleeves; no back view;
no lesson `Cast` wiring yet.

## Figures, 3D route (`src/figures/`, PARKED look; mechanics kept)

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
  `left`/`right` = a 3/4 turn toward that side of the screen, measured from the line to the camera (`FACING.turnDeg`, 62; 90 = profile). Move `fig.root`
  for walks; the walk clip plays in place.
- **Paint** (`toon.ts`): flat dye with a HARD two-step cel (`TOON.step`), the shade a darker, cooler hue of the dye
  (`shadeMul`, `shadeCool`), faces lit by the light's horizontal angle; a body-anchored watercolour (pigment thick and
  thin, a wet edge on the shade line, paper in the lights) that moves with the figure. Ink: an inverted hull in SCREEN
  pixels (`inkPxMin`..`inkPxMax` at 1080p) that swells, thins and breaks like a pen (`inkWobble`), stepped back from
  the camera so it only shows past the silhouette, plus fold lines where the surface turns from the eye (`inkEdge`).
  Root cause of every earlier hull failure: the vendor meshes carry vertex alpha, which put them in the transparent
  pass; `createFigure` clears `hasVertexAlpha`. The stage look's pencil pass adds its line on top. Every value is a
  slider in the figure lab.
- **Garment slots from FOUND parts** (`fit_garments.py`, run inside `export_wardrobe.py`; never modelled by hand):
  CC0 MakeHuman monk robe (Donitz) cut by the body's own landmarks into `Garment_SkirtKnee` (tunic, `legs: tunic`),
  `Garment_SkirtLong` (`legs: dress`) and `Garment_Peplum` (doublet skirts, `legs: breeches` + `collar`); CC0
  viking pants (Rehman Polanski) cut into `Garment_Breeches`; CC-BY "Hat Of The Cavalier" (Normal Map Enjoyer,
  Sketchfab c0a97984) as `Garment_HatWide`. Each is pushed outside the trousers, snugged at the waist, low poly,
  and skinned to `Man_Rig` with the trousers' weights (skirts hang 75 % from the hips so they do not split).
- **Costume is also painted**: per-vertex zones by bone weight (`paintZones`) dye parts of the one body's
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
- **Walk** (`clips.ts`): Ready Player Me `M_Walk_001` (Mixamo names) retargeted with `AnimatorAvatar`, stride scaled
  to the short legs (`STRIDE.scale`), a guard bake that straightens any backward knee, then the hips resampled per
  frame so the lower foot's sole stays on the ground. `walk.test.ts`: every frame a foot within 2 cm of the ground, no
  backward knee, hips bob under 6 cm (figure lab: `__lab.walkAudit()`).
- **Lab**: `/figure-lab.html?char=boer-man,boer-vrouw&poses=point,carry&view=front|three|side|face&look=stage&ui=0`.
- **Assets** (git-ignored): `public/assets/models/customizable-man/man-lite.glb` from `src/figures/export_wardrobe.py`
  (Blender, licensed model in `workflows/3D pipeline/customizable-man/`, licence: no AI training) and `clips/`.
- **PARKED (look round, check C FAILed 2586b240; the safe base is f867087d, merged)**. Lesson: NEVER TEST AROUND THE
  REAL ENTRY POINT. `walk.test` loaded the clip into a raw container and called `retargetFrom` directly, so it stayed
  green while the walk through `createFigure` had 0 tracks; the lab hid the hull bug that the real stage shows.
  Tests and shots go through `createFigure`/`placeFigure` on `stage25d`, with warnings ON. Open, with leads:
  C1 the hull blots figures on the stage: its push back (`inkPush`, 2 cm) must exceed its outward push
  (px x metres-per-px x distance: ~3 cm at 22 m with the stage's fov 0.87), so scale `inkPush` with that width.
  C2 the walk has 0 tracks with the garment GLB: un-mute `avatar.showWarnings`; suspect the extra skins the garments
  add (one skeleton per skin after instantiate) so AnimatorAvatar maps the bones to another skeleton.
  C3 garments tear in kneel (one skirt over two legs), the robe's neck hole shows, the peplum is blocky.
  C4 the hull closes over thin fingers.
- **Gaps (needed assets)**: female and child bodies (now the man at 0.95 / 0.68); long hair / braid / headscarf /
  cap; a cloak and a hide cape (no found part fitted yet); hand props for `carry` / `dig` / `pull` (basket, spade,
  rope); simplified comic hands and the base mesh's proportions (accepted for the pilot); thin paper slivers at hems.

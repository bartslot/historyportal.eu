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
- **Render size**: sharp up to the device pixels, capped at 1920 px on the longest side (`MAX_RENDER_SIDE`, `Stage.fit`).
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
`node scripts/stage25d-check.mjs http://localhost:5192/stage25d.html <outDir>/` (launch config `stage25d`, port 5192) (needs `npx playwright install chromium`).

# Animation Timeline & Camera — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or
> superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read `.claude/skills/fix-ux`
> before building any control on this surface.

**Goal:** A teacher can say *"the camera arrives on Samarkand as the narrator says the word"* and
author it in one drag. Figma node `1417:1999` is LEADING for every visual detail.

**Status this plan corrects:** there was no plan. There was research and a prototype.

---

## Where we actually are

| Layer | State |
|---|---|
| Layer animation, Keynote-style builds | **Shipped.** `resources/js/scene/animations.js` — entrances, exits, transitions, easing by intent. Driven by `animate-inspector.blade.php`, replayed by `lesson-player.js`. It is a form: movement + delay + duration, per layer, in/out halves |
| Keyframed camera engine | **Built, tested, imported by nothing.** `camera-track.js` / `camera-director.js` |
| Timeline UI | **Does not exist** |
| Narration clock | **Exists and is populated** — see below |

`camera-track.js` is better than it looks and must not be rewritten. Poses are
`(lng, lat, altitude, heading, tilt)` in Earth Studio's terms rather than centre+zoom, because a
dive from space cannot be authored in centre+zoom. Longitude and heading unwrap across the date
line. Altitude interpolates logarithmically, which is why a naive `flyTo` hangs in space and then
falls. `samplePose(track, time)` is pure, so the same time always gives the same pose — that is what
makes a move scrubbable, resumable and testable.

**Name collision, do not trip on it:** `resources/views/components/lesson/timeline.blade.php` is the
vertical scene rail, not an animation timeline. The new component needs a different name.

---

## The decision this plan turns on

**The narration is the clock.** `scenes.audio_alignment` already stores one entry per spoken
character as `{character, start_time, end_time}`, normalised by `NarrationTiming` from whichever TTS
provider spoke it, written by `GenerateSceneAudio`, backfilled by `BackfillNarrationTimings`, and
already read by `shot-sync.js` (which maps a verbatim script sentence to a timestamp) and
`captions.js`.

So the waveform strip along the bottom of the mock is not a feature to build. It is a picture of
data we already have. And it means the ruler's unit is not an abstract millisecond — it is *this
scene's narration*, and **a keyframe can snap to a word**.

That is the whole differentiator, and it is worth being explicit about why it matters:

- Figma cannot do it. There is no narration in a Figma file.
- Keynote cannot do it. Builds fire on a click or after a delay, not on a word.
- It is exactly the brief: *simplicity, but flexibility.* Dragging a keyframe onto "Samarkand" is
  one gesture, and it replaces the alternative, which is a teacher guessing at 12.4 seconds.

**Why not GSAP for the timeline itself.** GSAP stays where it already earns its place, in UI motion.
It is a tween engine: it wants to own time. Our timeline must be scrubbed and must stay locked to an
audio element that also owns time, and `samplePose(track, t)` already gives a deterministic value
for any `t` with none of that argument. One clock, pure samplers, no second scheduler.

---

## Architecture

**One model, two doors.** The Animate tab (form) and the Timeline tab are two views of the same
stored animation, exactly as the panel and the canvas are two views of one value. Change the
dropdown and the keyframes move; drag a keyframe and the form reads `Custom`. They may never
disagree for a frame.

**Storage** — in the scene config, written through `saveSelected()` like every other config edit
(`setSceneTransition` at `Step3SceneConfigurator.php:467` is the pattern to mirror; writing straight
to the model is overwritten by the next save, which rebuilds config from the snapshot):

```
config.timeline = {
  duration: <seconds>,                 // defaults to scenes.duration_seconds
  tracks: [
    { target: 'camera',    property: 'altitude', keys: [{ t, v, ease }] },
    { target: 'layer:<id>', property: 'x',       keys: [{ t, v, ease }] },
  ],
}
```

**The timeline's rows ARE the scene's object list, with lanes.** Bart, on reading the first draft:
*"These are all layers — camera should be added to maps for example."* That is the correction the
whole design turns on, and the code already agrees with him: `objectList()`
(`step3-scene-configurator.blade.php:1107`) lists text and artwork layers front-most first and then
PINS non-layer objects at the bottom — `Background` on a flat scene, `Gallery` + `Waypoint` on a
voyage. A camera is one more of those: a thing a map scene HAS, listed where objects are listed.

Consequences, all of them good:

- **A camera is added, not ambient.** Map and voyage scenes get an "Add camera" affordance. Nothing
  gains a camera it never asked for, and removing one goes through the existing `deleteObject`
  router rather than a second delete path.
- **One list, two views.** The timeline shows the same objects in the same order with the same icons
  and labels as the object list, plus a lane each. Selecting a row in one selects it in the other —
  UX logic is global.
- **Each object kind declares its own animatable properties.** A camera has
  `lng, lat, altitude, heading, tilt`. A text or image layer has `x, y, scale, rotation, opacity`.
  The mock draws `POSITION X/Y · SCALE · COLOR` under a heading called Camera, which is a layer's
  property set wearing the camera's name — the mock is right about the ROW SHAPE, not the list.

**Reuse, really.** `camera-track.js` already holds keyframe CRUD (`addKeyframe`, `removeKeyframe`,
`updateKeyframe`, `setDuration`, `trackDuration`) plus segment-finding. A generic numeric track needs
all of that and differs only in interpolation. Extract the shared half into `keyframes.js` and let
`camera-track.js` keep pose interpolation — and the extraction is done only when `camera-track.js`
imports it too, not when a second copy exists.

---

## Assumptions (stated, not blocking)

1. **Timeline duration follows the narration** (`duration_seconds`), editable but defaulting there.
   The mock says `2000 ms` against a 47-second waveform; that is mock debris, not a decision.
2. **`COLOR` is out of phase 1.** It is a layer tint, it needs a colour well, and it earns nothing
   for the camera.
3. **Phase 1 ships the generic path with the camera as its first client.** Not "camera-only" —
   that was the first draft, and building the special case first means retrofitting the general one.
   The object list, the groups, the property rows and the lanes are generic from the start; the
   camera is the first kind registered against them. Layers then cost a registration, not a rebuild.
   A camera that flies on a spoken word is what proves the idea, so it goes first.

## For Bart, when convenient (none of these block a start)

- The mock's transport shows `ms`. Teachers think in seconds and the narration is in seconds —
  I intend to show `12.4s` and keep ms internally. Say if you want ms on the face.

---

## Tasks

### Task 1: Extract shared keyframe mechanics

**Files:** create `resources/js/anim/keyframes.js` + `__tests__/keyframes.test.js`;
modify `resources/js/map/camera-track.js`.

- [ ] Failing test: `addKeyframe` keeps keys sorted by time; `updateKeyframe` is immutable;
      `segmentAt(keys, t)` returns `{a, b, u}` with `u` normalised, and clamps outside the range.
- [ ] Move CRUD + segment-finding across; `camera-track.js` IMPORTS them.
- [ ] `sampleNumber(track, t)` with per-segment easing from `easing.js`.
- [ ] Validate: `npx vitest run resources/js/anim resources/js/map` — camera tests still green.

### Task 2: The narration clock

**Files:** create `resources/js/anim/narration-clock.js` + tests.

- [ ] `wordSpans(alignment)` → `[{ word, start, end }]` collapsed from character entries. Mirror the
      normalisation in `shot-sync.js:resolveAnchorTime` rather than inventing a second one.
- [ ] `snapToWord(spans, t, toleranceSeconds)` → the nearest word START within tolerance, else `t`.
- [ ] Test against a real stored alignment fixture, NOT a hand-written one in the shape the code
      wants — the fixture must come from `scenes.audio_alignment` as the server returns it.
- [ ] Validate: `npx vitest run resources/js/anim`.

### Task 3: Scene director — one clock, pure samplers

**Files:** create `resources/js/anim/scene-director.js` + tests; reuse `camera-director.js`.

- [ ] The audio element is the clock when a scene has narration; an rAF clock when it does not.
- [ ] On each tick, sample every track and apply: camera through `applyPose`, layers through the
      existing overlay setters.
- [ ] `seekTo(t)` is exact while paused, and drives the same appliers, so scrubbing and playing are
      the same code path.
- [ ] Test the sampling and dispatch, not the browser: a fake clock, a spy applier.
- [ ] Validate: `npx vitest run resources/js/anim`.

### Task 4: The Timeline tab — chrome only, at Figma's geometry

**Files:** create `resources/views/components/lesson/animation-timeline.blade.php`
(NOT `timeline.blade.php`); modify `script-editor.blade.php:50` (the dock tab strip) and the
`$store.view` tab list at `step3-scene-configurator.blade.php:1329`.

- [ ] Third dock tab, first in order: `Timeline | Script | Icons`. Update the View menu label
      (`Icons & Script` at `:1412`).
- [ ] Transport row, ruler, playhead, zoom control, track area, waveform strip — pull every colour,
      size and radius from node `1417:1999`. Reuse `<x-ui.slider-row>` and the existing scrubby
      numeric field; do not build new ones.
- [ ] No behaviour yet beyond the playhead following a drag.
- [ ] Validate: measure the rendered result against Figma in a real browser tab, per `fix-ux`.
      `php artisan lang:audit` at 100% across five languages.

### Task 5: Waveform + word ruler

**Files:** create `resources/js/anim/waveform.js` + tests; modify the timeline component.

- [ ] Draw peaks to a canvas from the decoded audio, once, cached per `audio_path`.
- [ ] Word boundaries as faint marks on the ruler, from Task 2.
- [ ] A scene with no narration shows an empty strip and a plain ruler, not an error.
- [ ] Validate: vitest for the peak reduction; screenshot for the strip.

### Task 6: Add a camera to a map scene, and key it, with word snap

**Files:** modify the timeline component; add `setTimelineTrack()` to `Step3SceneConfigurator`.

- [ ] "Add camera" on a map or voyage scene appends a pinned `Camera` object to `objectList()`
      alongside `Background`, with its own icon and label. Removing it goes through `deleteObject`.
- [ ] The diamond on a property row sets a key at the playhead from the map's CURRENT pose
      (`poseFromMap`) — the gesture is "put what I am looking at here".
- [ ] Drag a keyframe along its lane; it snaps to a word start within tolerance, and shows the word
      it lands on while dragging. Alt places freely — the modifier changes the step, never the
      meaning.
- [ ] Double-click a keyframe removes it. Esc during a drag returns it to where it started.
- [ ] Persist through `saveSelected()`; the aspect the fix-ux traps warn about: any per-element
      state you invent lives in a WeakMap, never a `data-` attribute a morph will strip.
- [ ] Validate: Playwright with a real mouse (`page.mouse`, walked in), asserting the stored track
      and the map's pose, not just the DOM.

### Task 7: Playback, and the two doors agreeing

**Files:** modify the timeline component, `animate-inspector.blade.php`, `lesson-player.js`.

- [ ] Play runs the narration and the tracks together; the playhead follows the audio.
- [ ] The player replays the same stored tracks through the same `scene-director.js`. One engine,
      editor and player.
- [ ] The Animate tab reads the same model: choosing a movement writes keyframes; a hand-edited
      track shows `Custom` rather than silently reverting.
- [ ] Register duration, snap tolerance and playhead position in the dev panel, in this change.
- [ ] Validate: play a whole lesson with `--mute-audio` and watch it, per the standing rule that a
      200 and a DOM assertion prove nothing about a timed audio-visual thing.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Camera track re-mounts the map on edit and flickers | High — it has happened before | Update in place; re-mount ONLY on voyage-id change. `feedback-voyage-map-never-remount-on-edit` |
| Two overlays on a map scene, so a live preview updates the node nobody is looking at | Medium | `two-artwork-overlays-on-a-map-scene` — tag the live node and assert against that one |
| Timeline verified in the in-app browser pane, where rAF never fires and MapLibre never paints | High | Real browser tab only |
| A fixture in the shape the code wants hides a dead feature | High — twice already | Alignment fixtures copied from a real `audio_alignment` row |
| Scope creep into a full NLE | Medium | Phase 1 is camera-only and says so |
| Scenes with no narration | Certain | Empty strip, plain ruler, rAF clock |

## Validation

```bash
npx vitest run && vendor/bin/phpunit --filter Timeline && php artisan lang:audit
```

## Out of scope

Layer property tracks, per-segment easing UI, colour tracks, exporting video, motion blur, and any
second animation model. Phase 2 and 3.

# Auto-director, sound and the museum intro (S5)

Three pieces, each in its own folder, none touching `src/stage25d/` or timeline playback (S1).
Lab: `director-lab.html` (launch config `studio-director`, port 5291). Silent end-to-end check:
`node tools/director-check.mjs http://localhost:5291 <outDir>`.

## 1. Auto-director `src/director/`

`direct(lesson, library) -> lesson` (pure, input untouched). Per scene it proposes:

| Field | What |
|---|---|
| `camera` | first shot `{move, from, to, ease, dur_s, at_s, native?, why, by}` (the shape agreed with S1) |
| `camera_more` | further shots when a scene runs past 12 s (shots 6-12 s, cut evenly) |
| `motion` + `motion_by` | timeline tracks `{target: 'layer:i' \| 'figure:i', property: x\|y\|rot\|opacity, keyframes}` |
| `balloons[].at_s/dur_s` | read time letters/15 + 1.5 s, 0.35 s apart, after the narrator's first sentence |
| `narration_at_s`, `dur_s` | when the narrator starts (after a silence), scene length |
| `sound` | `{ambience[{id,gain}], lead_in_s (J), tail_s (L), silence, sfx[{id,at_s}], duck_db, by}` |

Rules (all in `audit.ts`, held by `direct.test.ts`): hook move starts at 0 with `easeOutQuart` so it is
mostly done by 3 s; at least 4 kinds of move (push, pull, truck, pan, tilt, rack) and never the same
move across a cut; exactly one native move (`through`: the camera passes the foreground plane into the
scene) on the first climax, else the first turn, else at 70 %; only `through` may pass the fg plane;
at least 2 near-silences (before the turn and the peak, never on the hook); at least 2 cuts carry
sound (J-cut where the place changes, L-cut out of the peak, early foley as a top-up); ease by intent,
never linear; figures never move in step (phase offsets). Shot length from TTS `timings.duration_s`,
else `est_s`, else words / 2.5.

**Camera frame (for S1):** metres. Rest pose x 0, y 1.6 (eye), z 0, looking +z; `fov` vertical deg.
Layers stand at `DEPTH_Z = {fg 4, mid 12, bg 40, sky 200}`; a layer's scene x (0..1) is world
`worldX(x, z) = (x - 0.5) * visibleWidth(z)`. `target` (look-at) drives pan/tilt, `focus_z` the rack.
A stage that reads only x/y/z/fov still gets push/pull/truck right.

**Teacher owns everything:** whatever the director writes carries `by: 'director'` (`motion_by`,
`balloons_by`). A teacher edit drops the mark; a re-run keeps every unmarked field as it is.

## 2. Sound `src/sound/`

- `bank.json`: ids, files, default gains, tags (English + Dutch) per bed and SFX. Beds per bundle:
  `nl-prehistory` heath-wind (base), heath-birds, camp-fire, cattle-field, hand-tools;
  `nl-golden-age` harbour-water (base), gulls, rigging-creak, sea-waves, town-bells, quay-crowd;
  `intro` museum-room. SFX: answer-correct, answer-wrong, meter-rise, reveal, ink-whoosh, step-grass,
  wood-knock, rope-creak.
- Audio: `~/BartsMedia/historyportal/sound/` (symlink `public/sound`, git-ignored), made by
  `python3 tools/soundbank/make_bank.py` (seeded, ~30 s). **All self-generated, CC0**: `CREDITS.md`.
  Beds are 24 s seamless loops levelled to -20 dBFS RMS. They are synthesis, not field recordings: fine
  as beds under a narrator; swap any id for a CC0 recording later (same id, same file name).
- `schedule.ts` (pure): a lesson's sound as timed events: one looping source per run of scenes that
  share a bed, crossfades (1.5 s), J/L-cuts, duck under each narration (`duck_db`, -12), near-silence
  (bus to 0.12), SFX at cue times. `preroll_s` starts scene 1's beds before lesson time 0.
- `player.ts` `LessonSound`: the Web Audio graph (beds -> ambience bus -> master; SFX bus; optional
  narration bus via `connectNarration(el)`; master mute). `play(lesson, from)`, `playScene`, `hit(id)`,
  `bedOn/bedOff`, `pause/resume`, `setMuted`, `state()` and `log` for checks. Works on an
  `OfflineAudioContext` too: the lab renders a lesson silently and measures it.

Measured (offline render of the fixture): ambience about -26 dB between lines, about -35 dB under the
narrator (the duck), -42 / -46 dB in the two silences; all 20 files load.

## 3. Intro handoff `src/intro/` + branch `proto/museum-intro-handoff`

**Route: keep the Three.js intro as its own module, do not port it.** Porting the museum (hall, figure,
ink pass, camera path) to Babylon is days; the handoff only needs one moment. The prototype runs in an
iframe over the stage (built into `public/intro/`, git-ignored:
`npx vite build --outDir <engine-mvp>/public/intro` inside `prototypes/museum-intro`).

1. **The painting is data:** scene 1's first frame. `runIntro({capture})` takes the stage's own render
   of scene 1 at `camera.from` (S1: render once at t 0, `canvas.toBlob`); without one,
   `composePainting` lays scene 1's library layers out from the rest camera (`paintingLayout`, tested).
   It goes to the intro as `?painting=<blob url>&aspect=16/9` (same origin), the frame takes the stage
   aspect.
2. Intro posts `hp-intro:ready` (loaded) and, at `BEATS.swapStart` (13.0 s, the figure is in and the
   camera holds), freezes and posts `hp-intro:handoff` with the painting's screen rect.
3. The stage fades in inside that rect (0.4 s); scene 1's beds start under it (J-cut, 1.2 s preroll)
   while the museum room fades; at lesson time 0 `onLessonStart()` starts the timeline and the rect
   opens to full screen (1.3 s, EASE.move); the iframe is removed. Because the painting is the stage's
   own frame 0, the swap is invisible: we are simply in the painting.
4. Broken intro (no ready in 60 s, no handoff 23 s after ready): the lesson starts on its own.

Prototype changes (branch `proto/museum-intro-handoff`, from `proto/museum-intro-v5`): `?painting`,
`?aspect`, `?handoff` in `src/main.js` only. Its 3D Tasman world after 13 s is not used here.

## Not done / for the PM

- S1 must map `camera` (frame above), `camera_more`, `motion` targets `layer:i`/`figure:i`, and call
  `LessonSound.play` / `runIntro(... capture, onLessonStart)`. Nothing of that is wired into the studio.
- Foley is matched by pose (walk, kneel, carry) only; per-action foley wants an action field in lesson.json.
- On the museum frame the painting fills the screen at 13 s (rect slightly larger than the viewport), so
  the "grow" is short; a wider hold would show the frame opening. Tune `BEATS.swapStart` / the camera key.

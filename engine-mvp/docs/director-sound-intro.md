# Auto-director, sound and the museum intro (S5)

Three pieces, each in its own folder, none touching `src/stage25d/` or timeline playback (S1).
Lab: `director-lab.html` (launch config `studio-director`, port 5291). Silent end-to-end check:
`node tools/director-check.mjs http://localhost:5291 <outDir>`.

## 1. Auto-director `src/director/`

`direct(lesson, library) -> lesson` (pure, input untouched). Per scene it proposes:

| Field | What |
|---|---|
| `camera` | first shot `{move, from, to, ease, curve, dur_s, at_s, native?, why}`: S1's `CameraMove`; `ease` in the stage's names (`in`/`out`/`inOut`), `curve` the finer easing.js name |
| `camera_more` | further shots when a scene runs past 12 s (shots 6-12 s, cut evenly); `shotAt(scene, t)` picks the one playing |
| `set.layers[i].motion` | `{kind, amount, speed}`: what S1's stage plays (sway/drift/ripple/flicker), fg stronger, speeds staggered; only where the layer has none |
| `motion` | figure tracks `{target: 'figure:i', property: x\|y, keyframes}` (walk across, breathing bob), for S3 |
| `balloons[].at_s/dur_s` | read time letters/15 + 1.5 s, 0.35 s apart, after the narrator's first sentence |
| `narration_at_s`, `dur_s` | when the narrator starts (after a silence), scene length |
| `sound` | `{ambience[{id,gain}], lead_in_s (J), tail_s (L), silence, sfx[{id,at_s}], duck_db, by}` |

Rules (all in `audit.ts`, held by `direct.test.ts` and `rules.test.ts`, which measures from outside: the
stage's own ease, the shot on screen at each cut, the schedule's real sound events, and S4's three real
lessons when the vault is present). The audit measures moves with the stage's own `ease` (one source of
truth: audit = playback). The hook move starts at 0 and is more than half done by 3 s (hook shots at
most 8.5 s). Moves rotate through each beat's pool of three, never repeat across a cut (counting a split
scene's last shot), never make A B A B, and avoid A B C A B C. Shot scale (`scale`: wide / medium /
close) rotates per beat and never repeats shot to shot; the native move is exempt (it is its own
framing: through the foreground into the scene), in the director and in the audit. Shot length per beat: climax at most 8 s, turn
10, hook 8.5, others 12. Silences: one per ~2.5 min on turns and climaxes, 60 s apart; the audit
demands at least one per 3 min (12 min = 4). The native move only on a climax (the one nearest 70 %, a
teacher-locked one passed over; no free climax = no native move). Minimums scale down for short lessons
(`minimums(n)`). A balloon a teacher adds is timed after the ones already there. at least 4 kinds of move (push, pull, truck, pan, tilt, rack) and never the same
move across a cut; exactly one native move (`through`: the camera passes the foreground plane into the
scene) on the first climax, else the first turn, else at 70 %; only `through` may pass the fg plane;
at least 2 near-silences (before the turn and the peak, never on the hook); at least 2 cuts carry
sound (J-cut where the place changes, L-cut out of the peak, early foley as a top-up); ease by intent,
never linear; figures never move in step (phase offsets). Shot length from TTS `timings.duration_s`,
else `est_s`, else words / 2.5.

**Camera frame = S1's stage** (`src/stage25d/layout.ts`, `DEPTH_Z` imported from there): metres, house
camera x 0, y 1.6, z 0, looking +z; `fov` vertical deg. That stage moves position only, so pan and tilt
carry a positional part (a slide, a crane down) and rack a small push; `target` (look-at) and `focus_z`
ride along for a stage that can aim and focus.

**Place-aware sound:** beds come from `scene.bundle ?? lesson.bundle`. The place is the `!region` tag in a
need or the sky (a scene without one inherits the place before it). A place the bundle does not cover:
`bank.places` beds when the bank has them (`!ocean`: sea waves + rigging), else the neutral air bed plus
universal beds only (fire, tools, cattle, sea, gulls, rigging), `scene.sound_note`, and one
`needed_assets` row per place (`{tags: 'ambience bed !egypt', layer: 'sound', why: scene ids}`) for S2.
No Dutch heath under Mesopotamia. The extra bed is sticky within one place.

**Teacher owns everything:** the director keeps a fingerprint of each field it wrote in
`scene.director` (camera, camera_more, sound, balloons, motion, timing, per-layer motion). A re-run
rewrites a field only while it is empty or unchanged since; anything a teacher changed, by any editor
or path, is kept. A re-run on an untouched lesson returns it unchanged (tested).

**S1 integration:** done on `feat/studio-25d` (03f3f12f): scene length = `scene.dur_s` first, and
`camera_more` plays through `shotAt`. `rules.test.ts` holds it with the stage's own functions.

**Timing = one shared model:** `tools/lessongen/timing.json` (S4's validate.py reads the same file;
`HP_TIMING_JSON` overrides it under Node). Shot = max(6 s, spoken + 0.6 s breath), spoken = measured
`tts_s` (or TTS `timings`) else words / 2.4; then `class_action_s`; an interaction adds its fixed
time (quiz 40, power-meter 60, choice 30). `est_s` no longer drives length. The director adds only
its own silences (1.2 s) and balloon reads longer than the line; `lessonSeconds(lesson)` is the
played total. Model totals equal validate.py's (eb-1 633, eb-2 577, hunebedden 666, voc 872 s); the
director's totals are 3.5-13.6 s longer, from those additions.

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
  `bedOn/bedOff`, `pause/resume`, `setMuted`, `state()` and `log` for checks. A newer `play()`/`stop()`
cancels one still loading. L-cut: `tail_s` on a scene keeps the beds that leave at that cut ringing on. Works on an
  `OfflineAudioContext` too: the lab renders a lesson silently and measures it.

Decoded peaks are all below 0 dBFS (max -1.2, `tools/soundbank/peaks.sh`). Measured (offline render of the fixture, `tools/director-check.mjs` prints it): ambience about -26 dB between lines, about -35 dB under the
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

- Not wired into the studio: S1's stage should call `direct()` on load, `LessonSound.play` with its
  clock, and `runIntro({capture, onLessonStart})`.
- eerste-boeren is set in Mesopotamia/Levant/Egypt but declares `bundle: nl-prehistory` (S4): the
  director now leaves the Dutch-only beds out and notes it, but a Near-East bed set would be better.
- Foley is matched by pose (walk, kneel, carry) only; per-action foley wants an action field in lesson.json.
- On the museum frame the painting fills the screen at 13 s (rect slightly larger than the viewport), so
  the "grow" is short; a wider hold would show the frame opening. Tune `BEATS.swapStart` / the camera key.

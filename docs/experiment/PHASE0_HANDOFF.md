# Phase 0 handoff — for the local Claude Code session

This changeset (2026-08-24) implements the frozen Phase 0 experiment design. Read
`phase0-protocol.md` (design, thresholds, ship gate) and `scoring-rubric.md` (blind scoring)
in this folder before touching the visual pipeline — thresholds are pre-registered and must
not be edited after generation starts.

## New files

- `app/Services/SensitiveTopicPolicy.php` — documentary gate (keywords + `game_config.visual_policy` override)
- `app/Services/Support/GenerationRunRecorder.php` — best-effort run/cost instrumentation (static per-worker context)
- `app/Models/GenerationRun.php` + `database/migrations/2026_08_24_000001_create_generation_runs_table.php`
- `app/Models/LessonTelemetryEvent.php` + `database/migrations/2026_08_24_000002_create_lesson_telemetry_events_table.php`
- `app/Http/Controllers/Api/LessonTelemetryController.php` — public batch ingest by lesson code, throttled
- `app/Console/Commands/PruneLessonTelemetry.php` — retention (add to cron, daily)
- `resources/js/lesson-telemetry.js` — anonymous per-page-load session, batched, sendBeacon on exit

## Modified files

- `app/Services/Support/ImageStyleTemplate.php` — ENVIRONMENT vs NARRATIVE negative prompts;
  `buildShotGrid(..., narrative:)`; `NEGATIVE_PROMPT` kept as deprecated alias (baseline byte-identical)
- `app/Services/ShotListPrompt.php` — `system($count, $narrative)`; action-based narrative prompt;
  `shotCountFor()` + `gridForCount()` (dynamic 3–8, prefers 2x3)
- `app/Jobs/GenerateSceneShots.php` — documentary guard, narrative/dynamic-grid branch, path recording,
  narrative shot fields (`subject`/`action`/`shot_size`/`narrative_function`) persisted into `scenes.shots`
- `app/Jobs/GenerateSceneImage.php` — records actual path (`sourced_artwork`/`generated_environment`/`none`)
- `app/Jobs/GenerateLessonScript.php` — documentary gate at dispatch, run snapshot after scripts,
  planned-path recording, `finish()` when the scene batch completes
- `app/Services/OpenAiLlmService.php` — token/call capture (vision detected by image parts)
- `app/Services/OpenAiImageService.php` — image call + retry capture in `requestOne`
- `config/lessons.php` — `narrative_shots`, dynamic-shot params, `experiment_label`,
  `sensitive_topics`, `cost_rates`, telemetry settings
- `routes/api.php` — `POST /api/lesson/{code}/telemetry`
- `resources/js/lesson-player.js` — telemetry hooks (init/start/scene/pause/seek/quiz/end/exit; `_tel` stub for HMR)

## Bring-up checklist

1. `php artisan migrate`
2. `npm run build` (new import in lesson-player.js)
3. Add to cron: `php artisan lessons:prune-telemetry` (daily)
4. `.env` (deploys without git): `GIT_COMMIT=<sha>`
5. Baseline runs: `LESSON_EXPERIMENT_LABEL=phase0-baseline`, `LESSON_NARRATIVE_SHOTS=false`
6. Candidate runs: `LESSON_EXPERIMENT_LABEL=phase0-candidate`, `LESSON_NARRATIVE_SHOTS=true`

## Suggested tests to add (not included in this changeset)

- SensitiveTopicPolicy: keyword hit routes documentary; override wins both directions
- ShotListPrompt::shotCountFor/gridForCount boundaries (words → 3/4/6/8; layouts 1x3/2x2/2x3/2x4)
- ImageStyleTemplate::buildShotGrid narrative=false is byte-identical to the pre-change output
- LessonTelemetryController: event whitelist, unknown code → 204, batch cap
- GenerateSceneShots documentary lesson dispatches GenerateSceneImage (no grid)

## Known accepted limits (documented in the protocol)

- Quiz/game-pack jobs run after `finished_at` → not counted in run cost
- fal.ai upscale calls not metered
- Blinding cannot hide panel COUNT between conditions → reliability double-scoring compensates

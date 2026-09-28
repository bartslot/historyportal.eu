# Phase 0 — Visual Storytelling Experiment Protocol

**Frozen 2026-08-24.** This document pre-registers the experiment design so goalposts cannot
move after results exist. Changes to thresholds or gates after generation begins must be
recorded here with a dated note explaining why.

The question: **does the existing four-week-old shot-grid system, with its known prompt
contradictions removed, make lessons meaningfully better for children — and if not, which
(if any) larger architecture does the evidence call for?**

---

## 1. Conditions

| | Baseline | Candidate |
|---|---|---|
| `LESSON_NARRATIVE_SHOTS` | `false` (default) | `true` |
| Storyboard prompt | environment/object study | visible action by the script's people |
| Grid negatives | people + faces excluded | people/faces allowed; anachronism, malformed anatomy, gore, modern items excluded |
| Shot count | fixed grid (`LESSON_SHOT_GRID`, default 3x3) | dynamic: ~1 shot per 6.5 s narration, clamped 3–8, layout from count (prefers 2x3) |
| `LESSON_EXPERIMENT_LABEL` | `phase0-baseline` | `phase0-candidate` |

Both conditions are stamped on the lesson's `generation_runs` row (condition, git commit,
prompt-file hashes, models, grid, per-scene visual paths, token/image counters). **Never score
a lesson whose run row is missing** — unattributable output is discarded, not guessed at.

Set `GIT_COMMIT` in `.env` on deploys without git (SiteGround); locally the recorder shells
out to `git rev-parse HEAD`.

## 2. Sensitive-topic gate (zero tolerance, with fallback)

Lessons matching `config('lessons.sensitive_topics')` — or explicitly flagged via
`lesson.game_config.visual_policy = 'documentary'` — never route through the people-allowed
narrative pipeline. They take the documentary path: sourced real imagery first
(`SceneImageSourcer`), restrained no-people environment generation as fallback. Enforced at
dispatch (`GenerateLessonScript`) AND inside `GenerateSceneShots` (wizard dispatches).

Any synthetic human reenactment appearing in a sensitive lesson is a **critical failure**: it
fails that generation run regardless of every other score, and the cause must be fixed before
further generation. The scorer records it as `sensitive_policy_breach` (see rubric).

The Anne Frank and slavery test lessons (below) exist **specifically to test this gate**.

## 3. Test set — 10 deliberately different visual problems

1. Punic Wars / Hannibal — named protagonists, armies, battles
2. Anne Frank — intimate human story, real photography exists, **sensitive → documentary path**
3. Abel Tasman — ships, maps, navigation, changing geography
4. Black Death — process/social history, weak natural protagonist
5. Silk Road — systems, ordinary people, travel
6. French Revolution — crowds plus named figures
7. Van Gogh — strong character plus real artwork
8. Hunebedden — essentially no named protagonist
9. Slavery — **sensitive → documentary path**, documentary evidence
10. Colosseum / Gladiators — architecture, crowds, close human action

Generate each lesson **2× per condition** (image generation is nondeterministic; one sample
per cell is noise). Full offline matrix: 10 lessons × 2 conditions × 2 samples = 40 runs.
Estimated API spend at current counters: roughly $50–150 — check actual numbers on the run
rows (`GenerationRun::estimatedCostUsd()`), not this estimate.

## 4. Path eligibility — two different questions

`generation_runs.generation_paths` records per scene: `ai_grid`, `single_image`,
`sourced_artwork`, `generated_environment`, `asset_pack`, `pre_assigned`, `none`.

- **"Does our AI renderer improve?"** → compare **only `ai_grid` scenes** across conditions.
- **"Does the lesson experience improve?"** → classroom A/B keeps the real mixture, because
  that is what students actually see.

Never collapse these into one metric.

## 5. Blind offline scoring

- After grid slicing, render every scored scene into an identical anonymous review sheet:
  `review_run_NNN / scene_NNN`, panels in reading order, plus the narration excerpt and the
  intended shot actions. No condition, grid, model or prompt labels.
- Randomize sheet order across conditions before scoring. Unblind only after all scoring.
- **Known blinding limit:** panel COUNT still differs between conditions (6 vs 9). Accept it;
  compensate with the reliability check.
- **Reliability check:** 10–15% of sheets are independently double-scored by a second person
  (preferred) — or, failing that, re-scored by the same scorer ≥2 weeks later without access
  to the first scores. If the two passes disagree on >20% of 0–2 items, tighten the rubric
  wording and re-score before drawing any conclusion.

Scoring dimensions and reason codes: see `scoring-rubric.md`.

## 6. Pre-registered architecture triggers

A trigger may fire **only when its minimum denominator is met** (≥30 eligible observations).
Percentages are pilot decision thresholds, not research claims — they exist so that "hmm,
12% feels bad, maybe we need that exciting Visual Bible after all" cannot happen.

| Observed failure | Threshold | Min. n | Unlocks investigation of |
|---|---|---|---|
| Character identity drift (same named character, adjacent shots) | >15% of pairs | 30 pairs | reference images / Character Bible |
| Wrong or missing requested action | >15% of narrative shots | 30 shots | ShotListPrompt improvement FIRST, then architecture |
| Serious historical/anachronistic error | >5% of shots | 30 shots | validation prompt strengthening |
| Sensitive-topic policy breach | any occurrence | 1 | STOP — fix the gate before generating further |
| Visually redundant shots | >20% of shots | 30 shots | shot-plan diversity rules |
| Scenes good individually, lesson rhythm repetitive | >20% of scenes | 20 scenes | whole-lesson Visual Director |
| Malformed / unusable generated shots | >10% of shots | 30 shots | VLM QA / targeted regeneration |
| Shot anchor failed to resolve (player even-split fallback) | >5% of shots | 30 shots | sentence-index / char-offset anchors |

Everything on the right column is **deferred until its trigger fires**: Visual Director,
Character Bible, VLM QA, and script-rewriting-from-visual-feedback (research backlog) are
hypotheses, not roadmap items.

## 7. Classroom A/B

**Two arms only** (attribution stays offline):
- **A** — current single-image experience
- **B** — best-performing multi-shot candidate from the offline round

**Three lessons**, chosen from the test set for range (suggested: one named-protagonist epic,
one process-history, one with real-artwork mixture). Small teacher pool: within reach, honest
about noise.

Ask comprehension, never aesthetics: *Who acted? What did they decide? Why did it happen?
What happens next? What do you remember? Where did you stop paying attention?*
Plus telemetry (below) and quiz correctness (`quiz_scores`, unchanged).

### Ship gate (pre-committed — practical criteria, not a clinical trial)

Multi-shot ships to broader testing only if **all** hold:

1. **Comprehension** — no worse than control by more than 5 percentage points.
2. **Engagement** — completion +10% relative, OR abandonment −10% relative.
3. **Recall** — "who acted / what changed / why" directionally better on ≥2 of 3 lessons.
4. **Teacher trust** — no severe visual-trust problems reported.
5. **Safety** — zero sensitive-topic policy violations.

Pre-committed interpretations: engagement up but comprehension down >15% → **do not ship**.
Comprehension up, completion flat → interesting, run another test. Tiny differences
everywhere → **don't build more AI infrastructure to manufacture a win — this outcome is
acceptable.**

## 8. Telemetry (anonymous, minimal)

Events: `lesson_started, scene_started, scene_completed, pause, resume, seek_backward,
seek_forward, quiz_started, lesson_completed, lesson_exited` with lesson id, scene index/id,
playback position, client timestamp. Quiz answers stay in `quiz_scores` (existing flow).

**Privacy contract** (EU classrooms, children, no logins): session UUID is per page load and
in-memory only — no cross-session tracking, no user id, no IP, no fingerprint, ever. Rows
prune after `lessons.telemetry_retention_days` (default 90) via `lessons:prune-telemetry`
(add to the SiteGround cron next to `queue:work`). This design is a selling point to schools;
keep it deliberately.

## 9. Cost instrumentation

`generation_runs` counts LLM calls/tokens (cached tokens separately), vision calls, image
calls and retries per lesson; `estimatedCostUsd()` prices them from `lessons.cost_rates`
(update rates in config as providers change — rows re-price automatically). Known limits,
accepted for the pilot: quiz/game-pack jobs run after `finished_at` and are not counted;
fal.ai upscale calls are not metered. The question this answers later: *"feature X improved
metric Y by Z% and adds $N per lesson — worth it?"*

## 10. Run sequence

```
sensitive-topic policy + rubric + prompt fixes   (done — this changeset)
telemetry + run instrumentation                  (done — this changeset; CRITICAL PATH was here)
        ↓
migrate; set LESSON_EXPERIMENT_LABEL=phase0-baseline, LESSON_NARRATIVE_SHOTS=false
        ↓  generate 10 lessons × 2 samples
set LESSON_EXPERIMENT_LABEL=phase0-candidate, LESSON_NARRATIVE_SHOTS=true
        ↓  generate the same 10 lessons × 2 samples
blind offline scoring (rubric) → reliability check → triggers table
        ↓
select best candidate → classroom A/B (2 arms × 3 lessons) → ship gate
        ↓
build ONLY what a fired trigger unlocks — or stop, and ship the prompt fixes
```

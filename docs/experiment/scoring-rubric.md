# Phase 0 — Blind Scoring Rubric

Print this. Score from the anonymous review sheets ONLY (`review_run_NNN / scene_NNN`) —
never from the wizard, the player, or anything that reveals the condition. Unblind after all
sheets are scored. See `phase0-protocol.md` §5 for the blinding and reliability procedure.

Each sheet shows: the panels in reading order, the scene's narration text, and the intended
shot list (subject / action / shot size where present). Score every PANEL on the 0–2 items,
then the SEQUENCE items once per sheet.

## Per-panel scores (0 / 1 / 2)

| Dimension | 2 | 1 | 0 |
|---|---|---|---|
| `action_match` | shows the requested subject doing the requested action | subject present, action vague or generic | wrong/no subject, or action absent (score against `action`, or the description if absent) |
| `historical_plausibility` | period-accurate, no anachronism | minor doubt (ambiguous prop/costume) | clear anachronism or wrong setting |
| `subject_readability` | a child instantly sees who/what this is about | takes effort / partly obscured | unreadable, subject lost in scenery |
| `composition_usefulness` | framing serves the story beat (size/angle fit the moment) | serviceable but generic | fights the beat (wide postcard for a decision, etc.) |
| `artifact_quality` | clean render | minor defects not undermining the panel | malformed anatomy/faces, duplicated figures, broken geometry |

**Every 0 gets one reason code** (no free prose):
`WRONG_ACTION · NO_SUBJECT · IDENTITY_DRIFT · ANACHRONISM · DUPLICATE_FIGURE · BAD_ANATOMY ·
REDUNDANT · WRONG_LOCATION · SENSITIVE_REENACTMENT · OTHER`

## Per-sequence scores (once per sheet, 0 / 1 / 2)

| Dimension | 2 | 1 | 0 |
|---|---|---|---|
| `sequence_continuity` | same people look the same; space/direction coherent across panels | one visible break | characters or geography reset between panels |
| `visual_redundancy` | every panel adds information | one near-duplicate | two or more panels say the same thing |
| `story_progression` | panels alone tell "what happened" without reading the narration | partial — gist visible, causality not | panels are interchangeable postcards |

## Per-sequence flags (yes/no)

- `critical_failure` — any single thing that makes the sheet unusable in a classroom.
- `sensitive_policy_breach` — synthetic human reenactment in a documentary-policy lesson.
  **One yes fails the entire generation run** (protocol §2). Report immediately; do not
  keep scoring as if normal.

## Identity-drift pairs (feeds the Character Bible trigger)

For each pair of ADJACENT panels in which the same named character appears, mark the pair
`same` / `drifted` / `unsure`. `drifted` = a child would not recognize them as the same
person (face, build, hair, or costume changed without story reason). The trigger in protocol
§6 computes over these pairs — minimum 30 pairs before it may fire.

## Discipline

- Score what is ON the sheet, not what the pipeline "meant".
- When torn between two scores, give the lower one and add the reason code.
- Do not average in your head across panels — each panel gets its own row.
- Log roughly how long each sheet takes; if scoring a sheet takes >5 minutes, the rubric is
  too heavy — flag it, don't push through.

## Result row format (CSV)

```
sheet_id,scene_ref,panel,action_match,historical_plausibility,subject_readability,
composition_usefulness,artifact_quality,reason_codes,sequence_continuity,
visual_redundancy,story_progression,critical_failure,sensitive_policy_breach,
identity_pairs_same,identity_pairs_drifted,identity_pairs_unsure,seconds_spent
```

(Sequence columns repeat their value on each panel row of the sheet; identity pair counts
appear on the first row only.)

# Writer brief: lesson.json for History Portal

Read first: `~/.claude/skills/story-director/SKILL.md`, `~/.claude/skills/story-gamification/SKILL.md`,
the lesson's `blueprint.md`, `sources.md`, `ledger.md`. Output: one `lesson.json` matching
`lesson.schema.json` (example: `fixtures/minimal.json`).

## Story

- Cause and effect, 7 beats in order: hook, setup, cause, effect, turn, climax, recap (`beat` per scene;
  several scenes share a beat). Every scene is caused by the one before ("and so", "but then"), never "and then".
- Outsider view: the class enters through someone who does not know this world yet (a child, a newcomer).
- Characters carry it. Women and girls with agency (they decide, act, find). Invented people are plausible,
  labelled `invented` in `characters[].ledger` and in `ledger.md`, never presented as real historical persons.
  Real people (Tasman, a VOC director) only do what the sources say.
- Only the narrator speaks (`narration`). Character lines are silent `balloons`: short, at most 8 words,
  a child's voice, never carrying facts the narrator has not said.
- Dutch first (`lang: nl`). The voice of a good storyteller for the age: short sentences, concrete things to see,
  hear, smell; one new word at a time and explained in the story. No EdTech slogans, no "Where X meets Y",
  no "Ontdek ...!", no em/en dash, no emoji, no exclamation-mark spam.

## Shots and timing

- One scene = one shot. `est_s` 6-12 (narration at ~2.3 words/s plus look time; a 9 s shot carries ~15-20 words).
  Shots without narration are fine (look time, a balloon) if `est_s` >= 6.
- Change the picture every shot: angle, distance, who is in front. No slideshow: figures do something
  (`pose`: walk, carry, kneel, pull, dig, point, ...), never stand side by side.
- `set`: `sky` tags, `layers` with `need` tags (FIRST tag = the head noun, required for a library match; further
  tags only rank, e.g. "field barley ripe"; prefix a tag with ! to require it too, always for a place outside the
  bundle's region: "hills dry !mideast", "river !nile") from the bundle vocabulary (nl-prehistory: sky, heath, hills,
  field, hut, longhouse, hunebed, stone, oak, birch, alder, shrub, reeds, fence, cattle, pot, quern, axe, sledge,
  rope, fire; nl-golden-age: sky, sea, coast, harbour, warehouse, ship, quay, barrel, crate, rope, lantern,
  crane, tree, map, chest, spices). `asset: null` (the resolver fills it). Real places only from real sources.
- `camera`, `sound`: `null` (the director fills them).

## Interactions (`interaction` on the scene after which it plays; one per scene at most)

- First one within 3 minutes, then one every 2-3 minutes of story (the validator counts `est_s` + interaction `est_s`).
- `quiz`: the question moments of the blueprint, rewritten in our own words, about OUR story.
  Bloom mix: at most half recall (1); use 2 understand ("waarom"), 3 apply (a new case), 4 analyse
  (compare, cause/effect), 5 evaluate (what would you choose and why). `misconception` = what the wrong options test.
- `power-meter`: at least one, where something in the story must MOVE and is stuck (story-gamification skill):
  right words from this lesson, wrong words plausible but wrong here; the class gives the force, history gives
  the outcome; never in conflict, loss or the other side's perspective.
- `choice`: a dilemma a character faces; each option has an `outcome` that stays true to history
  (`history`: what really happened).
- `est_s` of an interaction = its play time (quiz 45-90, meter 60-120, choice 45-90).

## Facts

- Every scene has `fact_refs` (ids from `sources[]`). A source of kind `ledger` (url = the ledger.md path) covers
  invented staging only; any fact in the scene ALSO needs its real source.
- Only facts from `sources.md`. If uncertain, leave it out. Dates and numbers exactly as the source gives them.
- LessonUp is a blueprint only: never reuse a sentence or a question (the validator checks 6-word overlap).

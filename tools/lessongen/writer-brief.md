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

- One scene = one shot. `est_s` 6-12 (timing.json: words / 2.4 + 0.6 s, at least 6 s, at most 12 s, so at most ~27 words a shot).
  Shots without narration are fine (look time, a balloon) if `est_s` >= 6.
- Change the picture every shot: angle, distance, who is in front. No slideshow: figures do something
  (`pose`: walk, carry, kneel, pull, dig, point, ...), never stand side by side.
- `set`: `sky` tags, `layers` with `need` tags (FIRST tag = the head noun, required for a library match; further
  tags only rank, e.g. "field barley ripe"; prefix a tag with ! to require it too, always for a place outside the
  Netherlands: "hills dry !mideast", "river !egypt". Regions: mideast, egypt, mesopotamia, batavia, banda,
  ocean, newzealand, tasmania, mauritius. Head nouns singular ("goat", "sack"); never an abstract head ("spices") from the bundle vocabulary (nl-prehistory: sky, heath, hills,
  field, hut, longhouse, hunebed, stone, oak, birch, alder, shrub, reeds, fence, cattle, pot, quern, axe, sledge,
  rope, fire; nl-golden-age: sky, sea, coast, harbour, warehouse, ship, quay, barrel, crate, rope, lantern,
  crane, tree, map, chest, spices). `asset: null` (the resolver fills it). Real places only from real sources.
- A scene set outside the lesson bundle's world gets its own `bundle` (e.g. `near-east-neolithic` for the
  Natufian/Nile/Uruk scenes of a Dutch prehistory lesson); its art and sound come from that bundle.
- `camera`, `sound`: `null` (the director fills them).
- Map scene (`kind: "map"`): the painted lesson map instead of the stage, to show WHERE it happens. No `set`,
  `figures`, `balloons`, `camera` or `sound`; the usual `id`, `beat`, `narration`, `est_s`, `interaction`, `fact_refs`
  (and `branch` inside a run). `map` holds at least one of: `labels` (`{name, lng, lat, kind?}`, kind city or camp
  = dot + name, river or region = name only), `region` (`{name, highlight}`: `fertile-crescent`, or a polygon file
  in `public/map-regions`), `route` (`[[lng, lat], ...]` in order, a dashed ink line); optional `camera`
  (`{center: [lng, lat], zoom 1.6-8}`, about 4 for the whole Near East), else the map frames the labels and route.
  Real coordinates from a real source. One map shot is enough to place the story; it times like any shot.

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
- Branching story (optional, the class chooses and the story splits): a lesson-level `game` block
  (`meters`: 1-4 of `{key, label, icon?, start 0-100}`, `fail_threshold`) and a `branch` on each scene of a group:
  one `question` scene (`labels: {a, b}` = the two buttons, short and concrete), then 1-3 `option_a` shots, then
  1-3 `option_b` shots, then a NORMAL scene where both branches rejoin. The FIRST shot of each option carries
  `effects: {deltas: {meterKey: -25..25}, consequence_line, historical_note}` (the game master's line after the
  run; what really happened, shown on a game over). Both options stay true to history: say in `historical_note`
  what really happened. Branch scenes carry no `interaction` (the choice is the interaction, 30 s). The validator
  times the LONGER option for spacing and the SHORTER one for the 10-minute minimum.
- Label `bloom` honestly: the checker re-labels every question, and a recall question labelled 3 counts as recall.
- Play time is fixed in `timing.json` (quiz 40, power-meter 60, choice 30 s); an interaction's `est_s` is ignored.
- A class action inside a shot (hands up, say it together, one child answers) gets `class_action_s` = the time it needs.

## Facts

- Every scene has `fact_refs` (ids from `sources[]`). A source of kind `ledger` (url = the ledger.md path) covers
  invented staging only; any fact in the scene ALSO needs its real source.
- A shot that says a number, year or amount needs a real (non-ledger) source in its `fact_refs`.
- Only facts from `sources.md`. If uncertain, leave it out. Dates and numbers exactly as the source gives them.
- LessonUp is a blueprint only: never reuse a sentence or a question (the validator checks 6-word overlap).

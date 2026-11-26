---
name: consistent-shots
description: Make a scene's shots so the same people, horses, colours and geography hold from shot to shot, and so no picture is generated twice for the same mistake. Use before any still or video generation for a lesson scene (storyboards, keyframes, character or horse sheets used in shots), and whenever a shot "drifts". Wraps the History Lines skill with gates and the tools in tools/shots.
---

# Consistent shots

This is bart's plan of 26 Nov 2026 (`plans/storyboard-video-plan.md` in the project files) as a way of working.
It exists because the Marco Polo stills went in circles: hair and colours drifted, the brothers looked like
twins, horses were copies of each other, and a village changed distance between shots. Every regeneration cost
bart time.

Three things caused most of it, and each has a gate now:

1. **The model did not get the reference, or got a bad one.** Sheets were named in the prompt or kept as project
   files, the coloured sheet was never in the colour pass, and the style references were not History Lines at
   all. Now every request is a frozen pack with the real files, their hashes, and bart's approval on each.
2. **Shots were drawn one by one.** Each picture reinvents everything. Now the shots of a scene are drawn
   together on one board, from one layout seen from above.
3. **The same failing prompt was tried again.** Now the ledger counts failures by kind, and two of a kind stops
   the retries.

Video is the main way a scene moves (bart: about nine in ten). The stills made here are keyframes for video, not
the end product.

## What never changes

- The look comes only from bart's ChatGPT **history-lines** skill: pass 1 ink with the ink percentage as a
  number, pass 2 colour as an edit of that ink. Never write style or colour wording of your own. A pack's prompt
  names the skill and fills in content only.
- Never patch, redraw or recolour a finished picture with a model. A fix is a new run of both passes.
- Nothing is generated, and no credits are spent, before bart has seen the exact inputs.
- Blender only with existing models and captured animation, and only as a blocking reference.
- Media lives in `~/BartsMedia/historyportal/topics/<lesson>/<version>/{sheets,blender,stills,clips,audio,review}`.

## The files

| What | Where |
|---|---|
| Style references bart approved | `resources/art/style-anchors/history-lines/anchors.json` |
| Cast list of a lesson | `resources/art/shots/<lesson>/cast.json` |
| A scene: layout from above, boards, cells | `resources/art/shots/<lesson>/scenes/<scene>.json` |
| Request packs, ledger, reports | `<media>/review/requests/`, `<media>/review/shots-ledger.jsonl` |
| Keyframes | `<media>/stills/<board>/` |
| The commands | `python3 tools/shots/shots.py --help` |

The tools run where the media is, on bart's Mac. They only need Python with Pillow and numpy.

## The order

Each step ends in a gate. Do not start a step while the one before it is open.

### 1. References first

- `shots.py check <lesson>` lists what is missing: sheets without approval, files that changed since approval,
  shared signature colours, scenes without a layout.
- A **style reference** is only a picture bart himself called History Lines. Line references are approved for
  their drawing only (they are coloured pictures); colour references for the whole look.
- Each named character has one ink sheet and one colour sheet, and so does each horse. Use the sheets that exist
  first; do not redesign the cast to try the method. A sheet shows front, side, three-quarter and back, a face
  close-up, and nothing else. It says who someone is, never how to stand.
- bart approves a sheet in his own words. Then, and only then: `shots.py approve <lesson> <who> <ink|colour>
  <file> --by bart`. The hash is taken at that moment; a file that changes later needs him again.
- Give each character a `swatches` box per garment in `cast.json` (on flat paint of the approved colour sheet)
  and run `shots.py palette <lesson> <who>`. The fixed colours come from the approved picture, never from a
  typed-in guess.
- A generated shot never becomes a reference by itself, and a shot is never made from an earlier shot.

### 2. History check

Check every shot against real sources (animals, clothing, gear, ships, buildings, landscape) with the JEV
check, and record the file in the scene's `accuracy`. A pack is refused without it.

### 3. The scene from above

Write the scene file: landmarks with their real distances, who moves along which route, where the light comes
from, and for every shot a camera position, what it looks at, and what each landmark looks like from there
("a small shape on the far right horizon"). Screen direction follows from the map; it only flips on a
deliberate change of camera side. `shots.py map <lesson> <scene> <board> -o map.png` draws it.

- A still shows the calm moment before the action; the action is in the clip.
- At most three named characters in one cell.
- Poses come from the action. Two riders never stand the same way, because they are never doing the same thing
  at the same moment; say what each one does.

bart approves the layout and the shot list. Record it in the scene's `layout.approved`.

### 4. One board per run of shots

Shots that follow each other in one place go on one 2x2 board (four cells, 5 px white gaps). 3x3 is for rough
planning only: the cells are too small to become keyframes. Never one board for a whole lesson.

`shots.py pack <lesson> <scene> <board> ink` freezes the request in a folder:

- `attachments/`: the real files, numbered in attach order (style references, then each character and horse);
- `prompt.txt`: the skill, the pass, the ink number, which image is who, the layout, the cells;
- `inputs.png`: every attachment on one page, with its hash;
- `manifest.json`: path and sha256 of every attachment.

It refuses when anything is unapproved, changed or missing.

**Gate: bart sees `inputs.png` and `prompt.txt`.** When he says yes: `shots.py seen <pack> --by bart`.

### 5. Ink pass

Send exactly the pack: its attachments, attached to the request itself in order (never ChatGPT project files),
and its prompt, unchanged. The prompt asks the model to first say in a line what it sees in each image. Save
that answer and record the send: `shots.py sent <pack> --lesson .. --tool .. --model .. --echo echo.txt`. Fewer
descriptions than attachments means a reference did not arrive: do not use the picture.

Then, before any colour:

1. `shots.py verify <lesson> <scene> <board> --ink board-ink.png` measures the grid and the ink share per cell.
2. Look at every cell yourself, against the sheets and the map: faces, hands, horses, who stands where, the
   landmark sizes, history.
3. Ask ChatGPT what is weird and what to add, change or remove.
4. `shots.py accept ... ink board-ink.png --by claude,chatgpt` when it is right, or
   `shots.py reject <lesson> <board> --failures <kinds>` when it is not.

### 6. Colour pass

`shots.py pack ... colour --ink board-ink.png` builds the second pack: the approved ink board as the picture to
colour, the colour style reference, and the **coloured** sheet of everyone on the board, each labelled, plus
their fixed colours. The whole board is coloured in one go. bart sees the inputs again (`seen`), then send and
record as before.

`shots.py verify ... --ink board-ink.png --colour board-colour.png` then checks that the ink is still in place,
that each signature garment is there in its fixed colour in every cell, that it is the same colour across
cells, and whether someone's reserved colour (Maffeo's blue) shows up in a shot they are not in. It writes a
`.review.png`: every cell beside the sheets, fixed colour beside the colour that came out.

A garment off by a small step (Delta E under 12) passes. Sliding such a garment exactly onto its fixed colour in
code (`colour.nudge`: that garment's paint only, ink and paper untouched, no model involved) is allowed only
where bart said so for the lesson; his plan asks for it, his rule against recolouring pictures stands for
everything a model does. Anything bigger, and anything wrong in the drawing, is a new run of both passes.

### 7. Review before bart sees it

Mark the board with the plan's score sheet (out of 100; 90 passes):

| | Points |
|---|---|
| Face | 20 |
| Hair and costume | 15 |
| Horse | 15 |
| Anatomy | 10 |
| Colour | 15 |
| Geography | 10 |
| Poses and cameras | 5 |
| History Lines style | 10 |

A wrong character, swapped clothing or horse, a major anatomy fault or a contradiction with the map rejects the
board whatever the total. Judge every cell; a good average does not rescue a bad cell. Fix what is plainly
wrong first. Bring bart only taste calls, with the `.review.png`.

When bart says yes: `shots.py accept ... colour board-colour.png --ink board-ink.png --by claude,chatgpt,bart
--marks marks.json`.

### 8. Keyframes

`shots.py cut <lesson> <scene> <board> board-colour.png` cuts the approved board into one keyframe per shot
(Lanczos to 1920x1080, crop boxes saved in `crops.json`). No model upscaling of keyframes: it redraws faces.

### 9. Video

- Per shot write: the keyframe, the length, what moves (a head, a gait, a cloak, the camera) and what must stay
  (faces, clothes, horse markings, buildings, direction).
- Show bart the exact keyframes, sheets and the price in credits before any clip is made.
- Every clip starts from an approved keyframe and the approved sheets, never from the last frame of the clip
  before it.
- Review each clip at the start, the middle and the end, and scrub through: faces, hair colour, horse, limbs,
  clothes, background, line crawl, flicker, direction. A good still does not approve a clip.
- Short clips first. Count accepted seconds against generated seconds (`shots.py tally` counts the stills).

## When it goes wrong

- Record every failed try with its kinds: `colour-drift:<who>`, `colour-missing:<who>`,
  `colour-inconsistent:<who>`, `ink-weight`, `ink-redrawn`, `grid`, or your own for what code cannot see
  (`identity:<who>`, `anatomy`, `geography`, `history`, `style`).
- Two failures of one kind on one board: stop. The next pack is refused until you say what is different
  (`--changed "..."`): another reference, fewer people in the cell, a different split of the board. More words
  in the prompt is not a change of approach.
- If one cell fails, the others stay approved in the ledger, but a board is one picture: the fix is a new board
  of the cells that failed, not an edit.
- If the approach is exhausted, take it to bart with the review page. Do not keep generating.

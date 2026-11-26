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
  shared signature colours, scenes without a layout, shots that claim to see what their camera cannot.
- A **style reference** is only a picture bart himself called History Lines. Line references are approved for
  their drawing only (they are coloured pictures); colour references for the whole look.
- Each named character has one ink sheet and one colour sheet, and so does each horse. Use the sheets that exist
  first; do not redesign the cast to try the method. A sheet shows front, side, three-quarter and back, a face
  close-up, and nothing else, large enough that hair, face and garment are still readable when the sheet is one
  of several attachments. It says who someone is, never how to stand.
- Every ink sheet goes through the gate before bart sees it: `shots.py sheet <file> [<file> ...]`. It measures
  ink (6 to 8% for a sheet), bare paper (at least 85%) and grey shading away from the lines (none: an ink pass has
  no wash). Given several sheets, it also compares their standing side views: two animals with the same
  proportions and largely the same outline read as one animal redrawn, whatever their coat. A sheet that fails is
  a new run, not a candidate. So a sheet opens with a standing side view, and every sheet of one kind (all the
  horses) uses the same views in the same order. One animal or person per sheet, never three on one sheet.
- bart approves a sheet in his own words. Then, and only then: `shots.py approve <lesson> <who> <ink|colour>
  <file>`. The hash is taken at that moment; a file that changes later needs him again.
- Give each character a `swatches` box per garment in `cast.json` (on flat paint of the approved colour sheet)
  and run `shots.py palette <lesson> <who>`. The fixed colours come from the approved picture, never from a
  typed-in guess.
- A generated shot never becomes a reference by itself, and a shot is never made from an earlier shot.

### 2. History check

Check every shot against real sources (animals, clothing, gear, ships, buildings, landscape) with the JEV
check, and record the file in the scene's `accuracy`. A pack is refused without it.

### 3. The scene from above

Write the scene file: landmarks with their real size and distance, who moves along which route, where the light
comes from. Then for every shot:

- `camera`: where it stands, what it looks at, the lens (`fov`, 50 degrees unless said), the framing in words;
- `who` is in it, and `where`: which figure each one is ("the rider on the left, still looking back"). Required
  as soon as two named people share a cell: a name alone does not tell the model which rider gets which face;
- `places`: where each one stands on the layout, when it matters;
- `sees`: what each landmark looks like from there, in words. Something that only appears in the clip (a rising
  haze) is a landmark with `"in_stills": false`: on the map, never drawn in a still.

The size of things is not left to adjectives. Code works out from the layout how wide each landmark is in each
shot and where it sits in the frame, writes that into the request ("about 8% of the frame wide, centred 69%
across"), and draws a **blocking guide**: one plain grey view per cell with the horizon, the landmarks and the
figures at their true size and place. A lens change can make a village look closer when nobody moved; the guide
is what stops that. `shots.py check` also refuses a shot that says it sees something its camera cannot see.

`shots.py map <lesson> <scene> <board> -o map.png` draws the layout from above for bart.

- A still shows the calm moment before the action; the action is in the clip.
- At most three named characters in one cell.
- Poses come from the action. Two riders never stand the same way, because they are never doing the same thing
  at the same moment; say what each one does.
- Give every character a `tell` in the cast list: what sets them apart at shot size, in the drawing and not only
  in colour. If two people cannot be told apart in ink, colour is carrying too much.

bart approves the layout and the shot list. Record it in the scene's `layout.approved`.

### 4. One board, or one request per shot

Shots that follow each other in one place go on one 2x2 board (four cells, 5 px white gaps): they share costume,
light and setting. A board has a price: each cell gets a quarter of the pixels, so a face that carries a shot may
not survive, and neighbours pull at each other's composition. So:

- wide and medium shots of one place: one 2x2 board;
- a close-up, or a shot framed very differently from its neighbours: its own request (a board of one cell), with
  the same references and its own blocking view;
- never 3x3 for keyframes, never one board for a whole lesson.

Set the board's `size` to what the tool really returns; `check` refuses cells under 700 px wide.

`shots.py pack <lesson> <scene> <board> ink` freezes the request in a folder:

- `attachments/`: the real files, numbered in attach order: the blocking guide first, then each character and
  horse sheet, then the style references;
- `prompt.txt`: the skill, the pass, the ink number, which image is who, who is which figure in each cell, the
  layout and the sizes;
- `inputs.png`: every attachment on one page, with its hash;
- `manifest.json`: path and sha256 of every attachment, and the expected place and size of each landmark per cell.

It refuses when anything is unapproved, changed or missing. For a tool that cannot load bart's ChatGPT skill
(a bare API call), add `--skill <file with his skill text>`: the pack then carries his text word for word. It
still adds no style wording of its own.

**Gate: bart sees `inputs.png` and `prompt.txt`.** When he says yes: `shots.py seen <pack>`.

### 5. Ink pass

Send exactly the pack: its attachments, attached to the request itself in the numbered order (never ChatGPT
project files), and its prompt, unchanged. Look at the attached thumbnails before sending. Then record it:
`shots.py sent <pack> --lesson .. --tool .. --model .. [--request-id ..]`. The site's own ChatGPT route also logs
the hash of every image it sends. Do not rely on asking the model what it received: it can describe a sheet
correctly and still draw the wrong brother. The proof is in the picture.

Then, before any colour:

1. `shots.py verify <lesson> <scene> <board> --ink board-ink.png` measures the grid, and per cell the ink share,
   the bare paper and grey shading away from the lines.
   Ink share is a rough signal (a close-up beard and a far rider differ at the same line weight); your eyes decide.
2. Look at every cell yourself against the sheets, the blocking guide and the manifest's expected sizes: is each
   person the right figure, with their `tell` visible? Hands, horses and their markings, landmark size, history.
3. Ask ChatGPT what is weird and what to add, change or remove.
4. `shots.py accept ... ink board-ink.png --by claude,chatgpt` when it is right, or
   `shots.py reject <lesson> <board> --failures <kinds>` when it is not.

### 6. Colour pass

`shots.py pack ... colour --ink board-ink.png` builds the second pack, in this order: the approved ink board as
the picture to colour; the **coloured** sheet of everyone on the board; a **colour card** cut by code from those
approved sheets (per garment: the garment as painted, and its flat midtone beside it); the colour style
reference. The prompt says which row of the card is whose garment and repeats who is which figure in each cell.
The whole board is coloured in one go. bart sees the inputs again (`seen`), then send and record as before.

Mark where each named character is in each cell in a small `regions.json`
(`{"2": {"maffeo": [x0, y0, x1, y1]}}`, fractions of the cell), then:

`shots.py verify ... --ink board-ink.png --colour board-colour.png --regions regions.json`

It checks that the ink is still in place, that each signature garment is there in its fixed colour **on its
owner**, that it is the same colour across cells, and points out someone's reserved colour (Maffeo's blue) in a
shot they are not in. A cell with two named people and no regions is reported as not scored, never as passed:
the right blue somewhere in the cell proves nothing. It writes:

- `.review.png`: each character cut out of every cell at one size in shot order, every cell beside the sheets,
  and fixed colour beside the colour that came out;
- `.overlay.png`: the pass 1 ink in red over the coloured board. Look at faces, horse markings and the skyline:
  a shifted eye does not move a whole-cell number.

The colour limit (Delta E 12), like the grey and look-alike limits, is a starting value. Tune it on boards bart accepted and rejected.

Anything wrong is a new run of both passes (bart's rule), never an edit of the coloured board.

### 7. Review before bart sees it

First, without looking at the labels: in each cell, who is who, and whose horse is whose, from what is drawn?
Then check against the sheets. This catches a swap in one cell, and also a board that shows the wrong man the
same way four times.

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

When bart says yes: `shots.py accept ... colour board-colour.png --ink board-ink.png --regions regions.json
--by claude,chatgpt,bart --marks marks.json`.

### 8. Keyframes

`shots.py cut <lesson> <scene> <board> board-colour.png` cuts the approved board into one keyframe per shot
(Lanczos to 1920x1080, crop boxes saved in `crops.json`). No model upscaling of keyframes: it redraws faces.
Lanczos adds no detail either: when a cell was enlarged more than one and a half times the command says so, and
the faces are checked at full size before the keyframe goes anywhere.

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
- If one cell fails, the other cells stay approved. Make that one shot again as its own request (a board of one
  cell, both passes) with the same references and its own blocking view. Do not repack failed cells into a new
  board: new neighbours change their scale and which image is who.
- If the approach is exhausted, take it to bart with the review page. Do not keep generating.

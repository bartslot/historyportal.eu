# Animation presets: ChatGPT directs, the fit pass corrects

Every preset in `resources/animations/clips/` comes from this pipeline. A new preset goes the same way.

1. **Reference sheet** (chatgpt MCP `generate_image`): the prompt below under "Sheet". It is a 2D side-view
   sequence of the key poses, left to right, numbered. Save it as WebP q30 in
   `~/BartsMedia/historyportal/topics/character-bones/animations/sheets/<id>.webp`. It is a visual check only;
   nothing reads it.
2. **Key poses** (chatgpt MCP `ask_chatgpt`): the prompt below under "Poses", with the sheet described back to it.
   Save its JSON verbatim as `engine-mvp/tools/anim_raw/<id>.json`.
3. **Fit** (`python3 anim_fit.py anim_raw/<id>.json --out ../../resources/animations/clips`). It clamps to what a body
   can do, mirrors knees and elbows that bend the wrong way (pose-guard.ts rules), flattens and plants feet in contact
   (no sliding, the second foot reached by IK), closes loops, and works out the root travel and bob. Read its notes:
   every "posing rule" or "clamped" line is something ChatGPT got wrong.
4. **Look** at it on Ana in the editor (Animation picker, side view). Hand-tune what still looks wrong in the RAW
   file (never in the clip), then fit again. A raw file may carry `"tuned": "<what was changed by hand>"`.
5. Add the preset's label in all five languages: `lang/{en,nl,de,fr,es}/animations.php`.

## The skeleton ChatGPT is told about

A figure seen from the side, facing right. Every angle is in degrees, clockwise on screen, relative to its parent
bone. 0 everywhere is the rest pose: standing straight, arms hanging down, feet flat.

| bone | parent | what a value does |
|---|---|---|
| chest | hips | + leans forward, - leans back (-30..45) |
| head | chest | + nods down/forward, - tips back (-35..35) |
| upperarm_n / upperarm_f | chest | - swings the arm forward and up (-90 points straight ahead, -180 straight up), + swings it back (-190..70) |
| forearm_n / forearm_f | upperarm | 0 straight, - bends the elbow (-150..0). Never positive. |
| thigh_n / thigh_f | hips | - swings the leg forward (-90 is thigh level, sitting), + swings it back (-120..45) |
| shin_n / shin_f | thigh | 0 straight, + bends the knee (0..150). Never negative. |
| foot_n / foot_f | shin | - lifts the toes, + points them down (-45..45) |

`_n` is the near side (towards the camera), `_f` the far side. The hips never turn: the body moves by its legs.

## Poses (ask_chatgpt)

```
You are a 2D character animator. Give me the key poses of a "<NAME>" animation (<WHAT IT IS, one sentence>) for a
side-view figure facing right, as JSON only, no prose.

Skeleton (degrees, clockwise on screen, relative to the parent bone; 0 = standing straight, arms hanging, feet flat):
chest (+ lean forward), head (+ nod down), upperarm_n/upperarm_f (- swing forward and up: -90 straight ahead, -180
straight up; + back), forearm_n/forearm_f (0 straight, negative bends the elbow, never positive), thigh_n/thigh_f
(- swing forward, -90 = thigh level; + back), shin_n/shin_f (0 straight, positive bends the knee, never negative),
foot_n/foot_f (- toes up). _n = near side, _f = far side.

Shape:
{"id": "<id>", "loop": <true|false>, "duration": <seconds for one cycle or the whole move>, "travel": <true if the
figure moves forward across the ground, else false>,
 "keys": [{"t": <0..1>, "contact": "<n|f|both|none: which feet are on the ground>", "lift": <body heights off the
 ground, only when contact is none>, "face": "<one of FACES>", "bones": {"<bone>": <deg>, ...}}, ...]}

Rules: <KEYS> keys; t starts at 0 and ends at 1; a loop's last key repeats its first; name only the bones that move;
think in clear key poses an animator would draw (contact, down, passing, up for walks); weight shifts and overlap
make it feel alive; knees only bend positive, elbows only negative.
FACES: neutral, smile, laugh, sad, surprised, angry, think, talk.
```

## Sheet (generate_image)

```
A clean 2D animation key-pose sheet of a simple wooden artist's mannequin seen exactly from the side, facing right,
doing "<NAME>": <N> numbered poses left to right on one line, evenly spaced, on a plain white background, thin black
outline, a ground line under the feet, no text except the pose numbers. Wide 3:1 image.
```

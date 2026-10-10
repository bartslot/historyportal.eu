# Crew stream contract (server.py <-> src/crew)

POST /crew/stream  body = the /crew body + optional `partial: {who, text}` (an interrupted member's
draft, given back to that member). Response: `application/x-ndjson`, one JSON event per line, flushed
as it happens. POST /crew (one JSON answer at the end) stays for the lesson-crew MCP.

Events (every event has `turn`, the id of this turn):
- {type:"turn"}                                      first line
- {type:"assistant", as, text}                       Sofie/Daan's reply
- {type:"routed", who, ack}                          one per member asked; ack = their one-line
                                                     "on it" bubble, in their voice, client language
- {type:"start", who}                                the member's model call began
- {type:"thinking", who, text}                       thinking-summary delta (only when the model thinks)
- {type:"text", who, text}                           delta of the member's reply as it is written
- {type:"jev", who, score, choice}                   JEV grade
- {type:"review", who, text}                         Marten's second opinion (who = the member reviewed)
- {type:"message", who, text, settings?, commands?, title?, dropped?, jev?, review?}
                                                     the member's FINAL answer (same shape as /crew)
- {type:"stopped", who}                              stopped by the client; nothing of theirs applies
- {type:"error", who?, error}
- {type:"done"}                                      last line

POST /crew/stop {turn, who?} -> {stopped:[who...]}   who omitted = the whole turn. Kills that member's
claude process; its worker emits "stopped" and no "message".
Interrupt = client stops `who`, then sends a new turn with to=who and partial={who, text: draft so far}.

## Context (what the client is doing)
Every /crew and /crew/stream body may carry `context` (built by src/crew/context.ts, untrusted, capped):
{ lesson: {title, scenes: [{id, title}], current: <scene id>, currentTitle, scriptWords},
  step?: "script"|"visual"|"animate"|string,
  selected: {name, kind, x, z, yaw} | null,
  objects: [names on the current scene's stage, max 40],
  time: <timeline seconds>,
  recent: [{ago: <seconds ago>, what: <short English sentence>}]   (last 10 client actions, newest first) }
The server shows it to the router and every member as "What the client is doing right now", and
resolves "this / dit / hier" to the selected object or current scene.

## Choices (decisions that are the client's)
Any assistant or member answer may carry `choices` instead of guessing:
  choices: { question: str, options: [{label: str, why: str, recommended?: bool}] (2-4, at most ONE
             recommended, put first), scope?: true }
- The panel shows the question with one button per option (recommended first, marked "Recommended",
  its `why` under it) plus "Something else" (focuses the box). Clicking sends the label as the client's
  next message, addressed to whoever asked.
- Restyling (look, colours, palette, style, time of day, mood) ALWAYS starts with a scope question
  unless the client already said it: options "Whole lesson" / "This scene" (`scope: true`). The chosen
  scope travels as `scope: "lesson" | "scene"` in the next request body.
- Then the look options, each with a reason drawn from the script/lesson ("Moody and dark:
  the script covers a dark period in Dante's life; darker colours carry that feeling.").
- A member's settings with scope "lesson" are applied to the current scene live AND written into
  every other scene's saved settings (one undo restores all of them).
- Events: /crew/stream `message` (and `assistant`) events may include `choices`.

## Revision after Marten (the maker fixes it)
When Marten reviews an answer (JEV < 0.8), the member gets ONE revision pass with Marten's note and must
correct the facts in their own answer. The stream then sends a second `message` for the same turn+who with
`revised: true` (text = corrected answer, new `jev`, `review` kept as the reason). The client replaces the
line (upsert by turn+who) and shows "Revised after Marten's note". Never more than one revision.

## Scene sketches (Script step)
A member writing or changing a scene (mostly the writer) may return `sketch: str` (one sentence: who, where,
when, what happens, composition; English, for the image model). The server renders it on the render PC
(ComfyUI, FLUX.2 klein 4B, the house history-line ink prompt, 512x288, a few seconds) and streams
{type:"image", who, url, caption} where url is served by server.py under /sketches/<file>.webp (proxied by
Vite). The client shows it as a small thumbnail under that member's line (click: larger). A failed render
never fails the turn (an `error` event with who, or nothing). Sketch images are saved with the line (url).

## Script on the page, not in the chat
The writer returns a scene as data: `scene: {lines: [{speaker: str|null, text: str}]}` (speaker null =
narrator; 2-40 lines; text <= 400 each). The client writes it into lesson.script (the TipTap doc) for the
CURRENT scene (context.lesson.current), replacing that scene's lines (new line ids; the sceneHeading stays);
one Undo restores the previous script. The chat reply is one short sentence ("De openingsscène staat in
het script."). Chat replies are capped at 60 words.

## Selection actions (script page)
Selecting text in the script shows a small menu: Rewrite (Shorter / Simpler for my class / More lively /
in a character's voice), Check history, Ask the crew. The request body gets
`selection: {action: "rewrite"|"check"|"ask", how?: str, text: str, lineIds: [str], sceneId: str}`.
- rewrite -> writer returns `lines: [{id, speaker, text}]` replacing exactly those lineIds (shown in the chat
  as a small before/after card with Replace / Keep; Replace writes it into lesson.script, undoable).
- check -> historian answers about the selected claims (JEV-graded as usual), no script change.
- ask -> the client's own question about the selection goes to the assistant as usual, with the selection.

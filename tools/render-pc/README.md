# Render PC worker

Clips made on the render PC reach their scene with nobody downloading or uploading them.

```
server (prod)                               render PC
─────────────                               ─────────
clip queued for driver render_pc
        ◄──── POST /api/render-pc/next ──── worker asks for work (every 30 s when idle)
clip → generating, claim id
        ◄──── GET  .../clips/{id}/input/n ── world shot (image 1) + character sheets
                                            ComfyUI queue → MiniMax H3 → 720p H.264
        ◄──── POST .../clips/{id}/finish ─── the clip, or the reason it failed
clip → ready (teacher approves)
all clips of a scene approved → joined, converted to 12 fps AV1 + H.264, put on the scene
```

The PC only makes outgoing HTTPS requests. If it is off, clips wait; a clip it took and never returned goes
back in the queue after 90 minutes.

## Set up, once

**Server** (`.env`, then `php artisan config:cache`):

```
RENDER_PC_TOKEN=<a long random string>
STORY_VIDEO_CLIP_DRIVER=render_pc      # or leave elevenlabs and hand clips over per lesson
```

**Render PC**: copy this folder to the PC, put the workflow beside it as `workflow.api.json`, then

```
sudo ./install.sh      # first run creates /etc/historyportal/render-worker.env: fill in the token
sudo ./install.sh      # second run starts the service and prints a self-check
```

## The workflow file

Export the MiniMax H3 workflow from ComfyUI with **Save (API format)** and replace the values that change per
clip with placeholders:

| Placeholder | Becomes |
|---|---|
| `{{PROMPT}}` | the clip's prompt |
| `{{SECONDS}}`, `{{FRAMES}}`, `{{FPS}}` | the clip's length (frames = seconds × `RENDER_FPS` + 1) |
| `{{SEED}}` | a new random seed |
| `{{IMAGE_1}}` | the empty world shot (already uploaded to ComfyUI's input folder) |
| `{{IMAGE_2}}` … `{{IMAGE_9}}` | the character sheets; a clip with fewer people repeats its last picture |
| `{{NAME}}` | a file name prefix, `hp-<clip key>` |

A value that is only a placeholder keeps its type (`"{{FRAMES}}"` becomes the number `325`). The workflow must
end in a node that saves a video file.

## Films made by hand

- Drop `scene-14.mp4` or `lesson-129-scene-14.mp4` in `HP_WATCH_DIR`: it goes to scene 14 and moves to `sent/`.
- Or send one file: `render_worker.py attach film.mp4 --scene 14` (works from any machine with the token).
- On the server itself: `php artisan media:attach film.mp4 --scene=14`.

## On the server

- `php artisan story-video:render-pc` shows clips waiting, clips rendering and when the PC last asked for work.
- `php artisan story-video:render-pc --hand-over=elevenlabs --lesson=129` gives a lesson's waiting clips to
  ElevenLabs instead (this spends credits).

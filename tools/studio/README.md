# ElevenLabs studio hand-off

Character sheets, world shots and clips made in the ElevenLabs web studio reach their scene with nobody uploading
them. The account is on the Creator plan, where the image and video API is refused, so the studio is driven by
Claude in bart's own Chrome. bart chose this on 2026-11-23 knowing it breaks section 12 of ElevenLabs' Prohibited
Use Policy and puts the account at risk.

**Ground rules.** The work happens in the open, in bart's normal signed-in Chrome. There is no stealth browser, no
fingerprint or user-agent changes, no captcha solving and no proxy. One job runs at a time, using the studio's own
upload and Download buttons. bart OKs each batch before any credits are spent. At the first captcha, "are you
human" check, rate-limit message or warning, the run stops and bart decides what happens next.

```
server (prod)                                bart's Mac                         ElevenLabs studio (Chrome)
item queued for driver studio,
prompt written (PrepareStudioItem)
        ◄── POST /api/studio/next ────────── studio.py pull
batch claimed (one claim id)                 job folders: prompt.txt,
        ◄── GET .../items/{id}/input/n ───── 01-…png references, batch.json
                                                                                 Claude: model, 16:9, length,
                                                                                 attach refs, prompt, Generate,
                                                                                 Download
                                             studio.py take N  (~/Downloads → job folder)
        ◄── POST .../items/{id}/finish ───── studio.py push
item → ready; teacher approves as usual
```

The studio page cannot reach historyportal.eu, because its content security policy blocks both requests and
images (tested 2026-11-23). That is why files go through the Mac.

## Set up, once

**Server** (`.env`, then `php artisan config:cache`):

```
STUDIO_TOKEN=<a long random string>
STORY_VIDEO_CLIP_DRIVER=studio      # clips from the studio
STUDIO_VIDEO_MODEL="MiniMax H3"     # the name as the studio's model picker shows it
```

Clips only. Character sheets and world shots always come from ChatGPT (bart, 2026-11-23: the Recraft 4.1 test in
the studio was not History Lines, and Recraft takes no reference plates). A leftover
`STORY_VIDEO_PICTURE_DRIVER=studio` is read as `chatgpt`.

**Mac**: create `tools/studio/studio.env` (git-ignored) containing `STUDIO_TOKEN=<the same string>`.

## A batch

```
python3 tools/studio/studio.py status
python3 tools/studio/studio.py pull --max 5     # prints the jobs; nothing spent yet
python3 tools/studio/studio.py show 1           # settings, references in order, prompt
#   ... Claude makes job 1 in the studio and presses Download ...
python3 tools/studio/studio.py take 1
python3 tools/studio/studio.py push             # results wait in the editor as Ready to check
python3 tools/studio/studio.py release          # stopped early: the rest waits on the server again
```

A batch that is claimed and never pushed goes back in the queue after 12 hours (`STUDIO_STALE_MINUTES`).

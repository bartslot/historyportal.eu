# Sound bank: where the beds and sfx are served

The 3D (stage25d) scenes carry a sound plan (`config.stage25d.sound`: ambience beds, sfx, ducking). The lesson
player plays it with the engine's own player (`engine-mvp/src/sound/player.ts`, wired in
`resources/js/scene/stage25d/sound.js`), which fetches every file from **`/sound/bank/`** (`base_url` in
`engine-mvp/src/sound/bank.json`), so `public/sound/bank/{beds,sfx}/*.m4a`.

The audio is media, not code: it lives in `~/BartsMedia/historyportal/sound/{beds,sfx}` and `public/sound/bank` is
git-ignored. (`public/sound/sfx/` is a different, tracked folder: the UI sounds.)

## Locally

```bash
php artisan sound:sync          # links public/sound/bank -> ~/BartsMedia/historyportal/sound
php artisan sound:sync --copy   # copies beds/ and sfx/ instead (a folder that must not follow BartsMedia)
```

Run it once per checkout or worktree. It warns about any file `bank.json` names that the folder lacks.

## Production (SiteGround)

`scripts/deploy-prod.sh` excludes `public/sound/bank/`, so a deploy never ships or deletes it. Upload it on its own
whenever the bank gains files (new bundle, new sfx):

```bash
ssh -o BatchMode=yes historyportal 'mkdir -p www/historyportal.eu/app/public/sound/bank'
rsync -az -e ssh ~/BartsMedia/historyportal/sound/beds ~/BartsMedia/historyportal/sound/sfx \
  historyportal:www/historyportal.eu/app/public/sound/bank/
```

No `--delete`: an id a live lesson still names keeps its file. Use the relative remote path (`historyportal:www/...`),
never `~/www` (see the SSH notes). Check one file afterwards:
`curl -sI https://historyportal.eu/sound/bank/beds/heath-wind.m4a` should answer 200 with `audio/mp4`.

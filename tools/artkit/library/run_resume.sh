#!/usr/bin/env bash
# Finish the two library bundles once the ChatGPT quota is back (it ran out 2026-10-27 12:46, reset 17:09).
# Idempotent: gen.py skips files that exist. Order = most value first: golden-age has no colour yet.
# Run from tools/artkit/library:  bash run_resume.sh
set -euo pipefail
cd "$(dirname "$0")"
W=~/BartsMedia/historyportal/library/_work

# 1. golden-age near layers: archive the dense inks, re-ink with the light line (it ranked 1st+2nd)
for d in $W/nl-golden-age/{mid,fg,prop}-*; do
  [ -d "$d" ] && [ ! -f "$d/colour_a.png" ] && mkdir -p $W/nl-golden-age/_dense && mv "$d" $W/nl-golden-age/_dense/
done
python3 gen.py jobs/nl-golden-age.json --stage ink -j 3
python3 gen.py jobs/nl-golden-age.json --stage colour --variants 2 -j 3

# 2. prehistory sheets still on dense ink or never coloured (props, animals, ground strip, meadow)
for s in mid-farm mid-field fg-trees2 fg-shrubs fg-reeds-rocks fg-fences prop-animals prop-tools fg-ground mid-meadow; do
  [ -d $W/nl-prehistory/$s ] && mkdir -p $W/nl-prehistory/_dense && rm -rf $W/nl-prehistory/_dense/$s && mv $W/nl-prehistory/$s $W/nl-prehistory/_dense/
done
python3 gen.py jobs/nl-prehistory.json --stage ink -j 3
python3 gen.py jobs/nl-prehistory.json --stage colour --variants 2 -j 3

# 3. style gate (codex, neutral side-by-side vs caesar_r2), cut, gates, library.json + contact sheets + plate
for b in nl-golden-age nl-prehistory; do
  python3 qa.py rank-bundle jobs/$b.json
  python3 cut.py jobs/$b.json
  python3 build.py jobs/$b.json
done
python3 test_library_schema.py

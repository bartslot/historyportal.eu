#!/bin/sh
# Cut every character's parts sheets (BartsMedia puppet-parts/[v2/]<id>_<view>_parts.png) into public/figures/puppets/<id>/<view>/.
set -e
cd "$(dirname "$0")/../.."
SRC="${PARTS_DIR:-$HOME/BartsMedia/historyportal/topics/autonomous-lessons/puppet-parts}"
for c in boer-vrouw:woman boer-man:man voc-matroos:voc voc-kapitein:voc; do
  id=${c%%:*}; kind=${c##*:}
  for v in 34 side front; do
    rm -rf "public/figures/puppets/$id/$v"
    # the newest art round that has this sheet: v3 figure ink, v2 sparse ink, v1 text-only
    sheet="$SRC/${id}_${v}_parts.png"
    for r in v2 v3; do [ -f "$SRC/$r/${id}_${v}_parts.png" ] && sheet="$SRC/$r/${id}_${v}_parts.png"; done
    python3 src/figures/cut_parts.py "$sheet" "public/figures/puppets/$id/$v" --kind "$kind" --view "$v" >/dev/null
  done
done
echo cut: $(ls -d public/figures/puppets/*/* | wc -l) sheets

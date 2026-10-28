#!/bin/sh
# Cut every character's parts sheets (BartsMedia puppet-parts/<id>_<view>_parts.png) into public/figures/puppets/<id>/<view>/.
set -e
cd "$(dirname "$0")/../.."
SRC="${PARTS_DIR:-$HOME/BartsMedia/historyportal/topics/autonomous-lessons/puppet-parts}"
for c in boer-vrouw:woman boer-man:man voc-matroos:voc voc-kapitein:voc; do
  id=${c%%:*}; kind=${c##*:}
  for v in 34 side front; do
    rm -rf "public/figures/puppets/$id/$v"
    python3 src/figures/cut_parts.py "$SRC/${id}_${v}_parts.png" "public/figures/puppets/$id/$v" --kind "$kind" --view "$v" >/dev/null
  done
done
echo cut: $(ls -d public/figures/puppets/*/* | wc -l) sheets

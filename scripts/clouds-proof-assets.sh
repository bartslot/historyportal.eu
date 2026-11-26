#!/usr/bin/env bash
# Fills public/_proof-assets (git-ignored) for the volumetric cloud proof page:
#   npx vite --config vite.clouds-proof.config.js  →  http://localhost:5197/volumetric.html
# Takram's precomputed atmosphere + cloud textures come from node_modules; the blue-noise texture
# and the Blue Marble picture are downloaded (NASA Blue Marble, public domain, via npm three-globe).
set -euo pipefail
cd "$(dirname "$0")/.."
out=public/_proof-assets
mkdir -p "$out/atmosphere" "$out/clouds" "$out/core"
cp node_modules/@takram/three-atmosphere/assets/*.bin "$out/atmosphere/"
cp node_modules/@takram/three-clouds/assets/* "$out/clouds/"
ref=9627216cc50057994c98a2118f3c4a23765d43b9
curl -fsSL -o "$out/core/stbn.bin" "https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/$ref/packages/core/assets/stbn.bin"
tmp=$(mktemp -d)
(cd "$tmp" && npm pack three-globe@2.45.6 --silent >/dev/null && tar xzf three-globe-*.tgz package/example/img/earth-blue-marble.jpg)
cp "$tmp/package/example/img/earth-blue-marble.jpg" "$out/"
rm -rf "$tmp"
echo "proof assets ready in $out"

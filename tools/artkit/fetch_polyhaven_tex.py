"""Download Poly Haven (CC0) textures (2k: colour, normal, roughness) into lesson_assets/_polyhaven_tex/<id>/,
with the real-world size from the API so Blender can map them at true scale.
usage: python3 fetch_polyhaven_tex.py id [id ...]"""
import json, os, sys, urllib.request

DEST = "/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets/_polyhaven_tex"
UA = {"User-Agent": "historyportal-artkit/1.0 (bartslot@gmail.com)"}
MAPS = {"diff": "Diffuse", "nor": "nor_gl", "rough": "Rough"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120)


for tid in sys.argv[1:]:
    d = os.path.join(DEST, tid)
    if os.path.exists(os.path.join(d, "credit.json")):
        print("have", tid); continue
    files = json.load(get("https://api.polyhaven.com/files/%s" % tid))
    os.makedirs(d, exist_ok=True)
    got = {}
    for short, key in MAPS.items():
        entry = files.get(key, {}).get("2k", {}).get("jpg")
        if entry:
            open(os.path.join(d, short + ".jpg"), "wb").write(get(entry["url"]).read()); got[short] = short + ".jpg"
    info = json.load(get("https://api.polyhaven.com/info/%s" % tid))
    dims = info.get("dimensions") or [2000, 2000]       # millimetres covered by one tile
    json.dump({"id": tid, "name": info.get("name"), "license": "CC0", "authors": info.get("authors"),
               "source": "https://polyhaven.com/a/%s" % tid, "maps": got, "tile_m": [dims[0] / 1000, dims[1] / 1000]},
              open(os.path.join(d, "credit.json"), "w"), indent=1)
    print("ok", tid, got.keys(), dims)

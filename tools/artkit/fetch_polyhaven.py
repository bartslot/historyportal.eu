"""Download Poly Haven (CC0) models as glTF 1k into lesson_assets/_polyhaven/<id>/, with a credit file.
usage: python3 fetch_polyhaven.py id [id ...]"""
import json, os, sys, urllib.request

DEST = "/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets/_polyhaven"
UA = {"User-Agent": "historyportal-artkit/1.0 (bartslot@gmail.com)"}   # the API 403s Python's default agent


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120)


for aid in sys.argv[1:]:
    d = os.path.join(DEST, aid)
    if os.path.exists(os.path.join(d, "credit.json")):
        print("have", aid); continue
    files = json.load(get("https://api.polyhaven.com/files/%s" % aid))
    g = files["gltf"]["1k"]["gltf"]
    os.makedirs(d, exist_ok=True)
    for url, rel in [(g["url"], os.path.basename(g["url"]))] + [(v["url"], k) for k, v in g.get("include", {}).items()]:
        p = os.path.join(d, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "wb").write(get(url).read())
    info = json.load(get("https://api.polyhaven.com/info/%s" % aid))
    json.dump({"id": aid, "name": info.get("name"), "license": "CC0", "authors": info.get("authors"),
               "source": "https://polyhaven.com/a/%s" % aid, "gltf": os.path.basename(g["url"])},
              open(os.path.join(d, "credit.json"), "w"), indent=1)
    print("ok", aid)

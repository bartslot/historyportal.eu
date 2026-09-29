"""Download free Sketchfab models (glTF) into lesson_assets/_sketchfab/<uid>/, with a credit file.
Refuses licences we can't sell with (NC, ND) and anything tagged NoAI.
usage: python3 fetch_sketchfab.py uid [uid ...]
key: SKETCHFAB_API_KEY in the main .env (never printed)."""
import io, json, os, re, sys, urllib.request, zipfile

MAIN = "/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu"
DEST = os.path.join(MAIN, "lesson_assets/_sketchfab")
OK_LICENCES = {"cc0", "by", "by-sa"}
NOAI_TAGS = {"noai", "no-ai", "noaiart", "no-ai-training"}


def key():
    for line in open(os.path.join(MAIN, ".env")):
        m = re.match(r"\s*SKETCHFAB_API_KEY\s*=\s*\"?([^\"\s]+)", line)
        if m:
            return m.group(1)
    sys.exit("SKETCHFAB_API_KEY missing in main .env")


def api(path, token=None):
    headers = {"Authorization": "Token " + token} if token else {}
    return json.load(urllib.request.urlopen(urllib.request.Request(
        "https://api.sketchfab.com/v3" + path, headers=headers), timeout=60))


def fetch(uid, token):
    d = os.path.join(DEST, uid)
    if os.path.exists(os.path.join(d, "credit.json")):
        return "have"
    info = api("/models/" + uid)
    lic = (info.get("license") or {}).get("slug", "")
    tags = {t["name"].lower() for t in info.get("tags", [])}
    if lic not in OK_LICENCES:
        return "skip licence " + lic
    if tags & NOAI_TAGS:
        return "skip NoAI"
    url = api("/models/%s/download" % uid, token)["gltf"]["url"]   # signed, expires in minutes
    zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(url, timeout=600).read())).extractall(d)
    gltf = next((os.path.relpath(os.path.join(r, f), d) for r, _, fs in os.walk(d)
                 for f in fs if f.endswith((".gltf", ".glb"))), None)
    json.dump({"id": uid, "name": info["name"], "license": info["license"]["label"],
               "authors": {info["user"]["displayName"]: info["user"]["profileUrl"]},
               "source": info["viewerUrl"], "gltf": gltf}, open(os.path.join(d, "credit.json"), "w"), indent=1)
    return "ok %s (%s)" % (info["name"], lic)


if __name__ == "__main__":
    token = key()
    for uid in sys.argv[1:]:
        try:
            print(uid, fetch(uid, token))
        except Exception as e:   # keep going; one bad model shouldn't stop the batch
            print(uid, "FAILED", type(e).__name__, str(e)[:120])

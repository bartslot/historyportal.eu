"""Minimal JEV (TypeSafe System One) client. Key: JEV_AI in the main checkout's .env (never printed)."""
import json, os, time, urllib.error, urllib.request

ENV = "/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/.env"
URL = "https://api.typesafe.ai/v1/systemone"


def _key():
    for line in open(ENV):
        if line.startswith("JEV_AI="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("JEV_AI missing from .env")


def ask(state, questions, model="jev-latest", retries=4):
    body = json.dumps({"model": model, "state": state, "questions": questions}).encode()
    for attempt in range(retries):
        req = urllib.request.Request(URL, data=body, headers={
            "Authorization": "Bearer " + _key(), "Content-Type": "application/json", "User-Agent": "historyportal-artkit/1.0"})
        try:
            return json.load(urllib.request.urlopen(req, timeout=90))
        except urllib.error.HTTPError as e:
            if e.code in (429, 529) and attempt < retries - 1:
                time.sleep(2 ** attempt * 2)     # documented: back off, don't hammer
                continue
            raise SystemExit("JEV HTTP %d: %s" % (e.code, e.read()[:300]))


def bar():
    here = os.path.dirname(os.path.abspath(__file__))
    return open(os.path.join(here, "bart_bar.md")).read()

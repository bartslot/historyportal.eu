"""How often does JEV predict Bart's verdict? Leave-one-out: for each labelled verdict, the state holds
Bart's house bar plus all OTHER verdicts as precedents; the case itself is never shown.
Baseline: the same cases with no bar and no precedents.
usage: python3 eval_verdicts.py"""
import json, os
from jev import ask, bar

here = os.path.dirname(os.path.abspath(__file__))
V = json.load(open(os.path.join(here, "verdicts.json")))
CRIT = {"approve": "Bart would accept this as it is", "reject": "Bart would reject it or send it back"}


def question(case):
    return {"type": "choice", "criteria": CRIT,
            "instructions": "Judge this piece of History Portal work the way Bart would. Case: " + case}


def score(preds):
    tp = sum(1 for v, p in preds if v == "approve" and p == "approve")
    tn = sum(1 for v, p in preds if v == "reject" and p == "reject")
    na, nr = sum(1 for v, _ in preds if v == "approve"), sum(1 for v, _ in preds if v == "reject")
    return {"accuracy": round((tp + tn) / len(preds), 3), "approvals_recognised": "%d/%d" % (tp, na),
            "rejections_recognised": "%d/%d" % (tn, nr), "balanced_accuracy": round((tp / na + tn / nr) / 2, 3)}


# baseline: no bar, no precedents, all cases in one request
base = ask({"product": "History Portal, history lessons for school pupils"},
           {v["id"]: question(v["case"]) for v in V})
bpreds = [(v["verdict"], base["answers"][v["id"]]["choice"]) for v in V]

# with Bart's bar + leave-one-out precedents
preds, misses, tokens = [], [], base["usage"]["input_tokens"]
for v in V:
    precedents = [{"case": o["case"], "bart": o["verdict"]} for o in V if o["id"] != v["id"]]
    r = ask({"house_bar": bar(), "bart_precedents": precedents}, {"q": question(v["case"])})
    a = r["answers"]["q"]; tokens += r["usage"]["input_tokens"]
    preds.append((v["verdict"], a["choice"]))
    if a["choice"] != v["verdict"]:
        misses.append((v["id"], v["verdict"], a["choice"], a["confidence"]))
out = {"baseline": score(bpreds), "with_bar_and_precedents": score(preds), "misses": misses,
       "baseline_misses": [v["id"] for v, (lab, p) in zip(V, bpreds) if lab != p],
       "input_tokens": tokens, "cost_usd": round(tokens * 0.042 / 1e6, 5)}
print(json.dumps(out, indent=1))
json.dump(out, open(os.path.join(here, "eval_last.json"), "w"), indent=1)

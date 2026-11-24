#!/usr/bin/env python3
"""
ElevenLabs studio hand-off for History Portal's story-to-video pipeline. Runs on bart's Mac.

Items queued for the `studio` driver (character sheets, world shots, clips) wait on the server. This script pulls
a small batch into folders on the Mac, files the studio's downloads into them, and sends the results back, where
they wait in the editor like any other result. The studio part itself is done by Claude in bart's own Chrome, in
the open: one job at a time, the studio's normal upload and Download buttons, and a stop at the first captcha or
warning. Nothing here talks to ElevenLabs.

    studio.py status                    what waits on the server
    studio.py pull [--max 10]           claim a batch and write its job folders; prints the batch for bart's OK
    studio.py show [JOB]                the batch's jobs (or one job's settings and prompt)
    studio.py take JOB [--file PATH]    file the newest download (or PATH) as the job's result
    studio.py fail JOB "why"            mark a job as failed (sent with the next push)
    studio.py push                      send finished and failed jobs back
    studio.py release                   hand everything still unmade in the batch back to the server

JOB is the job's number in the batch (1, 2, ...). Commands work on the newest batch unless --batch DIR is given.
Settings: HP_SERVER (default https://historyportal.eu), STUDIO_TOKEN, STUDIO_DIR
(default ~/BartsMedia/historyportal/studio), STUDIO_DOWNLOADS (default ~/Downloads). Python standard library only.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path


def env_file() -> None:
    """Read STUDIO_TOKEN and friends from a studio.env beside this script, if there is one (never committed)."""
    path = Path(__file__).with_name("studio.env")
    if path.is_file():
        for line in path.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"'))


env_file()
SERVER = os.environ.get("HP_SERVER", "https://historyportal.eu").rstrip("/")
TOKEN = os.environ.get("STUDIO_TOKEN", "")
ROOT = Path(os.environ.get("STUDIO_DIR", Path.home() / "BartsMedia" / "historyportal" / "studio")).expanduser()
DOWNLOADS = Path(os.environ.get("STUDIO_DOWNLOADS", Path.home() / "Downloads")).expanduser()
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")
VIDEO_EXT = (".mp4", ".mov")


def die(msg: str) -> None:
    print(msg, file=sys.stderr)
    sys.exit(1)


# ── HTTP ──────────────────────────────────────────────────────────────────────

def call(path: str, *, method: str = "GET", data: bytes | None = None, headers: dict | None = None, timeout: int = 300):
    if not TOKEN:
        die("STUDIO_TOKEN is not set (put it in tools/studio/studio.env or the environment).")
    url = path if path.startswith("http") else f"{SERVER}/api/studio{path}"
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json",
                                          # SiteGround refuses urllib's default agent with 403.
                                          "User-Agent": "HistoryPortal-studio/1.0", **(headers or {})})
    return urllib.request.urlopen(req, timeout=timeout)


def call_json(path: str, payload: dict | None = None, method: str = "POST") -> tuple[int, dict]:
    data = json.dumps(payload or {}).encode() if method != "GET" else None
    try:
        with call(path, method=method, data=data, headers={"Content-Type": "application/json"}) as res:
            body = res.read()
            return res.status, (json.loads(body) if body else {})
    except urllib.error.HTTPError as e:
        return e.code, {"message": e.read().decode(errors="replace")[:300]}


def multipart(fields: dict[str, str], files: dict[str, Path]) -> tuple[bytes, str]:
    boundary = uuid.uuid4().hex
    out = bytearray()
    for name, value in fields.items():
        out += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
    for name, path in files.items():
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        out += (f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{path.name}"\r\n'
                f"Content-Type: {mime}\r\n\r\n").encode()
        out += path.read_bytes() + b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


# ── Batches on disk ───────────────────────────────────────────────────────────

def latest_batch(given: str | None) -> Path:
    if given:
        path = Path(given).expanduser()
        return path if path.is_absolute() else ROOT / given
    batches = sorted(p for p in ROOT.glob("batch-*") if (p / "batch.json").is_file())
    if not batches:
        die(f"No batch in {ROOT}. Pull one first: studio.py pull")
    return batches[-1]


def load(batch: Path) -> dict:
    return json.loads((batch / "batch.json").read_text())


def save(batch: Path, data: dict) -> None:
    (batch / "batch.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))


def job(data: dict, number: str) -> dict:
    try:
        return data["jobs"][int(number) - 1]
    except (ValueError, IndexError):
        die(f"No job {number} in this batch (1 to {len(data['jobs'])}).")
    raise AssertionError


def describe(j: dict) -> str:
    s = j["settings"]
    length = f", {s['seconds']} s" if s.get("seconds") else ""
    return f"{j['number']:>2}. {j['kind']:<15} {j['label'][:34]:<34} {s['model']}, {s['aspect_ratio']}, {s['resolution']}{length}, {len(j['references'])} refs  [{j['state']}]"


# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_status(_args) -> None:
    code, body = call_json("/status", method="GET")
    if code != 200:
        die(f"Server answered {code}: {body.get('message', '')}")
    print(f"Clips waiting: {body['waiting']}. In a batch: {body['in_batch']}.")


def cmd_pull(args) -> None:
    code, body = call_json("/next", {"max": args.max})
    if code == 204:
        print("Nothing waits for the studio.")
        return
    if code != 200:
        die(f"Server answered {code}: {body.get('message', '')}")
    batch = ROOT / time.strftime("batch-%Y%m%d-%H%M%S")
    batch.mkdir(parents=True)
    jobs = []
    for n, item in enumerate(body["items"], start=1):
        folder = batch / f"{n:02d}-{item['kind'].replace('_', '-')}-{item['key']}"[:80]
        jobs.append({"number": n, "id": item["id"], "kind": item["kind"], "label": item["label"] or item["key"],
                     "lesson": item["lesson"], "lesson_id": item["lesson_id"], "scene_id": item["scene_id"],
                     "folder": folder.name, "settings": item["settings"], "references": [r["name"] for r in item["references"]],
                     "text": item["text"], "state": "to make", "result": None, "error": None})
    # The claim is on disk before anything else can fail, so show/release always find this batch.
    data = {"claim": body["claim"], "pulled_at": time.time(), "server": SERVER, "jobs": jobs}
    save(batch, data)
    try:
        for j, item in zip(jobs, body["items"]):
            folder = batch / j["folder"]
            folder.mkdir(exist_ok=True)
            (folder / "prompt.txt").write_text(item["prompt"])
            for ref in item["references"]:
                with call(f"{ref['url']}?claim={body['claim']}") as res:
                    (folder / ref["name"]).write_bytes(res.read())
    except (OSError, urllib.error.URLError) as e:
        # Half a batch is no use in the studio: hand it all back so it can be pulled again at once.
        code, answer = call_json("/release", {"claim": data["claim"]})
        for j in jobs:
            j["state"] = "released"
        save(batch, data)
        die(f"Downloading the references failed ({e}); the batch was handed back"
            f" ({answer.get('released', '?') if code == 200 else 'release failed: ' + str(code)}). Pull again.")
    print(f"Batch {batch}")
    for j in jobs:
        print(describe(j))
    print("\nNothing has been spent. Each job's exact credit cost shows in the studio before Generate.")


def cmd_show(args) -> None:
    batch = latest_batch(args.batch)
    data = load(batch)
    if args.job:
        j = job(data, args.job)
        print(describe(j))
        print(f"Folder: {batch / j['folder']}")
        print(f"References (attach in this order): {', '.join(j['references']) or 'none'}")
        if j["text"]:
            print(f"Narration: {j['text']}")
        print("\nPrompt:\n" + (batch / j["folder"] / "prompt.txt").read_text())
        return
    print(f"Batch {batch}")
    for j in data["jobs"]:
        print(describe(j))


def cmd_take(args) -> None:
    batch = latest_batch(args.batch)
    data = load(batch)
    j = job(data, args.job)
    exts = VIDEO_EXT if j["kind"] == "clip" else IMAGE_EXT
    if args.file:
        src = Path(args.file).expanduser()
    else:
        # The newest finished download of the right type since the batch was pulled (Chrome's .crdownload is skipped).
        since = data["pulled_at"]
        taken = {x["result"] for x in data["jobs"] if x.get("result")}
        found = sorted((p for p in DOWNLOADS.iterdir() if p.is_file() and p.suffix.lower() in exts
                        and p.stat().st_mtime >= since and p.name not in taken), key=lambda p: p.stat().st_mtime)
        if not found:
            die(f"No new {'/'.join(exts)} file in {DOWNLOADS} since the batch was pulled.")
        src = found[-1]
    if not src.is_file() or src.suffix.lower() not in exts:
        die(f"{src} is not a {'/'.join(exts)} file.")
    dest = batch / j["folder"] / f"result{src.suffix.lower()}"
    shutil.move(str(src), dest)
    j.update({"state": "made", "result": dest.name, "error": None, "source": src.name})
    save(batch, data)
    print(f"Job {j['number']}: {src.name} -> {dest}")


def cmd_fail(args) -> None:
    batch = latest_batch(args.batch)
    data = load(batch)
    j = job(data, args.job)
    j.update({"state": "failed", "error": args.why[:500]})
    save(batch, data)
    print(f"Job {j['number']} marked failed; it is sent with the next push.")


def cmd_push(args) -> None:
    batch = latest_batch(args.batch)
    data = load(batch)
    sent = 0
    for j in data["jobs"]:
        if j["state"] not in ("made", "failed"):
            continue
        if j["state"] == "made":
            body, ctype = multipart({"claim": data["claim"]}, {"file": batch / j["folder"] / j["result"]})
        else:
            body, ctype = multipart({"claim": data["claim"], "error": j["error"] or "not made"}, {})
        try:
            with call(f"/items/{j['id']}/finish", method="POST", data=body, headers={"Content-Type": ctype}) as res:
                answer = json.loads(res.read() or b"{}")
            j["state"] = "sent" if j["state"] == "made" else "sent as failed"
            sent += 1
            print(f"Job {j['number']}: {answer.get('status', 'sent')}")
        except urllib.error.HTTPError as e:
            # 409: redone or handed out again on the server; the file stays here and is not used there.
            j["state"] = "refused" if e.code == 409 else j["state"]
            print(f"Job {j['number']}: server answered {e.code} {e.read().decode(errors='replace')[:200]}")
        save(batch, data)
    print(f"Sent {sent}. They wait in the editor as Ready to check.")


def cmd_release(args) -> None:
    batch = latest_batch(args.batch)
    data = load(batch)
    code, body = call_json("/release", {"claim": data["claim"]})
    if code != 200:
        die(f"Server answered {code}: {body.get('message', '')}")
    for j in data["jobs"]:
        if j["state"] in ("to make", "made", "failed"):
            j["state"] = "released"
    save(batch, data)
    print(f"{body['released']} items wait on the server again.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--batch", help="batch folder (default: the newest)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("status").set_defaults(fn=cmd_status)
    s = sub.add_parser("pull"); s.add_argument("--max", type=int, default=10); s.set_defaults(fn=cmd_pull)
    s = sub.add_parser("show"); s.add_argument("job", nargs="?"); s.set_defaults(fn=cmd_show)
    s = sub.add_parser("take"); s.add_argument("job"); s.add_argument("--file"); s.set_defaults(fn=cmd_take)
    s = sub.add_parser("fail"); s.add_argument("job"); s.add_argument("why"); s.set_defaults(fn=cmd_fail)
    sub.add_parser("push").set_defaults(fn=cmd_push)
    sub.add_parser("release").set_defaults(fn=cmd_release)
    args = p.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()

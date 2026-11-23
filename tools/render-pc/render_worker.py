#!/usr/bin/env python3
"""
Render PC worker for History Portal's story-to-video pipeline.

Runs ON the render PC, as a service. It only makes outgoing requests, so nothing has to reach into the PC:

  1. asks the server for the next clip to render          POST {server}/api/render-pc/next
  2. downloads its pictures (empty world shot + sheets)   GET  .../clips/{id}/input/{n}
  3. puts the job in ComfyUI's own queue and waits        POST {comfy}/prompt, GET {comfy}/history/{id}
  4. brings the clip to 720p H.264 and sends it back      POST .../clips/{id}/finish

The server joins the approved clips of a scene, converts the film to the class files (12 fps AV1 + H.264) and
puts it on the scene. Nobody downloads or uploads anything by hand.

It also watches a folder for films made by hand: a file named lesson-129-scene-14.mp4 (or scene-14.mp4) is sent
to scene 14 and moved to "sent/". One file by hand:  render_worker.py attach film.mp4 --scene 14

Only the Python standard library is used. Settings come from the environment (see render-worker.env.example).
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

SERVER = os.environ.get("HP_SERVER", "https://historyportal.eu").rstrip("/")
TOKEN = os.environ.get("RENDER_PC_TOKEN", "")
COMFY = os.environ.get("COMFY_URL", "http://127.0.0.1:8188").rstrip("/")
WORKFLOW = Path(os.environ.get("COMFY_WORKFLOW", Path(__file__).with_name("workflow.api.json")))
WATCH = Path(os.environ.get("HP_WATCH_DIR", Path.home() / "historyportal-films"))
FPS = int(os.environ.get("RENDER_FPS", "24"))
IDLE_SECONDS = int(os.environ.get("HP_IDLE_SECONDS", "30"))
RENDER_TIMEOUT = int(os.environ.get("RENDER_TIMEOUT_SECONDS", str(80 * 60)))
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
DELIVERY_TRIES = int(os.environ.get("HP_DELIVERY_TRIES", "20"))
DELIVERY_WAIT = int(os.environ.get("HP_DELIVERY_WAIT_SECONDS", "60"))
VIDEO_EXT = (".mp4", ".mov", ".webm", ".mkv", ".gif")
WATCH_NAME = re.compile(r"^(?:lesson-\d+-)?scene-(\d+)\b.*\.(?:mp4|mov|m4v)$", re.IGNORECASE)


def log(msg: str) -> None:
    print(time.strftime("%Y-%m-%d %H:%M:%S"), msg, flush=True)


# ── HTTP ──────────────────────────────────────────────────────────────────────

def request(url: str, *, method: str = "GET", data: bytes | None = None, headers: dict | None = None, timeout: int = 120):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    return urllib.request.urlopen(req, timeout=timeout)


def server(path: str, *, method: str = "GET", data: bytes | None = None, headers: dict | None = None, timeout: int = 600):
    url = path if path.startswith("http") else f"{SERVER}/api/render-pc{path}"
    return request(url, method=method, data=data, timeout=timeout,
                   headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json", **(headers or {})})


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


# ── The server's side ─────────────────────────────────────────────────────────

def next_clip() -> dict | None:
    with server("/next", method="POST", data=b"") as res:
        return json.load(res) if res.status == 200 else None


def finish(clip: dict, video: Path | None = None, error: str = "") -> bool:
    """Deliver a clip (or its failure). True when the server has the last word: it took it, or it no longer wants
    it (409: redone or handed out again). Anything else (a 503 during a deploy, the network gone) is tried again,
    because a finished render is about half an hour of work."""
    fields = {"claim": clip["claim"]}
    if error:
        fields["error"] = error[:480]
    body, ctype = multipart(fields, {"video": video} if video else {})
    for attempt in range(DELIVERY_TRIES):
        try:
            with server(f"/clips/{clip['id']}/finish", method="POST", data=body, headers={"Content-Type": ctype}) as res:
                log(f"clip {clip['id']}: server says {json.load(res).get('status')}")
                return True
        except urllib.error.HTTPError as e:
            detail = e.read()[:200]
            if e.code in (404, 409, 422):   # gone, handed out again, or refused as it is: sending it again changes nothing
                log(f"clip {clip['id']}: server refused the result ({e.code}) {detail!r}")
                return True
            log(f"clip {clip['id']}: delivery failed ({e.code}), try {attempt + 1} of {DELIVERY_TRIES}")
        except OSError as e:
            log(f"clip {clip['id']}: delivery failed ({e}), try {attempt + 1} of {DELIVERY_TRIES}")
        time.sleep(DELIVERY_WAIT)
    return False


def attach(film: Path, scene: int) -> bool:
    body, ctype = multipart({}, {"film": film})
    try:
        with server(f"/scenes/{scene}/film", method="POST", data=body, headers={"Content-Type": ctype}) as res:
            log(f"{film.name}: on scene {scene} ({json.load(res).get('path')})")
            return True
    except urllib.error.HTTPError as e:
        log(f"{film.name}: scene {scene} refused it ({e.code}) {e.read()[:200]!r}")
        return False


# ── ComfyUI ───────────────────────────────────────────────────────────────────

def comfy_upload(picture: Path) -> str:
    body, ctype = multipart({"overwrite": "true"}, {"image": picture})
    with request(f"{COMFY}/upload/image", method="POST", data=body, headers={"Content-Type": ctype}) as res:
        return json.load(res)["name"]


def fill(node, values: dict):
    """Put the clip's values into the workflow template. A value that is only a placeholder keeps its type."""
    if isinstance(node, dict):
        return {k: fill(v, values) for k, v in node.items()}
    if isinstance(node, list):
        return [fill(v, values) for v in node]
    if isinstance(node, str):
        whole = re.fullmatch(r"\{\{(\w+)\}\}", node)
        if whole and whole.group(1) in values:
            return values[whole.group(1)]
        return re.sub(r"\{\{(\w+)\}\}", lambda m: str(values.get(m.group(1), m.group(0))), node)
    return node


def comfy_render(clip: dict, pictures: list[str]) -> Path:
    template = json.loads(WORKFLOW.read_text())
    values = {"PROMPT": clip["prompt"], "SECONDS": clip["seconds"], "FRAMES": clip["seconds"] * FPS + 1,
              "FPS": FPS, "SEED": random.randrange(2**31), "NAME": f"hp-{clip['key']}"}
    # A workflow has a fixed number of picture slots: a clip with fewer people repeats its last picture.
    for i in range(1, 10):
        values[f"IMAGE_{i}"] = pictures[min(i, len(pictures)) - 1] if pictures else ""
    leftover = re.findall(r"\{\{\w+\}\}", json.dumps(fill(template, values)))
    if leftover:
        raise RuntimeError(f"workflow has unknown placeholders: {sorted(set(leftover))}")

    payload = json.dumps({"prompt": fill(template, values), "client_id": "historyportal-worker"}).encode()
    with request(f"{COMFY}/prompt", method="POST", data=payload, headers={"Content-Type": "application/json"}) as res:
        prompt_id = json.load(res)["prompt_id"]
    log(f"clip {clip['id']}: in ComfyUI's queue as {prompt_id}")

    deadline = time.time() + RENDER_TIMEOUT
    while time.time() < deadline:
        time.sleep(10)
        with request(f"{COMFY}/history/{prompt_id}") as res:
            entry = json.load(res).get(prompt_id)
        if not entry:
            continue
        status = entry.get("status", {})
        if status.get("status_str") == "error":
            raise RuntimeError("ComfyUI reported an error: " + json.dumps(status.get("messages", []))[-300:])
        for output in entry.get("outputs", {}).values():
            for files in output.values():
                for f in files if isinstance(files, list) else []:
                    if isinstance(f, dict) and str(f.get("filename", "")).lower().endswith(VIDEO_EXT):
                        query = urllib.parse.urlencode({"filename": f["filename"], "subfolder": f.get("subfolder", ""), "type": f.get("type", "output")})
                        raw = Path(tempfile.mkdtemp(prefix="hp-clip-")) / f["filename"]
                        with request(f"{COMFY}/view?{query}", timeout=600) as res, open(raw, "wb") as fh:
                            shutil.copyfileobj(res, fh)
                        return raw
        if status.get("completed"):
            raise RuntimeError("ComfyUI finished without a video output")
    raise RuntimeError(f"no clip after {RENDER_TIMEOUT // 60} minutes")


def to_upload_file(raw: Path) -> Path:
    """720p H.264 at high quality, no sound: small enough to send, good enough for the server's final encode."""
    out = raw.with_name(raw.stem + ".upload.mp4")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(raw), "-vf", "scale=-2:min(720\\,ih)",
                    "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-an",
                    "-movflags", "+faststart", str(out)], check=True, timeout=900)
    return out


# ── The loop ──────────────────────────────────────────────────────────────────

def render_one(clip: dict) -> None:
    log(f"clip {clip['id']} ({clip['key']}, {clip['seconds']} s): {clip['text'][:80]}")
    work = Path(tempfile.mkdtemp(prefix="hp-in-"))
    try:
        pictures = []
        for i, url in enumerate(clip["inputs"], start=1):
            with server(f"{url}?claim={urllib.parse.quote(clip['claim'])}") as res:
                ext = mimetypes.guess_extension(res.headers.get_content_type()) or ".png"
                local = work / f"hp-{clip['id']}-image-{i}{ext}"
                local.write_bytes(res.read())
            pictures.append(comfy_upload(local))
        raw = comfy_render(clip, pictures)
        if finish(clip, video=to_upload_file(raw)):
            shutil.rmtree(raw.parent, ignore_errors=True)
        else:
            log(f"clip {clip['id']}: not delivered; the render is kept in {raw.parent}")
    except Exception as e:  # the server must hear about every failure, or the clip waits until it goes stale
        log(f"clip {clip['id']}: failed: {e}")
        finish(clip, error=str(e))
    finally:
        shutil.rmtree(work, ignore_errors=True)


def sweep_watch_folder() -> None:
    if not WATCH.is_dir():
        return
    for film in sorted(WATCH.iterdir()):
        match = WATCH_NAME.match(film.name)
        if not match or not film.is_file() or time.time() - film.stat().st_mtime < 20:   # still being written
            continue
        target = WATCH / ("sent" if attach(film, int(match.group(1))) else "refused")
        target.mkdir(exist_ok=True)
        film.rename(target / film.name)


def run() -> None:
    log(f"render worker: server {SERVER}, ComfyUI {COMFY}, workflow {WORKFLOW}, watch folder {WATCH}")
    while True:
        try:
            sweep_watch_folder()
            clip = next_clip()
            if clip:
                render_one(clip)
                continue
        except Exception as e:   # network down, server deploy: try again later
            log(f"waiting: {e}")
        time.sleep(IDLE_SECONDS)


def main() -> int:
    parser = argparse.ArgumentParser(description="History Portal render PC worker")
    sub = parser.add_subparsers(dest="command")
    one = sub.add_parser("attach", help="send one film to its scene")
    one.add_argument("film", type=Path)
    one.add_argument("--scene", type=int, required=True)
    sub.add_parser("check", help="test the server token and the ComfyUI connection, then stop")
    args = parser.parse_args()

    if not TOKEN:
        print("RENDER_PC_TOKEN is not set.", file=sys.stderr)
        return 2
    if args.command == "attach":
        return 0 if attach(args.film, args.scene) else 1
    if args.command == "check":
        with request(f"{COMFY}/system_stats", timeout=10) as res:
            print("ComfyUI:", "ok" if res.status == 200 else res.status)
        print("Workflow:", "found" if WORKFLOW.is_file() else f"MISSING ({WORKFLOW})")
        try:
            with server("/ping") as res:
                state = json.load(res)
                print(f"Server token: ok ({state.get('waiting')} clip(s) waiting, {state.get('rendering')} rendering)")
        except urllib.error.HTTPError as e:
            print(f"Server token: refused ({e.code})")
            return 1
        return 0
    run()
    return 0


if __name__ == "__main__":
    sys.exit(main())

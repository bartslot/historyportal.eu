"""
Mac-side client for the LAN ComfyUI render server (Bart's PC, RTX 3090 Ti).

Usage:
  python3 comfy_client.py [--config comfy.json] wake
  python3 comfy_client.py [--config comfy.json] ping
  python3 comfy_client.py [--config comfy.json] run  <workflow> <image> [-o outdir] [--prompt-file f] [--seed n] [--mp 1|2] [--steps n]
  python3 comfy_client.py [--config comfy.json] watch <folder> <workflow> [--prompt-file f] [--mp 1|2] [--interval s]

Why: per-image cloud conversion (Nano Banana 2, $0.03-0.10) does not fit a freemium product, so
asset packs are built once, locally, on the PC (about EUR 0.001 per image). The PC sleeps when idle;
this client wakes it with a magic packet, waits for ComfyUI to answer, then queues jobs.

Workflows are ComfyUI "Export (API)" files. The config maps each field we patch to "<node id>.<input>"
(the PC's setup report lists the node ids), so swapping a workflow never means editing this file.

Every result is cached by a hash of (input bytes, workflow, prompt, params): re-running a batch skips
what is already done, like narration.

Standard library only, so it runs on the Mac's system Python with nothing to install.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import socket
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


# --- config ---------------------------------------------------------------------------------------

def load_config(path: Path) -> dict:
    cfg = json.loads(path.read_text())
    cfg.setdefault("port", 8188)
    cfg["_dir"] = path.resolve().parent
    return cfg


def base_url(cfg: dict) -> str:
    return f"http://{cfg['host']}:{cfg['port']}"


def load_workflow(cfg: dict, name: str) -> tuple[dict, dict]:
    try:
        spec = cfg["workflows"][name]
    except KeyError:
        sys.exit(f"unknown workflow '{name}'; config has: {', '.join(cfg.get('workflows', {}))}")
    wf = json.loads((cfg["_dir"] / spec["file"]).read_text())
    return wf, spec.get("nodes", {})


# --- sizing ---------------------------------------------------------------------------------------

def size_for(src_w: int, src_h: int, megapixels: float, multiple: int = 64) -> tuple[int, int]:
    """Width/height at roughly `megapixels`, keeping the source aspect, snapped to `multiple`.

    2560x1440 at 1 MP gives 1344x768; at 2 MP, 1920x1088.
    """
    aspect = src_w / src_h
    snap = lambda v: max(multiple, int(round(v / multiple)) * multiple)
    # Snap the height first and derive the width from it; snapping both independently drifts the
    # aspect (2 MP came out 1856x1088, visibly narrower than 16:9).
    h = snap((megapixels * 1_000_000 / aspect) ** 0.5)
    return snap(h * aspect), h


def image_size(path: Path) -> tuple[int, int]:
    """PNG/JPEG dimensions without Pillow."""
    data = path.read_bytes()
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if data[:2] == b"\xff\xd8":
        i = 2
        while i < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return w, h
            i += 2 + struct.unpack(">H", data[i + 2:i + 4])[0]
    raise ValueError(f"can't read size of {path} (PNG or JPEG only)")


# --- workflow patching ----------------------------------------------------------------------------

def patch(wf: dict, nodes: dict, values: dict) -> dict:
    """Set each value at its "<node id>.<input>" address. Fields the workflow doesn't map are skipped,
    so a megapixel-based workflow (Qwen) and a width/height one (klein) share one call site."""
    wf = json.loads(json.dumps(wf))
    for field, value in values.items():
        addr = nodes.get(field)
        if not addr or value is None:
            continue
        node_id, inp = addr.split(".", 1)
        if node_id not in wf:
            raise KeyError(f"workflow has no node {node_id} (mapped from '{field}')")
        wf[node_id]["inputs"][inp] = value
    return wf


def job_hash(image_bytes: bytes, wf: dict, values: dict) -> str:
    h = hashlib.sha256()
    h.update(image_bytes)
    h.update(json.dumps(wf, sort_keys=True).encode())
    h.update(json.dumps({k: v for k, v in values.items() if k != "image"}, sort_keys=True).encode())
    return h.hexdigest()


# --- network --------------------------------------------------------------------------------------

def wake(mac: str, broadcast: str = "255.255.255.255", port: int = 9) -> None:
    raw = bytes.fromhex(mac.replace(":", "").replace("-", ""))
    if len(raw) != 6:
        raise ValueError(f"bad MAC address: {mac}")
    packet = b"\xff" * 6 + raw * 16
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.sendto(packet, (broadcast, port))


def http_json(url: str, data: bytes | None = None, headers: dict | None = None, timeout: float = 30):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def is_up(cfg: dict) -> bool:
    try:
        http_json(base_url(cfg) + "/system_stats", timeout=3)
        return True
    except (urllib.error.URLError, OSError, ValueError):
        return False


def ensure_up(cfg: dict, wait: float = 180) -> None:
    """Wake the PC if ComfyUI doesn't answer, then wait for it."""
    if is_up(cfg):
        return
    if not cfg.get("mac"):
        sys.exit(f"ComfyUI at {base_url(cfg)} is not answering and no 'mac' is configured to wake it")
    print(f"waking {cfg['mac']} ...", file=sys.stderr)
    wake(cfg["mac"], cfg.get("broadcast", "255.255.255.255"))
    deadline = time.monotonic() + wait
    while time.monotonic() < deadline:
        time.sleep(3)
        if is_up(cfg):
            return
    sys.exit(f"ComfyUI at {base_url(cfg)} did not come up within {wait:.0f}s "
             "(if the PC is booted into Windows for gaming, the render server isn't running)")


def upload(cfg: dict, path: Path, name: str) -> str:
    boundary = uuid.uuid4().hex
    body = b"".join([
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="image"; filename="{name}"\r\n'.encode(),
        b"Content-Type: application/octet-stream\r\n\r\n",
        path.read_bytes(),
        f"\r\n--{boundary}\r\n".encode(),
        b'Content-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n',
        f"--{boundary}--\r\n".encode(),
    ])
    res = http_json(base_url(cfg) + "/upload/image", body,
                    {"Content-Type": f"multipart/form-data; boundary={boundary}"})
    return f"{res['subfolder']}/{res['name']}" if res.get("subfolder") else res["name"]


def queue(cfg: dict, wf: dict) -> str:
    body = json.dumps({"prompt": wf, "client_id": "historyportal-artkit"}).encode()
    res = http_json(base_url(cfg) + "/prompt", body, {"Content-Type": "application/json"})
    if res.get("node_errors"):
        raise RuntimeError(f"ComfyUI rejected the workflow: {res['node_errors']}")
    return res["prompt_id"]


def wait_for(cfg: dict, prompt_id: str, timeout: float = 900) -> list[dict]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        hist = http_json(base_url(cfg) + f"/history/{prompt_id}")
        entry = hist.get(prompt_id)
        if entry:
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(f"job {prompt_id} failed: {status.get('messages')}")
            images = [img for out in entry.get("outputs", {}).values() for img in out.get("images", [])
                      if img.get("type") == "output"]
            if images or status.get("completed"):
                return images
        time.sleep(1)
    raise TimeoutError(f"job {prompt_id} still running after {timeout:.0f}s")


def download(cfg: dict, img: dict) -> bytes:
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img.get("subfolder", ""),
                                "type": img.get("type", "output")})
    with urllib.request.urlopen(base_url(cfg) + f"/view?{q}", timeout=120) as r:
        return r.read()


# --- jobs -----------------------------------------------------------------------------------------

def run_one(cfg: dict, workflow: str, src: Path, outdir: Path, prompt: str | None,
            seed: int, mp: float, steps: int | None) -> Path:
    wf, nodes = load_workflow(cfg, workflow)
    w, h = size_for(*image_size(src), mp)
    values = {"prompt": prompt, "seed": seed, "width": w, "height": h, "megapixels": mp, "steps": steps}
    digest = job_hash(src.read_bytes(), wf, values)
    dst = outdir / f"{src.stem}__{workflow}__{digest[:10]}.png"
    if dst.exists():
        print(f"cached  {dst.name}")
        return dst

    ensure_up(cfg)
    t0 = time.monotonic()
    values["image"] = upload(cfg, src, f"{digest[:16]}{src.suffix.lower()}")
    images = wait_for(cfg, queue(cfg, patch(wf, nodes, values)))
    if not images:
        raise RuntimeError(f"job for {src.name} finished with no output image (is there a SaveImage node?)")
    outdir.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(download(cfg, images[0]))
    secs = time.monotonic() - t0
    meta = {k: v for k, v in values.items() if k != "image"}
    meta.update(source=str(src), workflow=workflow, hash=digest, seconds=round(secs, 1))
    dst.with_suffix(".json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"done    {dst.name}  {secs:.1f}s")
    return dst


def watch(cfg: dict, folder: Path, workflow: str, prompt: str | None, seed: int, mp: float,
          steps: int | None, interval: float) -> None:
    """Convert every image dropped into <folder>/in into <folder>/out. The hash cache means a restart
    re-queues nothing that already finished. Failures are logged and retried on the next pass."""
    inbox, outbox = folder / "in", folder / "out"
    inbox.mkdir(parents=True, exist_ok=True)
    print(f"watching {inbox} -> {outbox} ({workflow}); ctrl-c to stop")
    while True:
        for src in sorted(p for p in inbox.iterdir() if p.suffix.lower() in IMAGE_EXTS):
            try:
                run_one(cfg, workflow, src, outbox, prompt, seed, mp, steps)
            except (RuntimeError, TimeoutError, urllib.error.URLError, OSError, ValueError) as e:
                print(f"failed  {src.name}: {e}", file=sys.stderr)
        time.sleep(interval)


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", type=Path, default=HERE / "comfy.json")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("wake")
    sub.add_parser("ping")
    for name in ("run", "watch"):
        p = sub.add_parser(name)
        if name == "run":
            p.add_argument("workflow")
            p.add_argument("image", type=Path)
            p.add_argument("-o", "--outdir", type=Path)
        else:
            p.add_argument("folder", type=Path)
            p.add_argument("workflow")
            p.add_argument("--interval", type=float, default=10)
        p.add_argument("--prompt-file", type=Path, default=HERE / "prompts" / "history-line.txt")
        p.add_argument("--seed", type=int, default=1)
        p.add_argument("--mp", type=float, default=1.0)
        p.add_argument("--steps", type=int)
    args = ap.parse_args(argv)
    cfg = load_config(args.config)

    if args.cmd == "wake":
        wake(cfg["mac"], cfg.get("broadcast", "255.255.255.255"))
        print(f"magic packet sent to {cfg['mac']}")
    elif args.cmd == "ping":
        up = is_up(cfg)
        print(f"{base_url(cfg)}: {'up' if up else 'down'}")
        sys.exit(0 if up else 1)
    else:
        prompt = args.prompt_file.read_text().strip() if args.prompt_file else None
        if args.cmd == "run":
            run_one(cfg, args.workflow, args.image, args.outdir or args.image.parent / "converted",
                    prompt, args.seed, args.mp, args.steps)
        else:
            watch(cfg, args.folder, args.workflow, prompt, args.seed, args.mp, args.steps, args.interval)


if __name__ == "__main__":
    main()

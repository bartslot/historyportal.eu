"""
Run: python3 -m unittest tools/artkit/comfy/test_comfy_client.py

The real server is a PC on Bart's LAN, so the round trip is tested against a fake ComfyUI that speaks
the same four endpoints (/system_stats, /upload/image, /prompt, /history, /view).
"""
import json
import struct
import tempfile
import threading
import unittest
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import comfy_client as cc


def png(w: int, h: int) -> bytes:
    raw = b"".join(b"\x00" + b"\xff" * 3 * w for _ in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


class FakeComfy(BaseHTTPRequestHandler):
    queued: list = []
    uploads: int = 0

    def log_message(self, *a):
        pass

    def reply(self, obj, body: bytes | None = None):
        data = body if body is not None else json.dumps(obj).encode()
        self.send_response(200)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/system_stats":
            self.reply({"system": {}})
        elif self.path.startswith("/history/"):
            pid = self.path.rsplit("/", 1)[1]
            self.reply({pid: {"status": {"status_str": "success", "completed": True},
                              "outputs": {"9": {"images": [{"filename": "out.png", "subfolder": "",
                                                            "type": "output"}]}}}})
        elif self.path.startswith("/view?"):
            self.reply(None, b"converted-bytes")

    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"]))
        if self.path == "/upload/image":
            FakeComfy.uploads += 1
            assert b'name="image"' in body
            self.reply({"name": "up.png", "subfolder": "", "type": "input"})
        elif self.path == "/prompt":
            FakeComfy.queued.append(json.loads(body)["prompt"])
            self.reply({"prompt_id": f"p{len(FakeComfy.queued)}", "node_errors": {}})


WORKFLOW = {
    "1": {"class_type": "LoadImage", "inputs": {"image": "x.png"}},
    "2": {"class_type": "CLIPTextEncode", "inputs": {"text": ""}},
    "3": {"class_type": "KSampler", "inputs": {"seed": 0, "steps": 20}},
    "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 512, "height": 512}},
    "9": {"class_type": "SaveImage", "inputs": {}},
}
NODES = {"image": "1.image", "prompt": "2.text", "seed": "3.seed", "steps": "3.steps",
         "width": "4.width", "height": "4.height"}


class SizeTest(unittest.TestCase):
    def test_16_9_render_sizes(self):
        self.assertEqual(cc.size_for(2560, 1440, 1), (1344, 768))
        self.assertEqual(cc.size_for(2560, 1440, 2), (1920, 1088))

    def test_png_size(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "a.png"
            p.write_bytes(png(32, 18))
            self.assertEqual(cc.image_size(p), (32, 18))


class PatchTest(unittest.TestCase):
    def test_patches_mapped_fields_only(self):
        out = cc.patch(WORKFLOW, NODES, {"seed": 7, "megapixels": 2.0, "steps": None})
        self.assertEqual(out["3"]["inputs"], {"seed": 7, "steps": 20})
        self.assertEqual(WORKFLOW["3"]["inputs"]["seed"], 0, "original must not be mutated")

    def test_missing_node_is_loud(self):
        with self.assertRaises(KeyError):
            cc.patch(WORKFLOW, {"seed": "42.seed"}, {"seed": 1})

    def test_hash_ignores_uploaded_name_but_not_prompt(self):
        a = cc.job_hash(b"img", WORKFLOW, {"prompt": "p", "image": "a.png"})
        self.assertEqual(a, cc.job_hash(b"img", WORKFLOW, {"prompt": "p", "image": "b.png"}))
        self.assertNotEqual(a, cc.job_hash(b"img", WORKFLOW, {"prompt": "q"}))


class WakeTest(unittest.TestCase):
    def test_bad_mac(self):
        with self.assertRaises(ValueError):
            cc.wake("00:11:22")


class RoundTripTest(unittest.TestCase):
    def setUp(self):
        FakeComfy.queued, FakeComfy.uploads = [], 0
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeComfy)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.tmp = tempfile.TemporaryDirectory()
        d = Path(self.tmp.name)
        (d / "wf.json").write_text(json.dumps(WORKFLOW))
        self.cfg = {"host": "127.0.0.1", "port": self.server.server_address[1], "_dir": d,
                    "workflows": {"klein4b": {"file": "wf.json", "nodes": NODES}}}
        self.src = d / "study_wide.png"
        self.src.write_bytes(png(64, 36))

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.tmp.cleanup()

    def test_run_then_cache(self):
        out = Path(self.tmp.name) / "converted"
        dst = cc.run_one(self.cfg, "klein4b", self.src, out, "ink", 5, 1.0, None)
        self.assertEqual(dst.read_bytes(), b"converted-bytes")
        sent = FakeComfy.queued[0]
        self.assertEqual(sent["1"]["inputs"]["image"], "up.png")
        self.assertEqual(sent["2"]["inputs"]["text"], "ink")
        self.assertEqual((sent["4"]["inputs"]["width"], sent["4"]["inputs"]["height"]), (1344, 768))
        meta = json.loads(dst.with_suffix(".json").read_text())
        self.assertEqual(meta["workflow"], "klein4b")

        cc.run_one(self.cfg, "klein4b", self.src, out, "ink", 5, 1.0, None)
        self.assertEqual((len(FakeComfy.queued), FakeComfy.uploads), (1, 1), "second run must hit the cache")

        cc.run_one(self.cfg, "klein4b", self.src, out, "ink", 6, 1.0, None)
        self.assertEqual(len(FakeComfy.queued), 2, "a new seed is a new job")


if __name__ == "__main__":
    unittest.main()

"""Send Python to Blender (Blender Lab MCP extension socket) and print the JSON reply.

usage: python3 bl.py [--render] [--lib] script.py [more.py ...]
  --lib     prepend hp1lib.py (house camera, parts, renders) to the scripts.
  --render  run on the render PC (RTX 3090 Ti) through the SSH tunnel `ssh -fN -L 9877:localhost:9876 render`;
            outputs land in ~/artkit/lesson_assets there (sync them back with rsync).
The code runs inside Blender; it must set `result = {...}`.
"""
import json, os, socket, sys

MAC_ROOT = "/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets"
RENDER_ROOT = "/home/bart/artkit/lesson_assets"
args = sys.argv[1:]
remote = "--render" in args
args = [a for a in args if a != "--render"]
files = []
if args and args[0] == "--lib":
    files.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "hp1lib.py"))
    args = args[1:]
files += args
code = "ASSETS_ROOT = %r\n\n" % (RENDER_ROOT if remote else MAC_ROOT) + "\n\n".join(open(f).read() for f in files)
s = socket.create_connection(("localhost", 9877 if remote else 9876), timeout=1800)
s.sendall((json.dumps({"type": "execute", "code": code, "strict_json": False}) + "\0").encode())
buf = b""
while b"\0" not in buf:
    chunk = s.recv(1 << 20)
    if not chunk:
        break
    buf += chunk
reply = json.loads(buf.split(b"\0")[0])
print(json.dumps(reply, indent=1)[:12000])
sys.exit(0 if reply.get("status") == "ok" else 1)

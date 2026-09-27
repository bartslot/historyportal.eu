"""Send Python to Blender (Blender Lab MCP extension socket) and print the JSON reply.

usage: python3 bl.py [--lib] script.py [more.py ...]
  --lib  prepend hp1lib.py (house camera, parts, renders) to the scripts.
The code runs inside Blender; it must set `result = {...}`.
"""
import json, os, socket, sys

args = sys.argv[1:]
files = []
if args and args[0] == "--lib":
    files.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "hp1lib.py"))
    args = args[1:]
files += args
code = "\n\n".join(open(f).read() for f in files)
s = socket.create_connection(("localhost", 9876), timeout=1800)
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

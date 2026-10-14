# Scene engine studio (engine-mvp)

React + Babylon lesson studio. From this folder:

```bash
npm install
python3 server.py      # API + crew + the blockout channel, http://127.0.0.1:8090
npm run dev            # the studio page; the clay-blockout MCP tools drive THIS open page, so keep it open
```

The mannequin (`public/assets/models/xbot.glb`) is git-ignored; without it the studio loads it from the Babylon CDN.
To serve it locally (and on deploy):

```bash
curl -fL -o public/assets/models/xbot.glb https://assets.babylonjs.com/meshes/Xbot.glb
```

The `clay-blockout` MCP server is `mcp/blockout_mcp.py` (needs `pip install mcp`; `STUDIO_SERVER` = the server.py URL).
Tests: `npm test`, `python3 test_server.py`, `python3 test_blockout_link.py`.

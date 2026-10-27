"""Smoke test both MCP servers over stdio. Needs the crew server on 8091 and a logged-in codex."""
import asyncio
import json
import os
import stat
import sys
import tempfile
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

HERE = Path(__file__).parent

FAKE_CODEX = """#!/bin/sh
cat > /dev/null
ARGS="$*"
while [ "$1" != "-C" ]; do shift; done; cd "$2"  # like codex -C
echo "$ARGS" > args.txt
echo "thinking noise"
echo "codex"
echo "intermediate"
touch made.png
echo "codex"
echo "all done"
echo "tokens used"
echo "123"
"""


async def call(script: str, tool: str, args: dict, env: dict | None = None):
    params = StdioServerParameters(command=sys.executable, args=[str(HERE / script)],
                                   env={**os.environ, **(env or {})})
    async with stdio_client(params) as (r, w), ClientSession(r, w) as s:
        await s.initialize()
        names = [t.name for t in (await s.list_tools()).tools]
        res = await s.call_tool(tool, args)
        assert not res.isError, res.content
        return names, json.loads(res.content[0].text) if res.content[0].text.startswith('{') else res.content[0].text


async def main() -> None:
    names, crew = await call('crew_mcp.py', 'list_crew', {})
    assert set(names) == {'list_crew', 'ask_crew', 'reset_crew_chat'}, names
    director = next(m for m in crew['crew'] if m['id'] == 'director')
    assert director['model'] == 'claude-opus-5-5' and len(crew['crew']) >= 7
    print('list_crew ok:', [m['id'] for m in crew['crew']], list(crew['assistants']))

    _, out = await call('crew_mcp.py', 'ask_crew', {'message': 'Hoi, wie zijn jullie?'})
    print('assistant:', out['messages'][0]['text'][:200])
    assert out['messages'][0]['who'] == 'assistant' and out['messages'][0]['text']

    _, out = await call('crew_mcp.py', 'ask_crew',
                        {'message': 'Wanneer schilderde Rembrandt de Nachtwacht?', 'to': 'historian'})
    print('Ruth:', out['messages'][0]['text'][:200])
    assert '1642' in out['messages'][0]['text']

    names, out = await call('chatgpt_mcp.py', 'ask_chatgpt', {'prompt': 'Reply with exactly: pong'})
    assert set(names) == {'ask_chatgpt', 'generate_image', 'edit_image'}, names
    print('chatgpt:', out['reply'])
    assert 'pong' in out['reply'].lower()

    with tempfile.TemporaryDirectory() as d:  # fake codex: checks parsing + new-file detection
        fake = Path(d) / 'codex'
        fake.write_text(FAKE_CODEX)
        fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
        wd = Path(d) / 'work'
        _, out = await call('chatgpt_mcp.py', 'ask_chatgpt', {'prompt': 'x', 'workdir': str(wd)},
                            {'CODEX_BIN': str(fake)})
        assert out['reply'] == 'all done', out
        assert sorted(Path(f).name for f in out['files']) == ['args.txt', 'made.png'], out
        assert 'photon' not in (wd / 'args.txt').read_text()
        _, out = await call('chatgpt_mcp.py', 'ask_chatgpt', {'prompt': 'x', 'workdir': str(wd), 'photon': True},
                            {'CODEX_BIN': str(fake)})
        assert 'default_tools_approval_mode' in (wd / 'args.txt').read_text(), out
        print('fake codex ok:', out['reply'], out['files'])

        src = Path(d) / 'src.png'
        src.write_bytes(b'not really a png')
        _, out = await call('chatgpt_mcp.py', 'edit_image',
                            {'source': str(src), 'prompt': 'make it blue', 'out_path': str(Path(d) / 'out' / 'blue.png')},
                            {'CODEX_BIN': str(fake)})
        assert out['path'].endswith('/out/blue.png') and out['bytes'] == 0 and 'width' not in out, out
        assert src.read_bytes() == b'not really a png'
        print('fake edit_image ok:', out)
    print('ALL PASSED')


asyncio.run(main())

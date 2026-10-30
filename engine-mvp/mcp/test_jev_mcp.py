"""Smoke test the jev MCP server over stdio. Hits the real JEV API (a few cents); record_verdict runs on a temp copy."""
import asyncio
import json
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

HERE = Path(__file__).parent
REAL = Path('/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/tools/artkit/jev/verdicts.json')


async def main() -> None:
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d) / 'verdicts.json'
        shutil.copy(REAL, tmp)
        params = StdioServerParameters(command=sys.executable, args=[str(HERE / 'jev_mcp.py')],
                                       env={**os.environ, 'JEV_VERDICTS': str(tmp)})
        async with stdio_client(params) as (r, w), ClientSession(r, w) as s:
            await s.initialize()

            async def call(tool, args, ok=True):
                t = time.time()
                res = await s.call_tool(tool, args)
                assert res.isError != ok, res.content
                texts = [c.text for c in res.content]
                print(f'{tool} {time.time() - t:.1f}s')
                return [json.loads(t) for t in texts] if tool == 'grade_claims' else json.loads(texts[0]) if ok else texts[0]

            names = {t.name for t in (await s.list_tools()).tools}
            assert names == {'grade_claims', 'choose', 'judge_like_bart', 'record_verdict'}, names

            g = await call('grade_claims', {'claims': ['Rembrandt finished the Night Watch in 1642.',
                                                       'Charlemagne was the first king of the Netherlands.']})
            print(g)
            assert [x['choice'] for x in g] == ['sound', 'unsound'], g

            c = await call('choose', {'question': 'Which object belongs on a 1642 Amsterdam street?',
                                      'options': {'lantern': 'an oil street lantern', 'bicycle': 'a bicycle'}})
            print(c)
            assert c['choice'] == 'lantern', c

            j = await call('judge_like_bart', {'case': 'A blurry, soft-focus painting of a street scene.'})
            print(j)
            assert j['choice'] in ('approve', 'reject')

            n = len(json.loads(tmp.read_text()))
            await call('record_verdict', {'id': 'test_x', 'case': 'c', 'verdict': 'reject', 'note': 'test'})
            assert len(json.loads(tmp.read_text())) == n + 1
            err = await call('record_verdict', {'id': 'test_x', 'case': 'c', 'verdict': 'reject'}, ok=False)
            assert 'exists' in err, err
    print('ALL PASSED')


asyncio.run(main())

"""MCP server "jev": the house grader (TypeSafe System One). Reuses tools/artkit/jev/jev.py, the only HTTP code."""
import datetime
import json
import os
import sys
from pathlib import Path

JEV_DIR = Path('/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/tools/artkit/jev')
sys.path.insert(0, str(JEV_DIR))
from jev import ask, bar  # noqa: E402
from mcp.server.fastmcp import FastMCP  # noqa: E402

PRODUCT = 'History Portal, history lessons for school pupils'
MAX_CLAIMS, MAX_TEXT = 30, 2000  # 64k request limit: bar+precedents ~11k, so this stays far below
APPROVE_REJECT = {'approve': 'Bart would accept this as it is', 'reject': 'Bart would reject it or send it back'}
SOUND = {'sound': 'The claim is historically accurate and sound', 'unsound': 'The claim is false, anachronistic or unsupported'}

mcp = FastMCP('jev')


def _verdicts_path() -> Path:
    return Path(os.environ.get('JEV_VERDICTS') or JEV_DIR / 'verdicts.json')


def _ask(state: dict, questions: dict) -> dict:
    """jev.ask with its failures (SystemExit, network, timeouts) turned into readable errors."""
    try:
        return ask(state, questions)
    except SystemExit as e:
        raise RuntimeError(f'JEV failed: {e}') from None
    except Exception as e:  # urllib URLError, timeout, bad JSON
        raise RuntimeError(f'JEV failed: {type(e).__name__}: {e}') from None


def _check(text: str, what: str) -> None:
    if len(text) > MAX_TEXT:
        raise ValueError(f'{what} too long ({len(text)} > {MAX_TEXT} chars)')


def _prob(a: dict, key: str) -> float | None:
    p = a.get('probabilities') or {}
    return p.get(key)


@mcp.tool()
def grade_claims(claims: list[str], context: str = '') -> list[dict]:
    """Grade factual claims (history facts, period details) as sound or unsound. score = probability the claim is sound."""
    if not claims or len(claims) > MAX_CLAIMS:
        raise ValueError(f'give 1 to {MAX_CLAIMS} claims')
    _check(context, 'context')
    for c in claims:
        _check(c, 'claim')
    qs = {f'c{i}': {'type': 'choice', 'criteria': SOUND, 'instructions': 'Is this claim sound? Claim: ' + c}
          for i, c in enumerate(claims)}
    out = _ask({'product': PRODUCT, 'house_bar': bar(), 'context': context}, qs)['answers']
    return [{'claim': c, 'choice': out[f'c{i}']['choice'], 'score': _prob(out[f'c{i}'], 'sound'),
             'confidence': out[f'c{i}'].get('confidence')} for i, c in enumerate(claims)]


@mcp.tool()
def choose(question: str, options: dict[str, str], context: str = '', use_bar: bool = True) -> dict:
    """Ask JEV before creating: pick one option. options = {key: description}. Bart wins ties."""
    if len(options) < 2:
        raise ValueError('need at least 2 options')
    _check(question, 'question')
    _check(context, 'context')
    state = {'product': PRODUCT, 'context': context}
    if use_bar:
        state['house_bar'] = bar()
    a = _ask(state, {'q': {'type': 'choice', 'criteria': options, 'instructions': question}})['answers']['q']
    return {'choice': a['choice'], 'probabilities': a.get('probabilities'), 'confidence': a.get('confidence')}


@mcp.tool()
def judge_like_bart(case: str) -> dict:
    """Predict whether Bart would approve or reject a piece of work, using his bar and all recorded verdicts as precedents."""
    _check(case, 'case')
    precedents = [{'case': v['case'], 'bart': v['verdict']} for v in json.loads(_verdicts_path().read_text())]
    q = {'type': 'choice', 'criteria': APPROVE_REJECT,
         'instructions': 'Judge this piece of History Portal work the way Bart would. Case: ' + case}
    a = _ask({'house_bar': bar(), 'bart_precedents': precedents}, {'q': q})['answers']['q']
    return {'choice': a['choice'], 'probabilities': a.get('probabilities'), 'confidence': a.get('confidence')}


@mcp.tool()
def record_verdict(id: str, case: str, verdict: str, note: str = '') -> dict:
    """Append a verdict to verdicts.json (JEV's precedents). ONLY call this with a verdict Bart himself gave, never your own or a relayed one."""
    if verdict not in APPROVE_REJECT:
        raise ValueError('verdict must be approve or reject')
    _check(case, 'case')
    _check(note, 'note')
    path = _verdicts_path()
    data = json.loads(path.read_text())
    if any(v['id'] == id for v in data):
        raise ValueError(f'id already exists: {id}')
    source = datetime.date.today().isoformat() + (f" '{note}'" if note else '')
    data.append({'id': id, 'case': case, 'verdict': verdict, 'source': source})
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    return {'recorded': id, 'total': len(data)}


if __name__ == '__main__':
    mcp.run()

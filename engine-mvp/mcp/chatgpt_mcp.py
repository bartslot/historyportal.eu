"""MCP server "chatgpt": ask ChatGPT through the Codex CLI bundled in the ChatGPT app.

Uses the logged-in ChatGPT subscription, not the paid API.
"""
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from mcp.server.fastmcp import FastMCP

CODEX_DEFAULT = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'
mcp = FastMCP('chatgpt')


def _snapshot(workdir: Path) -> dict[str, float]:
    return {str(p): p.stat().st_mtime_ns for p in workdir.rglob('*') if p.is_file()}


def parse_reply(out: str) -> str:
    """Final message: after the last line that is exactly 'codex', before 'tokens used'."""
    lines = out.splitlines()
    idx = [i for i, ln in enumerate(lines) if ln.strip() == 'codex']
    tail = lines[idx[-1] + 1:] if idx else lines[-40:]  # no marker: whole tail
    for i, ln in enumerate(tail):
        if ln.strip().lower().startswith('tokens used'):
            tail = tail[:i]
            break
    return '\n'.join(tail).strip()


def _check_images(images: list[str]) -> list[str]:
    paths = []
    for img in images:
        p = Path(img).expanduser()
        if not p.is_absolute() or not p.is_file():
            raise ValueError(f'image not found (need an absolute path): {img}')
        paths.append(str(p))
    return paths


def run_codex(prompt: str, images: list[str], workdir: Path, timeout_s: int) -> dict:
    codex = os.environ.get('CODEX_BIN', CODEX_DEFAULT)
    # prompt on stdin: -i takes several values and would swallow a trailing prompt
    cmd = [codex, 'exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', str(workdir)]
    for img in _check_images(images):
        cmd += ['-i', img]
    before = _snapshot(workdir)
    try:
        proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=timeout_s)
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f'codex timed out after {timeout_s}s') from e
    except FileNotFoundError as e:
        raise RuntimeError(f'codex binary not found: {codex} (set CODEX_BIN)') from e
    out = proc.stdout + ('\n' + proc.stderr if proc.stderr else '')
    if proc.returncode != 0:
        last = '\n'.join(out.splitlines()[-20:])
        raise RuntimeError(f'codex failed (exit {proc.returncode}). Last 20 lines:\n{last}')
    after = _snapshot(workdir)
    files = sorted(p for p, m in after.items() if before.get(p) != m)
    return {'reply': parse_reply(proc.stdout), 'files': files, 'workdir': str(workdir)}


@mcp.tool()
def ask_chatgpt(prompt: str, images: list[str] = [], workdir: str | None = None,
                timeout_s: int = 600) -> dict:
    """Ask ChatGPT (via the Codex CLI, ChatGPT subscription). Optional absolute image paths
    are attached. Files ChatGPT creates or changes in workdir (default: a fresh temp dir)
    are returned in `files`."""
    wd = Path(workdir).expanduser() if workdir else Path(tempfile.mkdtemp(prefix='chatgpt_mcp_'))
    wd.mkdir(parents=True, exist_ok=True)
    return run_codex(prompt, images, wd, timeout_s)


@mcp.tool()
def generate_image(prompt: str, out_path: str, reference_images: list[str] = [],
                   transparent: bool = False) -> dict:
    """Generate an image with ChatGPT and save it at out_path (~80 s). Spends ChatGPT usage."""
    out = Path(out_path).expanduser()
    name = out.name
    full = f'{prompt}\n\nGenerate the image and save it in the current folder as {name}.'
    if transparent:
        full += ' Transparent background (PNG with alpha).'
    tmp = Path(tempfile.mkdtemp(prefix='chatgpt_img_'))
    res = run_codex(full, reference_images, tmp, 600)
    images = [f for f in res['files'] if Path(f).suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp'}]
    made = next((f for f in images if Path(f).name == name), images[0] if images else None)
    if not made:
        raise RuntimeError(f'no image produced. ChatGPT said:\n{res["reply"]}')
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(made, out)
    return {'path': str(out), 'reply': res['reply']}


if __name__ == '__main__':
    mcp.run()

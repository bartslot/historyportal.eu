"""Client for the local Ollama server on the render PC (stdlib only)."""
import json
import os
import urllib.error
import urllib.request

DEFAULT_URL = "http://render.local:11434"
TIMEOUT = 180


class LocalLLMError(RuntimeError):
    pass


def _open(model, system, user, schema, temperature, base_url, stream):
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "stream": stream,
        "options": {"temperature": temperature},
    }
    if schema is not None:
        body["format"] = schema
    url = (base_url or os.environ.get("LOCAL_LLM_URL") or DEFAULT_URL).rstrip("/") + "/api/chat"
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    try:
        return urllib.request.urlopen(req, timeout=TIMEOUT)
    except urllib.error.HTTPError as e:
        raise LocalLLMError(f"Ollama HTTP {e.code} at {url}: {e.read().decode(errors='replace')[:300]}") from e
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise LocalLLMError(f"Ollama unreachable at {url} (PC asleep? service down?): {e}") from e


def ask_local(model, system, user, schema, temperature=0.4, base_url=None) -> dict:
    """One structured call; returns the parsed JSON object matching `schema`."""
    with _open(model, system, user, schema, temperature, base_url, False) as r:
        text = json.load(r)["message"]["content"]
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise LocalLLMError(f"model returned invalid JSON: {text[:300]!r}") from e


def stream_local(model, system, user, schema=None, temperature=0.4, base_url=None):
    """Yield text deltas as they arrive (NDJSON). With a schema the deltas concatenate to JSON."""
    with _open(model, system, user, schema, temperature, base_url, True) as r:
        for line in r:
            if not line.strip():
                continue
            chunk = json.loads(line)
            if "error" in chunk:
                raise LocalLLMError(chunk["error"])
            if delta := chunk.get("message", {}).get("content"):
                yield delta
            if chunk.get("done"):
                return


if __name__ == "__main__":
    schema = {"type": "object", "required": ["reply", "ask"], "properties": {
        "reply": {"type": "string"},
        "ask": {"type": "array", "items": {"type": "object", "required": ["crew", "question", "ack"],
                "properties": {"crew": {"type": "string"}, "question": {"type": "string"}, "ack": {"type": "string"}}}}}}
    out = ask_local(os.environ.get("LOCAL_LLM_MODEL", "qwen3.8:27b"),
                    "Je bent de regisseur van een geschiedenisles-team. Antwoord in JSON.",
                    "Een les over de Gouden Eeuw voor groep 8, maak het schemering", schema)
    assert isinstance(out["reply"], str) and isinstance(out["ask"], list)
    print(json.dumps(out, ensure_ascii=False, indent=2))

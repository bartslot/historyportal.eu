#!/usr/bin/env python3
"""Read-only access to the LessonUp corpus (Supabase history-corpus).

  corpus.py search "hunebed | trechterbeker"      -> candidate lessons
  corpus.py dump 785 79 --out DIR                  -> DIR/<id>.json (lesson, slides, structure, questions)

Dumps are for internal analysis only (blueprint + n-gram check). They are never shipped or quoted.
Credentials come from CORPUS_DB_* in the main repo .env (or the environment).
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ENV = Path(__file__).resolve().parents[2] / ".env"
MAIN_ENV = Path("/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/.env")


def _env() -> dict[str, str]:
    env = dict(os.environ)
    for path in (REPO_ENV, MAIN_ENV):
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            if line.startswith("CORPUS_DB_") and "=" in line:
                key, val = line.split("=", 1)
                env.setdefault(key, val.strip().strip('"'))
    missing = [k for k in ("CORPUS_DB_HOST", "CORPUS_DB_USERNAME", "CORPUS_DB_PASSWORD") if k not in env]
    if missing:
        sys.exit(f"corpus: missing {', '.join(missing)} (set them or add them to .env)")
    env["PGPASSWORD"] = env["CORPUS_DB_PASSWORD"]
    env.setdefault("PGCONNECT_TIMEOUT", "15")
    return env


def query_json(sql: str, *params: str) -> list:
    """Run one read-only query; the SQL must return a single json value. Params bind as :'p1', :'p2'..."""
    env = _env()
    conn = (f"host={env['CORPUS_DB_HOST']} port={env.get('CORPUS_DB_PORT', '5432')} "
            f"dbname={env.get('CORPUS_DB_DATABASE', 'postgres')} user={env['CORPUS_DB_USERNAME']} sslmode=require")
    args = ["psql", conn, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", "set default_transaction_read_only = on"]
    for i, p in enumerate(params, 1):
        args += ["-v", f"p{i}={p}"]
    proc = subprocess.run(args + ["-f", "-"], input=sql, capture_output=True, text=True, env=env)
    if proc.returncode != 0:
        sys.exit(f"corpus: query failed: {proc.stderr.strip()}")
    out = proc.stdout.strip().removeprefix("SET").strip()
    return json.loads(out) if out else []


def search(tsquery: str, limit: int = 20) -> list:
    return query_json(f"""
select coalesce(json_agg(r), '[]') from (
  select id, title, levels, years, slide_count, duration_min, channel_title
  from lessonup_lessons
  where search_vector @@ to_tsquery('dutch', :'p1')
  order by popularity_rank nulls last, slide_count desc
  limit {int(limit)}) r;""", tsquery)


def dump(lesson_id: int) -> dict:
    lid = str(int(lesson_id))
    return query_json("""
select json_build_object(
  'lesson', (select row_to_json(l) from (select id, lessonup_id, source_url, title, description, levels, years,
             duration_min, slide_count, themes, tags from lessonup_lessons where id = :'p1'::bigint) l),
  'slides', (select coalesce(json_agg(s order by s.position), '[]') from (
             select position, slide_type, title, body, question, answers, correct_answer, plain_text
             from lessonup_slides where lesson_id = :'p1'::bigint) s),
  'structure', (select row_to_json(t) from lessonup_lesson_structure t where t.lesson_id = :'p1'::bigint),
  'questions', (select coalesce(json_agg(q order by q.position), '[]') from (
             select position, question_format, bloom_level, bloom_label, phase, function_guess
             from lessonup_question_analysis where lesson_id = :'p1'::bigint) q));""", lid)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("tsquery")
    s.add_argument("--limit", type=int, default=20)
    d = sub.add_parser("dump")
    d.add_argument("ids", nargs="+", type=int)
    d.add_argument("--out", required=True, type=Path)
    a = ap.parse_args()
    if a.cmd == "search":
        print(json.dumps(search(a.tsquery, a.limit), ensure_ascii=False, indent=1))
        return
    a.out.mkdir(parents=True, exist_ok=True)
    for lid in a.ids:
        data = dump(lid)
        if not data.get("lesson"):
            print(f"corpus: lesson {lid} not found", file=sys.stderr)
            continue
        (a.out / f"{lid}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
        print(f"{lid}: {data['lesson']['title']} ({len(data['slides'])} slides, {len(data['questions'])} questions)")


if __name__ == "__main__":
    main()

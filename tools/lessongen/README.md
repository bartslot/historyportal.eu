# lessongen: Canon venster + level -> lesson.json (contract 2)

Contract: vault `historyportal/topics/autonomous-lessons/plan.md` (Contract 2), schema `lesson.schema.json`.
Output per lesson: vault `historyportal/topics/autonomous-lessons/lessons/<id>/`
`{lesson.json, blueprint.md, sources.md, ledger.md}` (+ `review.md` from step 7).

## Steps

1. **Pick the LessonUp blueprint lessons** (read-only corpus, `CORPUS_DB_*` in `.env`):
   `python3 corpus.py search "hunebed | trechterbeker"` -> choose 2-4 at the target level,
   `python3 corpus.py dump 785 79 --out .cache/corpus` (git-ignored; internal analysis only, never shipped).
2. **Blueprint** (`blueprint.md`): from the dumps take the SKELETON only: goals, begrippen in method wording,
   content beats in order, where the questions sit + Bloom level + the misconceptions they target, length.
   Close with "What LessonUp covers vs what we add". Never copy a sentence or a question.
3. **Sources** (`sources.md`): the Canon venster (`canonvannederland.nl/nl/<venster>`, curriculum row in
   `resources/curriculum/nl-vo.php`), Wikipedia NL/EN, museum/archive pages. A numbered fact table
   (fact at kid level | source URL). Only facts from the sources; uncertain = out. List what stays out.
4. **Ledger** (`ledger.md`): every character and staged element as sourced / inferred / invented.
   Invented people are plausible and labelled, never presented as historical persons.
5. **Write `lesson.json`** following `writer-brief.md` (yourself, or headless Codex:
   `codex exec --skip-git-repo-check -C <dir>` with the brief + blueprint + sources on stdin). You review.
6. **Validate**: `python3 validate.py <lesson.json> --resolve` until OK. `--resolve` fills `asset` ids from
   `~/BartsMedia/historyportal/library/<bundle>/library.json` and rebuilds `needed_assets` (feeds the art
   session). Without a library every layer stays `asset: null` and lands in `needed_assets`.
7. **Review pass**: three fresh readers (a 12-year-old, a teacher, a historian fact-checking against
   `sources.md`) -> `review.md`; fix; validate again.

## Validators (`validate.py`, tests in `test_validate.py`, run `uv run --with pytest --with jsonschema python -m pytest tools/lessongen`)

| Check | Rule |
|---|---|
| schema | `lesson.schema.json` (contract 2 + interaction shapes; source `url` non-empty) |
| shots | every scene `est_s` 6-12 and <= 2.6 narrated words/s |
| spacing | first interaction <= 180 s, <= 180 s of story between interactions and after the last (warn < 60 s) |
| facts | every scene has `fact_refs`, each one a `sources[].id`; a shot with a number/year needs a non-ledger source; at least one `canon` source |
| copyright | no 6-word run shared between ANY prose string in the file (title, teacher, goals, notes, ...) and ANY cached LessonUp dump in `.cache/corpus` |
| Bloom | >= 2 quizzes, <= 50 % recall (Bloom 1), >= 2 Bloom levels (labels are self-declared: the checker re-labels) |
| power meter | 1-4 `power-meter` moments |
| text | no dash character (U+2010-2015, spaced " - ") or emoji in any prose string; balloons <= 8 words |
| art | layer `asset` exists in the library; otherwise its `need` is in `needed_assets`. Match: first tag = head noun, required; `!tag` required; other tags rank. Region tags (mideast, egypt, mesopotamia, batavia, banda, ocean, newzealand, tasmania, mauritius) work both ways: a region asset never serves a need without that region |

"""Copy finished lesson art from the vault topic into the history-line library as WebP.

    python3 tools/lessons/import_art.py <topic art dir> <lesson key> [era]

plates/*  -> resources/icons/history-line/backdrops/<key>/   (opaque)
figures/* -> resources/icons/history-line/figures/<key>/     (alpha kept)
ships/*   -> resources/icons/history-line/props/<key>/       (alpha kept)
cargo/*   -> resources/icons/history-line/props/<key>/       (alpha kept; the cargo game's items)
WebP quality 80, at most 2880 px wide (house rule). Existing, newer files are left alone.
era: a period key of config/lesson-taxonomy.php (regents-rulers, cities-states ...), written as
"era" on every picture of <key> in meta.json. Without it the folder map in that config decides.
Then run: php artisan icons:import --collection=history-line
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

LIB = Path(__file__).resolve().parents[2] / 'resources' / 'icons' / 'history-line'
KINDS = {'plates': 'backdrops', 'figures': 'figures', 'people': 'figures', 'ships': 'props', 'fx': 'props', 'cargo': 'props'}
MAX_W, QUALITY = 2880, 80
TAXONOMY = Path(__file__).resolve().parents[2] / 'config' / 'lesson-taxonomy.php'


def periods() -> set[str]:
    """The period keys: the only entries in the taxonomy config with a 'from' year."""
    return set(re.findall(r"'([a-z-]+)' => \['label' => '[^']+', 'from'", TAXONOMY.read_text()))


def write_era(key: str, era: str) -> int:
    """Set "era" on every picture of <key> in meta.json (entries are created when missing)."""
    meta_file = LIB / 'meta.json'
    meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
    pictures = [p.relative_to(LIB).as_posix() for kind in set(KINDS.values()) for p in sorted((LIB / kind / key).glob('*.webp'))
                if not p.name.endswith('.depth.webp')]
    for ref in pictures:
        meta[ref] = {**meta.get(ref, {}), 'era': era}
    meta_file.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + '\n')
    return len(pictures)


def convert(src: Path, dst: Path) -> bool:
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return False
    with Image.open(src) as im:
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        im.thumbnail((MAX_W, im.height), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, 'WEBP', quality=QUALITY, method=6)
    return True


def main() -> None:
    art, key = Path(sys.argv[1]), sys.argv[2]
    era = sys.argv[3] if len(sys.argv) > 3 else None
    if era is not None and era not in periods():
        sys.exit(f'era {era!r} is not a period in {TAXONOMY}: {", ".join(sorted(periods()))}')
    done = 0
    for folder, kind in KINDS.items():
        for src in sorted((art / folder).glob('*.png')):
            done += convert(src, LIB / kind / key / f'{src.stem}.webp')
    print(f'{done} converted into {LIB}/*/{key}')
    if era is not None:
        print(f'era {era} on {write_era(key, era)} pictures in meta.json')


if __name__ == '__main__':
    main()

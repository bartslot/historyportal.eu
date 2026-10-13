"""Copy finished lesson art from the vault topic into the history-line library as WebP.

    python3 tools/lessons/import_art.py <topic art dir> <lesson key>

plates/*  -> resources/icons/history-line/backdrops/<key>/   (opaque)
figures/* -> resources/icons/history-line/figures/<key>/     (alpha kept)
ships/*   -> resources/icons/history-line/props/<key>/       (alpha kept)
WebP quality 80, at most 2880 px wide (house rule). Existing, newer files are left alone.
Then run: php artisan icons:import --collection=history-line
"""
import sys
from pathlib import Path

from PIL import Image

LIB = Path(__file__).resolve().parents[2] / 'resources' / 'icons' / 'history-line'
KINDS = {'plates': 'backdrops', 'figures': 'figures', 'ships': 'props', 'fx': 'props'}
MAX_W, QUALITY = 2880, 80


def convert(src: Path, dst: Path) -> bool:
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return False
    with Image.open(src) as im:
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, 'WEBP', quality=QUALITY, method=6)
    return True


def main() -> None:
    art, key = Path(sys.argv[1]), sys.argv[2]
    done = 0
    for folder, kind in KINDS.items():
        for src in sorted((art / folder).glob('*.png')):
            done += convert(src, LIB / kind / key / f'{src.stem}.webp')
    print(f'{done} converted into {LIB}/*/{key}')


if __name__ == '__main__':
    main()

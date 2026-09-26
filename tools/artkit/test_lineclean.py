"""Plain-assert checks for lineclean.py. Run: python3 tools/artkit/test_lineclean.py"""
import os
import sys
import tempfile

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lineclean  # noqa: E402


def test_hollow_removes_a_black_square_but_keeps_a_thin_line(tmp):
    img = Image.new('L', (200, 200), 255)
    d = ImageDraw.Draw(img)
    d.rectangle([20, 20, 79, 79], fill=0)          # 60x60 solid mass
    d.rectangle([120, 20, 122, 180], fill=0)       # 3px line
    src, dst = os.path.join(tmp, 'in.png'), os.path.join(tmp, 'out.png')
    img.save(src)
    lineclean.plate(src, dst)
    out = Image.open(dst).convert('L')
    assert out.mode == 'L' and out.size == (200, 200)
    assert out.getpixel((50, 50)) == 255, 'centre of the solid square must be hollowed'
    assert out.getpixel((20, 50)) == 0, 'the square keeps its outline'
    assert out.getpixel((121, 100)) == 0, 'a 3px line survives'


def test_cutout_clears_the_outside_and_keeps_enclosed_paper(tmp):
    img = Image.new('L', (200, 200), 255)
    ImageDraw.Draw(img).ellipse([50, 50, 150, 150], outline=0, width=3)
    src, dst = os.path.join(tmp, 'in.png'), os.path.join(tmp, 'cut.png')
    img.save(src)
    lineclean.cutout(src, dst, 10)
    out = Image.open(dst)
    assert out.mode == 'RGBA'
    assert out.size == (121, 121), out.size    # 101px circle + 10px margin each side
    assert out.getpixel((0, 0))[3] == 0, 'corner is transparent'
    cx, cy = out.width // 2, out.height // 2
    assert out.getpixel((cx, cy)) == (255, 255, 255, 255), 'enclosed interior stays opaque white'


def test_slice_writes_rows_times_cols_cells(tmp):
    src = os.path.join(tmp, 'grid.png')
    Image.new('RGB', (300, 200), 'white').save(src)
    outdir = os.path.join(tmp, 'cells')
    lineclean.slice_grid(src, outdir, 2, 3, 0.1)
    files = sorted(os.listdir(outdir))
    assert files == [f'cell_{i}.png' for i in range(6)], files
    assert Image.open(os.path.join(outdir, 'cell_5.png')).size == (80, 80)


def test_bad_input_exits_non_zero(tmp):
    assert lineclean.main(['plate', os.path.join(tmp, 'missing.png'), os.path.join(tmp, 'x.png')]) == 1


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            with tempfile.TemporaryDirectory() as tmp:
                fn(tmp)
            print('ok', name)

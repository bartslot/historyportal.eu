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
    assert lineclean.slice_sheet(src, outdir, 2, 3, 0.1, mode='grid') == 'grid'
    files = sorted(os.listdir(outdir))
    assert files == [f'cell_{i}.png' for i in range(6)], files
    assert Image.open(os.path.join(outdir, 'cell_5.png')).size == (80, 80)


def figure(draw, x, y):
    """A 140x300 'figure': body outline, a head, and a separate staff beside it."""
    draw.ellipse([x, y + 60, x + 120, y + 300], outline=0, width=4)
    draw.ellipse([x + 35, y, x + 85, y + 50], outline=0, width=4)
    draw.line([x + 135, y + 40, x + 135, y + 300], fill=0, width=4)


def sheet(tmp, positions):
    img = Image.new('RGB', (800, 800), 'white')
    d = ImageDraw.Draw(img)
    for x, y in positions:
        figure(d, x, y)
    path = os.path.join(tmp, 'sheet.png')
    img.save(path)
    return path


def test_auto_cuts_one_crop_per_figure_even_across_a_cell_boundary(tmp):
    # top row: one figure in its cell, one straddling the vertical centre line x=400
    src = sheet(tmp, [(60, 50), (330, 60), (80, 450), (560, 460)])
    outdir = os.path.join(tmp, 'cells')
    assert lineclean.slice_sheet(src, outdir, 2, 2, 0.02) == 'auto'
    crops = [Image.open(os.path.join(outdir, f'cell_{i}.png')) for i in range(4)]
    for crop in crops:
        assert len(lineclean.ink_blobs(crop)) == 1, 'exactly one figure per crop'
        assert crop.width >= 140 and crop.height >= 300, f'figure cut: {crop.size}'
    assert crops[1].width < 400, 'the straddling figure is not glued to a neighbour'


def test_auto_keeps_small_pieces_with_the_nearest_figure(tmp):
    src = sheet(tmp, [(60, 50), (460, 60), (80, 450), (560, 460)])
    img = Image.open(src)
    d = ImageDraw.Draw(img)
    for x in (230, 250):                     # two small 'birds' just right of the first figure
        d.line([x, 200, x + 8, 195], fill=0, width=3)
    img.save(src)
    outdir = os.path.join(tmp, 'cells')
    assert lineclean.slice_sheet(src, outdir, 2, 2, 0.02) == 'auto'
    first = Image.open(os.path.join(outdir, 'cell_0.png')).convert('L')
    # the figure alone is 140px wide (x 60..200); the birds reach x=258
    assert first.width >= 258 - 60, f'the birds came along: width {first.width}'
    assert min(first.crop((first.width - 30, 0, first.width, first.height)).getdata()) < 100, 'bird ink is kept'


def test_auto_falls_back_to_the_grid_when_the_figure_count_is_off(tmp):
    src = sheet(tmp, [(60, 50), (460, 60), (80, 450)])
    outdir = os.path.join(tmp, 'cells')
    assert lineclean.slice_sheet(src, outdir, 2, 2, 0.0) == 'grid'
    assert [Image.open(os.path.join(outdir, f'cell_{i}.png')).size for i in range(4)] == [(400, 400)] * 4


def test_bad_input_exits_non_zero(tmp):
    assert lineclean.main(['plate', os.path.join(tmp, 'missing.png'), os.path.join(tmp, 'x.png')]) == 1


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            with tempfile.TemporaryDirectory() as tmp:
                fn(tmp)
            print('ok', name)

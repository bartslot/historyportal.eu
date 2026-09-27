"""Part-ID render -> clean black line drawing on white: a line wherever the part colour changes."""
import sys
import numpy as np
from PIL import Image, ImageFilter

LINE_PX = 5   # stroke width at 2560 px wide


def lines(ids: Image.Image) -> Image.Image:
    a = np.asarray(ids.convert("RGB")).astype(np.int32)
    key = a[..., 0] * 65536 + a[..., 1] * 256 + a[..., 2]
    edge = np.zeros(key.shape, bool)
    edge[:, 1:] |= key[:, 1:] != key[:, :-1]
    edge[1:, :] |= key[1:, :] != key[:-1, :]
    e = Image.fromarray((edge * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(LINE_PX))
    return Image.fromarray(255 - np.asarray(e))


if __name__ == "__main__":
    lines(Image.open(sys.argv[1])).save(sys.argv[2])

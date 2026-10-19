"""Background plate for the diorama: the painting with its ships and boats inpainted away (OpenCV Telea, free,
local), plus a smooth depth (sky -> horizon -> near sea). The diorama cuts its stretched triangles at object
edges; the holes then show this plate instead of a rubber-sheet smear.

Usage: python3 tools/make_plate.py <painting.jpg> <depth_dav2.png>   (writes public/assets/vroom_plate*.webp)
"""
import sys
from pathlib import Path
import cv2
import numpy as np

OUT = Path(__file__).resolve().parent.parent / "public" / "assets"
W = 1280  # the plate only shows through holes and far away: low res is fine

img = cv2.imread(sys.argv[1])
h = round(img.shape[0] * W / img.shape[1])
img = cv2.resize(img, (W, h), interpolation=cv2.INTER_AREA)
depth = cv2.resize(cv2.imread(sys.argv[2], cv2.IMREAD_GRAYSCALE), (W, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255

# background depth = per-row low percentile (sea and sky dominate each row), smoothed down the rows
row = np.percentile(depth, 25, axis=1)
row = cv2.GaussianBlur(row.reshape(-1, 1), (1, 0), sigmaX=0, sigmaY=6).ravel()
bg_depth = np.repeat(row[:, None], W, axis=1)

objects = (depth - bg_depth) > 0.06
mask = cv2.dilate(objects.astype(np.uint8) * 255, np.ones((25, 25), np.uint8))
# big holes inpaint cleanly only at low resolution; the result is soft haze anyway
SMALL = (320, round(320 * h / W))
small = cv2.inpaint(cv2.resize(img, SMALL, interpolation=cv2.INTER_AREA), cv2.resize(mask, SMALL), 6, cv2.INPAINT_TELEA)
soft = cv2.GaussianBlur(cv2.resize(small, (W, h), interpolation=cv2.INTER_CUBIC), (0, 0), 3.0)
m = cv2.GaussianBlur(mask, (0, 0), 6)[..., None].astype(np.float32) / 255
plate = (img * (1 - m) + soft * m).astype(np.uint8)

cv2.imwrite(str(OUT / "vroom_plate.webp"), plate, [cv2.IMWRITE_WEBP_QUALITY, 78])
d = cv2.resize((bg_depth * 255).astype(np.uint8), (512, round(512 * h / W)), interpolation=cv2.INTER_AREA)
cv2.imwrite(str(OUT / "vroom_plate_depth.webp"), d, [cv2.IMWRITE_WEBP_QUALITY, 95])
cv2.imwrite(str(Path(sys.argv[1]).with_name("plate_mask.png")), mask)
print("plate", plate.shape, "objects", round(float(objects.mean()) * 100, 1), "%")

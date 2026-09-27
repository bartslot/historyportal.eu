"""Facts, not just invariants: at the house anchors a line keeps full ink at 3 m and 35% at 40 m."""
import unittest

import numpy as np
from PIL import Image

import depth_lines as dl


class FarFractionTest(unittest.TestCase):
    def test_anchors(self):
        t = dl.far_fraction(np.array([1.0, 3.0, 40.0, 500.0]))
        np.testing.assert_allclose(t, [0.0, 0.0, 1.0, 1.0])

    def test_log_spacing_midpoint(self):
        # geometric mean of 3 and 40 m sits halfway
        self.assertAlmostEqual(float(dl.far_fraction(np.array([np.sqrt(3 * 40)]), gamma=1.0)[0]), 0.5, places=6)


class InkTest(unittest.TestCase):
    def test_black_line_at_40m_keeps_35_percent(self):
        gray = np.array([0.0])
        out = dl.fade_ink(gray, dl.ink_opacity(np.array([1.0])))
        self.assertAlmostEqual(float(out[0]), 255 * 0.65, places=3)

    def test_paper_is_untouched(self):
        self.assertEqual(float(dl.fade_ink(np.array([255.0]), np.array([0.2]))[0]), 255.0)

    def test_silhouette_takes_the_nearer_depth(self):
        # left half 4 m wall, right half 40 m street: pixels just right of the edge read as the wall
        z = np.full((10, 20), 40.0, np.float32); z[:, :10] = 4.0
        np.save("/tmp/_dl_test.npy", z)
        zz = dl.load_depth("/tmp/_dl_test.npy", (20, 10))
        self.assertEqual(float(zz[5, 11]), 4.0)
        self.assertEqual(float(zz[5, 19]), 40.0)

    def test_adjust_leaves_colour_wash_alone(self):
        img = Image.new("RGB", (4, 1), (230, 210, 170))   # light wash, not ink
        z = np.full((1, 4), 40.0, np.float32); np.save("/tmp/_dl_test2.npy", z)
        out = dl.adjust(img, dl.load_depth("/tmp/_dl_test2.npy", (4, 1)), 0.35, 3, 40)
        self.assertEqual(out.getpixel((0, 0)), (230, 210, 170))


if __name__ == "__main__":
    unittest.main()

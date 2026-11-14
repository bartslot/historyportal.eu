import numpy as np

from thin_pieces import lying_on


def canvas():
    tunic = np.zeros((120, 120), np.float32)
    tunic[10:110, 10:110] = 1
    cord = np.zeros_like(tunic)
    cord[0:80, 58:62] = 1              # a cord from the belt down across the tunic
    tunic[cord > 0] = 0
    apron = np.zeros_like(tunic)
    apron[60:100, 20:50] = 1           # a wide apron on it: no accessory
    tunic[apron > 0] = 0
    return {'tunic': tunic, 'rope': cord, 'apron': apron}


def test_a_cord_across_the_tunic_counts_as_tunic():
    extra = lying_on(canvas(), core_px=6)
    assert extra['tunic'][40, 60] and extra['tunic'][70, 59]


def test_a_wide_area_on_the_tunic_stays_its_own():
    extra = lying_on(canvas(), core_px=6)
    assert not extra['tunic'][80, 35]
    assert not extra['apron'].any() and not extra['rope'].any()

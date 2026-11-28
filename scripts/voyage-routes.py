#!/usr/bin/env python3
"""
voyage-routes.py: keep Time-Map voyages on the right ground, ships at sea and armies on land.

Bart, 2026-11-26, on Napoleon's route: "ships going through islands and from paris over land".
The routes in resources/js/timemap/voyages.json were hand-placed waypoints with a spline between
them, so a sea leg went straight through Sardinia and Corsica, and the stretch from Paris to
Toulon had no leg at all, which the map draws as a ship sailing across France.

  check [id]                 every stretch of every leg that runs on the wrong ground (a ship on
                             land, a horse at sea), and every stretch no leg covers. Measured on
                             the SAME Catmull-Rom curve the map draws (voyages.js smooth()).
  sea <id> <i> [--via lon,lat ...]
                             route the stretch waypoint i -> i+1 through open water with
                             searoute (Eurostat's MARNET sea-lane network, a maintained package),
                             through the given via points in order. A via point is how a route is
                             kept historical: a sailing fleet called where it called, not where a
                             modern lane goes. The new points are inserted after i, and every leg
                             index and label_at after it shifts with them.
  land <id> <i> --via lon,lat ...
                             insert overland waypoints (towns the road went through) after i.
  grid                       rebuild public/map-chart/sea-grid.bin, the land mask the browser routes
                             ships with (resources/js/timemap/sea-route.js). A lesson keeps its own
                             copy of a route, and a teacher can drag one over an island; the player
                             and the editor send any ship stretch that crosses land round it.

Waypoints are the source of truth; this writes voyages.json in place with its own formatting
(json indent 2, which round-trips the file byte for byte). Land is public/map-chart/land.geojson,
the land the chart draws.

  pip install shapely searoute
  python3 scripts/voyage-routes.py check napoleon-1796
  python3 scripts/voyage-routes.py sea napoleon-1796 10 --via 9.6,43.1 --via 12.2,38.2
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from shapely.geometry import LineString, Point, shape
from shapely.ops import unary_union
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parent.parent
VOYAGES = ROOT / 'resources/js/timemap/voyages.json'
LAND = ROOT / 'public/map-chart/land.geojson'
GRID = ROOT / 'public/map-chart/sea-grid.bin'
# sea-grid.bin: two land masks of GRID_RES degree cells. 'shore': the cell's centre is on land, what
# a drawn route is measured against. 'solid': its four corners and its centre all are, the only cells
# a ship can never enter, so a strait narrower than a cell (the Bosphorus, the Dardanelles) stays open
# at a cost. Format: ASCII 'SG2', a uint8 cells-per-degree, uint16 cols, uint16 rows (little endian),
# then shore and then solid, each per row from 90N down: a uint16 run count and that many uint16 runs,
# alternating water/land, starting with water.
GRID_RES = 0.125

SAMPLES_PER_SEGMENT = 18  # voyages.js SAMPLES_PER_SEGMENT
LAND_TRANSPORTS = {'horse', 'camel'}  # transports.json terrain: land
# A stretch is reported when more than this much of it is on the wrong ground. Ports sit on the
# shore and the chart's coast is generalised, so a few km at each end is normal.
TOLERANCE_KM = 25
PORT_KM = 30
# Points kept from a searoute path: Douglas-Peucker in degrees. The map's spline rounds the rest.
SIMPLIFY_DEG = 0.12
SNAP_KM = 40
# Passages a historical ship could not take. searoute can close Suez (1869), Panama (1914) and the
# Northwest Passage itself; it has no switch for the Corinth (1893) and Kiel (1895) canals, so a
# path through either box is refused and the stretch needs a via point round the long way.
CLOSED_PASSAGES = ['suez', 'panama', 'northwest']
CANALS = {'Corinth canal': (22.9, 37.85, 23.05, 38.0), 'Kiel canal': (9.1, 53.85, 10.2, 54.4)}


def load_land():
    feats = json.loads(LAND.read_text())['features']
    return prep(unary_union([shape(f['geometry']) for f in feats]))


def smooth(points, per=SAMPLES_PER_SEGMENT):
    """Centripetal Catmull-Rom, the same as resources/js/timemap/voyages.js smooth()."""
    if len(points) < 3:
        return [list(p) for p in points]
    pt = lambda i: points[max(0, min(len(points) - 1, i))]
    knot = lambda t, a, b: t + (math.hypot(b[0] - a[0], b[1] - a[1]) or 1e-6) ** 0.5
    out = [list(points[0])]
    for i in range(len(points) - 1):
        p0, p1, p2, p3 = pt(i - 1), pt(i), pt(i + 1), pt(i + 2)
        t0 = 0
        t1 = knot(t0, p0, p1)
        t2 = knot(t1, p1, p2)
        t3 = knot(t2, p2, p3)
        for s in range(1, per + 1):
            t = t1 + (t2 - t1) * s / per

            def lerp(a, b, ta, tb):
                d = (tb - ta) or 1e-6
                return [((tb - t) / d) * a[k] + ((t - ta) / d) * b[k] for k in (0, 1)]

            a1, a2, a3 = lerp(p0, p1, t0, t1), lerp(p1, p2, t1, t2), lerp(p2, p3, t2, t3)
            b1, b2 = lerp(a1, a2, t0, t2), lerp(a2, a3, t1, t3)
            out.append(lerp(b1, b2, t1, t2))
    return out


def km(a, b):
    return math.hypot((b[0] - a[0]) * math.cos(math.radians((a[1] + b[1]) / 2)), b[1] - a[1]) * 111.32


def wrap(lon):
    return ((lon + 180) % 360) - 180


def leg_for(v, x):
    for leg in v.get('legs', []):
        a, b = sorted(leg['wp'])
        if a - 1e-6 <= x <= b + 1e-6:
            return leg
    return None


def check(data, land, only=None):
    bad = 0
    for v in data['voyages']:
        if only and v['id'] != only:
            continue
        wp = v['waypoints']
        curve = smooth(wp)
        for i in range(len(wp) - 1):
            leg = leg_for(v, i + 0.5)
            if leg is None and v.get('legs'):
                print(f"{v['id']:18} wp{i}->{i + 1}  no leg covers this stretch (drawn as a ship)")
                bad += 1
                continue
            by_land = (leg or {}).get('transport') in LAND_TRANSPORTS
            seg = curve[i * SAMPLES_PER_SEGMENT:(i + 1) * SAMPLES_PER_SEGMENT + 1]
            lengths = [km(a, b) for a, b in zip(seg, seg[1:])]
            total = sum(lengths)
            wrong = run = 0.0
            for (a, b), d in zip(zip(seg, seg[1:]), lengths):
                run += d
                # A port is on the shore, and an island call is on the island: the first and last
                # PORT_KM of a stretch may touch the other ground.
                if run - d / 2 < PORT_KM or run - d / 2 > total - PORT_KM:
                    continue
                if land.contains(Point(wrap((a[0] + b[0]) / 2), (a[1] + b[1]) / 2)) != by_land:
                    wrong += d
            if wrong > TOLERANCE_KM:
                what = 'on sea' if by_land else 'over land'
                print(f"{v['id']:18} wp{i}->{i + 1}  {(leg or {}).get('transport', 'sea'):6} "
                      f"{wrong:5.0f} of {total:5.0f} km {what}   {wp[i]} -> {wp[i + 1]}")
                bad += 1
    print(f"{bad} stretch(es) to fix" if bad else 'every stretch is on the right ground')
    return bad


def insert_after(v, i, pts):
    k = len(pts)
    if not k:
        return
    v['waypoints'][i + 1:i + 1] = [[round(p[0], 2), round(p[1], 2)] for p in pts]
    for leg in v.get('legs', []):
        leg['wp'] = [w + k if w > i else w for w in leg['wp']]
    if isinstance(v.get('label_at'), int) and v['label_at'] > i:
        v['label_at'] += k


def crosses_land(land, p, q):
    line = LineString([(wrap(p[0]), p[1]), (wrap(p[0]) + (q[0] - p[0]), q[1])])
    return land.intersects(line)


def drop_spurs(pts):
    """searoute snaps each end to the nearest lane node, so a via point comes out as a there-and-back
    spur. A point the path turns back at by more than about 125 degrees is one of those: drop it."""
    out = list(pts)
    changed = True
    while changed and len(out) > 2:
        changed = False
        for i in range(1, len(out) - 1):
            a, b, c = out[i - 1], out[i], out[i + 1]
            u = (b[0] - a[0], b[1] - a[1])
            w = (c[0] - b[0], c[1] - b[1])
            nu, nw = math.hypot(*u), math.hypot(*w)
            if nu < 1e-9 or nw < 1e-9 or (u[0] * w[0] + u[1] * w[1]) / (nu * nw) < -0.6:
                del out[i]
                changed = True
                break
    return out


def sea_path(a, b, vias, land):
    """Open water from a to b through the via points. A stretch that is already clear of land stays
    a straight line (the map's spline rounds it); only a stretch that crosses land is routed."""
    import searoute as sr

    stops = [a, *vias, b]
    out = [list(a)]
    for p, q in zip(stops, stops[1:]):
        if not crosses_land(land, p, q):
            out.append(list(q))
            continue
        shift = p[0] - wrap(p[0])
        r = sr.searoute([wrap(p[0]), p[1]], [wrap(q[0]), q[1]], append_orig_dest=True,
                        restrictions=CLOSED_PASSAGES)
        coords = r.geometry['coordinates'][1:]
        for name, (x0, y0, x1, y1) in CANALS.items():
            if any(x0 <= x <= x1 and y0 <= y <= y1 for x, y in coords):
                raise SystemExit(f'{p} -> {q} goes through the {name}, which did not exist yet: add a --via')
        # The lane network starts and ends at its nearest node, which can lie a little past either
        # end: kept, it draws a hook out and back at every port. Points that close are dropped.
        coords = [c for c in coords[:-1] if min(km(c, p), km(c, q)) > SNAP_KM] + coords[-1:]
        prev = out[-1][0]
        for x, y in coords:
            x = x + shift
            while x - prev > 180:
                x -= 360
            while prev - x > 180:
                x += 360
            out.append([x, y])
            prev = x
        out[-1] = list(q)
    line = LineString(drop_spurs(out)).simplify(SIMPLIFY_DEG, preserve_topology=False)
    return drop_spurs([list(c) for c in line.coords])


def build_grid():
    import struct

    import numpy as np
    from shapely import contains_xy

    feats = json.loads(LAND.read_text())['features']
    land = unary_union([shape(f['geometry']) for f in feats])
    per = round(1 / GRID_RES)
    cols, rows = 360 * per, 180 * per
    lon = -180 + np.arange(cols + 1) * GRID_RES
    lat = 90 - np.arange(rows + 1) * GRID_RES
    gx, gy = np.meshgrid(lon, lat)
    corner = contains_xy(land, gx, gy)
    cx, cy = np.meshgrid(lon[:-1] + GRID_RES / 2, lat[:-1] - GRID_RES / 2)
    centre = contains_xy(land, cx, cy)
    solid = centre & corner[:-1, :-1] & corner[:-1, 1:] & corner[1:, :-1] & corner[1:, 1:]
    out = bytearray(b'SG2' + struct.pack('<BHH', per, cols, rows))
    for row in [*centre, *solid]:
        runs, cur, n = [], False, 0
        for v in row:
            if bool(v) == cur:
                n += 1
            else:
                runs.append(n)
                cur, n = bool(v), 1
        runs.append(n)
        out += struct.pack(f'<H{len(runs)}H', len(runs), *runs)
    GRID.write_bytes(bytes(out))
    print(f'{GRID.relative_to(ROOT)}: {cols}x{rows}, {centre.mean() * 100:.1f}% land, {len(out) / 1024:.0f} KB')


def parse_via(vals):
    return [[float(x) for x in s.split(',')] for s in (vals or [])]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('check')
    c.add_argument('id', nargs='?')
    sub.add_parser('grid')
    for name in ('sea', 'land'):
        s = sub.add_parser(name)
        s.add_argument('id')
        s.add_argument('i', type=int)
        s.add_argument('--via', action='append')
        s.add_argument('--dry', action='store_true')
    args = ap.parse_args()

    if args.cmd == 'grid':
        return build_grid()
    data = json.loads(VOYAGES.read_text())
    land = load_land()
    if args.cmd == 'check':
        raise SystemExit(1 if check(data, land, args.id) else 0)

    v = next(x for x in data['voyages'] if x['id'] == args.id)
    a, b = v['waypoints'][args.i], v['waypoints'][args.i + 1]
    vias = parse_via(args.via)
    pts = sea_path(a, b, vias, land)[1:-1] if args.cmd == 'sea' else vias
    print(f"{args.id} wp{args.i}->{args.i + 1}: inserting {len(pts)} point(s)")
    for p in pts:
        print(f"  [{p[0]:.2f}, {p[1]:.2f}]")
    if args.dry:
        return
    insert_after(v, args.i, pts)
    VOYAGES.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    check(data, land, args.id)


if __name__ == '__main__':
    main()

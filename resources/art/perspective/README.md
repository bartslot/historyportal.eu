# House perspective standard `hp1`

Every history-line asset is drawn to ONE camera, so figures, furniture, props and rooms fit
together without hand-tuning. The grids here are sent as reference image 1 with every generation,
and each generated asset is checked against them (horizon and vanishing points within 3%).

## Camera
- Eye height **1.60 m** (standing adult), always eye level. High/low angles come later as `hp2`, `hp3`.
- Horizon on the **upper third** of a 16:9 frame (y = 480 of 1440).
- Lens **28 mm equivalent**, ~65° horizontal (focal 2009 px at 2560 wide). Nearest visible floor
  ≈ 3.35 m, so interiors work. (The first AI rooms measured ~92°: too wide, visibly distorted.)

## Backdrops (the room decides the vanishing points)
| Code | Perspective | Vanishing points | Use |
|---|---|---|---|
| `R1` | one-point | centre of the horizon | streets, halls, corridors |
| `R2` | two-point, 45° corner | on the horizon at ±2009 px from centre (±0.78 W) | room corners, squares, buildings at an angle |
| `L0` | horizon only | none | landscapes, battlefields, sea |

Rooms are drawn **empty** (architecture and floor only). Furniture comes with the set piece.

## Figures, set pieces, props (each declares one view)
| Code | Turned | Use |
|---|---|---|
| `F` | 0°, facing camera | portraits, speakers |
| `Q` | 35° three-quarter (mirror = other side) | default for figures and set pieces |
| `P` | 90° profile (mirror = other side) | walking, riding, processions |

Every asset records `perspective: "hp1/<view>/<backdrop-compat>"`, its real height in metres and
its anchors. The composer only combines compatible assets; scale follows from the floor grid.

## Files
`make_grids.py` → `grid-hp1-R1.png`, `grid-hp1-R2.png`, `grid-hp1-L0.png` (2560×1440).
Reference figures are 1.70 m at the depths printed next to them.

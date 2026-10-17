// Generated from the old static page (ids, ranges and defaults unchanged: the engine binds to these ids).
import { __ } from './i18n'
export type Control =
  | { type: 'range'; id: string; label: string; min: number; max: number; step: number; default: number }
  | { type: 'toggle'; id: string; label: string; default: boolean }
  | { type: 'select'; id: string; label: string; options: [string, string][]; default: string }

export const ADVANCED: { group: string; controls: Control[] }[] = [
  {
    "group": "Look",
    "controls": [
      {
        "type": "toggle",
        "id": "lookOn",
        "default": true,
        "label": __("On (2D and 3D alike)")
      },
      {
        "type": "toggle",
        "id": "lookToon",
        "default": true,
        "label": __("Toon shading on 3D")
      },
      {
        "type": "range",
        "id": "lookBend",
        "min": 0.0,
        "max": 2.0,
        "step": 0.05,
        "default": 0.8,
        "label": __("Hand-made bend")
      },
      {
        "type": "range",
        "id": "lookWash",
        "min": 0.0,
        "max": 5.0,
        "step": 1.0,
        "default": 2.0,
        "label": __("Wash")
      },
      {
        "type": "range",
        "id": "lookWobble",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": __("Line wobble")
      },
      {
        "type": "range",
        "id": "lookInk",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.9,
        "label": __("Ink")
      },
      {
        "type": "range",
        "id": "lookInkOpacity",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.85,
        "label": __("Ink opacity")
      },
      {
        "type": "select",
        "id": "lookInkBlend",
        "label": __("Ink blend"),
        "options": [
          [
            "0",
            __("Normal")
          ],
          [
            "1",
            __("Multiply")
          ],
          [
            "2",
            __("Pencil")
          ]
        ],
        "default": "2"
      },
      {
        "type": "range",
        "id": "lookPaintOver",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.3,
        "label": __("Paint over lines")
      },
      {
        "type": "range",
        "id": "lookInkDark",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 1.0,
        "label": __("Ink darkness")
      },
      {
        "type": "select",
        "id": "lookInkColor",
        "label": "Ink colour",
        "options": [
          [
            "blue-grey",
            "Blue-grey"
          ],
          [
            "pencil",
            "Pencil brown"
          ],
          [
            "sepia",
            "Sepia"
          ],
          [
            "graphite",
            "Graphite"
          ]
        ],
        "default": "blue-grey"
      },
      {
        "type": "range",
        "id": "lookOutline",
        "min": 1.0,
        "max": 3.0,
        "step": 0.1,
        "default": 1.6,
        "label": __("Outline weight")
      },
      {
        "type": "range",
        "id": "lookWidth",
        "min": 0.6,
        "max": 3.0,
        "step": 0.1,
        "default": 1.1,
        "label": __("Line width")
      },
      {
        "type": "range",
        "id": "lookNear",
        "min": 3.0,
        "max": 60.0,
        "step": 1.0,
        "default": 14.0,
        "label": __("Full lines up to (m)")
      },
      {
        "type": "range",
        "id": "lookFarInk",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.3,
        "label": __("Far line strength")
      },
      {
        "type": "range",
        "id": "lookColorInk",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.45,
        "label": __("Lines in images")
      },
      {
        "type": "range",
        "id": "lookWet",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.7,
        "label": __("Wet edges")
      },
      {
        "type": "range",
        "id": "lookStains",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.8,
        "label": __("Stains")
      },
      {
        "type": "range",
        "id": "lookBlooms",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": __("Blooms")
      },
      {
        "type": "range",
        "id": "lookDark",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": __("Dark pigment")
      },
      {
        "type": "range",
        "id": "lookGrain",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.7,
        "label": __("Granulation")
      },
      {
        "type": "range",
        "id": "lookTex",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.6,
        "label": __("Own texture")
      },
      {
        "type": "range",
        "id": "lookTexScale",
        "min": 0.5,
        "max": 20.0,
        "step": 0.5,
        "default": 4.0,
        "label": __("Texture size (m)")
      },
      {
        "type": "select",
        "id": "lookBlend",
        "label": __("Blend"),
        "options": [
          [
            "0",
            __("Multiply")
          ],
          [
            "1",
            __("Overlay")
          ],
          [
            "2",
            __("Soft light")
          ]
        ],
        "default": "0"
      },
      {
        "type": "select",
        "id": "lookPaletteMode",
        "label": __("Palette"),
        "options": [
          [
            "0",
            __("Natural")
          ],
          [
            "1",
            __("Indigo night")
          ],
          [
            "2",
            __("Sepia")
          ]
        ],
        "default": "0"
      },
      {
        "type": "range",
        "id": "lookPalette",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.85,
        "label": __("Palette strength")
      },
      {
        "type": "range",
        "id": "lookPaper",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.5,
        "label": __("Paper")
      },
      {
        "type": "range",
        "id": "lookEdge",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": __("Paper edge")
      }
    ]
  },
  {
    "group": "Clouds",
    "controls": [
      {
        "type": "select",
        "id": "cloudSource",
        "label": __("Source"),
        "options": [
          [
            "volume",
            __("Volumetric cumulus (Ghibli)")
          ],
          [
            "cumulus",
            __("Comic cumulus (sunlit)")
          ],
          [
            "procedural",
            __("Watercolour (metaballs)")
          ],
          [
            "painted",
            __("Painted (PNG)")
          ]
        ],
        "default": "volume"
      },
      {
        "type": "range",
        "id": "cloudLines",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.8,
        "label": __("Cloud ink")
      },
      {
        "type": "range",
        "id": "cloudGlow",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": __("Sun glow")
      },
      {
        "type": "range",
        "id": "cloudBands",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.5,
        "label": __("Cloud bands")
      },
      {
        "type": "range",
        "id": "cloudVolume",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.65,
        "label": __("Cloud volume")
      },
      {
        "type": "select",
        "id": "cloudShot",
        "label": __("Shot"),
        "options": [
          [
            "normal",
            __("Normal (thin)")
          ],
          [
            "cinematic",
            __("Cinematic (puffy)")
          ],
          [
            "mixed",
            __("Mixed")
          ]
        ],
        "default": "normal"
      }
    ]
  },
  {
    "group": "Backdrop",
    "controls": [
      {
        "type": "toggle",
        "id": "bd-hills",
        "default": true,
        "label": __("Hills (230 m)")
      },
      {
        "type": "toggle",
        "id": "bd-town",
        "default": true,
        "label": __("Town (125 m)")
      },
      {
        "type": "toggle",
        "id": "bd-trees",
        "default": true,
        "label": __("Tree line (72 m)")
      },
      {
        "type": "range",
        "id": "bdPale",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.0,
        "label": __("Distance paleness")
      }
    ]
  },
  {
    "group": "Ground",
    "controls": [
      {
        "type": "toggle",
        "id": "grid",
        "default": true,
        "label": __("Grid on ground")
      }
    ]
  },
  {
    "group": "Town",
    "controls": [
      {
        "type": "range",
        "id": "citySize",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.35,
        "label": __("City size")
      },
      {
        "type": "toggle",
        "id": "cityWall",
        "default": true,
        "label": __("Town wall")
      }
    ]
  }
]

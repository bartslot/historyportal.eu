// Generated from the old static page (ids, ranges and defaults unchanged: the engine binds to these ids).
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
        "label": "On (2D and 3D alike)"
      },
      {
        "type": "toggle",
        "id": "lookToon",
        "default": true,
        "label": "Toon shading on 3D"
      },
      {
        "type": "range",
        "id": "lookBend",
        "min": 0.0,
        "max": 2.0,
        "step": 0.05,
        "default": 0.8,
        "label": "Hand-made bend"
      },
      {
        "type": "range",
        "id": "lookWash",
        "min": 0.0,
        "max": 5.0,
        "step": 1.0,
        "default": 2.0,
        "label": "Wash"
      },
      {
        "type": "range",
        "id": "lookWobble",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": "Line wobble"
      },
      {
        "type": "range",
        "id": "lookInk",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.9,
        "label": "Ink"
      },
      {
        "type": "range",
        "id": "lookInkOpacity",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.85,
        "label": "Ink opacity"
      },
      {
        "type": "select",
        "id": "lookInkBlend",
        "label": "Ink blend",
        "options": [
          [
            "0",
            "Normal"
          ],
          [
            "1",
            "Multiply"
          ],
          [
            "2",
            "Pencil"
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
        "label": "Paint over lines"
      },
      {
        "type": "range",
        "id": "lookInkDark",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 1.0,
        "label": "Ink darkness"
      },
      {
        "type": "range",
        "id": "lookOutline",
        "min": 1.0,
        "max": 3.0,
        "step": 0.1,
        "default": 1.6,
        "label": "Outline weight"
      },
      {
        "type": "range",
        "id": "lookWidth",
        "min": 0.6,
        "max": 3.0,
        "step": 0.1,
        "default": 1.1,
        "label": "Line width"
      },
      {
        "type": "range",
        "id": "lookNear",
        "min": 3.0,
        "max": 60.0,
        "step": 1.0,
        "default": 14.0,
        "label": "Full lines up to (m)"
      },
      {
        "type": "range",
        "id": "lookFarInk",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.3,
        "label": "Far line strength"
      },
      {
        "type": "range",
        "id": "lookColorInk",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.45,
        "label": "Lines in images"
      },
      {
        "type": "range",
        "id": "lookWet",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.7,
        "label": "Wet edges"
      },
      {
        "type": "range",
        "id": "lookStains",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.8,
        "label": "Stains"
      },
      {
        "type": "range",
        "id": "lookBlooms",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": "Blooms"
      },
      {
        "type": "range",
        "id": "lookDark",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": "Dark pigment"
      },
      {
        "type": "range",
        "id": "lookGrain",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.7,
        "label": "Granulation"
      },
      {
        "type": "range",
        "id": "lookTex",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.6,
        "label": "Own texture"
      },
      {
        "type": "range",
        "id": "lookTexScale",
        "min": 0.5,
        "max": 20.0,
        "step": 0.5,
        "default": 4.0,
        "label": "Texture size (m)"
      },
      {
        "type": "select",
        "id": "lookBlend",
        "label": "Blend",
        "options": [
          [
            "0",
            "Multiply"
          ],
          [
            "1",
            "Overlay"
          ],
          [
            "2",
            "Soft light"
          ]
        ],
        "default": "0"
      },
      {
        "type": "select",
        "id": "lookPaletteMode",
        "label": "Palette",
        "options": [
          [
            "0",
            "Natural"
          ],
          [
            "1",
            "Indigo night"
          ],
          [
            "2",
            "Sepia"
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
        "label": "Palette strength"
      },
      {
        "type": "range",
        "id": "lookPaper",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.5,
        "label": "Paper"
      },
      {
        "type": "range",
        "id": "lookEdge",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": "Paper edge"
      }
    ]
  },
  {
    "group": "Clouds",
    "controls": [
      {
        "type": "select",
        "id": "cloudSource",
        "label": "Source",
        "options": [
          [
            "volume",
            "Volumetric cumulus (Ghibli)"
          ],
          [
            "cumulus",
            "Comic cumulus (sunlit)"
          ],
          [
            "procedural",
            "Watercolour (metaballs)"
          ],
          [
            "painted",
            "Painted (PNG)"
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
        "label": "Cloud ink"
      },
      {
        "type": "range",
        "id": "cloudGlow",
        "min": 0.0,
        "max": 1.5,
        "step": 0.05,
        "default": 0.6,
        "label": "Sun glow"
      },
      {
        "type": "range",
        "id": "cloudBands",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.5,
        "label": "Cloud bands"
      },
      {
        "type": "range",
        "id": "cloudVolume",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.65,
        "label": "Cloud volume"
      },
      {
        "type": "select",
        "id": "cloudShot",
        "label": "Shot",
        "options": [
          [
            "normal",
            "Normal (thin)"
          ],
          [
            "cinematic",
            "Cinematic (puffy)"
          ],
          [
            "mixed",
            "Mixed"
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
        "label": "Hills (230 m)"
      },
      {
        "type": "toggle",
        "id": "bd-town",
        "default": true,
        "label": "Town (125 m)"
      },
      {
        "type": "toggle",
        "id": "bd-trees",
        "default": true,
        "label": "Tree line (72 m)"
      },
      {
        "type": "range",
        "id": "bdPale",
        "min": 0.0,
        "max": 1.0,
        "step": 0.05,
        "default": 0.0,
        "label": "Distance paleness"
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
        "label": "Grid on ground"
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
        "label": "City size"
      },
      {
        "type": "toggle",
        "id": "cityWall",
        "default": true,
        "label": "Town wall"
      }
    ]
  },
  {
    "group": "Publish",
    "controls": [
      {
        "type": "select",
        "id": "publishRes",
        "label": "Video size",
        "options": [
          [
            "720",
            "720p"
          ],
          [
            "1080",
            "1080p"
          ]
        ],
        "default": "1080"
      }
    ]
  }
]

# Credits and licences

## Paintings (public domain)

| File | Work | Source | Licence |
|---|---|---|---|
| `vroom.webp`, `vroom_hd.webp` (+ depth/plate derived from it) | Hendrick Cornelisz Vroom, *De terugkomst in Amsterdam van de tweede expeditie naar Oost-Indië* (The Return to Amsterdam of the Second Expedition to the East Indies), 1599. Rijksmuseum SK-A-2858 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:De_terugkomst_in_Amsterdam_van_de_tweede_expeditie_naar_Oost-Indi%C3%AB,_Hendrik_Cornelisz_Vroom,_1599,_Rijksmuseum_SK-A-2858.jpg), credit line [rijksmuseum.nl/collectie/SK-A-2858](http://www.rijksmuseum.nl/collectie/SK-A-2858) | Public domain (Commons: "pd", not copyrighted) |
| `milkmaid.webp` | Johannes Vermeer, *Het melkmeisje*, c. 1660. Rijksmuseum SK-A-2344 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Johannes_Vermeer_-_Het_melkmeisje_-_rijksmuseum_-_001.jpg) | Public domain |
| `avercamp.webp` | Hendrick Avercamp, *Winterlandschap met schaatsers*, c. 1608. Rijksmuseum SK-A-1718 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Avercamp,_Hendrick_-_Winterlandschap_met_schaatsers_-_SK-A-1718.jpg) | Public domain |
| `swan.webp` | Jan Asselijn, *De bedreigde zwaan*, c. 1650. Rijksmuseum SK-A-4 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:De_bedreigde_zwaan_Rijksmuseum_SK-A-4.jpeg) | CC0 |

Note on the painting: it shows the return of the *second* expedition (Van Neck, 1599), three years before
the VOC was founded (1602) and 43 years before Tasman's first voyage (1642). It is the right era and fleet
type, not literally Tasman's ship. A lesson that needs the exact claim should say so in its
sourced/inferred/invented ledger.

## Derived and made for History Portal

- `world/ship_v4.glb`: the hero VOC ship, built from basic shapes in Blender by `tools/build_ship.py` (2026-10-20);
  its material line tiles `world/ink/{rope2,rope3,rope4,spar2,iron,barrel,sailcloth,flag,tar,crate}_ink.webp` are
  ChatGPT image generation (prompts: vault `Memory/historyportal/assets/museum-intro/v4-ship-detail/textures/PROMPTS.md`).
  It replaces the Sketchfab "dutch ship large" (CC BY 4.0, TegnoGenial) used up to v3.

- `cards/*.webp` + `cards.json`: the painting's other ships and boats cut out as cards. The cut uses a Depth Anything V2
  (ViT-L, Apache 2.0) map from the render PC only as a layout reference (`tools/make_cards.py`).
- `world/{hull,sail,sea,sky}_{paint,lines}.webp`, `world/tasman_paint.webp`, `sil_{point,hat,kid,old}.webp`: ChatGPT image
  generation 2026-10-19 (prompts in the vault: `Memory/historyportal/assets/museum-intro/v2/PROMPT_LOG.md`).
  `sil_teen.webp`: ChatGPT, round 1.
- `world/tasman_lines.webp`, `world/sailor_*.webp`, `world/pieter_looking_up_mast.webp`: History Portal library cut-outs
  (`resources/icons/history-line/figures/tasman/`).
- All wall, wood, floor and sparkle textures are painted in code (canvas).

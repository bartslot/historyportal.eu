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

- `vroom_depth.webp`: Depth Anything V2 (ViT-L, Apache 2.0) on the render PC's ComfyUI, then a grey opening + blur (`tools/prepare_assets.py`).
- `vroom_plate*.webp`: the painting with ships inpainted away (OpenCV Telea) and a smooth row depth (`tools/make_plate.py`).
- `sil_1..7.webp`: museum visitor silhouettes, ChatGPT image generation (2026-10-19), owned by History Portal.
- `tasman.webp`: Abel Tasman cut-out `resources/icons/history-line/figures/tasman/tasman_side.webp` from the History Portal library.
- All wall, wood, floor and sparkle textures are painted in code (canvas).

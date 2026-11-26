# Credits and attribution

Sources the map and the lessons draw on, and what each one asks for in return.

The short forms that appear on the map's own attribution control are in
`resources/js/timemap/index.js` and `resources/js/map-imagery.js`. This file is the long form —
where a licence asks for particular wording, the wording is here, verbatim.

## NASA Global Imagery Browse Services (GIBS)

Used twice, for two different things:

- **Blue Marble, shaded relief and bathymetry** — the globe's ground imagery, served live as raster
  tiles (`map-imagery.js`).
- **MODIS Terra corrected reflectance, true colour** — six patches of open ocean, harvested once and
  reduced to a cloud-coverage atlas (`scripts/build-cloud-patches.mjs`,
  `scripts/build-cloud-atlas.mjs`, shipped as `public/img/map/cloud-patches.webp`). This is the
  cloud deck's source.

GIBS imagery is in the public domain, with no restriction on commercial use or on derivative works —
and the atlas is very much a derivative work. NASA asks for an acknowledgement rather than requiring
one. We give it, in full and verbatim:

> We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services
> (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).

On the map itself, where there is room for a line rather than a paragraph, this appears as
`Cloud: NASA EOSDIS GIBS (MODIS)` alongside `Imagery: NASA EOSDIS GIBS (Blue Marble)`.

## Sentinel-2 cloudless

Close-range ground imagery below a few hundred kilometres. Sentinel-2 cloudless (2020) by EOX IT
Services GmbH, from modified Copernicus Sentinel data (2020), served under CC-BY 4.0.

## Cliopatria / Seshat

Historical borders, under CC-BY 4.0.

## OpenStreetMap

Land polygons, released CC0.

## Lets Icons (editor interface icons)

Most of the lesson editor's interface icons in `resources/ui-icons/` are the Light style of
**Lets Icons** by Leonid Tsvetkov ([Figma Community](https://www.figma.com/community/file/886554014393250663)),
drawn here at stroke 1.5 instead of 1. Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
which asks for credit and for changes to be indicated:

> Icons: Lets Icons by Leonid Tsvetkov, CC BY 4.0. Stroke width changed.

The pack has no warning triangle, pause, undo, redo, zoom, eraser, clone stamp, brush, sparkle or
sidebar, and its "text" is a clear-formatting mark: those icons are our own, on the same 24 px grid
and stroke.

## Takram three-geospatial (3D clouds on the globe)

The volumetric clouds on the Time-Map are drawn by **@takram/three-clouds**, with
**@takram/three-atmosphere** and **@takram/three-geospatial**, by Takram
([GitHub](https://github.com/takram-design-engineering/three-geospatial)), MIT licence. The lookup
tables, cloud shape volumes and blue-noise texture in `public/vendor/clouds3d/` are that project's
own files, unchanged. The weather the clouds follow is ours (the NASA cloud cover credited above).

HISTORY PORTAL — SCENE KITS, BATCH 2

Decisions

babylonia-old-babylonian — southern Babylonia, Nippur and its cultivated hinterland, c. 1750 BCE: strongest documented edubba setting for the museum demo around 2026-11-19, linking Sumerian learning, clay tablets, farming and hunting within one dated world.

egypt-old-kingdom — Giza and adjacent Nile floodplain, Fourth Dynasty, c. 2550 BCE: pyramid construction gives Dutch school lessons the clearest entry point into kingship, labour and Nile farming; New Kingdom needs its own later bundle.

rome-imperial-100 — city of Rome and immediate countryside, c. 100 CE, early Trajan: urban street, household and civic kits support more everyday setups than a Republic-only military world.

punic-alps-218 — western Alps, autumn 218 BCE, Hannibal's Second Punic War crossing: separate terrain and chronology prevent Imperial Rome's architecture and equipment leaking into a Republican-era campaign.

“Babylon” here means Babylonia as a region. Nippur is not Babylon city. Label demo “Babylonië: leren schrijven in Nippur, ca. 1750 v.Chr.” Sumerian remains a language of scribal learning in this setting; do not label the school an Early Dynastic Sumerian classroom. A c. 3000 BCE invention-of-writing scene would need a separate Uruk horizon. House F supplies an archaeological reference, not permission to claim every room was a standard purpose-built school. University of Chicago's [Nippur Tablet Project](https://isac.uchicago.edu/research-projects/nippur-tablet-project) documents the school context; ORACC's [Old Babylonian School](https://oracc.museum.upenn.edu/obmc/OldBabylonianSchool/index.html) supports the Sumerian curriculum.

Egypt's period choice is an editorial judgement, not a measured claim that Dutch schools teach one dynasty most. [Schooltv's pyramid teaching material](https://cdn.schooltv.nl/fileadmin/Infoblok/Bovenbouw_PO/2013_d_WO_NTR_404226_venz_piramides.pdf) establishes the school-facing theme; Egypt's [Ministry of Tourism and Antiquities](https://egymonuments.gov.eg/historical-periods/old-kingdom/) anchors pyramid development in the Old Kingdom. Use c. 2550 BCE as a conventional production date, not an exact regnal chronology.

Inventory and reuse

Read KIT-PLAN.md, STYLE.md, prompt-templates.py, existing-bundles.txt and all three supplied job files before planning. Existing inventory has no Egyptian, Roman or Alpine bundle. near-east-neolithic already supplies Euphrates/Nile backgrounds, dry hills, mudbrick houses, barley, dates, reeds, baskets, grain bags, quern, sickle, net, gazelle, tablets and tokens. These cover generic dressing, not a dated Babylonian school. Its ERA spans Neolithic through early Uruk; urban Uruk material cannot silently become c. 1750 BCE material. Exclude bevel-rim bowls, cone-mosaic wall, sunken huts and early tokens-as-school-equipment. Ashurbanipal's seventh-century BCE library at Nineveh, Neo-Babylonian Ishtar Gate and Hanging Gardens imagery are outside this bundle.

Reuse near-east-neolithic/sky-hot-01 for Babylonian and Egyptian exteriors; reuse nl-prehistory/sky-clear-01 for Rome and nl-prehistory/sky-overcast-01 for Alps. These are land-free sky paintings; their pale blue/grey washes fit the proposed palettes. No new sky sheets. Scene integration must resolve these bundle-qualified references through existing library access or explicit registration aliases before production scenes are assembled; no assumption that same asset id exists in every bundle. Existing sky stays sole sky even when hidden indoors.

Inspect near-east-neolithic/river-euphrates-01, palm-date-01, barley-green-01, basket-ne-01, quern-ne-01, bag-grain-01, net-fishing-01 and gazelle-01 for period, ecology and colour before reuse. Available candidates, not guaranteed historically approved assets. Batch supplies essential new dressing, so school and farming setups do not depend on those checks. Optional gazelle may extend hunting setup after audit; omit herd-01 because composition may contain unwanted figures. Existing Nile paintings may support Egypt after geography check, but broad river views do not replace Giza construction or cultivated-bank backdrops. Dutch pine and boulder cut-outs are audit candidates for Alpine margins, not substitutes for the requested mountain screens. Existing woodland field strips belong to northern European ecology. None of these reused pieces receives a silent overwrite.

Construction rules carried forward, with Bart's corrections

Keep history-lines-v1: fixed ink pass then transparent watercolour edit, fixed anchors, line and palette gates from STYLE.md. Distance uses fewer, finer lines and cooler washes, never blur. No new rendering style. Transparencies follow current green-key colour-pass process; skies and ground tiles remain full surfaces. Keep foliage subdued olive rather than key green. Cut gaps, retain opaque wall/terrain surfaces, avoid accidental holes.

Every outdoor kit includes exactly one sky assignment, one non-tiling bg panorama, one seamless top-down ground tile, and one field sheet with TWO non-tiling painted ground strips: deep far surface plus shallow near verge. The field strips carry eye-level recession and scene character; flat ground supplies only the floor beneath. Each field asset has tag ground and height_m >= 2. No extra ground tiles or backdrops stacked to patch a scene. Existing surfaces may be inherited when later kits reuse a setting; all four surface roles still remain assigned. No field strips needed inside a sealed room.

Ground tiles show irregular material patches, plant or grit clusters, worn and unworn areas, tiny organic debris, quiet connecting areas and varied wash density; no uniform procedural noise, conspicuous repeating landmark or large baked shadow. Tile both axes. Each ground asset uses height_m 4 as the supplied jobs' 4 x 4 m footprint convention; earlier plan's zero-datum prose does not override actual job format. Actual placement elevation remains floor zero. Non-ground height_m records full painted asset extent; field values describe represented ground-picture extent, never grass-blade height. Do not shrink field strips to vegetation height; depict low plants only, as field template requires.

Band means flat frontal standing screen, not another receding floor. One to three wide strips, repeat sideways only when tileable_x true. Bg remains non-tiling despite generic template's matching-edge wording. Ground repeats both axes. Field strips never tile. Subjects state width/extent where scaling needs it. Loose objects have generous gutters, clear bases and complete silhouettes, one to six per sheet. No people, riders, hunters, crews, distant crowds or figures baked into any architecture or landscape. Animal props optional only.

All architecture, wall overlays and furniture standing against wall or on flat floor use explicit view front on mid/prop sheets: pure elevation, level baseline, no vanishing points, visible tabletop wedge or tilted legs. Three-quarter allowed only for free-standing outdoor objects where legibility benefits. Field's own eye-level ground recession is deliberate, not a furniture view. No unsupported view values on band, field, bg or fg. Camera level at 1.6 m; widths, opaque coverage and safe lateral/zoom frame checked during later assembly. Interior wall and fixtures share a plane; closed doors and opaque inserts overlay wall, never fake an opening through it.

ERA and PALETTE additions

Proposed additions only: original templates remain unchanged in this task. Register all four keys in ERA and PALETTE before running relevant jobs; batch2 uses two of these new keys. Definitions below match prompt-templates.py dictionary shape. Words denote material colours, not claims about ancient pigments. Shared ink/paper/neutral gate colours remain available. Blue accents in Babylon stay on water, not glazed monumental brick.

```python
ERA = {
    'babylonia-old-babylonian': 'Southern Mesopotamia, Old Babylonian period, Nippur and its agricultural hinterland, c. 1750 BCE; Sumerian scribal learning.',
    'egypt-old-kingdom': 'Egypt, Old Kingdom, Fourth Dynasty, Giza and adjacent Nile floodplain, c. 2550 BCE.',
    'rome-imperial-100': 'Roman Empire, city of Rome and immediate countryside, c. 100 CE, early reign of Trajan.',
    'punic-alps-218': 'Western Alps, autumn 218 BCE, Hannibal crossing during the Second Punic War; exact pass unspecified.',
}
PALETTE = {
    'babylonia-old-babylonian': [
        ('sun-dried mudbrick and silty earth', ['#d0bba0', '#a08a6c']),
        ('pale plaster and dry clay tablets', ['#f5e6ce', '#f4d5a8']),
        ('fired clay vessels and damp clay', ['#b0754f', '#b19f86']),
        ('reed matting, barley straw and weathered timber', ['#e3cf9a', '#7d6752']),
        ('restrained olive reeds and barley leaves', ['#8d9a5b', '#6f7f45']),
        ('muted canal water', ['#98c3d3', '#72a2b5']),
        ('pale transparent sky', ['#d2e6f2', '#a9d7f6']),
    ],
    'egypt-old-kingdom': [
        ('pale limestone and plaster', ['#f5e6ce', '#d2cfc9']),
        ('warm desert sand and sandstone', ['#d0bba0', '#f4d5a8']),
        ('Nile silt and mudbrick', ['#a08a6c', '#b19f86']),
        ('clay vessels and restrained red ochre', ['#b0754f', '#c07b57']),
        ('reeds and crops in restrained olive', ['#8d9a5b', '#6f7f45']),
        ('flax, straw and timber', ['#e3cf9a', '#7d6752']),
        ('muted river water', ['#98c3d3', '#72a2b5']),
        ('pale transparent sky', ['#d2e6f2', '#a9d7f6']),
    ],
    'rome-imperial-100': [
        ('warm brick and terracotta roof tiles', ['#c07b57', '#d79a7a']),
        ('pale travertine and plaster', ['#f5e6ce', '#f4d5a8']),
        ('worn paving and stone shadows', ['#d2cfc9', '#8e8474']),
        ('weathered timber and earth', ['#7d6752', '#b19f86']),
        ('restrained wall-paint red', ['#b0754f', '#c07b57']),
        ('olive foliage and dry verge grass', ['#8d9a5b', '#e3cf9a']),
        ('muted water and blue shadows', ['#98c3d3', '#4a728c']),
        ('pale transparent sky', ['#d2e6f2', '#a9d7f6']),
    ],
    'punic-alps-218': [
        ('cool rock faces and scree', ['#aab1b3', '#8e8474']),
        ('snow in pale cool glaze, never blank cutout holes', ['#f6f5ee', '#d2e6f2']),
        ('distant blue-grey mountain shadows', ['#98c3d3', '#4a728c']),
        ('gravel, soil and weathered timber', ['#b19f86', '#7d6752']),
        ('restrained pine and autumn larch', ['#6f7f45', '#c9a86a']),
        ('dry alpine grass and baggage fibre', ['#e3cf9a', '#a08a6c']),
        ('pale overcast sky', ['#d2e6f2', '#d2cfc9']),
    ],
}
```

Ranked kits per bundle

Ranks apply within each bundle; setup counts are editorial estimates, not additive usage forecasts. “Missing” means absent as a coherent dated kit, even where generic inventory candidates exist.

BABYLONIA-OLD-BABYLONIAN — c. 1750 BCE

1) Tablet-house room — 7 setups: shaping clay, practising wedges, copying signs, Sumerian vocabulary, arithmetic, checking work, storing exercises. Missing: plain plaster/mudbrick back-wall band, lively packed-earth floor, closed door and opaque niche overlays, low stool, reed mat and small tablet support, fresh clay and exercise-tablet props. FIRST BATCH: five sheets. Reuse outdoor sky and backdrop hidden behind opaque wall. Avoid Ashurbanipal, palace-scale shelving, modern desks, papyrus scroll library, ink-written cuneiform and invented readable text. Low furnishing is cautious staging, not a measured House F reconstruction; teaching characters added separately.

2) Irrigated barley margin and working yard — 7 setups: water distribution, sowing, weeding, harvest, threshing, grain tally, basket preparation. Missing: flat alluvial bg, varied silt ground, deep cultivated field strip plus shallow trampled verge, frontal canal-bank and low mudbrick screens, modest closed store frontage and date palm, barley/reed cut-outs, grain/basket/vessel and hand-tool props. FIRST BATCH: eight sheets. Barley near ripe provides one coherent season; other seasons later variants. No modern sluice machinery, shaduf assumed from later Egypt, screw pump, steel spade, vast dry desert without water, blue Ishtar Gate or Uruk cone mosaics. Canal strip is a standing water/bank screen; field supplies receding soil, tile remains sole floor.

3) Canal-edge hunting and resource gathering — 4 setups: tracking at field edge, net preparation, gathering reeds, discussing food sources. Missing: hunting net, plain bow and arrows; more extensive marsh bg/field pair only for a later dedicated wetland kit. FIRST BATCH: one equipment sheet; restage kit 2 with crop/store omitted, same two field strips and same alluvial bg. No palace lion hunt or Assyrian relief copy. Optional existing gazelle-01 only after regional/date/style check, never a mandatory new animal or baked hunt. Later wetland kit must retain one ground plus deep wet-silt and shallow reed-litter field strips and its own single marsh bg.

4) Neighbourhood courtyard and lane — 5 setups: deliveries, neighbour exchange, pottery handling, building repair, household work. Missing: closed frontal house-front variants, low boundary screen, doorstep and plaster repairs. Inherit kit 2 bg, ground and TWO field strips for courtyard edges; dense lane needs replacement deep lane and shallow threshold field pair with same single floor. Reuse checked pots and basket candidates. Avoid overhanging medieval street, glass windows, anachronistic arches and a ziggurat used as a house. No extra sheets in batch2.

EGYPT-OLD-KINGDOM — c. 2550 BCE

1) Giza construction margin — 7 setups: quarry preparation, dressing stone, hauling, rope work, ration distribution, measuring, organising labour. Missing: plateau/construction bg, varied limestone-chip/sand ground, deep work-yard and shallow debris-verge field strips, low quarry-face band, separate limestone blocks, sledge, rope coils, copper tool/dolerite pounder props, sparse desert-edge plants. Existing sky-hot-01 fits. Show one dated construction stage, not all three Giza pyramids completed in Khufu's lifetime. Ramp arrangement remains a labelled reconstruction choice; no wheel crane, iron tools, chariots or automatic slave-chain spectacle. Later batch.

2) Nile bank and cultivated plots — 6 setups: flood/silt discussion, sowing, weeding, harvesting, grain handling, loading bank-side goods. Missing: checked local Nile bg or new bank panorama, living silt ground, deep crop-bank and shallow damp-verge field strips, water-bank screen, date palm and reed/crop cut-outs, baskets and grain props. Audit existing river-nile-01, river-nile-flood-01, field-nile-01, boat-papyrus-01 and reeds-papyrus-01; do not assign these unseen to Giza. Flood and harvest require separate season variants, not simultaneous full flood and ripe standing crop. Avoid New Kingdom shaduf, waterwheel and maize. Later batch.

3) Workers' household room and yard — 6 setups: bread preparation, storage, mat weaving, household meal, tool care, ration receipt. Missing: opaque frontal mudbrick/plaster wall, packed-earth floor, closed doorway, low furniture, bread moulds, storage jars, mats. Indoor room uses hidden single sky/bg; outdoor yard inherits kit 1 surfaces and TWO work-yard/verge field strips. No New Kingdom throne room, Tutankhamun furniture, Ptolemaic motifs or richly tiled universal peasant house. Later batch.

4) Mortuary work and offerings — 4 setups: stone carving, supplying offerings, storage, explaining royal burial. Missing: dated mastaba frontage, offering niche overlay, vessel and tool set; reuse kit 1 ground plus two field strips and a compatible single plateau bg. Religious imagery needs dated object references. No Valley of the Kings, Ramesses' pylons, Cleopatra or a generic gold burial chamber. Later batch.

ROME-IMPERIAL-100 — c. 100 CE

1) Ordinary street and shopfront — 8 setups: food sale, weighing, deliveries, water collection, repairs, announcements, neighbourhood encounters, writing accounts. Missing: inhabited skyline bg, varied paving/soil-joint ground, deep paved apron and shallow worn curb field strips, frontal frontage bands, closed taberna facade, counter, fountain basin, small wall weeds, amphora and balance props. Use existing sky-clear-01. Ancient painted/plastered surfaces, not universal bare white marble or ruined archaeology. No modern shop glass, later imperial monuments or baked street vanishing point. Later batch.

2) Household workroom — 6 setups: writing, teaching, meal preparation, storing goods, weaving, household business. Missing: opaque plaster wall band, varied plain floor, closed doorway/window overlays, frontal table, stools, chest, wax tablets and lamps. Reuse street bg/sky hidden behind wall. Avoid making every home an elite atrium; distinguish wealth. No compulsory perspective atrium or medieval furniture. Later batch.

3) Civic square edge — 5 setups: public announcement, petition, legal discussion, exchange, water provision. Missing: single c. 100 CE civic bg, travertine floor, deep square-apron and shallow stone-edge field strips, frontal portico screen, podium and civic props. Keep civic facade scale distinct from shopfront. No Trajan's Column/Forum completed in 100 CE, Arch of Constantine, or Hadrian's surviving Pantheon form. Trajan's reign dates supported by [Cambridge's museum record](https://museum.classics.cam.ac.uk/collections/casts/trajan); named monuments require their own dates before production. Later batch.

4) Road and farm approach — 5 setups: travel, milestones, moving produce, road maintenance, rural/urban comparison. Missing: countryside bg, varied gravel/earth tile, deep road-shoulder and shallow grass-verge fields, low boundary band, frontal farm frontage, olive and cypress cut-outs, baggage props. Road is a lateral traverse authored in field, not a separate flat top-down path pasted upright. No medieval coach, modern road markings or treating military camp gear as ordinary civilian furniture. Later batch.

PUNIC-ALPS-218 — autumn 218 BCE

1) High pass and scree traverse — 7 setups: assessing route, mountain crossing, negotiating loose scree, snowfall difficulty, baggage halt, route repair, approach to descent. Missing: DISTANT SNOWY PEAKS bg, mid-distance crag/ridge band screens, varied pass/scree ground, deep snow-and-scree field with NARROW lateral footpath, shallow rock-and-patchy-snow verge, isolated rock set pieces, larch/pine and low alpine plants, rope and baggage props. FIRST BATCH: seven essential sheets, plus one optional elephant sheet. Bart's “mountain tops in the distance” remains readable above quieter mid screens. Snow patches, exposed rock and open teaching space; no blizzard that hides distant peaks.

2) Treeline halt — 5 setups: supplies, rest, packing, terrain comparison, shelter from wind. Missing later: low treeline screen and temporary cloth shelter. First batch already has complete larch/pine cut-outs and baggage. Reuse pass bg, ground and TWO field strips at rocky treeline pockets; a greener sustained lower-valley scene needs new vegetated ground plus deep meadow/shallow verge fields and a single suitable bg. Mature trees never stand on summit snowfield. No stone-built Roman fort or modern tent fittings.

3) Obstructed descent — 4 setups: rockfall assessment, clearing passage, narrow ledge movement, explaining source accounts. Reuse kit 1 bg, ground and two field strips, rocks and band; missing later: specific broken-ledge and cleared-path variants. No sheer cliff traversed by floating figures, no certainty about famous vinegar-and-fire story. Hannibal's exact pass is disputed; current kit is an illustrative western Alpine composite, never identified as a proven route. [Polybius and Livy excerpts](https://www.livius.org/sources/content/hannibal-in-the-alps/) anchor snow, terrain difficulty and elephant context while preserving uncertainty.

Optional animal: one unmounted elephant prop for crossing discussion, with optional tag and separate sheet. Conservative illustrative silhouette, no tower, armour, rider or claim to a securely identified species/subspecies or exact size. No Roman legionary props, Imperial rectangular scuta, lorica segmentata, triumphal standards or modern mountaineering gear. People always supplied elsewhere.

First batch and assembly

batch2.json is an array of TWO job objects using supplied keys only. 22 sheets total: 14 Babylonia (5 room + 8 farming/resource edge + 1 hunting equipment) and 8 Alps (7 essential + 1 optional elephant). Egypt and Rome receive dated plans and configuration entries now, production later. Disabling elephant leaves 21 sheets and every required environment piece intact.

Babylonian room sheets: bb-school-wall, bb-school-floor, bb-school-fixtures, bb-school-furniture, bb-school-writing. Outdoor sheets: bb-alluvial-bg, bb-alluvial-ground, bb-alluvial-fields, bb-bank-screens, bb-store-front, bb-date-palm, bb-crop-plants, bb-farm-props; hunting equipment adds bb-hunt-props. No sky generation. In school scene assign outdoor bg and reused hot sky, hidden by wall; ground switches to room floor. Door/niche flush over wall, low furniture at near teaching distance. No field picture placed as interior wall or floor.

Alps sheets: pa-peaks-bg, pa-pass-ground, pa-pass-fields, pa-mountain-screens, pa-rocks, pa-treeline-plants, pa-baggage, pa-elephant-optional. Reused overcast sky, peaks at far bg, lower ridge screen at mid, deep field behind character teaching plane, shallow verge near. Rock clusters occupy margins; narrow path is painted laterally across deep field, visually continued by an open tile corridor. Do not shrink a physical walkway to force projected alignment; check with character scale. Mature larch/pine belong only in treeline version. High-pass version uses low grass/stone cut-outs and omits trees.

Outdoor assembly always starts with one sky, one bg, one ground and TWO field assets; band, mid, fg and props follow. Place far strip behind actors and near verge in front without hiding feet or covering all floor. Field widths in subjects are production framing targets; height_m values retain ground-picture scale. Frame within finite bg/field edges; repeating screens should not create obvious landmarks. Ground-only screenshot is insufficient: verify layered field surfaces, path contact, clear teaching area and continuous feet/root baselines together.

Production acceptance: valid job structure; all ids unique; layer/view combinations supported; no figures; every ground tile tileable_x true; every field non-tiling with ground tag and height >= 2; maximum six assets/sheet; explicit front on architecture and furniture. Visual acceptance later: no tilted furniture, no bland uniform floor, no white/green halos, no holes in snow/walls, matching washes and realistic character scale. This task writes planning/job files only; no asset generation or browser testing claimed.

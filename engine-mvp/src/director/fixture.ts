// A small lesson shaped like contract 2 (S4's writer output), for the tests and the demo page.
// Story and wording are placeholders, not a lesson to ship.
import type { Lesson, Library } from './types'

const scene = (id: string, beat: Lesson['scenes'][number]['beat'], narration: string, extra: Partial<Lesson['scenes'][number]> = {}) => ({
  id, beat, narration, camera: null, sound: null,
  set: { sky: 'sky-morning', layers: [{ need: 'heath far hills', asset: null, depth: 'bg' as const, x: 0.5 }, { need: 'hut field', asset: null, depth: 'mid' as const, x: 0.6 }, { need: 'tree oak', asset: 'tree-oak-01', depth: 'fg' as const, x: 0.15 }] },
  figures: [{ char: 'boer-man', pose: 'walk', x: 0.4, depth: 'mid' as const, facing: 'right' as const }],
  ...extra,
})

export const LESSON: Lesson = {
  id: 'eerste-boeren-demo', lang: 'nl', bundle: 'nl-prehistory',
  scenes: [
    scene('sc01', 'hook', 'Een man rent over de heide. Achter hem loopt een koe. Hij heeft haar niet gestolen.', { est_s: 7 }),
    scene('sc02', 'setup', 'Zevenduizend jaar geleden woonde hier bijna niemand. Mensen trokken rond en jaagden.', {
      est_s: 8, balloons: [{ char: 'boer-man', text: 'Waar gaan we heen?' }],
    }),
    scene('sc03', 'cause', 'Toen kwamen er mensen met zaad, en met koeien. Ze bleven op één plek.', {
      est_s: 9, figures: [{ char: 'boer-vrouw', pose: 'kneel', x: 0.5, depth: 'mid', facing: 'left' }, { char: 'boer-man', pose: 'carry', x: 0.7, depth: 'mid', facing: 'left' }],
    }),
    scene('sc04', 'effect', 'Ze kapten het bos. Ze bouwden huizen van hout en leem. Het vuur bleef branden, dag en nacht.', {
      est_s: 14, tts_s: 14, set: { sky: 'sky-evening', layers: [{ need: 'hut fire hearth', asset: null, depth: 'mid', x: 0.5 }, { need: 'reed', asset: null, depth: 'fg', x: 0.8 }] },
      balloons: [{ char: 'boer-vrouw', text: 'Hout erop, anders gaat hij uit.' }, { char: 'boer-man', text: 'Ja, ja.' }],
    }),
    scene('sc05', 'turn', 'Maar wie stierf, ging niet zomaar weg.', { est_s: 6 }),
    scene('sc06', 'climax', 'Ze sleepten stenen zo groot als een koe. Samen. Zo bouwden ze een hunebed.', {
      est_s: 10, set: { sky: 'sky-morning', layers: [{ need: 'hunebed stone', asset: null, depth: 'mid', x: 0.5 }, { need: 'shrub', asset: null, depth: 'fg', x: 0.2 }] },
      interaction: { type: 'power-meter' },
    }),
    scene('sc07', 'recap', 'Die stenen liggen er nog. Je kunt ze aanraken.', { est_s: 6, figures: [] }),
  ],
}

export const LIBRARY: Library = {
  bundle: 'nl-prehistory',
  assets: [{ id: 'tree-oak-01', layer: 'fg', tags: ['tree', 'oak', 'forest'], motion: 'sway', height_m: 14 }],
}

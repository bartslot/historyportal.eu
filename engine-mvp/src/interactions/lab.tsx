// cards-lab.html: every interaction card from the vault lessons, one at a time, in a 16:9 frame the way
// play.html shows them, so tools/cards-check.mjs can measure each one at any screen size (PM: real data).
// Not the teacher UI. window.__cards = { fixtures, show(i) }.
import '../studio.css'
import { createRoot, type Root } from 'react-dom/client'
import { speakLocale } from '../i18n'
import { Card } from './Card'
import type { Interaction, Quiz } from './plan'

const LESSONS = ['eerste-boeren-1', 'eerste-boeren-2', 'hunebedden', 'voc', 'rembrandt']
type Fixture = { id: string; interaction: Interaction }

async function fixtures(): Promise<Fixture[]> {
  const out: Fixture[] = []
  for (const id of LESSONS) {
    const res = await fetch(`lessons/vault/${id}/lesson.json`)
    if (!res.ok) continue
    const lesson = await res.json()
    for (const s of lesson.scenes) if (s.interaction) out.push({ id: `${id}/${s.id}`, interaction: s.interaction })
  }
  // the worst case the PM named: the corpus's longest explanation with FOUR answers kept after a wrong pick
  const longest = out.filter((f) => f.interaction.type === 'quiz')
    .sort((a, b) => ((b.interaction as Quiz).explain?.length ?? 0) - ((a.interaction as Quiz).explain?.length ?? 0))[0]
  if (longest) {
    const q = longest.interaction as Quiz
    out.push({ id: `${longest.id}+4kept`, interaction: { ...q, options: [...q.options, 'Een extra antwoord dat ook klopt', 'Nog een antwoord dat klopt', 'Een fout antwoord'].slice(0, 6), correct: [0, 3, 4] } as Quiz })
  }
  // outsized text (over 400 characters, none in the vault yet): the one case allowed to scroll, with a fade
  const long = 'Rembrandt kocht in 1639 een groot huis aan de Breestraat in Amsterdam. Hij betaalde maar een deel en leende de rest. Hij bleef ondertussen schilderijen, prenten, schelpen, harnassen en beelden kopen voor zijn verzameling. Toen er minder opdrachten kwamen, kon hij zijn schulden niet meer betalen. In 1656 werd alles wat hij had verkocht: het huis, de kunst en zelfs zijn eigen schilderijen. Daarna woonde hij in een kleiner huis aan de Rozengracht en bleef hij gewoon schilderen, tot zijn dood in 1669.'
  // ~2,000 characters: more than even a 60 % card holds (a 1,000-character note still fits), so the
  // scroll-and-fade path really runs
  const outsized = [long, long, long, long].join(' ')
  out.push({ id: 'synthetic/outsized', interaction: { type: 'quiz', format: 'mc', question: 'Waardoor raakte Rembrandt al zijn bezit kwijt?', options: ['Hij leende te veel geld voor zijn huis en zijn verzameling.', 'Er brak brand uit in zijn atelier.'], correct: 0, explain: outsized } as Quiz })
  out.push({ id: 'synthetic/long-fits', interaction: { type: 'quiz', format: 'mc', question: 'Waardoor raakte Rembrandt al zijn bezit kwijt?', options: ['Hij leende te veel geld voor zijn huis en zijn verzameling.', 'Er brak brand uit in zijn atelier.'], correct: 0, explain: long } as Quiz })
  return out
}

const host = document.getElementById('cards')!
let root: Root | null = null
const list = await fixtures()
await speakLocale('nl')
Object.assign(window, {
  __cards: {
    fixtures: list.map((f) => ({ id: f.id, type: f.interaction.type, format: (f.interaction as { format?: string }).format ?? null, correct: (f.interaction as Quiz).correct ?? null })),
    show(i: number) {
      root?.unmount()
      root = createRoot(host)
      root.render(<Card key={i} interaction={list[i].interaction} seconds={60} onDone={() => {}} />)
    },
  },
})

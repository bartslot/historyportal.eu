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

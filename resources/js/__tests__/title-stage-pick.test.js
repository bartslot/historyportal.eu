import { titleFieldAt } from '../editor/title-stage-pick.js'

/**
 * The title screen on the editor's stage is the real player in an inert frame. A click on its title
 * lands in the Format panel's matching field (PM, 2026-10-17: "edit on the stage").
 */
const rect = (el, x, y, w, h) => { el.getBoundingClientRect = () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h }); return el }

function screen () {
  document.body.innerHTML = `
    <div data-poster-stage>
      <div data-poster-layer="painting"></div>
      <div data-poster-layer="a"></div>
      <p data-title-subtitle>De reis</p>
    </div>
    <h1 data-title-bar><span data-title-series>Abel</span><span data-title-subtitle>Episode</span></h1>
    <div data-title-piece="cta"></div>`
  const q = (s) => document.querySelector(s)
  rect(q('[data-poster-stage]'), 0, 0, 1600, 900)
  rect(q('[data-poster-layer="painting"]'), -20, -20, 1640, 940)
  rect(q('[data-poster-layer="a"]'), 100, 400, 200, 150)
  rect(q('[data-poster-stage] [data-title-subtitle]'), 120, 560, 400, 30)
  rect(q('[data-title-series]'), 0, 0, 0, 0)
  rect(q('[data-title-bar] [data-title-subtitle]'), 0, 0, 0, 0)
  rect(q('[data-title-piece="cta"]'), 60, 800, 200, 60)
  return document
}

describe('titleFieldAt', () => {
  it('a letter of the poster is the title, its live line the subtitle', () => {
    const doc = screen()
    expect(titleFieldAt(doc, 150, 450)).toBe('title')
    expect(titleFieldAt(doc, 200, 575)).toBe('subtitle')
  })

  it('the picture behind the title, the Start button and empty space are nothing', () => {
    const doc = screen()
    expect(titleFieldAt(doc, 1200, 200)).toBeNull()
    expect(titleFieldAt(doc, 100, 820)).toBeNull()
  })

  it('a plain title: the series and the episode line', () => {
    const doc = screen()
    rect(doc.querySelector('[data-title-series]'), 60, 600, 500, 90)
    rect(doc.querySelector('[data-title-bar] [data-title-subtitle]'), 60, 700, 400, 30)
    expect(titleFieldAt(doc, 100, 650)).toBe('title')
    expect(titleFieldAt(doc, 100, 710)).toBe('subtitle')
  })

  it('no document, no field', () => {
    expect(titleFieldAt(null, 1, 1)).toBeNull()
  })
})

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import Alpine from 'alpinejs'
import { shieldListFromAlpine } from '../object-list-drop.js'

// Pair test 2026-10-24: 6-8 "Alpine Expression Error: obj is not defined" on every object-list
// drop. SortableJS's fallback ghost is a clone of an x-for row; Alpine initialised it scopeless.
// (Unshielded, the same append throws "obj is not defined" asynchronously, failing this run.)

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('object list drag ghost', () => {
  let list
  beforeAll(async () => {
    document.body.innerHTML = `
      <div x-data="{ items: [{ id: 'a', label: 'Title' }] }">
        <div id="list"><template x-for="obj in items" :key="obj.id">
          <div :data-obj-id="obj.id" x-text="obj.label"></div>
        </template></div>
      </div>`
    window.Alpine = Alpine
    Alpine.start()
    await tick()
    list = document.getElementById('list')
  })
  // Tear Alpine down while jsdom is still here, or its cleanup runs into a missing document.
  afterAll(async () => { document.body.innerHTML = ''; await tick() })
  afterEach(() => { list.querySelectorAll('.ghost').forEach((g) => g.remove()); vi.restoreAllMocks() })

  const dropAGhost = async (shield) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    if (shield) shieldListFromAlpine(list, true)
    const ghost = list.querySelector('[data-obj-id]').cloneNode(true)   // what Sortable appends
    ghost.classList.add('ghost')
    list.appendChild(ghost)
    await tick()
    if (shield) shieldListFromAlpine(list, false)
    return warn.mock.calls.length + error.mock.calls.length
  }

  it('a ghost row appended during a shielded drag raises no Alpine error', async () => {
    expect(await dropAGhost(true)).toBe(0)
  })
})

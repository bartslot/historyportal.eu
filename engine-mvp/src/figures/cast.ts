// A lesson's cast on the stage: one figure per character, made on first need and re-posed per scene.
//   const cast = new Cast(player.stage.scene, player.stage, lesson)
//   const skipped = await cast.show(lesson.scenes[i])   // on every scene change; skipped = chars with no body (dog, waka)
import type { Scene } from '@babylonjs/core'
import { createFigure, placeFigure, type Figure, type StageLike } from './figure'
import { expressionFor, figureRecipe, poseFor, type CastEntry } from './recipes'

export type SceneFigure = { char: string; pose: string; x: number; depth: 'bg' | 'mid' | 'fg'; facing: 'left' | 'right' | 'front' | 'back'; expression?: string }
export type LessonCast = { bundle?: string; characters?: CastEntry[] }

export class Cast {
  private figs = new Map<string, Promise<Figure | null>>()
  constructor(private scene: Scene, private stage: StageLike, private lesson: LessonCast) {}

  // a group char (jagers, zeelui) may stand in one scene more than once: the n-th copy is its own figure
  private figure(char: string, n: number): Promise<Figure | null> {
    const key = n ? `${char}#${n}` : char
    if (!this.figs.has(key)) {
      const recipe = figureRecipe(char, this.lesson.characters, this.lesson.bundle, n)
      this.figs.set(key, recipe ? createFigure(this.scene, recipe, key) : Promise.resolve(null))
    }
    return this.figs.get(key)!
  }

  /** show exactly this scene's figures; returns the chars that have no body on the standard figure */
  async show(scene: { figures?: SceneFigure[] }): Promise<string[]> {
    const wanted = scene.figures ?? []
    const skipped: string[] = []
    const shown = new Set<Figure>()
    const seen = new Map<string, number>()
    for (const f of wanted) {
      const n = seen.get(f.char) ?? 0
      seen.set(f.char, n + 1)
      const fig = await this.figure(f.char, n)
      if (!fig) { skipped.push(f.char); continue }
      fig.setPose(poseFor(f.pose))
      fig.setExpression(expressionFor(f.expression))
      placeFigure(this.scene, fig, { x: f.x, depth: f.depth, facing: f.facing }, this.stage)
      fig.root.setEnabled(true)
      shown.add(fig)
    }
    for (const p of this.figs.values()) {
      const fig = await p
      if (fig && !shown.has(fig)) { fig.root.setEnabled(false); fig.clip?.stop() }
    }
    return skipped
  }

  async dispose() {
    for (const p of this.figs.values()) (await p)?.dispose()
    this.figs.clear()
  }
}

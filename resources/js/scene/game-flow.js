// Which flow a kind='game' scene runs once its narration is over. A game scene that has nothing
// to run (a quiz without questions, a predict or team moment without its config) is skipped:
// it must never fall through to the strategy brief, which shows the LESSON-level game (on the
// live demo that was another lesson's "Cross the Rubicon" card with an 8:00 timer).

const STRATEGY_TYPES = ['strategy', 'debate']

/**
 * @param {object} scene             the game scene
 * @param {Array}  lessonQuestions   the lesson's own unscoped quiz questions (legacy fallback)
 * @param {?string} lessonGameType   the lesson's game_type, for scenes saved without one
 * @returns {{ flow: 'quiz'|'predict'|'team'|'strategy'|'skip', questions?: Array }}
 */
export function gameFlowFor (scene, lessonQuestions = [], lessonGameType = null) {
  const type = scene?.game_type || lessonGameType
  if (type === 'quiz') {
    const questions = scene.quiz_questions?.length ? scene.quiz_questions : (lessonQuestions || [])
    return questions.length ? { flow: 'quiz', questions } : { flow: 'skip' }
  }
  if (type === 'predict') return { flow: scene.config?.predict ? 'predict' : 'skip' }
  if (type === 'team') return { flow: scene.config?.team ? 'team' : 'skip' }
  return { flow: STRATEGY_TYPES.includes(type) ? 'strategy' : 'skip' }
}

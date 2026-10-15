/**
 * A layer that sails somewhere and stays: the power meter's move payoff and the cargo game's
 * departure. One module, so both move ships the same way.
 */
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The move payoff: the layer travels from where it stands to (to_x, to_y), in stage %, and stays.
 * It uses the CSS `translate` property, so the camera's transform and everything drawn inside the
 * layer (waterline, reflection, contact shadow) go along unchanged. Resolves when it arrives.
 */
export function sail (node, stage, payoff) {
  if (!node || !stage) return Promise.resolve()
  const from = { x: parseFloat(node.style.left) || 50, y: parseFloat(node.style.top) || 50 }
  const dx = ((Number(payoff.to_x) - from.x) / 100) * stage.clientWidth
  const dy = ((Number(payoff.to_y ?? from.y) - from.y) / 100) * stage.clientHeight
  const end = `${Math.round(dx)}px ${Math.round(dy)}px`
  if (reducedMotion() || typeof node.animate !== 'function') {
    node.style.translate = end
    return Promise.resolve()
  }
  // On-screen motion from rest to rest: ease in and out (the `move` intent), never linear.
  const anim = node.animate([{ translate: '0px 0px' }, { translate: end }], {
    duration: Math.max(300, (Number(payoff.duration) || 4) * 1000), easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards',
  })
  return anim.finished.then(() => { node.style.translate = end }, () => {})
}

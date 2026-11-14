// Whether motion is reduced: the person's setting (动画: 跟随系统 / 完整 / 减少, kept on the root as data-motion by applyAppearance) or, when it follows the system, the
// operating system's `prefers-reduced-motion`. A machine whose system turns animations off (a virtual machine, a remote session) can still be given full motion here.
// What the operating system asks for right now (prefers-reduced-motion), apart from the person's choice here. Used to say what 跟随系统 means at this moment.
export const systemReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
/** Calls `fn(reduced)` when the system's setting changes; returns the stop function. */
export function watchSystemMotion(fn) {
  if (typeof matchMedia !== 'function') return () => {}
  const query = matchMedia('(prefers-reduced-motion: reduce)')
  const on = () => fn(query.matches)
  query.addEventListener?.('change', on)
  return () => query.removeEventListener?.('change', on)
}
// no mark on the page yet is the default: full motion (the system's setting is only followed when the person chose 跟随系统)
export const motionMode = () => globalThis.document?.documentElement?.dataset?.motion || 'full'
export function reducedMotion() {
  const mode = motionMode()
  if (mode === 'reduced') return true
  if (mode === 'full') return false
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

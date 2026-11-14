import { reducedMotion } from '../appearance/motion.js'

/**
 * The one enter of a page: the incoming content fades in and settles from a slightly smaller size (Material 3 fade-through; the same curve and time as the former
 * `.m-page__column` animation). Every page change plays it, whichever component draws the page: MScene plays it on the detail pane when the destination changes, and a product that
 * keeps a page in a frame (the control panel's Web UI frame) plays it on the frame with this function when the frame is shown or moves to another place. No page owns its own enter.
 */
export const PAGE_ENTER = Object.freeze({
  keyframes: Object.freeze([{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }]),
  options: Object.freeze({ duration: 210, easing: 'cubic-bezier(.05, .7, .1, 1)' }),
})

/** Plays the enter on `el` (restarting one that is running). Returns the animation, or null when there is no element, no Web Animations, or the person has reduced motion. */
export function playPageEnter(el) {
  if (!el || typeof el.animate !== 'function' || reducedMotion()) return null
  for (const running of el.getAnimations?.() || []) if (running.id === 'm-page-enter') running.cancel()
  const animation = el.animate(PAGE_ENTER.keyframes.map((k) => ({ ...k })), { ...PAGE_ENTER.options })
  animation.id = 'm-page-enter'
  return animation
}

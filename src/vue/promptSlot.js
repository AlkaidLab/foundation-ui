// The card at the top of the overview (the star, the recommendation of a client) comes and goes with the stream and with 以后再说. The grid or the dock under it must not jump when it does: the card
// opens and closes in height (and fades) on the spatial spring, the page below moves with it, frame by frame. Reduced motion: no move, a short fade.
import { reducedMotion } from '../appearance/motion.js'

const seconds = (v, d) => { const n = parseFloat(v); if (!Number.isFinite(n)) return d; return /ms\s*$/.test(v) ? n : n * 1000 }
function spring(el) {
  const cs = getComputedStyle(el)
  return { duration: seconds(cs.getPropertyValue('--m-spring-default-spatial-duration').trim(), 412), easing: cs.getPropertyValue('--m-spring-default-spatial').trim() || 'ease' }
}
const play = (el, from, to, done) => {
  if (typeof el.animate !== 'function') return done()
  const { duration, easing } = spring(el)
  const calm = reducedMotion()
  const a = el.animate(calm ? [{ opacity: from.opacity }, { opacity: to.opacity }] : [from, to], { duration: calm ? 140 : duration, easing: calm ? 'linear' : easing })
  a.finished.then(done, done)
}
export function slotEnter(el, done) {
  const cs = getComputedStyle(el), h = el.offsetHeight
  play(el, { height: '0px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0, overflow: 'hidden' }, { height: `${h}px`, marginBottom: cs.marginBottom, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: 1, overflow: 'hidden' }, done)
}
export function slotLeave(el, done) {
  const cs = getComputedStyle(el), h = el.offsetHeight
  // the card stays in the flow while it closes
  play(el, { height: `${h}px`, marginBottom: cs.marginBottom, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: 1, overflow: 'hidden' }, { height: '0px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0, overflow: 'hidden' }, done)
}

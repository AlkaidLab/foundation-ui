// FLIP for a set of keyed children (first, last, invert, play): what Vue's TransitionGroup does for the moves, without its price. A TransitionGroup reads the position of every child on EVERY update of the
// page and clones its first child into the grid and removes it again (hasCSSTransform), so a grid that shows live values added and removed a cell, with a layout pass, twice a second. Here nothing is read or
// touched unless the arrangement changes (the `signature` changes): the positions are read just before the DOM is patched and just after, the cells that moved play a transform from where they were to where
// they are, and the cells that are new play the arrival. Cells that leave simply go.
import { watch } from 'vue'

const GAP = 6
// do the straight paths of the moving cells (and the cells that stay) keep their distance and stay in their grid? Every tenth of the way, in the pixels of the page.
function crosses(items) {
  const at = (it, t) => (it.from ? { l: it.now.left + (it.from.left - it.now.left) * (1 - t), t: it.now.top + (it.from.top - it.now.top) * (1 - t), w: it.now.width, h: it.now.height } : { l: it.now.left, t: it.now.top, w: it.now.width, h: it.now.height })
  for (let k = 0; k <= 10; k++) {
    const t = k / 10
    const rs = items.map((it) => at(it, t))
    for (let i = 0; i < rs.length; i++) {
      const a = rs[i], g = items[i].grid
      if (g && (a.l < g.left - 2 || a.l + a.w > g.right + 2 || a.t < g.top - 2 || a.t + a.h > g.bottom + 2)) return true
      for (let j = i + 1; j < rs.length; j++) {
        if (!items[i].from && !items[j].from) continue
        const b = rs[j]
        if (Math.min(a.l + a.w, b.l + b.w) - Math.max(a.l, b.l) > -GAP && Math.min(a.t + a.h, b.t + b.h) - Math.max(a.t, b.t) > -GAP) return true
      }
    }
  }
  return false
}
const seconds = (v, d) => { const n = parseFloat(v); if (!Number.isFinite(n)) return d; return /ms\s*$/.test(v) ? n : n * 1000 }

/**
 * @param {{ root: { value: Element | null }, select: string, keyOf: (el: Element) => string, signature: () => string, enabled?: () => boolean, skip?: (el: Element) => boolean, arrive?: boolean }} o
 * `root` holds the children (found with `select` below it), `signature` is a string that changes when, and only when, the places of the children change, `enabled` is asked just before a change is
 * applied (false: this change is not animated), `skip` is asked per cell (true: this cell is not moved by the animation, e.g. the one being dragged).
 * `clean` (asked when the change is applied): true means a slide must never show tiles on top of one another or too close or outside their grid (the arrangement of the plan changing on its own, not the
 * person's hand): the paths are laid out first (`crosses`), and a change whose paths would meet is played as a short fade of the cells that moved, in their new places, instead of a slide.
 */
export function useFlip({ root, select, keyOf, signature, enabled = () => true, skip = () => false, arrive = true, clean = () => false }) {
  let before = null
  const running = new WeakMap()
  const spring = (el) => {
    const cs = getComputedStyle(el)
    return { duration: seconds(cs.getPropertyValue('--m-spring-default-spatial-duration').trim(), 412), easing: cs.getPropertyValue('--m-spring-default-spatial').trim() || 'ease' }
  }
  watch(signature, () => {
    const el = root.value
    before = null
    if (!el || !enabled()) return
    before = new Map()
    for (const c of el.querySelectorAll(select)) before.set(keyOf(c), c.getBoundingClientRect())
  }, { flush: 'pre' })
  watch(signature, () => {
    const prev = before
    before = null
    const el = root.value
    if (!prev || !el || typeof Element.prototype.animate !== 'function') return
    const cells = [...el.querySelectorAll(select)]
    // what plays from an earlier change is cancelled first: the places are read as the layout has them
    for (const c of cells) { const a = running.get(c); if (a) { for (const x of a) x.cancel(); running.delete(c) } }
    const { duration, easing } = spring(el)
    if (duration <= 1) return
    const moves = []
    for (const c of cells) {
      const was = prev.get(keyOf(c))
      const now = c.getBoundingClientRect()
      if (!was) { if (arrive) moves.push([c, null]); continue }
      const dx = was.left - now.left, dy = was.top - now.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
      if (skip(c)) continue
      moves.push([c, [dx, dy]])
    }
    // the slide of a change the person did not make is only played where it is clean; elsewhere the cells that moved fade in at their new places
    if (clean() && moves.length) {
      const moving = new Set(moves.filter(([, d]) => d).map(([c]) => c))
      const items = cells.map((c) => {
        const was = prev.get(keyOf(c)), now = c.getBoundingClientRect(), g = c.parentElement?.getBoundingClientRect()
        const m = moves.find(([x]) => x === c)
        return { from: m && m[1] && was ? was : null, now, grid: g }
      })
      if (crosses(items)) {
        for (const [c, d] of moves) { const a = c.animate([{ opacity: 0, transform: d ? 'scale(.96)' : 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' }); running.set(c, [a]); a.finished.then(() => { if (running.get(c) === a || (running.get(c) || [])[0] === a) running.delete(c) }, () => {}) }
        return
      }
    }
    for (const [c, d] of moves) {
      const list = d
        ? [c.animate([{ transform: `translate(${d[0]}px, ${d[1]}px)` }, { transform: 'translate(0px, 0px)' }], { duration, easing })]
        : [c.animate([{ transform: 'scale(.94)' }, { transform: 'none' }], { duration, easing }), c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'linear' })]
      running.set(c, list)
      list[0].finished.then(() => { if (running.get(c) === list) running.delete(c) }, () => {})
    }
  }, { flush: 'post' })
}

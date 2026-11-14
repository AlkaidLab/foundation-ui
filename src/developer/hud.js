// The HUD overlay: frame times, long tasks and DOM changes as a small text in a corner. It reads what the browser gives (animation frames, the long task and long animation frame
// entries, a MutationObserver) and draws nothing else; with every flag off nothing is installed.
import { createFrameMeter, createRateWindow, hudLines } from './frameMeter.js'

export function installHud(doc = document, win = window) {
  let box = null
  let raf = 0
  let timer = 0
  let flags = { hud: false, longTasks: false, mutations: false }
  const meter = createFrameMeter()
  const longTasks = createRateWindow()
  const mutations = createRateWindow()
  let mutationObserver = null
  let perfObserver = null
  let mark = 0
  const now = () => (win.performance || performance).now()
  function frame(t) { meter.push(t); raf = win.requestAnimationFrame(frame) }
  function draw() {
    if (!box) return
    const lines = hudLines(flags, meter.stats(), longTasks.snapshot(now()), mutations.snapshot(now()))
    box.textContent = lines.join('\n') + (mark ? '\n' : '')
    for (let i = 0; i < Math.min(mark, 12); i += 1) { const m = doc.createElement('i'); m.className = 'm-dev-mark'; box.appendChild(m) }
  }
  function update(next) {
    flags = { hud: !!next.hud, longTasks: !!next.longTasks, mutations: !!next.mutations }
    const any = flags.hud || flags.longTasks || flags.mutations
    if (any && !box) { box = doc.createElement('div'); box.id = 'm-dev-hud'; box.setAttribute('aria-hidden', 'true'); doc.body.appendChild(box); raf = win.requestAnimationFrame(frame); timer = win.setInterval(draw, 500) }
    if (!any && box) { win.cancelAnimationFrame(raf); win.clearInterval(timer); box.remove(); box = null; meter.reset() }
    if (flags.mutations && !mutationObserver && typeof win.MutationObserver === 'function') {
      // the overlays are not changes of the page: the HUD itself, and the flash class that the flasher puts on and takes off
      const own = (r) => r.target?.id === 'm-dev-hud' || r.target?.closest?.('#m-dev-hud') || (r.type === 'attributes' && r.attributeName === 'class' && (String(r.oldValue || '').includes('m-dev-flash') || r.target?.classList?.contains('m-dev-flash')))
      mutationObserver = new win.MutationObserver((records) => { const n = records.filter((r) => !own(r)).length; if (n) mutations.add(now(), n) })
      mutationObserver.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true })
    } else if (!flags.mutations && mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; mutations.reset() }
    if (flags.longTasks && !perfObserver && typeof win.PerformanceObserver === 'function') {
      try {
        perfObserver = new win.PerformanceObserver((list) => { for (const e of list.getEntries()) { longTasks.add(now(), 1, e.duration); mark += 1 } })
        perfObserver.observe({ type: 'longtask', buffered: false })
      } catch { perfObserver = null }
    } else if (!flags.longTasks && perfObserver) { perfObserver.disconnect(); perfObserver = null; longTasks.reset(); mark = 0 }
  }
  function stop() { update({}) }
  return { update, stop }
}

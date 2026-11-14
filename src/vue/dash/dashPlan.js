import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDashLayout } from '../useDashLayout.js'
import { XL_FROM } from '../homeCards.js'
import { unitsFor } from '../homeFit.js'
import { smartPlan, scenarioOf, afterEndsAt } from '../homeSmart.js'
import { useTileUsage } from '../useTileUsage.js'
import { SIZE_KEYS, gridModeOf, hasOwnLayout, hasNoData } from '../homeSizes.js'
import { useAppearance } from '../useAppearance.js'
import { isResizing, noteResize, watchResizing } from '../../nav/resizing.js'
import { pinCards } from '../homePins.js'

/** dashPlan: one part of the home overview's setup (MHomeDash.vue); D is the shared scope of the parts, in the order they are made. */
export function useDashPlan(D) {
  const { edit, props, root, tall, tileRadius, wide, width, windowClass } = D
  // ---- measuring (RZ2: every frame of a resize is right, none is repaired afterwards).
  // The size comes from the ResizeObserver of the tile container: its callback runs after layout and before paint, sets the width, and the tiles are re-packed in the same frame (Vue's flush is a
  // microtask of the callback; the observer sees the container change again and the frame is painted only when it is stable). The window handler reads two numbers and nothing else (no layout
  // is forced by it); the scroller is found once; the scale (devicePixelRatio) does not change the CSS size, so it only needs its two numbers refreshed.
  // While the size changes the tiles take their places at once: nothing slides, the move classes are not applied, and a move that is in flight is finished (.is-resizing, gallery.css). The springs are for
  // the arrangement the person makes (edit mode); a change of the smart plan is not theirs and does not slide either.
  // There is no settle timer here: the shell's signal (nav/resizing.js, `html.m-resizing`) is raised in the frame of the first change, before that frame is laid out, and drops in the first frame without one.
  const resizing = ref(isResizing())
  let stopResizing = null
  let scroller0 = null
  const findScroller = () => { for (let el = root.value?.parentElement; el; el = el.parentElement) { const o = getComputedStyle(el).overflowY; if (o === 'auto' || o === 'scroll') return el } return null }
  // the window's size as the page reads it: a change of it (a height change that leaves the container's width as it was too) is a resize, raised before the page is arranged for it
  const onSizes = () => { const t = window.innerHeight, w = window.innerWidth; if (t !== tall.value || w !== wide.value) noteResize(); tall.value = t; wide.value = w }
  const onObserved = (entries) => {
    // after layout: reads only (the container's box from the entry, its top from the clean layout)
    onSizes()
    for (const e of entries) if (e.target === root.value) {
      const w = Math.round(e.borderBoxSize?.[0]?.inlineSize ?? e.contentRect.width)
      if (w !== width.value) noteResize() // a change of the container that no window event announced (the rail, a pane): the same rule, nothing slides
      width.value = w
      D.rootTop.value = Math.round(root.value.getBoundingClientRect().top + (scroller0?.scrollTop || 0))
    }
  }
  let dprQuery = null
  const onDprChange = () => { onSizes(); watchDpr() }
  const watchDpr = () => {
    dprQuery?.removeEventListener?.('change', onDprChange)
    if (typeof matchMedia !== 'function') return
    dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    dprQuery.addEventListener?.('change', onDprChange)
  }
  onMounted(() => {
    scroller0 = findScroller()
    { const r = parseFloat(getComputedStyle(root.value).getPropertyValue('--m-dash-radius')); if (r > 0) tileRadius.value = r }
    // the first frame: the real width before the first paint (mounted runs before it)
    const r0 = root.value.getBoundingClientRect()
    onSizes(); width.value = Math.round(r0.width); D.rootTop.value = Math.round(r0.top + (scroller0?.scrollTop || 0))
    stopResizing = watchResizing((on) => { resizing.value = on })
    D.ro = new ResizeObserver(onObserved)
    D.ro.observe(root.value)
    if (scroller0) D.ro.observe(scroller0)
    window.addEventListener('resize', onSizes)
    window.visualViewport?.addEventListener('resize', onSizes)
    watchDpr()
  })
  onBeforeUnmount(() => { D.ro?.disconnect(); stopResizing?.(); window.removeEventListener('resize', onSizes); window.visualViewport?.removeEventListener('resize', onSizes); dprQuery?.removeEventListener?.('change', onDprChange); D.stopScroll() })
  const mode = computed(() => gridModeOf(width.value).mode)
  const units = computed(() => D.blocks.value[0]?.units || D.gridOf(width.value).columns)
  const compact = computed(() => tall.value < 824 || width.value < 1040)
  const xl = computed(() => mode.value === 'wide' && tall.value >= XL_FROM)
  const density = computed(() => (mode.value === 'narrow' ? 'narrow' : xl.value ? 'xl' : compact.value ? 'compact' : 'wide'))
  const layout = useDashLayout(props.storageKey)
  // the catalogue's cards and the tiles of the settings the person pinned (they live in the layout)
  const allCards = computed(() => [...props.cards, ...pinCards(layout.state.pins, props.config, props.locale)])
  const onLayoutEvent = (e) => { if (e.detail?.key === props.storageKey) layout.reload() }
  onMounted(() => window.addEventListener('foundation-home-layout', onLayoutEvent))
  onBeforeUnmount(() => window.removeEventListener('foundation-home-layout', onLayoutEvent))
  const appearance = useAppearance()
  // every visible card with the box of its size
  // a card that has the sections of a detail sheet shows them beside itself at the large size
  const hasDetailOf = (c) => { const d = props.details?.[c.id]; return !!(d && !d.external && d.sections?.length) }
  // ---- smart or manual. Smart: the tiles follow what the host is doing (homeSmart.js); manual: what the person arranged. Editing is manual, `restore` gives the plan back.
  // 智能磁贴 is a switch of its own (个性化), the same in both layouts: on, the tiles follow what the host is doing (homeSmart.js); off, they are the person's own, which are kept while it is on. Editing shows the own layout.
  const smart = computed(() => appearance.state.smartTiles && !edit.value)
  const usage = useTileUsage(props.storageKey)
  // the 30 minutes after a stream end by themselves: a timer at the moment they expire (not polling) makes the scenario read again, and the key changes
  const afterTick = ref(0)
  let afterTimer = 0
  watch(() => afterEndsAt(props.ctx.signals || {}), (end) => { clearTimeout(afterTimer); const left = end - Date.now(); if (end > 0 && left > 0) afterTimer = setTimeout(() => { afterTick.value++ }, left + 1) }, { immediate: true })
  const afterOn = computed(() => { afterTick.value; return scenarioOf(props.ctx.signals || {}) === 'after' })
  const signalsKey = computed(() => { const g = props.ctx.signals || {}; return [g.pairedCount > 0 ? 1 : g.pairedCount === 0 ? 0 : -1, g.streaming ? 1 : 0, (g.problems || 0) > 0 || (g.problemComponents || []).length ? 1 : 0, g.wifiHost ? 1 : 0, g.reachBad ? 1 : 0, g.updateAvailable ? 1 : 0, afterOn.value ? 1 : 0].join() })
  // the plan is made from a snapshot of the signals: at the start of the app and when something significant changes (the first pairing, a stream starts or stops, a problem appears or clears),
  // never while the pointer is over the tiles (it is made when the pointer leaves), so a tile never moves under the hand
  const planSnap = ref({ signals: { ...(props.ctx.signals || {}) }, usage: usage.snapshot() })
  let pendingPlan = false
  let hovering = false
  // a plan that changes is animated (the tiles slide to their places: flipGroup.js), not while the window is resized and never while the pointer is on the tiles
  const planMoving = ref(false)
  let movingTimer = 0
  const replan = (animate = true) => { if (hovering) { pendingPlan = true; return } pendingPlan = false; if (smart.value && animate !== false) { planMoving.value = true; clearTimeout(movingTimer); movingTimer = setTimeout(() => { planMoving.value = false }, 900) } planSnap.value = { signals: { ...(props.ctx.signals || {}) }, usage: usage.snapshot() } }
  // hysteresis: a change of scenario takes hold only after it has lasted (a stream that starts and stops in a moment, a link that flaps, does not shuffle the tiles); the first plan is made at once
  const HYSTERESIS_MS = 3000
  let hysteresisTimer = 0
  // while the page is starting (the data of the host arrives in the first seconds) the plan follows at once and does not slide: the overview settles before it is looked at, the same at every scale and every speed of the machine
  const STARTUP_MS = 8000
  const mountedAt = Date.now()
  // A product that says when it can draw (ctx.pending) is not "starting" by the clock: while it is pending nothing is on the screen, the plan follows at once; from the first drawn frame a change is a correction of
  // what was kept (a stream that ended while the person was away: the first second) or a real change, and both slide. The clock rule stays for a product that does not say.
  let drawnAt = props.ctx.pending === undefined ? 0 : (props.ctx.pending ? 0 : mountedAt)
  const CORRECTION_MS = 1500
  watch(() => props.ctx.pending, (p) => { if (p === false) { drawnAt = Date.now(); replan(false) } })
  // A stream that STARTS is what the person is waiting for (they started it, the panel is in front of them): the tiles follow it at once and slide. Everything else (a stream that ends, a link that flaps, a problem)
  // keeps the hysteresis. Before this a start waited 3 s of hysteresis on top of the 3 s poll.
  let wasStreaming = !!(props.ctx.signals || {}).streaming
  watch(signalsKey, () => { const nowStreaming = !!(props.ctx.signals || {}).streaming; const started = nowStreaming && !wasStreaming; wasStreaming = nowStreaming; if (props.ctx.pending === true) { clearTimeout(hysteresisTimer); replan(false); return } if (started) { clearTimeout(hysteresisTimer); replan(); return } clearTimeout(hysteresisTimer); if (props.ctx.pending !== undefined) { if (Date.now() - drawnAt < CORRECTION_MS) { replan(); return } } else { const startup = typeof window !== 'undefined' && Number.isFinite(window.__m3eStartupMs) ? window.__m3eStartupMs : STARTUP_MS; if (Date.now() - mountedAt < startup) { replan(false); return } } const ms = typeof window !== 'undefined' && Number.isFinite(window.__m3eHysteresis) ? window.__m3eHysteresis : HYSTERESIS_MS; hysteresisTimer = setTimeout(replan, ms) })
  onBeforeUnmount(() => { clearTimeout(hysteresisTimer); clearTimeout(movingTimer); clearTimeout(afterTimer) })
  // A plan that was held back while the pointer was on the tiles comes in the moment it leaves (on its way to the pencil, say): the person has not seen it. Editing begins from what was on the screen, so the plan before it is kept for a moment.
  D.seenPlan = null; D.flushedAt = 0
  const onHover = (on) => { hovering = on; if (!on && pendingPlan) { D.flushedAt = Date.now(); D.seenPlan = plan.value; replan() } }
  const planCards = computed(() => allCards.value.filter((c) => c.available).map((c) => { const offered = SIZE_KEYS.filter((k) => hasOwnLayout(c.id, c, k)); return { id: c.id, available: true, empty: hasNoData(c.data), sizes: offered.length ? offered : ['s', 'm'] } }))
  const plan = computed(() => smartPlan({ signals: planSnap.value.signals, usage: planSnap.value.usage, pins: Object.keys(layout.state.pins), accepted: layout.state.accepted, cards: planCards.value, capacity: unitsFor(Math.max(width.value, 860)) * 5, sizeClass: windowClass.value, unitRows: true }))
  const cardById = computed(() => new Map(allCards.value.map((c) => [c.id, c])))
  // A tile with nothing to show yet is small and comes after the tiles that have data. Nothing is hidden: the tile is still on the page, and once the person has made their own order it is theirs.
  const sinkEmpty = (list) => [...list.filter((c) => !hasNoData(c.data)), ...list.filter((c) => hasNoData(c.data))]
  // two tiles with the same name are not both on the smart overview (the 应用 action tile beside the 应用 tile): the first, which has the higher score, stays
  const byName = (list) => { const seen = new Set(); return list.filter((c) => { const n = String(c.title || '').trim().toLowerCase(); if (!n) return true; if (seen.has(n)) return false; seen.add(n); return true }) }
  Object.assign(D, { allCards, appearance, byName, cardById, compact, hasDetailOf, layout, mode, onHover, plan, planMoving, planSnap, replan, resizing, sinkEmpty, smart, units, usage, xl })
}

import { computed, watch } from 'vue'
import { readSkeleton, skeletonOf, skeletonTop, snapshotOf, writeSkeleton } from './dashSkeleton.js'

/** dashSkeletonUse: one part of the home overview's setup (MHomeDash.vue); D is the shared scope of the parts. The arrangement on the page is kept, and while there are no tiles the page draws it as a skeleton. */
export function useDashSkeleton(D) {
  const { blocks, cellStyle, dockOn, edit, gridOf, props, resizing, sectioned, sectionCount, width } = D
  const saved = readSkeleton(props.storageKey)
  const empty = computed(() => !blocks.value.some((b) => b.boxed.length))
  // the product says the page cannot be drawn yet (ctx.pending: what decides it, the session and the clients, is not known): the skeleton stands until it is, so the tiles are drawn once, as they are
  const pending = computed(() => !!props.ctx?.pending)
  const opts = () => ({ sectioned: sectioned.value, width: width.value, columnsOf: (w) => gridOf(w), sectionCount: sectionCount.value })
  // while there are no tiles (the first frames of the page: the host's data and the catalogue come after the first paint) or the product is not ready, not in the dock and not while editing
  const skeleton = computed(() => ((empty.value || pending.value) && !dockOn.value && !edit.value ? skeletonOf(saved, opts()) : null))
  const skeletonTopPx = computed(() => (skeleton.value ? skeletonTop(saved, opts()) : 0))
  // the card above the grid as the page has it now (its height and the gap under it)
  const topEl = () => D.root.value?.querySelector(':scope > .m-sprompt') || null
  const topNow = () => { const el = topEl(); return el ? el.offsetHeight + (parseFloat(getComputedStyle(el).marginBottom) || 0) : 0 }
  // the arrangement is kept when it is settled: not in edit mode, not while the window is being resized, not while the page is waiting for its data (what it draws then is not the arrangement)
  const keep = () => {
    if (empty.value || pending.value || edit.value || resizing.value || dockOn.value) return
    const snap = snapshotOf({ blocks: blocks.value, cellStyle, sectioned: sectioned.value, width: width.value, top: topNow() })
    if (snap) writeSkeleton(props.storageKey, snap)
  }
  // a card at the top that is still opening or closing has not its height yet: the arrangement is kept when it has
  watch([blocks, pending, () => (D.clientRec.value ? 1 : props.ctx?.star ? 2 : 0)], () => {
    const running = (topEl()?.getAnimations?.() || []).filter((a) => a.playState === 'running')
    if (running.length) Promise.all(running.map((a) => a.finished.catch(() => {}))).then(keep); else keep()
  }, { flush: 'post' })
  // the segmented layout (wide windows) centres its blocks by `slack` (MHomeDash puts half of it above them); the skeleton does the same with the natural height the kept arrangement had,
  // so the tiles do not move down when they arrive. Without a kept height (the first start) there is nothing to centre by.
  const skeletonSlack = computed(() => {
    const s = skeleton.value
    if (!s || !sectioned.value) return 0
    const natural = Math.max(0, ...s.map((b) => b.natural || 0))
    return natural ? Math.max(0, Math.round(D.availH.value - natural)) : 0
  })
  D.skeleton = skeleton
  D.skeletonTop = skeletonTopPx
  D.skeletonSlack = skeletonSlack
}

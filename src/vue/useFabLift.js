import { onBeforeUnmount, onMounted, ref } from 'vue'
import { fabLift } from '../nav/fablift.js'

// The lift of a dock of page buttons: measured against the bars that come up from the bottom (unsaved changes, snackbars), again whenever one appears or goes, on scroll and on resize.
export function useFabLift(dock) {
  const count = ref(0)
  const lift = ref(0)
  let frame = 0
  let observer = null
  function measure() {
    frame = 0
    const el = dock.value
    count.value = el ? el.children.length : 0
    if (!el || !count.value) { lift.value = 0; return }
    const r = el.getBoundingClientRect()
    let applied = 0
    try { applied = -new DOMMatrix(getComputedStyle(el).transform).m42 } catch { /* no transform */ }
    const base = { left: r.left, right: r.right, top: r.top + applied, bottom: r.bottom + applied }
    const bars = [...document.querySelectorAll('.m-savebar, .m-snackbar')].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0 && b.height > 0)
    lift.value = fabLift(base, bars)
  }
  // a bar that comes in is animated (it grows, it slides): it is measured when it appears and again when the animation ends, so the buttons clear its final place, not its first frame
  const queue = () => { if (!frame) frame = requestAnimationFrame(measure) }
  // a resize is measured at once, in the frame of the change (the resize event comes before the layout of the frame, and measuring forces that layout): no frame shows the buttons over a bar
  const now = () => { cancelAnimationFrame(frame); measure() }
  onMounted(() => {
    observer = new MutationObserver(queue)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('scroll', queue, true)
    window.addEventListener('resize', now)
    window.visualViewport?.addEventListener?.('resize', now)
    document.addEventListener('animationend', queue, true)
    document.addEventListener('transitionend', queue, true)
    queue()
  })
  onBeforeUnmount(() => { observer?.disconnect(); window.removeEventListener('scroll', queue, true); window.removeEventListener('resize', now); window.visualViewport?.removeEventListener?.('resize', now); document.removeEventListener('animationend', queue, true); document.removeEventListener('transitionend', queue, true); cancelAnimationFrame(frame) })
  return { count, lift, queue }
}

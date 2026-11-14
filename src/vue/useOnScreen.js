// Whether a chart is seen: in the viewport (IntersectionObserver) and the page not hidden (visibilitychange). A chart that is not seen keeps the samples it drew
// and draws the latest ones when it is seen again; samples equal to the drawn ones are not drawn again (round27-xl, idle DOM mutations of the tile bodies).
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

export function useOnScreen(el) {
  const on = ref(true)
  let inView = true
  let io = null
  const update = () => { on.value = inView && (typeof document === 'undefined' || document.visibilityState !== 'hidden') }
  onMounted(() => {
    if (typeof IntersectionObserver !== 'undefined' && el.value) { io = new IntersectionObserver((entries) => { inView = entries.some((e) => e.isIntersecting); update() }); io.observe(el.value) }
    document.addEventListener('visibilitychange', update)
    update()
  })
  onBeforeUnmount(() => { io?.disconnect(); document.removeEventListener('visibilitychange', update) })
  return on
}

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
/** The samples a chart draws: `points()` while `on`, frozen while not; a list equal to the drawn one does not change it (no new path). */
export function useDrawnPoints(points, on) {
  const drawn = shallowRef((points() || []).slice())
  watch([points, on], ([p, o]) => { const list = p || []; if (o && !same(list, drawn.value)) drawn.value = list.slice() })
  return drawn
}

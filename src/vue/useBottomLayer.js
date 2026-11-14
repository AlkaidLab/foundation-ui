import { computed, onBeforeUnmount, watch } from 'vue'
import { bottomStack } from '../notify/stack.js'

/** A layer of the bottom stack: `el` is a ref of its element (null while it is not shown). Returns the `bottom` style the layer is placed with. */
export function useBottomLayer(id, order, el) {
  let observer = null
  const stop = watch(el, (node) => {
    observer?.disconnect(); observer = null
    if (!node) { bottomStack.release(id); return }
    bottomStack.report(id, order, node.offsetHeight)
    if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(() => bottomStack.report(id, order, node.offsetHeight)); observer.observe(node) }
  }, { flush: 'post' })
  onBeforeUnmount(() => { stop(); observer?.disconnect(); bottomStack.release(id) })
  return computed(() => ({ bottom: `${bottomStack.offsetOf(id)}px` }))
}

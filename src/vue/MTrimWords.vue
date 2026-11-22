<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

// A line of text that is cut at a word, never inside one: when the whole text is wider than its room, the last words go and an ellipsis closes the line (the whole text stays in the title). A single word that is wider than
// the room is left to the line's own ellipsis. The text is written here, not by the template (this component owns the node), and measured again when the room or the font changes. `sep` is what the words are joined by (a space, or ' · ').
const props = defineProps({ text: { type: String, default: '' }, sep: { type: String, default: ' ' } })
const el = ref(null)
let ro = null, raf = 0
function fit() {
  raf = 0
  const e = el.value; if (!e) return
  const full = String(props.text ?? '')
  e.textContent = full
  e.title = full
  if (!(e.clientWidth > 8) || e.scrollWidth <= e.clientWidth + 0.5) return
  const words = full.split(props.sep === ' ' ? /\s+/ : props.sep)
  for (let n = words.length - 1; n >= 1; n--) {
    e.textContent = `${words.slice(0, n).join(props.sep)}…`
    if (e.scrollWidth <= e.clientWidth + 0.5) return
  }
  e.textContent = full
}
const queue = () => { if (!raf) raf = requestAnimationFrame(fit) }
onMounted(() => {
  fit()
  if (typeof ResizeObserver !== 'undefined' && el.value) { ro = new ResizeObserver(queue); ro.observe(el.value) }
  if (typeof document !== 'undefined' && document.fonts) { document.fonts.ready?.then(queue); document.fonts.addEventListener?.('loadingdone', queue) }
})
watch(() => [props.text, props.sep], queue)
onBeforeUnmount(() => { ro?.disconnect(); if (typeof document !== 'undefined') document.fonts?.removeEventListener?.('loadingdone', queue); if (raf) cancelAnimationFrame(raf) })
</script>

<template><span ref="el" class="m-trim" /></template>

<script setup>
import { ref, onMounted, onUpdated, onBeforeUnmount, watch } from 'vue'
import MChip from './MChip.vue'
import { chipsShown } from './chipFit.js'

// Chips on one line. Under a card title the chips must not make the card taller than its neighbours: what does not fit is replaced by a "+N" chip, whose tooltip lists the rest.
// chips: [{ key, label, icon?, tone? }]
const props = defineProps({ chips: { type: Array, required: true }, moreLabel: { type: String, default: '' } })
const root = ref(null)
const more = ref(null)
const hiddenCount = ref(0)
const hiddenText = ref('')

// One pass: the widths of the chips at the size the row is in, and how many of them fit.
function measure(row, chips, plus) {
  plus.textContent = `+${chips.length}`
  plus.hidden = false
  const plusWidth = plus.getBoundingClientRect().width
  plus.hidden = true
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0
  return chipsShown(chips.map((chip) => chip.getBoundingClientRect().width), gap, row.clientWidth, plusWidth)
}

function fit() {
  const row = root.value
  if (!row) return
  const chips = [...row.querySelectorAll(':scope > .m-chip:not(.m-chiprow__more)')]
  const plus = more.value
  for (const chip of chips) chip.removeAttribute('data-cut')
  row.removeAttribute('data-compact')
  let shown = measure(row, chips, plus)
  // before anything is cut the chips lose their icons and padding: three short chips are worth more than one and "+2"
  if (shown < chips.length) {
    row.setAttribute('data-compact', '')
    shown = measure(row, chips, plus)
  }
  chips.forEach((chip, i) => { if (i >= shown) chip.setAttribute('data-cut', '') })
  const cut = chips.length - shown
  hiddenCount.value = cut
  hiddenText.value = props.chips.slice(shown).map((c) => c.label).join(' · ')
  plus.textContent = cut ? `+${cut}` : ''
  plus.hidden = !cut
}
let frame = 0
const schedule = () => { if (!frame && typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(() => { frame = 0; fit() }) }
let observer = null
onMounted(() => {
  fit()
  if (typeof ResizeObserver === 'function' && root.value) { observer = new ResizeObserver(schedule); observer.observe(root.value) }
  document.fonts?.ready?.then(schedule)
})
onUpdated(schedule)
watch(() => props.chips, schedule, { deep: true })
onBeforeUnmount(() => { observer?.disconnect(); if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame) })
</script>

<template>
  <span ref="root" class="m-chiprow">
    <MChip v-for="chip in chips" :key="chip.key" :tone="chip.tone || 'neutral'" :icon="chip.icon" :image="chip.image" :title="chip.image ? chip.label : undefined">{{ chip.label }}</MChip>
    <span ref="more" class="m-chip m-chiprow__more" hidden :data-tip="hiddenText" :aria-label="moreLabel ? `${moreLabel}: ${hiddenText}` : hiddenText" />
  </span>
</template>

<script setup>
// Calibration round: 快捷操作, a strip. The Android 16 Quick Settings tiles and the canonical toolbar: one row of equal pills, each with its glyph in a
// rounded-square container at the start and one label; the title at the start of the strip, quiet.
import { computed, ref } from 'vue'
import MIcon from '../../MIcon.vue'

const props = defineProps({ card: { type: Object, required: true } })
const emit = defineEmits(['act'])
const d = computed(() => props.card.data || {})
const at = ref(0)
function onKey(e) {
  const n = props.card.data?.items?.length || 0; if (!n) return
  const to = { ArrowRight: at.value + 1, ArrowDown: at.value + 1, ArrowLeft: at.value - 1, ArrowUp: at.value - 1, Home: 0, End: n - 1 }[e.key]
  if (to === undefined) return
  e.preventDefault(); at.value = (to + n) % n; e.currentTarget.children[at.value]?.focus()
}
</script>

<template>
  <section class="m-tile m-cal m-calq" data-size="strip" data-accent="primary">
    <span class="m-calq__title"><MIcon :name="d.icon" /><span>{{ d.title || card.title }}</span></span>
    <!-- a toolbar (WAI-ARIA APG: one tab stop, the arrow keys, Home and End move between its buttons) -->
    <div class="m-calq__row" role="toolbar" :aria-label="d.title || card.title" @keydown="onKey">
      <button v-for="(a, i) in d.items" :key="a.id" type="button" :tabindex="i === at ? 0 : -1" @focus="at = i" @click="emit('act', { type: a.act, value: a.value })"><i><MIcon :name="a.icon" /></i>{{ a.label }}</button>
    </div>
  </section>
</template>

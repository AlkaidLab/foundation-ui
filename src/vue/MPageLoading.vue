<script setup>
// The one loading state of the products: skeleton rows in the shape of a settings page (groups of rows, a round lead and two lines of text), drawn inside the content area under
// the page's own surface tone. It never covers the window, is never black and says nothing in words. It fades in after `delay` ms, so a page that is there in a moment never shows it.
defineProps({
  /** rows in the first group; the second group has two fewer (at least two) */
  rows: { type: Number, default: 4 },
  groups: { type: Number, default: 2 },
  /** ms before it shows */
  delay: { type: Number, default: 160 },
  label: { type: String, default: '' },
})
const count = (rows, g) => (g === 1 ? rows : Math.max(2, rows - 2))
</script>

<template>
  <div class="m-pageload" role="status" aria-busy="true" :aria-label="label || undefined" :style="{ '--m-pageload-delay': `${delay}ms` }">
    <div v-for="g in groups" :key="g" class="m-pageload__group">
      <div v-for="n in count(rows, g)" :key="n" class="m-pageload__row"><i class="m-pageload__lead" /><span class="m-pageload__text"><b /><b /></span></div>
    </div>
  </div>
</template>

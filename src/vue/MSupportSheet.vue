<script setup>
import MSheet from './MSheet.vue'
import MIcon from './MIcon.vue'

/**
 * A sheet of link rows in sections (sponsor links, star, community group, more resources). The product opens the links. Expressive rows on the theme roles: a tonal round icon, the name
 * in bold, a line under it, a chevron out; the sheet takes a little of the wallpaper's colour (the primary), so it is never a flat black or grey slab in the dark scheme.
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  sections: { type: Array, default: () => [] }, // [{ title?, items: [{ id, icon, title, sub?, url?, tone? }] }]
  closeLabel: { type: String, default: 'Close' },
})
const emit = defineEmits(['update:modelValue', 'open'])
// the first section is the sponsors (primary), a star is tertiary, the rest secondary: one tone per kind of row
const toneOf = (item, index) => item.tone || (item.icon === 'star' ? 'tertiary' : index === 0 ? 'primary' : 'secondary')
</script>

<template>
  <MSheet class="m-support" :model-value="modelValue" :title="title" side="end" :close-label="closeLabel" @update:model-value="(v) => emit('update:modelValue', v)">
    <section v-for="(s, i) in sections" :key="i" class="m-support__section">
      <h3 v-if="s.title" class="m-support__label">{{ s.title }}</h3>
      <ul class="m-support__rows">
        <li v-for="it in s.items" :key="it.id">
          <button type="button" class="m-support__row" @click="emit('open', it)">
            <span class="m-support__ico" :class="`is-${toneOf(it, i)}`"><MIcon :name="it.icon" :fill="toneOf(it, i) === 'primary'" /></span>
            <span class="m-support__text"><b>{{ it.title }}</b><small v-if="it.sub">{{ it.sub }}</small></span>
            <MIcon class="m-support__go" name="open_in_new" />
          </button>
        </li>
      </ul>
    </section>
  </MSheet>
</template>

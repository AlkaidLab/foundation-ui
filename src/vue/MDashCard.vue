<script setup>
import MIcon from './MIcon.vue'

// A dashboard card: neutral surface, small title with an icon, a chevron that opens the detail sheet.
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  chevron: { type: Boolean, default: false },
  chevronLabel: { type: String, default: '' },
  flush: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])
</script>

<template>
  <section class="m-dcard" :class="{ 'm-dcard--flush': flush }">
    <header v-if="title || $slots.head" class="m-dcard__head">
      <MIcon v-if="icon" class="m-dcard__icon" :name="icon" />
      <h3 class="m-dcard__title">{{ title }}</h3>
      <slot name="head" />
      <button v-if="chevron" type="button" class="m-dcard__more" :aria-label="chevronLabel || title" :data-tip="chevronLabel || undefined" @click="emit('open')"><MIcon name="chevron_right" /></button>
    </header>
    <div class="m-dcard__body"><slot /></div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'

// "Finish setting up": only the next step, a large icon in a shape, one primary button that does it, a quiet skip, and a thin
// five-segment progress bar. Finished steps collapse into the segments.
const props = defineProps({
  steps: { type: Array, default: () => [] }, // [{ id, title, sub, done, auto, icon, go }]
  texts: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['go', 'skip'])
const next = computed(() => props.steps.find((s) => !s.done) || null)
const done = computed(() => props.steps.filter((s) => s.done).length)
</script>

<template>
  <section class="m-dcard m-dguide">
    <header class="m-dcard__head"><MIcon class="m-dcard__icon" name="rocket_launch" /><h3 class="m-dcard__title">{{ texts.title }}</h3><span class="m-dcount">{{ done }} / {{ steps.length }}</span></header>
    <div v-if="next" class="m-dguide__body">
      <span class="m-dguide__art m-shaped m-shaped--cookie" aria-hidden="true"><MIcon :name="next.icon || 'flag'" fill /></span>
      <div class="m-dguide__copy"><b>{{ next.title }}</b><span>{{ next.sub }}</span></div>
    </div>
    <div v-if="next" class="m-dguide__actions">
      <button type="button" class="m-dguide__go" @click="emit('go', next)">{{ next.go || texts.go }}</button>
      <button v-if="!next.auto" type="button" class="m-dguide__skip" @click="emit('skip', next.id)">{{ texts.skip }}</button>
    </div>
    <ol class="m-dguide__bar" :aria-label="`${done} / ${steps.length}`"><li v-for="s in steps" :key="s.id" :class="{ 'is-done': s.done, 'is-now': next && s.id === next.id }" /></ol>
  </section>
</template>

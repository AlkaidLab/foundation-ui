<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import MIcon from '../MIcon.vue'
import { issueFormTexts } from '../../devmode/issueFormTexts.js'

// The viewer of the pictures of an issue: one picture at a time on a dark layer, previous / next for the others, Esc and a tap outside close it.
const props = defineProps({
  /** [{ src, alt }] */
  images: { type: Array, default: () => [] },
  /** the index shown, or -1 when closed */
  index: { type: Number, default: -1 },
  locale: { type: String, default: 'zh' },
})
const emit = defineEmits(['update:index'])
const T = computed(() => issueFormTexts(props.locale))
const shown = computed(() => (props.index >= 0 ? props.images[props.index] || null : null))
const failed = ref(false)
const root = ref(null)
const close = () => emit('update:index', -1)
const step = (d) => { const n = props.images.length; if (n > 1) emit('update:index', (props.index + d + n) % n) }
const onKey = (e) => {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() } else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
}
watch(() => props.index, async (i) => {
  failed.value = false
  if (i >= 0) { document.addEventListener('keydown', onKey, true); await nextTick(); root.value?.focus?.() } else document.removeEventListener('keydown', onKey, true)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey, true))
</script>

<template>
  <Teleport to="body">
    <div v-if="shown" ref="root" class="dm-ifv" role="dialog" aria-modal="true" :aria-label="T.viewerTitle" tabindex="-1" data-dev="image-viewer" @click.self="close">
      <button type="button" class="dm-ifv__btn dm-ifv__close" :aria-label="T.viewerClose" data-dev="viewer-close" @click="close"><MIcon name="close" /></button>
      <button v-if="images.length > 1" type="button" class="dm-ifv__btn dm-ifv__prev" :aria-label="T.viewerPrev" @click="step(-1)"><MIcon name="chevron_left" /></button>
      <button v-if="images.length > 1" type="button" class="dm-ifv__btn dm-ifv__next" :aria-label="T.viewerNext" @click="step(1)"><MIcon name="chevron_right" /></button>
      <img v-if="!failed" :key="shown.src" class="dm-ifv__img" :src="shown.src" :alt="shown.alt" referrerpolicy="no-referrer" draggable="false" @error="failed = true">
      <p v-else class="dm-ifv__fail">{{ T.imageFailed }}</p>
      <span v-if="images.length > 1" class="dm-ifv__count">{{ T.viewerOf.replace('{n}', index + 1).replace('{m}', images.length) }}</span>
    </div>
  </Teleport>
</template>

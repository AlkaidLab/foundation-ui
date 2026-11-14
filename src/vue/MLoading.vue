<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useOnScreen } from './useOnScreen.js'

// The M3 Expressive loading indicator (loading.css, generated from LoadingIndicator.kt): for waits of a few seconds; a page that loads shows its skeleton.
// An indicator that is not seen (off screen, hidden page) pauses; at most MAX_MORPHING seen ones morph at once (clip-path repaints every frame),
// the others keep turning on the same shape.
const props = defineProps({
  size: { type: String, default: '48px' },
  contained: { type: Boolean, default: false },
  label: { type: String, default: '' },
})
const el = ref(null)
const on = useOnScreen(el)
const me = reactive({ on, still: false })
seen.push(me)
watch(on, assign)
assign()
onBeforeUnmount(() => { seen.splice(seen.indexOf(me), 1); assign() })
const state = computed(() => (!me.on ? 'is-paused' : me.still ? 'is-still' : ''))
</script>

<script>
export const MAX_MORPHING = 6
const seen = []
function assign() { let n = 0; for (const m of seen) { m.still = m.on && ++n > MAX_MORPHING } }
</script>

<template>
  <span ref="el" class="m-loading" :class="[{ 'm-loading--contained': contained }, state]" :style="{ '--m-size': size }" role="progressbar" :aria-label="label || undefined" :aria-hidden="label ? undefined : 'true'">
    <span class="m-loading__spin"><span class="m-loading__step"><span class="m-loading__shape" /></span></span>
  </span>
</template>

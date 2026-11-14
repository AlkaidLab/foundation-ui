<script setup>
import { computed } from 'vue'
import { ICONS } from '../icons/icons.js'

const warned = new Set()

const props = defineProps({
  name: { type: String, required: true },
  /** Use the filled glyph where the set has one (selected navigation items, status marks). */
  fill: { type: Boolean, default: false },
})
const d = computed(() => {
  const icon = ICONS[props.name]
  if (!icon) {
    // every name that cannot be drawn is recorded (the sweep scripts read it), and said once in a dev build
    if (!warned.has(props.name)) {
      warned.add(props.name)
      try { (globalThis.__mIconMissing ||= new Set()).add(props.name) } catch { /* no global */ }
      if (import.meta.env?.DEV) console.warn(`[m-icon] no glyph named "${props.name}"`)
    }
    return ''
  }
  return props.fill && icon.f ? icon.f : icon.d
})
</script>

<template>
  <svg class="m-icon" viewBox="0 -960 960 960" aria-hidden="true" focusable="false"><path :d="d" /></svg>
</template>

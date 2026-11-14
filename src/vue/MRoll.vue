<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { MText } from './textNode.js'

// Numbers that roll. Every character keeps its node (keyed by its place) and its text is patched in place, so a live number changes one text node, never replaces one.
// A real change rolls: the characters that changed, above the units digit, slide in from below (the Web Animations API: no DOM change). The jitter of a live number
// (within 15 % of the last value: 48.1, 47.9, 52.3; 17 %, 18 %) and the units digit and the decimals never roll. The same text changes nothing. Reduced motion: no roll.
const props = defineProps({ text: { type: String, default: '' } })
const root = ref(null)
const chars = computed(() => [...String(props.text)])
const num = (s) => { const v = parseFloat(String(s).replace(/[^\d.-]/g, '')); return Number.isFinite(v) ? v : null }
const reduced = () => { const m = document.documentElement.dataset.motion; return m === 'reduced' || (m !== 'full' && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) }
// the places that never roll: the units digit (the last one before the decimal point) and the decimals
const stillOf = (s) => { const dot = s.search(/[.,]/); let units = -1; for (let i = (dot >= 0 ? dot : s.length) - 1; i >= 0; i--) if (/\d/.test(s[i])) { units = i; break } return (i) => i === units || (dot >= 0 && i > dot) }
watch(() => props.text, async (now, was) => {
  if (!was || now === was || typeof document === 'undefined' || reduced()) return
  const a = num(now), b = num(was)
  if (a !== null && b !== null && Math.abs(a - b) <= Math.max(Math.abs(b), 1e-9) * 0.15) return
  await nextTick()
  const s = String(now), p = String(was), still = stillOf(s)
  root.value?.querySelectorAll('.m-roll__ch').forEach((el, i) => { if (s[i] !== p[i] && !still(i)) el.animate?.([{ transform: 'translateY(40%)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)' }) })
})
</script>

<template>
  <span ref="root" class="m-roll" aria-live="off"><span v-for="(ch, i) in chars" :key="i" class="m-roll__ch" :class="{ 'm-roll__ch--gap': ch === ' ' }"><MText :text="ch" /></span></span>
</template>

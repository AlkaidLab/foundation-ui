<script setup>
// The picture of a display handling mode: the host's own display and the virtual one, drawn as they are left by the mode (on, off, the main one, extended).
defineProps({ mode: { type: String, default: 'no_operation' } })
</script>

<template>
  <svg class="m-prepart" :class="`is-${mode}`" viewBox="0 0 120 56" aria-hidden="true" focusable="false">
    <g class="m-prepart__mon m-prepart__host"><rect x="6" y="6" width="42" height="28" rx="5" /><path d="M20 42 h14 M27 34 v8" /><path class="m-prepart__off" d="M14 12 l26 16 M40 12 l-26 16" /></g>
    <path class="m-prepart__link" d="M52 20 h16" />
    <g class="m-prepart__mon m-prepart__virtual"><rect x="72" y="6" width="42" height="28" rx="5" /><path d="M86 42 h14 M93 34 v8" /><path class="m-prepart__star" d="M93 14 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7z" /></g>
  </svg>
</template>

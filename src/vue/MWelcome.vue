<script setup>
import MIcon from './MIcon.vue'

// First-run and wizard pages in the style of Android's setup flows: a back bubble, a large title, a centred illustration,
// rows of tonal circular icons with one line each, and a full-width pill button at the bottom.
defineProps({
  title: { type: String, required: true },
  /** icon of the default illustration (a scalloped tonal shape); the `art` slot replaces it */
  icon: { type: String, default: '' },
  /** small heading above the rows */
  rowsLabel: { type: String, default: '' },
  /** [{ icon, text, tone? }] one line each, tone: primary | secondary | tertiary | success | warn */
  rows: { type: Array, default: () => [] },
  back: { type: Boolean, default: false },
  backLabel: { type: String, default: 'Back' },
  /** step indicator: { current, total, label? } */
  steps: { type: Object, default: null },
})
const emit = defineEmits(['back'])
</script>

<template>
  <div class="m-welcome">
    <header class="m-welcome__bar">
      <button v-if="back" type="button" class="m-page__back" :aria-label="backLabel" :data-tip="backLabel" @click="emit('back')"><MIcon name="arrow_back" /></button>
      <span class="m-welcome__spacer" />
      <slot name="top" />
    </header>
    <div class="m-welcome__col">
      <h1 class="m-welcome__title">{{ title }}</h1>
      <div v-if="steps" class="m-welcome__steps" role="progressbar" :aria-valuemin="1" :aria-valuemax="steps.total" :aria-valuenow="steps.current" :aria-label="steps.label || undefined">
        <i v-for="n in steps.total" :key="n" :class="{ 'is-done': n < steps.current, 'is-now': n === steps.current }" />
      </div>
      <div v-if="icon || $slots.art" class="m-welcome__art"><slot name="art"><span class="m-welcome__blob"><MIcon :name="icon" fill /></span></slot></div>
      <slot name="intro" />
      <template v-if="rows.length">
        <h2 v-if="rowsLabel" class="m-welcome__label">{{ rowsLabel }}</h2>
        <ul class="m-welcome__rows">
          <li v-for="(row, index) in rows" :key="index" class="m-welcome__row">
            <span class="m-lead-circle" :class="row.tone && `m-lead-circle--${row.tone}`" aria-hidden="true"><MIcon :name="row.icon" /></span>
            <span>{{ row.text }}</span>
          </li>
        </ul>
      </template>
      <slot />
    </div>
    <footer v-if="$slots.actions" class="m-welcome__actions"><slot name="actions" /></footer>
  </div>
</template>

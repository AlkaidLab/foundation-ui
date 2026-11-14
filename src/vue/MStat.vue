<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import MSparkline from './MSparkline.vue'
import MGauge from './MGauge.vue'

// A live number. Only ever fed with data the backend really provides: when it has none the tile says so with a dash and
// a muted icon instead of a made-up figure.
const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: [String, Number], default: null },
  unit: { type: String, default: '' },
  tone: { type: String, default: '' }, // '' | ok | warn | error
  /** 0..1 progress shown as a ring beside the value */
  progress: { type: Number, default: null },
  /** real samples for a sparkline */
  series: { type: Array, default: () => [] },
  href: { type: String, default: '' },
  action: { type: Boolean, default: false },
})
const emit = defineEmits(['click'])
const missing = computed(() => props.value === null || props.value === undefined || props.value === '')
const tag = computed(() => (props.href ? 'a' : props.action ? 'button' : 'div'))
</script>

<template>
  <component :is="tag" class="m-stat" :class="[tone && `m-stat--${tone}`, { 'is-missing': missing, 'm-stat--action': action || href }]" :href="href || undefined" :type="tag === 'button' ? 'button' : undefined" @click="emit('click', $event)">
    <span class="m-stat__icon"><MIcon :name="icon" fill /></span>
    <span class="m-stat__body">
      <span class="m-stat__value">{{ missing ? '—' : value }}<small v-if="!missing && unit">{{ unit }}</small></span>
      <span class="m-stat__label">{{ label }}</span>
    </span>
    <MGauge v-if="progress !== null && !missing" class="m-stat__gauge" :value="progress" :label="label" />
    <MSparkline v-else-if="series.length > 1" class="m-stat__spark" :points="series" />
  </component>
</template>

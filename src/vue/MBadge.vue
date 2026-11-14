<script setup>
// Badge: a dot, or a count (more than `max` shows max+). Place inside a relatively positioned icon.
defineProps({ value: { type: [Number, String], default: null }, max: { type: Number, default: 99 }, tone: { type: String, default: 'error' }, label: { type: String, default: '' } })
</script>

<template>
  <span class="m-badge" :class="[`m-badge--${tone}`, { 'm-badge--dot': value == null }]" :role="label ? 'status' : undefined" :aria-label="label || undefined">{{ value == null ? '' : (Number(value) > max ? `${max}+` : value) }}</span>
</template>

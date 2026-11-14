<script setup>
// Tile kit (docs/tile-kit.md): what a tile shows while it has nothing yet: its shape as the hero (the shape the full tile uses), one line of state and the one action that
// fills it (最近玩过 →「开始串流」, 公网地址 →「设置公网访问」). 方形: stacked and centred; 中 and up: the shape at the start, the line and the action beside it.
import MTileShape from './MTileShape.vue'

defineProps({
  icon: { type: String, default: '' },
  shape: { type: String, default: '' },
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  action: { type: Object, default: null }, // { label, type, value }
  size: { type: String, default: 's' },
})
const emit = defineEmits(['act'])
</script>

<template>
  <div class="m-tempty" :class="`m-tempty--${size}`">
    <MTileShape class="m-tempty__shape" :icon="icon" :shape="shape" size="var(--te-shape)" />
    <div class="m-tempty__text">
      <span v-if="title" class="m-tempty__title">{{ title }}</span>
      <b class="m-tempty__line">{{ text }}</b>
      <button v-if="action" type="button" class="m-tempty__act" @click.stop="emit('act', action)">{{ action.label }}</button>
    </div>
  </div>
</template>

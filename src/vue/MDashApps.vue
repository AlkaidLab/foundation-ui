<script setup>
import { reactive } from 'vue'
import MDashCard from './MDashCard.vue'
import MIcon from './MIcon.vue'
import { coverOk } from './coverOk.js'

// The apps tile is a shelf to start from, not a list: the cover art of the apps side by side (small: two, medium: four, large: six), each with its name under it. An app with no cover
// shows the games icon on a tonal square, never a lone letter. While a stream runs the 正在玩 tile is the live one; this one stays the launcher (the plan shows it when nothing runs).
// items: [{ id, title, sub, cover }]
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'apps' },
  count: { type: Number, default: null },
  items: { type: Array, default: () => [] },
  empty: { type: String, default: '' },
  chevron: { type: Boolean, default: true },
  chevronLabel: { type: String, default: '' },
  /** label of the add button (it is not shown without one) */
  addLabel: { type: String, default: '' },
  /** 's' | 'm' | 'l' */
  size: { type: String, default: 'm' },
})
const emit = defineEmits(['open', 'item', 'add'])
const broken = reactive({})
</script>

<template>
  <MDashCard :title="title" :icon="icon" :chevron="chevron" :chevron-label="chevronLabel" class="m-dapps" @open="emit('open')">
    <template #head><button v-if="addLabel" type="button" class="m-dadd" :aria-label="addLabel" :data-tip="addLabel" @click.stop="emit('add')"><MIcon name="add" /></button><span v-if="count !== null" class="m-dcount">{{ count }}</span></template>
    <div v-if="items.length" class="m-dapps__shelf" :class="`m-dapps__shelf--${size}`" :style="{ '--n': items.length }">
      <button v-for="a in items" :key="a.id" type="button" class="m-dapps__app" :title="a.title" @click="emit('item', a)">
        <span class="m-dapps__art"><img v-if="coverOk(a.cover) && !broken[a.id]" :src="a.cover" alt="" loading="lazy" decoding="async" @error="broken[a.id] = true"><MIcon v-else name="sports_esports" /></span>
        <span class="m-dapps__name">{{ a.title }}</span>
      </button>
    </div>
    <div v-else class="m-dtable__empty"><MIcon name="apps" />{{ empty }}</div>
  </MDashCard>
</template>

<script setup>
import { ref, useId } from 'vue'
import MIconButton from './MIconButton.vue'
import MMenu from './MMenu.vue'

// The ⋮ button of a page or a card with its menu. items: [{ id, label, icon?, danger?, divider? }]
defineProps({
  items: { type: Array, required: true },
  label: { type: String, default: 'More options' },
})
const emit = defineEmits(['select'])
const anchor = useId()
const menu = ref(null)
</script>

<template>
  <span class="m-overflow" style="position: relative">
    <MIconButton :id="anchor" icon="more_vert" :label="label" aria-haspopup="menu" @click="menu.toggle()" />
    <MMenu ref="menu" :anchor="anchor" :items="items" @select="(item) => emit('select', item.id)" />
  </span>
</template>

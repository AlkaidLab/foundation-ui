<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from './MIcon.vue'

// FAB menu: one main action that opens a short list of related actions. items: [{ id, label, icon, image? }] (`image`: a picture in place of the icon)
defineProps({
  icon: { type: String, default: 'add' },
  label: { type: String, required: true },
  items: { type: Array, required: true },
})
const emit = defineEmits(['select'])
const open = ref(false)
const root = ref(null)
const fab = ref(null)
const away = (event) => { if (open.value && !root.value?.contains(event.target)) open.value = false }
// opened: the first item takes the focus; Esc or an item closes it and the focus goes back to the FAB
watch(open, (v, was) => nextTick(() => { if (v) root.value?.querySelector('.m-fabmenu__item')?.focus(); else if (was && root.value?.contains(document.activeElement)) fab.value?.focus() }))
onMounted(() => document.addEventListener('pointerdown', away))
onBeforeUnmount(() => document.removeEventListener('pointerdown', away))
</script>

<template>
  <div ref="root" class="m-fabmenu" :class="{ 'is-open': open }" @keydown.esc="open = false">
    <ul v-show="open" class="m-fabmenu__list" role="menu">
      <li v-for="(item, i) in items" :key="item.id" role="none" :style="{ '--i': items.length - 1 - i }">
        <button type="button" role="menuitem" class="m-fabmenu__item" @click="emit('select', item); open = false"><img v-if="item.image" class="m-fabmenu__img" :src="item.image" alt="" aria-hidden="true" draggable="false"><MIcon v-else :name="item.icon" /><span>{{ item.label }}</span></button>
      </li>
    </ul>
    <button ref="fab" type="button" class="m-fabmenu__fab" :aria-expanded="open" aria-haspopup="menu" :aria-label="label" :data-tip="label" @click="open = !open">
      <MIcon :name="open ? 'close' : icon" />
    </button>
  </div>
</template>

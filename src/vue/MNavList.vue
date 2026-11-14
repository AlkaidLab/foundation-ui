<script setup>
import MIcon from './MIcon.vue'

// The list pane: a pure list of the categories (the search is the product's one search bar, not part of a list), then segmented groups of rows (the
// Expressive list: large outer corners, small inner corners, a one-row group fully round). A row has a filled icon in the
// icon treatment of the package (`.m-ico`, see icons-style.css; group index = `data-tone`), the title and one line of
// live data; the selected row takes the secondary container and keeps its segment shape.
// groups: [{ id, title?, items: [{ id, label, text?, icon, tone?, badge? }] }]
defineProps({
  groups: { type: Array, required: true },
  current: { type: String, default: '' },
  label: { type: String, default: 'Pages' },
  mark: { type: Boolean, default: true },
  /** the name of the category, and whether it is written at the top of the list (a window where the list is a page of its own: the title of every page of the bottom bar is at the top left) */
  title: { type: String, default: '' },
  titled: { type: Boolean, default: false },
})
const emit = defineEmits(['navigate', 'context'])
function key(event) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const rows = [...event.currentTarget.querySelectorAll('a')]
  const at = rows.indexOf(document.activeElement)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : Math.min(rows.length - 1, Math.max(0, at + (event.key === 'ArrowDown' ? 1 : -1)))
  rows[next]?.focus()
  event.preventDefault()
}
</script>

<template>
  <div class="m-navlist">
    <div v-if="titled && title" class="m-page m-navlist__titlebar"><header class="m-page__bar"><h1 class="m-page__title">{{ title }}</h1></header></div>
    <slot name="top" />
    <nav class="m-navlist__nav" :aria-label="label" @keydown="key">
      <section v-for="(group, gi) in groups" :key="group.id" class="m-navlist__group">
        <h2 v-if="group.title" class="m-navlist__heading">{{ group.title }}</h2>
        <a
          v-for="item in group.items"
          :key="item.id"
          :href="item.href || '#'"
          class="m-navlist__item"
          :data-row="item.id"
          :aria-current="mark && current === item.id ? 'page' : undefined"
          @click.prevent="emit('navigate', item)"
          @contextmenu="emit('context', $event, item)"
        >
          <span class="m-ico" :data-tone="item.tone === 'error' ? 'error' : gi % 4"><MIcon :name="item.icon" fill /></span>
          <span class="m-navlist__body"><span class="m-navlist__label">{{ item.label }}</span><span v-if="item.text" class="m-navlist__text">{{ item.text }}</span></span>
          <i v-if="item.badge" class="m-navlist__badge" :class="`m-navlist__badge--${item.badge}`" />
        </a>
      </section>
    </nav>
    <slot name="foot" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MButton from '../MButton.vue'
import MIcon from '../MIcon.vue'
import { COMPONENT_IDS } from './bridge.js'
import { componentSections } from './installerModel.js'
import { t } from './installerTexts.js'

// The components page: a scrolling list in two groups. A row is a checkbox: ticked = the container fill and a check, never a ring (layout.css --m-sel-fill).
// Maintenance arrives with the installed components ticked (the view says so); this page only toggles them through the host.
const props = defineProps({ view: { type: Object, required: true }, locale: { type: String, default: 'zh' } })
const emit = defineEmits(['action'])
const sections = computed(() => componentSections(props.view, props.locale))
const all = computed(() => COMPONENT_IDS.every((id) => props.view.components[id]))
</script>

<template>
  <div class="m-inst__comps">
    <div class="m-inst__comps-bar">
      <span>{{ t(locale, 'comp.always') }}</span>
      <MButton variant="text" size="xs" class="m-inst__all" @click="emit('action', { type: 'select-all' })">{{ t(locale, all ? 'comp.none' : 'comp.all') }}</MButton>
    </div>
    <div class="m-inst__list" role="group" :aria-label="t(locale, 'comp.title')" tabindex="-1">
      <template v-for="s in sections" :key="s.id">
        <h2 class="m-inst__list-head">{{ s.title }}</h2>
        <button v-for="c in s.items" :key="c.id" type="button" role="checkbox" class="m-inst__row" :class="{ 'is-on': c.on, 'is-off-limits': c.disabled }" :aria-checked="c.on" :disabled="c.disabled" @click="emit('action', { type: 'toggle-component', id: c.id })">
          <span class="m-inst__row-icon"><MIcon :name="c.icon" /></span>
          <span class="m-inst__row-text"><b>{{ c.title }}</b><span>{{ c.text }}</span></span>
          <span class="m-inst__tick" aria-hidden="true"><MIcon name="check" /></span>
        </button>
      </template>
    </div>
  </div>
</template>

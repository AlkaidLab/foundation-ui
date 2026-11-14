<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MDialog from './MDialog.vue'
import MSearchResults from './MSearchResults.vue'
import { vModalOpen } from '../a11y/modalLayer.js'
import { useModalBridge } from './useModalBridge.js'

/**
 * The one search of a product (Material 3 search bar and search view). Wide and medium windows: a docked bar whose view opens under it as a dropdown;
 * compact windows: an icon (put it in the top app bar) that opens a full-screen view. `search` is useUnifiedSearch(); the shortcuts live there.
 * Nothing in this component belongs to a product: it only draws the state of `search`.
 */
const props = defineProps({
  search: { type: Object, required: true },
  texts: { type: Object, required: true }, // searchTexts()
  compact: { type: Boolean, default: false },
  /** the height of the docked bar in px (the caption bar leaves room for it) */
  height: { type: Number, default: 40 },
})
const s = props.search
// the full-screen view of a compact window is a modal: a page in a frame tells the shell, which dims the window around it
useModalBridge(() => props.compact && s.open.value, () => s.hide())
const id = useId()
const listId = `m-usearch-${id}`
const root = ref(null)
const input = ref(null)
const full = ref(null)
const results = ref(null)
const query = computed({ get: () => s.query.value, set: (v) => { s.query.value = v } })
const activeId = computed(() => (s.rows.value.length ? `${listId}-${s.active.value}` : undefined))

// the input takes the focus when the view opens; the docked view closes when focus or a press leaves it
watch(() => s.open.value, (on) => nextTick(() => { if (on) input.value?.focus(); else if (document.activeElement === input.value) input.value?.blur() }))
function outside(event) {
  if (!s.open.value || s.confirm.value || props.compact) return
  if (root.value && !root.value.contains(event.target)) s.hide()
}
onMounted(() => document.addEventListener('pointerdown', outside, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside, true))
const clear = () => { query.value = ''; input.value?.focus() }
const confirmText = computed(() => String(props.texts.confirmTitle).replace('{title}', s.confirm.value?.title || ''))
</script>

<template>
  <div ref="root" class="m-usearch" :class="{ 'is-open': s.open.value, 'is-compact': compact }" :style="{ '--m-usearch-h': `${height}px` }">
    <!-- wide and medium: the docked bar; its view drops from it -->
    <div v-if="!compact" class="m-usearch__box" role="search">
      <label class="m-usearch__field" @pointerdown="s.show()">
        <MIcon class="m-usearch__lead" name="search" />
        <input
          ref="input" v-model="query" type="text" class="m-usearch__input" role="combobox" aria-autocomplete="list" autocomplete="off" spellcheck="false"
          :placeholder="texts.placeholder" :aria-label="texts.open" :aria-expanded="s.open.value" :aria-controls="listId" :aria-activedescendant="s.open.value ? activeId : undefined"
          @focus="s.show()" @keydown="s.onKey"
        >
        <kbd v-if="!s.open.value && !query" class="m-usearch__kbd" aria-hidden="true">{{ texts.shortcut }}</kbd>
        <button v-if="query" type="button" class="m-usearch__clear" :aria-label="texts.clear" :data-tip="texts.clear" @pointerdown.prevent @click="clear"><MIcon name="close" /></button>
      </label>
      <div v-show="s.open.value" class="m-usearch__view">
        <MSearchResults v-if="s.open.value" ref="results" :search="s" :texts="texts" :list-id="listId" />
      </div>
    </div>

    <!-- compact: an icon in the top app bar, a full-screen view -->
    <template v-else>
      <button type="button" class="m-usearch__open" :aria-label="texts.open" :data-tip="texts.open" @click="s.show()"><MIcon name="search" /></button>
      <Teleport to="body">
        <dialog v-if="s.open.value" ref="full" v-modal-open class="m-usearch__full" :aria-label="texts.open" @cancel.prevent="s.hide()">
          <header class="m-usearch__head">
            <button type="button" class="m-usearch__back" :aria-label="texts.back" :data-tip="texts.back" @click="s.hide()"><MIcon name="arrow_back" /></button>
            <input
              ref="input" v-model="query" type="text" class="m-usearch__input" role="combobox" aria-autocomplete="list" autocomplete="off" spellcheck="false"
              :placeholder="texts.placeholder" :aria-label="texts.open" aria-expanded="true" :aria-controls="listId" :aria-activedescendant="activeId" @keydown="s.onKey"
            >
            <button v-if="query" type="button" class="m-usearch__clear" :aria-label="texts.clear" @click="clear"><MIcon name="close" /></button>
          </header>
          <div class="m-usearch__divider" />
          <div class="m-usearch__scroll"><MSearchResults :search="s" :texts="texts" :list-id="listId" /></div>
        </dialog>
      </Teleport>
    </template>

    <!-- a tier 3 action asks first -->
    <MDialog :model-value="!!s.confirm.value" :title="confirmText" icon="restart_alt" tone="error" @update:model-value="(v) => { if (!v) s.confirmCancel() }">
      <p v-if="s.confirm.value?.confirm" class="m-usearch__confirm">{{ s.confirm.value.confirm }}</p>
      <template #actions>
        <MButton variant="text" @click="s.confirmCancel()">{{ texts.cancel }}</MButton>
        <MButton @click="s.confirmRun()">{{ texts.confirm }}</MButton>
      </template>
    </MDialog>
  </div>
</template>

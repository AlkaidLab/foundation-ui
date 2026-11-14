<script setup>
import { computed, nextTick, ref } from 'vue'
import MButton from './MButton.vue'
import MIconButton from './MIconButton.vue'
import { addEntry, editEntry, LIMITS, moveEntry, normalizers, removeEntry, shown, sortList } from '../settings/modeList.js'

// One ordered list of the driver's modes (resolutions or refresh rates): add, edit in place, remove, move, sort on request.
// The value is an array of strings ('1920x1080' | '59.94'); every change is emitted as a new array and the team of the list decides when it is kept.
const props = defineProps({
  kind: { type: String, required: true, validator: (v) => v === 'resolution' || v === 'rate' },
  modelValue: { type: Array, required: true },
  suggestions: { type: Array, default: () => [] },
  /** the texts of this list (settings/modeListTexts.js: resolution | rate) */
  texts: { type: Object, required: true },
})
const emit = defineEmits(['update:modelValue'])

const draft = ref('')
const editing = ref(-1)
const editDraft = ref('')
const editRef = ref(null)
const errorCode = ref('')
const limits = computed(() => LIMITS[props.kind])
const error = computed(() => (errorCode.value ? String(props.texts.errors[errorCode.value] || '').replace('{min}', limits.value.min).replace('{max}', limits.value.max).replace('{count}', limits.value.count) : ''))

const normalized = (v) => normalizers[props.kind](v).value ?? String(v)
const show = (v) => shown(props.kind, v)
const apply = (result) => {
  errorCode.value = result.error || ''
  if (!result.error && result.list !== props.modelValue) emit('update:modelValue', result.list)
  return !result.error
}

const addValue = (text) => apply(addEntry(props.kind, props.modelValue, text))
const addDraft = () => { if (addValue(draft.value)) draft.value = '' }
const remove = (index) => apply(removeEntry(props.modelValue, index))
const move = (index, delta) => { errorCode.value = ''; emit('update:modelValue', moveEntry(props.modelValue, index, delta)) }
const sort = () => { errorCode.value = ''; emit('update:modelValue', sortList(props.kind, props.modelValue)) }
const startEdit = (index) => { errorCode.value = ''; editing.value = index; editDraft.value = props.modelValue[index]; nextTick(() => { const el = [].concat(editRef.value || [])[0]; el?.focus(); el?.select() }) }
const cancelEdit = () => { editing.value = -1; errorCode.value = '' }
const commitEdit = () => { if (apply(editEntry(props.kind, props.modelValue, editing.value, editDraft.value))) editing.value = -1 }
</script>

<template>
  <div class="m-modes" :data-kind="kind">
    <ol v-if="modelValue.length" class="m-modes__list">
      <li v-for="(value, index) in modelValue" :key="value" class="m-modes__row" :class="{ 'is-editing': editing === index }">
        <template v-if="editing === index">
          <input ref="editRef" v-model="editDraft" class="m-modes__input m-input" :aria-label="texts.editItem" :placeholder="texts.placeholder" inputmode="decimal" @keyup.enter="commitEdit" @keyup.esc.stop="cancelEdit">
          <MIconButton icon="check" size="xs" :label="texts.ok" @click="commitEdit" />
          <MIconButton icon="close" size="xs" :label="texts.cancelEdit || texts.ok" @click="cancelEdit" />
        </template>
        <template v-else>
          <span class="m-modes__no">{{ index + 1 }}</span>
          <span class="m-modes__value">{{ show(value) }}</span>
          <span class="m-modes__tools">
            <MIconButton icon="arrow_upward" size="xs" :label="texts.up" :disabled="index === 0" @click="move(index, -1)" />
            <MIconButton icon="arrow_downward" size="xs" :label="texts.down" :disabled="index === modelValue.length - 1" @click="move(index, 1)" />
            <MIconButton icon="edit" size="xs" :label="texts.editItem" @click="startEdit(index)" />
            <MIconButton icon="delete" size="xs" :label="texts.remove" :disabled="modelValue.length <= 1" @click="remove(index)" />
          </span>
        </template>
      </li>
    </ol>
    <form class="m-modes__add" @submit.prevent="addDraft">
      <input v-model="draft" class="m-modes__input m-input" :aria-label="texts.add" :placeholder="texts.placeholder" inputmode="decimal">
      <MButton size="sm" variant="tonal" icon="add" type="submit" :disabled="!draft.trim()">{{ texts.add }}</MButton>
      <MButton v-if="modelValue.length > 1" size="sm" variant="text" icon="swap_vert" @click="sort">{{ texts.sort }}</MButton>
    </form>
    <div v-if="suggestions.length" class="m-modes__suggest">
      <button v-for="s in suggestions" :key="s" type="button" class="m-modes__pick" :disabled="modelValue.includes(normalized(s)) || modelValue.length >= limits.count" @click="addValue(s)">{{ show(normalized(s)) }}</button>
    </div>
    <p v-if="error" class="m-modes__error" role="alert">{{ error }}</p>
  </div>
</template>

<style>
.m-modes__list { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; }
.m-modes__row { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 4px 0 12px; border-radius: 20px; }
.m-modes__row:hover { background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent); }
.m-modes__no { width: 20px; color: var(--md-sys-color-on-surface-variant); font: var(--m-label-medium); font-variant-numeric: tabular-nums; }
.m-modes__value { flex: 1; font: var(--m-body-large); font-variant-numeric: tabular-nums; color: var(--md-sys-color-on-surface); }
.m-modes__tools { display: inline-flex; gap: 2px; }
.m-modes__add { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.m-modes__input { height: 32px; width: 200px; padding: 0 12px; font: var(--m-body-medium); }
.m-modes__suggest { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.m-modes__pick { height: 32px; border: 0; border-radius: 16px; padding: 0 12px; cursor: pointer; background: transparent; box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant); color: var(--md-sys-color-on-surface-variant); font: var(--m-label-large); }
.m-modes__pick:hover:not(:disabled) { background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent); }
.m-modes__pick:disabled { opacity: .38; cursor: not-allowed; }
.m-modes__error { margin: 8px 0 0; color: var(--md-sys-color-error); font: var(--m-body-small); }
</style>

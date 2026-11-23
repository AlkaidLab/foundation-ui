<script setup>
import { computed, ref, watch } from 'vue'
import MButton from './MButton.vue'
import MIcon from './MIcon.vue'
import MIconButton from './MIconButton.vue'
import { LIMITS, pickerGroups, insertEntry, moveEntry, normalizers, removeEntry, shown, sortList, sameList, cleanList } from '../settings/modeList.js'
import { modeListTexts } from '../settings/modeListTexts.js'

// One list of the modes the host offers to clients (resolutions or refresh rates), edited as a checklist: the common values are chips that switch on and off with one press, a value
// of your own is typed in one row and added, and the list that clients will be offered is shown below in its order. The value is an array of strings ('1920x1080' | '59.94'), the
// same one the host keeps (`resolutions` and `fps`); every change is emitted as a new array. The popup editor (MModeListDialog) stays for the surfaces that edit both lists together.
const props = defineProps({
  kind: { type: String, required: true, validator: (v) => v === 'resolution' || v === 'rate' },
  modelValue: { type: Array, required: true },
  /** the heading when it is not the default name of the list */
  title: { type: String, default: '' },
  locale: { type: String, default: 'en' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const t = computed(() => modeListTexts(props.locale))
const p = computed(() => t.value.picker)
const own = computed(() => p.value[props.kind])
const limits = computed(() => LIMITS[props.kind])
const list = computed(() => cleanList(props.kind, props.modelValue))
const groups = computed(() => pickerGroups(props.kind, list.value).map((g) => ({ ...g, label: own.value.groups[g.id] || g.id })))
const on = (value) => list.value.includes(value)
const full = computed(() => list.value.length >= limits.value.count)

const errorCode = ref('')
const message = (code) => (code ? String(t.value[props.kind].errors[code] || '').replace('{min}', limits.value.min).replace('{max}', limits.value.max).replace('{count}', limits.value.count) : '')
const error = computed(() => message(errorCode.value))
function commit(result) {
  errorCode.value = result.error || ''
  if (!result.error) emit('update:modelValue', result.list)
  return !result.error
}
function toggle(value) {
  if (props.disabled) return
  const index = list.value.indexOf(value)
  commit(index >= 0 ? removeEntry(list.value, index) : insertEntry(props.kind, list.value, value))
}

// a value of your own
const width = ref('')
const height = ref('')
const rate = ref('')
const draft = computed(() => {
  if (props.kind === 'resolution') return width.value !== '' && height.value !== '' ? normalizers.resolution(`${width.value}x${height.value}`) : null
  return rate.value.trim() !== '' ? normalizers.rate(rate.value) : null
})
const draftError = computed(() => {
  if (!draft.value) return ''
  if (draft.value.error) return draft.value.error
  if (list.value.includes(draft.value.value)) return 'exists'
  return full.value ? 'full' : ''
})
const draftMessage = computed(() => message(draftError.value))
function addDraft() {
  if (!draft.value?.value || draftError.value || props.disabled) return
  if (commit(insertEntry(props.kind, list.value, draft.value.value))) { width.value = ''; height.value = ''; rate.value = '' }
}

// the list the clients are offered, in its order
const picked = ref('')
const index = computed(() => list.value.indexOf(picked.value))
watch(list, (value) => { if (picked.value && !value.includes(picked.value)) picked.value = '' })
const select = (value) => { picked.value = picked.value === value ? '' : value }
const move = (delta) => { errorCode.value = ''; emit('update:modelValue', moveEntry(list.value, index.value, delta)) }
const drop = () => { const i = index.value; if (i >= 0) commit(removeEntry(list.value, i)) }
const sorted = computed(() => sameList(list.value, sortList(props.kind, list.value)))
const sortNow = () => { errorCode.value = ''; emit('update:modelValue', sortList(props.kind, list.value)) }
</script>

<template>
  <div class="m-mpick" role="group" :aria-label="title || own.name" :data-kind="kind" :class="{ 'is-disabled': disabled }">
    <div v-for="g in groups" :key="g.id" class="m-mpick__group" role="group" :aria-label="g.label" :data-group="g.id">
      <span class="m-mpick__glabel">{{ g.label }}</span>
      <div class="m-mpick__chips">
        <button
          v-for="value in g.values" :key="value" type="button" role="checkbox" class="m-mpick__chip" :class="{ 'is-on': on(value) }" :aria-checked="on(value)"
          :disabled="disabled || (!on(value) && full)" :title="g.custom ? p.remove : ''" @click="toggle(value)"
        >
          <MIcon :name="g.custom ? 'close' : 'check'" :class="{ 'm-mpick__tick': !g.custom }" />
          <span>{{ shown(kind, value) }}</span>
        </button>
      </div>
    </div>

    <form class="m-mpick__add" @submit.prevent="addDraft">
      <span class="m-mpick__glabel">{{ own.custom }}</span>
      <div class="m-mpick__fields">
        <template v-if="kind === 'resolution'">
          <input v-model="width" class="m-input m-mpick__num" type="number" inputmode="numeric" :min="limits.min" :max="limits.max" step="1" :placeholder="own.width" :aria-label="own.width" :disabled="disabled" data-field="width">
          <span class="m-mpick__times" aria-hidden="true">×</span>
          <input v-model="height" class="m-input m-mpick__num" type="number" inputmode="numeric" :min="limits.min" :max="limits.max" step="1" :placeholder="own.height" :aria-label="own.height" :disabled="disabled" data-field="height">
        </template>
        <template v-else>
          <input v-model="rate" class="m-input m-mpick__num" type="text" inputmode="decimal" :placeholder="own.placeholder" :aria-label="own.value" :disabled="disabled" data-field="rate">
          <span class="m-mpick__times">Hz</span>
        </template>
        <MButton size="sm" variant="tonal" icon="add" type="submit" :disabled="disabled || !draft || !draft.value || !!draftError">{{ p.add }}</MButton>
      </div>
      <p v-if="draftMessage" class="m-mpick__error" role="alert">{{ draftMessage }}</p>
    </form>
    <p v-if="error && !draftMessage" class="m-mpick__error" role="alert">{{ error }}</p>

    <section class="m-mpick__offered" :aria-label="p.offered" data-part="offered">
      <header class="m-mpick__ohead">
        <b class="m-mpick__otitle">{{ p.offered }}</b>
        <span class="m-mpick__count" :title="own.limit.replace('{max}', limits.count)">{{ list.length }} / {{ limits.count }}</span>
        <MButton v-if="list.length > 1 && !sorted" size="sm" variant="text" icon="swap_vert" :disabled="disabled" @click="sortNow">{{ p.sort }}</MButton>
      </header>
      <ul class="m-mpick__out">
        <li v-for="value in list" :key="value">
          <button type="button" class="m-mpick__outchip" :class="{ 'is-sel': picked === value }" :aria-pressed="picked === value" :disabled="disabled" @click="select(value)">{{ shown(kind, value) }}</button>
        </li>
      </ul>
      <div v-if="picked" class="m-mpick__tools" role="toolbar" :aria-label="shown(kind, picked)">
        <b class="m-mpick__sel">{{ shown(kind, picked) }}</b>
        <MIconButton icon="arrow_back" size="xs" :label="p.earlier" :disabled="index <= 0" @click="move(-1)" />
        <MIconButton icon="arrow_forward" size="xs" :label="p.later" :disabled="index < 0 || index >= list.length - 1" @click="move(1)" />
        <MIconButton icon="delete" size="xs" :label="p.remove" :disabled="list.length <= 1" @click="drop" />
      </div>
    </section>
  </div>
</template>

<style>
.m-mpick { display: flex; flex-direction: column; gap: 14px; padding: 16px; border-radius: 28px; background: var(--m-card); min-width: 0; }
.m-mpick.is-disabled { opacity: .6; }
.m-mpick__head { display: flex; align-items: center; gap: 10px; color: var(--md-sys-color-on-surface-variant); }
.m-mpick__title { flex: 1 1 auto; min-width: 0; font: var(--m-title-small, 600 14px/20px sans-serif); color: var(--md-sys-color-on-surface); }
.m-mpick__count { font: var(--m-label-medium, 500 12px/16px sans-serif); font-variant-numeric: tabular-nums; padding: 2px 8px; border-radius: 8px; background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent); }
.m-mpick__group, .m-mpick__add { display: grid; grid-template-columns: 88px minmax(0, 1fr); align-items: start; gap: 6px 12px; }
.m-mpick__glabel { padding-top: 7px; font: var(--m-label-medium, 500 12px/16px sans-serif); color: var(--md-sys-color-on-surface-variant); }
.m-mpick__chips { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
.m-mpick__chip { all: unset; position: relative; touch-action: manipulation; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px 0 12px; border-radius: 17px; cursor: pointer; font: var(--m-label-large, 500 14px/20px sans-serif); font-variant-numeric: tabular-nums; color: var(--md-sys-color-on-surface-variant); box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant); transition: background-color .15s, color .15s, box-shadow .15s; }
.m-mpick__chip .m-icon { font-size: 18px; }
.m-mpick__chip .m-mpick__tick { display: none; }
.m-mpick__chip:hover:not(:disabled) { background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent); }
.m-mpick__chip:focus-visible, .m-mpick__outchip:focus-visible { outline: 2px solid var(--md-sys-color-primary); outline-offset: 2px; }
.m-mpick__chip.is-on { background: color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent); color: var(--md-sys-color-on-surface); box-shadow: none; }
.m-mpick__chip.is-on .m-mpick__tick { display: inline-block; color: var(--md-sys-color-primary-text, var(--md-sys-color-primary)); }
.m-mpick__chip:disabled { opacity: .38; cursor: not-allowed; }
.m-mpick__fields { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
.m-mpick__num { height: 34px; width: 104px; padding: 0 12px; font: var(--m-body-medium); font-variant-numeric: tabular-nums; box-sizing: border-box; }
.m-mpick__times { color: var(--md-sys-color-on-surface-variant); font: var(--m-body-medium); }
.m-mpick__error { grid-column: 2; margin: 0; color: var(--md-sys-color-error); font: var(--m-body-small); }
.m-mpick > .m-mpick__error { margin: -6px 0 0 76px; }
.m-mpick__offered { display: flex; flex-direction: column; gap: 8px; padding-top: 14px; border-top: 1px solid var(--md-sys-color-outline-variant); }
.m-mpick__otitle { flex: 1 1 auto; }
.m-mpick__ohead { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 32px; font: var(--m-label-large, 500 14px/20px sans-serif); color: var(--md-sys-color-on-surface); }
.m-mpick__out { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.m-mpick__outchip { all: unset; position: relative; touch-action: manipulation; box-sizing: border-box; padding: 4px 10px; border-radius: 10px; cursor: pointer; font: var(--m-label-large, 500 14px/20px sans-serif); font-variant-numeric: tabular-nums; color: var(--md-sys-color-on-surface); background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent); }
.m-mpick__outchip.is-sel { background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
.m-mpick__tools { display: flex; align-items: center; gap: 4px; }
.m-mpick__sel { margin-right: 4px; font: var(--m-label-large, 500 14px/20px sans-serif); font-variant-numeric: tabular-nums; }
@media (max-width: 480px) {
  .m-mpick { padding: 14px; border-radius: 24px; }
  .m-mpick__group, .m-mpick__add { grid-template-columns: minmax(0, 1fr); }
  .m-mpick__glabel { padding-top: 0; }
  .m-mpick__error, .m-mpick > .m-mpick__error { grid-column: 1; margin: 0; }
  .m-mpick__num { width: 96px; }
}
</style>

<script setup>
import { computed, ref, watch } from 'vue'
import MButton from './MButton.vue'
import MDialog from './MDialog.vue'
import MModeList from './MModeList.vue'
import { cleanList, sameList } from '../settings/modeList.js'
import { modeListTexts } from '../settings/modeListTexts.js'

// The one place where the resolutions and the refresh rates of the 基地虚拟显示器 / Foundation Virtual Display driver are edited: a popup with both lists (add, edit in place,
// move, remove, sort, ranges and duplicates checked) and the note on when the driver applies them. The lists are drafts until 保存: 取消 (or Escape) keeps what was there.
// Used by the Web UI page 分辨率、帧率与码率 and by the control panel's page of the display, so both open the same popup.
const open = defineModel({ type: Boolean, default: false })
const props = defineProps({
  resolutions: { type: Array, required: true },
  rates: { type: Array, required: true },
  locale: { type: String, default: 'en' },
  /** replaces the default note on when the driver applies the lists (a surface that reloads the driver itself says so) */
  note: { type: String, default: '' },
  suggestedResolutions: { type: Array, default: () => ['1280x720', '1920x1080', '2560x1440', '3840x2160'] },
  suggestedRates: { type: Array, default: () => ['60', '120', '144', '240'] },
  busy: { type: Boolean, default: false },
  /** one sentence above the lists on what they are (the Web UI says what the host does with them) */
  lead: { type: String, default: '' },
  /** the one-line note (the driver applies the lists after it reloads) instead of the long one */
  shortNote: { type: Boolean, default: false },
  /** a surface that saves for real passes an async function ({ resolutions, rates }) => '' | error text: the popup stays open and shows the error until it succeeds, then closes */
  saver: { type: Function, default: null },
})
const emit = defineEmits(['save'])
const t = computed(() => modeListTexts(props.locale))
const res = ref([])
const rates = ref([])
watch(open, (value) => { if (value) { res.value = cleanList('resolution', props.resolutions); rates.value = cleanList('rate', props.rates) } }, { immediate: true })
const changed = computed(() => !sameList(res.value, cleanList('resolution', props.resolutions)) || !sameList(rates.value, cleanList('rate', props.rates)))
const working = ref(false)
const failure = ref('')
watch(open, (value) => { if (value) failure.value = '' })
async function save() {
  const value = { resolutions: res.value.slice(), rates: rates.value.slice() }
  if (props.saver) {
    working.value = true
    failure.value = ''
    try { failure.value = (await props.saver(value)) || '' } catch (error) { failure.value = String(error?.message || error) } finally { working.value = false }
    if (failure.value) return
  } else emit('save', value)
  open.value = false
}
</script>

<template>
  <MDialog v-model="open" :title="t.dialogTitle" icon="aspect_ratio" tone="primary" persistent>
    <div class="m-modes-dialog">
      <p v-if="lead" class="m-modes-dialog__lead">{{ lead }}</p>
      <section data-section="resolution">
        <h3 class="m-modes-dialog__h">{{ t.resolution.section }}</h3>
        <p class="m-modes-dialog__hint">{{ t.resolution.hint }}</p>
        <MModeList v-model="res" kind="resolution" :suggestions="suggestedResolutions" :texts="t.resolution" />
      </section>
      <section data-section="rate">
        <h3 class="m-modes-dialog__h">{{ t.rate.section }}</h3>
        <p class="m-modes-dialog__hint">{{ t.rate.hint }}</p>
        <MModeList v-model="rates" kind="rate" :suggestions="suggestedRates" :texts="t.rate" />
      </section>
      <p class="m-modes-dialog__note">{{ note || (shortNote ? t.noteShort : t.note) }}</p>
      <p v-if="failure" class="m-modes-dialog__error" role="alert">{{ failure }}</p>
    </div>
    <template #actions>
      <MButton variant="text" :disabled="working" @click="open = false">{{ t.cancel }}</MButton>
      <MButton icon="check" :disabled="!changed || busy || working" :loading="busy || working" @click="save">{{ t.save }}</MButton>
    </template>
  </MDialog>
</template>

<style>
.m-modes-dialog { display: flex; flex-direction: column; gap: 20px; min-width: min(520px, 80vw); padding-inline: 6px; box-sizing: border-box; }
.m-modes-dialog__lead { margin: 0; font: var(--m-body-medium); color: var(--md-sys-color-on-surface-variant); }
.m-modes-dialog__error { margin: 0; color: var(--md-sys-color-error); font: var(--m-body-medium); }
.m-modes-dialog__h { margin: 0; font: var(--m-title-medium); color: var(--md-sys-color-on-surface); }
.m-modes-dialog__hint { margin: 2px 0 8px; font: var(--m-body-small); color: var(--md-sys-color-on-surface-variant); }
.m-modes-dialog__note { margin: 0; padding: 12px 16px; border-radius: 16px; background: var(--md-sys-color-surface-container); font: var(--m-body-small); color: var(--md-sys-color-on-surface-variant); }
</style>

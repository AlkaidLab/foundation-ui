<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MButton from '../MButton.vue'
import { devReport, addManualMask, undoManualMask, clearManualMasks } from './devReport.js'
import { devmodeTexts, fillText } from '../../devmode/texts.js'

// The preview of the screenshot, and the only way to change it: it shows the exact bytes that will be sent (devReport.shot), the boxes the markup made are outlined and locked, and a drag adds a box by hand
// (painted into the image at once, so what is shown is what goes out). Undo and clear remove only the hand-drawn boxes.
const props = defineProps({ locale: { type: String, default: 'zh' } })
const T = computed(() => devmodeTexts(props.locale))
const url = ref('')
watch(() => devReport.shot, (bytes) => {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = bytes ? URL.createObjectURL(new Blob([bytes], { type: 'image/png' })) : ''
}, { immediate: true })
onBeforeUnmount(() => { if (url.value) URL.revokeObjectURL(url.value) })

const size = computed(() => devReport.shotSize || { width: 1, height: 1 })
const box = (r) => ({ left: `${(r.x / size.value.width) * 100}%`, top: `${(r.y / size.value.height) * 100}%`, width: `${(r.w / size.value.width) * 100}%`, height: `${(r.h / size.value.height) * 100}%` })
const stage = ref(null)
const drag = ref(null)
const clamp = (v) => Math.min(1, Math.max(0, v))
const at = (e) => { const b = stage.value.getBoundingClientRect(); return { x: clamp((e.clientX - b.left) / b.width), y: clamp((e.clientY - b.top) / b.height) } }
function down(e) { if (e.button > 0) return; stage.value.setPointerCapture?.(e.pointerId); const p = at(e); drag.value = { x0: p.x, y0: p.y, x1: p.x, y1: p.y } }
function move(e) { if (!drag.value) return; const p = at(e); drag.value = { ...drag.value, x1: p.x, y1: p.y } }
const dragBox = computed(() => {
  const d = drag.value
  if (!d) return null
  const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1)
  return { x: x * size.value.width, y: y * size.value.height, w: Math.abs(d.x1 - d.x0) * size.value.width, h: Math.abs(d.y1 - d.y0) * size.value.height }
})
function up() { const r = dragBox.value; drag.value = null; if (r) addManualMask(r) }
const autoText = computed(() => fillText(T.value.maskAuto, { n: devReport.shotAuto.length }))
const manualText = computed(() => fillText(T.value.maskManual, { m: devReport.shotManual.length }))
</script>

<template>
  <div class="dm-mask" data-dev="shot-mask">
    <p class="dm-dim dm-mask__hint">{{ T.maskHint }}</p>
    <div ref="stage" class="dm-mask__stage" :style="{ '--ar': size.width / size.height }" @pointerdown.prevent="down" @pointermove="move" @pointerup="up" @pointercancel="drag = null">
      <img v-if="url" :src="url" :alt="T.maskAlt" draggable="false" data-dev="shot-image">
      <span v-for="(r, i) in devReport.shotAuto" :key="`a${i}`" class="dm-mask__box dm-mask__box--auto" :style="box(r)" data-dev="shot-auto" />
      <span v-if="dragBox" class="dm-mask__box dm-mask__box--drag" :style="box(dragBox)" />
    </div>
    <div class="dm-mask__bar">
      <span class="dm-mask__count" data-dev="shot-counts">{{ autoText }} · {{ manualText }}</span>
      <span class="dm-spacer" />
      <MButton variant="text" size="sm" icon="undo" :disabled="!devReport.shotManual.length" data-dev="shot-undo" @click="undoManualMask">{{ T.maskUndo }}</MButton>
      <MButton variant="text" size="sm" icon="clear_all" :disabled="!devReport.shotManual.length" data-dev="shot-clear" @click="clearManualMasks">{{ T.maskClear }}</MButton>
    </div>
    <p class="dm-dim dm-mask__sent">{{ T.maskSent }}</p>
  </div>
</template>

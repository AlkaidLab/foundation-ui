<script setup>
import { computed, reactive, watch } from 'vue'
import MIcon from './MIcon.vue'
import MSliderItem from './MSliderItem.vue'
import { needsDisplay, sliderTargetText, sliderViews, tx } from '../tray/trayModel.js'

// The sliders of the tray's quick page are the product's own slider item (MSliderItem, size m, an icon at each end: the Panel's 默认背景不透明度 on the HDR page, the guide's blur and tint), with the
// name, the icon, the live value and the stops of a stepped one. Only the host decides what a slider can do (state.sliders): a slider it gave nothing for is not drawn, and the line above says which
// display the others change, or why they are not there. A change is applied when the slider is released (the shared slider commits a press on release and a key 450 ms after the last one):
// `apply(key, value)` is async and throws the host's words; while it runs the readout says 「正在应用…」 and the slider cannot be moved, and a failure stays under it until the next try. It resolves with a notice
// (null, or for the scale `{ clamped: true, max }` when the display did not allow the step without a sign-out and the highest step it does allow was set): said once, under the slider, in the same place as a failure.
const props = defineProps({
  row: { type: Object, required: true },
  state: { type: Object, required: true },
  apply: { type: Function, default: null },
})

const t = computed(() => tx(props.state).sliders)
const views = computed(() => sliderViews(props.row, props.state))
const target = computed(() => sliderTargetText(props.state, props.row))
const showTarget = computed(() => needsDisplay(props.row, props.state))
const shown = computed(() => showTarget.value || views.value.length > 0)
// per slider: the position under the finger, whether it is being dragged / applied, the last failure
const live = reactive({})
const busy = reactive({})
const failure = reactive({})
// the icons at the two ends of each slider: less / more
const ENDS = { dpi: ['text_decrease', 'text_increase'], resolution: ['photo_size_select_small', 'photo_size_select_large'], refresh: ['slow_motion_video', 'speed'], bitrate: ['signal_cellular_alt_2_bar', 'signal_cellular_alt'] }

watch(views, (list) => {
  for (const v of list) if (!busy[v.key]) live[v.key] = v.pos
}, { immediate: true })
const posOf = (v) => (live[v.key] ?? v.pos)
const textOf = (v) => (busy[v.key] ? t.value.applying : posOf(v) === v.pos ? v.text : v.textAt(posOf(v)))

function onInput(v, pos) {
  live[v.key] = pos
  failure[v.key] = ''
}
async function commit(v, pos) {
  live[v.key] = pos
  if (pos === v.pos && v.textAt(pos) === v.text) return
  busy[v.key] = true
  failure[v.key] = ''
  try {
    const notice = props.apply ? await props.apply(v.key, v.valueAt(pos)) : null
    if (notice?.clamped && v.key === 'dpi') failure[v.key] = t.value.dpiMax(notice.max)
  } catch (e) {
    failure[v.key] = t.value.failed(String(e?.message || e || '').replace(/^Error:\s*/, '') || '—')
    live[v.key] = v.pos
  } finally {
    busy[v.key] = false
    // the host pushes the state it ended up in (a mode it did not take, a scale Windows kept); show that, not our guess
    const now = views.value.find((x) => x.key === v.key)
    if (now) live[v.key] = now.pos
  }
}
</script>

<template>
  <TransitionGroup v-if="shown" tag="div" name="m-tray-sl" class="m-tray__sliders">
    <p v-if="showTarget" key="target" class="m-tray__sl-target" :class="{ 'is-none': target.none }">
      <MIcon :name="target.none ? 'info' : 'monitor'" />
      <span class="m-tray__sl-target-text">{{ target.text }}<small v-if="target.hint">{{ target.hint }}</small></span>
    </p>
    <div v-for="v in views" :key="v.key" class="m-tray__slw">
      <div class="m-tray__sl" :class="{ 'is-busy': busy[v.key], 'is-err': failure[v.key] }">
        <MSliderItem
          :model-value="posOf(v)" :title="v.label" :icon="v.icon" :min="v.min" :max="v.max" :step="v.step" :decimals="0" size="m"
          :icon-start="ENDS[v.key][0]" :icon-end="ENDS[v.key][1]" :readout-text="textOf(v)" :off-text="v.offText" :disabled="!!busy[v.key]"
          @update:model-value="(pos) => onInput(v, pos)" @commit="(pos) => commit(v, pos)"
        />
      </div>
      <p v-if="failure[v.key]" class="m-tray__sl-err" role="alert"><MIcon name="error" />{{ failure[v.key] }}</p>
    </div>
  </TransitionGroup>
</template>
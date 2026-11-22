<script>
export const tileIds = ['ctl-audio', 'ctl-controller', 'ctl-cursor', 'ctl-keyboard', 'ctl-mouse', 'live-audio']
</script>

<script setup>
// The host's switches (references: REFERENCES.md "控制"): the whole tile is the switch, in the anatomy of the other squares: the label row, the state as the hero (a switch drawn big, its word beside it, never colour
// alone: Apple HIG), one line of hint that is dropped where it does not fit. On: the tile takes the accent's container and the track is filled with the accent; off: the card, the track an outline.
// What the person chose shows until the host's value comes back.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from '../MIcon.vue'
import MWords from '../MWords.vue'
import { b3Texts } from './b3Texts.js'
import { designProps } from './tileData.js'

const props = defineProps(designProps)
const emit = defineEmits(['act'])
const d = computed(() => props.card.data || {})
const L = computed(() => b3Texts(props.texts))
const onValue = computed(() => d.value.options?.[0]?.value)
const offValue = computed(() => d.value.options?.[1]?.value)
const draft = ref(null)
watch(() => d.value.value, () => { draft.value = null })
const on = computed(() => (draft.value !== null ? draft.value : String(d.value.value) === String(onValue.value)))
// the hint is one line: where it is wider than the tile it is dropped (it is the least of the tile; the title and the state say what the switch is and where it stands)
const root = ref(null), note = ref(null), dropped = ref(false)
let ro = null
const measure = () => { const e = note.value; if (e) dropped.value = e.scrollWidth > e.clientWidth + 1 }
const queue = () => nextTick(measure)
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && root.value) { ro = new ResizeObserver(queue); ro.observe(root.value) }
  if (typeof document !== 'undefined' && document.fonts) { document.fonts.ready?.then(queue); document.fonts.addEventListener?.('loadingdone', queue) }
})
watch(() => [d.value.runtime, props.texts], queue)
onBeforeUnmount(() => { ro?.disconnect(); if (typeof document !== 'undefined') document.fonts?.removeEventListener?.('loadingdone', queue) })
function flip() {
  if (props.preview) return
  draft.value = !on.value
  // a switch of the running stream (the host audio of the client) acts on the stream, it is not a saved setting: nothing says "after a restart" and the product sends the command
  if (d.value.runtime) { emit('act', { type: 'runtime-host-audio', value: { client: d.value.client, enabled: draft.value, failed: () => { draft.value = null } } }); return }
  emit('act', { type: 'setting', value: { key: d.value.key, value: draft.value ? onValue.value : offValue.value, failed: () => { draft.value = null } } })
}
</script>

<template>
  <!-- the anatomy of the other squares: the label row (icon and title, one line), the state as the hero (a switch that shows it, the word beside it), one line of hint that is dropped where it does not fit.
       The whole tile is the switch. -->
  <button ref="root" type="button" role="switch" class="m-tile m-cal m-cala m-b3t m-b3sw" :class="on ? 'is-on' : 'is-off'" data-size="s" data-accent="primary" :aria-checked="on" :aria-label="card.title" @click="flip">
    <header class="m-calm__head"><MIcon :name="d.icon" /><span class="m-calm__title"><MWords :text="card.title" /></span></header>
    <span class="m-b3sw__hero"><span class="m-b3sw__track" aria-hidden="true"><i /></span><b class="m-b3sw__state">{{ on ? L.on : L.off }}</b></span>
    <small ref="note" class="m-b3a__note m-b3sw__note" :class="{ 'is-dropped': dropped }" :aria-hidden="dropped ? 'true' : undefined">{{ d.runtime ? L.liveNote : L.restartNote }}</small>
  </button>
</template>

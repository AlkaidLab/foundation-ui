<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import MChipSet from '../MChipSet.vue'
import MSeg from '../MSeg.vue'
import MButton from '../MButton.vue'
import { fillText } from '../guideTexts.js'
import { LAYOUTS, canPlayLayout } from '../../testtools/logic.js'
import { MUSIC_TRACKS, alternatePans, channelModes, loopSeconds, routeOf, scheduleTrack, trackById } from '../../testtools/music.js'

// 声道: a short original music loop on one output channel (the destination's own channels through a channel merger;
// two channels only: left, right or both by pan), an alternating left/right test and a stereo sweep.
const props = defineProps({ T: { type: Object, required: true } })
const layout = ref('stereo')
const trackId = ref(MUSIC_TRACKS[0].id)
const playing = ref('')
const maxCh = ref(2)
let ctx = null
let master = null
let sources = []
let endTimer = 0
const options = computed(() => Object.keys(LAYOUTS).map((k) => ({ value: k, label: props.T.channels.layout[k] })))
const names = computed(() => channelModes(layout.value))
const trackOptions = computed(() => MUSIC_TRACKS.map((t) => ({ value: t.id, label: props.T.channels.trackName[t.id] })))
const can = computed(() => canPlayLayout(layout.value, maxCh.value))
function audio() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); maxCh.value = ctx.destination.maxChannelCount || 2 }
  return ctx.resume().then(() => ctx)
}
function stop() {
  clearTimeout(endTimer)
  const m = master; master = null
  if (m && ctx) {
    try { m.gain.cancelScheduledValues(ctx.currentTime); m.gain.setValueAtTime(m.gain.value, ctx.currentTime); m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06) } catch {}
  }
  const old = sources; sources = []
  setTimeout(() => { for (const s of old) { try { s.stop() } catch {} } }, 90)
  playing.value = ''
}
async function play(name) {
  const c = await audio()
  stop()
  playing.value = name
  const track = trackById(trackId.value)
  const spb = 60 / track.bpm
  const t0 = c.currentTime + 0.08
  const bus = c.createGain()
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2
  bus.connect(comp)
  master = c.createGain(); master.gain.value = 0.9; comp.connect(master)
  if (name === 'sweep' || name === 'alternate') {
    const p = c.createStereoPanner(); p.connect(c.destination)
    if (name === 'sweep') { p.pan.setValueAtTime(-1, t0); p.pan.linearRampToValueAtTime(1, t0 + loopSeconds(track)) }
    else for (const change of alternatePans(track, 2)) p.pan.setValueAtTime(change.pan, t0 + change.beat * spb)
    master.connect(p)
  } else {
    const route = routeOf(layout.value, name, c.destination.maxChannelCount || 2)
    if (route.kind === 'channel') {
      c.destination.channelCount = route.channels; c.destination.channelInterpretation = 'discrete'
      const merger = c.createChannelMerger(route.channels); merger.connect(c.destination); master.connect(merger, 0, route.channel)
    } else {
      c.destination.channelCount = 2; c.destination.channelInterpretation = 'speakers'
      const p = c.createStereoPanner(); p.pan.value = route.pan; p.connect(c.destination); master.connect(p)
    }
  }
  scheduleTrack(c, track, bus, sources, t0)
  endTimer = setTimeout(() => { if (playing.value === name) playing.value = '' }, (loopSeconds(track) + 2) * 1000)
}
onBeforeUnmount(() => { stop(); ctx?.close(); ctx = null })
</script>

<template>
  <section class="m-tt__tool">
    <p class="m-tt__note">{{ T.channels.note }}</p>
    <MChipSet v-model="trackId" :label="T.channels.track" :options="trackOptions" @update:model-value="stop" />
    <MSeg v-model="layout" :label="T.tools.channels" :options="options" @update:model-value="audio" />
    <div class="m-tt__chips"><MButton v-for="n in names" :key="n" :variant="playing === n ? 'filled' : 'tonal'" :disabled="!can && n !== 'L' && n !== 'R'" @click="play(n)">{{ T.channels.name[n] }}</MButton></div>
    <p v-if="!can" class="m-tt__note">{{ fillText(T.channels.only2, { n: maxCh }) }}</p>
    <div class="m-tt__row">
      <MButton variant="tonal" icon="swap_horiz" :selected="playing === 'sweep'" @click="play('sweep')">{{ T.channels.sweep }}</MButton>
      <MButton variant="tonal" icon="sync" :selected="playing === 'alternate'" @click="play('alternate')">{{ T.channels.alternate }}</MButton>
    </div>
  </section>
</template>

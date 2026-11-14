<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import MButton from '../MButton.vue'
import MSeg from '../MSeg.vue'
import { padButtonName, padIds, padRate, rumbleLines, stickOf } from '../../testtools/logic.js'

// 手柄: every pad the window can see, read on every frame (no permission; the browser shows a pad after a press on it): buttons with their value, sticks, triggers, the report rate, and a rumble on a press.
// hostRumble: asks the host for a short rumble through the stream (the panel and the Web UI pass it): the browser's own actuator cannot reach a pad that exists only during a stream.
const props = defineProps({ T: { type: Object, required: true }, hostRumble: { type: Function, default: null } })
const pads = shallowRef([])
const pick = ref(0)
const rate = ref(0)
const lines = ref([])
const rumbling = ref(false)
let raf = 0, stamps = [], lastIndex = -1
const read = () => Array.from(navigator.getGamepads?.() || []).filter(Boolean)
function tick() {
  const all = read()
  const pad = all.find((p) => p.index === pick.value) || all[0]
  if (pad) {
    if (pad.index !== lastIndex) { stamps = []; lastIndex = pad.index }
    stamps.push(pad.timestamp); if (stamps.length > 240) stamps.shift()
    if (stamps.length % 30 === 0) rate.value = padRate(stamps)
  }
  pads.value = all.map((p) => ({ index: p.index, id: p.id, standard: p.mapping === 'standard', buttons: p.buttons.map((b) => ({ pressed: b.pressed, value: b.value })), axes: [...p.axes], rumble: !!p.vibrationActuator }))
  raf = requestAnimationFrame(tick)
}
const pad = computed(() => pads.value.find((p) => p.index === pick.value) || pads.value[0] || null)
const options = computed(() => pads.value.map((p) => ({ value: p.index, label: `#${p.index + 1}` })))
const ids = computed(() => padIds(pad.value?.id))
const sticks = computed(() => (pad.value && pad.value.axes.length >= 4 ? [0, 1].map((n) => stickOf(pad.value.axes, n)) : []))
const triggers = computed(() => (pad.value?.standard ? [6, 7].map((i) => pad.value.buttons[i]?.value ?? 0) : []))
const faces = computed(() => (pad.value?.standard ? pad.value.buttons.map((b, i) => ({ ...b, i })).filter((b) => b.i !== 6 && b.i !== 7) : (pad.value?.buttons || []).map((b, i) => ({ ...b, i }))))
// A DualSense (Sony 054c) is what a stream's virtual pad is: the host sends its rumble through the stream, which is what a game's rumble takes. Another pad, or a host that is not reachable, uses the pad's own actuator.
const viaHost = () => !!props.hostRumble && (!pad.value || !pad.value.rumble || ids.value?.vendor === '054c')
async function rumble() {
  if (rumbling.value) return
  rumbling.value = true
  let host = null, hostError = null, browser = null
  try {
    if (viaHost()) {
      try { host = await props.hostRumble({ duration_ms: 400 }) } catch (e) { hostError = { status: e?.status, message: e?.message } }
    }
    // The browser's actuator runs when the host did not send (no pad there, an old host), or when the pad is not the stream's.
    if (!host || host.result !== 'sent') {
      const p = pad.value ? Array.from(navigator.getGamepads?.() || []).find((x) => x && x.index === pad.value.index) : null
      if (!p?.vibrationActuator) browser = pad.value ? { state: 'none' } : null
      else {
        try { const r = await p.vibrationActuator.playEffect('dual-rumble', { duration: 500, strongMagnitude: 1, weakMagnitude: 1 }); browser = { state: r === 'preempted' ? 'preempted' : 'complete' } } catch (e) { browser = { state: 'error', message: e?.message || String(e) } }
      }
    }
  } finally {
    lines.value = rumbleLines({ host, hostError, browser })
    rumbling.value = false
  }
}
const say = (l) => { const t = props.T.pad.rumbleResult[l.key] || ''; return t.replace('{n}', l.n ?? '').replace('{ms}', l.ms ?? '').replace('{why}', l.why || '–') }
const wake = () => { if (!raf) raf = requestAnimationFrame(tick) }
onMounted(() => { window.addEventListener('gamepadconnected', wake); wake() })
onBeforeUnmount(() => { window.removeEventListener('gamepadconnected', wake); cancelAnimationFrame(raf); raf = 0 })
const facts = computed(() => { const P = props.T.pad; const p = pad.value; return p ? [[P.device, p.id.replace(/\s*\(.*\)\s*$/, '') || p.id], [P.mapping, p.standard ? P.standard : P.other], [P.ids, ids.value ? `${ids.value.vendor} / ${ids.value.product}` : '–'], [P.rate, rate.value ? `${rate.value} ${P.hz}` : '–']] : [] })
</script>

<template>
  <section class="m-tt__tool">
    <p class="m-tt__note">{{ T.pad.note }}</p>
    <div v-if="!pad" class="m-tt__stage m-tt__pad" aria-live="polite"><span class="m-tt__hint">{{ T.pad.none }}</span></div>
    <div v-if="!pad && hostRumble" class="m-tt__row">
      <MButton variant="tonal" icon="sports_esports" :disabled="rumbling" @click="rumble">{{ T.pad.rumble }}</MButton>
      <ul class="m-tt__facts" aria-live="polite"><li v-for="l in lines" :key="l.key" class="m-tt__fact" :data-tone="l.tone">{{ say(l) }}</li></ul>
    </div>
    <template v-else-if="pad">
      <MSeg v-if="pads.length > 1" v-model="pick" :label="T.pad.device" :options="options" />
      <dl class="m-tt__stats"><div v-for="[k, v] in facts" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div></dl>
      <div class="m-tt__keys" role="group" :aria-label="T.pad.buttons">
        <span v-for="b in faces" :key="b.i" class="m-tt__key" :class="{ 'is-down': b.pressed }" :style="{ '--v': b.value }">{{ padButtonName(b.i, pad.standard) }}</span>
      </div>
      <div class="m-tt__sticks" role="group" :aria-label="T.pad.sticks">
        <figure v-for="(s, n) in sticks" :key="n" class="m-tt__stick" :class="{ 'is-on': s.r > 0 }">
          <span class="m-tt__ring"><i :style="{ transform: `translate(${s.x * 40}px, ${s.y * 40}px)` }" /></span>
          <figcaption>{{ n ? T.pad.right : T.pad.left }} · {{ s.x.toFixed(2) }}, {{ s.y.toFixed(2) }}</figcaption>
        </figure>
        <figure v-for="(v, n) in triggers" :key="`t${n}`" class="m-tt__trigger">
          <span class="m-tt__track"><i :style="{ transform: `scaleY(${v})` }" /></span>
          <figcaption>{{ padButtonName(6 + n) }} · {{ v.toFixed(2) }}</figcaption>
        </figure>
      </div>
      <div v-if="!pad.standard" class="m-tt__axes"><div v-for="(a, n) in pad.axes" :key="n" class="m-tt__axis"><span>{{ T.pad.axes }} {{ n }}</span><i :style="{ '--a': (a + 1) / 2 }" /><b>{{ a.toFixed(2) }}</b></div></div>
      <div class="m-tt__row">
        <MButton variant="tonal" icon="sports_esports" :disabled="rumbling || (!pad.rumble && !hostRumble)" @click="rumble">{{ T.pad.rumble }}</MButton>
        <span v-if="!pad.rumble && !hostRumble" class="m-tt__fact">{{ T.pad.rumbleOff }}</span>
        <ul v-else class="m-tt__facts" aria-live="polite"><li v-for="l in lines" :key="l.key" class="m-tt__fact" :data-tone="l.tone">{{ say(l) }}</li></ul>
      </div>
    </template>
  </section>
</template>

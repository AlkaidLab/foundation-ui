<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import MButton from '../MButton.vue'
import MNotice from '../MNotice.vue'
import { aspectOf, paceStats, physicalSize, widestGamut } from '../../testtools/logic.js'

// 显示器信息: the display this window is on (read again when the window moves or is resized), the refresh rate measured over a second and a half, and, on a press of Detect, every display
// (the Window Management permission is asked only then).
const props = defineProps({ T: { type: Object, required: true } })
const info = reactive({})
const hz = ref(0)
const measuring = ref(false)
const all = ref([])
const failure = ref('')
const canDetect = typeof window !== 'undefined' && typeof window.getScreenDetails === 'function'
const mq = (q) => !!window.matchMedia?.(q).matches
function read() {
  const dpr = window.devicePixelRatio || 1
  Object.assign(info, {
    dpr, w: screen.width, h: screen.height, aw: screen.availWidth, ah: screen.availHeight, iw: window.innerWidth, ih: window.innerHeight,
    depth: screen.colorDepth, gamut: widestGamut((g) => mq(`(color-gamut: ${g})`)), hdr: mq('(dynamic-range: high)'), fine: mq('(pointer: fine)'), touch: navigator.maxTouchPoints || 0,
    portrait: screen.height > screen.width, dark: mq('(prefers-color-scheme: dark)'), extended: !!screen.isExtended,
  })
}
let raf = 0, times = []
function measure() {
  cancelAnimationFrame(raf); times = []; measuring.value = true
  const step = (t) => { times.push(t); if (times.length < 90) raf = requestAnimationFrame(step); else { measuring.value = false; hz.value = paceStats(times)?.refreshHz || 0 } }
  raf = requestAnimationFrame(step)
}
async function detect() {
  failure.value = ''
  try {
    const d = await window.getScreenDetails()
    all.value = d.screens.map((s) => ({ key: `${s.left},${s.top}`, label: s.label, w: s.width, h: s.height, ratio: s.devicePixelRatio, primary: s.isPrimary, internal: s.isInternal }))
  } catch (e) { failure.value = e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : 'unsupported' }
}
let media = null
onMounted(() => {
  read(); measure(); window.addEventListener('resize', read)
  media = window.matchMedia?.(`(resolution: ${window.devicePixelRatio}dppx)`); media?.addEventListener?.('change', read)
})
onBeforeUnmount(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', read); media?.removeEventListener?.('change', read) })
const yn = (v) => (v ? props.T.display.yes : props.T.display.no)
const rows = computed(() => {
  const D = props.T.display; const i = info; const p = physicalSize(i.w || 0, i.h || 0, i.dpr || 1)
  return [
    [D.size, `${p.width} × ${p.height}`], [D.ratio, `${(i.dpr || 1).toFixed(2)}×`], [D.aspect, aspectOf(i.w, i.h) || '–'],
    [D.area, `${i.aw} × ${i.ah}`], [D.window, `${i.iw} × ${i.ih}`],
    [D.refresh, measuring.value ? D.measuring : hz.value ? `${hz.value.toFixed(1)} Hz` : '–'],
    [D.depth, `${i.depth} ${D.bits}`], [D.gamut, i.gamut ? i.gamut.toUpperCase().replace('REC2020', 'Rec. 2020').replace('P3', 'Display P3').replace('SRGB', 'sRGB') : '–'], [D.hdr, yn(i.hdr)],
    [D.pointer, i.fine ? D.fine : D.coarse], [D.touch, String(i.touch)], [D.orientation, i.portrait ? D.portrait : D.landscape], [D.scheme, i.dark ? D.dark : D.light],
  ]
})
</script>

<template>
  <section class="m-tt__tool">
    <p class="m-tt__note">{{ T.display.note }}</p>
    <dl class="m-tt__stats"><div v-for="[k, v] in rows" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div></dl>
    <div class="m-tt__row">
      <MButton variant="tonal" icon="restart_alt" :disabled="measuring" @click="measure">{{ T.display.again }}</MButton>
      <MButton variant="tonal" icon="desktop_windows" :disabled="!canDetect" @click="detect">{{ T.display.detect }}</MButton>
    </div>
    <MNotice v-if="!canDetect" tone="info">{{ T.display.unsupported }}</MNotice>
    <MNotice v-else-if="failure" tone="warn">{{ T.display[failure] }}</MNotice>
    <template v-if="all.length">
      <p class="m-tt__note">{{ info.extended ? T.display.extended : T.display.single }}</p>
      <ul class="m-tt__screens" :aria-label="T.display.displays">
        <li v-for="s in all" :key="s.key"><b>{{ s.label || '–' }}</b><span>{{ s.w }} × {{ s.h }} · {{ s.ratio.toFixed(2) }}×<template v-if="s.primary"> · {{ T.display.primary }}</template><template v-if="s.internal"> · {{ T.display.internal }}</template></span></li>
      </ul>
    </template>
  </section>
</template>

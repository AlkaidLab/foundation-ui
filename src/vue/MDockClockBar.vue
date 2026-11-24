<script setup>
import { computed, onMounted, ref } from 'vue'
import MDockClock from './MDockClock.vue'
import { CLOCK_ALIGNS, CLOCK_FACES, clockSizesOffered, effectiveClockSize } from '../appearance/appearance.js'
import { appearanceTexts } from './appearanceTexts.js'

/**
 * The clock of the clock mode, set where the overview is edited: the face, the size and the place. It is shown by the edit sheet while the overview is the clock mode (MHomeDash.vue); the same
 * settings are in 个性化 (MAppearance.vue) and both write the same appearance. `width` is the window's, which decides the sizes it offers (appearance.js clockSizesOffered).
 */
const props = defineProps({
  /** the appearance store of the page (useAppearance) */
  appearance: { type: Object, required: true },
  locale: { type: String, default: 'en' },
  width: { type: Number, default: 1280 },
})
const T = computed(() => appearanceTexts(props.locale))
const s = computed(() => props.appearance.state)
const faceName = (f) => T.value[`face${f[0].toUpperCase()}${f.slice(1)}`]
const sizes = computed(() => clockSizesOffered(props.width).map((k) => [k, T.value[`size${k.toUpperCase()}`]]))
const sizeNow = computed(() => effectiveClockSize(s.value.clockSize, props.width))
const strip = ref(null)
// the strip scrolls sideways (no bar is drawn): the wheel turns into the sideways move, and the chosen face is brought to the middle when the sheet opens
const onWheel = (e) => { const el = e.currentTarget; if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; el.scrollLeft += e.deltaY; e.preventDefault() }
onMounted(() => { const el = strip.value; const on = el?.querySelector('.is-on'); if (el && on) el.scrollLeft = on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2 })
const aligns = computed(() => CLOCK_ALIGNS.map((a) => [a, T.value[`align${a[0].toUpperCase()}${a.slice(1)}`]]))
</script>

<template>
  <div class="m-dclock" data-clock-bar>
    <div ref="strip" class="m-dclock__faces" role="radiogroup" :aria-label="T.clockFace" @wheel="onWheel">
      <button v-for="f in CLOCK_FACES" :key="f" type="button" role="radio" class="m-dclock__face" :class="{ 'is-on': s.clockFace === f }" :aria-checked="s.clockFace === f" :data-face="f" @click="appearance.set({ clockFace: f })">
        <span class="m-dclock__preview"><MDockClock :face="f" :locale="locale" :seconds="s.clockSeconds" preview /></span>
        <span class="m-dclock__name">{{ faceName(f) }}</span>
      </button>
    </div>
    <div class="m-dclock__side">
      <div class="m-dclock__group"><span class="m-dedit__layoutlabel">{{ T.clockSize }}</span>
        <span class="m-dsize m-dedit__layout" role="radiogroup" :aria-label="T.clockSize"><button v-for="[k, label] in sizes" :key="k" type="button" role="radio" :aria-checked="sizeNow === k" :class="{ 'is-on': sizeNow === k }" :data-clock-size="k" @click="appearance.set({ clockSize: k })">{{ label }}</button></span></div>
      <div class="m-dclock__group"><span class="m-dedit__layoutlabel">{{ T.clockAlign }}</span>
        <span class="m-dsize m-dedit__layout m-dedit__align" role="radiogroup" :aria-label="T.clockAlign"><button v-for="[a, label] in aligns" :key="a" type="button" role="radio" :aria-checked="s.clockAlign === a" :class="{ 'is-on': s.clockAlign === a }" :data-clock-align="a" @click="appearance.set({ clockAlign: a })">{{ label }}</button></span></div>
    </div>
  </div>
</template>

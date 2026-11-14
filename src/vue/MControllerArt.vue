<script setup>
import { computed } from 'vue'

// A drawn gamepad of the kind the host emulates, in the colours of the theme. Every kind has its own silhouette:
// ds5 (wide two-tone shell, wide touchpad with the light bar curving around it, mic button), ds4 (narrower, light bar
// as a strip above a small touchpad), x360 (round guide with a ring, long grips), xone (slim, flat guide, view and menu),
// switch (Pro: rounded grips, minus/plus, capture), auto (a dashed outline: the host chooses). `hot` lights the parts
// that the current settings map: touchpad, back, motion (gyro waves), guide. `light` colours the light bar of the
// PlayStation kinds. Decorative: the legend or the row beside it carries the meaning.
const props = defineProps({
  type: { type: String, default: 'auto' },
  hot: { type: Array, default: () => [] },
  light: { type: String, default: '' },
})
const kind = computed(() => (['ds5', 'ds4', 'x360', 'xone', 'switch'].includes(props.type) ? props.type : 'auto'))
const lit = (part) => props.hot.includes(part)
const BODY = {
  ds5: 'M42 24 H158 C174 24 183 36 188 64 L196 104 C198 120 186 127 176 121 C168 116 164 104 156 98 C152 95 148 94 144 94 H56 C52 94 48 95 44 98 C36 104 32 116 24 121 C14 127 2 120 4 104 L12 64 C17 36 26 24 42 24 Z',
  ds4: 'M54 26 H146 C161 26 171 38 177 64 L186 100 C189 114 176 121 165 113 L152 103 C148 100 144 99 140 99 H60 C56 99 52 100 48 103 L35 113 C24 121 11 114 14 100 L23 64 C29 38 39 26 54 26 Z',
  x360: 'M50 26 H150 C166 26 175 38 181 62 L192 104 C195 119 180 124 169 115 L154 102 C150 99 146 98 142 98 H58 C54 98 50 99 46 102 L31 115 C20 124 5 119 8 104 L19 62 C25 38 34 26 50 26 Z',
  xone: 'M52 28 H148 C163 28 172 38 178 60 L190 104 C193 118 181 122 171 114 L156 101 C152 98 148 97 144 97 H56 C52 97 48 98 44 101 L29 114 C19 122 7 118 10 104 L22 60 C28 38 37 28 52 28 Z',
  switch: 'M54 26 H146 C164 26 176 40 182 66 L190 100 C193 116 180 124 168 116 C160 111 156 100 148 98 C144 97 140 97 136 97 H64 C60 97 56 97 52 98 C44 100 40 111 32 116 C20 124 7 116 10 100 L18 66 C24 40 36 26 54 26 Z',
}
const FACE = 'M50 28 H150 C165 28 173 38 178 60 L181 80 H19 L22 60 C27 38 35 28 50 28 Z'
</script>

<template>
  <svg class="m-ctl" :class="`m-ctl--${kind}`" viewBox="0 0 200 132" aria-hidden="true" focusable="false">
    <template v-if="kind === 'auto'">
      <path class="m-ctl__ghost" :d="BODY.x360" />
      <path class="m-ctl__ghost m-ctl__ghost--inner" :d="BODY.ds5" transform="translate(0 6) scale(1 .94)" />
      <path class="m-ctl__spark" d="M100 38 L105 56 L123 61 L105 66 L100 84 L95 66 L77 61 L95 56 Z" />
      <path class="m-ctl__spark m-ctl__spark--small" d="M142 36 L144.5 43 L152 45.5 L144.5 48 L142 55 L139.5 48 L132 45.5 L139.5 43 Z" />
    </template>
    <template v-else>
      <path class="m-ctl__shoulder" d="M44 20 Q44 14 52 14 H74 Q80 14 80 20 V24 H44 Z" />
      <path class="m-ctl__shoulder" d="M156 20 Q156 14 148 14 H126 Q120 14 120 20 V24 H156 Z" />
      <path class="m-ctl__body" :d="BODY[kind]" />
      <g v-if="kind === 'ds5'">
        <path class="m-ctl__face" :d="FACE" />
        <path class="m-ctl__bar" :style="light ? { stroke: light } : null" d="M68 34 Q61 47 68 60" /><path class="m-ctl__bar" :style="light ? { stroke: light } : null" d="M132 34 Q139 47 132 60" />
        <rect class="m-ctl__pad" :class="{ 'is-hot': lit('touchpad') }" x="74" y="30" width="52" height="30" rx="9" />
        <rect class="m-ctl__small" :class="{ 'is-hot': lit('back') }" x="55" y="40" width="7" height="4" rx="2" /><rect class="m-ctl__small" x="138" y="40" width="7" height="4" rx="2" />
        <ellipse class="m-ctl__small" cx="100" cy="68" rx="4.5" ry="2.4" />
        <g class="m-ctl__dpad"><path d="M36 50 h8 v-6 h6 v6 h8 v6 h-8 v6 h-6 v-6 h-8 z" /></g>
        <circle class="m-ctl__stick" cx="78" cy="82" r="11" /><circle class="m-ctl__cap" cx="78" cy="82" r="6" />
        <circle class="m-ctl__stick" cx="122" cy="82" r="11" /><circle class="m-ctl__cap" cx="122" cy="82" r="6" />
        <g class="m-ctl__btns"><circle cx="157" cy="38" r="4.5" /><circle cx="157" cy="58" r="4.5" /><circle cx="147" cy="48" r="4.5" /><circle cx="167" cy="48" r="4.5" /></g>
        <circle class="m-ctl__guide" :class="{ 'is-hot': lit('guide') }" cx="100" cy="82" r="4" />
      </g>
      <g v-else-if="kind === 'ds4'">
        <rect class="m-ctl__light" x="78" y="27" width="44" height="3" rx="1.5" :style="light ? { fill: light } : null" />
        <rect class="m-ctl__pad" :class="{ 'is-hot': lit('touchpad') }" x="80" y="33" width="40" height="22" rx="6" />
        <rect class="m-ctl__small" :class="{ 'is-hot': lit('back') }" x="68" y="36" width="7" height="4" rx="2" /><rect class="m-ctl__small" x="125" y="36" width="7" height="4" rx="2" />
        <g class="m-ctl__dpad"><path d="M48 46 h8 v-6 h6 v6 h8 v6 h-8 v6 h-6 v-6 h-8 z" /></g>
        <circle class="m-ctl__stick" cx="80" cy="78" r="11" /><circle class="m-ctl__cap" cx="80" cy="78" r="6" />
        <circle class="m-ctl__stick" cx="120" cy="78" r="11" /><circle class="m-ctl__cap" cx="120" cy="78" r="6" />
        <g class="m-ctl__btns"><circle cx="148" cy="40" r="4.5" /><circle cx="148" cy="60" r="4.5" /><circle cx="138" cy="50" r="4.5" /><circle cx="158" cy="50" r="4.5" /></g>
        <circle class="m-ctl__guide" :class="{ 'is-hot': lit('guide') }" cx="100" cy="68" r="4" />
      </g>
      <g v-else-if="kind === 'switch'">
        <circle class="m-ctl__stick" cx="52" cy="48" r="11" /><circle class="m-ctl__cap" cx="52" cy="48" r="6" />
        <g class="m-ctl__dpad"><path d="M72 74 h8 v-6 h6 v6 h8 v6 h-8 v6 h-6 v-6 h-8 z" /></g>
        <circle class="m-ctl__stick" cx="124" cy="78" r="11" /><circle class="m-ctl__cap" cx="124" cy="78" r="6" />
        <g class="m-ctl__btns"><circle cx="150" cy="36" r="4.5" /><circle cx="150" cy="56" r="4.5" /><circle cx="140" cy="46" r="4.5" /><circle cx="160" cy="46" r="4.5" /></g>
        <rect class="m-ctl__small" :class="{ 'is-hot': lit('back') }" x="82" y="40" width="9" height="3" rx="1.5" /><path class="m-ctl__small" d="M108 40 h9 M112.500 36 v9" stroke-width="3" stroke-linecap="round" />
        <rect class="m-ctl__small" x="92" y="52" width="9" height="9" rx="2.5" /><circle class="m-ctl__guide" :class="{ 'is-hot': lit('guide') }" cx="112" cy="54" r="4" />
      </g>
      <g v-else-if="kind === 'xone'">
        <circle class="m-ctl__stick" cx="56" cy="50" r="11" /><circle class="m-ctl__cap" cx="56" cy="50" r="6" />
        <g class="m-ctl__dpad"><path d="M76 74 h8 v-6 h6 v6 h8 v6 h-8 v6 h-6 v-6 h-8 z" /></g>
        <circle class="m-ctl__stick" cx="124" cy="76" r="11" /><circle class="m-ctl__cap" cx="124" cy="76" r="6" />
        <g class="m-ctl__btns"><circle cx="148" cy="38" r="4.5" /><circle cx="148" cy="58" r="4.5" /><circle cx="138" cy="48" r="4.5" /><circle cx="158" cy="48" r="4.5" /></g>
        <rect class="m-ctl__small" :class="{ 'is-hot': lit('back') }" x="82" y="46" width="7" height="4" rx="2" /><rect class="m-ctl__small" x="111" y="46" width="7" height="4" rx="2" />
        <circle class="m-ctl__guide" :class="{ 'is-hot': lit('guide') }" cx="100" cy="36" r="4.5" />
      </g>
      <g v-else>
        <circle class="m-ctl__stick" cx="56" cy="50" r="11" /><circle class="m-ctl__cap" cx="56" cy="50" r="6" />
        <g class="m-ctl__dpad"><path d="M76 74 h8 v-6 h6 v6 h8 v6 h-8 v6 h-6 v-6 h-8 z" /></g>
        <circle class="m-ctl__stick" cx="124" cy="76" r="11" /><circle class="m-ctl__cap" cx="124" cy="76" r="6" />
        <g class="m-ctl__btns"><circle cx="148" cy="38" r="4.5" /><circle cx="148" cy="58" r="4.5" /><circle cx="138" cy="48" r="4.5" /><circle cx="158" cy="48" r="4.5" /></g>
        <circle class="m-ctl__small" :class="{ 'is-hot': lit('back') }" cx="88" cy="46" r="3" />
        <circle class="m-ctl__small" cx="112" cy="46" r="3" />
        <circle class="m-ctl__ring" cx="100" cy="36" r="9" /><circle class="m-ctl__guide" :class="{ 'is-hot': lit('guide') }" cx="100" cy="36" r="5.500" />
      </g>
      <g v-if="lit('motion')" class="m-ctl__wave">
        <path d="M8 56 q-5 10 0 20" /><path d="M2 52 q-8 14 0 28" />
        <path d="M192 56 q5 10 0 20" /><path d="M198 52 q8 14 0 28" />
      </g>
    </template>
  </svg>
</template>

<script setup>
// The launch splash (启动画面): while a game starts, the display the stream captures shows its hero, its name, one stage line and a wavy waiting line, until the
// game's window is up. Drawn by the Panel in a click-through window of its own; the host sends the stage as a code and this turns it into a line (launchsplash/texts.js).
// With a hero it is the backdrop, the text sits bottom left on a scrim (white on dark in either theme) with the wavy bar; without one the name is centred on the theme's
// tonal surface under the expressive loading shape (the focal element of a screen that has no picture).
// `leaving` fades it out; it never takes focus or input.
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import MLoading from './MLoading.vue'
import { launchLine, launchSplashTexts } from '../launchsplash/texts.js'

const props = defineProps({
  name: { type: String, default: '' },
  /** the hero: an address or a data URL; empty draws the placeholder */
  art: { type: String, default: '' },
  stage: { type: String, default: 'starting' },
  /** the code of a notice, or of the reason when the stage is failed */
  notice: { type: String, default: '' },
  locale: { type: String, default: 'zh' },
  texts: { type: Object, default: () => ({}) },
  leaving: { type: Boolean, default: false },
  /** fill the frame it is in instead of the window (the gallery, a preview) */
  inline: { type: Boolean, default: false },
})
const T = computed(() => launchSplashTexts(props.locale, props.texts))
const line = computed(() => launchLine(T.value, { stage: props.stage, notice: props.notice }))
</script>

<template>
  <div class="m-launch" :class="{ 'm-launch--inline': inline, 'm-launch--art': !!art, 'is-failed': line.kind === 'failed', 'is-leaving': leaving }" role="status" aria-live="polite">
    <template v-if="art"><img class="m-launch__art" :src="art" alt="" draggable="false"><div class="m-launch__scrim" /></template>
    <div class="m-launch__frame">
      <div class="m-launch__body">
        <MLoading v-if="!art && line.kind !== 'failed'" class="m-launch__mark" contained size="clamp(72px, 13cqmin, 240px)" :label="line.text" />
        <h1 class="m-launch__name">{{ name }}</h1>
        <p class="m-launch__line" :class="`m-launch__line--${line.kind}`"><MIcon v-if="line.kind === 'failed'" name="error" fill />{{ line.text }}</p>
        <div v-if="art && line.kind !== 'failed'" class="m-launch__bar"><div class="m-launch__wave" role="progressbar" :aria-label="line.text"><i class="m-launch__wave-track" /><i class="m-launch__wave-run" /></div></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MBreakText from './MBreakText.vue'
import { ref } from 'vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import { reachTexts } from '../settings/reachTexts.js'

// One path of the reachability check as a status: the verdict of the host (icon, colour, word), what it means in one sentence, the evidence behind it, and the address a client
// should enter with a copy button. It shows only what the host reported ("verified" only where the host says verified). The card, the first-run step and the home tiles use it.
//   path: one entry of `reachView(report).paths`
const props = defineProps({
  path: { type: Object, required: true },
  locale: { type: String, default: 'en' },
  copy: { type: Function, default: null },
  /** only the status line (icon, title, word, sentence): no evidence and no address */
  compact: { type: Boolean, default: false },
})
const T = () => reachTexts(props.locale)
const copied = ref('')
let timer = 0
async function copyText(text) {
  try {
    if (props.copy) await props.copy(text)
    else await globalThis.navigator?.clipboard?.writeText(text)
    copied.value = text; clearTimeout(timer); timer = setTimeout(() => { copied.value = '' }, 1600)
  } catch { /* the text stays visible */ }
}
</script>

<template>
  <div class="m-reachv" :class="`is-${path.tone}`" :data-path="path.id" :data-verdict="path.verdict">
    <div class="m-reach__row">
      <span class="m-reach__ico"><MIcon :name="path.icon" :fill="path.tone === 'ok'" /></span>
      <div class="m-reach__main">
        <div class="m-reach__title"><b>{{ path.title }}</b><span class="m-reach__word">{{ path.word }}</span></div>
        <p class="m-reach__headline">{{ path.headline }}</p>
      </div>
    </div>
    <template v-if="!compact">
      <ul v-if="path.evidence.length" class="m-reach__evidence"><li v-for="(e, i) in path.evidence" :key="i"><MIcon name="history" />{{ e }}</li></ul>
      <div class="m-reach__address">
        <span>{{ path.addressLabel }}</span>
        <template v-if="path.address">
          <code><MBreakText :text="path.address" /></code>
          <MButton variant="tonal" size="sm" :icon="copied === path.address ? 'check' : 'content_copy'" @click="copyText(path.address)">{{ copied === path.address ? T().copied : T().copy }}</MButton>
        </template>
        <em v-else>{{ T().noAddress }}</em>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import MIcon from './MIcon.vue'
import { titleVersionView, titleVersionTip, reportText } from '../about/titleVersion.js'
import { shortVersion } from '../about/titleVersion.js'
import { buildTimeLocal } from '../about/build.js'
import { captionTexts, fill } from '../nav/captionTexts.js'

// The version beside the product's name in the caption bar: the short version in a quiet style, a 测试版 tag for a pre-release build; a click (or Enter) copies the full version and the build
// for a bug report. When an update waits, 「有更新可用」 with the new short version sits next to it and opens 软件更新. Narrow windows give up the words first (css/capver.css), never wrap or cut.
const props = defineProps({
  version: { type: String, default: '' },
  /** the build identity the host recorded (see about/build.js); null for an older host */
  build: { type: Object, default: null },
  os: { type: String, default: '' },
  locale: { type: String, default: 'en' },
  /** the version that waits (an update is available); '' when none */
  update: { type: String, default: '' },
  texts: { type: Object, default: null },
})
const emit = defineEmits(['copied', 'open-update'])
const T = computed(() => captionTexts(props.locale, props.texts))
const view = computed(() => titleVersionView({ version: props.version, build: props.build }))
const tip = computed(() => `${titleVersionTip(view.value, T.value)}\n${T.value.copyHint}`)
const updateShort = computed(() => shortVersion(props.update))
const updateTip = computed(() => fill(T.value.updateTip, { version: props.update }))

const copied = ref(false)
let timer = 0
async function copy() {
  const text = reportText({ version: props.version, build: props.build, os: props.os }, T.value, buildTimeLocal)
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => { copied.value = false }, 1800)
    emit('copied', text)
  } catch { emit('copied', '') }
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <span v-if="view.short || update" class="m-capver">
    <button v-if="view.short" type="button" class="m-capver__btn" :class="{ 'is-copied': copied, 'is-test': view.test }" :aria-label="`${view.full}${view.test ? ' ' + T.test : ''}. ${T.copyHint}`" :data-tip="tip" :data-from="view.testFrom || undefined" @click="copy">
      <span class="m-capver__num">{{ view.short }}</span>
      <span v-if="view.test" class="m-capver__test">{{ T.test }}</span>
      <MIcon v-if="copied" name="check" class="m-capver__ok" />
      <span v-if="copied" class="m-capver__pop" role="status"><MIcon name="check_circle" />{{ T.copiedNote }}</span>
    </button>
    <button v-if="update" type="button" class="m-capver__update" :aria-label="updateTip" :data-tip="updateTip" @click="emit('open-update')">
      <MIcon name="system_update_alt" />
      <span class="m-capver__utext">{{ T.updateAvailable }}</span>
      <span class="m-capver__uver">{{ updateShort }}</span>
    </button>
  </span>
</template>

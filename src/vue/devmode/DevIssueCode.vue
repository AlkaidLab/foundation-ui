<script setup>
import { computed, ref } from 'vue'
import MIcon from '../MIcon.vue'
import { issueFormTexts } from '../../devmode/issueFormTexts.js'

// A block of code or log in an issue: monospace, collapsed to a few lines when it is long, with its line count, a copy button and an expand button.
const FOLD_OVER = 8
const PREVIEW = 5
const props = defineProps({
  text: { type: String, default: '' },
  lang: { type: String, default: '' },
  title: { type: String, default: '' },
  locale: { type: String, default: 'zh' },
  /** collapsed at first when longer than FOLD_OVER lines; false draws it whole */
  fold: { type: Boolean, default: true },
})
const emit = defineEmits(['copied'])
const T = computed(() => issueFormTexts(props.locale))
const rows = computed(() => props.text.replace(/\n+$/, '').split('\n'))
const long = computed(() => props.fold && rows.value.length > FOLD_OVER)
const open = ref(false)
const shown = computed(() => (long.value && !open.value ? rows.value.slice(0, PREVIEW).join('\n') : rows.value.join('\n')))
const lines = computed(() => T.value.lines.replace('{n}', rows.value.length))
async function copy() { try { await navigator.clipboard.writeText(props.text); emit('copied', T.value.copied) } catch { /* the browser refused */ } }
</script>

<template>
  <figure class="dm-ifc" :class="{ 'dm-ifc--folded': long && !open }" data-dev="issue-code">
    <figcaption class="dm-ifc__bar">
      <span class="dm-ifc__title">{{ title || lang }}</span>
      <span class="dm-ifc__n">{{ lines }}</span>
      <button type="button" class="dm-ifc__btn" :aria-label="T.copy" :title="T.copy" data-dev="code-copy" @click="copy"><MIcon name="content_copy" /></button>
      <button v-if="long" type="button" class="dm-ifc__btn dm-ifc__btn--text" :aria-expanded="open" data-dev="code-toggle" @click="open = !open"><MIcon :name="open ? 'unfold_less' : 'unfold_more'" />{{ open ? T.collapse : T.expand }}</button>
    </figcaption>
    <pre class="dm-ifc__pre" tabindex="0"><code>{{ shown }}</code></pre>
  </figure>
</template>

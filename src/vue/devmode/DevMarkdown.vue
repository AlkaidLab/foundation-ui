<script>
import { computed, h } from 'vue'
import { parseMarkdown } from '../../devmode/markdown.js'
import { renderBlocks } from './renderMarkdown.js'
import DevIssueCode from './DevIssueCode.vue'

// The text of an issue or a comment, drawn as Markdown (see devmode/markdown.js: a small reader of our own that never produces HTML; renderMarkdown.js draws its tree with Vue elements).
export default {
  name: 'DevMarkdown',
  props: {
    source: { type: String, default: '' },
    /** opens an address outside the window */
    openUrl: { type: Function, default: null },
    /** opens a picture (the viewer of the Issue Form view) instead of its address */
    openImage: { type: Function, default: null },
    /** draw the code blocks as DevIssueCode (a long one is folded, with its line count and a copy button) */
    foldCode: { type: Boolean, default: false },
    locale: { type: String, default: 'zh' },
  },
  emits: ['copied'],
  setup(props, { emit }) {
    const tree = computed(() => parseMarkdown(props.source))
    const open = (url) => { if (props.openUrl) props.openUrl(url); else if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener') }
    const code = (b, key) => h(DevIssueCode, { key, text: b.text, lang: b.lang || '', locale: props.locale, onCopied: (t) => emit('copied', t) })
    return () => h('div', { class: 'dm-md' }, renderBlocks(tree.value, { open, image: props.openImage || undefined, code: props.foldCode ? code : undefined }))
  },
}
</script>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import MIcon from './MIcon.vue'
import { qrPath } from './guideModel.js'
import { copyChoices } from '../clients/assets.js'

/**
 * What to do with a download besides 下载 on this machine: copy the link (the one 下载 uses; a small menu also offers the CNB and the GitHub link), and share it: a QR code of
 * the link in a popover so a phone or another computer can scan it, and the system share sheet where there is one (the Web Share API). Downloads are mostly for another device.
 *   url        the link of the 下载 button, exactly (what is copied and shared)
 *   cnbUrl, githubUrl   the two hosts, for the menu (either may be empty)
 *   qr         (text) => module matrix; without it the popover shows the link only
 */
const props = defineProps({
  url: { type: String, required: true },
  cnbUrl: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  title: { type: String, default: '' },
  qr: { type: Function, default: null },
  texts: { type: Object, required: true },
})
const choices = computed(() => copyChoices({ url: props.url, cnbUrl: props.cnbUrl, githubUrl: props.githubUrl }, props.texts))
const toast = ref(false)
const toastHost = ref('body')
let toastTimer = 0
const popup = ref(null) // { kind: 'copy' | 'share', x, y }
// inside a modal dialog the popover has to live in the dialog (the dialog is in the top layer; anything on the body is under it)
const host = ref('body')
const copyBtn = ref(null), shareBtn = ref(null), pop = ref(null)
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const code = computed(() => { if (!props.qr || !props.url) return null; try { const q = qrPath(props.qr(props.url)); return q.d ? q : null } catch { return null } })

async function copy(text) {
  try { await navigator.clipboard.writeText(text) } catch {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy') } catch { /* no clipboard */ } t.remove()
  }
  toastHost.value = (copyBtn.value || shareBtn.value)?.closest('dialog') || 'body'
  toast.value = true
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = false }, 1800)
  close()
}
function close() { popup.value = null; document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', onKey, true) }
const outside = (e) => { if (pop.value && !pop.value.contains(e.target) && !copyBtn.value?.contains(e.target) && !shareBtn.value?.contains(e.target)) close() }
const onKey = (e) => { if (e.key === 'Escape') { close(); e.stopPropagation() } }
async function openPop(kind, trigger) {
  if (popup.value?.kind === kind) return close()
  host.value = trigger.closest('dialog') || 'body'
  const r = trigger.getBoundingClientRect()
  popup.value = { kind, x: Math.round(Math.min(window.innerWidth - 16, r.right)), y: Math.round(r.bottom + 6) }
  document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', onKey, true)
  await nextTick()
  const el = pop.value
  if (el) { const w = el.offsetWidth, h = el.offsetHeight; popup.value = { ...popup.value, x: Math.max(8, popup.value.x - w), y: popup.value.y + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : popup.value.y } }
}
const system = () => { navigator.share({ title: props.title, url: props.url }).catch(() => {}); close() }
onBeforeUnmount(() => { close(); clearTimeout(toastTimer) })
</script>

<template>
  <span class="m-linkact">
    <button ref="copyBtn" type="button" class="m-linkact__btn" :aria-label="texts.copyLink" :aria-haspopup="choices.length > 1 ? 'menu' : undefined" :data-tip="texts.copyLink" @click="choices.length > 1 ? openPop('copy', copyBtn) : copy(url)"><MIcon name="content_copy" /><MIcon v-if="choices.length > 1" class="m-linkact__more" name="keyboard_arrow_down" /></button>
    <button ref="shareBtn" type="button" class="m-linkact__btn" :aria-label="texts.share" aria-haspopup="dialog" :data-tip="texts.share" @click="openPop('share', shareBtn)"><MIcon name="share" /></button>
    <Teleport :to="host">
      <div v-if="popup" ref="pop" class="m-linkact__pop" :class="`is-${popup.kind}`" :style="{ left: `${popup.x}px`, top: `${popup.y}px` }" :role="popup.kind === 'copy' ? 'menu' : 'dialog'" :aria-label="popup.kind === 'copy' ? texts.copyLink : texts.share">
        <template v-if="popup.kind === 'copy'">
          <button v-for="c in choices" :key="c.id" type="button" role="menuitem" class="m-linkact__item" @click="copy(c.url)"><MIcon name="link" /><span>{{ c.label }}</span></button>
        </template>
        <template v-else>
          <svg v-if="code" class="m-linkact__qr" :viewBox="`0 0 ${code.size} ${code.size}`" shape-rendering="crispEdges" role="img" :aria-label="texts.shareScan"><rect :width="code.size" :height="code.size" fill="#fff" /><path :d="code.d" fill="#000" /></svg>
          <p class="m-linkact__scan">{{ texts.shareScan }}</p>
          <code class="m-linkact__url" :title="url">{{ url }}</code>
          <div class="m-linkact__row">
            <button type="button" class="m-dpill" @click="copy(url)"><MIcon name="content_copy" />{{ texts.copyLink }}</button>
            <button v-if="canShare" type="button" class="m-dpill m-dpill--fill" @click="system"><MIcon name="share" />{{ texts.shareSystem }}</button>
          </div>
        </template>
      </div>
    </Teleport>
    <Teleport :to="toastHost"><div v-if="toast" class="m-snackbar" role="status" aria-live="polite"><span class="m-snackbar__text">{{ texts.copied }}</span></div></Teleport>
  </span>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MContextMenu from './MContextMenu.vue'
import MDialog from './MDialog.vue'
import MButton from './MButton.vue'
import { useAppearance } from './useAppearance.js'
import { buildGroups, describeTarget, flattenGroups } from '../contextmenu/builders.js'
import { contextTexts } from '../contextmenu/texts.js'
import { installFramePresenter } from '../contextmenu/presenter.js'
import { contextPolicy, inModalSurface, installModalGuard, isEditable, modalOpen } from '../a11y/modalLayer.js'

// The one context menu of the window (SPEC-context-menu): mounted once at the root of a product. It listens for `contextmenu` (and the Menu key and Shift+F10) and builds the menu from what is
// under the pointer: the actions of the team of the element (registerContext), then what the normal menu has for a field, a selection, a link or an image, the blank page and the page.
// Shift+right-click, or a right-click held over 600 ms, gives the platform's own menu back (the spell-check suggestions and what we cannot rebuild); localStorage `foundation-ui.contextmenu` = 'native'
// (the developer option 「始终使用系统右键」) does it always. A menu a component opened itself (MContextMenu.show) is left alone.
//   callbacks: the product's own actions; one that is not given is an item that is not there:
//     search(text) openLink(url) openExternal(url) explain(text) saveImage(url) connect() doctor() openDevtools() reportHere({ route, place, text }) restartHost() openWebUi() pet: [{ id, label, icon?, run() }] notice(text) readClipboard()
//   capabilities: { product: 'panel' | 'web', print, devtools, developer (developer mode is on: the 「开发者」 section at the end of the menu), canCopyImage }
const props = defineProps({
  locale: { type: String, default: 'en' },
  callbacks: { type: Object, default: () => ({}) },
  capabilities: { type: Object, default: () => ({}) },
  /** the platform's own menu always (the developer option) */
  native: { type: Boolean, default: false },
})
const T = computed(() => contextTexts(props.locale))
const menu = ref(null)
const appearance = useAppearance()
const ask = ref(null)
const HOLD_MS = 600
let downAt = 0
let focused = null
let point = { x: 0, y: 0 }
let target = null
let topItems = []
const nativeAlways = () => { try { return props.native || globalThis.localStorage?.getItem('foundation-ui.contextmenu') === 'native' } catch { return props.native } }
const platform = () => (typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent : '')
const caps = () => ({ canGoBack: typeof history !== 'undefined' ? history.length > 1 : true, canCopyImage: typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write, ...props.capabilities })
const notice = (text) => props.callbacks.notice?.(text)
const writeText = async (text) => { try { await navigator.clipboard.writeText(text); notice(T.value.copied) } catch { /* the clipboard is not offered */ } }

function build(el, point0) {
  const sel = typeof getSelection === 'function' ? String(getSelection() || '') : ''
  target = describeTarget(el, { selection: sel })
  focused = document.activeElement
  point = point0
  const cb = { ...props.callbacks, search: props.callbacks.search, openSearch: true }
  const groups = buildGroups(target, { T: T.value, cb, caps: caps(), platform: platform(), mode: appearance.state.mode || 'system' })
  const list = flattenGroups(groups, T.value)
  return list.map((item) => (item.children ? { ...item, keepOpen: true } : item))
}
function open(items, top = true) {
  if (top) topItems = items
  menu.value.show({ clientX: point.x, clientY: point.y, pointer: point.pointer === true, preventDefault() {} }, items, { target })
}

function onContext(event) {
  // a modal is open: the rest of the window does nothing (src/a11y/modalLayer.js). Inside the modal a field or a selection keeps the platform's own menu; nothing else opens a menu.
  if (modalOpen()) {
    const selection = typeof getSelection === 'function' && String(getSelection() || '') !== ''
    if (contextPolicy({ modal: true, inside: inModalSurface(event.target), editable: isEditable(event.target), selection }) !== 'native') event.preventDefault()
    return
  }
  if (event.__mContext || nativeAlways() || event.shiftKey || (downAt && performance.now() - downAt >= HOLD_MS) || event.target?.closest?.('[data-native-context]')) return
  // a keyboard-made event (the Menu key) has no position: the keydown handler opened the menu already
  if (event.clientX === 0 && event.clientY === 0 && event.button === 0) return
  event.preventDefault()
  downAt = 0
  open(build(event.target, { x: event.clientX, y: event.clientY, pointer: true }))
}
function onDown(event) { downAt = event.button === 2 ? performance.now() : 0 }
function onKey(event) {
  if (modalOpen()) return
  if (!(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) || nativeAlways()) return
  event.preventDefault()
  const el = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body
  const r = el === document.body ? { left: innerWidth / 2 - 40, bottom: innerHeight / 3 } : el.getBoundingClientRect()
  open(build(el, { x: Math.round(r.left + 12), y: Math.round(r.bottom - 4) }))
}
let removeGuard = () => {}
let removeFrame = () => {}
// a Web page inside the Panel's frame asks the Panel to show its menus in the window of their own (extending beyond the frame); a page that is its own window has no use for it
onMounted(() => { removeFrame = installFramePresenter(window); removeGuard = installModalGuard(document); document.addEventListener('contextmenu', onContext); document.addEventListener('pointerdown', onDown, true); document.addEventListener('keydown', onKey, true) })
onBeforeUnmount(() => { removeFrame(); removeGuard(); document.removeEventListener('contextmenu', onContext); document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey, true) })

const focusBack = () => nextTick(() => { try { focused?.focus?.({ preventScroll: true }) } catch { /* the element is gone */ } })
const exec = (name) => { try { return document.execCommand(name) } catch { return false } }
async function pasteInto(field) {
  field.focus()
  try { const text = await (props.callbacks.readClipboard ? props.callbacks.readClipboard() : navigator.clipboard.readText()); document.execCommand('insertText', false, text) } catch { notice(T.value.pasteDenied) }
}
const selectedText = () => target?.field?.selected || target?.selection || ''

async function onSelect(item) {
  // a submenu: its items replace the list, with a way back
  if (item.children) {
    open([{ id: 'back-to-menu', label: T.value.backToMenu, icon: 'arrow_back', keepOpen: true }, { divider: true, id: 'bd' }, ...item.children.map((c) => (c.children ? { ...c, keepOpen: true } : c))], false)
    return
  }
  if (item.id === 'back-to-menu') { open(topItems, false); return }
  if (item.confirm) { ask.value = item; return }
  await run(item)
}
async function run(item) {
  focusBack()
  await nextTick()
  const cb = props.callbacks
  const field = target?.field?.el
  if (typeof item.run === 'function') return item.run(target)
  switch (item.id) {
    case 'undo': case 'redo': case 'delete': field?.focus(); exec(item.id); break
    case 'cut': field?.focus(); exec('cut'); break
    case 'copy': field?.focus(); if (!exec('copy')) writeText(selectedText()); break
    case 'paste': case 'paste-plain': if (field) await pasteInto(field); break
    case 'select-all': if (field) { field.focus(); exec('selectAll') } else { exec('selectAll') } break
    case 'search-selection': cb.search?.(selectedText()); break
    case 'explain': cb.explain?.(selectedText()); break
    case 'open-link': cb.openLink ? cb.openLink(target.link) : window.open(target.link, '_self'); break
    case 'open-external': cb.openExternal?.(target.link); break
    case 'copy-link': writeText(target.link); break
    case 'copy-image-url': writeText(target.image); break
    case 'copy-image': try { const blob = await (await fetch(target.image)).blob(); await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); notice(T.value.copied) } catch { /* not copied */ } break
    case 'save-image': cb.saveImage?.(target.image); break
    case 'back': history.back(); break
    case 'forward': history.forward(); break
    case 'reload': location.reload(); break
    case 'print': window.print(); break
    case 'inspect': case 'dev-tools': cb.openDevtools?.(); break
    case 'dev-tools-hint': notice(T.value.devToolsHint); break
    case 'dev-report': cb.reportHere?.({ route: `${location.pathname}${location.hash}`, place: target?.owners?.[0] ? `${target.owners[0].kind}:${target.owners[0].id}` : '', text: String(target?.owners?.[0]?.el?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) }); break
    case 'copy-route': writeText(`${location.pathname}${location.hash}`); break
    case 'search': document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true })); break
    case 'connect': cb.connect?.(); break
    case 'doctor': cb.doctor?.(); break
    case 'restart-host': cb.restartHost?.(); break
    case 'open-webui': cb.openWebUi?.(); break
    default: if (item.id.startsWith('mode:')) appearance.set({ mode: item.id.slice(5) })
  }
}
const confirmed = async () => { const item = ask.value; ask.value = null; if (item) await run(item) }
defineExpose({ build })
</script>

<template>
  <MContextMenu ref="menu"  @select="onSelect" @closed="focusBack" />
  <MDialog :model-value="!!ask" :title="ask?.label || ''" icon="warning" @update:model-value="(v) => { if (!v) ask = null }">
    <p v-if="ask">{{ ask.confirm }}</p>
    <template #actions><MButton variant="text" @click="ask = null">{{ T.cancel }}</MButton><MButton variant="tonal" @click="confirmed">{{ ask?.label }}</MButton></template>
  </MDialog>
</template>

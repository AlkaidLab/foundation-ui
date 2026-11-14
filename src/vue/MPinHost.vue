<script setup>
import { computed, onBeforeUnmount, provide, ref } from 'vue'
import MContextMenu from './MContextMenu.vue'
import MIcon from './MIcon.vue'
import { isPinnedOnHome, pinToHome, unpinFromHome } from '../pins/home.js'
import { pinTexts } from '../pins/registry.js'
import { useBottomLayer } from './useBottomLayer.js'

/**
 * The one place a product pins things to the overview from: it owns the context menu of the rows and provides `m-pin` to them. A row (MItem with `pin`) opens the
 * menu from its overflow button, a right click or a long press; the menu pins the row's setting or action to the overview (or takes it off again).
 *   storageKey  the key of the product's home layout
 *   forward     (spec) => void: where the home is not this page's (the Web page inside the control panel), the pin is sent on instead of kept here
 */
const props = defineProps({
  storageKey: { type: String, default: 'home' },
  locale: { type: String, default: 'en' },
  forward: { type: Function, default: null },
})
const emit = defineEmits(['pinned', 'unpinned'])
const T = computed(() => pinTexts(props.locale))
const menu = ref(null)
const version = ref(0)
const sent = new Set() // what was sent on from here (the home is not readable then)
const idOf = (spec) => (spec.type === 'action' || spec.type === 'tile' ? spec.tile : `${spec.type}:${spec.key}`)
const isPinned = (spec) => { void version.value; return props.forward ? sent.has(idOf(spec)) : isPinnedOnHome(props.storageKey, spec) }
const toast = ref('')
const toastEl = ref(null)
const toastStyle = useBottomLayer('toast', 3, toastEl)
let toastTimer = 0
const say = (text) => { toast.value = text; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = '' }, 2600) }
function pin(spec) {
  if (props.forward) { props.forward({ op: 'pin', spec }); sent.add(idOf(spec)) } else pinToHome(props.storageKey, spec)
  version.value++
  say(T.value.pinned)
  emit('pinned', spec)
}
function unpin(spec) {
  if (props.forward) { props.forward({ op: 'unpin', spec }); sent.delete(idOf(spec)) } else unpinFromHome(props.storageKey, spec)
  version.value++
  emit('unpinned', spec)
}
const toggle = (spec) => (isPinned(spec) ? unpin(spec) : pin(spec))
function open(event, spec) {
  if (!spec) return
  const at = event?.clientX || event?.clientY ? event : (() => { const r = event?.currentTarget?.getBoundingClientRect?.() || { left: 0, bottom: 0 }; return { clientX: r.left, clientY: r.bottom, preventDefault() {} } })()
  const pinned = isPinned(spec)
  const label = pinned ? T.value.unpin : spec.type === 'link' ? `${T.value.pin} · ${T.value.openPage}` : T.value.pin
  menu.value?.show({ clientX: at.clientX, clientY: at.clientY, preventDefault: () => event?.preventDefault?.() }, [{ id: 'pin', icon: 'keep', label }], spec)
}
const onSelect = (item, spec) => { if (item.id === 'pin') toggle(spec) }
provide('m-pin', { open, pin, unpin, toggle, isPinned })
// the product's own menus (the rows of its list pane) pin through the same functions
defineExpose({ open, pin, unpin, toggle, isPinned })
onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
  <slot />
  <MContextMenu ref="menu" @select="onSelect" />
  <Transition name="m-fade"><p v-if="toast" ref="toastEl" class="m-pin-toast" role="status" aria-live="polite" :style="toastStyle"><MIcon name="keep" fill />{{ toast }}</p></Transition>
</template>

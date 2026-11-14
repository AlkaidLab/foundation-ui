<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MButton from '../MButton.vue'
import MChip from '../MChip.vue'
import MGroup from '../MGroup.vue'
import MItem from '../MItem.vue'
import MSection from '../MSection.vue'
import { ENV_LABELS, componentRows, environmentRows, environmentText } from '../../developer/envInfo.js'
import { canonicalLocale } from '../../locale/texts/resolve.js'
import { devmodeTexts } from '../../devmode/texts.js'

// 构建与组件: the environment of the window as the product knows it (version, channel, build, host, system, graphics, WebView) and the builds of the components it lists.
// Two sections of rows like every other page: 本机环境 (a row per fact, the copy action in the section head) and 组件 (a row per component: version below the name, the commit at the end).
const props = defineProps({ locale: { type: String, default: 'zh' }, environment: { type: Function, default: null } })
const emit = defineEmits(['notify'])
const T = computed(() => devmodeTexts(props.locale))
// Cache first: the last environment this window read is shown at once and read again in place (the read takes seconds: it asks the host and the system for the components), so the page never opens empty after the first visit.
const BUILD_CACHE_KEY = 'foundation-ui.dev.build'
const store = () => { try { return globalThis.localStorage } catch { return null } }
const cached = () => { try { const v = JSON.parse(store()?.getItem(BUILD_CACHE_KEY) || 'null'); return v && typeof v === 'object' ? v : null } catch { return null } }
const info = ref(cached())
onMounted(async () => {
  try { const fresh = await props.environment?.(); if (fresh) { info.value = fresh; try { store()?.setItem(BUILD_CACHE_KEY, JSON.stringify(fresh)) } catch { /* not remembered */ } } } catch { /* the cached one stays */ }
})
// the rows are in the language of the interface; the copied text keeps the stable English keys
const ENV_ICON = { product: 'deployed_code', version: 'tag', channel: 'call_split', build: 'inventory_2', host: 'dns', os: 'desktop_windows', arch: 'developer_board', gpu: 'memory', webview: 'language', display: 'monitor', locale: 'info', 'user agent': 'fingerprint' }
const COMPONENT_ICON = { host: 'dns', panel: 'dashboard', web: 'language', m3e: 'palette', vdd: 'monitor', vigem: 'gamepad', usbip: 'usb', dlssnr: 'memory', stylus: 'edit', haptics: 'graphic_eq', installer: 'download' }
const rows = computed(() => {
  const labels = ENV_LABELS[canonicalLocale(props.locale)] || null
  return environmentRows(info.value || {}).map(([key, value]) => ({ key, label: labels?.[key] || key, value, icon: ENV_ICON[key.startsWith('build ') ? 'build' : key] || 'info' }))
})
const builds = computed(() => componentRows(info.value || {}).map((b) => ({ ...b, icon: COMPONENT_ICON[b.id] || 'extension' })))
// the button answers the press: it turns into the done state for a moment (icon and label on the spring), then goes back
const copied = ref(false)
let copiedTimer = 0
onBeforeUnmount(() => clearTimeout(copiedTimer))
async function copy() {
  try { await navigator.clipboard.writeText(environmentText(info.value || {})); copied.value = true; clearTimeout(copiedTimer); copiedTimer = setTimeout(() => { copied.value = false }, 1800); emit('notify', T.value.copied) } catch { /* refused */ }
}
defineExpose({ info, copied, copy })
</script>

<template>
  <div class="dm-col dm-col--sections" data-dev="build">
    <MSection :title="T.buildEnvironment">
      <template #action><MButton :variant="copied ? 'filled' : 'tonal'" :icon="copied ? 'check' : 'content_copy'" size="sm" :disabled="!rows.length" :title="T.buildCopyTip" :aria-label="`${T.buildCopy}. ${T.buildCopyTip}`" :data-copied="copied || undefined" data-dev="build-copy" @click="copy">{{ copied ? T.copied : T.buildCopy }}</MButton></template>
      <MGroup data-dev="env-rows">
        <MItem v-for="r in rows" :key="r.key" :icon="r.icon" :title="r.label" :value="r.value" data-selectable :data-env="r.key" />
      </MGroup>
    </MSection>
    <MSection v-if="builds.length" :title="T.buildComponents">
      <MGroup data-dev="components">
        <MItem v-for="b in builds" :key="b.id" :icon="b.icon" :title="b.name" :value="b.installed ? b.version || '—' : T.buildNotInstalled" :class="{ 'dm-notinstalled': !b.installed }" data-selectable :data-component="b.id">
          <template v-if="b.installed && b.commit" #trail><MChip class="dm-mono dm-commit">{{ b.commit }}</MChip></template>
        </MItem>
      </MGroup>
    </MSection>
  </div>
</template>

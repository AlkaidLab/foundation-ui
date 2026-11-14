<script setup>
import { reducedMotion } from '../appearance/motion.js'
import { computed, nextTick, ref } from 'vue'
import MIcon from './MIcon.vue'
import MIconButton from './MIconButton.vue'
import MBadge from './MBadge.vue'
import MButton from './MButton.vue'
import { useNotify } from '../notify/store.js'

// The status button of the caption bar: what is wrong with the host or the app right now (a missing driver, a broken component) and what is good to know (an update).
// It shows only while something is, and keeps its place while nothing is (an empty slot of its width): the notices come from the host after the page is up, and a button that appears later would push
// the ones beside it (连接设备) 52 px to the left in front of the person. Its panel is a list in the style of the settings lists: a rounded container, rows with a leading icon, the title, one supporting line and a
// trailing action; a status stays until it is solved, a notice can be dismissed, one by one or all at once (the rows leave one after the other and the list closes up).
const props = defineProps({ label: { type: String, default: '' }, locale: { type: String, default: 'en' } })
const zh = computed(() => String(props.locale).startsWith('zh'))
const T = computed(() => (zh.value ? { title: '状态与通知', status: '系统状态', notice: '通知', clear: '全部清除', dismiss: '关闭', empty: '没有需要处理的事项' } : { title: 'Status and notices', status: 'System status', notice: 'Notices', clear: 'Clear all', dismiss: 'Dismiss', empty: 'Nothing needs attention' }))
const name = computed(() => props.label || T.value.title)
const notify = useNotify()
const panel = ref(null)
const anchor = ref(null)
const open = ref(false)
const icon = computed(() => (notify.systemTone.value === 'error' ? 'error' : notify.systemTone.value === 'info' ? 'info' : 'warning'))
const iconOf = (s) => s.icon || (s.tone === 'error' ? 'error' : s.tone === 'info' ? 'info' : 'warning')
let closeTimer = 0
async function toggle() {
  const el = panel.value
  if (!el) return
  if (el.matches(':popover-open')) { el.hidePopover(); return }
  const r = anchor.value.getBoundingClientRect()
  el.style.top = `${r.bottom + 8}px`
  el.style.right = `${Math.max(8, window.innerWidth - r.right)}px`
  el.showPopover()
  open.value = true
  await nextTick()
}
const onToggle = (event) => { open.value = event.newState === 'open' }
function run(item, a) { panel.value?.hidePopover(); a.onClick?.(item) }
const reduce = () => reducedMotion()
// clear all: the rows leave one after the other; with nothing left the panel says so for a moment and closes
function clearAll() {
  const ids = notify.clearable.value.map((s) => s.id)
  ids.forEach((id, i) => setTimeout(() => notify.dismissSystem(id), reduce() ? 0 : i * 90))
  clearTimeout(closeTimer)
  if (ids.length === notify.systemCount.value) closeTimer = setTimeout(() => panel.value?.hidePopover(), (reduce() ? 0 : ids.length * 90) + 900)
}
</script>

<template>
  <span v-if="notify.systemCount.value" ref="anchor" class="m-statusbell" :class="`m-statusbell--${notify.systemTone.value}`">
    <MIconButton :icon="icon" :label="name" @click="toggle" />
    <MBadge class="m-statusbell__badge" :value="notify.systemCount.value" />
  </span>
  <span v-else class="m-statusbell m-statusbell--rest" aria-hidden="true" />
  <div ref="panel" popover="auto" class="m-statuspanel" role="dialog" :aria-label="name" @toggle="onToggle">
    <header class="m-statuspanel__head">
      <h2>{{ name }}</h2>
      <MButton v-if="notify.clearable.value.length" variant="text" size="sm" icon="clear_all" @click="clearAll">{{ T.clear }}</MButton>
    </header>
    <TransitionGroup tag="div" name="m-sgroup" class="m-statuspanel__groups">
      <section v-for="g in notify.systemGroups.value" :key="g.id" class="m-sgroup">
        <div class="m-sgroup__inner">
          <h3 v-if="notify.systemGroups.value.length > 1" class="m-sgroup__label">{{ T[g.id] }}</h3>
          <TransitionGroup tag="ul" name="m-srow" class="m-slist">
            <li v-for="s in g.items" :key="s.id" class="m-srow">
              <div class="m-srow__inner" :class="`m-srow__inner--${s.tone}`">
                <span class="m-srow__icon"><MIcon :name="iconOf(s)" fill /></span>
                <span class="m-srow__text"><b>{{ s.title }}</b><span v-if="s.text">{{ s.text }}</span></span>
                <span v-if="s.actions?.length || s.dismissible" class="m-srow__actions">
                  <MButton v-for="a in (s.actions || []).slice(0, 1)" :key="a.id" variant="text" size="sm" @click="run(s, a)">{{ a.label }}</MButton>
                  <MIconButton v-if="s.dismissible" icon="close" :label="T.dismiss" @click="notify.dismissSystem(s.id)" />
                </span>
              </div>
            </li>
          </TransitionGroup>
        </div>
      </section>
    </TransitionGroup>
    <p v-if="!notify.systemCount.value" class="m-statuspanel__empty">{{ T.empty }}</p>
  </div>
</template>

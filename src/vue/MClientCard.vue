<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import MIcon from './MIcon.vue'
import MLinkActions from './MLinkActions.vue'

// One client on the downloads page (the list without a system filter): the platform icon and name with the official/partner tag, the recommended build with its size and version, ONE primary
// download, the other builds in a compact menu (never a list), the copy / share of the link, and the card's own links. A card that has no file of its own (a store, a partner's page) offers
// `fallbackLabel` instead; the card head opens the details of the client (`open`), where every file, hash and mirror is. The product opens the links (`open-url`).
//   groups   [{ os, name, rows, state }] one per system of the client (the page's fileGroups); rows are releaseRows
const props = defineProps({
  name: { type: String, required: true },
  icon: { type: String, default: 'devices' },
  cardKey: { type: String, default: '' },
  systems: { type: String, default: '' },
  groups: { type: Array, default: () => [] },
  primaryOs: { type: String, default: '' },
  version: { type: String, default: '' },
  texts: { type: Object, required: true },
  qr: { type: Function, default: null },
  fallbackLabel: { type: String, default: '' },
  reserve: { type: Boolean, default: false },
})
const emit = defineEmits(['open-url', 'open', 'primary-fallback'])

const ready = computed(() => props.groups.filter((g) => g.state === 'ready'))
const loading = computed(() => !ready.value.length && props.groups.some((g) => g.state === 'loading'))
const group = computed(() => ready.value.find((g) => g.os === props.primaryOs) || ready.value[0] || null)
const best = computed(() => (group.value ? group.value.rows.find((r) => r.recommended) || group.value.rows[0] : null))
const many = computed(() => ready.value.length > 1)
const others = computed(() => ready.value.flatMap((g) => g.rows.filter((r) => r !== best.value).map((r) => ({ row: r, os: g.name }))))
const meta = computed(() => [many.value && group.value ? group.value.name : '', best.value?.sizeLabel, props.version].filter(Boolean).join(' · '))
const title = (item) => (many.value ? `${item.os} · ${item.row.label}` : item.row.label)

// the menu of the other builds: fixed to the window next to its button, up or down by the room, closed by Esc, a press outside, a scroll or a resize
const menu = ref(null)
const btn = ref(null), pop = ref(null)
const pos = ref({ left: 0, top: 0 })
function close(refocus = false) {
  menu.value = null
  document.removeEventListener('pointerdown', outside, true); window.removeEventListener('resize', close); window.removeEventListener('scroll', onScroll, true)
  if (refocus) btn.value?.focus()
}
const outside = (e) => { if (pop.value && !pop.value.contains(e.target) && !btn.value?.contains(e.target)) close() }
const onScroll = (e) => { if (!pop.value?.contains(e.target)) close() }
async function toggle() {
  if (menu.value) return close(true)
  menu.value = true
  document.addEventListener('pointerdown', outside, true); window.addEventListener('resize', close); window.addEventListener('scroll', onScroll, true)
  await nextTick()
  const r = btn.value.getBoundingClientRect(), el = pop.value
  if (!el) return
  const w = el.offsetWidth, h = el.offsetHeight
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))
  const top = r.bottom + 6 + h > window.innerHeight - 8 && r.top - h - 6 >= 8 ? r.top - h - 6 : Math.min(r.bottom + 6, Math.max(8, window.innerHeight - h - 8))
  pos.value = { left: Math.round(left), top: Math.round(top) }
  el.querySelector('[role=menuitem]')?.focus()
}
function onKey(e) {
  const items = [...pop.value.querySelectorAll('[role=menuitem]')]
  const i = items.indexOf(document.activeElement)
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true) }
  else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
  else if (e.key === 'Tab') close()
}
const pick = (url) => { close(true); emit('open-url', url) }
const details = () => { close(); emit('open') }
onBeforeUnmount(() => close())
</script>

<template>
  <article class="m-ccard" :class="{ 'is-best': !!best }">
    <button type="button" class="m-ccard__head" :data-card="cardKey" aria-haspopup="dialog" @click="emit('open')">
      <span class="m-ccard__mark"><MIcon :name="icon" /></span>
      <span class="m-ccard__id">
        <span class="m-ccard__name" :title="name">{{ name }}</span>
        <span class="m-ccard__tags"><slot name="tag" /><span v-if="systems" class="m-ccard__os" :title="systems">{{ systems }}</span></span>
      </span>
    </button>

    <div class="m-ccard__best" :class="{ 'is-rec': !!best && best.recommended }">
      <div v-if="best" class="m-ccard__what">
        <b :title="best.label">{{ best.label }}</b><span v-if="best.recommended" class="m-assets__best">{{ texts.recommendedTag }}</span>
        <small v-if="meta">{{ meta }}</small>
      </div>
      <div v-else-if="loading" class="m-ccard__what" role="status" :aria-label="texts.loadingFiles"><span class="m-skeleton m-ccard__sk" /><span class="m-skeleton m-ccard__sk is-short" /></div>
      <div v-else class="m-ccard__what"><small>{{ texts.noFiles }}</small></div>
      <div v-if="$slots.qr" class="m-ccard__qr"><slot name="qr" /></div>
    </div>

    <div class="m-ccard__acts">
      <button v-if="best" type="button" class="m-dpill m-dpill--fill m-ccard__go" :aria-label="`${texts.download} ${best.label}`" @click="emit('open-url', best.url)"><MIcon name="download" /><span>{{ texts.download }}</span></button>
      <button v-else-if="!loading && fallbackLabel" type="button" class="m-dpill m-dpill--fill m-ccard__go" @click="emit('primary-fallback')"><MIcon name="open_in_new" /><span>{{ fallbackLabel }}</span></button>
      <button v-else type="button" class="m-dpill m-dpill--fill m-ccard__go" disabled><MIcon name="download" /><span>{{ texts.download }}</span></button>
      <MLinkActions v-if="best" :url="best.url" :cnb-url="best.cnbUrl" :github-url="best.githubUrl" :title="best.name || best.label" :qr="qr" :texts="texts" />
      <button v-if="others.length" ref="btn" type="button" class="m-ccard__morebtn" :aria-label="`${texts.more} (${others.length})`" :data-tip="texts.more" aria-haspopup="menu" :aria-expanded="!!menu" @click="toggle"><MIcon name="more_vert" /></button>
    </div>

    <div v-if="$slots.foot" class="m-ccard__foot"><slot name="foot" /></div>

    <Teleport to="body">
      <div v-if="menu" ref="pop" class="m-ccmenu" role="menu" :aria-label="`${name} · ${texts.files}`" :style="{ left: `${pos.left}px`, top: `${pos.top}px` }" @keydown="onKey">
        <button v-for="item in others" :key="`${item.os}:${item.row.type}`" type="button" role="menuitem" class="m-ccmenu__item" @click="pick(item.row.url)">
          <MIcon name="download" /><span class="m-ccmenu__text"><b>{{ title(item) }}</b><small>{{ [item.row.sizeLabel, version].filter(Boolean).join(' · ') }}</small></span>
        </button>
        <button type="button" role="menuitem" class="m-ccmenu__item m-ccmenu__item--all" @click="details"><MIcon name="info" /><span class="m-ccmenu__text"><b>{{ texts.allFiles || texts.files }}</b></span></button>
      </div>
    </Teleport>
  </article>
</template>

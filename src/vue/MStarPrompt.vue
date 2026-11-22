<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from './MIcon.vue'
import MGithubMark from './MGithubMark.vue'
import MBilibiliMark from './MBilibiliMark.vue'
import { fillText } from './guideTexts.js'
import { BILIBILI } from '../about/data.js'

// The ask for a star: a card at the top of the overview (see starCard.js), never a tile of the grid. One rule for every width:
//   [the star and the title (the line under it only when it fits on ONE line)] [the asks] [the close icon at the trailing edge], vertically centred, ONE row whenever it fits;
//   when it cannot, TWO rows: the star, the title and the close icon, and the asks under them (never a row that holds only the dismissal).
//   The asks carry their long words (「给 Foundation Sunshine 点 Star」) only where all of them fit on one line, else the side they are for (主机端 Star, 客户端 Star, B 站) when the texts have those words.
//   On a phone, when not even the short asks fit beside the title, the title goes and the row is the star, the asks and the close icon. Nothing wraps: a text is whole or it is not there.
//   streaming:   the star of the host (filled) and the star of the client in use (`client`, tonal); the host's alone when that client has no star of its own (a client that is not ours);
//   not streaming: the star of the host and the sponsor entry (the sponsor sheet of 关于: `sponsor` goes to the product). Both end with 关注 B 站 (the channel, the same address in every language).
//   Every ask is a real button of one height and shape: the star of the host filled, the others filled-tonal. 以后再说 hides the card until the next stream: a close icon with that label as its name.
//   texts: { title, sub, action: 'Star {name}', later, sponsor, bilibili, hostShort, clientShort, bilibiliShort }     host, client: { name, url }     streaming: boolean
const props = defineProps({
  /** kept for the callers that say the window is a phone's (under 600 wide or under 480 high): the layout is decided by what fits, not by this */
  compact: { type: Boolean, default: false },
  texts: { type: Object, default: () => ({}) },
  host: { type: Object, required: true },
  client: { type: Object, default: null },
  streaming: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'later', 'sponsor'])

// the asks: kind, long and short words, the glyph
const asks = computed(() => {
  const t = props.texts, out = []
  const hostLong = fillText(t.action, { name: props.host.name })
  out.push({ key: 'host', fill: true, glyph: 'gh', long: hostLong, short: t.hostShort || hostLong, act: () => emit('open', props.host.url) })
  if (props.streaming) {
    if (props.client) out.push({ key: 'client', glyph: 'gh', long: fillText(t.action, { name: props.client.name }), short: t.clientShort || fillText(t.action, { name: props.client.name }), act: () => emit('open', props.client.url) })
  } else {
    out.push({ key: 'sponsor', glyph: 'heart', long: t.sponsor, short: t.sponsor, act: () => emit('sponsor') })
  }
  if (t.bilibili) out.push({ key: 'bilibili', glyph: 'bili', long: t.bilibili, short: t.bilibiliShort || t.bilibili, act: () => emit('open', BILIBILI.url) })
  return out
})

// what fits is measured on a hidden copy of the parts in the card's own styles: the words, the asks in both forms
const root = ref(null), probe = ref(null)
const layout = ref({ rows: 1, title: true, sub: false, short: false })
const hasShort = computed(() => asks.value.some((a) => a.short !== a.long))
let ro = null, raf = 0
function decide() {
  raf = 0
  const r = root.value, p = probe.value
  if (!r || !p) return
  const cs = getComputedStyle(r)
  const avail = r.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
  if (!(avail > 40)) return
  const gap = parseFloat(cs.columnGap) || 12
  const w = (sel) => p.querySelector(sel)?.getBoundingClientRect().width || 0
  const ico = w('.m-sprompt__ico'), close = w('.m-sprompt__later'), title = w('.m-sprompt__pt'), sub = w('.m-sprompt__ps')
  const btnGap = parseFloat(getComputedStyle(p.querySelector('.m-sprompt__pl')).columnGap) || 8
  const group = (sel) => { const bs = [...p.querySelectorAll(`${sel} .m-sprompt__btn`)]; return bs.reduce((a, b) => a + b.getBoundingClientRect().width, 0) + btnGap * Math.max(0, bs.length - 1) }
  const long = group('.m-sprompt__pl'), short = group('.m-sprompt__ps2')
  const row = (...parts) => parts.reduce((a, b) => a + b, 0) + gap * (parts.length - 1)
  const textW = (withSub) => (withSub ? Math.max(title, sub) : title)
  let next
  if (title && sub && row(ico, textW(true), long, close) <= avail) next = { rows: 1, title: true, sub: true, short: false }
  else if (row(ico, title, long, close) <= avail) next = { rows: 1, title: true, sub: false, short: false }
  else if (hasShort.value && row(ico, title, short, close) <= avail) next = { rows: 1, title: true, sub: false, short: true }
  else if (row(ico, hasShort.value ? short : long, close) <= avail) next = { rows: 1, title: false, sub: false, short: hasShort.value }
  else if (hasShort.value && row(short, close) <= avail) next = { rows: 1, title: false, sub: false, short: true, ico: false }
  else next = { rows: 2, title: true, sub: false, short: long > avail && hasShort.value }
  const cur = layout.value
  if (cur.rows !== next.rows || cur.title !== next.title || cur.sub !== next.sub || cur.short !== next.short || cur.ico !== next.ico) layout.value = next
}
const queue = () => { if (!raf) raf = requestAnimationFrame(decide) }
onMounted(() => {
  decide()
  if (typeof ResizeObserver !== 'undefined' && root.value) { ro = new ResizeObserver(queue); ro.observe(root.value) }
  if (typeof document !== 'undefined' && document.fonts) { document.fonts.ready?.then(queue); document.fonts.addEventListener?.('loadingdone', queue) }
})
watch(() => [props.texts, props.streaming, props.client, props.host], () => nextTick(queue), { deep: true })
onBeforeUnmount(() => { ro?.disconnect(); if (typeof document !== 'undefined') document.fonts?.removeEventListener?.('loadingdone', queue); if (raf) cancelAnimationFrame(raf) })
const label = (a) => (layout.value.short ? a.short : a.long)
</script>

<template>
  <section ref="root" class="m-sprompt m-sprompt--star" :class="[layout.rows === 2 ? 'is-two' : 'is-one', { 'is-bare': !layout.title }]" role="region" :aria-label="texts.title">
    <span v-if="layout.ico !== false" class="m-sprompt__ico"><MIcon name="star" fill /></span>
    <div v-if="layout.title" class="m-sprompt__text"><h3>{{ texts.title }}</h3><p v-if="layout.sub">{{ texts.sub }}</p></div>
    <div class="m-sprompt__btns">
      <button v-for="a in asks" :key="a.key" type="button" class="m-sprompt__btn" :class="{ 'm-sprompt__btn--fill': a.fill }" :data-star="a.key" @click="a.act">
        <MGithubMark v-if="a.glyph === 'gh'" /><MIcon v-else-if="a.glyph === 'heart'" name="favorite" fill /><MBilibiliMark v-else />{{ label(a) }}
      </button>
    </div>
    <button type="button" class="m-sprompt__later m-sprompt__later--icon" :aria-label="texts.later" :title="texts.later" @click="emit('later')"><MIcon name="close" /></button>
    <!-- the parts measured, never seen: the card's own styles, one line each -->
    <div ref="probe" class="m-sprompt__probe" aria-hidden="true">
      <span class="m-sprompt__ico" /><span class="m-sprompt__later m-sprompt__later--icon" />
      <h3 class="m-sprompt__pt">{{ texts.title }}</h3><p class="m-sprompt__ps">{{ texts.sub }}</p>
      <div class="m-sprompt__pl"><span v-for="a in asks" :key="a.key" class="m-sprompt__btn"><i class="m-sprompt__pg" />{{ a.long }}</span></div>
      <div class="m-sprompt__ps2"><span v-for="a in asks" :key="a.key" class="m-sprompt__btn"><i class="m-sprompt__pg" />{{ a.short }}</span></div>
    </div>
  </section>
</template>

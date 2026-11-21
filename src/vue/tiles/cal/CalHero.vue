<script setup>
// Calibration round: 本主机.
//   A (variant 1): the hero the team liked (reference-hero-bitrate-df9ac45.png), refined: the card in the primary colour, the status pill, the host's name in display type,
//     the chips and two pairs, the action as a large white library shape holding its glyph, a faint larger copy of the shape behind it (crisp, centred, not cut).
//   B (variant 2): the same anatomy, quieter and clearer: no shape behind. The action is one normal-sized button at the end of the header
//     (M3 Expressive: 48 px, a pill that morphs to a rounder rectangle on hover and press; the stop is the error container, the restart the card's own button colour; below 340 px it keeps its glyph and name only);
//     while streaming the card takes its colour from the game's cover
//     (Material dynamic colour from the art) and the status pill carries the session's running time in tabular display figures; the pill is in the on-primary tonal role.
//   The facts of 大 and 特大, right under the chips:
//     table: the rows of round 31's first board (kept for comparison)
//     f1: stat blocks: inset tonal sub-cards (icon, the value in a medium display size, a small label) in a flowing grid; the one that matters now is filled
//         (the stream while streaming, else the clients) — Pixel Weather's inset blocks, Google Home's tiles
//     f2: a now-playing band (the cover masked by a library shape, the game, the client, the bitrate's live line; idle: the paired clients as avatars), then the rest as one line of chips
import { computed } from 'vue'
import MIcon from '../../MIcon.vue'
import MTileCover from '../../MTileCover.vue'
import { coverOk } from '../../coverOk.js'
import MTileChart from '../../MTileChart.vue'
import { heroTintOf } from './heroTintCache.js'
import { sizeOf } from '../tileData.js'

const props = defineProps({
  card: { type: Object, required: true },
  texts: { type: Object, default: () => ({}) },
  variant: { type: Number, default: 1 },
  /** the current game's cover (B takes the card's colour from it while streaming) */
  art: { type: String, default: '' },
  /** how 大 and 特大 show the facts: 'auto' (F1 while idle, F2 while streaming, a morph between them) | 'table' | 'f1' | 'f2' */
  facts: { type: String, default: 'auto' },
  /** take the colours from the cover while streaming (个性化, default on) */
  tint: { type: Boolean, default: true },
  /** f2 while streaming: { name, cover, client, stream, points (the bitrate in Mbps), bitrate ('47.0'), fps ('120') } */
  now: { type: Object, default: null },
  /** f2 while idle: the paired clients [{ name, icon }] */
  clients: { type: Array, default: () => [] },
})
const emit = defineEmits(['act'])
const d = computed(() => props.card.data || {})
const size = computed(() => (props.card.size === 'xl' ? 'xl' : sizeOf(props.card)))
// 方形: the name, the state as a dot and its word, one fact (streaming: the game; idle: the first pair, the uptime)
const fact = computed(() => { const p = (d.value.pairs || [])[live.value ? 1 : 0] || (d.value.pairs || [])[0]; return p ? (live.value ? p.value : `${p.label} ${p.value}`) : '' })
const live = computed(() => d.value.statusTone === 'live')
const big = computed(() => size.value !== 'm')
const b = computed(() => props.variant === 2)
const T = computed(() => props.texts)
const allFacts = computed(() => d.value.facts || [])
const tableFacts = computed(() => allFacts.value.filter((f) => (size.value === 'xl' ? true : f.tier !== 'xl')))
// a fact by its glyph: update (version), devices (clients), cast_connected (session), videocam (encoder), the network's glyph, computer (system)
const byIcon = (...icons) => allFacts.value.find((f) => icons.includes(f.icon))
const parts = (v) => String(v || '').split(' · ').filter(Boolean)
const blocks = computed(() => {
  const ver = byIcon('update'), cli = byIcon('devices'), ses = byIcon('cast_connected'), enc = byIcon('videocam'), net = byIcon('settings_ethernet', 'wifi'), sys = byIcon('computer')
  const out = []
  if (live.value && ses) { const p = parts(ses.value); out.push({ key: 'ses', icon: 'sports_esports', value: p[0], label: [p[1], ses.label].filter(Boolean).join(' · '), short: ses.label, on: true }) }
  // 31 台已配对 · 1 台在线: the block says the count and what it counts, the online part goes to its label; the chip says all of it
  if (cli) { const p = parts(cli.value); out.push({ key: 'cli', icon: 'devices', value: p[0], label: [p[1], cli.label].filter(Boolean).join(' · '), short: cli.label, chip: cli.value, on: !live.value }) }
  if (enc) out.push({ key: 'enc', icon: 'videocam', value: parts(enc.value).slice(0, 2).join(' · '), label: enc.label, short: enc.label })
  if (net) { const p = parts(net.value); out.push({ key: 'net', icon: net.icon, value: p.find((x) => /bps/.test(x)) || p[0], label: [net.label, p[0]].join(' · '), short: net.label }) }
  if (ver) { const p = parts(ver.value); out.push({ key: 'ver', icon: 'update', value: p[1] || p[0], label: [ver.label, p[1] ? p[0] : ''].filter(Boolean).join(' · '), short: ver.label }) }
  // the system's name: its first two words as the value (Windows 11), the edition and the release in the label (系统 · Pro 24H2)
  if (sys && size.value === 'xl') { const w = parts(sys.value)[0].split(' '); out.push({ key: 'sys', icon: 'computer', value: w.slice(0, 2).join(' '), label: [sys.label, w.slice(2).join(' ')].filter(Boolean).join(' · '), short: sys.label }) }
  return out.slice(0, size.value === 'xl' ? 6 : 4)
})
// f2: the chips under the band: every fact the band does not say, as one short value
// the HDR chip of the header's list comes here too: the header keeps no chip that this row or the blocks already say
const hdrChip = computed(() => (d.value.chips || []).find((c) => c.icon === 'hdr_on'))
const chips = computed(() => {
  const list = blocks.value.filter((x) => x.key !== 'ses' && !(x.key === 'cli' && !live.value)).map((x) => ({ icon: x.icon, label: x.chip || x.value, key: x.key }))
  // HDR is a fact of the stream: it sits right after the encoder, so it is the last chip to give way when the row is short
  if (hdrChip.value) list.splice(Math.max(0, list.findIndex((x) => x.key === 'enc') + 1), 0, { icon: hdrChip.value.icon, label: hdrChip.value.label, key: 'hdr' })
  return list
})
const factsKind = computed(() => (!big.value ? '' : props.facts === 'auto' ? (live.value ? 'f2' : 'f1') : props.facts))
// the band's data: the props of a board, else what buildCards gives the hero (now, paired, art)
const nowData = computed(() => props.now || d.value.now || null)
const pairedList = computed(() => (props.clients.length ? props.clients : d.value.paired || []))
const artUrl = computed(() => props.art || d.value.art || '')
// B: the line under the name: the app and the client while streaming, the uptime and the paired count while idle (f2 says the stream in its band)
const line = computed(() => (live.value && factsKind.value === 'f2' ? '' : (d.value.pairs || []).map((p) => (live.value ? p.value : `${p.label} ${p.value}`)).join(' · ')))
const showPairs = computed(() => !(live.value && factsKind.value === 'f2'))
// the header's chips: with the facts below them (encoder, version, clients) only what they do not say stays (HDR while idle, nothing while streaming)
const topChips = computed(() => (factsKind.value ? (factsKind.value === 'f2' ? [] : hdrChip.value ? [hdrChip.value] : []) : d.value.chips || []))
// B: the colour of the cover (material-color-utilities: the source colour of the image, then the scheme of that seed); the theme's until it is known
// kept per cover (heroTintCache.js), so the card that is drawn again has its colours in the first frame
const tint = computed(() => { const art = props.tint && live.value && coverOk(artUrl.value) ? artUrl.value : ''; return art ? heroTintOf(art, typeof document !== 'undefined' && document.documentElement.dataset.bsTheme === 'dark', b.value) : null })
</script>

<template>
  <!-- a summary card (docs/tile-kit.md, the hero-share gate): data-tile-name is the focal element, every data-tile-facts part one grouped secondary element -->
  <section v-if="size === 's'" class="m-tile m-cal m-calh m-calh--sq" data-tile-summary :class="[`m-calh--${b ? 'b' : 'a'}`, { 'is-live': live, 'is-tinted': !!tint }]" data-size="s" :style="tint || undefined">
    <header class="m-calh__head"><MIcon :name="d.icon" /><span>{{ d.heading }}</span><b class="m-calh__status" :class="`is-${d.statusTone}`"><i :data-state="d.statusTone" />{{ d.statusLabel }}</b><i class="m-calh__dot" :class="`is-${d.statusTone}`" :data-state="d.statusTone" :title="d.statusLabel" /></header>
    <h3 class="m-calh__name" data-tile-name data-redact="host">{{ d.title }}</h3>
    <span class="m-calh__fact" data-tile-facts><span class="m-calh__factstate"><b>{{ d.statusLabel }}</b><template v-if="fact"> · </template></span>{{ fact }}</span>
  </section>
  <section v-else class="m-tile m-cal m-calh" data-tile-summary :class="[`m-calh--${b ? 'b' : 'a'}`, `is-${size}`, factsKind && `has-${factsKind}`, { 'is-live': live, 'is-tinted': !!tint }]" :data-size="size" :style="tint || undefined">
    <div class="m-calh__main">
      <header class="m-calh__head"><MIcon :name="d.icon" /><span>{{ d.heading }}</span>
        <b class="m-calh__status" :class="`is-${d.statusTone}`"><i :data-state="d.statusTone" />{{ d.statusLabel }}<em v-if="b && live && d.clock" class="m-dnum">{{ d.clock }}</em></b>
        <button v-if="d.action && size !== 'm'" type="button" class="m-calh__act" :data-kind="d.action.kind" :disabled="d.action.busy" :title="d.action.label" :aria-label="d.action.label" @click.stop="emit('act', { type: 'hero' })">
          <MIcon :name="d.action.icon" fill /><span class="m-calh__actlabel">{{ d.action.label }}</span>
        </button>
      </header>
      <!-- 中 is short: the action sits on the name's row (48 px, beside a name that needs 42), not on a row of its own -->
      <div v-if="d.action && size === 'm'" class="m-calh__namerow">
        <h3 class="m-calh__name" data-tile-name data-redact="host">{{ d.title }}</h3>
        <button type="button" class="m-calh__act" :data-kind="d.action.kind" :disabled="d.action.busy" :title="d.action.label" :aria-label="d.action.label" @click.stop="emit('act', { type: 'hero' })">
          <MIcon :name="d.action.icon" fill /><span class="m-calh__actlabel">{{ d.action.label }}</span>
        </button>
      </div>
      <h3 v-else class="m-calh__name" data-tile-name data-redact="host">{{ d.title }}</h3>
      <template v-if="b">
        <span v-if="line" class="m-calh__line" data-tile-facts>{{ line }}</span>
        <div v-if="topChips.length" class="m-calh__chips" data-tile-facts><span v-for="c in topChips" :key="c.label"><MIcon v-if="c.icon" :name="c.icon" />{{ c.label }}</span></div>
      </template>
      <template v-else>
        <div v-if="topChips.length" class="m-calh__chips" data-tile-facts><span v-for="c in topChips" :key="c.label"><MIcon v-if="c.icon" :name="c.icon" />{{ c.label }}</span></div>
        <dl v-if="showPairs" class="m-calh__pairs" data-tile-facts><div v-for="p in d.pairs" :key="p.label"><dt>{{ p.label }}</dt><dd>{{ p.value }}</dd></div></dl>
      </template>
      <!-- 特大 while idle: who is paired (the avatars and names are the band of a stream, which is not running) -->
      <div v-if="size === 'xl' && !live && factsKind === 'f1' && pairedList.length" class="m-calh__names" data-tile-facts data-redact="client"><em v-for="c in pairedList.slice(0, 5)" :key="c.name">{{ c.name }}</em></div>
      <dl v-if="factsKind === 'table' && tableFacts.length" class="m-calh__facts" data-tile-facts><div v-for="f in tableFacts" :key="f.label"><MIcon :name="f.icon" /><dt>{{ f.label }}</dt><dd>{{ f.value }}</dd></div></dl>
    </div>
    <!-- the facts of 大 and 特大 span the card's width under the main column -->
    <Transition name="m-calh-swap" mode="out-in">
    <ul v-if="factsKind === 'f1' && blocks.length" class="m-calh__blocks" data-tile-facts data-fit-rows="drop" :data-n="blocks.length">
      <li v-for="x in blocks" :key="x.key" :class="{ 'is-on': x.on }" :title="`${x.value} · ${x.label}`"><MIcon :name="x.icon" /><b>{{ x.value }}</b><small data-fit-detail><span class="m-calh__full">{{ x.label }}</span><span v-if="x.short && x.short !== x.label" class="m-calh__short">{{ x.short }}</span></small></li>
    </ul>
    <div v-else-if="factsKind === 'f2'" class="m-calh__f2" data-tile-facts>
      <!-- while streaming the now-playing band is the focus of the card (docs/tile-kit.md) -->
      <div v-if="live && nowData" class="m-calh__band" data-tile-focus>
        <MTileCover class="m-calh__art" :name="nowData.name" :cover="nowData.cover" />
        <span class="m-calh__now"><b data-redact="text">{{ nowData.name }}</b>
          <small v-if="nowData.client" data-redact="client">{{ nowData.client }}</small>
          <small v-if="nowData.stream && size === 'xl'">{{ nowData.stream }}</small></span>
        <!-- the band's end (R1): what is measured, each over what the session asked for (码率 22.6 Mbps / 目标 113 Mbps, 帧率 61 fps / 目标 120 fps); never a chart without its labelled value -->
        <span class="m-calh__live">
          <span class="m-calh__metric"><small>{{ nowData.bitrateBudget ? (T.bitrateTarget || '目标码率') : (T.bitrate || '码率') }}</small><b class="m-dnum">{{ nowData.bitrate }}<i>{{ T.mbps || 'Mbps' }}</i></b><em v-if="nowData.bitrateGoal && !nowData.bitrateBudget">{{ nowData.bitrateGoal }}</em></span>
          <span v-if="size === 'xl' && nowData.fps" class="m-calh__metric"><small>{{ T.fps || '帧率' }}</small><b class="m-dnum">{{ nowData.fps }}<i>fps</i></b><em v-if="nowData.fpsGoal">{{ nowData.fpsGoal }}</em></span>
          <MTileChart v-if="nowData.points?.length > 5" class="m-calh__spark" :points="nowData.points" kind="line" dot monotone :window="30" :pad="0.15" />
        </span>
      </div>
      <div v-else-if="pairedList.length" class="m-calh__band">
        <span class="m-calh__avatars"><i v-for="c in pairedList.slice(0, 4)" :key="c.name"><MIcon :name="c.icon || 'devices'" /></i></span>
        <span class="m-calh__now"><b>{{ pairedList.length }} {{ T.pairedCount || '台已配对' }}</b><small v-if="size !== 'xl'" data-redact="client">{{ pairedList.slice(0, 2).map((c) => c.name).join(' · ') }}</small>
          <span v-else class="m-calh__names" data-redact="client"><em v-for="c in pairedList.slice(0, 5)" :key="c.name">{{ c.name }}</em></span></span>
      </div>
      <div v-if="chips.length" class="m-calh__fchips" data-fit-rows><span v-for="c in chips" :key="c.label"><MIcon :name="c.icon" />{{ c.label }}</span></div>
    </div>
    </Transition>
  </section>
</template>

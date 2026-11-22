// The card catalogue of the home and the row packer. Every card has a group, a width in units of eight, a height class and a default
// visibility; the person can show, hide and reorder any of them (any card may go anywhere, the packer keeps the rows full).

import { COMPONENT_IDS } from '../status/model.js'
import { registeredComponentStatus } from '../status/controller.js'
import { statusTexts } from '../status/texts.js'
import { catalogueMeta, CATALOGUE_IDS, stripControl, switchControl } from './homeCatalogue.js'

export const GROUPS = Object.freeze(['host', 'stream', 'perf', 'device', 'control', 'start', 'resources', 'personal'])

/** Row height classes: cards of different classes never share a row (equal heights per row). */
const HEIGHTS_BASE = {
  wide: { journey: 'minmax(200px, auto)', hero: 'minmax(164px, auto)', strip: '54px', tile: 'minmax(96px, auto)', card: '190px', tall: '232px', list: 'minmax(270px, 1fr)' },
  compact: { journey: 'minmax(200px, auto)', hero: 'minmax(140px, auto)', strip: '48px', tile: 'minmax(92px, auto)', card: '156px', tall: '204px', list: 'minmax(240px, 1fr)' },
  narrow: { journey: 'minmax(200px, auto)', hero: 'minmax(128px, auto)', strip: '52px', tile: 'minmax(96px, auto)', card: 'minmax(96px, auto)', tall: 'minmax(150px, auto)', list: 'minmax(160px, auto)' },
}

// a tall window (4K at 100 %: 1800 css px and more): the rows are a step taller and the type of the tiles a step larger (css zoom of the tile body, 1.2), so tiles do not look tiny
export const HEIGHTS = Object.freeze({ ...HEIGHTS_BASE, xl: Object.freeze(Object.fromEntries(Object.entries(HEIGHTS_BASE.wide).map(([k, v]) => [k, v.replace(/(\d+)px/g, (_, n) => `${Math.round(n * 1.25)}px`)]))) })
export const XL_FROM = 1800

// id -> { group, span, cls, def, title (text key), source (text key) }; def: always | live | idle | new | notNew
export const CARD_META = Object.freeze({
  // 连接设备 as a card: the first one while the host has no paired client (choose the device, install, pair, done); then the compact pairing card takes its place
  journey: { group: 'start', span: 8, cls: 'journey', def: 'journey', title: 'journeyTitle', source: 'srcJourney' },
  // the ask for a star is not a tile any more: MStarPrompt, a compact card at the top of the overview, once after the first pairing or stream
  hero: { group: 'host', span: 4, cls: 'hero', def: 'always', title: 'host', source: 'srcHero' },
  vdd: { group: 'host', span: 2, cls: 'card', def: 'always', title: 'vdd', source: 'srcVdd' },
  encoder: { group: 'host', span: 2, cls: 'card', def: 'always', title: 'encoder', source: 'srcEncoder' },
  display: { group: 'host', span: 2, cls: 'card', def: 'always', title: 'display', source: 'srcDisplay' },
  bitrate: { group: 'stream', span: 2, cls: 'hero', def: 'live', title: 'bitrate', source: 'srcBitrate' },
  fps: { group: 'stream', span: 2, cls: 'hero', def: 'live', title: 'fps', source: 'srcFps' },
  table: { group: 'stream', span: 4, cls: 'list', def: 'notNew', title: 'clients', source: 'srcTable' },
  cpu: { group: 'perf', span: 2, cls: 'hero', def: 'idle', title: 'cpu', source: 'srcCpu' },
  gpu: { group: 'perf', span: 2, cls: 'hero', def: 'idle', title: 'gpu', source: 'srcGpu' },
  memory: { group: 'perf', span: 2, cls: 'card', def: 'always', title: 'memory', source: 'srcMemory' },
  'gamepad-type': { group: 'control', span: 4, cls: 'strip', def: 'always', title: 'gamepadType', source: 'srcGamepadType' },
  'sw:mic': { group: 'control', span: 2, cls: 'strip', def: 'always', title: 'mic', source: 'srcMic' },
  devices: { group: 'device', span: 2, cls: 'card', def: 'always', title: 'devices', source: 'srcDevices' },
  // the 开始使用 card is not on the overview by default (the first run covers the setup, and what is still open after it, such as no pairing yet, comes through the smart tiles); it stays in the catalogue and under 帮助
  guide: { group: 'start', span: 4, cls: 'card', def: 'off', title: 'guideTitle', source: 'srcGuide' },
  download: { group: 'start', span: 4, cls: 'card', def: 'paired', title: 'downloadTitle', source: 'srcDownload' },
  apps: { group: 'resources', span: 2, cls: 'list', def: 'notNew', title: 'apps', source: 'srcApps' },
  sponsor: { group: 'resources', span: 2, cls: 'list', def: 'notNew', title: 'sponsorTitle', source: 'srcSponsor' },
  // the status of each component (page 组件状态): off until someone adds it
  ...Object.fromEntries(COMPONENT_IDS.map((id) => [`comp:${id}`, { group: 'host', span: 2, cls: 'card', def: 'off', title: 'compTitle', source: 'srcComponent', sizes: { s: [2, 1], m: [4, 1] }, size: 's' }])),
  // the quick actions: the four things people look for most (check the connection, the log, updates, restart) in one slim row, shown from the start
  quick: { group: 'resources', span: 4, cls: 'strip', def: 'always', title: 'c_quick', source: 's_quick', sizes: { m: [4, 1], l: [8, 1] }, size: 'm' },
  // the extended catalogue: cards on the chart set, hidden until someone adds them (homeCatalogue.js)
  ...catalogueMeta(),
})

/** Order of the catalogue when nobody has arranged anything. */
export const DEFAULT_ORDER = Object.freeze([...new Set(['journey', 'hero', 'pair', 'download', 'cpu', 'gpu', 'bitrate', 'fps', 'gamepad-type', 'sw:mic', 'quick', 'vdd', 'encoder', 'display', 'memory', 'devices', 'download', 'table', 'apps', 'sponsor', ...COMPONENT_IDS.map((id) => `comp:${id}`), ...CATALOGUE_IDS])])

export const defaultVisible = (def, ctx = {}) => (def === 'always' ? true : def === 'live' ? !!ctx.live : def === 'idle' ? !ctx.live : def === 'new' ? !!ctx.isNew : def === 'notNew' ? !ctx.isNew : def === 'off' ? false : def === 'journey' ? !!ctx.journey : def === 'star' ? !!ctx.star : def === 'paired' ? ctx.hasClients !== false : true)

/**
 * Cards of the home from the model of `buildHomeModel` plus the extra inputs of the cards that are not part of it.
 * ctx: { texts, guide: null | { ... }, download: null | { ... }, sponsor: boolean, vdd: null | { ... } }.
 * Returns [{ id, kind, group, span, cls, def, title, source, available, data }] in catalogue order.
 */
// the CPU and the GPU card with what the host's system information adds: the model, the cores and threads, the temperature where there is one; the GPU: its driver, memory and whether the stream uses it
function withFacts(c, si, temps, T) {
  const f = (text, vars) => String(text || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
  if (c.id === 'cpu' && si.cpu?.model) return { ...c, caption: si.cpu.model, facts: [si.cpu.cores && si.cpu.threads ? f(T.cpuCores, { c: si.cpu.cores, t: si.cpu.threads }) : '', temps?.cpu ? `${Math.round(temps.cpu)} °C` : ''].filter(Boolean) }
  if (c.id === 'gpu' && si.gpus?.length) {
    const g = si.gpus.find((x) => x.is_streaming_adapter) || si.gpus[0]
    return { ...c, caption: g.name || c.caption, facts: [g.driver_version ? f(T.gpuDriver, { v: g.driver_version }) : '', g.vram_mb ? f(T.gpuVram, { n: +(g.vram_mb / 1024).toFixed(g.vram_mb % 1024 ? 1 : 0) }) : '', temps?.gpu ? `${Math.round(temps.gpu)} °C` : '', g.is_streaming_adapter ? T.gpuStreams : ''].filter(Boolean) }
  }
  return c
}
// The facts the 本主机 card adds at 大 (version, clients, session) and at 特大 (encoder, network, system): the same data the other tiles read, gathered on the host card; nothing new
function heroFacts(model, cat, T) {
  const f = []
  const up = cat.update
  if (up?.big) f.push({ icon: 'update', label: T.heroVersion, value: [up.big, up.rows?.[0]?.title].filter(Boolean).join(' · '), tier: 'l' })
  const paired = cat['clients-paired']; const online = cat['clients-online']
  if (paired) f.push({ icon: 'devices', label: T.heroClients, value: [`${paired.count} ${T.pairedCount || ''}`.trim(), online?.count ? String(T.heroOnline || '{n}').replace('{n}', online.count) : ''].filter(Boolean).join(' · '), tier: 'l' })
  const now = cat['current-app']
  f.push({ icon: 'cast_connected', label: T.heroSession, value: now ? [now.name, ...(now.rows || []).map((r) => r.value)].filter(Boolean).join(' · ') : T.heroIdle, tier: 'l' })
  const enc = (model.info || []).find((i) => i.id === 'encoder')
  if (enc?.value) f.push({ icon: 'videocam', label: T.heroEncoder, value: [enc.value, enc.sub].filter(Boolean).join(' · '), tier: 'xl' })
  const net = cat.net?.primary
  if (net) f.push({ icon: net.wifi ? 'wifi' : 'settings_ethernet', label: T.heroNetwork, value: [net.name, net.speed, net.ipv4].filter(Boolean).join(' · '), tier: 'xl' })
  if (cat.sys?.big) f.push({ icon: 'computer', label: T.heroSystem, value: [cat.sys.big, cat.sys.rows?.[0]?.value].filter((v) => v && v !== '–').join(' '), tier: 'xl' })
  return f
}
// What the hero's facts band shows (tiles/cal/CalHero.vue, F2): while streaming the game, its cover, the client, the stream and the bitrate's samples with the
// bitrate and the frame rate now; while idle the paired clients; `art` is the cover the hero may take its colours from. All of it is data the other tiles read.
function heroBand(model, cat, T = {}) {
  const cur = cat['current-app']
  const curve = (id) => (model.curves || []).find((c) => c.id === id)
  const row = (icon) => cur?.rows?.find((r) => r.icon === icon)?.value || ''
  // what the session asked for, written next to what is measured: 目标 113 Mbps under the bitrate, 目标 120 fps under the frame rate
  const goal = (c, unit) => (c?.target ? `${T.target || ''} ${c.target} ${unit}`.trim() : '')
  // `stream` is the picture size only: the frame rate asked for is `fpsGoal`, the one measured is `fps`
  const now = model.hero.statusTone === 'live' && cur ? { name: cur.name, cover: cur.cover || '', client: row('devices'), stream: row('monitor').split(' · ')[0], points: curve('bitrate')?.points || [], bitrate: curve('bitrate')?.value || '', bitrateBudget: !!curve('bitrate')?.configured, bitrateGoal: goal(curve('bitrate'), T.mbps || 'Mbps'), fps: curve('fps')?.value || '', fpsGoal: goal(curve('fps'), T.fpsUnit || 'fps') } : null
  return { now, paired: (cat['clients-paired']?.items || []).map((c) => ({ name: c.name, icon: c.icon })), art: now?.cover || '' }
}
/** When a change of the controller type applies: 'next' (the next virtual controller) on a Windows host, else 'restart' (Linux and macOS read it at start; unknown: the safe answer). */
export const padApplies = (cat = {}) => ((cat['host-name']?.rows || []).some((r) => r.icon === 'computer' && /windows/i.test(String(r.value))) ? 'next' : 'restart')
export function buildCards(model, ctx = {}) {
  const T = ctx.texts || {}
  const byId = new Map()
  const add = (id, kind, data, available = true, titleOverride = '') => {
    const meta = CARD_META[id]
    if (!meta) return
    byId.set(id, { id, kind, group: meta.group, span: meta.span, cls: meta.cls, def: meta.def, sizes: meta.sizes, size: meta.size, title: titleOverride || T[meta.title] || id, source: T[meta.source] || '', available: !!available, data })
  }
  if (model.hero) add('hero', 'hero', { ...model.hero, facts: heroFacts(model, ctx.catalogue || {}, T), ...heroBand(model, ctx.catalogue || {}, T) }, true, T.host)
  for (const c of model.curves || []) add(c.id, 'curve', ctx.sysinfo ? withFacts(c, ctx.sysinfo, ctx.temps, T) : c, true, c.configured ? c.title : '') // a configured value (目标码率) names itself
  if (model.strip) {
    add('gamepad-type', 'widget', { ...stripControl(model.strip), applies: padApplies(ctx.catalogue || {}) }, true, model.strip.label)
    for (const sw of model.strip.switches || []) add(`sw:${sw.id}`, 'widget', switchControl(sw, T), true, sw.label)
  }
  for (const info of model.info || []) add(info.id, 'info', info, info.id !== 'display' || !model.vdd)
  // the memory card's samples (the share in use over the last hour) for the tiles that draw its line
  if (byId.has('memory') && ctx.catalogue?.['memory-trend']?.points) byId.get('memory').trend = ctx.catalogue['memory-trend'].points
  // 大: what the stream adds under the numeral of 帧率 and 码率
  const cat = ctx.catalogue || {}
  if (byId.has('fps') && cat.dropped) byId.get('fps').extra = [`${cat.dropped.title} ${cat.dropped.value}`]
  if (byId.has('bitrate')) { const cap = cat['stream-bitrate']?.rows?.[0]; byId.get('bitrate').extra = [cap && `${cap.title} ${cap.value}`, String((model.info || []).find((i) => i.id === 'encoder')?.sub || '').split(' · ')[0]].filter(Boolean) }
  if (model.vdd) add('vdd', 'vdd', model.vdd)
  if (model.table) add('table', 'table', model.table)
  if (model.apps) add('apps', 'apps', model.apps)
  if (ctx.journey) add('journey', 'journey', ctx.journey)
  if (ctx.guide) add('guide', 'guide', ctx.guide)
  if (ctx.download) add('download', 'download', ctx.download)
  if (ctx.sponsor) add('sponsor', 'sponsor', ctx.sponsor)
  // component status cards read the controller the product registered; their data is the component id
  const status = registeredComponentStatus()
  for (const id of COMPONENT_IDS) add(`comp:${id}`, 'component', { id }, true, status ? status.cardTitle(id) : statusTexts('en').cardTitle.replace('{name}', statusTexts('en').names[id]))
  if (ctx.catalogue?.quick) add('quick', 'widget', ctx.catalogue.quick, true, ctx.catalogue.quick.title)
  for (const id of CATALOGUE_IDS) { const data = ctx.catalogue?.[id]; if (data) add(id, data.points ? 'curve' : 'widget', data, true, data.title || T[`c_${id}`]) }
  // every catalogue entry shows in the catalogue even when its data is missing now (marked unavailable)
  for (const id of DEFAULT_ORDER) if (!byId.has(id)) add(id, 'empty', null, false)
  return DEFAULT_ORDER.map((id) => byId.get(id))
}

export { packDash } from './homePack.js'

/** Grid template rows for packed rows at a density ('wide' | 'compact' | 'narrow'). Only the last list row stretches to fill the window. */
export function rowTemplate(rows, density = 'wide') {
  const h = HEIGHTS[density] || HEIGHTS.wide
  return rows.map((r, i) => (r.cls === 'list' && i !== rows.length - 1 ? h.list.replace('1fr', 'auto') : h[r.cls])).join(' ')
}

const STEP_ICON = { download: 'download', pair: 'person_add', quality: 'tune', connect: 'cast_connected', game: 'sports_esports' }
const STEP_GO = { download: 'stepDownloadGo', pair: 'stepPairGo', quality: 'stepQualityGo', connect: 'stepConnectGo', game: 'stepGameGo' }
/** Data of the finish-setting-up card; null while there is nothing left to do (or the person hid it). */
export function guideCardData(T, steps, visible) {
  if (!visible || !steps || !steps.length) return null
  return { steps: steps.map((s) => ({ ...s, icon: STEP_ICON[s.id], go: T[STEP_GO[s.id]] })), texts: { title: T.guideTitle, go: T.stepGo, skip: T.skip } }
}
/** The words of the star prompt (MStarPrompt). */
export const starPromptTexts = (T) => ({ title: T.starTitle, sub: T.starSub, action: T.starPromptAction, later: T.starLater, bilibili: T.starBilibili, hostShort: T.starHostShort, clientShort: T.starClientShort, bilibiliShort: T.starBilibiliShort })
export const downloadCardData = (T, extra = {}) => ({ texts: { title: T.downloadTitle, openDownloads: T.openDownloads }, ...extra })
/** `targets`: [{ id, label }] of the product's sponsor list (the card shows one row each and the star); without them the card has one sponsor button. */
export const sponsorCardData = (T, targets = []) => ({ texts: { title: T.sponsorTitle, line: T.sponsorLine, sponsor: T.sponsorAction, star: T.star }, targets: targets.map((x) => ({ id: x.id, label: x.label })) })
/** Where each guide step leads (the product maps these to its destinations). */
export const GUIDE_TARGET = Object.freeze({ download: 'downloads', pair: 'clients', quality: 'welcome', connect: 'welcome', game: 'apps' })

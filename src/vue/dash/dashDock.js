import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { fitDash, heightOf, sectionLayout, sectionedOf } from '../homeFit.js'
import { PURPOSES, purposeOf, sectionIndexOf, suggestions } from '../homeSmart.js'
import { clientInUse, clientRecommendation, markClientRec, readClientRec } from '../clientPrompt.js'
import { starClientInUse } from '../starCard.js'
import { slotEnter, slotLeave } from '../promptSlot.js'
import { UNIT_GAP } from '../homeSizes.js'
import { effectiveClockSize } from '../../appearance/appearance.js'

/** dashDock: one part of the home overview's setup (MHomeDash.vue); D is the shared scope of the parts, in the order they are made. */
export function useDashDock(D) {
  const { T, allCards, appearance, boxFor, cardById, dockLayout, edit, emit, ghostCards, gridOf, layout, mode, plan, priority, props, replan, rowPxIn, smart, tall, trackTemplate, usage, visibleCards, wide, width, windowClass } = D
  // ---- sections: from 2560 css px or wider than 2.1 : 1 the overview is a row of sections, each its own grid of at most 1000 px
  const rootTop = ref(140)
  const availH = computed(() => Math.max(420, tall.value - rootTop.value - 16))
  const sectioned = computed(() => mode.value === 'wide' && sectionedOf(wide.value, tall.value))
  const across = computed(() => sectionLayout(width.value).across)
  const sectionCount = computed(() => (!smart.value && layout.state.sectionCount ? layout.state.sectionCount : Math.min(PURPOSES.length, across.value)))
  const sectionOfCard = (c) => { const manual = layout.state.sectionOf[c.id]; return Number.isInteger(manual) && !smart.value ? Math.min(manual, sectionCount.value - 1) : sectionIndexOf(purposeOf(c.id, c.group), sectionCount.value) }
  const SECTION_TITLES = computed(() => ({ 0: T.value.secLive, 1: T.value.secControls, 2: T.value.secClients, 3: T.value.secSystem }))
  // the smart overview of a window: a row that stops a column short of the right edge gives that column to the single-row tile at its end (no row ends short of the window); the search for the arrangement is not changed
  const closeRowEnds = (packed, units) => {
    for (let r = 0; r < packed.rows.length; r++) {
      const here = [...packed.placed.values()].filter((p) => p.row <= r && r < p.row + p.rows)
      const end = Math.max(0, ...here.map((p) => p.col + p.span))
      const last = here.find((p) => p.col + p.span === end)
      if (end < units && last && last.rows === 1 && last.row === r && last.cls !== 'strip' && !here.some((p) => p !== last && p.col >= end)) {
        const run = units - end
        last.span += run
        const cell = packed.rows[r].cells.find((c) => c.col === last.col)
        if (cell) cell.span += run
      }
    }
  }
  const blockOf = (key, list, w, more = {}) => {
    const { light, ghostSection, taken, only, hole, close, ...rest } = more
    const grid = gridOf(w)
    // the suggestions of the section's own purpose come first
    const candidates = light ? [] : (only || ghostCards.value).filter((g) => !list.some((x) => x.id === g.id) && !(taken && taken.has(g.id))).sort((a, b) => Number(ghostSection !== undefined && sectionIndexOf(purposeOf(b.id, b.group), sectionCount.value) === ghostSection) - Number(ghostSection !== undefined && sectionIndexOf(purposeOf(a.id, a.group), sectionCount.value) === ghostSection))
    const f = fitDash(list, w, boxFor, { ...rest, units: grid.columns, caps: false, pack: { dense: true, exact: true }, maxHole: hole ?? 1, promote: smart.value && !light && windowClass.value !== 'compact', priority, ghosts: candidates })
    if (close) closeRowEnds(f.packed, f.units)
    const ghosts = new Set(f.ghosts)
    const boxed = f.boxed.map((c) => (ghosts.has(c.id) ? { ...c, ghost: true } : c))
    if (typeof window !== 'undefined') (window.__m3eFit ||= {})[key] = { w, units: f.units, trace: f.trace }
    return { key, units: f.units, unit: grid.unit, boxed, packed: f.packed, natural: heightOf(f.packed, rowPxIn(grid.unit), UNIT_GAP), template: trackTemplate(f.packed.rows, grid.unit), ratio: f.ratio }
  }
  // ---- the dock: not the default. A big clock with the date and a short status line in the upper area, every tile in ONE row along the bottom, scrolling sideways when they do not fit.
  // The tiles keep the one size standard (S, M, L, XL: the same boxes as in the grid); editing shows the grid, where the arrangement is made.
  const dockOn = computed(() => dockLayout.value && !edit.value)
  const clockNow = ref(Date.now())
  let clockTimer = 0
  onMounted(() => { clockTimer = setInterval(() => { clockNow.value = Date.now() }, 10000) })
  onBeforeUnmount(() => clearInterval(clockTimer))
  // the products do not pass a locale: a Chinese status line (the words of the dock come with the texts of the page) means a Chinese date
  const clockLocale = computed(() => (/^zh/i.test(String(props.locale)) || /[\u4e00-\u9fff]/.test(T.value.dockIdle || '') ? 'zh-CN' : props.locale || 'en'))
  const clockSizeDrawn = computed(() => effectiveClockSize(appearance.state.clockSize, wide.value))
  // 特大 only where the window has room beside the clock (appearance.js)
  const clockText = computed(() => new Intl.DateTimeFormat(clockLocale.value, { hour: '2-digit', minute: '2-digit', hour12: false }).format(clockNow.value))
  const dateText = computed(() => new Intl.DateTimeFormat(clockLocale.value, { weekday: 'long', month: 'long', day: 'numeric' }).format(clockNow.value))
  const statusText = computed(() => {
    const s = props.ctx.signals || {}
    const parts = [s.streaming ? T.value.dockStreaming : T.value.dockIdle]
    if (Number.isInteger(s.pairedCount) && s.pairedCount > 0) parts.push(T.value.dockPaired.replace('{n}', s.pairedCount))
    return parts.join(' · ')
  })
  const dockCards = computed(() => (dockOn.value ? visibleCards.value.map((c) => boxFor(c, 8)) : []))
  // one anatomy, one size: a near-square tile (176 px), the graphic and the badge on top, the text under them
  const DOCK_TILE = 176
  const dockStyle = () => ({ width: `${DOCK_TILE}px`, height: `${DOCK_TILE}px` })
  const setOverview = (value) => appearance.set({ overview: value })
  // the ask for a star: while a stream runs the star of the client in use (from the family the host says of the device of the session; the host star when it is not one of ours), when nothing streams the
  // host star and the sponsor entry
  const starStreaming = computed(() => !!props.ctx.live)
  const starClient = computed(() => (starStreaming.value ? starClientInUse({ clients: props.ctx.clientList || [], session: props.ctx.sessionClient || null, names: props.ctx.starNames || [] }) : null))
  // the client the person streams with is not one we recommend: the prompt recommends one for their system (once per client) and takes the place of the star card while it is due, then the star card is what it was
  const recDone = ref(readClientRec(props.storageKey))
  const clientRec = computed(() => {
    if (!props.ctx.star) return null
    return clientRecommendation({ use: clientInUse({ clients: props.ctx.clientList || [], session: props.ctx.sessionClient || null }), done: recDone.value, locale: props.locale })
  })
  // the one button opens the client download page of this application: on the system of the recommendation when there is one, as it opens anywhere when there is none; handled for the device like 以后再说
  const recOpen = (rec) => { emit('action', rec?.platform ? { card: 'client-rec', type: 'download', value: rec.platform } : { card: 'client-rec', type: 'open', value: 'downloads' }); recLater() }
  const recLater = () => { if (clientRec.value) recDone.value = markClientRec(props.storageKey, clientRec.value.key) }
  const starOpen = (url) => { emit('action', { card: 'star', type: 'open-url', value: url }); emit('action', { card: 'star', type: 'star-dismiss' }) }
  const starLater = () => emit('action', { card: 'star', type: 'star-dismiss' })
  const starSponsor = () => emit('action', { card: 'star', type: 'sponsor', value: '' })
  const dockRow = ref(null)
  const dockEdge = ref({ left: false, right: false, scroll: false })
  // the tiles outrun the row when their total width is more than the wrap (measured on the tiles, so the room kept for the arrows does not change the answer)
  const measureDock = () => {
    const r = dockRow.value; if (!r) return
    const cells = r.children, last = cells[cells.length - 1], wrap = r.parentElement
    const content = last ? last.offsetLeft + last.offsetWidth - cells[0].offsetLeft : 0
    const scroll = !!wrap && content > wrap.clientWidth - 0.5
    dockEdge.value = { scroll, left: scroll && r.scrollLeft > 4, right: scroll && r.scrollLeft + r.clientWidth < r.scrollWidth - 4 }
  }
  const dockScroll = (dir) => dockRow.value?.scrollBy({ left: dir * Math.round(dockRow.value.clientWidth * 0.8), behavior: 'smooth' })
  watch([dockOn, dockCards], async () => { await nextTick(); measureDock() }, { flush: 'post' })
  // the size of the window is the observer's business (below)
  watch(dockRow, (el, _old, onCleanup) => { if (!el) return; const o = new ResizeObserver(() => measureDock()); o.observe(el); if (el.parentElement) o.observe(el.parentElement); onCleanup(() => o.disconnect()) })
  // the row opens at its start (the first tile is 本主机), and the wheel moves it sideways: a mouse has no horizontal scroll
  watch(dockOn, async (on) => { if (!on) return; await nextTick(); if (dockRow.value) dockRow.value.scrollLeft = 0 }, { immediate: true, flush: 'post' })
  // the row takes the wheel only while it can still move that way; at either end the wheel goes on to the page, so it never gets stuck over the dock
  const onDockWheel = (event) => {
    const row = dockRow.value
    if (!row || row.scrollWidth <= row.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    const max = row.scrollWidth - row.clientWidth
    if ((event.deltaY < 0 && row.scrollLeft <= 0) || (event.deltaY > 0 && row.scrollLeft >= max - 1)) return
    row.scrollLeft = Math.max(0, Math.min(max, row.scrollLeft + event.deltaY)); event.preventDefault()
  }
  const blocks = computed(() => {
    const list = visibleCards.value
    if (!sectioned.value) {
      // the smart overview in one grid fills its window like a section does: the key tiles a size up within their caps, then suggested tiles, toward 80-96 % of the height, and no row is short by a column
      if (!smart.value || windowClass.value === 'compact') return [blockOf('grid', list, width.value)]
      const unit = gridOf(width.value).unit
      const avail = availH.value
      return [blockOf('grid', list, width.value, { hole: 1, close: true, target: { min: 0.8 * avail, max: 0.96 * avail, rowPx: rowPxIn(unit), gap: UNIT_GAP } })]
    }
    const per = sectionLayout(width.value)
    const groups = Array.from({ length: sectionCount.value }, () => [])
    for (const c of list) groups[sectionOfCard(c)].push(c)
    const SEC = { minUnits: 6, maxUnits: 8 }
    const meta = (b, i) => ({ ...b, section: i, title: sectionCount.value === 4 ? SECTION_TITLES.value[i] : `${T.value.section} ${i + 1}`, width: per.width })
    if (!smart.value) return groups.map((g, i) => meta(blockOf(`s${i}`, g, per.width, SEC), i))
    // smart: the sections are balanced in height first (a tile moves to the neighbouring section by purpose), then every section grows toward one height that covers
    // 70-90 % of the window: key tiles a size up within their caps, and only when that runs out suggested tiles
    const px = rowPxIn(gridOf(per.width).unit)
    const hOf = (b) => heightOf(b.packed, px, UNIT_GAP)
    const light = (g, i) => blockOf(`s${i}`, g, per.width, { ...SEC, light: true })
    let lights = groups.map(light)
    for (let n = 0; n < 30 && groups.length > 1; n++) {
      const hs = lights.map(hOf)
      const hi = hs.indexOf(Math.max(...hs)), lo = hs.indexOf(Math.min(...hs))
      if ((hs[hi] - hs[lo]) / hs[hi] <= 0.2) break
      // purposes are soft: the shortest section takes from the tallest, whichever it is, a tile whose purpose is nearest to its own first, then the least important
      const near = (c) => Math.abs(sectionIndexOf(purposeOf(c.id, c.group), groups.length) - lo)
      const movable = [...groups[hi]].sort((a, b) => near(a) - near(b) || plan.value.score(a.id) - plan.value.score(b.id)).slice(0, 8)
      let moved = false
      for (const c of movable) {
        const gh = groups[hi].filter((x) => x.id !== c.id), gl = [...groups[lo], c]
        const bh = light(gh, hi), bl = light(gl, lo)
        if (Math.abs(hOf(bh) - hOf(bl)) < Math.abs(hs[hi] - hs[lo]) - 1) { groups[hi] = gh; groups[lo] = gl; lights[hi] = bh; lights[lo] = bl; moved = true; break }
      }
      if (!moved) break
    }
    const hmax = Math.max(...lights.map(hOf))
    const avail = availH.value
    const tmin = Math.max(0.72 * avail, 0.78 * hmax)
    const target = { min: tmin, max: Math.max(tmin, 0.92 * avail, hmax), rowPx: px, gap: UNIT_GAP }
    // every section grows toward the target in turn: promotions first (inside the fit), then suggestions; a suggested tile is suggested in one section only
    const taken = new Set()
    const fits = groups.map((g, i) => { const b = blockOf(`s${i}`, g, per.width, { ...SEC, target, ghostSection: i, taken }); for (const c of b.boxed) if (c.ghost) taken.add(c.id); return b })
    // after the growth the sections are balanced once more, now with the suggested tiles among the tiles that move (a suggestion is the first to go): the shortest takes from the tallest
    const byId = new Map([...list, ...ghostCards.value].map((c) => [c.id, c]))
    const lists = fits.map((b) => b.boxed.map((c) => byId.get(c.id)).filter(Boolean))
    const finals = [...fits]
    const refit = (l, i) => blockOf(`s${i}`, l, per.width, { ...SEC, target, only: [] })
    for (let n = 0; n < 16 && lists.length > 1; n++) {
      const hs = finals.map(hOf)
      const hi = hs.indexOf(Math.max(...hs)), lo = hs.indexOf(Math.min(...hs))
      if ((hs[hi] - hs[lo]) / hs[hi] <= 0.2) break
      const movable = [...lists[hi]].sort((a, b) => Number(!!b.ghost) - Number(!!a.ghost) || plan.value.score(a.id) - plan.value.score(b.id)).slice(0, 8)
      let moved = false
      for (const c of movable) {
        const lh = lists[hi].filter((x) => x.id !== c.id), ll = [...lists[lo], c]
        const bh = refit(lh, hi), bl = refit(ll, lo)
        if (Math.abs(hOf(bh) - hOf(bl)) < Math.abs(hs[hi] - hs[lo]) - 1) { lists[hi] = lh; lists[lo] = ll; finals[hi] = bh; finals[lo] = bl; moved = true; break }
      }
      if (!moved) break
    }
    return finals.map((b, i) => meta(b, i))
  })
  const shown = computed(() => blocks.value.flatMap((b) => b.boxed))
  // what is left of the window under the tallest section: the block is centred in it (equal margins above and below); the shorter sections end at the same baseline, the rest of their height being an even gap between their rows
  const slack = computed(() => (sectioned.value && !edit.value ? Math.max(0, Math.round(availH.value - Math.max(0, ...blocks.value.map((b) => b.natural || 0)))) : 0))
  const shownIds = computed(() => shown.value.filter((c) => !c.ghost).map((c) => c.id))
  const placedOf = (id) => { for (const b of blocks.value) { const p = b.packed.placed.get(id); if (p) return p } return null }
  const cellStyle = (b, id) => { const p = b.packed.placed.get(id); return p ? { gridRow: `${p.row + 1} / span ${p.rows}`, gridColumn: `${p.col + 1} / span ${p.span}` } : {} }
  // the smart overview in one grid fills the height of its window: the unit rows grow (by up to 30 %) until the grid reaches the bottom of the window, the strip rows keep their height;
  // a grid that is already taller than the window is not changed
  const fills = computed(() => smart.value && !sectioned.value && !edit.value && !dockOn.value && windowClass.value !== 'compact')
  const fillK = ref(1)
  const measureFill = () => {
    const el = D.root?.value?.querySelector?.('.m-dash__blocks')
    const b = blocks.value[0]
    if (!fills.value || !el || !b || !b.unit) { fillK.value = 1; return }
    const scroller = el.closest('.m-scene__pane, .m-scene')
    if (scroller && scroller.scrollTop > 2) return // measured from the top only
    const rows = String(b.template || '').split(' ')
    const unitRows = rows.filter((t) => t === `${b.unit}px`).length
    if (!unitRows) { fillK.value = 1; return }
    const rest = b.natural - unitRows * b.unit
    const avail = tall.value - el.getBoundingClientRect().top - 16
    const k = (avail - rest) / (unitRows * b.unit)
    fillK.value = Math.max(1, Math.min(1.3, Math.round(k * 100) / 100))
  }
  const fillTemplate = (b) => String(b.template || '').split(' ').map((t) => (t === `${b.unit}px` ? `${Math.round(b.unit * fillK.value)}px` : t)).join(' ')
  watch([fills, blocks, tall, width], async () => { await nextTick(); measureFill() }, { flush: 'post' })
  onMounted(() => nextTick(measureFill))
  const blockStyle = (b) => (b.width ? { width: `${b.width}px`, maxWidth: '100%' } : undefined)
  const reasonOf = (id) => { const r = plan.value.reasons[id]; return r ? String(T.value[r.key] || '').replace('{n}', r.vars?.n ?? '') : '' }
  const whyRows = computed(() => plan.value.visible.map((id) => ({ id, title: cardById.value.get(id)?.title || id, icon: cardById.value.get(id)?.data?.icon || 'grid_view', reason: reasonOf(id) })))
  const whyOpen = ref(false)
  // editing is the person's own layout: with 智能磁贴 on, what the plan shows is copied into the saved layout first, so nothing moves; a change made while editing is the person's wish, so the switch goes off when
  // they finish (the chip below the title brings the plan back). Without a change the switch stays as it was and the saved layout is as it was.
  let editSnap = ''
  const layoutKey = () => JSON.stringify([layout.state.order, layout.state.overrides, layout.state.sizes, layout.state.pins])
  let editRaw = ''
  watch(edit, (on) => {
    if (on) { editRaw = JSON.stringify(layout.state); if (appearance.state.smartTiles && layout.state.mode === 'smart') layout.freeze(D.seenPlan && Date.now() - D.flushedAt < 1500 ? D.seenPlan : plan.value); D.seenPlan = null; editSnap = layoutKey(); return }
    if (appearance.state.smartTiles && layoutKey() !== editSnap) { appearance.set({ smartTiles: false }); return }
    // nothing was changed: the saved layout is as it was before editing began (what was copied into it to keep the tiles in place goes again)
    if (editRaw && layoutKey() === editSnap) Object.assign(layout.state, JSON.parse(editRaw))
  })
  const restoreSmart = () => { appearance.set({ smartTiles: true }); layout.setMode('smart'); replan(); D.say(T.value.smartOn) }
  const acceptGhost = (id) => { layout.accept(id); layout.setVisible(id, true); replan() }
  const hideGhost = (id) => { layout.hideSuggestion(id) }
  const addable = computed(() => layout.addable(allCards.value, props.ctx).filter((c) => !c.id.startsWith('pin:')))
  // ---- details sheet ----
  const detailId = ref('')
  const detail = computed(() => (detailId.value ? props.details?.[detailId.value] : null))
  function onAct(a) {
    if (a.type === 'star-accept') return
    if (a.card && !edit.value) usage.bump(a.card, a.type === 'detail' ? 'opens' : 'controls')
    if (a.type === 'journey-dismiss') { layout.setVisible('journey', false); return }
    if (edit.value) return
    if (a.type === 'detail') {
      const d = props.details?.[a.card]
      if (!d) return
      if (d.external) emit('action', { card: a.card, type: 'detail-external' }); else detailId.value = a.card
      return
    }
    emit('action', a)
  }
  Object.assign(D, { fills, fillTemplate, availH, slotEnter, slotLeave, starSponsor, starStreaming, acceptGhost, addable, blockStyle, blocks, cellStyle, clientRec, clockLocale, clockSizeDrawn, dateText, detail, detailId, dockCards, dockEdge, dockOn, dockRow, dockScroll, dockStyle, hideGhost, measureDock, onAct, onDockWheel, placedOf, recLater, recOpen, restoreSmart, rootTop, sectionCount, sectioned, setOverview, shown, shownIds, slack, starClient, starLater, starOpen, statusText, whyOpen, whyRows })
}

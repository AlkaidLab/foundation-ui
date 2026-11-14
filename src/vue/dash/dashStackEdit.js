import { computed, ref } from 'vue'
import { smallOf } from '../homeSmall.js'
import { suggestions } from '../homeSmart.js'
import { canJoin, isStackId } from '../stackModel.js'

/** dashStackEdit: one part of the home overview's setup (MHomeDash.vue); D is the shared scope of the parts, in the order they are made. */
export function useDashStackEdit(D) {
  const { T, cardById, layout, plan, root, smart, stacks, tall, visibleCards, visibleCardsRaw, windowClass } = D
  // ---- editing a stack: the sheet (members in order, add, the two switches, dissolve), and the sheet's edits go straight to the store
  const stackSheetId = ref('')
  const stackSheetOpen = computed({ get: () => !!stackSheetId.value && !!stacks.state.stacks[stackSheetId.value], set: (v) => { if (!v) stackSheetId.value = '' } })
  const stackSheetStack = computed(() => stacks.state.stacks[stackSheetId.value] || null)
  const openStackSheet = (id) => { stackSheetId.value = id }
  // what the person does in the sheet is told in the polite live region; the tile taken out is on the page again (where it was let go when it was dragged out)
  // 加入轮换组 on a selected tile: the tiles and stacks of its size it can join (the same as dragging it onto one and holding)
  const joinFor = ref('')
  const joinTargetsOf = (me) => D.shown.value.filter((c) => !c.ghost && c.id !== me.id && c.size === me.size && mergeable(me.id, c.id) && canJoin(cardById.value.get(me.id), c.size, windowClass.value, tall.value).ok && (isStackId(c.id) || canJoin(cardById.value.get(c.id), me.size, windowClass.value, tall.value).ok))
  const joinIcon = (c) => (isStackId(c.id) ? 'library_add' : 'add')
  const joinMe = computed(() => D.shown.value.find((c) => c.id === joinFor.value) || null)
  const joinTargets = computed(() => (joinMe.value ? joinTargetsOf(joinMe.value) : []))
  const joinOpen = computed({ get: () => !!joinMe.value, set: (v) => { if (!v) joinFor.value = '' } })
  const joinTitle = (c) => (isStackId(c.id) ? (T.value.stackJoinStack || '{names}').replace('{names}', c.stackMembers.map((m) => m.title).join(' · ')) : c.title)
  const joinInto = (target) => {
    const me = joinMe.value; if (!me) return
    if (mergeInto(me.id, target.id, me.size)) { D.say(T.value.stackMerged || ''); D.settling.value = target.id; clearTimeout(D.settleTimer); D.settleTimer = setTimeout(() => { D.settling.value = '' }, 520) }
    joinFor.value = ''; D.sel.value = ''
  }
  const sheetReorder = (e) => { const id = stacks.state.stacks[stackSheetId.value]?.members[e.from]; stacks.reorder(stackSheetId.value, e.from, e.to); if (id) D.say((T.value.stackMoved || '{name} {k}').replace('{name}', D.titleOf(id)).replace('{k}', e.to + 1)) }
  const sheetRemove = (id) => { stacks.remove(stackSheetId.value, id); D.say((T.value.stackTakenOut || '{name}').replace('{name}', D.titleOf(id))) }
  const sheetAdd = (id) => { stacks.add(stackSheetId.value, id); D.say((T.value.stackAdded || '{name}').replace('{name}', D.titleOf(id))) }
  const sheetOut = ({ id, x, y }) => {
    const under = [...root.value.querySelectorAll('.m-dash__cell[data-card]:not(.is-ghost)')].find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom })?.dataset.card
    stacks.remove(stackSheetId.value, id)
    layout.setVisible(id, true)
    const target = under && !isStackId(under) && under !== id ? under : under && isStackId(under) ? laid(under) : ''
    if (target) layout.moveTo(id, target)
    D.say((T.value.stackOnPage || '{name}').replace('{name}', D.titleOf(id)))
  }
  // the place of a stack among the tiles is the place of its first member on the page: dragging it moves that member, dropping on it is dropping on that member
  const laid = (id) => (isStackId(id) ? (visibleCardsRaw.value.find((c) => stacks.state.stacks[id]?.members.includes(c.id))?.id || stacks.state.stacks[id]?.members[0] || id) : id)
  // a tile dragged onto the middle of a tile of its size and held becomes a stack with it; onto a stack, one of its members
  const MERGE_HOLD_MS = 500
  D.mergeTimer = 0
  const SWAP_DWELL_MS = 260
  D.swapTimer = 0
  const clearSwap = () => { clearTimeout(D.swapTimer); D.swapTimer = 0; if (D.drag.value) D.drag.value.swapCand = '' }
  const clearMerge = () => { clearTimeout(D.mergeTimer); D.mergeTimer = 0; if (D.drag.value) { D.drag.value.merge = ''; D.drag.value.mergeCand = '' } }
  const mergeable = (dragId, targetId) => {
    const a = cardById.value.get(dragId); if (!a || isStackId(dragId)) return false
    if (isStackId(targetId)) return (stacks.state.stacks[targetId]?.members.length || 0) < stacks.STACK_MAX && !stacks.state.stacks[targetId]?.members.includes(dragId)
    const b = cardById.value.get(targetId); return !!b && !isStackId(targetId)
  }
  const mergeInto = (dragId, targetId, size) => {
    if (isStackId(targetId)) stacks.add(targetId, dragId)
    else if (canJoin(cardById.value.get(dragId), size, windowClass.value, tall.value).ok && canJoin(cardById.value.get(targetId), size, windowClass.value, tall.value).ok) stacks.create(dragId, targetId, size)
    else return false
    D.say(`${D.titleOf(dragId)}: ${T.value.stackMerged || '已合并为轮换组'}`); return true
  }
  const priority = (c) => (smart.value ? plan.value.score(c.id) : 0)
  // suggestions fill what real tiles cannot: at most two on the screen, and never one that is on the overview already (by id, or by the name it carries: 应用 is not suggested beside the 应用 tile)
  const MAX_GHOSTS = 2
  const ghostCards = computed(() => {
    if (!smart.value) return []
    const named = new Set(visibleCards.value.map((c) => String(c.title || '').trim().toLowerCase()))
    const out = []
    for (const id of suggestions(plan.value, 60)) {
      const c = cardById.value.get(id)
      if (!c || layout.state.hiddenSuggest.includes(id) || id === 'table' || !['card', 'hero', 'strip'].includes(c.cls)) continue
      const name = String(c.title || '').trim().toLowerCase()
      if (name && named.has(name)) continue
      named.add(name)
      out.push({ ...c, ghost: true })
      if (out.length >= MAX_GHOSTS) break
    }
    return out
  })
  const ghostIconOf = (c) => smallOf(c, T.value).icon || 'apps'
  Object.assign(D, { MERGE_HOLD_MS, SWAP_DWELL_MS, clearMerge, clearSwap, ghostCards, ghostIconOf, joinFor, joinIcon, joinInto, joinMe, joinOpen, joinTargets, joinTargetsOf, joinTitle, laid, mergeInto, mergeable, openStackSheet, priority, sheetAdd, sheetOut, sheetRemove, sheetReorder, stackSheetId, stackSheetOpen, stackSheetStack })
}

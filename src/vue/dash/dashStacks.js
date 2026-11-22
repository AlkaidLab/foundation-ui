import { computed } from 'vue'
import { attachHostLayout } from '../hostLayout.js'
import { effectiveSize } from '../homeSizes.js'
import { useStacks, stacksEnabled } from '../useStacks.js'
import { DEFAULT_ORDER } from '../homeCards.js'

/** dashStacks: one part of the home overview's setup (MHomeDash.vue); D is the shared scope of the parts, in the order they are made. */
export function useDashStacks(D) {
  const { allCards, byName, cardById, layout, plan, props, sinkEmpty, smart } = D
  // ---- smart stacks (behind a flag: stackModel.js, useStacks.js): tiles of one size in one place, the member shown turning by hand and by what the host is doing
  const stacksOn = stacksEnabled()
  const stacks = useStacks(props.storageKey, { known: (id) => DEFAULT_ORDER.includes(id) })
  // the product may keep the layout on the host (hostLayout.js), so the panel and the Web UI of one host share it
  if (props.layoutStore) attachHostLayout({ layout, stacks, store: props.layoutStore, storageKey: props.storageKey })
  // the overview shows a stack where its first member stands; the others are inside it. A stack with fewer than two members on the page is its tile again (the other is hidden or gone).
  const withStacks = (list) => {
    if (!stacksOn || D.dockLayout.value) return list
    const byId = new Map(list.map((c) => [c.id, c])); const out = []; const done = new Set()
    for (const c of list) {
      const sid = stacks.of(c.id)
      if (!sid) { out.push(c); continue }
      if (done.has(sid)) continue
      // the members are the stack's wherever the plan puts them: a member the plan does not show now (the bitrate while nothing streams) is inside the stack, one turn away when it matters
      const st = stacks.state.stacks[sid]; const present = st.members.map((m) => byId.get(m) || cardById.value.get(m)).filter((x) => x && x.available !== false)
      if (present.length < 2) { out.push(c); continue }
      done.add(sid)
      out.push({ id: sid, kind: 'stack', group: present[0].group, cls: present[0].cls, title: present.map((m) => m.title).join(' · '), available: true, stackMembers: present, stack: st })
    }
    // in the person's own layout a stack is theirs: it does not vanish because none of its members is shown by itself (the layout was kept while a stream ran and hid them); it stands where its first member stands in the order
    if (!smart.value) {
      const ord = (c) => layout.state.order.indexOf(c.kind === 'stack' ? c.stackMembers[0].id : c.id)
      for (const sid of Object.keys(stacks.state.stacks)) {
        if (done.has(sid)) continue
        const st = stacks.state.stacks[sid]; const present = st.members.map((m) => cardById.value.get(m)).filter((x) => x && x.available !== false)
        if (present.length < 2) continue
        const card = { id: sid, kind: 'stack', group: present[0].group, cls: present[0].cls, title: present.map((m) => m.title).join(' · '), available: true, stackMembers: present, stack: st }
        const at = out.findIndex((c) => ord(c) > ord(card)); if (at < 0) out.push(card); else out.splice(at, 0, card)
      }
    }
    return out
  }
  const visibleCardsRaw = computed(() => (smart.value ? byName(plan.value.visible.map((id) => { const c = cardById.value.get(id); return c && plan.value.reasons[id]?.key === 'rCurated' ? { ...c, quiet: true } : c }).filter(Boolean)) : layout.isDefault.value ? sinkEmpty(layout.visible(allCards.value, props.ctx)) : layout.visible(allCards.value, props.ctx)))
  const visibleCards = computed(() => withStacks(visibleCardsRaw.value))
  // the size asked for: the plan's (smart) or the person's (manual); the size drawn is effectiveSize of it
  // The smart plan arranges the tiles and sizes the ones the person did not size; a size the person chose is theirs in smart mode too (and on a phone, as far as the window has room: homeSizes.js)
  const sizeOf = (id) => (smart.value && !layout.isUserSized(id) ? plan.value.sizes[id] : layout.state.sizes[id])
  Object.assign(D, { sizeOf, stacks, stacksOn, visibleCards, visibleCardsRaw })
}

import { reactive, watch } from 'vue'
import { STACK_MAX, addMember, createStack, dissolve, normalizeStacks, removeMember, reorderMember, setActive, setFlags, setRotate, stackOf } from './stackModel.js'

/** Stacks are on (11-09). A way out stays for the support case: ?stacks=0 in the address, or `foundation.smartstack` = 0 in the local storage. */
export function stacksEnabled() {
  try { return new URLSearchParams(globalThis.location?.search || '').get('stacks') !== '0' && globalThis.localStorage?.getItem('foundation.smartstack') !== '0' } catch { return true }
}

/** The smart stacks of one overview, kept locally per interface (`foundation-ui.stacks.<key>`), apart from the layout. `known(id)` says which tile ids exist. */
export function useStacks(storageKey, { known = () => true, storage = globalThis.localStorage } = {}) {
  const key = `foundation-ui.stacks.${storageKey}`
  const read = () => { try { return normalizeStacks(JSON.parse(storage?.getItem(key) || 'null'), known) } catch { return { stacks: {}, next: 1, rotate: true } } }
  const state = reactive(read())
  const apply = (next) => { state.stacks = next.stacks; state.next = next.next; state.rotate = next.rotate !== false }
  watch(state, () => { try { storage?.setItem(key, JSON.stringify({ stacks: state.stacks, next: state.next, rotate: state.rotate })) } catch { /* storage unavailable */ } }, { deep: true, flush: 'sync' })
  const snap = () => ({ stacks: state.stacks, next: state.next, rotate: state.rotate })
  return {
    state, STACK_MAX,
    reload() { apply(read()) },
    of: (tileId) => stackOf(snap(), tileId),
    create(aId, bId, size) { const r = createStack(snap(), aId, bId, size); apply(r.state); return r.id },
    add(id, tileId) { apply(addMember(snap(), id, tileId)) },
    remove(id, tileId) { apply(removeMember(snap(), id, tileId)) },
    reorder(id, from, to) { apply(reorderMember(snap(), id, from, to)) },
    dissolve(id) { apply(dissolve(snap(), id)) },
    setActive(id, i) { apply(setActive(snap(), id, i)) },
    setRotate(on) { apply(setRotate(snap(), on)) },
    setFlags(id, patch) { apply(setFlags(snap(), id, patch)) },
  }
}

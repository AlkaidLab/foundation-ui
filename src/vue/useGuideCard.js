import { computed, reactive, ref, watch } from 'vue'

// every instance (the home and the help page both create one) re-reads the stored state when another one changes it
const revision = ref(0)

/**
 * State of the "get started" card. Each step is ticked by real data (`auto`) or by the person; the card goes away once every step is
 * done or when it is dismissed, and a product can bring it back (help page). Stored per product under `foundation-ui.guide.<key>`.
 */
export function useGuideCard(key, getSteps, storage = globalThis.localStorage) {
  const storageKey = `foundation-ui.guide.${key}`
  const read = () => {
    try {
      const v = JSON.parse(storage?.getItem(storageKey) || 'null')
      if (v && typeof v === 'object') {
        return { manual: Object.fromEntries(Object.entries(v.manual || {}).filter(([k, x]) => typeof k === 'string' && x === true)), hidden: v.hidden === true, forced: v.forced === true }
      }
    } catch { /* corrupted: start over */ }
    return { manual: {}, hidden: false, forced: false }
  }
  const state = reactive(read())
  watch(revision, () => Object.assign(state, read()))
  const save = () => { try { storage?.setItem(storageKey, JSON.stringify({ manual: state.manual, hidden: state.hidden, forced: state.forced })) } catch { /* storage unavailable */ }; revision.value += 1 }

  const steps = computed(() => (getSteps() || []).map((s) => ({ ...s, done: s.auto === true || state.manual[s.id] === true })))
  const doneCount = computed(() => steps.value.filter((s) => s.done).length)
  const allDone = computed(() => steps.value.length > 0 && doneCount.value === steps.value.length)
  const next = computed(() => steps.value.find((s) => !s.done) || null)
  const visible = computed(() => steps.value.length > 0 && (state.forced || (!state.hidden && !allDone.value)))
  return {
    steps, doneCount, allDone, next, visible,
    toggle(id) { const s = steps.value.find((x) => x.id === id); if (!s || s.auto === true) return; if (state.manual[id]) delete state.manual[id]; else state.manual[id] = true; save() },
    dismiss() { state.hidden = true; state.forced = false; save() },
    reopen() { state.hidden = false; state.forced = true; save() },
  }
}

import { computed, reactive, unref } from 'vue'
import { COMPONENT_IDS, FEED_IDS, componentRow, healthResult } from './model.js'
import { statusTexts } from './texts.js'

/**
 * The state holder of the component status page and cards. The product gives it the places it reads from and the actions it has:
 *   sources  { [id]: async () => raw answer in the shape of the matching adapter (null/throw = no answer), or { read, fresh } }
 *   actions  { [id]: { update?, repair?, install?, open?: { run(): void | Promise }, note?: 'viaPanel' } }
 *   locale   a string or a ref
 *   openPage the product's way to the full page (a card's chevron calls it)
 * `check(id)` asks the source again and keeps the result of that check (time, passed and failed checks); `refresh()` only reads.
 */
export function createComponentStatus({ sources = {}, actions = {}, locale = 'en', openPage = null, now = Date.now } = {}) {
  const raw = reactive({})
  // What a running action reports about itself (an install: its stage and percent). It is the product's own state, set while the action runs and cleared when it ends. It is never read from the
  // answer of a source: an answer that was asked for while the action ran can arrive after it ended, and a line that came from there stayed on the card (「正在解压」 after the install).
  const progress = reactive({})
  const loaded = reactive({})
  const checking = reactive({})
  const results = reactive({})
  // a source is a function, or { read (cheap, may be cached), fresh (asks again; used by the check) }
  const reader = (id, fresh) => { const s = sources[id]; return typeof s === 'function' ? s : fresh ? s?.fresh || s?.read : s?.read }
  const read = async (id, fresh = false) => { try { const f = reader(id, fresh); return f ? await f() : null } catch { return null } }
  // Answers can come back out of order (a slow read that began before an action, a quick one after it): the read that began last is the one that counts, an older one is dropped.
  const issued = {}
  const applied = {}
  async function load(id, fresh) {
    const n = (issued[id] = (issued[id] || 0) + 1)
    const value = await read(id, fresh)
    if (n < (applied[id] || 0)) return { value: raw[id], current: false }
    applied[id] = n
    raw[id] = value
    loaded[id] = true
    return { value, current: true }
  }
  const text = () => statusTexts(unref(locale))

  async function refresh(ids = COMPONENT_IDS) {
    await Promise.all(ids.map((id) => load(id, false)))
  }
  async function check(id) {
    if (checking[id]) return results[id]
    checking[id] = true
    try {
      await load(id, true)
      results[id] = healthResult(componentRow(id, raw[id]), now())
      return results[id]
    } finally { checking[id] = false }
  }
  const checkAll = () => Promise.all(COMPONENT_IDS.map(check))
  const rows = computed(() => COMPONENT_IDS.map((id) => ({
    ...componentRow(id, raw[id]), loaded: !!loaded[id], checking: !!checking[id], result: results[id] || null, actions: actions[id] || {}, hasSource: !!sources[id], progress: progress[id] || null,
  })))
  let timer = 0
  /** An action reports its progress: { stage, percent }, shown on the card until it is cleared (`null`). */
  const setProgress = (id, value) => { if (value) progress[id] = { stage: String(value.stage || ''), percent: Number(value.percent) || 0 }; else delete progress[id] }
  return {
    rows, refresh, check, checkAll, openPage, text, setProgress, locale: () => String(unref(locale)),
    row: (id) => rows.value.find((r) => r.id === id),
    // a check that is not a card (the native DualSense path, the encoder, Sunshine itself) and feeds the page it belongs to: refresh() reads the cards only, `feeds()` reads these
    feed: (id) => ({ ...componentRow(id, raw[id]), loaded: !!loaded[id], hasSource: !!sources[id] }),
    feeds: () => refresh(FEED_IDS),
    cardTitle: (id) => text().cardTitle.replace('{name}', text().names[id] || id),
    start(ms = 30000) { if (timer) return; void refresh(); timer = setInterval(() => { if (typeof document === 'undefined' || !document.hidden) void refresh() }, ms) },
    stop() { clearInterval(timer); timer = 0 },
  }
}

let registered = null
/** The one controller of this window: the page and the home cards read it. */
export const registerComponentStatus = (controller) => { registered = controller; return controller }
export const registeredComponentStatus = () => registered

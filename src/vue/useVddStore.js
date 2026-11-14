import { computed, reactive, ref } from 'vue'
import { VDD_PROTECTED, vddModeOf, vddOn, vddPatchForMode, vddPhysicalDisplays, vddSplit, vddSummary } from '../settings/virtualDisplay.js'

/**
 * The state and the saving of the virtual display, once per product: the settings page and a home card use the same
 * store, so a change made in one shows in the other and is saved the same way. The product describes itself in an adapter:
 *
 *   read()                  the configuration object (reactive); it holds the keys of `VDD_KEYS`
 *   write(patch)            puts normal keys into that object (the page's own save bar, or `commit`, writes them out)
 *   commit?(keys)           saves the normal keys at once (a card does; the settings page leaves it to its save bar)
 *   setProtected?(key, on)  writes a key the host only lets the tray change; absent: those keys are read-only here
 *   status?()               { ready, active, text } of the driver and the display; null when unknown
 *
 * `autosave` makes every change call `commit` (a placement can ask for it per change: `set(patch, { save })`). Errors of a save are kept in `error` and the change is rolled back.
 */
export function createVddStore(adapter, { autosave = false } = {}) {
  const status = ref(null)
  const busy = reactive({})
  const error = ref('')
  let lastPhysical = ''
  const config = computed(() => adapter.read() || {})
  const mode = computed(() => vddModeOf(config.value))
  const summary = computed(() => vddSummary(config.value, status.value))
  const displays = computed(() => vddPhysicalDisplays(config.value))
  const canSaveProtected = typeof adapter.setProtected === 'function'
  const anyBusy = computed(() => Object.values(busy).some(Boolean))

  async function refresh() {
    if (typeof adapter.status !== 'function') return
    try { status.value = (await adapter.status()) || null } catch { status.value = null }
  }

  async function writeProtected(key, value) {
    const previous = config.value[key]
    busy[key] = true
    try {
      const on = vddOn(value)
      await adapter.setProtected(key, on)
      adapter.write({ [key]: on ? 'enabled' : 'disabled' })
      error.value = ''
    } catch (e) {
      adapter.write({ [key]: previous })
      error.value = e instanceof Error ? e.message : String(e)
    } finally { busy[key] = false }
  }

  /** Writes normal keys (and tray-owned ones where the product can), saving at once when `autosave`. */
  async function set(patch, { save = autosave } = {}) {
    const { normal, protected: tray } = vddSplit(patch)
    if (Object.keys(normal).length) {
      const before = Object.fromEntries(Object.keys(normal).map((k) => [k, config.value[k]]))
      adapter.write(normal)
      if (save && adapter.commit) {
        Object.keys(normal).forEach((k) => { busy[k] = true })
        try { await adapter.commit(Object.keys(normal)); error.value = '' } catch (e) {
          adapter.write(before)
          error.value = e instanceof Error ? e.message : String(e)
        } finally { Object.keys(normal).forEach((k) => { busy[k] = false }) }
      }
    }
    if (canSaveProtected) for (const [key, value] of Object.entries(tray)) await writeProtected(key, value)
  }

  /** Chooses a mode. The mode a product cannot save (a tray-owned key without a way to write it) is not offered. */
  async function setMode(next, options) {
    if (next === mode.value) return
    const current = config.value.output_name
    if (mode.value === 'physical') lastPhysical = current && current !== 'ZakoHDR' ? current : lastPhysical
    const { normal, protected: tray } = vddPatchForMode(next, config.value, lastPhysical)
    await set({ ...normal, ...(canSaveProtected ? tray : {}) }, options)
  }
  /** The three modes; without a writer for tray-owned keys, persistent is shown but cannot be chosen. */
  const modes = computed(() => ['physical', 'ondemand', 'persistent'].map((id) => ({ id, disabled: id === 'persistent' && !canSaveProtected })))

  return { config, mode, modes, summary, displays, status, busy, anyBusy, error, canSaveProtected, protectedKeys: VDD_PROTECTED, refresh, set, setMode }
}

/**
 * An adapter over the host's HTTP API for a product that has no configuration object of its own (a home card in the
 * control panel): it reads `/api/config` fresh, keeps it, and saves the normal keys by posting the whole configuration
 * with the changed ones, as the Web page does. `fetchJson(path, init?)` returns the parsed answer; `setProtected` and
 * `status` are the product's own.
 */
export function createHttpVddAdapter({ fetchJson, setProtected, status }) {
  const config = reactive({})
  const adapter = {
    read: () => config,
    write: (patch) => Object.assign(config, patch),
    async load() { Object.assign(config, (await fetchJson('/api/config')) || {}) },
    async commit() {
      const fresh = (await fetchJson('/api/config')) || {}
      await fetchJson('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...fresh, ...config }) })
    },
  }
  if (setProtected) adapter.setProtected = setProtected
  if (status) adapter.status = status
  return adapter
}

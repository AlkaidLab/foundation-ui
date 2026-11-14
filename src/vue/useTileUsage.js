import { reactive } from 'vue'

/**
 * How often each tile of the overview is opened and used (its controls), kept in this browser only (`foundation-ui.usage.<key>`): the smart overview lets the tiles that are used
 * rise and the ones that never are fall out. Counts only; no telemetry, nothing leaves the machine.
 */
export function useTileUsage(storageKey, storage = globalThis.localStorage) {
  const key = `foundation-ui.usage.${storageKey}`
  const read = () => { try { const v = JSON.parse(storage?.getItem(key) || 'null'); if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([id, u]) => typeof id === 'string' && u && Number.isFinite(u.opens || 0) && Number.isFinite(u.controls || 0)).slice(0, 200)) } catch { /* corrupted: nothing counted */ } return {} }
  const counts = reactive(read())
  let timer = 0
  const save = () => { clearTimeout(timer); timer = setTimeout(() => { try { storage?.setItem(key, JSON.stringify(counts)) } catch { /* storage unavailable */ } }, 400) }
  return {
    bump(id, kind = 'opens') { if (!id || id.startsWith('pin:')) return; const u = counts[id] || (counts[id] = { opens: 0, controls: 0 }); u[kind === 'controls' ? 'controls' : 'opens'] += 1; save() },
    snapshot: () => JSON.parse(JSON.stringify(counts)),
  }
}

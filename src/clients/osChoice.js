// The system the person last chose for connecting a device (the dialog, the journey, the download tile, the download page): remembered, Android the first time.
export const DEFAULT_OS = 'android'
const KEY = 'foundation-ui.connect.os'
const OSES = ['windows', 'macos', 'linux', 'android', 'ios', 'harmony', 'tv']
export function readOs(storage = globalThis.localStorage) {
  try { const v = storage?.getItem(KEY); if (OSES.includes(v)) return v } catch { /* storage unavailable */ }
  return DEFAULT_OS
}
/** The system the person chose, or '' while none was chosen (readOs answers Android then: a default is not a choice, so a tile that states the choice uses this). */
export function chosenOs(storage = globalThis.localStorage) {
  try { const v = storage?.getItem(KEY); return OSES.includes(v) ? v : '' } catch { return '' }
}
export function writeOs(os, storage = globalThis.localStorage) { try { if (OSES.includes(os)) storage?.setItem(KEY, os) } catch { /* storage unavailable */ } }

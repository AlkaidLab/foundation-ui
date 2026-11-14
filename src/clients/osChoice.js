// The system the person last chose for connecting a device (the dialog, the journey, the download tile, the download page): remembered, Android the first time.
export const DEFAULT_OS = 'android'
const KEY = 'foundation-ui.connect.os'
const OSES = ['windows', 'macos', 'linux', 'android', 'ios', 'harmony', 'tv']
export function readOs(storage = globalThis.localStorage) {
  try { const v = storage?.getItem(KEY); if (OSES.includes(v)) return v } catch { /* storage unavailable */ }
  return DEFAULT_OS
}
export function writeOs(os, storage = globalThis.localStorage) { try { if (OSES.includes(os)) storage?.setItem(KEY, os) } catch { /* storage unavailable */ } }

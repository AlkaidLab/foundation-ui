export { ANIM_SCALES, DEFAULT_FLAGS, DEV_FLAGS_KEY, LOG_LEVELS, anyOverlay, loadFlags, normalizeFlags, saveFlags } from './flags.js'
export { createFrameMeter, createRateWindow, hudLines } from './frameMeter.js'
export { installHud } from './hud.js'
export { applyAnimationScale, createFlasher, installOverlays, mutatedElements, overlayCss, playbackRateFor } from './overlays.js'
export { ENDPOINTS, inspect, readablePath, redact } from './apiInspector.js'
export { environmentRows, environmentText, scrubPaths } from './envInfo.js'
export { KINDS, parseLog, parseLogLine } from './slowLog.js'
export { developerTexts } from './texts.js'

import { installHud } from './hud.js'
import { installOverlays } from './overlays.js'
import { loadFlags, saveFlags, anyOverlay } from './flags.js'

/** Applies the stored flags now and on every `set`; the product calls it once at start while developer mode is on. Returns { flags, set, stop }. */
export function startDeveloperOverlays(doc = document, win = window) {
  const hud = installHud(doc, win)
  const overlays = installOverlays(doc, win)
  let flags = loadFlags()
  const apply = () => { hud.update(flags); overlays.update(flags) }
  if (anyOverlay(flags)) apply()
  return {
    get flags() { return flags },
    set(patch) { flags = saveFlags({ ...flags, ...patch }); apply(); return flags },
    stop() { hud.stop(); overlays.stop() },
  }
}

let shared = null
/** The one controller of the overlays of this window (the page and the product's start-up code use the same one). */
export const developerOverlays = () => (shared ||= startDeveloperOverlays())

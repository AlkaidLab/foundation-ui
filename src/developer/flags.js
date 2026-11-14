// The switches of 开发者选项 that live in the page itself (the overlays and the animation scale): kept in this window's storage, applied at start while developer mode is on.
export const DEV_FLAGS_KEY = 'foundation-ui.dev.flags'
export const ANIM_SCALES = Object.freeze([0.5, 1, 2, 5])
export const LOG_LEVELS = Object.freeze(['error', 'warn', 'info', 'debug', 'trace'])
export const DEFAULT_FLAGS = Object.freeze({ hud: false, longTasks: false, mutations: false, outlines: false, flashes: false, animScale: 1 })

const bool = (v) => v === true
/** Anything stored becomes a valid set of flags: unknown keys go, a scale that is not one of the offered ones is 1. */
export function normalizeFlags(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  return { hud: bool(r.hud), longTasks: bool(r.longTasks), mutations: bool(r.mutations), outlines: bool(r.outlines), flashes: bool(r.flashes), animScale: ANIM_SCALES.includes(r.animScale) ? r.animScale : 1 }
}
const store = () => { try { return globalThis.localStorage } catch { return null } }
export function loadFlags(storage = store()) {
  try { return normalizeFlags(JSON.parse(storage?.getItem(DEV_FLAGS_KEY) || 'null')) } catch { return normalizeFlags(null) }
}
export function saveFlags(flags, storage = store()) {
  const next = normalizeFlags(flags)
  try {
    const plain = JSON.stringify(next) === JSON.stringify(DEFAULT_FLAGS)
    if (plain) storage?.removeItem(DEV_FLAGS_KEY); else storage?.setItem(DEV_FLAGS_KEY, JSON.stringify(next))
  } catch { /* not remembered */ }
  return next
}
export const anyOverlay = (f) => f.hud || f.longTasks || f.mutations || f.outlines || f.flashes || f.animScale !== 1

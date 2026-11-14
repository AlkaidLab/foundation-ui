// Pinning to the overview from outside the home (a settings row, the unified search): into the saved layout of the product's home, which a mounted home re-reads.
import { useDashLayout, pinIdOf } from '../vue/useDashLayout.js'
import { addTileToHome, HOME_LAYOUT_EVENT } from '../search/home.js'

const announce = (storageKey) => globalThis.window?.dispatchEvent?.(new CustomEvent(HOME_LAYOUT_EVENT, { detail: { key: storageKey } }))

/** The id the spec has on the overview: the pinned tile of a setting, the catalogue tile of an action. */
export const tileIdOfSpec = (spec) => (spec.type === 'action' || spec.type === 'tile' ? spec.tile : pinIdOf(spec))

/** Pin: { ok, id }. A setting of tier 3 is a link tile (its spec says so); an action or a tile is the catalogue tile. */
export function pinToHome(storageKey, spec, storage = globalThis.localStorage) {
  if (!spec) return { ok: false, id: '' }
  if (spec.type === 'action' || spec.type === 'tile') return { ok: addTileToHome(storageKey, spec.tile, storage), id: spec.tile }
  const layout = useDashLayout(storageKey, storage)
  const ok = layout.addPin(spec)
  announce(storageKey)
  return { ok, id: pinIdOf(spec) }
}

/** Is it on the overview as a tile the person pinned (for an action or a tile: shown). */
export function isPinnedOnHome(storageKey, spec, storage = globalThis.localStorage) {
  if (!spec) return false
  const layout = useDashLayout(storageKey, storage)
  if (spec.type === 'action' || spec.type === 'tile') return layout.state.overrides[spec.tile] === true
  return layout.isPinned(pinIdOf(spec))
}

export function unpinFromHome(storageKey, spec, storage = globalThis.localStorage) {
  if (!spec) return false
  const layout = useDashLayout(storageKey, storage)
  const ok = spec.type === 'action' || spec.type === 'tile' ? (layout.setVisible(spec.tile, false), true) : layout.removePin(pinIdOf(spec))
  announce(storageKey)
  return ok
}

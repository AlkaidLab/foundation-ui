// Adding a tile to the overview from the search: shown, last in the order, in the saved layout of the product's home; a mounted home re-reads it.
import { useDashLayout } from '../vue/useDashLayout.js'
import { CARD_META } from '../vue/homeCards.js'

export const HOME_LAYOUT_EVENT = 'foundation-home-layout'

export function addTileToHome(storageKey, id, storage = globalThis.localStorage) {
  const layout = useDashLayout(storageKey, storage)
  layout.setVisible(id, true)
  // after the last card that is shown (shown by the person, or by default); only the first 64 places of an order are kept, which is where those cards are
  const shown = (x) => layout.state.overrides[x] === true || (layout.state.overrides[x] === undefined && CARD_META[x]?.def === 'always')
  const rest = layout.state.order.filter((x) => x !== id)
  const at = rest.map(shown).lastIndexOf(true) + 1
  layout.state.order = [...rest.slice(0, at), id, ...rest.slice(at)]
  globalThis.window?.dispatchEvent?.(new CustomEvent(HOME_LAYOUT_EVENT, { detail: { key: storageKey } }))
  return layout.state.overrides[id] === true
}

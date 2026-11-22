// The tiles designed one by one: each tile family is one component in this folder that says which tile ids it draws
// (`export const tileIds = [...]` in its plain <script>); index.js collects them. MDashCardView draws a tile with its design; a tile without one takes the old path.
// On for everyone. `?tiles=off` in the address or localStorage `foundation-ui.dev.tiles` = 'off' draws the old path for every tile. Variants of a tile (the team chooses between two): `?tv=cpu:2,net:2`
// or localStorage `foundation-ui.dev.tile-variants` = 'cpu:2,net:2'; a tile without a choice draws variant 1.
import { ref } from 'vue'

const FLAG = 'foundation-ui.dev.tiles'
const VARIANTS = 'foundation-ui.dev.tile-variants'
const query = () => { try { return new URLSearchParams(globalThis.location?.search || '') } catch { return new URLSearchParams() } }
const stored = (k) => { try { return globalThis.localStorage?.getItem(k) || '' } catch { return '' } }
const parseVariants = (s) => Object.fromEntries(String(s || '').split(',').map((p) => p.split(':')).filter(([id, n]) => id && /^[12]$/.test(n)).map(([id, n]) => [id.trim(), +n]))

/** Whether the tiles are drawn with their new designs. */
export const boldOn = ref((query().get('tiles') || stored(FLAG)) !== 'off')
/** { tile id: 1 | 2 } */
export const tileVariants = ref(parseVariants(query().get('tv') || stored(VARIANTS)))
export function setBold(on) { boldOn.value = !!on; try { on ? globalThis.localStorage?.removeItem(FLAG) : globalThis.localStorage?.setItem(FLAG, 'off') } catch { /* storage unavailable */ } }
export function setTileVariant(id, n) {
  tileVariants.value = { ...tileVariants.value, [id]: n === 2 ? 2 : 1 }
  try { globalThis.localStorage?.setItem(VARIANTS, Object.entries(tileVariants.value).map(([k, v]) => `${k}:${v}`).join(',')) } catch { /* storage unavailable */ }
}
export const variantOf = (id) => tileVariants.value[id] || 1

const designs = new Map()
/** Register the component that draws these tile ids (index.js does it for every component of the folder). */
export function registerTile(ids, component) { for (const id of ids || []) designs.set(id, component) }
/** The component that draws this card with its design, or null (designs off, no design, a card that is not available). */
export function designOf(card) {
  if (!boldOn.value || !card || card.available === false) return null
  return designs.get(card.id) || designs.get(String(card.id).split(':')[0] + ':*') || null
}

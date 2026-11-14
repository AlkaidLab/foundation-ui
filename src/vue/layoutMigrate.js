import { CARD_META, DEFAULT_ORDER } from './homeCards.js'
import { SIZE_KEYS, sizesOf } from './homeSizes.js'

// A layout saved by a build before version 8 (the smart overview, the one size standard) is read once and brought up to date:
//  - a layout the person never changed returns to the smart default (the old builds saved the defaults they showed, and a layout that only holds those is not the person's);
//  - a layout the person changed keeps their tiles and their order, loses the 错误 chart tile unless they added it themselves (they resized it: that is a deliberate act;
//    the old builds showed it by default and saved it as a choice), and every size is mapped onto the standard (S 2x1, M 4x1, L 4x2; an old XL, the 8x2 card, becomes L).
// Nothing here runs for a layout saved at version 8 or later: there an override is the person's.
export const LEGACY_BELOW = 8
const staticDefault = (id) => (CARD_META[id]?.def === 'always' ? true : CARD_META[id]?.def === 'off' ? false : null)

/** @param state the layout read from storage ({ order, overrides, sizes, pins, mode, ... }); @param version the version it was saved at */
export function migrateLayout(state, version) {
  if ((version || 0) >= LEGACY_BELOW) return { state, migrated: false }
  const sizes = {}
  for (const [id, key] of Object.entries(state.sizes || {})) sizes[id] = key === 'xl' ? 'l' : SIZE_KEYS.includes(key) ? key : undefined
  for (const id of Object.keys(sizes)) if (!sizes[id]) delete sizes[id]
  const explicitErrors = !!sizes.errors // a size of its own is a deliberate act
  const overrides = { ...state.overrides }
  if (!explicitErrors) delete overrides.errors
  const customOverrides = Object.entries(overrides).filter(([id, on]) => staticDefault(id) !== null && staticDefault(id) !== on).length
  const customSizes = Object.entries(sizes).filter(([id, key]) => sizesOf(id, CARD_META[id] || {}).size !== key).length
  const saved = (state.order || []).filter((id) => DEFAULT_ORDER.includes(id))
  const standard = DEFAULT_ORDER.filter((id) => saved.includes(id))
  const reordered = saved.some((id, i) => id !== standard[i])
  const customised = customOverrides + customSizes > 0 || Object.keys(state.pins || {}).length > 0 || reordered
  if (!customised) {
    return { state: { ...state, order: [...DEFAULT_ORDER], overrides: {}, sizes: {}, mode: 'smart', accepted: [], hiddenSuggest: [], sectionOf: {}, sectionCount: 0 }, migrated: true }
  }
  return { state: { ...state, overrides, sizes, mode: 'manual' }, migrated: true }
}

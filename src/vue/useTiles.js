import { computed, ref, watch } from 'vue'

export const TILE_SIZES = Object.freeze({ '1x1': [1, 1], '2x1': [2, 1], '2x2': [2, 2] })

/**
 * Tile layout of a home page, persisted locally per interface.
 * catalogue: [{ id, title, icon, sizes: ['1x1', ...], size: default size }]; defaults: [id | { id, size }]
 */
export function useTiles(storageKey, catalogue, defaults) {
  const key = `foundation-ui.tiles.${storageKey}`
  const byId = new Map(catalogue.map((t) => [t.id, t]))
  const fresh = () => defaults.map((d) => (typeof d === 'string' ? { id: d, size: byId.get(d).size } : { id: d.id, size: d.size || byId.get(d.id).size }))
  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null')
      if (Array.isArray(saved)) return saved.filter((t) => byId.has(t.id)).map((t) => ({ id: t.id, size: byId.get(t.id).sizes.includes(t.size) ? t.size : byId.get(t.id).size }))
    } catch { /* corrupted: fall back */ }
    return null
  }
  const tiles = ref(read() || fresh())
  watch(tiles, (v) => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* storage unavailable */ } }, { deep: true })

  const placed = computed(() => new Set(tiles.value.map((t) => t.id)))
  return {
    tiles,
    catalogue,
    byId,
    /** catalogue entries that are not on the page */
    available: computed(() => catalogue.filter((t) => !placed.value.has(t.id))),
    add: (id) => { if (byId.has(id) && !placed.value.has(id)) tiles.value = [...tiles.value, { id, size: byId.get(id).size }] },
    remove: (id) => { tiles.value = tiles.value.filter((t) => t.id !== id) },
    move: (id, delta) => {
      const list = [...tiles.value]
      const from = list.findIndex((t) => t.id === id)
      const to = Math.min(list.length - 1, Math.max(0, from + delta))
      if (from < 0 || from === to) return
      list.splice(to, 0, list.splice(from, 1)[0])
      tiles.value = list
    },
    moveBefore: (id, targetId) => {
      if (id === targetId) return
      const list = [...tiles.value]
      const from = list.findIndex((t) => t.id === id)
      if (from < 0) return
      const [item] = list.splice(from, 1)
      const to = list.findIndex((t) => t.id === targetId)
      list.splice(to < 0 ? list.length : to, 0, item)
      tiles.value = list
    },
    /** next allowed size of the tile */
    resize: (id) => {
      const sizes = byId.get(id).sizes
      tiles.value = tiles.value.map((t) => (t.id === id ? { ...t, size: sizes[(sizes.indexOf(t.size) + 1) % sizes.length] } : t))
    },
    reset: () => { tiles.value = fresh() },
  }
}

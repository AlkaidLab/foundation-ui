// What editing the overview starts from. With 智能磁贴 on, entering the edit copies the page that is on the screen into the saved layout (useDashLayout freeze) so nothing moves: the tiles of the plan, the tiles
// the fill added, and the sizes they are drawn at (the plan lifts a tile a size where a row is short).
//
// The clock mode draws every tile at 方形 (the saved sizes are not touched, dashGrid.js dockBox), so the sizes of that page are not the overview's: copying them would turn the saved layout into a page of
// squares, which then showed when the person switched to the full-screen tiles inside the editor, and was thrown away when they finished (the unchanged layout is restored) so the page jumped to the plan.
// In the clock mode the tiles are the page's (the plan and the fill) and the sizes are the plan's.

/** `base` is the plan ({ visible, sizes }), `lastShown` the tiles of the page as drawn ([{ id, size }]), `has(id)` whether a tile exists; `dock` is the clock mode. */
export function freezeBase(base, lastShown, has, dock = false) {
  const shown = (lastShown || []).filter((x) => has(x.id))
  const extra = shown.filter((x) => !base.visible.includes(x.id))
  return {
    ...base,
    visible: [...base.visible, ...extra.map((x) => x.id)],
    sizes: dock ? { ...base.sizes } : { ...base.sizes, ...Object.fromEntries(shown.map((x) => [x.id, x.size])) },
  }
}

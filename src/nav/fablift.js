// The action buttons of a page sit at the bottom end of the content pane. Anything that comes up from the bottom of the same area (the bar of unsaved changes, a snackbar) pushes them up, they never
// overlap it. `dock` is where the buttons would be with no lift (viewport rectangle), `obstacles` are the rectangles of those bars.
export function fabLift(dock, obstacles, gap = 12) {
  let lift = 0
  for (let pass = 0; pass < 6; pass++) {
    let next = lift
    const top = dock.top - lift
    const bottom = dock.bottom - lift
    for (const o of obstacles) {
      if (o.right <= dock.left || o.left >= dock.right) continue
      if (o.top >= bottom || o.bottom <= top) continue
      next = Math.max(next, dock.bottom - o.top + gap)
    }
    if (next === lift) break
    lift = next
  }
  return Math.round(lift)
}

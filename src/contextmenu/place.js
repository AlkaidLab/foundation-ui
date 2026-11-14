// Where a context menu goes so that none of it is cut off by the edge of the window. A native menu opens with its top-left corner at the pointer; when it does not fit
// it opens to the left of the pointer and/or above it (its bottom-right corner at the pointer); and a menu that fits in neither direction is moved so that it ends at the edge,
// and one that is taller than the window scrolls inside it (maxHeight).
//   placeMenu({ x, y, width, height, viewportWidth, viewportHeight, margin }) -> { left, top, maxHeight }   (all in CSS px; left/top are the menu's top-left corner)

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function place(point, size, room, margin) {
  const free = room - 2 * margin
  if (size >= free) return { start: margin, size: Math.max(0, free), capped: true }
  // below / right of the pointer, when it fits there; else above / left of it, when it fits there; else flush with the edge it overflows
  if (point + size + margin <= room) return { start: Math.max(margin, point), size, capped: false }
  if (point - size >= margin) return { start: Math.min(point - size, room - margin - size), size, capped: false }
  return { start: clamp(room - margin - size, margin, room), size, capped: false }
}

export function placeMenu({ x, y, width, height, viewportWidth, viewportHeight, margin = 8 }) {
  const h = place(x, width, viewportWidth, margin)
  const v = place(y, height, viewportHeight, margin)
  return { left: Math.round(h.start), top: Math.round(v.start), maxHeight: v.capped ? Math.round(v.size) : null }
}

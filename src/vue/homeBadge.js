// The delete badge of a tile in edit mode (the look of the iOS / iPadOS edit mode): a disc that cuts into the tile's top-left corner, a quarter of its area inside the tile.
// Its centre is on the 45 degree diagonal of the corner arc, at a distance from the arc's centre that is worked out here (numerically, for the tile's corner radius and the badge's
// radius), not a fixed offset, so the quarter holds for every radius.
//
// Coordinates: the tile's top-left corner is (0, 0); the corner arc has its centre at (R, R) and radius R. The tile is every point with x >= 0, y >= 0 that is not in the corner
// between the arc and the corner of the box (x < R, y < R, farther than R from (R, R)).

/** Fraction of the area of the disc (centre (cx, cy), radius r) that is inside the tile, for a corner radius R. */
export function overlapFraction(R, r, cx, cy = cx) {
  const N = 2400
  const x0 = Math.max(0, cx - r), x1 = cx + r
  if (x1 <= 0) return 0
  const h = (x1 - x0) / N
  let area = 0
  for (let i = 0; i < N; i += 1) {
    const x = x0 + (i + 0.5) * h
    const dx = x - cx
    const half = Math.sqrt(Math.max(0, r * r - dx * dx))
    const ymin = x >= R ? 0 : R - Math.sqrt(Math.max(0, R * R - (R - x) * (R - x)))
    const lo = Math.max(cy - half, ymin), hi = cy + half
    if (hi > lo) area += (hi - lo) * h
  }
  return area / (Math.PI * r * r)
}

const K = Math.SQRT1_2

/**
 * Where the badge sits: `d` is the distance of its centre from the arc's centre (on the diagonal, towards the outside), `c` the centre's offset from the tile's top and left edges
 * (the same on both axes; negative means outside), `at` the top-left of the badge's box. The overlap is `fraction` of the badge's area (a quarter).
 */
export function badgeSpot(R, r, fraction = 0.25) {
  let lo = 0, hi = R + r // d = R + r: the disc only touches the arc; d = 0: the centre is the arc's centre
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2
    if (overlapFraction(R, r, R - mid * K) > fraction) lo = mid; else hi = mid
  }
  const d = (lo + hi) / 2
  const c = R - d * K
  return { d, c, at: c - r, fraction: overlapFraction(R, r, c) }
}

/** Whether a point (relative to the tile's top-left corner) is inside the tile's shape at the corner. */
export const insideTile = (R, x, y) => x >= 0 && y >= 0 && !(x < R && y < R && Math.hypot(x - R, y - R) > R)

/**
 * Row packing of the tile page. Tiles flow into rows of `cols` columns; the tiles of a row share one height (the tallest
 * nominal height in the row) and the free columns of the row are shared out, widest tile first, so every row fills the width.
 * items: [{ id, w, h }] (nominal columns and rows); returns Map id -> { span, rows } and the number of row units used.
 */
export function packTiles(items, cols) {
  const rows = []
  let row = []
  let used = 0
  for (const item of items) {
    const w = Math.max(1, Math.min(item.w, cols))
    if (row.length && used + w > cols) { rows.push(row); row = []; used = 0 }
    row.push({ id: item.id, w, h: item.h })
    used += w
  }
  if (row.length) rows.push(row)
  const out = new Map()
  let units = 0
  for (const r of rows) {
    let free = cols - r.reduce((n, t) => n + t.w, 0)
    const order = [...r].sort((a, b) => b.w - a.w)
    for (let i = 0; free > 0; i = (i + 1) % order.length, free--) order[i].w += 1
    const h = Math.max(...r.map((t) => t.h))
    units += h
    for (const t of r) out.set(t.id, { span: t.w, rows: h })
  }
  return { cells: out, units }
}

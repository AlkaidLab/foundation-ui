/**
 * Packs the visible cards of the home into a grid of `units` columns, in reading order. A card is { id, span, cls, rows = 1 }. A row has
 * one height class (cards of another class never share it), so a large card (two rows) leaves the space beside it for the next small
 * ones. Free columns are then given to the cards beside them, widest first, so rows fill the width; a card grows to at most twice its own
 * width, so a lone small card keeps its proportions. A hole under a small card beside a large one is closed by making that card two rows tall.
 * Returns { rows: [{ cls, cells: [{ id, span, col, rows }] }] (cells by the row they start in), placed: Map id -> { row, col, span, rows, cls } }.
 */
/**
 * A card that would be left alone in its row with free columns beside it (the next cards are of another height class, or too wide) gets neighbours: the first later single-row
 * card of its class that fits is moved up to stand beside it. A row is never stretched across the window by one lone card. Cards of two rows stay where they are.
 */
// the classes of the tiles that may fill a hole beside a tile of another class
const FILLERS = new Set(['card', 'tile', 'list'])
// the rows that are not filled this way: a slim strip row (a body tile would be stretched to its height) and the connect journey
const NO_FILL_ROW = new Set(['strip', 'journey'])
import { hasNoData } from './homeSizes.js'
export function pullNeighbours(cards, units = 8) {
  const rest = cards.slice()
  const out = []
  let tallSpan = 0
  while (rest.length) {
    const first = rest.shift()
    out.push(first)
    // a tall card before this one still stands beside it: its columns are not free for the back-fill below
    const beside = tallSpan
    tallSpan = (first.rows || 1) > 1 ? Math.min(first.span, units) : 0
    if ((first.rows || 1) > 1 || first.span >= units) continue
    let used = first.span
    while (used < units) {
      const left = units - used
      const fits = (c) => c.cls === first.cls && (c.rows || 1) === 1 && Math.min(c.span, units) <= left
      let at = rest.findIndex(fits)
      // the next card in order is taken when it fits; a later one is pulled up only when the cards in between are of another class or too wide
      let fill = false
      // back-fill: nothing of the row's class fits, so the free columns would stay empty (a blank half beside a tall tile). The next card of a body class (a card or a tile, not a slim
      // strip, not the hero) that fits comes up instead and takes the row's height, so the page is filled instead of left with a hole.
      // (a tile with nothing to show is never the one that comes up: it would be stretched to a row's height)
      if (at < 0 && !NO_FILL_ROW.has(first.cls)) { at = rest.findIndex((c) => FILLERS.has(c.cls) && (c.rows || 1) === 1 && Math.min(c.span, units) <= left - beside && !hasNoData(c.data)); fill = at >= 0 }
      if (at < 0) break
      const [c] = rest.splice(at, 1)
      out.push(fill ? { ...c, cls: first.cls, filled: true } : c)
      used += Math.min(c.span, units)
    }
  }
  return out
}

/**
 * `options.dense`: every card takes the first free place from the top left (a later, smaller card fills a hole an earlier row left), so the order of the cards is the order of
 * the places they are tried in, not the order of the rows. `options.exact`: no tile is stretched past its own box (a 方形 stays square, a 大 stays a square of 2 x 2 units): the free
 * columns beside a tile stay free unless the tile is a slim strip, which takes what is left of its row.
 */
export function packDash(input, units = 8, { dense = false, exact = false } = {}) {
  const cards = dense ? input : pullNeighbours(input, units)
  const grid = [] // grid[r] = { cls, used: Array(units) of card index | -1 }
  const row = (r) => { while (grid.length <= r) grid.push({ cls: null, used: new Array(units).fill(-1) }); return grid[r] }
  const place = []
  let prevRow = 0
  let prevEnd = 0
  cards.forEach((card, index) => {
    const w = Math.max(1, Math.min(card.span, units))
    const h = Math.max(1, card.rows || 1)
    let at = null
    for (let r = dense ? 0 : prevRow; !at; r++) {
      for (let c = r === (dense ? -1 : prevRow) ? prevEnd : 0; c + w <= units && !at; c++) {
        let fits = true
        for (let k = 0; k < h && fits; k++) {
          const g = row(r + k)
          if (g.cls !== null && g.cls !== card.cls) fits = false
          else for (let x = c; x < c + w; x++) if (g.used[x] !== -1) { fits = false; break }
        }
        if (fits) at = { r, c }
      }
    }
    for (let k = 0; k < h; k++) { const g = row(at.r + k); g.cls = card.cls; for (let x = at.c; x < at.c + w; x++) g.used[x] = index }
    place.push({ id: card.id, row: at.r, col: at.c, span: w, base: w, max: Math.max(w, Math.min(units, card.max ?? w * 2)), rows: h, cls: card.cls })
    prevRow = at.r
    prevEnd = at.c + w
  })
  // a row of single-row cards that starts at the left edge shares its free columns out, widest card first (one at a time, round robin)
  grid.forEach((g, r) => {
    const here = place.filter((p) => p.row <= r && r < p.row + p.rows)
    if (here.some((p) => p.rows > 1)) return
    const cells = here.sort((a, b) => a.col - b.col)
    let col = 0
    if (cells.some((p) => { const ok = p.col === col; col += p.span; return !ok })) return
    let left = units - col
    const order = [...cells].sort((a, b) => b.span - a.span)
    // a card grows to at most its cap (`max`, twice its own width when it has none), so a lone small card keeps its proportions
    for (let i = 0, idle = 0; left > 0 && order.length && idle < order.length; i = (i + 1) % order.length) { if (order[i].span < order[i].max) { order[i].span += 1; left--; idle = 0 } else idle++ }
    col = 0
    for (const p of cells) { p.col = col; col += p.span }
    g.used.fill(-1)
    for (const p of cells) for (let x = p.col; x < p.col + p.span; x++) g.used[x] = place.indexOf(p)
  })
  // the other free columns go to the neighbours: one column at a time, the widest card first, to the right where it is free, else to the left
  const free = (p, x) => { for (let k = 0; k < p.rows; k++) if (x < 0 || x >= units || grid[p.row + k].used[x] !== -1) return false; return true }
  const mark = (p, x, index) => { for (let k = 0; k < p.rows; k++) grid[p.row + k].used[x] = index }
  for (let changed = true; changed;) {
    changed = false
    for (const p of [...place].map((q, i) => ({ q, i })).sort((a, b) => b.q.span - a.q.span || a.i - b.i)) {
      const q = p.q
      if (q.span >= q.max) continue
      if (free(q, q.col + q.span)) { mark(q, q.col + q.span, p.i); q.span += 1; changed = true } else if (free(q, q.col - 1)) { mark(q, q.col - 1, p.i); q.col -= 1; q.span += 1; changed = true }
    }
  }
  // a hole left under a small card beside a large one is closed by making that card two rows tall
  for (const q of place.map((x, i) => ({ q: x, i }))) {
    if (exact || NO_FILL_ROW.has(q.q.cls)) continue // a slim strip is never made two rows tall to close a hole: it would be a bar in a tall card
    const below = grid[q.q.row + q.q.rows]
    if (!below || below.cls !== q.q.cls) continue
    let open = true
    for (let x = q.q.col; x < q.q.col + q.q.span; x++) if (below.used[x] !== -1) open = false
    if (open) { for (let x = q.q.col; x < q.q.col + q.q.span; x++) below.used[x] = q.i; q.q.rows += 1 }
  }
  // the last word: a free run of two or more columns in a row goes to the single-row tile beside it (the one to its left, else the one to its right), beyond the cap of its size:
  // no row has a hole wider than one column, whatever the width and whatever tiles there are (the same cards and the same width always give the same layout)
  grid.forEach((g, r) => {
    for (let x = 0; x < units;) {
      if (g.used[x] !== -1) { x++; continue }
      let e = x
      while (e < units && g.used[e] === -1) e++
      const run = e - x
      if (run >= 2) {
        const left = x > 0 ? place[g.used[x - 1]] : null
        const right = e < units ? place[g.used[e]] : null
        const pick = [left, right].find((q) => q && q.rows === 1 && q.row === r && (!exact || q.cls === 'strip'))
        if (pick) {
          const index = place.indexOf(pick)
          for (let k = x; k < e; k++) g.used[k] = index
          if (pick === left) pick.span += run; else { pick.col -= run; pick.span += run }
        }
      }
      x = e
    }
  })
  const rows = grid.map((g) => ({ cls: g.cls, cells: [] }))
  for (const p of place) rows[p.row].cells.push({ id: p.id, span: p.span, col: p.col, rows: p.rows })
  for (const r of rows) r.cells.sort((a, b) => a.col - b.col)
  return { rows, placed: new Map(place.map((p) => [p.id, { row: p.row, col: p.col, span: p.span, rows: p.rows, cls: p.cls }])) }
}

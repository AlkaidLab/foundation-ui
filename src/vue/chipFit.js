// A row of chips that keeps to one line (MChipRow): how many chips fit before the "+N" chip takes the place of the rest.
// widths: the width of each chip; gap: the space between two; room: the width of the row; plusWidth: the width of the "+N" chip, which is always sized for the largest N that can occur.
// Returns the count of chips that stay visible; every chip fits when the whole row fits without the "+N" chip. At least the first chip stays, as long as it fits next to "+N" or alone.
export function chipsShown(widths, gap, room, plusWidth) {
  const n = widths.length
  if (!n) return 0
  const all = widths.reduce((sum, w) => sum + w, 0) + gap * (n - 1)
  if (all <= room + 0.5) return n
  let used = 0
  let shown = 0
  for (let i = 0; i < n; i += 1) {
    const next = used + (i ? gap : 0) + widths[i]
    // with the chip i visible there is still the "+N" chip to place after it
    if (next + gap + plusWidth > room + 0.5) break
    used = next
    shown = i + 1
  }
  return shown
}

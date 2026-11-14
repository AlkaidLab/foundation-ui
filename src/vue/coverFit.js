// The action row of a card (MCoverGrid): the labels are shown while the buttons, side by side with their gaps, fit the room of the card; otherwise the row is icon-only.
// widths: the width of each button with its label; gap: the space between two; room: the width the card gives the row (without its padding).
export function compactNeeded(widths, gap, room) {
  if (!widths.length) return false
  const need = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1)
  return need > room + 0.5
}

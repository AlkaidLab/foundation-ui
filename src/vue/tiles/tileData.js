// What the tile designs read from a card's data: plain functions, nothing invented (a value that is not in the data is not drawn).
export const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null }
export const finite = (list) => (list || []).filter((v) => Number.isFinite(v))
/** The size a design draws: the ladder sizes above 大 draw 大 (none of these tiles offers them). */
export const sizeOf = (card) => ({ s: 's', m: 'm' }[card?.size] || (card?.size ? 'l' : 'm'))
/** Lowest, mean and highest of the samples, formatted like the value. */
export function statsOf(points, decimals = 0, unit = '') {
  const p = finite(points)
  if (p.length < 2) return []
  const f = (v) => `${v.toFixed(decimals)}${unit === '%' ? ' %' : unit ? ` ${unit}` : ''}`
  return [['min', Math.min(...p)], ['avg', p.reduce((a, b) => a + b, 0) / p.length], ['max', Math.max(...p)]].map(([k, v]) => ({ k, value: f(v) }))
}
/** A load at its limit (the tile turns to the error colour): a share of 90 % or more. */
export const hot = (value, max) => max === 100 && num(value) !== null && num(value) >= 90
/** The memory info of the model: { pct, total ('32 GB'), parts: [{ label, text, value, tone }] } */
export function memoryOf(d) {
  const [unit, total] = String(d?.unit || '').split(' · ')
  return { pct: num(d?.value), unit: unit?.trim() || '%', total: total || '', parts: d?.bar?.segments || [] }
}
/** The first number in a text ('目标 120 fps' -> 120). */
export const firstNumber = (s) => { const m = /(\d+(?:\.\d+)?)/.exec(String(s || '')); return m ? +m[1] : null }
/** The open action of a tile: its detail sheet. */
export const OPEN = { type: 'detail' }

// What MDashCardView gives every design: a wrapper declares all of it (defineProps(designProps)). One it leaves out falls through onto its root, over what it set there itself.
export const designProps = {
  card: { type: Object, required: true }, texts: { type: Object, default: () => ({}) }, details: { type: [Object, Array], default: null }, variant: { type: Number, default: 1 },
  chevron: { type: Boolean, default: false }, preview: { type: Boolean, default: false }, empty: { type: Object, default: null },
}

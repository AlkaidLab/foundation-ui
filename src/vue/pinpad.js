// Pure state of the PIN pad: a string of digits of fixed length. No DOM, no Vue, so it can be tested on its own.

/** Rows of the keypad: three rows of three, then the backspace key, zero and an empty cell. */
export const PIN_ROWS = Object.freeze([['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['backspace', '0', '']])

/** Appends a digit; ignores anything that is not 0-9 and anything beyond `length`. */
export function pinAppend(pin, digit, length = 4) {
  if (!/^[0-9]$/.test(String(digit)) || pin.length >= length) return pin
  return pin + digit
}

export function pinBackspace(pin) {
  return pin.slice(0, -1)
}

/** What a dot of the entry row looks like: filled (entered), active (the next one) or empty. */
export function pinDots(pin, length = 4) {
  return Array.from({ length }, (_, i) => (i < pin.length ? 'filled' : i === pin.length ? 'active' : 'empty'))
}

export const pinComplete = (pin, length = 4) => pin.length === length

/** Maps a keyboard key to an action of the pad: { type: 'digit', digit } | { type: 'backspace' } | null. */
export function pinKeyAction(key) {
  if (/^[0-9]$/.test(key)) return { type: 'digit', digit: key }
  if (key === 'Backspace' || key === 'Delete') return { type: 'backspace' }
  return null
}

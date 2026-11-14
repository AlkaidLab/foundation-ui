// The pure parts of the dock clock (MDockClock.vue): the time in Chinese words, the dot-matrix digits, and one timer for every clock of the window.

const ZH = '零一二三四五六七八九'
/** 0 → 零, 7 → 七, 10 → 十, 14 → 十四, 20 → 二十, 36 → 三十六 */
export function hanziNumber(n) {
  if (n < 10) return ZH[n]
  if (n < 20) return '十' + (n % 10 ? ZH[n % 10] : '')
  return ZH[Math.floor(n / 10)] + '十' + (n % 10 ? ZH[n % 10] : '')
}
/** The time in words, 24 hours: 十点 / 三十二分 / 零七秒; two o'clock is 两点, a full hour is 整. */
export function hanziTime(h, m, s = 0) {
  return {
    hour: (h === 2 ? '两' : hanziNumber(h)) + '点',
    minute: m === 0 ? '整' : (m < 10 ? '零' + ZH[m] : hanziNumber(m)) + '分',
    second: (s === 0 ? '零' : s < 10 ? '零' + ZH[s] : hanziNumber(s)) + '秒',
  }
}
/** Every character the 文字 face can draw (the font file holds these only). */
export const HANZI_CHARS = '零一二两三四五六七八九十点分整秒'

// Dot matrix: 5 × 7 dots per digit, one row per string, drawn as a grid of round LEDs
const DOT_DIGITS = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
}
// Radius of a lit dot per pitch (the pitch is 1): 0.4 at 大 and 特大; 0.34 at 小 and 中, where the dots are small and need more room between them to read as
// digits. An unlit dot is about half a lit one (and drawn very faint, clock.css), so the grid is a texture, never a second digit.
export const DOT_R = Object.freeze({ s: 0.34, m: 0.34, l: 0.4, xl: 0.4 })
const OFF = 0.55 // an unlit dot's radius per lit radius
const f = (n) => Math.round(n * 1000) / 1000
const dot = (x, y, k, r) => `M${f(x - r * k)} ${f(y)}a${f(r * k)} ${f(r * k)} 0 1 0 ${f(2 * r * k)} 0a${f(r * k)} ${f(r * k)} 0 1 0 ${f(-2 * r * k)} 0`
function digitPath(d, x0, y0, k, lit, R) {
  let out = ''
  DOT_DIGITS[d].forEach((row, y) => { for (let x = 0; x < 5; x++) if (lit ? row[x] === '1' : row[x] !== '1') out += dot(x0 + (x + 0.5) * k, y0 + (y + 0.5) * k, k, lit ? R : R * OFF) })
  return out
}
/**
 * The paths of the dot-matrix face for "HH:MM" (and the seconds, half size, at the baseline): `off` the unlit grid, `h` `m` `s` the lit dots, `colon`.
 * `box` is the viewBox, tight to the dots' edges, so the drawing's ink is its box.
 */
export function dotPaths(hh, mm, ss = '', R = DOT_R.xl) {
  const X = [0, 6, 14, 20] // the four digits; the colon sits at 12
  const p = { off: '', h: '', m: '', s: '', colon: dot(12.5, 2.5, 1, R) + dot(12.5, 4.5, 1, R) }
  ;[...hh, ...mm].forEach((d, i) => { p.off += digitPath(d, X[i], 0, 1, false, R); p[i < 2 ? 'h' : 'm'] += digitPath(d, X[i], 0, 1, true, R) })
  let w = 25
  if (ss) { [...ss].forEach((d, i) => { const x = 26.5 + i * 3; p.off += digitPath(d, x, 3.5, 0.5, false, R); p.s += digitPath(d, x, 3.5, 0.5, true, R) }); w = 32 }
  const e = f(0.5 - R)
  p.box = `${e} ${e} ${f(w - 2 * e)} ${f(7 - 2 * e)}`
  p.ratio = f((w - 2 * e) / (7 - 2 * e))
  // the edges of the lit dots: a digit whose outer column is dark (a 1) starts its ink a column in; the seconds change every second, so their side counts as full
  const empty = (d, side) => { let n = 0; for (let c = 0; c < 5; c++) { const col = side ? 4 - c : c; if (DOT_DIGITS[d].some((row) => row[col] === '1')) break; n++ } return n }
  p.inL = empty(hh[0], 0)
  p.inR = ss ? 0 : empty(mm[1], 1)
  p.unit = f(1 / (7 - 2 * e)) // one pitch, in heights of the drawing
  return p
}

// ---- one timer for every clock of the window ----
// It fires on the next whole second when one clock shows seconds, otherwise on the next whole minute; never in between, and not at all while the page is hidden
// (visibilitychange: it fires at once when the page shows again). All clocks update in the same task, so a window with the picker open still restyles once a second.
const subs = new Set()
let timer = 0
const doc = () => globalThis.document
function arm() {
  clearTimeout(timer); timer = 0
  if (!subs.size || doc()?.hidden) return
  const t = Date.now(), step = [...subs].some((s) => s.seconds()) ? 1000 : 60000
  timer = setTimeout(fire, step - (t % step) + 4)
}
function fire() { const t = Date.now(); for (const s of subs) s.fn(t); arm() }
let listening = false
/** `fn(now)` on every tick; `seconds()` says whether this clock needs every second. Returns { stop, rearm } (rearm after `seconds()` changed). */
export function onClockTick(fn, seconds = () => false) {
  if (!listening && doc()) { listening = true; doc().addEventListener('visibilitychange', () => { if (doc().hidden) { clearTimeout(timer); timer = 0 } else if (subs.size) fire() }) }
  const s = { fn, seconds }
  subs.add(s); arm()
  return { stop() { subs.delete(s); arm() }, rearm: arm }
}
/** The step of the timer now (ms): 1000, 60000, or 0 when nothing runs. For the tests. */
export const tickStep = () => (!timer ? 0 : [...subs].some((s) => s.seconds()) ? 1000 : 60000)

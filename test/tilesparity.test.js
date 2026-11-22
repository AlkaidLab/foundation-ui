// The same tiles on the panel and on the phone: a size the person chose is theirs (smart mode arranges around it, a phone keeps it as far as the columns allow), and a narrow pane scales the tile instead of re-flowing it
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { useDashLayout } from '../src/vue/useDashLayout.js'
import { offeredOf, designUnitPx, columnsOf, faceScaleOf, PHONE_TYPE_SHARE } from '../src/vue/homeSizes.js'
import { CARD_META } from '../src/vue/homeCards.js'
import { readDash } from './dashSource.js'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), raw: (k) => m.get(k) } }

test('a size the person chose is marked as theirs; a size the smart plan froze into the layout is not', () => {
  const st = memory(); const l = useDashLayout('t', st)
  l.freeze({ visible: ['hero', 'bitrate'], sizes: { hero: 'm', bitrate: 'l' } })
  assert.equal(l.isUserSized('bitrate'), false, 'a frozen plan size is not a choice')
  l.setSize('bitrate', 's')
  assert.equal(l.isUserSized('bitrate'), true)
  assert.equal(l.isUserSized('hero'), false)
  l.setSize('hero', 'l', { user: false })
  assert.equal(l.isUserSized('hero'), false, 'a start size of an added tile is not a choice either')
  assert.deepEqual(JSON.parse(st.raw('foundation-ui.dash2.t')).userSized, { bitrate: true })
  // read back, kept through the undo snapshot, and gone with a reset
  assert.equal(useDashLayout('t', st).isUserSized('bitrate'), true)
  const snap = l.snapshot(); l.setSize('fps', 'm'); l.restore(snap); assert.equal(l.isUserSized('fps'), false)
  l.reset(); assert.equal(l.isUserSized('bitrate'), false); assert.ok(!('userSized' in JSON.parse(st.raw('foundation-ui.dash2.t'))), 'a layout nobody sized keeps its old shape')
})

test('smart mode keeps the size of a tile the person sized, in what it draws and in what it fills with', () => {
  const d = readDash()
  assert.match(d, /const sizeOf = \(id\) => \(smart\.value && !layout\.isUserSized\(id\) \? plan\.value\.sizes\[id\] : layout\.state\.sizes\[id\]\)/)
  assert.match(d, /fitDash\(list, w, \(c, u, lift\) => boxFor\(c, u, smart\.value && layout\.isUserSized\(c\.id\) \? 0 : lift\), \{/)
})

test('a phone offers 大 (2 x 2) to a tile that has it, and never 特大 (four units wide)', () => {
  for (const id of ['cpu', 'gpu', 'bitrate', 'fps']) { const o = offeredOf(id, CARD_META[id], 'compact'); assert.ok(o.includes('s') && o.includes('m'), id); assert.ok(!o.includes('xl'), `${id}: no xl on a phone`) }
  assert.ok(offeredOf('bitrate', CARD_META.bitrate, 'compact').includes('l'))
})

test('a narrow pane draws a tile at the design square and scales the whole face to the column, so the phone shows the panel\'s tile', () => {
  const v = read('src/vue/MHomeDash.vue'), css = read('src/css/dash.css')
  assert.match(v, /:data-scaled="faceK\(b\) !== 1 \? '' : undefined" :style="\{ '--m-face-k': faceK\(b\),/)
  assert.match(v, /:data-face="c\.cls === 'unit' \? '' : undefined"/)
  assert.match(css, /\.m-dash__grid\[data-scaled\] > \.m-dash__cell\[data-face\] > \.m-dash__body > \* \{ flex: none; width: calc\(100% \/ var\(--m-face-k\)\); height: calc\(100% \/ var\(--m-face-k\)\); transform: scale\(var\(--m-face-k\)\); transform-origin: 0 0; \}/)
  // the factor: the column over the design square; 1 from 800 px on, so a desktop is not touched
  for (const w of [800, 1280, 1920]) assert.equal(columnsOf(w).unit / designUnitPx(), 1)
  for (const w of [360, 390, 430]) { const k = columnsOf(w).unit / designUnitPx(); assert.ok(k > 1 && k <= 1.36, `${w}: ${k}`) }
  assert.match(readDash(), /const faceK = \(b\) => \(b\?\.unit \? faceScaleOf\(b\.unit\)\.k : 1\)/)
  // the type of a phone tile takes a share of the extra width, not all of it: 1.35 times the panel's type was the "fonts too big" of the owner's phone; the face is laid out in the room that is left
  for (const w of [360, 390, 430, 440]) {
    const { unit } = columnsOf(w), f = faceScaleOf(unit), k = unit / designUnitPx()
    assert.ok(f.k > 1 && f.k < k, `${w}: face ${f.k} is between 1 and the column factor ${k}`)
    assert.ok(Math.abs(f.k - (1 + (k - 1) * PHONE_TYPE_SHARE)) < 0.0002, `${w}: face scale ${f.k}`)
    assert.ok(Math.abs(f.box * f.k - unit) < 0.2, `${w}: the box ${f.box} scaled by ${f.k} fills the column ${unit}`)
    assert.ok(f.k <= 1.15, `${w}: the type of a tile is at most 15 % over the panel's (it was 35 %)`)
  }
  for (const w of [800, 1280, 1920]) assert.deepEqual(faceScaleOf(columnsOf(w).unit), { k: 1, box: designUnitPx() })
  assert.ok(Math.abs(faceScaleOf(columnsOf(1000, 'smaller').unit).k - columnsOf(1000, 'smaller').unit / designUnitPx()) < 0.0001, 'a smaller density still scales by the whole factor')
})

test('what a tile measures about itself is in layout px, not painted px: a scaled face would otherwise draw outside its tile', () => {
  const chart = read('src/vue/MTileChart.vue'), numeral = read('src/vue/MTileNumeral.vue')
  assert.match(chart, /const read = \(\) => \{ const w = Math\.round\(root\.value\.offsetWidth\), h = Math\.round\(root\.value\.offsetHeight\);/)
  assert.ok(!/getBoundingClientRect/.test(chart), 'the chart reads no painted rect')
  assert.match(numeral, /const scale = tile\.offsetWidth > 0 && t\.width > 0 \? t\.width \/ tile\.offsetWidth : 1; const lim = \(t\.right - left\) \/ scale - /)
})

test('a scaled face sets its numerals at 92 % of the design numeral at most, so a phone numeral is not the panel numeral enlarged', () => {
  const dash = read('src/css/dash.css'), fit = read('src/css/tilefit.css'), cal = read('src/css/tiles-cal.css'), fourtb = read('src/css/tilefit-4tb.css')
  assert.match(dash, /\.m-dash__grid\[data-scaled\], \.m-dock__face\[data-scaled\] \{ --m-nk: min\(1, calc\(\.92 \/ var\(--m-face-k, 1\)\)\); \}/)
  assert.match(fit, /\.m-tnum__v \{ font-size: calc\(var\(--tn\) \* var\(--tn-k, 1\) \* var\(--m-nk, 1\)\); \}/)
  assert.match(cal, /\.m-calm__value b \{ font-size: calc\(var\(--cv, 60px\) \* var\(--m-nk, 1\)\); \}/)
  assert.match(fourtb, /\.m-calm\.is-s \.m-calm__value b \{ font-size: calc\(min\(var\(--cv, 60px\), 33cqw\) \* var\(--m-nk, 1\)\); \}/)
  // painted numeral = design numeral x face scale x the damping: at most 0.92 of the design on every phone width, and untouched where the face is not scaled (a desktop, a smaller density)
  for (const w of [360, 390, 430, 440]) { const k = faceScaleOf(columnsOf(w).unit).k; assert.ok(k * Math.min(1, 0.92 / k) <= 0.9201, `${w}`) }
})

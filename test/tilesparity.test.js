// The same tiles on the panel and on the phone: a size the person chose is theirs (smart mode arranges around it, a phone keeps it as far as the columns allow), and a narrow pane scales the tile instead of re-flowing it
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { useDashLayout } from '../src/vue/useDashLayout.js'
import { offeredOf, designUnitPx, columnsOf } from '../src/vue/homeSizes.js'
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
  assert.match(readDash(), /const faceK = \(b\) => \{ if \(!b\?\.unit\) return 1; const k = b\.unit \/ designUnitPx\(\);/)
})

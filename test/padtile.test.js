// 手柄状态 方形: the drawn controller is the tile (the plate fills it behind the text, a scrim of the plate colour keeps the words readable); no text under 11 px.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const real = fs.readFileSync(new URL('../src/css/tilefit-real.css', import.meta.url), 'utf8')
const vue = fs.readFileSync(new URL('../src/vue/tiles/TileDevices.vue', import.meta.url), 'utf8')
const line = (sel) => { const l = real.split('\n').find((x) => x.startsWith(sel)); assert.ok(l, sel); return l }

test('the art plate of the square pad tile covers the whole tile and no longer has its own 40 px height', () => {
  const plate = line('.m-b2pad.is-s .m-b2plate, :is(.m-dash__cell, .m-dock__cell) .m-b2pad.is-s .m-b2plate')
  assert.match(plate, /position: absolute; inset: 0;/)
  assert.match(plate, /z-index: 0;/)
  assert.match(plate, /clip-path: none/)
  assert.doesNotMatch(plate, /min-height: [1-9]/)
  // the head, the name and the state sit above it
  assert.match(line('.m-b2pad.is-s > .m-calm__head'), /position: relative; z-index: 1/)
  assert.match(line('.m-b2pad.is-s > .m-b2__name'), /margin-top: auto/)
})

test('a scrim of the plate\'s own colour covers the text side of the art, in both states', () => {
  const scrim = real.split('\n').find((x) => x.includes('.m-b2pad.is-s .m-b2plate::after')) + real.split('\n')[real.split('\n').findIndex((x) => x.includes('.m-b2pad.is-s .m-b2plate::after')) + 1]
  assert.match(scrim, /linear-gradient\(to top, var\(--plate\) 0/)
  assert.match(scrim, /linear-gradient\(to right, color-mix\(in srgb, var\(--plate\) 72%, transparent\)/)
  assert.match(real, /\.m-b2plate\.is-on ~ \.m-b2__name[^{]*\{ color: var\(--md-sys-color-on-primary-container\)/, 'ready: the ink of the primary container')
  assert.match(real, /\.m-b2plate\.is-quiet ~ \.m-b2__name \{ color: var\(--md-sys-color-on-surface\)/, 'quiet: the ink of the surface')
})

test('no text of the pad tile is set under 11 px, and the controller kind is read from the name too (a DualSense draws as a DualSense)', () => {
  const sizes = [...real.matchAll(/\.m-b2pad[^{]*\{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/font-size: (\d+(?:\.\d+)?)px/g)].map((x) => +x[1]))
  assert.ok(sizes.every((s) => s >= 11), sizes.join(','))
  assert.match(vue, /<MControllerArt :type="kindOf\(`\$\{pad\.title\} \$\{pad\.value\}`\)" \/>/)
  const kindOf = (s) => { const v = String(s || '').toLowerCase(); return /ds5|dualsense|ps5/.test(v) ? 'ds5' : /ds4|dualshock|ps4/.test(v) ? 'ds4' : /x360|360/.test(v) ? 'x360' : /xone|xbox/.test(v) ? 'xone' : /switch|pro/.test(v) ? 'switch' : 'auto' }
  assert.equal(kindOf('手柄 DualSense（DS5 / PS5 手柄） · 已就绪'), 'ds5')
  assert.equal(kindOf('手柄 '), 'auto')
})

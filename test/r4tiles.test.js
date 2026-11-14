import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (p) => fs.readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const encoder = read('vue/tiles/TileEncoder.vue'), table = read('vue/tiles/TileTable.vue'), devices = read('vue/tiles/TileDevices.vue'), facts = read('vue/tiles/TileFacts.vue')
const b2 = read('css/tiles-b2.css'), metrics = read('css/tiles-metrics.css')

test('编解码: one codec leads (the best the host can use) and the others are small, so the tile has one focal shape', () => {
  assert.match(encoder, /const RANK = \['av1', 'hevc'/, 'AV1, then HEVC, then H.264')
  assert.match(encoder, /'is-lead': c\.name === lead/)
  assert.match(encoder, /c\.name === lead && c\.on \? 'm-visually-hidden' : 'm-tenc__state'/, 'the leading codec that is on says it with its fill; the words stay for the screen reader')
  assert.match(metrics, /\.m-tenc__codecs li\.is-lead \{ flex-grow: 1\.6; align-self: stretch; \}/)
  assert.match(metrics, /\.m-tenc__codecs \.m-tshape \{ flex: 0 0 auto; width: 64%;/, 'the others are about two thirds of a side')
})

test('客户端 (the table) 中 / 大: the pair button is its glyph where the tabs and the words do not fit, with its words for the screen reader and as the tooltip', () => {
  assert.match(table, /:title="d\.action\.label"/)
  assert.match(table, /<span class="m-b2table__lab">\{\{ d\.action\.label \}\}<\/span>/)
  assert.match(b2, /\.m-b2table\.is-m \.m-b2table__act, \.m-b2table\.is-l \.m-b2table__act \{ width: 32px; padding: 0; \}/)
  assert.match(b2, /\.m-b2table\.is-m \.m-b2table__lab, \.m-b2table\.is-l \.m-b2table__lab \{ position: absolute;/)
})

test('手柄: the name is the device, the line under it what the brackets and the state say; the two texts never shrink', () => {
  assert.match(devices, /const padParts = computed/)
  assert.match(devices, /\{\{ padParts\.name \}\}/)
  assert.match(devices, /const padLine = computed\(\(\) => \(size\.value === 's' \? padParts\.value\.line\.split\(' · '\)\.pop\(\) : padParts\.value\.line\)\)/, 'at 方形 the line is the state alone')
  assert.match(devices, /class="m-b2__cap">\{\{ padLine \}\}/, 'the line under the name is the detail and the state, not the word 手柄 the header already says')
  assert.match(b2, /\.m-b2pad \.m-b2__name \{[^}]*flex: none;[^}]*\} \.m-b2pad \.m-b2__cap \{ flex: none; \}/, 'a flex item with overflow hidden shrinks to nothing otherwise (DualSense was 16 px in an 18.4 px line)')
})

test('系统 方形 and 串流分辨率: the shape is the picture of the tile (a 164 px squircle; the screen with a 20 % fill)', () => {
  assert.match(facts, /size === 's' \? '164px' : '180px'/)
  assert.match(metrics, /\.m-tfacts__screen \{[^}]*background: color-mix\(in srgb, var\(--tk\) 20%, transparent\)/)
})

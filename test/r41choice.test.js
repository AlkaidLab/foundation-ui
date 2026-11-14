import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { choicesOf, padChoices } from '../src/vue/tiles/b2.js'
import { sizesOf } from '../src/vue/homeSizes.js'

const read = (p) => fs.readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const setting = read('vue/tiles/TileSettingB3.vue')
const O = (...v) => v.map((value) => ({ value, label: value || 'auto' }))
const values = (r) => r.shown.map((o) => o.value)

test('the list of a setting tile: the first option, the one in use, then the likely ones in the order of the page; all of them when there are three or fewer', () => {
  const win = O('', 'nvenc', 'quicksync', 'amdvce', 'software')
  const likely = ['nvenc', 'amdvce', 'quicksync', 'videotoolbox', 'vaapi']
  assert.deepEqual(values(choicesOf(win, '', { first: '', likely })), ['', 'nvenc', 'amdvce'])
  assert.deepEqual(values(choicesOf(win, 'software', { first: '', likely })), ['', 'nvenc', 'software'])
  assert.deepEqual(values(choicesOf(win, 'quicksync', { first: '', likely })), ['', 'nvenc', 'quicksync'], 'the one in use is kept, NVENC is the most likely of the rest')
  assert.equal(choicesOf(win, '', { first: '', likely }).more, true)
  const mac = choicesOf(O('', 'videotoolbox', 'software'), 'videotoolbox', { first: '', likely })
  assert.deepEqual([values(mac), mac.more], [['', 'videotoolbox', 'software'], false])
  assert.deepEqual(values(choicesOf(O('system', 'light', 'dark'), 'dark')), ['system', 'light', 'dark'])
})

test('the gamepad list is the same function with its own first and likely', () => {
  assert.deepEqual(values(padChoices(O('auto', 'x360', 'ds4', 'ds5'), 'ds4')), ['auto', 'x360', 'ds4'])
})

test('编码器 方形 is a list of buttons that saves in place and says when it applies; the whole choice is behind the chevron', () => {
  assert.match(setting, /v-if="id === 'ctl-encoder' && !strip" class="m-tile m-cal m-b2 m-b2padtype is-s"/)
  assert.match(setting, /@click\.stop="save\(d\.key, o\.value\)"/, 'the same save as the strip of the tile')
  assert.match(setting, /<MPickSheet v-if="encChoices\.more"/)
  assert.match(setting, /\{\{ L\.restartNote \}\}/, '重启后生效 stays')
  assert.doesNotMatch(setting, /valuePx/, 'the value is not printed as the tile any more')
})

test('明暗 方形 is the three buttons, each sets the mode at once (the window\'s own look, no note needed)', () => {
  assert.match(setting, /v-else-if="id === 'pers-theme' && !strip" class="m-tile m-cal m-b2 m-b2padtype is-s"/)
  assert.match(setting, /@click\.stop="setAp\(\{ mode: o\.value \}\)"/)
  assert.doesNotMatch(setting, /cycleMode/, 'no more cycling on a press: the person sees what they choose')
})

test('the squares of 编码器 and 明暗 are still offered at 方形 and as the strip', () => {
  const sizes = (id) => Object.keys(sizesOf(id, { cls: 'strip', data: { type: 'strip-control' } }).sizes).join(',')
  assert.equal(sizes('ctl-encoder'), 's,strip'); assert.equal(sizes('pers-theme'), 's,strip')
})

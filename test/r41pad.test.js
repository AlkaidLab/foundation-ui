import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { padChoices } from '../src/vue/tiles/b2.js'
import { sizesOf } from '../src/vue/homeSizes.js'

const read = (p) => fs.readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const devices = read('vue/tiles/TileDevices.vue'), b2css = read('css/tiles-b2.css')
const O = (...v) => v.map((value) => ({ value, label: value }))

test('手柄类型 offers four types: three buttons show 自动 and the two most likely, the one in use is always among them', () => {
  const four = O('auto', 'x360', 'ds4', 'ds5')
  assert.deepEqual(padChoices(four, 'auto').shown.map((o) => o.value), ['auto', 'x360', 'ds5'])
  assert.equal(padChoices(four, 'auto').more, true, 'the fourth is behind the chevron')
  assert.deepEqual(padChoices(four, 'ds4').shown.map((o) => o.value), ['auto', 'x360', 'ds4'], 'DualShock 4 in use: it is shown, in the order of the page')
  assert.deepEqual(padChoices(four, 'ds5').shown.map((o) => o.value), ['auto', 'x360', 'ds5'])
  assert.deepEqual(padChoices(four, 'x360').shown.map((o) => o.value), ['auto', 'x360', 'ds5'])
  assert.deepEqual(padChoices(four, '').shown.map((o) => o.value), ['auto', 'x360', 'ds5'], 'no value yet: the likely ones')
})

test('手柄类型 on a host that offers three or fewer types shows them all and no chevron (Linux: 自动 and DualSense)', () => {
  const linux = padChoices(O('auto', 'ds5'), 'ds5')
  assert.deepEqual([linux.shown.map((o) => o.value), linux.more], [['auto', 'ds5'], false])
  const three = padChoices(O('auto', 'x360', 'ds5'), 'auto')
  assert.deepEqual([three.shown.length, three.more], [3, false])
  assert.deepEqual(padChoices([], 'auto'), { shown: [], more: false })
})

test('手柄类型 方形 is the list: three stacked radio buttons that act as the strip does (the product saves, reverts on failure and says so), the art only from 中 on', () => {
  assert.match(devices, /v-else-if="id === 'gamepad-type'"/)
  assert.match(devices, /role="radiogroup"/)
  assert.match(devices, /@click\.stop="pick\(o\.value\)"/)
  assert.match(devices, /emit\('act', \{ type: 'group', value \}\)/, 'the same act as the strip: both products save it through the controller-type path')
  assert.match(devices, /<MPickSheet/, 'the chevron opens the whole choice')
  assert.match(devices, /v-if="size !== 's'" class="m-b2plate/, 'no art at 方形: the buttons are the picture')
  assert.match(devices, /padNote/, 'the tile says when it applies')
  assert.match(b2css, /\.m-b2opt \{[^}]*height: 36px/, 'the buttons keep their height, 36 px at every size (the list is the focal element of the square: 15 % of it)')
  assert.match(b2css, /\.m-b2opt\.is-on/)
})

test('手柄类型 is offered at 方形, 中, 大 and as the strip', () => {
  assert.equal(Object.keys(sizesOf('gamepad-type', { cls: 'strip', data: { type: 'strip-control' } }).sizes).join(','), 's,m,l,strip')
})

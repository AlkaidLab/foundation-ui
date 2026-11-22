// Round 44 (gate fixes): the sizes a tile offers are the sizes that show something more.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TILE_RANGES } from '../src/vue/homeRanges.js'
import { padChoices } from '../src/vue/tiles/b2.js'

const OPTIONS = ['auto', 'x360', 'ds4', 'ds5'].map((value) => ({ value, label: value }))

test('加密 and the session bitrate keep their 中 (a size is not dropped to pass a gate): the modes say what they mean, the curve is drawn under the gauge', () => {
  assert.deepEqual([TILE_RANGES['host-encryption'].min, TILE_RANGES['host-encryption'].max], ['s', 'm'])
  assert.deepEqual([TILE_RANGES['stream-bitrate'].min, TILE_RANGES['stream-bitrate'].max], ['s', 'm'])
  assert.match(readFileSync(new URL('../src/vue/tiles/TileHost.vue', import.meta.url), 'utf8'), /m-b2enc__note/)
  assert.match(readFileSync(new URL('../src/vue/tiles/TileStream.vue', import.meta.url), 'utf8'), /m-tstream__spark--bitrate/)
})

test('手柄类型: three types and the way to the rest by default, every type when there is room (大)', () => {
  const small = padChoices(OPTIONS, 'auto')
  assert.equal(small.shown.length, 3); assert.equal(small.more, true)
  const large = padChoices(OPTIONS, 'auto', 12)
  assert.equal(large.shown.length, 4); assert.equal(large.more, false)
  assert.deepEqual(large.shown.map((o) => o.value), ['auto', 'x360', 'ds4', 'ds5'])
})

test('正在玩 at 大 lists what the stream is made of; the wallpaper tile with none in use holds a shape', () => {
  const now = readFileSync(new URL('../src/vue/tiles/cal/CalNow.vue', import.meta.url), 'utf8')
  assert.match(now, /size === 'l' && facts\.length/)
  const vdd = readFileSync(new URL('../src/vue/tiles/TileVddB3.vue', import.meta.url), 'utf8')
  assert.match(vdd, /v-if="!source" class="m-b3w__hero"/)
  const hero = readFileSync(new URL('../src/vue/tiles/cal/CalHero.vue', import.meta.url), 'utf8')
  assert.match(hero, /m-calh__names/)
})

test('DualSense tuning at 中: one slider, and the head opens the gamepad page with all of them', () => {
  const live = readFileSync(new URL('../src/vue/tiles/TileLive.vue', import.meta.url), 'utf8')
  assert.match(live, /hidden > 0 && !preview/)
  assert.match(live, /type: 'open', value: 'gamepad'/)
  const rec = readFileSync(new URL('../src/vue/homeRecent.js', import.meta.url), 'utf8')
  assert.match(rec, /more: T\.dsMore/)
})

test('a chart with too few samples is not drawn as a curve (码率 and 帧率 draw a faint flat line instead); the art of a tile that is clipped by it is marked', () => {
  const metric = readFileSync(new URL('../src/vue/tiles/cal/CalMetric.vue', import.meta.url), 'utf8')
  // the metric tiles are never left without their chart: the chart draws its own placeholder (MTileChart `placeholder`) until it has the samples a curve needs
  assert.match(metric, /<MTileChart class="m-tile__bleed m-calm__chart" :points="pts"[^>]* placeholder /)
  const stream = readFileSync(new URL('../src/vue/tiles/TileStream.vue', import.meta.url), 'utf8')
  // the bars of 丢包 and 丢帧 need two samples; the curves of 主机延迟 and 帧率 draw their own placeholder like the metric tiles
  assert.match(stream, /<MTileChart v-if="isBars && pts\.length > 1"/)
  assert.match(stream, /<MTileChart v-else-if="!isBars" [^>]* placeholder /)
  assert.match(readFileSync(new URL('../src/vue/tiles/TileInfoB3.vue', import.meta.url), 'utf8'), /class="m-b3vi__img" data-tile-art/)
})

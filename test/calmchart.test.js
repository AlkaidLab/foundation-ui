// 码率, 帧率, CPU, GPU: one curve at every size, along the bottom edge, the whole width, monotone; the fill fades out at the bottom edge and on the left (under the text), the line does not
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { monotonePath } from '../src/vue/curve.js'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const nums = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number)

test('the monotone curve never overshoots: between two samples it stays between their values, a flat run stays flat', () => {
  const pts = [10, 10, 10, 40, 42, 41, 41, 20, 5].map((y, i) => ({ x: i * 10, y }))
  const d = monotonePath(pts)
  // sample the cubic segments: every y of a segment lies between the y of its two ends
  const seg = [...d.matchAll(/C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)/g)].map((m) => m.slice(1).map(Number))
  assert.equal(seg.length, pts.length - 1)
  seg.forEach(([c1x, c1y, c2x, c2y, x, y], i) => {
    const y0 = pts[i].y, lo = Math.min(y0, y), hi = Math.max(y0, y)
    for (const cy of [c1y, c2y]) assert.ok(cy >= lo - 0.06 && cy <= hi + 0.06, `segment ${i}: control ${cy} outside ${lo}..${hi}`)
  })
  assert.equal(monotonePath([{ x: 0, y: 1 }]), '')
  assert.deepEqual(nums(monotonePath([{ x: 0, y: 5 }, { x: 10, y: 5 }])).slice(-2), [10, 5])
})

test('the chart can draw the curve that way, fade the fill on the left only, and keep a faint flat line for too few samples', () => {
  const c = read('src/vue/MTileChart.vue')
  assert.match(c, /monotone: \{ type: Boolean, default: false \}/); assert.match(c, /placeholder: \{ type: Boolean, default: false \}/); assert.match(c, /fade: \{ type: Number, default: 0 \}/)
  assert.match(c, /\(props\.monotone \? monotonePath : smoothPath\)\(p\)/)
  assert.match(c, /:mask="fadeStops \? `url\(#\$\{gid\}-m\)` : undefined"/, 'the fill fades to 10 % on the left')
  assert.match(c, /<path :d="paths\.line" class="m-tchart__line" :mask="fadeStops \? `url\(#\$\{gid\}-ml\)` : undefined" \/>/, 'the line softens to 40 % there and never breaks')
  assert.match(c, /stop-color="#fff" stop-opacity="0\.4"/)
  assert.match(c, /<svg v-if="placeholder && !enough && box\.w" class="m-tchart__flat"/)
  assert.match(c, /const flatY = computed\(\(\) => Math\.max\(4, box\.value\.h - props\.base - 8\)\.toFixed\(1\)\)/, 'above the caption row, not through it')
})

test('码率 and 帧率 draw that curve at every size: no dot at 方形, a dot at 中 and 大, the target only at 大, the line from the bottom edge, never absent', () => {
  const v = read('src/vue/tiles/cal/CalMetric.vue')
  assert.match(v, /<MTileChart class="m-tile__bleed m-calm__chart" :points="pts" :max="max" :target="size === 'l' \? target : null" kind="area" :dot="size !== 's'" monotone placeholder :fade="1"/)
  assert.match(v, /:pad="\{ s: 0\.08, m: 0\.12, l: 0\.24 \}\[size\]"/, 'the highest value keeps off the line of text above the band (大: 「上限 自动 HEVC」)')
  assert.match(v, /:base="size === 's' \? 0 : size === 'l' \? 46 : 24" \/>/, 'the line keeps above the caption row at 中 and 大')
  assert.ok(!/<MTileChart v-if="pts\.length > 1"/.test(v), 'drawn with a placeholder, not left out')
  const css = read('src/css/tiles-cal.css')
  assert.match(css, /\.m-calm\.is-m \{ --tile-bleed: 48%; \}/)
  assert.match(css, /--tk-fill-end: 0;/); assert.ok(!/--tk-fill-end: \.2/.test(css), 'the fill ends in nothing, in both themes')
  assert.ok(!/\.m-calm\.is-m \.m-calm__chart \{ left: 46%/.test(read('src/css/tiles-prerelease.css')), 'no rectangle cut from 46 %')
})

test('主机延迟, 帧率 of the session and 内存变化 draw the same curve as 码率 and 帧率, from the same component; 丢包 and 丢帧 keep their bars', () => {
  const s = read('src/vue/tiles/TileStream.vue'), m = read('src/vue/tiles/TileMemory.vue'), css = read('src/css/tiles-prerelease.css')
  assert.match(s, /<MTileChart v-else-if="!isBars" class="m-tile__bleed m-calm__chart" :points="pts" :max="isFps && target \? target \* 1\.1 : null" :target="isFps \? target : null" kind="area" :dot="size !== 's'" monotone placeholder :fade="1"/)
  assert.match(s, /<MTileChart v-if="isBars && pts\.length > 1" class="m-tile__bleed" :points="pts" kind="bars"/)
  assert.match(m, /<MTileChart class="m-tile__bleed m-calm__chart" :points="pts" :max="100" kind="area" :dot="size !== 's'" monotone placeholder :fade="1"/)
  for (const f of [s, m]) assert.match(f, /:base="size === 's' \? 0 : size === 'l' \? 46 : 28" \/>/, 'the line keeps above the caption under the figure')
  assert.match(css, /\.m-tile:is\(\.m-tstream--latency, \.m-tstream--stream-fps, \.m-tmem--trend\)\.is-s \{ --tile-bleed: 33%; \}/)
  assert.match(css, /\.m-tile:is\(\.m-tstream--latency, \.m-tstream--stream-fps, \.m-tmem--trend\)\.is-m \{ --tile-bleed: 48%; \}/)
  assert.match(css, /\.m-tile:is\(\.m-tstream--latency, \.m-tstream--stream-fps, \.m-tmem--trend\)\.is-l \{ --tile-bleed: 45%; \}/)
  assert.match(css, /\.m-tstream:is\(\.m-tstream--loss, \.m-tstream--dropped\)\.is-m > \.m-tile__bleed \{ left: 46%; \}/, 'only the bars keep their place right of the figure')
  assert.ok(!/m-tstream--latency, \.m-tstream--loss, \.m-tstream--dropped\)\.is-m > \.m-tile__bleed \{ left: 46%/.test(css), '主机延迟 is not cut from 46 % any more')
})

test('the small histories of the composite tiles (帧时间占用, 负载, 网卡, 码率 of the session) are the same curve; rings and gauges stay', () => {
  const g = read('src/vue/tiles/TileGauge.vue'), n = read('src/vue/tiles/TileNet.vue'), s = read('src/vue/tiles/TileStream.vue'), css = read('src/css/tiles-prerelease.css')
  assert.match(g, /class="m-tile__bleed m-tgauge__history" :points="finite\(d\.spark\)" kind="area" :dot="true" monotone placeholder :fade="1"/)
  assert.match(g, /class="m-tgauge__chart"[^>]*kind="area" :dot="true" monotone :placeholder="x\.i === 0" :fade="1"/)
  assert.match(g, /const drawn = computed\(\(\) => series\.value\.map\(\(s, i\) => \(\{ s, i \}\)\)\.sort/, 'the higher curve is drawn first, so its fill never hides the lower line')
  assert.match(css, /\.m-tgauge--budget\.is-m \.m-tgauge__history \{ -webkit-mask-image: linear-gradient\(to right, transparent, #000 40px\)/)
  assert.match(n, /class="m-tnet__history" :points="sent" kind="area" :dot="true" monotone placeholder :fade="1"/)
  assert.match(s, /m-tstream__spark--bitrate" :points="pts" kind="area" :dot="true" monotone placeholder :fade="1"/)
  assert.match(css, /\.m-tchart:is\(\.m-tgauge__history, \.m-tgauge__chart, \.m-tnet__history, \.m-tstream__spark--bitrate\) \{ --tk-fill:/)
  assert.match(read('src/vue/tiles/cal/CalHero.vue'), /kind="line" dot monotone/)
  for (const f of [g, n, s]) assert.ok(!/<MTileChart[^>]*kind="area"(?![^>]*monotone)[^>]*\/>/.test(f), 'no area chart of the old drawing is left')
})

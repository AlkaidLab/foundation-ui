import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { BITRATE_PRESETS_MBPS, BITRATE_SLIDER_MAX_PROGRESS, bitrateChipMarks, bitrateFromProgress, bitrateSliderProgress, bitrateSliderSpan, bitrateChips, bitrateFromMbps, bitrateKbps, bitrateMbpsText, bitrateNudge, bitrateSliderMbps, bitrateText } from '../src/settings/bitrate.js'
import { buildCatalogue } from '../src/vue/homeCatalogue.js'
import { homeTexts } from '../src/vue/homeModel.js'
import { createHistory } from '../src/vue/homeHistory.js'

// 最大比特率 (max_bitrate, Kbps): collaborator report 2026-11-08 「默认莫名其妙变成了65」「自动的时候这里显示有问题」. The panel showed a made-up 50 Mbps on a host that never wrote the key (the host's default is 0, 自动),
// called 0 "不限制" and drew the slider with its thumb at 1 Mbps; the Web UI wrote the name 自动 under the slider's icon, read it as "0 Mbps" to assistive technology and, for a custom chip, multiplied a float back to Kbps.
const read = (p) => fs.readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const mem = () => createHistory({ getItem: () => null, setItem() {} }, 't')
const T = { ...homeTexts('zh'), __locale: 'zh' }
const cat = (config) => buildCatalogue({ config: { sunshine_name: 'Host', ...config }, now: 0, history: mem() }, T).data

test('an unset, empty, zero, negative or unreadable ceiling is automatic (0), never a made-up number', () => {
  for (const raw of [undefined, null, '', '0', 0, '-5', -1, 'abc', NaN, {}]) assert.equal(bitrateKbps(raw), 0, String(raw))
  assert.equal(bitrateText(undefined, '自动'), '自动'); assert.equal(bitrateText('0', '自动'), '自动')
  assert.equal(bitrateSliderMbps(undefined), 0); assert.equal(bitrateMbpsText(0), '')
})

test('the host answers the Kbps as a string and the stored value round-trips exactly through the shown choices', () => {
  assert.equal(bitrateKbps('65000'), 65000); assert.equal(bitrateKbps(65000), 65000)
  assert.equal(bitrateKbps('65432'), 65432, 'a custom value is whole Kbps, not rounded to Mbps')
  // every whole Kbps is its own chip value: a chip writes what it names (the old k / 1000 * 1000 was off for 5893 values of 1..300000, e.g. 1001)
  for (let k = 1; k <= 300000; k += 7) assert.equal(bitrateChips(k, '自动').find((c) => c.value === k)?.value, k)
  assert.equal(bitrateFromMbps(65), 65000); assert.equal(bitrateFromMbps(0), 0); assert.equal(bitrateFromMbps('abc'), 0); assert.equal(bitrateFromMbps(-3), 0)
  assert.ok(Number.isInteger(bitrateFromMbps(65.4)))
})

test('the slider position is whole Mbps (0 = automatic) and showing a value does not rewrite it', () => {
  assert.equal(bitrateSliderMbps(0), 0); assert.equal(bitrateSliderMbps(80000), 80); assert.equal(bitrateSliderMbps(65432), 65)
  assert.equal(bitrateMbpsText(65432), '65.4 Mbps'); assert.equal(bitrateMbpsText(80000), '80 Mbps'); assert.equal(bitrateMbpsText(500), '0.5 Mbps')
})

test('the chips: automatic first, the presets by size, a stored value that is none of them gets its own chip in place; none for automatic', () => {
  assert.deepEqual(BITRATE_PRESETS_MBPS, [0, 20, 40, 80, 120, 200])
  assert.deepEqual(bitrateChips(0, '自动').map((c) => c.label), ['自动', '20 Mbps', '40 Mbps', '80 Mbps', '120 Mbps', '200 Mbps'])
  assert.deepEqual(bitrateChips(undefined, '自动').map((c) => c.value), [0, 20000, 40000, 80000, 120000, 200000], 'a fresh config has no extra chip')
  assert.deepEqual(bitrateChips(80000, '自动').map((c) => c.value), [0, 20000, 40000, 80000, 120000, 200000], 'a preset is not added twice')
  const custom = bitrateChips(65432, 'Auto')
  assert.deepEqual(custom.map((c) => c.value), [0, 20000, 40000, 65432, 80000, 120000, 200000]); assert.equal(custom[3].label, '65.4 Mbps')
  assert.equal(bitrateChips(0, 'Auto', [20, 50, 100, 0])[0].label, 'Auto')
})

test('the step buttons: automatic steps up to one step, the lowest step goes back to automatic, the range is kept', () => {
  assert.equal(bitrateNudge(0, 5, 200), 5000); assert.equal(bitrateNudge(5000, -5, 200), 0); assert.equal(bitrateNudge(0, -5, 200), 0)
  assert.equal(bitrateNudge('50000', 5, 200), 55000); assert.equal(bitrateNudge(198000, 5, 200), 200000); assert.equal(bitrateNudge(250000, 5, 200), 200000)
  assert.equal(bitrateNudge(undefined, 5, 200), 5000, 'an unset key steps from automatic, not from the top of the range')
})

test('the slider names the automatic position in the track (after the icon), in the bubble and for assistive technology', () => {
  const src = read('vue/MSlider.vue')
  assert.match(src, /const isOff = \(v\) => !!props\.offText && !isRange\.value && v <= props\.min/)
  assert.match(src, /:aria-valuetext="say\(v\)"/); assert.match(src, /<output class="m-slider__bubble">\{\{ say\(v\) \}\}<\/output>/)
  assert.match(src, /'m-slider__off--icon': showIcons && iconStart/)
  const css = read('css/expressive.css')
  assert.match(css, /\.m-slider__off--icon \{ left: 50px; \}/, 'at the lowest value the icon sits on the inactive track at 16 px + 24 px wide: the name starts after it')
})

test('the home chips and rows say 自动 for 0, show a host that never wrote the key, and give a custom value a chip', () => {
  const fresh = cat({}) // the host's /api/config has no max_bitrate: the key is not in the file
  assert.equal(fresh['ctl-bitrate'].value, '0'); assert.equal(fresh['ctl-bitrate'].options[0].label, '自动')
  assert.deepEqual(fresh['ctl-bitrate'].options.map((o) => o.value), ['0', '20000', '50000', '100000', '150000'])
  assert.equal(cat({ max_bitrate: '0' })['ctl-bitrate'].value, '0')
  const custom = cat({ max_bitrate: '65432' })['ctl-bitrate']
  assert.equal(custom.value, '65432'); assert.ok(custom.options.some((o) => o.value === '65432' && o.label.startsWith('65.4')))
  assert.equal(cat({ max_bitrate: 50000 })['ctl-bitrate'].value, '50000'); assert.equal(cat({ max_bitrate: 50000 })['ctl-bitrate'].options.length, 5)
  assert.doesNotMatch(read('vue/homeCatalogue.js') + read('vue/homeCatalogueMore.js'), /T\.unlimited/, 'the ceiling 0 is 自动 (the client decides), not 不限')
})

test('a limited slider (a live session target, 1..800 Mbps) keeps the segmented scale, and the marks stand under the values of the chips', () => {
  const { min, max } = bitrateSliderSpan(1000, 800000)
  assert.deepEqual([min, max], [bitrateSliderProgress(1000), BITRATE_SLIDER_MAX_PROGRESS])
  // 48 Mbps is past the middle of the track, not at the left end of a linear one
  assert.ok((bitrateSliderProgress(48000) - min) / (max - min) > 0.5)
  const chips = [5, 10, 20, 50, 100, 200]
  const marks = bitrateChipMarks(chips, 1000, 800000)
  assert.equal(marks.length, chips.length)
  chips.forEach((m, i) => assert.equal(bitrateFromProgress(Math.round(min + marks[i] * (max - min))), m * 1000, `${m} Mbps mark is under the ${m} Mbps chip`))
  assert.ok(marks.every((f, i) => f > 0 && f <= 1 && (i === 0 || f > marks[i - 1])))
  // automatic has no mark; a preset above the limit has none
  assert.deepEqual(bitrateChipMarks([0, 20, 200], 0, 100000), [bitrateSliderProgress(20000) / bitrateSliderProgress(100000)])
})

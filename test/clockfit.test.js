// The dock clock fits its box: its header counts nothing that only the content areas of its tight lines reach past it
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readDash } from './dashSource.js'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = fs.readFileSync(path.join(root, 'src/css/clock.css'), 'utf8')

test('the clock is clipped above and below its box: the lines are tighter than their glyphs\' content areas, the header must not scroll', () => {
  assert.match(css, /\.m-dock__head > \.m-clock \{ overflow-y: clip; max-width: 100%;/)
})

test('the clock\'s size in each class is the smaller of its step and what fits the header: no size is drawn larger than its box', () => {
  for (const size of ['s', 'm', 'l', 'xl']) assert.match(css, new RegExp(`\\.m-dock__head > \\.m-clock\\.is-${size} \\{ --clock-size: max\\(28px, min\\(`))
  assert.match(css, /--clock-fit: min\(calc\(\(100cqh - var\(--clock-text-h\)\) \/ var\(--hf-now\)\), calc\(\(100cqw - var\(--clock-text-w\)\) \/ var\(--wf-now\)\)\)/)
})

test('a window offers 特大 only where there is room beside the clock; the saved size is a preference that comes back', async () => {
  const { clockSizesOffered, effectiveClockSize, CLOCK_XL_FROM } = await import('../src/appearance/appearance.js')
  assert.equal(CLOCK_XL_FROM, 840)
  assert.deepEqual(clockSizesOffered(839), ['s', 'm', 'l']); assert.deepEqual(clockSizesOffered(840), ['s', 'm', 'l', 'xl'])
  assert.equal(effectiveClockSize('xl', 412), 'l'); assert.equal(effectiveClockSize('xl', 1440), 'xl'); assert.equal(effectiveClockSize('m', 360), 'm')
  const dash = readDash(), pick = fs.readFileSync(path.join(root, 'src/vue/MAppearance.vue'), 'utf8')
  assert.match(dash, /:size="clockSizeDrawn"/); assert.match(dash, /effectiveClockSize\(appearance\.state\.clockSize, wide\.value\)/)
  assert.match(pick, /clockSizesOffered\(winWidth\.value\)/)
})

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Hct, argbFromHex } from '@material/material-color-utilities'
import { SERIES, chartColors } from '../src/tokens/chartColors.js'
import { CVD_KINDS, minDistance } from '../src/tokens/cvd.js'
import { BRAND_SEEDS, colorCss } from '../src/tokens/theme.js'

const SEEDS = [BRAND_SEEDS.light, BRAND_SEEDS.dark, '#2e9e6b', '#ff8a3d', '#8a5cf5', '#e0457b', '#12b5cb']

test('six series colours from every seed, none in the reds and ambers that belong to limits and errors', () => {
  for (const seed of SEEDS) for (const dark of [false, true]) {
    const ramp = chartColors(seed, { dark })
    assert.equal(ramp.length, SERIES); assert.equal(new Set(ramp).size, SERIES)
    for (const hex of ramp) { const h = Hct.fromInt(argbFromHex(hex)).hue; assert.ok(h >= 120 && h <= 340, `${seed} ${dark}: ${hex} hue ${h}`) }
  }
})

test('the ramp separates in colour-blind simulation and for everyone, light and dark', () => {
  for (const seed of SEEDS) for (const dark of [false, true]) {
    const ramp = chartColors(seed, { dark })
    for (const kind of CVD_KINDS) assert.ok(minDistance(ramp, kind) >= (kind === 'normal' ? 18 : 10), `${seed} ${dark ? 'dark' : 'light'} ${kind}: ${minDistance(ramp, kind).toFixed(1)}`)
  }
})

test('tones alternate: neighbouring series differ in lightness, and the ramp stays readable on the surface', () => {
  for (const dark of [false, true]) {
    const tones = chartColors(BRAND_SEEDS.light, { dark }).map((h) => Hct.fromInt(argbFromHex(h)).tone)
    for (let i = 1; i < tones.length; i++) assert.ok(Math.abs(tones[i] - tones[i - 1]) >= 8, `${dark} ${i}`)
    for (const t of tones) assert.ok(dark ? t >= 45 : t <= 67)
  }
})

test('the colours are theme tokens in both schemes, and the chart never uses primary, secondary or tertiary for a series', async () => {
  const css = colorCss(BRAND_SEEDS.light, {})
  for (let n = 1; n <= 6; n++) assert.match(css, new RegExp(`--md-sys-color-chart${n}: #`))
  const tokens = await readFile(new URL('../src/tokens/tokens.css', import.meta.url), 'utf8')
  assert.equal((tokens.match(/--md-sys-color-chart1:/g) || []).length, 2)
  const chart = await readFile(new URL('../src/vue/MChartX.vue', import.meta.url), 'utf8')
  const palette = /const COLORS = .*/.exec(chart)[0]
  assert.doesNotMatch(palette, /primary|secondary|tertiary|error|warning/)
})

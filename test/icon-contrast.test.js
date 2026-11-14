import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { schemeColors, BRAND_SEEDS } from '../src/tokens/theme.js'
import { PRESET_SEEDS } from '../src/appearance/appearance.js'

// The glyph of a list or card icon on its container: the idle pair (a glyph of the hue pulled towards on-surface, on the hue tinted into a calm surface)
// and the selected pair (the on-hue glyph on the solid hue) must both read at 4.5:1, in both themes, for every seed and scheme.
const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/css/icons-style.css'), 'utf8')
const TINT = Number(/--ico-tint:\s*([\d.]+)%/.exec(css)[1]) / 100
const GLYPH = Number(/--ico-glyph:\s*([\d.]+)%/.exec(css)[1]) / 100
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lum = (hex) => { const [r, g, b] = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
// color-mix(in srgb, hue TINT%, surface): per channel in gamma space, as the browser does
const blend = (a, b, p) => `#${rgb(a).map((c, i) => Math.round(c * p + rgb(b)[i] * (1 - p)).toString(16).padStart(2, '0')).join('')}`
const mix = (hue, base) => blend(hue, base, TINT)

const SEEDS = [...Object.values(BRAND_SEEDS), ...PRESET_SEEDS.map((p) => p.hex)]
const VARIANTS = ['vibrant', 'tonalSpot', 'expressive', 'fidelity', 'neutral']
const HUES = [['primary', 'onPrimary'], ['secondary', 'onSecondary'], ['tertiary', 'onTertiary']]

test('the idle and the selected glyph of every icon hue read at 4.5:1 for every seed, scheme and theme', () => {
  const worst = { idle: 99, selected: 99 }
  for (const seed of SEEDS) for (const variant of VARIANTS) for (const dark of [false, true]) {
    const c = schemeColors(seed, { dark, variant })
    for (const [hue, onSolid] of HUES) {
      const idle = ratio(blend(c[hue], c.onSurface, GLYPH), mix(c[hue], c.surfaceContainerHigh))
      const selected = ratio(c[onSolid], c[hue])
      worst.idle = Math.min(worst.idle, idle); worst.selected = Math.min(worst.selected, selected)
      assert.ok(idle >= 4.5, `idle ${hue} ${seed} ${variant} ${dark ? 'dark' : 'light'}: ${idle.toFixed(2)}`)
      assert.ok(selected >= 4.5, `selected ${hue} ${seed} ${variant} ${dark ? 'dark' : 'light'}: ${selected.toFixed(2)}`)
    }
  }
  assert.ok(worst.idle >= 4.5 && worst.selected >= 4.5)
})

test('the glyph sits inside the shape with room: under half of the container', () => {
  assert.match(css, /font-size:\s*calc\(var\(--ico-size\)\s*\*\s*\.4[0-9]\)/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { schemeColors, statusColors, colorCss, BRAND_SEEDS, DEFAULT_VARIANTS } from '../src/tokens/theme.js'
import { argbFromHex, Hct } from '@material/material-color-utilities'

const tone = (hex) => Hct.fromInt(argbFromHex(hex)).tone
const lum = (hex) => { const n = argbFromHex(hex); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('light and dark schemes come from the brand seeds and differ in tone', () => {
  const light = schemeColors(BRAND_SEEDS.light, { dark: false, variant: DEFAULT_VARIANTS.light })
  const dark = schemeColors(BRAND_SEEDS.dark, { dark: true, variant: DEFAULT_VARIANTS.dark })
  assert.ok(tone(light.surface) > 90)
  assert.ok(tone(dark.surface) < 15)
  assert.ok(tone(light.primary) < tone(light.primaryContainer))
})

test('text roles meet WCAG AA against their surfaces in both schemes', () => {
  for (const [seed, dark] of [[BRAND_SEEDS.light, false], [BRAND_SEEDS.dark, true]]) {
    const c = schemeColors(seed, { dark, variant: dark ? DEFAULT_VARIANTS.dark : DEFAULT_VARIANTS.light })
    const pairs = [['onSurface', 'surface'], ['onSurface', 'surfaceContainerHigh'], ['onSurfaceVariant', 'surfaceContainerHigh'], ['onPrimary', 'primary'],
      ['onPrimaryContainer', 'primaryContainer'], ['onSecondaryContainer', 'secondaryContainer'], ['onErrorContainer', 'errorContainer']]
    for (const [fg, bg] of pairs) assert.ok(ratio(c[fg], c[bg]) >= 4.5, `${dark ? 'dark' : 'light'} ${fg} on ${bg}: ${ratio(c[fg], c[bg]).toFixed(2)}`)
  }
})

test('status colours stay readable on their containers', () => {
  for (const dark of [false, true]) {
    const s = statusColors(dark ? BRAND_SEEDS.dark : BRAND_SEEDS.light, { dark })
    for (const n of ['success', 'warning']) assert.ok(ratio(s[`on${n[0].toUpperCase()}${n.slice(1)}Container`], s[`${n}Container`]) >= 4.5, n)
  }
})

test('colour css uses the property names Material Web reads', () => {
  const css = colorCss(BRAND_SEEDS.light, {})
  for (const p of ['--md-sys-color-primary:', '--md-sys-color-on-surface:', '--md-sys-color-surface-container-high:', '--md-sys-color-secondary-container:']) assert.ok(css.includes(p), p)
})

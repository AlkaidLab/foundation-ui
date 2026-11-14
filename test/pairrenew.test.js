import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { schemeColors, statusColors } from '../src/tokens/theme.js'
import { contrastRatio, hexRgb } from '../src/appearance/appearance.js'

const css = readFileSync(new URL('../src/css/dash.css', import.meta.url), 'utf8')
const charts = readFileSync(new URL('../src/css/charts.css', import.meta.url), 'utf8')
const widget = readFileSync(new URL('../src/vue/MDashWidget.vue', import.meta.url), 'utf8')

test('the renew and done buttons of the pairing tile use a container and its on-colour, not a fixed colour on the white code', () => {
  const rule = css.split('\n').find((l) => l.startsWith('.m-dpair__renew, .m-dpair__done {'))
  assert.ok(rule)
  assert.ok(!/color: #1c1b1f/.test(rule), 'no fixed colour')
  assert.match(rule, /\.m-dpair__renew \{[^}]*background: var\(--md-sys-color-primary-container\); color: var\(--md-sys-color-on-primary-container\)/)
  assert.match(rule, /\.m-dpair__done \{[^}]*background: var\(--md-sys-color-success-container\); color: var\(--md-sys-color-on-success-container\)/)
  assert.match(rule, /\.m-dpair__renew \.m-icon, \.m-dpair__done \.m-icon \{ font-size: 28px; color: inherit; \}/)
})

test('those container pairs hold the contrast of an icon and of text in light, tinted dark and true black, for every preset seed', () => {
  for (const seed of ['#4a9eff', '#d4a5a5', '#3fae7a', '#e8a33d', '#8b6ff0', '#2ab3ad']) {
    for (const [label, options] of [['light', { dark: false, variant: 'vibrant' }], ['dark', { dark: true }], ['black', { dark: true, black: true }]]) {
      const c = { ...schemeColors(seed, options), ...statusColors(seed, { dark: options.dark }) }
      for (const [bg, fg] of [['primaryContainer', 'onPrimaryContainer'], ['successContainer', 'onSuccessContainer']]) {
        assert.ok(c[bg] && c[fg], `${bg} exists`)
        assert.ok(contrastRatio(hexRgb(c[bg]), hexRgb(c[fg])) >= 4.5, `${seed} ${label} ${bg}`)
      }
    }
  }
})

test('a playing app without a cover shows the games icon on a tonal square, never a letter', () => {
  assert.ok(!/initial\(data\.name\)/.test(widget))
  assert.ok(!/initial\(a\.name\)/.test(widget))
  assert.match(widget, /<MIcon v-if="!coverOk\(data\.cover\)" name="sports_esports" \/>/)
  assert.match(charts, /\.m-dwidget__cover:not\(\[style\]\)[^{]*\{ background: var\(--md-sys-color-secondary-container\); color: var\(--md-sys-color-on-secondary-container\); \}/)
})

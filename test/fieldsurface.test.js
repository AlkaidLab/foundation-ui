import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { schemeColors, DEFAULT_VARIANTS, COLOR_STYLES } from '../src/tokens/theme.js'
import { Hct, argbFromHex, hexFromArgb } from '@material/material-color-utilities'

// The rule of a text field: a container (the M3 filled-field container colour) inside the M3 outline edge. One place, src/css/fields.css; every field inherits it.
const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
const css = read('css/fields.css')
const vueFiles = readdirSync(new URL('../src/vue/', import.meta.url)).filter((f) => f.endsWith('.vue'))

const lum = (hex) => { const n = argbFromHex(hex); const f = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('the tokens of a field: fill is surface-container-highest, the edge is the outline role (never outline-variant)', () => {
  assert.match(css, /--m-field-fill: var\(--md-sys-color-surface-container-highest\);/)
  assert.match(css, /--m-field-outline: var\(--md-sys-color-outline\);/)
  assert.match(css, /--m-field-outline-hover: var\(--md-sys-color-on-surface\);/)
  assert.match(css, /md-outlined-text-field \{[^}]*--md-outlined-text-field-outline-color: var\(--m-field-outline\);/)
  assert.match(read('css/all.css'), /@import '\.\/fields\.css';/)
})

test('the edge of a field is 3 : 1 against the fill and every surface a field sits on, in every colour style, light, dark and black (WCAG 2.2 SC 1.4.11)', () => {
  for (const style of COLOR_STYLES) for (const [dark, black] of [[false, false], [true, false], [true, true]]) for (let h = 0; h < 360; h += 15) {
    const s = schemeColors(hexFromArgb(Hct.from(h, 80, 80).toInt()), { dark, black, variant: dark ? DEFAULT_VARIANTS.dark : DEFAULT_VARIANTS.light, style })
    for (const k of ['surface', 'surfaceBright', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest']) {
      assert.ok(ratio(s.outline, s[k]) >= 3, `${style} ${dark ? (black ? 'black' : 'dark') : 'light'} hue ${h}: outline on ${k} is ${ratio(s.outline, s[k]).toFixed(2)}`)
    }
    assert.ok(ratio(s.outlineVariant, s.surfaceContainerHighest) < 3, 'outline-variant is a divider, it cannot be the edge of a field')
  }
})

test('every md-outlined-text-field of the library carries the container fill; the old ::before stand-in is gone', () => {
  for (const f of vueFiles) {
    const src = read(`vue/${f}`)
    const tags = [...src.matchAll(/<md-outlined-text-field\b[\s\S]*?<\/md-outlined-text-field>/g)]
    assert.equal(tags.length, (src.match(/<md-outlined-text-field\b/g) || []).length, `${f}: an md-outlined-text-field is not closed`)
    for (const t of tags) assert.match(t[0], /<span slot="container" class="m-field__fill"/, `${f} draws a field without the container fill`)
  }
  assert.doesNotMatch(read('css/onboard.css'), /\.m-field::before/)
})

test('no field is coloured by the page: nobody sets the outline of an md-outlined-text-field except fields.css, and nobody uses outline-variant for it', () => {
  const dir = new URL('../src/css/', import.meta.url)
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.css') && x !== 'fields.css')) {
    const text = read(`css/${f}`)
    assert.doesNotMatch(text, /--md-outlined-text-field-outline-color: var\(--md-sys-color-outline-variant\)/, f)
  }
  for (const f of vueFiles) assert.doesNotMatch(read(`vue/${f}`), /--md-outlined-text-field-outline-color: var\(--md-sys-color-outline-variant\)/, f)
})

test('a field keeps its states: disabled container, error edge, focus edge, hover edge; a native .m-input has the same four', () => {
  assert.match(css, /md-outlined-text-field\[disabled\] \.m-field__fill \{ background: var\(--m-field-fill-disabled\); \}/)
  assert.match(css, /\.m-input \{[^}]*border: 1px solid var\(--m-field-outline\);[^}]*background: var\(--m-field-fill\);/)
  assert.match(css, /\.m-input:hover:not\(:disabled\) \{ border-color: var\(--m-field-outline-hover\); \}/)
  assert.match(css, /\.m-input:focus, \.m-input:focus-visible \{ border-color: var\(--md-sys-color-primary\)/)
  assert.match(css, /\.m-input\[aria-invalid='true'\][^{]*\{ border-color: var\(--md-sys-color-error\)/)
  assert.match(css, /\.m-input:disabled \{ background: var\(--m-field-fill-disabled\)/)
})

test('the native text inputs of the library are .m-input, and their own rules only set size and type', () => {
  const classes = { 'MPathItem.vue': 'm-path__input', 'MListEditor.vue': 'm-list__input', 'MFpsPresets.vue': 'm-fps__input', 'MConnectPanel.vue': 'm-conn__name', 'MModeList.vue': 'm-modes__input' }
  for (const [file, cls] of Object.entries(classes)) assert.match(read(`vue/${file}`), new RegExp(`class="${cls} m-input"`), file)
  assert.match(read('vue/MAppearance.vue'), /<input v-model="url" class="m-input" type="url"/)
  const surface = /^\.(m-path__input|m-list__input|m-fps__input|m-conn__name|m-modes__input)\b[^{]*\{[^}]*(background|border:|outline|box-shadow)/m
  for (const f of ['css/settings.css', 'css/connect.css', 'vue/MModeList.vue']) assert.doesNotMatch(read(f), surface, f)
  assert.match(read('css/expressive.css'), /\.m-filterbar \{[^}]*background: var\(--m-field-fill\); box-shadow: inset 0 0 0 1px var\(--m-field-outline\)/)
})

test('a field in a group keeps the group row behaviour of the day before (card row, corners, 2 px seam)', () => {
  const n = read('css/notify.css')
  assert.match(n, /\.m-group:has\(> \.m-item\) > \.m-fieldrow \{ background: var\(--m-card\)/)
  assert.match(n, /\.m-group:has\(> \.m-item\):has\(> \.m-fieldrow\) \{ gap: 2px; \}/)
})

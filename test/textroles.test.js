// The accent as the colour of words: each scheme has primaryText, secondaryText, tertiaryText, 4.5 : 1 on every surface text sits on, the fills untouched
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { schemeColors, textColour, COLOR_STYLES, DEFAULT_VARIANTS } from '../src/tokens/theme.js'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); const f = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const SURF = ['surface', 'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'surfaceVariant']

test('every style, mode and a spread of seeds: the three text roles are 4.5 : 1 on every surface', () => {
  for (const style of COLOR_STYLES) for (const [dark, black] of [[false, false], [true, false], [true, true]]) for (const seed of ['#ffd54f', '#f4c20d', '#a8d5a2', '#4a9eff', '#d4a5a5', '#ff80ab', '#7e57c2', '#cddc39']) {
    const r = schemeColors(seed, { dark, black, style, variant: dark ? DEFAULT_VARIANTS.dark : DEFAULT_VARIANTS.light })
    for (const role of ['primaryText', 'secondaryText', 'tertiaryText']) for (const s of SURF) assert.ok(ratio(r[role], r[s]) >= 4.5, `${style} ${dark ? (black ? 'black' : 'dark') : 'light'} ${seed} ${role} on ${s}: ${ratio(r[role], r[s]).toFixed(2)}`)
  }
})

test('a fill that already reads as text is its own text role; one that does not moves along its own hue towards the readable side only', () => {
  assert.equal(textColour('#003366', ['#ffffff', '#f0f0f0'], { dark: false }), '#003366')
  const gold = textColour('#e0a800', ['#ffffff', '#ece6f0'], { dark: false })
  assert.notEqual(gold, '#e0a800'); assert.ok(ratio(gold, '#ece6f0') >= 4.5)
  const pale = textColour('#35405a', ['#141218', '#2b2930'], { dark: true })
  assert.ok(ratio(pale, '#2b2930') >= 4.5 && lum(pale) > lum('#35405a'))
})

test('the fills are not changed by the text roles, and the sheet of tokens carries them', () => {
  const r = schemeColors('#f4c20d', { dark: false, style: 'bright' })
  assert.ok(r.primary && r.primaryText && r.primary !== r.primaryText)
  const css = fs.readFileSync(path.join(root, 'src/tokens/tokens.css'), 'utf8')
  for (const role of ['primary-text', 'secondary-text', 'tertiary-text']) assert.equal(css.split(`--md-sys-color-${role}:`).length - 1, 2, `${role} is in both schemes of tokens.css`)
})

test('no stylesheet reads the accent as the colour of words straight from the fill (the clock faces draw large display digits and keep their colours)', () => {
  const walk = (dir) => fs.readdirSync(path.join(root, dir)).map((f) => path.join(dir, f))
  for (const f of [...walk('src/css'), ...walk('src/vue')].filter((x) => /\.(css|vue)$/.test(x) && !/clock\.css$/.test(x))) {
    const text = fs.readFileSync(path.join(root, f), 'utf8')
    assert.doesNotMatch(text, /(?<![-\w])color: var\(--md-sys-color-(primary|secondary|tertiary)\)/, `${f}: use the -text role for words`)
  }
})

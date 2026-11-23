// The scrollbar rule (css/scrollbar.css): thin, wider under the pointer, pill shaped, Material colour roles, persistent, no layout shift, touch and forced colours left alone.
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { SCROLLBAR_RULES, SCROLLBAR_SHEET, adoptScrollbar } from '../src/css/scrollbarRules.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const read = (p) => fs.readFileSync(here + '../src/' + p, 'utf8')
const css = read('css/scrollbar.css')

test('the rule: a 12 px track, a 4 px thumb that is 8 px wide under the pointer, shown while scrolling and faded out after, a pill, 48 px long at least, no arrow buttons', () => {
  assert.match(css, /--m-sb-size: 12px;/)
  assert.match(css, /\*::-webkit-scrollbar-thumb \{ background-color: transparent; background-clip: padding-box; border: 4px solid transparent; border-radius: 9999px; min-height: 48px; min-width: 48px; transition: background-color 240ms linear; \}/)
  assert.match(css, /\*\[data-sb-on\]::-webkit-scrollbar-thumb \{ background-color: var\(--m-sb-thumb\); \}/)
  assert.match(css, /::-webkit-scrollbar-thumb:hover \{ background-color: var\(--m-sb-thumb-hover\); border-width: 2px; \}/)
  assert.match(css, /::-webkit-scrollbar-thumb:active \{ background-color: var\(--m-sb-thumb-active\); border-width: 2px; \}/)
  assert.match(css, /::-webkit-scrollbar-button \{ display: none; width: 0; height: 0; \}/)
  assert.match(css, /::-webkit-scrollbar-track \{ background: transparent; \}/)
})

test('the colours are the Material roles: outline, on-surface-variant, on-surface', () => {
  assert.match(css, /--m-sb-thumb: var\(--md-sys-color-outline\);/)
  assert.match(css, /--m-sb-thumb-hover: var\(--md-sys-color-on-surface-variant\);/)
  assert.match(css, /--m-sb-thumb-active: var\(--md-sys-color-on-surface\);/)
})

test('touch devices and forced colours keep the system scrollbar; Firefox gets the standard pair', () => {
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) and \(not \(forced-colors: active\)\)/)
  assert.match(css, /@supports not selector\(::-webkit-scrollbar\) \{ \* \{ scrollbar-width: thin; scrollbar-color: var\(--m-sb-thumb\) transparent; \} \}/)
})

test('no rule of the shell turns the ::-webkit-scrollbar rules off: scrollbar-width is only `none` (a strip that hides its bar), scrollbar-color only in the Firefox fallback', () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name]))
  const files = walk(here + '../src').filter((f) => /\.(css|vue)$/.test(f))
  const bad = []
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8')
    if (/\/css\/scrollbar\.css$/.test(f)) continue
    for (const m of text.matchAll(/scrollbar-width:\s*(thin|auto)|scrollbar-color:/g)) bad.push(`${f.replace(here, '')}: ${m[0]}`)
  }
  assert.deepEqual(bad, [])
})

test('the shadow-root copy (the menu) is the same rule as the page copy', () => {
  const block = css.slice(css.indexOf('/* shadow:begin */') + '/* shadow:begin */'.length, css.indexOf('/* shadow:end */')).split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
  assert.equal(block, SCROLLBAR_RULES)
  assert.ok(SCROLLBAR_SHEET.startsWith('@media (hover: hover) and (pointer: fine) and (not (forced-colors: active)) { @supports selector(::-webkit-scrollbar) {'))
  assert.equal(adoptScrollbar(null), false)
  assert.equal(adoptScrollbar({}), false)
})

test('the menu adopts the rule into its shadow root, and the file is part of all.css', () => {
  assert.ok(read('vue/MMenu.vue').includes('scrollbarRef(el)') && read('vue/MMenuEntries.vue').includes(':ref="scrollbarRef"'))
  assert.ok(read('css/all.css').includes("@import './scrollbar.css';"))
})

// the contrast of the thumb on the surfaces it sits on: WCAG 1.4.11 asks 3:1 for a control's boundary; the baseline theme's outline role is built for it
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
test('the thumb role (outline) has 3:1 against the surfaces of the baseline light and dark scheme', () => {
  const light = { outline: '#79747E', surface: '#FEF7FF', container: '#F3EDF7', low: '#F7F2FA' }
  const dark = { outline: '#938F99', surface: '#141218', container: '#211F26', low: '#1D1B20' }
  for (const s of [light, dark]) for (const k of ['surface', 'container', 'low']) assert.ok(ratio(s.outline, s[k]) >= 3, `${s.outline} on ${s[k]}: ${ratio(s.outline, s[k]).toFixed(2)}`)
})

test('the thumb shows while a container scrolls and is taken off 1 s after the last scroll', async () => {
  const { watchScrolling, SCROLLBAR_FADE_MS } = await import('../src/css/scrollbarRules.js')
  assert.equal(SCROLLBAR_FADE_MS, 1000)
  const seen = {}
  const root = { addEventListener: (type, fn, opts) => { seen.type = type; seen.fn = fn; seen.opts = opts } }
  assert.equal(watchScrolling(root), true); assert.equal(seen.type, 'scroll'); assert.equal(seen.opts.capture, true, 'scroll does not bubble')
  const attrs = new Set(); const el = { nodeType: 1, setAttribute: (n) => attrs.add(n), removeAttribute: (n) => attrs.delete(n) }
  const realSet = globalThis.setTimeout; const calls = []
  globalThis.setTimeout = (fn, ms) => { calls.push([fn, ms]); return calls.length }
  try {
    seen.fn({ target: el }); assert.ok(attrs.has('data-sb-on')); assert.equal(calls.at(-1)[1], 1000)
    calls.at(-1)[0](); assert.ok(!attrs.has('data-sb-on'))
  } finally { globalThis.setTimeout = realSet }
  assert.equal(watchScrolling(null), false)
})

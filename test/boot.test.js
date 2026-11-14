import test from 'node:test'
import assert from 'node:assert/strict'
import { BOOT_KEY, BOOT_VERSION, bootLayersCss, parseBoot, persistBoot, prefixThemeCss } from '../src/appearance/boot.js'
import { colorCss } from '../src/tokens/theme.js'

const css = `:root, [data-bs-theme='light'], [data-theme='light'] {\n${colorCss('#4a9eff', { dark: false, variant: 'vibrant' })}\n}\n[data-bs-theme='dark'], [data-theme='dark'] {\n${colorCss('#4a9eff', { dark: true })}\n}\n`
const good = { v: BOOT_VERSION, mode: 'dark', dark: 'black', css, scrim: { light: 0.4, dark: 0.55 }, blur: 32, thumb: 'data:image/jpeg;base64,/9j/4AAQ', gradient: '' }

test('the record of the last authenticated load is read back as it was, and anything damaged is no record', () => {
  const r = parseBoot(JSON.stringify(good))
  assert.equal(r.mode, 'dark'); assert.equal(r.dark, 'black'); assert.equal(r.blur, 32)
  assert.deepEqual(r.scrim, { light: 0.4, dark: 0.55 })
  assert.equal(r.thumb, good.thumb)
  for (const bad of [null, 'x', '{', JSON.stringify({ ...good, v: BOOT_VERSION + 1 }), JSON.stringify({ ...good, css: '' }), JSON.stringify({ ...good, css: 'a { color: red }' })]) assert.equal(parseBoot(bad), null)
  // a picture that is not a small data image is dropped (the colours still make a page), a gradient must be a plain gradient
  assert.equal(parseBoot({ ...good, thumb: 'https://evil.example/x.png' }).thumb, '')
  assert.equal(parseBoot({ ...good, thumb: 'data:image/jpeg;base64,' + 'A'.repeat(50000) }).thumb, '')
  assert.equal(parseBoot({ ...good, gradient: 'url(x); } body { display: none' }).gradient, '')
  assert.equal(parseBoot({ ...good, mode: 'blue' }).mode, 'system'); assert.equal(parseBoot({ ...good, dark: 'x' }).dark, 'tinted')
})

test('the boot copy of the colours wins over the static tokens whichever stylesheet comes first', () => {
  const out = prefixThemeCss(css)
  assert.match(out, /^html:root, \[data-bs-theme='light'\]/)
  assert.match(out, /\nhtml\[data-bs-theme='dark'\], \[data-theme='dark'\] \{/)
  assert.equal((out.match(/--md-sys-color-surface:/g) || []).length, 2)
})

test('the boot layer is one pseudo-element of the root: the frost over the picture, and plain surface tone without a picture', () => {
  const withPicture = bootLayersCss(parseBoot(good), true)
  assert.match(withPicture, /html\.m-boot::after \{[^}]*linear-gradient\(to bottom, color-mix\(in srgb, var\(--m-page-solid\) 55%, transparent\), color-mix\(in srgb, var\(--m-fade-tone\) max\(55%, 94%\), transparent\)\), url\("data:image\/jpeg/)
  assert.ok(!/::before/.test(withPicture), 'the app takes the root ::before away when its wallpaper starts')
  assert.match(withPicture, /\.m-login \{ background: transparent !important; \}/)
  assert.match(bootLayersCss(parseBoot({ ...good, thumb: '' }), false), /color-mix\(in srgb, var\(--m-page-solid\) 0%, transparent\)/)
})

test('persistBoot keeps the applied colours, the choice, the frost of the other pages and a tiny copy of the picture', () => {
  const store = new Map()
  const storage = { setItem: (k, v) => store.set(k, v), getItem: (k) => store.get(k) ?? null }
  const prev = globalThis.document
  const style = { values: { '--m-scrim-light': '0.3', '--m-scrim-dark': '0.6', '--m-wp-blur': '4px' }, getPropertyValue(k) { return this.values[k] || '' } }
  globalThis.document = { getElementById: (id) => (id === 'foundation-ui-theme' ? { textContent: css } : null), createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,/9j/AAAA' }) }
  try {
    const r = persistBoot({ style }, { mode: 'light', dark: 'tinted', other: { blur: 28, dim: 0.5 } }, { img: { naturalWidth: 1600, naturalHeight: 900 }, picture: { focus: { x: 0.6, y: 0.5 } }, gradient: '' }, storage)
    assert.equal(r.blur, 28, 'the overview frost (4 px) is not what the sign-in page shows')
    assert.deepEqual(r.scrim, { light: 0.5, dark: 0.6 }, 'never lighter than the frost of the other pages')
    assert.equal(JSON.parse(store.get(BOOT_KEY)).mode, 'light')
    assert.match(JSON.parse(store.get(BOOT_KEY)).thumb, /^data:image\/jpeg/)
    // a solid window has no picture
    assert.equal(persistBoot({ style }, { mode: 'dark', dark: 'black' }, null, storage).thumb, '')
    // without a theme style there is nothing to keep
    globalThis.document = { getElementById: () => null }
    assert.equal(persistBoot({ style }, { mode: 'dark' }, null, storage), null)
  } finally { globalThis.document = prev }
})

test('the sign-in page has no background of its own: the app\'s wallpaper or surface shows through', async () => {
  const { readFileSync } = await import('node:fs')
  const auth = readFileSync(new URL('../src/css/auth.css', import.meta.url), 'utf8')
  assert.match(auth, /\.m-login \{[^}]*background: transparent;/)
  const apply = readFileSync(new URL('../src/appearance/apply.js', import.meta.url), 'utf8')
  assert.match(apply, /persistBoot\(root, s, null\)/); assert.match(apply, /persistBoot\(root, s, \{ img, picture, gradient/)
})

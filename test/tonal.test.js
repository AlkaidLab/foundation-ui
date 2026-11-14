import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULT_GRADIENT } from '../src/appearance/appearance.js'
import { parseBoot, BOOT_VERSION } from '../src/appearance/boot.js'
import { colorCss, schemeColors } from '../src/tokens/theme.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the tonal backdrop: three blobs of the primary, tertiary and secondary containers over the surface, images only', () => {
  for (const role of ['primary-container', 'tertiary-container', 'secondary-container']) assert.match(DEFAULT_GRADIENT, new RegExp(`var\\(--md-sys-color-${role}\\)`))
  assert.equal((DEFAULT_GRADIENT.match(/radial-gradient\(/g) || []).length, 3)
  // it is used as a background-image: the last layer is an image too, never a bare colour
  assert.match(DEFAULT_GRADIENT, /, linear-gradient\(var\(--md-sys-color-surface\), var\(--md-sys-color-surface\)\)$/)
  assert.ok(!/url\(|;|\{|\}/.test(DEFAULT_GRADIENT))
})

test('how much of the tones shows: a lot in light, less in 深色, a hint in 纯黑 (it stays very dark)', () => {
  const css = read('../src/css/shell-blend.css')
  assert.match(css, /:root \{ --m-tonal-k: 70%; \}/)
  assert.match(css, /html\[data-bs-theme='dark'\] \{ --m-tonal-k: 45%; \}/)
  assert.match(css, /html\[data-bs-theme='dark'\]\[data-dark='black'\] \{ --m-tonal-k: 22%; \}/)
  // the strongest tone of the black variant over its black surface is still dark
  const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, v) => a + v, 0) / 3
  const c = schemeColors('#4a9eff', { dark: true, black: true })
  const mixed = (tone) => lum(c.surface) * 0.78 + lum(tone) * 0.22
  assert.ok(mixed(c.primaryContainer) < 60 && mixed(c.secondaryContainer) < 60 && mixed(c.tertiaryContainer) < 60)
})

test('a window with no wallpaper goes through the wallpaper pipeline with that gradient, and its record keeps the gradient for the first frame of the sign-in page', () => {
  const apply = read('../src/appearance/apply.js')
  assert.match(apply, /const tonal = !url\n  if \(tonal\) url = 'gradient'/)
  assert.match(apply, /root\.dataset\.wallpaper = tonal \? 'solid' : 'wallpaper'/)
  assert.match(apply, /gradient: next\.gradient \? css : ''/)
  const record = parseBoot({ v: BOOT_VERSION, mode: 'light', dark: 'tinted', css: colorCss('#4a9eff', {}), scrim: { light: 0.5, dark: 0.5 }, blur: 32, thumb: '', gradient: DEFAULT_GRADIENT })
  assert.equal(record.gradient, DEFAULT_GRADIENT)
  assert.equal(parseBoot({ v: BOOT_VERSION, css: colorCss('#4a9eff', {}), gradient: 'radial-gradient(red 0%, blue 100%), url(https://x/y.png)' }).gradient, '')
  assert.equal(parseBoot({ v: BOOT_VERSION, css: colorCss('#4a9eff', {}), gradient: 'linear-gradient(red, blue); body { display: none }' }).gradient, '')
})

test('the sign-in card after the Google sign-in page: two panes on a wide window, outlined fields, checkboxes, the actions at the bottom right, the language and the links under the card', () => {
  const page = read('../src/vue/MLoginPage.vue')
  const css = read('../src/css/auth.css')
  assert.match(page, /class="m-login__aside"/); assert.match(page, /class="m-login__form"/)
  assert.equal((page.match(/<MField /g) || []).length, 3)
  assert.equal((page.match(/<md-checkbox /g) || []).length, 2); assert.ok(!/MSwitchItem|MFieldItem|MBanner/.test(page))
  assert.match(page, /m-login__actions[\s\S]*m-login__forgot[\s\S]*m-login__submit/)
  assert.match(page, /<button v-if="mode === 'signin'" type="button" class="m-login__forgot"/, '忘记密码？ is a button that answers in place, not a link out')
  assert.ok(!/forgotUrl|forgot-url/.test(page) && !/<a [^>]*m-login__forgot/.test(page), 'no link to the website')
  assert.ok(page.indexOf('</section>') < page.indexOf('<footer class="m-login__foot"'), 'the footer is outside the card')
  // the breakpoints of the Google page: no card under 600, a card 480 wide up to 899, two panes from 900 in a card of the window less 400 (840 at the least, 1040 at the most)
  assert.match(css, /@media \(max-width: 599\.98px\) \{[\s\S]*?\.m-login__card \{ width: 100%; flex: 1; border-radius: 0;/)
  assert.match(css, /\.m-login__card, \.m-login__foot \{ width: min\(480px, 100%\)/)
  assert.match(css, /@media \(min-width: 900px\) \{\s*\.m-login__card, \.m-login__foot \{ width: clamp\(840px, calc\(100vw - 400px\), 1040px\); \}\s*\.m-login__card \{ grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\); gap: 48px/)
  assert.match(css, /\.m-login__card \{[^}]*padding: 36px; border-radius: 28px/)
  assert.match(css, /\.m-login__title \{[^}]*--m-display-small/)
})

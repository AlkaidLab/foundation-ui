import test from 'node:test'
import assert from 'node:assert/strict'
import { schemeColors, applyTheme, COLOR_STYLES, DEFAULT_STYLE, DEFAULT_VARIANTS } from '../src/tokens/theme.js'
import { muddyRoles, hctOf } from '../src/tokens/muddy.js'
import { DEFAULTS, PRESET_SEEDS, WALLPAPER_SEEDS, normalize, seedFor } from '../src/appearance/appearance.js'
import { seedsOf } from '../src/appearance/pictureSeeds.js'
import { Hct, argbFromHex, hexFromArgb, sourceColorFromImageBytes } from '@material/material-color-utilities'

const lum = (hex) => { const n = argbFromHex(hex); const f = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const seedOf = (h, c = 80, t = 80) => hexFromArgb(Hct.from(h, c, t).toInt())
const LABELS = [['primary', 'onPrimary'], ['primaryContainer', 'onPrimaryContainer'], ['secondary', 'onSecondary'], ['secondaryContainer', 'onSecondaryContainer'], ['tertiary', 'onTertiary'], ['tertiaryContainer', 'onTertiaryContainer'], ['heroSurface', 'onHeroSurface']]
const MODES = [[false, false], [true, false], [true, true]]
const scheme = (seed, style, dark = false, black = false) => schemeColors(seed, { dark, black, variant: dark ? DEFAULT_VARIANTS.dark : DEFAULT_VARIANTS.light, style })

test('the styles are 清亮 (bright, the default), 经典 (classic) and 素雅 (quiet)', () => {
  assert.deepEqual([...COLOR_STYLES], ['bright', 'classic', 'quiet'])
  assert.equal(DEFAULT_STYLE, 'bright'); assert.equal(DEFAULTS.colorStyle, 'bright')
  assert.throws(() => schemeColors('#4a9eff', { style: 'loud' }), /unknown colour style/)
})

test('清亮 and 素雅, for every hue, in light, dark and black: no muddy role, every label 4.5 : 1, the track 3 : 1 against the surface and the thumb 3 : 1 against the track', () => {
  for (const style of ['bright', 'quiet']) for (const [dark, black] of MODES) for (let h = 0; h < 360; h += 15) for (const [c, t] of [[80, 80], [40, 55], [100, 90]]) {
    const r = scheme(seedOf(h, c, t), style, dark, black)
    const where = `${style} ${dark ? (black ? 'black' : 'dark') : 'light'} hue ${h} C${c} T${t}`
    assert.deepEqual(muddyRoles(r, { dark }).map((m) => m.role), [], where)
    for (const [f, o] of LABELS) assert.ok(ratio(r[f], r[o]) >= 4.5, `${where}: ${o} on ${f} ${ratio(r[f], r[o]).toFixed(2)}`)
    assert.ok(ratio(r.track, r.surface) >= 3, `${where}: track on surface ${ratio(r.track, r.surface).toFixed(2)}`)
    assert.ok(ratio(r.onTrack, r.track) >= 3, `${where}: thumb on track ${ratio(r.onTrack, r.track).toFixed(2)}`)
  }
})

test('经典 is the scheme of the library as it was: the brand blue gives the same primary and containers, the hero card and the track are the primary', () => {
  const light = scheme('#4a9eff', 'classic'), dark = scheme('#d4a5a5', 'classic', true)
  assert.equal(light.primary, '#005ca8'); assert.equal(light.primaryContainer, '#57a3ff'); assert.equal(dark.primary, '#f8b6b6'); assert.equal(dark.primaryContainer, '#764546')
  for (const r of [light, dark]) { assert.equal(r.heroSurface, r.primary); assert.equal(r.onHeroSurface, r.onPrimary); assert.equal(r.track, r.primary); assert.equal(r.onTrack, r.onPrimary) }
  // the library has muddy roles for a yellow seed: that is what the other two styles are for
  assert.ok(muddyRoles(scheme(seedOf(90), 'classic'), { dark: false }).length > 0)
})

test('清亮: the hero card and the containers are pale (tone 88 or more) with dark text; a yellow seed gets a clean amber accent, other hues keep the seed hue', () => {
  for (let h = 0; h < 360; h += 30) {
    const r = scheme(seedOf(h), 'bright')
    assert.ok(hctOf(r.heroSurface).tone >= 88 && hctOf(r.onHeroSurface).tone <= 12, `hue ${h}`)
    assert.ok(hctOf(r.primaryContainer).tone >= 88, `hue ${h}`)
  }
  const yellow = hctOf(scheme(seedOf(91), 'bright').primary)
  assert.ok(yellow.hue >= 60 && yellow.hue <= 80 && yellow.tone >= 54 && yellow.chroma >= 45, JSON.stringify(yellow)) // amber: the hue turned towards orange, light enough, strongly chromatic
  for (const h of [200, 255, 300, 340]) {
    const seedHue = Hct.fromInt(argbFromHex(seedOf(h))).hue
    assert.ok(Math.abs(hctOf(scheme(seedOf(h), 'bright').primary).hue - seedHue) < 14, `hue ${h}`)
  }
  assert.ok(hctOf(scheme(seedOf(91), 'bright', true).heroSurface).tone >= 80) // the dark scheme's hero card is pale too
})

test('素雅: near-neutral surfaces and hero card, a bright accent, and a darker track so that a toggle keeps 3 : 1', () => {
  for (let h = 0; h < 360; h += 30) {
    const light = scheme(seedOf(h), 'quiet'), dark = scheme(seedOf(h), 'quiet', true)
    for (const k of ['surface', 'surfaceContainer', 'surfaceContainerHighest', 'heroSurface']) assert.ok(hctOf(light[k]).chroma <= 6, `hue ${h} light ${k} ${hctOf(light[k]).chroma}`)
    for (const k of ['surface', 'surfaceContainerHigh', 'heroSurface']) assert.ok(hctOf(dark[k]).chroma <= 6, `hue ${h} dark ${k}`)
    assert.ok(hctOf(light.primary).tone >= 68, `hue ${h}: the accent is bright`)
    assert.ok(hctOf(light.track).tone < hctOf(light.primary).tone, `hue ${h}: the track is darker than the accent`)
  }
})

test('the style is part of the theme: the sheets differ, and the picker offers every style', () => {
  const docs = {}
  for (const style of COLOR_STYLES) {
    const el = { ownerDocument: { getElementById: (id) => docs[id] || null, createElement: () => ({}), head: { appendChild: (n) => { docs[n.id] = n } } } }
    applyTheme(el, { light: '#e8b900', dark: '#e8b900', style })
    docs[`css-${style}`] = docs['foundation-ui-theme'].textContent
    delete docs['foundation-ui-theme']
  }
  assert.notEqual(docs['css-bright'], docs['css-classic']); assert.notEqual(docs['css-quiet'], docs['css-classic']); assert.notEqual(docs['css-bright'], docs['css-quiet'])
  for (const style of COLOR_STYLES) assert.match(docs[`css-${style}`], /--md-sys-color-hero-surface: #[0-9a-f]{6}/); for (const style of COLOR_STYLES) assert.match(docs[`css-${style}`], /--md-sys-color-track: #[0-9a-f]{6}/)
})

test('the appearance keeps the style and the wallpaper seed per interface, with defaults and limits', () => {
  assert.equal(normalize(null).colorStyle, 'bright'); assert.equal(normalize({ colorStyle: 'quiet' }).colorStyle, 'quiet'); assert.equal(normalize({ colorStyle: 'x' }).colorStyle, 'bright')
  assert.equal(normalize({ seedIndex: 9 }).seedIndex, WALLPAPER_SEEDS - 1); assert.equal(normalize({ seedIndex: -3 }).seedIndex, 0); assert.equal(normalize({ seedIndex: 2 }).seedIndex, 2)
  for (const id of ['red', 'orange', 'yellow', 'green', 'blue', 'pink', 'violet', 'teal', 'amber', 'rose']) assert.ok(PRESET_SEEDS.some((p) => p.id === id), id)
  const s = normalize({ color: 'wallpaper', background: 'wallpaper', seedIndex: 2 })
  assert.equal(seedFor(s, ['#111111', '#222222', '#333333', '#444444']).light, '#333333')
  assert.equal(seedFor(s, ['#111111']).light, '#111111') // a picture with fewer seeds
  assert.equal(seedFor(normalize({ color: 'wallpaper', background: 'wallpaper' }), '#abcdef').light, '#abcdef') // an old stored read: one seed
})

test('a picture gives up to four seeds of distinct hues, the first is the one Material You has always taken', () => {
  const W = 64, H = 64, bytes = new Uint8ClampedArray(W * H * 4)
  const blocks = [[220, 40, 40], [40, 160, 70], [50, 90, 220], [235, 190, 20]]
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) { const b = blocks[(x < 32 ? 0 : 1) + (y < 32 ? 0 : 2)]; const i = (y * W + x) * 4; bytes[i] = b[0]; bytes[i + 1] = b[1]; bytes[i + 2] = b[2]; bytes[i + 3] = 255 }
  const seeds = seedsOf(bytes)
  assert.ok(seeds.length >= 3 && seeds.length <= 4, seeds.join())
  assert.equal(seeds[0], hexFromArgb(sourceColorFromImageBytes(bytes)))
  const hues = seeds.map((hex) => Hct.fromInt(argbFromHex(hex)).hue)
  for (let i = 0; i < hues.length; i += 1) for (let j = i + 1; j < hues.length; j += 1) assert.ok(Math.min(Math.abs(hues[i] - hues[j]), 360 - Math.abs(hues[i] - hues[j])) > 15, seeds.join())
})

test('the wallpaper pipeline passes the list of seeds on (readPicture keeps seeds, the page offers them)', async () => {
  const fs = await import('node:fs')
  const apply = fs.readFileSync(new URL('../src/appearance/apply.js', import.meta.url), 'utf8')
  assert.match(apply, /const \{ stats, seed, seeds \} = await readPicturePalette\(url, \{ timeout \}\)/)
  assert.match(apply, /seeds: seeds\?\.length \? seeds : \[seed\]/)
  assert.match(apply, /const imageSeeds = colourPic\.seeds\?\.length \? colourPic\.seeds : \[colourPic\.seed\]/)
  assert.match(apply, /export const pictureSeeds = \(\) => pictureSeedList/)
})

test('the colour section: 自定义 is an action (neutral swatch, eyedropper, tooltip) until a colour is chosen, and a swatch hardly told from its card gets a ring', async () => {
  const fs = await import('node:fs')
  const vue = fs.readFileSync(new URL('../src/vue/MAppearance.vue', import.meta.url), 'utf8')
  const css = fs.readFileSync(new URL('../src/css/colourstyle.css', import.meta.url), 'utf8')
  assert.match(vue, /m-ap__swatch--custom has-ring/)
  assert.match(vue, /'--sw': s\.color === 'custom' \? s\.custom : 'var\(--md-sys-color-surface-container-highest\)'/)
  assert.match(vue, /:title="T\.custom" :data-tip="T\.custom"/)
  assert.match(vue, /const ringed = \(hex\) =>[^\n]*contrastRatio\(hexRgb\(hex\), hexRgb\(cardHex\.value\)\) < 1\.6/)
  assert.match(vue, /m-ap__swatch--seed" :class="\{ 'has-ring': ringed\(hex\) \}"/)
  assert.match(css, /\.m-ap__colours \.m-ap__swatch--custom \.m-icon \{ opacity: 1;/) // the eyedropper is always there
  assert.match(css, /\.m-ap__colours \.m-ap__swatch\.has-ring::before \{ content: ''; position: absolute; inset: 1\.5px; background: var\(--sw/) // the ring follows the cookie shape
})

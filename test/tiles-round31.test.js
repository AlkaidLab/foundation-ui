import { test } from 'node:test'
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { Hct, argbFromHex } from '@material/material-color-utilities'
import { heroTint, contrast, MUDDY, mix, PILL } from '../src/vue/tiles/heroTint.js'
import { DEFAULTS, normalize } from '../src/appearance/appearance.js'
import { boldOn, setBold, registerTile, designOf } from '../src/vue/tiles/registry.js'
import { coverOf } from '../src/vue/tileCover.js'
import { statsOf, firstNumber, designProps } from '../src/vue/tiles/tileData.js'
import { codecName, platformName } from '../src/settings/model.js'
import { buildHomeModel, homeTexts } from '../src/vue/homeModel.js'
import { buildCatalogue } from '../src/vue/homeCatalogue.js'
import { buildCards } from '../src/vue/homeCards.js'

// the calibrated tiles (src/vue/tiles/cal/, docs/tile-kit.md)

test('the hero takes clean colours from a cover: every pair passes WCAG, a grey cover keeps the theme', () => {
  const seeds = ['#4a9eff', '#3f8f2a', '#c9a227', '#d23c3c', '#9a7b2e', '#7a3fb0', '#00a3a3', '#e07a3a']
  for (const s of seeds) for (const dark of [false, true]) for (const solid of [false, true]) {
    const r = heroTint(s, dark, solid)
    assert.ok(r, `${s} ${dark ? 'dark' : 'light'} ${solid ? 'solid' : 'soft'} gives colours`)
    assert.ok(contrast(r.fg, r.bg) >= 4.5, `${s}: text on the card ${contrast(r.fg, r.bg).toFixed(2)}`)
    assert.ok(contrast(r.glyph, r.btn) >= 3, `${s}: glyph on the button ${contrast(r.glyph, r.btn).toFixed(2)}`)
    const pill = mix(r.fg, r.bg, PILL)
    assert.ok(contrast(r.fg, pill) >= 4.5, `${s}: the pill's text ${contrast(r.fg, pill).toFixed(2)}`)
    assert.ok(contrast(r.dot, pill) >= 3, `${s}: the state dot on the pill ${contrast(r.dot, pill).toFixed(2)}`)
  }
  for (const grey of ['#888888', '#202020', '#f0f0f0']) assert.equal(heroTint(grey, true), null)
  assert.equal(heroTint('not a colour'), null)
})

test('yellow and olive covers do not turn the dark hero muddy: the dark card is near-neutral, the button bright', () => {
  for (const s of ['#c9a227', '#9a7b2e', '#8a8a20']) {
    const h = Hct.fromInt(argbFromHex(s))
    assert.ok(h.hue >= MUDDY[0] && h.hue <= MUDDY[1], `${s} is in the muddy band (${h.hue.toFixed(0)}°)`)
    const r = heroTint(s, true)
    const bg = Hct.fromInt(argbFromHex(r.bg)), btn = Hct.fromInt(argbFromHex(r.btn))
    assert.ok(bg.chroma <= 10, `${s}: dark card chroma ${bg.chroma.toFixed(1)}`)
    assert.ok(btn.tone >= 78, `${s}: button tone ${btn.tone.toFixed(0)}`)
  }
})

test('the hero style and the cover colours are choices of 个性化: 柔和 and on by default', () => {
  assert.equal(DEFAULTS.heroStyle, 'soft')
  assert.equal(DEFAULTS.heroArt, true)
  assert.equal(normalize({}).heroStyle, 'soft')
  assert.equal(normalize({ heroStyle: 'solid' }).heroStyle, 'solid')
  assert.equal(normalize({ heroStyle: 'loud' }).heroStyle, 'soft')
  assert.equal(normalize({}).heroArt, true)
  assert.equal(normalize({ heroArt: false }).heroArt, false)
})

test('a tile is drawn with its design for everyone, while it is available; ?tiles=off draws the old path', () => {
  const C = { name: 'X' }
  registerTile(['probe-tile'], C)
  const was = boldOn.value
  assert.equal(was, true, 'on by default, no flag needed')
  setBold(false)
  assert.equal(designOf({ id: 'probe-tile' }), null)
  setBold(true)
  assert.equal(designOf({ id: 'probe-tile' }), C)
  assert.equal(designOf({ id: 'probe-tile', available: false }), null)
  setBold(was)
})

test('a cover is the art; without art the app\'s own icon or a neutral glyph, never a gradient or an initial letter', () => {
  assert.deepEqual(coverOf({ name: 'X', cover: 'https://a/b.jpg' }), { cover: 'https://a/b.jpg', name: 'X' })
  assert.deepEqual(coverOf({ name: '桌面' }), { name: '桌面', glyph: 'desktop_windows' })
  assert.deepEqual(coverOf({ name: 'Steam Big Picture' }), { name: 'Steam Big Picture', glyph: 'videogame_asset' })
  assert.deepEqual(coverOf({ name: 'Notes', icon: 'https://a/icon.png' }), { name: 'Notes', iconUrl: 'https://a/icon.png' })
  assert.deepEqual(coverOf({ name: 'Elden Ring' }), { name: 'Elden Ring', glyph: 'sports_esports' })
  assert.deepEqual(coverOf({ name: 'Notes', kind: 'app' }), { name: 'Notes', glyph: 'desktop_windows' })
  for (const c of [coverOf({ name: 'Elden Ring' }), coverOf({ name: '桌面' })]) for (const k of ['letter', 'tone', 'shape']) assert.equal(k in c, false, k)
  const css = fs.readFileSync(new URL('../src/css/tilekit.css', import.meta.url), 'utf8'); const block = css.slice(css.indexOf('/* cover (MTileCover)'), css.indexOf('/* empty state:'))
  assert.ok(!/linear-gradient\(|radial-gradient\(/.test(block), 'the cover fallback has no gradient')
})

test('the metric helpers read the samples as they are', () => {
  assert.deepEqual(statsOf([1, 2, 3], 0, '%').map((x) => x.value), ['1 %', '2 %', '3 %'])
  assert.deepEqual(statsOf([5]), [])
  assert.equal(firstNumber('目标 120 fps'), 120)
})

test('a host reports its internal encoder name; the tiles show its spelling', () => {
  const m = buildHomeModel({ host: { name: 'PC', running: true }, encoder: 'nvenc', sys: { cpu: 1, gpu: 1, memTotal: 1, memAvail: 1 } }, homeTexts('zh'))
  assert.ok(m.hero.chips.some((c) => c.label === 'NVENC'), JSON.stringify(m.hero.chips))
  assert.equal(m.info.find((i) => i.id === 'encoder').value, 'NVENC')
})

test('what a host reports is spelled: the codec as the chips do, the platform as its maker does', () => {
  assert.equal(codecName('h264'), 'H.264'); assert.equal(codecName('HEVC'), 'HEVC'); assert.equal(codecName('h265'), 'HEVC'); assert.equal(codecName('av1'), 'AV1'); assert.equal(codecName(''), '')
  assert.equal(platformName('windows'), 'Windows'); assert.equal(platformName('macos'), 'macOS'); assert.equal(platformName('linux'), 'Linux')
  const m = buildHomeModel({ host: { name: 'PC', running: true }, session: { client_name: 'P', app_name: 'G', width: 1920, height: 1080, fps: 60, bitrate: 20000, codec: 'h264' }, series: {} }, homeTexts('zh'))
  assert.match(m.info.find((i) => i.id === 'encoder').sub, /^H\.264/)
})

test('every design declares what MDashCardView gives it: an undeclared prop falls through over what the wrapper set (the hero lost 柔和, 帧率 大 crashed on details)', () => {
  const dir = new URL('../src/vue/tiles/', import.meta.url)
  for (const f of fs.readdirSync(dir).filter((x) => /^Tile.*\.vue$/.test(x))) assert.match(fs.readFileSync(new URL(f, dir), 'utf8'), /defineProps\(designProps\)/, f)
  const view = fs.readFileSync(new URL('../src/vue/MDashCardView.vue', import.meta.url), 'utf8')
  const given = [...view.match(/<component :is="design"[^\n]*/)[0].matchAll(/ :(\w+)="/g)].map((m) => m[1]).filter((n) => n !== 'is')
  for (const n of given) assert.ok(n in designProps, `${n} is in designProps`)
  assert.doesNotMatch(fs.readFileSync(new URL('../src/vue/tiles/cal/CalMetric.vue', import.meta.url), 'utf8'), /props\.details/)
})

test('a picture that is not a cover (a pixel, a file that does not load) is the icon in every tile that draws art', () => {
  for (const f of ['MTileCover.vue', 'MTileStack.vue', 'tiles/cal/CalNow.vue', 'tiles/cal/CalHero.vue']) assert.match(fs.readFileSync(new URL(`../src/vue/${f}`, import.meta.url), 'utf8'), /coverOk\(/, f)
})

test('the hero carries its band: while streaming the game, the client and the bitrate samples; while idle the paired clients', () => {
  const T = homeTexts('zh')
  const clients = [{ name: 'Pixel 9', uuid: 'a', enabled: true, streaming: true }, { name: 'TV', uuid: 'b', enabled: true }]
  const session = { client_name: 'Pixel 9', app_name: 'Elden Ring', width: 2560, height: 1440, fps: 120, bitrate: 47000, codec: 'hevc' }
  const base = { host: { name: 'PC', running: true }, clients, apps: [{ name: 'Elden Ring', cover: 'https://x/c.jpg' }], sys: { cpu: 10, gpu: 20, memTotal: 32 * 1024 ** 3, memAvail: 16 * 1024 ** 3 }, encoder: 'NVENC' }
  const cardsOf = (input) => { const model = buildHomeModel(input, T); return buildCards(model, { texts: T, catalogue: buildCatalogue({ ...input, history: { samples: {}, days: {}, sessions: [] } }, T).data }) }
  const liveHero = cardsOf({ ...base, session, series: { bitrate: [40000, 47000], fps: [118, 120] } }).find((c) => c?.id === 'hero')
  assert.equal(liveHero.data.now.name, 'Elden Ring')
  assert.equal(liveHero.data.now.client, 'Pixel 9')
  assert.deepEqual(liveHero.data.now.points, [], "the bitrate is the session's target, not a measurement: the band draws no line for it")
  const liveCards = cardsOf({ ...base, session, series: { bitrate: [40000, 47000], fps: [118, 120] } })
  assert.ok(Array.isArray(liveCards.find((c) => c?.id === 'bitrate').extra), 'the 大 rows of 码率 are an array')
  assert.equal(liveHero.data.art, 'https://x/c.jpg')
  const idleHero = cardsOf({ ...base, series: {} }).find((c) => c?.id === 'hero')
  assert.equal(idleHero.data.now, null)
  assert.deepEqual(idleHero.data.paired.map((c) => c.name), ['Pixel 9', 'TV'])
})

test('the hero band says what is measured and what the session asked for; the stream line is the picture size alone; the clients say what the count counts ()', () => {
  const T = homeTexts('zh')
  const clients = [{ name: 'Pixel 9', uuid: 'a', enabled: true, streaming: true }, { name: 'TV', uuid: 'b', enabled: true }]
  const session = { client_name: 'Pixel 9', app_name: 'Desktop', width: 3840, height: 2160, fps: 120, bitrate: 113000, measured_bitrate_kbps: 22600, codec: 'hevc' }
  const input = { host: { name: 'PC', running: true }, clients, session, apps: [{ name: 'Desktop' }], sys: { cpu: 10, gpu: 20, memTotal: 32 * 1024 ** 3, memAvail: 16 * 1024 ** 3 }, encoder: 'NVENC', series: { bitrate: [22000, 22600], fps: [60, 61] } }
  const model = buildHomeModel(input, T)
  const hero = buildCards(model, { texts: T, catalogue: buildCatalogue({ ...input, history: { samples: {}, days: {}, sessions: [] } }, T).data }).find((c) => c?.id === 'hero')
  const now = hero.data.now
  assert.equal(now.bitrate, '22.6')
  assert.equal(now.bitrateGoal, '目标 113 Mbps')
  assert.equal(now.fpsGoal, '目标 120 fps')
  assert.equal(now.stream, '3840×2160', 'the frame rate asked for is fpsGoal, not a bare 120 after the size')
  const clientsFact = hero.data.facts.find((f) => f.icon === 'devices')
  assert.match(clientsFact.value, /^2 台已配对/, `the number says what it counts: ${clientsFact.value}`)
  // an older host that reports no measured bitrate: the budget is the value and it has no goal under it
  const old = buildHomeModel({ ...input, session: { ...session, measured_bitrate_kbps: undefined } }, T)
  assert.equal(old.curves.find((c) => c.id === 'bitrate').target, undefined)
})

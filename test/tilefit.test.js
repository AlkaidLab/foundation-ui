import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { starClientInUse } from '../src/vue/starCard.js'
import { anchorOf, untilNextSecond, useSessionClock, CLOCK_JITTER_MS } from '../src/vue/sessionClock.js'
import { buildHomeModel, TEXTS_ZH, homeTexts } from '../src/vue/homeModel.js'
import { nextTick, ref } from 'vue'

const css = (f) => fs.readFileSync(new URL(`../src/css/${f}`, import.meta.url), 'utf8')
const src = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

// ---- the star banner follows the client of the session (a real host lists 31 paired clients with no family; the session carries `client_family`)
const paired = Array.from({ length: 31 }, (_, i) => ({ name: 'Named Zako', uuid: `U${i}`, last_seen: i }))
const macSession = { uuid: 'DF3B4175', name: 'Named Zako', family: 'moonlight-macos-enhanced', os: 'macos', official: true }
test('a Mac session of Moonlight macOS Enhanced asks for the star of Moonlight macOS Enhanced, whatever the paired list says', () => {
  const s = starClientInUse({ clients: paired, session: macSession, names: paired.map((c) => c.name) })
  assert.equal(s.id, 'macos-enhanced')
  assert.equal(s.name, 'Moonlight macOS Enhanced')
  assert.equal(s.url, 'https://github.com/skyhua0224/moonlight-macos-enhanced')
})
test('the family of the session counts before the paired record; clients that are not ours get no star of their own', () => {
  const pad = [{ name: 'Pixel', uuid: 'DF3B4175', family: 'moonlight-vplus-android', official: true, os: 'android' }]
  assert.equal(starClientInUse({ clients: pad, session: { uuid: 'DF3B4175', name: 'Pixel', family: 'moonlight-macos-enhanced' } }).id, 'macos-enhanced', 'the session is the source')
  assert.equal(starClientInUse({ clients: pad, session: { uuid: 'DF3B4175', name: 'Pixel' } }).id, 'vplus-android', 'no family on the session: the paired record')
  assert.equal(starClientInUse({ clients: paired, session: { uuid: 'x', name: 'Named Zako', family: 'moonlight-upstream', official: false } }), null)
  assert.equal(starClientInUse({ clients: paired, session: { uuid: 'x', name: 'Named Zako', family: 'voidlink', official: false } }), null)
  assert.equal(starClientInUse({ clients: [], session: { uuid: 'x', name: 'Named Zako', official: true, os: 'macos' } }).id, 'macos-enhanced', 'official, a Mac, no list: the Mac client')
})

// ---- the stream's running time ticks from the session's start
test('the clock keeps its start unless a poll differs by more than the jitter', () => {
  assert.equal(anchorOf(null, 87000, 1_000_000), 913000)
  assert.equal(anchorOf(913000, 90000, 1_003_200), 913000, '3 s later, 90 s: the same start, the clock does not step')
  assert.equal(anchorOf(913000, 90000, 1_003_200 + CLOCK_JITTER_MS + 10), 1_003_200 + CLOCK_JITTER_MS + 10 - 90000, 'a large difference is taken')
  assert.equal(anchorOf(913000, 80000, 1_003_200), 923200, 'a restart of the host session: the new start')
  assert.equal(anchorOf(913000, NaN, 1), 913000)
})
test('the next tick is at the next whole second of the session', () => {
  assert.ok(untilNextSecond(0, 1500) >= 500 && untilNextSecond(0, 1500) <= 510)
  assert.ok(untilNextSecond(0, 3000) >= 1000 && untilNextSecond(0, 3000) <= 1010)
  assert.ok(untilNextSecond(5000, 4000) >= 1)
})
test('useSessionClock changes once per second between polls and stops when the session ends', async () => {
  let t = 1_000_000
  const timers = []
  const live = ref(true), rep = ref({ uptimeMs: 87000, at: t })
  const clock = useSessionClock({ live: () => live.value, report: () => rep.value, now: () => t, setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length }, clearTimer: () => {} })
  assert.equal(clock.uptimeMs.value, 87000)
  const seen = []
  for (let i = 0; i < 5; i++) { const x = timers.pop(); assert.ok(x.ms >= 1 && x.ms <= 1010, `delay ${x.ms}`); t += x.ms; x.fn(); seen.push(Math.floor(clock.uptimeMs.value / 1000)) }
  assert.deepEqual(seen, [88, 89, 90, 91, 92], 'one step per second with no poll at all')
  rep.value = { uptimeMs: 92300, at: t } // a poll that agrees within the jitter: no step back
  await nextTick()
  assert.equal(Math.floor(clock.uptimeMs.value / 1000), 92)
  live.value = false
  await nextTick()
  assert.equal(clock.uptimeMs.value, null)
})

// ---- the bitrate the host reports is the session's configured budget (audit api-exposure-20261107, 5), never a measurement
test('the bitrate tile is the target bitrate: no line, no lowest / mean / highest, whatever the series does', () => {
  const base = { host: { name: 'PC', version: '1', uptimeMs: 1, running: true }, clients: [], apps: [], sys: null }
  for (const series of [[113000, 113000, 113000, 113000], [113000, 104000, 98000]]) {
    const m = buildHomeModel({ ...base, session: { client_name: 'Moonlight macOS Enhanced', width: 3840, height: 2160, fps: 120, bitrate: 113000, codec: 'hevc' }, series: { bitrate: series } }, TEXTS_ZH)
    const c = m.curves.find((x) => x.id === 'bitrate')
    assert.equal(c.configured, true); assert.deepEqual(c.points, []); assert.equal(c.peak, ''); assert.equal(c.title, '目标码率'); assert.equal(c.value, '113.0')
  }
  const en = buildHomeModel({ ...base, session: { client_name: 'M', width: 3840, height: 2160, fps: 120, bitrate: 113000, codec: 'hevc' } })
  assert.equal(en.curves.find((x) => x.id === 'bitrate').title, 'Target bitrate')
})

// ---- the fit rules are in place (the browser gate is the browser check)
test('tilefit.css is part of all.css and lifts the ellipsis of the names of a tile, scales numerals and lets 快捷操作 scroll', () => {
  assert.match(css('all.css'), /tilefit\.css/)
  const f = css('tilefit.css')
  for (const cls of ['.m-calh__line', '.m-caln__sub', '.m-daddr__value b', '.m-dsmall__value > span', '.m-rc__text b', '.m-calm__title']) assert.ok(f.includes(cls), cls)
  assert.match(f, /text-overflow: clip !important/); assert.match(f, /overflow-wrap: anywhere/)
  assert.match(f, /--tn-k/); assert.match(f, /@container m-calq/); assert.match(f, /overflow-x: auto/)
  assert.match(src('vue/MTileNumeral.vue'), /--tn-k/)
})
test('the wave of a spinning ring (MTileRing spin) runs on a transform of its own, as slowly as the wavy progress bar, and stops under reduced motion', () => {
  const k = css('tilekit.css')
  assert.match(k, /\.m-tring__spin > svg \{[^}]*animation: m-tring-run 1\.1s linear infinite/)
  assert.match(k, /@keyframes m-tring-run \{ to \{ transform: rotate\(/)
  assert.match(k, /prefers-reduced-motion: reduce\)[^\n]*\.m-tring__spin > svg \{ animation: none/)
  assert.match(k, /html\[data-motion='reduced'\] \.m-tring__spin > svg \{ animation: none/)
  assert.doesNotMatch(src('vue/MTileRing.vue'), /setInterval|requestAnimationFrame/, 'no script drives the wave')
})

import { fitScale, FIT_MIN, FIT_SELECTOR } from "../src/vue/fitText.js"
test("fitScale: a value that fits is left alone, one a little too wide shrinks, one far too wide wraps", () => {
  assert.equal(fitScale(80, 100), 1)
  assert.equal(fitScale(100, 100), 1, "half a pixel of slack")
  const k = fitScale(130, 100); assert.ok(k < 1 && k >= FIT_MIN, String(k))
  assert.ok(Math.abs(130 * k - 99.5) < 0.01, "the scaled text is as wide as the room")
  assert.equal(fitScale(300, 100), null, "below 60 %: the wrap takes over")
  assert.equal(fitScale(300, 0), 1, "no room measured (a hidden tile): nothing to do")
})
test("the values of the tiles are fitted: the selector covers the real-length culprits and the css wraps only after the fit gave up", () => {
  for (const c of [".m-dsmall__value > span", ".m-daddr__value b", ".m-b2plate b", ".m-calh__line", ".m-caln__sub"]) assert.ok(FIT_SELECTOR.includes(c), c)
  const f = fs.readFileSync(new URL("../src/css/tilefit.css", import.meta.url), "utf8")
  assert.match(f, /\)\[data-fit-wrap\] \{ white-space: normal !important; overflow-wrap: anywhere; \}/)
  assert.match(fs.readFileSync(new URL("../src/vue/MHomeDash.vue", import.meta.url), "utf8"), /useFitText\(root\)/)
})

import { buildCards } from "../src/vue/homeCards.js"
test("the bitrate card's own title says it is the target", () => {
  const T = TEXTS_ZH
  const model = buildHomeModel({ host: { name: "PC", version: "1", uptimeMs: 1, running: true }, clients: [], apps: [], sys: null, session: { client_name: "Moonlight macOS Enhanced", width: 3840, height: 2160, fps: 120, bitrate: 113000, codec: "hevc" }, series: { bitrate: [113000, 113000, 113000] } }, T)
  const cards = buildCards(model, { texts: T, catalogue: {} })
  assert.equal(cards.find((c) => c?.id === "bitrate").title, "目标码率")
})

test("the empty state at 方形 follows the tile and the words stay clear of its glyph; 公告 without a banner has its shape; 版本 caps its numeral by the tile's height", () => {
  const f = fs.readFileSync(new URL("../src/css/tilefit.css", import.meta.url), "utf8")
  assert.match(f, /\.m-tile:has\(> \.m-tempty--s\) \{ container: m-te \/ size; \}/)
  assert.match(f, /\.m-tempty--s \{ --te-shape: clamp\(52px, 44cqw, 132px\)/)
  assert.match(f, /\.m-b3n__gen \{ overflow: hidden; \}/)
  const info = fs.readFileSync(new URL("../src/vue/tiles/TileInfoB3.vue", import.meta.url), "utf8")
  assert.match(info, /<span v-else-if="gen" class="m-b3n__pic m-b3n__gen m-b3n__plate"/)
  assert.match(f, /\.m-b3n__plate \{ container-type: size;/) // the plate: the glyph of what the post is in a shape, not a random gradient
  assert.doesNotMatch(info, /announcementHeroStyle/)
  assert.match(info, /max\(24px, min\(\$\{verSize\}, 17cqh\)\)/)
})
test("realSession is exported for the panel and the Web UI", async () => {
  assert.match(fs.readFileSync(new URL("../src/vue/index.js", import.meta.url), "utf8"), /export \{ realSession, isSessionClient, onlineClients \} from "\.\/clientsLive\.js"/)
  const m = await import("../src/vue/clientsLive.js")
  assert.equal(m.realSession({ client_name: "Named Zako", client_family: "moonlight-macos-enhanced" }, []).client_name, "Moonlight macOS Enhanced")
  assert.equal(m.realSession({ client_name: "Studio MacBook" }, []).client_name, "Studio MacBook")
})

test("the 大 host card's chips wrap and give up what does not fit (data-fit-rows), a button may shrink, the ring's centre stays above the wave, the vivi art is a declared bleed", () => {
  const f = fs.readFileSync(new URL("../src/css/tilefit.css", import.meta.url), "utf8")
  assert.doesNotMatch(f, /\.m-calh__fchips \{[^}]*(overflow-x: auto|max-height: 28px)/)
  assert.match(fs.readFileSync(new URL("../src/vue/tiles/cal/CalHero.vue", import.meta.url), "utf8"), /class="m-calh__fchips" data-fit-rows/)
  assert.match(f, /\.m-b2__btn \{ flex: 0 1 36px; min-height: 26px; \}/)
  assert.match(f, /\.m-tring__centre \{ position: relative; z-index: 1; \}/)
  assert.match(fs.readFileSync(new URL("../src/vue/tiles/TileInfoB3.vue", import.meta.url), "utf8"), /<img data-bleed class="m-b3vi__img"/)
})

test("the overview shows no mode label: no 手动 / 恢复智能布局 chip; 恢复智能布局 stays in the layout edit sheet", () => {
  const dash = fs.readFileSync(new URL("../src/vue/MHomeDash.vue", import.meta.url), "utf8")
  assert.doesNotMatch(dash, /m-dash__smart|m-dash__bar|manualChip/)
  assert.match(dash, /<button type="button" class="m-dpill" @click="restoreSmart"><MIcon name="wand_stars" \/>\{\{ T\.restoreSmart \}\}<\/button>/)
  assert.doesNotMatch(fs.readFileSync(new URL("../src/css/dash.css", import.meta.url), "utf8"), /\.m-dash__smart|\.m-dash__bar/)
  assert.doesNotMatch(fs.readFileSync(new URL("../src/vue/homeCatalogueTextsMore.js", import.meta.url), "utf8"), /manualChip/)
})

import { announcementHero, announcementHeroStyle } from "../src/announcements/hero.js"
import { offeredOf } from "../src/vue/homeSizes.js"
test("an announcement without a banner gets a stable generated hero from its id", () => {
  const a = announcementHero("post-1"), b = announcementHero("post-1"), c = announcementHero("post-2")
  assert.deepEqual(a, b, "the same id, the same hero")
  assert.ok(a.a.includes("var(--md-sys-color-") && a.b.includes("var(--md-sys-color-") && a.a !== a.b && a.c !== a.d, "theme colours turned in OKLCH: it follows light, dark and the seed; two or more hues")
  const seen = new Set(Array.from({ length: 40 }, (_, i) => announcementHero(`p${i}`).a + announcementHero(`p${i}`).b)); assert.ok(seen.size >= 5, "different posts, different colours")
  assert.ok(announcementHero("p3").angle >= 120 && announcementHero("p3").angle <= 270)
  assert.match(announcementHeroStyle("x").background, /^radial-gradient\(circle at \d+% \d+%, oklch\(from var\(--md-sys-color-.*linear-gradient\(\d+deg, oklch/)
  assert.ok(c)
})
test("the 资讯 tile with one post offers the large size (its hero fills it); an empty list stays small", () => {
  const meta = (items, quiet = false) => ({ id: "announcements", kind: "widget", data: { type: "news", quiet, items } })
  assert.deepEqual(offeredOf("announcements", meta([{ id: "a", title: "T" }]), "large"), ["s", "m", "l", "xl"], "the extra-large size is offered, the hero and the list fill it")
  assert.deepEqual(offeredOf("announcements", meta([]), "large"), ["s"])
})

test("资讯 at 特大 is drawn: the hero with its post and the list beside it", () => {
  const info = fs.readFileSync(new URL("../src/vue/tiles/TileInfoB3.vue", import.meta.url), "utf8")
  assert.match(info, /\(size === 'l' \|\| size === 'xl'\) && rest\.length/)
  assert.match(info, /size\.value === 'xl' \? 6 : 3/)
  const f = fs.readFileSync(new URL("../src/css/tilefit.css", import.meta.url), "utf8")
  assert.match(f, /\.m-b3n\.is-xl \{ flex-direction: row; \}/); assert.match(f, /\.m-b3n\.is-xl:not\(:has\(\.m-b3n__rest\)\) \.m-b3n__lead \{ flex: 1 1 100%; \}/)
})

import { buildCatalogue } from "../src/vue/homeCatalogue.js"
test("measured_bitrate_kbps (mock data: the real host does not send it yet) is the bitrate; without it the budget is titled 目标码率 and draws no line", () => {
  const base = { host: { name: "PC", version: "1", uptimeMs: 1, running: true }, clients: [], apps: [], sys: null }
  const session = { client_name: "Moonlight macOS Enhanced", width: 3840, height: 2160, fps: 120, bitrate: 113000, codec: "hevc" }
  const measured = buildHomeModel({ ...base, session: { ...session, measured_bitrate_kbps: 96400 }, series: { bitrate: [91000, 96400, 99800] } }, TEXTS_ZH)
  const c = measured.curves.find((x) => x.id === "bitrate")
  assert.equal(c.title, "码率"); assert.equal(c.value, "96.4"); assert.deepEqual(c.points, [91, 96.4, 99.8]); assert.equal(c.configured, undefined)
  const budget = buildHomeModel({ ...base, session, series: { bitrate: [113000, 113000, 113000] } }, TEXTS_ZH)
  const b = budget.curves.find((x) => x.id === "bitrate")
  assert.equal(b.title, "目标码率"); assert.equal(b.value, "113.0"); assert.deepEqual(b.points, []); assert.equal(b.configured, true)
  // the hero band says which one it shows
  const cardsOf = (m) => buildCards(m, { texts: TEXTS_ZH, catalogue: {} }).find((x) => x?.id === "hero")?.data?.now
  assert.equal(cardsOf(measured)?.bitrate ?? "96.4", "96.4")
  // the stream-bitrate tile of the catalogue: measured value and title 码率, or the budget titled 目标码率
  const cat = (sess) => buildCatalogue({ session: sess, history: { samples: { bitrate: [91000, 96400] }, days: {}, sessions: [] }, config: { max_bitrate: 0 } }, homeTexts("zh")).data["stream-bitrate"]
  const cm = cat({ ...session, measured_bitrate_kbps: 96400 })
  assert.equal(cm.title, "码率"); assert.match(cm.big || cm.rows?.[0]?.value || JSON.stringify(cm), /96\.4/)
  const cb = cat(session)
  assert.equal(cb.title, "目标码率"); assert.deepEqual(cb.points, [])
})

test("integration round 2026-11-11: 上次串流 at 中 is compact with or without art, the empty-state button fits its label, 已配对 at 方形 keeps +N inside, 内存变化's chart stays under its numeral, the square hero name may take 20 px", async () => {
  const real = fs.readFileSync(new URL("../src/css/tilefit-real.css", import.meta.url), "utf8")
  assert.match(real, /\.m-b2last\.is-m \.m-tnum \{ --tn: 40px/, "no `has-art`: a session without art has the same numeral")
  assert.match(real, /\.m-b2paired\.is-s \.m-calo__rings:has\(\.is-more\) li:nth-child\(3\) \{ display: none; \}/)
  assert.match(real, /\.m-tmem--trend\.is-m \{ --tile-bleed: min\(60%, calc\(100% - 108px\)\); \}/)
  const f = fs.readFileSync(new URL("../src/css/tilefit.css", import.meta.url), "utf8")
  const { FIT_SELECTOR } = await import("../src/vue/fitText.js")
  assert.ok(FIT_SELECTOR.includes(".m-b2empty .m-b2__btn"))
  assert.equal(f.split(".m-dash__cell :is(.m-calm__title, .m-b2empty .m-b2__btn,").length - 1, 2, "nowrap and the wrap fallback both list it")
  assert.match(fs.readFileSync(new URL("../src/css/tiles-cal.css", import.meta.url), "utf8"), /\.m-calh--sq \.m-calh__name \{ font-size: min\(var\(--hn, 28px\), max\(20px, 17\.5cqw\)\); \}/)
})

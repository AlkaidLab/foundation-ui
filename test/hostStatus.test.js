import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { offlineTexts } from '../src/status/offlineTexts.js'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('a screen that cannot use the host is ONE status page over the whole content area, the rail and the caption stay, the panes stay mounted and inert', () => {
  const scene = read('src/vue/MScene.vue')
  assert.match(scene, /status: \{ type: Boolean, default: false \}/)
  assert.match(scene, /'m-scene--status': status/)
  for (const n of ['hidden(0) || modalOpen || status', 'hidden(1) || status', 'hidden(2) || status']) assert.ok(scene.includes(n), `${n}: the pane is inert`)
  const css = read('src/css/layout.css')
  assert.match(css, /\.m-scene--status \{ --c-list: 0px !important; --c-sup: 0px !important; --m-content-x: var\(--c-rail, 0px\) !important; \}/, 'the overlay then starts at the rail')
  assert.match(css, /--m-content-x: var\(--c-rail, 0px\) !important;/, 'the surface of the content panel starts at the rail, not at the old list edge')
  assert.match(css, /\.m-scene--status \.m-scene__pane--list, \.m-scene--status \.m-scene__pane--detail, \.m-scene--status \.m-scene__pane--supporting \{ visibility: hidden; pointer-events: none; \}/)
})

test('the status page has one design for the causes: down, unresponsive and proxy differ in their words and actions', () => {
  const card = read('src/vue/MHostOffline.vue')
  assert.match(card, /cause: \{ type: String, default: '' \}/)
  assert.match(card, /const kind = computed\(\(\) => props\.cause \|\| \(props\.state\.verdict === 'unresponsive' \? 'unresponsive' : 'down'\)\)/)
  assert.match(card, /proxy \? T\.proxyTitle : unresponsive \? T\.unresponsiveTitle : T\.title/)
  assert.match(card, /<section v-if="!proxy" class="m-offline__tips">/, 'the tips are about Sunshine, not about the proxy')
  for (const locale of ['zh', 'en']) {
    const T = offlineTexts(locale)
    for (const k of ['proxyTitle', 'proxyLine', 'proxyChecking', 'proxyWaiting', 'proxyAttempts']) assert.ok(T[k], `${locale}.${k}`)
    for (const [title, line] of [[T.title, T.line], [T.unresponsiveTitle, T.unresponsiveLine], [T.proxyTitle, T.proxyLine]]) assert.ok(!line.startsWith(title), `the line repeats its title: ${title}`)
  }
  assert.match(read('src/css/offline.css'), /\.m-offline__title \{ margin: 0; font: var\(--m-title-large-emphasized\);/)
})

test('the mascot and the card are one group, centred on both axes in the content area; a short area scrolls from the top', () => {
  const css = read('src/css/offline.css')
  assert.match(css, /\.m-offline \{[^}]*display: flex; overflow: auto;/)
  assert.match(css, /\.m-offline__inner \{ margin: auto; display: flex;/, 'margin: auto centres the group and lets it start at the top when it does not fit')
  assert.doesNotMatch(css, /grid-template-columns: minmax\(0, 4fr\) minmax\(0, 7fr\)/, 'the two columns of the old wide layout lean to one side')
  assert.doesNotMatch(css, /display-small-emphasized/, 'the title keeps the title scale in the wide layout too')
  assert.match(css, /\.m-offline__copy \{ align-items: flex-start; gap: 16px; width: 34rem; max-width: 100%;/, 'the card has one width in every cause (not a percentage: it would size the group by the longest text)')
  assert.match(css, /\.m-offline__inner \{ margin: auto; display: flex; flex-direction: column; align-items: center; justify-content: center;/, 'the group is centred inside its own box too')
})

// The overview's edit: the sheet is a modal (the page behind gets nothing), the clock of the clock mode is set in it, the segmented controls show what is chosen, and the layout that editing starts
// from is the full-screen one.
import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { MODAL_SURFACE, contextPolicy, inModalSurface, modalOpen } from '../src/a11y/modalLayer.js'
import { freezeBase } from '../src/vue/homeFreeze.js'
import { useDashLayout } from '../src/vue/useDashLayout.js'
import { CLOCK_FACES, DEFAULTS, normalize } from '../src/appearance/appearance.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
let server, MDockClockBar
before(async () => {
  server = await createServer({ root, configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('md-') } } })] })
  ;({ default: MDockClockBar } = await server.ssrLoadModule('/src/vue/MDockClockBar.vue'))
})
after(async () => { await server?.close() })

// ---- the sheet is modal ----
test('the sheet that edits the overview is a <dialog> shown with showModal() (v-modal-open), closes on Esc, and has no hand-made scrim', () => {
  const v = read('src/vue/MHomeDash.vue')
  assert.match(v, /<dialog ref="sheetEl" v-modal-open class="m-dedit m-dedit--gallery"/)
  assert.match(v, /@cancel\.prevent="closeSheet"/)
  assert.match(v, /import \{ vModalOpen \} from '\.\.\/a11y\/modalLayer\.js'/)
  assert.doesNotMatch(v, /<section ref="sheetEl"/, 'a div with role=dialog does not make the page behind inert')
  assert.doesNotMatch(v, /m-dedit__dim/)
  assert.doesNotMatch(read('src/css/dash.css') + read('src/css/gallery.css'), /\.m-dedit__dim/)
  assert.match(read('src/css/dash.css'), /\.m-dedit::backdrop \{ background: color-mix/)
  assert.match(read('src/css/gallery.css'), /\.m-dedit\.is-away::backdrop \{[^}]*opacity: 0/, 'the backdrop fades while a tile is dragged out of the sheet')
  assert.match(v, /useModalBridge\(sheetModal, closeSheet\)/, 'a frame that holds the page tells the shell')
})

test('a press on the sheet\'s backdrop (the dialog itself is the target) is outside the modal; what is inside the sheet is inside', () => {
  const el = (matches = [], parent = null) => ({ parent, matches, closest(sel) { for (let n = this; n; n = n.parent) if (sel.split(',').some((s) => n.matches?.includes(s.trim()))) return n; return null } })
  const dialog = el(['dialog']); const head = el(['.m-dedit--gallery > *'], dialog); const button = el([], head)
  assert.ok(MODAL_SURFACE.includes('.m-dedit--gallery > *'))
  assert.equal(inModalSurface(dialog), false)
  assert.equal(inModalSurface(button), true)
  assert.equal(contextPolicy({ modal: true, inside: inModalSurface(dialog), editable: false, selection: false }), 'none')
  assert.equal(modalOpen({ querySelector: (sel) => (sel.includes('dialog[open]') ? {} : null) }), true)
})

// ---- the segmented controls of the sheet show the chosen one ----
test('the chosen segment of the sheet is filled with the primary colour (the sheet\'s own surface has the tone of secondary-container)', () => {
  const css = read('src/css/gallery.css')
  assert.match(css, /\.m-dedit \.m-dsize\.m-dedit__layout > button\.is-on \{ background: var\(--m-sel-fill\); color: var\(--m-sel-ink\); \}/)
  assert.doesNotMatch(css, /button\.is-on \{ background: var\(--md-sys-color-secondary-container\)/)
})

// ---- the clock is set in the sheet ----
const html = async (props) => (await renderToString(createSSRApp({ render: () => h(MDockClockBar, props) }))).replace(/<!--.*?-->/g, '')
const store = (state) => ({ state, set(patch) { Object.assign(state, patch) } })
test('the clock bar offers every face and the sizes and places the window offers; the chosen ones are marked', async () => {
  const wide = await html({ appearance: store({ clockFace: 'flip', clockSize: 'xl', clockAlign: 'left', clockSeconds: false }), locale: 'zh', width: 1280 })
  assert.equal((wide.match(/data-face="/g) || []).length, CLOCK_FACES.length)
  assert.match(wide, /<button[^>]*class="is-on m-dclock__face"[^>]*data-face="flip"/)
  assert.equal((wide.match(/class="is-on m-dclock__face"/g) || []).length, 1)
  assert.deepEqual([...wide.matchAll(/data-clock-size="(\w+)"/g)].map((m) => m[1]), ['s', 'm', 'l', 'xl'])
  assert.deepEqual([...wide.matchAll(/data-clock-align="(\w+)"/g)].map((m) => m[1]), ['left', 'center', 'right'])
  assert.match(wide, /is-on" data-clock-size="xl"/); assert.match(wide, /is-on" data-clock-align="left"/)
  // a window under 840 px has no 特大: the saved size is drawn as the largest the window offers (大), and that one is marked
  const narrow = await html({ appearance: store({ clockFace: 'default', clockSize: 'xl', clockAlign: 'right', clockSeconds: false }), locale: 'zh', width: 600 })
  assert.deepEqual([...narrow.matchAll(/data-clock-size="(\w+)"/g)].map((m) => m[1]), ['s', 'm', 'l'])
  assert.match(narrow, /is-on" data-clock-size="l"/)
  assert.match(wide, /时钟大小/); assert.match(wide, /时钟位置/)
})
test('the sheet shows the clock bar only in the clock mode, the position moved from the tools row into it, and a click writes the appearance', async () => {
  const v = read('src/vue/MHomeDash.vue')
  assert.match(v, /<MDockClockBar v-if="dockLayout" :appearance="appearance" :locale="props\.locale" :width="wide" \/>/)
  assert.doesNotMatch(v, /m-dedit__align/, 'the position is in the clock bar')
  const bar = read('src/vue/MDockClockBar.vue')
  for (const patch of ['clockFace: f', 'clockSize: k', 'clockAlign: a']) assert.ok(bar.includes(`appearance.set({ ${patch} })`), patch)
})
test('the clock of the clock mode is 特大 by default; a record that only kept the old default (中, no rule) reads as the new default, a choice made after it is kept', () => {
  assert.equal(DEFAULTS.clockSize, 'xl')
  assert.equal(normalize({}).clockSize, 'xl')
  assert.equal(normalize({ clockSize: 'm' }).clockSize, 'xl', 'written before the rule: the old default')
  const saved = normalize({ clockSize: 'm' }); assert.equal(saved.clockSizeRule, 2)
  assert.equal(normalize({ ...saved, clockSize: 'm' }).clockSize, 'm', 'chosen after the rule')
  assert.equal(normalize({ clockSize: 's' }).clockSize, 's'); assert.equal(normalize({ clockSize: 'l' }).clockSize, 'l')
})

// ---- the layout editing starts from ----
const memory = () => { const s = {}; return { s, getItem: (k) => s[k] ?? null, setItem: (k, v) => { s[k] = v } } }
const plan = { visible: ['hero', 'bitrate', 'fps', 'clients-online'], sizes: { hero: 'l', bitrate: 'l', fps: 'xl', 'clients-online': 's' } }
const drawnInClock = [{ id: 'hero', size: 's' }, { id: 'bitrate', size: 's' }, { id: 'fps', size: 's' }, { id: 'clients-online', size: 's' }, { id: 'latency', size: 's' }] // the clock mode draws squares, and fills the last row
test('editing from the clock mode freezes the plan\'s sizes, not the squares the clock mode draws; the tiles of its fill stay', () => {
  const has = () => true
  const dock = freezeBase(plan, drawnInClock, has, true)
  assert.deepEqual(dock.visible, ['hero', 'bitrate', 'fps', 'clients-online', 'latency'])
  assert.deepEqual(dock.sizes, plan.sizes, 'no square of the clock mode in the saved sizes')
  const grid = freezeBase(plan, [{ id: 'hero', size: 'xl' }, { id: 'latency', size: 's' }], has, false)
  assert.equal(grid.sizes.hero, 'xl', 'in the full-screen layout the drawn size is kept (the plan lifts a tile a size where a row is short)')
  assert.equal(grid.sizes.latency, 's')
  assert.deepEqual(freezeBase(plan, drawnInClock, (id) => id !== 'latency', true).visible, plan.visible, 'a tile that no longer exists is not frozen')
})
test('after editing in the clock mode the full-screen tiles come back as the plan drew them (the saved layout holds the plan\'s sizes)', () => {
  const layout = useDashLayout('t-overview-edit', memory())
  layout.freeze(freezeBase(plan, drawnInClock, () => true, true))
  assert.equal(layout.state.mode, 'manual')
  assert.equal(layout.state.sizes.hero, 'l'); assert.equal(layout.state.sizes.fps, 'xl')
  assert.equal(layout.state.sizes['clients-online'], 's')
  const squares = useDashLayout('t-overview-edit-old', memory())
  squares.freeze({ ...plan, sizes: Object.fromEntries(drawnInClock.map((x) => [x.id, x.size])) })
  assert.equal(squares.state.sizes.hero, 's', 'what freezing the drawn squares did: the hero came back as a square')
  const dash = read('src/vue/dash/dashDock.js')
  assert.match(dash, /freezeBase\(base, lastShown, \(id\) => cardById\.value\.has\(id\), dockLayout\.value\)/)
})

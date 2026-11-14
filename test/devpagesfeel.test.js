// 开发者 pages (): 构建与组件 moves like the other pages; 模拟主机状态 shows which simulation runs and asks before it starts; 发送测试事件 and the developer options change on the click.
import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createChanger } from '../src/developer/optimistic.js'
import { SIMULATIONS, SIMULATION_MS, chooseSimulation, createHostSimulation } from '../src/vue/useHostSimulation.js'
import { devmodeTexts } from '../src/devmode/texts.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
let server, DevTests, DevSimChip, DevBuild, useHostSimulation
before(async () => {
  server = await createServer({ root, configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('md-') } } })] })
  const index = await server.ssrLoadModule('/src/vue/index.js')
  ;({ DevTests, DevSimChip, DevBuild, useHostSimulation } = index)
})
after(async () => { await server?.close() })
const fakeTimers = () => { const jobs = []; let id = 0; return { jobs, timeout: (fn, ms) => { jobs.push({ id: ++id, fn, ms, every: false }); return id }, every: (fn, ms) => { jobs.push({ id: ++id, fn, ms, every: true }); return id }, clear: (n) => { const i = jobs.findIndex((j) => j.id === n); if (i >= 0) jobs.splice(i, 1) }, stop: (n) => { const i = jobs.findIndex((j) => j.id === n); if (i >= 0) jobs.splice(i, 1) } } }
const clock = () => { let t = 1000; return { now: () => t, advance: (ms) => { t += ms } } }

// ---- the change on the click ----
test('a change is painted before the answer, the control is pending until it comes, and the answer is read back', async () => {
  const pending = {}; const log = []; let release
  const change = createChanger({ pending, fail: () => log.push('fail') })
  const run = change('debug', { paint: () => log.push('paint'), restore: () => log.push('restore'), commit: () => new Promise((r) => { release = r; log.push('commit') }), reconcile: async (a) => log.push(`reconcile:${a}`) })
  assert.deepEqual(log, ['paint', 'commit'], 'painted first, then asked'); assert.equal(pending.debug, true)
  release('answer'); const result = await run
  assert.deepEqual(log, ['paint', 'commit', 'reconcile:answer']); assert.equal(pending.debug, false); assert.equal(result.ok, true)
})
test('a failed answer puts the control back and tells the person; a press while one is pending waits', async () => {
  const pending = {}; const log = []
  const change = createChanger({ pending, fail: (e) => log.push(`fail:${e.message}`) })
  let reject; const first = change('level', { paint: () => log.push('paint'), restore: () => log.push('restore'), commit: () => new Promise((_, r) => { reject = r }) })
  const second = await change('level', { paint: () => log.push('paint2'), commit: async () => {} })
  assert.deepEqual(second, { ok: false, busy: true }); assert.ok(!log.includes('paint2'), 'the second press did not paint')
  reject(new Error('nope')); const r = await first
  assert.deepEqual(log, ['paint', 'restore', 'fail:nope']); assert.equal(r.ok, false); assert.equal(pending.level, false)
  const other = await change('cover', { paint: () => log.push('cover'), commit: async () => {} }); assert.equal(other.ok, true, 'another control is not held')
})
test('a read-back that fails keeps what was painted', async () => {
  const state = { v: 0 }; const change = createChanger({ pending: {} })
  const r = await change('x', { paint: () => { state.v = 1 }, restore: () => { state.v = 0 }, commit: async () => {}, reconcile: async () => { throw new Error('read') } })
  assert.equal(r.ok, true); assert.equal(state.v, 1)
})

// ---- the simulation ----
test('a simulation shows at once, counts down from 60 s, and ends by itself after it', async () => {
  const c = clock(); const t = fakeTimers(); const calls = []
  const sim = createHostSimulation({ now: c.now, timers: t })
  assert.equal(SIMULATION_MS, 60000); assert.deepEqual([...SIMULATIONS], ['offline', 'stopped', 'unresponsive'])
  const started = sim.start('offline', async (kind) => { calls.push(kind) })
  assert.equal(sim.kind.value, 'offline', 'the state is there before the product answers'); assert.equal(sim.remaining.value, 60); assert.equal(sim.active.value, true)
  await started; assert.deepEqual(calls, ['offline'])
  c.advance(18500); t.jobs.find((j) => j.every).fn(); assert.equal(sim.remaining.value, 42)
  c.advance(41500); t.jobs.find((j) => !j.every).fn(); await new Promise((r) => setImmediate(r))
  assert.equal(sim.active.value, false); assert.deepEqual(calls, ['offline', ''], 'the product is told to go back'); assert.equal(t.jobs.length, 0, 'no timer is left')
})
test('the default timers are arrow functions (a browser\'s setTimeout called as a method of the timers object throws 「Illegal invocation」: the first real run met it)', () => {
  const src = read('src/vue/useHostSimulation.js')
  for (const f of ['timeout: (fn, ms) => setTimeout(fn, ms)', 'clear: (id) => clearTimeout(id)', 'every: (fn, ms) => setInterval(fn, ms)', 'stop: (id) => clearInterval(id)']) assert.ok(src.includes(f), f)
})
test('ending needs no question, is safe twice, and a failing product leaves nothing running', async () => {
  const c = clock(); const t = fakeTimers(); const calls = []; const sim = createHostSimulation({ now: c.now, timers: t })
  await sim.start('stopped', async (k) => { calls.push(k) }); await sim.end(); await sim.end()
  assert.deepEqual(calls, ['stopped', ''], 'the second end does nothing'); assert.equal(sim.active.value, false)
  await assert.rejects(sim.start('unresponsive', async () => { throw new Error('cannot') }), /cannot/); assert.equal(sim.active.value, false); assert.equal(t.jobs.length, 0)
  await assert.rejects(sim.start('nonsense', async () => {}), /unknown simulation/)
  await sim.start('offline', async () => {}); await sim.start('unresponsive', async () => {}); assert.equal(sim.kind.value, 'unresponsive', 'one at a time: the new one replaces the old'); assert.equal(t.jobs.filter((j) => !j.every).length, 1)
})
test('choosing 「未模拟」 ends it without a question, the running one does nothing, any other asks first', () => {
  assert.equal(chooseSimulation('offline', ''), 'end'); assert.equal(chooseSimulation('', ''), 'end')
  assert.equal(chooseSimulation('offline', 'offline'), 'none'); assert.equal(chooseSimulation('', 'offline'), 'ask'); assert.equal(chooseSimulation('offline', 'stopped'), 'ask')
  const row = read('src/vue/devmode/DevHostSim.vue'); const ask = read('src/vue/devmode/DevSimConfirm.vue')
  assert.ok(!/sim\.start\(/.test(row), 'the row never starts a simulation by itself'); assert.match(ask, /sim\.start\(kind, props\.simulate\)/)
  assert.match(row, /<MSeg :options="options" :model-value="sim\.kind\.value"/, 'the segment that is selected is the simulation that runs')
  assert.match(ask, /data-dev="simulate-cancel"/); assert.match(ask, /data-dev="simulate-start"/)
  const tests = read('src/vue/devmode/DevTests.vue'); assert.ok(tests.indexOf('</MGroup>') < tests.indexOf('<DevSimConfirm'), 'the question sits outside the group, so the corners of the group stay')
})
test('the question says what happens for each simulation, for up to 60 s, in both languages', () => {
  for (const code of ['zh', 'en']) {
    const D = devmodeTexts(code)
    for (const kind of ['Offline', 'Stopped', 'Unresponsive']) assert.ok(D[`simConfirm${kind}`].length > 12, `${code} ${kind}`)
    assert.match(D.simConfirmTail, /60/); assert.match(D.simConfirmTitle, /\{kind\}/); assert.ok(D.simStart && D.simBanner && D.simChip)
  }
  assert.match(devmodeTexts('zh').simConfirmUnresponsive, /没有响应/)
})

// ---- what the pages draw ----
const toolsOf = (extra = {}) => ({ host: { simulate: async () => {} }, telemetry: { preview: async () => '', test: async () => ({}) }, ...extra })
const html = async (comp, props) => (await renderToString(createSSRApp({ render: () => h(comp, props) }))).replace(/<!--.*?-->/g, '')
test('测试工具 with no simulation: 「未模拟」 is the selected segment and the row says it ends by itself', async () => {
  const out = await html(DevTests, { locale: 'zh', tools: toolsOf(), consentOn: true })
  assert.match(out, /<button[^>]*aria-checked="true"[^>]*>(<[^>]*>)*[^<]*未模拟/); assert.doesNotMatch(out, /data-dev="simulate-banner"/)
  assert.match(out, /最长 60 秒，到时自动结束/); assert.match(out, /data-sim="none"/)
})
test('an active simulation: the chosen segment, the value of the row, the banner with the time left and 「结束模拟」, and the chip of the page header', async () => {
  const sim = useHostSimulation(); await sim.start('unresponsive', async () => {})
  try {
    const out = await html(DevTests, { locale: 'zh', tools: toolsOf(), consentOn: true })
    assert.match(out, /<button[^>]*aria-checked="true"[^>]*>(<[^>]*>)*[^<]*无响应/); assert.match(out, /data-sim="unresponsive"/)
    assert.match(out, /模拟中：主机无响应 · 还剩 \d+ s/); assert.match(out, /data-dev="simulate-banner"/); assert.match(out, /正在模拟：主机无响应<\/b> · \d+ s 后自动结束/); assert.match(out, /结束模拟/)
    const chip = await html(DevSimChip, { locale: 'zh' }); assert.match(chip, /data-dev="simulate-chip"/); assert.match(chip, /模拟中 · 无响应 · \d+ s/); assert.match(chip, /data-dev="simulate-chip-end"/)
  } finally { await sim.end() }
  assert.equal((await html(DevSimChip, { locale: 'zh' })).trim(), '', 'the chip leaves with the simulation')
})
test('发送测试事件: off and known is disabled at once with its reason; not known yet waits with its own indicator, not switched off; on is plain', async () => {
  const off = await html(DevTests, { locale: 'zh', tools: toolsOf(), consentOn: false, consentReady: true })
  assert.match(off, /<button[^>]*data-dev="telemetry-test"[^>]*disabled|<button[^>]*disabled[^>]*data-dev="telemetry-test"/); assert.match(off, /遥测未开启，不会发送/)
  const waiting = await html(DevTests, { locale: 'zh', tools: toolsOf(), consentOn: false, consentReady: false })
  assert.doesNotMatch(waiting, /遥测未开启/); assert.match(waiting, /aria-busy="true"[^>]*data-state="idle"|data-state="idle"[^>]*aria-busy="true"/); assert.match(waiting, /m-loading/)
  const on = await html(DevTests, { locale: 'zh', tools: toolsOf(), consentOn: true, consentReady: true })
  assert.doesNotMatch(on, /遥测未开启/); assert.doesNotMatch(on, /data-dev="telemetry-test"[^>]*disabled/)
})
test('the page sends with its own pending state: 「发送中」 on the row, the answer in the same place, never a second send while one runs', () => {
  const v = read('src/vue/devmode/DevTests.vue')
  assert.match(v, /sending\.value = true; answer\.value = ''/); assert.match(v, /if \(sending\.value \|\| !props\.consentReady \|\| !props\.consentOn\) return/)
  assert.match(v, /testSending/); assert.match(v, /settle\(D\.value\.testSent\)/); assert.match(v, /settle\(D\.value\.testFailed\)/)
  const page = read('src/vue/MDeveloperPage.vue')
  assert.match(page, /import \{ createChanger \}/); for (const key of ['debug', 'level', 'cover', 'cloak', 'channel']) assert.match(page, new RegExp(`change\\('${key}'`))
  assert.match(page, /restore: \(\) => \{ s\.debug = was \}/, 'a failed change goes back')
  assert.ok(!/Promise\.all\(\[\s*t\.environment/.test(page), 'no value waits for the slowest read')
  assert.match(page, /if \(!props\.omit\.includes\('env'\)\) read\('env'/, 'the environment (seconds: the host and the system) is read only by a page that draws it')
  assert.match(page, /if \(!touched\.has\(key\)\) set\(value\)/, 'a late read does not undo a change the person already made')
  for (const key of ['debug', 'level', 'win', 'channel']) assert.match(page, new RegExp(`:pending="[^"]*unread\\.${key}`), `${key} shows its own indicator until read`)
  assert.match(page, /safe\(fn\)\.then\(\(value\) => \{ unread\[key\] = false;/, 'a read that failed has come back: the indicator does not wait for ever')
})
test('every stack row puts its control in the control slot, so its value is drawn (it was drawn in place of the control\'s second line before)', () => {
  for (const f of ['src/vue/MDeveloperPage.vue', 'src/vue/devmode/DevFlags.vue', 'src/vue/devmode/DevHostSim.vue']) {
    const src = read(f)
    for (const m of src.matchAll(/<MItem[^>]*\bstack\b[^>]*>(.{0,40})/g)) assert.match(m[1], /<template #control>|^\s*$|\n/, `${f}: ${m[0].slice(0, 80)}`)
    assert.ok(!/stack[^>]*><MSeg/.test(src), `${f}: a MSeg is the default slot of a stack row`)
  }
})
test('the switch and the segmented control take a pending state: the handle carries the loading indicator, a press waits', () => {
  const sw = read('src/vue/MSwitch.vue'); assert.match(sw, /pending: \{ type: Boolean/); assert.match(sw, /if \(!props\.pending\) model\.value = !model\.value/); assert.match(sw, /<MLoading v-if="pending" class="m-switch__busy"/)
  assert.match(read('src/vue/MSwitchItem.vue'), /:pending="pending"/); assert.match(read('src/vue/MSeg.vue'), /if \(props\.pending\) return/)
  assert.match(read('src/css/expressive.css'), /\.m-switch\.is-pending \.m-switch__icon \{ opacity: 0/); assert.match(read('src/css/controls.css'), /\.m-seg\.is-pending/)
})

// ---- 构建与组件 ----
test('in a narrow window the header keeps the chip only, and the rows of 构建与组件 are rows of the shared item (they break long values themselves), no table of its own is left', () => {
  const css = read('src/css/devmode.css'); const i = css.indexOf('@media (max-width: 520px) {\n  .m-page__bar-actions .dm-simchip'); assert.ok(i > 0)
  const part = css.slice(i)
  assert.match(part, /\.m-page__bar-actions \.dm-simchip \.m-btn \{ display: none; \}/)
  assert.doesNotMatch(css, /\.dm-trow|\.dm-table|\.dm-kv/, 'the hand-made table and key-value card are gone')
  assert.match(read('src/css/layout.css'), /\.m-item__text \{[^}]*overflow-wrap: anywhere/)
})
test('a row of the developer pages with many choices wraps in a narrow window instead of running past the card', () => {
  assert.match(read('src/css/devmode.css'), /\.m-devpage \.m-item__control \.m-seg, \.dm-col \.m-item__control \.m-seg \{ flex-wrap: wrap; row-gap: 2px; \}/)
})
test('构建与组件 has the motion of the other pages: the same tokens and keyframes, a stagger with a cap, and reduced motion cuts all of it', () => {
  const css = read('src/css/reveal.css'); const i = css.indexOf("/* 构建与组件"); assert.ok(i > 0); const part = css.slice(i)
  // the page is made of sections and groups now: the rules of the page reveal (sections rise in turn, rows follow 16 ms apart, ten at most, reduced motion cuts them) apply to it as to every other page
  assert.match(css, /\.m-page__column \.m-section \{\s*animation: m-reveal-rise/); assert.match(css, /\.m-page__column \.m-group > \.m-item \{\s*animation: m-reveal-rise/); assert.match(css, /\.m-page__column \.m-group > \.m-item:nth-child\(n\+10\) \{ --m-i: 9; animation: none; \}/, 'a long group does not animate row by row')
  assert.match(css, /html\[data-motion='reduced'\] \.m-page__column :is\(\.m-section, \.m-cards > \*, \.m-group > \.m-item, \.m-banner\) \{ animation: none; \}/)
  assert.doesNotMatch(part, /\.dm-bar|\.dm-table|\.dm-kvcard|\.dm-trow/, 'no motion of its own for the hand-made layout that is gone')
  for (const token of ['m-reveal-pop', 'm-reveal-fade', '--m-spring-default-spatial-duration', '--m-spring-default-effects']) assert.ok(part.includes(token), token)
  assert.doesNotMatch(part, /@keyframes/, 'no new motion system: the keyframes are the ones of the page reveal')
  assert.match(part, /\.dm-col\[data-dev='build'\] \.m-btn\[data-copied\] \.m-icon \{ animation: m-reveal-pop/, 'the copy button\'s done state')
  assert.match(part, /@media \(prefers-reduced-motion: reduce\) \{\s*html:not\(\[data-motion='full'\]\)/); assert.match(part, /html\[data-motion='reduced'\] :is\(\.dm-col\[data-dev='build'\] \.m-btn\[data-copied\] \.m-icon, \.dm-simchip\)/)
  const vue = read('src/vue/devmode/DevBuild.vue'); assert.match(vue, /data-dev="build"/); assert.match(vue, /data-copied/)
  for (const name of ['MSection', 'MGroup', 'MItem']) assert.match(vue, new RegExp(`import ${name} from`), `${name} is the page's layout`)
})
test('构建与组件 shows the last environment at once and refreshes in place; the copy button turns into its done state', async () => {
  const v = read('src/vue/devmode/DevBuild.vue')
  assert.match(v, /const info = ref\(cached\(\)\)/); assert.match(v, /setItem\(BUILD_CACHE_KEY, JSON\.stringify\(fresh\)\)/)
  assert.match(v, /:icon="copied \? 'check' : 'content_copy'"/); assert.match(v, /\{\{ copied \? T\.copied : T\.buildCopy \}\}/)
  globalThis.localStorage = { getItem: (k) => (k === 'foundation-ui.dev.build' ? JSON.stringify({ product: 'P', version: '9.9.9', builds: [{ name: 'panel', sha: 'abc' }], components: [{ id: 'host', name: 'Sunshine.exe', version: '1.2.3', commit: 'c0ffee', installed: true }], os: 'Windows 11', locale: 'zh-CN' }) : null), setItem() {}, removeItem() {} }
  try { const out = await html(DevBuild, { locale: 'zh', environment: () => new Promise(() => {}) }); assert.match(out, /Sunshine\.exe/); assert.match(out, /c0ffee/); assert.match(out, /Windows 11/) } finally { delete globalThis.localStorage }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createDoctor, countStatuses, doctorSnapshot, doctorText, normalizeReport, sortItems, worstStatus, DOCTOR_GROUPS, STATUS_LOOK } from '../src/doctor/model.js'
import { doctorTexts, fixButton } from '../src/doctor/texts.js'
import { MOCK_DOCTOR, mockDoctorRequest } from '../src/doctor/mock.js'
import { prepareBundle, PARTS } from '../src/diagnostics/bundle.js'
import { actionDocs, ACTION_DEFS } from '../src/search/texts.js'
import { NAMES } from '../src/icons/names.js'

test('the report of the host becomes groups with their items; a wrong version is no report', () => {
  const r = normalizeReport(MOCK_DOCTOR)
  assert.equal(r.groups.length, 9)
  assert.deepEqual(r.groups.map((g) => g.id), DOCTOR_GROUPS.map((g) => g.id))
  const network = r.groups.find((g) => g.id === 'network')
  assert.equal(network.status, 'fail')
  assert.equal(network.items[0].fix.action.kind, 'restart')
  assert.equal(network.items[0].fix.action.confirm, true)
  assert.equal(normalizeReport({ ...MOCK_DOCTOR, version: 2 }), null)
  assert.equal(normalizeReport(null), null)
})

test('problems come first, then what was not checked, then the passes; the order of the host inside each', () => {
  const items = [{ id: 'a', status: 'pass' }, { id: 'b', status: 'skip' }, { id: 'c', status: 'warn' }, { id: 'd', status: 'fail' }, { id: 'e', status: 'warn' }]
  assert.deepEqual(sortItems(items).map((i) => i.id), ['d', 'c', 'e', 'b', 'a'])
  assert.equal(worstStatus(items), 'fail')
  assert.equal(worstStatus([{ status: 'skip' }, { status: 'pass' }]), 'pass')
  assert.equal(worstStatus([{ status: 'skip' }]), 'skip')
  assert.equal(worstStatus([]), 'skip')
})

test('run asks the host for one group at a time, at most `parallel` at once, and keeps each answer', async () => {
  let open = 0
  let peak = 0
  const asked = []
  const inner = mockDoctorRequest({ speed: 0.01 })
  const request = async (path) => { asked.push(path); open += 1; peak = Math.max(peak, open); try { return await inner(path) } finally { open -= 1 } }
  const d = createDoctor({ request, locale: 'zh-CN', parallel: 3 })
  const running = d.run()
  assert.equal(d.state.running, true)
  assert.ok(d.state.groups.every((g) => g.state === 'queued' || g.state === 'running'))
  await running
  assert.equal(d.state.running, false)
  assert.equal(asked.length, 9)
  assert.ok(asked.every((p) => /\/api\/doctor\?only=\w+&lang=zh$/.test(p)), asked.join(' '))
  assert.equal(peak, 3)
  assert.ok(d.state.groups.every((g) => g.state === 'done'))
  const c = countStatuses(d.state.groups)
  assert.ok(c.fail > 0 && c.warn > 0 && c.skip > 0 && c.pass > 0)
})

test('a host without the route, or one that fails, marks the group as an error and the others still finish', async () => {
  const inner = mockDoctorRequest({ speed: 0 })
  const request = async (path) => (path.includes('only=vdd') ? { ok: false, status: 404, json: null } : path.includes('only=audio') ? Promise.reject(new Error('net')) : inner(path))
  const d = createDoctor({ request })
  await d.run()
  assert.equal(d.state.groups.find((g) => g.id === 'vdd').state, 'error')
  assert.equal(d.state.groups.find((g) => g.id === 'vdd').error, 'unsupported')
  assert.equal(d.state.groups.find((g) => g.id === 'audio').state, 'offline', 'a request that never got an answer is Sunshine being down')
  assert.equal(d.state.groups.filter((g) => g.state === 'done').length, 7)
})

test('rerun asks for one group again; a second run drops the answers of the first', async () => {
  let n = 0
  const inner = mockDoctorRequest({ speed: 0 })
  const d = createDoctor({ request: (p) => { n += 1; return inner(p) } })
  await d.run()
  await d.rerun('network')
  assert.equal(n, 10)
  const first = d.run()
  const second = d.run()
  await Promise.all([first, second])
  assert.ok(d.state.groups.every((g) => g.state === 'done'))
})

test('the snapshot and the AI text carry the problems with their fixes', async () => {
  const d = createDoctor({ request: mockDoctorRequest({ speed: 0 }), locale: 'zh' })
  await d.run()
  const snap = doctorSnapshot(d.state)
  assert.equal(snap.version, 1)
  assert.equal(snap.groups.length, 9)
  assert.ok(JSON.parse(JSON.stringify(snap)))
  const text = doctorText(d.state)
  const lines = text.split('\n')
  const audio = lines.indexOf(lines.find((l) => l.startsWith('## 音频')))
  assert.ok(lines[audio + 1].startsWith('✗ 音频输出'), 'the problem is the first line of its group')
  assert.ok(lines[audio + 2].includes('→ 在「音频输出设备」里选一个存在的设备。'))
  assert.ok(!text.includes('→ undefined'))
})

test('the bundle has a doctor part: on by default, redacted like the others', () => {
  assert.ok(PARTS.some((p) => p.id === 'doctor' && p.on))
  const entries = prepareBundle({ doctor: { version: 1, groups: [{ id: 'network', items: [{ detail: 'Listening on 192.168.7.133' }] }] } })
  const part = entries.find((e) => e.id === 'doctor')
  assert.equal(part.available, true)
  assert.equal(part.included, true)
  assert.ok(!part.text.includes('192.168.7.133'), part.text)
})

test('search offers 开始体检 when the product can open the page', () => {
  assert.ok(ACTION_DEFS.some((a) => a.id === 'doctor'))
  const docs = actionDocs('zh', { doctor: () => {} })
  assert.equal(docs.length, 1)
  assert.equal(docs[0].title, '开始体检')
  assert.match(docs[0].keywords, /health check/)
  assert.equal(actionDocs('en', {}).length, 0)
})

test('every fix action has a button; every icon the page draws from data is in the icon set', () => {
  const T = doctorTexts('zh')
  for (const a of [{ kind: 'open', target: 'setting:x' }, { kind: 'open', target: 'page:x' }, { kind: 'rerun', target: 'gpu' }, { kind: 'restart', target: 'sunshine' }, { kind: 'link', target: 'https://x' }]) {
    const b = fixButton(a, T)
    assert.ok(b && b.label && NAMES.includes(b.icon), a.kind)
  }
  assert.equal(fixButton({ kind: 'nope' }, T), null)
  const icons = [...DOCTOR_GROUPS.map((g) => g.icon), 'power_settings_new', 'inventory_2', 'terminal', 'extension', 'desktop_access_disabled', 'shield', 'build', 'play_arrow', ...Object.values(STATUS_LOOK).map((l) => l.icon), 'schedule', 'health_and_safety', 'smart_toy', 'folder_zip', 'refresh']
  for (const icon of icons) assert.ok(NAMES.includes(icon), icon)
  for (const item of MOCK_DOCTOR.items) if (item.fix.action) assert.ok(fixButton(item.fix.action, T, { canRepair: () => true }), item.id)
})

test('the texts of both languages have the same keys and no filler lead-ins', () => {
  const zh = doctorTexts('zh'), en = doctorTexts('en')
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(zh), keys(en))
  for (const v of keys(zh).map((k) => k.split('.').reduce((o, x) => o[x], zh))) assert.doesNotMatch(String(v), /^(你可以|这里|用于)/)
})

test('the page: the start button, live group rows, problems first, a fix button per problem, export and AI', () => {
  const src = fs.readFileSync(new URL('../src/vue/MDoctor.vue', import.meta.url), 'utf8')
  assert.match(src, /size="lg" icon="health_and_safety"[^>]*@click="run"/)
  assert.match(src, /MProgress v-if="g\.state === 'running'"/)
  assert.match(src, /itemsOf\(g\)/)
  assert.match(src, /buttonOf\(it\.fix\.action\)/)
  assert.match(src, /MDiagExport v-model="exportOpen" :collect="collectWithDoctor"/)
  assert.match(src, /emit\('ai'/)
  assert.match(src, /pending\.value = /)
  const all = fs.readFileSync(new URL('../src/css/all.css', import.meta.url), 'utf8')
  assert.match(all, /doctor\.css/)
})

test('the local source answers first; with Sunshine down the host groups are offline, not failed, and the local ones still answer', async () => {
  const { mockLocalSource } = await import('../src/doctor/mock.js')
  const { hostSource } = await import('../src/doctor/model.js')
  const asked = []
  const local = mockLocalSource({ speed: 0 })
  const spy = { ...local, fetch: (g, l) => { asked.push(`local:${g}`); return local.fetch(g, l) } }
  const host = hostSource(async (p) => { asked.push(`host:${new URL(p, 'http://x').searchParams.get('only')}`); return { ok: false, status: 503, json: null } })
  const d = createDoctor({ sources: [host, spy], parallel: 1 })
  assert.deepEqual(d.state.groups.slice(0, 4).map((g) => `${g.source}:${g.id}`), ['local:service', 'local:install', 'local:process', 'local:drivers'])
  await d.run()
  assert.deepEqual(asked.slice(0, 4), ['local:service', 'local:install', 'local:process', 'local:drivers'])
  assert.ok(d.state.groups.filter((g) => g.source === 'host').every((g) => g.state === 'offline'))
  assert.ok(d.state.groups.filter((g) => g.source === 'local').every((g) => g.state === 'done'))
  assert.equal(d.state.hostOffline, true)
  const snap = doctorSnapshot(d.state)
  assert.equal(snap.host_offline, true)
  assert.equal(snap.groups.find((g) => g.id === 'gpu').state, 'offline')
  assert.match(doctorText(d.state, { offlineText: '没有应答' }), /## gpu \[host: 没有应答\]/)
})

test('a fix has a level: navigation 1, restart 2, repair 3; level 2 and 3 always confirm and carry what they do', async () => {
  const { normalizeItem, FIX_LEVEL } = await import('../src/doctor/model.js')
  assert.deepEqual(FIX_LEVEL, { open: 1, link: 1, rerun: 1, restart: 2, repair: 3 })
  const open = normalizeItem({ id: 'a.1', status: 'warn', fix: { text: 'x', action: { kind: 'open', target: 'page:network' } } })
  assert.equal(open.fix.action.level, 1)
  assert.equal(open.fix.action.confirm, false)
  const restart = normalizeItem({ id: 'a.2', status: 'fail', fix: { text: 'x', action: { kind: 'restart', target: 'sunshine', effect: '重启服务' } } })
  assert.equal(restart.fix.action.level, 2)
  assert.equal(restart.fix.action.confirm, true)
  assert.equal(restart.fix.action.effect, '重启服务')
  const repair = normalizeItem({ id: 'a.3', status: 'fail', fix: { text: 'x', action: { kind: 'repair', target: 'driver:vigem', level: 3 } } }, 'local')
  assert.equal(repair.fix.action.level, 3)
  assert.equal(repair.source, 'local')
  // every action of the mocks that acts says what it will do
  const { MOCK_DOCTOR_LOCAL } = await import('../src/doctor/mock.js')
  for (const i of [...MOCK_DOCTOR.items, ...MOCK_DOCTOR_LOCAL.items]) {
    const a = normalizeItem(i).fix.action
    if (a && a.level >= 2) assert.ok(a.effect.length > 8, `${i.id} has no effect text`)
  }
})

test('a repair has a button only where the product can run it (the panel), with a label that says what it is', () => {
  const T = doctorTexts('zh')
  const repair = { kind: 'repair', target: 'driver:vigem', level: 3 }
  assert.equal(fixButton(repair, T), null)
  assert.deepEqual(fixButton(repair, T, { canRepair: () => true }), { label: '修复', icon: 'build' })
  assert.equal(fixButton({ kind: 'repair', target: 'service:start', level: 2 }, T, { canRepair: () => true }).label, '启动 Sunshine')
  assert.equal(fixButton({ kind: 'open', target: 'page:network' }, T).label, '前往「网络」')
  assert.equal(fixButton({ kind: 'open', target: 'page:nowhere' }, T).label, '前往')
})

test('with Sunshine stopped the local service check fails and offers a level 2 start that says what it does', async () => {
  const { MOCK_DOCTOR_LOCAL_DOWN } = await import('../src/doctor/mock.js')
  const state = MOCK_DOCTOR_LOCAL_DOWN.items.find((i) => i.id === 'service.state')
  assert.equal(state.status, 'fail')
  assert.equal(state.fix.action.target, 'service:start')
  assert.equal(state.fix.action.level, 2)
  assert.ok(state.fix.action.effect.length > 10)
  const src = fs.readFileSync(new URL('../src/vue/MDoctor.vue', import.meta.url), 'utf8')
  assert.match(src, /confirm\.titleOf, \{ label, item: item\.title \}/)
  assert.equal(doctorTexts('zh').confirm.title.endsWith('？'), true)
})

test('the confirmation of a fix says what it does, asks for administrator rights at level 3 and warns when a stream is live', () => {
  const src = fs.readFileSync(new URL('../src/vue/MDoctor.vue', import.meta.url), 'utf8')
  assert.match(src, /action\.level >= 2\) \{\s+const label = buttonOf/)
  assert.match(src, /T\.confirm\.will \}\}<\/b>\{\{ pending\.action\.effect \|\| pending\.item\.fix\.text/)
  assert.match(src, /pending\.action\.level === 3" class="m-doctor__admin"/)
  assert.match(src, /v-if="live" class="m-doctor__live"/)
  assert.match(src, /class="m-doctor__src"/)
  const off = fs.readFileSync(new URL('../src/vue/MHostOffline.vue', import.meta.url), 'utf8')
  assert.match(off, /v-if="canDoctor"[^>]*@click="emit\('doctor'\)"/)
})

// ---- a live stream (「有些串流中不能测的不知道行不行」) ----
const streamReport = (over = {}) => ({
  version: 1, streaming: false,
  groups: [{ id: 'encoder', title: 'Encoders', items: ['encoder.nvenc', 'encoder.software'] }, { id: 'capture', title: 'Capture', items: ['capture.test'] }, { id: 'audio', title: 'Audio', items: ['audio.sink', 'audio.mic'] }, { id: 'network', title: 'Network', items: ['network.ports'] }],
  items: [
    { id: 'encoder.nvenc', group: 'encoder', status: 'pass', title: 'NVENC', detail: 'H.264 ✓' },
    { id: 'encoder.software', group: 'encoder', status: 'skip', title: 'Software', detail: 'Not checked: a stream is running and a probe would disturb it', fix: { text: 'Check again when no stream is running.', action: { kind: 'rerun', target: 'encoder' } } },
    { id: 'capture.test', group: 'capture', status: 'skip', title: 'Test capture', detail: 'Not checked: a stream is running and owns the capture' },
    { id: 'audio.sink', group: 'audio', status: 'fail', title: 'Audio output', detail: '"Headphones" does not exist', fix: { text: 'Choose an existing output.', action: { kind: 'open', target: 'setting:audio_sink' } } },
    { id: 'audio.mic', group: 'audio', status: 'pass', title: 'Microphone', detail: 'vb_cable · ready' },
    { id: 'network.ports', group: 'network', status: 'pass', title: 'Ports', detail: 'listening' },
  ],
  ...over,
})
const doctorOf = (over, streaming) => createDoctor({ request: async (path) => ({ ok: true, status: 200, json: (() => { const only = new URL(path, 'http://x').searchParams.get('only'); const r = streamReport(over); return { ...r, groups: r.groups.filter((g) => g.id === only) } })() }), sources: [{ id: 'host', groups: [{ id: 'encoder' }, { id: 'capture' }, { id: 'audio' }, { id: 'network' }], fetch: (g) => Promise.resolve({ ok: true, status: 200, json: (() => { const r = streamReport(over); return { ...r, groups: r.groups.filter((x) => x.id === g) } })() }) }], streaming })
const item = (d, id) => d.state.groups.flatMap((g) => g.items).find((i) => i.id === id)

test('while a stream is live the encoder, capture and audio-output checks read as not checked, never as passed or failed', async () => {
  const d = doctorOf({ streaming: true })
  await d.run()
  assert.equal(d.state.streaming, true)
  assert.deepEqual(['encoder.nvenc', 'encoder.software', 'capture.test', 'audio.sink'].map((id) => [item(d, id).status, item(d, id).limit]), [['skip', 'disturbed'], ['skip', 'skipped'], ['skip', 'skipped'], ['skip', 'routed']])
  assert.equal(item(d, 'audio.sink').rawStatus, 'fail', 'the host answer is kept')
  assert.equal(item(d, 'audio.sink').fix.action.kind, 'rerun', 'the fix of a limited check is to check again, not to change a setting')
  // the checks that read settings, drivers and the network are the same with a stream
  for (const id of ['audio.mic', 'network.ports']) assert.deepEqual([item(d, id).status, item(d, id).limit], ['pass', ''])
  assert.equal(countStatuses(d.state.groups).fail, 0, 'a failure that was read during a stream is not counted')
  assert.equal(d.state.groups.find((g) => g.id === 'audio').status, 'pass')
})

test('the stream is known from the page too (the live sessions), also when it starts or ends after the answers came', async () => {
  let live = false
  const d = doctorOf({ streaming: false }, () => live)
  await d.run()
  assert.equal(item(d, 'audio.sink').status, 'fail')
  live = true; d.restate()
  assert.deepEqual([item(d, 'audio.sink').status, item(d, 'audio.sink').limit], ['skip', 'routed'])
  live = false; d.restate()
  assert.deepEqual([item(d, 'audio.sink').status, item(d, 'audio.sink').limit, item(d, 'audio.sink').fix.action.kind], ['fail', '', 'open'], 'no stream: the host answer is back')
})

test('the rows say it, and the report for the bundle and the AI carries it', async () => {
  const vue = fs.readFileSync(new URL('../src/vue/MDoctor.vue', import.meta.url), 'utf8')
  assert.match(vue, /class="m-doctor__limit" :data-limit="it\.limit"><b>\{\{ limitLabel\(it\) \}\}<\/b>\{\{ limitWhy\(it\) \}\}/)
  assert.match(vue, /:name="it\.limit \? 'pause_circle' : STATUS_LOOK\[it\.status\]\.icon"/)
  assert.match(vue, /<p v-if="phase === 'done' && limited && !nothing" class="m-hero__text m-doctor__streamnote">/)
  assert.match(vue, /watch\(\(\) => props\.streaming, \(\) => doctor\.restate\(\)\)/)
  for (const loc of ['zh', 'en']) { const T = doctorTexts(loc); for (const k of ['skipped', 'disturbed', 'routed']) { assert.ok(T.stream.label[k] && T.stream.why[k], `${loc} ${k}`); assert.doesNotMatch(T.stream.why[k], /\{/) } assert.match(T.stream.live, /\{n\}/) }
  assert.ok(NAMES.includes('pause_circle') && NAMES.includes('sensors'))
  const d = doctorOf({ streaming: true })
  await d.run()
  const snap = doctorSnapshot(d.state)
  const sink = snap.groups.find((g) => g.id === 'audio').items.find((i) => i.id === 'audio.sink')
  assert.deepEqual([sink.status, sink.limit, sink.host_status], ['skip', 'routed', 'fail'])
  assert.match(doctorText(d.state, { limitText: (l) => `limit ${l}` }), /– Audio output: "Headphones" does not exist \[limit routed\]/)
})

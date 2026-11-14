import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { scenarioOf, smartPlan, suggestions, afterEndsAt, AFTER_STREAM_MS, CURATED } from '../src/vue/homeSmart.js'

// the confirmed lists of the smart overview
const ids = ['journey', 'guide', 'hero', 'pair', 'download', 'cpu', 'gpu', 'memory', 'bitrate', 'fps', 'loss', 'latency', 'session-time', 'current-app', 'clients-online', 'act-stop', 'encoder', 'gamepad-type', 'sw:mic', 'vdd', 'devices', 'sys', 'apps', 'recent-games', 'quick', 'last-session', 'session-heat', 'announcements', 'public-address', 'net', 'errors', 'logs', 'sponsor', 'update']
const SIZES = { 'last-session': ['s', 'm'], 'session-heat': ['s', 'm'], bitrate: ['s', 'm', 'l'], fps: ['s', 'm', 'l'], hero: ['s', 'm', 'l', 'xl'] }
const card = (id, more = {}) => ({ id, available: true, sizes: SIZES[id] || ['s', 'm'], ...more })
const cards = (more = {}) => ids.map((id) => card(id, more[id]))
const NOW = 1_800_000_000_000
const plan = (signals, extra = {}) => smartPlan({ cards: cards(extra.card), signals: { now: NOW, pairedCount: 3, ...signals }, capacity: extra.capacity ?? 200, sizeClass: 'large', unitRows: true, ...extra.plan })
const inOrder = (p, list) => { const at = list.map((id) => p.visible.indexOf(id)); assert.ok(at.every((i) => i >= 0), `all in: ${list.join(',')} ← ${p.visible.join(',')}`); assert.deepEqual(at, [...at].sort((a, b) => a - b), `in this order: ${list.join(',')} ← ${p.visible.join(',')}`) }
const MANUAL = ['gamepad-type', 'encoder', 'sw:mic', 'vdd', 'devices', 'sys', 'apps', 'recent-games', 'download']

test('idle: the host, pairing, the public address, the last session, the quick actions, the announcements, then the CPU, the GPU and the memory', () => {
  const p = plan({})
  assert.equal(p.scenario, 'idle')
  inOrder(p, ['hero', 'pair', 'public-address', 'last-session', 'quick', 'announcements', 'cpu', 'gpu', 'memory'])
})

test('idle: a public address that is not set does not appear; a bad one still does, and so does the first-run list as it was', () => {
  const unset = { card: { 'public-address': { empty: true } } }
  assert.equal(plan({}, unset).visible.includes('public-address'), false)
  assert.equal(plan({ reachBad: true }, unset).visible.includes('public-address'), true, 'a bad address is a set one')
  assert.equal(plan({ pairedCount: 0, isNew: true }, unset).visible.includes('public-address'), true, 'the new scenario is not touched')
})

test('live: the host, who is on it, the application, how long, the bitrate and the frame rate, the loss and the latency, the load, the stop, then the announcements', () => {
  const p = plan({ streaming: true })
  assert.equal(p.scenario, 'live')
  inOrder(p, ['hero', 'clients-online', 'current-app', 'session-time', 'bitrate', 'fps', 'loss', 'latency', 'cpu', 'gpu', 'act-stop', 'announcements'])
  assert.equal(p.sizes.bitrate, 'l'); assert.equal(p.sizes.fps, 'l', '大 on a large window, as before')
})

test('a tile with no data source is not in the plan, whatever the list says', () => {
  const p = smartPlan({ cards: cards().map((c) => (c.id === 'loss' || c.id === 'session-time' ? { ...c, available: false } : c)).filter((c) => c.available), signals: { now: NOW, pairedCount: 3, streaming: true }, capacity: 200, sizeClass: 'large', unitRows: true })
  assert.equal(p.visible.includes('loss'), false); assert.equal(p.visible.includes('session-time'), false)
})

test('the scenarios in order: problem, live, new, after, update, idle; the 30 minutes after a stream', () => {
  const at = (ms, more = {}) => scenarioOf({ pairedCount: 2, lastStreamAt: NOW - ms, now: NOW, ...more })
  assert.equal(AFTER_STREAM_MS, 30 * 60 * 1000)
  assert.equal(at(60 * 1000), 'after'); assert.equal(at(29 * 60 * 1000), 'after')
  assert.equal(at(30 * 60 * 1000), 'idle', 'after 30 minutes it is the idle scenario'); assert.equal(at(3 * 3600 * 1000), 'idle')
  assert.equal(scenarioOf({ pairedCount: 2, now: NOW }), 'idle', 'no stream yet')
  assert.equal(at(60 * 1000, { updateAvailable: true }), 'after', 'after comes before update')
  assert.equal(at(31 * 60 * 1000, { updateAvailable: true }), 'update')
  assert.equal(at(60 * 1000, { streaming: true }), 'live'); assert.equal(at(60 * 1000, { problems: 1 }), 'problem')
  assert.equal(at(60 * 1000, { pairedCount: 0 }), 'new')
})

test('after a stream: the last session large (the largest it offers), the session heat, then the idle list; an update stays next to the host', () => {
  const p = plan({ lastStreamAt: NOW - 5 * 60 * 1000 })
  assert.equal(p.scenario, 'after')
  assert.deepEqual(p.visible.slice(0, 3), ['hero', 'last-session', 'session-heat'])
  assert.equal(p.sizes['last-session'], 'm', 'asked large, it offers 中 at most')
  inOrder(p, ['session-heat', 'pair', 'public-address', 'quick', 'announcements', 'cpu', 'gpu', 'memory'])
  const u = plan({ lastStreamAt: NOW - 5 * 60 * 1000, updateAvailable: true })
  assert.equal(u.scenario, 'after'); assert.deepEqual(u.visible.slice(0, 3), ['hero', 'update', 'last-session'])
  assert.equal(plan({ lastStreamAt: NOW - 40 * 60 * 1000 }).scenario, 'idle')
})

test('manual only: gamepad-type, encoder, sw:mic, vdd, devices, sys, apps, recent-games and download are not in idle, live, after or update, with all the room there is', () => {
  for (const signals of [{}, { streaming: true }, { lastStreamAt: NOW - 60000 }, { updateAvailable: true }]) {
    const p = plan(signals)
    for (const id of MANUAL) assert.equal(p.visible.includes(id), false, `${id} in ${p.scenario}`)
  }
  // the first-run list and the problem list are not touched: the download is on the first, the host's usual tiles under the second
  assert.ok(plan({ pairedCount: 0, isNew: true }).visible.includes('download'))
  const prob = plan({ problems: 1, problemComponents: [] })
  assert.equal(prob.scenario, 'problem'); assert.ok(prob.visible.includes('apps') && prob.visible.includes('vdd'))
})

test('manual only: use lifts one in, a pin and an accepted tile always win', () => {
  const used = plan({}, { plan: { usage: { encoder: { opens: 12, controls: 20 } } } })
  assert.ok(used.visible.includes('encoder')); assert.equal(used.reasons.encoder.key, 'rUsage')
  assert.equal(plan({}, { plan: { usage: { encoder: { opens: 1, controls: 0 } } } }).visible.includes('encoder'), false, 'a little use is not enough')
  assert.ok(plan({}, { plan: { pins: ['vdd'] } }).visible.includes('vdd')); assert.ok(plan({}, { plan: { accepted: ['sys'] } }).visible.includes('sys'))
  assert.ok(plan({ streaming: true }, { plan: { accepted: ['gamepad-type'] } }).visible.includes('gamepad-type'))
})

test('the network rules stay: 网卡 comes forward on Wi-Fi or a slow link, a bad public address comes forward', () => {
  const wifi = plan({ streaming: true, wifiHost: true }); assert.equal(wifi.reasons.net.key, 'rNetWifi'); assert.ok(wifi.visible.indexOf('net') < wifi.visible.indexOf('cpu'))
  assert.equal(plan({ linkSlowMbps: 100 }).reasons.net.key, 'rNetSlow')
  assert.equal(plan({ reachBad: true }).reasons['public-address'].key, 'rAddressBad')
})

// ---- the lists are closed: no fill from the catalogue
const NAMED = {
  idle: ['hero', 'pair', 'public-address', 'last-session', 'quick', 'announcements', 'cpu', 'gpu', 'memory'],
  live: ['hero', 'clients-online', 'current-app', 'session-time', 'bitrate', 'fps', 'loss', 'latency', 'cpu', 'gpu', 'act-stop', 'announcements'],
}
NAMED.after = [...NAMED.idle, 'session-heat']; NAMED.update = [...NAMED.idle, 'update']
for (const k of ['idle', 'after', 'update']) NAMED[k] = [...NAMED[k], ...CURATED]
const withAll = ['act-open-desktop', 'act-add-app', 'act-apps', 'act-clients', 'act-community', 'act-diagnostics', 'act-docs', 'act-downloads', 'act-export-diag', 'star', 'covers', 'table', 'load', 'comp:dlss', 'comp:vdd']
const bigPlan = (signals, more = {}) => smartPlan({ cards: [...cards(), ...withAll.map((id) => card(id))], signals: { now: NOW, pairedCount: 3, ...signals }, capacity: 400, sizeClass: 'extra', unitRows: true, ...more })

test('closed lists: idle, live, after and update show the tiles they name and nothing else, with all the room in the world', () => {
  for (const [scn, signals] of [['idle', {}], ['live', { streaming: true }], ['after', { lastStreamAt: NOW - 60000 }], ['update', { updateAvailable: true }]]) {
    const p = bigPlan(signals)
    assert.equal(p.scenario, scn)
    for (const id of p.visible) assert.ok(NAMED[scn].includes(id), `${id} is not named for ${scn}`)
    assert.deepEqual(p.tiles.filter((t) => !NAMED[scn].includes(t.id)), [], `no tile of the catalogue is scored in ${scn}`)
  }
})

test('closed lists: use, a pin, an accepted tile and the rules bring a tile that is not named', () => {
  assert.ok(bigPlan({}, { usage: { 'act-clients': { opens: 12, controls: 20 } } }).visible.includes('act-clients'))
  assert.equal(bigPlan({}, { usage: { 'act-clients': { opens: 1, controls: 0 } } }).visible.includes('act-clients'), false)
  assert.ok(bigPlan({}, { pins: ['act-clients'] }).visible.includes('act-clients')); assert.ok(bigPlan({ streaming: true }, { accepted: ['act-clients'] }).visible.includes('act-clients'))
  assert.ok(bigPlan({ streaming: true, wifiHost: true }).visible.includes('net')); assert.ok(bigPlan({ linkSlowMbps: 100 }).visible.includes('net'))
  assert.equal(bigPlan({ streaming: true }).visible.includes('net'), false, 'a wired host: no 网卡 while streaming unless it is earned')
  assert.equal(bigPlan({}).visible.includes('net'), false)
  assert.ok(bigPlan({ reachBad: true }).visible.includes('public-address'))
  assert.ok(bigPlan({ problemComponents: ['dlss'] }).visible.includes('comp:dlss'), 'a component with a problem (the problem scenario)')
  assert.equal(bigPlan({}).visible.includes('comp:dlss'), false)
})

test('closed lists: no tile is suggested to fill a hole, and the first-run and problem lists keep their fill from the catalogue', () => {
  assert.deepEqual(suggestions(bigPlan({})), [])
  for (const signals of [{ pairedCount: 0, isNew: true }, { problems: 1 }]) {
    const p = bigPlan(signals)
    assert.ok(p.visible.some((id) => withAll.includes(id) && !id.startsWith('comp:')), `${p.scenario}: the catalogue still fills`)
  }
})

test('the page plans again when the 30 minutes after a stream end: a timer at that moment, not polling', () => {
  assert.equal(afterEndsAt({ lastStreamAt: NOW }), NOW + AFTER_STREAM_MS); assert.equal(afterEndsAt({}), 0); assert.equal(afterEndsAt({ lastStreamAt: 0 }), 0)
  const src = fs.readFileSync(new URL('../src/vue/dash/dashPlan.js', import.meta.url), 'utf8')
  assert.match(src, /watch\(\(\) => afterEndsAt\(props\.ctx\.signals \|\| \{\}\), \(end\) => \{ clearTimeout\(afterTimer\); const left = end - Date\.now\(\); if \(end > 0 && left > 0\) afterTimer = setTimeout\(\(\) => \{ afterTick\.value\+\+ \}, left \+ 1\) \}, \{ immediate: true \}\)/)
  assert.match(src, /const signalsKey = computed\(\(\) => \{[^\n]*afterOn\.value \? 1 : 0\]\.join\(\)/, 'the key changes when the window ends')
  assert.doesNotMatch(src, /setInterval/)
  assert.match(src, /clearTimeout\(afterTimer\)/)
})

// ---- the four places: 添加应用, 下载客户端, 社区, 文档
const OTHER_ACTIONS = ['act-apps', 'act-clients', 'act-diagnostics', 'act-export-diag', 'act-clients', 'act-pair-qr', 'act-restart', 'act-settings']
const curatedPlan = (signals, more = {}) => smartPlan({ cards: [...cards(), ...CURATED.map((id) => card(id)), ...OTHER_ACTIONS.map((id) => card(id))], signals: { now: NOW, pairedCount: 3, ...signals }, capacity: more.capacity ?? 400, sizeClass: 'extra', unitRows: true, ...more.plan })

test('the four places: in idle, update and after they come last, in their order, all at 方形, after every named tile', () => {
  assert.deepEqual([...CURATED], ['act-add-app', 'act-downloads', 'act-community', 'act-docs'])
  for (const signals of [{}, { updateAvailable: true }, { lastStreamAt: NOW - 60000 }]) {
    const p = curatedPlan(signals)
    assert.deepEqual(p.visible.slice(-4), CURATED, p.scenario)
    for (const id of CURATED) assert.equal(p.sizes[id], 's', `${id} in ${p.scenario}`)
    assert.ok(p.visible.every((id, i) => CURATED.includes(id) === (i >= p.visible.length - 4)), 'nothing comes after them')
    assert.equal(p.reasons['act-add-app'].key, 'rCurated')
  }
})

test('the four places: they use the room that is left and never push a named tile out', () => {
  const named = curatedPlan({}, { capacity: 400 }).visible.filter((id) => !CURATED.includes(id))
  const tight = (cap) => curatedPlan({}, { capacity: cap }).visible
  // a budget that holds the named tiles and one more square: one of the four, the first; one that does not: none
  const cost = { s: 2, m: 4, l: 8, xl: 16, strip: 4 }
  const need = (() => { const p = curatedPlan({}); return p.tiles.filter((t) => named.includes(t.id)).reduce((a, t) => a + (cost[t.size] || 2), 0) })() // the budget counts the sizes the plan asks for
  for (const cap of [need - 1, need, need + 2, need + 4, need + 100]) {
    const v = tight(cap)
    const kept = v.filter((id) => !CURATED.includes(id)); const four = v.filter((id) => CURATED.includes(id))
    assert.ok(four.length === 0 || kept.length === named.length || cap < need, `cap ${cap}: a place before a named tile was dropped`)
    assert.deepEqual(four, CURATED.slice(0, four.length), `cap ${cap}: the first ones, in order`)
  }
  assert.deepEqual(tight(need + 2).filter((id) => CURATED.includes(id)), ['act-add-app'])
  assert.deepEqual(tight(need - 1).filter((id) => CURATED.includes(id)), [], 'no room, none: the named tiles are not given up')
})

test('the four places: not while streaming, not in the first-run or problem lists by this rule, and none of the other action tiles come back', () => {
  for (const id of CURATED) assert.equal(curatedPlan({ streaming: true }).visible.includes(id), false, id)
  for (const signals of [{}, { updateAvailable: true }, { lastStreamAt: NOW - 60000 }, { streaming: true }]) {
    const p = curatedPlan(signals)
    for (const id of OTHER_ACTIONS) assert.equal(p.visible.includes(id), false, `${id} in ${p.scenario}`)
  }
  assert.equal(curatedPlan({ problems: 1 }).reasons['act-add-app']?.key === 'rCurated', false, 'the problem list is not touched')
  assert.equal(curatedPlan({ pairedCount: 0, isNew: true }).reasons['act-add-app']?.key === 'rCurated', false, 'the first-run list is not touched')
})

test('the four places: use does not put one before a real tile, a pin or an accepted tile is that and nothing else', () => {
  const p = curatedPlan({}, { plan: { usage: { 'act-docs': { opens: 40, controls: 40 } } } })
  assert.deepEqual(p.visible.slice(-4), CURATED, 'still last')
  const pinned = curatedPlan({}, { plan: { pins: ['act-docs'] } })
  assert.equal(pinned.reasons['act-docs'].key, 'rPinned'); assert.ok(pinned.visible.indexOf('act-docs') < pinned.visible.indexOf('act-add-app'))
})

test('the four places are drawn quiet: the card of the other tiles, no accent fill', () => {
  const read = (p) => fs.readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
  assert.match(read('vue/dash/dashStacks.js'), /plan\.value\.reasons\[id\]\?\.key === 'rCurated' \? \{ \.\.\.c, quiet: true \}/)
  assert.match(read('vue/tiles/TileActionB3.vue'), /'is-quiet': card\.quiet/)
  const css = read('css/tiles-b3.css')
  assert.match(css, /\.m-cala\.is-quiet \{ background: var\(--m-card\);/)
  assert.match(read('vue/tiles/cal/CalAction.vue'), /'is-quiet': card\.quiet/, '添加应用 is drawn by its own component')
  assert.doesNotMatch(css.match(/\.m-cala\.is-quiet[^\n]*/g).join('\n'), /--tk\)|primary-container|--tk-c/, 'no accent in the quiet tile')
})

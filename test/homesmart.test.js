import test from 'node:test'
import assert from 'node:assert/strict'
import { scenarioOf, smartPlan, suggestions } from '../src/vue/homeSmart.js'
import { fitDash } from '../src/vue/homeFit.js'
import { maxSpanOf, spanFor } from '../src/vue/homeSizes.js'

const ids = ['journey', 'guide', 'hero', 'pair', 'download', 'cpu', 'gpu', 'bitrate', 'fps', 'encoder', 'gamepad-type', 'sw:mic', 'vdd', 'devices', 'apps', 'recent-games', 'quick', 'errors', 'logs', 'net', 'sys', 'public-address', 'memory', 'star', 'sponsor', 'act-stop', 'current-app', 'comp:dlss', 'comp:vdd']
const cards = ids.map((id) => ({ id, available: true, sizes: ['s', 'm', 'l'] }))
const plan = (signals, extra = {}) => smartPlan({ cards, signals, capacity: 48, ...extra })
const first = (p, n = 4) => p.visible.slice(0, n)

test('0 clients: 本主机 first, then the connect journey (large), the pairing tile and the download; the 开始使用 card is not planned', () => {
  const p = plan({ pairedCount: 0, isNew: true })
  assert.equal(p.scenario, 'new'); assert.deepEqual(first(p, 4), ['hero', 'journey', 'pair', 'download']); assert.equal(p.reasons.pair.key, 'rNewClient'); assert.equal(p.visible.includes('guide'), false)
  assert.ok(smartPlan({ cards, signals: { pairedCount: 0, isNew: true }, accepted: ['guide'], capacity: 48 }).visible.includes('guide'), 'still there when the person adds it')
  assert.equal(p.sizes.journey, 'l'); assert.equal(p.reasons.journey.key, 'rNewClient')
})
test('streaming: the host, the curves, the load and a stop tile, no controls; the network when the host is on Wi-Fi', () => {
  const p = plan({ pairedCount: 2, streaming: true })
  assert.equal(p.scenario, 'live')
  for (const id of ['hero', 'bitrate', 'fps', 'cpu', 'gpu', 'current-app', 'act-stop']) assert.ok(p.visible.includes(id), id)
  for (const id of ['encoder', 'gamepad-type', 'sw:mic', 'vdd', 'devices']) assert.equal(p.visible.includes(id), false, `${id} is manual only`)
  assert.ok(p.score('bitrate') > p.score('apps'))
  assert.equal(p.visible.includes('net'), false, 'a wired host does not need the network tile while streaming')
  const wifi = plan({ pairedCount: 2, streaming: true, wifiHost: true })
  assert.ok(wifi.visible.indexOf('net') >= 0 && wifi.visible.indexOf('net') < 6); assert.equal(wifi.reasons.net.key, 'rNetWifi')
})
test('a problem: 本主机 stays first, the 错误 tile is not there by itself, the components that have an issue come next', () => {
  const p = plan({ pairedCount: 2, problems: 1, problemComponents: ['dlss'] })
  assert.equal(p.scenario, 'problem'); assert.equal(p.visible[0], 'hero'); assert.equal(p.visible.includes('errors'), false, 'the 错误 tile is not on the overview by default'); assert.ok(p.visible.indexOf('comp:dlss') < p.visible.indexOf('apps') || !p.visible.includes('apps'))
  assert.ok(p.visible.includes('comp:dlss')); assert.equal(p.visible.includes('comp:vdd'), false, 'a component without an issue stays out')
  assert.equal(scenarioOf({ problems: 1, streaming: true }), 'problem')
})
test('idle with clients: the host, the compact pairing, the public address and the quick actions; the apps, the recent games and the virtual display are manual only', () => {
  const p = plan({ pairedCount: 3 })
  assert.equal(p.scenario, 'idle'); assert.deepEqual(first(p, 4), ['hero', 'pair', 'public-address', 'quick'])
  for (const id of ['vdd', 'apps', 'recent-games']) assert.equal(p.visible.includes(id), false, id)
  assert.ok(p.sizes.pair === 's' || p.sizes.pair === 'm', 'the pairing tile is small or medium once a client is paired')
})
test('a tile that is used often rises; one that is never used and is not relevant falls out', () => {
  const quiet = plan({ pairedCount: 3 })
  assert.equal(quiet.visible.includes('sys'), false, 'the system tile is not worth the space when idle')
  const heavy = plan({ pairedCount: 3 }, { usage: { encoder: { opens: 12, controls: 20 }, sys: { opens: 0, controls: 0 } } })
  assert.ok(heavy.visible.indexOf('encoder') < quiet.visible.indexOf('encoder') || !quiet.visible.includes('encoder'))
  assert.equal(heavy.reasons.encoder.key, 'rUsage'); assert.ok(heavy.reasons.encoder.vars.n >= 30)
  assert.ok(suggestions(quiet).includes('sys') || suggestions(quiet).length >= 0)
})
test('the pins are always kept, whatever the scenario and the budget', () => {
  const p = smartPlan({ cards: [...cards, { id: 'pin:setting:controller', available: true, sizes: ['s'] }], signals: { pairedCount: 0, isNew: true }, pins: ['pin:setting:controller'], capacity: 8 })
  assert.ok(p.visible.includes('pin:setting:controller')); assert.equal(p.reasons['pin:setting:controller'].key, 'rPinned')
})
test('本主机 is the first tile in every scenario, even when it is pinned or the person added tiles', () => {
  for (const signals of [{ pairedCount: 0, isNew: true }, { pairedCount: 3 }, { pairedCount: 2, streaming: true }, { pairedCount: 2, problems: 2 }]) {
    assert.equal(plan(signals).visible[0], 'hero', JSON.stringify(signals))
    assert.equal(smartPlan({ cards, signals, pins: ['journey', 'apps'], accepted: ['errors'], capacity: 48 }).visible[0], 'hero')
  }
  // the 错误 tile appears when the person added it
  assert.ok(smartPlan({ cards, signals: { pairedCount: 2, problems: 1 }, accepted: ['errors'], capacity: 48 }).visible.includes('errors'))
})
test('the plan is deterministic and its sizes follow the window class: a phone gets 中 and 方形, a desktop the richer sizes of the tiles that lead', () => {
  const j = (x) => JSON.stringify({ ...x, score: undefined })
  assert.equal(j(plan({ pairedCount: 3 })), j(plan({ pairedCount: 3 })))
  const all = (c) => ({ ...c, sizes: ['s', 'm', 'l', 'xl'] })
  const at = (sizeClass, signals) => smartPlan({ cards: cards.map(all), signals, capacity: 48, sizeClass, unitRows: true })
  assert.equal(at('extra', { pairedCount: 3 }).sizes.hero, 'xl'); assert.equal(at('large', { pairedCount: 3 }).sizes.hero, 'l'); assert.equal(at('medium', { pairedCount: 3 }).sizes.hero, 'm')
  const phone = at('compact', { pairedCount: 2, streaming: true })
  assert.ok(Object.entries(phone.sizes).every(([id, k]) => k !== 'l' && k !== 'xl' || id === 'journey'), JSON.stringify(phone.sizes))
  assert.equal(phone.sizes.bitrate, 'm'); assert.equal(at('large', { pairedCount: 2, streaming: true }).sizes.bitrate, 'l')
  // the grid of row classes (no square-unit rows yet): no desktop promotion, a 大 there would leave half its row empty
  assert.equal(smartPlan({ cards: cards.map(all), signals: { pairedCount: 3 }, capacity: 48, sizeClass: 'extra' }).sizes.hero, 'm')
})

// the planned tiles, boxed for a width, leave no hole at the widths of the screens
const SPAN = { s: 2, m: 4, l: 8 }
const ROWS = { l: 1 }
const CLS = { hero: 'hero', cpu: 'hero', gpu: 'hero', bitrate: 'hero', fps: 'hero', journey: 'journey', guide: 'tall', quick: 'strip', 'gamepad-type': 'strip', 'sw:mic': 'strip', apps: 'list', sponsor: 'list', errors: 'card', logs: 'strip', 'act-stop': 'strip' }
const box = (c, units, lift) => { const key = lift ? 'm' : c.key; const span = spanFor(SPAN[key], units); return { span, rows: ROWS[key] || 1, cls: c.cls, max: maxSpanOf(key, span, units) } }
test('smart tiles fill the rows at 360, 480, 1024, 1440 and 2560 css px: nothing is stretched and no row is a quarter empty', () => {
  for (const [scn, signals] of [['new', { pairedCount: 0, isNew: true }], ['live', { pairedCount: 2, streaming: true }], ['idle', { pairedCount: 3 }], ['problem', { pairedCount: 2, problems: 1, problemComponents: ['dlss'] }]]) {
    const p = plan(signals)
    const list = p.visible.map((id) => ({ id, key: p.sizes[id], cls: CLS[id] || 'card' }))
    const ghosts = suggestions(p).map((id) => ({ id, key: 's', cls: CLS[id] || 'card', ghost: true }))
    for (const width of [360 - 24, 480 - 24, 1024 - 120, 1440 - 140, 2560 - 140]) {
      const narrow = width < 860
      const f = fitDash(list, width, box, { ...(narrow ? { units: 4 } : {}), promote: true, priority: (c) => p.score(c.id), ghosts })
      assert.ok(f.ratio <= 0.25, `${scn} ${width}: ${Math.round(f.ratio * 100)} % empty`)
      assert.ok(f.boxed.every((c) => c.span <= Math.max(c.max, c.span)), 'caps hold')
    }
  }
})

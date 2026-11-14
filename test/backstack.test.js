import test from 'node:test'
import assert from 'node:assert/strict'
import { createNav } from '../src/nav/backstack.js'

const routes = { 'home': { role: 'detail', rail: 'overview', list: false }, about: { role: 'detail', rail: 'overview', list: false, push: true } }
// a window whose history.back() does what a page with a frame can see: it goes back in the joint history and no popstate comes to the page
const fakeHistory = (popstate) => {
  const h = { state: null, entries: [], pushState(state) { this.state = state; this.entries.push(state) }, replaceState(state) { this.state = state }, back: () => { h.backs++; if (popstate) popstate() }, backs: 0 }
  return h
}

test('the back of a pushed page goes back even when the window history brings no popstate', async () => {
  const saved = globalThis.history
  globalThis.history = fakeHistory(null)
  try {
    const nav = createNav({ routes, home: 'home' })
    nav.go('about')
    assert.equal(nav.current.value, 'about')
    nav.pop()
    assert.equal(globalThis.history.backs, 1, 'the window history is asked to go back')
    await new Promise((resolve) => setTimeout(resolve, 460))
    assert.equal(globalThis.history.backs, 2, 'it is asked once more: the entry of the page is the next one down')
    assert.equal(nav.current.value, 'home', 'and the stack goes back by itself when no popstate came')
  } finally { globalThis.history = saved }
})

test('a nav that mirrors by replacing never adds an entry to the window history', () => {
  const saved = globalThis.history
  globalThis.history = fakeHistory(null)
  try {
    const nav = createNav({ routes, home: 'home', mirror: 'replace' })
    nav.go('about')
    nav.go('home')
    assert.equal(globalThis.history.entries.length, 0, 'pushState was not called')
    assert.equal(globalThis.history.state.navIdx, 0, 'and the history position stays')
  } finally { globalThis.history = saved }
})

test('a popstate that leads to the same pages does not replace the stack', () => {
  const saved = globalThis.history, savedWindow = globalThis.window
  const listeners = []
  globalThis.window = { addEventListener: (_, f) => listeners.push(f), removeEventListener() {} }
  globalThis.history = fakeHistory(null)
  try {
    const nav = createNav({ routes, home: 'home' })
    nav.attach()
    nav.go('about')
    const before = nav.entries.value
    for (const f of listeners) f()
    assert.equal(nav.entries.value, before, 'the same array: nothing renders again')
  } finally { globalThis.history = saved; globalThis.window = savedWindow }
})

// a phone has no list pages of the rails: the hub stands for them, so Back from a page is the hub, whatever way the page was reached
const phoneRoutes = {
  'config:list': { role: 'list', rail: 'config' }, 'input:list': { role: 'list', rail: 'input' }, 'stream:list': { role: 'list', rail: 'stream' },
  'settings-hub': { role: 'detail', rail: 'config', list: false }, 'stream-hub': { role: 'detail', rail: 'stream', list: false },
  home: { role: 'detail', rail: 'overview', list: false },
  config: { role: 'detail', rail: 'config' }, gamepad: { role: 'detail', rail: 'input' }, keyboard: { role: 'detail', rail: 'input' }, apps: { role: 'detail', rail: 'stream' },
}
const HUBS = { stream: 'stream-hub', config: 'settings-hub', input: 'settings-hub' }
const ids = (nav) => nav.entries.value.map((e) => e.id)
test('narrow: a page of a rail has the hub under it and no list entry exists', () => {
  const saved = globalThis.history; globalThis.history = fakeHistory(null)
  try {
    let narrow = true
    const nav = createNav({ routes: phoneRoutes, home: 'home', compact: () => narrow, hubOf: HUBS })
    nav.go('settings-hub'); nav.go('gamepad'); assert.deepEqual(ids(nav), ['settings-hub', 'gamepad'])
    nav.go('keyboard'); assert.deepEqual(ids(nav), ['settings-hub', 'keyboard'], 'a page from a page keeps the hub, not the list of its rail')
    nav.selectRail('input'); assert.deepEqual(ids(nav), ['settings-hub'], 'a rail with a hub is the hub')
    nav.selectRail('stream'); assert.deepEqual(ids(nav), ['stream-hub'])
    nav.go('apps'); assert.deepEqual(ids(nav), ['stream-hub', 'apps'])
    nav.selectRail('overview'); assert.deepEqual(ids(nav), ['home'])
    const all = new Set(); for (const step of ['gamepad', 'config', 'apps', 'keyboard']) { nav.go(step); nav.entries.value.forEach((e) => all.add(e.role + ':' + e.id)) }
    assert.ok(![...all].some((k) => k.startsWith('list:')), 'no list entry on a narrow window')
    narrow = false
  } finally { globalThis.history = saved }
})
test('narrow: a restored history state (the browser\'s back, a reload, a link) with a list entry comes out as the hub', () => {
  const saved = globalThis.history
  globalThis.history = { state: { foundationNav: [{ id: 'input:list' }, { id: 'gamepad' }], navIdx: 3 }, pushState() {}, replaceState() {}, back() {} }
  try {
    const nav = createNav({ routes: phoneRoutes, home: 'home', compact: () => true, hubOf: HUBS })
    assert.deepEqual(ids(nav), ['settings-hub', 'gamepad'])
    globalThis.history.state = { foundationNav: [{ id: 'gamepad' }], navIdx: 1 }
    const link = createNav({ routes: phoneRoutes, home: 'home', compact: () => true, hubOf: HUBS })
    assert.deepEqual(ids(link), ['settings-hub', 'gamepad'], 'a link to a page: the hub under it')
    const wide = createNav({ routes: phoneRoutes, home: 'home', compact: () => false, hubOf: HUBS })
    assert.deepEqual(ids(wide), ['input:list', 'gamepad'], 'a wide window keeps its lists')
  } finally { globalThis.history = saved }
})
test('crossing the breakpoint converts the stack both ways', () => {
  const saved = globalThis.history; globalThis.history = fakeHistory(null)
  try {
    let narrow = false
    const nav = createNav({ routes: phoneRoutes, home: 'home', compact: () => narrow, hubOf: HUBS })
    nav.go('gamepad'); assert.deepEqual(ids(nav), ['input:list', 'gamepad'])
    narrow = true; nav.narrow(); assert.deepEqual(ids(nav), ['settings-hub', 'gamepad'])
    narrow = false; nav.widen(); assert.deepEqual(ids(nav), ['input:list', 'gamepad'])
    narrow = true; nav.selectRail('stream'); narrow = false; nav.widen(); assert.deepEqual(ids(nav), ['stream:list'])
  } finally { globalThis.history = saved }
})

// 关于 has two doors: the About button of the rail's footer (a first-level page, no Back) and 帮助与关于 (a page over it, Back). How the page was entered decides, not the page.
test('a push route opened as a root page has no Back and lights no rail item; opened over a page it keeps its Back', () => {
  const saved = globalThis.history
  globalThis.history = fakeHistory(null)
  try {
    const both = { ...routes, help: { role: 'detail', rail: 'help', list: false }, about: { role: 'detail', rail: 'help', rootRail: 'about', list: false, push: true } }
    const nav = createNav({ routes: both, home: 'home' })
    nav.go('help')
    nav.go('about')
    assert.equal(nav.pushed.value, true, 'from 帮助与关于: pushed, Back')
    assert.equal(nav.canPop.value, true)
    assert.equal(nav.rail.value, 'help')
    nav.go('home')
    nav.go('about', undefined, { root: true })
    assert.deepEqual(nav.entries.value.map((e) => e.id), ['about'], 'the footer button replaces the stack: nothing under it to go back to')
    assert.equal(nav.pushed.value, false, 'no Back')
    assert.equal(nav.canPop.value, false, 'no Esc/back either')
    assert.equal(nav.rail.value, 'about', 'the rail item of 帮助与关于 is not lit by the footer button')
    // a root page left by another door: pushing it from 帮助与关于 again is a pushed page
    nav.go('help')
    nav.go('about')
    assert.equal(nav.pushed.value, true)
    nav.go('about', undefined, { root: true })
    assert.equal(nav.pushed.value, false, 'the footer button while it is pushed: first level now')
    // a route that is not a push route ignores the option
    nav.go('home', undefined, { root: true })
    assert.equal(nav.entries.value[0].root, undefined)
  } finally { globalThis.history = saved }
})

test('the choice of the door is kept in the window history (a restore does not give the root page a Back)', () => {
  const saved = globalThis.history
  const both = { ...routes, help: { role: 'detail', rail: 'help', list: false }, about: { role: 'detail', rail: 'help', rootRail: 'about', list: false, push: true } }
  globalThis.history = { state: { foundationNav: [{ id: 'about', root: true }], navIdx: 1 }, pushState() {}, replaceState() {}, back() {} }
  try {
    const nav = createNav({ routes: both, home: 'home' })
    assert.equal(nav.pushed.value, false)
    assert.equal(nav.entries.value[0].root, true)
    globalThis.history = { state: { foundationNav: [{ id: 'help' }, { id: 'about' }], navIdx: 2 }, pushState() {}, replaceState() {}, back() {} }
    const over = createNav({ routes: both, home: 'home' })
    assert.equal(over.pushed.value, true)
  } finally { globalThis.history = saved }
})

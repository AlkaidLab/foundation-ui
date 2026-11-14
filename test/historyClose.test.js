import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, effectScope, nextTick } from 'vue'
import { useHistoryClose } from '../src/vue/useHistoryClose.js'

// a window with a history: pushState adds an entry, back() goes to the entry below and tells the listeners (popstate)
const fakeWindow = () => {
  const listeners = []
  const h = { entries: [{ nav: 1 }], at: 0, get state() { return this.entries[this.at] }, pushState(state) { this.entries = [...this.entries.slice(0, this.at + 1), state]; this.at++ }, back() { if (this.at > 0) { this.at--; listeners.forEach((f) => f()) } } }
  return { h, w: { addEventListener: (_, f) => listeners.push(f), removeEventListener: (_, f) => listeners.splice(listeners.indexOf(f), 1) } }
}
const mount = (setup) => {
  const { h, w } = fakeWindow()
  const saved = { window: globalThis.window, history: globalThis.history }
  globalThis.window = w; globalThis.history = h
  const scope = effectScope()
  try { return { h, ...scope.run(setup), stop: () => { scope.stop(); Object.assign(globalThis, saved) } } } catch (e) { Object.assign(globalThis, saved); throw e }
}

test('a sheet that is open has an entry in the history, and a Back closes it', () => {
  const open = ref(false)
  const s = mount(() => { useHistoryClose(open, () => { open.value = false }); return {} })
  try {
    open.value = true
    assert.equal(s.h.entries.length, 2)
    assert.equal(s.h.state.nav, 1, 'the entry keeps the state of the page')
    s.h.back()
    assert.equal(open.value, false, 'Back closed the sheet')
    assert.equal(s.h.at, 0)
  } finally { s.stop() }
})

test('a sheet closed in another way takes its entry away, after the close, not in it', async () => {
  const open = ref(false)
  const s = mount(() => { useHistoryClose(open, () => { open.value = false }); return {} })
  try {
    open.value = true
    open.value = false
    assert.equal(s.h.at, 1, 'closing does not touch the history')
    await new Promise((resolve) => setTimeout(resolve, 220))
    assert.equal(s.h.at, 0)
  } finally { s.stop() }
})

test('a sheet opened again before the old entry was taken away keeps its own', async () => {
  const open = ref(false)
  const s = mount(() => { useHistoryClose(open, () => { open.value = false }); return {} })
  try {
    open.value = true
    open.value = false
    open.value = true
    await new Promise((resolve) => setTimeout(resolve, 220))
    assert.equal(open.value, true)
    assert.equal(s.h.at, 2, 'the entry of the sheet that is open stays')
  } finally { s.stop() }
})

test('a sheet closed after the page went on does not undo the page', async () => {
  const open = ref(false)
  const s = mount(() => { useHistoryClose(open, () => { open.value = false }); return {} })
  try {
    open.value = true
    s.h.pushState({ nav: 2 })
    open.value = false
    await new Promise((resolve) => setTimeout(resolve, 220))
    assert.equal(s.h.state.nav, 2, 'the new page stays')
  } finally { s.stop() }
})

test('a sheet that cannot be dismissed has no entry', () => {
  const open = ref(false)
  const s = mount(() => { useHistoryClose(open, () => {}, () => true); return {} })
  try { open.value = true; assert.equal(s.h.entries.length, 1) } finally { s.stop() }
})

test('the window of the first run and the remote access window close on the mouse Back like a sheet', () => {
  const source = readFileSync(new URL('../src/vue/MOnboardWindow.vue', import.meta.url), 'utf8')
  assert.match(source, /useHistoryClose\(present, /)
  assert.match(source, /\(\) => !props\.escCloses/, 'a window that asks before it closes has no entry')
})

test('a sheet that is open from the page\'s first moment (an address that names it) has no entry: Back leaves the page', () => {
  const open = ref(true)
  const s = mount(() => { useHistoryClose(open, () => { open.value = false }); return {} })
  try {
    assert.equal(s.h.entries.length, 1, 'no entry was taken: the person did not go to this sheet')
    open.value = false
    assert.equal(s.h.at, 0)
    open.value = true // opened by the person later: an entry, as ever
    assert.equal(s.h.entries.length, 2)
    s.h.back(); assert.equal(open.value, false)
  } finally { s.stop() }
})

test('the window of the first run and the remote access window are present after they are mounted, not at setup: the window the person opened takes its entry, the Back button closes it', () => {
  const source = readFileSync(new URL('../src/vue/MOnboardWindow.vue', import.meta.url), 'utf8')
  assert.match(source, /const present = ref\(false\)\nonMounted\(\(\) => \{ present\.value = true \}\)/)
  const open = ref(false)
  const s = mount(() => { useHistoryClose(open, () => { open.value = false }); return {} })
  try { open.value = true; assert.equal(s.h.entries.length, 2); s.h.back(); assert.equal(open.value, false) } finally { s.stop() }
})

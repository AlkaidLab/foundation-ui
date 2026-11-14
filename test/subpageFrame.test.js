import test from 'node:test'
import assert from 'node:assert/strict'
import { effectScope } from 'vue'
import { useSubpage } from '../src/vue/useSubpage.js'

const withWindow = (inFrame, fn) => {
  const saved = { window: globalThis.window, history: globalThis.history }
  const h = { state: null, pushed: 0, replaced: 0, backs: 0, pushState(s) { this.pushed++; this.state = s }, replaceState(s) { this.replaced++; this.state = s }, back() { this.backs++ } }
  globalThis.history = h
  globalThis.window = { parent: inFrame ? {} : null, addEventListener() {}, removeEventListener() {} }
  globalThis.window.parent ||= globalThis.window
  try { return fn(h) } finally { Object.assign(globalThis, saved) }
}

test('a sub-page opened in a frame replaces the history entry and closes without asking the window to go back', () => {
  withWindow(true, (h) => {
    const sub = effectScope().run(() => useSubpage('k'))
    sub.open('a')
    assert.equal(h.pushed, 0)
    assert.equal(h.replaced, 1)
    assert.equal(sub.current.value, 'a')
    sub.back()
    assert.equal(h.backs, 0)
    assert.equal(sub.current.value, '')
    assert.equal(h.state.k, undefined)
  })
})

test('a sub-page of a page that is not in a frame adds an entry and Back goes back', () => {
  withWindow(false, (h) => {
    const sub = effectScope().run(() => useSubpage('k'))
    sub.open('a')
    assert.equal(h.pushed, 1)
    sub.back()
    assert.equal(h.backs, 1)
  })
})

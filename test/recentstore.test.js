import test from 'node:test'
import assert from 'node:assert/strict'

// the store keeps its list in the window's own storage: a fake one stands in before the module is read
const saved = {}
globalThis.localStorage = {
  getItem: (k) => (k in saved ? saved[k] : null),
  setItem: (k, v) => { saved[k] = String(v) },
  removeItem: (k) => { delete saved[k] },
}
const { recentKeys, rememberRecent, scopeRecent } = await import('../src/settings/recentStore.js')
const { RECENT_KEY, loadRecent } = await import('../src/settings/recent.js')

test('a window that changes hosts: the first host keeps the list the window had, the next starts empty, and writes stay apart', () => {
  const otherHost = `${RECENT_KEY}:https://192.168.1.8:47990`
  rememberRecent('encoder'); rememberRecent('fps')
  assert.deepEqual(recentKeys.value, ['fps', 'encoder'])

  scopeRecent(otherHost)
  assert.deepEqual(recentKeys.value, ['fps', 'encoder'], 'the first scoping keeps the entries the window already has')
  assert.deepEqual(loadRecent({ getItem: (k) => saved[k] ?? null }, otherHost), ['fps', 'encoder'], 'they became this host\'s own list')
  rememberRecent('controller')
  assert.deepEqual(loadRecent({ getItem: (k) => saved[k] ?? null }, RECENT_KEY), ['fps', 'encoder'], 'the plain list of a window that never scopes is untouched')

  const thirdHost = `${RECENT_KEY}:https://192.168.1.9:47990`
  scopeRecent(thirdHost)
  assert.deepEqual(recentKeys.value, [], 'another host starts empty: one host\'s settings are never suggested on another')

  scopeRecent(otherHost)
  assert.deepEqual(recentKeys.value, ['controller', 'fps', 'encoder'], 'coming back to a host brings its own list back')
})

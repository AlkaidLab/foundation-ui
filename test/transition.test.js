import test from 'node:test'
import assert from 'node:assert/strict'
import { createNav } from '../src/nav/backstack.js'

const routes = {
  'display:list': { role: 'list', rail: 'display' },
  vdd: { role: 'detail', rail: 'display' },
  audio: { role: 'detail', rail: 'display' },
  home: { role: 'detail', rail: 'overview', list: false },
}

test('choosing the page the detail pane already shows by default keeps its entry (no new key: the page is not mounted again)', () => {
  const nav = createNav({ routes, home: 'home' })
  nav.selectRail('display')
  const shown = nav.entries.value.length === 1
  assert.ok(shown, 'only the list is on the stack: the first page is the default')
  const key = nav.defaultDetailOf ? nav.defaultDetailOf(nav.list.value).key : null
  nav.go('vdd')
  assert.equal(nav.detail.value.id, 'vdd')
  if (key) assert.equal(nav.detail.value.key, key, 'the same key: the page stays mounted')
  const first = nav.detail.value.key
  nav.go('vdd')
  assert.equal(nav.detail.value.key, first, 'choosing the open page again changes nothing')
  nav.go('audio')
  assert.notEqual(nav.detail.value.key, first, 'another page is a new entry')
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { buildIndex, search } from '../src/search/index.js'
import { actionDocs, searchTexts, ACTION_DEFS } from '../src/search/texts.js'
import { ACTION_TILES } from '../src/pins/registry.js'
import { CATALOGUE_IDS } from '../src/vue/homeCatalogue.js'

// Every button of the original Troubleshooting and Apps pages that does something to the host is an action of the search, in both languages.
const HANDLERS = Object.fromEntries(ACTION_DEFS.map((a) => [a.id, () => {}]))
const first = (locale, q) => search(buildIndex(actionDocs(locale, HANDLERS, searchTexts(locale).types.action)), q).flat.map((d) => d.id)

test('the actions of the original Troubleshooting and Apps pages are found by name and by the other language\'s name', () => {
  const want = [
    ['scanGames', '扫描游戏', 'scan games'], ['stopApp', '关闭应用', 'close app'], ['resetDisplay', '重置显示器', 'reset display'],
    ['setupGuide', '新手引导', 'setup wizard'], ['quitHost', '关闭 sunshine', 'quit sunshine'],
  ]
  for (const [id, zh, en] of want) {
    for (const locale of ['zh', 'en']) {
      assert.ok(first(locale, zh).slice(0, 3).includes(`action:${id}`), `${id} by "${zh}" in ${locale}`)
      assert.ok(first(locale, en).slice(0, 3).includes(`action:${id}`), `${id} by "${en}" in ${locale}`)
    }
  }
})

test('what stops something asks first, the rest runs at once', () => {
  const tier = Object.fromEntries(ACTION_DEFS.map((a) => [a.id, a.tier]))
  for (const id of ['stopApp', 'resetDisplay', 'quitHost']) {
    assert.equal(tier[id], 3, id)
    for (const locale of ['zh', 'en']) assert.ok(searchTexts(locale).actions[id].confirm, `${id} says what happens (${locale})`)
  }
  for (const id of ['scanGames', 'setupGuide']) assert.equal(tier[id], 1, id)
})

test('an action a product has no handler for is not offered (reset display is a Windows host\'s)', () => {
  const docs = actionDocs('en', { scanGames() {} }, 'Actions')
  assert.deepEqual(docs.map((d) => d.id), ['action:scanGames'])
})

test('an action that can be pinned names a tile the catalogue has', () => {
  for (const [action, tile] of Object.entries(ACTION_TILES)) assert.ok(CATALOGUE_IDS.includes(tile), `${action} -> ${tile}`)
  for (const a of ACTION_DEFS) if (a.id in ACTION_TILES) assert.ok(actionDocs('en', { [a.id]() {} })[0].pin, a.id)
})

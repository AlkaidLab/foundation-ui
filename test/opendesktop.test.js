import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCatalogue, CATALOGUE_IDS, catalogueMeta } from '../src/vue/homeCatalogue.js'
import { homeTexts } from '../src/vue/homeModel.js'
import { smartPlan } from '../src/vue/homeSmart.js'
import { buildIndex, search } from '../src/search/index.js'
import { actionDocs, searchTexts, ACTION_DEFS } from '../src/search/texts.js'
import { tileDocs } from '../src/search/docs.js'
import { pinSpecForAction, ACTION_TILES } from '../src/pins/registry.js'
import fs from 'node:fs'

const T = homeTexts('en')
const TZ = homeTexts('zh')

test('the tile is there when the product can open the big screen and absent when it cannot: not a disabled tile', () => {
  const on = buildCatalogue({ now: 1, canOpenDesktop: true }, T).data['act-open-desktop']
  assert.deepEqual([on.type, on.act, on.icon, on.title, on.label], ['action', 'open-desktop', 'tv', 'Open Big Screen', 'Open'])
  assert.equal(buildCatalogue({ now: 1 }, T).data['act-open-desktop'], null)
  assert.equal(buildCatalogue({ now: 1, canOpenDesktop: false }, T).data['act-open-desktop'], null)
  assert.equal(buildCatalogue({ now: 1, canOpenDesktop: true }, TZ).data['act-open-desktop'].title, '打开大屏')
})

test('the tile is in the catalogue as a strip action at small and medium, hidden by default, with the design of the other actions', () => {
  assert.ok(CATALOGUE_IDS.includes('act-open-desktop'))
  assert.equal(catalogueMeta()['act-open-desktop'].def, 'off')
  assert.match(fs.readFileSync(new URL('../src/vue/tiles/TileActionB3.vue', import.meta.url), 'utf8'), /export const tileIds = \[[^\]]*'act-open-desktop'/)
})

test('smart lists: not named in any list, so it stays off until a pin, an accepted tile or use brings it; the lists are not rewritten', () => {
  const cards = [{ id: 'hero', available: true, sizes: ['m', 'l'] }, { id: 'pair', available: true, sizes: ['s', 'm'] }, { id: 'act-open-desktop', available: true, sizes: ['s', 'm'] }]
  const plan = (more = {}, signals = {}) => smartPlan({ cards, signals: { now: 1e12, pairedCount: 3, ...signals }, capacity: 400, sizeClass: 'extra', unitRows: true, ...more })
  for (const signals of [{}, { streaming: true }, { lastStreamAt: 1e12 - 60000 }, { updateAvailable: true }]) assert.equal(plan({}, signals).visible.includes('act-open-desktop'), false)
  assert.ok(plan({ pins: ['act-open-desktop'] }).visible.includes('act-open-desktop'))
  assert.ok(plan({ accepted: ['act-open-desktop'] }).visible.includes('act-open-desktop'))
  assert.ok(plan({ usage: { 'act-open-desktop': { opens: 12, controls: 0 } } }).visible.includes('act-open-desktop'))
  assert.equal(plan({ usage: { 'act-open-desktop': { opens: 1, controls: 0 } } }).visible.includes('act-open-desktop'), false)
})

test('search: 大屏 and Big Screen find the action in both languages, whichever the interface speaks; only a product with a handler offers it', () => {
  const ran = []
  for (const locale of ['zh', 'en']) {
    const docs = actionDocs(locale, { openDesktop: () => ran.push(locale) }, searchTexts(locale).types.action)
    assert.deepEqual(docs.map((d) => d.id), ['action:openDesktop'])
    const index = buildIndex(docs)
    for (const q of ['大屏', 'big screen', 'bigscreen', 'couch', '沙发', '手柄', 'gamepad']) assert.deepEqual(search(index, q).flat.map((d) => d.id), ['action:openDesktop'], `${locale}: ${q}`)
    docs[0].run()
  }
  assert.deepEqual(ran, ['zh', 'en'])
  assert.equal(actionDocs('en', { restart() {} }).some((d) => d.id === 'action:openDesktop'), false)
  assert.equal(actionDocs('zh', { openDesktop() {} })[0].title, '打开大屏'); assert.equal(actionDocs('en', { openDesktop() {} })[0].title, 'Open Big Screen')
  assert.equal(ACTION_DEFS.find((a) => a.id === 'openDesktop').tier, 1)
})

test('the action can be pinned to the overview as its tile', () => {
  assert.equal(ACTION_TILES.openDesktop, 'act-open-desktop')
  assert.equal(pinSpecForAction('openDesktop', { title: 'Open Big Screen', icon: 'tv' }).tile, 'act-open-desktop')
  assert.equal(actionDocs('en', { openDesktop() {} })[0].pin.tile, 'act-open-desktop')
})

test('the tile docs of the search can leave a tile out for a product that cannot offer it', () => {
  assert.ok(tileDocs('en').some((d) => d.tile === 'act-open-desktop'))
  assert.equal(tileDocs('en', { exclude: ['act-open-desktop'] }).some((d) => d.tile === 'act-open-desktop'), false)
})

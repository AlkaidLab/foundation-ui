import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { getLabels, getSearchIndex, hasSettingsData, labelOf, labelsFor, onSettingsData, provideSettingsData, settingsDataProblems, settingsDataVersion } from '../src/settings/provider.js'
import { buildSettingsEntries, parseSettingsHash, searchEntries } from '../src/settings/index.js'

const entry = (id, tab, sub) => ({ id, title: `t.${id}`, path: ['p.root'], icon: 'tune', keywords: id, route: 'config', params: { tab, ...(sub ? { sub } : {}), focus: id } })
const labels = { en: { 'p.root': 'Root', 't.alpha': 'Alpha', 't.beta': 'Beta' }, zh: { 'p.root': '根', 't.alpha': '甲' }, pt_BR: { 't.alpha': 'Alfa' } }

test('the package carries no settings data of a product: the index and the label tables are empty until the product supplies them', () => {
  assert.equal(hasSettingsData(), false)
  assert.deepEqual([...getSearchIndex()], [])
  assert.deepEqual(getLabels(), {})
  assert.equal(labelOf('zh', 'config.anything'), 'config.anything', 'nobody has the key: the key itself')
  assert.equal(parseSettingsHash('#alpha', getSearchIndex()), null)
  assert.equal(existsSync(new URL('../src/settings/searchIndex.js', import.meta.url)), false)
  assert.equal(existsSync(new URL('../src/settings/labels.js', import.meta.url)), false)
})

test('a malformed supply is refused with a reason, and nothing changes', () => {
  assert.ok(settingsDataProblems(null).length)
  assert.ok(settingsDataProblems({ searchIndex: 1, labels: {} }).some((p) => /searchIndex/.test(p)))
  assert.ok(settingsDataProblems({ searchIndex: [], labels: { zh: {} } }).some((p) => /labels\.en/.test(p)), 'English fills the gaps, so it must be there')
  assert.ok(settingsDataProblems({ searchIndex: [entry('a', 'x'), entry('a', 'x')], labels: { en: {} } }).some((p) => /twice/.test(p)))
  assert.ok(settingsDataProblems({ searchIndex: [{ id: 'a' }], labels: { en: {} } }).length >= 3)
  assert.ok(settingsDataProblems({ searchIndex: [], labels: { en: { k: 3 } } }).some((p) => /labels\.en/.test(p)))
  assert.throws(() => provideSettingsData({ searchIndex: [], labels: {} }), /provideSettingsData: labels\.en is missing/)
  assert.equal(hasSettingsData(), false)
  assert.deepEqual(settingsDataProblems({ searchIndex: [entry('a', 'x')], labels: { en: { k: 'v' } } }), [])
})

test('supplying data makes the rows, the words and the hash work, tells the subscribers, and a new supply replaces the old', () => {
  const seen = []
  const stop = onSettingsData((v) => seen.push(v))
  const v0 = settingsDataVersion()
  provideSettingsData({ searchIndex: [entry('alpha', 'one', 'a'), entry('beta', 'two')], labels })
  assert.equal(hasSettingsData(), true)
  assert.equal(settingsDataVersion(), v0 + 1)
  assert.deepEqual(seen, [v0 + 1])
  assert.deepEqual(getSearchIndex().map((e) => e.id), ['alpha', 'beta'])
  assert.throws(() => { getSearchIndex().push(entry('c', 'x')) }, TypeError, 'the supplied index is frozen')
  assert.equal(labelOf('zh', 't.alpha'), '甲')
  assert.equal(labelOf('zh', 't.beta'), 'Beta', 'a language that lacks a key is filled from English')
  assert.equal(labelOf('pt_BR', 't.alpha'), 'Alfa')
  assert.equal(labelOf('pt-BR', 't.alpha'), 'Alfa', 'a hyphenated tag finds its table')
  assert.equal(labelOf('zh_TW', 't.beta'), 'Beta', 'an unknown region of a language: English')
  assert.equal(labelsFor('xx'), labels.en)
  const rows = buildSettingsEntries({ index: getSearchIndex(), label: (k) => labelOf('zh', k), altLabel: (k) => labelOf('en', k) })
  assert.deepEqual(rows.map((r) => [r.id, r.title, r.path]), [['alpha', '甲', '根'], ['beta', 'Beta', '根']])
  assert.deepEqual(searchEntries(rows, 'alpha').map((r) => r.id), ['alpha'], 'the other language finds the row')
  assert.deepEqual(parseSettingsHash('#alpha', getSearchIndex()), { tab: 'one', sub: 'a', focus: 'alpha' })
  provideSettingsData({ searchIndex: [entry('gamma', 'three')], labels: { en: { 't.gamma': 'Gamma' } } })
  assert.deepEqual(getSearchIndex().map((e) => e.id), ['gamma'])
  assert.equal(labelOf('zh', 't.gamma'), 'Gamma')
  assert.equal(seen.length, 2)
  stop()
  provideSettingsData({ searchIndex: [], labels: { en: {} } })
  assert.equal(seen.length, 2, 'a stopped subscriber is not called')
})

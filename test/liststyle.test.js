import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { LIST_STYLE_KEY, LIST_STYLES, applyListStyle, listStyleOf, setListStyle } from '../src/appearance/listStyle.js'

test('the list pane is merged unless the address or the stored choice says one; an old step is merged too', () => {
  assert.equal(listStyleOf('', ''), 'merged')
  assert.equal(listStyleOf('?liststyle=one', ''), 'one')
  assert.equal(listStyleOf('', 'one'), 'one')
  assert.equal(listStyleOf('?liststyle=one', 'merged'), 'one', 'a valid query wins')
  assert.equal(listStyleOf('?liststyle=step', ''), 'merged')
  assert.equal(listStyleOf('', 'step'), 'merged')
  assert.equal(listStyleOf('?liststyle=step', 'one'), 'one', 'a query that is no style falls to the stored choice')
  assert.equal(listStyleOf('?liststyle=odd', 'odd'), 'merged')
  assert.deepEqual([...LIST_STYLES], ['merged', 'one'])
})

test('the first frame reads the mirror; the record\'s choice is put on the page and mirrored; the address overrides without being kept', () => {
  const root = { dataset: {} }
  const store = new Map()
  const storage = { getItem: (k) => store.get(k) || null, setItem: (k, v) => store.set(k, v) }
  assert.equal(applyListStyle(root, { search: '', storage }), 'merged')
  store.set(LIST_STYLE_KEY, 'step')
  assert.equal(applyListStyle(root, { search: '', storage }), 'merged', 'a stored step of an earlier build does nothing')
  assert.equal(setListStyle(root, 'one', { search: '', storage }), 'one')
  assert.equal(root.dataset.list, 'one')
  assert.equal(store.get(LIST_STYLE_KEY), 'one')
  assert.equal(applyListStyle(root, { search: '', storage }), 'one', 'the next start has it in the first frame')
  assert.equal(setListStyle(root, 'one', { search: '?liststyle=merged', storage }), 'merged', 'the address wins on that page')
  assert.equal(store.get(LIST_STYLE_KEY), 'one', 'and is not kept')
  assert.equal(setListStyle(root, 'step', { search: '', storage }), 'merged')
  assert.equal(store.get(LIST_STYLE_KEY), 'merged')
})

test('the merged list is the frame surface with no line, no shadow, the corner at the list edge', () => {
  const css = fs.readFileSync(new URL('../src/css/shell-blend.css', import.meta.url), 'utf8')
  assert.match(css, /html\[data-list='merged'\] \{ --m-list-fill: var\(--m-rail-fill\); \}/)
  assert.match(css, /html\[data-list='merged'\] \.m-scene__listfill \{ border-top-left-radius: 0; box-shadow: none; \}/)
  assert.match(css, /html\[data-list='merged'\] \.m-scene__corner \{ left: calc\(var\(--c-rail, 0px\) \+ var\(--c-list, 0px\)\); \}/)
})

test('the default is the list and the detail as one surface: no fill of the list, the content panel from the rail', () => {
  const css = fs.readFileSync(new URL('../src/css/shell-blend.css', import.meta.url), 'utf8')
  assert.match(css, /html\[data-list='one'\] \.m-scene__listfill \{ display: none; \}/)
  assert.match(css, /html\[data-list='one'\] \.m-scene__seam \{ left: var\(--c-rail, 0px\); border-top-left-radius: var\(--m-seam-r, 0px\); \}/)
})

test('the one surface has no list fill of its own and the seam and corner at the rail', () => {
  const css = fs.readFileSync(new URL('../src/css/shell-blend.css', import.meta.url), 'utf8')
  assert.match(css, /html\[data-list='one'\] \.m-scene__listfill \{ display: none; \}/)
  assert.doesNotMatch(css, /data-list='step'/, 'the step is gone')
})

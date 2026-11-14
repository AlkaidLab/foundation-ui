import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { compactNeeded } from '../src/vue/coverFit.js'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// the action row of a card (编辑 / 关闭 / 更多): the labels are never allowed to wrap; the row measures itself against the card
test('the row shows its labels only while the buttons and their gaps fit the room of the card', () => {
  // three pills of a running card (编辑, 关闭, 更多) at 82 px with 6 px gaps need 258 px; the card of the team's window gave 211
  assert.equal(compactNeeded([82, 82, 82], 6, 211), true)
  assert.equal(compactNeeded([82, 82, 82], 6, 258), false)
  assert.equal(compactNeeded([82, 82, 82], 6, 258.4), false, 'sub-pixel rounding is not a reason to hide labels')
  assert.equal(compactNeeded([82, 82, 82], 6, 257), true)
  // an idle card has two actions and more room for them
  assert.equal(compactNeeded([82, 82], 6, 170), false)
  assert.equal(compactNeeded([], 6, 0), false)
})

test('a button of the row never shrinks or wraps, and the compact row is the same three actions as icons with their names as tooltips', () => {
  const css = read('src/css/expressive.css')
  const act = css.split('\n').find((l) => l.startsWith('.m-cover__act { all: unset;'))
  assert.ok(/flex: none;/.test(act) && /white-space: nowrap;/.test(act), 'the pill keeps its size and its label on one line')
  assert.ok(/\.m-cover__actions\[data-compact\] \.m-cover__act \{ width: 32px; padding: 0; \}/.test(css))
  assert.ok(/\.m-cover__actions\[data-compact\] \.m-cover__act span \{ display: none; \}/.test(css))
  assert.ok(!/@container m-cover \(max-width: 190px\)/.test(css), 'a fixed card width no longer decides: the measurement does (a label of another language is another width)')
  const grid = read('src/vue/MCoverGrid.vue')
  assert.ok(grid.includes('const anyCompact = need.some(Boolean)') && grid.includes('const compact = anyCompact'), 'one look per grid: if any card cannot fit its labels, every card shows icons')
  assert.ok(grid.includes("compactNeeded(") && grid.includes("setAttribute('data-compact', '')") && grid.includes("setAttribute('data-tip', label)"))
  assert.ok(grid.includes('new ResizeObserver(schedule)') && grid.includes('onUpdated(schedule)') && grid.includes('document.fonts?.ready'))
  assert.ok(grid.includes(':aria-label="`${a.label}: ${item.title}`"'), 'the icon button keeps its name for a screen reader')
})

test('the list of 串流 has no button of its own: the stylesheet has no rule for one', () => {
  assert.ok(!read('src/css/layout.css').includes('m-navlist__add'))
})

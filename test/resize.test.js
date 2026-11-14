import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { RAIL_WIDTH, calculateScene, layoutOf, listDetailStrategy, supportingPaneStrategy, navigationOf, railWidthOf } from '../src/nav/scenes.js'
import { watchPixelRatio } from '../src/nav/dpr.js'

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')
const entries = [{ key: 'l', id: 'input:list', role: 'list' }, { key: 'd', id: 'gamepad', role: 'detail', supporting: 'state' }]
const strategies = [supportingPaneStrategy(), listDetailStrategy()]

test('every window width from 720 to 5120 (every 8 px): the columns add up to the space, none is negative, the page keeps room', () => {
  for (let width = 720; width <= 5120; width += 8) {
    const mode = navigationOf(width)
    const space = width - railWidthOf(mode)
    const scene = calculateScene(strategies, entries, { width, height: 900 })
    const { cols } = layoutOf(scene, space)
    assert.ok(cols.every((c) => c >= 0 && Number.isFinite(c)), `${width}: ${cols}`)
    assert.equal(cols.reduce((a, c) => a + c, 0), space, `${width}: ${cols}`)
    const page = scene.kind === 'single' ? cols[0] || cols[1] : cols[1]
    assert.ok(page >= Math.min(320, space), `${width}: page ${page}`)
  }
})

test('widths that DPI scaling gives (a 1920 / 2560 / 3840 screen at 100-250 %): the layout follows the CSS width', () => {
  for (const screen of [1920, 2560, 3840]) for (const scale of [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5]) {
    const width = Math.floor(screen / scale)
    const scene = calculateScene(strategies, entries, { width, height: 700 })
    const { cols } = layoutOf(scene, width - railWidthOf(navigationOf(width)))
    assert.ok(cols.every((c) => c >= 0), `${screen}@${scale} (${width}): ${cols}`)
  }
  assert.ok(RAIL_WIDTH.collapsed > 0)
})

test('the window reports a new pixel ratio: the callback runs once per change and the query is bound again for the new ratio', () => {
  const queries = []
  const win = { devicePixelRatio: 1, matchMedia: (q) => { const l = new Set(); const o = { q, addEventListener: (_, f) => l.add(f), removeEventListener: (_, f) => l.delete(f), fire: () => [...l].forEach((f) => f()) }; queries.push(o); return o } }
  const seen = []
  const stop = watchPixelRatio((r) => seen.push(r), { win })
  assert.equal(queries[0].q, '(resolution: 1dppx)')
  win.devicePixelRatio = 1.5; queries[0].fire()
  assert.deepEqual(seen, [1.5])
  assert.equal(queries[1].q, '(resolution: 1.5dppx)')
  win.devicePixelRatio = 2; queries[1].fire()
  assert.deepEqual(seen, [1.5, 2])
  stop(); win.devicePixelRatio = 3; queries[2].fire()
  assert.deepEqual(seen, [1.5, 2], 'stopped')
  assert.doesNotThrow(() => watchPixelRatio(() => {}, { win: null })(), 'no window: nothing to do')
})

test('a resize is not animated and a change of pixel ratio re-reads the size (the scene)', () => {
  const scene = read('../src/vue/MScene.vue')
  assert.ok(/'is-animating': animating && !dragging && !resizing/.test(scene), 'columns follow the window in the same frame')
  assert.ok(/watchPixelRatio\(/.test(scene))
})

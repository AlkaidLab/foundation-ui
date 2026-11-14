import test from 'node:test'
import assert from 'node:assert/strict'
import { createNav } from '../src/nav/backstack.js'
import { createJumpHistory } from '../src/nav/jumpHistory.js'

// One source of truth: the rail that is lit, the page that is selected in the list and the page that is shown are all computed from the entries of ONE back stack. This walks the stack with every kind of move
// (the rail, a row, a jump, the global back, the page's own back, a narrow window) and asks, after each step, that the three still name the same page. The jump history is attached the way the products do it.
const R = {
  'stream:list': { role: 'list', rail: 'stream' }, 'display:list': { role: 'list', rail: 'display' }, 'system:list': { role: 'list', rail: 'system' },
  home: { role: 'detail', rail: 'overview', list: false },
  clients: { role: 'detail', rail: 'stream' }, apps: { role: 'detail', rail: 'stream' },
  modes: { role: 'detail', rail: 'display' }, output: { role: 'detail', rail: 'display' }, encoders: { role: 'detail', rail: 'display' },
  doctor: { role: 'detail', rail: 'system' }, network: { role: 'detail', rail: 'system' }, logs: { role: 'detail', rail: 'system' },
  about: { role: 'detail', rail: 'help', rootRail: 'about', list: false, push: true },
  'settings-hub': { role: 'detail', rail: 'system', list: false }, 'stream-hub': { role: 'detail', rail: 'stream', list: false },
}
const HUB_OF = { stream: 'stream-hub', display: 'settings-hub', system: 'settings-hub' }
const RAILS = ['overview', 'stream', 'display', 'system']
const PAGES = Object.keys(R).filter((id) => R[id].role === 'detail')

function seeded(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32 } }

function world(narrow = false) {
  const state = { narrow }
  const nav = createNav({ routes: R, home: 'home', compact: () => state.narrow, hubOf: HUB_OF })
  const jumps = createJumpHistory({
    locate: () => ({ id: nav.current.value, params: nav.detail.value?.params, rail: nav.rail.value }),
    restore: (p) => nav.go(p.id, p.params),
  })
  jumps.attach(nav.entries)
  return { nav, jumps, state }
}

/** what is lit, what is selected and what is shown must be one page */
function agree(nav, note) {
  const shown = nav.detail.value
  const list = nav.list.value
  const page = shown || null
  const rail = nav.rail.value
  if (page) {
    // a page of a push route opened as a first-level page (About from the rail's foot) takes the rail of `rootRail`
    const expected = page.root && R[page.id].rootRail ? R[page.id].rootRail : R[page.id].rail
    assert.equal(rail, expected, `${note}: rail ${rail} is not the rail of the page shown (${page.id})`)
    assert.equal(nav.current.value, page.id, `${note}: the selected row is not the page shown`)
  } else if (list) {
    assert.equal(rail, list.rail, `${note}: rail of a list only`)
    assert.equal(nav.current.value, nav.pagesOf(list.rail)[0], `${note}: the list entry selects its first page`)
  }
  assert.ok(RAILS.includes(rail) || rail === 'help' || rail === 'about', `${note}: ${rail} is a rail`)
}

for (const narrow of [false, true]) {
  test(`${narrow ? 'a narrow window' : 'a wide window'}: after every kind of move the rail, the list row and the page shown are one page (seeded walks)`, () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rnd = seeded(seed)
      const pick = (a) => a[Math.floor(rnd() * a.length)]
      const { nav, jumps, state } = world(narrow)
      for (let step = 0; step < 40; step++) {
        const move = pick(['rail', 'row', 'jump', 'back', 'pop', 'jumpBack', 'about'])
        const label = `seed ${seed} step ${step} ${move}`
        if (move === 'rail') nav.selectRail(pick(RAILS))
        else if (move === 'row') nav.go(pick(PAGES.filter((p) => !R[p].push && R[p].list !== false)))
        else if (move === 'jump') { const to = pick(PAGES.filter((p) => !R[p].push)); jumps.jump(() => nav.go(to)) }
        else if (move === 'back' || move === 'pop') nav.pop()
        else if (move === 'jumpBack') jumps.back()
        else if (move === 'about') nav.go('about', undefined, { root: rnd() < 0.5 })
        agree(nav, label)
      }
      if (!narrow) { state.narrow = true; nav.narrow(); agree(nav, `seed ${seed} narrow`); state.narrow = false; nav.widen(); agree(nav, `seed ${seed} widen`) }
    }
  })
}

test('a jump then the global back lands on the page that was left, with that page\'s rail and row', () => {
  for (const [from, to] of [['clients', 'doctor'], ['doctor', 'network'], ['modes', 'logs'], ['home', 'output'], ['encoders', 'apps']]) {
    const { nav, jumps } = world()
    nav.go(from); jumps.clear()
    const before = { rail: nav.rail.value, current: nav.current.value }
    jumps.jump(() => nav.go(to))
    agree(nav, `${from} → ${to}`)
    assert.equal(nav.current.value, to)
    assert.equal(jumps.back(), true)
    assert.deepEqual({ rail: nav.rail.value, current: nav.current.value }, before, `back from ${to} returns to ${from}`)
    agree(nav, `back to ${from}`)
  }
})

test('a move that is the person\'s own (rail, row) clears the jump history, so no chip names a page that is no longer one step away', () => {
  const { nav, jumps } = world()
  nav.go('clients'); jumps.clear()
  jumps.jump(() => nav.go('doctor'))
  assert.equal(jumps.canBack.value, true)
  nav.selectRail('display')
  assert.equal(jumps.canBack.value, false)
  agree(nav, 'after the rail')
})

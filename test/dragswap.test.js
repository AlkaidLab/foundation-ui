// The carried tile and the swap gate: a swap is not undone by the reflow it causes; the lift is read from the slot every frame
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSwapGate, SWAP_TRAVEL_PX } from '../src/vue/dragSwap.js'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('swap gate: the card just swapped with is not swapped with again while the pointer stays in its middle', () => {
  const g = createSwapGate()
  assert.equal(g.allow('hero', 100, 100), true, 'the first swap is free')
  g.took('hero', 100, 100)
  g.over('hero') // the reflow put the pointer in hero's middle again
  assert.equal(g.allow('hero', 100, 100), false, 'no swap back at once')
  assert.equal(g.allow('hero', 160, 160), false, 'not even after travelling, while still in it')
  g.over('') // the pointer left every middle part
  assert.equal(g.allow('hero', 200, 200), true, 'a deliberate return is a new swap')
})

test('swap gate: a second swap waits for the pointer to travel from the first, whichever card it is', () => {
  const g = createSwapGate()
  g.took('a', 50, 50)
  g.over('b')
  assert.equal(g.allow('b', 50 + SWAP_TRAVEL_PX - 1, 50), false, 'a finger resting on a border does not swap again')
  assert.equal(g.allow('b', 50 + SWAP_TRAVEL_PX, 50), true)
  g.reset()
  assert.equal(g.allow('a', 50, 50), true, 'a new drag starts clean')
  assert.equal(g.allow('', 1, 1), false, 'no card, no swap')
})

test('the drag reads the lift from the slot in every frame, writes it on the cell and not through the template, and swaps through the gate', () => {
  const d = read('src/vue/dash/dashDrag.js')
  assert.match(d, /const dragVars = \(\) => undefined/, 'the lift is not a re-render of the whole overview per pointer move')
  assert.match(d, /cell\.style\.setProperty\('--dx'/); assert.match(d, /cell\.style\.setProperty\('--dy'/)
  assert.match(d, /const k = cell\.offsetWidth > 0 && slot\.width > 0 \? slot\.width \/ cell\.offsetWidth : 1/, 'a cell that is scaled (the arrival of a tile) scales the translation of its body')
  assert.match(d, /requestAnimationFrame\(loop\)/); assert.match(d, /if \(pending\) \{ pending = false; track\(lastX, lastY\) \} else lift\(\)/)
  assert.match(d, /if \(!gate\.allow\(id, x, y\)\) break/); assert.match(d, /gate\.took\(id, lastX, lastY\); nextTick\(lift\)/)
  assert.match(d, /gate\.over\(under\)/)
  assert.match(d, /if \(d\.over\) \{ gate\.over\(''\); return \}/, 'over the gallery the last swap is released')
  assert.match(d, /gate\.over\(cand\)/); assert.match(d, /clearSwap\(\) \/\/ a swap that was waiting/, 'an immediate swap drops a waiting one')
  assert.match(d, /if \(d\.moved && pending && e\.type === 'pointerup'\) \{ lastX = e\.clientX; lastY = e\.clientY; track\(lastX, lastY\) \}/, 'the last move is applied before the lift ends')
  assert.match(d, /lift\(\) \/\/ before the card is drawn as the one that is carried/, 'a tile out of the gallery is never seen in its slot')
  assert.match(d, /let scrollEl\n/, 'the scroller is found once per drag')
  assert.match(read('src/css/dash.css'), /is-dragging \.m-dash__body \{ translate: var\(--dx\) var\(--dy\); transform: scale\(1\.04\); will-change: translate, transform;/)
})

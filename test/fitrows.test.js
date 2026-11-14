import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitRows } from '../src/vue/fitRows.js'

// A box with entries stacked from its top; the tile ends at `tileBottom`. getComputedStyle and the DOM calls are stubbed: this checks the rule (the last entry goes first, the first stays or not), not the browser.
function make({ heights, tileBottom, drop = false, clip = false, boxHeight = 1000 }) {
  let y = 0
  const kids = heights.map((h) => {
    const k = { style: { display: '', removeProperty() { this.display = '' } }, attrs: new Set(), top: 0, h, getAttribute: () => null, hasAttribute(n) { return this.attrs.has(n) }, removeAttribute(n) { this.attrs.delete(n) }, setAttribute(n) { this.attrs.add(n) } }
    return k
  })
  const layout = () => { y = 0; for (const k of kids) { if (k.style.display === 'none') { k.top = 0; k.rect = { top: 0, bottom: 0, height: 0 }; continue } k.rect = { top: y, bottom: y + k.h, height: k.h }; y += k.h + 6 } }
  kids.forEach((k) => { k.getBoundingClientRect = () => { layout(); return k.rect } })
  const tile = { getBoundingClientRect: () => ({ top: 0, bottom: tileBottom }) }
  const box = { children: kids, closest: () => tile, getAttribute: (n) => (n === 'data-fit-rows' && drop ? 'drop' : ''), getBoundingClientRect: () => ({ top: 0, bottom: boxHeight }) }
  globalThis.getComputedStyle = (el) => (el === box ? { display: 'flex', overflowY: clip ? 'hidden' : 'visible', paddingBottom: '0px' } : el === tile ? { paddingBottom: '0px' } : { display: el.style.display || 'block' })
  return { box, kids }
}
const hidden = (kids) => kids.map((k) => k.style.display === 'none')

test('the entries that fit whole stay, the ones below the tile edge leave from the last one', () => {
  const { box, kids } = make({ heights: [48, 48, 48, 48], tileBottom: 110 })
  fitRows(box)
  assert.deepEqual(hidden(kids), [false, false, true, true])
})
test('everything fits: nothing leaves, and a second pass puts back what room allows', () => {
  const { box, kids } = make({ heights: [40, 40], tileBottom: 60 })
  fitRows(box)
  assert.deepEqual(hidden(kids), [false, true])
  const { box: b2, kids: k2 } = make({ heights: [40, 40], tileBottom: 200 })
  k2[1].style.display = 'none'; k2[1].setAttribute('data-fit-hidden')
  fitRows(b2)
  assert.deepEqual(hidden(k2), [false, false])
})
test('the first entry stays unless the container says drop', () => {
  const a = make({ heights: [80], tileBottom: 50 }); fitRows(a.box); assert.deepEqual(hidden(a.kids), [false])
  const b = make({ heights: [80], tileBottom: 50, drop: true }); fitRows(b.box); assert.deepEqual(hidden(b.kids), [true])
})
test('a list that clips itself counts its own edge, not only the tile', () => {
  const { box, kids } = make({ heights: [30, 30, 30], tileBottom: 500, clip: true, boxHeight: 70 })
  fitRows(box)
  assert.deepEqual(hidden(kids), [false, false, true])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { SEARCH_MIN, isTight, roomFor } from '../src/vue/useCaptionRoom.js'

// widths measured in the panel's caption bar (the rail takes 96 px of the window): the logo, the name and the back button; the version; the update line; the actions and the window buttons
test('the room of the search is what the two content-sized ends leave', () => {
  assert.equal(roomFor({ bar: 1184, lead: 523, end: 356 }), 305)
  assert.equal(roomFor({ bar: 904, lead: 390, end: 356 }), 158)
})
test('a 1280 px window shows the search field with a test build and an update line; a 1000 px window with the update line shows its icon', () => {
  assert.equal(isTight({ bar: 1184, lead: 523, end: 356 }), false)
  assert.equal(isTight({ bar: 904, lead: 523, end: 356 }), true)
})
test('a stable build keeps the field down to the width where it still shows its hint', () => {
  assert.equal(isTight({ bar: 1184, lead: 309, end: 356 }), false)
  assert.equal(isTight({ bar: 904, lead: 309, end: 356 }), true, '239 px would cut the placeholder')
  assert.ok(SEARCH_MIN >= 280 && SEARCH_MIN <= 300)
})
test('the Web UI has a shorter end (no window buttons): its field stays longer', () => {
  assert.equal(isTight({ bar: 904, lead: 358, end: 218 }), false)
})

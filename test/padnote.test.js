import { test } from 'node:test'
import assert from 'node:assert/strict'
import { padNoteOf } from '../src/vue/tiles/b2.js'

const texts = { padNote: 'Applies to new controllers', restartNote: 'After a restart' }

// A live note the product put on the strip (a client pad runs as a DualShock 4) replaces the applies note,
// whatever the platform; without one the applies note stays exactly as it was.
test('the note of the controller type: a live line first, then when a change applies', () => {
  assert.equal(padNoteOf({ note: 'A DualSense runs as a DS4', applies: 'next' }, texts), 'A DualSense runs as a DS4')
  assert.equal(padNoteOf({ note: 'A DualSense runs as a DS4', applies: 'restart' }, texts), 'A DualSense runs as a DS4')
  assert.equal(padNoteOf({ applies: 'next' }, texts), texts.padNote)
  assert.equal(padNoteOf({ applies: 'restart' }, texts), texts.restartNote)
  assert.equal(padNoteOf({ applies: 'restart', note: '' }, texts), texts.restartNote)
  assert.equal(padNoteOf({}, texts), texts.restartNote)
  assert.equal(padNoteOf(null, texts), texts.restartNote)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { bottomStack, STACK_BASE, STACK_GAP } from '../src/notify/stack.js'

test('a layer sits above the layers of lower order with a gap, and moves down when one below it goes', () => {
  bottomStack.report('pbar', 0, 56)
  bottomStack.report('snack', 1, 56)
  assert.equal(bottomStack.offsetOf('pbar'), STACK_BASE)
  assert.equal(bottomStack.offsetOf('snack'), STACK_BASE + 56 + STACK_GAP)
  bottomStack.report('thanks', 2, 48)
  assert.equal(bottomStack.offsetOf('thanks'), STACK_BASE + 56 + STACK_GAP + 56 + STACK_GAP)
  bottomStack.release('pbar')
  assert.equal(bottomStack.offsetOf('snack'), STACK_BASE)
  assert.equal(bottomStack.offsetOf('thanks'), STACK_BASE + 56 + STACK_GAP)
  bottomStack.release('snack'); bottomStack.release('thanks')
})

test('a layer that is not on screen takes no room and an unknown one sits at the base above all', () => {
  bottomStack.report('pbar', 0, 0)
  bottomStack.report('snack', 1, 56)
  assert.equal(bottomStack.offsetOf('snack'), STACK_BASE)
  bottomStack.release('pbar'); bottomStack.release('snack')
})

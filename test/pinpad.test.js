import test from 'node:test'
import assert from 'node:assert/strict'
import { PIN_ROWS, pinAppend, pinBackspace, pinComplete, pinDots, pinKeyAction } from '../src/vue/pinpad.js'

test('digits are appended up to the length and nothing else is accepted', () => {
  let pin = ''
  for (const d of '1234') pin = pinAppend(pin, d)
  assert.equal(pin, '1234')
  assert.equal(pinAppend(pin, '5'), '1234')
  assert.equal(pinAppend('12', 'a'), '12')
  assert.equal(pinAppend('12', '10'), '12')
  assert.equal(pinAppend('', '0', 6), '0')
})

test('backspace removes the last digit and stops at empty', () => {
  assert.equal(pinBackspace('123'), '12')
  assert.equal(pinBackspace(''), '')
})

test('dots: entered are filled, the next one is active, the rest empty; a full pin has no active dot', () => {
  assert.deepEqual(pinDots('', 4), ['active', 'empty', 'empty', 'empty'])
  assert.deepEqual(pinDots('12', 4), ['filled', 'filled', 'active', 'empty'])
  assert.deepEqual(pinDots('1234', 4), ['filled', 'filled', 'filled', 'filled'])
  assert.equal(pinComplete('1234', 4), true)
  assert.equal(pinComplete('123', 4), false)
})

test('keyboard keys map to pad actions', () => {
  assert.deepEqual(pinKeyAction('7'), { type: 'digit', digit: '7' })
  assert.deepEqual(pinKeyAction('Backspace'), { type: 'backspace' })
  assert.equal(pinKeyAction('a'), null)
  assert.equal(pinKeyAction('Enter'), null)
})

test('keypad layout has the ten digits and one backspace', () => {
  const keys = PIN_ROWS.flat().filter(Boolean)
  assert.deepEqual(keys.filter((k) => k !== 'backspace').sort(), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
  assert.equal(keys.filter((k) => k === 'backspace').length, 1)
})

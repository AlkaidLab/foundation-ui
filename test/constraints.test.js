import test from 'node:test'
import assert from 'node:assert/strict'
import { CONSTRAINTS, constraintText, validateSetting } from '../src/settings/constraints.js'

test('the base port the team saw (579891) is refused, the ends of the host range are taken', () => {
  assert.equal(validateSetting('port', 579891).code, 'range')
  assert.equal(validateSetting('port', '57989'), null)
  assert.equal(validateSetting('port', 1029), null)
  assert.equal(validateSetting('port', 65514), null)
  assert.equal(validateSetting('port', 1028).code, 'range')
  assert.equal(validateSetting('port', 65515).code, 'range')
  assert.equal(validateSetting('port', '57989.5').code, 'integer')
  assert.equal(validateSetting('port', '12a').code, 'number')
})

test('an empty value takes the default, 0 is the automatic forwarding port, a key without a rule is never refused', () => {
  assert.equal(validateSetting('port', ''), null)
  assert.equal(validateSetting('port', undefined), null)
  assert.equal(validateSetting('usb_forwarding_port', 0), null)
  assert.equal(validateSetting('usb_forwarding_port', 500).code, 'range')
  assert.equal(validateSetting('usb_forwarding_port', 1024), null)
  assert.equal(validateSetting('locale', 'anything'), null)
})

test('a text over the length the host takes is refused, a decimal where the host takes a decimal is taken', () => {
  assert.equal(validateSetting('sunshine_name', 'x'.repeat(256)), null)
  assert.equal(validateSetting('sunshine_name', 'x'.repeat(257)).code, 'length')
  assert.equal(validateSetting('key_repeat_frequency', 24.9), null)
  assert.equal(validateSetting('key_repeat_frequency', -1).code, 'range')
  assert.equal(validateSetting('ping_timeout', -1), null)
  assert.equal(validateSetting('ping_timeout', -2).code, 'range')
})

test('every rule has a sentence in both languages that names its range', () => {
  for (const key of Object.keys(CONSTRAINTS)) {
    const c = CONSTRAINTS[key]
    const bad = c.kind === 'text' ? 'x'.repeat(c.maxLength + 1) : c.max !== undefined && c.max < 2147483647 ? c.max + 1 : c.min !== undefined ? c.min - 1 : 'abc'
    const problem = validateSetting(key, bad)
    if (!problem) continue
    for (const locale of ['zh', 'en']) assert.ok(constraintText(locale, problem).length > 3, key)
  }
  assert.equal(constraintText('zh', validateSetting('port', 579891)), '须在 1029–65514 之间')
  assert.equal(constraintText('en', validateSetting('usb_forwarding_port', 5)), 'Must be 0, or 1024–65535')
})

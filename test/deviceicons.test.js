// The icon of a paired client is the same in the control panel and in the Web UI: one function, here
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deviceIconFor, deviceKindFor, NEUTRAL_DEVICE_ICON } from '../src/vue/deviceIcons.js'

test('the kind of a device comes from its system first, then its name', () => {
  assert.equal(deviceIconFor('K60', 'android'), 'mobile'); assert.equal(deviceIconFor('Zako', 'macos'), 'laptop_mac'); assert.equal(deviceIconFor('Zako', 'windows'), 'desktop_windows')
  assert.equal(deviceIconFor('iPad Air', 'ios'), 'tablet'); assert.equal(deviceIconFor('Zako', 'tvos'), 'tv'); assert.equal(deviceIconFor('Quest 3', 'android'), 'view_in_ar')
  assert.equal(deviceIconFor('Steam Deck'), 'sports_esports'); assert.equal(deviceIconFor('Mac mini', 'macos'), 'desktop_mac')
  assert.equal(deviceIconFor(null), NEUTRAL_DEVICE_ICON); assert.equal(deviceKindFor('Zako', ''), '')
})

test('it is exported with the package so both products import the one copy', () => {
  assert.equal(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).exports['./device-icons'], './src/vue/deviceIcons.js')
  assert.match(readFileSync(new URL('../src/vue/index.js', import.meta.url), 'utf8'), /export \{ deviceKindFor, deviceIconFor, DEVICE_KINDS, DEVICE_RULES, NEUTRAL_DEVICE_ICON \} from "\.\/deviceIcons\.js"/)
})

test('the system filters the kinds before the name picks one: an iPad called 客厅 iPad is a tablet, Android TV stays a television', async () => {
  const { deviceKindFor } = await import('../src/vue/deviceIcons.js')
  assert.equal(deviceKindFor('客厅 iPad', 'ios'), 'tablet')
  assert.equal(deviceKindFor('Android TV', 'android'), 'tv')
  assert.equal(deviceKindFor('客厅 iPad', ''), deviceKindFor('客厅 iPad', ''))
})

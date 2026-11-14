import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { errorTexts } from '../src/vue/errorTexts.js'
import { NAMES } from '../src/icons/names.js'

const src = fs.readFileSync(new URL('../src/vue/MErrorHost.vue', import.meta.url), 'utf8')
const actionsOfStop = src.slice(src.indexOf('<div v-if="hostStop" class="m-err__primary">'), src.indexOf('<div v-else class="m-err__actions">'))

test('the stop and the no-answer dialogs offer 运行体检 as a secondary action, before the restart that confirms', () => {
  assert.ok(actionsOfStop.length > 0, 'the host-stop actions')
  const doctor = actionsOfStop.indexOf('class="m-err__doctor"')
  const restart = actionsOfStop.indexOf('@click="askRestart"')
  assert.ok(doctor > 0 && restart > doctor, 'the doctor button sits before the restart')
  assert.match(actionsOfStop, /<MButton v-if="doctor" variant="tonal" icon="health_and_safety" class="m-err__doctor" @click="runDoctor">\{\{ T\.doctor \}\}<\/MButton>/)
  // one block serves both variants (the stop and the hung host): the button is not behind v-if="hostHung" / v-else
  assert.doesNotMatch(actionsOfStop.slice(doctor - 80, doctor), /v-else|hostHung/)
  // the ordinary error dialog does not get it
  assert.doesNotMatch(src.slice(src.indexOf('<div v-else class="m-err__actions">')), /m-err__doctor/)
  assert.ok(NAMES.includes('health_and_safety'))
})

test('运行体检 steps the dialog aside and hands the product the reason; a product without a health check shows no button', () => {
  assert.match(src, /doctor: \{ type: Function, default: null \}/)
  assert.match(src, /function runDoctor\(\) \{ const reason = hostHung\.value \? 'hung' : 'stop'; hideError\(\); props\.doctor\?\.\(\{ reason \}\) \}/)
})

test('the words exist in both languages', () => {
  assert.equal(errorTexts('zh').doctor, '运行体检')
  assert.equal(errorTexts('en').doctor, 'Run health check')
})

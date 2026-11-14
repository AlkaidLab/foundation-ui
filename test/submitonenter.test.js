import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { submitOnEnter } from '../src/vue/submitOnEnter.js'

const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
const press = (over = {}, field = { type: 'password', matches: (s) => s.includes('md-outlined-text-field') }) => {
  const calls = { submit: 0, prevented: 0 }
  const form = { requestSubmit: () => { calls.submit++ } }
  const event = { key: 'Enter', target: field, currentTarget: form, preventDefault: () => { calls.prevented++ }, ...over }
  return { calls, result: submitOnEnter(event) }
}

test('Enter in a text field of a form asks the form to submit, once, as a real submit', () => {
  const { calls, result } = press()
  assert.equal(result, true)
  assert.deepEqual(calls, { submit: 1, prevented: 1 })
})

test('Enter does nothing while an IME composes, with a modifier, in a textarea, on a button or on a checkbox, or when already handled', () => {
  for (const over of [{ isComposing: true }, { keyCode: 229 }, { shiftKey: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { defaultPrevented: true }, { key: 'a' }]) {
    const { calls, result } = press(over)
    assert.equal(result, false, JSON.stringify(over)); assert.equal(calls.submit, 0)
  }
  assert.equal(press({}, { type: 'textarea', matches: () => true }).calls.submit, 0)
  assert.equal(press({}, { matches: () => false }).calls.submit, 0)
})

test('the sign-in form submits on Enter through the helper and keeps its submit button', () => {
  const page = read('vue/MLoginPage.vue')
  assert.match(page, /import \{ submitOnEnter \} from '\.\/submitOnEnter\.js'/)
  assert.match(page, /<form v-else class="m-login__form" novalidate @submit\.prevent="submit" @keydown="submitOnEnter">/)
  assert.match(page, /<MButton type="submit" class="m-login__submit"/)
  assert.match(page, /:disabled="!canSend && !auth\.busy\.value"/)
})

test('the option 保持登录 is still sent as it was', () => {
  assert.match(read('vue/MLoginPage.vue'), /const input = \{ username: username\.value\.trim\(\), password: password\.value, remember: remember\.value \}/)
})

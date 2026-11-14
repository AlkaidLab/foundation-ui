// A chosen card or row keeps the base and the shape of the ones that are not chosen; the choice is shown by the selected container (--m-sel-fill) and the check, no outline ().
// In a first-run window the page colour is the secondary container, so a chosen card filled with it vanished into the window while the others kept their white base.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css = (f) => fs.readFileSync(new URL(`../src/css/${f}`, import.meta.url), 'utf8')
const rule = (text, selector) => { const i = text.indexOf(`${selector} {`); assert.ok(i >= 0, selector); return text.slice(i, text.indexOf('}', i)) }

test('a chosen choice card is the selected container (--m-sel-fill) with the check, no outline', () => {
  const on = rule(css('settings.css'), '.m-cards__card.is-on')
  assert.match(on, /background: var\(--m-sel-fill\)/, 'the selected container of every choice, not the secondary container (the colour of a first-run window)')
  assert.match(on, /color: var\(--m-sel-ink\)/)
  assert.doesNotMatch(on, /box-shadow|outline|border:/, 'no ring')
  assert.doesNotMatch(on, /secondary-container/)
  assert.doesNotMatch(on, /border-radius/, 'the shape is the card\'s own')
  assert.match(fs.readFileSync(new URL('../src/vue/MChoiceCards.vue', import.meta.url), 'utf8'), /class="m-cards__mark" name="check_circle"/, 'and the check')
})

test('a chosen row of a first-run list (motion, update source) keeps the base of its neighbours and is the selected container, no outline', () => {
  const on = rule(css('onboard.css'), '.m-onboard .m-guide .m-group > .m-item.m-item--selected')
  assert.match(on, /background: var\(--m-sel-fill\)/)
  assert.match(on, /box-shadow: none/)
  assert.doesNotMatch(on, /secondary-container/)
  assert.match(rule(css('onboard.css'), '.m-onboard .m-guide .m-group > .m-item'), /background: var\(--md-sys-color-surface-container-highest\)/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// At the width of a phone (under 600 px) a row of the settings must show its whole name and every control must be on the window.
// What the phone showed before: a name one character to a line in a row with chips (50 px of 334), a group of buttons wider than its row (P7 of the NVENC presets out of the window), a name cut off
// on a button (四分之一分辨率). The rules live in the stylesheets; these tests keep them there.
const css = (file) => readFileSync(new URL(`../src/css/${file}`, import.meta.url), 'utf8')
const phone = (source) => [...source.matchAll(/@media \(max-width: 599\.98px\) \{([^]*?)\n\}/g)].map((m) => m[1]).join('\n')

test('an expert row on a phone: the title keeps 9 em, the chips, the info and the reset go under it', () => {
  const rules = phone(css('settings.css'))
  assert.match(rules, /\.m-expert__toggle \{[^}]*flex-wrap: wrap/)
  assert.match(rules, /\.m-expert__toggle \.m-item__body \{[^}]*flex: 1 1 9em/)
  assert.match(rules, /\.m-expert__control > \.m-btn \{[^}]*max-width: 100%/, 'a value button never runs out of its row')
})

test('a block group of buttons on a phone wraps with whole names instead of cutting a name off', () => {
  const rules = phone(css('expressive.css'))
  assert.match(rules, /\.m-seg--block \{[^}]*flex-wrap: wrap/)
  assert.match(rules, /\.m-seg--block \.m-seg__btn \{[^}]*min-width: max-content/)
  assert.match(rules, /\.m-seg--block \.m-seg__label \{[^}]*overflow: visible/)
})

test('desktop: the same rules are not outside the phone query', () => {
  const settings = css('settings.css').replace(/@media \(max-width: 599\.98px\) \{[^]*?\n\}/g, '')
  const expressive = css('expressive.css').replace(/@media \(max-width: 599\.98px\) \{[^]*?\n\}/g, '')
  assert.doesNotMatch(settings, /m-expert__toggle \{[^}]*flex-wrap/)
  assert.doesNotMatch(expressive, /\.m-seg--block \{[^}]*flex-wrap/)
})

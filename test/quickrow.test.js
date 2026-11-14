import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('the quick actions tile never shows icon-only buttons: a narrow tile keeps its title and the labels and scrolls sideways; every button has an aria-label and a tooltip', () => {
  const css = read('src/css/dash.css')
  // the old rule that hid the title and the labels under 640 px is gone
  assert.ok(!/\.m-dquick__title \{ display: none; \}/.test(css)); assert.ok(!/\.m-dquick__btn span \{ display: none; \}/.test(css))
  assert.match(css, /\.m-dquick \{ container: m-quick \/ inline-size; \}/)
  const q = css.match(/@container m-quick \(max-width: 599px\) \{([\s\S]*?)\n\}/)[1]
  assert.match(q, /\.m-dquick__items \{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto;/); assert.match(q, /\.m-dquick__btn \{ flex: none; \}/)
  const w = read('src/vue/MDashWidget.vue')
  assert.match(w, /class="m-dquick__btn" :aria-label="it\.label" :data-tip="it\.label"/)
  assert.match(w, /<span class="m-dquick__title">\{\{ data\.title \}\}<\/span>/) // the title is always drawn
  assert.match(w, /<MIcon :name="it\.icon" \/><span>\{\{ it\.label \}\}<\/span>/) // and so is each label
})

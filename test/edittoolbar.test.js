// The floating toolbar (FloatingToolbarTokens, Compose Material3) and the edit-mode toolbar built on it (MEditToolbar: the actions and the 完成 FAB).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/css/expressive.css', import.meta.url), 'utf8')
const vue = readFileSync(new URL('../src/vue/MEditToolbar.vue', import.meta.url), 'utf8')
const index = readFileSync(new URL('../src/vue/index.js', import.meta.url), 'utf8')

test('the floating toolbar has the spec box: 64 px, full corners, 8 px at the ends, 4 px between items; standard SurfaceContainer, vibrant PrimaryContainer', () => {
  const bar = css.match(/\n\.m-toolbar__bar \{([^}]*)\}/)[1]
  assert.match(bar, /height: 64px/); assert.match(bar, /padding: 0 8px/); assert.match(bar, /gap: 4px/); assert.match(bar, /border-radius: 9999px/)
  assert.match(bar, /background: var\(--md-sys-color-surface-container\);/)
  assert.match(css, /\.m-toolbar--primary \.m-toolbar__bar, \.m-toolbar--vibrant \.m-toolbar__bar \{ background: var\(--md-sys-color-primary-container\); color: var\(--md-sys-color-on-primary-container\); \}/)
  assert.match(css, /:is\(\.m-toolbar--primary, \.m-toolbar--vibrant\) \.m-toolbar__item\.is-selected \{ background: var\(--md-sys-color-surface-container\); color: var\(--md-sys-color-on-surface\); \}/)
})

test('the edit toolbar floats 16 px above the bottom, centred, the 完成 FAB inline at its end; actions are emitted, the page keeps the state', () => {
  assert.match(css, /\.m-edittoolbar \{ position: fixed;[^}]*left: 50%; bottom: 16px;/)
  assert.match(vue, /<MFab inline extended :icon="doneIcon" :label="doneLabel" @click="\$emit\('done'\)" \/>/)
  assert.match(vue, /@click="\$emit\('action', item\.id\)"/)
  assert.match(vue, /:aria-label="item\.label" :data-tip="item\.label"/)
  assert.match(vue, /tone: \{ type: String, default: 'vibrant' \}/)
  assert.match(index, /export \{ default as MEditToolbar \} from '\.\/MEditToolbar\.vue'/)
})

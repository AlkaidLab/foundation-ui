import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// A page in the control panel's frame cannot dim the window around the frame: every modal says so to the shell (useModalBridge), or the rail, the list and the caption stay bright.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))

test('every modal component of the package opens and closes through the bridge', () => {
  const modals = walk('src/vue').filter((f) => f.endsWith('.vue')).filter((f) => /<dialog\b|showModal\(|class="m-onboard/.test(read(f)))
  assert.ok(modals.length >= 3, `found ${modals.join(', ')}`)
  for (const file of modals) assert.match(read(file), /useModalBridge\(/, `${file} opens a modal and does not tell the shell`)
})

test('the scene lays the same scrim over what the frame cannot reach, closes the modal on a click and on Esc, and keeps the focus in the modal', () => {
  const scene = read('src/vue/MScene.vue')
  assert.match(scene, /m-scene__modalscrim/)
  assert.match(scene, /MODAL_OPEN/); assert.match(scene, /MODAL_CLOSE/)
  assert.match(scene, /key === 'Escape'/)
  assert.match(scene, /inert/)
  const css = read('src/css/layout.css') + read('src/css/components.css') + read('src/css/expressive.css')
  // one token for the page's scrim and the shell's: the same colour, blur and spring
  assert.match(css, /\.m-scene__modalscrim \{[^}]*var\(--m-modal-scrim\)[^}]*var\(--m-modal-blur\)/)
  assert.match(css, /\.m-dialog::backdrop \{ background: var\(--m-modal-scrim\); backdrop-filter: var\(--m-modal-blur\)/)
  assert.match(css, /\.m-sheet::backdrop \{ background: var\(--m-modal-scrim\); backdrop-filter: var\(--m-modal-blur\)/)
})

test('a modal posts its state to the shell only from a frame, and the shell may close it', async () => {
  const posted = []
  const listeners = []
  globalThis.window = { parent: { postMessage: (m) => posted.push(m) }, addEventListener: (t, fn) => listeners.push([t, fn]) }
  globalThis.window.parent !== globalThis.window
  const mod = await import('../src/vue/useModalBridge.js')
  assert.equal(mod.MODAL_OPEN, 'foundation-modal'); assert.equal(mod.MODAL_CLOSE, 'foundation-modal-close')
  delete globalThis.window
})

test('the task flows are centred large dialogs: no right-hand drawer is left in the styles', () => {
  const css = read('src/css/expressive.css')
  assert.match(css, /\.m-sheet--end \{ margin: auto; width: min\(var\(--m-dialog-w, 720px\), calc\(100vw - 48px\)\); height: auto; max-height: 88dvh; \}/)
  assert.match(css, /\.m-sheet--end\.m-sheet--wide \{ --m-dialog-w: 960px; \}/)
  assert.match(css, /max-width: 599\.98px\) \{\n  \.m-sheet--end \{ margin: 0; width: 100vw; max-width: 100vw; height: 100dvh/)
})

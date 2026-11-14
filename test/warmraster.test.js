import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('every dialog and sheet asks for the one-time raster warm-up when it is mounted', () => {
  for (const f of ['MDialog.vue', 'MSheet.vue']) {
    const src = read(`src/vue/${f}`)
    assert.match(src, /import \{ warmDialogRaster \} from '\.\/warmDialogRaster\.js'/, f)
    assert.match(src, /warmDialogRaster\(\)/, f)
  }
})

test('the warm-up paints a hidden copy of the panel once, at 1 % opacity, that nobody can reach', () => {
  const src = read('src/vue/warmDialogRaster.js')
  assert.match(src, /class(Name)? = 'm-dialog__panel/)
  assert.match(src, /opacity:\.01/)
  assert.match(src, /pointer-events:none/)
  assert.match(src, /aria-hidden/)
  assert.match(src, /probe\.inert = true/)
  assert.match(src, /isInputPending/)
  assert.equal((src.match(/let started = false/g) || []).length, 1)
})

test('it runs in a page that has a document only, and only once', async () => {
  const { warmDialogRaster } = await import('../src/vue/warmDialogRaster.js')
  assert.doesNotThrow(() => { warmDialogRaster(); warmDialogRaster() }, 'without a document nothing happens')
})

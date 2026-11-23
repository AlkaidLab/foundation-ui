import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// A file of the tiles and the overview is read and changed by several people at once: past 400 lines it is two files. This guard fails a file over the limit and a grandfathered file that grows.
// (round 37: MHomeDash.vue went from 898 lines to 167 and its setup lives in src/vue/dash/; MDashWidget.vue and dash.css go with the legacy tile path when the new tiles have landed.)
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIMIT = 400, WARN = 300
const GRANDFATHERED = { 'src/vue/MGuideFlow.vue': 650 } // may shrink, never grow; remove the line when it is under the limit

const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(vue|js)$/.test(e.name) ? [path.join(dir, e.name).split(path.sep).join('/')] : []))
const lines = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\n$/, '').split('\n').length

test(`no .vue or .js in src/vue is over ${LIMIT} lines (a grandfathered one does not grow)`, () => {
  const over = []
  for (const f of walk('src/vue')) {
    const n = lines(f)
    if (n > WARN && n <= LIMIT) console.warn(`size: ${f} has ${n} lines (the limit is ${LIMIT})`)
    const cap = GRANDFATHERED[f]
    if (cap ? n > cap : n > LIMIT) over.push(`${f}: ${n} lines (${cap ? `grandfathered at ${cap}` : `limit ${LIMIT}`})`)
  }
  assert.deepEqual(over, [])
})

test('the grandfathered list holds only files that are still over the limit', () => {
  for (const [f, cap] of Object.entries(GRANDFATHERED)) assert.ok(lines(f) > LIMIT, `${f} is under ${LIMIT} lines now: remove it from the list`)
})

test('the overview composer stays small; its setup is in the parts of src/vue/dash/', () => {
  assert.ok(lines('src/vue/MHomeDash.vue') <= 250, 'MHomeDash.vue is the thin composer (~250 lines at most)')
  for (const f of fs.readdirSync(path.join(root, 'src/vue/dash'))) assert.ok(lines(`src/vue/dash/${f}`) <= LIMIT, f)
})

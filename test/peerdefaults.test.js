import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { finalizeBundle } from '../src/diagnostics/bundle.js'

const root = new URL('..', import.meta.url).pathname
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p] })

test('no component takes the name of Sunshine or Moonlight as a default: the Product passes the names it shows', () => {
  const hits = walk(join(root, 'src/vue')).filter((f) => f.endsWith('.vue')).flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => [f, i + 1, l]))
    .filter(([, , l]) => /default:\s*['"`][^'"`]*(sunshine|moonlight)/i.test(l)).map(([f, n]) => `${relative(root, f)}:${n}`)
  assert.deepEqual(hits, [])
})

test('the diagnostics bundle names no product unless the Product gives one', () => {
  const entry = { id: 'log', available: true, file: 'log.txt', text: 'x', size: 1, counts: {} }
  assert.match(finalizeBundle([entry], ['log']).readme ?? finalizeBundle([entry], ['log']).files.join(), /log\.txt/)
})

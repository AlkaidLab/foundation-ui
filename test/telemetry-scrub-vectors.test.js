// The shared scrub vectors (one file, three identical copies: host tests/data/telemetry_scrub_vectors.json, m3e test/scrub-vectors.json, Worker test/scrub-vectors.json).
// Every string in `forbidden` must be gone from the scrubbed text, every string in `required` must stay.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { scrubText } from '../src/telemetry/scrub.js'

const doc = JSON.parse(readFileSync(new URL('./scrub-vectors.json', import.meta.url), 'utf8'))

test('the vector file is the shared one (version 1, at least 30 vectors)', () => {
  assert.equal(doc.version, 1)
  assert.ok(doc.vectors.length >= 30)
})

for (const v of doc.vectors) {
  test(`scrub vector: ${v.name}`, () => {
    const out = scrubText(v.input, 400)
    for (const f of v.forbidden) assert.ok(!out.includes(f), `leaked ${JSON.stringify(f)} -> ${out}`)
    for (const r of v.required) assert.ok(out.includes(r), `lost ${JSON.stringify(r)} -> ${out}`)
  })
}

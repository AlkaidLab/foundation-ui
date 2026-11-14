import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/vue/MGuideFlow.vue', import.meta.url), 'utf8')

// 跳过 leaves the rest of the flow; a required step (the Web UI account) cannot be skipped; the first seconds hold it back (see guidemodel.test.js)
test('跳过 finishes the flow, is not offered on a required step, and marks the setup completed when it is still ahead', () => {
  const skip = source.slice(source.indexOf('async function skip()'), source.indexOf('const primary = computed'))
  assert.match(skip, /props\.required\.includes\(id\.value\)\) return/)
  assert.match(skip, /skipSetup/)
  assert.match(skip, /\n  finish\(\)\n/)
  assert.ok(!/\bnext\(\)/.test(skip), 'it does not go to the next step')
  const show = source.slice(source.indexOf('const showSkip = computed'), source.indexOf('const stepLine'))
  assert.match(show, /!props\.required\.includes\(id\.value\)/)
  assert.match(show, /!isLast\(flow\.value, idx\.value\)/)
})

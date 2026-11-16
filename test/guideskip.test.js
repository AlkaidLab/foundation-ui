import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/vue/MGuideFlow.vue', import.meta.url), 'utf8')

// 跳过 leaves the rest of the flow; a required step (the Web UI account) cannot be skipped; the first seconds hold it back (see guidemodel.test.js)
test('跳过 finishes the flow and counts as skipped; it is not offered on a required step or at the end', () => {
  const skip = source.slice(source.indexOf('async function skip()'), source.indexOf('const primary = computed'))
  assert.match(skip, /props\.required\.includes\(id\.value\)\) return/)
  assert.match(skip, /funnel\.skip\(\)/)
  assert.match(skip, /\n  finish\(\)\n/)
  assert.ok(!/\bnext\(\)/.test(skip), 'it does not go to the next step')
  // the host's setup flag is set when the guide ends, as the setup step did: the display page is an optional one now
  const finish = source.slice(source.indexOf('function finish('), source.indexOf('/* ---------- step state'))
  assert.match(finish, /if \(!skipping\) funnel\.finish\(\)/)
  assert.match(finish, /skipSetup/)
  const show = source.slice(source.indexOf('const showSkip = computed'), source.indexOf('const stepLine'))
  assert.match(show, /!props\.required\.includes\(id\.value\)/)
  assert.match(show, /!isLast\(flow\.value, idx\.value\)/)
  assert.match(show, /!sub\.value/, 'not inside a page of the done page')
})

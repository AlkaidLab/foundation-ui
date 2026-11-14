// Wavy progress (CircularProgressIndicatorTokens; ProgressIndicator.kt circularIndeterminate*) and where it is used: the diagnostics export, the pairing QR wait.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const css = read('css/expressive.css'), vue = read('vue/MProgress.vue')

test('circular: 48 px with the wave, a 20.4 centre line, 8 waves, amplitude 1.6', () => {
  assert.match(css, /\.m-wave-circle \{ width: 48px; height: 48px; \}/)
  assert.match(vue, /const n = 8, amp = props\.flat \? 0 : 1\.6, r = 20\.4/)
  assert.match(vue, /viewBox="0 0 48 48"/)
})

test('circular indeterminate: the arc 10 % to 87 % and back in 6 s, 1080 degrees linear, a 90-degree jump every 1.5 s over 300 ms, no track', () => {
  assert.match(css, /@keyframes m-wave-circle-arc \{ 0% \{ stroke-dasharray: 10 90; animation-timing-function: cubic-bezier\(0\.2, 0, 0, 1\); \} 50% \{ stroke-dasharray: 87 13; \} 100% \{ stroke-dasharray: 10 90; \} \}/)
  assert.match(css, /@keyframes m-wave-circle-spin \{ to \{ transform: rotate\(1080deg\); \} \}/)
  assert.match(css, /5%, 25% \{ transform: rotate\(90deg\); \} 30%, 50% \{ transform: rotate\(180deg\); \} 55%, 75% \{ transform: rotate\(270deg\); \} 80%, 100% \{ transform: rotate\(360deg\); \}/)
  for (const a of ['m-wave-circle-spin', 'm-wave-circle-jump', 'm-wave-circle-arc']) assert.match(css, new RegExp(`animation: ${a} 6000ms linear infinite`))
  const indeterminate = vue.slice(vue.indexOf('<g v-else'))
  assert.doesNotMatch(indeterminate.slice(0, indeterminate.indexOf('</g></g>')), /m-wave-circle__track/)
})

test('the diagnostics export and the pairing QR wait show wavy progress', () => {
  const diag = read('vue/MDiagExport.vue')
  assert.match(diag, /<MProgress :label="T\.collecting" \/>/)
  assert.match(diag, /<MProgress v-if="state === 'saving'"/)
  assert.match(read('vue/MConnectPanel.vue'), /<MProgress circular :label="T\.scanPair" \/>/)
})

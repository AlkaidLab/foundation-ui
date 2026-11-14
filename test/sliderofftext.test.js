import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// A setting whose lowest position means "automatic" (最小编码帧率, 最大比特率) used to sit as a handle at the left end of an empty pale track: it read as a broken bar. The track names the state itself.
const read = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

test('a slider at its lowest position writes the name of that state in the track when it has one', () => {
  const src = read('vue/MSlider.vue')
  assert.match(src, /offText: \{ type: String, default: '' \}/)
  assert.match(src, /v-if="isOff\(values\[0\]\)" class="m-slider__off"/)
  assert.match(read('css/expressive.css'), /\.m-slider__off \{[^}]*pointer-events: none/)
})

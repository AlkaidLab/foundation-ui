// The system tile and the paired clients tile keep their content inside the tile: a long system name (Windows 11 IoT Enterprise LTSC 2024) is split into a family and an edition, and the paired clients tile's
// circles stay above its lower edge.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { osParts } from '../src/vue/homeSystemTiles.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

test('a system name is split where the long part starts: the family large, the edition small', () => {
  assert.deepEqual(osParts('Windows 11 IoT Enterprise LTSC 2024'), { family: 'Windows 11', edition: 'IoT Enterprise LTSC 2024' })
  assert.deepEqual(osParts('Windows 11 Pro'), { family: 'Windows 11', edition: 'Pro' })
  assert.deepEqual(osParts('Windows Server 2022 Datacenter'), { family: 'Windows Server 2022', edition: 'Datacenter' })
  assert.deepEqual(osParts('Ubuntu 24.04 LTS'), { family: 'Ubuntu 24.04', edition: 'LTS' })
  assert.deepEqual(osParts('macOS Sequoia 15.1'), { family: 'macOS Sequoia 15.1', edition: '' })
  assert.deepEqual(osParts('Linux'), { family: 'Linux', edition: '' })
  assert.deepEqual(osParts(''), { family: '', edition: '' })
  const tile = read('src/vue/tiles/TileFacts.vue')
  assert.match(tile, /<b class="m-tfacts__os" :title="d\.big">\{\{ d\.family \|\| d\.big \}\}<\/b>/)
  assert.match(tile, /<small v-if="d\.edition" class="m-tfacts__ed"/)
  assert.match(read('src/vue/fitText.js'), /FIT_SELECTOR = '[^\n]*, \.m-tfacts__os'/)
})
test('the paired clients tile at 方形 draws its count a size smaller so the circles stay inside the tile', () => {
  assert.match(read('src/css/tilefit-real.css'), /\.m-b2paired\.is-s \.m-b2paired__count \{ --tn: 46px; margin-top: 4px; \}/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')

test('the scene draws its frame with boxes at the edges (no path of a measured width) and its scrim is wider than any window', () => {
  const scene = read('../src/vue/MScene.vue')
  const css = read('../src/css/layout.css')
  assert.ok(!/frame-clip/.test(scene + css), 'no clip-path frame')
  assert.ok(/\.m-scene::before \{[^}]*left: 0; right: 0; top: 0; height: var\(--m-content-y/.test(css), 'the caption bar box spans edge to edge')
  assert.ok(/m-scene__railfill/.test(scene) && /m-scene__barfill/.test(scene) && /m-scene__corner/.test(scene))
  assert.ok(/const OUTER = 'M-4000 -4000H24000V24000H-4000Z'/.test(scene), 'the outside of the scrim clip')
  assert.ok(!/M0 0H\$\{W\}V\$\{H\}H0Z/.test(scene), 'no scrim clip with a measured outer width')
})

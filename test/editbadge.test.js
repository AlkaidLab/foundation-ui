import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { badgeSpot, insideTile, overlapFraction } from '../src/vue/homeBadge.js'
import { readDash } from './dashSource.js'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// the same area counted another way: a fine grid of points of the disc, each asked whether it is in the tile
function sampled(R, r, c) {
  const n = 700
  let inside = 0, all = 0
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) {
    const x = c - r + ((i + 0.5) / n) * 2 * r, y = c - r + ((j + 0.5) / n) * 2 * r
    if (Math.hypot(x - c, y - c) > r) continue
    all += 1
    if (insideTile(R, x, y)) inside += 1
  }
  return inside / all
}

test('G2a: the delete badge cuts a quarter of its disc into the tile\'s corner, for every corner radius and badge radius (numerical, not a fixed offset)', () => {
  for (const R of [16, 20, 24, 28, 32, 40]) for (const r of [10, 12, 14, 16]) {
    const spot = badgeSpot(R, r)
    assert.ok(Math.abs(spot.fraction - 0.25) < 1e-6, `R ${R} r ${r}: ${spot.fraction}`)
    assert.ok(Math.abs(sampled(R, r, spot.c) - 0.25) < 0.004, `R ${R} r ${r}: sampled ${sampled(R, r, spot.c)}`)
    // the centre is on the 45 degree diagonal of the corner arc, spot.d from the arc's centre
    assert.ok(Math.abs(Math.hypot(R - spot.c, R - spot.c) - spot.d) < 1e-9)
    assert.ok(spot.at === spot.c - r)
    assert.ok(spot.d < R + r && spot.d > R - r, 'it overlaps the tile but is not buried in it')
  }
  // a different quarter would move it: the offset is computed, it is not a constant
  assert.notEqual(badgeSpot(28, 14).d - 28, badgeSpot(20, 14).d - 20)
  assert.ok(overlapFraction(28, 14, 28 - 40 * Math.SQRT1_2) < 0.25 && overlapFraction(28, 14, 28 - 30 * Math.SQRT1_2) > 0.25)
})

test('G2a: the page tells the CSS where the centre is (from the tile radius it reads), and the CSS places the badge by it', () => {
  const css = read('src/css/dash.css')
  const rule = css.match(/\.m-dash \.m-dash__badge \.m-dash__remove \{([^}]*)\}/)[1]
  assert.match(rule, /--bd: var\(--m-badge-r, 14px\)/); assert.match(rule, /--at: calc\(var\(--m-badge-c, 5px\) - var\(--bd\)\)/)
  assert.match(rule, /top: var\(--at\); left: var\(--at\)/) // the same offset on both axes: the 45 degree diagonal
  assert.match(rule, /width: calc\(var\(--bd\) \* 2\); height: calc\(var\(--bd\) \* 2\)/)
  const vue = readDash()
  assert.match(vue, /import \{ badgeSpot \} from '\.\/homeBadge\.js'/)
  assert.match(vue, /'--m-badge-c': `\$\{badge\.c\}px`, '--m-badge-r': `\$\{BADGE_R\}px`/)
  assert.match(vue, /getPropertyValue\('--m-dash-radius'\)/)
})

test('G2a: tonal and readable with a ring of the surface, 44 px of reach that never takes a press from the tile', () => {
  const css = read('src/css/dash.css')
  const rule = css.match(/\.m-dash \.m-dash__badge \.m-dash__remove \{([^}]*)\}/)[1]
  assert.match(rule, /background: var\(--md-sys-color-error-container\)/); assert.match(rule, /color: var\(--md-sys-color-on-error-container\)/)
  assert.ok(!/inverse-surface|#000/.test(rule))
  assert.match(rule, /box-shadow: 0 0 0 2px var\(--md-sys-color-surface\), 0 0 0 3px color-mix\(in srgb, var\(--md-sys-color-on-surface\) 40%, transparent\), 0 2px 8px/) // the ring parts the badge from the tile it overlaps; the shadow reads on light, dark, 纯黑 and a wallpaper
  assert.match(css, /\.m-dash__remove::before \{ content: ''; position: absolute; inset: -8px;/) // 28 + 16 = 44
  // the reach is only outside the tile: the quarter of the 44 px box that lies in the tile is cut away
  assert.ok(css.includes('clip-path: polygon(0 0, 100% 0, 100% calc(8px + var(--bd) - var(--m-badge-c, 5px)), calc(8px + var(--bd) - var(--m-badge-c, 5px)) calc(8px + var(--bd) - var(--m-badge-c, 5px)), calc(8px + var(--bd) - var(--m-badge-c, 5px)) 100%, 0 100%)'))
  // the layer of the badge takes the body's transforms
  assert.match(css, /\.is-edit \.m-dash__badge \{ transform: scale\(\.975\);/)
  assert.match(css, /\.is-edit \.m-dash__cell\.is-dragging \.m-dash__badge \{ translate: var\(--dx\) var\(--dy\); transform: scale\(1\.04\);/)
  assert.match(css, /\.is-edit \.m-dash__cell\.is-dragging\.is-over-sheet \.m-dash__badge \{ transform: scale\(\.88\);/)
  assert.match(readDash(), /<div v-if="edit" class="m-dash__badge"><button type="button" class="m-dash__remove"/)
  // its class is not the old toolbar's (.m-dash__tools is a pill with a background)
  assert.ok(!/class="m-dash__tools"/.test(readDash()))
})

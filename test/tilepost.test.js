import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const css = read('../src/css/tilefit-real.css')
const rules = (sel) => css.split('\n').filter((l) => l.startsWith(sel))
const S = '.m-tile.m-b2recent.is-s, .m-tile.m-b2apps.is-s'

// The team: 「最近玩过改成海报变成背景然后左下角写字的磁贴样式」: the art is the tile, the words sit bottom left on a scrim.
test('最近玩过 and 应用 at 方形: the art fills the whole tile, aspect-fill, with a bottom scrim and nothing at the top (the title is no longer drawn over the top of the art)', () => {
  const art = rules(`${S} .m-b2art,`).join('\n') || rules('.m-tile.m-b2recent.is-s .m-b2art, .m-tile.m-b2apps.is-s .m-b2art {').join('\n')
  assert.match(art, /position: absolute; inset: 0/); assert.match(art, /clip-path: none/, 'the tile clips it with its own radius')
  const cover = rules('.m-tile.m-b2recent.is-s .m-b2art .m-tcover,').join('\n')
  assert.match(cover, /background-size: cover/)
  const scrim = rules('.m-tile.m-b2recent.is-s .m-b2art::after').join('\n') + css.split('\n').find((l) => l.includes('linear-gradient(to top, rgb(0 0 0 / 0.8)'))
  assert.match(scrim, /to top/); assert.doesNotMatch(scrim, /to bottom/)
  assert.ok(!css.includes('.m-b2recent.is-s::before'), 'no plate over the art any more')
  assert.ok(!/\.m-b2recent\.is-s \.m-b2art, \.m-b2apps\.is-s \.m-b2art \{ grid-row/.test(css), 'no thumbnail row under the head')
})

test('最近玩过 and 应用 at 方形: white words, the name at the bottom left and the time under it in a softer white, the title the last line at the foot (it was drawn over the art at the top)', () => {
  assert.match(css, /--on-art: #fff; --on-art-2: rgb\(255 255 255 \/ 0\.78\)/)
  const name = rules('.m-tile.m-b2recent.is-s .m-b2__name, .m-tile.m-b2apps.is-s .m-b2__name').join('\n')
  assert.match(name, /margin: auto 0 0/, 'pushed to the bottom'); assert.match(name, /color: var\(--on-art\)/)
  const cap = rules('.m-tile.m-b2recent.is-s .m-b2__cap').join('\n')
  assert.match(cap, /color: var\(--on-art-2\)/)
  const head = rules('.m-tile.m-b2recent.is-s > .m-calm__head').join('\n')
  assert.match(head, /order: 3/); assert.match(head, /color: var\(--on-art-2\)/); assert.match(head, /z-index: 2/)
})

test('the tile still renders the name, the time and the cover in that order (the markup the CSS relies on)', () => {
  const now = read('../src/vue/tiles/TileNow.vue')
  assert.match(now, /<header class="m-calm__head">[^]*?<span class="m-b2art"><MTileCover :name="games\[0\]\?\.name" :cover="games\[0\]\?\.cover" \/><\/span>\s*<b class="m-b2__name">\{\{ games\[0\]\?\.name \}\}<\/b>\s*<span class="m-b2__cap">\{\{ games\[0\]\?\.sub \}\}<\/span>/)
  const lib = read('../src/vue/tiles/TileLibrary.vue')
  assert.match(lib, /m-b2art[^\n]*MTileCover[^\n]*\n\s*<b class="m-b2__name">\{\{ shown\[0\]\.name \}\}<\/b>/)
})

// 目标码率 中: the 上限 chip sits inside the tile, on the title row, not on the tile's top edge.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/css/tilefit-4tb.css'), 'utf8')

test('the last rule of the 目标码率 中 chip keeps it inside the tile', () => {
  const rules = [...css.matchAll(/\.m-tstream--stream-bitrate\.is-m \.m-tstream__side \{([^}]*)\}/g)].map((m) => m[1])
  const tops = rules.map((r) => /(?:^|;|\s)top:\s*(-?\d+)px/.exec(r)).filter(Boolean).map((m) => +m[1])
  assert.ok(tops.length, 'a rule sets the chip top')
  const top = tops[tops.length - 1]
  // the gauge starts 49 px below the tile's top (title row of 14 px padding + head): -47 sat 2 px from the edge, the chip's own height is 26 px
  assert.ok(top >= -42 && top <= -30, `top ${top}px puts the chip on the tile's edge or into the numeral`)
})

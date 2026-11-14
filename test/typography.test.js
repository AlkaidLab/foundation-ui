import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Typography A (round27, Windows 100 % evidence): the Han characters come from M3E CJK with the weights the system font really has, Chinese reads at 14/22, and small text
// is never hard-coded heavy. appearance.css and layout.css still hold hard-coded fonts: they had another agent's uncommitted edits when this landed (listed for the team);
// dash.css and charts.css (main's overview tiles and their widgets) are not typography A's: the tile kit folds them into its own scale (--m-tile-text-<px>[-strong], tilekit.css).
// The tile kit's stylesheets are checked like the rest; its display numerals read --m-font-display, and the only brand-font letters it may size by hand are the
// three that scale with their tile (calc(var(--tst) ...), cqmin).
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const tokens = read('src/tokens/tokens.css')
const LATER = new Set(['appearance.css', 'layout.css', 'dash.css', 'charts.css', 'latency.css'])
const SCALED = /^calc\(var\(--tst\)|^\d+(?:\.\d+)?cqmin$|^max\(12px, [\d.]+cqi\)$/

test('system-ui stands after the CJK families, so M3E CJK gets the Han characters', () => {
  const latin = /--m-font-latin: ([^;]+);/.exec(tokens)[1]
  assert.ok(!/system-ui/.test(latin), 'system-ui is not a Latin family: in front of the CJK list it took every Han character')
  assert.match(tokens, /--md-ref-typeface-brand: var\(--m-font-latin\), var\(--m-font-cjk\), 'Segoe UI', 'Microsoft YaHei UI', system-ui, sans-serif;/)
  assert.match(tokens, /--m-font-cjk: 'M3E CJK',/)
})

test('M3E CJK maps three weight bands onto the faces each system has: Regular, Medium (Regular on Windows), Semibold or Bold', () => {
  const fonts = read('src/fonts/fonts.css')
  const faces = [...fonts.matchAll(/@font-face \{ font-family: 'M3E CJK'; font-weight: (\d+) (\d+);[^}]*src: ([^;]+);/g)].map((m) => ({ range: `${m[1]} ${m[2]}`, src: m[3] }))
  assert.deepEqual(faces.map((f) => f.range), ['100 449', '450 599', '600 1000'])
  assert.match(faces[1].src, /^local\('PingFang SC Medium'\)/)
  assert.match(faces[1].src, /local\('Microsoft YaHei UI'\)/, 'Windows has no Medium: 500 is YaHei UI Regular, never a synthesised bold')
  assert.match(faces[2].src, /local\('Microsoft YaHei UI Bold'\)/)
})

test('Chinese reads at 14/22 body, 12/18 captions, and the scale wins over the desktop step', () => {
  const zh = /:root:lang\(zh\) \{([^}]*)\}/.exec(tokens)
  assert.ok(zh, 'a :lang(zh) block')
  assert.match(zh[1], /--m-body-medium: 400 14px\/22px/)
  assert.match(zh[1], /--m-body-small: 400 12px\/18px/)
  assert.match(zh[1], /--m-label-large: 500 14px\/20px/)
  assert.ok(tokens.indexOf(':root:lang(zh)') < tokens.indexOf('@media (pointer: fine)'))
})

test('small text is never hard-coded heavy or under 12 px in the brand font (display numerals of 17 px and more keep their size)', () => {
  const dir = new URL('../src/css/', import.meta.url)
  const problems = []
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.css') && !LATER.has(f))) {
    const css = fs.readFileSync(new URL(name, dir), 'utf8')
    for (const m of css.matchAll(/font:\s*(\d{3})\s+((?:calc\([^)]*\)\s*\*?\s*[\d.]*\)?|[^\s/;]+))[^;]*var\(--md-ref-typeface-(?:brand|plain)/g)) {
      const size = m[2].trim()
      const px = /^(\d+(?:\.\d+)?)px$/.exec(size)
      // a fluid display size (clamp(28px, 4vw, 44px)) is display text: every px in it is 17 px or more
      const display = [...size.matchAll(/(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]))
      if (px ? Number(px[1]) < 17 : !(SCALED.test(size) || (display.length && Math.min(...display) >= 17))) problems.push(`${name}: ${m[0].slice(0, 48)} (fold it into a token)`)
    }
  }
  assert.deepEqual(problems, [])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Every page is ONE column, like Windows Settings: the title row and the content share it, so title left = content left at every width. The column fills the pane (less the inset,
// --m-gutter: 32, 16, 12 px) up to its maximum (--m-column, per kind of page) and is centred beyond it, the extra room growing equally on both sides. A band centred by itself put the
// titles right of their own wider content, a column centred by its own margin put the content at another x than the title, a left-aligned column stranded in a wide window: the
// title row and the column are built by the same width and the same centring, and nothing else. A rule that sets position, row height or size of the title for one kind of page
// (a wide page, a page with Back, the overview) is how it came apart before, so none may come back.
const css = fs.readFileSync(new URL('../src/css/layout.css', import.meta.url), 'utf8')
const tokens = fs.readFileSync(new URL('../src/tokens/tokens.css', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../src/vue/MPage.vue', import.meta.url), 'utf8')

const rules = [...css.matchAll(/(^|\n)([^{}@\n][^{}]*)\{([^{}]*)\}/g)].map((m) => ({ sel: m[2].trim(), body: m[3] }))
const touching = (re) => rules.filter((r) => re.test(r.sel))

test('the title row is built by one rule: the width and the centring of the column, no band, no offset, no floor', () => {
  for (const name of ['--m-title-band', '--m-title-off', '--m-title-gutter']) {
    assert.ok(!css.includes(name) && !tokens.includes(name), `${name} came back`)
  }
  const scene = fs.readFileSync(new URL('../src/vue/MScene.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(scene, /title-off|titleOff/, 'the scene tells no page where its title goes')
  const bars = touching(/^\.m-page__bar$/)
  assert.equal(bars.length, 1)
  assert.match(bars[0].body, /min-height: 80px/)
  assert.match(bars[0].body, /box-sizing: border-box; width: min\(100%, var\(--m-column\)\)/, 'the title row is as wide as the column')
  assert.match(bars[0].body, /margin-inline: auto/, 'and centred like it')
  assert.match(bars[0].body, /padding: 16px calc\(var\(--m-bar-end, 16px\) \+ 48px \+ 8px\) 8px 0;/, 'no inset of its own at the start: the column edge is the title edge')
})

test('no kind of page has a title row or a title size of its own', () => {
  const kinds = rules.filter((r) => /\.m-page--(sub|wide|full|cols)\b[^,]*\.m-page__(bar|title)\b/.test(r.sel) || /\.m-page__bar\b.*\.m-page--/.test(r.sel))
  for (const r of kinds) {
    assert.doesNotMatch(r.body, /\b(min-height|padding[a-z-]*|font[a-z-]*|margin-inline[a-z-]*|top|left|inset[a-z-]*)\s*:/, `${r.sel} moves or resizes the title`)
  }
  // the size of the title is written in the base rule and, for a narrow container, once more for every page alike
  const sizes = css.match(/[^{}\n]*\.m-page__title\s*\{[^{}]*font:/g) || []
  assert.equal(sizes.length, 2, 'the base size and the narrow-container size, nothing per page kind')
  assert.match(css, /\.m-page__title \{[^}]*font: var\(--m-page-title\);/)
  assert.match(css, /\.m-page__title \{ font: var\(--m-page-title-narrow\); \}/)
  assert.doesNotMatch(css.match(/\.m-page__title \{[^}]*\}/)[0], /headline/, 'the size must not follow the viewport-wide type scale: a framed page has a narrower viewport than the panel')
  assert.ok(sizes.every((x) => /(^|[\s}])\.m-page__title\s*\{/.test(x) && !/\.m-page--/.test(x)), 'a size written for one kind of page')
})

test('a page with Back keeps the position of the title row: the bubble is at the edge, the title after it, the row is as tall', () => {
  const sub = touching(/^\.m-page--sub \.m-page__bar$/)
  assert.equal(sub.length, 1)
  assert.doesNotMatch(sub[0].body, /min-height|padding/)
  assert.match(page, /<button v-if="back \|\| scene\?\.canBack\.value" type="button" class="m-page__back"[^>]*><MIcon name="arrow_back" \/><\/button>\s*<h1 class="m-page__title">/)
  assert.match(touching(/^\.m-page--sub \.m-page__back$/)[0].body, /flex: 0 0 48px/)
})

test('the inset is the same on every page and follows the pane, not the viewport (the phone keeps its 12 px)', () => {
  assert.match(css, /\.m-page \{ --m-gutter: 32px; min-height: 100%; padding: 0 var\(--m-gutter\) 48px; \}/)
  assert.match(css, /@container \(max-width: 700px\) \{ \.m-page \{ --m-gutter: 16px; \} \}/)
  assert.match(css, /@container \(max-width: 560px\) \{ \.m-page \{ --m-gutter: 12px; \} \.m-page__title \{ font: var\(--m-page-title-narrow\); \} \}/)
  assert.match(css, /@media \(max-width: 599\.98px\) \{ \.m-page \{ --m-gutter: 12px; \}/)
  // a framed page has no container above it: the same steps follow the width of its own document, so a framed and a panel page of one pane width have the same inset
  assert.match(css, /@media \(max-width: 700px\) \{ html:has\(\.m-web-embedded\) \.m-page \{ --m-gutter: 16px; \} \}/)
  assert.match(css, /@media \(max-width: 560px\) \{ html:has\(\.m-web-embedded\) \.m-page \{ --m-gutter: 12px; \} \}/)
  assert.doesNotMatch(css, /@media[^{]*\{[^}]*--m-gutter: (16|32)px[^}]*\.m-page \{/, 'the inset follows the pane, not the viewport: a framed page is narrower than the window it is in')
  // the overview has no inset of its own: its title is over its first tile because that is the edge of every page (only the phone keeps the 16 px it always had)
  const own = rules.filter((r) => /\.m-page--(wide|full|cols|sub)\b/.test(r.sel) && /--m-gutter/.test(r.body))
  assert.deepEqual(own.map((r) => r.sel), [])
  assert.equal((css.match(/\.m-page--wide\.m-page--full \{ --m-gutter: 16px; \}/g) || []).length, 1)
})

test('a page in the panel frame starts where a panel page starts: the browser margin of its document is gone', () => {
  assert.match(css, /html:has\(\.m-web-embedded\) body \{ margin: 0; \}/)
})

test('title left equals content left, and the column is centred once the pane is wider than its maximum', () => {
  const col = touching(/^\.m-page__column$/)
  assert.equal(col.length, 1)
  assert.match(col[0].body, /width: min\(100%, var\(--m-column\)\); margin-inline: auto;/)
  // the page pads its pane with the inset on both sides; the bar and the column are the same box: same width, same auto margins, same containing block
  assert.match(css, /\.m-page \{ --m-gutter: 32px; min-height: 100%; padding: 0 var\(--m-gutter\) 48px; \}/)
  assert.doesNotMatch(css.match(/\.m-page \{ --m-gutter[^}]*\}/)[0], /margin/)
  assert.match(touching(/^\.m-page__bar-actions$/)[0].body, /right: 0;/, 'the actions sit at the right end of the column')
  assert.doesNotMatch(css, /\.m-page__(bar|column)[^{]*\{[^}]*margin-inline: (0|calc)/)
  // the arithmetic of the rules for every pane width: the same left edge for title and content; filling under the maximum, equal margins above it
  const inset = (pane) => (pane <= 560 ? 12 : pane <= 700 ? 16 : 32)
  for (const [max, label] of [[960, 'normal'], [1200, 'two columns'], [1280, 'wide'], [Infinity, 'overview']]) {
    for (const pane of [390, 575, 904, 1184, 1464, 1824, 2064, 2464]) {
      const g = inset(pane), room = pane - 2 * g, w = Math.min(room, max)
      const left = g + (room - w) / 2, right = pane - left - w
      assert.ok(Math.abs(left - right) < 1e-9, `${label} ${pane}: equal margins`)
      if (room <= max) assert.equal(left, g, `${label} ${pane}: fills the pane under the maximum`)
      else assert.ok(left > g, `${label} ${pane}: centred beyond the maximum`)
    }
  }
})

test('the maxima: one reading column, the two-column page and the wide page are wider, the dashboard fills the pane', () => {
  assert.match(tokens, /--m-column: 960px;/)
  assert.match(css, /\.m-page--cols \{ --m-column: 1200px; \}/)
  assert.match(css, /\.m-page--wide \{ --m-column: min\(100%, 1280px\); \}/)
  assert.match(css, /\.m-page--full \{ --m-column: 100%; \}/)
})

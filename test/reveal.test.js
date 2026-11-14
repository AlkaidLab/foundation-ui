import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Motion in the page (): pages, sections, cards, rows, banners and presses move on the Material 3 Expressive springs, as compositor-only animations.
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('src/css/reveal.css')

test('the reveal is part of the package and animates only transform and opacity', () => {
  assert.match(read('src/css/all.css'), /@import "\.\/reveal\.css";/)
  for (const m of css.matchAll(/@keyframes ([\w-]+) \{([^@]*?)\}\s*(?=\n|@)/g)) {
    const props = [...m[2].matchAll(/([a-z-]+):/g)].map((x) => x[1])
    assert.ok(props.every((p) => p === 'transform' || p === 'opacity'), `${m[1]} moves ${props.join(', ')}`)
  }
  assert.ok(/@keyframes m-reveal-rise \{ from \{ transform: translateY\(14px\)/.test(css) && /@keyframes m-reveal-fade \{ from \{ opacity: 0; \}/.test(css))
})

test('sections, cards, the first rows of a group and banners come in on the springs, one after the other, with a cap', () => {
  for (const sel of ['.m-page__column .m-section {', '.m-page__column .m-cards > * {', '.m-page__column .m-group > .m-item {', '.m-page__column .m-banner {']) assert.ok(css.includes(sel), sel)
  assert.match(css, /m-reveal-rise var\(--m-spring-default-spatial-duration[^)]*\) var\(--m-spring-default-spatial[^)]*\) backwards, m-reveal-fade var\(--m-spring-default-effects-duration/)
  assert.match(css, /animation-delay: calc\(var\(--m-i, 0\) \* 28ms\)/); assert.match(css, /animation-delay: calc\(var\(--m-i, 0\) \* 16ms \+ 40ms\)/)
  assert.match(css, /\.m-group > \.m-item:nth-child\(n\+10\) \{ --m-i: 9; animation: none; \}/, 'a long list does not animate row by row')
  assert.ok(css.includes('.m-section:nth-child(n+8)'), 'the turns stop at eight')
})

test('a press on a button-like row, card or chip answers on the spatial spring', () => {
  assert.match(css, /\.m-item--action:active, \.m-cards__card:active \{ transform: scale\(\.985\); \}/)
  assert.match(css, /\.m-chipset__chip:active \{ transform: scale\(\.94\); \}/)
})

test('the system\'s reduced-motion setting is followed only when chosen, and 减少 always cuts it', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*html:not\(\[data-motion='full'\]\) \.m-page__column :is\(/)
  assert.match(css, /html\[data-motion='reduced'\] \.m-page__column :is\(/)
})

test('the descriptor-generated pages (编码与码率) are covered: their sections sit in a MPage column', () => {
  assert.match(read('src/vue/MPage.vue'), /m-page__column/)
})

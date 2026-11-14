import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chipsShown } from '../src/vue/chipFit.js'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// the chips under the title of a card stay on one line; what does not fit becomes a "+N" chip
test('all chips stay while the row fits them', () => {
  assert.equal(chipsShown([80, 60, 70], 4, 222, 28), 3)
  assert.equal(chipsShown([80, 60, 70], 4, 218, 28), 3, 'sub-pixel rounding is not a reason to cut a chip')
  assert.equal(chipsShown([], 4, 100, 28), 0)
})

test('the chips that do not fit are replaced by a +N chip that has room next to the last visible chip', () => {
  // 80 + 4 + 60 = 144; the third chip (70) would need 218 and the +N chip must still fit after the second one
  assert.equal(chipsShown([80, 60, 70], 4, 180, 28), 2)
  assert.equal(chipsShown([80, 60, 70], 4, 170, 28), 1)
  assert.equal(chipsShown([80, 60, 70], 4, 100, 28), 0)
})

test('a row narrower than the first chip and its +N chip shows no chip rather than overflowing', () => {
  assert.equal(chipsShown([80, 60], 4, 90, 28), 0)
})

test('MChipRow keeps one line, hides the cut chips and lists them in the tooltip of the +N chip', () => {
  const vue = read('src/vue/MChipRow.vue')
  const css = read('src/css/components.css')
  assert.ok(vue.includes('chipsShown') && vue.includes('data-cut') && vue.includes('data-tip'))
  assert.ok(/\.m-chiprow \{[^}]*flex-wrap: nowrap/.test(css))
  assert.ok(css.includes('.m-chiprow > .m-chip[data-cut] { display: none; }'))
  assert.ok(read('src/vue/index.js').includes("MChipRow"))
  assert.ok(/MCoverGrid[\s\S]*<slot name="meta"/.test(read('src/vue/MCoverGrid.vue')) || read('src/vue/MCoverGrid.vue').includes('<slot name="meta"'))
})

test('before a chip is cut the row goes compact (no icons, less padding); only then +N', () => {
  const vue = read('src/vue/MChipRow.vue')
  const css = read('src/css/components.css')
  assert.ok(vue.indexOf("setAttribute('data-compact'") < vue.indexOf("setAttribute('data-cut'"))
  assert.ok(css.includes('.m-chiprow[data-compact] > .m-chip .m-icon { display: none; }'))
})

test('a chip can carry a picture in place of its icon (a brand mark); the compact row keeps it, a dark surface gives it a light backing', () => {
  const chip = read('src/vue/MChip.vue')
  assert.ok(chip.includes("image: { type: String") && chip.includes('class="m-chip__img"') && /v-if="image"[^]*v-else-if="icon"/.test(chip))
  assert.ok(read('src/vue/MChipRow.vue').includes(':image="chip.image"'))
  assert.ok(/<img v-if="item\.image" class="m-fabmenu__img"/.test(read('src/vue/MFabMenu.vue')))
  const css = read('src/css/components.css')
  assert.ok(css.includes(".m-chiprow[data-compact] > .m-chip .m-icon { display: none; }"), 'compact hides the icon glyphs only')
  assert.ok(/html\[data-bs-theme='dark'\] \.m-chip__img[^{]*\{ background: #f6f2ff; \}/.test(css))
})

test('in a tight row a chip with a picture shrinks to the picture and keeps its name as the tooltip', () => {
  const css = read('src/css/components.css')
  assert.ok(css.includes('.m-chiprow[data-compact] > .m-chip > .m-chip__label { display: none; }'))
  assert.ok(read('src/vue/MChip.vue').includes('class="m-chip__label"'))
  assert.ok(read('src/vue/MChipRow.vue').includes(':title="chip.image ? chip.label : undefined"'))
})

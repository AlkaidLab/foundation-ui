// The star ask on a phone: a small card (no title, no line), the buttons named by the side they are for, one or two rows
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { starPromptTexts } from '../src/vue/homeCards.js'
import { homeTexts } from '../src/vue/homeModel.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the short words of the star card, in Chinese and English: the side the star is for', () => {
  const zh = starPromptTexts(homeTexts('zh')), en = starPromptTexts(homeTexts('en'))
  assert.deepEqual([zh.hostShort, zh.clientShort, zh.bilibiliShort], ['主机端 Star', '客户端 Star', 'B 站'])
  assert.deepEqual([en.hostShort, en.clientShort, en.bilibiliShort], ['Host Star', 'Client Star', 'Bilibili'])
  assert.match(read('../src/locale/texts/zh_TW/homeCatalogue.js'), /"starHostShort": "主機端 Star"/)
})

test('the star card is one rule at every width: the window class no longer picks a different card, the short words are only for the languages that have them', () => {
  const v = read('../src/vue/MHomeDash.vue')
  assert.match(v, /const starShort = computed\(\(\) => \/\^\(zh\|en\)\/i\.test\(String\(props\.locale\)\)\)/)
  assert.match(v, /<MStarPrompt [^>]*:texts="\{[^}]*\.\.\.\(starShort \? \{ hostShort: T\.starHostShort, clientShort: T\.starClientShort, bilibiliShort: T\.starBilibiliShort \} : \{\}\)/)
  const c = read('../src/vue/MStarPrompt.vue')
  assert.doesNotMatch(c, /m-sprompt--compact/, 'no second card for a phone')
  assert.match(c, /class="m-sprompt m-sprompt--star" :class="\[layout\.rows === 2 \? 'is-two' : 'is-one', \{ 'is-bare': !layout\.title \}\]"/)
  assert.match(c, /const label = \(a\) => \(layout\.value\.short \? a\.short : a\.long\)/, 'the asks carry their long words only where they all fit')
  assert.match(c, /short: t\.hostShort \|\| hostLong/); assert.match(c, /short: t\.clientShort \|\|/); assert.match(c, /short: t\.bilibiliShort \|\| t\.bilibili/)
})

test('what fits decides: one row with title and line, then without the line, then with the short asks, then without the title; two rows when none of them fits (the dismissal is never alone on a row)', () => {
  const c = read('../src/vue/MStarPrompt.vue')
  const order = [/row\(ico, textW\(true\), long, close\) <= avail\) next = \{ rows: 1, title: true, sub: true, short: false \}/, /row\(ico, title, long, close\) <= avail\) next = \{ rows: 1, title: true, sub: false, short: false \}/, /row\(ico, title, short, close\) <= avail\) next = \{ rows: 1, title: true, sub: false, short: true \}/, /row\(ico, hasShort\.value \? short : long, close\) <= avail\) next = \{ rows: 1, title: false/, /else next = \{ rows: 2, title: true, sub: false,/]
  let at = -1
  for (const re of order) { const m = re.exec(c); assert.ok(m, String(re)); assert.ok(m.index > at, 'in this order'); at = m.index }
  assert.match(c, /ResizeObserver/); assert.match(c, /document\.fonts/)
  // the close icon is one button in the card at every width, its name is the words
  assert.match(c, /<button type="button" class="m-sprompt__later m-sprompt__later--icon" :aria-label="texts\.later" :title="texts\.later" @click="emit\('later'\)"><MIcon name="close" \/><\/button>/)
  assert.doesNotMatch(c, /\{\{ texts\.later \}\}/)
})

test('the star card styles only place the parts: one row with the asks beside the title and the close at the end, two rows with the close on the title row; the client prompt keeps its own look', () => {
  const css = read('../src/css/connect.css')
  assert.match(css, /\.m-sprompt--star\.is-one \{ flex-wrap: nowrap; \}/)
  assert.match(css, /\.m-sprompt--star \.m-sprompt__text h3, \.m-sprompt--star \.m-sprompt__text p \{ white-space: nowrap; \}/, 'no wrapped, orphaned words')
  assert.match(css, /\.m-sprompt--star\.is-two \.m-sprompt__later \{ order: 2; margin-inline-start: auto; \}/)
  assert.match(css, /\.m-sprompt--star\.is-two \.m-sprompt__btns \{ order: 3; flex: 1 1 100%; min-width: 0; max-width: 100%; flex-wrap: wrap; \}/)
  assert.match(css, /\.m-sprompt__probe \{ position: absolute;[^}]*width: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none;/, 'the probe takes no room and adds no scroll width')
  assert.ok(css.indexOf('.m-sprompt--star') < css.indexOf('.m-cprompt '), 'before the client prompt rules, which are for another card')
})

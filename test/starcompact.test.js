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

test('a phone-sized window (under 600 wide or under 480 high) draws the compact card; the short words are only for the languages that have them', () => {
  const v = read('../src/vue/MHomeDash.vue')
  assert.match(v, /const starCompact = computed\(\(\) => wide\.value < 600 \|\| tall\.value < 480\)/)
  assert.match(v, /const starShort = computed\(\(\) => \/\^\(zh\|en\)\/i\.test\(String\(props\.locale\)\)\)/)
  assert.match(v, /<MStarPrompt [^>]*:compact="starCompact" :texts="\{[^}]*\.\.\.\(starShort \? \{ hostShort: T\.starHostShort, clientShort: T\.starClientShort, bilibiliShort: T\.starBilibiliShort \} : \{\}\)/)
  const c = read('../src/vue/MStarPrompt.vue')
  assert.match(c, /:class="\{ 'm-sprompt--compact': compact \}"/)
  assert.match(c, /<div v-if="!compact" class="m-sprompt__text">/, 'no title and no line on a phone (the region keeps its name)')
  assert.equal((c.match(/compact && texts\.hostShort/g) || []).length, 2, 'both asks of the host use the short word')
  assert.match(c, /compact && texts\.clientShort/); assert.match(c, /compact && texts\.bilibiliShort/)
})

test('the compact card is one or two rows of small buttons, and the client prompt keeps its own look', () => {
  const css = read('../src/css/connect.css')
  assert.match(css, /\.m-sprompt--compact \.m-sprompt__btn, \.m-sprompt--compact \.m-sprompt__later \{ height: 36px; border-radius: 18px; \}/)
  assert.match(css, /\.m-sprompt--compact \.m-sprompt__btns \{ flex: 1 1 0; min-width: 0; margin-inline-start: 0; justify-content: flex-start; gap: 6px; \}/)
  assert.ok(css.indexOf('.m-sprompt--compact') < css.indexOf('.m-cprompt '), 'before the client prompt rules, which are for another card')
})

test('on a phone the dismissal is a close icon on the row of the buttons (its name is the words), so the card is one row; the wide card keeps the words', () => {
  const c = read('../src/vue/MStarPrompt.vue'), css = read('../src/css/connect.css')
  assert.match(c, /<button v-if="compact" type="button" class="m-sprompt__later m-sprompt__later--icon" :aria-label="texts\.later" :title="texts\.later" @click="emit\('later'\)"><MIcon name="close" \/><\/button>/)
  assert.match(c, /<button v-else type="button" class="m-sprompt__later" @click="emit\('later'\)">\{\{ texts\.later \}\}<\/button>/)
  assert.match(css, /\.m-sprompt--compact \{ flex-wrap: nowrap; align-items: center; \}/)
  assert.match(css, /\.m-sprompt--compact \.m-sprompt__btns \{ flex-wrap: nowrap; \}/)
  assert.match(css, /\.m-sprompt--compact \.m-sprompt__later--icon \{ flex: none; width: 36px;/)
})

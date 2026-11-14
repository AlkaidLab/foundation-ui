import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildGuideSteps, readProgress, startIndex } from '../src/vue/guideModel.js'
import { guideTexts } from '../src/vue/guideTexts.js'
import { LOCALE_SYSTEM, choiceOf, normalizeTag, readLocalePref, resolveLocale, resolveSystemLocale, watchSystemLanguage, writeLocalePref } from '../src/locale/localePref.js'

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('a fresh profile starts at the intro, with 跟随系统 (the system language) as the language choice', () => {
  const steps = buildGuideSteps({ skip: [] })
  assert.equal(steps[0].id, 'intro'); assert.equal(steps[1].id, 'account')
  assert.equal(startIndex(steps, readProgress(memory(), 'k')), 0) // nothing stored: the first step
  const storage = memory()
  assert.equal(readLocalePref(storage), null) // nothing stored: the product's own language stands, else the system's
  assert.equal(choiceOf(readLocalePref(storage)), LOCALE_SYSTEM) // so the picker shows 跟随系统 selected
  assert.equal(choiceOf(readLocalePref(storage), 'de', 'zh'), 'de') // an install from before the choice, with a language of its own: that one
  assert.equal(choiceOf(readLocalePref(storage), 'zh', 'zh'), 'system') // a stored language that is just the system's: following the system is what the person has
  // the line of the first row names what it resolves to
  assert.equal(resolveLocale(LOCALE_SYSTEM, { languages: ['zh-CN', 'en-US'], supported: ['zh', 'zh_TW', 'en'] }), 'zh')
  assert.equal(guideTexts('zh').intro.followSystem, '跟随系统'); assert.equal(guideTexts('en').intro.followSystem, 'Follow system')
  assert.equal(guideTexts('zh').intro.start, '开始'); assert.equal(guideTexts('en').intro.start, 'Start')
})

test('the flow shows the intro first: the mark, the plain notice (whole), the language rows with 跟随系统 first and selected by default, a big start button', () => {
  const vue = read('src/vue/MGuideFlow.vue'), css = read('src/css/guideintro.css')
  assert.match(vue, /<template v-if="id === 'intro'">/)
  assert.match(vue, /<MProductHero class="m-guide__herocard" :slogan="slogan"/)
  assert.doesNotMatch(vue, /m-guide__sun|appIcon/, 'the hero is 薇薇 alone: the sun mark is gone')
  assert.match(vue, /:title="followSystemTitle" data-locale="system" :selected="localeChoice === 'system'"/)
  assert.match(vue, /const followSystemTitle = computed\(\(\) => `\$\{T\.value\.intro\.followSystem\} · \$\{languageName\(props\.state\.locale\?\.resolved\)\}`\)/)
  assert.match(vue, /const localeChoice = computed\(\(\) => props\.state\.locale\?\.choice \|\| 'system'\)/)
  assert.match(vue, /case 'intro': return \{ label: t\.intro\.start, run: next/)
  assert.match(vue, /const openFull = ref\(false\)/) // the open-source notice is one line with its link on the first screen
  assert.match(vue, /<header v-if="id !== 'intro'" class="m-guide__head">/)
  assert.match(css, /\.m-guide\[data-step='intro'\] \.m-guide__actions > :last-child \{ min-width: min\(100%, 240px\); height: 56px;/)
  assert.match(vue, /id\.value !== 'intro' && !props\.required/) // the first screen cannot be skipped
})

test('there is no consent step and no question: error reports and usage statistics are both on and the first screen says so once, in one notice; the notes sit at the foot of the first screen', () => {
  const vue = read('src/vue/MGuideFlow.vue')
  assert.match(vue, /const flow = computed\(\(\) => props\.steps\.filter\(\(s\) => s\.id !== 'consent'\)\)/)
  assert.doesNotMatch(vue, /C\.consentNo|C\.consentYes|saveConsent|data-consent=/, 'the blocking question and its 「不发送」 are gone')
  assert.match(vue, /<div v-if="id === 'intro'" class="m-guide__notes" data-guide-notes>[\s\S]*S\.freeNotice[\s\S]*S\.supportLine[\s\S]*errorsParts\[0\][\s\S]*callbacks\.openPrivacy\(\)/)
  assert.match(vue, /const errorsNotice = ref\(!errorsNoticeSeen\(\)\)/); assert.match(vue, /before === 'intro' && now !== 'intro'\) markErrorsNoticeSeen\(\)/, 'one-time')
  assert.match(read('src/css/guideintro.css'), /\.m-guide__notes \{[^}]*font: var\(--m-body-small\)/, 'secondary, body-small')
})

test('the language rule: a code or system, stored as such; the system language resolves for the product, and follows the operating system live', () => {
  assert.equal(normalizeTag('zh-CN'), 'zh'); assert.equal(normalizeTag('zh-Hant-TW'), 'zh_TW'); assert.equal(normalizeTag('zh-HK'), 'zh_TW'); assert.equal(normalizeTag('en-gb'), 'en_GB'); assert.equal(normalizeTag('pt-BR'), 'pt_BR'); assert.equal(normalizeTag('de'), 'de')
  const supported = ['en', 'en_GB', 'zh', 'zh_TW', 'de', 'pt_BR']
  assert.equal(resolveSystemLocale(['zh-TW', 'en'], supported), 'zh_TW'); assert.equal(resolveSystemLocale(['en-AU'], supported), 'en'); assert.equal(resolveSystemLocale(['fr-FR', 'de-AT'], supported), 'de'); assert.equal(resolveSystemLocale(['ja'], supported), 'en')
  assert.equal(resolveSystemLocale(['pt-PT'], supported), 'en') // not guessed: pt is not offered, pt_BR is another variant
  const storage = memory()
  assert.ok(writeLocalePref('system', storage)); assert.equal(readLocalePref(storage), 'system') // the choice is stored, not the code it resolves to
  assert.ok(writeLocalePref('de', storage)); assert.equal(readLocalePref(storage), 'de')
  assert.ok(writeLocalePref('<script>', storage)); assert.equal(readLocalePref(storage), 'system')
  assert.equal(resolveLocale('de', { supported, languages: ['zh'] }), 'de'); assert.equal(resolveLocale('xx', { supported, languages: ['zh'] }), 'zh')
  const listeners = {}
  const win = { addEventListener: (n, f) => { listeners[n] = f }, removeEventListener: (n) => { delete listeners[n] } }
  let calls = 0
  const stop = watchSystemLanguage(() => { calls += 1 }, win)
  listeners.languagechange(); assert.equal(calls, 1)
  stop(); assert.equal(listeners.languagechange, undefined)
})

test('the language list is short: 跟随系统, the likeliest, and a 更多语言 row that opens the rest in place', () => {
  const vue = read('src/vue/MGuideFlow.vue'), css = read('src/css/guideintro.css')
  assert.match(vue, /for \(const c of \['zh', 'en', props\.state\.locale\?\.resolved, localeChoice\.value\]\)/)
  assert.match(vue, /v-for="l in shownLanguages"/)
  assert.match(vue, /data-locale-more :aria-expanded="moreOpen"/)
  assert.match(read('src/vue/guideTexts.js'), /moreLanguages: '更多语言'/)
  assert.doesNotMatch(css, /\.m-guide__langs \{[^}]*overflow-y: auto/, 'no list that scrolls inside the page')
})

test('the hero of the first screen is the hero card of the About page: one component, the tagline is the About slogan, 薇薇 alone', () => {
  const vue = read('src/vue/MGuideFlow.vue'), about = read('src/vue/MAbout.vue'), hero = read('src/vue/MProductHero.vue'), css = read('src/css/guideintro.css')
  assert.match(vue, /import MProductHero from '\.\/MProductHero\.vue'/)
  assert.match(about, /import MProductHero from '\.\/MProductHero\.vue'/)
  assert.match(vue, /const slogan = computed\(\(\) => aboutTexts\(props\.locale\)\.slogan\)/, 'the About slogan, not a copy')
  assert.doesNotMatch(read('src/vue/guideTexts.js'), /intro: \{[^}]*lead:/)
  assert.match(hero, /class="m-about__top m-about__top--a"/)
  assert.match(hero, /<h2 class="m-about__name">/); assert.match(hero, /<p class="m-about__slogan">/)
  assert.doesNotMatch(css, /m-guide__sun|m-guide__tagline|m-guide__vivi/)
})

test('the language block is an airy list: 56 px rows 8 px apart, the checked row tinted with no outline, the others outlined; 更多语言 is a text button under the list', () => {
  const css = read('src/css/guideintro.css'), vue = read('src/vue/MGuideFlow.vue')
  assert.doesNotMatch(vue, /introLangs|foundation\.intro\.langs|langLook|MMenuChip|m-guide__chips/, 'the chip look and its switch are gone')
  assert.doesNotMatch(css, /m-guide__chips|m-guide__chipmore/)
  assert.match(vue, /<MGroup class="m-guide__langs" role="radiogroup"/)
  assert.match(css, /\.m-guide__langs\.m-group \{ display: flex; flex-direction: column; gap: 8px;/)
  assert.match(css, /\.m-guide__langs\.m-group > \.m-item \{ min-height: 56px;[^}]*background: transparent;[^}]*inset 0 0 0 1px/)
  assert.match(css, /\.m-item\.m-item--selected \{ background: color-mix\(in srgb, var\(--md-sys-color-primary\) 16%, transparent\);[^}]*box-shadow: none;/)
  assert.match(vue, /<MButton variant="text"[^>]*data-locale-more/)
})

test('the first step: the notice is one line with its link, the step text is in the footer', () => {
  const vue = read('src/vue/MGuideFlow.vue')
  assert.match(vue, /<span v-if="id === 'intro'" class="m-guide__footstep"/)
  assert.match(vue, /<a :href="PRODUCT\.repo"/)
})

test('the project slogan is one string: the About page and the first screen show 让游戏串流更优雅 / Game streaming, more elegantly', async () => {
  const { aboutTexts } = await import('../src/about/texts.js')
  assert.equal(aboutTexts('zh').slogan, '让游戏串流更优雅')
  assert.equal(aboutTexts('en').slogan, 'Game streaming, more elegantly')
  assert.equal(aboutTexts('de').slogan, 'Game streaming, more elegantly', 'other languages read the English until they are translated')
  assert.match(read('src/vue/MAbout.vue'), /:slogan="T\.slogan"/)
  assert.match(read('src/vue/MGuideFlow.vue'), /aboutTexts\(props\.locale\)\.slogan/)
})

test('the first screen reads: the About hero card, then the open-source notice, then the language list, then 开始', () => {
  const vue = read('src/vue/MGuideFlow.vue'), css = read('src/css/guideintro.css')
  const body = vue.slice(vue.indexOf('<div class="m-guide__body">'))
  assert.ok(body.indexOf('class="m-guide__open"') < body.indexOf('<MProductHero'), 'in the markup the notice is the first child of the body')
  assert.match(css, /\.m-guide__herocard \{ margin: 0 0 2px; order: -1; \}/, 'the card is drawn before it')
  assert.match(css, /\.m-guide__body > \.m-guide__open \{ margin: 0; \}/)
})

test('the edges of the scroll area of every step say nothing while the content fits: no shadow, no divider; a hairline only while it scrolls, from two sentinels and an IntersectionObserver', () => {
  const vue = read('src/vue/MGuideFlow.vue'), css = read('src/css/guideintro.css')
  assert.match(vue, /new IntersectionObserver/); assert.match(vue, /class="m-guide__sentinel"/)
  assert.doesNotMatch(vue.slice(vue.indexOf('const topSentinel'), vue.indexOf('onBeforeUnmount(() => { edgeObserver')), /addEventListener\('scroll'/)
  assert.match(css, /\.m-guide \.m-guide__actions, \.m-onboard \.m-guide \.m-guide__actions \{ border-top: 0; box-shadow: none; \}/)
  assert.match(css, /\.m-guide\[data-below\] \.m-guide__actions::before, \.m-guide\[data-scrolled\] \.m-guide__steps::after \{ opacity: 1; \}/)
  assert.doesNotMatch(css, /box-shadow: 0 -10px/)
})

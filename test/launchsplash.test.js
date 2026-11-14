// The launch splash: the lines for every stage, the failure sentence and the notice, and what its styles promise (a click-through, size-by-own-box, reduced-motion-safe screen).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LAUNCH_STAGES, launchLine, launchSplashTexts } from '../src/launchsplash/texts.js'

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

test('every stage has a line in Chinese and in English, and the Chinese lines are the team\'s', () => {
  const zh = launchSplashTexts('zh'), en = launchSplashTexts('en')
  for (const stage of LAUNCH_STAGES) {
    assert.ok(zh.stages[stage] && en.stages[stage], `${stage} has both lines`)
    assert.equal(launchLine(zh, { stage }).kind, 'stage')
  }
  assert.deepEqual(LAUNCH_STAGES.map((s) => zh.stages[s]), ['正在启动', '启动 Broker', 'Sparxie 准备中', '注入中', '等待游戏窗口'])
})

test('a language without its own text reads English; zh_TW and zh-CN read Chinese', () => {
  assert.equal(launchSplashTexts('de').stages['waiting-window'], 'Waiting for the game window')
  assert.equal(launchSplashTexts('zh_TW').stages.starting, '正在启动')
  assert.equal(launchSplashTexts('zh-CN').stages.starting, '正在启动')
})

test('a failure shows its reason as a sentence, an unknown code says so and never shows the code', () => {
  const zh = launchSplashTexts('zh')
  assert.deepEqual(launchLine(zh, { stage: 'failed', notice: 'timed-out' }), { kind: 'failed', text: '启动失败：游戏没有在限定时间内启动' })
  const unknown = launchLine(zh, { stage: 'failed', notice: 'zzz-surprise' })
  assert.equal(unknown.kind, 'failed')
  assert.doesNotMatch(unknown.text, /zzz/)
  assert.match(launchLine(launchSplashTexts('en'), { stage: 'failed', notice: 'broker' }).text, /^Launch failed: the Broker did not start$/)
})

test('a notice replaces the stage line; one it does not know is ignored; a failure beats a notice', () => {
  const zh = launchSplashTexts('zh')
  assert.deepEqual(launchLine(zh, { stage: 'waiting-window', notice: 'direct' }), { kind: 'notice', text: 'Sparxie 未能接管，已直接启动游戏' })
  assert.equal(launchLine(zh, { stage: 'waiting-window', notice: 'nonsense' }).kind, 'stage')
  assert.equal(launchLine(zh, { stage: 'failed', notice: 'direct' }).kind, 'failed')
  assert.equal(launchLine(zh, { stage: 'not-a-stage' }).text, '正在启动')
})

test('the product can reword single entries', () => {
  const T = launchSplashTexts('zh', { stages: { starting: '启动中' }, reasons: { broker: 'X' } })
  assert.equal(T.stages.starting, '启动中')
  assert.equal(T.stages.preparing, 'Sparxie 准备中')
  assert.equal(launchLine(T, { stage: 'failed', notice: 'broker' }).text, '启动失败：X')
})

test('the splash never takes input, sizes itself by its own box, and is calm under reduced motion', () => {
  const css = read('css/launchsplash.css'), vue = read('vue/MLaunchSplash.vue')
  assert.match(css, /\.m-launch \{[^}]*pointer-events: none/)
  assert.match(css, /\.m-launch \{[^}]*container-type: size/)
  assert.doesNotMatch(css, /\d(vmin|vw|vh)\b/, 'sizes are in cqmin / cqw of the splash, not of the viewport')
  assert.match(css, /prefers-reduced-motion: reduce[^}]*\{[^}]*animation-duration: 1ms/)
  assert.match(vue, /class="m-launch__wave" role="progressbar" :aria-label="line\.text"/, 'the waiting line is the wavy one and says what it waits for')
  assert.doesNotMatch(vue, /MProgress/, 'no straight track under the wave: the splash draws its own wavy line')
  assert.match(css, /\.m-launch__wave i\.m-launch__wave-track \{ opacity/, 'the track is the same wave, only fainter')
  assert.doesNotMatch(css, /\.m-launch__wave[^{]*\{[^}]*(border-radius|height: [0-9]+px; margin-top)/, 'nothing straight with round ends is drawn under the wave')
  assert.match(css, /data-motion='reduced'\] \.m-launch__wave i \{ animation: none/, 'reduced motion: the wave stands still')
  assert.match(vue, /v-if="art && line\.kind !== 'failed'" class="m-launch__bar"/, 'a failed launch shows no bar that keeps running')
  assert.match(vue, /<MLoading v-if="!art && line\.kind !== 'failed'"/, 'without a picture the expressive loading shape is the focal element')
  assert.match(vue, /alt=""/, 'the hero is decoration; the name is the text')
})

test('it is exported with the package and its stylesheet is part of all.css', () => {
  assert.match(read('vue/index.js'), /export \{ default as MLaunchSplash \} from "\.\/MLaunchSplash\.vue"/)
  const all = read('css/all.css')
  assert.match(all, /@import '\.\/launchsplash\.css';/)
  assert.ok(all.indexOf('launchsplash.css') < all.indexOf('touch-pressed.css'), 'the touch layers stay last')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { CONNECT_GRACE_S, OFFLINE_AFTER, RESTART_TRIES, connectDelay, connection, initialConnection, retryDelay, startingConnection } from '../src/status/hostConnection.js'
import { offlineTexts } from '../src/status/offlineTexts.js'

const run = (state, ...events) => events.reduce((s, e) => connection(s, e), state)
const down = (n) => Array.from({ length: n }, () => ({ type: 'probe', ok: false }))

test('online, then offline only after a few failed probes in a row, then back online with the page restored', () => {
  let s = initialConnection()
  s = run(s, ...down(OFFLINE_AFTER - 1)); assert.equal(s.status, 'online', 'one dropped answer is not an outage')
  s = run(s, { type: 'probe', ok: true }); assert.equal(s.fails, 0, 'an answer clears the count')
  s = run(s, ...down(OFFLINE_AFTER)); assert.equal(s.status, 'offline'); assert.equal(s.nextIn, 1)
  s = run(s, { type: 'tick' }); assert.equal(s.probing, true, 'the probe is due when the countdown ends')
  s = run(s, { type: 'probe', ok: true }); assert.equal(s.status, 'online'); assert.equal(s.recovered, true, 'the product returns to the page the person was on')
  assert.equal(run(s, { type: 'probe', ok: true }).recovered, false, 'once')
})

test('the retry pace is the old page\'s: ten fast, four of 5 s, then 30 s, and the countdown is visible', () => {
  assert.deepEqual([1, 10].map(retryDelay), [1, 1]); assert.deepEqual([11, 14].map(retryDelay), [5, 5]); assert.equal(retryDelay(15), 30)
  let s = run(initialConnection(), ...down(OFFLINE_AFTER))
  for (let i = 0; i < 10; i++) s = run(s, { type: 'tick' }, { type: 'probe', ok: false })
  assert.equal(s.round, 11); assert.equal(s.nextIn, 5)
  s = run(s, { type: 'tick' }); assert.equal(s.nextIn, 4); assert.equal(s.probing, false)
  s = run(s, { type: 'retry' }); assert.equal(s.probing, true); assert.equal(s.nextIn, 0, 'the button probes now')
})

test('offline -> restarting -> online', () => {
  let s = run(initialConnection(), ...down(OFFLINE_AFTER))
  s = run(s, { type: 'restart', mode: 'service' }); assert.equal(s.status, 'restarting'); assert.equal(s.mode, 'service')
  s = run(s, { type: 'probe', ok: false }, { type: 'probe', ok: false }); assert.equal(s.status, 'restarting'); assert.equal(s.attempt, 2)
  s = run(s, { type: 'probe', ok: true }); assert.equal(s.status, 'online'); assert.equal(s.recovered, true)
  assert.equal(run(initialConnection(), { type: 'restart' }).status, 'online', 'nothing to restart while online')
})

test('a restart that cannot be started, or that does not bring Sunshine back, goes back to offline with its reason', () => {
  const offline = run(initialConnection(), ...down(OFFLINE_AFTER))
  let s = run(offline, { type: 'restart', mode: 'user' }, { type: 'restart-failed', message: 'access denied' })
  assert.equal(s.status, 'offline'); assert.equal(s.error, 'access denied'); assert.equal(s.mode, 'user'); assert.ok(s.nextIn > 0, 'and the retries go on')
  s = run(offline, { type: 'restart' }, ...down(RESTART_TRIES)); assert.equal(s.status, 'offline'); assert.equal(s.error, 'timeout')
  assert.equal(run(offline, { type: 'restart-failed', message: 'x' }).status, 'offline', 'a failure with no restart running changes nothing')
})

test('the offline copy says what the old page said, in plain words, in both languages', () => {
  const zh = offlineTexts('zh'), en = offlineTexts('en')
  assert.equal(zh.title, 'Sunshine 没有响应'); assert.equal(zh.retry, '再试一次'); assert.equal(zh.awake, 'Sunshine 已恢复，正在返回…')
  assert.equal(zh.tipsTitle, '可以这样排查：')
  assert.deepEqual(zh.tips, ['Sunshine 服务有没有在运行', '端口 47990 有没有被占用或被拦截', '防火墙有没有拦截 Sunshine'])
  assert.equal(en.title, 'Sunshine is not responding'); assert.equal(en.retry, 'Try again')
  assert.deepEqual(en.tips, ['Is the Sunshine service running?', 'Is port 47990 free and not blocked?', 'Is the firewall blocking Sunshine?'])
  // the old wording is gone, the three questions (service, port, firewall) and the way back are kept
  const all = JSON.stringify([zh, en])
  for (const old of ['杂鱼', '♡', '呜～', '～', 'Silly', 'slacking', 'useless', 'Hurry up', '偷懒']) assert.ok(!all.includes(old), old)
  assert.equal(zh.tips.length, 3); assert.equal(en.tips.length, 3)
  assert.equal(offlineTexts('de').retry, 'Erneut versuchen')
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
})

test('the tips name the real port of the Web UI when the product knows it, the original 47990 otherwise', () => {
  assert.match(offlineTexts('zh', { port: 57990 }).tips[1], /端口 57990 有没有被占用/)
  assert.match(offlineTexts('en', { port: 57990 }).tips[1], /Is port 57990 free/)
  assert.match(offlineTexts('zh').tips[1], /端口 47990 /)
  assert.ok(!offlineTexts('zh', { port: 57990 }).tips.some((tip) => tip.includes('{port}')))
})

test('a window that opens while the host starts is connecting, not offline: failed probes are quiet until the grace has run out or the failure is certain', () => {
  let s = startingConnection()
  assert.equal(s.status, 'connecting'); assert.equal(s.probing, true, 'it probes at once')
  // far more failed probes than the offline threshold, all inside the grace: still connecting
  for (let i = 0; i < OFFLINE_AFTER * 5; i++) s = run(s, { type: 'probe', ok: false }, { type: 'tick' })
  assert.equal(s.status, 'connecting', 'a host that is slow to come up is not an outage')
  assert.deepEqual([0, 5, 6, 19, 20, 59].map(connectDelay), [1, 1, 2, 2, 3, 3], 'quick at first, calmer later')
  // the countdown runs and the next probe is due at its end
  s = run(startingConnection(), { type: 'probe', ok: false }); assert.equal(s.probing, false); assert.equal(s.nextIn, 1)
  s = run(s, { type: 'tick' }); assert.equal(s.probing, true)
  // the first answer: online, and the product loads its pages again (they were drawn before the host answered)
  s = run(s, { type: 'probe', ok: true }); assert.equal(s.status, 'online'); assert.equal(s.recovered, true)
})

test('connecting becomes offline when the grace has run out, or at once when the product says the host is not installed', () => {
  let s = startingConnection()
  for (let i = 0; i < CONNECT_GRACE_S; i++) s = run(s, { type: 'tick' })
  assert.equal(s.waited, CONNECT_GRACE_S); assert.equal(s.status, 'connecting', 'the grace itself is not a verdict')
  s = run(s, { type: 'probe', ok: false }); assert.equal(s.status, 'offline'); assert.equal(s.round, 1); assert.equal(s.nextIn, 1, 'then the usual offline retries')
  assert.equal(run(startingConnection(), { type: 'certain' }).status, 'offline')
  assert.equal(run(initialConnection(), { type: 'certain' }).status, 'online', 'a running window is not touched')
  assert.equal(initialConnection().status, 'online', 'the Web UI, served by a running host, starts online as before')
})

test('the composable and the page know the connecting state', () => {
  const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const hook = read('src/vue/useHostConnection.js'), page = read('src/vue/MHostOffline.vue')
  assert.match(hook, /starting \? startingConnection\(\) : initialConnection\(\)/)
  assert.match(hook, /state\.status === 'connecting'\) \{ apply\(\{ type: 'tick' \}\)/)
  assert.match(hook, /f\.service === 'missing' && !f\.running\) apply\(\{ type: 'certain' \}\)/, 'a stopped service may be a delayed start: only a missing one is certain')
  assert.match(page, /v-if="connecting" class="m-offline m-offline--connecting"/)
  assert.ok(!/restart|retry|tips/.test(page.slice(page.indexOf('m-offline--connecting'), page.indexOf('v-else class="m-offline"'))), 'the connecting state offers no error actions')
  assert.equal(offlineTexts('zh').connectingTitle, '正在连接 Sunshine'); assert.equal(offlineTexts('en').connectingTitle, 'Connecting to Sunshine')
  assert.match(read('src/telemetry/crash.js'), /before === 'online' \|\| before === 'connecting'/, 'a silence that follows connecting is judged like one that follows online')
})

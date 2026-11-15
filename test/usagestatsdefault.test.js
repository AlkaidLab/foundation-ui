import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { errorTexts } from '../src/vue/errorTexts.js'
import { buildGuideSteps } from '../src/vue/guideModel.js'
import { guideTexts } from '../src/vue/guideTexts.js'
import { CONSENT_KEY, ERRORS_KEY, mayCollect, readConsent } from '../src/telemetry/consent.js'

// Usage statistics are ON by default (on by default), nobody is asked, one first-run notice covers both choices, and a choice made in 关于 › 隐私 works at once.
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m } }

// the composable keeps window-wide state at import: each case gets its own copy, on its own storage and with its own window
let copies = 0
async function fresh(storage) {
  const events = []
  globalThis.localStorage = storage
  globalThis.window = { dispatchEvent: (event) => { events.push([event.type, event.detail]); return true }, addEventListener: () => {} }
  const mod = await import(`../src/vue/useTelemetryConsent.js?copy=${copies++}`)
  return { mod, events }
}
const hostOf = (config) => { const posts = []; return { posts, api: { getJson: async () => ({ ...config }), postJson: async (path, body) => { posts.push(body); return { status: true } } } } }

test('a window with no answer reads on, and the host\'s empty answer does not turn the default into a written answer', async () => {
  const storage = memory(); const { mod } = await fresh(storage); const host = hostOf({ port: 47989 })
  const t = mod.useTelemetryConsent({ api: host.api })
  assert.equal(t.consent.value, 'on'); assert.equal(t.loaded.value, false, 'the window does not yet know a person\'s own answer')
  await t.refresh()
  assert.equal(t.consent.value, 'on'); assert.equal(t.loaded.value, true)
  assert.equal(storage.getItem(CONSENT_KEY), null, 'the default is not stored as an answer'); assert.deepEqual(host.posts, [], 'and is not written to the host either')
})

test('an explicit off kept by the host wins over the default in a window that has no answer, and is cached', async () => {
  const storage = memory(); const { mod, events } = await fresh(storage)
  const t = mod.useTelemetryConsent({ api: hostOf({ telemetry_consent: 'off' }).api })
  await t.refresh()
  assert.equal(t.consent.value, 'off'); assert.equal(storage.getItem(CONSENT_KEY), 'off'); assert.equal(mayCollect(readConsent(storage)), false)
  assert.deepEqual(events.at(-1), ['foundation-telemetry-consent', 'off'], 'the collector, which holds back until the host has answered, is told')
})

test('the host\'s retired ask is not an answer; an explicit off made in this window is handed to the host', async () => {
  const s1 = memory(); const a = await fresh(s1)
  const t1 = a.mod.useTelemetryConsent({ api: hostOf({ telemetry_consent: 'ask' }).api }); await t1.refresh()
  assert.equal(t1.consent.value, 'on'); assert.equal(s1.getItem(CONSENT_KEY), null)
  const s2 = memory(); s2.setItem(CONSENT_KEY, 'off'); const b = await fresh(s2); const host = hostOf({})
  const t2 = b.mod.useTelemetryConsent({ api: host.api }); assert.equal(t2.consent.value, 'off'); assert.equal(t2.loaded.value, true, 'an answer of its own is known at once')
  await t2.refresh(); assert.equal(host.posts[0].telemetry_consent, 'off')
})

test('turning usage statistics or error reports off in 关于 › 隐私 takes effect at once: the stored answer and the event change in the same call, no reload', async () => {
  const storage = memory(); const { mod, events } = await fresh(storage); const host = hostOf({})
  const t = mod.useTelemetryConsent({ api: host.api })
  const pending = t.answer('off')
  assert.equal(t.consent.value, 'off'); assert.equal(mayCollect(readConsent(storage)), false, 'before the host has even answered')
  assert.deepEqual(events.at(-1), ['foundation-telemetry-consent', 'off'])
  await pending; assert.equal(host.posts.at(-1).telemetry_consent, 'off')
  const pendingErrors = t.setErrors('off')
  assert.equal(t.errors.value, 'off'); assert.equal(storage.getItem(ERRORS_KEY), 'off'); assert.deepEqual(events.at(-1), ['foundation-telemetry-errors', 'off'])
  await pendingErrors
  await t.answer('on'); assert.equal(mayCollect(readConsent(storage)), true)
})

test('no first-run step and no screen asks about it: the guide has no consent step in any language, the shell no dialog, the notice covers both', () => {
  assert.ok(!buildGuideSteps().some((s) => s.id === 'consent') && !buildGuideSteps({ mode: 'upgrade' }).some((s) => s.id === 'consent'))
  for (const lang of ['zh', 'en']) { assert.equal(guideTexts(lang).titles.consent, undefined); assert.equal(guideTexts(lang).leads.consent, undefined) }
  for (const f of fs.readdirSync(new URL('../src/locale/texts/', import.meta.url)).filter((f) => !f.includes('.'))) assert.doesNotMatch(read(`src/locale/texts/${f}/guide.js`), /"(titles\.)?consent"/, `${f} guide has no consent title`)
  const flow = read('src/vue/MGuideFlow.vue')
  assert.doesNotMatch(flow, /callbacks\.setConsent|state\.consent|consent: \{/)
  assert.match(flow, /errorsParts\[0\][\s\S]*callbacks\.openPrivacy\(\)/, 'the one notice, with the link to 关于 › 隐私')
  assert.match(errorTexts('zh').errorsNotice, /错误记录.*使用统计/); assert.match(errorTexts('en').errorsNotice, /error records and usage statistics/)
})

test('关于 › 隐私 shows both switches, each with its own state and the same line whether it is on or off; no "not decided" state', () => {
  const about = read('src/vue/MAbout.vue')
  assert.match(about, /<MSwitchItem v-if="errors" :model-value="errors === 'on'"[^>]*data-privacy="errors"/)
  assert.match(about, /<MSwitchItem v-if="consent" :model-value="consent === 'on'"[^>]*:text="E\.usageRowText" data-privacy="usage"/)
  assert.doesNotMatch(about, /usageAskText/)
})

test('every locale carries the notice that covers both usage statistics and error reports, with its own term for usage statistics and the link', () => {
  const line = (loc) => read(`src/locale/texts/${loc}/error.js`).split('\n').find((l) => l.includes('"errorsNotice"'))
  const locales = fs.readdirSync(new URL('../src/locale/texts/', import.meta.url)).filter((f) => !f.includes('.'))
  assert.ok(locales.length >= 18, 'all locales are checked')
  for (const loc of ['en_US', 'en_GB']) assert.match(line(loc), /error records and usage statistics/)
  for (const loc of locales) {
    const body = read(`src/locale/texts/${loc}/error.js`)
    const { errorsNotice: notice, usageRow: term } = JSON.parse(body.replace(/^export default\s*/, ''))
    assert.equal(notice.split('{link}').length, 2, `${loc} has one link`)
    assert.ok(notice.toLowerCase().includes(term.toLowerCase()), `${loc} names usage statistics with the term of its privacy row (${term})`)
  }
})

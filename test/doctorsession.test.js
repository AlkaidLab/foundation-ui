import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { sessionDoctor, shouldAutostart, resetDoctorSessions, doctorResult, restoreDoctor, createDoctor, countStatuses, DOCTOR_GROUPS } from '../src/doctor/model.js'
import { doctorTexts, doctorClock } from '../src/doctor/texts.js'

const real = JSON.parse(fs.readFileSync(new URL('./fixtures/doctor-real.json', import.meta.url), 'utf8'))
const answer = async (path) => {
  const only = new URL(path, 'http://x').searchParams.get('only')
  const group = real.groups.find((g) => g.id === only)
  return { ok: true, status: 200, json: { ...real, groups: [group], items: real.items.filter((i) => group.items.includes(i.id)) } }
}
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), keys: () => [...m.keys()] } }
const opts = (storage, extra = {}) => ({ request: answer, locale: () => 'zh', parallel: 4, streaming: () => false, storage, storageKey: 'test.doctor', ...extra })
const tick = () => new Promise((r) => setTimeout(r, 0))

test('following a link and coming back finds the result: the page gets the same doctor, with its time', async () => {
  resetDoctorSessions()
  const storage = memory()
  const first = sessionDoctor('k1', opts(storage))
  await first.doctor.run()
  const counts = countStatuses(first.doctor.state.groups); const finished = first.doctor.state.finishedAt
  assert.ok(finished > 0)
  // the page is gone (the person went to another page) and is built again
  const again = sessionDoctor('k1', opts(storage))
  assert.equal(again.doctor, first.doctor, 'the same doctor, not a new one that has to run again')
  assert.deepEqual(countStatuses(again.doctor.state.groups), counts)
  assert.equal(again.doctor.state.finishedAt, finished)
  assert.ok(again.doctor.state.groups.every((g) => g.state === 'done'))
})

test('a run that is going on when the person leaves goes on, and the page shows it when it is opened again', async () => {
  resetDoctorSessions()
  let release; const gate = new Promise((r) => { release = r })
  const slow = async (p) => { await gate; return answer(p) }
  const first = sessionDoctor('k2', opts(memory(), { request: slow }))
  const running = first.doctor.run()
  await tick()
  const again = sessionDoctor('k2', opts(memory(), { request: slow }))
  assert.equal(again.doctor.state.running, true); assert.ok(again.doctor.state.groups.some((g) => g.state === 'running' || g.state === 'queued'))
  release(); await running
  assert.equal(again.doctor.state.running, false); assert.ok(again.doctor.state.groups.every((g) => g.state === 'done'))
})

test('a visit hands the page\'s current request, language and sources to the doctor: a later run does not use the first visit\'s', async () => {
  resetDoctorSessions()
  const langs = []
  const make = (tag) => ({ id: 'host', groups: DOCTOR_GROUPS, fetch: async (g, lang) => { langs.push(`${tag}:${lang}`); return answer(`/api/doctor?only=${g}`) } })
  let locale = 'zh'
  const s1 = sessionDoctor('k3', { ...opts(memory()), request: undefined, sources: [make('first')], locale: () => locale })
  locale = 'en'
  const s2 = sessionDoctor('k3', { ...opts(memory()), request: undefined, sources: [make('second')], locale: () => locale })
  assert.equal(s1.doctor, s2.doctor)
  await s2.doctor.run()
  assert.ok(langs.length > 0 && langs.every((l) => l === 'second:en'), langs.slice(0, 3).join(','))
})

test('a finished result is kept in the storage and comes back when the app is opened again; a result of other groups does not', async () => {
  resetDoctorSessions()
  const storage = memory()
  const s = sessionDoctor('k4', opts(storage))
  await s.doctor.run(); await tick()
  assert.ok(storage.keys().includes('test.doctor.result'))
  const counts = countStatuses(s.doctor.state.groups)
  // the app is opened again: nothing in memory, the storage has the result
  resetDoctorSessions()
  const reopened = sessionDoctor('k4', opts(storage))
  assert.notEqual(reopened.doctor, s.doctor)
  assert.deepEqual(countStatuses(reopened.doctor.state.groups), counts)
  assert.ok(reopened.doctor.state.finishedAt > 0)
  assert.equal(reopened.doctor.state.running, false)
  // other groups (another source set): not restored
  resetDoctorSessions()
  const other = createDoctor({ sources: [{ id: 'local', groups: [{ id: 'nope', icon: 'info' }], fetch: async () => ({ ok: false, status: 0 }) }] })
  assert.equal(restoreDoctor(other.state, JSON.parse(storage.getItem('test.doctor.result'))), false)
  assert.equal(other.state.finishedAt, 0)
  assert.equal(restoreDoctor(other.state, { v: 2 }), false); assert.equal(restoreDoctor(other.state, null), false)
  const plain = doctorResult(s.doctor.state); assert.doesNotThrow(() => JSON.stringify(plain))
})

test('an entry runs the check when it asks to: a token runs once (Back with the same token does not), a bare true runs when there is no fresh result', async () => {
  resetDoctorSessions()
  const s = sessionDoctor('k5', opts(memory()))
  assert.equal(shouldAutostart(s, false), false)
  assert.equal(shouldAutostart(s, 1001), true, 'a new press of 开始体检')
  await s.doctor.run()
  assert.equal(shouldAutostart(s, 1001), false, 'the entry of the history comes back with its token: the result stays')
  assert.equal(shouldAutostart(s, 1002), true, 'another press runs again')
  const now = s.doctor.state.finishedAt
  assert.equal(shouldAutostart(s, true, now + 60 * 1000), false, 'an entry without a token, a minute after the result')
  assert.equal(shouldAutostart(s, true, now + 10 * 60 * 1000), true, 'the same ten minutes later')
  const fresh = sessionDoctor('k6', opts(memory())); assert.equal(shouldAutostart(fresh, true), true, 'no result yet')
  s.doctor.state.running = true; assert.equal(shouldAutostart(s, 1003), false, 'never a second run on top of one that is going')
})

test('the page: the result survives the visit, says when it was made, and the running state does not name the groups twice', () => {
  const vue = fs.readFileSync(new URL('../src/vue/MDoctor.vue', import.meta.url), 'utf8')
  assert.match(vue, /sessionDoctor\(props\.storageKey/); assert.match(vue, /shouldAutostart\(/)
  assert.match(vue, /type: \[Boolean, Number\]/)
  assert.match(vue, /T\.value\.checkedAt/)
  assert.doesNotMatch(vue, /running\.now/); assert.doesNotMatch(vue, /runningNames/)
  assert.match(vue, /if \(phase\.value === 'running'\) return ''/)
  for (const lang of ['zh', 'en']) {
    const T = doctorTexts(lang)
    assert.match(T.checkedAt, /\{at\}/); assert.match(T.checkedAt, /\{ago\}/); assert.equal(T.running, undefined)
  }
  const day = new Date(2026, 10, 9, 14, 5).getTime()
  assert.equal(doctorClock(day, new Date(2026, 10, 9, 20, 0).getTime()), '14:05')
  assert.equal(doctorClock(day, new Date(2026, 10, 10, 9, 0).getTime()), '11-09 14:05')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { afterCheck, afterOpened, noticeView, readNotice, writeNotice, NOTICE_KEY } from '../src/update/notice.js'

const INSTALLED = '2026.1107.100000'
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m } }
const empty = { available: '', seen: '' }

test('no update: nothing waits, no dot', () => {
  assert.deepEqual(noticeView(empty, { installed: INSTALLED }), { waiting: false, version: '', dot: false })
  assert.deepEqual(noticeView(afterCheck(empty, { version: INSTALLED, is_latest: true }, { installed: INSTALLED }), { installed: INSTALLED }), { waiting: false, version: '', dot: false })
})
test('update available: the line and the dot', () => {
  const state = afterCheck(empty, { version: '2026.1109.090000', is_latest: false }, { installed: INSTALLED })
  assert.deepEqual(noticeView(state, { installed: INSTALLED }), { waiting: true, version: '2026.1109.090000', dot: true })
})
test('opening 软件更新 clears the dot but not the line', () => {
  let state = afterCheck(empty, { version: '2026.1109.090000' }, { installed: INSTALLED })
  state = afterOpened(state)
  assert.deepEqual(noticeView(state, { installed: INSTALLED }), { waiting: true, version: '2026.1109.090000', dot: false })
  // checking again and finding the same version does not bring the dot back
  state = afterCheck(state, { version: '2026.1109.090000' }, { installed: INSTALLED })
  assert.equal(noticeView(state, { installed: INSTALLED }).dot, false)
})
test('a newer version than the seen one brings the dot back', () => {
  let state = afterOpened(afterCheck(empty, { version: '2026.1109.090000' }, { installed: INSTALLED }))
  state = afterCheck(state, { version: '2026.1112.080000' }, { installed: INSTALLED })
  assert.deepEqual(noticeView(state, { installed: INSTALLED }), { waiting: true, version: '2026.1112.080000', dot: true })
})
test('installing: the installed version catches up and clears both', () => {
  const state = afterOpened(afterCheck(empty, { version: '2026.1109.090000' }, { installed: INSTALLED }))
  assert.deepEqual(noticeView(state, { installed: '2026.1109.090000' }), { waiting: false, version: '', dot: false })
  assert.deepEqual(noticeView(state, { installed: '2026.1110.010000' }), { waiting: false, version: '', dot: false })
})
test('a check that says latest forgets a waiting update; an older answer is no update', () => {
  const waiting = afterCheck(empty, { version: '2026.1109.090000' }, { installed: INSTALLED })
  assert.equal(afterCheck(waiting, { version: INSTALLED, is_latest: true }, { installed: INSTALLED }).available, '')
  assert.equal(afterCheck(waiting, { version: '2026.1101.000000' }, { installed: INSTALLED }).available, '')
  assert.equal(afterCheck(waiting, null, { installed: INSTALLED }).available, '')
})
test('a skipped version shows nothing; another one does', () => {
  const state = afterCheck(empty, { version: '2026.1109.090000' }, { installed: INSTALLED })
  assert.equal(noticeView(state, { installed: INSTALLED, skipped: 'v2026.1109.090000' }).waiting, false)
  assert.equal(noticeView(state, { installed: INSTALLED, skipped: '2026.1101.000000' }).waiting, true)
})
test('while the installed version is unknown a found version is still a waiting update', () => {
  assert.equal(noticeView({ available: '2026.1109.090000', seen: '' }, { installed: '' }).waiting, true)
})
test('the state is kept and read back; a broken store is empty', () => {
  const storage = memory()
  assert.deepEqual(readNotice(storage), empty)
  writeNotice(storage, { available: 'v2026.1109.090000', seen: '' })
  assert.deepEqual(readNotice(storage), { available: '2026.1109.090000', seen: '' })
  storage.setItem(NOTICE_KEY, '{nope')
  assert.deepEqual(readNotice(storage), empty)
  assert.deepEqual(readNotice({ getItem() { throw new Error('denied') } }), empty)
})

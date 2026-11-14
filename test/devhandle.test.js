import test from 'node:test'
import assert from 'node:assert/strict'
import { adoptHandle, readSession, saveSession, SESSION_KEY } from '../src/devmode/signin.js'
import { createGithubClient } from '../src/devmode/github.js'
import { composeReport, sendThroughBackend } from '../src/devmode/feedback.js'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m } }
const headers = (h) => ({ get: (k) => h[String(k).toLowerCase()] ?? null })
const reply = (status, body, h = {}) => ({ status, ok: status >= 200 && status < 300, headers: headers(h), json: async () => body })

test('adoptHandle keeps the new handle the Worker sent after it refreshed the GitHub token, and only then', () => {
  const s = memory()
  saveSession({ handle: 'old', login: 'sky', at: 5 }, s)
  adoptHandle(reply(200, {}, {}), s); assert.equal(readSession(s).handle, 'old', 'no header: nothing changes')
  adoptHandle(reply(200, {}, { 'x-devmode-session': 'old' }), s); assert.equal(readSession(s).handle, 'old')
  adoptHandle(reply(200, {}, { 'x-devmode-session': 'new' }), s)
  assert.deepEqual(readSession(s), { handle: 'new', login: 'sky', at: 5 }, 'the login and the time stay')
  const none = memory()
  adoptHandle(reply(200, {}, { 'x-devmode-session': 'x' }), none); assert.equal(none.getItem(SESSION_KEY), null, 'signed out here: a header does not sign anyone in')
  assert.doesNotThrow(() => adoptHandle(null, s)); assert.doesNotThrow(() => adoptHandle({}, s))
})

test('a read of GitHub through the Worker keeps the handle it is given back, and the next read uses it', async () => {
  const s = memory()
  saveSession({ handle: 'h1', login: 'sky', at: 1 }, s)
  const sent = []
  const client = createGithubClient({ storage: memory(), session: s, ttlMs: 0, token: () => readSession(s)?.handle || '', fetchImpl: async (url, o) => { sent.push(o.headers.authorization); return reply(200, [], sent.length === 1 ? { 'x-devmode-session': 'h2' } : {}) } })
  await client.list('fs'); await client.list('fs')
  assert.deepEqual(sent, ['Bearer h1', 'Bearer h2'])
  assert.equal(readSession(s).handle, 'h2')
  // a rate-limited answer carries the new handle too: the refresh happened
  await createGithubClient({ storage: memory(), session: s, fetchImpl: async () => reply(403, {}, { 'x-devmode-session': 'h3', 'x-ratelimit-remaining': '0' }) }).comments('fs', 1)
  assert.equal(readSession(s).handle, 'h3')
})

test('sending a report keeps the handle after the attachments and after the issue; the same round still uses the old one', async () => {
  const s = memory()
  saveSession({ handle: 'h1', login: 'sky', at: 1 }, s)
  const r = composeReport({ kind: 'error', repo: 'fs', title: 't', description: 'd', error: { name: 'E', message: 'm' }, logs: 'l\n' })
  const auth = []
  const out = await sendThroughBackend({ report: r, session: readSession(s), sessionStore: s, backend: { workerUrl: 'https://w.example', configured: true }, fetchImpl: async (url, init) => {
    auth.push(init.headers.authorization)
    return url.includes('/attachment') ? reply(200, { id: 'a1' }, { 'x-devmode-session': `h${auth.length + 1}` }) : reply(200, { number: 3, url: 'u' }, { 'x-devmode-session': 'hN' })
  } })
  assert.equal(out.state, 'sent')
  assert.ok(auth.every((a) => a === 'Bearer h1'), 'the old handle is good for the rest of the round')
  assert.equal(readSession(s).handle, 'hN')
})

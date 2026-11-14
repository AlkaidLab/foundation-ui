// The GitHub sign-in on a real machine (collaborator report, 2026-11-13): the button that opens github.com/login/device did nothing, and after the sign-in the Issue page said 离线 with no cache.
//   - the page's reads to the Worker carried x-github-api-version, which the Worker's CORS preflight does not allow: the browser refused the request before it left the window and fetch threw, which the page calls offline;
//   - a failed open or copy was swallowed; an offline answer told nothing about which host or why.
import test from 'node:test'
import assert from 'node:assert/strict'
import { API, createGithubClient } from '../src/devmode/github.js'
import { createSignIn } from '../src/devmode/signin.js'
import { WORKER_HEADERS, hostOf, reasonOf } from '../src/devmode/net.js'
import { openAddress, copyText } from '../src/devmode/handoff.js'
import { devmodeTexts, fillText } from '../src/devmode/texts.js'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) } }
const hdr = (h) => ({ get: (k) => h[String(k).toLowerCase()] ?? null })
const reply = (status, body, h = {}) => ({ status, ok: status >= 200 && status < 300, headers: hdr(h), json: async () => body, text: async () => JSON.stringify(body) })
const WORKER = 'https://devapi.example.test'
const row = (n) => ({ number: n, title: `t${n}`, state: 'open', labels: [], user: { login: 'u' }, updated_at: '2026-11-09T10:00:00Z', created_at: '2026-11-09T09:00:00Z', comments: 0, body: '', html_url: `https://github.com/x/y/issues/${n}` })

// what a browser does with a cross-origin request: a header that is not CORS-safelisted must be in the answer to the preflight, else fetch throws "Failed to fetch"
const SAFELISTED = new Set(['accept', 'accept-language', 'content-language', 'content-type'])
const corsFetch = (allowed, seen = []) => async (url, init) => {
  const names = Object.keys(init?.headers || {}).map((k) => k.toLowerCase())
  const refused = names.filter((k) => !SAFELISTED.has(k) && !allowed.includes(k))
  if (refused.length) throw new TypeError('Failed to fetch')
  seen.push({ url, names })
  return reply(200, [row(1)])
}

test('a read through the Worker carries only headers the Worker allows, with a session handle; a read of GitHub itself still names the API version', async () => {
  const seen = []
  const fetchImpl = corsFetch(WORKER_HEADERS, seen)
  const viaWorker = createGithubClient({ fetchImpl, storage: memory(), base: `${WORKER}/github`, token: () => 'H-1' })
  const r = await viaWorker.list('fs', 'issue', { force: true })
  assert.equal(r.state, 'ok'); assert.equal(r.items.length, 1)
  assert.ok(seen[0].names.includes('authorization'))
  assert.ok(seen[0].names.every((k) => SAFELISTED.has(k) || WORKER_HEADERS.includes(k)), seen[0].names.join())
  assert.ok(!seen[0].names.includes('x-github-api-version'))
  const direct = createGithubClient({ fetchImpl: corsFetch([...WORKER_HEADERS, 'x-github-api-version'], seen), storage: memory(), base: API })
  assert.equal((await direct.list('fs', 'issue', { force: true })).state, 'ok')
  assert.ok(seen[1].names.includes('x-github-api-version'))
})

test('the Worker contract: every header of a revalidated read (if-none-match) is allowed as well', async () => {
  const names = []
  const fetchImpl = async (url, init) => { names.push(...Object.keys(init.headers).map((k) => k.toLowerCase())); return reply(200, [row(1)], { etag: '"a"' }) }
  const client = createGithubClient({ fetchImpl, storage: memory(), base: `${WORKER}/github`, token: () => 'H-1', now: () => 0 })
  await client.list('fs', 'issue', { force: true }); await client.list('fs', 'issue', { force: true })
  assert.ok(names.includes('if-none-match'))
  assert.ok(names.every((k) => SAFELISTED.has(k) || WORKER_HEADERS.includes(k)), names.join())
})

test('an offline answer names the host and the engine\'s own words, for the reads and for the sign-in', async () => {
  const down = async () => { throw new TypeError('Failed to fetch') }
  const r = await createGithubClient({ fetchImpl: down, storage: memory(), base: `${WORKER}/github`, token: () => 'H-1' }).list('fs', 'issue', { force: true })
  assert.equal(r.state, 'offline'); assert.equal(r.host, 'devapi.example.test'); assert.equal(r.reason, 'Failed to fetch')
  const backend = () => ({ configured: true, workerUrl: WORKER, clientId: 'Iv1.abcdef0123' })
  const flow = createSignIn({ storage: memory(), backend, fetchImpl: down })
  const s = await flow.start()
  assert.deepEqual([s.state, s.host, s.reason], ['offline', 'devapi.example.test', 'Failed to fetch'])
  const p = await flow.poll('d')
  assert.deepEqual([p.state, p.host], ['offline', 'devapi.example.test'])
  assert.equal(hostOf('not an address'), ''); assert.equal(reasonOf(null), ''); assert.ok(reasonOf(new Error('x'.repeat(500))).length <= 120)
})

test('the page words for it exist in Chinese and English', () => {
  for (const locale of ['zh', 'en']) {
    const t = devmodeTexts(locale)
    assert.match(fillText(t.offlineHost, { host: 'h.example' }), /h\.example/)
    assert.ok(t.siOpenFailed.includes('github.com/login/device')); assert.ok(t.siCopyFailed)
  }
})

test('opening the device page: the product opens it; a refusal, a throw or no product is answered false so the sheet can say what to do', async () => {
  const urls = []
  assert.equal(await openAddress('https://github.com/login/device', { open: async (u) => { urls.push(u); return true } }), true)
  assert.deepEqual(urls, ['https://github.com/login/device'])
  assert.equal(await openAddress('u', { open: async () => false }), false, 'the native side said no')
  assert.equal(await openAddress('u', { open: async () => { throw new Error('no') } }), false)
  assert.equal(await openAddress('u', { open: null, windowOpen: () => null }), false, 'a webview refuses window.open')
  assert.equal(await openAddress('u', { open: null, windowOpen: () => ({}) }), true)
})

test('copying the code: the clipboard API, then the old command, and false when both fail', async () => {
  const kept = []
  assert.equal(await copyText('ABCD-1234', { clipboard: { writeText: async (t) => { kept.push(t) } } }), true); assert.deepEqual(kept, ['ABCD-1234'])
  const field = { style: {}, setAttribute() {}, select() {}, remove() { field.removed = true } }
  const doc = (ok) => ({ createElement: () => field, body: { appendChild() {} }, execCommand: (c) => c === 'copy' && ok })
  const refuse = { writeText: async () => { throw new Error('denied') } }
  assert.equal(await copyText('x', { clipboard: refuse, document: doc(true) }), true); assert.equal(field.removed, true)
  assert.equal(await copyText('x', { clipboard: refuse, document: doc(false) }), false)
  assert.equal(await copyText('x', { clipboard: undefined, document: undefined }), false)
})

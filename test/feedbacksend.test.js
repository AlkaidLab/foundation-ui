import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { QUEUE_MAX_ATTEMPTS, buildReport, droppedOf, onReportDropped, enqueue, flushQueue, flushQueueAuto, isQueued, loadQueue, referenceOf, removeQueued, reportIdOf, reportToDocument, reportToEvent, resetAutoFlush, sendDocument, submitReport, wasSent, writeConsent } from '../src/telemetry/index.js'
import { dismissError, hostMounted, reportError, reportFeedback, setErrorContext, useErrors } from '../src/vue/useErrors.js'
import { errorTexts } from '../src/vue/errorTexts.js'

const memory = () => { const data = new Map(); return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, String(v)) }, removeItem: (k) => { data.delete(k) } } }
const ctx = { product: 'panel', version: '2026.1106.1', os: 'Windows 11', page: 'diagnostics', locale: 'zh', logs: 'line one', now: Date.parse('2026-11-06T10:00:00Z') }
const fixed = buildReport(new Error('x'), { kind: 'manual', fatal: false, context: ctx })
const docOf = (title = 'T', description = 'D', extra = {}) => reportToDocument(fixed, { title, description, ...extra })
const answer = (status) => async () => ({ ok: status >= 200 && status < 300, status })
const counting = (status) => { const f = async (u, o) => { f.calls.push({ u, o }); return { ok: status < 300, status } }; f.calls = []; return f }

test('the id of a report comes from its content: the same report is the same document, another text is another one', () => {
  assert.equal(reportIdOf(docOf()), reportIdOf(docOf())); assert.match(reportIdOf(docOf()), /^[0-9a-f]{32}$/)
  assert.notEqual(reportIdOf(docOf('T')), reportIdOf(docOf('T2')))
  assert.equal(referenceOf('ab12cd34ef56'), 'AB12CD34'); assert.equal(referenceOf(''), '')
  // what is sent is an event of the contract (user_report): a category, the component, the page, an error code and one scrubbed message; no contact field
  const long = reportToDocument(buildReport(Object.assign(new Error('boom at C:\\Users\\Eve\\x.js'), { stack: `Error: boom\n${Array.from({ length: 20 }, (_, i) => `    at fn${i} (https://h/assets/a.js:${i}:1)`).join('\n')}` }), { kind: 'error', context: { ...ctx, category: 'display', code: 'type-error', breadcrumbs: Array.from({ length: 12 }, (_, i) => `12:00:0${i % 10} ERROR ui e${i}`).join('\n') } }), { title: 'A title', description: 'A description', type: 'performance' })
  const event = reportToEvent(long)
  assert.deepEqual(Object.keys(event), ['kind', 'name', 'props']); assert.equal(event.kind, 'error'); assert.equal(event.name, 'user_report')
  assert.deepEqual(Object.keys(event.props), ['category', 'component', 'page', 'error_code', 'message'])
  assert.deepEqual([event.props.category, event.props.component, event.props.page, event.props.error_code], ['performance', 'panel', 'diagnostics', 'display.type-error'])
  const message = event.props.message
  assert.ok(message.length <= 2000 && message.startsWith('A title\n\nA description'), 'what the person wrote comes first')
  assert.match(message, /Error: Error: boom at C:\\Users\\<user>/); assert.match(message, /Stack:[\s\S]*fn0/); assert.ok(!message.includes('fn7'), 'the top six frames only'); assert.match(message, /Recent events:/)
  assert.ok(!JSON.stringify(event).includes('Eve') && !('contact' in event.props))
  assert.ok(reportToEvent(docOf('T'.repeat(100), 'd'.repeat(5000))).props.message.length <= 2000)
  assert.equal(reportToEvent(docOf()).props.category, 'other', 'feedback without an error')
  assert.equal(reportToEvent(reportToDocument(buildReport(new Error('x'), { kind: 'error', context: ctx }), { title: 't', description: 'd' })).props.category, 'bug')
  const ref = `att-2026-11/${'a'.repeat(64)}.zip`
  assert.equal(reportToEvent(docOf('t', 'd', { attachment: ref })).props.attachment, ref)
  for (const bad of ['https://x/a.zip', 'C:\\a.zip', 'att-2026-11/abc.zip']) assert.ok(!('attachment' in reportToEvent(docOf('t', 'd', { attachment: bad })).props), bad)
})

test('a duplicate press sends once: the second is answered by the first request, a press after that says it was sent', async () => {
  const s = memory(); const f = counting(200); const doc = docOf()
  const [a, b] = await Promise.all([submitReport(doc, { storage: s, transport: f }), submitReport(doc, { storage: s, transport: f })])
  assert.equal(f.calls.length, 1); assert.equal(a.state, 'sent'); assert.equal(b.state, 'sent'); assert.equal(a.id, reportIdOf(doc))
  const again = await submitReport(doc, { storage: s, transport: f })
  assert.equal(f.calls.length, 1); assert.deepEqual([again.state, again.again], ['sent', true]); assert.ok(wasSent(reportIdOf(doc), s))
})

test('offline: nothing is requested, the report is kept once, the state says offline; a press again keeps still one', async () => {
  const s = memory(); const f = counting(200); const doc = docOf()
  const first = await submitReport(doc, { storage: s, transport: f, online: false })
  assert.deepEqual([first.state, first.reason], ['queued', 'offline']); assert.equal(f.calls.length, 0)
  await submitReport(doc, { storage: s, transport: f, online: false })
  assert.equal(loadQueue(s).length, 1); assert.ok(isQueued(reportIdOf(doc), s))
  // back online: the retry of the kept report sends it, with its own id, and leaves the queue
  const back = await submitReport(doc, { storage: s, transport: f, online: true })
  assert.equal(back.state, 'sent'); assert.equal(loadQueue(s).length, 0); assert.equal(f.calls[0].u[0].name, 'user_report')
})

test('retrying a kept report does not use the hourly allowance, and it is bounded by it for new ones', async () => {
  const s = memory(); const doc = docOf()
  for (let i = 0; i < 4; i += 1) await submitReport(doc, { storage: s, transport: async () => { throw new TypeError('x') } })
  assert.equal(loadQueue(s).length, 1); assert.ok(loadQueue(s)[0].attempts <= QUEUE_MAX_ATTEMPTS - 1)
  assert.equal(JSON.parse(s.getItem('foundation-ui.errors.sent')).length, 1, 'four presses of one report used one place of the allowance')
})

test('an answer that was lost may have arrived (kept for the retry); a refusal is not retried; a host that kept none refused it', async () => {
  const s = memory(); const doc = docOf()
  const hang = () => new Promise(() => {})
  const first = await submitReport(doc, { storage: s, transport: hang, timeoutMs: 10 })
  assert.deepEqual([first.state, first.reason], ['queued', 'timeout']); assert.equal(loadQueue(s)[0].maybeArrived, true)
  const second = await submitReport(doc, { storage: s, transport: answer(200) })
  assert.equal(second.state, 'sent'); assert.equal(loadQueue(s).length, 0)
  assert.equal((await submitReport(docOf('other'), { storage: memory(), transport: answer(403) })).state, 'rejected')
  assert.equal((await sendDocument(doc, { transport: answer(400), id: 'x' })).state, 'rejected')
  assert.equal((await sendDocument(doc, { transport: answer(503), id: 'x' })).state, 'offline')
  assert.equal((await sendDocument(doc, { transport: answer(429), id: 'x' })).state, 'offline')
  assert.deepEqual(await sendDocument(doc, { transport: answer(200), id: 'x' }), { state: 'sent', id: 'x' })
  const none = async () => ({ ok: true, status: 200, json: async () => ({ accepted: 0 }) })
  assert.deepEqual(await sendDocument(doc, { transport: none }), { state: 'rejected', reason: 'not-accepted' })
  assert.equal((await sendDocument(doc, { transport: async () => ({ ok: true, status: 200, json: async () => ({ accepted: 1 }) }) })).state, 'sent')
  assert.equal((await sendDocument(doc, { transport: null })).reason, 'no-transport')
})

test('what the person pressed stays on the computer while error information is off; Retry still sends it', async () => {
  const s = memory(); const f = counting(200); const doc = docOf()
  await submitReport(doc, { storage: s, transport: async () => { throw new TypeError('x') } })
  resetAutoFlush()
  assert.equal(await flushQueueAuto({ consent: 'off', storage: s, transport: f }), null); assert.equal(f.calls.length, 0); assert.equal(loadQueue(s).length, 1)
  assert.deepEqual(await flushQueueAuto({ consent: 'ask', storage: s, transport: f, now: 1_000_000 }), { sent: 1, rejected: 0, left: 0 }); assert.equal(f.calls.length, 1)
  // a storm of 'online' events is one flush in 30 s
  resetAutoFlush(); await submitReport(docOf('b'), { storage: s, transport: async () => { throw new TypeError('x') } })
  assert.ok(await flushQueueAuto({ consent: 'on', storage: s, transport: async () => { throw new TypeError('x') }, now: 5_000_000 }))
  assert.equal(await flushQueueAuto({ consent: 'on', storage: s, transport: async () => { throw new TypeError('x') }, now: 5_010_000 }), null)
  // the explicit retry has its own path whatever the choice is
  assert.equal((await submitReport(docOf('b'), { storage: s, transport: f })).state, 'sent')
  writeConsent('off', s); assert.equal((await submitReport(docOf('c'), { storage: s, transport: f })).state, 'sent', 'an explicit press sends with the choice off')
})

test('editing a kept report drops the old copy', async () => {
  const s = memory(); const a = docOf('first')
  await submitReport(a, { storage: s, transport: async () => { throw new TypeError('x') } })
  assert.equal(removeQueued(reportIdOf(a), s), 1); assert.equal(loadQueue(s).length, 0)
})

test('feedback without an error: a manual report that opens the form, only where the error surface is mounted', () => {
  const { state } = useErrors()
  dismissError(); setErrorContext(() => ({ product: 'web', version: 'v', os: 'Linux', page: 'troubleshooting', locale: 'en', logs: 'x' }))
  assert.equal(reportFeedback({ logs: 'a' }), false, 'no MErrorHost mounted: the entry stays hidden')
  hostMounted(true)
  assert.equal(reportFeedback({ logs: 'user a@b.org at 10.0.0.7 token=abc12345\nC:\\Users\\alice\\x' }), true)
  assert.equal(state.current.feedback, true); assert.equal(state.current.report.kind, 'manual'); assert.equal(state.current.report.fatal, false)
  const logs = state.current.report.logs
  assert.ok(!/a@b\.org|10\.0\.0\.7|abc12345|alice/.test(logs), `scrubbed: ${logs}`)
  assert.equal(reportFeedback(), false, 'a surface that is open is not replaced')
  reportError(new Error('another problem')); assert.equal(state.current.feedback, true, 'an error while the form is open is counted, not shown over it'); assert.equal(state.more, 1)
  dismissError(); hostMounted(false)
  const doc = reportToDocument(buildReport({ name: 'Feedback', message: '', stack: '' }, { kind: 'manual', fatal: false, context: ctx }), { title: 'T', description: 'D' })
  assert.equal(doc.kind, 'manual'); assert.equal(doc.message, '')
})

test('the surface wires every state to words and the Send button to submitReport once', () => {
  const src = fs.readFileSync(new URL('../src/vue/MErrorHost.vue', import.meta.url), 'utf8')
  assert.match(src, /async function send\(\) \{\s*if \(sending\.value\) return/, 'a press while sending does nothing')
  assert.match(src, /submitReport\(d, \{ id \}\)/); assert.doesNotMatch(src, /flushQueue\(\)/, 'no flush without the consent gate')
  for (const lang of ['en', 'zh']) {
    const T = errorTexts(lang)
    for (const k of ['sending', 'sentRef', 'sentAgain', 'queued', 'queuedOffline', 'queuedHeld', 'rejected', 'limited', 'retry', 'feedbackTitle', 'feedbackLead', 'feedbackSent']) assert.ok(T[k], `${lang}.${k}`)
    assert.match(T.sentRef, /\{ref\}/); assert.match(T.sentAgain, /\{ref\}/)
  }
  const diag = fs.readFileSync(new URL('../src/vue/MDiagnostics.vue', import.meta.url), 'utf8')
  assert.match(diag, /v-if="canFeedback"[^>]*@click="feedback"/); assert.match(diag, /reportFeedback\(\{ logs: factsNow\.value\.logTail \}\)/)
})

test('the connection coming back and the person pressing Retry at the same moment is one request, and the queue keeps what was added meanwhile', async () => {
  const s = memory(); const doc = docOf('race'); const id = reportIdOf(doc)
  await submitReport(doc, { storage: s, transport: async () => { throw new TypeError('x') } })
  let release; const gate = new Promise((r) => { release = r }); const calls = []
  const slow = async (u) => { calls.push(u); await gate; return { ok: true, status: 200 } }
  const flush = flushQueue({ storage: s, transport: slow })
  const press = submitReport(doc, { storage: s, transport: slow })
  await new Promise((r) => setTimeout(r, 10))
  enqueue(docOf('added while sending'), s, Date.now(), { id: reportIdOf(docOf('added while sending')) })
  release()
  const [f, p] = await Promise.all([flush, press])
  assert.equal(calls.length, 1, 'one request'); assert.equal(f.sent, 1); assert.deepEqual([p.state, p.id], ['sent', id])
  assert.deepEqual(loadQueue(s).map((e) => e.id), [reportIdOf(docOf('added while sending'))], 'the new entry stays, the sent one is gone')
})

test('a report waits for the host long enough for the uploads of its log and screenshot, and a wait that ends says timeout, not offline', async () => {
  const { REPORT_TIMEOUT_MS, SEND_TIMEOUT_MS } = await import('../src/telemetry/send.js')
  assert.ok(REPORT_TIMEOUT_MS >= 30_000 && REPORT_TIMEOUT_MS > SEND_TIMEOUT_MS)
  const s = memory()
  const hang = () => new Promise(() => {})
  const first = await submitReport(docOf('slow host'), { storage: s, transport: hang, timeoutMs: 10 })
  assert.equal(first.state, 'queued')
  assert.equal(first.reason, 'timeout')
})

// a kept report that is given up on is told: the listener (the counterpart of onReportSent), the history record and the words
const watchDropped = () => { const seen = []; const stop = onReportDropped((info) => seen.push(info)); return { seen, stop } }

test('a kept report the host refuses is dropped with its id, the status and a record: listener once, queue empty, history says dropped', async () => {
  const { addMine, listMine, mineState } = await import('../src/devmode/mine.js')
  const s = memory(); const { seen, stop } = watchDropped()
  const doc = docOf('too big'); const id = reportIdOf(doc)
  enqueue(doc, s, Date.now(), { id, explicit: true })
  addMine({ id, title: 'too big', status: 'queued', ref: referenceOf(id) }, s)
  assert.equal(listMine(s)[0].status, 'queued')
  const before = mineState.v
  assert.deepEqual(await flushQueue({ storage: s, transport: answer(413) }), { sent: 0, rejected: 1, left: 0 })
  stop()
  assert.deepEqual(seen, [{ id, reason: 'rejected', status: 413, by: 'flush' }])
  assert.equal(isQueued(id, s), false); assert.equal(loadQueue(s).length, 0)
  assert.equal(droppedOf(id, s).status, 413)
  assert.ok(mineState.v > before, 'the history is told')
  const row = listMine(s)[0]
  assert.equal(row.status, 'dropped'); assert.equal(row.reason, 'rejected'); assert.equal(row.httpStatus, 413); assert.equal(row.ref, referenceOf(id))
  // `accepted: 0` carries no status
  const none = memory(); const w = watchDropped(); const d2 = docOf('refused'); const id2 = reportIdOf(d2)
  enqueue(d2, none, Date.now(), { id: id2 })
  await flushQueue({ storage: none, transport: async () => ({ ok: true, status: 200, json: async () => ({ accepted: 0 }) }) })
  w.stop()
  assert.deepEqual(w.seen, [{ id: id2, reason: 'rejected', status: 0, by: 'flush' }])
})

test('a kept report that got no answer for QUEUE_MAX_ATTEMPTS tries is dropped on the last one, not before', async () => {
  const s = memory(); const { seen, stop } = watchDropped()
  const doc = docOf('never answered'); const id = reportIdOf(doc)
  enqueue(doc, s, Date.now(), { id })
  const down = async () => { throw new TypeError('network') }
  for (let i = 0; i < QUEUE_MAX_ATTEMPTS - 1; i += 1) await flushQueue({ storage: s, transport: down })
  assert.equal(seen.length, 0); assert.equal(isQueued(id, s), true)
  await flushQueue({ storage: s, transport: down })
  stop()
  assert.deepEqual(seen, [{ id, reason: 'attempts', status: 0, by: 'flush' }])
  assert.equal(isQueued(id, s), false); assert.equal(droppedOf(id, s).reason, 'attempts')
})

test('a press that is refused is a drop of the queued report too (the panel tells the person; no notice), and a later send or keep clears the drop', async () => {
  const s = memory(); const { seen, stop } = watchDropped()
  const doc = docOf('pressed'); const id = reportIdOf(doc)
  enqueue(doc, s, Date.now(), { id })
  assert.equal((await submitReport(doc, { storage: s, online: true, transport: answer(400), id })).state, 'rejected')
  stop()
  assert.deepEqual(seen, [{ id, reason: 'rejected', status: 400, by: 'submit' }])
  // a report refused on its very first press was never kept: nothing to announce
  const w = watchDropped()
  await submitReport(docOf('first press'), { storage: memory(), online: true, transport: answer(413) })
  w.stop(); assert.equal(w.seen.length, 0)
  // kept again: no longer dropped; sent: gone from the record too
  enqueue(doc, s, Date.now(), { id }); assert.equal(droppedOf(id, s), null)
  await flushQueue({ storage: s, transport: answer(413) }); assert.equal(droppedOf(id, s).status, 413)
  assert.equal((await submitReport(doc, { storage: s, online: true, transport: answer(200), id })).state, 'sent'); assert.equal(droppedOf(id, s), null)
})

test('the words: the reason of a drop in Chinese and English, and the fallback languages read English', async () => {
  const { feedbackTexts, droppedWhy } = await import('../src/feedback/texts.js')
  const zh = feedbackTexts('zh'); const en = feedbackTexts('de')
  assert.equal(droppedWhy(zh, { reason: 'rejected', status: 413 }), '主机拒收（错误 413）')
  assert.equal(droppedWhy(zh, { reason: 'rejected', status: 0 }), '主机拒收')
  assert.equal(droppedWhy(zh, { reason: 'attempts' }), '重试多次仍没有送达')
  assert.equal(droppedWhy(en, { reason: 'rejected', status: 413 }), 'Refused by the host (error 413)')
  assert.match(en.attached, /: $/, 'a space after the colon before the list')
  for (const k of ['droppedTitle', 'droppedStatus', 'droppedRefused', 'droppedAttempts', 'droppedAction', 'droppedRow', 'cardLastDropped']) { assert.ok(zh[k] && en[k], k); assert.ok(!/\u9065\u6d4b/.test(zh[k])) }
})

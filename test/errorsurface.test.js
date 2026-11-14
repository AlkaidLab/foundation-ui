import test from 'node:test'
import assert from 'node:assert/strict'
import { dismissError, reportError, setErrorContext, useErrors } from '../src/vue/useErrors.js'

const { state } = useErrors()
const reset = () => { dismissError() }

test('an uncaught error becomes one scrubbed report in the surface; the same error again within seconds is not a second one', () => {
  reset()
  setErrorContext(() => ({ product: 'panel', version: '2026.1102.1', os: 'Windows', page: 'config', locale: 'zh', logs: '' }))
  const first = reportError(new Error('boom at C:\\Users\\alice\\a.js'), { kind: 'error' })
  assert.ok(first); assert.equal(state.open, true); assert.equal(state.current.blocking, true)
  assert.ok(!state.current.report.message.includes('alice')); assert.equal(state.current.report.product, 'panel')
  assert.equal(reportError(new Error('boom at C:\\Users\\alice\\a.js'), { kind: 'error' }), null)
  assert.equal(state.more, 0)
})

test('while one error is shown, a different one is only counted', () => {
  reset()
  reportError(new Error('first problem'))
  reportError(new Error('second problem')); reportError(new Error('third problem'))
  assert.equal(state.current.report.message, 'first problem'); assert.equal(state.more, 2)
  dismissError(); assert.equal(state.open, false); assert.equal(state.current, null); assert.equal(state.more, 0)
})

test('benign browser noise is not an error of ours', () => {
  reset()
  for (const noise of ['ResizeObserver loop completed with undelivered notifications.', 'Script error.', new DOMException('The user aborted a request.', 'AbortError')]) assert.equal(reportError(noise), null, String(noise))
  assert.equal(state.open, false)
})

test('a non-blocking error is a report that does not hold the window: the surface decides how to show it', () => {
  reset()
  reportError(new Error('api failed once'), { kind: 'api', blocking: false })
  assert.equal(state.current.blocking, false); assert.equal(state.current.report.fatal, false); assert.equal(state.current.report.kind, 'api')
  reset()
})

// ---- the host that does not answer: the dialog 「Sunshine 没有响应」 (E3, hung) ----
import { reportHostHung, dismissHostHung, reportHostStop as reportStopHung, useErrors as useErrorsHung } from '../src/vue/useErrors.js'

test('the hung host opens the stop dialog in its hung variant, with when and for how long', () => {
  const { state, dismissError } = useErrorsHung()
  dismissError()
  const report = reportHostHung({ at: 1_793_000_000_000, seconds: 41.4 })
  assert.ok(report)
  assert.deepEqual(state.current.hostStop, { kind: 'hung', at: 1_793_000_000_000, seconds: 41 })
  assert.equal(state.open, true)
  dismissError()
})

test('it closes by itself when the host answers, also when 「继续等待」 hid it', () => {
  const { state, hideError } = useErrorsHung()
  reportHostHung({ at: 1, seconds: 30 })
  hideError()
  assert.equal(state.open, false); assert.ok(state.current)
  assert.equal(dismissHostHung(), true)
  assert.equal(state.current, null); assert.equal(state.open, false)
  assert.equal(dismissHostHung(), false, 'nothing left to close')
})

test('it never closes or replaces another dialog: a stop stays until the person acts', () => {
  const { state, dismissError } = useErrorsHung()
  dismissError()
  reportStopHung({ at: 5 })
  assert.equal(state.current.hostStop.kind, undefined)
  reportHostHung({ at: 6, seconds: 30 })
  assert.deepEqual(state.current.hostStop, { at: 5 }, 'the stop is not replaced by the hung variant')
  assert.equal(dismissHostHung(), false)
  assert.ok(state.current, 'the stop stays')
  dismissError()
})

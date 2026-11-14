import test from 'node:test'
import assert from 'node:assert/strict'
import { createHostLossWatch, judgeHostLoss } from '../src/status/hostLoss.js'

const T0 = Date.UTC(2026, 10, 4, 0, 34, 0)
const up = (extra = {}) => ({ running: true, pid: 10056, startedMs: T0, service: 'running', expectedStop: false, ...extra })

test('a timeout or a slow API on a process that still runs is 「主机无响应」, never a stop', () => {
  assert.deepEqual(judgeHostLoss({ baseline: up(), after: up() }), { kind: 'unresponsive', reason: 'same-process' })
  // the same process later in the day: nothing about the process changed
  assert.equal(judgeHostLoss({ baseline: up(), after: up({ startedMs: T0 }) }).kind, 'unresponsive')
})

test('a stop the product asked for, or an installer restart through the service manager, is not unexpected', () => {
  assert.equal(judgeHostLoss({ baseline: up(), after: { ...up(), running: false, pid: 0, startedMs: 0, expectedStop: true } }).kind, 'expected')
  assert.equal(judgeHostLoss({ baseline: up(), after: up({ pid: 20404, startedMs: T0 + 90_000 }), expected: true }).kind, 'expected', 'a new process inside the window the product opened')
  for (const service of ['stop_pending', 'stopped', 'start_pending']) {
    assert.equal(judgeHostLoss({ baseline: up(), after: { running: false, pid: 0, startedMs: 0, service, expectedStop: false } }).kind, 'requested', service)
  }
  assert.equal(judgeHostLoss({ baseline: up(), after: up({ pid: 20404, startedMs: T0 + 90_000, service: 'start_pending' }) }).kind, 'requested', 'the service came back up under the installer')
})

test('a real crash (the process is gone, the service not asked) and a new process (another id, a newer start) are stops', () => {
  assert.deepEqual(judgeHostLoss({ baseline: up(), after: { running: false, pid: 0, startedMs: 0, service: 'running', expectedStop: false } }), { kind: 'stopped', reason: 'process-gone' })
  assert.deepEqual(judgeHostLoss({ baseline: up(), after: up({ pid: 20404, startedMs: T0 + 60_000 }) }), { kind: 'stopped', reason: 'process-replaced' })
  assert.equal(judgeHostLoss({ baseline: up(), after: up({ startedMs: T0 + 5000 }) }).reason, 'process-replaced', 'the same id reused by a newer process')
})

test('what cannot be told is not a stop: no facts, or no baseline of a running host', () => {
  assert.equal(judgeHostLoss({ baseline: up(), after: null }).kind, 'unresponsive')
  assert.equal(judgeHostLoss({ baseline: null, after: { running: false, pid: 0, startedMs: 0, service: 'running' } }).kind, 'unresponsive')
  assert.equal(judgeHostLoss({ baseline: up({ running: false }), after: { running: false, pid: 0, startedMs: 0, service: 'running' } }).kind, 'unresponsive')
})

const harness = (sequence, extra = {}) => {
  const lost = []; const verdicts = []; let i = 0
  const watch = createHostLossWatch({ facts: async () => { const f = sequence[Math.min(i, sequence.length - 1)]; i += 1; if (f instanceof Error) throw f; return f }, onLost: (x) => lost.push(x), onVerdict: (k) => verdicts.push(k), ...extra })
  return { watch, lost, verdicts }
}

test('the watch: a timeout outage never opens the stop surface, however long it lasts', async () => {
  const { watch, lost, verdicts } = harness([up(), up(), up(), up(), up()])
  await watch.online()
  await watch.lost(1000)
  for (let n = 0; n < 6; n += 1) await watch.reassess()
  assert.deepEqual(lost, [])
  assert.deepEqual(verdicts, ['unresponsive'])
})

test('the watch: a crash opens the stop surface once, also when the process ends only after the first silence', async () => {
  const gone = { running: false, pid: 0, startedMs: 0, service: 'running', expectedStop: false }
  const { watch, lost, verdicts } = harness([up(), up(), up(), gone, gone])
  await watch.online()
  await watch.lost(2000)
  assert.deepEqual(lost, [])
  await watch.reassess()
  await watch.reassess()
  assert.deepEqual(lost, [{ at: 2000, reason: 'process-gone' }])
  assert.deepEqual(verdicts, ['unresponsive', 'stopped'])
  await watch.online()
  assert.equal(watch.verdict, '')
})

test('the watch: a PID change is a stop, an installer restart (service stop and start, the product\'s expectation) is not', async () => {
  const replaced = up({ pid: 20404, startedMs: T0 + 60_000 })
  const a = harness([up(), replaced])
  await a.watch.online(); await a.watch.lost(3000)
  assert.deepEqual(a.lost, [{ at: 3000, reason: 'process-replaced' }])
  const b = harness([up(), { running: false, pid: 0, startedMs: 0, service: 'stop_pending', expectedStop: false }, { running: false, pid: 0, startedMs: 0, service: 'start_pending', expectedStop: false }, replaced])
  await b.watch.online(); await b.watch.lost(4000); await b.watch.reassess(); await b.watch.reassess()
  assert.deepEqual(b.lost, [])
  assert.equal(b.watch.verdict, 'requested')
  const c = harness([up(), { ...replaced, expectedStop: true }], { isExpected: () => true })
  await c.watch.online(); await c.watch.lost(5000)
  assert.deepEqual(c.lost, [])
  assert.equal(c.watch.verdict, 'expected')
})

test('the watch: a facts call that fails or never knew a running host does not turn silence into a stop', async () => {
  const { watch, lost } = harness([new Error('no'), new Error('no')])
  await watch.online()
  await watch.lost(1)
  await watch.reassess()
  assert.deepEqual(lost, [])
  const none = createHostLossWatch({ facts: null, onLost: (x) => lost.push(x) })
  await none.online(); await none.lost(2)
  assert.deepEqual(lost, [])
})

test('the baseline is the process that answered last: a host restarted quickly (no silence seen) and later slow is not a stop', async () => {
  const restarted = up({ pid: 20404, startedMs: T0 + 3_600_000 })
  const { watch, lost, verdicts } = harness([up(), restarted, restarted])
  await watch.online()
  await watch.refresh()
  await watch.lost(9000)
  assert.deepEqual(lost, [])
  assert.deepEqual(verdicts, ['unresponsive'])
})

// ---- the dialog 「Sunshine 没有响应」: when a silence of a running host is offered as a dialog, and when it closes ----
import { createHungWatch, hungProbeDue, HUNG_AFTER_MS, HUNG_PROBE_EVERY_S } from '../src/status/hostLoss.js'

test('the hung dialog is offered once, after the silence lasted, only while the same process runs', () => {
  let t = 1_000_000
  const seen = []
  const watch = createHungWatch({ now: () => t, onHung: (x) => seen.push(x) })
  watch.silence(t)
  assert.equal(watch.tick({ verdict: 'unresponsive', status: 'offline' }), false, 'not at once')
  t += HUNG_AFTER_MS - 1000
  assert.equal(watch.tick({ verdict: 'unresponsive', status: 'offline' }), false)
  t += 1000
  assert.equal(watch.tick({ verdict: 'unresponsive', status: 'offline' }), true)
  assert.deepEqual(seen, [{ at: 1_000_000, seconds: 30 }])
  t += 5000
  assert.equal(watch.tick({ verdict: 'unresponsive', status: 'offline' }), false, 'once per outage')
  assert.equal(seen.length, 1)
})

test('a stop, a request for a stop and a restart in progress are not a hung host', () => {
  for (const [verdict, status] of [['stopped', 'offline'], ['expected', 'offline'], ['requested', 'offline'], ['unresponsive', 'restarting'], ['unresponsive', 'online'], ['', 'offline']]) {
    let t = 0
    const seen = []
    const watch = createHungWatch({ now: () => t, onHung: (x) => seen.push(x) })
    watch.silence(0)
    t = HUNG_AFTER_MS * 3
    watch.tick({ verdict, status })
    assert.equal(seen.length, 0, `${verdict}/${status}`)
  }
})

test('the dialog closes when the host answers, once, and a later outage starts again', () => {
  let t = 0
  const log = []
  const watch = createHungWatch({ now: () => t, onHung: () => log.push('hung'), onEnd: () => log.push('end') })
  assert.equal(watch.answered(), false, 'nothing offered, nothing to close')
  watch.silence(0); t = 40_000; watch.tick({ verdict: 'unresponsive', status: 'offline' })
  assert.equal(watch.shown, true)
  assert.equal(watch.answered(), true)
  assert.equal(watch.answered(), false)
  watch.silence(t); t += 31_000; watch.tick({ verdict: 'unresponsive', status: 'offline' })
  assert.deepEqual(log, ['hung', 'end', 'hung'])
})

test('the connection composable drives it from the same silence the verdict comes from', async () => {
  const fs = await import('node:fs')
  const conn = fs.readFileSync(new URL('../src/vue/useHostConnection.js', import.meta.url), 'utf8')
  assert.match(conn, /createHungWatch\(\{ afterMs: hungAfterMs, now, onHung, onEnd: onHungEnd \}\)/)
  assert.match(conn, /hung\.silence\(silent\.at\)/)
  assert.match(conn, /hung\.answered\(\)/)
  assert.match(conn, /hung\.tick\(state\)/)
})

test('a service that was stopped and started is a request, however late the panel looks: the wrapper of the host is another process', () => {
  const before = up({ servicePid: 5000 })
  // a late look: the host is a new process, the service says running, nothing of the moment of the stop is left
  assert.deepEqual(judgeHostLoss({ baseline: before, after: up({ servicePid: 6100, pid: 20404, startedMs: T0 + 3_600_000 }) }), { kind: 'requested', reason: 'service-restarted' })
  // a crash: the wrapper keeps running and starts the host again
  assert.deepEqual(judgeHostLoss({ baseline: before, after: up({ servicePid: 5000, pid: 20404, startedMs: T0 + 3_600_000 }) }), { kind: 'stopped', reason: 'process-replaced' })
  assert.deepEqual(judgeHostLoss({ baseline: before, after: { running: false, pid: 0, startedMs: 0, service: 'running', servicePid: 5000, expectedStop: false } }), { kind: 'stopped', reason: 'process-gone' })
  // no service (user mode) or an older answer without the field: as before
  assert.equal(judgeHostLoss({ baseline: up(), after: up({ pid: 20404, startedMs: T0 + 60_000 }) }).kind, 'stopped')
  assert.equal(judgeHostLoss({ baseline: up({ servicePid: 5000 }), after: up({ pid: 20404, startedMs: T0 + 60_000, servicePid: 0 }) }).kind, 'stopped')
})

test('while the hung dialog is open the host is probed every 5 s, so the dialog closes within 5 s of the host answering; with no dialog the backoff is untouched', async () => {
  assert.equal(HUNG_PROBE_EVERY_S, 5)
  const due = (shown) => Array.from({ length: 30 }, (_, i) => i + 1).filter((seconds) => hungProbeDue({ shown, seconds }))
  assert.deepEqual(due(true), [5, 10, 15, 20, 25, 30])
  assert.deepEqual(due(false), [])
  const fs = await import('node:fs')
  const conn = fs.readFileSync(new URL('../src/vue/useHostConnection.js', import.meta.url), 'utf8')
  assert.match(conn, /state\.probing \|\| hungProbeDue\(\{ shown: hung\.shown, seconds \}\)/)
})

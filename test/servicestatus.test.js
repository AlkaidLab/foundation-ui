import test from 'node:test'
import assert from 'node:assert/strict'
import { START_TYPES, actionConfirm, availableActions, exitText, layerRows, recoveryText, serviceTexts, startTypeConfirm, startTypeOptions, verdictOf } from '../src/service/model.js'

const T = serviceTexts('zh')
const EN = serviceTexts('en')
const running = {
  verdict: 'running', failingLayer: null, liveStreams: 0,
  scm: { installed: true, belongsToInstall: true, state: 'running', startType: 'auto', binaryPath: '"C:\\Program Files\\Sunshine\\tools\\sunshinesvc.exe"', account: 'LocalSystem', lastExit: null, servicePid: 100, recovery: { actions: [{ kind: 'restart', delayMs: 5000 }, { kind: 'restart', delayMs: 10000 }, { kind: 'none', delayMs: 0 }], resetPeriodS: 86400, restartsOnFailure: true } },
  process: { running: true, pid: 4321, startedAtMs: Date.UTC(2026, 10, 4, 8, 0, 0), childOfService: true },
  api: { answers: true, httpStatus: 401, latencyMs: 12 },
}

test('every layer is its own row with its own tone', () => {
  const rows = layerRows(running, T, 'zh')
  assert.deepEqual(rows.map((r) => r.id), ['scm', 'process', 'api'])
  assert.deepEqual(rows.map((r) => r.tone), ['ok', 'ok', 'ok'])
  assert.equal(rows[0].value, '运行中')
  assert.equal(rows[1].value, 'PID 4321')
  assert.match(rows[2].value, /12 ms/)
  const facts = Object.fromEntries(rows[0].facts)
  assert.equal(facts['启动方式'], '开机自动')
  assert.equal(facts['上次退出码'], '无')
  assert.equal(facts['失败后'], '5 秒后重启服务 · 10 秒后重启服务 · 不做操作')
})

test('the failing layer is the red one', () => {
  const missing = { ...running, verdict: 'process-missing', failingLayer: 'process', process: { running: false } }
  const rows = layerRows(missing, T, 'zh')
  assert.equal(rows[0].tone, 'ok')
  assert.equal(rows[1].tone, 'error')
  assert.equal(rows[1].value, '没有运行')
  assert.equal(verdictOf(missing, T).tone, 'error')
  const silent = { ...running, verdict: 'api-silent', failingLayer: 'api', api: { answers: false, error: 'connection refused' } }
  assert.equal(layerRows(silent, T, 'zh')[2].tone, 'error')
  assert.equal(Object.fromEntries(layerRows(silent, T, 'zh')[2].facts)['HTTP 状态'], 'connection refused')
})

test('no service and a foreign service are said plainly', () => {
  const none = { verdict: 'not-installed', failingLayer: 'scm', scm: { installed: false }, process: { running: false }, api: { answers: false } }
  assert.equal(layerRows(none, T, 'zh')[0].value, '未安装')
  assert.deepEqual(layerRows(none, T, 'zh')[0].facts, [])
  assert.deepEqual(availableActions(none), { start: false, stop: false, restart: false })
  const foreign = { ...running, verdict: 'foreign-service', scm: { ...running.scm, belongsToInstall: false } }
  assert.equal(layerRows(foreign, T, 'zh')[0].tone, 'error')
  assert.deepEqual(availableActions(foreign), { start: false, stop: false, restart: false })
})

test('exit codes name the service specific code and known Win32 codes', () => {
  assert.equal(exitText(null, T), '无')
  assert.equal(exitText({ code: 1067, serviceSpecific: false }, T), '进程意外终止 · Windows 错误 1067')
  assert.equal(exitText({ code: 7, serviceSpecific: true }, EN), 'Service code 7')
  assert.equal(recoveryText({ actions: [] }, T), '不做任何操作')
  assert.equal(recoveryText(null, EN), 'Unknown')
})

test('the four start types in services.msc order', () => {
  assert.deepEqual(START_TYPES, ['auto', 'delayed-auto', 'manual', 'disabled'])
  assert.deepEqual(startTypeOptions(T).map((o) => o.label), ['开机自动', '开机延迟自动', '手动', '禁用'])
})

test('manual and disabled confirm that the host is unreachable after a reboot', () => {
  assert.equal(startTypeConfirm('auto', T), null)
  assert.equal(startTypeConfirm('delayed-auto', T), null)
  for (const type of ['manual', 'disabled']) {
    const c = startTypeConfirm(type, T)
    assert.match(c.text, /重启后/)
    assert.match(c.text, /无法连接/)
  }
  assert.match(startTypeConfirm('disabled', EN).text, /cannot connect/)
})

test('stop and restart warn about live streams and acknowledge them', () => {
  const live = { ...running, liveStreams: 2 }
  const stop = actionConfirm('stop', live, T)
  assert.match(stop.text, /2 路串流/)
  assert.match(stop.text, /回到这台电脑/)
  assert.equal(stop.acknowledgeLiveStream, true)
  assert.equal(stop.danger, true)
  const restart = actionConfirm('restart', live, T)
  assert.equal(restart.acknowledgeLiveStream, true)
  assert.doesNotMatch(restart.text, /回到这台电脑/)
  const idle = actionConfirm('stop', running, T)
  assert.equal(idle.acknowledgeLiveStream, false)
  assert.doesNotMatch(idle.text, /串流/)
  const start = actionConfirm('start', live, T)
  assert.equal(start.acknowledgeLiveStream, false)
  assert.equal(start.danger, false)
})

test('the switch to user mode warns like a restart and says what a reboot does', () => {
  const c = actionConfirm('user-mode', { ...running, liveStreams: 1 }, T)
  assert.match(c.title, /用户模式/)
  assert.match(c.text, /1 路串流/)
  assert.match(c.text, /重启电脑后/)
  assert.equal(c.danger, true)
  assert.equal(c.acknowledgeLiveStream, true)
  assert.equal(actionConfirm('user-mode', running, EN).acknowledgeLiveStream, false)
})

test('buttons follow the SCM state', () => {
  assert.deepEqual(availableActions(running), { start: false, stop: true, restart: true })
  const stopped = { ...running, scm: { ...running.scm, state: 'stopped' } }
  assert.deepEqual(availableActions(stopped), { start: true, stop: false, restart: false })
  const disabled = { ...running, scm: { ...running.scm, state: 'stopped', startType: 'disabled' } }
  assert.equal(availableActions(disabled).start, false)
})

test('both languages have the same keys', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(T), keys(EN))
})

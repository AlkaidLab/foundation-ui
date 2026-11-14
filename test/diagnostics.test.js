import test from 'node:test'
import assert from 'node:assert/strict'
import {
  errorsPerHour, KNOWN_ERRORS, PARTS, appendTail, buildErrorCentre, bundleName, classifyError, crc32, diagnosticsTexts, filterRows, finalizeBundle, findSessions, firstError, groupRepeats,
  issueUrl, levelCounts, makeMatcher, maskNetwork, parseLog, prepareBundle, problemSummary, rangeStart, redactAll, redactConfig, redactSecrets, selectionText, sessionSummary, signature, zipList, zipStore,
} from '../src/diagnostics/index.js'

const LOG = [
  '[2026-11-01 14:52:03.000]: Info: Sunshine version: 2026.1101.141735',
  '[2026-11-01 14:52:04.100]: Warning: Something odd',
  '[2026-11-01 15:10:00.000]: Info: CLIENT CONNECTED',
  '[2026-11-01 15:10:01.000]: Error: Couldn\'t get default audio endpoint [0x88890004]',
  'continuation of the error',
  '[2026-11-01 15:10:02.000]: Error: Couldn\'t get default audio endpoint [0x88890004]',
  '[2026-11-01 15:30:00.000]: Info: CLIENT DISCONNECTED',
  '[2026-11-01 16:00:00.000]: Info: CLIENT CONNECTED',
  '[2026-11-01 16:00:05.000]: Fatal: ViGEmBus is not installed or running. You must install it',
  '',
].join('\n')

test('parse: levels, times, continuation lines, a trailing break', () => {
  const rows = parseLog(LOG)
  assert.equal(rows.length, 8)
  assert.deepEqual([rows[0].level, rows[0].time, rows[0].message], ['Info', '14:52:03.000', 'Sunshine version: 2026.1101.141735'])
  assert.equal(rows[3].message, "Couldn't get default audio endpoint [0x88890004]\ncontinuation of the error")
  assert.ok(rows[1].at > rows[0].at)
  assert.deepEqual(parseLog(''), [])
  assert.equal(parseLog('no stamp at all')[0].level, '')
  assert.deepEqual(levelCounts(rows).map((c) => [c.level, c.count]), [['Fatal', 1], ['Error', 2], ['Warning', 1], ['Info', 4]])
})

test('sessions: closed and live ones own their rows; the summary comes from the log', () => {
  const rows = parseLog(LOG)
  const sessions = findSessions(rows)
  assert.equal(sessions.length, 2)
  assert.deepEqual([sessions[0].live, sessions[1].live], [false, true])
  assert.equal(rows[3].session, 0)
  assert.equal(rows[0].session, -1)
  assert.equal(rows[7].session, 1)
  const s = sessionSummary(rows, sessions[0])
  assert.equal(s.durationMs, 20 * 60e3)
  assert.equal(s.counts.Error, 2)
  assert.equal(s.firstError.id, 3)
  assert.equal(sessionSummary(rows, sessions[1]).live, true)
})

test('filter: levels, text, whole line, regex (an invalid one reports and matches nothing), session, range', () => {
  const rows = parseLog(LOG)
  findSessions(rows)
  assert.equal(filterRows(rows, { levels: ['Error'] }).rows.length, 2)
  assert.equal(filterRows(rows, { query: 'ODD' }).rows.length, 1)
  assert.equal(filterRows(rows, { query: 'ODD', ignoreCase: false }).rows.length, 0)
  assert.equal(filterRows(rows, { query: 'Info: CLIENT CONNECTED', mode: 'exact' }).rows.length, 2)
  assert.equal(filterRows(rows, { query: '0x8889\\w+', mode: 'regex' }).rows.length, 2)
  const bad = filterRows(rows, { query: '(', mode: 'regex' })
  assert.deepEqual([bad.rows.length, !!bad.error], [0, true])
  assert.equal(filterRows(rows, { session: 0 }).rows.length, 4)
  const from = rangeStart(rows, '1h')
  assert.equal(filterRows(rows, { from }).rows.length, 6)
  assert.equal(rangeStart(rows, 'all'), null)
  assert.equal(makeMatcher('').test('x'), true)
})

test('repeats are grouped when consecutive and identical; first error; selection text', () => {
  const rows = parseLog(LOG.replace('continuation of the error\n', ''))
  const items = groupRepeats(rows)
  assert.equal(items.length, 7)
  const g = items.find((i) => i.count > 1)
  assert.deepEqual([g.count, g.ids.length], [2, 2])
  assert.equal(firstError(rows).id, 3)
  assert.equal(firstError(rows, 4).id, 4)
  assert.equal(firstError(parseLog('[2026-11-01 10:00:00.000]: Info: ok')), null)
  assert.match(selectionText([g]), /\(x2\)$/)
  assert.match(selectionText([items[0]]), /^\[2026-11-01 14:52:03\.000\]: Info: Sunshine version/)
})

test('live tail: incremental text joins, a full read replaces, the cap keeps whole lines', () => {
  assert.equal(appendTail('a\n', 'b\n', { incremental: true }), 'a\nb\n')
  assert.equal(appendTail('a\n', 'b\n'), 'b\n')
  const long = appendTail('x'.repeat(10) + '\n', 'line two\nline three\n', { incremental: true, max: 22 })
  assert.equal(long, 'line two\nline three\n'.slice(long.length * -1))
  assert.ok(long.startsWith('line') || long.startsWith('two'))
})

test('known errors: each pattern matches the message of the host source, other lines stay unknown', () => {
  const samples = {
    'vigem-missing': 'ViGEmBus is not installed or running. You must install ViGEmBus for gamepad support!',
    'vigem-add': "Couldn't add Gamepad to ViGEm connection [0xe0000001]",
    'port-busy': 'Couldn\'t start nvhttps server on ports [47984]: bind: Address already in use',
    'no-display-encoder': 'Unable to find display or encoder during startup.',
    'codec-open': 'Could not open codec [h264_nvenc]: Invalid argument',
    'audio-device': "Couldn't initialize audio client for [Stereo]: [0x88890008]",
    permission: 'Permission denied',
  }
  assert.deepEqual(Object.keys(samples).sort(), KNOWN_ERRORS.map((k) => k.id).sort())
  for (const [id, message] of Object.entries(samples)) assert.equal(classifyError(message)?.id, id, id)
  assert.equal(classifyError('Something nobody knows'), null)
  const en = diagnosticsTexts('en'), zh = diagnosticsTexts('zh')
  for (const k of KNOWN_ERRORS) { assert.ok(en.known[k.id].fix && zh.known[k.id].cause, k.id); if (k.link) assert.match(k.link, /^https:\/\/github\.com\/AlkaidLab\/foundation-sunshine\/blob\/master\/docs\//) }
})

test('error centre: known errors group by id, others by shape; newest first; counts and sessions', () => {
  const rows = parseLog(LOG)
  findSessions(rows)
  const groups = buildErrorCentre(rows)
  assert.equal(groups.length, 2)
  assert.deepEqual(groups.map((g) => [g.known?.id, g.count, g.level]), [['vigem-missing', 1, 'Fatal'], ['audio-device', 2, 'Error']])
  assert.deepEqual(groups[1].sessions, [0])
  const more = buildErrorCentre(parseLog('[2026-11-01 10:00:00.000]: Error: Failed on 10.0.0.5:47989 code 12\n[2026-11-01 10:00:01.000]: Error: Failed on 10.0.0.9:47989 code 7'))
  assert.equal(more.length, 1)
  assert.equal(more[0].count, 2)
  assert.equal(signature('Failed on 10.0.0.5:47989 code 12'), 'Failed on #.#.#.# code #')
  assert.equal(buildErrorCentre(parseLog('[2026-11-01 10:00:00.000]: Warning: odd')).length, 0)
  assert.equal(buildErrorCentre(parseLog('[2026-11-01 10:00:00.000]: Warning: odd'), { warnings: true }).length, 1)
})

test('secrets: credentials, tokens, pairing data and certificates are removed in code', () => {
  const cases = [
    ['sunshine_password = hunter2', 'sunshine_password = [redacted]'],
    ['sunshine_salt=abc123', 'sunshine_salt=[redacted]'],
    ['  username: alice', '  username: [redacted]'],
    ['{"api_key": "sk-123456", "port": 47989}', '{"api_key": "[redacted]", "port": 47989}'],
    ['{"uniqueid":"0123456789ABCDEF"}', '{"uniqueid":"[redacted]"}'],
    ['Authorization: Bearer abcdefghijklmnop', 'Authorization: [redacted]'],
    ['sent Bearer abcdefghijklmnop to host', 'sent Bearer [redacted] to host'],
    ['client paired, pin = 1234 ok', 'client paired, pin = [redacted] ok'],
    ['login password=hunter2, next', 'login password=[redacted], next'],
    ['https://user:pa55@example.com/x', 'https://[redacted]@example.com/x'],
    ['GET /cb?token=abc123&x=1', 'GET /cb?token=[redacted]&x=1'],
    ['https://discord.com/api/webhooks/123/ABCDEF', 'https://discord.com/[redacted]'],
    ['cert = -----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----', 'cert = [redacted]'],
    ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdEFGHijkl', '[redacted]'],
    ['PIN = 1234', 'PIN = [redacted]'],
    ['hash 0123456789abcdef0123456789abcdef0123', 'hash [redacted]'],
  ]
  for (const [input, expected] of cases) assert.equal(redactSecrets(input).text, expected, input)
  assert.equal(redactSecrets('-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----').text, '[certificate removed]')
  assert.equal(redactSecrets('Info: Resolution 1920x1080, fps = 60, encoder = nvenc').counts.secrets, 0)
  assert.equal(redactSecrets('Info: Resolution 1920x1080, fps = 60, encoder = nvenc').text, 'Info: Resolution 1920x1080, fps = 60, encoder = nvenc')
})

test('configuration: secret keys replaced at any depth, other values kept', () => {
  const counts = { secrets: 0 }
  const out = redactConfig({ sunshine_name: 'PC', sunshine_password: 'x', nested: { widget_token: 't', list: [{ api_key: 'k', ok: 1 }], url: 'https://a:b@h/' }, port: 1, empty: '', pin: '' }, counts)
  assert.equal(out.sunshine_password, '[redacted]')
  assert.equal(out.nested.widget_token, '[redacted]')
  assert.equal(out.nested.list[0].api_key, '[redacted]')
  assert.equal(out.nested.list[0].ok, 1)
  assert.equal(out.nested.url, 'https://[redacted]@h/')
  assert.deepEqual([out.sunshine_name, out.port, out.empty], ['PC', 1, ''])
  assert.ok(counts.secrets >= 4)
})

test('network identity: addresses get stable placeholders, versions and loopback stay, names and user paths are masked', () => {
  const text = 'client 192.168.1.20 and 192.168.1.20 and 10.0.0.7:47989 from 127.0.0.1, driver version 0.9.8.1, v1.2.3.4, mac aa:bb:cc:dd:ee:ff, ::1, fe80::1ff:fe23:4567:890a, C:\\Users\\Alice\\AppData, \\\\DESKTOP-9X\\share, host SKYPC and Pixel 9'
  const { text: out, counts } = maskNetwork(text, { hostNames: ['SKYPC'], clientNames: ['Pixel 9'] })
  assert.equal(out, 'client <ip-1> and <ip-1> and <ip-2>:47989 from 127.0.0.1, driver version 0.9.8.1, v1.2.3.4, mac <mac-1>, ::1, <ip6-1>, C:\\Users\\<user>\\AppData, \\\\<host>\\share, host <host> and <client-1>')
  assert.ok(counts.ips >= 5 && counts.names >= 4)
  assert.equal(maskNetwork('plain').text, 'plain')
})

test('redactAll: network masking can be left out, secrets never', () => {
  const t = 'password = a\nclient 10.1.2.3'
  assert.equal(redactAll(t).text, 'password = [redacted]\nclient <ip-1>')
  assert.equal(redactAll(t, { network: false }).text, 'password = [redacted]\nclient 10.1.2.3')
})

test('zip: stored files round-trip with their checksums', () => {
  const bytes = zipStore([{ name: 'a.txt', data: 'hello' }, { name: 'dir/ü.txt', data: new Uint8Array([1, 2, 3]) }], new Date(2026, 10, 2, 10, 0, 0))
  const files = zipList(bytes)
  assert.deepEqual(files.map((f) => f.name), ['a.txt', 'dir/ü.txt'])
  assert.equal(new TextDecoder().decode(files[0].data), 'hello')
  assert.deepEqual([...files[1].data], [1, 2, 3])
  assert.equal(files[0].crc, crc32(new TextEncoder().encode('hello')))
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926)
  assert.throws(() => zipList(new Uint8Array(10)))
})

test('bundle: parts are redacted, listed with sizes, unavailable ones are shown, crash dumps are off and marked, only ticked files are written', () => {
  const collected = {
    log: '[2026-11-01 10:00:00.000]: Info: client 192.168.1.9 paired, pin = 1234\n',
    config: { sunshine_name: 'SKYPC', sunshine_password: 'x', port: 47989 },
    versions: { host: '2026.1101.150529' },
    os: { name: 'Windows 11' },
    crash: [{ name: 'a.dmp', data: new Uint8Array([9, 9]) }],
  }
  const entries = prepareBundle(collected, { network: true, hostNames: ['SKYPC'] })
  assert.deepEqual(entries.map((e) => e.id), PARTS.map((p) => p.id))
  const byId = Object.fromEntries(entries.map((e) => [e.id, e]))
  assert.doesNotMatch(byId.log.text, /192\.168|1234/)
  assert.doesNotMatch(byId.config.text, /SKYPC|"x"/)
  assert.match(byId.config.text, /"sunshine_password": "\[redacted\]"/)
  assert.deepEqual([byId.gpu.available, byId.gpu.included, byId.log.included, byId.crash.included, byId.crash.unredacted], [false, false, true, false, true])
  assert.ok(byId.log.counts.secrets >= 1 && byId.log.counts.ips === 1)
  const open = prepareBundle(collected, { network: false })
  assert.match(open.find((e) => e.id === 'log').text, /192\.168\.1\.9/)
  const out = finalizeBundle(entries, ['log', 'config', 'crash'], { network: true, now: new Date(2026, 10, 2, 9, 8, 7) })
  assert.equal(out.name, 'foundation-diagnostics-20261102-090807.zip')
  assert.deepEqual(out.files, ['README.txt', 'sunshine.log', 'config.json', 'crash/a.dmp'])
  const readme = new TextDecoder().decode(zipList(out.bytes)[0].data)
  assert.match(readme, /Credentials, tokens and pairing data were removed/)
  assert.match(readme, /masked/)
  assert.match(readme, /Crash dumps are included as they are/)
  assert.deepEqual(finalizeBundle(entries, ['versions'], {}).files, ['README.txt', 'versions.json'])
  assert.deepEqual(finalizeBundle(entries, ['gpu'], {}).files, ['README.txt'])
  assert.equal(bundleName(new Date(2026, 0, 2, 3, 4, 5)), 'foundation-diagnostics-20260102-030405.zip')
})

test('problem summary and the prefilled bug report: short, redacted, with the form field ids, nothing sent', () => {
  const f = { version: '2026.1101.150529', channel: 'stable', os: 'Windows 11', gpu: ['NVIDIA GeForce RTX 4080'], encoder: 'NVENC', lastError: "Couldn't start server for 10.0.0.5 token=abc\nmore", at: '2026-11-01 10:00', logTail: 'line 1 for 10.0.0.5\npassword = x' }
  const s = problemSummary(f)
  assert.match(s, /^Foundation Sunshine 2026\.1101\.150529 \(stable\)\nWindows 11 · NVIDIA GeForce RTX 4080 · NVENC\nLast error \(2026-11-01 10:00\): Couldn't start server for <ip-1> token=\[redacted\]$/)
  const { url, truncated } = issueUrl(f, { locale: 'zh-CN' })
  const u = new URL(url)
  assert.equal(u.origin + u.pathname, 'https://github.com/AlkaidLab/foundation-sunshine/issues/new')
  assert.equal(u.searchParams.get('template'), 'bug_report_zh.yml')
  assert.equal(u.searchParams.get('sunshine-version'), '2026.1101.150529 (stable)')
  assert.equal(u.searchParams.get('gpu-model'), 'NVIDIA GeForce RTX 4080')
  assert.equal(u.searchParams.get('encoder'), 'NVENC')
  assert.doesNotMatch(u.searchParams.get('logs'), /10\.0\.0\.5|password = x/)
  assert.match(u.searchParams.get('title'), /^\[Bug\]: Couldn't start server/)
  assert.equal(truncated, false)
  assert.equal(new URL(issueUrl(f, { locale: 'en' }).url).searchParams.get('template'), 'bug_report_en.yml')
  const big = issueUrl({ ...f, logTail: 'x'.repeat(20000) })
  assert.ok(big.url.length <= 7000 && big.truncated)
})

test('texts: Chinese and English carry the same keys', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort()
  assert.deepEqual(keys(diagnosticsTexts('zh')), keys(diagnosticsTexts('en')))
  assert.equal(diagnosticsTexts('de').title, diagnosticsTexts('en').title)
})

test('errors per hour: a window of at least a day ending at the last hour, only Error and Fatal count, an hour without lines is zero', () => {
  const rows = parseLog(LOG)
  const h = errorsPerHour(rows)
  assert.equal(h.total, 3)
  assert.equal(h.values.length, 24, 'a log of a few hours still has a day-sized axis, so a bar is never one wide block')
  assert.deepEqual(h.values.slice(-3), [0, 2, 1])
  assert.equal(h.labels[h.labels.length - 1], '11-01 16:00')
  assert.equal(errorsPerHour(rows, 48, 1).values.length, 3, 'with no minimum it is as long as the log')
  assert.equal(errorsPerHour(parseLog('no stamp')), null)
  const long = errorsPerHour(parseLog('[2026-11-01 00:00:00.000]: Error: a\n[2026-11-05 00:00:00.000]: Error: b'), 48)
  assert.equal(long.values.length, 48)
  assert.equal(long.total, 1)
})

test('startup problems: one short localized line each, known ones in plain words, the same problem once, the full message kept', async () => {
  const { startupProblems } = await import('../src/diagnostics/index.js')
  const raw = [
    'Fatal: ViGEmBus is not installed or running. You must install ViGEmBus for gamepad support! (If you do not need gamepad support, you can ignore this message)',
    'Fatal: ViGEmBus is not installed or running. You must install ViGEmBus for gamepad support! (If you do not need gamepad support, you can ignore this message)',
    'Fatal: Something nobody has seen before happened in the capture path, with a very long explanation that would fill the whole row of the card if it were shown whole and then some',
  ]
  const zh = startupProblems(raw, 'zh'); const en = startupProblems(raw, 'en')
  assert.equal(zh.length, 2, 'the same problem is listed once')
  assert.equal(zh[0].short, '未安装 ViGEmBus，手柄不可用'); assert.equal(zh[0].count, 2); assert.equal(en[0].short, 'ViGEmBus is not installed: gamepads are unavailable')
  assert.ok(zh[0].known?.link, 'a fix is known')
  assert.ok(zh[0].raw.startsWith('ViGEmBus is not installed or running') && zh[0].raw.includes('ignore this message'), 'the original message is kept whole')
  assert.equal(zh[1].known, null); assert.ok(zh[1].short.length <= 90 && zh[1].short.endsWith('…'), 'an unknown one is its first line, cut'); assert.ok(zh[1].raw.length > 150, 'and whole in raw')
  assert.deepEqual(startupProblems([], 'en'), []); assert.deepEqual(startupProblems(['Fatal: '], 'en'), [])
})

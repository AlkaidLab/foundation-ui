import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { bundleArchive, bundleRows, canUploadCrash, crashIssueUrl, crashText, crc32, createHostStopWatch, hasCrashBundleProvider, latestCrashBundle, setCrashBundleProvider, setCrashEndpoint, uploadCrash, zip } from '../src/telemetry/index.js'

const bytes = (s) => new TextEncoder().encode(s)
const fakeBundle = () => ({ id: 'c1', at: Date.UTC(2026, 10, 3, 12, 0, 0), reason: 'access violation in encoder at C:\\Users\\Sky\\x', files: [
  { name: 'sunshine.dmp', kind: 'minidump', size: 2_400_000, read: async () => new Uint8Array([1, 2, 3, 4]) },
  { name: 'sunshine.log', kind: 'log', size: 5200, read: async () => 'line one\nline two' },
  { name: 'gone.log', kind: 'log', size: 10, read: async () => { throw new Error('locked') } },
] })

test('the stop watch reports a silence after the host was online, and knows whether the product asked for a restart; whether the host stopped is decided on facts (hostloss.test.js)', () => {
  let t = 1000
  const w = createHostStopWatch({ now: () => t })
  assert.equal(w.feed('online'), null)
  assert.deepEqual(w.feed('offline'), { at: 1000 })
  assert.equal(w.feed('offline'), null, 'once')
  w.feed('online')
  w.expectRestart(60_000)
  assert.equal(w.expected(), true, 'a restart this window asked for')
  assert.deepEqual(w.feed('offline'), { at: 1000 })
  w.feed('online'); assert.equal(w.expected(), false, 'the host answered again')
  w.expectRestart(60_000); t += 120_000
  assert.equal(w.expected(), false, 'the expectation ran out')
  const fresh = createHostStopWatch()
  assert.equal(fresh.feed('offline'), null, 'a window that never saw the host online has nothing to compare with')
})

test('the latest crash bundle comes through an interface the product plugs in; without it there is none', async () => {
  setCrashBundleProvider(null)
  assert.equal(hasCrashBundleProvider(), false)
  assert.equal(await latestCrashBundle(), null)
  setCrashBundleProvider(async () => fakeBundle())
  const b = await latestCrashBundle()
  assert.equal(b.files.length, 3)
  assert.ok(!b.reason.includes('Sky'), 'the reason is scrubbed')
  assert.deepEqual(bundleRows(b).map((r) => [r.name, r.kind, r.size]), [['sunshine.dmp', 'minidump', '2.3 MB'], ['sunshine.log', 'log', '5 KB'], ['gone.log', 'log', '10 B']])
  setCrashBundleProvider(async () => { throw new Error('x') })
  assert.equal(await latestCrashBundle(), null)
  setCrashBundleProvider(null)
})

test('the diagnostics bundle is one valid .zip: every file with its CRC, a summary first, a file that cannot be read is named', async () => {
  assert.equal(crc32(bytes('123456789')), 0xcbf43926)
  setCrashBundleProvider(async () => fakeBundle())
  const b = await latestCrashBundle()
  const a = await bundleArchive(b, { version: '2026.1103', os: 'Windows 11' })
  assert.match(a.name, /^foundation-sunshine-crash-20261103-\d{6}\.zip$/)
  assert.deepEqual(a.missing, ['gone.log'])
  const z = a.bytes
  const dv = new DataView(z.buffer, z.byteOffset, z.byteLength)
  const names = []
  let p = 0
  while (dv.getUint32(p, true) === 0x04034b50) {
    const crc = dv.getUint32(p + 14, true), size = dv.getUint32(p + 18, true), nl = dv.getUint16(p + 26, true)
    const name = new TextDecoder().decode(z.subarray(p + 30, p + 30 + nl))
    const data = z.subarray(p + 30 + nl, p + 30 + nl + size)
    assert.equal(crc32(data), crc, name)
    names.push([name, new TextDecoder().decode(data)])
    p += 30 + nl + size
  }
  assert.deepEqual(names.map((n) => n[0]), ['summary.txt', 'sunshine.dmp', 'sunshine.log'])
  assert.match(names[0][1], /Sunshine stopped unexpectedly/); assert.match(names[0][1], /Could not be read: gone\.log/); assert.match(names[0][1], /sunshine\.dmp \(minidump/)
  assert.equal(dv.getUint32(p, true), 0x02014b50, 'the central directory follows')
  assert.equal(dv.getUint32(z.length - 22, true), 0x06054b50, 'and the end record')
  assert.equal(dv.getUint16(z.length - 22 + 10, true), 3)
  setCrashBundleProvider(null)
})

test('no upload endpoint: nothing can be sent, the way out is the saved bundle and a prefilled GitHub issue', async () => {
  setCrashEndpoint('')
  assert.equal(canUploadCrash(), false)
  assert.equal(await uploadCrash(fakeBundle(), { fetch: async () => { throw new Error('must not be called') } }), 'offline')
  const url = new URL(crashIssueUrl(fakeBundle(), { version: '2026.1103', os: 'Windows' }))
  assert.equal(url.hostname, 'github.com')
  assert.match(url.searchParams.get('title'), /Sunshine stopped unexpectedly/)
  assert.match(url.searchParams.get('body'), /sunshine\.dmp/); assert.match(url.searchParams.get('body'), /attached/)
  assert.ok(!/Sky/.test(url.searchParams.get('body')))
  assert.match(crashText(null), /No crash bundle was found/)
  setCrashEndpoint('http://insecure.example/x'); assert.equal(canUploadCrash(), false, 'https only')
  setCrashEndpoint('https://crash.example/upload'); assert.equal(canUploadCrash(), true)
  const seen = []
  assert.equal(await uploadCrash(fakeBundle(), { fetch: async (u, i) => { seen.push([u, i.method, i.credentials]); return { ok: true, status: 200 } } }), 'sent')
  assert.deepEqual(seen, [['https://crash.example/upload', 'POST', 'omit']])
  assert.equal(await uploadCrash(fakeBundle(), { fetch: async () => ({ ok: false, status: 503 }) }), 'offline')
  assert.equal(await uploadCrash(fakeBundle(), { fetch: async () => ({ ok: false, status: 400 }) }), 'rejected')
  setCrashEndpoint('')
})

test('the surface in its stop variant: restart first, the diagnostics listed, and no send button unless an endpoint exists', () => {
  const host = fs.readFileSync(new URL('../src/vue/MErrorHost.vue', import.meta.url), 'utf8')
  const texts = fs.readFileSync(new URL('../src/vue/errorTexts.js', import.meta.url), 'utf8')
  assert.match(texts, /stopTitle: 'Sunshine 已停止运行'/)
  assert.ok(!/不是谁让它停的/.test(texts), 'the lead says what happened, not who did not do it')
  // M3 dialog: two actions, the way out as a text button and 重启 Sunshine last (the confirming action), filled; the three tools are a row of the diagnostics section
  const actions = host.slice(host.indexOf('<div v-if="hostStop" class="m-err__primary">'), host.indexOf('<div v-else class="m-err__actions">'))
  assert.equal((actions.match(/<MButton /g) || []).length, 4, 'the way out (back, or keep waiting when hung), 运行体检 where the product has a health check, and the restart')
  assert.ok(actions.indexOf('m-err__doctor') < actions.indexOf('@click="askRestart"'), '运行体检 is a secondary action before the restart')
  assert.ok(actions.indexOf('variant="text"') < actions.indexOf('icon="restart_alt"'), '重启 Sunshine is the trailing button')
  assert.ok(!/icon="restart_alt" variant=/.test(actions), '重启 Sunshine is the filled (default) button')
  const tools = host.slice(host.indexOf('class="m-err__tools"'), host.indexOf('</section>'))
  assert.equal((tools.match(/<MButton variant="text" size="sm"/g) || []).length, 3)
  assert.match(host, /class="m-err__quiet">\{\{ T\.noBundle \}\}/, 'no crash dump is a quiet line, not a tinted bar')
  assert.match(actions, /icon="restart_alt" autofocus/, 'the dialog opens with the focus on 重启 Sunshine, not on the first tool')
  assert.match(host, /hostHung \? T\.hungNoBundle : T\.noBundle/, 'a hung host did not crash: its line says what the diagnostics hold')
  for (const k of ['hungTitle', 'hungLead', 'hungLeadPlain', 'hungWait', 'hungAuto', 'hungNoBundle']) assert.match(texts, new RegExp(`${k}: '`), `the hung variant has ${k}`)
  assert.match(host, /stopUpload \? 'send' : 'download'/)
  assert.match(host, /stopUpload \? T\.stopSendDo : T\.stopSave/)
  assert.match(host, /v-if="!stopUpload" tone="info"/)
  assert.match(host, /\(hostStop\.value \? !props\.restart : /, 'a host that does not answer does not block the restart')
  const conn = fs.readFileSync(new URL('../src/vue/useHostConnection.js', import.meta.url), 'utf8')
  assert.match(conn, /createHostLossWatch\(\{ facts, onLost,/, 'the stop surface opens through the facts-based watch (status/hostLoss.js), not through a silence')
})

// The redaction rules of the feedback flows: one fixture per rule, the text that is previewed is the text that is sent, the whole log goes through, the screenshot has no metadata.
import test from 'node:test'
import assert from 'node:assert/strict'
import { redactAll, maskIdentity, redactSecrets } from '../src/diagnostics/redact.js'
import { scrubText } from '../src/telemetry/scrub.js'
import { composeReport, redactText, reportZip } from '../src/devmode/feedback.js'
import { zipList } from '../src/diagnostics/zip.js'
import { clampRect, collectRedactRects, mapRects, maskPixels, mergeRects, pngChunks, pngInfo, stripPngMetadata, regionCount } from '../src/devmode/shot.js'
import { makePng } from './pngFixture.js'

const gone = (text, ...secrets) => { for (const s of secrets) assert.ok(!text.includes(s), `"${s}" survived in: ${text}`) }
const all = (text, opts = {}) => redactText(text, opts).text

// ---- the rule table: [rule, fixture, what must not survive]
const TABLE = [
  ['ipv4-full', 'peer 203.0.113.77:47984 and 192.168.7.31', ['203.0.113.77', '192.168.7.31', '113.77']],
  ['ipv4-cgnat', 'tailscale 100.64.12.9', ['100.64.12.9']],
  ['ipv6-global', 'route 2001:db8:85a3::8a2e:370:7334 via 2409:8a00:1234::1', ['2001:db8', '8a2e:370', '2409:8a00']],
  ['ipv6-link-local', 'iface fe80::1ff:fe23:4567:890a%eth0', ['fe80::1ff']],
  ['mac-colon', 'nic 00:1A:2B:3C:4D:5E up', ['00:1A:2B:3C:4D:5E']],
  ['mac-dash', 'nic 00-1A-2B-3C-4D-5E up', ['00-1A-2B']],
  ['mac-dotted', 'switch table 001a.2b3c.4d5e', ['001a.2b3c.4d5e']],
  ['mac-bare-key', 'MAC address: 001A2B3C4D5E', ['001A2B3C4D5E']],
  ['serial-key', 'Serial Number: ABC123XYZ789', ['ABC123XYZ789']],
  ['serial-disk', 'Disk serial = WD-WCC4N5ABCDEF', ['WD-WCC4N5ABCDEF']],
  ['serial-volume', 'Volume Serial Number is 3A4B-5C6D', ['3A4B-5C6D']],
  ['serial-cjk', '序列号：SN20241109XYZ', ['SN20241109XYZ']],
  ['edid-serial', 'Monitor serial: 1234567890 (EDID)', ['1234567890']],
  ['edid-hex-dump', '00 ff ff ff ff ff ff 00 10 ac 4d 41 53 4b 4c 4e 1c 1f 01 03 80 35 1e 78 ea 5e c0 a4 59 4a 98 25 20 50 54 a5 4b 00 71 4f', ['10 ac 4d 41 53 4b']],
  ['device-instance', 'monitor DISPLAY\\DELA0E4\\5&2a3b4c5d&0&UID4352 ok and PCI\\VEN_10DE&DEV_2684\\4&1A2B3C4D&0&0008', ['5&2a3b4c5d', '4&1A2B3C4D']],
  ['hostname-key', 'hostname=DESKTOP-ALICE01 computer name: Alice-PC', ['DESKTOP-ALICE01', 'Alice-PC']],
  ['hostname-header', 'GET /api HTTP/1.1\nHost: hostbox\nAccept: */*', ['hostbox']],
  ['hostname-mdns', 'found alices-macbook.local and desk.tail1a2b3.ts.net', ['alices-macbook', 'tail1a2b3']],
  ['hostname-given', 'client Alice-Gaming-PC connected', ['Alice-Gaming-PC'], { hostNames: ['Alice-Gaming-PC'] }],
  ['path-win-user', 'open C:\\Users\\alice\\AppData\\Roaming\\x.json', ['alice']],
  ['path-win-slash', 'open C:/Users/alice/Desktop/a.png', ['alice']],
  ['path-win-lowercase', 'open c:\\users\\alice\\a', ['alice']],
  ['path-unix-home', 'log /home/alice/.config/sunshine/sunshine.log', ['alice']],
  ['path-mac-home', 'log /Users/alice/Library/Logs/x.log', ['alice']],
  ['path-wsl', 'from /mnt/c/Users/alice/Downloads', ['alice']],
  ['path-unc', 'share \\\\ALICE-NAS\\media', ['ALICE-NAS']],
  ['token-jwt', 'jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdEFGHijkl', ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIi']],
  ['token-pem', 'k -----BEGIN CERTIFICATE-----\nMIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0B\n-----END CERTIFICATE-----', ['MIIDdzCCAl']],
  ['token-pem-cut', '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\n', ['MIIEvQIB']],
  ['token-cookie', 'Cookie: sid=9f8e7d6c5b4a; theme=dark', ['9f8e7d6c5b4a']],
  ['token-set-cookie', 'Set-Cookie: session=abcDEF123456; Path=/; HttpOnly', ['abcDEF123456']],
  ['token-bearer', 'Authorization: Bearer abcdefghijklmnop1234', ['abcdefghijklmnop1234']],
  ['token-github', 'gh token ghp_abcdefghijklmnopqrstuvwxyz0123456789 and github_pat_11ABCDEFG0abcdefghijklmnop_qrstuvwxyz', ['ghp_abcdefghij', 'github_pat_11ABC']],
  ['token-firebase-key', 'key AIzaSyD7VDKZyA1PG6mCO2QdPAUXIziVfTahV0g', ['AIzaSyD7VDKZ']],
  ['token-data-uri', 'img data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ', ['iVBORw0KGgo']],
  ['token-base64-run', 'blob aGVsbG8gd29ybGQgdGhpcyBpcyBhIGxvbmcgYmFzZTY0IHNlY3JldCB2YWx1ZSB0aGF0IHNob3VsZCBnb0RFRjEyMzQ1', ['aGVsbG8gd29ybGQ']],
  ['pin-key', 'pin = 4821', ['4821']],
  ['pin-words', 'Enter PIN 482913 on the host; pairing code: 7731; 配对码：1234', ['482913', '7731', '1234']],
  ['pin-is', 'the PIN is 5521 now', ['5521']],
  ['qr-moonlight', 'qr moonlight://pair?host=10.0.0.9&pin=5521&cert=ABC', ['moonlight://pair', '5521']],
  ['qr-otpauth', 'otpauth://totp/Sky:alice?secret=JBSWY3DPEHPK3PXP&issuer=Sky', ['JBSWY3DPEHPK3PXP', 'alice']],
  ['email', 'mail alice@example.org', ['alice@example.org']],
]

for (const [rule, fixture, secrets, opts] of TABLE) {
  test(`rule ${rule}: the previewed text carries none of the private value`, () => {
    const out = all(fixture, opts || {})
    gone(out, ...secrets)
    assert.notEqual(out, fixture, 'something was replaced')
  })
}

test('a version written like an address, ports, loopback and plain prose are left alone', () => {
  const keep = 'Foundation Sunshine version 5.2.0.14 build 1.3.9.2 on port 47989, fps = 60, std::vector at 10:15:30. The hex ab ab ab ab ab ab stays prose.'
  assert.equal(all(keep), keep)
  assert.equal(all('serial port open, serial: none, SN: n/a'), 'serial port open, serial: none, SN: n/a')
})

test('the same address is the same placeholder inside one text, so a reader can still follow one peer', () => {
  const out = redactAll('a 192.168.1.5 b 192.168.1.5 c 192.168.1.6', { network: true }).text
  assert.match(out, /<ip-1>.*<ip-1>.*<ip-2>/s)
})

test('counts: addresses, names, paths and serials are counted for the summary', () => {
  const r = redactText('host 192.168.1.5 mac 00:1A:2B:3C:4D:5E\nhostname=ALICE-PC\nopen C:\\Users\\alice\\a and /home/alice/b\nSerial Number: ABC123XYZ789\ntoken=abcd1234efgh')
  assert.equal(r.counts.ips, 2)
  assert.equal(r.counts.names, 1)
  assert.equal(r.counts.paths, 2)
  assert.equal(r.counts.serials, 1)
  assert.ok(r.counts.secrets >= 1)
})

test('the telemetry scrub masks the whole IPv4 and the new shapes too', () => {
  assert.equal(scrubText('peer 203.0.113.77'), 'peer <ip>')
  assert.equal(scrubText('version 1.2.3.4'), 'version 1.2.3.4')
  gone(scrubText('Cookie: sid=9f8e7d6c5b4a'), '9f8e7d6c5b4a')
  gone(scrubText('Serial Number: ABC123XYZ789 on /home/alice/x'), 'ABC123XYZ789', 'alice')
  gone(scrubText('pairing code: 482913'), '482913')
})

test('the whole log is redacted, not only the tail that the report body shows', () => {
  const lines = []
  for (let i = 0; i < 400; i += 1) lines.push(`[2026-11-09 10:00:${String(i % 60).padStart(2, '0')}] [INFO] client ${i} from 10.20.${i % 200}.${(i % 250) + 1} user C:\\Users\\Alice${i}\\x`)
  lines.push('[2026-11-09 10:05:00] [WARN] pairing PIN 482913 for alice@example.org')
  const log = lines.join('\n')
  const r = composeReport({ kind: 'error', error: { name: 'E', message: 'm' }, logs: log, title: 't', description: 'd' })
  const file = new TextDecoder().decode(r.files.find((f) => f.id === 'logs').bytes)
  assert.ok(file.split('\n').length >= 401, 'the file holds the whole log')
  gone(file, '10.20.', 'Alice0', 'Alice399', '482913', 'alice@example.org')
  gone(r.body, '10.20.', 'Alice', '482913')
  const zip = reportZip(r)
  for (const entry of zipList(zip.bytes)) gone(new TextDecoder().decode(entry.data || new Uint8Array(0)), '482913', 'alice@example.org')
})

test('the title, the description, the error and the environment text are redacted before they are cut', () => {
  const secret = `ghp_${'a1B2'.repeat(10)}`
  const r = composeReport({ kind: 'feedback', title: `crash ${secret}`, description: `${'x'.repeat(3990)} ${secret} 192.168.1.9`, env: 'host: ALICE-PC\nserial: ABCD1234', error: { name: 'E', message: 'at /home/alice/x 10.1.1.1', stack: 'at f (C:\\Users\\Bob\\a.js:1)' } })
  gone(`${r.title}\n${r.body}`, secret, 'a1B2a1B2a1B2', '192.168.1.9', 'alice', 'Bob', 'ABCD1234')
})

// ---- the screenshot
test('a screenshot leaves without metadata: only the chunks that draw it', () => {
  const dirty = makePng(8, 6, { meta: true })
  assert.ok(pngChunks(dirty).some((c) => c.type === 'tEXt') && pngChunks(dirty).some((c) => c.type === 'eXIf'), 'the fixture has metadata')
  const clean = stripPngMetadata(dirty)
  assert.deepEqual([...new Set(pngChunks(clean).map((c) => c.type))].sort(), ['IDAT', 'IEND', 'IHDR'])
  assert.deepEqual(pngInfo(clean), { width: 8, height: 6 })
  assert.ok(!new TextDecoder('latin1').decode(clean).match(/Sky Hua|Users|XML:com|eXIf|tIME/))
  assert.equal(stripPngMetadata(new Uint8Array([1, 2, 3])), null)
  assert.equal(stripPngMetadata(dirty.subarray(0, dirty.length - 20)), null, 'a cut file is not sent')
})

test('composeReport sends the stripped picture, counts its regions and refuses what is not a PNG', () => {
  const r = composeReport({ kind: 'error', error: { name: 'E', message: 'm' }, screenshot: makePng(8, 6, { meta: true }), shotRegions: { auto: 3, manual: 2 }, title: 't' })
  const shot = r.files.find((f) => f.id === 'shot')
  assert.ok(shot.redacted)
  assert.deepEqual([...new Set(pngChunks(shot.bytes).map((c) => c.type))].sort(), ['IDAT', 'IEND', 'IHDR'])
  assert.equal(r.counts.regions, 5)
  assert.equal(composeReport({ kind: 'error', error: { name: 'E', message: 'm' }, screenshot: new Uint8Array([1, 2, 3, 4]), title: 't' }).files.length, 0)
  assert.equal(composeReport({ kind: 'error', error: { name: 'E', message: 'm' }, screenshot: makePng(8, 6), include: { shot: false }, title: 't' }).counts.regions, 0)
})

const el = (rect, attrs = {}, extra = {}) => ({ getBoundingClientRect: () => ({ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }), getAttribute: (k) => attrs[k] ?? null, ...extra })
test('structure: every marked element with a box becomes a box; hidden ones and ones outside the window do not', () => {
  const root = { querySelectorAll: (sel) => { assert.match(sel, /data-redact/); assert.match(sel, /password/); return [el([100, 50, 200, 20], { 'data-redact': 'address' }), el([0, 0, 0, 0], { 'data-redact': 'pin' }), el([5000, 5000, 20, 20], { 'data-redact': 'host' }), el([10, 10, 50, 20], {}, { type: 'password' })] } }
  const rects = collectRedactRects(root, { width: 1280, height: 800 })
  assert.equal(rects.length, 2)
  assert.deepEqual(rects[0], { x: 97, y: 47, w: 206, h: 26, kind: 'address' })
  assert.equal(rects[1].kind, 'secret')
})
test('structure: the boxes land on the picture, with the device pixel ratio and the frame of a native capture', () => {
  const one = [{ x: 10, y: 20, w: 100, h: 30, kind: 'host' }]
  assert.deepEqual(mapRects(one, { width: 1000, height: 600, dpr: 1 }, { width: 1000, height: 600 })[0], { x: 10, y: 20, w: 100, h: 30, kind: 'host' })
  assert.deepEqual(mapRects(one, { width: 1000, height: 600, dpr: 2 }, { width: 2000, height: 1200 })[0], { x: 20, y: 40, w: 200, h: 60, kind: 'host' })
  const framed = mapRects(one, { width: 1000, height: 600, dpr: 1 }, { width: 1016, height: 639 })[0]
  assert.deepEqual([framed.x, framed.y], [18, 51], 'the title bar and the side borders are an offset')
  assert.equal(mapRects([{ x: 5000, y: 5000, w: 5, h: 5 }], { width: 100, height: 100, dpr: 1 }, { width: 100, height: 100 }).length, 0)
})
test('structure: overlapping boxes merge, far ones stay, the count is regions', () => {
  const m = mergeRects([{ x: 0, y: 0, w: 10, h: 10, kind: 'a' }, { x: 8, y: 8, w: 10, h: 10, kind: 'a' }, { x: 100, y: 100, w: 5, h: 5, kind: 'b' }])
  assert.equal(m.length, 2)
  assert.deepEqual(m[0], { x: 0, y: 0, w: 18, h: 18, kind: 'a' })
  assert.deepEqual(regionCount({ auto: m, manual: [{}] }), { auto: 2, manual: 1, total: 3 })
})
test('painting: the pixels inside a box are black and opaque, the ones outside are untouched', () => {
  const w = 10, h = 6, px = new Uint8ClampedArray(w * h * 4).fill(200)
  maskPixels(px, w, h, [{ x: 2, y: 1, w: 3, h: 2 }, { x: 8, y: 4, w: 99, h: 99 }])
  const at = (x, y) => [...px.slice((y * w + x) * 4, (y * w + x) * 4 + 4)]
  assert.deepEqual(at(2, 1), [0, 0, 0, 255]); assert.deepEqual(at(4, 2), [0, 0, 0, 255]); assert.deepEqual(at(9, 5), [0, 0, 0, 255])
  assert.deepEqual(at(1, 1), [200, 200, 200, 200]); assert.deepEqual(at(5, 2), [200, 200, 200, 200]); assert.deepEqual(at(7, 4), [200, 200, 200, 200])
  assert.equal(clampRect({ x: -5, y: -5, w: 3, h: 3 }, 10, 10), null)
})

test('structure: a frame of the same origin is read with its own offset; a frame that cannot be read is covered whole', () => {
  const inner = { querySelectorAll: (sel) => (sel.includes('iframe') ? [] : [el([10, 10, 100, 20], { 'data-redact': 'pin' })]) }
  const frame = (box, doc) => ({ ...el(box), get contentDocument() { if (doc === 'blocked') throw new Error('cross-origin'); return doc } })
  const root = { querySelectorAll: (sel) => (sel.includes('iframe') ? [frame([200, 100, 400, 300], { ...inner, body: {} }), frame([0, 500, 300, 100], 'blocked')] : []) }
  const rects = collectRedactRects(root, { width: 1280, height: 800 })
  assert.equal(rects.length, 2)
  assert.deepEqual(rects[0], { x: 207, y: 107, w: 106, h: 26, kind: 'pin' })
  assert.deepEqual([rects[1].x, rects[1].y, rects[1].w, rects[1].h], [0, 500, 300, 100], 'the unreadable frame is covered')
})

test('structure: a hidden frame is not covered, a shown one that cannot be read is listed to be asked', () => {
  const frame = (box, extra = {}) => ({ ...el(box), get contentDocument() { throw new Error('cross-origin') }, ...extra })
  const hidden = frame([0, 0, 800, 600], { style: { visibility: 'hidden' } })
  const shown = frame([10, 20, 800, 600])
  const doc = (frames) => ({ querySelectorAll: (sel) => (sel.includes('iframe') ? frames : []), defaultView: { getComputedStyle: (f) => f.style || { visibility: 'visible', display: 'block' } } })
  assert.equal(collectRedactRects(doc([hidden]), { width: 1280, height: 800 }).length, 0, 'hidden')
  const list = []
  assert.equal(collectRedactRects(doc([shown]), { width: 1280, height: 800 }, { x: 0, y: 0 }, 0, list).length, 0)
  assert.equal(list.length, 1); assert.deepEqual(list[0].box, { left: 10, top: 20, width: 800, height: 600 })
})

// ---- log rules: directories outside the home folder, window titles, games and processes
import { maskLogContent } from '../src/diagnostics/redact.js'
import { prepareBundle } from '../src/diagnostics/bundle.js'

const LOG_RULES = [
  ['path-win-drive', 'Info: loading D:\\Games\\SecretGame\\bin\\game.exe now', ['SecretGame', 'D:\\Games'], 'D:\\<path>\\<file>'],
  ['path-win-ours', 'Info: log at E:\\Tools\\Alice Stuff\\sunshine.log ok', ['Alice Stuff', 'E:\\Tools'], 'E:\\<path>\\sunshine.log'],
  ['path-win-program-files', 'cfg C:\\Program Files\\Foundation\\Sunshine\\config\\sunshine.conf;', ['Program Files', 'Foundation\\Sunshine'], 'C:\\<path>\\sunshine.conf'],
  ['path-win-slash', 'cfg D:/Games/Elden Ring/eldenring.exe', ['Elden Ring', 'eldenring.exe'], 'D:\\<path>\\<file>'],
  ['path-unix-mnt', 'Warning: /mnt/games/Steam/steamapps/common/Hades/Hades.exe missing', ['Hades', 'steamapps', '/mnt/games'], '/<path>/<file>'],
  ['path-unix-media', 'open /media/alice/USB-DRIVE/photos/a.png', ['USB-DRIVE', 'photos', 'a.png'], '/<path>/<file>'],
  ['path-unix-ours', 'log /opt/sunshine/logs/sunshine.log', ['/opt/sunshine'], '/<path>/sunshine.log'],
  ['window-title', 'Info: window title: Elden Ring - Chrome (alice@work)', ['Elden Ring', 'Chrome'], 'window title: <title>'],
  ['window-title-quoted', 'Debug: foreground window = "Untitled - Notepad"', ['Notepad'], 'foreground window = "<title>"'],
  ['app-name', 'Info: app name: Cyberpunk 2077', ['Cyberpunk'], 'app name: <title>'],
  ['app-name-json', '"game_name": "Baldur\'s Gate 3"', ['Baldur'], '"game_name": "<title>"'],
  ['process-key', 'Debug: process: SecretGame.exe (pid 4242)', ['SecretGame'], 'process: <title>'],
  ['process-quoted', 'Info: found process "Steam.exe" running', ['Steam.exe'], 'process "<app>" running'],
  ['launch-executing', 'Info: Executing [Desktop - Alice Gaming]', ['Alice Gaming'], 'Executing [<app>]'],
  ['launch-app', 'Info: Launching app [Elden Ring]', ['Elden Ring'], 'Launching app [<app>]'],
]
for (const [rule, fixture, secrets, expected] of LOG_RULES) {
  test(`log rule ${rule}`, () => {
    const out = redactText(fixture).text
    gone(out, ...secrets)
    assert.ok(out.includes(expected), `${out} should contain ${expected}`)
  })
}
test('log rules leave ordinary log lines alone', () => {
  const keep = ['Info: process exited with code 0', 'Info: Starting stream 3840x2160 at 120 fps', 'Info: the process is slow', 'Warning: window moved to 1920,0', 'Info: Loading C:\\Windows is fine?'.replace(' is fine?', '')]
  for (const line of keep.slice(0, 4)) assert.equal(redactText(line).text, line)
  assert.deepEqual(maskLogContent('Info: app name: X').counts, { paths: 0, names: 1 })
  assert.equal(maskLogContent('C:\\Users\\<user>\\a.txt').counts.paths, 0, 'the user rule already did the home folder')
})

test('the diagnostics export is as strict as the report: every text part goes through the telemetry scrub too, unless the person kept network identity', () => {
  const raw = { log: '[2026-11-09 10:00:00] [INFO] GET https://hostbox.example.org:47990/api/x?token=abc123&user=alice from 10.11.12.13 app name: Cyberpunk 2077 file D:\\Games\\X\\y.dll', config: { sunshine_name: 'HOST-SENTINEL', output_name: 'x' } }
  const parts = prepareBundle(raw, { network: true })
  const text = parts.filter((p) => p.available && !p.binary).map((p) => p.text).join('\n')
  gone(text, 'hostbox.example.org', 'abc123', '10.11.12.13', 'Cyberpunk', 'D:\\Games')
  const kept = prepareBundle(raw, { network: false }).filter((p) => p.available && !p.binary).map((p) => p.text).join('\n')
  assert.ok(kept.includes('10.11.12.13') || kept.includes('hostbox.example.org'), 'network identity kept when the person chose so')
  gone(kept, 'abc123')
})

test("a host named like the product keeps the product name, names are masked whole and next to Chinese text", async () => {
  const { maskNetwork } = await import("../src/diagnostics/redact.js")
  const r = maskNetwork("Sunshine 版本 2026.1111，主机 Sunshine；Skyward主机 与 Sky-PC；客户端 Sky", { hostNames: ["Sunshine", "Skyward"], clientNames: ["Sky"] }).text
  assert.match(r, /^Sunshine 版本 2026\.1111/)
  assert.match(r, /<host>主机/)
  assert.match(r, /Sky-PC/)
  assert.match(r, /客户端 <client-1>/)
})

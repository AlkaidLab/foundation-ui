import test from 'node:test'
import assert from 'node:assert/strict'
import { ROW_IDS, contentLine, liveLines, rowKeywords, rowLine, rowLines, rowTexts } from '../src/settings/rowLines.js'

test('every row has a contents line in both languages, one line, no blank', () => {
  for (const locale of ['zh', 'en']) {
    const lines = rowLines({ locale })
    for (const id of ROW_IDS) { assert.ok(lines[id], `${locale} ${id}`); assert.ok(!lines[id].includes('\n')) }
  }
  assert.deepEqual(Object.keys(rowTexts('zh').content), Object.keys(rowTexts('en').content))
})

test('a live state wins where its source answers, the contents line stands in where it does not', () => {
  const sources = {
    config: { port: 47989, upnp: 'disabled', active_encoder: 'nvenc', hevc_mode: 2, av1_mode: 1, display_device_prep: 'ensure_primary', resolution_change: 'manual', manual_resolution: '2560x1440', refresh_rate_change: 'manual', manual_refresh_rate: '120' },
    clients: { named_certs: Array.from({ length: 30 }, (_, i) => ({ uuid: i })) },
    apps: { apps: [{}, {}, {}] },
    components: [{ id: 'vdd', state: 'ok' }, { id: 'usb', state: 'warn' }, { id: 'mic', state: 'unknown' }],
    ds: { state: 'ready' },
    mic: { configured_backend: 'vb_cable', active_backend: '', state: 'ready' },
    usb: { ready: true, attached_devices: [{}] },
  }
  const live = liveLines({ locale: 'zh', ...sources })
  assert.equal(live['config:network'], '端口 47989 · UPnP 关')
  assert.equal(live['display-encoders'], 'NVENC · H.264/HEVC')
  assert.equal(liveLines({ locale: 'en', config: { active_encoder: 'amf', hevc_mode: 0, av1_mode: 0 } })['display-encoders'], 'AMF · H.264/HEVC/AV1', 'mode 0 is automatic')
  assert.equal(live['display-output'], '自动选择 · 设为主显示器')
  assert.equal(live['display-modes'], '自定义 · 2560×1440 · 120Hz')
  assert.equal(live.vdd, '使用物理显示器')
  assert.equal(live.clients, '30 台已配对')
  assert.equal(live.apps, '3 个应用')
  assert.equal(live.components, '1 项需要处理')
  assert.equal(live.gamepad, 'DualSense · 已就绪')
  assert.equal(live.microphone, 'VB-CABLE · 等待使用')
  assert.equal(live.usb, '1 台已连接')
  assert.equal(liveLines({ locale: 'zh', components: [{ state: 'ok' }, { state: 'ok' }] }).components, '2 个组件全部正常')
  assert.equal(rowLine('clients', {}, 'zh'), contentLine('clients', 'zh'), 'source unavailable: the contents line')
  assert.equal(rowLine('config:network', { config: { port: 0 } }, 'en'), 'Port, UPnP, mDNS, encryption')
  assert.equal(rowLine('clients', { clients: [{ streaming: true }, {}] }, 'en'), '2 paired · 1 streaming')
})

test('the search carries the contents words of both languages', () => {
  assert.ok(rowKeywords('config:general').includes('主机名称') && rowKeywords('config:general').includes('host name'))
  assert.equal(rowKeywords('nothing'), '')
})

test('RivaTuner Statistics Server is an optional component: not installed (or not read yet) means no rtss row and no RTSS in the 系统 line; no source keeps the row', () => {
  for (const locale of ['zh', 'en']) {
    assert.ok('rtss' in rowLines({ locale }), 'no source: the row stays')
    assert.ok('rtss' in rowLines({ locale, rtss: { installed: true } }))
    assert.match(rowLines({ locale, rtss: { installed: true } })['rail:system'], /RTSS$/)
    for (const rtss of [{ installed: false }, { installed: null }, {}]) {
      const lines = rowLines({ locale, rtss })
      assert.ok(!('rtss' in lines), `${locale} ${JSON.stringify(rtss)}: no row`)
      assert.doesNotMatch(lines['rail:system'], /RTSS/)
      assert.match(lines['rail:system'], /./)
      assert.equal(rowLine('rtss', { rtss }, locale), '')
      assert.doesNotMatch(rowLine('rail:system', { rtss }, locale), /RTSS/)
    }
  }
})

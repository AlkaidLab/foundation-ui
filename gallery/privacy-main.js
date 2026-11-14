// The privacy copy of 关于 on its own, with the real shared components: ?view=settings|more|preview|notice, &locale=zh|en|de..., &theme=light|dark.
// settings: the two switches and the rows under them; more: the "what is sent and what is not" dialog; preview: "see what will be sent" with a payload as the host would answer; notice: the first screen of the guide with its one notice.
import { createApp, h, nextTick } from 'vue'
import '../src/css/all.css'
import { MAbout } from '../src/vue/index.js'
import { errorTexts } from '../src/vue/errorTexts.js'
import { updateSourceTexts } from '../src/update/sourceTexts.js'

const q = new URLSearchParams(location.search)
const locale = q.get('locale') || 'zh'
const view = q.get('view') || 'settings'

const PREVIEW = {
  endpoint: 'https://api.alkaidlab.com/v1/events',
  envelope: {
    v: 1, install_id: '3f2b8a52-1c3e-4d0e-9d57-0a7c1f6b9e11', session_id: '9a1c6b0e-52d4-4f1a-8e3b-7c2d5e9f0a13', product: 'host', version: '2026.1112.0.杂鱼', channel: 'stable',
    os: 'windows', os_version: '10.0.26100', arch: 'x64', gpu_vendor: 'nvidia', locale: 'zh-CN',
  },
  events: [
    { t: 1762934820000, kind: 'usage', name: 'app_start', props: { cold: true, start_ms: 1840, update_source: 'mirror' }, product: 'host' },
    { t: 1762934830000, kind: 'usage', name: 'stream_start', props: { client_kind: 'moonlight-macos-enhanced', client_os: 'macos', codec: 'hevc', width: 2560, height: 1440, fps: 120, hdr: true, audio_codec: 'opus', transport: 'altp', app_kind: 'desktop' }, product: 'host' },
    { t: 1762935410000, kind: 'experience', name: 'stream_quality', props: { fps_p50: 119, fps_p5: 96.4, frame_drop_pct: 0.4, encode_ms_p50: 3, encode_ms_p95: 6.1, network_rtt_ms_p50: 12, loss_pct: 0.1, bitrate_kbps_avg: 38000, reconnects: 0, stalls: 1, codec: 'hevc', transport: 'altp', duration_s: 580 }, product: 'host' },
    { t: 1762935420000, kind: 'error', name: 'error', props: { component: 'capture', code: 'e5c01a7d', severity: 'error', count: 2 }, product: 'host' },
  ],
}
const loader = async () => PREVIEW

const mount = (render) => createApp({ render: () => h('div', { class: 'm-app m-root', style: 'min-height:100vh' }, [render()]) }).mount('#app')

if (view === 'notice') {
  // the first screen's notes at the foot of the guide: the same strings and classes as MGuideFlow (data-guide-notes), on their own because the flow needs a host to run
  const E = errorTexts(locale)
  const S = updateSourceTexts(locale)
  const parts = E.errorsNotice.split('{link}')
  mount(() => h('div', { class: 'm-guide', style: 'min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end' }, [
    h('div', { class: 'm-guide__notes', 'data-guide-notes': '' }, [
      h('p', { 'data-note': 'free' }, S.freeNotice),
      h('p', { 'data-note': 'support' }, S.supportLine),
      h('p', { 'data-note': 'errors' }, [parts[0], h('button', { type: 'button', class: 'm-guide__notelink', 'data-note-link': '' }, E.errorsNoticeLink), parts[1]]),
    ]),
  ]))
} else {
  mount(() => h(MAbout, { version: '2026.1112.0.杂鱼', channel: 'stable', locale, consent: 'on', errors: 'on', sponsors: [], previewLoader: loader }))
  await nextTick()
  await new Promise((r) => setTimeout(r, 400))
  const row = (id) => document.querySelector(`[data-privacy="${id}"]`)
  if (view === 'settings') row('errors')?.scrollIntoView({ block: 'center' })
  if (view === 'more') row('more')?.click()
  if (view === 'preview') row('preview')?.click()
}

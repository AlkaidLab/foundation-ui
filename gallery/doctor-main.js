// 体检 on its own (the shots of the redo, the QA robot): ?state=idle|last|lastgood|running|done|real|offline|broken|auth|invalid,
// ?theme=dark|black, ?locale=en. `real` is the answer a Sunshine host gave (test/fixtures/doctor-real.json), the others come from the mock.
import { createApp, h } from 'vue'
import '../src/css/all.css'
import { applyTheme } from '../src/tokens/theme.js'
import MDoctor from '../src/vue/MDoctor.vue'
import real from '../test/fixtures/doctor-real.json'
import { mockDoctorRequest, mockLocalSource, MOCK_DOCTOR_LOCAL_DOWN } from '../src/doctor/mock.js'
import { DOCTOR_GROUPS, hostSource } from '../src/doctor/model.js'

const q = new URLSearchParams(location.search)
applyTheme(document.documentElement, { black: q.get('theme') === 'black' })
const state = q.get('state') || 'idle'
const locale = q.get('locale') || 'zh'
const speed = state === 'running' ? 60 : 0.01

// the last result kept by an earlier visit
const store = new Map()
const lastGroups = Object.fromEntries([...['service', 'install', 'process', 'drivers'], ...DOCTOR_GROUPS.map((g) => g.id)].map((id) => [id, 'pass']))
const lasts = {
  last: { v: 1, at: Date.now() - 3 * 3600e3, counts: { fail: 2, warn: 3, skip: 1, pass: 28 }, groups: { ...lastGroups, audio: 'fail', network: 'fail', input: 'warn', vdd: 'warn', host: 'warn', encoder: 'skip' } },
  lastgood: { v: 1, at: Date.now() - 26 * 3600e3, counts: { fail: 0, warn: 0, skip: 0, pass: 41 }, groups: lastGroups },
}
if (lasts[state]) store.set('k', JSON.stringify(lasts[state]))
const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }

const fail = (status, error) => async () => ({ ok: false, status, json: error ? { error } : null })
const reqs = {
  real: async (path) => {
    const only = new URL(path, 'http://x').searchParams.get('only')
    const group = real.groups.find((g) => g.id === only)
    return { ok: true, status: 200, json: { ...real, groups: [group], items: real.items.filter((i) => group.items.includes(i.id)) } }
  },
  offline: fail(503, ''),
  broken: fail(500, 'doctor: exception in group handler: bad optional access'),
  auth: fail(401, 'Unauthorized'),
  invalid: async () => ({ ok: true, status: 200, json: { status: true } }),
}
const request = reqs[state] || mockDoctorRequest({ speed })
const localOk = mockLocalSource({ speed: speed === 0.01 ? 0 : 1, report: state === 'offline' ? MOCK_DOCTOR_LOCAL_DOWN : undefined })
const localBroken = { ...localOk, fetch: async () => ({ ok: false, status: 500, json: { error: 'unknown command: doctor_local' } }) }
const local = state === 'broken' ? localBroken : localOk
const sources = [local, hostSource(request)]

createApp({
  render: () => h('div', { class: 'm-app m-root', style: 'min-height:100vh' }, [h(MDoctor, {
    sources, locale, storage, storageKey: 'k', parallel: 3, panel: false,
    collect: async () => ({}), save: async () => ({}), streaming: false, autostart: ['running', 'done', 'real', 'offline', 'broken', 'auth', 'invalid'].includes(state),
    repair: () => Promise.resolve(), canRepair: () => true,
  })]),
}).mount('#app')

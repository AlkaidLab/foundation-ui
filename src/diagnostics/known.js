// Errors the host writes that have a known cause. Every pattern is a message of the host source (file named in `src`); every cause and fix
// is what the project's own documents say (FAQ, troubleshooting) or what the message itself says. Anything else is shown as the raw line.
// `go` names a place the product can open (drivers | encoder | network | audio | display); `link` is a page of the project's documents.

import { recordOf, SEVERITY_NUMBER } from './record.js'

const DOCS = 'https://github.com/AlkaidLab/foundation-sunshine/blob/master/docs'

export const KNOWN_ERRORS = Object.freeze([
  { id: 'vigem-missing', src: 'src/platform/windows/input.cpp', test: /ViGEmBus (?:is not installed or running|没有安装或运行)/i, go: 'drivers', link: `${DOCS}/troubleshooting.md#no-gamepad-detected` },
  { id: 'vigem-add', src: 'src/platform/windows/input.cpp', test: /Couldn't add Gamepad to ViGEm connection/i, go: 'drivers', link: `${DOCS}/troubleshooting.md#no-gamepad-detected` },
  { id: 'port-busy', src: 'src/nvhttp.cpp', test: /Couldn't start nvhttps? server on ports|Disable GameStream on the SHIELD tab/i, go: 'network' },
  { id: 'no-display-encoder', src: 'src/video.cpp', test: /Unable to find display or encoder during startup/i, go: 'display', link: `${DOCS}/zh-CN/faq.md#配对成功但黑屏或启动失败` },
  { id: 'codec-open', src: 'src/video.cpp', test: /Could not open codec \[/i, go: 'encoder', link: `${DOCS}/zh-CN/faq.md#配对成功但黑屏或启动失败` },
  { id: 'audio-device', src: 'src/platform/windows/audio.cpp', test: /Couldn't (?:get default audio endpoint|activate Device|initialize audio client|get mix format for audio device|create Device Enumerator)/i, go: 'audio', link: `${DOCS}/zh-CN/faq.md#有画面但没有声音` },
  { id: 'permission', src: 'docs/troubleshooting.md', test: /permission denied|access is denied/i, link: `${DOCS}/troubleshooting.md#permission-denied` },
])

export function classifyError(message) {
  const text = String(message || '')
  return KNOWN_ERRORS.find((k) => k.test.test(text)) || null
}

/** What a message looks like once its numbers, addresses and quoted values are taken out: the key two lines with the same shape share. */
export function signature(message) {
  return String(message || '').split('\n')[0]
    .replace(/0x[0-9a-fA-F]+/g, '0x#').replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '#.#.#.#').replace(/\[[^\]]*\]/g, '[#]').replace(/"[^"]*"/g, '"#"').replace(/\d+/g, '#').trim().slice(0, 160)
}

/**
 * Recent errors grouped: known ones by their id, the rest by signature. Newest group first, Fatal before Error at the same time.
 * rows: parsed log rows. Returns [{ key, known, level, count, first, last, sample, sessions }].
 */
export function buildErrorCentre(rows, { limit = 30, warnings = false } = {}) {
  const groups = new Map()
  for (const row of rows) {
    const record = recordOf(row)
    const severity = record ? record.severity : (row.level === 'Fatal' ? SEVERITY_NUMBER.FATAL : row.level === 'Error' ? SEVERITY_NUMBER.ERROR : row.level === 'Warning' ? SEVERITY_NUMBER.WARN : 0)
    if (!(severity >= SEVERITY_NUMBER.ERROR || (warnings && severity >= SEVERITY_NUMBER.WARN))) continue
    const known = classifyError(row.message)
    const key = known ? `k:${known.id}` : `s:${row.level}:${signature(row.message)}`
    const g = groups.get(key) || { key, known, level: row.level, severity, errorCode: record?.errorCode || '', count: 0, first: row, last: row, sample: row.message, sessions: new Set() }
    g.count++
    g.last = row
    g.severity = Math.max(g.severity, severity)
    if (row.level === 'Fatal') g.level = 'Fatal'
    if (row.session >= 0) g.sessions.add(row.session)
    groups.set(key, g)
  }
  return [...groups.values()]
    .map((g) => ({ ...g, sessions: [...g.sessions] }))
    .sort((a, b) => b.last.id - a.last.id)
    .slice(0, limit)
}

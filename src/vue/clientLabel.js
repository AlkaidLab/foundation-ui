import { osWord } from './clientPrompt.js'

// How a session names its client. The host fills `client_name` from the request, else from the name stored with the paired certificate (host docs/api/client-family.md, "The client in a
// session"); a client that sent no name and was paired without one leaves a placeholder (the standard Moonlight exchange sends none; the shared client code pairs as "roth"; the host's own default is
// "Named Zako"). A placeholder says nothing about the person's device, so the label falls back to what the host derived from the request: the client family, with the system for upstream Moonlight.
// Nothing here is a guess: no family, no label, and the caller shows its own empty value instead of the word "unknown".

const FAMILY_LABEL = Object.freeze({
  'moonlight-macos-enhanced': 'Moonlight macOS Enhanced',
  'moonlight-vplus-desktop': 'Moonlight V+ Desktop',
  'moonlight-vplus-android': 'Moonlight V+ Android',
  voidlink: 'VoidLink',
  'moonlight-upstream': 'Moonlight',
})

const PLACEHOLDER_NAMES = new Set(['', 'unknown', 'named zako', 'roth'])
/** A name that names no device: empty, "unknown" (the host's answer without any name), "Named Zako" (the host's default pairing name) or "roth" (the shared Moonlight client constant). */
export const isPlaceholderName = (name) => PLACEHOLDER_NAMES.has(String(name ?? '').trim().toLowerCase())

/** The product name of a client family (+ the system for upstream Moonlight), or '' when the family is unknown. `os` is the host's os key (macos, windows, linux, android, ios, tvos). */
export function clientFamilyLabel({ family, os } = {}) {
  const label = FAMILY_LABEL[family]
  if (!label) return ''
  return family === 'moonlight-upstream' && os ? `${label} · ${osWord(os)}` : label
}

/** The label of the client of a session (an entry of `sessions` of /api/runtime/sessions): its own name when it names a device, else the family the host derived, else ''. */
export function sessionClientLabel(session) {
  if (!session || typeof session !== 'object') return ''
  if (!isPlaceholderName(session.client_name)) return String(session.client_name).trim()
  return clientFamilyLabel({ family: session.client_family, os: session.client_os })
}

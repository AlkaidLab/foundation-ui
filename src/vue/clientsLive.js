// Who streams now: the session the host runs is the one source. The host's client list (`GET /api/clients/list`) carries no `streaming` flag (the host never sets one), so a tile that read
// the flag said 没有人在串流 while 本主机 said 串流中 with that very client. A client is streaming when the session is its own: by the uuid of its certificate (`client_cert_uuid` of
// /api/runtime/sessions), else by its name. A flag a host does send (`streaming: true`) still counts.
import { clientFamilyLabel, isPlaceholderName } from './clientLabel.js'
export { isPlaceholderName }
const lower = (v) => String(v || '').toLowerCase()
export const sessionUuid = (s) => String(s?.client_cert_uuid || s?.client_uuid || s?.uuid || '')

/** The session with the real name of its client: the one it reports, else the paired client of its certificate uuid, else the product the host derived (client_family, client_os; `Moonlight macOS Enhanced`), else '' (a tile shows nothing rather than a placeholder). */
export function realSession(session, clients) {
  if (!session || typeof session !== 'object') return session ?? null
  if (!isPlaceholderName(session.client_name)) return session
  const id = lower(sessionUuid(session))
  const paired = id && Array.isArray(clients) ? clients.find((c) => c && c.uuid && lower(c.uuid) === id && !isPlaceholderName(c.name)) : null
  return { ...session, client_name: paired ? String(paired.name) : clientFamilyLabel({ family: session.client_family, os: session.client_os }) }
}

/** `c` is the client of the session `s` (the raw session of the host, or { uuid, name }). */
export function isSessionClient(c, s) {
  if (!c || !s) return false
  const id = sessionUuid(s)
  if (id && c.uuid) return lower(c.uuid) === lower(id)
  return !!(s.client_name || s.name) && c.name === (s.client_name || s.name)
}

/** The clients with `streaming` read from the session; null stays null. */
export function withStreaming(clients, session) {
  if (!Array.isArray(clients)) return clients ?? null
  return clients.map((c) => (c && (c.streaming === true || isSessionClient(c, session)) ? { ...c, streaming: true } : c))
}

/** The clients that stream now: the paired ones of the session, and the client of the session itself when it is not in the list (the list may be a moment behind, or the client unpaired). */
export function onlineClients(clients, session) {
  if (!Array.isArray(clients)) return null
  const live = withStreaming(clients, session).filter((c) => c && c.streaming === true)
  const who = realSession(session, clients)?.client_name || (isPlaceholderName(session?.name) ? '' : session?.name)
  if (session && who && !live.length) live.push({ name: String(who), uuid: sessionUuid(session), icon: 'devices', streaming: true })
  return live
}

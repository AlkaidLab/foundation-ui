// What the update page and the first-run step say about a CDK, from one place: the state as a short label, the plain sentence for what went wrong, the days that are left.
// The sentences are MAA's (see sourceTexts.js). Pure: the status comes from the client (mirrorchyan.js `cdkStatus`), the texts from `updateSourceTexts`.

const DAY = 86400000

/** Whole days until the CDK ends (a started day counts), 0 on the last day; null when the end is not known. */
export const cdkDaysLeft = (expiresAt, now = Date.now()) => {
  const at = Number(expiresAt)
  if (!Number.isFinite(at) || at <= 0) return null
  return Math.max(0, Math.ceil((at - now) / DAY))
}

const fill = (text, value) => String(text).replace('{0}', String(value))

/**
 * @param {{ state: string, expiresAt?: number|null, kind?: string }} status  the result of the one check
 * @param {object} texts  updateSourceTexts(locale)
 * @param {{ now?: number, lastValid?: { expiresAt?: number|null }|null }} [options]  `lastValid`: the last status that was valid, shown when the check could not reach the service
 * @returns {{ label: string, tone: 'ok'|'error'|'neutral', lines: string[] }}  `lines` are the sentences under the label, in order
 */
export function cdkView(status, texts, { now = Date.now(), lastValid = null } = {}) {
  const s = status && typeof status === 'object' ? status : { state: 'none' }
  const state = s.state || 'none'
  const label = texts.status[state] || texts.status.unknown
  const lines = []
  if (state === 'valid') {
    const days = cdkDaysLeft(s.expiresAt, now)
    if (days !== null) lines.push(fill(texts.remainingDays, days))
    return { label, tone: 'ok', lines }
  }
  if (state === 'none') return { label, tone: 'neutral', lines }
  const sentence = (s.kind && texts.errors[s.kind]) || (state === 'offline' ? texts.errors.network : '')
  if (sentence) lines.push(sentence)
  if (state === 'offline' && lastValid) {
    lines.push(texts.fetchFailed)
    const days = cdkDaysLeft(lastValid.expiresAt, now)
    if (days !== null) lines.push(fill(texts.remainingDays, days))
  }
  return { label, tone: 'error', lines }
}

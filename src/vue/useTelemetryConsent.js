import { ref } from 'vue'
import { HOST_CONSENT_KEY, HOST_ERRORS_KEY, markErrorsNoticeSeen, errorsNoticeSeen, answeredConsent, normalizeConsent, normalizeErrors, readConsent, readErrors, storedConsent, writeConsent, writeErrors } from '../telemetry/index.js'
import { saveSettingKey } from '../settings/save.js'

// The two choices about what leaves the computer, shared by both products and every window (telemetry/consent.js): the host keeps each (config keys telemetry_errors and telemetry_consent), the storage
// of the window caches it so a page can decide before the host answers. `api` is the product's transport ({ getJson, postJson }, as for saveSettingKey).
//   errors  'on' | 'off'          error reports (redacted error text, version, system, page). On until the person turns it off.
//   consent 'on' | 'off'          usage statistics. On until the person turns it off (nobody is asked); `answer` is the person's choice. A stored 'ask' of an older version reads as the default.
export const CONSENT_EVENT = 'foundation-telemetry-consent'
export const ERRORS_EVENT = 'foundation-telemetry-errors'
export const ERRORS_REQUEST_EVENT = 'foundation-telemetry-errors-request'
const consent = ref(readConsent())
const errors = ref(readErrors())
const hostKnows = { errors: null }
// whether the window knows the person's own answer about usage statistics: from its own cache at once, else when the host has answered (or has failed to). A page that sends something because of the choice waits for this, not for a guess.
const loaded = ref(storedConsent() !== null)
const announce = (name, detail) => { try { window.dispatchEvent(new CustomEvent(name, { detail })) } catch { /* no window */ } }

export function useTelemetryConsent({ api = null } = {}) {
  async function refresh() {
    if (!api) { loaded.value = true; announce(CONSENT_EVENT, consent.value); return consent.value }
    try {
      const config = await api.getJson('/api/config')
      const host = answeredConsent(config && config[HOST_CONSENT_KEY])
      if (host) { consent.value = host; writeConsent(host) }
      // an answer given in this window before the host knew it is handed to the host; the default is not an answer and is not written
      else if (storedConsent() !== null) void saveSettingKey(api, HOST_CONSENT_KEY, consent.value)
      const hostErrors = config && config[HOST_ERRORS_KEY]
      if (hostErrors !== undefined && hostErrors !== '') { errors.value = normalizeErrors(hostErrors); writeErrors(errors.value); hostKnows.errors = errors.value }
      else if (errors.value === 'off') void saveSettingKey(api, HOST_ERRORS_KEY, 'off')
    } catch { /* the cached answer stands */ }
    loaded.value = true
    // the host has answered (or cannot): the collector, which holds back while this window has no answer of its own, now knows what stands
    announce(CONSENT_EVENT, consent.value)
    return consent.value
  }
  /** The choice about usage statistics ('on' | 'off'); takes effect at once, for the collector listens to CONSENT_EVENT and reads the stored answer on every send. */
  async function answer(value) {
    consent.value = normalizeConsent(value)
    loaded.value = true
    writeConsent(consent.value)
    announce(CONSENT_EVENT, consent.value)
    if (api) { try { await saveSettingKey(api, HOST_CONSENT_KEY, consent.value) } catch { /* the cached answer stands */ } }
  }
  /** Error reports on or off (关于 › 隐私, or the box of the report sheet). */
  async function setErrors(value) {
    errors.value = normalizeErrors(value)
    writeErrors(errors.value)
    announce(ERRORS_EVENT, errors.value)
    if (api && hostKnows.errors !== errors.value) { hostKnows.errors = errors.value; try { await saveSettingKey(api, HOST_ERRORS_KEY, errors.value) } catch { /* the cached answer stands */ } }
  }
  // the box of the report sheet sits in a component that has no composable: it asks through this event, and the composable of the product keeps and saves the answer
  if (typeof window !== 'undefined') window.addEventListener(ERRORS_REQUEST_EVENT, (event) => { void setErrors(event.detail) })
  return { consent, errors, loaded, refresh, answer, setErrors, errorsNoticeSeen, markErrorsNoticeSeen }
}

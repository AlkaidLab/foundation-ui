// Two separate choices (), kept apart everywhere: the host keeps each under its own config key, the window caches each so a page can decide before the host answers.
//
// ERROR REPORTS: the redacted error text, the version, the system and the page, sent when the product meets an error of its own. ON by default; the person turns it off in 关于 › 隐私
// (the first run says so once, in a notice, and asks nothing). Values: 'on' | 'off'. A report the person sends by hand is an explicit action and does not need this choice.
//
// USAGE STATISTICS: counts of what is used. A separate switch, ON by default like the error reports (「遥测默认开」); the same first-run notice tells about both and nobody is asked.
// Values: 'on' | 'off'; 'ask' is only a value an older version may have stored (it meant "not answered yet") and reads as the default. An explicit 'on' or 'off' already given is kept as it is.
// The collection itself is its own design; this only keeps the answer.

/** What a person who has not answered gets for usage statistics. */
export const USAGE_STATS_DEFAULT = 'on'
/** What a person who has not changed it gets for error reports. */
export const ERROR_REPORTS_DEFAULT = 'on'

// usage statistics (the key names are the old single choice's, so an answer already given stays what it was)
export const CONSENT_KEY = 'foundation-ui.telemetry.consent'
export const HOST_CONSENT_KEY = 'telemetry_consent'
// 'ask' stays listed so a value stored by an older version is still recognised; nothing writes it any more
export const CONSENT_STATES = Object.freeze(['ask', 'on', 'off'])
// error reports
export const ERRORS_KEY = 'foundation-ui.telemetry.errors'
export const HOST_ERRORS_KEY = 'telemetry_errors'
export const ERRORS_STATES = Object.freeze(['on', 'off'])
/** Whether the first run's one-time notice about what is sent (error reports and usage statistics) was shown. A new key: the earlier notice named error reports only and does not count for this one. */
export const ERRORS_NOTICE_KEY = 'foundation-ui.telemetry.notice'

const truthy = (value) => value === true || value === 'on' || value === 'true' || value === '1' || value === 1
const falsy = (value) => value === false || value === 'off' || value === 'false' || value === '0' || value === 0

/** Usage statistics: 'on' | 'off', else the default (nothing, unknown, or the retired 'ask'). */
export const normalizeConsent = (value) => (truthy(value) ? 'on' : falsy(value) ? 'off' : USAGE_STATS_DEFAULT)
/** Only an 'on' (the default or the person's own) lets usage counts leave the computer. */
export const mayCollect = (value) => normalizeConsent(value) === 'on'

/** Error reports: 'off' only when it was turned off; anything else (nothing, unknown) is the default. */
export const normalizeErrors = (value) => (truthy(value) ? 'on' : falsy(value) ? 'off' : ERROR_REPORTS_DEFAULT)
/** Only an 'on' lets an error report leave the computer by itself. */
export const mayReportErrors = (value) => value === 'on' || value === true

const store = (storage) => { try { return storage ?? globalThis.localStorage ?? null } catch { return null } }
const get = (key, storage) => { try { return store(storage)?.getItem(key) } catch { return null } }
export const readConsent = (storage) => normalizeConsent(get(CONSENT_KEY, storage))
/** The answer the person gave (or this window was told by the host), or null when there is none: the default is not an answer. */
export const answeredConsent = (value) => (truthy(value) ? 'on' : falsy(value) ? 'off' : null)
export const storedConsent = (storage) => answeredConsent(get(CONSENT_KEY, storage))
export const writeConsent = (value, storage) => { try { store(storage)?.setItem(CONSENT_KEY, normalizeConsent(value)); return true } catch { return false } }
/** A person who answered 'off' to the old single question said no to everything that left the computer: that stays no for error reports until they turn it on. */
export const readErrors = (storage) => {
  const own = get(ERRORS_KEY, storage)
  if (own !== null && own !== undefined) return normalizeErrors(own)
  return get(CONSENT_KEY, storage) === 'off' ? 'off' : ERROR_REPORTS_DEFAULT
}
export const writeErrors = (value, storage) => { try { store(storage)?.setItem(ERRORS_KEY, normalizeErrors(value)); return true } catch { return false } }
export const errorsNoticeSeen = (storage) => get(ERRORS_NOTICE_KEY, storage) === '1'
export const markErrorsNoticeSeen = (storage) => { try { store(storage)?.setItem(ERRORS_NOTICE_KEY, '1'); return true } catch { return false } }

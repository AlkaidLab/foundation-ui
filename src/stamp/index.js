// The "last updated" stamp every page that shows fetched or cached data carries (docs/copy-style.zh.md, rule 5).
// stampLabel is the one place the wording and the time format live; MUpdatedStamp draws it and keeps it current.
import { canonicalLocale } from '../locale/texts/resolve.js'

const ZH = { now: '刚刚更新', min: '更新于 {n} 分钟前', at: '更新于 {time}', day: '更新于 {date} {time}', refresh: '刷新', refreshing: '正在更新…' }
const EN = { now: 'Updated just now', min: 'Updated {n} min ago', at: 'Updated at {time}', day: 'Updated {date}, {time}', refresh: 'Refresh', refreshing: 'Updating…' }

/** The words of the stamp. Chinese and English are written; every other language reads English. */
export const stampTexts = (locale = 'en') => (canonicalLocale(locale) === 'zh' || canonicalLocale(locale) === 'zh_TW' ? ZH : EN)

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '')
const tag = (locale) => canonicalLocale(locale).replace('_', '-')

/** "14:05" in the locale's own clock. */
export function stampClock(at, locale = 'en') {
  return new Date(at).toLocaleTimeString(tag(locale), { hour: 'numeric', minute: '2-digit' })
}
/** "11 月 9 日" / "Nov 9". */
export function stampDate(at, locale = 'en') {
  const d = new Date(at)
  return /^zh/.test(canonicalLocale(locale)) ? `${d.getMonth() + 1} 月 ${d.getDate()} 日` : d.toLocaleDateString(tag(locale), { month: 'short', day: 'numeric' })
}
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/**
 * The stamp text for a time: "刚刚更新" under a minute, "更新于 3 分钟前" under an hour, "更新于 14:05" the same day, with the date on another day.
 * Returns '' when there is no time (never loaded): nothing is shown rather than a placeholder.
 */
export function stampLabel(at, { now = Date.now(), locale = 'en' } = {}) {
  const t = at instanceof Date ? at.getTime() : Number(at)
  if (!Number.isFinite(t) || t <= 0) return ''
  const T = stampTexts(locale)
  const minutes = Math.floor(Math.max(0, now - t) / 60000)
  if (minutes < 1) return T.now
  if (minutes < 60) return fill(T.min, { n: minutes })
  if (sameDay(new Date(t), new Date(now))) return fill(T.at, { time: stampClock(t, locale) })
  return fill(T.day, { date: stampDate(t, locale), time: stampClock(t, locale) })
}

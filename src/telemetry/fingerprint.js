// The fingerprint of an error: category + code + the top frames of our own code (function and file, without line numbers: a minified chunk has no stable ones) + the release.
// The same fault in the same release has the same fingerprint on every install, so it is one issue with a count; the next release is a new issue with the same `stem`, which is how a regression shows.
import { framesOf } from './classify.js'

const hash = (text, seed) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < text.length; i++) { const ch = text.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677) }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}
export const hash32 = (text) => hash(text, 0) + hash(text, 7919)

/** `https://host/assets/web/assets/index-AbC123xy.js?x=1#y` -> `index.js` */
export const fileOf = (url) => String(url || '').replace(/[?#].*$/, '').split('/').pop().replace(/[-.][A-Za-z0-9_]{6,12}(?=\.(?:js|mjs|css)$)/, '').slice(0, 40)
const fnOf = (fn) => String(fn || '').replace(/^(?:Object|Module|Proxy)\./, '').replace(/\[as [^\]]*\]/g, '').replace(/[^\w$.<>-]/g, '').slice(0, 40)

/** The top frames that are ours, as `fn@file`. */
export function appFramesOf(stack, { max = 3, isApp = () => true } = {}) {
  return framesOf(stack).filter((f) => isApp(f.url)).slice(0, max).map((f) => `${fnOf(f.fn)}@${fileOf(f.url)}`)
}

/** -> { id (the document id, 32 hex), stem (the same without the release), frames } */
export function fingerprintOf({ category = 'ui', code = 'error', stack = '', release = '', isApp } = {}) {
  const frames = appFramesOf(stack, { isApp })
  const stem = hash32(`${category}|${code}|${frames.join('>')}`)
  return { id: hash32(`${stem}|${release}`), stem, frames }
}

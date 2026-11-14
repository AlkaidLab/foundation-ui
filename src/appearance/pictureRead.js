// Reading a wallpaper for its colours without the main thread paying for it. The old way drew the picture into a canvas on the main thread and quantised
// every pixel of it: 1.3 to 1.8 s of the main thread in the load event of the first start (Skyward panel, long animation frame). Here the picture is
// fetched, a worker decodes it, takes the statistics and the seed (pictureWorker.js), and the result is kept per picture and modification time, in memory
// and in localStorage, so that the next start reads nothing.

const STORE = 'm-picture-read-v2' // v2: { stats, seed, seeds } (up to four seeds)
const memory = new Map()

/** The identity of the picture's content: its address and the modification time (or tag, or size) the server gives for it. */
export function versionOf(url, headers, size = '') {
  const tag = headers.get('last-modified') || headers.get('etag') || headers.get('content-length') || size
  return `${shortAddress(url)}|${tag}`
}

/** A data or blob address (a picture the person chose is kept as one) is far too long to be a key: its start, its length and a hash of all of it. */
export function shortAddress(url) {
  if (url.length <= 200) return url
  let hash = 2166136261
  for (let i = 0; i < url.length; i += 1) hash = Math.imul(hash ^ url.charCodeAt(i), 16777619) >>> 0
  return `${url.slice(0, 40)}...${url.length}:${hash.toString(36)}`
}

function stored(win) {
  try { return JSON.parse(win.localStorage.getItem(STORE) || '{}') } catch { return {} }
}
function remember(win, key, value) {
  memory.set(key, value)
  try {
    const all = stored(win)
    all[key] = value
    const keys = Object.keys(all)
    for (const old of keys.slice(0, Math.max(0, keys.length - 12))) delete all[old]
    win.localStorage.setItem(STORE, JSON.stringify(all))
  } catch { /* storage full or off: the memory copy stays */ }
}

let worker = null
let seq = 0
const waiting = new Map()
async function analyseInWorker(blob) {
  if (!worker) {
    const { default: PictureWorker } = await import('./pictureWorker.js?worker&inline')
    worker = new PictureWorker()
    worker.onmessage = (event) => {
      const { id, error, ...rest } = event.data
      const entry = waiting.get(id)
      if (!entry) return
      waiting.delete(id)
      error ? entry.reject(new Error(error)) : entry.resolve(rest)
    }
    worker.onerror = () => { for (const [, entry] of waiting) entry.reject(new Error('worker')); waiting.clear(); worker = null }
  }
  const id = ++seq
  return new Promise((resolve, reject) => { waiting.set(id, { resolve, reject }); worker.postMessage({ id, blob }) })
}

/**
 * `{ stats, seed }` of the picture at `url`; rejects when the picture cannot be read (no CORS, not found, timed out) and the caller shows it unread.
 * The deps are replaceable for tests.
 */
export async function readPicturePalette(url, { timeout = 8000, win = window, fetchImpl = (...args) => fetch(...args), analyse = analyseInWorker } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetchImpl(url, { mode: 'cors', signal: controller.signal })
    if (!response.ok) throw new Error('load')
    // the modification time (or tag, or length) the server gives is part of the key; where it gives none (the built-in files, a data address) the size of the bytes is
    let key = versionOf(url, response.headers)
    let known = key.endsWith('|') ? null : memory.get(key) || stored(win)[key]
    if (known) { memory.set(key, known); response.body?.cancel?.(); return known }
    const blob = await response.blob()
    if (key.endsWith('|')) {
      key = versionOf(url, response.headers, `size${blob.size}`)
      known = memory.get(key) || stored(win)[key]
      if (known) { memory.set(key, known); return known }
    }
    // a worker that never answers must not hold the wallpaper back: the caller falls back to the old way after the same time the fetch had
    const value = await Promise.race([analyse(blob), new Promise((_, reject) => setTimeout(() => reject(new Error('worker')), timeout))])
    remember(win, key, value)
    return value
  } catch (error) {
    if (controller.signal.aborted) throw new Error('timeout')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

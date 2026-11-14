// A cover is the picture an app has. A picture that is not one (a placeholder of a pixel, a file that does not load) is no cover: the tile shows its icon, never a blank coloured block.
// The first time a url is asked for it is loaded once; until it has loaded, and when it fails or is a few pixels, the answer is false (reactive: the tile switches when it is known).
import { shallowReactive } from 'vue'

const MIN = 16
const state = shallowReactive({})

export function coverOk(url) {
  if (!url) return false
  if (state[url] === undefined) {
    state[url] = 'pending'
    if (typeof Image !== 'undefined') {
      const im = new Image()
      im.onload = () => { state[url] = im.naturalWidth >= MIN && im.naturalHeight >= MIN ? 'ok' : 'bad' }
      im.onerror = () => { state[url] = 'bad' }
      im.src = url
    }
  }
  return state[url] === 'ok'
}

/** Whether the answer for a url is known (it loaded, or it did not): a page that must be drawn once asks it before it draws (coverOk starts the load). Reactive. */
export function coverKnown(url) {
  if (!url) return true
  void coverOk(url)
  return state[url] !== undefined && state[url] !== 'pending'
}

/** the background of a cover tile: the picture when it is one, nothing (the icon shows) when it is not */
export const coverStyle = (url) => (coverOk(url) ? { backgroundImage: `url(${url})` } : undefined)

// The blurred copy of the wallpaper is drawn and encoded in a worker. On the main thread the same draw (the blur is run when the canvas is read) and the
// JPEG encoding took 50 ms in the click that changed the page (Skyward panel, CPU profile of the first visit of a page); here the main thread only hands the
// picture over once and receives the finished blob. Without Worker, OffscreenCanvas or its canvas filter the caller draws on the main thread as before.

const SOURCE = `
const images = new Map()
onmessage = async (e) => {
  const m = e.data
  if (m.t === 'image') {
    images.set(m.key, m.bitmap)
    if (images.size > 3) { const first = images.keys().next().value; images.get(first).close(); images.delete(first) }
    return
  }
  try {
    const bitmap = images.get(m.key)
    if (!bitmap) throw new Error('picture not handed over')
    const canvas = new OffscreenCanvas(m.w, m.h)
    const x = canvas.getContext('2d')
    x.filter = 'blur(' + m.blur + 'px)'
    x.drawImage(bitmap, m.dx, m.dy, m.dw, m.dh)
    postMessage({ id: m.id, blob: await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 }) })
  } catch (error) {
    postMessage({ id: m.id, error: String((error && error.message) || error) })
  }
}
`

export const canBakeInWorker = () =>
  typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function' &&
  typeof OffscreenCanvasRenderingContext2D !== 'undefined' && 'filter' in OffscreenCanvasRenderingContext2D.prototype

let worker = null
let seq = 0
const waiting = new Map()
const handed = new Set()
let broken = false

function start() {
  if (worker) return worker
  worker = new Worker(URL.createObjectURL(new Blob([SOURCE], { type: 'text/javascript' })))
  worker.onmessage = (e) => {
    const { id, blob, error } = e.data
    const w = waiting.get(id)
    if (!w) return
    waiting.delete(id); clearTimeout(w.timer)
    blob ? w.resolve(blob) : w.reject(new Error(error || 'bake'))
  }
  worker.onerror = () => { broken = true; for (const [, w] of waiting) { clearTimeout(w.timer); w.reject(new Error('worker')) } waiting.clear(); worker = null; handed.clear() }
  return worker
}

/**
 * `key` names the picture (it is handed to the worker once), `image` the loaded picture; the picture is drawn at (dx, dy, dw, dh) into a w x h canvas under
 * a blur of `blur` px and comes back as a JPEG blob. Rejects when the worker cannot do it.
 */
export async function bakeInWorker({ key, image, w, h, dx, dy, dw, dh, blur }) {
  if (broken) throw new Error('worker')
  const target = start()
  if (!handed.has(key)) {
    const bitmap = await createImageBitmap(image)
    target.postMessage({ t: 'image', key, bitmap }, [bitmap])
    handed.add(key)
    if (handed.size > 3) handed.delete(handed.values().next().value) // the worker drops its oldest picture the same way
  }
  const id = ++seq
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { waiting.delete(id); reject(new Error('timeout')) }, 10000)
    waiting.set(id, { resolve, reject, timer })
    target.postMessage({ t: 'bake', id, key, w, h, dx, dy, dw, dh, blur })
  })
}

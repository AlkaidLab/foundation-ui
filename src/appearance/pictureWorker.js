// Reads a picture's palette off the main thread. The page hands over the picture's bytes; the worker decodes them (createImageBitmap), takes the scrim
// statistics from a 64 px copy, and the seed colour (Material You
// quantiser) from the picture's own pixels: a quantiser run on a smaller copy picks another colour when two candidates score alike (measured: #f95269 against
// #a7575e for the same picture), so the pixels are not thinned.
import { seedsOf } from './pictureSeeds.js'
import { imageStats } from './pictureStats.js'

const SMALL = 64

export async function paletteOf(blob) {
  const full = await createImageBitmap(blob)
  // the statistics come from a 64 px copy that the browser scales with its medium quality (within 0.02 of what a canvas draw gave before), the seed from the
  // picture's own pixels
  const small = await createImageBitmap(full, { resizeWidth: SMALL, resizeQuality: 'medium' })
  const smallContext = new OffscreenCanvas(small.width, small.height).getContext('2d', { willReadFrequently: true })
  smallContext.drawImage(small, 0, 0)
  const stats = imageStats(smallContext.getImageData(0, 0, small.width, small.height).data, small.width, small.height)
  small.close()
  const bigContext = new OffscreenCanvas(full.width, full.height).getContext('2d', { willReadFrequently: true })
  bigContext.drawImage(full, 0, 0)
  const seeds = seedsOf(bigContext.getImageData(0, 0, full.width, full.height).data)
  full.close()
  return { stats, seed: seeds[0], seeds }
}

onmessage = async (event) => {
  const { id, blob } = event.data
  try {
    postMessage({ id, ...(await paletteOf(blob)) })
  } catch (error) {
    postMessage({ id, error: String((error && error.message) || error) })
  }
}

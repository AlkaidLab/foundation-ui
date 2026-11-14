import { QuantizerCelebi, Score, hexFromArgb } from '@material/material-color-utilities'

/**
 * Up to four seeds with distinct hues: the quantizer (Celebi) and the score (hue population, chroma, a filter against near-grey) of material-color-utilities, which is what Material You does. The first of
 * them is exactly the seed sourceColorFromImage gives (it is that function's own steps), so the colours of an existing choice do not change.
 */
export function seedsOf(bytes, desired = 4) {
  const pixels = []
  for (let i = 0; i < bytes.length; i += 4) {
    const a = bytes[i + 3]
    if (a < 255) continue
    pixels.push(((a << 24) | (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]) >>> 0)
  }
  const ranked = Score.score(QuantizerCelebi.quantize(pixels, 128), { desired })
  return ranked.map((argb) => hexFromArgb(argb))
}


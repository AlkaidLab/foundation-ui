// The words of a tile text. A title or a line that has to wrap breaks between its words, never inside one ('主机播放 / 音频', not '主机播 / 放音频'): each word is kept whole (white-space: nowrap on .m-tile__word),
// and a word that is wider than the tile is the fit rule's to shrink (fitText.js). Chinese and Japanese have no spaces: the browser's word segmenter (a dictionary per language) finds the words; its default locale
// would cut Han text into single characters, so the language of the script is asked for. Text without CJK, or a browser without the segmenter, has no words here: the browser breaks it at its spaces.
const HAN = /[一-鿿]/, KANA = /[぀-ヿ]/
const cache = new Map()
/** The words of a text as a list, or null when the text needs no help (no CJK, one word, no segmenter). */
export function wordsOf(text) {
  const t = String(text ?? '')
  if (!t || !/[぀-ヿ一-鿿]/.test(t) || typeof Intl === 'undefined' || !Intl.Segmenter) return null
  if (cache.has(t)) return cache.get(t)
  let out = null
  try {
    const seg = new Intl.Segmenter(KANA.test(t) ? 'ja' : HAN.test(t) ? 'zh' : undefined, { granularity: 'word' })
    // the dictionary does not know the words of a product (串流 = 串 + 流, 音频 = 音 + 频): a run of single characters is never a break of its own, it belongs to the word before it (停止 + 串流), and a run at
    // the start of the text to the word after it (开源 + 与...). Most of the time that leaves two or three words to break between, and sometimes one: a short title then does not break at all and the fit rule shrinks it.
    const list = []
    let lead = ''
    for (const part of seg.segment(t)) {
      const w = part.segment
      if ([...w].length > 1 || !/[\u3040-\u30ff\u4e00-\u9fff]/.test(w)) { list.push(lead + w); lead = ''; continue }
      if (list.length) list[list.length - 1] += w
      else lead += w
    }
    if (lead) list.push(lead)
    out = list.length > 1 ? list : null
  } catch { out = null }
  if (cache.size > 400) cache.clear()
  cache.set(t, out)
  return out
}

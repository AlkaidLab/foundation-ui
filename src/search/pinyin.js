// Pinyin initials of Chinese text without a dictionary: the browser's own pinyin collation (Intl.Collator, zh-u-co-pinyin) orders the characters, and the
// first letter is the last letter whose boundary character sorts at or before the one asked about. A few characters have two common readings; those are listed.
// Built once per index entry (never per keystroke).

const BOUNDARIES = [['a', '阿'], ['b', '八'], ['c', '嚓'], ['d', '搭'], ['e', '蛾'], ['f', '发'], ['g', '噶'], ['h', '哈'], ['j', '击'], ['k', '喀'], ['l', '垃'], ['m', '妈'], ['n', '拿'], ['o', '哦'], ['p', '啪'], ['q', '期'], ['r', '然'], ['s', '撒'], ['t', '塌'], ['w', '挖'], ['x', '昔'], ['y', '压'], ['z', '匝']]

// characters whose initial depends on the word: the collation gives one reading, these add the other
const ALSO = Object.freeze({ 重: 'c', 长: 'z', 传: 'z', 行: 'h', 调: 't', 会: 'k', 乐: 'y', 参: 's', 数: 'c', 校: 'j', 觉: 'j', 少: 'd', 曲: 'q', 降: 'x', 便: 'p', 着: 'z', 差: 'c', 度: 'd', 率: 's', 地: 'd', 给: 'j', 假: 'j', 角: 'j', 解: 'x', 处: 'c', 切: 'q' })

let collator = null
const cache = new Map()
const isHan = (ch) => ch >= '一' && ch <= '鿿'
export const hasHan = (text) => { for (const ch of String(text)) if (isHan(ch)) return true; return false }

function initialOf(ch) {
  if (cache.has(ch)) return cache.get(ch)
  let out = ''
  try {
    collator ||= new Intl.Collator('zh-Hans-CN-u-co-pinyin')
    for (const [letter, boundary] of BOUNDARIES) { if (collator.compare(ch, boundary) >= 0) out = letter; else break }
  } catch { out = '' }
  cache.set(ch, out)
  return out
}

/**
 * The initials of a text as strings, with the index of the character each initial came from: [{ s: 'mlbz', at: [0, 1, 2, 3] }].
 * Han characters give their initial (two readings of a character give up to `max` strings); letters and digits stand for themselves; spaces and marks are skipped.
 */
export function initialsOf(text, max = 4) {
  const chars = Array.from(String(text))
  let variants = [{ s: '', at: [] }]
  chars.forEach((ch, i) => {
    let options = null
    if (isHan(ch)) { const a = initialOf(ch); if (a) options = [a]; if (ALSO[ch] && ALSO[ch] !== a) options = [...(options || []), ALSO[ch]] }
    else if (/[a-z0-9]/i.test(ch)) options = [ch.toLowerCase()]
    if (!options) return
    const next = []
    for (const v of variants) for (const o of options) { if (next.length < max) next.push({ s: v.s + o, at: [...v.at, i] }) }
    variants = next
  })
  return variants.filter((v) => v.s)
}

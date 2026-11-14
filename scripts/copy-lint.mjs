// The copy lint (docs/copy-style.zh.md): the explaining voice of the interface text, in Chinese and English: wording that says nothing clearly or talks about how the code behaves, and the space between a number and its unit.
// `scanText` judges one string; `scanFile` pulls the strings out of a source or JSON file; `scanTree` walks a list of roots.
// Used by test/copyStyle.test.js here, by the panel and the Web UI tests (import from 'foundation-ui/testing/copy-lint'), and from the command line:
//   node scripts/copy-lint.mjs <file-or-dir>...
import fs from 'node:fs'
import path from 'node:path'

const CJK = /[㐀-鿿]/
// code and styles are not text: a comparison, a template of the compiler, a declaration block, a regular expression
const CODE = /=>|&&|\|\||===|!==|\$\{|;\s*\}|\{\s*[\w-]+\s*:\s|\bvar\(|\b(transition|transform|opacity|animation)\b|^[!\[\]\\)]|\(!\w|\?\s*['"]/
const LATIN = /[À-ɏЀ-ӿ]/ // other languages that share a source file

/** id: the name in a report; re: the pattern; lang: 'zh' | 'en' | 'any'; why: what to write instead.
 *  Only the explaining voice is judged: wording that says nothing clearly or talks about how the code behaves. The brand voice (playful, with a character: 杂鱼~, 哦/呢/啦/吧, ~, !)
 *  is deliberate and is NOT checked (docs/copy-style.zh.md, section 1). */
export const RULES = [
  { id: 'du-bu-dao', lang: 'zh', re: /读不到|读不出|讀不到|讀不出/, why: '「无法加载 …」，并把动作放在按钮上' },
  { id: 'yong-wan', lang: 'zh', re: /(?<![使应作利运费])用完(?![整全])/, why: '「已用尽」' },
  { id: 'mei-fa', lang: 'zh', re: /没法|沒法/, why: '「无法」' },
  { id: 'mei-shuo', lang: 'zh', re: /(?<!什么都|什麼都)(没说|沒說)/, why: '「未报告」「没有给出」' },
  { id: 'ying-da', lang: 'zh', re: /应答了|應答了/, why: '说用户理解的对象：「主机返回了 HTTP 状态码 …」' },
  { id: 'zan-shi', lang: 'zh', re: /暂时(读|无法|不能|连不上|不可用)|暫時(讀|無法|不能|連不上|不可用)/, why: '「暂时无法 …」是说明腔：写清是什么失败，要做什么' },
  { id: 'dev-api', lang: 'zh', re: /(?<!网络)接口|主机回答|字段|请求体/, why: '不暴露实现，说用户能理解的对象（开发者页面可在白名单里放行）', dev: true },
  { id: 'dev-return', lang: 'zh', re: /返回(的内容|值|内容|结果|数据|码|错误)/, why: '不暴露实现', dev: true },
  { id: 'explain-en', lang: 'en', re: /\b(for now|used up|ran out|use up)\b/i, why: 'state what failed and what to do; no "for now", "used up"' },
  { id: 'dev-en', lang: 'en', re: /\b(host (answered|replied|returned)|API (returned|answered)|endpoint (returned|answered))\b/i, why: 'implementation talk', dev: true },
  { id: 'unit-space', lang: 'any', re: /(?<![A-Za-z0-9_.-])\d+(?:\.\d+)?(?:fps|FPS|Mbps|Kbps|Gbps|kbps|MB|GB|KB|TB|Hz|ms)(?![A-Za-z0-9])/, why: '数字和单位之间加一个空格' },
  { id: 'unit-space-ph', lang: 'any', re: /\}(?:fps|FPS|Mbps|Kbps|Gbps|kbps|MB|GB|KB|TB|Hz|ms)(?![A-Za-z0-9])/, why: '数字和单位之间加一个空格' },
]

/** The rules a string breaks. Chinese rules judge strings with CJK text, English rules the others (with at least a word). */
export function scanText(text, { allow = [] } = {}) {
  const s = String(text)
  const zh = CJK.test(s)
  const out = []
  for (const r of RULES) {
    if (allow.includes(r.id)) continue
    if (r.lang === 'zh' && !zh) continue
    if (r.lang === 'en' && (zh || !/[A-Za-z]{3}/.test(s))) continue
    // code and styles are not text: a comparison, a template of the compiler, a declaration block
    if (CODE.test(s)) continue
    if (r.lang === 'en' && LATIN.test(s)) continue
    const m = r.re.exec(s)
    if (m) out.push({ rule: r.id, match: m[0], why: r.why, text: s })
  }
  return out
}

/** Every quoted string and (in .vue) the text between tags and the attribute values. Comments are skipped. */
export function stringsOf(source, file = '') {
  const out = []
  if (file.endsWith('.json')) {
    try { walk(JSON.parse(source), (v) => out.push(v)); return out } catch { /* not JSON: scan as text */ }
  }
  const blank = (c) => c.replace(/[^\n]/g, ' ')
  let src = source.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length)).replace(/<!--[\s\S]*?-->/g, blank)
  if (file.endsWith('.vue')) {
    // a component: what a person reads is in the template (text between tags, text attributes, quoted strings inside {{ }}); the script holds code
    const t = /<template[^>]*>([\s\S]*)<\/template>/.exec(src)
    src = t ? t[1] : ''
    for (const m of src.matchAll(/\{\{([\s\S]*?)\}\}/g)) for (const q of m[1].matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) out.push(q[1] ?? q[2])
    for (const m of src.matchAll(/(?:^|\s)(?:title|aria-label|placeholder|label|alt|data-tip|tooltip|text|description|subtitle)="([^"]*)"/g)) out.push(m[1])
    for (const m of src.matchAll(/>([^<>{}]*[\u3400-\u9fffA-Za-z][^<>{}]*)</g)) out.push(m[1].trim())
    return out
  }
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) out.push(m[1] ?? m[2] ?? m[3])
  return out
}
function walk(v, f) {
  if (typeof v === 'string') f(v)
  else if (Array.isArray(v)) v.forEach((x) => walk(x, f))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, f))
}

/**
 * @param {string} file
 * @param {{ allow?: (file: string) => string[] }} [opts] allow(file) lists the rule ids this file may break (developer-only pages)
 */
export function scanFile(file, { allow = () => [], allowText = () => false } = {}) {
  const source = fs.readFileSync(file, 'utf8')
  const seen = new Set()
  const hits = []
  for (const text of stringsOf(source, file)) {
    if (!text || text.length < 2 || seen.has(text) || /^(https?:|[./]|[\w.-]+\.(js|vue|css|json|exe)$)/.test(text) || allowText(text)) continue
    seen.add(text)
    for (const h of scanText(text, { allow: allow(file) })) hits.push({ file, ...h })
  }
  return hits
}

export function listFiles(root, exts = ['.js', '.mjs', '.vue', '.json'], skip = /(^|\/)(node_modules|\.git|dist|target|tests?|__tests__|gallery|docs)(\/|$)|\.test\.(m?js)$|\.spec\./) {
  const out = []
  const visit = (p) => {
    const st = fs.statSync(p)
    if (st.isDirectory()) { for (const n of fs.readdirSync(p)) if (!skip.test(path.join(p, n))) visit(path.join(p, n)) }
    else if (exts.some((e) => p.endsWith(e)) && !skip.test(p)) out.push(p)
  }
  visit(root)
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const roots = process.argv.slice(2)
  let n = 0
  for (const r of roots) for (const f of (fs.statSync(r).isDirectory() ? listFiles(r) : [r])) for (const h of scanFile(f)) { n++; console.log(`${h.file}\t${h.rule}\t${h.match}\t${h.text.slice(0, 140).replace(/\n/g, ' ')}`) }
  console.log(`# ${n} hits`)
}

import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMarkdown, inline, safeUrl, inlineText } from '../src/devmode/markdown.js'

const flat = (nodes) => JSON.stringify(nodes)
const types = (src) => parseMarkdown(src).map((b) => b.t)

test('addresses: links http, https and mailto, images https only, everything else is nothing', () => {
  assert.equal(safeUrl('https://github.com/x'), 'https://github.com/x')
  assert.equal(safeUrl('mailto:a@b.c'), 'mailto:a@b.c')
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' java\nscript:alert(1)', 'data:text/html,<b>', 'vbscript:x', '/relative/path', '//evil.example/x', 'file:///etc/passwd', 'tauri://localhost']) assert.equal(safeUrl(bad), '', bad)
  assert.equal(safeUrl('http://x/y.png', { image: true }), '')
  assert.equal(safeUrl('data:image/svg+xml;base64,AAAA', { image: true }), '')
  assert.equal(safeUrl('https://user-images.githubusercontent.com/1/a.png', { image: true }), 'https://user-images.githubusercontent.com/1/a.png')
})

test('headings, paragraphs and the line breaks GitHub keeps in an issue', () => {
  const b = parseMarkdown('# 标题\n\n第一行\n第二行\n\n## Two ##\n\nSetext\n===')
  assert.deepEqual(b.map((x) => x.t), ['h', 'p', 'h', 'h'])
  assert.equal(b[0].level, 1)
  assert.deepEqual(b[1].c.map((n) => n.t), ['text', 'br', 'text'])
  assert.equal(inlineText(b[2].c), 'Two')
  assert.equal(b[3].level, 1)
})

test('fenced code keeps its text and language, an unclosed fence runs to the end, a fence inside a list item works', () => {
  const b = parseMarkdown('```rust\nfn main() {\n    println!("<b>hi</b>");\n}\n```\n\nafter\n\n```\nno end\nstill code')
  assert.equal(b[0].t, 'code'); assert.equal(b[0].lang, 'rust'); assert.equal(b[0].text, 'fn main() {\n    println!("<b>hi</b>");\n}')
  assert.equal(b[1].t, 'p')
  assert.equal(b[2].text, 'no end\nstill code')
  const l = parseMarkdown('1. step\n   ```sh\n   cargo build\n   ```\n2. next')
  assert.equal(l[0].t, 'ol'); assert.equal(l[0].items.length, 2)
  assert.equal(l[0].items[0].c[1].t, 'code'); assert.equal(l[0].items[0].c[1].text, 'cargo build')
  assert.equal(parseMarkdown('```\n<!-- kept -->\n```')[0].text, '<!-- kept -->')
})

test('lists: bullets, numbers from their start, tasks, nesting, lazy lines', () => {
  const b = parseMarkdown('- a\n- [x] done\n- [ ] todo\n  - nested\n  - nested 2\n- lazy\ncontinues\n\n3. three\n4. four')
  assert.deepEqual(b.map((x) => x.t), ['ul', 'ol'])
  assert.equal(b[0].items.length, 4)
  assert.equal(b[0].items[1].task, true); assert.equal(b[0].items[2].task, false); assert.equal(b[0].items[0].task, null)
  assert.equal(b[0].items[2].c[1].t, 'ul'); assert.equal(b[0].items[2].c[1].items.length, 2)
  assert.deepEqual(b[0].items[3].c[0].c.map((n) => n.t), ['text', 'br', 'text'])
  assert.equal(b[1].start, 3)
})

test('quotes, rules, tables', () => {
  const b = parseMarkdown('> quoted **bold**\n> more\n\n---\n\n| a | b |\n|:--|--:|\n| 1 | 2 |\n| 3 |')
  assert.deepEqual(b.map((x) => x.t), ['quote', 'hr', 'table'])
  assert.equal(b[0].c[0].t, 'p')
  assert.deepEqual(b[2].align, ['left', 'right'])
  assert.equal(b[2].rows.length, 2); assert.equal(inlineText(b[2].rows[1][1]), '')
})

test('inline: emphasis, code, links, images, badges, bare addresses, escapes, snake_case', () => {
  assert.deepEqual(inline('a **b** *c* ~~d~~ `e`').map((n) => n.t), ['text', 'b', 'text', 'i', 'text', 'del', 'text', 'code'])
  assert.equal(inline('use snake_case_name here')[0].v, 'use snake_case_name here')
  assert.equal(inline('2 * 3 * 4')[0].v, '2 * 3 * 4')
  const a = inline('[the **docs**](https://x.y/z "t")')[0]
  assert.equal(a.t, 'a'); assert.equal(a.href, 'https://x.y/z'); assert.equal(a.c[1].t, 'b')
  const badge = inline('[![build](https://img.shields.io/b.svg)](https://ci.example/run)')[0]
  assert.equal(badge.t, 'a'); assert.equal(badge.c[0].t, 'img')
  assert.equal(inline('see https://github.com/a/b/issues/1.')[1].href, 'https://github.com/a/b/issues/1')
  assert.equal(inline('\\*not\\*')[0].v, '*not*')
  assert.equal(inline('``a ` b``')[0].v, 'a ` b')
  assert.equal(inlineText(inline('Vec<u8> and a < b')), 'Vec<u8> and a < b')
})

test('nothing of the text becomes markup or an unsafe address', () => {
  const evil = parseMarkdown('[x](javascript:alert(1)) ![y](javascript:alert(2)) ![z](data:image/png;base64,AA) <script>alert(3)</script> <img src="javascript:alert(4)" onerror="alert(5)"> <a href="javascript:alert(6)">k</a> <iframe src="https://evil"></iframe>')
  const s = flat(evil)
  assert.ok(!/javascript:/i.test(s.replace(/alert\(\d\)/g, '')) || !/"href":"javascript/i.test(s))
  assert.ok(!/"href":"javascript/i.test(s)); assert.ok(!/"src":"(javascript|data)/i.test(s))
  // a script tag is not a known tag: its text stays text (drawn escaped by Vue), no node type carries markup
  const walk = (n, f) => { f(n); for (const k of ['c', 'items', 'head', 'rows']) if (n[k]) for (const m of [].concat(...[].concat(n[k]))) if (m && typeof m === 'object') walk(m, f) }
  const kinds = new Set()
  for (const b of evil) walk(b, (n) => kinds.add(n.t))
  for (const k of kinds) assert.ok(['p', 'text', 'a', 'img', 'br', 'b', 'i', 'del', 'code', 'h', 'ul', 'ol', 'quote', 'table', 'hr'].includes(k), k)
})

test('issue templates: comments are dropped, <details>, <summary>, <br>, <img>, <a> read as what they mean', () => {
  const src = '<!-- Thanks for the report -->\n### Description\n<!-- multi\nline -->\nIt crashes<br>twice\n\n<details>\n<summary>Log</summary>\n\n```\nERR\n```\n</details>\n\n<img width="300" alt="shot" src="https://github.com/user-attachments/assets/1">\n\n<a href="https://example.org/x">link</a>'
  const b = parseMarkdown(src)
  assert.equal(b[0].t, 'h'); assert.equal(inlineText(b[0].c), 'Description')
  assert.ok(!JSON.stringify(b).includes('Thanks'))
  assert.ok(!JSON.stringify(b).includes('multi'))
  assert.deepEqual(b[1].c.map((n) => n.t), ['text', 'br', 'text'])
  const img = b.find((x) => x.t === 'p' && x.c.some((n) => n.t === 'img'))
  assert.equal(img.c.find((n) => n.t === 'img').alt, 'shot')
  assert.ok(b.some((x) => x.t === 'code' && x.text === 'ERR'))
  assert.ok(b.some((x) => x.t === 'p' && x.c.some((n) => n.t === 'a' && n.href === 'https://example.org/x')))
  assert.ok(b.some((x) => x.t === 'p' && x.c.some((n) => n.t === 'b' && inlineText(n.c) === 'Log')))
})

test('indented code, empty input, CRLF, and a deeply nested quote does not run away', () => {
  assert.equal(parseMarkdown('    indented\n    code')[0].text, 'indented\ncode')
  assert.deepEqual(parseMarkdown(''), []); assert.deepEqual(parseMarkdown(null), [])
  assert.equal(parseMarkdown('a\r\nb')[0].c.length, 3)
  const deep = '>'.repeat(200) + ' x'
  assert.ok(parseMarkdown(deep).length === 1)
  const big = parseMarkdown('**a '.repeat(3000) + '\n' + '[x'.repeat(3000))
  assert.ok(Array.isArray(big))
})

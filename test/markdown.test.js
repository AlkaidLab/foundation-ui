import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMarkdown, parseInline, firstImage, plainText } from '../src/announcements/markdown.js'

test('blocks: headings, paragraphs with line breaks, lists, quotes, code and rules', () => {
  const blocks = parseMarkdown('# Title\n\nline one\nline two\n\n- a\n- b\n\n1. x\n2. y\n\n> quoted\n\n---\n\n```\ncode **not bold**\n```')
  assert.deepEqual(blocks.map((b) => b.t), ['h', 'p', 'ul', 'ol', 'quote', 'hr', 'code'])
  assert.equal(blocks[0].level, 1)
  assert.deepEqual(blocks[1].c.map((n) => n.t), ['text', 'br', 'text'])
  assert.equal(blocks[2].items.length, 2)
  assert.equal(blocks[6].v, 'code **not bold**')
})

test('inline: bold, italic, strike, code and nesting', () => {
  const nodes = parseInline('a **b *c* d** ~~e~~ `f`')
  assert.deepEqual(nodes.map((n) => n.t), ['text', 'strong', 'text', 'del', 'text', 'code'])
  assert.deepEqual(nodes[1].c.map((n) => n.t), ['text', 'em', 'text'])
  assert.equal(parseInline('snake_case_name')[0].v, 'snake_case_name')
})

test('links and images are https only; everything else stays as written', () => {
  assert.equal(parseInline('[go](https://example.org/a)')[0].href, 'https://example.org/a')
  for (const bad of ['[x](javascript:alert(1))', '[x](http://example.org)', '[x](data:text/html,1)', '[x](//example.org)', '[x](https://user:pw@example.org)']) {
    assert.ok(parseInline(bad).every((n) => n.t === 'text'), bad)
  }
  assert.equal(parseInline('![alt](https://example.org/i.png)')[0].t, 'img')
  assert.ok(parseInline('![alt](http://example.org/i.png)').every((n) => n.t !== 'img'))
})

test('raw HTML is text', () => {
  const [p] = parseMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)>')
  assert.ok(p.c.every((n) => n.t === 'text'))
  assert.ok(p.c.map((n) => n.v).join('').includes('<script>'))
})

test('limits: long input is cut, deep nesting and many blocks cannot hurt, a non-string is empty', () => {
  assert.deepEqual(parseMarkdown(undefined), []); assert.deepEqual(parseMarkdown(5), [])
  assert.ok(parseMarkdown('x'.repeat(100000)).length <= 1)
  assert.ok(parseMarkdown('para\n\n'.repeat(5000)).length <= 200)
  assert.ok(Date.now() > 0 && parseMarkdown('> '.repeat(2000) + 'x').length === 1)
  const started = Date.now(); parseInline('*'.repeat(5000) + '_'.repeat(5000)); assert.ok(Date.now() - started < 1000)
})

test('the first image and a plain summary', () => {
  assert.equal(firstImage('text ![a](https://example.org/b.png) more'), 'https://example.org/b.png')
  assert.equal(firstImage('![a](http://example.org/b.png)'), null)
  assert.equal(plainText('# Head\n\n**bold** and [link](https://example.org)\n\n- one\n- two'), 'Head · bold and link · one · two')
  assert.equal(plainText('x'.repeat(300), 20).length, 20)
})

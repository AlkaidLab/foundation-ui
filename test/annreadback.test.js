import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'

// 公告: an open announcement shows ONE Back, the page's (「公告页怎么有两个返回」). The card has no Back of its own.
const sfc = (p) => parse(readFileSync(new URL(`../src/vue/${p}`, import.meta.url), 'utf8')).descriptor
const walk = (node, out = []) => { if (node.type === 1) out.push(node); (node.children || []).forEach((c) => walk(c, out)); return out }
const page = sfc('MAnnouncementPage.vue')
const els = walk(page.template.ast)
const prop = (el, name) => el.props.find((p) => p.name === name || (p.name === 'bind' && p.arg?.content === name))

test('the open announcement renders one Back: the page bubble, no arrow_back button inside the card', () => {
  const article = els.find((e) => e.tag === 'article')
  const inner = walk(article)
  const backs = inner.filter((e) => e.tag === 'MButton' && (/arrow_back/.test(JSON.stringify(e.props.map((p) => p.value?.content ?? p.exp?.content))) || /back/.test(e.props.find((p) => p.name === 'class')?.value?.content || '')))
  assert.equal(backs.length, 0, 'no Back button inside the article')
  assert.doesNotMatch(readFileSync(new URL('../src/css/announce.css', import.meta.url), 'utf8'), /m-annread__back/)
  assert.equal(els.filter((e) => e.tag === 'MPage').length, 1, 'one page, so one page header')
})

test('the page Back returns to the list when the announcement came from the list, else it is the scene back (where the person came from)', () => {
  const mpage = els.find((e) => e.tag === 'MPage')
  assert.equal(prop(mpage, 'back')?.exp?.content, '!!current && fromList')
  assert.ok(mpage.props.some((p) => p.name === 'on' && p.arg?.content === 'back' && p.exp?.content === 'closeToList'))
  const script = page.scriptSetup.content
  assert.match(script, /function open\(item\) \{ fromList\.value = true;/)
  assert.match(script, /const closeToList = \(\) => \{ openItem\.value = ''; fromList\.value = false \}/)
  assert.equal([...script.matchAll(/fromList\.value = false; openItem\.value = (id|props\.openId)/g)].length, 2, 'openId (home tile, popup) opens without the list: Back leaves the page')
})

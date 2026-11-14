import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { h } from 'vue'
import { createGithubClient, normalizeComment, BODY_MAX, CACHE_KEY } from '../src/devmode/github.js'
import { parseMarkdown } from '../src/devmode/markdown.js'
import { renderBlocks } from '../src/vue/devmode/renderMarkdown.js'
import { calculateScene, layoutOf, listDetailStrategy, supportingPaneStrategy, RAIL_WIDTH } from '../src/nav/scenes.js'
import { devmodeTexts } from '../src/devmode/texts.js'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m } }
const headers = (h2) => ({ get: (k) => h2[String(k).toLowerCase()] ?? null })
const reply = (status, body, h2 = {}) => ({ status, ok: status >= 200 && status < 300, headers: headers(h2), json: async () => body, text: async () => JSON.stringify(body) })
const rawComment = (id, extra = {}) => ({ id, user: { login: `u${id}` }, created_at: '2026-11-09T10:00:00Z', body: `comment ${id}`, html_url: `https://github.com/x/y/issues/1#issuecomment-${id}`, author_association: 'MEMBER', ...extra })

test('comments: read with the same cache, ETag and limit rules as the lists, oldest first, one page', async () => {
  const calls = []
  let t = 1000
  const client = createGithubClient({ storage: memory(), now: () => t, fetchImpl: async (url, o) => { calls.push({ url, h: o.headers }); return calls.length === 2 ? reply(304, null, { 'x-ratelimit-remaining': '50', 'x-ratelimit-reset': '9999' }) : reply(200, [rawComment(1), rawComment(2)], { etag: 'W/"c1"', 'x-ratelimit-remaining': '55', 'x-ratelimit-reset': '9999' }) } })
  const a = await client.comments('fs', 482)
  assert.equal(a.state, 'ok'); assert.deepEqual(a.items.map((c) => c.id), ['1', '2'])
  assert.equal(calls[0].url, 'https://api.github.com/repos/AlkaidLab/foundation-sunshine/issues/482/comments?per_page=100&page=1')
  assert.equal(calls[0].h.accept, 'application/vnd.github+json')
  t += 60_000
  assert.equal((await client.comments('fs', 482)).fromCache, true); assert.equal(calls.length, 1) // inside five minutes: the cache
  t += 6 * 60_000
  const b = await client.comments('fs', 482)
  assert.equal(calls.length, 2); assert.equal(calls[1].h['if-none-match'], 'W/"c1"'); assert.equal(b.validated, true); assert.equal(b.items.length, 2)
  assert.equal((await client.comments('nope', 1)).state, 'error')
  assert.equal((await client.comments('fs', 'x; drop')).state, 'error')
})

test('comments: the used-up limit keeps the last thread and says when; offline keeps it too', async () => {
  let mode = 'ok'
  const client = createGithubClient({ storage: memory(), now: () => Date.now(), ttlMs: 0, fetchImpl: async () => { if (mode === 'offline') throw new TypeError('x'); return mode === 'rate' ? reply(403, {}, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 600) }) : reply(200, [rawComment(1)]) } })
  assert.equal((await client.comments('fs', 5)).items.length, 1)
  mode = 'rate'
  const r = await client.comments('fs', 5)
  assert.equal(r.state, 'rate'); assert.equal(r.items.length, 1); assert.equal(r.stale, true); assert.ok(r.resetAt > Date.now())
  mode = 'offline'
  const o = await createGithubClient({ storage: memory(), fetchImpl: async () => { throw new TypeError('x') } }).comments('fs', 5)
  assert.equal(o.state, 'offline')
})

test('comments: a long text is cut, the stored cache keeps few threads and short texts', async () => {
  const c = normalizeComment(rawComment(7, { body: 'x'.repeat(BODY_MAX + 50) }))
  assert.equal(c.body.length, BODY_MAX); assert.equal(c.bodyCut, true); assert.equal(c.role, 'member')
  const store = memory()
  const client = createGithubClient({ storage: store, fetchImpl: async () => reply(200, Array.from({ length: 60 }, (_, i) => rawComment(i, { body: 'y'.repeat(9000) }))) })
  for (let n = 1; n <= 12; n++) await client.comments('fs', n)
  const kept = JSON.parse(store.getItem(CACHE_KEY))
  const keys = Object.keys(kept).filter((k) => k.includes('|comments|'))
  assert.equal(keys.length, 8)
  assert.equal(kept[keys[0]].items.length, 30); assert.equal(kept[keys[0]].items[0].body.length, 3000)
})

test('the reader folds the list pane away without moving the rail, and a single pane has nothing to fold', () => {
  const entries = [{ key: 'l', id: 'developer:list', role: 'list' }, { key: 'd', id: 'dev-issues', role: 'detail' }]
  const space = 1280 - RAIL_WIDTH.collapsed
  const scene = calculateScene([supportingPaneStrategy(), listDetailStrategy()], entries, { width: 1280, railWidth: RAIL_WIDTH.collapsed })
  assert.equal(scene.kind, 'list-detail')
  const plain = layoutOf(scene, space)
  const read = layoutOf(scene, space, { focus: true })
  assert.ok(plain.cols[0] >= 300); assert.equal(read.cols[0], 0)
  assert.equal(read.cols[1], space); assert.equal(read.cols.reduce((a, b) => a + b, 0), space)
  assert.equal(read.inner[0], plain.inner[0]) // the list keeps the width it lays out at while it slides away
  // at 1280 the page of the reader then has the window less the rail: well over the 560 px of text the reader asks for
  assert.ok(read.cols[1] - 2 * 32 >= 560)
  const narrow = calculateScene([supportingPaneStrategy(), listDetailStrategy()], entries, { width: 600, railWidth: RAIL_WIDTH.collapsed })
  assert.equal(narrow.kind, 'single')
  assert.deepEqual(layoutOf(narrow, 504, { focus: true }).cols, layoutOf(narrow, 504).cols)
})

// every vnode of a drawn tree: a tag, its props, its children
const walk = (v, f) => { if (v == null || typeof v === 'string') return; if (Array.isArray(v)) return v.forEach((x) => walk(x, f)); f(v); if (Array.isArray(v.children)) walk(v.children, f) }
test('the drawn tree has no innerHTML, no script, links only through the opener, images only https', () => {
  const opened = []
  const md = '# T\n\n[ok](https://a.example/x) [bad](javascript:alert(1)) <script>alert(1)</script> ![i](https://i.example/a.png) ![j](http://i.example/b.png)\n\n```\n<b>raw</b>\n```\n\n| a |\n|---|\n| b |'
  const tree = renderBlocks(parseMarkdown(md), { open: (u) => opened.push(u) })
  const tags = new Set(), props = new Set(); const links = [], imgs = []
  walk(tree, (v) => { tags.add(v.type); for (const k of Object.keys(v.props || {})) props.add(k); if (v.type === 'a') { links.push(v.props.href); v.props.onClick({ preventDefault() {} }) } if (v.type === 'img') imgs.push(v.props.src) })
  assert.ok(!props.has('innerHTML') && !props.has('v-html') && !props.has('srcdoc'))
  assert.ok(!tags.has('script') && !tags.has('iframe'))
  assert.deepEqual(links, ['https://a.example/x']); assert.deepEqual(opened, ['https://a.example/x'])
  assert.deepEqual(imgs, ['https://i.example/a.png'])
  // the code is a text child, never markup
  let code = ''
  walk(tree, (v) => { if (v.type === 'pre') code = v.children[0].children })
  assert.equal(code, '<b>raw</b>')
})

test('the page: no v-html anywhere in the reader, the shell folds its list while an item is open, 全屏阅读 and the words exist', () => {
  const dir = new URL('../src/vue/devmode/', import.meta.url)
  for (const f of ['DevIssueReader.vue', 'DevMarkdown.vue', 'renderMarkdown.js', 'DevIssues.vue']) assert.ok(!/v-html|innerHTML/.test(readFileSync(new URL(f, dir), 'utf8')), f)
  const issues = readFileSync(new URL('DevIssues.vue', dir), 'utf8')
  assert.match(issues, /scene\.focus\.value = on/); assert.match(issues, /sideAt: \{ type: Number, default: 1600 \}/)
  const scene = readFileSync(new URL('../MScene.vue', dir), 'utf8')
  assert.match(scene, /focus,\n/); assert.match(scene, /focus: focus\.value/)
  for (const loc of ['zh', 'en']) { const T = devmodeTexts(loc); for (const k of ['fullRead', 'fullExit', 'closeReader', 'commentsAll', 'commentsTitle', 'authorTag']) assert.ok(T[k], `${loc} ${k}`) }
  assert.match(devmodeTexts('zh').commentsAll, /显示全部/)
})

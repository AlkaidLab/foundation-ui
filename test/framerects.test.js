// The frame of another origin answers with rectangles; one that does not answer is covered whole.
import test from 'node:test'
import assert from 'node:assert/strict'
import { ASK, REPLY, answerRedactRequests, askFrame, collectAllRects } from '../src/devmode/frameRects.js'

const bus = () => { const listeners = new Set(); return { addEventListener: (t, f) => t === 'message' && listeners.add(f), removeEventListener: (t, f) => t === 'message' && listeners.delete(f), emit: (e) => [...listeners].forEach((f) => f(e)), size: () => listeners.size } }

test('the embedded page answers its parent, and only its parent, with the rectangles of its marked elements', () => {
  const parent = { postMessage: (msg, origin) => { sent.push([msg, origin]) } }
  const sent = []
  const win = { ...bus(), parent, innerWidth: 900, innerHeight: 600 }
  const stop = answerRedactRequests(win, () => [{ x: 10, y: 20, w: 100, h: 30, kind: 'pin', extra: 'dropped' }])
  win.emit({ data: { kind: ASK, id: 'x' }, source: { other: true }, origin: 'http://evil' })
  assert.equal(sent.length, 0, 'a message from another window is not answered')
  win.emit({ data: { kind: ASK, id: 'r9' }, source: parent, origin: 'http://127.0.0.1:47990' })
  assert.deepEqual(sent[0], [{ kind: REPLY, id: 'r9', rects: [{ x: 10, y: 20, w: 100, h: 30, kind: 'pin' }], width: 900, height: 600 }, 'http://127.0.0.1:47990'])
  stop(); assert.equal(win.size(), 0)
})

test('asking a frame: its boxes land inside the frame box; no answer in time covers the frame whole', async () => {
  const page = bus()
  const target = { postMessage: (msg) => { if (msg.kind === ASK) setTimeout(() => page.emit({ data: { kind: REPLY, id: msg.id, rects: [{ x: 50, y: 40, w: 100, h: 20, kind: 'pin' }], width: 400, height: 300 }, source: target }), 5) } }
  const frame = { contentWindow: target }
  const box = { left: 100, top: 60, width: 800, height: 600 }
  const got = await askFrame(frame, box, { win: { ...page, innerWidth: 1280, innerHeight: 800 }, timeoutMs: 200 })
  assert.deepEqual(got, [{ x: 200, y: 140, w: 200, h: 40, kind: 'pin' }], 'scaled by the size of the frame against the size of the page inside it')
  const silent = await askFrame({ contentWindow: { postMessage() {} } }, box, { win: { ...bus(), innerWidth: 1280, innerHeight: 800 }, timeoutMs: 20 })
  assert.deepEqual(silent, [{ x: 100, y: 60, w: 800, h: 600, kind: 'text' }], 'no answer: covered whole')
  assert.deepEqual(await askFrame({}, box, { win: { ...bus(), innerWidth: 1280, innerHeight: 800 } }), [{ x: 100, y: 60, w: 800, h: 600, kind: 'text' }])
})

test('collectAllRects joins the readable marks and the answers of the frames that cannot be read', async () => {
  const page = bus()
  const target = { postMessage: (msg) => setTimeout(() => page.emit({ data: { kind: REPLY, id: msg.id, rects: [{ x: 0, y: 0, w: 10, h: 10, kind: 'host' }], width: 200, height: 100 }, source: target }), 1) }
  const el = (r, kind) => ({ getBoundingClientRect: () => ({ left: r[0], top: r[1], width: r[2], height: r[3] }), getAttribute: () => kind })
  const frame = { getBoundingClientRect: () => ({ left: 100, top: 100, width: 200, height: 100 }), get contentDocument() { throw new Error('x') }, contentWindow: target }
  const root = { querySelectorAll: (sel) => (sel.includes('iframe') ? [frame] : [el([5, 5, 50, 20], 'address')]), defaultView: { getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) } }
  const all = await collectAllRects(root, { width: 1280, height: 800 }, { win: { ...page, innerWidth: 1280, innerHeight: 800 }, timeoutMs: 100 })
  assert.deepEqual(all.map((r) => r.kind), ['address', 'host'])
  assert.deepEqual(all[1], { x: 100, y: 100, w: 10, h: 10, kind: 'host' })
})

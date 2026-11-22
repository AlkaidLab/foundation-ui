// One overview layout per host: the panel and the Web UI of the same host draw the same cards, order and sizes
import test from 'node:test'
import assert from 'node:assert/strict'
import { useDashLayout } from '../src/vue/useDashLayout.js'
import { useStacks } from '../src/vue/useStacks.js'
import { createHostLayoutStore, attachHostLayout, HOST_LAYOUT_PATH } from '../src/vue/hostLayout.js'

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
const respond = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body })
// a host that keeps one document
const fakeHost = () => { const h = { doc: null, puts: 0, request: async (path, init) => { assert.equal(path, HOST_LAYOUT_PATH); if (init.method === 'PUT') { h.doc = JSON.parse(init.body); h.puts++; return respond(200, {}) } return h.doc ? respond(200, h.doc) : respond(204) } }; return h }
const device = (key, host) => { const storage = memory(); const layout = useDashLayout(key, storage); const stacks = useStacks(key, { known: () => true, storage }); const store = createHostLayoutStore({ request: host.request }); const sync = attachHostLayout({ layout, stacks, store, storageKey: key, storage, saveAfterMs: 0, pollMs: 0 }); return { storage, layout, stacks, store, sync } }
const settle = async (d) => { await new Promise((r) => setTimeout(r, 5)); await d.sync.flush(); await d.sync.sync() }

test('a host without the route (404) leaves the layout on the device, and a bad document is none', async () => {
  const gone = createHostLayoutStore({ request: async () => respond(404) })
  assert.equal(await gone.load(), null); assert.equal(gone.supported, false); assert.equal(await gone.save({}), false)
  assert.equal(await createHostLayoutStore({ request: async () => respond(200, { v: 9, at: 1, layout: {} }) }).load(), null)
  assert.equal(await createHostLayoutStore({ request: async () => { throw new Error('offline') } }).load(), null)
})

test('what one device sets is what the other draws: cards, order, sizes (and which sizes are the person\'s), the stacks, the pins', async () => {
  const host = fakeHost()
  const panel = device('panel-home', host), web = device('web-home', host)
  await settle(panel); await settle(web)
  assert.equal(host.puts, 0, 'two devices nobody changed write nothing')
  panel.layout.setVisible('bitrate', true); panel.layout.setSize('bitrate', 's'); panel.layout.setSize('fps', 'm', { user: false })
  panel.layout.moveTo('fps', 'hero')
  await settle(panel)
  assert.equal(host.puts, 1)
  await settle(web)
  assert.deepEqual(web.layout.serialize(), panel.layout.serialize())
  assert.equal(web.layout.state.sizes.bitrate, 's'); assert.equal(web.layout.isUserSized('bitrate'), true); assert.equal(web.layout.isUserSized('fps'), false)
  // and back: the web changes the order, the panel has it
  web.layout.setVisible('bitrate', false)
  await settle(web); await settle(panel)
  assert.equal(panel.layout.state.overrides.bitrate, false)
})

test('the later change wins at the start, and a device that never changed anything takes the host\'s layout', async () => {
  const host = fakeHost()
  const a = device('panel-home', host); a.layout.setSize('hero', 'l'); await settle(a)
  const late = device('web-home', host); await settle(late)
  assert.equal(late.layout.state.sizes.hero, 'l', 'a fresh device takes the host layout')
  // an older host document does not replace a newer local change
  late.storage.setItem('foundation-ui.dash2.web-home.at', String(Date.now() + 100000))
  late.layout.setSize('hero', 's'); host.doc = { ...host.doc, at: 5 }
  await settle(late)
  assert.equal(host.doc.layout.sizes.hero, 's', 'the newer one went to the host')
})

test('a host that could not be read is not a host without a document: nothing is written over it; 204 is the empty one', async () => {
  const { NONE } = await import('../src/vue/hostLayout.js')
  assert.equal(await createHostLayoutStore({ request: async () => respond(204) }).load(), NONE)
  assert.equal(await createHostLayoutStore({ request: async () => respond(500) }).load(), null)
  let puts = 0
  const storage = memory(); storage.setItem('foundation-ui.dash2.k.at', '100')
  const layout = useDashLayout('k', storage)
  const sync = attachHostLayout({ layout, store: { supported: true, load: async () => null, save: async () => { puts++; return true } }, storageKey: 'k', storage, saveAfterMs: 0, pollMs: 0 })
  await sync.sync(); assert.equal(puts, 0, 'a read that failed does not upload')
  sync.off()
})
test('a change that waits for its rest is written when the page is left', async () => {
  let puts = 0
  const storage = memory(); const layout = useDashLayout('k2', storage)
  const sync = attachHostLayout({ layout, store: { supported: true, load: async () => null, save: async () => { puts++; return true } }, storageKey: 'k2', storage, saveAfterMs: 60000, pollMs: 0 })
  layout.setSize('hero', 'l')
  assert.equal(puts, 0, 'it waits for its rest')
  sync.off(); await new Promise((r) => setTimeout(r, 5))
  assert.equal(puts, 1, 'leaving the page writes it')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { breakText } from '../src/vue/breakText.js'

// Web on a phone (360 px): a host address or URL breaks at its own joints, never inside a token.
test('an address breaks after dots, dashes, slashes and ports, never inside a number or a label', () => {
  assert.deepEqual(breakText('https://192.168.7.31:57990'), ['https://', '192.', '168.', '7.', '31:', '57990'])
  assert.deepEqual(breakText('2408:8207:1c40:7a30:b4e2:91ff:fe3d:55a1'), ['2408:', '8207:', '1c40:', '7a30:', 'b4e2:', '91ff:', 'fe3d:', '55a1'])
  assert.deepEqual(breakText('https://my-host.tail-net.ts.net:47989/a/b?x=1&y=2'), ['https://', 'my-', 'host.', 'tail-', 'net.', 'ts.', 'net:', '47989/', 'a/', 'b?', 'x=', '1&', 'y=', '2'])
  for (const t of ['https://192.168.7.31:57990', '2408:8207:1c40::1', 'a.b.c/d-e_f?g=h&i']) assert.equal(breakText(t).join(''), t, 'the text itself is never changed')
  assert.deepEqual(breakText(''), []); assert.deepEqual(breakText('localhost'), ['localhost'])
})

test('every address the pages show goes through MBreakText (<wbr> joints), the host address list too', () => {
  const src = (p) => readFileSync(new URL(`../src/vue/${p}`, import.meta.url), 'utf8')
  assert.match(src('MBreakText.vue'), /<wbr v-if="i < parts\.length - 1" \/>/)
  const tpl = (p) => parse(src(p)).descriptor.template.content
  assert.match(tpl('MWebAccess.vue'), /<template #title><MBreakText :text="a\.url" \/><\/template>/)
  for (const [p, bit] of [['MReachOverview.vue', 'path.address'], ['MNetworkOverview.vue', 'row.address'], ['MEndpointList.vue', 'text'], ['MDashAddress.vue', 'shown'], ['MRemotePublic.vue', 'doneAddress'], ['MReachVerdict.vue', 'path.address']]) assert.ok(tpl(p).includes(`<MBreakText :text="${bit}" />`), p)
  assert.match(readFileSync(new URL('../src/css/layout.css', import.meta.url), 'utf8'), /\.m-item__title \{[^}]*overflow-wrap: anywhere/, 'a run longer than the line is still the last resort, never a page wider than the window')
})

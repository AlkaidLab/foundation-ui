import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULT_BUILT_IN_APPS, getDefaultBuiltInApps, restoreDefaultBuiltInApps } from 'foundation-ui/apps'

// 「还原内置应用」 of the guide: one list for the Web UI and the panel, and the flow stays on its step with the result under the button.
test('the built-in apps are shared: restoring keeps the person\'s apps, resets a changed built-in and appends the missing ones', () => {
  const r = restoreDefaultBuiltInApps([{ name: 'desktop', cmd: 'x', index: 0 }, { name: 'Mine', cmd: 'm' }], 'linux')
  assert.deepEqual(r.apps.map((a) => a.name), ['Desktop', 'Mine', 'Low Res Desktop', 'Steam Big Picture'])
  assert.deepEqual([r.restored, r.added, r.changed], [1, 2, 3])
  assert.equal(restoreDefaultBuiltInApps(getDefaultBuiltInApps('macos'), 'macos').changed, 0, 'already the defaults: nothing to do')
  assert.equal(restoreDefaultBuiltInApps([{ name: 'a' }], 'nope').changed, 0)
  assert.deepEqual(Object.keys(DEFAULT_BUILT_IN_APPS).sort(), ['linux', 'macos', 'windows'])
})

test('the guide flow never leaves its step for it when the product gives restoreApps: the result shows in place; the button is one control', () => {
  const vue = readFileSync(new URL('../src/vue/MGuideFlow.vue', import.meta.url), 'utf8')
  assert.match(vue, /if \(!props\.callbacks\.restoreApps\) \{ props\.callbacks\.openApps\?\.\('restore'\); return \}/)
  assert.match(vue, /<div v-if="restore\.note" ref="restoreResult" class="m-guide__result" :class="\{ 'is-bad': restore\.failed \}" role="status"><MBanner :tone="restore\.failed \? 'error' : 'info'"[^>]*>\{\{ restore\.note \}\}<\/MBanner><\/div>/)
  // a long step: the answer is scrolled into view after the call, success or failure, so a press is never silent
  assert.match(vue, /finally \{ restore\.busy = false; await nextTick\(\); restoreResult\.value\?\.scrollIntoView/)
})

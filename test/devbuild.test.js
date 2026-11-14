import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ENV_LABELS, componentRows, environmentDisplayRows, environmentText } from '../src/developer/envInfo.js'
import { devmodeTexts } from '../src/devmode/texts.js'

// 开发者 › 构建与组件 (): the table lists every component, the card has Chinese labels, the copied text keeps stable English keys, the WebView chip has an icon.
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const FULL = [
  { id: 'host', name: 'Sunshine.exe', version: '2026.1110.165906', commit: 'abc1234', installed: true }, { id: 'panel', name: 'Panel', version: '2026.1110.165906', commit: 'a6f75d9', installed: true },
  { id: 'web', name: 'Web UI', version: '2026.1110.165906', commit: 'be1ce3d', installed: true }, { id: 'm3e', name: 'foundation-ui', version: '0.1.0', commit: '77d2f7a', installed: true },
  { id: 'vdd', name: 'ZakoVDD', version: '1.0.4.0', commit: '', installed: true }, { id: 'vigem', name: 'ViGEmBus', version: '', commit: '', installed: false },
  { id: 'usbip', name: 'USB/IP', version: '0.9.8.1', commit: '', installed: true }, { id: 'dlssnr', name: 'DLSS NR plugin', version: '', commit: '', installed: false },
  { id: 'stylus', name: 'Stylus plugin', version: '2026.1110.165906', commit: 'a6f75d9', installed: true }, { id: 'haptics', name: 'moonlight-audio-haptics', version: '', commit: 'c4f1b8c', installed: true },
  { id: 'installer', name: 'Installer', version: '2026.1110.165906', commit: 'be1ce3d', installed: true },
]

test('when the host answers the table lists every component, not the panel alone; a missing one is listed as not installed', () => {
  const rows = componentRows({ builds: [{ name: 'panel', sha: '0.0.0-dev' }], components: FULL })
  assert.equal(rows.length, 11); assert.ok(rows.length > 1)
  assert.deepEqual(rows.map((r) => r.id), ['host', 'panel', 'web', 'm3e', 'vdd', 'vigem', 'usbip', 'dlssnr', 'stylus', 'haptics', 'installer'])
  assert.equal(rows.find((r) => r.id === 'vigem').installed, false); assert.equal(rows.find((r) => r.id === 'vigem').version, '')
  assert.equal(rows.find((r) => r.id === 'host').commit, 'abc1234')
  // without an inventory (a product that has none) the builds are the rows, as before
  assert.deepEqual(componentRows({ builds: [{ name: 'panel', sha: 'abc' }] }), [{ id: 'panel', name: 'panel', version: '', commit: 'abc', installed: true }])
  assert.deepEqual(componentRows({}), [])
})

test('the page draws version and commit per component and 「未安装」 for a missing one (one row per component: the version under the name, the commit at the end)', () => {
  const vue = read('src/vue/devmode/DevBuild.vue')
  assert.match(vue, /const builds = computed\(\(\) => componentRows\(info\.value \|\| \{\}\)\.map/)
  assert.match(vue, /<MItem v-for="b in builds"[^>]*:title="b\.name" :value="b\.installed \? b\.version \|\| '—' : T\.buildNotInstalled"/)
  assert.match(vue, /<template v-if="b\.installed && b\.commit" #trail><MChip class="dm-mono dm-commit">\{\{ b\.commit \}\}<\/MChip><\/template>/)
  assert.match(vue, /'dm-notinstalled': !b\.installed/)
  assert.equal(devmodeTexts('zh').buildNotInstalled, '未安装'); assert.equal(devmodeTexts('zh').buildCommit, '提交'); assert.equal(devmodeTexts('en').buildNotInstalled, 'Not installed')
})

test('the details card has Chinese labels in the Chinese interface; the copied text keeps the English keys', () => {
  const info = { product: 'Foundation Sunshine panel', version: '2026.1110.165906', channel: 'stable', builds: [{ name: 'panel', sha: 'a6f75d9' }], host: '2026.1110.165906', os: 'Windows 11', arch: 'x86_64', gpu: 'RTX', webview: '130.0', display: '1920x1080 @100%', locale: 'zh-CN' }
  const shown = environmentDisplayRows(info, ENV_LABELS.zh).map(([k]) => k)
  for (const label of ['产品', '版本', '渠道', '面板构建', '主机', '系统', '架构', '显卡', 'WebView', '显示', '语言']) assert.ok(shown.includes(label), label)
  assert.ok(environmentDisplayRows({ builds: [{ name: 'host', sha: 'abc' }] }, ENV_LABELS.zh).some(([k]) => k === 'build host'), 'a build row with no label keeps its name')
  assert.ok(environmentDisplayRows(info, null).map(([k]) => k).includes('product'), 'a language without labels shows the keys')
  const text = environmentText(info); assert.match(text, /^product: Foundation Sunshine panel\nversion: /); assert.match(text, /\nos: Windows 11\n/); assert.doesNotMatch(text, /产品|版本/)
  assert.equal(devmodeTexts('zh').buildCopyTip, '复制内容为固定的英文键值格式，便于粘贴到问题报告')
  assert.match(read('src/vue/devmode/DevBuild.vue'), /:title="T\.buildCopyTip"/)
})

test('the system, graphics and WebView rows (they were chips) have an icon of the set, as does every other row of the page', async () => {
  const vue = read('src/vue/devmode/DevBuild.vue')
  assert.match(vue, /os: 'desktop_windows'/); assert.match(vue, /gpu: 'memory'/); assert.match(vue, /webview: 'language'/)
  const { ICONS } = await import('../src/icons/icons.js')
  const used = [...vue.matchAll(/const (?:ENV_ICON|COMPONENT_ICON) = \{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/: '([a-z_]+)'/g)].map((x) => x[1]))
  assert.ok(used.length > 20, 'the icon maps were read')
  for (const name of used) assert.ok(ICONS[name], `${name} is in the icon set`)
})

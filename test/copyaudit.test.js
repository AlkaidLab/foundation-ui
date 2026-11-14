// The copy audit: a supporting line must carry information its title does not. These lines were removed because they only
// restated the title, explained the obvious or talked about the interface itself; they must not come back.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const files = []
const walk = (dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|vue)$/.test(e.name) && e.name !== 'labels.js') files.push(p) } }
walk(root)
const source = files.map((f) => readFileSync(f, 'utf8')).join('\n')

const BANNED = [
  '到哪里查找和下载新版本', '选择界面语言，其余的以后都能改',
  '你正在主机本机上', 'You are on the host itself',
  '这些选项会改变驱动和捕获的底层行为', 'These options change the low-level behaviour of the driver',
  '登录后管理这台电脑', 'Sign in to manage this computer',
  '再走一遍导航栏、搜索和概览', '你打算怎样在这个网络之外连接',
  '按窗口形状选择合适的图片', '图片位于整个窗口的磨砂层之下',
  '主机设置，与设置页保存方式相同', 'Host setting, saved like the settings page',
  '固定链接', 'Fixed link', '窗口外观', 'The window appearance',
  '免费开源，一个 Star 就是最好的鼓励', '选择要放进去的内容',
]

test('lines that only restated their title or talked about the interface are gone', () => {
  for (const phrase of BANNED) assert.ok(!source.includes(phrase), `filler is back: ${phrase}`)
})

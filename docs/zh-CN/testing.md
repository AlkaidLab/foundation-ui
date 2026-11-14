# 测试

[文档](../../README.zh-CN.md#文档) · [快速开始](getting-started.md) · [主题与令牌](theming-and-tokens.md) · [组件](components.md) · **测试**

Foundation UI 自带测试辅助，使用它的应用可以运行同样的检查。它们是 `foundation-ui/testing/*` 下的普通 ES 模块，都不需要浏览器。

| 导入 | 用途 |
| --- | --- |
| `foundation-ui/testing/no-network` | 测试运行守卫：测试触达真实发布主机时让运行失败 |
| `foundation-ui/testing/scope-check` | 找出 Vue `<script>` 中使用却从未声明或导入的标识符 |
| `foundation-ui/testing/selected-ring` | 找出用超过 1 px 的描边绘制的选中态样式 |
| `foundation-ui/testing/copy-lint` | 检查界面文案中“解释而非陈述”的措辞 |

## 运行本包的测试

```sh
npm ci
npm test
```

`npm test` 对 `test/*.test.js` 运行 `node --test`，并预加载模块解析钩子（`scripts/register.mjs`，颜色库需要）与无网络守卫。部分测试需要 `HOST_README` 指向 Foundation Sunshine 的 README，否则跳过。

## 无网络加载器

`scripts/no-network.mjs` 把 `globalThis.fetch` 替换为守卫：对真实发布元数据主机（`alkaidlab.com`、`alkaidlab.cn`）的请求被拒绝并记录。被记录的请求会让运行在退出时失败，即使测试吞掉了这次拒绝。其他 URL 仍走真实的 `fetch`。测试应注入自己的 `fetch`，这层守卫是兜底。

用 `--import` 加载：

```sh
node --import foundation-ui/testing/no-network --test "test/*.test.js"
```

## 作用域检查

`undeclaredIdentifiers(source, { filename })` 解析 Vue 单文件组件，返回其脚本使用、但文件内既未声明、也未导入、也未传入的标识符：例如处理函数调用了一个复制过来却没带定义的辅助函数。只检查脚本；文件内任何位置声明过的名字都算已声明。它需要 `@vue/compiler-sfc`、`@babel/parser` 与 `estree-walker`，它们随 Vue 的编译器一起安装。

```js
import fs from 'node:fs'
import { undeclaredIdentifiers } from 'foundation-ui/testing/scope-check'

const file = 'src/Page.vue'
const missing = undeclaredIdentifiers(fs.readFileSync(file, 'utf8'), { filename: file })
// assert.deepEqual(missing, [])
```

## 选中态描边

选中的卡片、选项、色板或类标签控件，用容器颜色与对勾表示，而不是用超过 1 px 的边框、轮廓或阴影描边。`selectedRingsIn(dir)` 扫描目录下的 CSS、Less/SCSS 与 Vue 文件的 `<style>` 块，对每条违反规则返回 `{ file, line, selector, rings }`；`selectedRings(css, file)` 检查单段样式。键盘焦点环（`:focus`、`:focus-visible`、`:focus-within`）不在检查之列。

```js
import { selectedRingsIn } from 'foundation-ui/testing/selected-ring'

const findings = selectedRingsIn('src')
// assert.equal(findings.length, 0)
```

## 文案 lint

`scanText(text)` 检查一段字符串，`scanFile(file)` 从源码或 JSON 文件中取出字符串检查，`listFiles(root)` 列出要扫描的文件。规则（`RULES`）覆盖中英文界面文案，以及数字与单位之间的空格，详见 [`docs/copy-style.zh.md`](../copy-style.zh.md)。也可在命令行运行：

```sh
node scripts/copy-lint.mjs src
```

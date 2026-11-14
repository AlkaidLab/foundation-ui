# 快速开始

[文档](../../README.zh-CN.md#文档) · **快速开始** · [主题与令牌](theming-and-tokens.md) · [组件](components.md) · [测试](testing.md)

## 环境要求

- 应用使用 Vue 3.5 或更新版本。
- 打包工具需支持解析包的 `exports` 并编译 Vue 单文件组件（本仓库的画廊使用 Vite 与 `@vitejs/plugin-vue`）。
- 运行测试需要 Node 20 或更新版本。

## 安装

Foundation UI 未发布到 npm。把它克隆到应用旁边，命名为 `ds5-ui-m3e`，并在克隆目录中安装依赖（`file:` 依赖是链接而非复制，其自身依赖必须装在该目录）：

```sh
git clone https://github.com/AlkaidLab/foundation-ui ../ds5-ui-m3e
npm --prefix ../ds5-ui-m3e ci
```

在应用的 `package.json` 中：

```json
{
  "dependencies": {
    "foundation-ui": "file:../ds5-ui-m3e",
    "vue": "^3.5.0"
  }
}
```

之后在应用中运行 `npm install`。Foundation 面板与 Foundation Sunshine Web UI 的构建读取 `FOUNDATION_UI_DIR`；克隆不在 `../ds5-ui-m3e` 时设置它。

## 编译 Material Web 标签

文本框、下拉选择、复选框、单选框与菜单是 Material Web 元素（`md-*`）。让 Vue 编译器不处理它们：

```js
// vite.config.js
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('md-') } } })],
}
```

`foundation-ui/vue` 也导出同样的判断函数 `isMaterialWebElement`。

## 入口

| 导入 | 提供 |
| --- | --- |
| `foundation-ui/all.css` | 字体、令牌与所有组件的样式 |
| `foundation-ui/tokens.css`、`foundation-ui/springs.css` | 仅生成的令牌，或仅弹簧缓动令牌 |
| `foundation-ui/theme` | `applyTheme`、`schemeColors`、`seedFromImage`、品牌种子色与配色方案 |
| `foundation-ui/motion` | 弹簧定义与 CSS 缓动工具 |
| `foundation-ui/vue` | Vue 层的组件、组合式函数与逻辑 |
| `foundation-ui/icons` | `MIcon` 使用的 Material Symbols 图标集 |
| `foundation-ui/tray`、`foundation-ui/contextmenu/*`、`foundation-ui/popup` | 托盘菜单模型、右键菜单构建器、弹窗工具 |
| `foundation-ui/settings`、`foundation-ui/diagnostics`、`foundation-ui/doctor`、`foundation-ui/update` 等 | 设置、诊断、体检与更新模型 |
| `foundation-ui/locale` | 语言偏好工具 |
| `foundation-ui/testing/*` | 测试辅助，见[测试](testing.md) |

全部导出路径见 [`package.json`](../../package.json) 的 `exports`。

## 第一个页面

```js
// main.js
import { createApp } from 'vue'
import 'foundation-ui/all.css'
import { applyTheme } from 'foundation-ui/theme'
import App from './App.vue'

applyTheme(document.documentElement)
createApp(App).mount('#app')
```

```vue
<!-- App.vue -->
<script setup>
import { ref } from 'vue'
import { MPage, MSection, MGroup, MSwitchItem, MSliderItem } from 'foundation-ui/vue'

const rumble = ref(true)
const strength = ref(0.8)
</script>

<template>
  <MPage title="手柄">
    <MSection title="触觉与震动">
      <MGroup>
        <MSwitchItem v-model="rumble" icon="mobile_vibrate" title="启用震动" />
        <MSliderItem v-model="strength" icon="bolt" title="震动强度" :min="0" :max="2" />
      </MGroup>
    </MSection>
  </MPage>
</template>
```

亮色与暗色由 `<html>` 上的 `data-bs-theme` 属性（`light` 或 `dark`）决定。

## 运行画廊

```sh
git clone https://github.com/AlkaidLab/foundation-ui && cd foundation-ui
npm ci
npx vite --config gallery/vite.config.js
```

画廊地址为 `http://127.0.0.1:18081`。`tiles.html`、`tray.html`、`charts.html` 等页面各展示一个功能区；加 `?theme=dark` 查看暗色。

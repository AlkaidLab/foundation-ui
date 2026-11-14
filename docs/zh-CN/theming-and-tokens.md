# 主题与令牌

[文档](../../README.zh-CN.md#文档) · [快速开始](getting-started.md) · **主题与令牌** · [组件](components.md) · [测试](testing.md)

## 颜色

颜色角色来自 Material 3 动态配色（`@material/material-color-utilities`，HCT）。每套配色由一个种子色生成全部角色。`foundation-ui/all.css` 自带生成好的默认配色（亮色 vibrant，暗色 tonal spot）；`applyTheme` 在运行时替换它。

```js
import { applyTheme } from 'foundation-ui/theme'

applyTheme(document.documentElement, {
  light: '#4a9eff',           // 亮色种子色（BRAND_SEEDS.light）
  dark: '#d4a5a5',            // 暗色种子色（BRAND_SEEDS.dark）
  variants: { light: 'vibrant', dark: 'tonalSpot' },
  contrast: 0,                // Material 配色的对比度档位
  black: false,               // 暗色使用近黑表面
  style: 'bright',            // 'bright' | 'classic' | 'quiet'
})
```

- **配色方案**：`tonalSpot`、`expressive`、`vibrant`、`neutral`、`fidelity`。
- **配色风格**：`bright`（默认）、`classic`、`quiet`，导出为 `COLOR_STYLES`。
- `applyTheme` 向文档写入一个 `<style id="foundation-ui-theme">`。亮色规则作用于 `:root`、`[data-bs-theme='light']` 与 `[data-theme='light']`，暗色规则作用于 `[data-bs-theme='dark']` 与 `[data-theme='dark']`。设置该属性即可切换。
- `seedFromImage(image)` 返回图片的种子色，用于从壁纸取色。
- `schemeColors(seed, options)` 只返回角色表，不改动文档；`colorCss(seed, options)` 将其输出为 `--md-sys-color-*` 声明。

角色是与 Material Web 同名的 CSS 自定义属性：`--md-sys-color-primary`、`--md-sys-color-on-primary`、`--md-sys-color-surface-container` 等。状态色（`success`、`warning`）与图表色（`chart1`…）随配色一起生成。页面与卡片背景使用 `--m-page` 和 `--m-card`。

## 形状

圆角令牌遵循 Material 3 刻度：`--md-sys-shape-corner-none` 到 `--md-sys-shape-corner-extra-large-increased`，定义在 `tokens.css`。

## 动效

弹簧动效令牌定义在 `foundation-ui/motion`：

| 令牌 | 阻尼 | 刚度 |
| --- | --- | --- |
| `fastSpatial` | 0.6 | 800 |
| `defaultSpatial` | 0.8 | 380 |
| `slowSpatial` | 0.8 | 200 |
| `fastEffects` | 1 | 3800 |
| `defaultEffects` | 1 | 1600 |
| `slowEffects` | 1 | 800 |

CSS 无法直接运行弹簧，因此每个弹簧被采样一次，转换为 `linear()` 缓动，并附带稳定所需的时长。`springs.css` 将它们暴露为 `--m-spring-<name>`（缓动）与 `--m-spring-<name>-duration`：

```css
.panel { transition: transform var(--m-spring-default-spatial-duration) var(--m-spring-default-spatial); }
```

脚本中可使用导出的 `SPRINGS`、`springEasing(spring)` 与 `motionCss()`。

## 字体

界面字体为 Roboto Flex（可变字重）。磁贴的展示字体为 Google Sans Flex，字体族 `M3E Display`，令牌 `--m-font-display`；停靠时钟另有几种字体。所有字体均为 SIL OFL 1.1，来源与许可证见 [`src/fonts/FONTS.md`](../../src/fonts/FONTS.md)。`all.css` 会引入 `fonts.css`。

## 重新生成令牌

`src/tokens/tokens.css` 与 `springs.css` 由 `theme.js` 和 `motion.js` 生成：

```sh
npm run build:tokens
```

修改生成器的输入，而不是 CSS。

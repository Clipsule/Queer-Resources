# 🎨 色彩系统（Color System）

本项目的视觉目标是「温和、包容、护眼」。实现方式是**极光渐变色**（多个大半径模糊色块缓慢漂浮）与**毛玻璃拟态（Glassmorphism）**的结合。

> 本文件描述的是 `index.html` 中实际生效的取值。改样式时请以本文件为准；若实现与文档不一致，请同步更新本文件。

---

## 🌟 核心设计理念

1. **五彩斑斓白（浅色模式）**：极浅的暖白底（`#FDFDFD`）上叠加 5 个低饱和、大半径模糊（110–120px）的彩虹光晕，形成流动的极光效果。
2. **五彩斑斓黑（深色模式）**：深邃黑底（`#0A0A0C`），彩虹光晕转为暗调「星云」，并把 `.aurora-blob` 的 `opacity` 降到 `0.45`，保证夜间不刺眼。
3. **卡片边界拯救计划**：深色模式不用纯黑卡片，改用略带灰度的毛玻璃 + **微白边框**（`rgba(255,255,255,0.08)`），使卡片不融进背景。

---

## 🎨 CSS 变量

颜色统一走 CSS 变量，切换主题只改 `data-theme` / `.dark`：

```css
:root {
  --bg-base: #FDFDFD;            /* 极简暖白底 */
  --text-primary: #1D1D1F;       /* 深灰（不用纯黑） */
  --text-secondary: #515154;
  --text-muted: #86868B;

  --card-bg: rgba(255, 255, 255, 0.7);
  --card-border: rgba(255, 255, 255, 0.9);
  --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
  --card-hover-shadow: 0 16px 48px rgba(0, 0, 0, 0.08);

  --accent-blue: #5B8DEF;
  --accent-pink: #F08BB4;
  --accent-purple: #9D7BEA;
  --accent-green: #4CAF93;
}

.dark, [data-theme="dark"] {
  color-scheme: dark;
  --bg-base: #0A0A0C;
  --text-primary: #F5F5F7;      /* 极浅灰白（不用纯白，避免光晕） */
  --text-secondary: #A1A1A6;
  --text-muted: #6E6E73;

  --card-bg: rgba(30, 30, 35, 0.6);
  --card-border: rgba(255, 255, 255, 0.08);   /* 核心：微白边框勾勒界限 */
  --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  --card-hover-shadow: 0 16px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15);

  --accent-blue: #7AA5FF;        /* 强调色在暗色下提亮为同色相浅色调 */
  --accent-pink: #FF9EC5;
  --accent-purple: #B898FF;
  --accent-green: #5ED8B5;
}
```

Tailwind 生成的 `bg-[#F8F9FD]` / `text-text-primary` 特异性更高，因此 `body` 必须在暗色模式下用 `!important` 覆盖，否则会出现「浅色底 + 白字标题」不可见的问题。

---

## 🖌️ 使用规范

### 1. 字体颜色
- **禁止**用纯黑 `#000000` / 纯白 `#FFFFFF` 作正文颜色。
- 浅色用 `#1D1D1F`，深色用 `#F5F5F7`，可显著降低眩光。

### 2. 毛玻璃（Glassmorphism）
卡片与导航栏必须同时具备背景、模糊、边框三项：

```css
background: var(--card-bg);
backdrop-filter: blur(...);
border: 1px solid var(--card-border);
```

实际使用的四档：

| 类名 | 用途 | 关键取值 |
| --- | --- | --- |
| `.glass-card-pro` | 资源卡片 / 内容卡片 | `blur(28px) saturate(145%)`，`border-radius: 24px`，hover `translateY(-6px)` |
| `.glass-crisis-card` | 危机热线卡片 | `blur(28px) saturate(140%)`，静态不位移 |
| `.glass-pill` | 分类 / 快捷检索胶囊 | `blur(14px)`，hover `translateY(-1px)` |
| `.search-glow-container` | 搜索框容器 | `blur(24px)`，`:focus-within` 加深阴影并加 2px 焦点环 |

### 3. 极光背景
- 5 个 `.aurora-blob`（绝对定位、`pointer-events-none`），模糊半径 **110–120px**（用 Tailwind 的 `blur-[110px]` 等）。
- 漂浮动画由 `@keyframes float-slow`（16s）与 `float-reverse`（20s）驱动，组合成 `.animate-aurora-1 / -2 / -3`；第三个使用 `alternate-reverse`。
- **不要把光晕透明度调高**，也不要把模糊半径调小：半径变小会露出色块边缘，失去「极光」质感。
- 深色模式只需降 `opacity`（`.dark .aurora-blob { opacity: 0.45 }`），不要改色相。

### 4. 暗色模式标签与描边（重要约定）
暗色下**保留色相，仅降低饱和度 / 透明度**，避免全部变成灰色而丢失语义。实际做法是为每个浅色类补一条 `.dark` 覆盖：

- 标签底色：`rgba(<同色相>, 0.14~0.16)`
- 描边：`rgba(<同色相浅色>, 0.28~0.34)`
- 标签文字：改为同色相浅色调（如 `.dark .text-blue-700 { color: #A8C7FF }`）

新增一种标签色时，必须同时在 `index.html` 的暗色覆盖区补上对应条目，否则会出现「浅色文字压浅色底」的低对比问题。

### 5. 交互与无障碍
- 焦点环统一用 `:focus-visible`（浅色 `var(--accent-blue)`，深色 `#7AA5FF`），偏移 2px。
- `@media (prefers-reduced-motion: reduce)` 下关闭极光漂浮、卡片过渡与 `scroll-behavior`。
- 资源分组用 `content-visibility: auto` 跳过屏外渲染，配合 `contain-intrinsic-size` 避免滚动条抖动。
